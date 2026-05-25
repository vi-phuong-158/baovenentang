"""
Adapter OpenAI TTS — backup cuối cùng.
Model: tts-1 hoặc tts-1-hd. Voice: alloy (không có giọng Việt native).
Chất lượng tiếng Việt kém hơn edge-tts/FPT.AI — chỉ dùng khi không còn lựa chọn.
"""

import logging
import os
from pathlib import Path

from .base import TTSBase

log = logging.getLogger(__name__)


class OpenAITTS(TTSBase):
    def __init__(
        self,
        api_key: str | None = None,
        model: str = "tts-1",
        voice: str = "alloy",
    ) -> None:
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.model   = model
        self.voice   = voice

    def synthesize(self, text: str, output_path: Path) -> None:
        if not self.api_key:
            raise RuntimeError("OpenAI TTS: thiếu OPENAI_API_KEY")

        try:
            from openai import OpenAI
        except ImportError:
            raise RuntimeError("OpenAI TTS: cần cài 'pip install openai'")

        log.info(f"[OpenAITTS] model={self.model} voice={self.voice} ({len(text)} ký tự)")
        client = OpenAI(api_key=self.api_key)
        with client.audio.speech.with_streaming_response.create(
            model=self.model,
            voice=self.voice,
            input=text,
        ) as response:
            output_path.parent.mkdir(exist_ok=True)
            response.stream_to_file(str(output_path))

        log.info(f"[OpenAITTS] → {output_path} ({output_path.stat().st_size // 1024} KB)")
