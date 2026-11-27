// SafeRewards demo server. No dependencies. Synthetic data only; no purchases are made.
// The points lab, wallet and points history all read the same in-memory ledger, and the
// server (not the browser) decides the level boost and how much of the monthly cap is left.
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const { score, policy, levelFor } = require("./points-engine");
const { createDemoLedger } = require("./demo-ledger");
const { leaderboard } = require("./demo-data");

const DEMO_WORKER = "demo-courier-a";
const OPENING_AWARD = 2400;
const MIN_REDEEM = 200; // $1 at $5 per 1,000 SP, the Tremendous minimum
const files = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/mascot.svg": ["mascot.svg", "image/svg+xml"],
};

const currentPeriod = () => process.env.DEMO_PERIOD || new Date().toISOString().slice(0, 7);

function freshLedger() {
  const ledger = createDemoLedger(policy.monthlyCap, { minRedeem: MIN_REDEEM });
  ledger.award({ worker: DEMO_WORKER, period: currentPeriod(), assessment: "opening-award", points: OPENING_AWARD });
  return ledger;
}

function wallet(ledger) {
  const balance = ledger.balance(DEMO_WORKER, currentPeriod());
  return {
    worker: DEMO_WORKER,
    period: currentPeriod(),
    ...balance,
    level: levelFor(balance.lifetime),
    minRedeem: MIN_REDEEM,
    statement: ledger.statement(DEMO_WORKER),
  };
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 20000) throw Object.assign(Error("Too large"), { status: 413 });
  }
  return body ? JSON.parse(body) : {};
}

function createServer() {
  let ledger = freshLedger();
  let scored = new Map(); // assessment -> { inputs, entry }: each week is scored once
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const json = (status, data) => {
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(data));
    };
    const post = (p) => url.pathname === p && req.method === "POST";
    try {
      if (url.pathname === "/health")
        return json(200, { status: "ok", mode: "demo", purchases: false, policy: policy.version });
      if (url.pathname === "/api/wallet" && req.method === "GET") return json(200, wallet(ledger));
      if (url.pathname === "/api/leaderboard" && req.method === "GET") return json(200, leaderboard());
      // Preview only: scores whatever the lab sends and writes nothing.
      if (post("/api/score")) return json(200, score(await readJson(req)));
      // Score a week and post it to the ledger. The level and month-to-date total come from the
      // ledger, so a client cannot claim a higher boost or a fresh cap.
      if (post("/api/award")) {
        const { assessment, input } = await readJson(req);
        if (typeof assessment !== "string" || !/^[a-z0-9-]{1,64}$/.test(assessment))
          return json(400, { error: "Invalid assessment ID" });
        const inputs = JSON.stringify(input ?? null);
        const prior = scored.get(assessment);
        if (prior) {
          if (prior.inputs !== inputs) return json(409, { error: "This week was already scored with different data" });
          return json(200, { result: prior.result, entry: { ...prior.entry, duplicate: true }, wallet: wallet(ledger) });
        }
        const before = ledger.balance(DEMO_WORKER, currentPeriod());
        const result = score({ ...input, level: levelFor(before.lifetime), monthEarned: before.monthly });
        const entry = ledger.award({ worker: DEMO_WORKER, period: currentPeriod(), assessment, points: result.award });
        scored.set(assessment, { inputs, result, entry });
        return json(200, { result, entry, wallet: wallet(ledger) });
      }
      if (post("/api/redeem")) {
        const { request, points, label } = await readJson(req);
        const entry = ledger.redeem({ worker: DEMO_WORKER, request, points, label });
        return json(200, { entry, wallet: wallet(ledger) });
      }
      if (post("/api/reset")) {
        ledger = freshLedger();
        scored = new Map();
        return json(200, wallet(ledger));
      }
      if (req.method === "GET" && files[url.pathname]) {
        const [file, type] = files[url.pathname];
        res.writeHead(200, { "Content-Type": type });
        return res.end(fs.readFileSync(path.join(__dirname, file)));
      }
      return json(404, { error: "Not found" });
    } catch (e) {
      return json(e.status || 400, { error: e instanceof SyntaxError ? "Invalid JSON" : e.message });
    }
  });
}

module.exports = { createServer, DEMO_WORKER, OPENING_AWARD, MIN_REDEEM };
if (require.main === module) createServer().listen(process.env.PORT || 3000, "0.0.0.0");
