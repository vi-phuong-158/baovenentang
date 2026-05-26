"""Test cho synthesize_with_fallback: timeout per-provider + chuyển fallback."""

import importlib
import sys
import time
from pathlib import Path
from unittest.mock import patch

import pytest

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

mv = importlib.import_module("scripts.04_make_voice")


class _FakeAdapter:
    def __init__(self, name: str, behavior: str = "ok", delay: float = 0.0):
        self._name = name
        self.behavior = behavior
        self.delay = delay
        self.called = False

    def synthesize(self, text, output):
        self.called = True
        if self.delay:
            time.sleep(self.delay)
        if self.behavior == "ok":
            Path(output).write_bytes(b"\x00" * 16)
            return
        if self.behavior == "raise":
            raise RuntimeError(f"{self._name} bị lỗi giả lập")
        raise ValueError(f"behavior không hợp lệ: {self.behavior}")


def test_synthesize_uses_primary_when_ok(tmp_path):
    out = tmp_path / "voice.mp3"
    adapter = _FakeAdapter("edge", "ok")
    with patch.object(mv, "get_adapter", return_value=adapter):
        used = mv.synthesize_with_fallback("xin chào", out, "edge", timeout=5)
    assert used == "edge"
    assert out.exists()


def test_synthesize_falls_back_on_exception(tmp_path):
    out = tmp_path / "voice.mp3"
    adapters = {
        "edge":   _FakeAdapter("edge", "raise"),
        "google": _FakeAdapter("google", "ok"),
        "fpt":    _FakeAdapter("fpt", "ok"),
    }

    def factory(provider):
        if provider not in adapters:
            raise ValueError(provider)
        return adapters[provider]

    with patch.object(mv, "get_adapter", side_effect=factory):
        used = mv.synthesize_with_fallback("text", out, "edge", timeout=5)

    # primary = edge → fail, next theo PROVIDER_FALLBACK_ORDER là google
    assert used == "google"
    assert adapters["edge"].called
    assert adapters["google"].called


def test_synthesize_times_out_and_moves_on(tmp_path):
    out = tmp_path / "voice.mp3"
    slow = _FakeAdapter("edge", "ok", delay=2.0)
    fast = _FakeAdapter("google", "ok")

    def factory(provider):
        return slow if provider == "edge" else fast

    with patch.object(mv, "get_adapter", side_effect=factory):
        used = mv.synthesize_with_fallback("text", out, "edge", timeout=0.3)

    assert used == "google"
    assert slow.called
    assert fast.called


def test_synthesize_all_fail_raises(tmp_path):
    out = tmp_path / "voice.mp3"
    adapter = _FakeAdapter("any", "raise")
    with patch.object(mv, "get_adapter", return_value=adapter):
        with pytest.raises(RuntimeError, match="Tất cả TTS provider"):
            mv.synthesize_with_fallback("text", out, "edge", timeout=1)
