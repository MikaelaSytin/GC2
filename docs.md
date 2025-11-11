## Happy (estimate works)
curl -s -X POST http://localhost:3000/api/booking/estimate \
  -H "Content-Type: application/json" \
  -d '{ "facilityId":"courtify-sportsplex", "durationMinutes":90 }' | jq .

## Error (missing durationMinutes → 400)
curl -s -X POST http://localhost:3000/api/booking/estimate \
  -H "Content-Type: application/json" \
  -d '{ "facilityId":"courtify-sportsplex" }' | jq .