#!/usr/bin/env python3
"""Cut single-subject PNGs for hero spill / shop tiles."""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

from PIL import Image
from rembg import remove
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "web/src/data/catalog.json"
OUT_DIR = ROOT / "web/public/cutouts"
MAP_PATH = ROOT / "web/src/data/cutouts.json"

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


def pick_hero_mix(catalog: list[dict], limit: int = 12) -> list[dict]:
    clothes = [p for p in catalog if p["category"] == "ready-to-wear"]
    bags = [p for p in catalog if p["category"] == "bags"]
    shoes = [p for p in catalog if p["category"] == "shoes"]
    mixed: list[dict] = []
    n = max(len(clothes), len(bags), len(shoes))
    for i in range(n):
        if len(mixed) >= limit:
            break
        if i < len(clothes):
            mixed.append(clothes[i])
        if len(mixed) >= limit:
            break
        if i < len(bags):
            mixed.append(bags[i])
        if len(mixed) >= limit:
            break
        if i < len(shoes):
            mixed.append(shoes[i])
    return mixed


def cut_one(p: dict, mapping: dict[str, str], force: bool = False) -> bool:
    pid = p["id"]
    fname = f"{safe_id(pid)}.png"
    dest = OUT_DIR / fname
    if dest.exists() and dest.stat().st_size > 5000 and not force:
        mapping[pid] = f"/cutouts/{fname}"
        print(f"  skip {pid}")
        return True

    print(f"  cut {pid}")
    req = Request(p["photo"], headers=HEADERS)
    if "vestiaire" in p["photo"].lower():
        req.add_header("Referer", "https://www.vestiairecollective.com/")
    try:
        raw = urlopen(req, timeout=45).read()
    except Exception as e:
        print(f"    download fail: {e}")
        return False

    im = Image.open(io.BytesIO(raw)).convert("RGBA")
    w, h = im.size
    scale = min(1.0, 900 / max(w, h))
    if scale < 1:
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    cut = remove(im)
    if cut.getbbox():
        cut = cut.crop(cut.getbbox())
    cut.save(dest, optimize=True)
    mapping[pid] = f"/cutouts/{fname}"
    print(f"    ok {cut.size}")
    return True


def main() -> int:
    limit = 12
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        limit = int(sys.argv[1])

    catalog = json.loads(CATALOG.read_text())
    mapping: dict[str, str] = {}
    if MAP_PATH.exists():
        mapping = json.loads(MAP_PATH.read_text())

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    targets = pick_hero_mix(catalog, limit=limit)
    print(f"cutting {len(targets)} hero pieces…")
    for p in targets:
        cut_one(p, mapping)

    MAP_PATH.write_text(json.dumps(mapping, indent=2) + "\n")
    print(f"wrote {MAP_PATH} ({len(mapping)} cutouts)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
