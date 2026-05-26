"""
Daily run cho video module Trợ lý 35.
Chạy bằng cron / systemd timer lúc 7:30 sáng, sau khi runDailyNewsBot() GAS đã xong.

Pipeline: fetch_input → extract_facts → make_script → validate → make_voice
          → render_video → compress → make_short → post_telegram_review

Exit codes:
  0 — hoàn tất thành công
  1 — lỗi nghiêm trọng (có thông báo Telegram)
  2 — bỏ qua hôm nay (đã chạy rồi hoặc chưa có bản tin mới — không phải lỗi)
"""

import os
import shutil
import subprocess
import sys
import time
import logging
from datetime import datetime
from pathlib import Path

import psutil
from dotenv import load_dotenv

ROOT       = Path(__file__).parent
DATE_STR   = datetime.now().strftime("%Y%m%d")
LOG_DIR    = ROOT / "logs"
LOG_FILE   = LOG_DIR / f"run_{DATE_STR}.log"
LOCK_FILE  = LOG_DIR / "run.lock"
ARCHIVE_DIR = ROOT / "archive" / DATE_STR

LOG_RETAIN_DAYS = 30   # xoá log cũ hơn N ngày

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

BOT_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN", "")
REVIEW_CHAT = os.getenv("TELEGRAM_REVIEW_CHAT_ID", "")


# ── Lock file cross-platform (psutil, không dùng fcntl) ─────────────────────

def acquire_lock() -> None:
    """Chống chạy trùng: PID file + psutil.pid_exists (hoạt động cả Windows)."""
    if LOCK_FILE.exists():
        try:
            pid = int(LOCK_FILE.read_text().strip())
            if psutil.pid_exists(pid):
                log.error(f"Job khác đang chạy (PID {pid}). Dừng.")
                sys.exit(0)
            else:
                log.warning(f"Lock file cũ (PID {pid} đã chết) — ghi đè.")
        except (ValueError, OSError):
            pass
    LOCK_FILE.write_text(str(os.getpid()))
    log.info(f"Lock acquired (PID {os.getpid()})")


def release_lock() -> None:
    LOCK_FILE.unlink(missing_ok=True)
    log.info("Lock released")


# ── Idempotency guard ────────────────────────────────────────────────────────

def check_already_done() -> None:
    """
    Nếu archive hôm nay đã có final.mp4, pipeline đã chạy xong rồi — bỏ qua.
    Exit code 2 (không phải lỗi) để cron không báo động.
    """
    done_marker = ARCHIVE_DIR / "final.mp4"
    if done_marker.exists():
        log.info(f"Đã có {done_marker} — bỏ qua lần chạy trùng hôm nay (exit 2).")
        sys.exit(2)


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
        ROOT / "input"  / "today_news.md",
        ROOT / "data"   / "extracted_facts.json",
        ROOT / "data"   / "scenes.json",
        ROOT / "data"   / "pending_review.json",
        ROOT / "audio"  / "voiceover.mp3",
        ROOT / "output" / "final.mp4",
        ROOT / "output" / "final_short.mp4",
    ]
    for src in targets:
        if src.exists():
            shutil.copy2(src, ARCHIVE_DIR / src.name)
    shutil.copy2(LOG_FILE, ARCHIVE_DIR / LOG_FILE.name)
    log.info(f"Archive: {ARCHIVE_DIR}/")


# ── Log rotation ─────────────────────────────────────────────────────────────

def rotate_old_logs() -> None:
    """Xoá log cũ hơn LOG_RETAIN_DAYS ngày để tránh đĩa đầy."""
    now = datetime.now()
    deleted = 0
    for log_file in LOG_DIR.glob("run_*.log"):
        age_days = (now - datetime.fromtimestamp(log_file.stat().st_mtime)).days
        if age_days > LOG_RETAIN_DAYS:
            log_file.unlink(missing_ok=True)
            deleted += 1
    if deleted:
        log.info(f"Xoá {deleted} log file cũ hơn {LOG_RETAIN_DAYS} ngày.")


# ── Steps ────────────────────────────────────────────────────────────────────

STEPS = [
    ("Kéo bản tin",       ROOT / "scripts" / "00_fetch_input.py"),
    ("Trích facts",       ROOT / "scripts" / "01_extract_facts.py"),
    ("Sinh kịch bản",     ROOT / "scripts" / "02_make_script.py"),
    ("Validate kịch bản", ROOT / "scripts" / "03_validate_script.py"),
    ("Sinh voiceover",    ROOT / "scripts" / "04_make_voice.py"),
    ("Render video",      ROOT / "scripts" / "05_render_video.py"),
    ("Nén + ghép audio",  ROOT / "scripts" / "06_compress_video.py"),
    ("Tạo bản ngắn 30s",  ROOT / "scripts" / "08_make_short.py"),
    ("Đăng nhóm duyệt",  ROOT / "scripts" / "07_post_telegram_review.py"),
]


STEP_TIMINGS: list[tuple[str, float]] = []


def run_step(name: str, script: Path) -> None:
    log.info(f"[BẮT ĐẦU] {name}")
    started = time.monotonic()
    r = subprocess.run(
        [sys.executable, str(script)],
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    elapsed = time.monotonic() - started
    if r.stdout.strip():
        log.info(r.stdout.strip())
    if r.stderr.strip():
        # Luôn capture stderr vào log file; chỉ promote lên ERROR khi lỗi
        if r.returncode != 0:
            log.error(r.stderr.strip())
        else:
            log.debug(r.stderr.strip())
    if r.returncode != 0:
        detail = (r.stderr or r.stdout or "").strip()
        log.error(f"[LỖI] {name} (sau {elapsed:.1f}s)\n{detail}")
        notify_failure(name, detail)
        sys.exit(1)
    STEP_TIMINGS.append((name, elapsed))
    log.info(f"[XONG] {name} ({elapsed:.1f}s)")


def log_timing_summary() -> None:
    if not STEP_TIMINGS:
        return
    total = sum(t for _, t in STEP_TIMINGS)
    log.info("=== Tổng kết thời gian từng bước ===")
    for name, t in STEP_TIMINGS:
        pct = (t / total * 100) if total > 0 else 0
        log.info(f"  {name:<22} {t:>6.1f}s  ({pct:>4.1f}%)")
    log.info(f"  {'TỔNG':<22} {total:>6.1f}s")


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    acquire_lock()
    try:
        log.info(f"=== Video module Trợ lý 35 — {DATE_STR} ===")

        rotate_old_logs()
        check_already_done()

        for name, script in STEPS:
            run_step(name, script)

        archive_outputs()
        log_timing_summary()
        log.info("=== HOÀN TẤT — final.mp4 sẵn sàng trong output/ ===")

    finally:
        release_lock()


if __name__ == "__main__":
    main()
