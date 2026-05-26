"""
Unit tests cho 07_post_telegram_review.py.
Không gọi Telegram thật — mock requests.post.
"""

import hashlib
import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch, mock_open

import importlib

import pytest

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

# Tên module bắt đầu bằng số → phải dùng importlib
post = importlib.import_module("scripts.07_post_telegram_review")


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def fake_video(tmp_path):
    """File MP4 giả có đủ kích thước."""
    p = tmp_path / "final.mp4"
    p.write_bytes(b"\x00" * 2048)
    return p


def _mock_tg_response(message_id: int = 42, file_id: str = "FILEID123ABC") -> MagicMock:
    resp = MagicMock()
    resp.json.return_value = {
        "ok": True,
        "result": {
            "message_id": message_id,
            "video": {"file_id": file_id},
        },
    }
    return resp


# ── Tests: build_caption ──────────────────────────────────────────────────────

def test_caption_contains_draft_notice():
    cap = post.build_caption("25/05/2026")
    assert "BẢN NHÁP CHỜ DUYỆT" in cap
    assert "25/05/2026" in cap


def test_caption_no_token_in_text():
    cap = post.build_caption("01/01/2026")
    # Không có gì trông như bot token
    assert "bot" not in cap.lower() or "token" not in cap.lower()


# ── Tests: build_inline_keyboard ─────────────────────────────────────────────

def test_keyboard_has_two_buttons():
    kb = post.build_inline_keyboard()
    buttons = kb["inline_keyboard"][0]
    assert len(buttons) == 2


def test_keyboard_callback_data():
    kb = post.build_inline_keyboard()
    data = {b["callback_data"] for b in kb["inline_keyboard"][0]}
    assert "approve" in data
    assert "reject" in data


def test_keyboard_text_labels():
    kb = post.build_inline_keyboard()
    texts = {b["text"] for b in kb["inline_keyboard"][0]}
    assert any("Duyệt" in t for t in texts)
    assert any("Từ chối" in t for t in texts)


# ── Tests: sha256_file ────────────────────────────────────────────────────────

def test_sha256_file(tmp_path):
    p = tmp_path / "x.bin"
    p.write_bytes(b"hello")
    expected = hashlib.sha256(b"hello").hexdigest()
    assert post.sha256_file(p) == expected


def test_sha256_different_content(tmp_path):
    a, b = tmp_path / "a", tmp_path / "b"
    a.write_bytes(b"aaa")
    b.write_bytes(b"bbb")
    assert post.sha256_file(a) != post.sha256_file(b)


# ── Tests: save_pending ───────────────────────────────────────────────────────

def test_save_pending_creates_file(tmp_path, fake_video):
    pending = tmp_path / "data" / "pending_review.json"
    with patch.object(post, "PENDING_FILE", pending):
        post.save_pending(fake_video, {"message_id": 42, "file_id": "FID"})
    assert pending.exists()
    rec = json.loads(pending.read_text())
    assert rec["status"] == "pending"
    assert rec["message_id"] == 42
    assert rec["file_id"] == "FID"
    assert "created_at" in rec
    assert "file_hash" in rec
    assert rec["local_path"] == str(fake_video.resolve())


def test_save_pending_hash_matches(tmp_path, fake_video):
    pending = tmp_path / "data" / "pending_review.json"
    with patch.object(post, "PENDING_FILE", pending):
        post.save_pending(fake_video, {"message_id": 1, "file_id": ""})
    rec = json.loads(pending.read_text())
    assert rec["file_hash"] == post.sha256_file(fake_video)


def test_save_pending_no_token_in_record(tmp_path, fake_video):
    """Token không được lọt vào pending_review.json."""
    pending = tmp_path / "data" / "pending_review.json"
    with patch.object(post, "PENDING_FILE", pending), \
         patch.object(post, "BOT_TOKEN", "SECRET_TOKEN_XYZ"):
        post.save_pending(fake_video, {"message_id": 1, "file_id": ""})
    raw = pending.read_text()
    assert "SECRET_TOKEN_XYZ" not in raw


# ── Tests: send_video_for_review ─────────────────────────────────────────────

def test_send_video_calls_sendvideo_endpoint(fake_video):
    mock_resp = _mock_tg_response()
    with patch("requests.post", return_value=mock_resp) as mock_post, \
         patch.object(post, "BOT_TOKEN", "TOK"), \
         patch.object(post, "REVIEW_CHAT", "-100111"):
        post.send_video_for_review(fake_video)
    url = mock_post.call_args[0][0]
    assert "sendVideo" in url


def test_send_video_posts_to_review_chat(fake_video):
    mock_resp = _mock_tg_response()
    with patch("requests.post", return_value=mock_resp) as mock_post, \
         patch.object(post, "BOT_TOKEN", "TOK"), \
         patch.object(post, "REVIEW_CHAT", "-100999"):
        post.send_video_for_review(fake_video)
    data_sent = mock_post.call_args[1]["data"]
    assert data_sent["chat_id"] == "-100999"


def test_send_video_includes_inline_keyboard(fake_video):
    mock_resp = _mock_tg_response()
    with patch("requests.post", return_value=mock_resp) as mock_post, \
         patch.object(post, "BOT_TOKEN", "TOK"), \
         patch.object(post, "REVIEW_CHAT", "-100999"):
        post.send_video_for_review(fake_video)
    data_sent = mock_post.call_args[1]["data"]
    kb = json.loads(data_sent["reply_markup"])
    assert "inline_keyboard" in kb


