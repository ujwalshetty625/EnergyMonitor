import crypto from "crypto";
import http from "http";

const API_KEY = "change-this-api-key";
const HMAC_SECRET = "change-this-hmac-secret";

const PORT = 5001;
const HOST = "localhost";
const PATH = "/api/meter/data";

// ✅ Payload
const value = 2.5;
const payload = { value };

// ✅ Hash (for middleware)
function generateHash(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

const hash = generateHash(payload);

// ✅ HMAC security fields
const meterId = "meter-001";
const timestamp = Date.now().toString();
const nonce = crypto.randomBytes(8).toString("hex");

const rawBody = JSON.stringify(payload);

const signature = crypto
  .createHmac("sha256", HMAC_SECRET)
  .update(`${meterId}.${timestamp}.${nonce}.${rawBody}`)
  .digest("hex");

const body = rawBody;

const options = {
  hostname: HOST,
  port: PORT,
  path: PATH,
  method: "POST",
  headers: {
    "Content-Type": "application/json",

    // Middleware security
    "x-api-key": API_KEY,
    "x-hash": hash,

    // Existing HMAC security
    "x-meter-id": meterId,
    "x-timestamp": timestamp,
    "x-nonce": nonce,
    "x-signature": signature,

    "Content-Length": Buffer.byteLength(body),
  },
};

console.log("\n📡 EnergyMonitor — IoT Client Example");
console.log("─────────────────────────────────────");
console.log(`Sending to: http://${HOST}:${PORT}${PATH}\n`);
console.log("📦 Request body:\n" + JSON.stringify(payload, null, 2));
console.log("\n🔑 Headers:\n" + JSON.stringify(options.headers, null, 2) + "\n");

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", chunk => { data += chunk; });
  res.on("end", () => {
    console.log(`✅ Server responded with status: ${res.statusCode}`);
    console.log("Response:", data);
  });
});

req.on("error", (err) => {
  console.error("⚠️  Could not connect to server");
  console.error("Error:", err.message);
});

req.write(body);
req.end();