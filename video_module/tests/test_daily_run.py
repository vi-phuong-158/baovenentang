"""
Unit tests cho daily_run.py.
Không chạy subprocess thật — test logic điều phối và guard conditions.
"""

import importlib
import os
import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch, call

import pytest

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

# daily_run dùng tên hợp lệ nên import được trực tiếp
import daily_run as dr


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def isolate_paths(tmp_path, monkeypatch):
    """Chuyển tất cả path constants sang tmp_path để test không đụng file thật."""
    log_dir    = tmp_path / "logs"
    archive    = tmp_path / "archive" / dr.DATE_STR
    lock_file  = log_dir / "run.lock"
    log_file   = log_dir / f"run_{dr.DATE_STR}.log"

    log_dir.mkdir(parents=True, exist_ok=True)
    archive.mkdir(parents=True, exist_ok=True)
    log_file.touch()

    monkeypatch.setattr(dr, "LOG_DIR",     log_dir)
    monkeypatch.setattr(dr, "ARCHIVE_DIR", archive)
    monkeypatch.setattr(dr, "LOCK_FILE",   lock_file)
    monkeypatch.setattr(dr, "LOG_FILE",    log_file)

    return tmp_path


# ── Tests: acquire_lock ───────────────────────────────────────────────────────

def test_acquire_lock_writes_pid(tmp_path):
    dr.acquire_lock()
    assert dr.LOCK_FILE.exists()
    assert dr.LOCK_FILE.read_text().strip() == str(os.getpid())
    dr.release_lock()


def test_acquire_lock_exits_if_running(tmp_path):
    # Ghi PID của process hiện tại vào lock file (process đang chạy)
    dr.LOCK_FILE.write_text(str(os.getpid()))
    with pytest.raises(SystemExit) as exc:
        dr.acquire_lock()
    assert exc.value.code == 0


def test_acquire_lock_overwrites_dead_pid(tmp_path):
    # PID 1 luôn tồn tại, nhưng ta fake psutil.pid_exists trả False
    dr.LOCK_FILE.write_text("999999")
    with patch("psutil.pid_exists", return_value=False):
        dr.acquire_lock()
    assert dr.LOCK_FILE.read_text().strip() == str(os.getpid())
    dr.release_lock()


def test_release_lock_removes_file(tmp_path):
    dr.acquire_lock()
    dr.release_lock()
    assert not dr.LOCK_FILE.exists()


# ── Tests: check_already_done ─────────────────────────────────────────────────

def test_check_already_done_exits_if_archive_exists():
    marker = dr.ARCHIVE_DIR / "final.mp4"
    marker.write_bytes(b"\x00" * 100)
    with pytest.raises(SystemExit) as exc:
        dr.check_already_done()
    assert exc.value.code == 2


def test_check_already_done_passes_if_no_archive():
    # ARCHIVE_DIR tồn tại nhưng không có final.mp4
    dr.check_already_done()   # không raise


# ── Tests: rotate_old_logs ────────────────────────────────────────────────────

def test_rotate_deletes_old_logs(tmp_path):
    old_log = dr.LOG_DIR / "run_20200101.log"
    old_log.write_text("old")
    # Đặt mtime cũ hơn LOG_RETAIN_DAYS
    old_mtime = time.time() - (dr.LOG_RETAIN_DAYS + 1) * 86400
    os.utime(old_log, (old_mtime, old_mtime))

    dr.rotate_old_logs()
    assert not old_log.exists()


def test_rotate_keeps_recent_logs(tmp_path):
    recent_log = dr.LOG_DIR / "run_20991231.log"
    recent_log.write_text("recent")
    dr.rotate_old_logs()
    assert recent_log.exists()


def test_rotate_ignores_non_matching_files(tmp_path):
    other = dr.LOG_DIR / "other.txt"
    other.write_text("x")
    old_mtime = time.time() - 999 * 86400
    os.utime(other, (old_mtime, old_mtime))
    dr.rotate_old_logs()
    assert other.exists()   # pattern run_*.log tidak cocok


