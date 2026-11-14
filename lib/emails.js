// GSPOT email templates. Plain tables and inline styles so they render in Gmail, Apple Mail and Outlook.
import { emailImg } from './catalog.js';

const RED = '#e3122f';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (cents) => '€' + (cents / 100).toFixed(2);
const FONT = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif";

function layout(site, { preheader, body, unsubUrl, address, why }) {
  const foot = [
    why ? esc(why) : '',
    unsubUrl ? `<a href="${esc(unsubUrl)}" style="color:#8a8384;text-decoration:underline">Unsubscribe</a>` : '',
    address ? 'GSPOT · ' + esc(address) : 'GSPOT · gspot.world',
  ].filter(Boolean).join('<br>');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>GSPOT</title></head>
<body style="margin:0;padding:0;background:#060606">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader || '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#060606"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding:6px 0 26px"><a href="${site}"><img src="${site}/img/email/logo.png" width="220" alt="GSPOT" style="display:block;width:220px;max-width:70%;height:auto;border:0"></a></td></tr>
<tr><td style="background:#111;border-radius:22px;padding:34px 28px;${FONT};color:#f6f3f1">${body}</td></tr>
<tr><td align="center" style="padding:22px 10px 8px;${FONT};font-size:12px;line-height:1.6;color:#8a8384">${foot}</td></tr>
</table></td></tr></table></body></html>`;
}

const h1 = (t) => `<h1 style="margin:0 0 12px;${FONT};font-size:30px;line-height:1.1;font-weight:900;color:${RED};text-transform:lowercase;letter-spacing:-.01em">${t}</h1>`;
const p = (t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#d8d2d0">${t}</p>`;
const btn = (href, label) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr><td style="border-radius:999px;background:${RED}"><a href="${esc(href)}" style="display:inline-block;padding:15px 30px;${FONT};font-size:16px;font-weight:800;color:#fff;text-decoration:none;text-transform:lowercase">${esc(label)}</a></td></tr></table>`;

function itemRows(site, lines, withPrice) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;border-top:1px solid #262626">${lines.map((l) => `
<tr><td width="76" style="padding:14px 14px 14px 0;border-bottom:1px solid #262626;vertical-align:top">${l.img ? `<img src="${site}${esc(emailImg(l.img))}" width="76" alt="" style="display:block;width:76px;height:auto;border-radius:10px;background:#fff">` : ''}</td>
<td style="padding:14px 0;border-bottom:1px solid #262626;vertical-align:top;${FONT}"><div style="font-size:15px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.04em">${esc(l.name)}</div>
<div style="font-size:13px;color:#a8a1a2;margin-top:3px">${esc([l.color, l.size].filter(Boolean).join(' · '))}${l.q > 1 ? ' &nbsp;×' + l.q : ''}</div></td>
${withPrice ? `<td align="right" style="padding:14px 0;border-bottom:1px solid #262626;vertical-align:top;${FONT};font-size:14px;color:#fff;white-space:nowrap">${eur(l.unit * l.q)}</td>` : ''}</tr>`).join('')}</table>`;
}

export function welcomeEmail(site, { unsubUrl, address }) {
  return {
    subject: "You're in. Here's your 10% 🎲",
    html: layout(site, {
      preheader: 'Your code GSPOT10 takes 10% off your first order.',
      unsubUrl, address, why: 'You got this because you signed up at gspot.world.',
      body: h1("you're in.") + p('Thanks for claiming your spot. Here is your 10% off your first order:') +
        `<div style="margin:18px 0;padding:18px;border:2px dashed ${RED};border-radius:16px;text-align:center;${FONT};font-size:32px;font-weight:900;letter-spacing:.12em;color:#fff">GSPOT10</div>` +
        p('Type it in the cart before you pay. It works on everything, including Drop 01: the Dice Cap.') +
        btn(site + '/#shop', 'shop drop 01') +
        p('<span style="font-size:13px;color:#8a8384">Drops, restocks and new picks land in your inbox first. No spam.</span>'),
    }),
  };
}

export function orderEmail(site, { id, lines, total, discount, shipping, name, address }) {
  const first = String(name || '').split(' ')[0];
  return {
    subject: `Order confirmed: ${id}`,
    html: layout(site, {
      preheader: 'Thanks for your order. Here is what happens next.',
      body: h1('purchase successful.') + p(`${first ? 'Thanks ' + esc(first) + '. ' : ''}Your order <b style="color:#fff">${esc(id)}</b> is in.`) +
        itemRows(site, lines, true) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${FONT};font-size:14px;color:#d8d2d0;margin:4px 0 16px">
          ${discount ? `<tr><td style="padding:3px 0">Discount</td><td align="right" style="color:${RED}">−${eur(discount)}</td></tr>` : ''}
          <tr><td style="padding:3px 0">Shipping</td><td align="right">${shipping ? eur(shipping) : 'Free'}</td></tr>
          <tr><td style="padding:8px 0 0;font-weight:800;color:#fff;font-size:16px">Total paid</td><td align="right" style="padding:8px 0 0;font-weight:800;color:#fff;font-size:16px">${eur(total)}</td></tr></table>` +
        (address ? p(`<b style="color:#fff">Shipping to</b><br>${esc(name || '')}<br>${esc(address)}`) : '') +
        p('Caps are embroidered to order (2–7 business days) and picked items ship from our partner warehouse. Pieces can arrive in separate parcels. We email tracking as soon as each one ships.') +
        p('Questions? Just reply to this email.'),
    }),
  };
}

export function cartEmail(site, { lines, restoreUrl, unsubUrl, address }) {
  return {
    subject: 'Your spot is still open',
    html: layout(site, {
      preheader: 'You left something in your cart.',
      unsubUrl, address, why: 'You got this because you signed up at gspot.world and left items in your cart.',
      body: h1('still thinking?') + p('You left these in your cart. Sizes on our picks are limited, so they may not wait long.') +
        itemRows(site, lines, false) + btn(restoreUrl, 'back to my cart') +
        p('<span style="font-size:13px;color:#8a8384">Signed up with the scratch card? Your code GSPOT10 still works.</span>'),
    }),
  };
}

export function shippedEmail(site, { id, carrier, tracking, url, lines }) {
  return {
    subject: `Your GSPOT order is on its way`,
    html: layout(site, {
      preheader: tracking ? `Tracking: ${tracking}` : 'Your order has shipped.',
      body: h1('on its way.') + p(`Good news: part or all of order <b style="color:#fff">${esc(id)}</b> has shipped.`) +
        (lines && lines.length ? itemRows(site, lines, false) : '') +
        p(`<b style="color:#fff">${esc(carrier || 'Tracking')}</b>${tracking ? ': ' + esc(tracking) : ''}`) +
        (url ? btn(url, 'track my parcel') : '') +
        p('Tracking can take a day to update after the label is created. Questions? Just reply to this email.'),
    }),
  };
}
