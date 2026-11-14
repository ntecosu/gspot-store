// Creates a Stripe Checkout Session from the cart and returns its URL. Prices come from lib/catalog.js, never from the browser.
import { cleanCart, json, CURRENCY, FREE_SHIPPING_FROM, SHIPPING_FEE, SHIP_TO } from '../../lib/catalog.js';

export async function onRequestPost({ request, env }) {
  if (env.STORE_MODE !== 'stripe' || !env.STRIPE_SECRET_KEY) return json({ error: 'Checkout is not open yet.' }, 403);
  let lines;
  try { lines = cleanCart((await request.json()).items); } catch (e) { return json({ error: e.message || 'Bad request.' }, 400); }

  const origin = new URL(request.url).origin;
  const f = new URLSearchParams();
  f.set('mode', 'payment');
  f.set('success_url', `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
  f.set('cancel_url', `${origin}/#cart`);
  f.set('allow_promotion_codes', 'true');
  f.set('billing_address_collection', 'auto');
  f.set('phone_number_collection[enabled]', 'true');
  SHIP_TO.forEach((c, i) => f.set(`shipping_address_collection[allowed_countries][${i}]`, c));

  let subtotal = 0;
  lines.forEach((l, i) => {
    subtotal += l.unit * l.q;
    const p = `line_items[${i}]`;
    f.set(`${p}[quantity]`, String(l.q));
    f.set(`${p}[price_data][currency]`, CURRENCY);
    f.set(`${p}[price_data][unit_amount]`, String(l.unit));
    f.set(`${p}[price_data][product_data][name]`, l.name);
    f.set(`${p}[price_data][product_data][description]`, `${l.color} / ${l.size}`);
    f.set(`${p}[price_data][product_data][images][0]`, origin + l.img);
    f.set(`${p}[price_data][product_data][metadata][slug]`, l.slug);
    f.set(`${p}[price_data][product_data][metadata][color]`, l.color);
    f.set(`${p}[price_data][product_data][metadata][size]`, l.size);
  });

  const free = subtotal >= FREE_SHIPPING_FROM;
  const s = 'shipping_options[0][shipping_rate_data]';
  f.set(`${s}[type]`, 'fixed_amount');
  f.set(`${s}[fixed_amount][amount]`, String(free ? 0 : SHIPPING_FEE));
  f.set(`${s}[fixed_amount][currency]`, CURRENCY);
  f.set(`${s}[display_name]`, free ? 'Free worldwide shipping' : 'Worldwide tracked shipping');
  f.set(`${s}[delivery_estimate][minimum][unit]`, 'business_day');
  f.set(`${s}[delivery_estimate][minimum][value]`, '5');
  f.set(`${s}[delivery_estimate][maximum][unit]`, 'business_day');
  f.set(`${s}[delivery_estimate][maximum][value]`, '20');
  f.set('metadata[cart]', lines.map((l) => `${l.q}x ${l.slug} ${l.color} ${l.size}`).join('; ').slice(0, 500));

  const r = await fetch((env.STRIPE_API_BASE || 'https://api.stripe.com') + '/v1/checkout/sessions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: f,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.url) {
    console.log('stripe error', r.status, JSON.stringify(d.error || d));
    return json({ error: 'Checkout could not start. Try again in a moment.' }, 502);
  }
  return json({ url: d.url });
}
