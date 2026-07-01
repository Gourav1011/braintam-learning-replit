# Braintam — Production Deployment Guide

## Architecture

```
Browser (HTTPS)
      │
      ▼
  Nginx :443  ──── TLS termination, HTTP→HTTPS redirect
      │
      ▼
  localhost:5000  (PM2: braintam-api)
      │
      ├── GET /*          → express.static → artifacts/braintam/dist/public/
      │                        └── index.html (React SPA catch-all)
      │
      ├── POST /api/*     → Express route handlers
      │        ├── /api/auth/login
      │        ├── /api/admin/*
      │        ├── /api/teacher/*
      │        ├── /api/mentor/*
      │        ├── /api/student/*
      │        ├── /api/slides/*
      │        └── ... (see artifacts/api-server/src/routes/)
      │
      ├── WS  /socket.io  → Socket.IO (live classroom, chat, polls)
      │
      └── → Neon PostgreSQL (cloud, TLS)
```

**One process. One port. No separate frontend server.**

The React build output (`artifacts/braintam/dist/public/`) is served directly
by the same Express process via `express.static`. This was introduced in commit
`28e3319` (Jun 24 2026) and is the permanent, official architecture.

---

## Entrypoint

```bash
PORT=5000 NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs
```

Run from the repository root (`/root/braintam-learning-replit`).

---

## Required Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | Must be `5000` on VPS |
| `NODE_ENV` | ✅ | Must be `production` |
| `NEON_DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Session signing secret (long random string) |
| `CLERK_SECRET_KEY` | ✅ | Clerk backend secret key (`sk_live_...`) |
| `CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key (`pk_live_...`) |
| `RAZORPAY_KEY_ID` | ✅ | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay key secret |
| `FAST2SMS_API_KEY` | Optional | SMS notifications via Fast2SMS |
| `STATIC_DIR` | Optional | Override frontend static dir path |

**Never commit real secret values.** Set them in `ecosystem.config.js` env block
or export them in the shell before starting PM2.

---

## PM2 Configuration

File: `ecosystem.config.js` (in repo root)

```js
module.exports = {
  apps: [{
    name: "braintam-api",
    script: "node",
    args: "--enable-source-maps artifacts/api-server/dist/index.mjs",
    cwd: "/root/braintam-learning-replit",
    instances: 1,          // Socket.IO requires fork mode, not cluster
    exec_mode: "fork",
    autorestart: true,
    watch: false,
    max_memory_restart: "512M",
    env: {
      NODE_ENV: "production",
      PORT: "5000",
      NEON_DATABASE_URL: "postgresql://...",
      SESSION_SECRET: "...",
      CLERK_SECRET_KEY: "sk_live_...",
      CLERK_PUBLISHABLE_KEY: "pk_live_...",
      RAZORPAY_KEY_ID: "rzp_live_...",
      RAZORPAY_KEY_SECRET: "...",
    }
  }]
};
```

### First-time PM2 setup

```bash
# Install PM2 globally if not present
npm install -g pm2

# Start the app
cd /root/braintam-learning-replit
pm2 start ecosystem.config.js

# Save process list (survives reboots)
pm2 save

# Register PM2 as a system service
pm2 startup
# Copy and run the command it prints
```

### Remove the old braintam-live process (if still running)

```bash
pm2 stop braintam-live 2>/dev/null || true
pm2 delete braintam-live 2>/dev/null || true
pm2 save
```

`braintam-live` was a separate Vite/frontend server that is **no longer needed**.
The API server now serves the React build directly.

---

## Nginx Configuration

File: `/etc/nginx/sites-available/braintam`

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name braintam.com www.braintam.com;
    return 301 https://$host$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name braintam.com www.braintam.com;

    # SSL — managed by Certbot / Let's Encrypt
    ssl_certificate     /etc/letsencrypt/live/braintam.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/braintam.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Proxy everything to the single Node process
    location / {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;

        # Required for Socket.IO WebSocket upgrade
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Socket.IO long-polling / keep-alives
        proxy_read_timeout  86400s;
        proxy_send_timeout  86400s;
        proxy_connect_timeout 10s;

        # Increase buffer for large API responses (recordings, course lists)
        proxy_buffer_size         128k;
        proxy_buffers             4 256k;
        proxy_busy_buffers_size   256k;
    }
}
```

```bash
# Enable the site
ln -sf /etc/nginx/sites-available/braintam /etc/nginx/sites-enabled/braintam
nginx -t        # verify config
systemctl reload nginx
```

---

## Standard Deployment Workflow

After making changes in Replit:

```bash
# 1. In Replit — push to GitHub
git add artifacts/api-server/dist/ artifacts/braintam/dist/
git commit -m "Deploy: <description>"
git push origin main

