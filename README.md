# AAICOREFX — Trading Journal

A multi-account, multi-user trading journal (dashboard, trade log, analytics,
calendar, psychology, insights, news, rules) with login/sign-up.

Each account that signs up gets its own private journal data. Auth and data
are both stored client-side (see "Security note" below).

## Run it locally

You'll need [Node.js](https://nodejs.org) installed (v18+).

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

## Put it on the internet (free, no server needed)

### Option A — Vercel (easiest)
1. Go to [vercel.com](https://vercel.com) and sign up (free).
2. Click **Add New → Project**.
3. Either:
   - Drag-and-drop this whole folder onto the import screen, or
   - Push this folder to a GitHub repo and import that repo.
4. Vercel auto-detects Vite. Leave settings as default and click **Deploy**.
5. You'll get a live URL like `your-project.vercel.app`.

### Option B — Netlify
1. Run `npm install && npm run build` locally — this creates a `dist/` folder.
2. Go to [netlify.com](https://netlify.com), sign up (free).
3. Drag the `dist/` folder onto the "Deploy manually" box on your dashboard.
4. You get a live URL immediately.

### Option C — GitHub Pages
1. Push this folder to a GitHub repo.
2. In `vite.config.js`, add `base: '/your-repo-name/'`.
3. Run `npm run build`, then deploy the `dist/` folder to a `gh-pages` branch
   (the `gh-pages` npm package automates this: `npm i -D gh-pages`, add a
   `"deploy": "gh-pages -d dist"` script, then `npm run build && npm run deploy`).

## Google Sign-In setup

The code supports "Sign in with Google" alongside email/password, but it
needs a Client ID that only you can generate (it's tied to your Google
account/billing, so I can't create one for you):

1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID → Application type: **Web application**
3. Under **Authorized JavaScript origins**, add every URL you'll run this
   from — e.g. `http://localhost:5173` for local dev, and your real domain
   (e.g. `https://aaicorefx.com`) once deployed. Google will reject the
   sign-in if the origin isn't listed here.
4. Copy the Client ID (ends in `.apps.googleusercontent.com`) and paste it
   into `src/AuthPage.jsx`, replacing the `GOOGLE_CLIENT_ID` placeholder
   near the top of the file.
5. Redeploy. The Google button will now render for real instead of showing
   the "not configured" note.

Google-authenticated users are matched/created by email in the same local
user store as password accounts — no separate database needed.

## Live ForexFactory news data

The News page pulls real economic-calendar data from ForexFactory's public
calendar export feed (`nfs.faireconomy.media`) — the same unofficial feed
most trading tools use, since ForexFactory has no official public API and
blocks its calendar page from being embedded directly. A few important
details:

- **It's genuinely live** — the same feed ForexFactory's own indicators use,
  covering last/this/next week (that's the only range it exposes).
- **Rate-limited**: ForexFactory allows roughly 2 requests per 5 minutes for
  this feed, so results are cached in the browser and only refreshed every
  ~12 hours per person, not on every page view.
- **CORS fallback**: if the feed doesn't allow a direct browser request from
  your domain, the code automatically retries through a public CORS proxy
  (`corsproxy.io`). This is a best-effort fallback, not a guaranteed uptime
  service — if both the direct request and the proxy fail, the page falls
  back to its last successfully cached data, and if there's no cache yet,
  to a small bundled sample dataset, so the page never breaks.
- The status pill in the top-right of the News page tells you which of
  these is actually showing: **LIVE FF** (fresh from the feed), **CACHED**,
  or **SAMPLE DATA**.
- The feed only provides forecast/previous values, not "actual" released
  figures — that's a limitation of the feed itself, not this app.

## Notes / limitations

- **Security note (important):** login is client-side only — passwords are
  hashed (SHA-256) before being stored, but there's no real server verifying
  anything. Anyone who opens browser dev tools on your deployed site can read
  the stored (hashed) user list from that browser. This is fine for personally
  gating access to your own tool; it is **not** safe for a public site holding
  data you actually care about protecting. For real security, move auth to a
  backend service like Supabase Auth or Firebase Auth — ask and I can wire it up.
- **Storage is per-browser, per-user.** Each account's journal data lives in
  that visitor's own browser. It won't sync across devices — that also
  requires a real backend/database.
- The **News** page uses sample/mock economic-calendar data, not a live feed.
- Screenshots attached to trades are stored as compressed base64 images in
  the browser's storage, which has a small size limit (~5-10MB total per
  browser). Keeping images small (as the upload warning says) avoids hitting
  that limit.

## Using your own domain (AAICOREFX)

I can't register a domain for you — that requires a registrar and your
payment details. Once you own a domain (e.g. from Namecheap, GoDaddy, Google
Domains, Cloudflare Registrar):

1. Deploy the site (Vercel/Netlify, see above).
2. In your host's dashboard, go to **Domains → Add Domain** and enter yours.
3. The host will show you 1-2 DNS records to add (usually an `A` record or
   a `CNAME`) — add those in your domain registrar's DNS settings.
4. DNS changes can take a few minutes to a few hours to propagate. Once
   live, your site will be reachable at your own domain over HTTPS
   automatically (Vercel/Netlify issue the SSL certificate for you free).
