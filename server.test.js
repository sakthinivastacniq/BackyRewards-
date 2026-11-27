// End-to-end checks for the demo API: lab award -> ledger -> wallet -> redemption.
const assert = require("node:assert/strict");
const { createServer, OPENING_AWARD } = require("./server");

const week = (overrides = {}) => ({
  days: Array.from({ length: 5 }, (_, i) => ({ id: "d" + i, validated: true, wearHours: 8, eligibleHours: 8 })),
  baseline: { validated: true, hours: 40, shifts: 5, rate: 60, exposure: 8, stress: 5 },
  current: { rate: 42, exposure: 5.6, stress: 4 },
  validated: true,
  comparable: true,
  ...overrides,
});

(async () => {
  const server = createServer().listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (p, body) => {
    const res = await fetch(base + p, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) });
    return { status: res.status, data: await res.json() };
  };
  try {
    let r = await call("/health");
    assert.equal(r.data.purchases, false);
    assert.equal(r.data.policy, "2.2");

    r = await call("/api/wallet");
    assert.equal(r.data.lifetime, OPENING_AWARD);
    assert.equal(r.data.spendable, OPENING_AWARD);
    assert.equal(r.data.level, 1); // Spotter

    // The client asks for Iron Spine and a fresh month; the server uses the ledger instead.
    r = await call("/api/award", { assessment: "week-48", input: week({ level: 4, monthEarned: 0 }) });
    assert.equal(r.status, 200);
    assert.equal(r.data.result.multiplier, 1.05);
    const awarded = r.data.entry.awarded;
    assert.ok(awarded > 0);
    assert.equal(r.data.wallet.lifetime, OPENING_AWARD + awarded);

    // Same week again: no double payment. Different inputs for the same week: refused.
    r = await call("/api/award", { assessment: "week-48", input: week({ level: 4, monthEarned: 0 }) });
    assert.equal(r.data.entry.duplicate, true); // level rose to Lifter meanwhile; still not re-scored
    assert.equal(r.data.wallet.lifetime, OPENING_AWARD + awarded);
    r = await call("/api/award", { assessment: "week-48", input: week({ comparable: false }) });
    assert.equal(r.status, 409);
    r = await call("/api/award", { assessment: "Week 48!", input: week() });
    assert.equal(r.status, 400);

    // Redeem, retry the same request, then overspend.
    r = await call("/api/redeem", { request: "req-1", points: 1000, label: "Groceries" });
    assert.equal(r.status, 200);
    assert.equal(r.data.wallet.spendable, OPENING_AWARD + awarded - 1000);
    assert.equal(r.data.wallet.lifetime, OPENING_AWARD + awarded); // level kept
    r = await call("/api/redeem", { request: "req-1", points: 1000, label: "Groceries" });
    assert.equal(r.data.entry.duplicate, true);
    r = await call("/api/redeem", { request: "req-2", points: 99999 });
    assert.equal(r.status, 400);
    assert.equal(r.data.error, "Not enough points");
    r = await call("/api/wallet");
    assert.deepEqual(
      r.data.statement.map((x) => x.type),
      ["award", "award", "redeem"],
    );

    // Bad JSON and reset.
    const bad = await fetch(base + "/api/redeem", { method: "POST", body: "{" });
    assert.equal(bad.status, 400);
    r = await call("/api/reset", {});
    assert.equal(r.data.spendable, OPENING_AWARD);

    // Leaderboard is scored by the engine.
    r = await call("/api/leaderboard");
    assert.equal(r.data.length, 6);
    assert.ok(r.data.every((x) => Number.isInteger(x.award) && x.award > 0));
    console.log("Server API checks passed");
  } finally {
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
