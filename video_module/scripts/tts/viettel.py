"""
Adapter Viettel AI TTS — backup #2.
Voice: hn-quynhanh (giọng Bắc nữ), hn-thanhlong (giọng Bắc nam)
"""

import logging
import os
import base64
from pathlib import Path

import requests

from .base import TTSBase

log = logging.getLogger(__name__)

API_URL     = "https://viettelai.vn/tts/speech_synthesis"
API_TIMEOUT = 60


class ViettelTTS(TTSBase):
    def __init__(
        self,
        api_key: str | None = None,
        voice: str = "hn-thanhlong",
        speed: float = 1.0,
    ) -> None:
        self.api_key = api_key or os.getenv("VIETTEL_TTS_API_KEY", "")
        self.voice   = voice or os.getenv("VIETTEL_TTS_VOICE", "hn-thanhlong")
        self.speed   = speed

    def synthesize(self, text: str, output_path: Path) -> None:
        if not self.api_key:
            raise RuntimeError("Viettel TTS: thiếu VIETTEL_TTS_API_KEY")

        log.info(f"[ViettelTTS] voice={self.voice} ({len(text)} ký tự)")
        payload = {
            "text":     text,
            "voice":    self.voice,
            "speed":    self.speed,
            "tts_return_option": 2,  # 2 = base64
            "token":    self.api_key,
        }
        resp = requests.post(API_URL, json=payload, timeout=API_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        audio_b64 = data.get("voice") or data.get("audio") or ""
        if not audio_b64:
            raise RuntimeError(f"Viettel TTS: không có audio trong response: {data}")

        output_path.parent.mkdir(exist_ok=True)
        output_path.write_bytes(base64.b64decode(audio_b64))
        log.info(f"[ViettelTTS] → {output_path} ({output_path.stat().st_size // 1024} KB)")
