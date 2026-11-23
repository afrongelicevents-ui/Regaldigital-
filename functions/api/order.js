import { json } from '../_shared.js';

const PACKAGES = [
  'Starter ($80 + $10/month)',
  'Business ($180 + $15/month)',
  'Premium (from $350 + $25/month)',
  'Not sure yet, please advise',
];

function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function validContact(c) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return true;
  if (c.includes('@') || /[^\d\s()+\-.]/.test(c)) return false;
  const digits = c.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

async function sendAlert(env, order, origin) {
  if (!env.RESEND_API_KEY || !env.ALERT_EMAIL) return;
  const rows = [
    ['Name', order.name], ['Business', order.business], ['Package', order.package],
    ['Contact', order.contact], ['Message', order.message || '-'],
  ];
  const html = `<div style="font-family:Arial,sans-serif;color:#0F2B2C;background:#FBF7F0;padding:24px">
<h2 style="color:#0B4A4B;margin:0 0 16px">New website order</h2>
<table style="border-collapse:collapse;background:#fff;border-radius:12px">${rows
    .map(([k, v]) => `<tr><td style="padding:8px 14px;font-weight:bold;vertical-align:top">${k}</td><td style="padding:8px 14px;white-space:pre-wrap">${esc(v)}</td></tr>`)
    .join('')}</table>
<p style="margin-top:20px"><a href="${origin}/admin" style="background:#0B4A4B;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Open admin</a></p></div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nAdmin: ${origin}/admin`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.ALERT_FROM || 'Regal Digital <onboarding@resend.dev>',
      to: [env.ALERT_EMAIL],
      subject: `New order: ${order.business} (${order.package.split(' (')[0]})`,
      html,
      text,
    }),
  });
  if (!res.ok) console.log('Resend error', res.status, await res.text());
}

export async function onRequestPost({ request, env, waitUntil }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Something went wrong. Please try again.' }, 400);
  }
  // Hidden "website" field: real people never fill it in, spam bots do.
  if (clean(body.website, 200)) return json({ ok: true });

  const order = {
    name: clean(body.name, 100),
    business: clean(body.business, 150),
    contact: clean(body.contact, 120),
    package: clean(body.package, 80),
    message: clean(body.message, 2000),
  };
  if (!order.name) return json({ error: 'Please add your name.' }, 400);
  if (!order.business) return json({ error: 'Please add your business name.' }, 400);
  if (!order.contact) return json({ error: 'Please add a phone number or email so we can reach you.' }, 400);
  if (!validContact(order.contact)) return json({ error: "That phone number or email doesn't look right. Please check it." }, 400);
  if (!PACKAGES.includes(order.package)) order.package = 'Not sure yet, please advise';

  try {
    await env.DB.prepare('INSERT INTO orders (name, business, package, contact, message) VALUES (?, ?, ?, ?, ?)')
      .bind(order.name, order.business, order.package, order.contact, order.message)
      .run();
  } catch (e) {
    console.log('DB error', e && e.message);
    return json({ error: "We couldn't save your order right now. Please try again, or chat with us on WhatsApp." }, 500);
  }

  waitUntil(sendAlert(env, order, new URL(request.url).origin).catch((e) => console.log('Alert failed', e && e.message)));
  return json({ ok: true });
}

export function onRequest() {
  return json({ error: 'Method not allowed' }, 405);
}
