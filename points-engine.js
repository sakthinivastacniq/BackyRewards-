// SafeRewards v2.2 pilot policy. Synthetic inputs only; no client data.
// v2.1 adds the Clean Lift rule: a daily reward for a high share of good pick-ups,
// read from the Backy dashboard's Good Pick-up vs Forward Bend + Backward Bend + Twisting counts.
// v2.2 reads stress as the dashboard's daily Back Stress Score (1-10, lower is better) and
// moves the Squad Quest check into the engine (teamQualifies).
const policy = Object.freeze({
  version: "2.2",
  levelThresholds: Object.freeze([0, 1000, 3000, 6000, 10000]),
  stressScore: Object.freeze({ min: 1, max: 10, minWearHours: 4 }),
  squad: Object.freeze({ rateCut: 15, minWorkers: 3 }),
  monthlyCap: 4610,
  weeklyHours: 12,
  weeklyShifts: 3,
  baselineHours: 20,
  baselineShifts: 5,
  ratePer1000: 5,
  cleanLift: Object.freeze({
    minWearHours: 4,
    minLifts: 20,
    highShare: 0.8,
    highPoints: 30,
    midShare: 0.7,
    midPoints: 15,
  }),
});
const finite = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const improvement = (a, b) => (finite(a) && a > 0 && finite(b) ? (100 * (a - b)) / a : null);
// Back Stress Score is a daily 1-10 score. Anything outside that range is treated as missing.
const stressOk = (v) => finite(v) && v >= policy.stressScore.min && v <= policy.stressScore.max;
// Average daily Back Stress Score over validated shifts worn 4h or more.
function averageStress(days = []) {
  const scores = (Array.isArray(days) ? days : [])
    .filter((d) => d && d.validated === true && finite(d.wearHours) && d.wearHours >= policy.stressScore.minWearHours)
    .map((d) => d.backStressScore)
    .filter(stressOk);
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}
// Squad Quest: the team's high-risk events per worn hour fell 15%+ against last month and
// exposure got no worse. Needs a validated team summary with at least 3 workers.
function teamQualifies(team) {
  if (!team || team.validated !== true || !Number.isInteger(team.workers) || team.workers < policy.squad.minWorkers)
    return false;
  const b = team.baseline || {},
    c = team.current || {};
  const r = improvement(b.rate, c.rate),
    e = improvement(b.exposure, c.exposure);
  return r !== null && e !== null && r >= policy.squad.rateCut - 1e-9 && e >= -1e-9;
}
// Level index (0-4) for a lifetime SP total.
const levelFor = (lifetime) =>
  finite(lifetime) ? policy.levelThresholds.reduce((a, t, i) => (lifetime >= t ? i : a), 0) : 0;
