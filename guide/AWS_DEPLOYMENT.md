# AWS Deployment Guide — Lightsail/EC2 + RDS Postgres

A complete, step-by-step runbook for putting `prep_ncert` into production on AWS, following the architecture decided in `docs/AWS_EC2_MIGRATION_PLAN.md`: one Node/Express server on Lightsail (or EC2), RDS PostgreSQL, S3, SES, Google Identity Services for sign-in. Region: `ap-south-1` (Mumbai) throughout, for DPDP data-residency and lowest latency to Indian users.

---

## 0. Before you start

- An AWS account with the credits applied, MFA enabled on the root user, and an IAM user (not root) for day-to-day work.
- A domain name you control (for TLS and the production Google OAuth origin).
- The Google OAuth client ID from local dev (`guide/QUICKSTART.md`) — you'll add the production domain to it in step 8.

---

## 1. Provision the Lightsail instance

1. Lightsail console → **Create instance** → Linux/Unix → **OS Only: Ubuntu 24.04 LTS** → region **ap-south-1**.
2. Plan: the 2 GB RAM / 2 vCPU plan is comfortable for a solo-developer launch; you have credits, so there's no reason to start smaller.
3. Name it (e.g. `ncert-prep-prod`), create it, and attach a **static IP** (Lightsail console → Networking → Create static IP → attach to the instance). Without this, the IP changes on every reboot.
4. Networking tab → firewall: open **22** (SSH, ideally restricted to your IP), **80**, **443**. Do **not** open 4000 or 5432 publicly — the app is reverse-proxied through Nginx on 80/443, and Postgres is a separate RDS instance not reachable from the internet at all.

SSH in (download the default key from the Lightsail console first):

```bash
ssh -i LightsailDefaultKey.pem ubuntu@<static-ip>
```

## 2. Install runtime dependencies on the instance

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2
node --version   # confirm v22.x
```

## 3. Provision RDS PostgreSQL

1. RDS console → **Create database** → Standard create → **PostgreSQL** (latest 16.x) → **Free tier** template if within 12 months of account creation, otherwise **Production** template with `db.t3.micro`.
2. Region **ap-south-1**. DB instance identifier: `prep-ncert-prod`.
3. Master username/password: generate a strong password, save it (you'll put it in the backend's `.env`, not in git).
4. **Connectivity**: "Don't connect to an EC2 compute resource" (we'll wire it manually), VPC = default, **Public access: No**. This keeps the database unreachable from outside the VPC.
5. VPC security group: create a new one, e.g. `prep-ncert-db-sg`.
6. Enable **automated backups** (7+ days retention) and leave Multi-AZ off for launch (turn it on later if uptime requirements justify the cost — you have credits, so this is cheap to add anytime).
7. Create the database. Note the **endpoint** once it's available (RDS console → your DB → Connectivity & security).

**Allow the Lightsail instance to reach RDS:** RDS lives in a VPC; Lightsail instances by default do not. Two options:
- **Simplest**: RDS console → your DB → Connectivity & security → VPC security groups → edit inbound rules → allow port 5432 from the Lightsail instance's public static IP (`/32`). This works but means the DB is reachable from that one IP over the public internet path AWS provides for RDS — acceptable for a launch-stage app, tightened later with VPC peering if needed.
- **Better, more setup**: enable [Lightsail VPC peering](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-configuring-your-lightsail-vpc-to-peer-with-your-default-vpc.html) (Lightsail console → Account → Advanced → VPC peering → enable), then allow the RDS security group to accept traffic from the Lightsail instance's private IP instead of a public one. Do this before launch if you're comfortable with it; otherwise ship with the simpler option and revisit.

## 4. Deploy the backend

On the instance:

```bash
sudo mkdir -p /var/www/prep-ncert
sudo chown ubuntu:ubuntu /var/www/prep-ncert
cd /var/www/prep-ncert
git clone <your-repo-url> .
cd prep_ncert/backend
npm ci
```

Create `.env` (never commit this):

```bash
DATABASE_URL=postgres://<master-user>:<password>@<rds-endpoint>:5432/postgres
PORT=4000
FRONTEND_ORIGIN=https://your-domain.com
GOOGLE_CLIENT_ID=<same client id as before>
SESSION_SECRET=<openssl rand -base64 48>
SES_FROM_EMAIL=NCERT Prep <noreply@your-domain.com>
AWS_REGION=ap-south-1
```

Run the migration against RDS, build, and start under PM2:

```bash
npm run prisma:deploy   # applies the committed migrations to RDS, non-interactively
npm run build
pm2 start dist/index.js --name prep-ncert-api
pm2 save
pm2 startup   # follow the printed instructions so PM2 survives a reboot
```

**IAM for SES** (so the app can actually send mail without an access key in `.env`): Lightsail instances don't get IAM roles the way EC2 does. Two options:
- Easiest: create an IAM user scoped to `ses:SendEmail`/`ses:SendRawEmail` only, generate an access key, and add `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` to the backend `.env`.
- Cleaner: run on **EC2** instead of Lightsail specifically so you can attach an IAM instance role with an SES-send policy — no long-lived keys on disk at all. If SES-without-static-keys matters to you, prefer EC2 over Lightsail for this reason alone; everything else in this guide is identical either way.

## 5. Deploy the frontend

Build locally or on the instance — building on the instance keeps secrets off your laptop and matches what CI will do later:

```bash
cd /var/www/prep-ncert/prep_ncert/frontend
npm ci
cp .env.example .env   # then fill in VITE_API_URL=https://your-domain.com (no /api suffix — every call path already includes it), VITE_GOOGLE_CLIENT_ID, and the real Firebase keys still needed for content/leaderboard until their migration phase
npm run build
```

This produces `prep_ncert/frontend/dist/` — a static bundle. Nginx will serve it directly.

## 6. Nginx: one box serves both the SPA and the API

`/etc/nginx/sites-available/prep-ncert`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/prep-ncert/prep_ncert/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # SPA fallback: any non-file, non-/api route serves index.html so React Router owns client-side routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/prep-ncert /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 7. DNS and TLS

1. Point your domain's `A` record (and `www`) at the Lightsail static IP.
2. Once DNS has propagated (`dig your-domain.com`):

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot edits the Nginx config to add the 443 server block and sets up auto-renewal (`sudo certbot renew --dry-run` to confirm the timer works).

## 8. Production config for Google sign-in

Google Cloud Console → your OAuth client → **Authorized JavaScript origins** → add `https://your-domain.com`. Takes effect within a few minutes, no redeploy needed.

