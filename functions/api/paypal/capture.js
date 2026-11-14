// Captures an approved PayPal order and records it in the orders table.
import { json, db, CATALOG } from '../../../lib/catalog.js';
import { sendEmail, site } from '../../../lib/brevo.js';
import { orderEmail } from '../../../lib/emails.js';
import { clearCarts } from '../../../lib/carts.js';
import { pp } from '../../../lib/paypal.js';

export async function onRequestPost({ request, env, waitUntil }) {
  if (env.STORE_MODE !== 'paypal' || !env.PAYPAL_CLIENT_ID || !env.PAYPAL_SECRET) return json({ error: 'Checkout is not open yet.' }, 403);
  let id, knownEmail = '';
  try { const b = await request.json(); id = String(b.id || ''); knownEmail = String(b.email || '').trim().toLowerCase().slice(0, 254); } catch { return json({ error: 'Bad request.' }, 400); }
  if (!/^[A-Z0-9]{10,30}$/.test(id)) return json({ error: 'Bad order id.' }, 400);

  let r;
  try { r = await pp(env, `/v2/checkout/orders/${id}/capture`); } catch (e) { return json({ error: 'Payment could not be completed.' }, 502); }
  const o = r.d || {};
  const issue = o.details && o.details[0] && o.details[0].issue;
  if (issue === 'INSTRUMENT_DECLINED') return json({ retry: true, error: 'Your card or PayPal payment was declined. Try another one.' }, 402);
  if (!r.ok || o.status !== 'COMPLETED') { console.log('paypal capture', r.status, JSON.stringify(o)); return json({ error: 'Payment could not be completed.' }, 502); }

  const pu = (o.purchase_units && o.purchase_units[0]) || {};
  const cap = (pu.payments && pu.payments.captures && pu.payments.captures[0]) || {};
  const ship = pu.shipping || {};
  const a = ship.address || {};
  const items = (pu.items || []).map((i) => { const [slug, color, size] = String(i.sku || '').split('|'); return { slug, color, size, q: Number(i.quantity) }; });
  const total = Math.round(Number((cap.amount && cap.amount.value) || (pu.amount && pu.amount.value) || 0) * 100);
  try {
    const d = await db(env);
    await d.prepare('INSERT OR REPLACE INTO orders (id, ts, provider, status, email, name, address, items, total, currency, code, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, new Date().toISOString(), 'paypal', cap.status || o.status, o.payer && o.payer.email_address || null,
        (ship.name && ship.name.full_name) || null,
        [a.address_line_1, a.address_line_2, a.postal_code, a.admin_area_2, a.admin_area_1, a.country_code].filter(Boolean).join(', '),
        JSON.stringify(items), total, (cap.amount && cap.amount.currency_code) || 'EUR', pu.custom_id || null, a.country_code || null).run();
  } catch (e) { console.log('order save failed', id, e.message); } // the payment went through either way; PayPal also emails you
  const payer = String((o.payer && o.payer.email_address) || '').toLowerCase();
  waitUntil((async () => {
    await clearCarts(env, [payer, knownEmail]);
    if (!payer) return;
    const br = (pu.amount && pu.amount.breakdown) || {};
    const cents = (x) => Math.round(Number((x && x.value) || 0) * 100);
    const lines = items.map((i) => { const p = CATALOG[i.slug] || {}; const c = (p.colors || []).find((x) => x.name === i.color) || (p.colors || [])[0] || {};
      return { name: p.name || i.slug, color: i.color, size: i.size, q: i.q, unit: p.price || 0, img: c.img }; });
    const addr = [a.address_line_1, a.address_line_2, [a.postal_code, a.admin_area_2].filter(Boolean).join(' '), a.admin_area_1, a.country_code].filter(Boolean).join(', ');
    const m = orderEmail(site(env), { id, lines, total, discount: cents(br.discount), shipping: cents(br.shipping), name: ship.name && ship.name.full_name, address: addr });
    await sendEmail(env, { to: payer, name: ship.name && ship.name.full_name, subject: m.subject, html: m.html, tags: ['order'] });
  })().catch((e) => console.log('post-order email failed', e.message)));
  return json({ ok: true, id, total, email: o.payer && o.payer.email_address });
}
