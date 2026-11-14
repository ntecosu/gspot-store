// Daily EUR exchange rates (European Central Bank, via frankfurter) for showing prices in other currencies.
// Checkout is always in EUR, so these are display-only. Cached for 6 hours.
const CURS = 'USD,GBP,CAD,AUD,CHF,SEK,NOK,DKK,PLN,CZK,JPY';
export async function onRequestGet({ request }) {
  const cache = caches.default;
  const key = new Request(new URL('/api/rates?v=1', request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  let rates = null, date = '';
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=EUR&to=' + CURS, { cf: { cacheTtl: 21600 } });
    if (r.ok) { const d = await r.json(); rates = d.rates; date = d.date; }
  } catch (e) {}
  if (rates) rates.AED = +(rates.USD * 3.6725).toFixed(4); // AED is pegged to USD
  const res = new Response(JSON.stringify({ base: 'EUR', date, rates: rates || null }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=21600' },
  });
  if (rates) await cache.put(key, res.clone());
  return res;
}
