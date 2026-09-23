# Deploying to AWS — From Scratch

This assumes you have never used AWS before. Every step says exactly what to click. If a term is unfamiliar, check the glossary below first — it's short.

**What you're building:** right now, `npm run dev` only runs on your own laptop — nobody else can reach it. By the end of this guide, your app will run on a small computer that AWS rents you (always on, reachable by anyone), talking to a database AWS also manages for you (with automatic backups). That's it — two AWS pieces, plus a domain name if you want `yoursite.com` instead of an IP address.

---

## Glossary (read once)

| Term | What it actually means |
|---|---|
| **AWS account** | Like a Google account, but for renting computers. One email + one credit card. |
| **Root user** | The account owner — has god-mode access. You create it when you sign up, then almost never use it again (see Phase 1). |
| **IAM user** | A second login under your AWS account with limited-but-sufficient power, that you use for everyday work instead of root. Like not using `sudo` for every command. |
| **Region** | Which physical AWS data center your stuff lives in. We use `ap-south-1` (Mumbai) — closest to Indian users, and required for the DPDP data-residency rule this app follows. |
| **Lightsail** | AWS's "simple mode" for renting a virtual computer. Flat monthly price, simple dashboard, has a **browser-based terminal** — you never need to install SSH software. This is what we'll use for your server. |
| **RDS** | AWS's managed database service. You get a PostgreSQL database without having to install or maintain Postgres yourself — AWS patches it, backs it up daily. |
| **Instance** | AWS's word for "a virtual computer." |
| **Security group / firewall** | A list of rules like "allow connections on port 443 from anywhere." Every AWS resource that talks over the network has one. |
| **SSH** | How you type commands into a remote computer. Lightsail gives you this in your browser — no extra software. |
| **Domain name** | `yoursite.com`. Optional — you can launch on a raw IP address first and add this later. |

---

## Phase 0 — Create your AWS account (15 min)

1. Go to **aws.amazon.com** → **Create an AWS Account** (top right).
2. Enter your email and choose an account name (e.g. "NCERT Prep").
3. Set a strong root password — save it in a password manager, you'll rarely type it again after Phase 1.
4. Enter contact details, then a **payment method** (a card is required even though you have credits — AWS just needs one on file; credits are deducted first before the card is ever charged).
5. Verify your phone number (AWS calls or texts you a code).
6. Choose the **Basic support plan** (free) — skip the paid tiers.
7. You'll land on the AWS Console home page (`console.aws.amazon.com`). This is the website you'll live in for the rest of this guide.

**If you already have AWS credits** (e.g. from a startup program): Console → search bar at top → type **"Billing"** → open **Billing and Cost Management** → **Credits** in the left sidebar. Confirm they're listed and note the expiry date.

---

## Phase 1 — Lock down your account (10 min, don't skip)

Doing this now avoids two common beginner mistakes: losing access if the root password leaks, and an unnoticed bill.

### 1.1 Turn on MFA (multi-factor auth) for root
1. Console top-right → click your account name → **Security credentials**.
2. Under **Multi-factor authentication (MFA)** → **Assign MFA device**.
3. Choose **Authenticator app** — use Google Authenticator, Authy, or any phone app that scans QR codes.
4. Scan the QR code shown, enter two consecutive codes it generates, confirm.

### 1.2 Create your everyday IAM user
Never use root for daily work — if its credentials ever leak, the blast radius is your entire account.
1. Console search bar → **IAM** → open it.
2. Left sidebar → **Users** → **Create user**.
3. Username: your name or `admin`. Check **Provide user access to the AWS Management Console**.
4. Choose **I want to create an IAM user** → set a password.
5. Next → **Attach policies directly** → search and check **AdministratorAccess** → Next → **Create user**.
6. You'll get a **console sign-in URL** like `123456789012.signin.aws.amazon.com/console` — save it. **Sign out of root, sign back in with this URL and your new IAM user from now on.**
7. Turn on MFA for this IAM user too (same steps as 1.1, but from **IAM → Users → your user → Security credentials**).

