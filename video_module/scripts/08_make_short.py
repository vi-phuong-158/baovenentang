"""
Bước 8: Tạo bản ngắn ~30s cho TikTok / Reels / Shorts từ final.mp4.

Cắt và nối các scene chính (hook + tổng quan + tin nổi bật + CTA) từ video đầy đủ
đã có sẵn voiceover + nhạc nền, nên giữ nguyên đồng bộ tiếng/hình. Đây là artifact
DẪN XUẤT, KHÔNG đi qua validator 8-scene.

Input:  output/final.mp4 + data/scenes.json
Output: output/final_short.mp4

Bước này là TÙY CHỌN: nếu thiếu input hoặc ffmpeg lỗi, chỉ log cảnh báo và exit 0
để không chặn pipeline chính (bản đầy đủ đã sẵn sàng từ bước 06).
"""

import json
import os
import shutil
import subprocess
import sys
import logging
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

FINAL_FULL   = ROOT / "output" / "final.mp4"
SCENES_FILE  = ROOT / "data"   / "scenes.json"
OUTPUT_SHORT = ROOT / "output" / "final_short.mp4"

DEFAULT_SHORT_SCENES = "intro,summary,news1,cta"
DEFAULT_MAX_SECONDS  = 35.0
KEEP_ALWAYS          = ("intro", "cta")  # luôn giữ hook + CTA

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


def _max_seconds() -> float:
    try:
        return max(8.0, float(os.getenv("SHORT_MAX_SECONDS", str(DEFAULT_MAX_SECONDS))))
    except (TypeError, ValueError):
        return DEFAULT_MAX_SECONDS


def _wanted_ids() -> list[str]:
    raw = os.getenv("SHORT_SCENES", DEFAULT_SHORT_SCENES)
    return [x.strip() for x in raw.split(",") if x.strip()]


def select_segments(scenes: dict, wanted_ids: list[str], max_seconds: float) -> list[tuple[float, float, str]]:
    """Chọn các scene mong muốn theo thứ tự timeline; nếu quá dài thì bỏ bớt scene to nhất
    (trừ intro/cta) cho đến khi <= max_seconds."""
    wanted = set(wanted_ids)
    chosen = [s for s in scenes.get("scenes", []) if s.get("id") in wanted]
    chosen.sort(key=lambda s: float(s.get("start", 0)))

    def total(items: list[dict]) -> float:
        return sum(float(s.get("duration", 0)) for s in items)

    while total(chosen) > max_seconds and len(chosen) > 2:
        removable = [s for s in chosen if s.get("id") not in KEEP_ALWAYS]
        if not removable:
            break
        victim = max(removable, key=lambda s: float(s.get("duration", 0)))
        chosen.remove(victim)
        log.info(f"Bỏ scene '{victim.get('id')}' khỏi bản ngắn để đạt mục tiêu {max_seconds:.0f}s")

    segments = []
    for s in chosen:
        start = float(s.get("start", 0))
        dur = float(s.get("duration", 0))
        if dur > 0:
            segments.append((start, start + dur, s.get("id", "")))
    return segments


def render_segments(src: Path, segments: list[tuple[float, float, str]], out: Path) -> bool:
    """Cắt từng đoạn scene từ src rồi nối lại bằng filter_complex (re-encode)."""
    parts = []
    concat_inputs = []
    for i, (start, end, _sid) in enumerate(segments):
        parts.append(f"[0:v]trim=start={start:.3f}:end={end:.3f},setpts=PTS-STARTPTS[v{i}]")
        parts.append(f"[0:a]atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS[a{i}]")
        concat_inputs.append(f"[v{i}][a{i}]")

    filter_complex = (
        ";".join(parts)
        + ";"
        + "".join(concat_inputs)
        + f"concat=n={len(segments)}:v=1:a=1[v][a]"
    )

    cmd = [
        find_ffmpeg(), "-y",
        "-i", str(src),
        "-filter_complex", filter_complex,
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-crf", "24", "-preset", "medium",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(out),
    ]
    return _run_ffmpeg(cmd, "short:segments")


def trim_head(src: Path, seconds: float, out: Path) -> bool:
    """Fallback: cắt nhanh `seconds` giây đầu khi không có thông tin scene."""
    cmd = [
        find_ffmpeg(), "-y",
        "-i", str(src),
        "-t", f"{seconds:.3f}",
        "-c:v", "libx264", "-crf", "24", "-preset", "medium",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(out),
    ]
    return _run_ffmpeg(cmd, "short:trim-head")


def _run_ffmpeg(cmd: list[str], label: str) -> bool:
    log.info(f"FFmpeg [{label}]: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log.warning(f"FFmpeg [{label}] lỗi (bỏ qua bản ngắn):\n{result.stderr[-800:]}")
        return False
    return True


def run(
    full_video: Path = FINAL_FULL,
    scenes_file: Path = SCENES_FILE,
    output: Path = OUTPUT_SHORT,
) -> Path | None:
    if not full_video.exists():
        log.warning(f"Không có {full_video} — bỏ qua tạo bản ngắn.")
        return None

    output.parent.mkdir(exist_ok=True)

    # Xóa bản short cũ NGAY đầu: nếu lần chạy hôm nay tạo short lỗi, không được để
    # file short của lần chạy trước sót lại khiến bước đăng duyệt gửi nhầm bản cũ.
    output.unlink(missing_ok=True)
    tmp_output = output.with_suffix(".tmp.mp4")
    tmp_output.unlink(missing_ok=True)

    max_seconds = _max_seconds()

    segments: list[tuple[float, float, str]] = []
    if scenes_file.exists():
        try:
            scenes = json.loads(scenes_file.read_text(encoding="utf-8"))
            segments = select_segments(scenes, _wanted_ids(), max_seconds)
        except Exception as e:  # noqa: BLE001 — bản ngắn là tùy chọn
            log.warning(f"Đọc scenes.json lỗi ({e}) — sẽ cắt nhanh phần đầu.")

    if segments:
        ids = ", ".join(sid for _, _, sid in segments)
        approx = sum(end - start for start, end, _ in segments)
        log.info(f"Bản ngắn gồm {len(segments)} scene [{ids}] ~{approx:.0f}s")
        ok = render_segments(full_video, segments, tmp_output)
    else:
        log.warning(f"Không xác định được scene — cắt {max_seconds:.0f}s đầu của final.mp4.")
        ok = trim_head(full_video, max_seconds, tmp_output)

    # Chỉ "công bố" bản short khi render thành công: thay thế nguyên tử từ file tạm.
    if ok and tmp_output.exists() and tmp_output.stat().st_size > 0:
        os.replace(tmp_output, output)
        size_mb = output.stat().st_size / (1024 * 1024)
        log.info(f"→ {output.name} ({size_mb:.1f} MB)")
        return output

    tmp_output.unlink(missing_ok=True)
    log.warning("Không tạo được bản ngắn — pipeline vẫn tiếp tục với bản đầy đủ (đã xóa short cũ).")
    return None


if __name__ == "__main__":
    run()
    # Luôn exit 0: bản ngắn là phụ, không được chặn bước đăng duyệt.
    sys.exit(0)
