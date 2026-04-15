import { generateHash, verifyHash } from "./utils/hash.js";
import { securityMiddleware } from "./middleware/security.js";

const SECRET = process.env.SECRET_KEY || "demo123";
process.env.SECRET_KEY = SECRET;

function mockRes() {
  const r = { _status: null, _body: null };
  r.status = (code) => { r._status = code; return r; };
  r.json   = (body) => { r._body  = body; return r; };
  return r;
}

const sampleData     = [1.2, 1.5, 1.8, 2.1, 2.3];
const sampleNewValue = 2.5;
const goodHash       = generateHash(sampleData, sampleNewValue, SECRET);

console.log("\n====================================");
console.log("  EnergyMonitor Security Module Test");
console.log("====================================\n");
console.log(`SECRET_KEY    : ${SECRET}`);
console.log(`Generated Hash: ${goodHash}\n`);

let passed = 0, failed = 0;
function assert(label, condition) {
  if (condition) { console.log(`  ✅ PASS — ${label}`); passed++; }
  else           { console.log(`  ❌ FAIL — ${label}`); failed++; }
}

assert("Hash is deterministic",
  generateHash(sampleData, sampleNewValue, SECRET) === generateHash(sampleData, sampleNewValue, SECRET));

assert("verifyHash accepts correct hash",
  verifyHash(sampleData, sampleNewValue, goodHash, SECRET));

assert("verifyHash rejects wrong hash",
  !verifyHash(sampleData, sampleNewValue, "deadbeef", SECRET));

{
  const req = { headers: {}, body: { data: sampleData, new_value: sampleNewValue, hash: goodHash } };
  const res = mockRes(); let nextCalled = false;
  securityMiddleware(req, res, () => { nextCalled = true; });
  assert("Middleware rejects missing API key (401)", res._status === 401 && !nextCalled);
}
{
  const req = { headers: { "x-api-key": "wrongkey" }, body: { data: sampleData, new_value: sampleNewValue, hash: goodHash } };
  const res = mockRes(); let nextCalled = false;
  securityMiddleware(req, res, () => { nextCalled = true; });
  assert("Middleware rejects wrong API key (401)", res._status === 401 && !nextCalled);
}
{
  const req = { headers: { "x-api-key": SECRET }, body: { data: [9,9,9], new_value: sampleNewValue, hash: goodHash } };
  const res = mockRes(); let nextCalled = false;
  securityMiddleware(req, res, () => { nextCalled = true; });
  assert("Middleware rejects tampered data (400)", res._status === 400 && !nextCalled);
}
{
  const req = { headers: { "x-api-key": SECRET }, body: { data: sampleData, new_value: sampleNewValue, hash: goodHash } };
  const res = mockRes(); let nextCalled = false;
  securityMiddleware(req, res, () => { nextCalled = true; });
  assert("Middleware accepts valid request and calls next()", nextCalled && res._status === null);
}

console.log(`\n====================================`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`====================================\n`);