"""
Adapter edge-tts — PRIMARY TTS provider.
Miễn phí, không giới hạn quota, giọng Bắc tốt.

Voices:
  vi-VN-NamMinhNeural  — nam, giọng Bắc, phù hợp bản tin chính luận
  vi-VN-HoaiMyNeural   — nữ, giọng Bắc
"""

import asyncio
import logging
from pathlib import Path

import edge_tts

from .base import TTSBase

log = logging.getLogger(__name__)

DEFAULT_VOICE = "vi-VN-NamMinhNeural"
DEFAULT_RATE  = "+0%"   # tốc độ đọc: có thể điều chỉnh "+5%" nhanh hơn hoặc "-5%" chậm hơn


class EdgeTTS(TTSBase):
    def __init__(
        self,
        voice: str = DEFAULT_VOICE,
        rate: str = DEFAULT_RATE,
    ) -> None:
        self.voice = voice
        self.rate = rate

    def synthesize(self, text: str, output_path: Path) -> None:
        log.info(f"[EdgeTTS] voice={self.voice} rate={self.rate} ({len(text)} ký tự)")
        output_path.parent.mkdir(exist_ok=True)
        asyncio.run(self._run(text, output_path))
        if not output_path.exists() or output_path.stat().st_size < 1000:
            raise RuntimeError(f"EdgeTTS: output file quá nhỏ hoặc không tồn tại: {output_path}")
        log.info(f"[EdgeTTS] → {output_path} ({output_path.stat().st_size // 1024} KB)")

    async def _run(self, text: str, output_path: Path) -> None:
        import ssl
        import edge_tts.communicate as _et_comm

        # edge-tts tạo _SSL_CTX lúc import — patch để bypass self-signed CA
        # (cloud env dùng corporate proxy với cert tự ký)
        _et_comm._SSL_CTX.check_hostname = False
        _et_comm._SSL_CTX.verify_mode = ssl.CERT_NONE

        communicate = edge_tts.Communicate(text, voice=self.voice, rate=self.rate)
        await communicate.save(str(output_path))
