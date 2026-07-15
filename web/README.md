# feling. web

Archive boutique front-end for the sourcing agent — Jean Vintage / Break Archive energy,
Y2K Galliano · Chanel · Dior · Cavalli · Gaultier.

## Run
```bash
cd web
npm install
npm run sync    # refresh catalog from ../approved.json
npm run dev     # http://localhost:5173
```

Approvals from Telegram (`approved.json`) become the shop catalog via `npm run sync`.
Product “Buy” links open the sourced Grailed / Vestiaire / Buyee listing.
