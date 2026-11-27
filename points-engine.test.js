const assert = require("node:assert/strict");
const { score, averageStress, teamQualifies, levelFor, policy } = require("./points-engine");
const input = {
  days: Array.from({ length: 5 }, (_, i) => ({
    id: String(i),
    validated: true,
    wearHours: 8,
    eligibleHours: 8,
  })),
  baseline: { validated: true, hours: 40, shifts: 5, rate: 60, exposure: 8, stress: 5 },
  current: { rate: 42, exposure: 5.6, stress: 4 },
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

// v2.2 Back Stress Score (daily 1-10, lower is better)
assert.equal(policy.version, "2.2");
assert.equal(score(input).lines.stress, 40); // 5 -> 4 is a 20% cut
assert.equal(score({ ...input, current: { ...input.current, stress: 4.5 } }).lines.stress, 0); // 10% cut
assert.equal(score({ ...input, baseline: { ...input.baseline, stress: 100 } }).lines.stress, 0); // old index scale rejected
assert.equal(score({ ...input, current: { ...input.current, stress: 0 } }).lines.stress, 0); // below 1 rejected
assert.equal(score({ ...input, current: { ...input.current, stress: 11 } }).lines.stress, 0);
const stressDays = (scores) =>
  input.days.map((d, i) => ({ ...d, backStressScore: scores[i] }));
assert.equal(averageStress(stressDays([4, 4, 4, 4, 4])), 4);
assert.equal(averageStress(stressDays([4, 4, 4, 4, 40])), 4); // out-of-range day ignored
assert.equal(averageStress([{ id: "x", validated: true, wearHours: 3, backStressScore: 2 }]), null); // under 4h worn
assert.equal(averageStress([{ id: "x", validated: false, wearHours: 8, backStressScore: 2 }]), null);
assert.equal(averageStress([]), null);
const { stress: _omit, ...currentNoStress } = input.current;
assert.equal(score({ ...input, days: stressDays([4, 4, 4, 4, 4]), current: currentNoStress }).lines.stress, 40); // averaged from days
assert.equal(score({ ...input, days: stressDays([5, 5, 5, 5, 5]), current: currentNoStress }).lines.stress, 0);
assert.equal(score({ ...input, current: currentNoStress }).lines.stress, 0); // no daily scores, no award

// v2.2 Squad Quest computed by the engine
const team = { validated: true, workers: 6, baseline: { rate: 20, exposure: 6 }, current: { rate: 17, exposure: 6 } };
assert.equal(teamQualifies(team), true); // exactly 15% lower, exposure equal
assert.equal(teamQualifies({ ...team, current: { rate: 17.2, exposure: 6 } }), false); // 14% lower
assert.equal(teamQualifies({ ...team, current: { rate: 10, exposure: 6.1 } }), false); // exposure worse
assert.equal(teamQualifies({ ...team, workers: 2 }), false); // team too small
assert.equal(teamQualifies({ ...team, workers: 3.5 }), false);
assert.equal(teamQualifies({ ...team, validated: "true" }), false);
assert.equal(teamQualifies({ ...team, baseline: { rate: 0, exposure: 6 } }), false);
assert.equal(teamQualifies(null), false);
assert.equal(score({ ...input, team }).lines.team, 100);
assert.equal(score({ ...input, team: { ...team, workers: 1 }, teamQualified: true }).lines.team, 0); // team summary wins over the flag
assert.equal(score({ ...input, team, days: [] }).lines.team, 0); // still needs wear

// Levels from lifetime points
assert.deepEqual([0, 999, 1000, 2999, 3000, 6000, 9999, 10000, 50000].map(levelFor), [0, 0, 1, 1, 2, 3, 3, 4, 4]);
assert.equal(levelFor(-1), 0);
assert.equal(levelFor(NaN), 0);

console.log("SafeRewards synthetic regression tests passed");
