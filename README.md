# Regal Digital website

- `public/` – the website (`index.html`) and the admin page (`admin/index.html`)
- `functions/` – Cloudflare Pages Functions (`/api/order`, `/api/admin/...`)
- `schema.sql` – D1 database table for orders

Secrets (set with `wrangler pages secret put`, never in code):
`ADMIN_PASSWORD`, optional `RESEND_API_KEY` and `ALERT_EMAIL` for email alerts.

Deploy: `npx wrangler pages deploy`
