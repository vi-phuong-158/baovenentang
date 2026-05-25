"""
Adapter Google Cloud Text-to-Speech.
Giọng Vietnamese WaveNet — chất lượng cao, miễn phí đến 1 triệu ký tự/tháng.

Voices Bắc:
  vi-VN-Wavenet-D — nam, trầm, phù hợp bản tin chính luận  ← mặc định
  vi-VN-Wavenet-A — nữ, rõ ràng
  vi-VN-Wavenet-B — nam, trung tính
  vi-VN-Wavenet-C — nữ, nhẹ nhàng

Biến môi trường:
  GOOGLE_APPLICATION_CREDENTIALS — đường dẫn file JSON service account
  GOOGLE_TTS_VOICE               — tên giọng (mặc định vi-VN-Wavenet-D)
  GOOGLE_TTS_SPEAKING_RATE       — tốc độ 0.5-2.0 (mặc định 0.95)
  GOOGLE_TTS_PITCH               — pitch -20.0 đến 20.0 semitones (mặc định 0.0)
"""

import logging
import os
from pathlib import Path

from .base import TTSBase

log = logging.getLogger(__name__)

DEFAULT_VOICE         = "vi-VN-Wavenet-D"
DEFAULT_SPEAKING_RATE = 0.95   # hơi chậm hơn bình thường, rõ hơn khi đọc bản tin
DEFAULT_PITCH         = 0.0


class GoogleTTS(TTSBase):
    def __init__(
        self,
        credentials_file: str | None = None,
        voice: str | None = None,
        speaking_rate: float | None = None,
        pitch: float | None = None,
    ) -> None:
        # Credentials: tham số > env var GOOGLE_APPLICATION_CREDENTIALS
        cred = credentials_file or os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
        if cred:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(cred)

        self.voice         = voice or os.getenv("GOOGLE_TTS_VOICE", DEFAULT_VOICE)
        self.speaking_rate = float(speaking_rate or os.getenv("GOOGLE_TTS_SPEAKING_RATE", DEFAULT_SPEAKING_RATE))
        self.pitch         = float(pitch or os.getenv("GOOGLE_TTS_PITCH", DEFAULT_PITCH))

    def synthesize(self, text: str, output_path: Path) -> None:
        try:
            from google.cloud import texttospeech
        except ImportError:
            raise RuntimeError(
                "Thiếu thư viện google-cloud-texttospeech. "
                "Chạy: pip install google-cloud-texttospeech"
            )

        log.info(f"[GoogleTTS] voice={self.voice} rate={self.speaking_rate} ({len(text)} ký tự)")

        client = texttospeech.TextToSpeechClient()

        synthesis_input = texttospeech.SynthesisInput(text=text)

        voice_params = texttospeech.VoiceSelectionParams(
            language_code="vi-VN",
            name=self.voice,
        )

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=self.speaking_rate,
            pitch=self.pitch,
        )

        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice_params,
            audio_config=audio_config,
        )

        output_path.parent.mkdir(exist_ok=True)
        output_path.write_bytes(response.audio_content)

        size_kb = output_path.stat().st_size // 1024
        if size_kb < 1:
            raise RuntimeError(f"GoogleTTS: output quá nhỏ ({size_kb} KB)")

        log.info(f"[GoogleTTS] → {output_path} ({size_kb} KB)")