def test_send_video_returns_message_id_and_file_id(fake_video):
    mock_resp = _mock_tg_response(message_id=77, file_id="FTEST")
    with patch("requests.post", return_value=mock_resp), \
         patch.object(post, "BOT_TOKEN", "TOK"), \
         patch.object(post, "REVIEW_CHAT", "-100999"):
        result = post.send_video_for_review(fake_video)
    assert result["message_id"] == 77
    assert result["file_id"] == "FTEST"


def test_send_video_api_error_raises(fake_video):
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"ok": False, "description": "Bad token"}
    with patch("requests.post", return_value=mock_resp), \
         patch.object(post, "BOT_TOKEN", "TOK"), \
         patch.object(post, "REVIEW_CHAT", "-100999"):
        with pytest.raises(RuntimeError, match="Bad token"):
            post.send_video_for_review(fake_video)


def test_send_video_token_not_logged(fake_video, caplog):
    """Token không được xuất hiện trong log."""
    mock_resp = _mock_tg_response()
    with patch("requests.post", return_value=mock_resp), \
         patch.object(post, "BOT_TOKEN", "SUPERSECRETTOKEN"), \
         patch.object(post, "REVIEW_CHAT", "-100999"), \
         caplog.at_level("DEBUG"):
        post.send_video_for_review(fake_video)
    assert "SUPERSECRETTOKEN" not in caplog.text


# ── Tests: run() guards ───────────────────────────────────────────────────────

def test_run_exits_if_no_token(tmp_path):
    with patch.object(post, "BOT_TOKEN", ""), \
         patch.object(post, "REVIEW_CHAT", "-100x"), \
         pytest.raises(SystemExit) as exc:
        post.run(tmp_path / "nonexistent.mp4")
    assert exc.value.code == 1


def test_run_exits_if_no_review_chat(tmp_path):
    with patch.object(post, "BOT_TOKEN", "TOK"), \
         patch.object(post, "REVIEW_CHAT", ""), \
         pytest.raises(SystemExit) as exc:
        post.run(tmp_path / "nonexistent.mp4")
    assert exc.value.code == 1


def test_run_exits_if_video_missing(tmp_path):
    with patch.object(post, "BOT_TOKEN", "TOK"), \
         patch.object(post, "REVIEW_CHAT", "-100x"), \
         pytest.raises(SystemExit) as exc:
        post.run(tmp_path / "no_such_file.mp4")
    assert exc.value.code == 1


# ── Tests: retry logic của _api ──────────────────────────────────────────────

import requests as _requests


def test_api_retries_on_connection_error(monkeypatch):
    """ConnectionError lần 1+2, thành công lần 3 → trả result, không sleep thật."""
    monkeypatch.setattr(post.time, "sleep", lambda _s: None)
    ok = MagicMock()
    ok.json.return_value = {"ok": True, "result": {"x": 1}}
    calls = [_requests.ConnectionError("boom"),
             _requests.ConnectionError("boom"),
             ok]

    def fake_post(url, **kw):
        c = calls.pop(0)
        if isinstance(c, Exception):
            raise c
        return c

    with patch("requests.post", side_effect=fake_post), \
         patch.object(post, "BOT_TOKEN", "TOK"):
        result = post._api("getMe")
    assert result == {"x": 1}


def test_api_retries_on_429_then_success(monkeypatch):
    monkeypatch.setattr(post.time, "sleep", lambda _s: None)
    too_many = MagicMock()
    too_many.json.return_value = {
        "ok": False, "error_code": 429,
        "description": "Too Many Requests",
        "parameters": {"retry_after": 1},
    }
    ok = MagicMock()
    ok.json.return_value = {"ok": True, "result": "ok"}
    responses = [too_many, ok]

    with patch("requests.post", side_effect=responses), \
         patch.object(post, "BOT_TOKEN", "TOK"):
        result = post._api("sendVideo")
    assert result == "ok"


def test_api_does_not_retry_on_permanent_error(monkeypatch):
    """Sai token (401) — không retry, fail luôn."""
    sleeps = []
    monkeypatch.setattr(post.time, "sleep", lambda s: sleeps.append(s))
    bad = MagicMock()
    bad.json.return_value = {
        "ok": False, "error_code": 401, "description": "Unauthorized",
    }
    with patch("requests.post", return_value=bad), \
         patch.object(post, "BOT_TOKEN", "TOK"):
        with pytest.raises(RuntimeError, match="Unauthorized"):
            post._api("sendVideo")
    assert sleeps == []  # không có retry


def test_api_gives_up_after_max_retries(monkeypatch):
    sleeps = []
    monkeypatch.setattr(post.time, "sleep", lambda s: sleeps.append(s))

    def always_fail(*_a, **_kw):
        raise _requests.Timeout("slow")

    with patch("requests.post", side_effect=always_fail), \
         patch.object(post, "BOT_TOKEN", "TOK"):
        with pytest.raises(RuntimeError, match="mất kết nối"):
            post._api("sendVideo")
    # Đã sleep MAX_RETRIES - 1 = 2 lần
    assert len(sleeps) == post.MAX_RETRIES - 1
