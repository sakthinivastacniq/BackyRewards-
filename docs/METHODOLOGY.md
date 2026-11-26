# SafeRewards methodology (policy v2.1)

This document combines two strands of work: the points engine built in this repo (v2) and the SafeRewards design worked out from the live Backy dashboard and partner calls (v1 concept, November 2026). Where they differed, the choice made here is stated.

## 1. Goal

Get more frontline workers to wear Backy every shift, and reward them for actually lifting better. Adoption comes first. In the TACNIQ DEMO org on the live dashboard, devices were worn on **56% of possible device-days** (43 of 77, 1–11 Nov 2026). Raising that figure is the first thing SafeRewards should do.

## 2. Principles

1. **Positive only.** Points are earned and never taken away. A bad shift costs nothing, so workers have no reason to hide the device.
2. **Compete with yourself.** Risk rewards compare each worker with their own validated baseline. A warehouse picker and a courier can earn the same on improvement, even though their jobs carry different risk.
3. **Only validated data.** Points come only from validated, on-body wear in scheduled shifts and comparable tasks.
4. **Clear to workers.** Every award shows its breakdown by rule. Lifetime points (for level) are kept separate from spendable points, so redeeming never lowers a level.
5. **Client funds, client value.** The employer sets the SP-to-money rate and funds its own voucher account. TacnIQ runs the points engine but never holds the money.
6. **Not a medical claim.** These are pilot behaviour rules, not a clinically validated injury-risk model.

## 3. Where each signal comes from

| Engine input | Backy dashboard source | Notes |
|---|---|---|
| `days[].wearHours` | Wear time / Utilization (h) per device | Already available |
| `days[].eligibleHours` | **Not in the dashboard.** Needs the shift roster | Gap: get it from the client roster or a supervisor-confirmed schedule |
| `days[].validated` | Device worn and synced; no HIGH anomaly that day | Anomalies page has severity levels |
| `days[].goodLifts` / `riskyLifts` | Good Pick-up vs Forward Bend + Backward Bend + Twisting counts | Used by Clean Lift (v2.1) |
| `baseline.rate` / `current.rate` | High-risk events per worn hour | Overview: High-risk events ÷ wear time |
| `baseline.exposure` / `current.exposure` | Daily Events, Exposure view (% of time in high-risk posture) | |
| `baseline.stress` / `current.stress` | Back Stress Score (1–10 per day, lower is better) | **Change needed:** the engine labels this "stress index per hour". Use the average daily Back Stress Score over worn days (4h+) |
| Streak history | Days worn (4h+) on consecutive scheduled shifts | |
| Team quest | Department filter, high-risk events per hour | Team qualification is decided outside the engine (`teamQualified`) |
| Baseline | First 5+ validated shifts and 20+ worn hours | Matches `policy.baselineShifts` / `baselineHours` |

## 4. Spine Points matrix v2.1

| # | Rule | Threshold | Points | Period |
|---|---|---|---|---|
| 1 | Suit Up | Validated wear | 10 per hour (max 80) | Daily |
| 2 | Full Shift | Worn 80%+ of scheduled hours | 20 | Daily |
| 3 | **Clean Lift** | Good pick-ups make up 80%+ of 20 or more lifts, with 4h+ worn (70–79% earns 15) | 30 / 15 | Daily |
| 4 | Beat Your Baseline | HRP rate 10 / 20 / 30% below baseline | 40 / 80 / 125 | Weekly |
| 5 | Protect Your Spine | Exposure 10 / 20 / 30% below baseline | 40 / 80 / 125 | Weekly |
| 6 | Backy Quest | Assigned posture 15% below its baseline | 50 | Weekly |
| 7 | Stress Reducer | Back stress 15% below baseline | 40 | Weekly |
| 8 | Hot Streak | 5 / 10 / 20 consecutive qualifying shifts | 50 / 150 / 400 | Per milestone |
| 9 | Squad Quest | Team HRP rate 15% lower and exposure no worse | 100 | Monthly |

**What changed from v2:** v2.1 adds **Clean Lift** from the v1 concept. Every Backy dashboard already shows good pick-up counts, and Clean Lift rewards good technique on the day it happens. A worker doesn't have to wait a week for an improvement bonus. Rules 4–7 are paid only when both the HRP rate and exposure are no worse than baseline, so a worker can't game one figure by worsening the other.

