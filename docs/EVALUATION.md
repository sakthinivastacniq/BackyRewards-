# Evaluation of the work so far (26 Nov 2026)

This reviews the repository as of commit `9c7cede` (20 commits, 25–26 Nov 2026) against the SafeRewards methodology.

## What is done and works

| Area | State |
|---|---|
| Points engine v2 | Nine rules, a level boost and a monthly cap. The improvement rules are well guarded: they need a validated baseline, minimum hours and shifts, a comparable setup, and HRP rate and exposure both no worse. Bad input is rejected |
| Tests | 22 engine assertions plus 22 ledger checks, all passing with `npm test`. They cover duplicates, wrong types, early streaks, broken streak sequences, the cap, and team awards at zero wear |
| Demo ledger | Refuses the same assessment twice and conflicting resubmissions. Applies the monthly cap per worker, and shows lifetime and monthly balances |
| Server | No dependencies. `/api/score` limits request size, and `/health` says it is in demo mode with purchases off |
| Demo app | Seven tabs: mascot levels ("shells"), personalised coaching quest preview, rewards shop by country, employer budget with fee assumption, a live points lab against the engine, provider directory and points history. Clearly labelled synthetic throughout |
| Safety of claims | "Not a clinically validated model" and "no real orders" are stated in the app |

## What this revamp changed

1. **Readable code.** The JavaScript files were one long line each. They are now formatted, with no change in behaviour, and the tests pass before and after.
2. **Clean Lift rule (policy v2.1).** It rewards a high share of good pick-ups, a signal every Backy dashboard already shows. Nine new tests. Awards for inputs without lift counts are unchanged.
3. **Docs.** README, a methodology that links each rule to a dashboard metric, this evaluation, and provider notes from the Tremendous and DT One calls.

## Second revamp (v0.5, policy v2.2)

| # | Gap from the list below | Status |
|---|---|---|
| 1 | Stress signal doesn't match the dashboard | **Fixed.** The engine reads the average daily Back Stress Score (1–10) and ignores anything outside that range. The lab fields are relabelled. 9 new tests |
| 3 | Ledger isn't connected | **Fixed for the demo.** The server holds one ledger. The lab's *Add to my points* posts a week, and the wallet, level, rewards and points history all read from it. Redemptions are in the ledger and idempotent. It's still in memory with no login, so it isn't ready for real money |
| 4 | Currency and fees | **Partly fixed.** The Employer tab has a funding currency (SGD or USD), and that currency and rate also price the wallet and leaderboard. Singapore funding fees from Tremendous still need confirming |
| 5 | Who confirms the Squad Quest | **Fixed.** `teamQualifies()` in the engine: 3+ workers, HRP rate 15% lower, exposure no worse. 11 new tests |
| 7 | `window.confirm` | **Fixed.** Redemption uses an in-page dialog |
| 8 | No CI | **Fixed.** GitHub Actions runs `npm test` on Node 20 and 22. `.gitattributes` keeps line endings LF |

Also new: a **Leaderboard** tab from the v1 concept demo. It shows the six TACNIQ DEMO devices scored by the real engine and can be ranked by total, most improved, Clean Lift share or wear time. `server.test.js` covers the API end to end.

Found and fixed while testing: re-sending a week after a level-up was scored with the new boost and rejected as a conflict. Each week is now scored once.

Still open: 2 (no source for scheduled hours), 6 (level boost on wear points), and 9–13.

## Gaps and risks, in priority order

### Fix before a real pilot

1. **Stress signal doesn't match the dashboard.** The engine expects a "stress index per hour", but Backy's dashboard gives a Back Stress Score from 1 to 10 per day. Define the stress inputs as the average daily score over worn days, and rename the lab fields.
2. **Scheduled hours have no source.** Full Shift, streaks and the minimum-hours checks all rely on `eligibleHours`, which Backy doesn't record. Agree a roster feed or supervisor confirmation with the pilot client.
3. **The ledger isn't connected.** The app wallet is a fixed 2,400 SP kept in the browser, and `demo-ledger.js` runs separately. Put the ledger behind `/api/award` and `/api/balance` so the lab, wallet and history show the same figures. Persistence and login are needed before any real money.
4. **Currency and fees.** The demo prices in SGD, while Tremendous prices in USD and its free bank funding is only listed for US, EU and UK accounts. Confirm Singapore funding fees, then make the currency and fee per-client settings.
5. **Who confirms the Squad Quest.** The "team HRP down 15%, exposure no worse" check happens outside the engine (`teamQualified`). Write that calculation and test it.

### Should fix

6. **The level boost applies to every line, wear points included.** That adds up to 20% to cost. It's covered by the cap, but consider boosting improvement rules only.
7. **`window.confirm`** is used for redemptions. Some embedded views block it, so a confirm step built into the page would be safer.
8. **No CI, licence or `.gitignore`.** Add a GitHub Actions workflow that runs `npm test`. A `.gitignore` is added in this revamp.
9. **Repo name** `BackyRewards-` has a trailing dash. Consider renaming it to `backy-saferewards` to match `package.json`.
10. **Commit hygiene.** Three identical "Build SafeRewards trial service" commits. Use descriptive messages from here on.

### Later

11. **Personalised quests** (coaching preview) are not yet scored by the engine, and the app says so. Decide whether they replace or feed rule 6.
12. **Provider integration:** start with the Tremendous sandbox (no credentials in the repo, use environment variables), and compare it with DT One's supervisor-portal model.
13. **Pilot reporting:** an export of the KPIs in METHODOLOGY.md for employers and insurance partners.
