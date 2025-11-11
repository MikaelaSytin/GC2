// server.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const app = express();
app.use(express.json());

// dev helpers: CORS + request logging
const cors = require("cors");
app.use(cors());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Config via env
const COMPANY_LOGIN = process.env.SIMPLYBOOK_COMPANY_LOGIN || "";
const API_KEY = process.env.SIMPLYBOOK_API_KEY || "";
const MOCK_MODE = process.env.MOCK_MODE === "true" || (!COMPANY_LOGIN || !API_KEY);
const BOOKINGS_FILE = path.join(__dirname, "bookings.json");

if (!COMPANY_LOGIN || !API_KEY) {
  console.warn("WARNING: SIMPLYBOOK_COMPANY_LOGIN or SIMPLYBOOK_API_KEY not set. Running in MOCK_MODE:", MOCK_MODE);
}

let simplybookToken = null;
let tokenExpiresAt = 0;

async function getSimplyBookToken() {
  if (MOCK_MODE) return null;
  const now = Date.now();
  if (simplybookToken && now < tokenExpiresAt) return simplybookToken;

  const url = "https://user-api.simplybook.me/login";
  const rpc = { jsonrpc: "2.0", method: "getToken", params: [COMPANY_LOGIN, API_KEY], id: Date.now() };

  const resp = await axios.post(url, rpc, { headers: { "Content-Type": "application/json" }, timeout: 10000 });
  if (resp.data && resp.data.error) throw new Error(JSON.stringify(resp.data.error));
  simplybookToken = resp.data.result;
  tokenExpiresAt = now + 50 * 60 * 1000;
  return simplybookToken;
}

async function simplyBookRpc(method, params = []) {
  if (MOCK_MODE) throw new Error("MOCK_MODE enabled - real SimplyBook calls are disabled");
  const token = await getSimplyBookToken();
  const url = "https://user-api.simplybook.me";
  const rpc = { jsonrpc: "2.0", method, params, id: Date.now() };
  const headers = { "Content-Type": "application/json", "X-Company-Login": COMPANY_LOGIN, "X-Token": token };
  const resp = await axios.post(url, rpc, { headers, timeout: 15000 });
  if (resp.data && resp.data.error) throw new Error(JSON.stringify(resp.data.error));
  return resp.data.result;
}

// ensure bookings file exists
if (!fs.existsSync(BOOKINGS_FILE)) fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([]));

// helper: read/write bookings
function readBookings() {
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    return [];
  }
}
function writeBookings(arr) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(arr, null, 2));
}

// =================== PUBLIC API ROUTES ===================