# 2. On VPS
cd /root/braintam-learning-replit
./deploy.sh
```

`deploy.sh` does:
1. `git pull origin main` — fetches latest code + pre-built dist files
2. Verifies `artifacts/api-server/dist/index.mjs` and `artifacts/braintam/dist/public/` exist
3. `pm2 restart braintam-api --update-env`
4. `pm2 save`
5. Health-checks `/api/healthz` and `/`

### Force rebuild on VPS (if dist not committed)

```bash
./deploy.sh --rebuild
```

This runs `pnpm install` + `pnpm build` on the VPS before restarting.
Note: requires Node.js and pnpm installed on the VPS.

---

## Verification Commands

```bash
# Is the process running?
pm2 status

# API health check
curl -sf http://localhost:5000/api/healthz && echo " ✓ API OK"

# React SPA serving
curl -sf http://localhost:5000/ | grep -o "<title>.*</title>" && echo " ✓ Frontend OK"

# Socket.IO endpoint
curl -sf "http://localhost:5000/socket.io/?EIO=4&transport=polling" | head -c 50 && echo " ✓ Socket.IO OK"

# Port confirmed open
ss -tulpn | grep :5000

# Live logs
pm2 logs braintam-api --lines 50

# Live metrics
pm2 monit
```

---

## Recovery Steps After Reboot

If the server reboots, PM2 should auto-start `braintam-api` (if `pm2 startup`
and `pm2 save` were run). To verify:

```bash
pm2 status
# Should show braintam-api as "online"
```

If not running:

```bash
cd /root/braintam-learning-replit
pm2 start ecosystem.config.js
pm2 save
```

If nginx is down:

```bash
systemctl status nginx
systemctl restart nginx
```

Full recovery sequence:

```bash
cd /root/braintam-learning-replit
pm2 start ecosystem.config.js   # start app
pm2 save                         # persist
systemctl restart nginx          # ensure proxy is running
curl http://localhost:5000/api/healthz  # verify
```

---

## Build Output Paths

| Artifact | Build command | Output directory |
|---|---|---|
| React frontend | `pnpm --filter @workspace/braintam run build` | `artifacts/braintam/dist/public/` |
| API server | `pnpm --filter @workspace/api-server run build` | `artifacts/api-server/dist/` |

The API server resolves the frontend path at runtime as:
```
path.resolve(__dirname, "../../braintam/dist/public")
```
where `__dirname` = `artifacts/api-server/dist/`. This means both dist folders
**must be siblings** under `artifacts/` — which they are by design.

Override with env var if needed:
```bash
STATIC_DIR=/custom/path/to/public pm2 restart braintam-api --update-env
```

---

## Replit vs VPS: Same Entrypoint

| | Replit (dev) | VPS (production) |
|---|---|---|
| Frontend | Vite dev server `:18817` | `express.static` from dist/ |
| API | `pnpm run dev` (build + start) | `node dist/index.mjs` |
| Port | Assigned by Replit | `5000` |
| DB | `NEON_DATABASE_URL` | `NEON_DATABASE_URL` (same Neon DB) |
| Entrypoint | `artifacts/api-server/dist/index.mjs` | `artifacts/api-server/dist/index.mjs` |

The compiled entrypoint is identical. Only the `PORT` and presence of the
Vite dev server differ between environments.

---

## What NOT to Run on VPS

| Command | Reason |
|---|---|
| `pnpm run dev` | Dev-only — starts Vite HMR, not for production |
| Any separate frontend server | Not needed — Express serves the build |
| `braintam-live` PM2 process | Removed — was the old separate frontend |
| Vite preview server | Not needed — Express serves `dist/public` |
