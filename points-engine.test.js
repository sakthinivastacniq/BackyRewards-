const assert = require("node:assert/strict");
const { score } = require("./points-engine");
const input = {
  days: Array.from({ length: 5 }, (_, i) => ({
    id: String(i),
    validated: true,
    wearHours: 8,
    eligibleHours: 8,
  })),
  baseline: { validated: true, hours: 40, shifts: 5, rate: 60, exposure: 8, stress: 100 },
  current: { rate: 42, exposure: 5.6, stress: 80 },
  validated: true,
  comparable: true,
  quest: { validated: true, baselineRate: 40, currentRate: 30 },
  streakMilestone: 5,
  level: 1,
};
assert.equal(score(input).award, 934);
assert.equal(score({ ...input, monthEarned: 4600 }).award, 10);
assert.equal(score({ ...input, current: { rate: 42, exposure: 9 } }).lines.frequency, 0);
assert.equal(score({ ...input, comparable: false }).lines.exposure, 0);
assert.equal(score({ ...input, baseline: { ...input.baseline, rate: 0 } }).lines.frequency, 0);
assert.throws(() => score({ ...input, days: [input.days[0], input.days[0]] }));
assert.equal(score({ ...input, days: input.days.map((d) => ({ ...d, validated: "false" })) }).award, 0);
assert.equal(score({ ...input, validated: "false" }).lines.frequency, 0);
assert.equal(score({ ...input, comparable: "false" }).lines.frequency, 0);
assert.equal(score({ ...input, days: input.days.slice(0, 1) }).lines.streak, 0);
const history = Array.from({ length: 10 }, (_, i) => ({
  id: "shift-" + i,
  sequence: i + 1,
  validated: true,
  qualifying: true,
}));
assert.equal(score({ ...input, streakMilestone: 10 }).lines.streak, 0);
assert.equal(score({ ...input, streakMilestone: 20 }).lines.streak, 0);
assert.equal(score({ ...input, streakMilestone: 10, streakHistory: history }).lines.streak, 150);
assert.equal(
  score({
    ...input,
    streakMilestone: 10,
    streakHistory: history.map((d, i) => (i === 4 ? { ...d, sequence: 99 } : d)),
  }).lines.streak,
  0,
);
assert.equal(
  score({
    ...input,
    streakMilestone: 10,
    streakHistory: history.map((d, i) => (i === 4 ? { ...d, id: history[0].id } : d)),
  }).lines.streak,
  0,
);
assert.throws(() => score({ ...input, days: [null] }));
assert.throws(() => score({ ...input, days: [{ ...input.days[0], id: 1 }] }));
assert.throws(() => score({ ...input, days: [{ ...input.days[0], id: " " }] }));
assert.equal(score({ ...input, baseline: { ...input.baseline, shifts: 5.5 } }).lines.frequency, 0);
assert.equal(score({ ...input, days: [], teamQualified: true }).lines.team, 0);
assert.equal(score({ ...input, teamQualified: true }).lines.team, 100);

// v2.1 Clean Lift rule
const lifts = (good, risky, extra = {}) => ({
  ...input,
  days: input.days.map((d) => ({ ...d, goodLifts: good, riskyLifts: risky, ...extra })),
});
assert.equal(score(input).lines.cleanLift, 0); // no lift counts: rule not applied, award unchanged
assert.equal(score(lifts(85, 15)).lines.cleanLift, 150); // 85% good on 5 shifts
assert.equal(score(lifts(75, 25)).lines.cleanLift, 75); // 75% good earns the lower amount
assert.equal(score(lifts(60, 40)).lines.cleanLift, 0);
assert.equal(score(lifts(9, 1)).lines.cleanLift, 0); // too few lifts to judge
assert.equal(score(lifts(80, 20, { wearHours: 3 })).lines.cleanLift, 0); // under 4 hours worn
assert.equal(score(lifts(80, 20, { validated: false })).lines.cleanLift, 0);
assert.equal(score(lifts(-5, 30)).lines.cleanLift, 0);
assert.equal(score({ ...lifts(85, 15), monthEarned: 4600 }).award, 10); // still capped

console.log("SafeRewards synthetic regression tests passed");
