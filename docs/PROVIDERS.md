# Voucher provider notes

Status as of 26 Nov 2026. None of these are connected in code: the "API providers" tab only links to their documentation.

## Comparison

| | Tremendous | DT One | Virtual Incentives | Voucher Express | Merit Incentives |
|---|---|---|---|---|---|
| Contact | Esteban Mier-y-León | Teddy Tan | Danny Farkas, Cherry Barrault (APAC) | Eleanor Wheeler | n/a |
| Stage | Call held 10 Nov | Call held 12 Nov | Replied 11 Nov; APAC call offered | Intro call booked 18 Nov | Docs only |
| Model | API + Tremendous Connect (client-funded accounts inside our platform) | Rewards catalogue + admin portal; can run points, streaks and challenges | Rewards programmes | Vouchers (UK) | Gift card API |
| Reward types | Gift cards, prepaid Visa, charity, optional cash-style payouts | Vouchers (e.g. Grab), eSIM, mobile top-up | Gift cards, prepaid | Vouchers | Gift cards |
| Fees | $0 platform/API; face value on gift cards, Visa and donations | Depends on merchant and product; self-onboarding | Not discussed yet | Not discussed yet | Not discussed yet |
| Docs | developers.tremendous.com | developers.dtone.com | developers.virtualincentives.com | corporate.voucherexpress.com/page/vex-api | apidocs.meritincentives.com |

## Tremendous (call, 10 Nov 2026)

What they understood we need: more adoption among frontline workers, a points system for wear time and fewer high-risk postures, and rewards without TacnIQ handling client funds.

- **Tremendous Connect:** embedded in the Backy dashboard. Each client connects, gets verified and funds its own account.
- **Redemption:** a worker's redemption triggers an API call, and a branded email or SMS goes out to them.
- **Catalogue:** gift cards, prepaid Visa and charity donations, filtered by country. We or the client choose what to show.
- **Pricing:** no platform, API or support fees, and gift cards, prepaid Visa and donations go out at face value. Cash-style payouts carry a fee: the recap quoted PayPal or bank transfer at 4% and Venmo or Cash App at 2%, while public pricing says 4–6%.
- **Funding:** free from a US, EU or UK bank account; 3% by credit card.
- **Limits:** the smallest reward is $1, and recipients have 12 months to redeem.
- **Volume and revenue:** volume discounts may apply above $200K a year. Tremendous earns from reward-brand partnerships and shares some of that revenue with high-volume senders.
- **Expired rewards:** one merchant's terms say Tremendous keeps the money from links that expire unredeemed.
- **Next steps:**
  - The dev team reviews the API quickstart and sandbox, then the Connect docs.
  - Then ask Esteban for a call with a solutions engineer. Dev contact: developers@tremendous.com.
- **Open questions:**
  - Is funding from a Singapore bank account free?
  - Can the value of unredeemed rewards go back to the client?
  - Which cash-style fee applies: 2–4% or 4–6%?

## DT One (call, 12 Nov 2026)

- **Background:** strong in digital value services, with about 10 years running rewards programmes. Similar to Tremendous for vouchers, and it also offers eSIM and mobile top-up in $5, $3 or $2 amounts.
- **Getting started:** suggests giving workers an instant reward first, for example a $5 Grab voucher.
- **Engagement:** welcome gifts, refer-a-friend, streaks, and internal challenges with leaderboards. The client company sets the challenges, and merchant rewards are typically about $10–20.
- **Admin portal:** only the supervisor and the company can see it, and redemption goes through the supervisor. Suits clients who don't want a portal of their own.
- **Pricing:** depends on the merchant and product. They have a self-onboarding platform, and we tell them which countries we need.
- **Benchmarks:** banks and insurers pay about $30 per sign-up reward. For warehouse workers, rewards would be monthly.
- **Insurance:** they haven't seen a safety programme before and aren't sure insurers would fund one. They see a route at scale, and co-branding (a DT One sticker on Backy) could help.

## Engine settings each provider affects

- `policy.ratePer1000`: the money value of 1,000 SP, set per client and currency. The demo uses S$5. Tremendous prices in USD.
- Smallest redemption: must be at least the provider's minimum ($1 at Tremendous).
- Employer tab, "provider fee": use 0% for face-value gift cards, add 3% for card funding, and add 2–6% if cash-style payouts are offered.
