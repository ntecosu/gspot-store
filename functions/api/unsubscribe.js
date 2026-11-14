// One-click unsubscribe from the link in every marketing email.
import { db } from '../../lib/catalog.js';
import { unsubToken, blockContact, cancelEmail } from '../../lib/brevo.js';

const page = (title, msg) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} | GSPOT</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#060606;color:#f6f3f1;font:16px/1.6 system-ui,sans-serif;padding:24px 16px;text-align:center}h1{color:#e3122f;font-size:34px;margin:0 0 10px;text-transform:lowercase}a{color:#fff}</style></head>
<body><main><h1>${title}</h1><p>${msg}</p><p><a href="/">back to gspot.world</a></p></main></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8' } });

async function handle({ request, env }) {
  const u = new URL(request.url);
  const email = String(u.searchParams.get('e') || '').trim().toLowerCase();
  const t = u.searchParams.get('t') || '';
  if (!email || t !== (await unsubToken(env, email))) return page('link expired', 'This unsubscribe link is not valid. Email support@gspot.world and we will remove you by hand.');
  const d = await db(env);
  await d.prepare('INSERT OR IGNORE INTO unsubscribed (email, ts) VALUES (?, ?)').bind(email, new Date().toISOString()).run();
  const c = await d.prepare('SELECT msg_id FROM carts WHERE email = ?').bind(email).first();
  if (c && c.msg_id) await cancelEmail(env, c.msg_id);
  await d.prepare('DELETE FROM carts WHERE email = ?').bind(email).run();
  await blockContact(env, email);
  return page('unsubscribed.', "You won't get marketing emails from GSPOT any more. Order and shipping emails still arrive if you buy.");
}
export const onRequestGet = handle;
export const onRequestPost = handle; // one-click unsubscribe from mail apps
