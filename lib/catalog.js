// Server-side source of truth for prices. The browser only sends slug / colour index / size / quantity,
// so nobody can change a price by editing the page. Prices are in euro cents.
// Keep in sync with the PRODUCTS list in index.html (names, sizes, colours).
export const CURRENCY = 'eur';
export const FREE_SHIPPING_FROM = 8000; // €80.00
export const SHIPPING_FEE = 599;        // €5.99
// Discount codes: percent off the items (not shipping). GSPOT10 comes from the scratch card.
export const CODES = { GSPOT10: 10 };
export const shippingFor = (subtotal) => (subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);

export const CATALOG = {
  'dice-cap':          { name: 'Dice Cap',              price: 3999,  sizes: ['One size'], colors: [{ name: 'White', img: '/img/img_w.webp' }, { name: 'Black', img: '/img/img_b.webp' }], pod: true },
  'python-jacket':     { name: 'Python Jacket',         price: 10999, sizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'], colors: [{ name: 'Deep red', img: '/img/pk_python_item.webp' }] },
  'fur-collar-jacket': { name: 'Red Fur Collar Jacket', price: 12999, sizes: ['M', 'L', 'XL', 'XXL'], colors: [{ name: 'Black / red', img: '/img/pk_fur_item.webp' }] },
  'fencing-jacket':    { name: 'Fencing Jacket',        price: 8999,  sizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'Washed black', img: '/img/pk_fencing_item.webp' }] },
  'thorn-jeans':       { name: 'Thorn Jeans',           price: 9499,  sizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'Washed black', img: '/img/pk_thorn_item.webp' }] },
  'filigree-jeans':    { name: 'Filigree Jeans',        price: 8999,  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], colors: [{ name: 'Black', img: '/img/pk_filigree_item.webp' }] },
  'dice-chain':        { name: 'Dice Chain',            price: 2999,  sizes: ['One size'], colors: [{ name: 'Silver', img: '/img/pk_chain_item.webp' }] },
};

// Countries Stripe Checkout will accept a shipping address from. Edit to match where you ship.
export const SHIP_TO = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  'GB','CH','NO','IS','US','CA','AU','NZ','JP','KR','SG','HK','AE','IL',
];

// Turns the cart the browser sent into clean lines, or throws a message the shopper can read.
export function cleanCart(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Your cart is empty.');
  if (items.length > 20) throw new Error('Too many lines in the cart.');
  return items.map((it) => {
    const p = CATALOG[it && it.slug];
    if (!p) throw new Error('One of the items is no longer available. Remove it and try again.');
    const c = p.colors[Number(it.c) || 0];
    if (!c) throw new Error(`Pick a colour for ${p.name}.`);
    const size = String(it.s || '');
    if (!p.sizes.includes(size)) throw new Error(`Pick a size for ${p.name}.`);
    const q = Math.floor(Number(it.q));
    if (!(q >= 1 && q <= 9)) throw new Error(`Check the quantity for ${p.name}.`);
    return { slug: it.slug, name: p.name, color: c.name, img: c.img, size, q, unit: p.price };
  });
}

export const emailImg = (img) => String(img || '').replace('/img/', '/img/email/').replace('.webp', '.jpg');

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export const isEmail = (v) => typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// D1 tables are created on first use, so the only setup is binding a D1 database as DB.
let ready = false;
export async function db(env) {
  if (!env.DB) throw new Error('Storage is not connected yet.');
  if (!ready) {
    await env.DB.batch([
      env.DB.prepare('CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, email TEXT NOT NULL, items TEXT NOT NULL, total INTEGER NOT NULL, country TEXT)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, ts TEXT NOT NULL, src TEXT, country TEXT)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, ts TEXT NOT NULL, provider TEXT NOT NULL, status TEXT, email TEXT, name TEXT, address TEXT, items TEXT NOT NULL, total INTEGER NOT NULL, currency TEXT, code TEXT, country TEXT, shipped INTEGER DEFAULT 0)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS unsubscribed (email TEXT PRIMARY KEY, ts TEXT NOT NULL)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS carts (email TEXT PRIMARY KEY, ts TEXT NOT NULL, items TEXT NOT NULL, msg_id TEXT)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS shipments (order_id TEXT PRIMARY KEY, ts TEXT NOT NULL, carrier TEXT, tracking TEXT, url TEXT)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, e TEXT NOT NULL, slug TEXT, country TEXT)'),
    ]);
    ready = true;
  }
  return env.DB;
}
