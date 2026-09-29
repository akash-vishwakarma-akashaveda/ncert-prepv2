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
| **S3** | AWS's file storage service — buckets holding files (PDFs, images) that get their own web link. Used here for note attachments. |
| **SES** | AWS's email-sending service. Starts in a restricted "sandbox" mode until you request production access. |
| **IAM policy / access key** | A policy is a list of exactly what an identity is allowed to do (e.g. "upload to this one S3 bucket"). An access key is the username/password-like credential a *program* (not a person) uses to prove it holds that policy. |

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
VITE_API_URL=http://<static-ip>
```
No `/api` suffix — every call in the frontend already includes `/api/...` in its path (see `services/api/client.ts`), so adding it here doubles it into `/api/api/...` and every request 404s.

Copy every other value straight from your local `frontend/.env` — the real Firebase keys included. Leaving them as the `.env.example` placeholders builds successfully (the production guard only checks the key is *present*, not valid) but silently breaks the video catalogue and everything else still Firebase-backed, since Firebase will reject the fake key at runtime instead of at build time.

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
        # Security headers for the site pages (the API sets its own via helmet).
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "DENY" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
        # Report-only until the browser console shows no violations on every page, then rename to Content-Security-Policy.
        # Replace YOUR-BUCKET with S3_NOTES_BUCKET.
        add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self' https://accounts.google.com https://www.youtube.com; frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://accounts.google.com; img-src 'self' data: blob: https://i.ytimg.com https://lh3.googleusercontent.com https://YOUR-BUCKET.s3.ap-south-1.amazonaws.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' wss://yourdomain.com https://YOUR-BUCKET.s3.ap-south-1.amazonaws.com https://accounts.google.com https://www.googleapis.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" always;
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

## Phase 10 — S3 for note attachments (optional — only needed for the admin "upload a PDF/image" feature)

Everything else in the app works without this. This is the one feature that needs real file storage instead of just a database row.

### 10.1 Create the bucket
1. Console search bar → **S3** → **Create bucket**.
2. **Bucket name**: must be globally unique across *all* of AWS, not just your account — e.g. `ncert-prep-notes-<something-random>`. Note it down exactly; you'll need it twice more below.
3. **AWS Region**: `ap-south-1`.
4. **Object Ownership**: leave **ACLs disabled (recommended)** — we'll grant public read through a bucket policy instead, which is the modern, more precise way to do it.
5. **Block Public Access settings**: **uncheck** "Block all public access". This doesn't make the bucket public by itself — the policy in the next step decides exactly what's public (just the `notes/` folder), this toggle just stops AWS from refusing that policy.
6. Leave everything else default → **Create bucket**.

### 10.2 Allow public read on just the notes folder
1. Click into your new bucket → **Permissions** tab → scroll to **Bucket policy** → **Edit**.
2. Paste this, replacing `YOUR-BUCKET-NAME` with your actual bucket name:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadNotes",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/notes/*"
    }
  ]
}
```
3. **Save changes.** Only files under `notes/` are readable by anyone with the link (matching how the note attachments worked before) — nothing else in the bucket is exposed.

### 10.3 Allow the browser to upload (CORS)
The admin's browser uploads files straight to S3 (a pre-signed PUT), so the bucket must accept requests from the site's origin — without this every upload fails with a bare "Upload failed".
1. Same bucket → **Permissions** tab → **Cross-origin resource sharing (CORS)** → **Edit**.
2. Paste this (use your real site origin):
```json
[
  {
    "AllowedOrigins": ["https://ncert-prep.akashaveda.com"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```
3. **Save changes.**

---

## Phase 11 — Amazon SES for real email (optional — without this, emails just get logged instead of sent)

Verification links, password resets, and DPDP parental-consent emails currently just print to the server log (`pm2 logs`) instead of actually sending. Fine for early testing, not fine for real users. Needs the domain from Phase 8.

