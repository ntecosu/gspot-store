// Your results page data. Protected by the ADMIN_KEY secret (sent as a header, never in the URL).
import { json, db } from '../../lib/catalog.js';
export async function onRequestGet({ request, env }) {
  const key = request.headers.get('x-admin-key') || '';
  if (!env.ADMIN_KEY || key.length < 12 || key !== env.ADMIN_KEY) return json({ error: 'Wrong key.' }, 401);
  const d = await db(env);
  const [funnel, bySlug, byDay, res, subs, subCount, countries, orders] = await Promise.all([
    d.prepare('SELECT e, COUNT(*) n FROM events GROUP BY e').all(),
    d.prepare("SELECT slug, SUM(e='view_item') views, SUM(e='add_to_cart') adds FROM events WHERE slug<>'' GROUP BY slug ORDER BY adds DESC, views DESC").all(),
    d.prepare("SELECT substr(ts,1,10) day, SUM(e='view_item') views, SUM(e='add_to_cart') adds, SUM(e='begin_checkout') checkouts, SUM(e='reserve') reserves FROM events GROUP BY day ORDER BY day DESC LIMIT 30").all(),
    d.prepare('SELECT ts, email, items, total, country FROM reservations ORDER BY id DESC LIMIT 500').all(),
    d.prepare('SELECT email, ts, src, country FROM subscribers ORDER BY ts DESC LIMIT 1000').all(),
    d.prepare('SELECT COUNT(*) n FROM subscribers').first(),
    d.prepare('SELECT country, COUNT(*) n FROM events WHERE country IS NOT NULL GROUP BY country ORDER BY n DESC LIMIT 15').all(),
    d.prepare('SELECT o.id, o.ts, o.provider, o.status, o.email, o.name, o.address, o.items, o.total, o.currency, o.code, o.country, o.shipped, s.carrier, s.tracking, s.url FROM orders o LEFT JOIN shipments s ON s.order_id = o.id ORDER BY o.ts DESC LIMIT 500').all(),
  ]);
  return json({
    funnel: Object.fromEntries(funnel.results.map((r) => [r.e, r.n])),
    bySlug: bySlug.results, byDay: byDay.results, countries: countries.results,
    orders: orders.results.map((o) => ({ ...o, items: JSON.parse(o.items) })),
    reservations: res.results.map((r) => ({ ...r, items: JSON.parse(r.items) })),
    subscribers: subs.results, subscriberCount: subCount ? subCount.n : 0,
  });
}
