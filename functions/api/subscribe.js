// Newsletter and scratch-card sign-ups.
import { json, isEmail, db } from '../../lib/catalog.js';
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  if (!isEmail(email)) return json({ error: 'Enter an email address like you@email.com.' }, 400);
  const src = ['footer', 'scratch', 'reserve'].includes(body.src) ? body.src : 'other';
  try {
    const d = await db(env);
    await d.prepare('INSERT OR IGNORE INTO subscribers (email, ts, src, country) VALUES (?, ?, ?, ?)')
      .bind(email, new Date().toISOString(), src, (request.cf && request.cf.country) || null).run();
  } catch (e) {
    console.log('subscribe error', e && e.message);
    return json({ error: 'Something went wrong.' }, 500);
  }
  return json({ ok: true });
}
