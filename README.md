# Courtify

Real-time court availability checker and booking manager for indoor and outdoor sports venues.  
“Book. Play. Repeat.”

This is a web application designed to help users check real-time court availability before making a reservation. Through a simple and intuitive interface, users can input a court ID, date, start time, and duration to determine if the chosen slot is open for booking.

This project integrates Node.js and Express.js backend with a clean, static HTML/CSS/JavaScript frontend, offering an example of how API endpoints can communicate seamlessly with a client-side form. The system validates inputs, checks court hours, prevents overlapping reservations, and provides informative responses to guide the user.

# **Tech Stack and Version Numbers**
- **Frontend:**  
  - HTML5  
  - CSS3 (Custom Responsive Styling)  
  - Vanilla JavaScript (ES6)

- **Backend:**  
  - Node.js **v18+**  
  - Express.js **v4.19.2**  
  - Axios **v1.13.1**  
  - CORS **v2.8.5**  
  - File System (JSON-based data persistence)

- **External API:**  
  - SimplyBook API (used for real-time booking and schedule data)

# **Setup Instructions**
1. **Clone the repository:**
   ```bash
   git clone https://github.com/MikaelaSytin/GC2.git
   cd GC2
2. bash npm install
3. Set environment variables (for SimplyBook integration):

   SIMPLYBOOK_COMPANY_LOGIN=your_company_login
   SIMPLYBOOK_API_KEY=your_api_key
   MOCK_MODE=true
4. bash npm start
5. Access in: http://localhost:3000

# **API Documentation & Links**
The Courtify Booking API provides endpoints for checking real-time court availability, retrieving services, creating and viewing bookings, and performing system health checks.  
All requests and responses use JSON format.  
Below are the live API links currently used by the application.

1. Court Availability Check  

Method: POST  

Endpoint: https://gcmini.onrender.com/api/court/availability/check  

Description: Checks if a specific court is available based on sport, location, and preferred schedule. If SimplyBook credentials are active, this endpoint connects to the SimplyBook API; otherwise, it returns mock data for testing.

Request Example:
{
  "preferredLocation": "Makati",
  "indoorOutdoor": "indoor",
  "sport": "Badminton",
  "dateFrom": "2025-11-10",
  "dateTo": "2025-11-10",
  "preferredTime": "14:00"
}
Successful Response:
{
  "success": true,
  "results": [
    {
      "service": {
        "id": "svc-1",
        "name": "Badminton - Single Court (mock)",
        "duration": 60
      },
      "units": [
        {
          "unit": {
            "id": "u-1",
            "name": "Makati Sports Center (Indoor #1)"
          },
          "startTimes": {
            "2025-11-10": ["14:00", "15:00"]
          }
        }
      ]
    }
  ]
}

If any input is invalid, a 400–500 error is returned

2. Get Services

Method: GET

Endpoint: https://gcmini.onrender.com/api/services

Description: Retrieves a list of all available sports and court services. Used to populate the dropdown options for users selecting what to book.

3. Create Booking

Method: POST

Endpoint: https://gcmini.onrender.com/api/book

Description: Creates a booking record for a selected service, location, date, and time. All new bookings are saved to bookings.json if the environment is writable, or stored temporarily in memory if running on a read-only host.

4. Get All Bookings
   
Method: GET

Endpoint: https://gcmini.onrender.com/api/bookings

Description: Returns all bookings currently stored in the system. Useful for testing and verifying if new bookings are saved correctly.

6. Health Check

Method: GET

Endpoint: https://gcmini.onrender.com/api/health

Description: Returns a simple message confirming that the server and API are running correctly.

Example Response: { "success": true, "message": "Server is running normally." }

6. Frontend Home Route

Method: GET

Endpoint: https://gcmini.onrender.com/

Description: Serves the main frontend interface (index.html), which connects to the API routes above. All user interactions, such as form submissions and court lookups, happen through this web interface.

Links:
- Court Availability Check: https://gcmini.onrender.com/api/court/availability/check
- Get All Services: https://gcmini.onrender.com/api/services
- Create Booking: https://gcmini.onrender.com/api/book
- Get All Bookings: https://gcmini.onrender.com/api/bookings
- Health Check: https://gcmini.onrender.com/api/health
- Frontend: https://gcmini.onrender.com/

Notes:
- All endpoints accept and return JSON data.
- The base URL for the live deployment is https://gcmini.onrender.com
- When testing locally, replace the base URL with http://localhost:3000
- If deployed to a read-only environment (e.g., Render, Vercel), the app automatically switches to in-memory booking mode.
- CORS is enabled for cross-origin API requests.

# **Deployment Link**: https://gc-2-nu.vercel.app/ or http://localhost:3000/

**# Performance Screenshots**
<img width="751" height="660" alt="BEFORE" src="https://github.com/user-attachments/assets/7c23ce99-da23-4810-8b2c-3ff115e5a292" />
<img width="870" height="696" alt="AFTER" src="https://github.com/user-attachments/assets/fa5baafc-d900-4cff-a95e-dfb64ee3259b" />

# **Known Issues and Limitations**
1. Read-Only File System in Hosting Platforms

When deployed to serverless environments such as **Render**, **Vercel**, or **Netlify**, the app may encounter the following error: Error: EROFS: read-only file system, open '/var/task/bookings.json'

2. No Persistent Database

The app currently stores bookings in a local JSON file (`bookings.json`).  
This means that all saved data is erased whenever:
- The server restarts or redeploys  
- The host platform clears the filesystem  

3. Limited Concurrency Support

Since bookings are stored in a flat JSON file, simultaneous booking requests could cause race conditions or file overwrite issues under high traffic.

4. Mock Mode Dependency

If the SimplyBook API credentials are not configured, the system runs in **mock mode** by default.  
While this allows local testing, the mock data does not reflect real-time availability, and bookings made in this mode do not sync with an external scheduling system.

5. Limited Mobile Responsiveness

The frontend layout, while clean and functional, could still be improved for smaller mobile screens.  
Certain input fields and buttons may not resize optimally on older devices.

6. Lack of Authentication or Admin Panel

Currently, the app does not include:
- User login or session management  
- Admin dashboard for reviewing, editing, or canceling bookings  

7. No Time Zone Handling

All dates and times are processed in the server’s local time zone. This could cause confusion for users in different regions, especially when booking across multiple branches.

10. Limited Error Handling

While the backend provides structured error messages, it currently lacks detailed server-side logging and user-friendly frontend alerts for:
- Network issues  
- API downtime  
- Invalid form input

**Future Development Goals:**
- Migrating from JSON to a real database  
- Adding authentication and role-based access  
- Improving performance, concurrency, and mobile design  
- Expanding real API integration for real-time bookings

