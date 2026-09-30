import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const approvedPath = path.join(root, "approved.json");
const inventoryPath = path.join(root, "inventory_status.json");
const outPath = path.join(__dirname, "../src/data/catalog.json");
const heroOutPath = path.join(__dirname, "../src/data/hero.json");
// Full, uncapped reference for scripts (prepare_product_images.py,
// cutout-drops.py) — NOT imported by any React code, so it never hits the
// client bundle. Those scripts need every approved item with a computed
// category, not just what's currently for-sale or the homepage's 16-item
// sampler, otherwise they wrongly treat "not in the gated shop yet" as
// "doesn't exist" and prune real cutouts out of cutouts.json.
const allApprovedOutPath = path.join(__dirname, "../src/data/all-approved.json");

// Only these statuses are customer-visible in the *shop*; approved/received/
// QC/photographed stay internal until someone marks the piece listed via the
// /ops page. The homepage hero animation is decorative and uses a separate,
// looser feed (see heroPool below) so the site still has visuals to show
// while the team works through the post-purchase pipeline.
const VISIBLE_STATUSES = new Set(["listed", "sold"]);
const HERO_EXCLUDED_STATUSES = new Set(["returned"]);

// Fixed, hand-picked selection for the homepage spill animation — genuinely
// iconic, recognizable archive pieces (not just "a vintage dress"), ordered
// shoes-first then interwoven shoe/bag/clothes so no one category clumps
// together. Deliberately NOT tied to "most recently approved" so this never
// needs regenerating as inventory moves through the pipeline, and never
// breaks if a recent approval doesn't have a cutout yet. Swap ids here (must
// exist in all-approved.json with a matching entry in cutouts.json) whenever
// you want to refresh the look.
const CURATED_HERO_IDS = [
  "Grailed_100819973", // shoe  — Dior by Galliano AW03 "Bondage" pump, the defining Y2K Dior shoe
  "Grailed_100721565", // bag   — Dior by Galliano SS02 large Saddle Bag, the most iconic Dior bag ever made
  "Grailed_95265956",  // dress — John Galliano Newspaper Print dress, one of fashion's most famous archive prints
  "Grailed_99865778",  // shoe  — Dior by Galliano SS05 Crystal Peace logo heels, from the Peace runway collection
  "Grailed_79131981",  // bag   — Dior Columbus Street Chic, Galliano-era signature alongside the Saddle
  "Grailed_77837211",  // dress — Jean Paul Gaultier cone-bra corset, THE Gaultier silhouette (Madonna's cone bra)
  "Grailed_99725477",  // shoe  — Roberto Cavalli Y2K jeweled heels, peak Cavalli maximalism
  "Grailed_105906630", // bag   — Chanel Matelassé Coco Mark, the quilted Chanel classic
  "Grailed_100373443", // dress — Dior J'Adore, Galliano reinterpreting the 1947 New Look
  "Grailed_97963708",  // shoe  — Dior monogram heels by Galliano, the Trotter pattern on footwear
];

const SHOE_RE =
  /(heel|heels|shoe|shoes|mule|mules|pump|pumps|boot|boots|sandal|sandals|stiletto|sneaker|sneakers|loafer|loafers|espadrille|wedge|wedges|ballerin|slingback)/i;
const BAG_RE =
  /(handbag|clutch|purse|tote|cambon|columbus|trotter|crossbody|baguette|boston|shoulder bag|saddle bag|\bsaddle\b|flap bag|\bbag\b)/i;

