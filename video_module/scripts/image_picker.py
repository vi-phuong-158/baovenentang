"""
Image picker — chọn ảnh nền cho mỗi scene từ kho `assets/library/<category>/`.

Sử dụng:
    from scripts.image_picker import ImagePicker
    picker = ImagePicker()
    path = picker.pick("chinhphu")   # Path tới ảnh, hoặc None nếu kho trống

Quy tắc:
  - Random trong folder category. Không lặp ảnh trong cùng 1 video.
  - Nếu folder category trống → fallback 'default'.
  - Nếu cả default trống → return None (renderer sẽ dùng gradient cũ).
"""

from __future__ import annotations

import json
import logging
import random
from datetime import datetime
from pathlib import Path

log = logging.getLogger(__name__)

ROOT = Path(__file__).parent.parent
LIBRARY_DIR = ROOT / "assets" / "library"
CATEGORIES_FILE = LIBRARY_DIR / "categories.json"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


class ImagePicker:
    def __init__(
        self,
        library_dir: Path = LIBRARY_DIR,
        auto_fetch: bool = True,
        seed: str | int | None = None,
    ):
        self.library_dir = library_dir
        self.used: set[Path] = set()
        self.valid_categories = self._load_categories()
        self.auto_fetch = auto_fetch
        self._fetched: set[str] = set()  # tránh fetch lặp 1 category trong cùng phiên
        if seed is None:
            seed = datetime.now().strftime("%Y%m%d")
        self._rng = random.Random(str(seed))

    def _load_categories(self) -> set[str]:
        if not CATEGORIES_FILE.exists():
            log.warning(f"Không tìm thấy {CATEGORIES_FILE}")
            return set()
        try:
            data = json.loads(CATEGORIES_FILE.read_text(encoding="utf-8"))
            return {c["key"] for c in data.get("categories", [])}
        except Exception as e:
            log.warning(f"Đọc categories.json lỗi: {e}")
            return set()

    def _list_images(self, category: str) -> list[Path]:
        folder = self.library_dir / category
        if not folder.exists() or not folder.is_dir():
            return []
        return sorted(
            p for p in folder.iterdir()
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS
        )

    def pick(self, category: str | None) -> Path | None:
        cat = (category or "default").strip()
        if self.valid_categories and cat not in self.valid_categories:
            log.warning(f"Category '{cat}' không hợp lệ, dùng 'default'")
            cat = "default"

        for try_cat in (cat, "default"):
            images = self._list_images(try_cat)

            # Auto-fetch nếu folder trống và chưa thử trong phiên này
            if not images and self.auto_fetch and try_cat not in self._fetched:
                self._fetched.add(try_cat)
                try:
                    from scripts.image_fetcher import ensure_category
                    log.info(f"Folder '{try_cat}' trống → tự tải từ Openverse/Wikimedia")
                    ensure_category(try_cat, target=3)
                    images = self._list_images(try_cat)
                except Exception as e:
                    log.warning(f"Auto-fetch '{try_cat}' lỗi: {e}")

            if not images:
                continue
            fresh = [p for p in images if p not in self.used]
            chosen = self._rng.choice(fresh) if fresh else self._rng.choice(images)
            self.used.add(chosen)
            if try_cat != cat:
                log.info(f"Category '{cat}' trống → fallback 'default' → {chosen.name}")
            else:
                log.info(f"Pick {cat}/{chosen.name}")
            return chosen

        log.warning(f"Cả '{cat}' lẫn 'default' đều trống — không có ảnh nền")
        return None
