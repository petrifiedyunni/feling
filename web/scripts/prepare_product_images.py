#!/usr/bin/env python3
"""Prepare sell-ready single-subject product images for feling.

Uses rembg + vision-style post cleanup:
- kill bright/dark fringe near the exterior only
- hard matte (no soft alpha smudge on cream tiles)
- drop hanger tips that share a row with a wider mass
- keep slim straps (no opening/erode that severs arches)
- tight bounding box crop
"""

from __future__ import annotations

import argparse
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import remove
from skimage.measure import label, regionprops
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "web/src/data/catalog.json"
OUT_DIR = ROOT / "web/public/cutouts"
MAP_PATH = ROOT / "web/src/data/cutouts.json"
MAX_EDGE = 1200

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Referer": "https://www.grailed.com/",
}


def safe_id(pid: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in pid)


def pick_hero_mix(catalog: list[dict], limit: int) -> list[dict]:
    clothes = [p for p in catalog if p["category"] == "ready-to-wear"]
    bags = [p for p in catalog if p["category"] == "bags"]
    shoes = [p for p in catalog if p["category"] == "shoes"]
    mixed: list[dict] = []
    n = max(len(clothes), len(bags), len(shoes), 1)
    for i in range(n):
        if len(mixed) >= limit:
            break
        for bucket in (clothes, bags, shoes):
            if len(mixed) >= limit:
                break
            if i < len(bucket):
                mixed.append(bucket[i])
    return mixed


def download(url: str) -> Image.Image:
    req = Request(url, headers=HEADERS)
    if "vestiaire" in url.lower():
        req.add_header("Referer", "https://www.vestiairecollective.com/")
    raw = urlopen(req, timeout=45).read()
    return Image.open(io.BytesIO(raw)).convert("RGBA")


def _remove_small_components(solid: np.ndarray, min_area: int = 80) -> np.ndarray:
    labeled = label(solid, connectivity=2)
    keep = np.zeros_like(solid, dtype=bool)
    for r in regionprops(labeled):
        if r.area > min_area:
            keep[labeled == r.label] = True
    return keep


def _row_segments(row: np.ndarray) -> list[tuple[int, int]]:
    cols = np.where(row)[0]
    if cols.size == 0:
        return []
    segs: list[tuple[int, int]] = []
    start = int(cols[0])
    prev = start
    for c in cols[1:]:
        c = int(c)
        if c > prev + 1:
            segs.append((start, prev))
            start = c
        prev = c
    segs.append((start, prev))
    return segs


def _trim_hanger_segments(
    solid: np.ndarray,
    max_width: int = 26,
    depth_frac: float = 0.2,
    min_fat: int = 55,
) -> np.ndarray:
    """Drop skinny hangers sharing a row with a much wider mass.

    Skips rows where all segments are similarly slim (arched strap arms).
    """
    labeled = label(solid, connectivity=2)
    props = regionprops(labeled)
    if not props:
        return solid
    main = max(props, key=lambda r: r.area)
    out = labeled == main.label
    my0, _mx0, my1, _mx1 = main.bbox
    limit = my0 + int((my1 - my0) * depth_frac)
    for y in range(my0, limit):
        segs = _row_segments(out[y])
        if len(segs) < 2:
            continue
        widths = [(c0, c1, c1 - c0 + 1) for c0, c1 in segs]
        fat = max(w for *_c, w in widths)
        if fat < min_fat:
            continue
        for c0, c1, w in widths:
            if w <= max_width and w <= int(fat * 0.4):
                out[y, c0 : c1 + 1] = False
    labeled = label(out, connectivity=2)
    props = regionprops(labeled)
    if not props:
        return solid
    return labeled == max(props, key=lambda r: r.area).label


def clean_rgba(cut: Image.Image) -> Image.Image:
    """Vision-style cleanup: hard matte, kill fringe/floaters, tight bbox."""
    from scipy import ndimage as ndi

    arr = np.array(cut)
    rgb = arr[:, :, :3].astype(np.float32)
    alpha = arr[:, :, 3].astype(np.float32)
    lum = rgb.max(axis=2)

    # Bright plate leftovers are always safe. Dark junk only when very soft —
    # aggressive dark-fringe rules eat black leather straps.
    near_empty = ndi.binary_dilation(alpha < 15, iterations=3)
    bright_junk = (alpha > 0) & (alpha < 245) & (lum > 200)
    dark_junk = near_empty & (alpha > 0) & (alpha < 130) & (lum < 75)
    alpha = np.where(bright_junk | dark_junk, 0.0, alpha)

    # No binary_opening — it severs slim straps
    solid = _remove_small_components(alpha >= 85, min_area=80)
    solid = _remove_small_components(
        ndi.distance_transform_edt(solid) >= 1.0, min_area=80
    )
    solid = _trim_hanger_segments(solid)

    # Fill tiny internal bites; leave round grommet-scale holes open
    filled = ndi.binary_fill_holes(solid)
    hole = filled & ~solid
    hl = label(hole, connectivity=1)
    for r in regionprops(hl):
        minr, minc, maxr, maxc = r.bbox
        hh, ww = maxr - minr, maxc - minc
        ratio = min(hh, ww) / max(hh, ww, 1)
        is_grommet = 30 <= r.area <= 500 and ratio >= 0.55
        if r.area < 100 and not is_grommet:
            solid[hl == r.label] = True

    # Hard matte — soft alpha fringe reads as gray smudge on cream shop tiles
    alpha_out = solid.astype(np.uint8) * 255

    out = arr.copy()
    out[:, :, 3] = alpha_out
    out[alpha_out == 0, :3] = 0
    img = Image.fromarray(out, "RGBA")

    bbox = img.getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    pad = 4
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(img.width, r + pad)
    b = min(img.height, b + pad)
    return img.crop((l, t, r, b))


