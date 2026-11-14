// Brevo (email) helpers. Everything is skipped quietly when BREVO_API_KEY isn't set, so the shop never breaks because of email.
export const hasBrevo = (env) => !!env.BREVO_API_KEY;
export const site = (env) => (env.SITE_URL || 'https://gspot.world').replace(/\/$/, '');

export async function brevo(env, method, path, body) {
  if (!hasBrevo(env)) return { ok: false, status: 0, d: { skipped: true } };
  const r = await fetch((env.BREVO_API_BASE || 'https://api.brevo.com/v3') + path, {
    method,
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) console.log('brevo', method, path, r.status, JSON.stringify(d).slice(0, 300));
  return { ok: r.ok, status: r.status, d };
}

// Send (or schedule) one email. Returns Brevo's messageId, or '' when nothing was sent.
export async function sendEmail(env, { to, name, subject, html, scheduledAt, unsubUrl, tags }) {
  const body = {
    sender: { name: 'GSPOT', email: env.MAIL_FROM || 'support@gspot.world' },
    replyTo: { email: env.MAIL_FROM || 'support@gspot.world', name: 'GSPOT' },
    to: [{ email: to, ...(name ? { name } : {}) }],
    subject, htmlContent: html, tags,
  };
  if (scheduledAt) body.scheduledAt = scheduledAt;
  if (unsubUrl) body.headers = { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
  const r = await brevo(env, 'POST', '/smtp/email', body);
  return r.ok ? (r.d.messageId || (r.d.messageIds && r.d.messageIds[0]) || 'sent') : '';
}

export const cancelEmail = (env, messageId) =>
  messageId && messageId !== 'sent' ? brevo(env, 'DELETE', '/smtp/email/' + encodeURIComponent(messageId)) : Promise.resolve({ ok: true });

export const addContact = (env, email, attributes) =>
  brevo(env, 'POST', '/contacts', { email, listIds: [Number(env.BREVO_LIST_ID || 3)], updateEnabled: true, emailBlacklisted: false, attributes });

export const blockContact = (env, email) =>
  brevo(env, 'PUT', '/contacts/' + encodeURIComponent(email), { emailBlacklisted: true });

// Signed unsubscribe links, so nobody can unsubscribe someone else.
export async function unsubToken(env, email) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.UNSUB_SECRET || env.ADMIN_KEY || 'gspot'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(email).toLowerCase()));
  return [...new Uint8Array(sig)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const unsubUrl = async (env, email) => `${site(env)}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${await unsubToken(env, email)}`;
