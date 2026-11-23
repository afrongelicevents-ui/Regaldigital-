import { json, isAdmin, STATUSES } from '../../../_shared.js';

export async function onRequestPatch({ request, env, params }) {
  if (!(await isAdmin(request, env))) return json({ error: 'Wrong password' }, 401);
  const id = parseInt(params.id, 10);
  let body = {};
  try { body = await request.json(); } catch {}
  if (!id || !STATUSES.includes(body.status)) return json({ error: 'Invalid request' }, 400);
  const r = await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(body.status, id).run();
  if (!r.meta.changes) return json({ error: 'Order not found' }, 404);
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  if (!(await isAdmin(request, env))) return json({ error: 'Wrong password' }, 401);
  const id = parseInt(params.id, 10);
  if (!id) return json({ error: 'Invalid request' }, 400);
  await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