# ── Tests: run_step ───────────────────────────────────────────────────────────

def _make_result(returncode=0, stdout="", stderr=""):
    r = MagicMock()
    r.returncode = returncode
    r.stdout = stdout
    r.stderr = stderr
    return r


def test_run_step_success(tmp_path):
    with patch("subprocess.run", return_value=_make_result(0, "ok", "")):
        dr.run_step("Test", tmp_path / "fake.py")   # không raise


def test_run_step_logs_stdout(tmp_path, caplog):
    with patch("subprocess.run", return_value=_make_result(0, "output line", "")), \
         caplog.at_level("INFO"):
        dr.run_step("Test", tmp_path / "fake.py")
    assert "output line" in caplog.text


def test_run_step_captures_stderr_on_success(tmp_path, caplog):
    with patch("subprocess.run", return_value=_make_result(0, "", "debug info")), \
         caplog.at_level("DEBUG"):
        dr.run_step("Test", tmp_path / "fake.py")
    assert "debug info" in caplog.text


def test_run_step_exits_on_failure(tmp_path):
    with patch("subprocess.run", return_value=_make_result(1, "", "bad error")), \
         patch.object(dr, "notify_failure"), \
         pytest.raises(SystemExit) as exc:
        dr.run_step("FailStep", tmp_path / "fake.py")
    assert exc.value.code == 1


def test_run_step_notifies_on_failure(tmp_path):
    with patch("subprocess.run", return_value=_make_result(1, "", "err")), \
         patch.object(dr, "notify_failure") as mock_notify, \
         pytest.raises(SystemExit):
        dr.run_step("FailStep", tmp_path / "fake.py")
    mock_notify.assert_called_once()
    assert mock_notify.call_args[0][0] == "FailStep"


# ── Tests: archive_outputs ────────────────────────────────────────────────────

def test_archive_copies_existing_files(tmp_path):
    # Tạo file giả trong thư mục tương ứng
    (tmp_path / "output").mkdir()
    (tmp_path / "output" / "final.mp4").write_bytes(b"mp4")

    with patch.object(dr, "ROOT", tmp_path):
        dr.archive_outputs()

    assert (dr.ARCHIVE_DIR / "final.mp4").exists()


def test_archive_skips_missing_files(tmp_path):
    # Không có file nào — không nên raise
    with patch.object(dr, "ROOT", tmp_path):
        dr.archive_outputs()   # không raise


# ── Tests: notify_failure ─────────────────────────────────────────────────────

def test_notify_skips_if_no_token(caplog):
    with patch.object(dr, "BOT_TOKEN", ""), \
         patch.object(dr, "REVIEW_CHAT", "-100x"), \
         caplog.at_level("WARNING"):
        dr.notify_failure("step", "err")
    # Không có request.post được gọi — kiểm tra bằng cách không raise


def test_notify_sends_message():
    import requests as req_mod
    mock_post = MagicMock()
    with patch.object(dr, "BOT_TOKEN", "TOKEN"), \
         patch.object(dr, "REVIEW_CHAT", "-100x"), \
         patch("requests.post", mock_post):
        dr.notify_failure("Bước X", "lỗi chi tiết")
    mock_post.assert_called_once()
    payload = mock_post.call_args[1]["json"]
    assert payload["chat_id"] == "-100x"
    assert "Bước X" in payload["text"]


def test_notify_token_not_in_message():
    mock_post = MagicMock()
    with patch.object(dr, "BOT_TOKEN", "SUPERSECRET_TOKEN"), \
         patch.object(dr, "REVIEW_CHAT", "-100x"), \
         patch("requests.post", mock_post):
        dr.notify_failure("step", "detail")
    payload = mock_post.call_args[1]["json"]
    # URL chứa token, nhưng payload message không được chứa token
    assert "SUPERSECRET_TOKEN" not in payload["text"]
