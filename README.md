# Backy SafeRewards

Backy SafeRewards is a points-and-rewards layer for the [Backy](https://backy.ai) lower-back wearable from TacnIQ. Frontline workers earn **Spine Points (SP)** for wearing Backy and for lifting better than their own baseline. They level up, keep streaks going, and redeem points for vouchers. Each employer funds its own rewards through a voucher provider, so TacnIQ never holds client money.

> **Status: trial demo (v0.5, policy v2.2).** Synthetic data only. No real vouchers are issued, nothing is connected to a voucher provider, and nothing reads live Backy data yet.

## What's in this repo

| File | What it does |
|---|---|
| `points-engine.js` | Spine Points engine (policy v2.2): turns one worker's validated shifts and baseline into an award, with caps and anti-gaming checks. Also works out the Squad Quest and the level |
| `points-engine.test.js` | Regression tests for the engine |
| `demo-ledger.js` | In-memory points ledger: awards and redemptions, no duplicates, monthly cap, lifetime vs spendable balance. Runs its own checks |
| `demo-data.js` | Leaderboard example: six TACNIQ DEMO devices (1–11 Nov 2026) scored by the engine |
| `server.js` | Small Node server with no dependencies. Serves the demo and the API below |
| `server.test.js` | End-to-end API checks: award, duplicate week, redeem, overspend, reset, leaderboard |
| `index.html` | The demo app: My Backy, Safety quests, Rewards, Leaderboard, Employer, Points lab, API providers, Points history. Open a tab directly with `/#board`, `/#engine` and so on |
| `.github/workflows/test.yml` | Runs `npm test` on Node 20 and 22 for every push and pull request |
| `mascot.svg` | Backy the armadillo mascot |
| `docs/` | Methodology, evaluation of the work so far, and voucher provider notes |

## Run it

Needs Node 20 or later. There are no dependencies to install.

```bash
npm test     # engine, ledger and API checks
npm start    # http://localhost:3000  (PORT=xxxx to change)
```

## Demo API

The wallet, points history and Points lab all read one ledger on the server, so they always show the same numbers. The ledger is in memory and resets when the server restarts.

| Endpoint | What it does |
|---|---|
| `GET /health` | Demo mode, purchases off, policy version |
| `POST /api/score` | Preview: scores the posted week and writes nothing |
| `POST /api/award` | `{ assessment, input }`: scores a week and posts it to the ledger. The server sets the level boost and month-to-date total from the ledger, not from the request. Re-sending a week returns the original entry, and different data for a week that's already posted gets `409` |
| `POST /api/redeem` | `{ request, points, label }`: spends points. `request` is an idempotency key. Minimum 200 SP. Lifetime points, and so the level, never go down |
| `GET /api/wallet` | Lifetime, spendable, this month, cap left, level and the full statement |
| `GET /api/leaderboard` | The six-device example scored by the engine |
| `POST /api/reset` | Resets the demo wallet to the 2,400 SP opening award |

## How points work (summary)

| Move | Backy signal | Points |
|---|---|---|
| Suit Up | Validated wear hours | 10 per hour, max 80 a day |
| Full Shift | Worn for 80%+ of scheduled hours | 20 a day |
| Clean Lift *(new in v2.1)* | Good pick-ups as a share of all lifts | 30 a day at 80%+, 15 at 70–79% |
| Beat Your Baseline | High-risk posture (HRP) events per hour vs own baseline | 40 / 80 / 125 a week for 10 / 20 / 30% lower |
| Protect Your Spine | Time in high-risk posture (exposure) vs own baseline | 40 / 80 / 125 a week |
| Backy Quest | Assigned posture cut by 15% | 50 a week |
| Stress Reducer | Average daily Back Stress Score (1–10) 15% below baseline | 40 a week |
| Hot Streak | 5 / 10 / 20 qualifying shifts in a row | 50 / 150 / 400 |
| Squad Quest | Team of 3+: HRP rate down 15% vs last month, exposure no worse | 100 a month |

Levels (Rookie, Spotter, Lifter, Pro Lifter, Iron Spine) add a 1.00–1.20× boost. Every worker is capped at **4,610 SP a month**, boost included. Points are never taken away.

The full rules, data sources, guards and costs are in [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## Docs

- [docs/METHODOLOGY.md](docs/METHODOLOGY.md): how SafeRewards works end to end. Covers which dashboard metric feeds each rule, the matrix, fairness and anti-gaming, programme costs, redemption, and the pilot plan with its KPIs.
- [docs/EVALUATION.md](docs/EVALUATION.md): what has been built so far, what works, and what to fix next, in priority order.
- [docs/PROVIDERS.md](docs/PROVIDERS.md): voucher provider notes (Tremendous, DT One and others) from calls and research, with open questions.

## Related

- Live Backy dashboard: `app2.backy.ai`. It provides wear time, posture events, Back Stress Score and anomalies.
- SafeRewards concept demo (v1 matrix): https://claude.ai/artifact/3vfEyz8eh1ew3E7zxeev9x