const tier = (p) => (p === null ? 0 : p >= 30 - 1e-9 ? 125 : p >= 20 - 1e-9 ? 80 : p >= 10 - 1e-9 ? 40 : 0);
// Clean Lift: good pick-ups as a share of all lifting postures in one validated shift.
// Needs a minimum number of lifts so a near-empty shift cannot earn it.
function cleanLiftPoints(d) {
  const c = policy.cleanLift;
  if (!finite(d.goodLifts) || !finite(d.riskyLifts) || d.wearHours < c.minWearHours) return 0;
  const total = d.goodLifts + d.riskyLifts;
  if (total < c.minLifts) return 0;
  const share = d.goodLifts / total;
  return share >= c.highShare - 1e-9 ? c.highPoints : share >= c.midShare - 1e-9 ? c.midPoints : 0;
}
function score({
  days = [],
  baseline = {},
  current = {},
  comparable = false,
  validated = false,
  quest = null,
  streakMilestone = 0,
  streakHistory = [],
  teamQualified = false,
  team = null,
  level = 0,
  monthEarned = 0,
} = {}) {
  if (!Array.isArray(days) || !Number.isInteger(level) || level < 0 || level > 4 || !finite(monthEarned))
    throw Error("Invalid input");
  const ids = new Set();
  let wear = 0,
    full = 0,
    clean = 0,
    hours = 0,
    shifts = 0;
  for (const d of days) {
    if (!d || typeof d.id !== "string" || !d.id.trim() || ids.has(d.id))
      throw Error("Missing or duplicate shift ID");
    ids.add(d.id);
    if (
      d.validated !== true ||
      !finite(d.wearHours) ||
      !finite(d.eligibleHours) ||
      d.eligibleHours <= 0 ||
      d.wearHours > d.eligibleHours ||
      d.eligibleHours > 24
    )
      continue;
    hours += d.wearHours;
    wear += Math.min(80, Math.floor(d.wearHours * 10));
    if (d.wearHours > 0 && d.wearHours >= 0.8 * d.eligibleHours) {
      full += 20;
      shifts++;
    }
    clean += cleanLiftPoints(d);
  }
  const r = improvement(baseline.rate, current.rate),
    e = improvement(baseline.exposure, current.exposure),
    currentStress = current.stress === undefined ? averageStress(days) : current.stress,
    s = stressOk(baseline.stress) && stressOk(currentStress) ? improvement(baseline.stress, currentStress) : null;
  const eligible =
    validated === true &&
    comparable === true &&
    baseline.validated === true &&
    finite(baseline.hours) &&
    baseline.hours >= 20 &&
    Number.isInteger(baseline.shifts) &&
    baseline.shifts >= 5 &&
    hours >= 12 &&
    shifts >= 3 &&
    finite(baseline.exposure) &&
    baseline.exposure <= 100 &&
    finite(current.exposure) &&
    current.exposure <= 100;
  const guard = eligible && r !== null && e !== null && r >= -1e-9 && e >= -1e-9;
  const q = quest && quest.validated === true ? improvement(quest.baselineRate, quest.currentRate) : null;
  const lines = {
    wear,
    fullShift: full,
    cleanLift: clean,
    frequency: guard ? tier(r) : 0,
    exposure: guard ? tier(e) : 0,
    quest: guard && q !== null && q >= 15 - 1e-9 ? 50 : 0,
    stress: guard && s !== null && s >= 15 - 1e-9 ? 40 : 0,
    streak:
      validated === true &&
      [5, 10, 20].includes(streakMilestone) &&
      ((streakMilestone === 5 && shifts >= 5) ||
        (Array.isArray(streakHistory) &&
          streakHistory.length === streakMilestone &&
          streakHistory.every(
            (d, i) =>
              d &&
              d.validated === true &&
              d.qualifying === true &&
              Number.isInteger(d.sequence) &&
              (i === 0 || d.sequence === streakHistory[i - 1].sequence + 1),
          ) &&
          new Set(streakHistory.map((d) => d.id)).size === streakMilestone &&
          streakHistory.every((d) => typeof d.id === "string" && d.id.length > 0) &&
          shifts >= 1))
        ? { 5: 50, 10: 150, 20: 400 }[streakMilestone] || 0
        : 0,
    team: validated === true && (team ? teamQualifies(team) : teamQualified === true) && hours > 0 ? 100 : 0,
  };
  const raw = Object.values(lines).reduce((a, b) => a + b, 0),
    multiplier = [1, 1.05, 1.1, 1.15, 1.2][level];
  return {
    lines,
    raw,
    multiplier,
    award: Math.max(
      0,
      Math.min(Math.floor(policy.monthlyCap - monthEarned), Math.floor(raw * multiplier + 1e-9)),
    ),
    frequencyImprovement: r,
    exposureImprovement: e,
    stressImprovement: s,
    policyVersion: policy.version,
    eligible,
    guard,
  };
}
if (typeof module !== "undefined") module.exports = {
    policy,
    score,
    improvement,
    tier,
    cleanLiftPoints,
    averageStress,
    teamQualifies,
    levelFor,
  };
