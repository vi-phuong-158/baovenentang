"""
Daily run cho video module Trợ lý 35.
Chạy bằng cron / Task Scheduler lúc 7:30 sáng (sau khi Trợ lý 35 sinh bản tin).

Hiện tại (Giai đoạn 2): chạy Track A — extractor → LLM script → validator.
Các bước render, TTS, Telegram sẽ được thêm ở Giai đoạn 3-4.
"""

import sys
import os
import subprocess
import logging
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import psutil
from dotenv import load_dotenv

ROOT = Path(__file__).parent
DATE_STR = datetime.now().strftime("%Y%m%d")
LOG_DIR = ROOT / "logs"
LOG_FILE = LOG_DIR / f"run_{DATE_STR}.log"
LOCK_FILE = LOG_DIR / "run.lock"
ARCHIVE_DIR = ROOT / "archive" / DATE_STR

LOG_DIR.mkdir(exist_ok=True)
ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(ROOT / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
REVIEW_CHAT = os.getenv("TELEGRAM_REVIEW_CHAT_ID", "")


# ── Lock file cross-platform (dùng psutil, không dùng fcntl) ────────────────

def acquire_lock() -> None:
    """Chống chạy trùng: dùng PID file + psutil.pid_exists."""
    if LOCK_FILE.exists():
        try:
            pid = int(LOCK_FILE.read_text().strip())
            if psutil.pid_exists(pid):
                log.error(f"Job khác đang chạy (PID {pid}). Dừng.")
                sys.exit(0)
            else:
                log.warning(f"Lock file cũ tồn tại (PID {pid} đã chết) — ghi đè.")
        except (ValueError, OSError):
            pass
    LOCK_FILE.write_text(str(os.getpid()))
    log.info(f"Lock acquired (PID {os.getpid()})")


def release_lock() -> None:
    LOCK_FILE.unlink(missing_ok=True)
    log.info("Lock released")


# ── Kiểm tra freshness bản tin (bước 00) ────────────────────────────────────

def check_input_freshness(max_age_hours: int = 2) -> bool:
    """
    Trả về True nếu input/today_news.md tồn tại và được sửa trong vòng max_age_hours.
    Exit code 2 nếu chưa có bản tin mới (không phải lỗi).
    """
    input_file = ROOT / "input" / "today_news.md"
    if not input_file.exists():
        log.info("Chưa có input/today_news.md — bỏ qua hôm nay (exit 2).")
        sys.exit(2)

    mtime = datetime.fromtimestamp(input_file.stat().st_mtime)
    age_hours = (datetime.now() - mtime).total_seconds() / 3600
    if age_hours > max_age_hours:
        log.info(
            f"Bản tin cũ hơn {max_age_hours}h (tuổi: {age_hours:.1f}h) — bỏ qua hôm nay (exit 2)."
        )
        sys.exit(2)

    log.info(f"Bản tin OK, tuổi: {age_hours:.1f}h")
    return True


# ── Notify lỗi qua Telegram ─────────────────────────────────────────────────

def notify_failure(step_name: str, error_detail: str) -> None:
    if not BOT_TOKEN or not REVIEW_CHAT:
        return
    try:
        import requests
        msg = (
            f"🚨 *Video module lỗi*\n"
            f"Bước: `{step_name}`\n"
            f"Ngày: {datetime.now():%d/%m/%Y %H:%M}\n\n"
            f"```\n{error_detail[:500]}\n```"
        )
        requests.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={"chat_id": REVIEW_CHAT, "text": msg, "parse_mode": "Markdown"},
            timeout=15,
        )
    except Exception as e:
        log.warning(f"Không gửi được thông báo lỗi: {e}")


# ── Archive ──────────────────────────────────────────────────────────────────

def archive_outputs() -> None:
    targets = [
        ROOT / "input" / "today_news.md",
        ROOT / "data" / "extracted_facts.json",
        ROOT / "data" / "scenes.json",
    ]
    for src in targets:
        if src.exists():
            shutil.copy2(src, ARCHIVE_DIR / src.name)
    shutil.copy2(LOG_FILE, ARCHIVE_DIR / LOG_FILE.name)
    log.info(f"Archive: {ARCHIVE_DIR}/")


# ── Steps ────────────────────────────────────────────────────────────────────

# Giai đoạn 2: chỉ Track A (pipeline khô)
STEPS_G2 = [
    ("Trích facts",       ROOT / "scripts" / "01_extract_facts.py"),
    ("Sinh kịch bản",     ROOT / "scripts" / "02_make_script.py"),
    ("Validate kịch bản", ROOT / "scripts" / "03_validate_script.py"),
]

# Giai đoạn 3+ sẽ thêm:
# ("Sinh voiceover",    ROOT / "scripts" / "04_make_voice.py"),
# ("Render video",      ROOT / "scripts" / "05_render_video.py"),
# ("Nén + ghép audio",  ROOT / "scripts" / "06_compress_video.py"),
# ("Đăng nhóm duyệt",  ROOT / "scripts" / "07_post_telegram.py"),


def run_step(name: str, script: Path) -> None:
    log.info(f"[BẮT ĐẦU] {name}")
    r = subprocess.run(
        [sys.executable, str(script)],
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    if r.stdout:
        log.info(r.stdout.strip())
    if r.returncode != 0:
        detail = (r.stderr or r.stdout or "").strip()
        log.error(f"[LỖI] {name}\n{detail}")
        notify_failure(name, detail)
        sys.exit(1)
    log.info(f"[XONG] {name}")


def main() -> None:
    acquire_lock()
    try:
        log.info(f"=== Video module Trợ lý 35 — {DATE_STR} ===")

        # Bước 00: kiểm tra freshness (bật khi chạy production)
        # check_input_freshness()  # Bỏ comment khi chạy cron thật

        for name, script in STEPS_G2:
            run_step(name, script)

        archive_outputs()
        log.info("=== HOÀN TẤT — scenes.json đã validate ===")

    finally:
        release_lock()


if __name__ == "__main__":
    main()
