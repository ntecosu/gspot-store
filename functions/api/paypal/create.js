// Creates a PayPal order from the cart. Prices, shipping and discounts are worked out here, never in the browser.
import { cleanCart, json, CODES, shippingFor } from '../../../lib/catalog.js';
import { pp, eur } from '../../../lib/paypal.js';

export async function onRequestPost({ request, env }) {
  if (env.STORE_MODE !== 'paypal' || !env.PAYPAL_CLIENT_ID || !env.PAYPAL_SECRET) return json({ error: 'Checkout is not open yet.' }, 403);
  let body, lines;
  try { body = await request.json(); lines = cleanCart(body.items); } catch (e) { return json({ error: e.message || 'Bad request.' }, 400); }

  const code = String(body.code || '').trim().toUpperCase();
  const pct = CODES[code] || 0;
  const items = lines.reduce((a, l) => a + l.unit * l.q, 0);
  const discount = Math.round((items * pct) / 100);
  const shipping = shippingFor(items);
  const total = items - discount + shipping;
  const C = (v) => ({ currency_code: 'EUR', value: eur(v) });

  const order = {
    intent: 'CAPTURE',
    purchase_units: [{
      description: 'GSPOT order',
      custom_id: pct ? code : undefined,
      soft_descriptor: 'GSPOT',
      amount: { ...C(total), breakdown: { item_total: C(items), shipping: C(shipping), discount: C(discount) } },
      items: lines.map((l) => ({
        name: l.name.slice(0, 127), quantity: String(l.q), unit_amount: C(l.unit),
        description: `${l.color} / ${l.size}`.slice(0, 127), sku: `${l.slug}|${l.color}|${l.size}`.slice(0, 127), category: 'PHYSICAL_GOODS',
      })),
    }],
    application_context: { brand_name: 'GSPOT', shipping_preference: 'GET_FROM_FILE', user_action: 'PAY_NOW', locale: 'en-LV' },
  };
  if (!pct) delete order.purchase_units[0].custom_id;

  try {
    const r = await pp(env, '/v2/checkout/orders', order);
    if (!r.ok || !r.d.id) { console.log('paypal create', r.status, JSON.stringify(r.d)); return json({ error: 'Checkout could not start. Try again in a moment.' }, 502); }
    return json({ id: r.d.id });
  } catch (e) {
    console.log('paypal create error', e.message);
    return json({ error: 'Checkout could not start. Try again in a moment.' }, 502);
  }
}
