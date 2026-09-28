# feling. Sourcing Agent

A Telegram bot that monitors Grailed (**US / Asia / Europe**), Vestiaire, Yahoo Japan, and Yahoo Taiwan
for archive Cavalli, Dior, Chanel, and Versace pieces — multi-region sourcing for sharper prices.
When a match is found, it sends you a photo + details on Telegram. You tap Approve or Skip.

---

## Setup (5 minutes)

### 1. Create your Telegram bot
- Open Telegram, search `@BotFather`
- Send `/newbot` and follow the prompts
- Copy the token it gives you

### 2. Get your Telegram chat ID
- Message `@userinfobot` on Telegram
- It replies with your chat ID (a number like `123456789`)

### 3. Configure
```bash
cp .env.example .env
# Edit .env and paste your TELEGRAM_TOKEN and TELEGRAM_CHAT_ID
```

### 4. Install and run
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python agent.py
```

The agent starts immediately, runs a scan, then rescans every 30 minutes.

---

## Telegram Commands

| Command | What it does |
|---------|-------------|
| `/start` | Introduction and command list |
| `/scan` | Trigger a manual scan right now |
| `/rules` | Show current sourcing criteria |
| `/pending` | List items awaiting your decision |
| `/approved` | List all items you've approved |
| `/report` | Weekly cost report — re-sources comps, emails + Telegram HTML |
| `/report 14` | Same, but last 14 days |
| `/procurement` | Export newly approved items to Excel now (also runs automatically every Friday) |

### Website (`web/`)
Archive boutique UI synced from your Telegram Approves:
```bash
cd web && npm install && npm run sync && npm run dev
```
Open http://localhost:5173 — Jean Vintage / Break Archive energy, fed by `approved.json`.

**Important:** approving an item is not the same as it being for sale. An item only
shows up in the public shop once its status is `listed` or `sold` — approving it
just means you've decided to buy it. Everything in between (received → QC →
photographed → priced → listed → sold, plus resale price / sold price / margin) is
tracked on the private, login-gated **`/ops`** and **`/review`** pages — see below.

### Team login (`/ops` and `/review`)
`agent.py` itself serves a small login-gated API (default port `8787`, see
`WEB_PORT` in `.env`) that both the Telegram bot and the web pages call, so
there's one source of truth either way — an approval made on the web shows up
in Telegram too, and vice versa.

**Create a named account per teammate** (accounts live in `team_users.json`,
passwords are bcrypt-hashed, never plaintext):
```bash
python agent.py --add-user
```
Then, with `python agent.py` running (it starts the API automatically) and
`npm run dev` running in `web/` (which proxies `/api/*` to it), sign in at:
- **http://localhost:5173/login**
- **http://localhost:5173/review** — the approve/skip queue (replaces tapping
  through Telegram one at a time; sortable by taste score / heat / price)
- **http://localhost:5173/ops** — the post-purchase tracker described above

Neither page is linked from the public nav. Right now this only works when
both processes are running on the same machine — see "Deploying" below for
making it reachable by teammates who aren't at your desk.
```
REPORT_EMAIL=you@example.com
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
WEEKLY_REPORT_DAY=mon
WEEKLY_REPORT_HOUR=9
```
Each Monday (or your day), the agent re-sources comparable listings on Grailed for your approvals, then builds a cost-first table (Your cost · Market low · Better find · KEEP/SWITCH) and emails it. HTML copies also save under `reports/`.

### Weekly procurement export (Excel)
```
PROCUREMENT_EXPORT_DAY=fri
PROCUREMENT_EXPORT_HOUR=9
```
Every Friday (uses the same `REPORT_EMAIL` / `SMTP_*` above), the agent compiles every item **approved since the last export** into a procurement-ready `.xlsx`: Brand · Item · Platform · Region · Condition · Price · Source Link · Photo · Approved Date, plus blank Order Status / Notes columns to fill in. It's emailed as an attachment and posted to Telegram; a copy always saves under `reports/procurement_newly_approved_*.xlsx` even if email isn't configured. Run it on demand any time with `/procurement`. It only ever includes items not already sent in a previous export — nothing repeats week to week.

---

## How it works

```
Every 30 min
     │
     ▼
[Scan Grailed US/Asia/EU] [Vestiaire] [Yahoo JP] [Yahoo TW]
     │               │               │           │
     └───────────────┴───────────────┴───────────┘
                     │
              Filter by rules
              (brand, price, condition)
                     │
              Deduplicate vs seen_ids.json
                     │
              Send to Telegram with photo
                     │
          ┌──────────┴──────────┐
          │                     │
       Approve                Skip
          │                     │
   Log to approved.json    Remove from pending
   Show purchase link
```

---

## Customising sourcing rules

Edit the `RULES` list in `agent.py`:

```python
{
    "brand":      "Roberto Cavalli",
    "keywords":   ["cavalli"],        # what to search for
    "max_price":  600,                # USD ceiling
    "min_price":  40,                 # USD floor
    "conditions": ["Very Good", "Excellent", "gently_used", "A", "B"],
    "era":        ["90s", "2000s"],   # for title matching (future use)
},
```

Add as many rules as you want — one per brand or sub-category.

---

## Data files (auto-created)

| File | Contents |
|------|----------|
| `seen_ids.json` | All listing IDs ever seen (prevents duplicates) |
| `pending.json` | Items sent to Telegram, awaiting decision |
| `approved.json` | Items you approved, with timestamp |
| `inventory_status.json` | Post-purchase tracker (received/QC/listed/sold, resale + sold price, notes) — written by the `/ops` page |

---

## Deploying (run 24/7 from Bangkok)

The agent (`agent.py`) and the storefront (`web/`) deploy to **two different
places**, because `agent.py` is a long-lived process (Telegram polling +
cron jobs + the team API) and Vercel only runs static sites / short-lived
functions — it cannot host `agent.py` itself.

### Backend — `agent.py` → Railway (or any always-on host)

**Option A — Railway.app** (easiest, ~$5/mo)
- Push this repo to GitHub, connect Railway to it
- Railway auto-detects it as a Python app via `requirements.txt` + `Procfile`
  (`web: python agent.py`) and injects a `PORT` env var — `agent.py` already
  binds to it (see `WEB_PORT` in the config)
- In the Railway dashboard, set every variable from `.env.example` (your real
  `TELEGRAM_TOKEN`, `SMTP_PASSWORD`, etc. — never commit `.env` itself)
- Once deployed, copy the public URL Railway gives you (e.g.
  `https://feling-agent-production.up.railway.app`) — you'll need it for the
  Vercel rewrite below

**Option B — DigitalOcean Droplet** ($6/mo)
```bash
# On the server:
git clone your-repo
cd feling_agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && nano .env
nohup python agent.py &
```
Put this behind a reverse proxy (Caddy/nginx) with a real domain + HTTPS if
you want the same "one clean URL to point Vercel at" setup Railway gives you
for free.

**Option C — Run locally and keep laptop open**
- Fine for testing, not production. This is what's running right now — the
  team pages only work while your laptop does.

### Frontend — `web/` → Vercel (project: **feling**, `feling.vercel.app`)

This repo is already linked (`.vercel/project.json`). Once the backend above
has a public URL:
1. Add it to `vercel.json`'s `rewrites`, **before** the catch-all SPA rewrite:
   ```json
   "rewrites": [
     { "source": "/api/:path*", "destination": "https://YOUR-BACKEND-URL/api/:path*" },
     { "source": "/(.*)", "destination": "/index.html" }
   ]
   ```
   This makes Vercel transparently proxy `/api/*` to the backend, so from the
   browser it's still same-origin — the session cookie from `/login` works
   exactly like it does locally through the Vite dev proxy, no CORS needed.
2. `vercel --prod` (or push to whatever branch Vercel auto-deploys).

**Known limitation:** the shop's product list (`catalog.json`) is baked in at
*build* time via `npm run sync` (now wired into `vercel.json`'s build step),
not fetched live. So a Vercel deploy only reflects `approved.json` /
`inventory_status.json` as of that git commit — marking something "listed" on
`/ops` won't show up on the live shop until the next deploy. Fine for now;
worth switching the shop to fetch the catalog from the backend at runtime
(like `/ops` and `/review` already do) once this is worth the effort.

---

## Notes on scraping

- Requests use browser TLS impersonation (`curl_cffi`) because plain HTTP clients get blocked
- Grailed is queried through its public Algolia search index
- Vestiaire discovery uses public product sitemaps + product-page schema data
- Buyee is often behind a WAF challenge; if it is blocked the bot skips it and keeps scanning the other sources
- Scan interval of 30 min is polite — do not set below 15 min

## Adding more platforms

Add a new `scrape_X()` async function following the same pattern as the existing three,
then add it to the `scrapers` list inside `run_sourcing_scan()`.
