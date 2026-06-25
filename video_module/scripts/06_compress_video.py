"""
Bước 6: Ghép audio + nén video bằng FFmpeg.

Input:  output/video_raw.mp4 + audio/voiceover.mp3
Output: output/final.mp4

Mục tiêu: < 50 MB. Nếu vượt, tăng CRF tự động.
"""

import os
import json
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
SCENES_FILE = ROOT / "data" / "scenes.json"
OUTPUT     = ROOT / "output" / "final.mp4"
TEMP_FILE  = ROOT / "output" / "final_with_audio.mp4"
TEMP_SFX   = ROOT / "output" / "final_with_sfx.mp4"

MUSIC_DIR  = ROOT / "assets" / "music"
MUSIC_EXTS = (".mp3", ".m4a", ".wav", ".ogg", ".aac")

# ── SFX (RULE #6) — tùy chọn, đọc từ assets/sfx/, tự bỏ qua nếu trống ──────────
SFX_DIR  = ROOT / "assets" / "sfx"
SFX_EXTS = (".wav", ".mp3", ".ogg", ".m4a", ".aac")
# Mỗi "loại" SFX thử lần lượt các tên file (không phân biệt phần mở rộng).
SFX_MAP = {
    "transition": ["whoosh", "swoosh", "transition", "swipe"],
    "hook":       ["pop", "notify", "ding"],
    "cta":        ["success", "ding", "chime", "notify"],
}
SFX_DB = {"transition": -14.0, "hook": -12.0, "cta": -12.0}

MAX_SIZE_MB = 50
CRF_DEFAULT = 24   # bắt đầu chất lượng cao hơn; tăng CRF tự động nếu vượt size

# Dev escape hatch: render local không upload Telegram → cho phép > 50MB.
# Bật bằng ALLOW_OVERSIZE_OUTPUT=1 trong .env hoặc CLI env var.
ALLOW_OVERSIZE = os.getenv("ALLOW_OVERSIZE_OUTPUT", "").strip().lower() in ("1", "true", "yes")
CRF_MAX     = 32

# Loudness mục tiêu (RULE #8 loha-video-maker) — chuẩn hoá ở bước nén cuối.
TARGET_LUFS = -16.0
LOUDNORM_AF = f"loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=11"

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


def _sfx_enabled() -> bool:
    return os.getenv("SFX_ENABLED", "1").strip().lower() not in ("0", "false", "no", "off")


def find_sfx_pool(category: str) -> list[Path]:
    """Trả về DANH SÁCH file SFX khớp các tên ứng viên của category (để luân phiên,
    tránh lặp đúng một tiếng ở mọi chuyển cảnh — RULE #6)."""
    if not SFX_DIR.exists():
        return []
    pool: list[Path] = []
    for base in SFX_MAP.get(category, []):
        for ext in SFX_EXTS:
            p = SFX_DIR / f"{base}{ext}"
            if p.exists() and p not in pool:
                pool.append(p)
    return pool


def build_sfx_events(scenes: dict) -> list[tuple[Path, float, float]]:
    """Tạo danh sách (file, thời điểm giây, âm lượng dB) từ scenes.json:
    chuyển cảnh dùng SFX transition LUÂN PHIÊN (round-robin) để không lặp một tiếng;
    hook (intro) và cta ưu tiên SFX riêng, thiếu thì fallback sang pool transition."""
    scene_list = sorted(scenes.get("scenes", []), key=lambda s: float(s.get("start", 0)))
    if not scene_list:
        return []
    transition_pool = find_sfx_pool("transition")
    hook_pool       = find_sfx_pool("hook")
    cta_pool        = find_sfx_pool("cta")

    hook_sfx = hook_pool[0] if hook_pool else (transition_pool[0] if transition_pool else None)
    cta_sfx  = cta_pool[0]  if cta_pool  else (transition_pool[0] if transition_pool else None)

    events: list[tuple[Path, float, float]] = []
    trans_i = 0  # con trỏ round-robin qua transition_pool

    def next_transition() -> Path | None:
        nonlocal trans_i
        if not transition_pool:
            return None
        f = transition_pool[trans_i % len(transition_pool)]
        trans_i += 1
        return f

    for s in scene_list:
        sid   = s.get("id", "")
        start = float(s.get("start", 0))
        if sid == "intro":
            if hook_sfx:
                events.append((hook_sfx, max(0.0, start + 0.15), SFX_DB["hook"]))
        elif sid == "cta":
            if cta_sfx:
                events.append((cta_sfx, start, SFX_DB["cta"]))
            elif start > 0.05:
                t = next_transition()
                if t:
                    events.append((t, start, SFX_DB["transition"]))
        elif start > 0.05:
            t = next_transition()
            if t:
                events.append((t, start, SFX_DB["transition"]))
    return events


