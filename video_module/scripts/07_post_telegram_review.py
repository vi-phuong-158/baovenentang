"""
Bước 7: Gửi video vào nhóm duyệt nội bộ qua Telegram Bot API.

Input:  output/final.mp4  (từ bước 6)
Output: data/pending_review.json  (lưu message_id, file_id, trạng thái)

Biến môi trường cần có (trong .env):
  TELEGRAM_BOT_TOKEN       — token bot (không log)
  TELEGRAM_REVIEW_CHAT_ID  — chat_id nhóm duyệt (âm, dạng -100xxxxxxxx)

Nhóm chính (TELEGRAM_MAIN_CHAT_ID) KHÔNG được đụng tới trong bước này.
"""

import hashlib
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

VIDEO_FILE    = ROOT / "output" / "final.mp4"
PENDING_FILE  = ROOT / "data"   / "pending_review.json"

BOT_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
REVIEW_CHAT = os.getenv("TELEGRAM_REVIEW_CHAT_ID", "")

API_BASE = "https://api.telegram.org/bot"
TIMEOUT  = 120   # sendVideo có thể chậm khi upload lần đầu

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _api(method: str, **kwargs) -> dict:
    """Gọi Telegram Bot API, ẩn token khỏi log."""
    url = f"{API_BASE}{BOT_TOKEN}/{method}"
    resp = requests.post(url, timeout=TIMEOUT, **kwargs)
    data = resp.json()
    if not data.get("ok"):
        raise RuntimeError(f"Telegram API lỗi [{method}]: {data.get('description')}")
    return data["result"]


def build_caption(date_str: str) -> str:
    return (
        f"📋 *BẢN NHÁP CHỜ DUYỆT — {date_str}*\n\n"
        "Video tin tức Trợ lý 35 vừa được tạo tự động.\n"
        "Vui lòng xem và bấm nút bên dưới để duyệt hoặc từ chối."
    )


def build_inline_keyboard() -> dict:
    return {
        "inline_keyboard": [[
            {"text": "✅ Duyệt và đăng", "callback_data": "approve"},
            {"text": "❌ Từ chối",        "callback_data": "reject"},
        ]]
    }


# ── Core ──────────────────────────────────────────────────────────────────────

def send_video_for_review(video_path: Path) -> dict:
    """Upload video + caption + inline keyboard → nhóm duyệt."""
    date_str = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    caption  = build_caption(date_str)
    keyboard = build_inline_keyboard()

    log.info(f"Upload {video_path.name} ({video_path.stat().st_size // 1024} KB) → chat {REVIEW_CHAT}")

    with video_path.open("rb") as fh:
        result = _api(
            "sendVideo",
            data={
                "chat_id":              REVIEW_CHAT,
                "caption":              caption,
                "parse_mode":           "Markdown",
                "reply_markup":         json.dumps(keyboard),
                "supports_streaming":   "true",
            },
            files={"video": (video_path.name, fh, "video/mp4")},
        )

    message_id = result["message_id"]
    # file_id từ video object của Telegram (dùng để forward sau khi duyệt)
    file_id = result.get("video", {}).get("file_id", "")

    log.info(f"Đã gửi: message_id={message_id}, file_id={file_id[:20]}…")
    return {"message_id": message_id, "file_id": file_id}


def save_pending(video_path: Path, tg_result: dict) -> None:
    record = {
        "created_at":  datetime.now(timezone.utc).isoformat(),
        "date_label":  datetime.now(timezone.utc).strftime("%Y%m%d"),
        "status":      "pending",
        "message_id":  tg_result["message_id"],
        "file_id":     tg_result["file_id"],
        "local_path":  str(video_path.resolve()),
        "file_hash":   sha256_file(video_path),
        "review_chat": REVIEW_CHAT,
    }
    PENDING_FILE.parent.mkdir(exist_ok=True)
    PENDING_FILE.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info(f"Lưu pending: {PENDING_FILE}")


# ── Main ──────────────────────────────────────────────────────────────────────

def run(video_path: Path = VIDEO_FILE) -> Path:
    # Kiểm tra config
    if not BOT_TOKEN:
        log.error("Thiếu TELEGRAM_BOT_TOKEN trong .env")
        sys.exit(1)
    if not REVIEW_CHAT:
        log.error("Thiếu TELEGRAM_REVIEW_CHAT_ID trong .env")
        sys.exit(1)

    if not video_path.exists():
        log.error(f"Không tìm thấy video: {video_path}")
        sys.exit(1)

    tg_result = send_video_for_review(video_path)
    save_pending(video_path, tg_result)

    log.info("→ Video đang chờ duyệt ở nhóm nội bộ.")
    return PENDING_FILE


if __name__ == "__main__":
    run()
