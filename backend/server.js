import "dotenv/config";
import securityMiddleware from "./middleware/security.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import DashboardData from "./models/DashboardData.js";

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;

// Security settings
const MAX_CLOCK_SKEW_MS = Number(process.env.MAX_CLOCK_SKEW_MS || 5 * 60 * 1000);
const DISABLE_INSECURE_INGEST = String(process.env.DISABLE_INSECURE_INGEST || "false") === "true";
const METER_ID = process.env.METER_ID || "meter-001";
const METER_API_KEY = process.env.METER_API_KEY || "change-this-api-key";
const METER_HMAC_SECRET = process.env.METER_HMAC_SECRET || "change-this-hmac-secret";

const meterCredentials = {
  [METER_ID]: {
    apiKey: METER_API_KEY,
    secret: METER_HMAC_SECRET,
  },
};

const usedNonces = new Map();

// ML Path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const mlScript = path.join(projectRoot, "ml", "model.py");

// Middleware
app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

// MongoDB Connect
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("⚠️  MongoDB connection failed:", err.message));

// Security Utils
function safeEqual(a, b) {
  const ab = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function payloadHash(rawBody) {
  return crypto.createHash("sha256").update(rawBody || "").digest("hex");
}

function verifyMeterRequest(req) {
  const meterId = req.header("x-meter-id") || "";
  const apiKey = req.header("x-api-key") || "";
  const timestamp = req.header("x-timestamp") || "";
  const nonce = req.header("x-nonce") || "";
  const signature = req.header("x-signature") || "";

  if (!meterId || !apiKey || !timestamp || !nonce || !signature) return { ok: false, message: "Missing headers" };
  const creds = meterCredentials[meterId];
  if (!creds || !safeEqual(apiKey, creds.apiKey)) return { ok: false, message: "Invalid credentials" };
  const ts = Number(timestamp);
  if (Math.abs(Date.now() - ts) > MAX_CLOCK_SKEW_MS) return { ok: false, message: "Timestamp skew" };
  
  const rawBody = req.rawBody || "";
  const expectedSignature = crypto.createHmac("sha256", creds.secret).update(`${meterId}.${timestamp}.${nonce}.${rawBody}`).digest("hex");
  if (!safeEqual(signature, expectedSignature)) return { ok: false, message: "Bad signature" };

  return { ok: true, meterId, payloadHash: payloadHash(rawBody) };
}

// ML Engine
function runMlScript(data, newValue) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ data, new_value: newValue });
    execFile("python", [mlScript, payload], (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr?.trim() || error.message));
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error("Invalid ML response"));
      }
    });
  });
}

// Memory fallback
const readings = [];

function generateReading() {
  const isTheft = Math.random() < 0.1;
  return +(isTheft ? 5.1 + Math.random() * 3.9 : 1 + Math.random() * 3.5).toFixed(2);
}

// Pre-fill memory fallback just in case
for (let i = 20; i >= 1; i--) {
  readings.push({
    meterId: "simulator",
    current: generateReading(),
    voltage: 230,
    timestamp: new Date(Date.now() - i * 60000),
    anomaly: false
  });
}

// Simulation & Storage Aggregation
async function processAndSaveReading(current, device_id, timestamp, status, verification = {}) {
  // Pull last 5 for ML from DB or memory
  let last5 = [];
  if (mongoose.connection.readyState === 1) {
      const recent = await DashboardData.find().sort({ timestamp: -1 }).limit(5).lean();
      last5 = recent.length === 5 ? recent.reverse().map(r => r.current) : [1,1,1,1,1];
  } else {
      last5 = readings.length >= 5 ? readings.slice(-5).map(r => r.current) : [1,1,1,1,1];
  }

  let mlResult = { is_anomaly: status === "theft", severity: "normal", confidence: 0 };
  try {
      mlResult = await runMlScript(last5, current);
      if (status === "theft") mlResult.is_anomaly = true;
  } catch (err) {
      console.error("ML Error:", err.message);
  }

  const r = {
    meterId: device_id || verification.meterId || "simulator",
    current: current,
    voltage: 230,
    timestamp: timestamp || new Date(),
    integrityVerified: verification.integrityVerified || false,
    payloadHash: verification.payloadHash || null,
    anomaly: mlResult.is_anomaly || false,
    severity: mlResult.severity || "normal",
    confidence: mlResult.confidence || 0,
  };

  // Memory fallback save
  const memR = { ...r, id: Date.now() };
  readings.push(memR);
  if (readings.length > 50) readings.shift();

  if (mongoose.connection.readyState === 1) {
    try {
      await DashboardData.create(r);
    } catch (e) {
      console.log("DB Save failed", e.message);
    }
  }

  return r;
}

// Start Simulator
setInterval(() => {
  processAndSaveReading(generateReading(), "simulator", new Date(), "normal");
}, 5000);

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState === 1 });
});

app.get("/api/data", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const dbReadings = await DashboardData.find().sort({ timestamp: -1 }).limit(20).lean();
      if (dbReadings.length > 0) {
        return res.json({
          success: true,
          latest: dbReadings[0],
          history: dbReadings.reverse(),
          totalReadings: await DashboardData.countDocuments(),
        });
      }
    }
  } catch {}
  
  res.json({
    success: true,
    latest: readings[readings.length - 1] || { current: 0 },
    history: readings.slice(-20),
    totalReadings: readings.length,
  });
});

app.post("/api/data", async (req, res) => {
  if (DISABLE_INSECURE_INGEST) return res.status(403).json({ error: "Legacy ingest disabled" });
  let { current, device_id, value, timestamp, status } = req.body;
  if (current === undefined && value !== undefined) current = value;
  if (typeof current !== "number" && isNaN(parseFloat(current))) {
    return res.status(400).json({ error: "Invalid payload format. Provide { value: <number> }" });
  }

  // Handle older payloads sending timestamp as number vs new sending string, fallback safely
  const parsedCurrent = parseFloat(parseFloat(current).toFixed(2));
  let ts = new Date();
  if (timestamp) {
      ts = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000);
      if (isNaN(ts.getTime())) ts = new Date();
  }

  const saved = await processAndSaveReading(parsedCurrent, device_id, ts, status);
  res.status(201).json({ success: true, data: saved });
});

app.post("/api/meter/data", securityMiddleware, async (req, res) => {
  const verification = verifyMeterRequest(req);
  if (!verification.ok) return res.status(401).json({ error: verification.message });
  
  let { current, value } = req.body;
  if (current === undefined && value !== undefined) current = value;
  const parsedCurrent = parseFloat(current);

  if (isNaN(parsedCurrent)) return res.status(400).json({ error: "Numeric reading required" });

  const saved = await processAndSaveReading(parsedCurrent, verification.meterId, new Date(), "normal", {
      integrityVerified: true, payloadHash: verification.payloadHash
  });

  res.status(201).json({ success: true, data: saved });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend with ML + MongoDB Atlas running at http://0.0.0.0:${PORT}`);
});