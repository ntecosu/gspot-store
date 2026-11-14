# GSPOT store

Static site (`public/`) + Cloudflare Pages Functions (`functions/api/`). Prices live in `lib/catalog.js`.

## Cloudflare Pages setup
1. Workers & Pages → Create → Pages → Connect to Git → this repo. Build command: none. Output directory: `public`.
2. Storage & Databases → D1 → create `gspot`. Then Pages project → Settings → Bindings → add D1 binding `DB` → `gspot`.
3. Settings → Variables and secrets:
   - `STORE_MODE` = `paypal` (PayPal + card via PayPal), `stripe`, or `reserve` (no payment, collects reservations)
   - `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET` (secret) from developer.paypal.com → Apps & Credentials
   - `PAYPAL_ENV` = `sandbox` for testing, `live` for real money
   - `ADMIN_KEY` (secret) = a long random password for `/admin.html`
   - `STRIPE_SECRET_KEY` (secret) = `sk_test_…` for testing, `sk_live_…` when live
4. Redeploy after changing variables.

## Results
Open `/admin.html` and enter the admin key: orders with shipping addresses, revenue, product views, add-to-carts, checkout clicks, reservations, emails, CSV export.

## Going live with payments
Set `STRIPE_SECRET_KEY` to the live key and `STORE_MODE` to `stripe`, redeploy. Create the `GSPOT10` promotion code in live Stripe.