/** Strip sourcing-lane labels so "Dior Bags & Shoes" doesn't force bags. */
function cleanBrandLabel(brand) {
  return String(brand || "")
    .replace(/\brare bags?\b/gi, " ")
    .replace(/\bbags?\s*&\s*shoes\b/gi, " ")
    .replace(/\b(bags?|shoes?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function categorize(item) {
  const title = String(item.title || "");
  const brand = cleanBrandLabel(item.brand);
  // Title decides first — never let lane names override a heel listing
  if (SHOE_RE.test(title)) return "shoes";
  if (BAG_RE.test(title)) return "bags";
  const hay = `${brand} ${title}`;
  if (SHOE_RE.test(hay)) return "shoes";
  if (BAG_RE.test(hay)) return "bags";
  return "ready-to-wear";
}

function designer(item) {
  const brand = (item.brand || "").trim();
  if (/^slay outfit archive$/i.test(brand)) return "Others";

  const hay = `${brand} ${item.title || ""}`.toLowerCase();
  const map = [
    ["chanel", "Chanel"],
    ["dior", "Dior"],
    ["galliano", "Galliano"],
    ["cavalli", "Roberto Cavalli"],
    ["gaultier", "Jean Paul Gaultier"],
    ["gucci", "Tom Ford Gucci"],
    ["tom ford", "Tom Ford Gucci"],
    ["slay outfit archive", "Others"],
  ];
  for (const [key, name] of map) {
    if (hay.includes(key)) return name;
  }
  return brand || "Others";
}

function displayBrand(item) {
  const brand = (item.brand || "").trim();
  if (/^slay outfit archive$/i.test(brand)) return "Others";
  return brand || "Others";
}

function canonUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return String(url).replace(/\/$/, "").toLowerCase();
  }
}

function listingKey(item) {
  return `${item.platform}_${item.id}`;
}

/** Keep newest approve per listing id and per URL; rewrite approved.json. */
function dedupeApproved(items) {
  const byId = new Map();
  const byUrl = new Map();

  for (const it of items) {
    if (!it || !it.platform || it.id == null) continue;
    const key = listingKey(it);
    const url = canonUrl(it.url);
    const prevId = byId.get(key);
    const newer =
      !prevId ||
      String(it.approved_at || "") >= String(prevId.approved_at || "");
    if (newer) byId.set(key, it);
  }

  const merged = [...byId.values()].sort((a, b) =>
    String(a.approved_at || "").localeCompare(String(b.approved_at || ""))
  );

  const out = [];
  for (const it of merged) {
    const url = canonUrl(it.url);
    if (url && byUrl.has(url)) continue;
    if (url) byUrl.set(url, it);
    out.push(it);
  }
  return out;
}

const raw = JSON.parse(fs.readFileSync(approvedPath, "utf8"));
const items = dedupeApproved(Array.isArray(raw) ? raw : []);
if (items.length !== (Array.isArray(raw) ? raw.length : 0)) {
  fs.writeFileSync(approvedPath, JSON.stringify(items, null, 2) + "\n");
  console.log(
    `Deduped approved.json: ${raw.length} → ${items.length} listings`
  );
}

const inventory = fs.existsSync(inventoryPath)
  ? JSON.parse(fs.readFileSync(inventoryPath, "utf8"))
  : {};

const seenIds = new Set();
const seenUrls = new Set();
const out = [];
const heroPool = [];
let hiddenCount = 0;

for (const it of [...items].reverse()) {
  if (!it.photo || !it.url) continue;
  const id = listingKey(it);
  const url = canonUrl(it.url);
  if (seenIds.has(id)) continue;
  if (url && seenUrls.has(url)) continue;

  seenIds.add(id);
  if (url) seenUrls.add(url);

  const status = inventory[id]?.status || "approved";
  const title = it.title || "Untitled";
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) + `-${it.id}`;

  const product = {
    id,
    slug,
    brand: displayBrand(it),
    designer: designer(it),
    title,
    price: Number(it.price || 0),
    condition: it.condition || "Vintage",
    category: categorize(it),
    photo: it.photo,
    url: it.url,
    platform: it.platform,
    approved_at: it.approved_at,
    era: "Archive",
    status,
    sold: status === "sold",
  };

  if (VISIBLE_STATUSES.has(status)) {
    out.push(product);
  } else {
    hiddenCount += 1;
  }

  // forSale marks whether /piece/:slug actually resolves — decorative hero
  // cards for anything else shouldn't deep-link into a page that 404s.
  if (!HERO_EXCLUDED_STATUSES.has(status)) {
    heroPool.push({ ...product, forSale: VISIBLE_STATUSES.has(status) });
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");

// Fixed curated selection, in CURATED_HERO_IDS order — falls back to
// whatever's actually available if an id is ever removed from approved.json,
// so this can't silently render nothing.
const heroById = new Map(heroPool.map((p) => [p.id, p]));
const hero = CURATED_HERO_IDS.map((id) => heroById.get(id)).filter(Boolean);
if (hero.length < CURATED_HERO_IDS.length) {
  console.log(
    `${CURATED_HERO_IDS.length - hero.length} curated hero id(s) not found in approved.json — check CURATED_HERO_IDS in sync-catalog.mjs`
  );
}
fs.writeFileSync(heroOutPath, JSON.stringify(hero, null, 2) + "\n");

// Same pool, uncapped — see allApprovedOutPath comment above.
const allApproved = [...heroPool].reverse();
fs.writeFileSync(allApprovedOutPath, JSON.stringify(allApproved, null, 2) + "\n");

const counts = out.reduce((acc, p) => {
  acc[p.category] = (acc[p.category] || 0) + 1;
  return acc;
}, {});
console.log(`Synced ${out.length} products → src/data/catalog.json`, counts);
console.log(`Synced ${hero.length} items → src/data/hero.json (homepage visuals)`);
console.log(`Synced ${allApproved.length} items → src/data/all-approved.json (tooling reference)`);
if (hiddenCount) {
  console.log(
    `${hiddenCount} approved item(s) hidden from shop — not yet "listed" in inventory_status.json (see /ops).`
  );
}
