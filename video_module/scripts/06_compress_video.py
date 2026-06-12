"""
Bước 6: Ghép audio + nén video bằng FFmpeg.

Input:  output/video_raw.mp4 + audio/voiceover.mp3
Output: output/final.mp4

Mục tiêu: < 50 MB. Nếu vượt, tăng CRF tự động.
"""

import os
import subprocess
import sys
import logging
import shutil
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

VIDEO_RAW  = ROOT / "output" / "video_raw.mp4"
AUDIO_FILE = ROOT / "audio" / "voiceover.mp3"
OUTPUT     = ROOT / "output" / "final.mp4"
TEMP_FILE  = ROOT / "output" / "final_with_audio.mp4"

MUSIC_DIR  = ROOT / "assets" / "music"
MUSIC_EXTS = (".mp3", ".m4a", ".wav", ".ogg", ".aac")

MAX_SIZE_MB = 50
CRF_DEFAULT = 26
CRF_MAX     = 32

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def find_ffmpeg() -> str:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        return ffmpeg

    winget_root = Path.home() / "AppData" / "Local" / "Microsoft" / "WinGet" / "Packages"
    if winget_root.exists():
        matches = sorted(
            winget_root.glob("**/ffmpeg.exe"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if matches:
            return str(matches[0])

    return "ffmpeg"


def _run_ffmpeg(cmd: list[str], label: str, fatal: bool = True) -> bool:
    log.info(f"FFmpeg [{label}]: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log.error(f"FFmpeg [{label}] lỗi:\n{result.stderr[-1000:]}")
        if fatal:
            sys.exit(1)
        return False
    log.info(f"FFmpeg [{label}] xong.")
    return True


def merge_audio(video: Path, audio: Path, out: Path) -> None:
    """Ghép video_raw + voiceover.mp3 thành video có âm thanh."""
    cmd = [
        find_ffmpeg(), "-y",
        "-i", str(video),
        "-i", str(audio),
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest",
        "-map", "0:v:0", "-map", "1:a:0",
        str(out),
    ]
    _run_ffmpeg(cmd, "merge")


def _music_volume() -> float:
    """Âm lượng nhạc nền (0.0–1.0), đọc từ env, mặc định 0.18."""
    try:
        v = float(os.getenv("BACKGROUND_MUSIC_VOLUME", "0.18"))
    except (TypeError, ValueError):
        v = 0.18
    return max(0.0, min(1.0, v))


def find_music_file() -> Path | None:
    """Tìm nhạc nền: ưu tiên BACKGROUND_MUSIC_PATH, sau đó file đầu tiên trong assets/music/."""
    env_path = os.getenv("BACKGROUND_MUSIC_PATH", "").strip()
    if env_path:
        p = Path(env_path)
        if not p.is_absolute():
            p = ROOT / p
        if p.exists():
            return p
        log.warning(f"BACKGROUND_MUSIC_PATH không tồn tại: {p}")
    if MUSIC_DIR.exists():
        tracks = sorted(
            p for p in MUSIC_DIR.iterdir()
            if p.is_file() and p.suffix.lower() in MUSIC_EXTS
        )
        if tracks:
            return tracks[0]
    return None


def merge_audio_with_music(video: Path, voice: Path, music: Path, out: Path, music_volume: float) -> bool:
    """Ghép video + voiceover + nhạc nền (tự lặp) với ducking sidechain để giọng đọc luôn nổi rõ."""
    filter_complex = (
        "[1:a]aformat=sample_rates=44100:channel_layouts=stereo,asplit=2[vo][vsc];"
        f"[2:a]volume={music_volume},aformat=sample_rates=44100:channel_layouts=stereo[mvol];"
        "[mvol][vsc]sidechaincompress=threshold=0.03:ratio=12:attack=20:release=400[mduck];"
        "[vo][mduck]amix=inputs=2:duration=first:dropout_transition=2:normalize=0[aout]"
    )
    cmd = [
        find_ffmpeg(), "-y",
        "-i", str(video),
        "-i", str(voice),
        "-stream_loop", "-1", "-i", str(music),
        "-filter_complex", filter_complex,
        "-map", "0:v:0", "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "160k",
        "-shortest",
        str(out),
    ]
    return _run_ffmpeg(cmd, "merge+music", fatal=False)


def compress(src: Path, out: Path, crf: int = CRF_DEFAULT) -> None:
    """Nén H.264/AAC với CRF cho trước."""
    cmd = [
        find_ffmpeg(), "-y",
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

    # Bước 1: ghép audio (kèm nhạc nền có ducking nếu có)
    music = find_music_file()
    used_music = False
    if music:
        volume = _music_volume()
        log.info(f"Nhạc nền: {music.name} (volume={volume})")
        used_music = merge_audio_with_music(video_raw, audio_file, music, TEMP_FILE, volume)
        if not used_music:
            log.warning("Trộn nhạc nền thất bại — quay lại ghép voiceover đơn thuần.")
    else:
        log.info("Không có nhạc nền trong assets/music/ — chỉ dùng voiceover.")
    if not used_music:
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
