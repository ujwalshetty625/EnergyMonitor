
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");
const DashboardData = require("./models/DashboardData");

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/energy-monitor";
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

function validateSecurityConfiguration() {
  const usingDefaultApiKey = METER_API_KEY === "change-this-api-key";
  const usingDefaultSecret = METER_HMAC_SECRET === "change-this-hmac-secret";

  if (usingDefaultApiKey || usingDefaultSecret) {
    const message =
      "NS 9.6 warning: default meter secrets detected. Set METER_API_KEY and METER_HMAC_SECRET in .env.";

    if (process.env.NODE_ENV === "production") {
      throw new Error(`${message} Refusing to start in production.`);
    }

    console.warn(`⚠️  ${message}`);
  }
}
const { execFile } = require("child_process");
const path = require("path");

// Paths (ML)
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

function safeEqual(a, b) {
  const ab = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function payloadHash(rawBody) {
  return crypto.createHash("sha256").update(rawBody || "").digest("hex");
}

function cleanupNonces() {
  const now = Date.now();
  for (const [key, createdAt] of usedNonces.entries()) {
    if (now - createdAt > MAX_CLOCK_SKEW_MS) usedNonces.delete(key);
  }
}

function verifyMeterRequest(req) {
  const meterId = req.header("x-meter-id") || "";
  const apiKey = req.header("x-api-key") || "";
  const timestamp = req.header("x-timestamp") || "";
  const nonce = req.header("x-nonce") || "";
  const signature = req.header("x-signature") || "";

  if (!meterId || !apiKey || !timestamp || !nonce || !signature) {
    return { ok: false, message: "Missing authentication headers" };
  }

  const creds = meterCredentials[meterId];
  if (!creds || !safeEqual(apiKey, creds.apiKey)) {
    return { ok: false, message: "Invalid meter credentials" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, message: "Invalid timestamp" };
  }

  const now = Date.now();
  if (Math.abs(now - ts) > MAX_CLOCK_SKEW_MS) {
    return { ok: false, message: "Timestamp out of allowed window" };
  }

  cleanupNonces();
  const nonceKey = `${meterId}:${nonce}`;
  if (usedNonces.has(nonceKey)) {
    return { ok: false, message: "Replay detected" };
  }

  const rawBody = req.rawBody || "";
  const signingInput = `${meterId}.${timestamp}.${nonce}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", creds.secret)
    .update(signingInput)
    .digest("hex");

  if (!safeEqual(signature, expectedSignature)) {
    return { ok: false, message: "Integrity check failed (bad signature)" };
  }

  usedNonces.set(nonceKey, now);
  return { ok: true, meterId, payloadHash: payloadHash(rawBody) };
}

function validateReading(current, voltage) {
  const numericCurrent = Number(current);
  const numericVoltage = Number(voltage ?? 230);

  if (!Number.isFinite(numericCurrent) || numericCurrent < 0 || numericCurrent > 100) {
    return { ok: false, message: "Invalid current value" };
  }

  if (!Number.isFinite(numericVoltage) || numericVoltage < 100 || numericVoltage > 300) {
    return { ok: false, message: "Invalid voltage value" };
  }

  return { ok: true, current: numericCurrent, voltage: numericVoltage };
}

validateSecurityConfiguration();

mongoose.connect(MONGODB_URI, {
  // Removed deprecated options (not needed in Mongoose 8.0+)
  serverSelectionTimeoutMS: 5000, // 5 second timeout
  socketTimeoutMS: 5000,
})
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    console.log(`   Status: Storing dashboard data every 5 seconds`);
  })
  .catch((err) => {
    console.error("⚠️  MongoDB connection failed:");
    console.error(`   Error: ${err.message}`);
    console.log("   Using in-memory fallback\n");
  });


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

// -----------------------------------------------------------
// In-memory fallback for when MongoDB is not connected
// -----------------------------------------------------------
const readings = [];
const ANOMALY_THRESHOLD = 5.0;

// Helper: generate a simulated energy reading

function generateReading() {
  const isTheft = Math.random() < 0.1;
  const current = isTheft
    ? +(5.1 + Math.random() * 3.9).toFixed(2)
    : +(1 + Math.random() * 3.5).toFixed(2);

  return {

    current,
    voltage: 230,
    timestamp: new Date().toISOString(),
  };
}


// Seed initial data on startup
async function seedInitialData() {
  if (mongoose.connection.readyState !== 1) {
    console.log("⏳ Seeding in-memory data...");
    for (let i = 20; i >= 1; i--) {
      const reading = generateReading();
      reading.timestamp = new Date(Date.now() - i * 60 * 1000).toISOString();
      readings.push(reading);
    }
    console.log(`✅ Seeded ${readings.length} initial readings\n`);
    return;
  }

  try {
    const count = await DashboardData.countDocuments();
    if (count === 0) {
      console.log("📊 Seeding 20 historical readings to MongoDB...");
      const historicalData = [];
      for (let i = 20; i >= 1; i--) {
        const reading = generateReading();
        reading.timestamp = new Date(Date.now() - i * 60 * 1000);
        historicalData.push(reading);
      }
      await DashboardData.insertMany(historicalData);
      console.log(`✅ Seeded ${historicalData.length} readings\n`);
    } else {
      console.log(`✅ Found ${count} existing readings in MongoDB\n`);
    }
  } catch (error) {
    console.error("Error seeding data:", error.message);
  }
}

seedInitialData();
// -----------------------------------------------------------
// Auto-generate and store readings every 5 seconds
// -----------------------------------------------------------
setInterval(async () => {
  const newReading = generateReading();
 
   // Store in memory
   readings.push(newReading);
   if (readings.length > 50) readings.shift();
 
   // Store in MongoDB if connected
   if (mongoose.connection.readyState === 1) {
     try {
       await DashboardData.create({
        meterId: "simulator",
         current: newReading.current,
         voltage: newReading.voltage,
         timestamp: new Date(),
        integrityVerified: true,
        payloadHash: null,
       });
       console.log(
         `[${new Date().toLocaleTimeString()}] Stored: current=${newReading.current} kW`
       );
     } catch (error) {
       console.error("Error storing reading:", error.message);
     }
   } else {
     console.log(
       `[${new Date().toLocaleTimeString()}] Stored (memory): current=${newReading.current} kW`
     );
   }
}, 5000);

// -----------------------------------------------------------
// GET /api/data - latest reading + last 20 readings
// -----------------------------------------------------------
app.get("/api/data", async (req, res) => {
  try {
    // Try to fetch from database if connected
    if (mongoose.connection.readyState === 1) {
      const dbReadings = await DashboardData
        .find()
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

      if (dbReadings.length > 0) {
        const latest = dbReadings[0];
        const history = dbReadings.reverse();
        const totalReadings = await DashboardData.countDocuments();

        return res.json({
          success: true,
          latest: {
            current: latest.current,
            voltage: latest.voltage,
            timestamp: latest.timestamp,
          },
          history: history.map(r => ({
            current: r.current,
            voltage: r.voltage,
            timestamp: r.timestamp,
          })),
          totalReadings,
          source: "mongodb",
        });
      }
    }

    // Fallback to in-memory data if DB not connected or no data
    const latest = readings[readings.length - 1] || { current: 0, timestamp: new Date().toISOString() };

    const history = readings.slice(-20).reverse();

    res.json({
      success: true,
      latest,
      history: history.length > 0 ? history : [],
      totalReadings: readings.length,
      source: "memory",
    });
  } catch (error) {
    console.error("Database error:", error.message);
  
    // Fallback to in-memory if DB fails
    const latest = readings.length > 0 
      ? readings[readings.length - 1] 
      : { current: 0, voltage: 230, timestamp: new Date().toISOString() };
    const history = readings.slice(-20).reverse();

    res.json({
      success: true,
      latest,
      history: history || [],
      totalReadings: readings.length,
      source: "memory",
    });
  }
});

// -----------------------------------------------------------
// POST /api/data - submit reading from device/simulator
// -----------------------------------------------------------
app.post("/api/data", async (req, res) => {
  if (DISABLE_INSECURE_INGEST) {
    return res.status(403).json({
      success: false,
      message: "Legacy /api/data ingest is disabled. Use /api/meter/data with authentication.",
    });
  }

  const { current, voltage, value } = req.body;

  const finalCurrent = current ?? value;

  if (finalCurrent === undefined || isNaN(finalCurrent)) {
    return res.status(400).json({
      success: false,
      message: 'Provide { "current": <number> } or { "value": <number> }',
    });
  }

  try {
    // Create reading object
    const newReading = {
      current: parseFloat(finalCurrent),
      voltage: voltage ?? 230,
      timestamp: new Date().toISOString(),
    };

    // Try to store in database if connected
    if (mongoose.connection.readyState === 1) {
        const saved = await DashboardData.create({
          current: newReading.current,
          voltage: newReading.voltage,
          timestamp: new Date(),
        });

        console.log(`[POST] Stored: current=${newReading.current} kW`);

        return res.status(201).json({
          success: true,
          data: {
            current: saved.current,
            voltage: saved.voltage,
            timestamp: saved.timestamp,
          },
          source: "mongodb",
        });
    }

    // Fallback: Use simple in-memory storage
    readings.push(newReading);
    if (readings.length > 50) readings.shift();

    console.log(
      `[POST] Stored (memory): current=${newReading.current} kW`
    );

    res.status(201).json({
      success: true,
      data: newReading,
      source: "memory",
    });
  } catch (error) {
    console.log(
      `Error storing reading: ${error.message}`
    );
    res.status(500).json({
      success: false,
      message: "Error storing reading",
    });
  }
});

// -----------------------------------------------------------
// POST /api/meter/data - authenticated meter ingestion
// Requires headers: x-meter-id, x-api-key, x-timestamp, x-nonce, x-signature
// Signature input: meterId.timestamp.nonce.rawJsonBody (HMAC-SHA256)
// -----------------------------------------------------------
app.post("/api/meter/data", async (req, res) => {
  const verification = verifyMeterRequest(req);
  if (!verification.ok) {
    return res.status(401).json({
      success: false,
      message: verification.message,
    });
  }

  const { current, voltage, value } = req.body;
  const checked = validateReading(current ?? value, voltage);
  if (!checked.ok) {
    return res.status(400).json({
      success: false,
      message: checked.message,
    });
  }

  const newReading = {
    meterId: verification.meterId,
    current: checked.current,
    voltage: checked.voltage,
    timestamp: new Date().toISOString(),
    integrityVerified: true,
    payloadHash: verification.payloadHash,
  };

  try {
    readings.push(newReading);
    if (readings.length > 50) readings.shift();

    if (mongoose.connection.readyState === 1) {
      const saved = await DashboardData.create({
        meterId: newReading.meterId,
        current: newReading.current,
        voltage: newReading.voltage,
        timestamp: new Date(),
        integrityVerified: true,
        payloadHash: newReading.payloadHash,
      });

      return res.status(201).json({
        success: true,
        data: {
          meterId: saved.meterId,
          current: saved.current,
          voltage: saved.voltage,
          timestamp: saved.timestamp,
          integrityVerified: saved.integrityVerified,
        },
        source: "mongodb",
      });
    }

    return res.status(201).json({
      success: true,
      data: newReading,
      source: "memory",
      note: "MongoDB unavailable, using memory fallback",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error storing secure meter reading: ${error.message}`,
    });
  }
});