// ping + health
app.get("/api/ping", (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.get("/api/health", async (req, res) => {
  try {
    if (MOCK_MODE) return res.json({ ok: true, simplybook_token: false, mock: true });
    let token;
    try {
      token = await getSimplyBookToken();
    } catch (err) {
      return res.json({ ok: true, simplybook_token: false, token_error: String(err) });
    }
    res.json({ ok: true, simplybook_token: !!token });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/services  -> returns list of services (mock or real)
app.get("/api/services", async (req, res) => {
  try {
    if (MOCK_MODE) {
      // mock services
      const mockServices = [
        { id: "svc-1", name: "Badminton - Single Court", description: "Standard indoor badminton court", duration: 60, price: 250 },
        { id: "svc-2", name: "Tennis Court (Outdoor)", description: "Outdoor tennis court", duration: 60, price: 400 },
        { id: "svc-3", name: "Basketball Pickup (Half-court)", description: "Indoor half-court booking", duration: 60, price: 600 }
      ];
      return res.json({ success: true, services: mockServices });
    }

    const events = await simplyBookRpc("getEventList", []);
    // map to simpler shape
    const services = events.map(e => ({ id: e.id, name: e.name, description: e.description || "", duration: e.duration || 60 }));
    res.json({ success: true, services });
  } catch (e) {
    console.error("GET /api/services error:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

// POST /api/court/availability/check  (keeps earlier behavior; support mock)
app.post("/api/court/availability/check", async (req, res) => {
  try {
    const { preferredLocation = "", indoorOutdoor = "any", sport = "", dateFrom, dateTo, preferredTime = "" } = req.body || {};
    if (!dateFrom || !dateTo) return res.status(400).json({ success: false, error: "dateFrom and dateTo required" });
    if (MOCK_MODE) {
      // produce a simple mock availability matrix with hourly slots near preferredTime
      const pref = preferredTime || "18:00";
      const mockDate = dateFrom;
      const slot = pref;
      const results = [
        { service: { id: "svc-1", name: (sport || "Badminton") + " (mock)", duration: 60 }, units: [
            { unit: { id: "u-1", name: `${preferredLocation || "Makati Sports Center"} (Indoor #1)`, description: "Mock court" }, startTimes: { [mockDate]: [slot] } },
            { unit: { id: "u-2", name: `Riverside Arena (Indoor #2)`, description: "Mock court 2" }, startTimes: { [mockDate]: [slot] } },
          ]
        }
      ];
      return res.json({ success: true, dateFrom, dateTo, preferredTime, results });
    }

    // real SimplyBook logic
    const services = await simplyBookRpc("getEventList", []);
    const units = await simplyBookRpc("getUnitList", []);

    const sportLower = (sport || "").toLowerCase();
    const candidateServices = services.filter(s => !sportLower || (s.name + " " + (s.description || "")).toLowerCase().includes(sportLower));
    const matchingUnits = units.filter(u => {
      const txt = (u.name + " " + (u.description || "")).toLowerCase();
      const locOk = !preferredLocation || txt.includes(preferredLocation.toLowerCase());
      if (!locOk) return false;
      if (indoorOutdoor === "any") return true;
      if (indoorOutdoor === "indoor") return txt.includes("indoor");
      if (indoorOutdoor === "outdoor") return txt.includes("outdoor") || txt.includes("park") || txt.includes("field");
      return true;
    });

    const preferredMinutes = preferredTime ? parseInt(preferredTime.split(":")[0],10) * 60 : null;

    const results = [];
    for (const svc of candidateServices) {
      const possibleUnitIds = svc.unit_map ? Object.keys(svc.unit_map).map(String) : null;
      const allowedUnits = matchingUnits.filter(u => !possibleUnitIds || possibleUnitIds.includes(String(u.id)));
      const unitAvailPromises = allowedUnits.map(async (u) => {
        try {
          const startTimes = await simplyBookRpc("getStartTimeMatrix", [dateFrom, dateTo, svc.id, u.id, 1]);
          if (preferredMinutes != null) {
            for (const d in startTimes) {
              startTimes[d] = (startTimes[d] || []).filter(t => {
                const parts = t.split(":"); const mins = parseInt(parts[0])*60 + parseInt(parts[1]||0);
                return Math.abs(mins - preferredMinutes) <= 30;
              });
              if (!startTimes[d] || startTimes[d].length === 0) delete startTimes[d];
            }
          }
          return { unit: u, startTimes };
        } catch (err) {
          return { unit: u, error: String(err) };
        }
      });
      const availPerUnit = await Promise.all(unitAvailPromises);
      results.push({ service: { id: svc.id, name: svc.name, duration: svc.duration }, units: availPerUnit });
    }
    res.json({ success: true, dateFrom, dateTo, preferredTime, results });
  } catch (e) {
    console.error("/api/court/availability/check error:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

// POST /api/book  -> create booking and persist to file
app.post("/api/book", (req, res) => {
  try {
    const { serviceId, serviceName, unitId, unitName, date, time, customerName, contact, price } = req.body || {};
    if (!serviceId || !unitId || !date || !time || !customerName) return res.status(400).json({ success: false, error: "Missing required fields" });

    const bookings = readBookings();
    const id = "bk-" + Date.now();
    const booking = {
      id, serviceId, serviceName, unitId, unitName, date, time, customerName, contact: contact || "", price: price || null,
      status: "confirmed_mock", createdAt: new Date().toISOString()
    };
    bookings.push(booking);
    writeBookings(bookings);

    res.json({ success: true, booking });
  } catch (e) {
    console.error("/api/book error:", e);
    res.status(500).json({ success: false, error: String(e) });
  }
});

// GET /api/bookings -> read all bookings
app.get("/api/bookings", (req, res) => {
  try {
    const bookings = readBookings();
    res.json({ success: true, bookings });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

// serve frontend static files
app.use(express.static(path.join(__dirname)));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Courtify Booking (with SimplyBook/mock) running at http://localhost:${PORT}`));
