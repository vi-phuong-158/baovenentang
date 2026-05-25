"""
Bước 6: Ghép audio + nén video bằng FFmpeg.

Input:  output/video_raw.mp4 + audio/voiceover.mp3
Output: output/final.mp4

Mục tiêu: < 50 MB. Nếu vượt, tăng CRF tự động.
"""

import subprocess
import sys
import logging
from pathlib import Path

ROOT = Path(__file__).parent.parent

VIDEO_RAW  = ROOT / "output" / "video_raw.mp4"
AUDIO_FILE = ROOT / "audio" / "voiceover.mp3"
OUTPUT     = ROOT / "output" / "final.mp4"
TEMP_FILE  = ROOT / "output" / "final_with_audio.mp4"

MAX_SIZE_MB = 50
CRF_DEFAULT = 26
CRF_MAX     = 32

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def _run_ffmpeg(cmd: list[str], label: str) -> None:
    log.info(f"FFmpeg [{label}]: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log.error(f"FFmpeg [{label}] lỗi:\n{result.stderr[-1000:]}")
        sys.exit(1)
    log.info(f"FFmpeg [{label}] xong.")


def merge_audio(video: Path, audio: Path, out: Path) -> None:
    """Ghép video_raw + voiceover.mp3 thành video có âm thanh."""
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video),
        "-i", str(audio),
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest",
        "-map", "0:v:0", "-map", "1:a:0",
        str(out),
    ]
    _run_ffmpeg(cmd, "merge")


def compress(src: Path, out: Path, crf: int = CRF_DEFAULT) -> None:
    """Nén H.264/AAC với CRF cho trước."""
    cmd = [
        "ffmpeg", "-y",
        "-i", str(src),
        "-c:v", "libx264",
        "-crf", str(crf),
        "-preset", "medium",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(out),
    ]
    _run_ffmpeg(cmd, f"compress CRF={crf}")


def run(
    video_raw: Path  = VIDEO_RAW,
    audio_file: Path = AUDIO_FILE,
    output: Path     = OUTPUT,
) -> Path:
    # Kiểm tra đầu vào
    if not video_raw.exists():
        log.error(f"Thiếu video_raw: {video_raw}")
        sys.exit(1)
    if not audio_file.exists():
        log.error(f"Thiếu voiceover: {audio_file}")
        sys.exit(1)

    output.parent.mkdir(exist_ok=True)

    # Bước 1: ghép audio
    merge_audio(video_raw, audio_file, TEMP_FILE)

    # Bước 2: nén, tăng CRF nếu vượt 50 MB
    crf = CRF_DEFAULT
    while crf <= CRF_MAX:
        compress(TEMP_FILE, output, crf)
        size_mb = output.stat().st_size / (1024 * 1024)
        log.info(f"CRF={crf} → {size_mb:.1f} MB")
        if size_mb <= MAX_SIZE_MB:
            break
        crf += 2
        if crf > CRF_MAX:
            log.warning(f"Vẫn > {MAX_SIZE_MB} MB sau CRF={CRF_MAX}. Tiếp tục.")

    # Dọn file trung gian
    TEMP_FILE.unlink(missing_ok=True)

    final_mb = output.stat().st_size / (1024 * 1024)
    log.info(f"→ {output.name} ({final_mb:.1f} MB)")

    if final_mb > MAX_SIZE_MB:
        log.warning(f"Video lớn hơn {MAX_SIZE_MB} MB — cân nhắc giảm bitrate hoặc rút ngắn duration.")

    return output


if __name__ == "__main__":
    run()