1. Console search bar → **SES** (Simple Email Service) → confirm the region selector (top right) says **ap-south-1**.
2. Left sidebar → **Verified identities** → **Create identity**.
3. Choose **Domain**, enter your domain (e.g. `akashaveda.com`, or a subdomain like `mail.akashaveda.com` if you'd rather keep it separate) → **Create identity**.
4. AWS shows you 3 **DKIM CNAME records**. Add all 3 at your DNS provider (the same place you added the `A` record in Phase 8). Verification usually completes within a few minutes, sometimes up to a day.
5. Once the identity shows **Verified**, SES can send — but only in the **sandbox**, which limits you to sending *to* addresses you've also verified. To send to real students, you need to leave the sandbox:
   - Left sidebar → **Account dashboard** → **Request production access**.
   - Mail type: **Transactional**. Website URL: your domain. Use case description: *"Transactional emails for an education platform — email verification, password reset, and DPDP parental-consent requests, with one-click unsubscribe on reminder emails."*
   - Submit. Usually approved within a day; you'll get an email.
6. While waiting (or for quick testing), you can verify your own personal email as a recipient: **Verified identities** → **Create identity** → **Email address** → check your inbox for the confirmation link.

---

## Phase 12 — One IAM user for S3 and SES

Lightsail instances don't get the automatic AWS permissions ("IAM roles") that EC2 instances can — so the app needs a real access key and secret to call S3 and SES. This creates one, scoped to only what it needs.

1. Console search bar → **IAM** → **Users** → **Create user**.
2. Name it `ncert-prep-app`. Do **not** check "Provide user access to the AWS Management Console" — this user is for the app to use programmatically, not for a person to log in with.
3. **Attach policies directly** → **Create policy** (opens in a new tab).
4. Switch to the **JSON** tab and paste (replace `YOUR-BUCKET-NAME` with the bucket from Phase 10):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "NotesBucketAccess",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/notes/*"
    },
    {
      "Sid": "SendEmail",
      "Effect": "Allow",
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    }
  ]
}
```
5. Name the policy `ncert-prep-s3-ses` → **Create policy**. Back in the user-creation tab, refresh the policy list, check the new policy, and finish creating the user.
6. Click into the new user → **Security credentials** tab → **Create access key** → choose **Application running outside AWS** → **Create access key**.
7. Copy both the **Access key ID** and **Secret access key** immediately — the secret is shown exactly once.

### 12.1 Wire it into the backend
On the Lightsail instance:
```bash
cd /var/www/prep-ncert/prep_ncert/backend
nano .env
```
Add:
```
S3_NOTES_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=paste-the-access-key-id
AWS_SECRET_ACCESS_KEY=paste-the-secret-access-key
SES_FROM_EMAIL=NCERT Prep <noreply@yourdomain.com>
```
(`AWS_REGION=ap-south-1` should already be there from Phase 6.) Save, then:
```bash
pm2 restart prep-ncert-api
```
Note uploads and real emails both start working the moment this is set — no rebuild needed, since these are read at runtime, not build time.

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
| Emails not arriving | Expected until Phase 11 is fully done (domain verified *and* out of the SES sandbox) — check `pm2 logs prep-ncert-api` for the logged email content instead |
| Note upload fails with "File storage is not configured yet" | `S3_NOTES_BUCKET` isn't set in `backend/.env` yet — finish Phase 10 and 12 |
| Note upload fails with just "Upload failed" (no status code) | The bucket's CORS rule (10.3) is missing or its origin doesn't exactly match the site URL |
| Note upload fails with `403 Forbidden` from S3 | The IAM user's policy (Phase 12) doesn't match your actual bucket name, or the access key in `.env` is wrong/truncated |
| Uploaded note file gives `403` when a student opens it | The bucket policy (10.2) has the wrong bucket name, or the file wasn't uploaded under the `notes/` prefix |
| SES: "Email address is not verified" | You're still in the SES sandbox (5) and haven't verified that specific recipient, or production access hasn't been approved yet |

---

## What this costs

With Lightsail's $10–12/month plan + a `db.t3.micro` RDS instance (~$15/month) + trivial data transfer, expect roughly **$25–30/month** before any credits are applied. S3 and SES are both pay-per-use and effectively free at this app's scale (a few cents/month for storage, $0.10 per 1,000 emails) — check the exact current numbers in Billing → **Budgets** (Phase 1.3) so you're never surprised. This is well within typical credit grants for a year or more at low-to-moderate traffic.

**No other AWS services are needed** for anything currently built. Two you might add later, not required now: **CloudWatch** alarms (email you if the server or database has a problem) and **Route 53** (only useful if you want AWS itself to manage your domain's DNS instead of your current registrar).
