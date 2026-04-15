/**
 * hash.js — ES Module version
 * Uses Node.js built-in crypto. No npm install needed.
 */

import crypto from "crypto";

export function generateHash(data, new_value, secretKey) {
  const payload = JSON.stringify({ data, new_value });
  return crypto.createHash("sha256").update(payload + secretKey).digest("hex");
}

export function verifyHash(data, new_value, receivedHash, secretKey) {
  const expectedHash = generateHash(data, new_value, secretKey);
  try {
    const a = Buffer.from(expectedHash, "hex");
    const b = Buffer.from(receivedHash,  "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}