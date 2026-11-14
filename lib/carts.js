import { db } from './catalog.js';
import { cancelEmail } from './brevo.js';

// Called after a purchase: stop any pending reminder for these emails.
export async function clearCarts(env, emails) {
  const d = await db(env);
  for (const e of emails.filter(Boolean)) {
    const row = await d.prepare('SELECT msg_id FROM carts WHERE email = ?').bind(e).first();
    if (row && row.msg_id) await cancelEmail(env, row.msg_id);
    await d.prepare('DELETE FROM carts WHERE email = ?').bind(e).run();
  }
}
