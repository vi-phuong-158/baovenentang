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
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

VIDEO_FILE    = ROOT / "output" / "final.mp4"
SHORT_FILE    = ROOT / "output" / "final_short.mp4"
PENDING_FILE  = ROOT / "data"   / "pending_review.json"

BOT_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
REVIEW_CHAT = os.getenv("TELEGRAM_REVIEW_CHAT_ID", "")

API_BASE = "https://api.telegram.org/bot"
TIMEOUT  = 120   # sendVideo có thể chậm khi upload lần đầu
MAX_RETRIES         = 3
BACKOFF_SECONDS     = (2, 4, 8)
TRANSIENT_CODES     = {429, 500, 502, 503, 504}
MAX_RETRY_AFTER_SEC = 120  # cap retry_after từ Telegram để không treo cron quá lâu

NETWORK_RETRY_EXCEPTIONS = (
    requests.Timeout,
    requests.ConnectionError,
    requests.exceptions.ChunkedEncodingError,
)

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


def _backoff(attempt: int) -> int:
    idx = min(attempt - 1, len(BACKOFF_SECONDS) - 1)
    return BACKOFF_SECONDS[idx]


def _api(method: str, **kwargs) -> dict:
    """Gọi Telegram Bot API, ẩn token khỏi log.

    Retry tối đa ``MAX_RETRIES`` lần với backoff 2/4/8s cho các lỗi tạm thời
    (network timeout, connection error, HTTP 429/5xx). Lỗi vĩnh viễn
    (chat_id sai, token sai…) fail ngay không retry.
    """
    url = f"{API_BASE}{BOT_TOKEN}/{method}"
    last_err: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(url, timeout=TIMEOUT, **kwargs)
        except NETWORK_RETRY_EXCEPTIONS as e:
            last_err = e
            if attempt < MAX_RETRIES:
                wait = _backoff(attempt)
                log.warning(
                    f"Telegram [{method}] lỗi mạng lần {attempt}/{MAX_RETRIES}: "
                    f"{e.__class__.__name__} — chờ {wait}s rồi thử lại"
                )
                time.sleep(wait)
                continue
            raise RuntimeError(
                f"Telegram API [{method}] mất kết nối sau {MAX_RETRIES} lần: {e}"
            ) from e

        try:
            data = resp.json()
        except ValueError as e:
            last_err = e
            if attempt < MAX_RETRIES:
                wait = _backoff(attempt)
                log.warning(
                    f"Telegram [{method}] response không phải JSON lần {attempt}/{MAX_RETRIES}"
                    f" — chờ {wait}s rồi thử lại"
                )
                time.sleep(wait)
                continue
            raise RuntimeError(
                f"Telegram API [{method}] response không phải JSON: {resp.text[:200]}"
            ) from e

        if data.get("ok"):
            return data["result"]

        err_code = data.get("error_code", 0)
        description = data.get("description", "")
        if err_code in TRANSIENT_CODES and attempt < MAX_RETRIES:
            params = data.get("parameters") or {}
            retry_after = params.get("retry_after")
            wait = max(_backoff(attempt), int(retry_after) if retry_after else 0)
            if wait > MAX_RETRY_AFTER_SEC:
                log.warning(
                    f"Telegram [{method}] yêu cầu chờ {wait}s — cap xuống {MAX_RETRY_AFTER_SEC}s"
                )
                wait = MAX_RETRY_AFTER_SEC
            log.warning(
                f"Telegram [{method}] lỗi tạm thời {err_code} lần {attempt}/{MAX_RETRIES}: "
                f"{description} — chờ {wait}s rồi thử lại"
            )
            time.sleep(wait)
            continue

        # Lỗi vĩnh viễn (sai token, sai chat_id, sai payload…) — không retry
        raise RuntimeError(f"Telegram API lỗi [{method}]: {description}")

    raise RuntimeError(f"Telegram API [{method}] không thành công: {last_err}")


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


def send_short_if_present() -> None:
    """Gửi kèm bản ngắn ~30s (nếu có) để cán bộ xem trước bản dùng cho TikTok/Reels. Không chặn nếu lỗi."""
    if not SHORT_FILE.exists():
        return
    caption = (
        "🎬 *Bản ngắn ~30s — TikTok / Reels / Shorts*\n\n"
        "Cắt tự động từ bản đầy đủ ở trên. Dùng để đăng kênh video ngắn sau khi bản đầy đủ được duyệt."
    )
    try:
        log.info(f"Upload bản ngắn {SHORT_FILE.name} ({SHORT_FILE.stat().st_size // 1024} KB)")
        with SHORT_FILE.open("rb") as fh:
            _api(
                "sendVideo",
                data={
                    "chat_id":            REVIEW_CHAT,
                    "caption":            caption,
                    "parse_mode":         "Markdown",
                    "supports_streaming": "true",
                },
                files={"video": (SHORT_FILE.name, fh, "video/mp4")},
            )
    except Exception as e:  # noqa: BLE001 — bản ngắn là phụ, không chặn luồng duyệt
        log.warning(f"Không gửi được bản ngắn (bỏ qua): {e}")


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
    send_short_if_present()

    log.info("→ Video đang chờ duyệt ở nhóm nội bộ.")
    return PENDING_FILE


if __name__ == "__main__":
    run()
