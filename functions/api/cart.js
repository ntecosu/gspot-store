// Abandoned-cart reminders. The page sends the cart of a visitor who already signed up (scratch card / newsletter).
// We schedule one reminder email 3 hours later and cancel it if the cart changes, empties or an order comes in.
// Marketing emails need a postal address in the footer, so reminders only go out once POSTAL_ADDRESS is set.
import { json, isEmail, db, cleanCart } from '../../lib/catalog.js';
import { sendEmail, cancelEmail, unsubUrl, site, hasBrevo } from '../../lib/brevo.js';
import { cartEmail } from '../../lib/emails.js';

const DELAY_H = 3;
const b64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  if (!isEmail(email)) return json({ ok: false }, 400);
  let lines = [];
  try { lines = Array.isArray(body.items) && body.items.length ? cleanCart(body.items) : []; } catch { return json({ ok: false }, 400); }

  const d = await db(env);
  // only people who signed up and haven't unsubscribed
  const sub = await d.prepare('SELECT s.email, u.email AS unsub FROM subscribers s LEFT JOIN unsubscribed u ON u.email = s.email WHERE s.email = ?').bind(email).first();
  if (!sub || sub.unsub) return json({ ok: true });

  const prev = await d.prepare('SELECT items, msg_id, ts FROM carts WHERE email = ?').bind(email).first();
  const items = JSON.stringify(lines.map((l) => [l.slug, l.color, l.size, l.q]));
  if (prev && prev.items === items) return json({ ok: true }); // nothing changed
  if (prev && prev.msg_id) await cancelEmail(env, prev.msg_id);

  let msgId = null;
  if (lines.length && hasBrevo(env) && env.POSTAL_ADDRESS) {
    const raw = body.items.map((it) => [it.slug, Number(it.c) || 0, String(it.s), Math.floor(Number(it.q))]);
    const restoreUrl = `${site(env)}/?cart=${b64url(JSON.stringify(raw))}`;
    const u = await unsubUrl(env, email);
    const m = cartEmail(site(env), { lines, restoreUrl, unsubUrl: u, address: env.POSTAL_ADDRESS });
    msgId = await sendEmail(env, { to: email, subject: m.subject, html: m.html, unsubUrl: u, tags: ['abandoned-cart'],
      scheduledAt: new Date(Date.now() + DELAY_H * 3600e3).toISOString() }) || null;
  }
  await d.prepare('INSERT OR REPLACE INTO carts (email, ts, items, msg_id) VALUES (?, ?, ?, ?)').bind(email, new Date().toISOString(), items, msgId).run();
  return json({ ok: true });
}