## 9. Amazon SES — leaving the sandbox

By default SES can only send to *verified* addresses. To send real verification/reset/reminder emails:

1. SES console (`ap-south-1`) → **Verified identities** → **Create identity** → Domain → your domain.
2. Add the DKIM CNAME records SES gives you to your DNS.
3. SES console → **Account dashboard** → **Request production access**. Describe the use case: transactional emails (email verification, password reset, DPDP parental consent) with one-click unsubscribe for reminders. Usually approved within a day.
4. Once approved, `SES_FROM_EMAIL` in the backend `.env` starts actually sending instead of just logging (see `backend/src/shared/email.ts`).

## 10. CI/CD (GitHub Actions)

`.github/workflows/deploy.yml` at the repo root:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Build frontend
        working-directory: prep_ncert/frontend
        run: |
          npm ci
          npm run build
      - name: Deploy
        env:
          SSH_KEY: ${{ secrets.LIGHTSAIL_SSH_KEY }}
          HOST: ${{ secrets.LIGHTSAIL_HOST }}
        run: |
          mkdir -p ~/.ssh && echo "$SSH_KEY" > ~/.ssh/deploy_key && chmod 600 ~/.ssh/deploy_key
          ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no ubuntu@$HOST '
            cd /var/www/prep-ncert && git pull &&
            cd prep_ncert/backend && npm ci && npm run build && npm run prisma:deploy &&
            cd ../frontend && npm ci && npm run build &&
            pm2 restart prep-ncert-api
          '
```

Add `LIGHTSAIL_SSH_KEY` (the private key contents) and `LIGHTSAIL_HOST` (the static IP or domain) as repo secrets. `prisma migrate deploy` (not `dev`) is the non-interactive form meant for CI — it applies pending migrations without prompting.

## 11. Monitoring and backups

- **RDS**: automated backups are already on from step 3; also enable **Enhanced Monitoring** and a CloudWatch alarm on `FreeStorageSpace` and `CPUUtilization`.
- **PM2**: `pm2 logs prep-ncert-api` for live logs; `pm2 monit` for a quick resource view. For anything more than that, ship logs to CloudWatch Logs with the `pm2-logrotate` module plus the CloudWatch agent, or add a hosted error tracker (Sentry) to the Express app — a few lines, worth adding before real traffic.
- **Lightsail**: console has basic CPU/network graphs built in; set a billing alarm regardless of credits, so you notice if something runs away.
- **Uptime**: a simple external check (UptimeRobot, free tier) against `https://your-domain.com/api/health` catches the server or database being down before users report it.

## 12. Security checklist before going live

- [ ] RDS **not** publicly accessible except the one locked-down security group rule (or VPC peering) from step 3
- [ ] `.env` files are `chmod 600`, never committed (already gitignored)
- [ ] `SESSION_SECRET` is a real random value, not the placeholder
- [ ] SES out of sandbox (step 9) or emails silently won't reach real users
- [ ] TLS certificate installed and auto-renewal confirmed (step 7)
- [ ] Google OAuth origin restricted to your real domain(s) only
- [ ] Firewall on the instance only exposes 22/80/443 (Lightsail networking tab)
- [ ] `pm2 startup` configured so the API survives a reboot
- [ ] A non-root IAM user is what you're actually using day to day, with MFA

## What's still Firebase-backed after this deploy

Per the phased plan in `docs/AWS_EC2_MIGRATION_PLAN.md`, this deployment covers auth, profile, progress, XP awarding, leaderboard, doubts and feedback. The video catalogue, chapter notes, and the frontend's XP/leaderboard *display* still read from Firestore until their own migration phase — so you still need Firebase project config (`VITE_FIREBASE_*`) in the frontend `.env` for now, and Firebase Authorized Domains should also include your production domain for those still-Firebase-backed reads to keep working smoothly.
