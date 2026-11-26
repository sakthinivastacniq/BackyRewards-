# Backy SafeRewards

Backy SafeRewards is a points-and-rewards layer for the [Backy](https://backy.ai) lower-back wearable from TacnIQ. Frontline workers earn **Spine Points (SP)** for wearing Backy and for lifting better than their own baseline. They level up, keep streaks going, and redeem points for vouchers. Each employer funds its own rewards through a voucher provider, so TacnIQ never holds client money.

> **Status: trial demo (v0.4).** Synthetic data only. No real vouchers are issued, nothing is connected to a voucher provider, and nothing reads live Backy data yet.

## What's in this repo

| File | What it does |
|---|---|
| `points-engine.js` | Spine Points engine (policy v2.1): turns one worker's validated shifts and baseline into an award, with caps and anti-gaming checks |
| `points-engine.test.js` | Regression tests for the engine |
| `demo-ledger.js` | In-memory points ledger: no duplicate awards, monthly cap, lifetime vs monthly balance. Runs its own checks |
| `server.js` | Small Node server. Serves the demo, `POST /api/score` (runs the engine) and `GET /health` |
| `index.html` | The demo app: My Backy, Safety quests, Rewards, Employer, Points lab, API providers, Points history |
| `mascot.svg` | Backy the armadillo mascot |
| `docs/` | Methodology, evaluation of the work so far, and voucher provider notes |

## Run it

Needs Node 20 or later. There are no dependencies to install.

```bash
npm test     # engine and ledger checks
npm start    # http://localhost:3000  (PORT=xxxx to change)
```

## How points work (summary)

| Move | Backy signal | Points |
|---|---|---|
| Suit Up | Validated wear hours | 10 per hour, max 80 a day |
| Full Shift | Worn for 80%+ of scheduled hours | 20 a day |
| Clean Lift *(new in v2.1)* | Good pick-ups as a share of all lifts | 30 a day at 80%+, 15 at 70–79% |
| Beat Your Baseline | High-risk posture (HRP) events per hour vs own baseline | 40 / 80 / 125 a week for 10 / 20 / 30% lower |
| Protect Your Spine | Time in high-risk posture (exposure) vs own baseline | 40 / 80 / 125 a week |
| Backy Quest | Assigned posture cut by 15% | 50 a week |
| Stress Reducer | Back stress cut by 15% | 40 a week |
| Hot Streak | 5 / 10 / 20 qualifying shifts in a row | 50 / 150 / 400 |
| Squad Quest | Team HRP rate down 15%, exposure no worse | 100 a month |

Levels (Rookie, Spotter, Lifter, Pro Lifter, Iron Spine) add a 1.00–1.20× boost. Every worker is capped at **4,610 SP a month**, boost included. Points are never taken away.

The full rules, data sources, guards and costs are in [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## Docs

- [docs/METHODOLOGY.md](docs/METHODOLOGY.md): how SafeRewards works end to end. Covers which dashboard metric feeds each rule, the matrix, fairness and anti-gaming, programme costs, redemption, and the pilot plan with its KPIs.
- [docs/EVALUATION.md](docs/EVALUATION.md): what has been built so far, what works, and what to fix next, in priority order.
- [docs/PROVIDERS.md](docs/PROVIDERS.md): voucher provider notes (Tremendous, DT One and others) from calls and research, with open questions.

## Related

- Live Backy dashboard: `app2.backy.ai`. It provides wear time, posture events, Back Stress Score and anomalies.
- SafeRewards concept demo (v1 matrix): https://claude.ai/artifact/3vfEyz8eh1ew3E7zxeev9x
