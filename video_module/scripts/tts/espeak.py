"""
Adapter espeak-ng — offline fallback.
Chất lượng thấp hơn edge-tts nhưng không cần mạng/API key.
Dùng để test pipeline khi các provider có mạng bị chặn.

Cài: apt-get install espeak-ng  (Linux) / brew install espeak-ng  (Mac)
"""

import logging
import subprocess
from pathlib import Path

from .base import TTSBase

log = logging.getLogger(__name__)

ESPEAK_BIN = "espeak-ng"


class EspeakTTS(TTSBase):
    def __init__(self, voice: str = "vi", speed: int = 145) -> None:
        self.voice = voice    # "vi" = Vietnamese
        self.speed = speed    # words per minute

    def synthesize(self, text: str, output_path: Path) -> None:
        # espeak-ng → stdout (WAV/PCM) → FFmpeg → MP3
        log.info(f"[EspeakTTS] voice={self.voice} speed={self.speed} ({len(text)} ký tự)")
        output_path.parent.mkdir(exist_ok=True)

        espeak_cmd = [
            ESPEAK_BIN, "-v", self.voice, "-s", str(self.speed), "--stdout", text
        ]
        ffmpeg_cmd = [
            "ffmpeg", "-y", "-i", "pipe:0",
            "-codec:a", "libmp3lame", "-q:a", "4",
            str(output_path),
        ]

        esp = subprocess.Popen(espeak_cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        ff  = subprocess.run(ffmpeg_cmd, stdin=esp.stdout, capture_output=True)
        esp.stdout.close()
        esp.wait()

        if ff.returncode != 0:
            raise RuntimeError(f"FFmpeg encode lỗi: {ff.stderr[-200:]}")
        if not output_path.exists() or output_path.stat().st_size < 500:
            raise RuntimeError(f"EspeakTTS: output quá nhỏ: {output_path}")

        log.info(f"[EspeakTTS] → {output_path} ({output_path.stat().st_size // 1024} KB)")
