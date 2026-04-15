import crypto from "crypto";
import http from "http";

const SECRET_KEY = process.env.SECRET_KEY || "demo123";
const PORT = process.env.SERVER_PORT || process.env.PORT || 4000;
const HOST = "localhost";
const PATH = "/api/anomaly";

function generateHash(data, new_value, secretKey) {
  const payload = JSON.stringify({ data, new_value });
  return crypto.createHash("sha256").update(payload + secretKey).digest("hex");
}

const data      = [1.2, 1.5, 1.8, 2.1, 2.3];
const new_value = 2.5;
const hash      = generateHash(data, new_value, SECRET_KEY);

const body = JSON.stringify({ data, new_value, hash });

const options = {
  hostname: HOST,
  port: PORT,
  path: PATH,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": SECRET_KEY,
    "Content-Length": Buffer.byteLength(body),
  },
};

console.log("\n📡 EnergyMonitor — IoT Client Example");
console.log("─────────────────────────────────────");
console.log(`Sending to: http://${HOST}:${PORT}${PATH}\n`);
console.log("📦 Request body:\n" + JSON.stringify(JSON.parse(body), null, 2));
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
  console.error("⚠️  Could not connect to server (is it running?)");
  console.error("Error:", err.message);
  console.log("\n💡 The hash was generated successfully — start server.js to test the full flow.");
});

req.write(body);
req.end();
