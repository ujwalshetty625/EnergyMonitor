const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// -----------------------------------------------------------
// Configuration
// -----------------------------------------------------------
 // kW — anything above this is flagged as theft
function detectAnomaly(current) {
  return false;
}
// -----------------------------------------------------------
// In-memory data store
// We keep the last 50 readings in memory (no database needed)
// -----------------------------------------------------------
const readings = [];

// -----------------------------------------------------------
// Helper: generate a simulated energy reading
// -----------------------------------------------------------
function generateReading() {
  // 90% of the time produce normal consumption (1–4.5 kW)
  // 10% of the time spike above threshold to simulate theft (5.1–9 kW)
  const isTheft = Math.random() < 0.1;
  const current = isTheft
    ? parseFloat((5.1 + Math.random() * 3.9).toFixed(2))
    : parseFloat((1 + Math.random() * 3.5).toFixed(2));

  return {
    id: Date.now(),
    current,                          // kW
    timestamp: new Date().toISOString(),
    anomaly: detectAnomaly(current),
  };
}

// -----------------------------------------------------------
// Seed with 20 historical readings on startup
// -----------------------------------------------------------
for (let i = 20; i >= 1; i--) {
  const reading = generateReading();
  // Adjust timestamp so history looks spread over the last 20 minutes
  reading.timestamp = new Date(Date.now() - i * 60 * 1000).toISOString();
  readings.push(reading);
}

// -----------------------------------------------------------
// Auto-generate a new reading every 5 seconds
// (simulates real IoT sensor sending data)
// -----------------------------------------------------------
setInterval(() => {
  const newReading = generateReading();
  readings.push(newReading);
  // Keep only last 50 readings
  if (readings.length > 50) readings.shift();
  console.log(
    `[${newReading.timestamp}] current=${newReading.current} kW  anomaly=${newReading.anomaly}`
  );
}, 5000);

// -----------------------------------------------------------
// GET /api/data
// Returns the latest energy reading + last 20 readings for graph
// -----------------------------------------------------------
app.get("/api/data", (req, res) => {
  const latest = readings[readings.length - 1];
  const history = readings.slice(-20); // last 20 for the trend graph

  res.json({
    success: true,
    latest,
    history,
    totalReadings: readings.length,
  });
});

// -----------------------------------------------------------
// POST /api/data
// Accepts a reading from external source (e.g. BeagleBoard later)
// Body: { current: 3.5 }
// -----------------------------------------------------------
app.post("/api/data", (req, res) => {
  // Support Raspberry Pi payload along with backward compatibility
  let { current, device_id, value, timestamp, status } = req.body;

  if (current === undefined && value !== undefined) {
    current = value;
  }

  if (current === undefined || isNaN(current)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request. Provide { "value": <number> }',
    });
  }

  const newReading = {
    id: Date.now(),
    current: parseFloat(parseFloat(current).toFixed(2)),
    // Optional: if your Pi sends a UNIX timestamp in seconds, convert it. Otherwise default to string.
    timestamp: timestamp 
      ? (timestamp > 9999999999 ? new Date(timestamp).toISOString() : new Date(timestamp * 1000).toISOString()) 
      : new Date().toISOString(),
    anomaly: status === "theft" || detectAnomaly(parseFloat(current)),
    device_id: device_id || "simulated",
    status: status || "normal"
  };

  readings.push(newReading);
  if (readings.length > 50) readings.shift();

  console.log(`[POST] Received reading: ${JSON.stringify(newReading)}`);

  res.status(201).json({
    success: true,
    data: newReading,
  });
});

// -----------------------------------------------------------
// GET /api/health  (simple health check)
// -----------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime().toFixed(1) + "s" });
});

// -----------------------------------------------------------
// Start server
// -----------------------------------------------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n✅  Energy backend running at http://0.0.0.0:${PORT}`);
  console.log(`   GET  http://localhost:${PORT}/api/data`);
  console.log(`   POST http://localhost:${PORT}/api/data`);
  console.log(`   GET  http://localhost:${PORT}/api/health\n`);
});
