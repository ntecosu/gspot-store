// Read-only summary for the success page: only what the shopper already knows.
import { json } from '../../lib/catalog.js';
export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id) || !env.STRIPE_SECRET_KEY) return json({ error: 'not found' }, 404);
  const r = await fetch((env.STRIPE_API_BASE || 'https://api.stripe.com') + '/v1/checkout/sessions/' + id, {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!r.ok) return json({ error: 'not found' }, 404);
  const s = await r.json();
  return json({ paid: s.payment_status === 'paid', email: s.customer_details && s.customer_details.email, total: s.amount_total, currency: s.currency });
}
