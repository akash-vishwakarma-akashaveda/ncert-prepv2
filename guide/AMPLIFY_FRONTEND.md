# Frontend on AWS Amplify Hosting

The repo has `frontend/` (Vite SPA, deployed here) and `backend/` (Express API, deployed on Lightsail — see `AWS_DEPLOYMENT.md`). Amplify builds only `frontend/`, using `amplify.yml` at the repo root.

## 1. Connect the repo

Amplify console → **Create new app** → GitHub → `ncert-prepv2`, branch `main`.

- Tick **"My app is a monorepo"** and enter `frontend` as the root directory. This sets `AMPLIFY_MONOREPO_APP_ROOT=frontend`, which must match `appRoot` in `amplify.yml`.
- Build settings: Amplify detects `amplify.yml` from the repo. Do not paste a different spec in the console; a console spec overrides the file.

## 2. Environment variables

App settings → **Environment variables** (they are read at build time and baked into the JS, so redeploy after changing one):

| Variable | Value |
|---|---|
| `VITE_API_URL` | Backend URL with no `/api` suffix, e.g. `https://api.your-domain.com`. **Required: the build fails without it.** |
| `VITE_GOOGLE_CLIENT_ID` | Same OAuth client id as the backend's `GOOGLE_CLIENT_ID` |
| `VITE_GRIEVANCE_OFFICER_NAME` | Shown in the privacy notice |
| `VITE_GRIEVANCE_EMAIL` | Shown in the privacy notice |

## 3. SPA rewrite (otherwise refreshing `/app/...` gives a 404)

Hosting → **Rewrites and redirects** → Manage → JSON editor:

```json
[
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|xml|webmanifest|pdf)$)([^.]+$)/>",
    "target": "/index.html",
    "status": "200",
    "condition": null
  }
]
```

## 4. Domains — needed for login to work

The session cookie is `SameSite=Lax`. Browsers only send it when the app and the API are on the **same site** (same registrable domain). With the app on `*.amplifyapp.com` and the API elsewhere, the build works but sign-in does not stick.

Use one domain for both:

- Amplify → **Custom domains** → `your-domain.com` (and/or `app.your-domain.com`).
- Lightsail API → `api.your-domain.com` (DNS A record to the static IP, TLS via certbot, see `AWS_DEPLOYMENT.md` §7).
- Backend `.env`: `FRONTEND_ORIGIN=https://your-domain.com` (exact origin, used for CORS and email links), then `pm2 restart prep-ncert-api`.
- Amplify: `VITE_API_URL=https://api.your-domain.com`, then redeploy.
- Google Cloud Console → OAuth client → Authorized JavaScript origins → add the Amplify domain.

## 5. Check after the first deploy

- The site loads and a deep link such as `/app/subjects`, opened in a new tab, does not 404.
- Sign in, refresh: you are still signed in (if not, see §4).
- Browser DevTools → Network: API calls go to `VITE_API_URL` and return 200, with no CORS errors.

## Why builds failed before

- Spec at the repo root without `appRoot`: Amplify ran `npm ci` where there is no `package.json`.
- `npm test` in the build: `test/sync.test.mjs` needs `scripts/google-apps-script-sync.js`, which is not in the repo.
- `VITE_API_URL` not set: `vite.config.ts` stops production builds without it, on purpose.
