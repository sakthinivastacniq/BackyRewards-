// In-memory synthetic ledger prototype. Not durable or authenticated.
// Awards raise lifetime points (which set the level). Redemptions spend points but never
// lower lifetime points, so cashing out never costs a worker their level.
function createDemoLedger(cap = 4610, { minRedeem = 200 } = {}) {
  if (!Number.isSafeInteger(cap) || cap < 0) throw Error("Invalid demo cap");
  if (!Number.isSafeInteger(minRedeem) || minRedeem < 1) throw Error("Invalid minimum redemption");
  const records = new Map();
  const redemptions = new Map();
  let seq = 0;
  const lifetimeOf = (worker) =>
    [...records.values()].filter((r) => r.worker === worker).reduce((s, r) => s + r.awarded, 0);
  const redeemedOf = (worker) =>
    [...redemptions.values()].filter((r) => r.worker === worker).reduce((s, r) => s + r.points, 0);
  return {
    award({ worker, period, assessment, points }) {
      if (
        typeof worker !== "string" ||
        typeof period !== "string" ||
        !/^demo-[a-z0-9-]{1,40}$/.test(worker) ||
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(period) ||
        typeof assessment !== "string" ||
        !assessment.trim() ||
        assessment.length > 128 ||
        !Number.isSafeInteger(points) ||
        points < 0
      )
        throw Error("Invalid demo award");
      const key = JSON.stringify([worker, assessment]);
      const prior = records.get(key);
      if (prior) {
        if (prior.period !== period || prior.requested !== points) throw Error("Conflicting assessment");
        return { ...prior, duplicate: true };
      }
      const earned = [...records.values()]
        .filter((r) => r.worker === worker && r.period === period)
        .reduce((s, r) => s + r.awarded, 0);
      const row = Object.freeze({
        worker,
        period,
        assessment,
        requested: points,
        awarded: Math.min(points, Math.max(0, cap - earned)),
        seq: ++seq,
      });
      records.set(key, row);
      return { ...row, duplicate: false };
    },
    // Spend points. `request` is the idempotency key: resending the same request returns the
    // original result instead of spending twice.
    redeem({ worker, request, points, label = "" }) {
      if (
        typeof worker !== "string" ||
        !/^demo-[a-z0-9-]{1,40}$/.test(worker) ||
        typeof request !== "string" ||
        !/^[A-Za-z0-9-]{1,64}$/.test(request) ||
        !Number.isSafeInteger(points) ||
        points < minRedeem ||
        typeof label !== "string" ||
        label.length > 120
      )
        throw Error("Invalid demo redemption");
      const key = JSON.stringify([worker, request]);
      const prior = redemptions.get(key);
      if (prior) {
        if (prior.points !== points) throw Error("Conflicting redemption");
        return { ...prior, duplicate: true };
      }
      if (points > lifetimeOf(worker) - redeemedOf(worker)) throw Error("Not enough points");
      const row = Object.freeze({ worker, request, points, label, seq: ++seq });
      redemptions.set(key, row);
      return { ...row, duplicate: false };
    },
    balance(worker, period) {
      const rows = [...records.values()].filter((r) => r.worker === worker);
      const lifetime = rows.reduce((s, r) => s + r.awarded, 0);
      const monthly = rows.filter((r) => r.period === period).reduce((s, r) => s + r.awarded, 0);
      const redeemed = redeemedOf(worker);
      return { lifetime, monthly, remaining: cap - monthly, redeemed, spendable: lifetime - redeemed };
    },
    // Awards only, oldest first (kept for compatibility).
    history(worker) {
      return [...records.values()].filter((r) => r.worker === worker).map((r) => ({ ...r }));
    },
    // Awards and redemptions together, oldest first.
    statement(worker) {
      return [
        ...[...records.values()].filter((r) => r.worker === worker).map((r) => ({ type: "award", ...r })),
        ...[...redemptions.values()].filter((r) => r.worker === worker).map((r) => ({ type: "redeem", ...r })),
      ].sort((a, b) => a.seq - b.seq);
    },
  };
}
function test(create) {
  const l = create();
  const a = { worker: "demo-one", period: "2026-11", assessment: "a", points: 4500 };
  const check = (x) => {
    if (!x) throw Error("Assertion failed");
  };
  check(l.award(a).awarded === 4500);
  check(l.award(a).duplicate);
  check(l.award({ ...a, assessment: "b" }).awarded === 110);
  check(l.award({ ...a, assessment: "c" }).awarded === 0);
  check(l.award({ ...a, assessment: "d", period: "2026-12" }).awarded === 4500);
  check(l.award({ ...a, worker: "demo-two" }).awarded === 4500);
  check(l.history("demo-one").length === 4);
  let conflict = false;
  try {
    l.award({ ...a, points: 1 });
  } catch {
    conflict = true;
  }
  check(conflict);
  for (const cap of [-1, NaN, Infinity, 1.5, "4610"]) {
    let rejected = false;
    try {
      create(cap);
    } catch {
      rejected = true;
    }
    check(rejected);
  }
  for (const patch of [{ worker: ["demo-one"] }, { period: ["2026-11"] }, { assessment: "x".repeat(129) }]) {
    let rejected = false;
    try {
      l.award({ ...a, ...patch });
    } catch {
      rejected = true;
    }
    check(rejected);
  }
  check(create(0).award(a).awarded === 0);
  check(l.balance("demo-one", "2026-11").lifetime === 9110);
  check(l.balance("demo-one", "2026-11").remaining === 0);
  check(l.balance("demo-one", "2026-12").remaining === 110);
  check(l.balance("demo-new", "2026-11").remaining === 4610);
  check(l.balance("demo-two", "2026-11").lifetime === 4500);
  // Redemptions
  const throwsOn = (fn) => {
    try {
      fn();
    } catch {
      return true;
    }
    return false;
  };
  const r = { worker: "demo-two", request: "r-1", points: 1000, label: "Groceries" };
  check(l.redeem(r).duplicate === false);
  check(l.redeem(r).duplicate === true); // same request is not spent twice
  check(l.balance("demo-two", "2026-11").spendable === 3500);
  check(l.balance("demo-two", "2026-11").lifetime === 4500); // level is never reduced
  check(throwsOn(() => l.redeem({ ...r, points: 500 }))); // conflicting resend
  check(throwsOn(() => l.redeem({ ...r, request: "r-2", points: 3600 }))); // more than spendable
  check(throwsOn(() => l.redeem({ ...r, request: "r-3", points: 100 }))); // under the minimum
  check(throwsOn(() => l.redeem({ ...r, request: "r-4", points: 250.5 })));
  check(throwsOn(() => l.redeem({ ...r, request: "bad id!" })));
  check(throwsOn(() => l.redeem({ ...r, worker: "demo-nobody", request: "r-5" }))); // no points
  check(l.redeem({ ...r, request: "r-6", points: 3500 }).points === 3500); // spend the rest
  check(l.balance("demo-two", "2026-11").spendable === 0);
  const st = l.statement("demo-two");
  check(st.length === 3 && st[0].type === "award" && st[2].type === "redeem");
  check(throwsOn(() => create(4610, { minRedeem: 0 })));
  return 36;
}
module.exports = { createDemoLedger };
if (require.main === module) console.log(test(createDemoLedger) + " checks passed");
