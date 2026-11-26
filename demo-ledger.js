// In-memory synthetic ledger prototype. Not durable, authenticated or connected to live scoring.
function createDemoLedger(cap = 4610) {
  if (!Number.isSafeInteger(cap) || cap < 0) throw Error("Invalid demo cap");
  const records = new Map();
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
      });
      records.set(key, row);
      return { ...row, duplicate: false };
    },
    balance(worker, period) {
      const rows = [...records.values()].filter((r) => r.worker === worker);
      const lifetime = rows.reduce((s, r) => s + r.awarded, 0);
      const monthly = rows.filter((r) => r.period === period).reduce((s, r) => s + r.awarded, 0);
      return { lifetime, monthly, remaining: cap - monthly };
    },
    history(worker) {
      return [...records.values()].filter((r) => r.worker === worker).map((r) => ({ ...r }));
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
  return 22;
}
module.exports = { createDemoLedger };
if (require.main === module) console.log(test(createDemoLedger) + " checks passed");
