import { json, isAdmin, STATUSES } from '../../_shared.js';

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: 'Wrong password' }, 401);
  const status = new URL(request.url).searchParams.get('status');
  const stmt = STATUSES.includes(status)
    ? env.DB.prepare('SELECT * FROM orders WHERE status = ? ORDER BY id DESC').bind(status)
    : env.DB.prepare('SELECT * FROM orders ORDER BY id DESC');
  const { results } = await stmt.all();
  return json({ orders: results });
}
