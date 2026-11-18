# Deploying Gebeta

Gebeta is a Next.js app. Orders, accounts, promo codes, care sheets, and kitchen settings live in one file: `db.json`.

**Deploy path:** Docker locally → Railway in production → Cloudflare for the custom domain.

Do not use serverless hosts (for example Vercel). They wipe the filesystem between requests. Run **one replica only** so two processes never overwrite `db.json`.

Payments and SMS are still demo until Stripe/Twilio are wired.

## Environment

| Variable | Purpose |
|----------|---------|
| `ADMIN_PASSWORD` | Kitchen portal at `/admin` |
| `DATA_DIR` | Folder for `db.json` (`/data` with the Docker/Railway volume) |
| `KITCHEN_HOST` | Hostname(s) for kitchen only (Railway URL and/or `kitchen.…`). Comma-separated. When set, customer hosts get 404 on `/admin`. |
| `PUBLIC_APP_URL` | Customer site origin used in SMS / order notice links (e.g. `https://gebetacater-production.up.railway.app`) |
| `PORT` | Injected by Railway/Docker; image default is `3000` |

Never commit `ADMIN_PASSWORD` or put it in a `NEXT_PUBLIC_` variable.

**One Railway service** runs both storefront and kitchen (shared `db.json`). Do not split into two Railway services — volumes and the file store are not shared across services.

Local `npm run dev`: set `ADMIN_PASSWORD` in `.env.local`.

## Docker (local)

```bash
copy .env.example .env
# set ADMIN_PASSWORD
npm run docker:up
```

Open [http://localhost:47231](http://localhost:47231).

Orders persist in the Docker volume `gebeta-data`. Stop with `npm run docker:down` (add `-v` only if you intend to wipe data).

## Railway (production)

1. Connect this repo. `railway.json` builds with the **Dockerfile**.
2. Variables: `ADMIN_PASSWORD`, `DATA_DIR=/data`.
3. Volume mounted at `/data` (in Railway UI — do **not** use `VOLUME` in the Dockerfile; Railway rejects that).
4. Replicas = **1**. Healthcheck `/api/health`.
5. Smoke-test the public URL, then open `/admin` with the kitchen password.
6. Redeploy once and confirm orders in `/data/db.json` survived.

### Separate kitchen host (like Sabu)

Keep **one** Railway service. Staff use a different hostname than customers:

1. Note the Railway URL (`something.up.railway.app`) — this becomes the kitchen bookmark, **or** add `kitchen.yourdomain.com` as a second Railway domain.
2. Set `KITCHEN_HOST` to that kitchen hostname (comma-separate if you use more than one).
3. Point the customer domain (`gebetacater.com`) at the same Railway service.
4. On the kitchen host, `/` redirects to `/admin`. On the customer host, `/admin` returns 404.
5. Staff bookmark the kitchen URL only; customers never see a staff link.

Until you have a customer domain, leave `KITCHEN_HOST` unset so `/admin` still works on the Railway URL.

### Import existing data

Copy your current `data/db.json` onto the Railway volume as `/data/db.json`, then restart the service.

### Cloudflare + domain

1. Confirm the app on `*.up.railway.app` (kitchen bookmark until a kitchen subdomain exists).
2. Cloudflare DNS for `gebetacater.com` → CNAME to Railway (proxy on). Optional: `kitchen.gebetacater.com` → same target.
3. Add both domains in Railway. Set `KITCHEN_HOST` to the kitchen hostname(s).
4. Bypass caching for `/api/*` (and the kitchen host if proxied).

## Temporary friend link (dev only)

```bash
npm run dev
cloudflared tunnel --url http://127.0.0.1:47231 --no-autoupdate
```

Uses a temporary `*.trycloudflare.com` URL while this computer is awake. For LAN, add the machine’s address to `allowedDevOrigins` in `next.config.ts` if it is not already listed.

## What stays demo for now

- Checkout: `4242…` approves; numbers starting with `4000` decline.
- Ready / out-for-delivery messages are stored on the order, not sent by SMS.
- Delivery rate and lead time come from kitchen settings in `db.json`.

## Do not

- Commit `data/db.json` or `.env` files.
- Run more than one server against the same `db.json`.
- Delete production `db.json` (that wipes accounts, orders, promos, and care sheets).
