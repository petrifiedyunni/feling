import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const approvedPath = path.join(root, "approved.json");
const outPath = path.join(__dirname, "../src/data/catalog.json");

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

const seenIds = new Set();
const seenUrls = new Set();
const out = [];

for (const it of [...items].reverse()) {
  if (!it.photo || !it.url) continue;
  const id = listingKey(it);
  const url = canonUrl(it.url);
  if (seenIds.has(id)) continue;
  if (url && seenUrls.has(url)) continue;
  seenIds.add(id);
  if (url) seenUrls.add(url);

  const title = it.title || "Untitled";
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) + `-${it.id}`;

  out.push({
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
  });
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");

const counts = out.reduce((acc, p) => {
  acc[p.category] = (acc[p.category] || 0) + 1;
  return acc;
}, {});
console.log(`Synced ${out.length} products → src/data/catalog.json`, counts);