### 1.3 Set a budget alert
Even with credits, this catches anything that runs away unexpectedly.
1. Console search bar → **Billing** → left sidebar → **Budgets** → **Create budget**.
2. Choose **Zero spend budget** if you want an alert the moment any real (non-credit) charge appears, or a **Monthly cost budget** with a dollar figure (e.g. $20) if you'd rather be notified only past a threshold.
3. Enter your email for alerts → **Create budget**.

**Region check:** top-right of the console, next to your account name, there's a region dropdown (e.g. "N. Virginia"). Click it and switch to **Asia Pacific (Mumbai) ap-south-1**. Do this every time you open the console for this project — AWS remembers per-browser-tab, and resources created in one region are invisible in another.

---

## Phase 2 — Create the database (RDS PostgreSQL)

1. Console search bar → **RDS** → **Create database**.
2. **Choose a database creation method**: Standard create.
3. **Engine type**: PostgreSQL. Version: leave the default (latest 16.x or newer).
4. **Templates**: pick **Free tier** if this account is under 12 months old (check under Billing if unsure); otherwise pick **Dev/Test**.
5. **DB instance identifier**: `prep-ncert-db`.
6. **Master username**: `ncertadmin` (avoid the word "admin" alone — some AWS regions reserve it).
7. **Master password**: click **Auto generate a password**, then after creation go to the database's **Configuration** tab to retrieve it — or set your own and save it immediately in a password manager. You will need this exact value later.
8. **Instance configuration**: `db.t3.micro` (or whatever the Free Tier template already selected).
9. **Storage**: leave defaults (20 GiB, gp3).
10. **Connectivity**:
    - Compute resource: **Don't connect to an EC2 compute resource**.
    - VPC: leave default.
    - **Public access: Yes** — this is the beginner-friendly choice; we'll immediately lock it down by IP in the next step rather than dealing with VPC peering, which is unnecessary complexity to start.
    - VPC security group: **Create new** → name it `prep-ncert-db-sg`.
11. **Database authentication**: Password authentication (default).
12. Expand **Additional configuration** → **Initial database name**: `prep_ncert`.
13. Leave **Enable automated backups** checked (it is by default) — this is your safety net if anything ever goes wrong.
14. **Create database**. It takes 5–10 minutes to become "Available" — get a coffee.

### 2.1 Lock the database firewall down
Once it says "Available":
1. Click into your database → **Connectivity & security** tab → click the security group link (`prep-ncert-db-sg`).
2. **Inbound rules** tab → **Edit inbound rules** → **Add rule**.
3. Type: **PostgreSQL** (auto-fills port 5432). Source: for now, choose **My IP** (auto-fills your current IP) so you can connect and test from your own laptop. **Save rules**.
4. Once your Lightsail instance exists (Phase 3), you'll come back here and add a second rule allowing that instance's IP instead — that's the only address that needs to reach this database in production.

### 2.2 Note the endpoint
Still on the **Connectivity & security** tab, copy the **Endpoint** (looks like `prep-ncert-db.c9akciq32.ap-south-1.rds.amazonaws.com`). You'll build your `DATABASE_URL` from this:

```
postgres://ncertadmin:<your-password>@<endpoint>:5432/prep_ncert
```

---

## Phase 3 — Create your server (Lightsail)

1. Console search bar → **Lightsail**.
2. **Create instance**.
3. **Instance location**: confirm it says Mumbai (ap-south-1) — change if not.
4. **Pick your instance image**: Linux/Unix → **OS Only** → **Ubuntu 24.04 LTS**.
5. Scroll past "Launch scripts" (leave blank) and "SSH key pair" (leave default — Lightsail's browser terminal doesn't need this).
6. **Choose your instance plan**: the $10–12/month plan (2 GB RAM) is comfortable for a launch. You have credits, so don't undersize this to save pennies.
7. Name it `ncert-prep-prod`.
8. **Create instance**. It boots in about a minute.