**Not carried over from v1:** "Dock & Sync" (+5 a day) and "Low-Stress Day" (+20 for a score of 3 or below). Dock & Sync can come back once sync data is part of validation. Rule 7 now covers Low-Stress Day as an improvement against the worker's own baseline.

### Levels

| Level | Lifetime SP | Boost |
|---|---|---|
| Rookie | 0 | 1.00× |
| Spotter | 1,000 | 1.05× |
| Lifter | 3,000 | 1.10× |
| Pro Lifter | 6,000 | 1.15× |
| Iron Spine | 10,000 | 1.20× |

## 5. Guards against gaming (enforced in `points-engine.js`)

- **Shift IDs:** every shift needs a unique, non-empty ID. A duplicate or missing ID rejects the whole request.
- **Shift checks:** a shift counts only if validated is exactly `true`, wear is no more than scheduled hours, and scheduled hours are between 0 and 24.
- **When improvement points pay:** only with a validated baseline of 20+ hours and 5+ shifts, 12+ worn hours and 3+ full shifts this week, a comparable task setup, and exposure readings between 0 and 100%.
- **Clean Lift:** needs at least 20 lifts and 4 hours worn in the shift.
- **Streaks of 10 and 20:** need an unbroken, validated sequence of unique shifts.
- **Squad Quest:** never pays to a worker with zero wear that week.
- **Cap:** the monthly cap applies after the level boost. The ledger refuses to pay the same assessment twice and refuses a conflicting resubmission.

## 6. Money

Most a worker can earn in a month, raw (22 shifts, 4 weeks):

- **Daily rules:** wear 1,760, full shift 440, Clean Lift 660.
- **Weekly rules:** HRP 500, exposure 500, quest 200, stress 160.
- **Streak and team:** streaks 600, Squad Quest 100.

That is 4,920 SP before the boost and 5,904 SP at 1.20×, so the **4,610 SP monthly cap** is the limit that applies in practice.

**Budget formula:** monthly cost = workers × (value per 1,000 SP) × 4.61 × (typical share of the cap earned).

| Example | Workers | Per 1,000 SP | Share of cap | Rewards per month |
|---|---|---|---|---|
| Small pilot | 30 | $5 | 60% | $415 |
| Site | 100 | $5 | 60% | $1,383 |
| Lean | 100 | $3 | 50% | $692 |

On top of this come the provider's funding and payout fees (see PROVIDERS.md). With Tremendous, gift cards, prepaid Visa and donations are charged at face value. Funding by bank transfer is free from US, EU and UK accounts, and funding by card costs 3%. Fees for Singapore funding still need confirming.

## 7. Redemption flow

1. Backy syncs shift data through the dock.
2. The points engine runs each week. Awards are written to the ledger, which skips duplicates and applies the cap.
3. The worker chooses a reward in the app, or a supervisor redeems on their behalf (the DT One model).
4. The platform places an order through the provider's API against the **client's own funded account** (Tremendous Connect, or DT One's portal).
5. The worker gets a branded email or SMS link and has 12 months to choose (Tremendous).

The smallest reward is set so it is at least the provider's minimum ($1 at Tremendous). At $5 per 1,000 SP, that is 200 SP.

## 8. Pilot plan and KPIs

| Phase | Length | What happens |
|---|---|---|
| Baseline | 1–2 weeks | Feedback on, points off. Each worker's baseline is collected (5+ shifts, 20+ hours) |
| Rewards on | 4 weeks | Points, levels and quests go live. Weekly awards. An instant welcome reward (DT One's suggestion: a small voucher on sign-up) |
| Review | 1 week | Results report to the employer and the funder |

KPIs, measured against the baseline:

- **Adoption:** % of scheduled shifts worn (demo org baseline 56% of device-days); hours worn per worn day (demo 6.1h).
- **Behaviour:** high-risk events per hour; exposure %; good pick-up share; Back Stress Score.
- **Engagement:** % of workers earning each week; redemptions; streaks reached.
- **Cost:** reward spend per worker per month, compared with the budget.

These outcomes are also the evidence that insurance partners and other funders ask for (see the insurance outreach plan). DT One noted that insurer funding would need enough scale first.
