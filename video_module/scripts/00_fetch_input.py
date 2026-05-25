"""
Bước 0: Kéo bản tin hôm nay từ Google Apps Script về input/today_news.md.

Endpoint GAS: GET ?action=video_export&api_token=TOKEN
Response:     { success: true, data: { markdown, date, article_count } }

Output: input/today_news.md

Biến môi trường cần có:
  GAS_DEPLOYMENT_URL  — URL Web App GAS (kết thúc bằng /exec)
  GAS_API_TOKEN       — API_ACCESS_TOKEN trong Script Properties GAS
"""

import logging
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

OUTPUT_FILE = ROOT / "input" / "today_news.md"

GAS_URL   = os.getenv("GAS_DEPLOYMENT_URL", "")
GAS_TOKEN = os.getenv("GAS_API_TOKEN", "") or os.getenv("API_ACCESS_TOKEN", "")

TIMEOUT = 30

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def fetch_news_markdown() -> str:
    """Gọi GAS endpoint video_export, trả về chuỗi markdown."""
    if not GAS_URL:
        log.error("Thiếu GAS_DEPLOYMENT_URL trong .env")
        sys.exit(1)
    if not GAS_TOKEN:
        log.error("Thiếu GAS_API_TOKEN (hoặc API_ACCESS_TOKEN) trong .env")
        sys.exit(1)

    params = {"action": "video_export", "api_token": GAS_TOKEN}
    log.info(f"Gọi GAS video_export: {GAS_URL.split('/exec')[0]}/exec?action=video_export")

    resp = requests.get(GAS_URL, params=params, timeout=TIMEOUT)
    resp.raise_for_status()

    body = resp.json()
    if not body.get("success"):
        err = body.get("error", "GAS trả về lỗi không rõ")
        log.error(f"GAS lỗi: {err}")
        sys.exit(1)

    data = body.get("data", {})
    markdown = data.get("markdown", "").strip()
    count = data.get("article_count", 0)
    date_label = data.get("date", "")

    if not markdown:
        log.error("GAS trả về markdown rỗng — bản tin chưa được cập nhật hôm nay?")
        sys.exit(1)

    log.info(f"Nhận được {count} bài, ngày {date_label}")
    return markdown


def run(output: Path = OUTPUT_FILE) -> Path:
    markdown = fetch_news_markdown()

    output.parent.mkdir(exist_ok=True)
    output.write_text(markdown, encoding="utf-8")

    size = output.stat().st_size
    log.info(f"→ {output} ({size:,} bytes)")
    return output


if __name__ == "__main__":
    run()
