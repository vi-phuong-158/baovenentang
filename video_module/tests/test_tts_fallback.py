"""Test cho synthesize_with_fallback: timeout per-provider + chuyển fallback +
chống race khi primary timeout xong vẫn cố ghi đè output."""

import importlib
import sys
import threading
import time
from pathlib import Path
from unittest.mock import patch

import pytest

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

mv = importlib.import_module("scripts.04_make_voice")


class _FakeAdapter:
    def __init__(self, name: str, behavior: str = "ok",
                 delay: float = 0.0, payload: bytes = b"\x00" * 16,
                 done_event: threading.Event | None = None):
        self._name = name
        self.behavior = behavior
        self.delay = delay
        self.payload = payload
        self.called = False
        self.done_event = done_event

    def synthesize(self, text, output):
        self.called = True
        try:
            if self.delay:
                time.sleep(self.delay)
            if self.behavior == "ok":
                Path(output).write_bytes(self.payload)
                return
            if self.behavior == "raise":
                raise RuntimeError(f"{self._name} bị lỗi giả lập")
            if self.behavior == "empty":
                # Hoàn tất nhưng không ghi gì — sai bug
                return
            raise ValueError(f"behavior không hợp lệ: {self.behavior}")
        finally:
            # Báo hiệu thread đã chạy xong (kể cả nhánh return/raise) để test
            # chờ chính xác thay vì sleep cứng theo wall-clock.
            if self.done_event is not None:
                self.done_event.set()


def test_synthesize_uses_primary_when_ok(tmp_path):
    out = tmp_path / "voice.mp3"
    adapter = _FakeAdapter("edge", "ok", payload=b"EDGE_OUTPUT")
    with patch.object(mv, "get_adapter", return_value=adapter):
        used = mv.synthesize_with_fallback("xin chào", out, "edge", timeout=5)
    assert used == "edge"
    assert out.read_bytes() == b"EDGE_OUTPUT"


def test_synthesize_falls_back_on_exception(tmp_path):
    out = tmp_path / "voice.mp3"
    adapters = {
        "edge":   _FakeAdapter("edge", "raise"),
        "google": _FakeAdapter("google", "ok", payload=b"GOOGLE_OK"),
        "fpt":    _FakeAdapter("fpt", "ok"),
    }

    def factory(provider):
        if provider not in adapters:
            raise ValueError(provider)
        return adapters[provider]

    with patch.object(mv, "get_adapter", side_effect=factory):
        used = mv.synthesize_with_fallback("text", out, "edge", timeout=5)

    assert used == "google"
    assert out.read_bytes() == b"GOOGLE_OK"
    assert adapters["edge"].called


def test_synthesize_times_out_and_moves_on(tmp_path):
    out = tmp_path / "voice.mp3"
    slow = _FakeAdapter("edge", "ok", delay=2.0, payload=b"SLOW_PAYLOAD")
    fast = _FakeAdapter("google", "ok", payload=b"FAST_PAYLOAD")

    def factory(provider):
        return slow if provider == "edge" else fast

    with patch.object(mv, "get_adapter", side_effect=factory):
        used = mv.synthesize_with_fallback("text", out, "edge", timeout=0.3)

    assert used == "google"
    assert out.read_bytes() == b"FAST_PAYLOAD"


def test_slow_primary_does_not_overwrite_fallback_output(tmp_path):
    """REGRESSION: trước fix, primary thread bị abandon vẫn ghi đè output.
    Bây giờ primary chỉ chạm temp file riêng, không ảnh hưởng output cuối."""
    out = tmp_path / "voice.mp3"
    slow_done = threading.Event()
    slow = _FakeAdapter("edge", "ok", delay=1.0, payload=b"PRIMARY_LATE_WRITE",
                        done_event=slow_done)
    fast = _FakeAdapter("google", "ok", payload=b"FALLBACK_FAST")

    def factory(provider):
        return slow if provider == "edge" else fast

    with patch.object(mv, "get_adapter", side_effect=factory):
        used = mv.synthesize_with_fallback("text", out, "edge", timeout=0.2)

    assert used == "google"
    assert out.read_bytes() == b"FALLBACK_FAST"

    # Chờ chính xác đến khi primary thread hoàn tất (không sleep cứng → hết flaky)
    assert slow_done.wait(timeout=5), "primary thread không kết thúc trong 5s"

    # Output vẫn phải là của fallback, không bị primary ghi đè
    assert out.read_bytes() == b"FALLBACK_FAST", (
        "Race condition: primary thread đã ghi đè output sau khi timeout"
    )


def test_synthesize_skips_provider_that_does_not_write_file(tmp_path):
    """Adapter buggy hoàn tất nhưng không tạo file → phải bỏ qua, không return success."""
    out = tmp_path / "voice.mp3"
    buggy = _FakeAdapter("edge", "empty")
    good  = _FakeAdapter("google", "ok", payload=b"GOOD")

    def factory(provider):
        return buggy if provider == "edge" else good

    with patch.object(mv, "get_adapter", side_effect=factory):
        used = mv.synthesize_with_fallback("text", out, "edge", timeout=5)

    assert used == "google"
    assert out.read_bytes() == b"GOOD"


def test_synthesize_all_fail_raises(tmp_path):
    out = tmp_path / "voice.mp3"
    adapter = _FakeAdapter("any", "raise")
    with patch.object(mv, "get_adapter", return_value=adapter):
        with pytest.raises(RuntimeError, match="Tất cả TTS provider"):
            mv.synthesize_with_fallback("text", out, "edge", timeout=1)


def test_env_int_handles_empty_string(monkeypatch):
    monkeypatch.setenv("TEST_VAR_EMPTY", "")
    assert mv._env_int("TEST_VAR_EMPTY", 99) == 99


def test_env_int_handles_invalid_string(monkeypatch):
    monkeypatch.setenv("TEST_VAR_BAD", "not-a-number")
    assert mv._env_int("TEST_VAR_BAD", 42) == 42


def test_env_int_parses_valid(monkeypatch):
    monkeypatch.setenv("TEST_VAR_OK", "300")
    assert mv._env_int("TEST_VAR_OK", 0) == 300
