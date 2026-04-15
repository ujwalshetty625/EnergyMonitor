import { verifyHash } from "../utils/hash.js";

export function securityMiddleware(req, res, next) {
  const SECRET_KEY = process.env.SECRET_KEY;

  if (!SECRET_KEY) {
    console.error("[Security] ❌ SECRET_KEY is not set in environment variables.");
    return res.status(500).json({ error: "Server misconfiguration: SECRET_KEY missing." });
  }

  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    console.warn("[Security] ❌ Missing x-api-key header.");
    return res.status(401).json({ error: "Unauthorized: Missing API key. Include x-api-key header." });
  }
  if (apiKey !== SECRET_KEY) {
    console.warn("[Security] ❌ Invalid API key.");
    return res.status(401).json({ error: "Unauthorized: Invalid API key." });
  }
  console.log("[Security] ✅ API key verified.");

  const { data, new_value, hash } = req.body;
  if (!data || new_value === undefined || !hash) {
    return res.status(400).json({ error: "Bad Request: Body must include 'data', 'new_value', and 'hash'." });
  }
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "Bad Request: 'data' must be an array." });
  }
  if (typeof new_value !== "number") {
    return res.status(400).json({ error: "Bad Request: 'new_value' must be a number." });
  }
  if (!verifyHash(data, new_value, hash, SECRET_KEY)) {
    console.warn("[Security] ❌ Hash mismatch — data may be tampered.");
    return res.status(400).json({ error: "Bad Request: Data integrity check failed. Hash mismatch." });
  }

  console.log("[Security] ✅ Data integrity verified. Passing to handler.");
  next();
}