// -----------------------------------------------------------
// GET /api/health (Server Health & Database Status)
// -----------------------------------------------------------
app.get("/api/health", async (req, res) => {
  const dbConnected =
    mongoose.connection.readyState === 1 ? true : false;

  res.json({
    status: dbConnected ? "ok" : "degraded",
    uptime: process.uptime().toFixed(1) + "s",
    database: dbConnected ? "connected" : "disconnected",
  });
});

// -----------------------------------------------------------
// Start server (with port fallback)
// -----------------------------------------------------------
function startServer(preferredPort) {
  const server = app.listen(preferredPort, "0.0.0.0", () => {
    console.log(`\n✅ Energy Monitor Dashboard Backend running!`);
    console.log(`   Server: http://localhost:${preferredPort}`);
    console.log(`   Database: ${MONGODB_URI}\n`);
    console.log(`\n📡 API Endpoints:`);
    console.log(`   GET  /api/data         - Get latest reading + last 20`);
    console.log(`   POST /api/data         - Submit reading`);
    console.log(`   POST /api/meter/data   - Secure meter ingestion`);
    console.log(`   GET  /api/health       - Server status\n`);
    console.log(`   Secure mode: DISABLE_INSECURE_INGEST=${DISABLE_INSECURE_INGEST}\n`);
    console.log(`⏰ Auto-generates reading every 5 seconds\n`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      const nextPort = Number(preferredPort) + 1;
      console.warn(`⚠️  Port ${preferredPort} is busy, retrying on ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error("Server start failed:", err.message);
    process.exit(1);
  });
}

// -----------------------------------------------------------
// POST /api/anomaly - ML-based anomaly detection
// -----------------------------------------------------------
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


startServer(PORT);

