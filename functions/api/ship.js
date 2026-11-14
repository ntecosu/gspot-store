// Mark an order (or part of it) as shipped and email the customer the tracking. Results page only (ADMIN_KEY).
import { json, db, CATALOG } from '../../lib/catalog.js';
import { sendEmail, site } from '../../lib/brevo.js';
import { shippedEmail } from '../../lib/emails.js';

export async function onRequestPost({ request, env }) {
  const key = request.headers.get('x-admin-key') || '';
  if (!env.ADMIN_KEY || key.length < 12 || key !== env.ADMIN_KEY) return json({ error: 'Wrong key.' }, 401);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const id = String(b.id || ''), carrier = String(b.carrier || '').slice(0, 60), tracking = String(b.tracking || '').slice(0, 80);
  let url = String(b.url || '').slice(0, 400);
  if (url && !/^https:\/\//.test(url)) return json({ error: 'Tracking link must start with https://' }, 400);
  if (!tracking && !url) return json({ error: 'Add a tracking number or link.' }, 400);
  const d = await db(env);
  const o = await d.prepare('SELECT id, email, items FROM orders WHERE id = ?').bind(id).first();
  if (!o) return json({ error: 'Order not found.' }, 404);
  await d.batch([
    d.prepare('INSERT OR REPLACE INTO shipments (order_id, ts, carrier, tracking, url) VALUES (?, ?, ?, ?, ?)').bind(id, new Date().toISOString(), carrier, tracking, url),
    d.prepare('UPDATE orders SET shipped = 1 WHERE id = ?').bind(id),
  ]);
  let emailed = false;
  if (o.email) {
    const lines = JSON.parse(o.items || '[]').map((i) => { const p = CATALOG[i.slug] || {}; const c = (p.colors || []).find((x) => x.name === i.color) || (p.colors || [])[0] || {}; return { name: p.name || i.slug, color: i.color, size: i.size, q: i.q, img: c.img }; });
    const m = shippedEmail(site(env), { id, carrier, tracking, url, lines });
    emailed = !!(await sendEmail(env, { to: o.email, subject: m.subject, html: m.html, tags: ['shipped'] }));
  }
  return json({ ok: true, emailed });
}
