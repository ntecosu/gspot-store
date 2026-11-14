// Newsletter and scratch-card sign-ups: saved in D1, added to the Brevo list, and sent the GSPOT10 welcome email once.
import { json, isEmail, db } from '../../lib/catalog.js';
import { addContact, sendEmail, unsubUrl, site } from '../../lib/brevo.js';
import { welcomeEmail } from '../../lib/emails.js';

export async function onRequestPost({ request, env, waitUntil }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  if (!isEmail(email)) return json({ error: 'Enter an email address like you@email.com.' }, 400);
  const src = ['footer', 'scratch', 'reserve'].includes(body.src) ? body.src : 'other';
  const country = (request.cf && request.cf.country) || null;
  let isNew = false;
  try {
    const d = await db(env);
    const r = await d.prepare('INSERT OR IGNORE INTO subscribers (email, ts, src, country) VALUES (?, ?, ?, ?)')
      .bind(email, new Date().toISOString(), src, country).run();
    isNew = !!(r.meta && r.meta.changes);
    await d.prepare('DELETE FROM unsubscribed WHERE email = ?').bind(email).run(); // signing up again = opting back in
  } catch (e) {
    console.log('subscribe error', e && e.message);
    return json({ error: 'Something went wrong.' }, 500);
  }
  if (isNew) {
    waitUntil((async () => {
      await addContact(env, email, { SOURCE: src, COUNTRY: country || '' });
      const m = welcomeEmail(site(env), { unsubUrl: await unsubUrl(env, email), address: env.POSTAL_ADDRESS || '' });
      await sendEmail(env, { to: email, subject: m.subject, html: m.html, unsubUrl: await unsubUrl(env, email), tags: ['welcome'] });
    })().catch((e) => console.log('welcome failed', e.message)));
  }
  return json({ ok: true });
}
