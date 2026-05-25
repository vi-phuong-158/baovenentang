"""
Adapter FPT.AI TTS — backup #1.
Free tier: ~10k ký tự/tháng. Vượt thì trả phí.
API: https://api.fpt.ai/hmi/tts/v5
Voices: banmai (nữ Bắc), leminh (nam Bắc)
"""

import logging
import os
from pathlib import Path

import requests

from .base import TTSBase

log = logging.getLogger(__name__)

API_URL    = "https://api.fpt.ai/hmi/tts/v5"
API_TIMEOUT = 60


class FptTTS(TTSBase):
    def __init__(
        self,
        api_key: str | None = None,
        voice: str = "leminh",
        speed: str = "0",
    ) -> None:
        self.api_key = api_key or os.getenv("FPT_AI_TTS_API_KEY", "")
        self.voice   = voice or os.getenv("FPT_AI_TTS_VOICE", "leminh")
        self.speed   = speed or os.getenv("FPT_AI_TTS_SPEED", "0")

    def synthesize(self, text: str, output_path: Path) -> None:
        if not self.api_key:
            raise RuntimeError("FPT.AI TTS: thiếu FPT_AI_TTS_API_KEY")

        log.info(f"[FptTTS] voice={self.voice} ({len(text)} ký tự)")
        headers = {
            "api-key": self.api_key,
            "voice":   self.voice,
            "speed":   self.speed,
            "Content-Type": "application/json",
        }
        resp = requests.post(
            API_URL,
            headers=headers,
            json=text,
            timeout=API_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        if "async" not in data:
            raise RuntimeError(f"FPT.AI TTS: response không có 'async': {data}")

        # Download audio file từ URL trả về
        audio_url = data["async"]
        audio_resp = requests.get(audio_url, timeout=API_TIMEOUT)
        audio_resp.raise_for_status()

        output_path.parent.mkdir(exist_ok=True)
        output_path.write_bytes(audio_resp.content)
        log.info(f"[FptTTS] → {output_path} ({output_path.stat().st_size // 1024} KB)")
