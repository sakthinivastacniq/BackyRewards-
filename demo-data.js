// Leaderboard fixture from the SafeRewards v1 concept demo (TACNIQ DEMO org, 1-11 Nov 2026).
// Posture counts and wear hours are the dashboard figures for that period. Personal baselines,
// days worn (hours / 6.1), the 7.5h scheduled shift and the flat exposure figure are
// illustrative assumptions, so the point totals are a worked example, not a payout.
const { score } = require("./points-engine");

const devices = [
  { id: "BKY90001", dept: "Warehouse A", fb: 450, bb: 366, tw: 1043, good: 6251, hours: 54, baseRate: 38.0 },
  { id: "BKY90002", dept: "Warehouse B", fb: 265, bb: 330, tw: 764, good: 4348, hours: 47, baseRate: 36.5 },
  { id: "BKY90003", dept: "Operations A", fb: 116, bb: 210, tw: 635, good: 2131, hours: 47, baseRate: 27.0 },
  { id: "BKY90000", dept: "General", fb: 101, bb: 138, tw: 400, good: 1138, hours: 41, baseRate: 17.0 },
  { id: "BKY90004", dept: "Courier A", fb: 27, bb: 65, tw: 368, good: 1262, hours: 37, baseRate: 18.5 },
  { id: "BKY90005", dept: "Courier B", fb: 37, bb: 68, tw: 342, good: 1203, hours: 35, baseRate: 14.0 },
];

const SCHEDULED_HOURS = 7.5; // illustrative roster; Full Shift needs 6.0h worn
const FLAT_EXPOSURE = 10; // exposure is not in the export, so it is held at baseline

function engineInput(d) {
  const n = Math.max(1, Math.round(d.hours / 6.1));
  const risky = d.fb + d.bb + d.tw;
  const wear = Math.round((d.hours / n) * 10) / 10;
  return {
    days: Array.from({ length: n }, (_, i) => ({
      id: `${d.id}-day-${i + 1}`,
      validated: true,
      wearHours: Math.min(wear, SCHEDULED_HOURS),
      eligibleHours: SCHEDULED_HOURS,
      goodLifts: Math.round(d.good / n),
      riskyLifts: Math.round(risky / n),
    })),
    baseline: { validated: true, hours: 40, shifts: 5, rate: d.baseRate, exposure: FLAT_EXPOSURE },
    current: { rate: risky / d.hours, exposure: FLAT_EXPOSURE },
    validated: true,
    comparable: true,
    level: 0,
    monthEarned: 0,
  };
}

function leaderboard() {
  return devices.map((d) => {
    const input = engineInput(d);
    const result = score(input);
    const risky = d.fb + d.bb + d.tw;
    return {
      id: d.id,
      dept: d.dept,
      hours: d.hours,
      daysWorn: input.days.length,
      riskyPerHour: Math.round((risky / d.hours) * 10) / 10,
      baselinePerHour: d.baseRate,
      rateCut: result.frequencyImprovement,
      cleanShare: d.good / (d.good + risky),
      lines: result.lines,
      award: result.award,
    };
  });
}

module.exports = { devices, engineInput, leaderboard };
