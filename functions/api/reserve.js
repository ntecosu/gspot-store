// Reservation mode: saves the email and cart (no payment) so you can measure real demand.
import { cleanCart, json, isEmail, db } from '../../lib/catalog.js';
export async function onRequestPost({ request, env }) {
  let body, lines;
  try { body = await request.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  if (!isEmail(email)) return json({ error: 'Enter an email address like you@email.com.' }, 400);
  try { lines = cleanCart(body.items); } catch (e) { return json({ error: e.message }, 400); }
  const total = lines.reduce((a, l) => a + l.unit * l.q, 0);
  const items = lines.map((l) => ({ slug: l.slug, color: l.color, size: l.size, q: l.q }));
  const country = (request.cf && request.cf.country) || null;
  const now = new Date().toISOString();
  try {
    const d = await db(env);
    await d.batch([
      d.prepare('INSERT INTO reservations (ts, email, items, total, country) VALUES (?, ?, ?, ?, ?)').bind(now, email, JSON.stringify(items), total, country),
      d.prepare('INSERT OR IGNORE INTO subscribers (email, ts, src, country) VALUES (?, ?, ?, ?)').bind(email, now, 'reserve', country),
      d.prepare('INSERT INTO events (ts, e, slug, country) VALUES (?, ?, ?, ?)').bind(now, 'reserve', '', country),
    ]);
  } catch (e) {
    console.log('reserve error', e && e.message);
    return json({ error: 'Something went wrong. Try again in a moment.' }, 500);
  }
  return json({ ok: true });
}
