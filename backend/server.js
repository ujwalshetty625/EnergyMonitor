import cors from "cors";
import express from "express";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 4000;

// Paths (ML)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const mlScript = path.join(projectRoot, "ml", "model.py");

// Middleware
app.use(cors());
app.use(express.json());

// 🔥 ML FUNCTION
function runMlScript(data, newValue) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ data, new_value: newValue });

    execFile("python", [mlScript, payload], (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr?.trim() || error.message));
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error("Invalid ML response"));
      }
    });
  });
}

// ─────────────────────────────
// 📊 IoT SIMULATION (MERGED)
// ─────────────────────────────
const readings = [];
const ANOMALY_THRESHOLD = 5.0;

function generateReading() {
  const isTheft = Math.random() < 0.1;
  const current = isTheft
    ? +(5.1 + Math.random() * 3.9).toFixed(2)
    : +(1 + Math.random() * 3.5).toFixed(2);

  return {
    id: Date.now(),
    current,
    timestamp: new Date().toISOString(),
    anomaly: current > ANOMALY_THRESHOLD,
  };
}

// Seed data
for (let i = 20; i >= 1; i--) {
  const r = generateReading();
  r.timestamp = new Date(Date.now() - i * 60000).toISOString();
  readings.push(r);
}

// Auto IoT
setInterval(() => {
  const r = generateReading();
  readings.push(r);
  if (readings.length > 50) readings.shift();
}, 5000);

// ─────────────────────────────
// ROUTES
// ─────────────────────────────

// Health
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime().toFixed(1) + "s",
  });
});

// GET data
app.get("/api/data", (_req, res) => {
  res.json({
    success: true,
    latest: readings[readings.length - 1],
    history: readings.slice(-20),
  });
});

// POST data
app.post("/api/data", (req, res) => {
  const { current } = req.body;

  if (typeof current !== "number") {
    return res.status(400).json({ error: "Invalid current" });
  }

  const r = {
    id: Date.now(),
    current,
    timestamp: new Date().toISOString(),
    anomaly: current > ANOMALY_THRESHOLD,
  };

  readings.push(r);
  if (readings.length > 50) readings.shift();

  res.json({ success: true, data: r });
});

// 🔥 ML ROUTE
app.post("/api/anomaly", async (req, res) => {
  const { data, new_value } = req.body ?? {};

  if (
    !Array.isArray(data) ||
    data.length !== 5 ||
    typeof new_value !== "number"
  ) {
    return res.status(400).json({
      success: false,
      error: "Invalid input format",
    });
  }

  try {
    const result = await runMlScript(data, new_value);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});