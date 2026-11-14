// Minimal PayPal Orders v2 client. PAYPAL_ENV = "sandbox" (testing) or "live".
export const ppBase = (env) => env.PAYPAL_API_BASE || (env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

export async function ppToken(env) {
  const r = await fetch(ppBase(env) + '/v1/oauth2/token', {
    method: 'POST',
    headers: { authorization: 'Basic ' + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`), 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error('PayPal auth failed: ' + r.status);
  return d.access_token;
}

export async function pp(env, path, body) {
  const token = await ppToken(env);
  const r = await fetch(ppBase(env) + path, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, d };
}

export const eur = (cents) => (cents / 100).toFixed(2);