### 3.1 Give it a fixed IP address
Without this, the IP changes every time the instance restarts.
1. Lightsail dashboard → **Networking** tab → **Create static IP**.
2. Attach it to `ncert-prep-prod`. Name it, create it.
3. Note this IP address — this is your server's permanent address on the internet.

### 3.2 Open the firewall for a website
1. Click into your instance → **Networking** tab → **IPv4 Firewall**.
2. You should see rules for **SSH (22)** already. Add two more with **Add rule**: **HTTP (80)** and **HTTPS (443)**.
3. Leave everything else closed — nothing else needs to be reachable from the internet.

### 3.3 Connect to your instance
1. Lightsail dashboard → click your instance → **Connect** tab → **Connect using SSH** (a big orange button). This opens a terminal *in your browser* — nothing to install.
2. You're now typing commands directly on your AWS server.

### 3.4 Now go back and finish Phase 2.1
With the static IP from 3.1 in hand, go back to RDS → your database's security group → add a second inbound rule: PostgreSQL, source = your Lightsail static IP (as `<ip>/32`). You can remove the "My IP" rule from earlier once this one's in place, if you want to stop connecting from your laptop directly.

---

## Phase 4 — Install software on the server

In the browser SSH terminal from 3.3, paste these one at a time (right-click to paste in most browsers):

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo npm install -g pm2
node --version
```

The last command should print something like `v22.x.x` — confirms Node is installed correctly.

---

## Phase 5 — Get your code onto the server

Your code needs to be on GitHub first (Lightsail pulls from there, it can't see your laptop).

**On your own laptop**, if this repo isn't pushed to GitHub yet:
```bash
cd D:\Ncert-prep-app
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```
(Create the empty repo on github.com first if you haven't — **New repository**, don't initialize with a README.)

**Back in the Lightsail browser terminal:**
```bash
sudo mkdir -p /var/www/prep-ncert
sudo chown ubuntu:ubuntu /var/www/prep-ncert
cd /var/www/prep-ncert
git clone https://github.com/<your-username>/<repo-name>.git .
```

If the repo is private, GitHub will ask for credentials — use a [Personal Access Token](https://github.com/settings/tokens) as the password (GitHub stopped accepting real passwords for git operations).

---

## Phase 6 — Configure and start the backend

```bash
cd /var/www/prep-ncert/prep_ncert/backend
npm ci
```

Create the environment file:
```bash
nano .env
```
Paste this (edit the placeholders — `<rds-password>` and `<rds-endpoint>` from Phase 2, `<static-ip>` from Phase 3.1, and generate `SESSION_SECRET` with the command below it):
```
DATABASE_URL=postgres://ncertadmin:<rds-password>@<rds-endpoint>:5432/prep_ncert
PORT=4000
FRONTEND_ORIGIN=http://<static-ip>
GOOGLE_CLIENT_ID=
SESSION_SECRET=
SES_FROM_EMAIL=
AWS_REGION=ap-south-1
```
Save and exit `nano`: `Ctrl+O`, `Enter`, `Ctrl+X`.

Generate a real session secret and drop it in:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output, run `nano .env` again, paste it after `SESSION_SECRET=`, save.

Now build the schema and start the server:
```bash
npm run prisma:deploy
npm run build
pm2 start dist/index.js --name prep-ncert-api
pm2 save
pm2 startup
```
That last command prints one more command starting with `sudo env PATH=...` — copy and run exactly that line. It makes PM2 restart your server automatically if the instance ever reboots.

**Check it's alive:**
```bash
curl http://localhost:4000/api/health
```
Should print `{"ok":true,"dbTime":"..."}`.

---

## Phase 7 — Build and serve the frontend

```bash
cd /var/www/prep-ncert/prep_ncert/frontend
npm ci
cp .env.example .env
nano .env
```
Set at minimum:
```
VITE_API_URL=http://<static-ip>/api
```
(The Firebase keys are still needed for now — video catalogue and a few other features are still Firebase-backed until their own migration phase; copy those values from your local `.env`.)

```bash
npm run build
```
This creates `prep_ncert/frontend/dist/` — the static website files.

### 7.1 Point Nginx at both
```bash
sudo nano /etc/nginx/sites-available/prep-ncert
```
Paste:
```nginx
server {
    listen 80;
    server_name <static-ip>;

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

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/prep-ncert /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```
`nginx -t` should print "syntax is ok" / "test is successful" — if it errors, re-check the file for a typo before reloading.

**Visit `http://<static-ip>` in your browser.** Your app should load — this is the real milestone. Everything after this point is polish (a real domain name, HTTPS, email).

---

## Phase 8 — A real domain name and HTTPS (optional, do this when ready)

1. Buy a domain anywhere (Namecheap, GoDaddy, or Route 53 inside AWS itself — Console search → **Route 53** → **Register domain**).
2. At your domain registrar's DNS settings, add an **A record**: host `@` (and another for `www`) pointing to your Lightsail static IP.
3. Wait for DNS to propagate (`ping yourdomain.com` from your laptop — once it resolves to your IP, you're ready). Can take a few minutes to a few hours.
4. Back in the Lightsail SSH terminal:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Follow the prompts (enter your email, agree to terms). Certbot edits your Nginx config automatically and sets up auto-renewal.

5. Update `FRONTEND_ORIGIN` in the backend's `.env` and `VITE_API_URL` in the frontend's `.env` to use `https://yourdomain.com` instead of the raw IP, then re-run `npm run build` (frontend) and `pm2 restart prep-ncert-api` (backend).

---

## Phase 9 — Google sign-in on production

Google Cloud Console → [Credentials](https://console.cloud.google.com/apis/credentials) → your OAuth client → **Authorized JavaScript origins** → add `http://<static-ip>` (or `https://yourdomain.com` once you have one). Takes a few minutes to apply, no redeploy needed.

---

## Phase 10 — Real email (optional — the app works fine without this at first)

Without this, verification/reset/consent emails just get logged on the server instead of sent (harmless for early testing, not fine for real users). See `guide/AWS_DEPLOYMENT.md` §9 for the full SES domain-verification walkthrough once you have a domain from Phase 8.

---

## Everyday commands you'll use again

| Task | Command |
|---|---|
| See backend logs | `pm2 logs prep-ncert-api` |
| Restart backend after a code change | `cd /var/www/prep-ncert && git pull && cd prep_ncert/backend && npm ci && npm run build && pm2 restart prep-ncert-api` |
| Rebuild frontend after a code change | `cd /var/www/prep-ncert/prep_ncert/frontend && git pull && npm ci && npm run build` |
| Check the server is up | `curl http://localhost:4000/api/health` |
| Open a database GUI | From your laptop (not the server): `cd prep_ncert/backend`, set `DATABASE_URL` in `.env` to the RDS endpoint, `npm run prisma:studio` |

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Browser can't reach `http://<static-ip>` at all | Firewall rules from 3.2 — check ports 80/443 are open |
| Site loads but API calls fail | `VITE_API_URL` in the frontend `.env` doesn't match, or you forgot to rebuild (`npm run build`) after changing it |
| Backend won't start, mentions `DATABASE_URL` | Check the password/endpoint in `backend/.env`, and that the RDS security group (2.1) allows the Lightsail static IP |
| `nginx -t` fails | Typo in `/etc/nginx/sites-available/prep-ncert` — re-check braces and semicolons |
| Google sign-in: "no registered origin" | You skipped Phase 9, or the origin doesn't exactly match (`http` vs `https`, trailing slash) |
| Emails not arriving | Expected until Phase 10 — check `pm2 logs prep-ncert-api` for the logged email content instead |

---

## What this costs

With Lightsail's $10–12/month plan + a `db.t3.micro` RDS instance (~$15/month) + trivial data transfer, expect roughly **$25–30/month** before any credits are applied — check the exact current numbers in Billing → **Budgets** (Phase 1.3) so you're never surprised. This is well within typical credit grants for a year or more at low-to-moderate traffic.
