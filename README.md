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

### Website (`web/`)
Archive boutique UI synced from your Telegram Approves:
```bash
cd web && npm install && npm run sync && npm run dev
```
Open http://localhost:5173 — Jean Vintage / Break Archive energy, fed by `approved.json`.
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

---

## Deploying (run 24/7 from Bangkok)

**Option A — Railway.app** (easiest, ~$5/mo)
- Push this folder to GitHub
- Connect Railway, set env vars, deploy

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

**Option C — Run locally and keep laptop open**
- Fine for testing, not production

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