def mix_sfx(video_with_audio: Path, events: list[tuple[Path, float, float]], out: Path) -> bool:
    """Chèn các SFX vào đúng giây trên audio sẵn có (giọng [+ nhạc]). Không fatal."""
    inputs: list[str] = ["-i", str(video_with_audio)]
    for f, _, _ in events:
        inputs += ["-i", str(f)]

    parts, labels = [], []
    for i, (_f, t, db) in enumerate(events):
        ms = max(0, int(round(t * 1000)))
        idx = i + 1
        parts.append(
            f"[{idx}:a]aformat=sample_rates=44100:channel_layouts=stereo,"
            f"volume={db}dB,adelay={ms}|{ms}[s{i}]"
        )
        labels.append(f"[s{i}]")

    n = len(events) + 1
    filter_complex = (
        ";".join(parts)
        + ";[0:a]" + "".join(labels)
        + f"amix=inputs={n}:duration=first:normalize=0[aout]"
    )
    cmd = [find_ffmpeg(), "-y"] + inputs + [
        "-filter_complex", filter_complex,
        "-map", "0:v:0", "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "160k",
        str(out),
    ]
    return _run_ffmpeg(cmd, "sfx", fatal=False)


def compress(src: Path, out: Path, crf: int = CRF_DEFAULT) -> None:
    """Nén H.264/AAC với CRF cho trước; chuẩn hoá loudness về ~-16 LUFS (RULE #8)."""
    cmd = [
        find_ffmpeg(), "-y",
        "-i", str(src),
        "-c:v", "libx264",
        "-crf", str(crf),
        "-preset", "medium",
        "-af", LOUDNORM_AF,
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

    # Bước 1b: chèn SFX (tùy chọn) — bỏ qua nếu tắt hoặc không có file trong assets/sfx/
    compress_src = TEMP_FILE
    if _sfx_enabled():
        events: list[tuple[Path, float, float]] = []
        if SCENES_FILE.exists():
            try:
                scenes = json.loads(SCENES_FILE.read_text(encoding="utf-8"))
                events = build_sfx_events(scenes)
            except Exception as e:  # noqa: BLE001 — SFX là tùy chọn
                log.warning(f"Đọc scenes.json cho SFX lỗi ({e}) — bỏ qua SFX.")
        if events:
            log.info(f"Chèn {len(events)} SFX vào {SFX_DIR.name}/...")
            if mix_sfx(TEMP_FILE, events, TEMP_SFX):
                compress_src = TEMP_SFX
            else:
                log.warning("Trộn SFX thất bại — dùng audio không SFX.")
        else:
            log.info("Không có file SFX phù hợp trong assets/sfx/ — bỏ qua SFX.")
    else:
        log.info("SFX_ENABLED=0 — bỏ qua SFX.")

    # Bước 2: nén, tăng CRF nếu vượt 50 MB
    crf = CRF_DEFAULT
    final_mb = float("inf")
    while crf <= CRF_MAX:
        compress(compress_src, output, crf)
        final_mb = output.stat().st_size / (1024 * 1024)
        log.info(f"CRF={crf} → {final_mb:.1f} MB")
        if final_mb <= MAX_SIZE_MB:
            break
        crf += 2

    # Dọn file trung gian
    TEMP_FILE.unlink(missing_ok=True)
    TEMP_SFX.unlink(missing_ok=True)

    if final_mb > MAX_SIZE_MB:
        msg = (
            f"Vẫn {final_mb:.1f} MB > {MAX_SIZE_MB} MB sau CRF={CRF_MAX}. "
            f"Telegram bot upload sẽ reject file lớn hơn 50 MB."
        )
        if ALLOW_OVERSIZE:
            log.warning(msg + " ALLOW_OVERSIZE_OUTPUT=1 → tiếp tục (dev mode).")
        else:
            log.error(msg + " Đặt ALLOW_OVERSIZE_OUTPUT=1 nếu muốn render local không upload.")
            sys.exit(1)

    log.info(f"→ {output.name} ({final_mb:.1f} MB)")
    return output


if __name__ == "__main__":
    run()