def prepare(im: Image.Image) -> Image.Image:
    w, h = im.size
    scale = min(1.0, MAX_EDGE / max(w, h))
    if scale < 1:
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

    cut = remove(im)
    cut = clean_rgba(cut)

    w, h = cut.size
    if max(w, h) < 640 and max(w, h) > 0:
        boost = 640 / max(w, h)
        cut = cut.resize(
            (max(1, int(w * boost)), max(1, int(h * boost))),
            Image.Resampling.LANCZOS,
        )
        # Lanczos reintroduces soft alpha — snap back to hard matte
        cut = clean_rgba(cut)
    if max(cut.size) > MAX_EDGE:
        s = MAX_EDGE / max(cut.size)
        cut = cut.resize(
            (max(1, int(cut.size[0] * s)), max(1, int(cut.size[1] * s))),
            Image.Resampling.LANCZOS,
        )
        cut = clean_rgba(cut)
    return cut


CUTOUT_CATS = frozenset({"ready-to-wear", "shoes", "bags"})


def pick_apparel(catalog: list[dict], limit: int) -> list[dict]:
    items = [p for p in catalog if p.get("category") in CUTOUT_CATS]
    order = {"bags": 0, "shoes": 1, "ready-to-wear": 2}
    items.sort(key=lambda p: (order.get(str(p.get("category")), 9), p.get("id", "")))
    return items[:limit]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=24)
    parser.add_argument("--ids", type=str, default="")
    parser.add_argument("--force", action="store_true")
    parser.add_argument(
        "--all-mapped",
        action="store_true",
        help="Re-clean every id already in cutouts.json",
    )
    parser.add_argument(
        "--clothing-only",
        action="store_true",
        help="Prepare single-subject cutouts for clothing, shoes, and bags",
    )
    parser.add_argument(
        "--missing",
        action="store_true",
        help="Only prepare ids that do not yet have a cutout file",
    )
    args = parser.parse_args()

    catalog = json.loads(CATALOG.read_text())
    by_id = {p["id"]: p for p in catalog}
    mapping: dict[str, str] = {}
    if MAP_PATH.exists():
        mapping = json.loads(MAP_PATH.read_text())

    if args.ids.strip():
        targets = [by_id[i] for i in args.ids.split(",") if i.strip() in by_id]
    elif args.all_mapped:
        targets = [by_id[i] for i in mapping if i in by_id]
    elif args.clothing_only:
        targets = pick_apparel(catalog, args.limit if not args.missing else 10_000)
    else:
        targets = pick_hero_mix(catalog, args.limit)

    if args.clothing_only:
        targets = [p for p in targets if p.get("category") in CUTOUT_CATS]

    if args.missing:
        filtered = []
        for p in targets:
            dest = OUT_DIR / f"{safe_id(p['id'])}.png"
            if not dest.exists() or dest.stat().st_size < 5000:
                filtered.append(p)
        targets = filtered

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Preparing {len(targets)} images → {OUT_DIR}")

    for p in targets:
        pid = p["id"]
        fname = f"{safe_id(pid)}.png"
        dest = OUT_DIR / fname
        if dest.exists() and dest.stat().st_size > 5000 and not args.force:
            mapping[pid] = f"/cutouts/{fname}"
            print(f"  skip {pid}")
            continue
        try:
            print(f"  prep {pid} ({p.get('category')})")
            cut = prepare(download(p["photo"]))
            cut.save(dest, optimize=True)
            mapping[pid] = f"/cutouts/{fname}"
            print(f"    ok {cut.size}")
        except Exception as e:
            print(f"    fail {e}")

    # Keep map to catalog cutout categories only
    if args.clothing_only:
        keep = {p["id"] for p in catalog if p.get("category") in CUTOUT_CATS}
        mapping = {k: v for k, v in mapping.items() if k in keep}

    MAP_PATH.write_text(json.dumps(mapping, indent=2) + "\n")
    print(f"map → {MAP_PATH} ({len(mapping)} entries)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
