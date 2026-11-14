// Tells the page which checkout to show. STORE_MODE: "paypal", "stripe" or "reserve" (no payment).
export const onRequestGet = ({ request, env }) => {
  let mode = 'reserve';
  if (env.STORE_MODE === 'paypal' && env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET) mode = 'paypal';
  if (env.STORE_MODE === 'stripe' && env.STRIPE_SECRET_KEY) mode = 'stripe';
  const out = { mode, country: (request.cf && request.cf.country) || '' };
  if (mode === 'paypal') { out.paypalClientId = env.PAYPAL_CLIENT_ID; out.sandbox = env.PAYPAL_ENV !== 'live'; }
  if (mode === 'stripe') out.sandbox = String(env.STRIPE_SECRET_KEY).startsWith('sk_test_');
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
};
