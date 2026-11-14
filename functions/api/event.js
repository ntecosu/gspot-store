// Tiny first-party counter: product views, add-to-carts and checkout clicks. No cookies, no personal data.
import { json, db, CATALOG } from '../../lib/catalog.js';
const ALLOWED = ['view_item', 'add_to_cart', 'begin_checkout'];
export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ ok: false }, 400); }
  if (!ALLOWED.includes(b.e)) return json({ ok: false }, 400);
  const slug = CATALOG[b.slug] ? b.slug : '';
  try {
    const d = await db(env);
    await d.prepare('INSERT INTO events (ts, e, slug, country) VALUES (?, ?, ?, ?)')
      .bind(new Date().toISOString(), b.e, slug, (request.cf && request.cf.country) || null).run();
  } catch (e) { return json({ ok: false }, 500); }
  return json({ ok: true });
}
