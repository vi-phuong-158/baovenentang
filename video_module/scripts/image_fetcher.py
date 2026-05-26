"""
Tự động tải ảnh CC-licensed cho kho `assets/library/<category>/`.

Nguồn (không cần API key):
  1. Openverse  — aggregator các kho CC (Flickr, Wikimedia, ...)
  2. Wikimedia Commons — ảnh chính thống, public domain / CC

Sử dụng độc lập (seed thủ công):
    python scripts/image_fetcher.py                  # seed tất cả category, 5 ảnh/cat
    python scripts/image_fetcher.py --cat default    # chỉ seed 1 category
    python scripts/image_fetcher.py --target 10      # 10 ảnh/cat

Hoặc gọi từ ImagePicker khi folder trống (xem image_picker.py).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent.parent
LIB = ROOT / "assets" / "library"
CATFILE = LIB / "categories.json"

OPENVERSE_URL = "https://api.openverse.org/v1/images/"
WIKIMEDIA_URL = "https://commons.wikimedia.org/w/api.php"

USER_AGENT = "Troly35-VideoModule/1.0 (https://troly35.info.vn; contact: admin@troly35.info.vn)"

IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
MIN_FILE_BYTES = 5_000  # ảnh thật phải lớn hơn này; bé hơn coi như 1x1 pixel hoặc lỗi

# Lọc title/URL chứa từ khoá nhạy cảm — ảnh KHÔNG phù hợp bản tin VN chính luận
BLACKLIST_KEYWORDS = [
    # Cờ + biểu tượng quốc gia khác
    "american flag", "usa flag", "united states flag", "us flag",
    "chinese flag", "china flag", "russian flag", "japanese flag",
    "french flag", "british flag", "uk flag",
    # Chiến tranh Việt Nam (góc nhìn nước ngoài)
    "vietnam war", "war in vietnam", "vietnam veteran", "vietnam memorial",
    "war memorial", "cemetery", "tombstone", "grave",
    # Nội dung không phù hợp
    "saigon fall", "south vietnam", "republic of vietnam",
    "anti-communist", "protest", "demonstration",
    # Linh tinh
    "construction sheet", "svg", "diagram", "blueprint",
]


def _is_blacklisted(title: str, url: str) -> bool:
    blob = f"{title} {url}".lower()
    return any(kw in blob for kw in BLACKLIST_KEYWORDS)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


# ── HTTP helpers ─────────────────────────────────────────────────────────────

def _http_get_json(url: str, params: dict, timeout: int = 20) -> dict:
    qs = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{url}?{qs}", headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def _http_download(url: str, dest: Path, timeout: int = 30) -> int:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
    dest.write_bytes(data)
    return len(data)


# ── Source: Openverse ────────────────────────────────────────────────────────

def search_openverse(query: str, n: int = 5) -> list[dict]:
    """Trả về list dict {url, creator, license, source}."""
    try:
        data = _http_get_json(OPENVERSE_URL, {
            "q": query,
            "page_size": min(n, 20),
            "license_type": "commercial",  # cho phép dùng thương mại để an toàn
            "mature": "false",
        })
        items = []
        for r in data.get("results", []):
            url = r.get("url") or r.get("thumbnail")
            if not url:
                continue
            items.append({
                "url": url,
                "creator": r.get("creator", "unknown"),
                "license": r.get("license", "unknown"),
                "source": r.get("source", "openverse"),
                "title": r.get("title", "")[:80],
            })
        return items
    except Exception as e:
        log.warning(f"Openverse search '{query}' lỗi: {e}")
        return []


# ── Source: Wikimedia Commons ────────────────────────────────────────────────

def search_wikimedia(query: str, n: int = 5) -> list[dict]:
    """Search Commons file, trả URL ảnh thật."""
    try:
        data = _http_get_json(WIKIMEDIA_URL, {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": f"{query} filetype:bitmap",
            "gsrnamespace": 6,  # File namespace
            "gsrlimit": min(n, 20),
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
        })
        pages = (data.get("query") or {}).get("pages") or {}
        items = []
        for p in pages.values():
            ii = p.get("imageinfo") or []
            if not ii:
                continue
            info = ii[0]
            url = info.get("url", "")
            if not url:
                continue
            ext = Path(urllib.parse.urlparse(url).path).suffix.lower()
            if ext not in IMG_EXTS:
                continue
            meta = info.get("extmetadata", {}) or {}
            license_short = (meta.get("LicenseShortName") or {}).get("value", "unknown")
            artist = (meta.get("Artist") or {}).get("value", "unknown")[:80]
            items.append({
                "url": url,
                "creator": artist,
                "license": license_short,
                "source": "wikimedia",
                "title": p.get("title", "")[:80],
            })
        return items
    except Exception as e:
        log.warning(f"Wikimedia search '{query}' lỗi: {e}")
        return []


# ── Seeder ───────────────────────────────────────────────────────────────────

def _existing_count(folder: Path) -> int:
    if not folder.exists():
        return 0
    return sum(1 for p in folder.iterdir() if p.is_file() and p.suffix.lower() in IMG_EXTS)


# Seed ảnh chính thống đảm bảo — dùng URL Wikimedia trực tiếp, không phụ thuộc search
# (search Openverse/Wikimedia hay lẫn ảnh nước ngoài hoặc chiến tranh)
CURATED_SEEDS: dict[str, list[tuple[str, str, str]]] = {
    # (url, license, creator)
    # Chỉ list URL Wikimedia đã verify hoạt động. Thêm URL mới nên test trước.
    "default": [
        ("https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Flag_of_Vietnam.svg/1280px-Flag_of_Vietnam.svg.png",
         "Public domain", "Government of Vietnam"),
    ],
    "tuyengiao": [
        ("https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Flag_of_Vietnam.svg/1280px-Flag_of_Vietnam.svg.png",
         "Public domain", "Government of Vietnam"),
    ],
}

# Category nhạy cảm — chỉ dùng curated, KHÔNG search fallback
# (search Openverse/Wikimedia hay lẫn ảnh nước ngoài, chiến tranh, v.v.)
CURATED_ONLY_CATS = {"default", "tuyengiao"}


def _seed_curated(cat_key: str, folder: Path) -> int:
    """Tải ảnh đã curate (URL hard-code) — dùng cho category nhạy cảm."""
    seeds = CURATED_SEEDS.get(cat_key, [])
    if not seeds:
        return 0
    downloaded = 0
    credits_lines: list[str] = []
    for url, lic, creator in seeds:
        ext = Path(urllib.parse.urlparse(url).path).suffix.lower()
        if ext not in IMG_EXTS:
            ext = ".png"
        h = hashlib.md5(url.encode("utf-8")).hexdigest()[:10]
        name = f"{cat_key}_curated_{h}{ext}"
        dest = folder / name
        if dest.exists():
            continue
        try:
            size = _http_download(url, dest)
            if size < MIN_FILE_BYTES:
                dest.unlink(missing_ok=True)
                continue
            downloaded += 1
            credits_lines.append(f"{name} | curated | {lic} | {creator} | {url}")
            log.info(f"[{cat_key}] curated → {name} ({size//1024} KB)")
            time.sleep(0.3)
        except Exception as e:
            log.warning(f"Curated {url} lỗi: {e}")
            dest.unlink(missing_ok=True)
    if credits_lines:
        with (folder / "_credits.txt").open("a", encoding="utf-8") as f:
            for line in credits_lines:
                f.write(line + "\n")
    return downloaded


def seed_category(cat_key: str, hints: str, target: int = 5) -> int:
    """Tải đủ `target` ảnh vào folder cat_key. Bỏ qua nếu đã đủ."""
    folder = LIB / cat_key
    folder.mkdir(parents=True, exist_ok=True)

    # Ưu tiên curated seeds trước cho category nhạy cảm
    curated_added = 0
    if cat_key in CURATED_SEEDS:
        curated_added = _seed_curated(cat_key, folder)

    have = _existing_count(folder)
    need = target - have
    if need <= 0:
        log.info(f"[{cat_key}] đã có {have}/{target} ảnh — bỏ qua")
        return curated_added

    # Category nhạy cảm: không tải thêm từ search
    if cat_key in CURATED_ONLY_CATS:
        log.info(f"[{cat_key}] curated-only, không search thêm (có {have} ảnh)")
        return curated_added

    log.info(f"[{cat_key}] cần thêm {need} ảnh (hiện có {have})")

    queries = [q.strip() for q in hints.split(",") if q.strip()] or [cat_key]
    candidates: list[dict] = []

    for q in queries:
        if len(candidates) >= need * 2:
            break
        candidates.extend(search_openverse(q, n=need))
        if len(candidates) >= need * 2:
            break
        candidates.extend(search_wikimedia(q, n=need))

    seen_urls: set[str] = set()
    credits_lines: list[str] = []
    downloaded = 0

    for item in candidates:
        if downloaded >= need:
            break
        url = item["url"]
        if url in seen_urls:
            continue
        seen_urls.add(url)

        # Lọc nội dung nhạy cảm/không phù hợp
        if _is_blacklisted(item.get("title", ""), url):
            log.info(f"[{cat_key}] bỏ qua (blacklist): {item.get('title','')[:60]}")
            continue

        ext = Path(urllib.parse.urlparse(url).path).suffix.lower()
        if ext not in IMG_EXTS:
            ext = ".jpg"
        h = hashlib.md5(url.encode("utf-8")).hexdigest()[:10]
        name = f"{cat_key}_{h}{ext}"
        dest = folder / name
        if dest.exists():
            continue

        try:
            size = _http_download(url, dest)
            if size < MIN_FILE_BYTES:
                dest.unlink(missing_ok=True)
                continue
            downloaded += 1
            credits_lines.append(
                f"{name} | {item['source']} | {item.get('license','?')} | {item.get('creator','?')} | {url}"
            )
            log.info(f"[{cat_key}] tải {name} ({size//1024} KB)")
            time.sleep(0.4)  # nhẹ tay với server free
        except Exception as e:
            log.warning(f"Tải {url} lỗi: {e}")
            dest.unlink(missing_ok=True)

    if credits_lines:
        credits = folder / "_credits.txt"
        with credits.open("a", encoding="utf-8") as f:
            for line in credits_lines:
                f.write(line + "\n")

    if downloaded < need:
        log.warning(f"[{cat_key}] chỉ tải được {downloaded}/{need} ảnh — kiểm tra query hints")

    return downloaded


def seed_all(target: int = 5, only_cat: str | None = None) -> int:
    if not CATFILE.exists():
        log.error(f"Thiếu {CATFILE}")
        return 0
    cats = json.loads(CATFILE.read_text(encoding="utf-8")).get("categories", [])
    total = 0
    for c in cats:
        if only_cat and c["key"] != only_cat:
            continue
        total += seed_category(c["key"], c.get("hints", c["key"]), target=target)
    log.info(f"Hoàn tất: tải tổng {total} ảnh mới")
    return total


def ensure_category(cat_key: str, target: int = 3) -> int:
    """Hàm tiện ích cho ImagePicker — đảm bảo folder cat_key có ≥1 ảnh."""
    if not CATFILE.exists():
        return 0
    cats = json.loads(CATFILE.read_text(encoding="utf-8")).get("categories", [])
    for c in cats:
        if c["key"] == cat_key:
            return seed_category(cat_key, c.get("hints", cat_key), target=target)
    return 0


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Seed kho ảnh CC cho video module")
    ap.add_argument("--cat", help="Chỉ seed 1 category (key)")
    ap.add_argument("--target", type=int, default=5, help="Số ảnh mục tiêu mỗi category (default 5)")
    args = ap.parse_args()
    seed_all(target=args.target, only_cat=args.cat)
