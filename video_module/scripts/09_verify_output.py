"""
Bước 9: VERIFY output trước khi đăng duyệt (RULE #8 — loha-video-maker).

Cổng kiểm tra cuối cùng trên output/final.mp4 — chặn việc đăng video lỗi
(đen hình, mất tiếng, quá ngắn, loudness lệch) lên nhóm duyệt.

Input:  output/final.mp4 (bắt buộc) + output/final_short.mp4 (tùy chọn)
Output: exit 0 (đạt) hoặc exit 1 (lỗi nghiêm trọng — chặn pipeline)

Kiểm tra trên bản đầy đủ (final.mp4):
  1. File tồn tại, kích thước > 0
  2. Có cả luồng video + audio
  3. Thời lượng >= MIN_DURATION_SECONDS
  4. Khung hình KHÔNG đen: trích vài frame, đo YAVG (độ sáng trung bình) > ngưỡng
  5. Hook hiện ngay frame đầu (FIRST_FRAME_T): YAVG > ngưỡng đen (RULE #2)
  6. Loudness tích hợp gần -16 LUFS (chỉ CẢNH BÁO, không chặn)

Bản ngắn (final_short.mp4) chỉ kiểm tra nhẹ và CẢNH BÁO — không chặn pipeline,
vì nó là artifact tùy chọn.
"""

import re
import subprocess
import sys
import shutil
import logging
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

FINAL_FULL  = ROOT / "output" / "final.mp4"
FINAL_SHORT = ROOT / "output" / "final_short.mp4"
FRAME0_JPG  = ROOT / "output" / "verify_frame0.jpg"   # frame đầu xuất ra để soi trực quan

# ── Ngưỡng kiểm tra (RULE #8) ──────────────────────────────────────────────────
MIN_DURATION_SECONDS = 45.0   # video đầy đủ phải dài tối thiểu 45s
MIN_DURATION_SHORT   = 8.0    # bản ngắn tối thiểu 8s
BLACK_YAVG_THRESHOLD = 12.0   # YAVG (0-255) <= ngưỡng coi như khung hình đen
FIRST_FRAME_T        = 0.05   # giây — hook phải hiện đầy đủ NGAY frame đầu (RULE #2)
TARGET_LUFS          = -16.0  # loudness mục tiêu
LUFS_WARN_DELTA      = 3.0    # lệch quá ngưỡng này → cảnh báo (mục tiêu ~-16 LUFS)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


# ── Tìm ffmpeg / ffprobe (theo pattern các bước khác) ──────────────────────────

def _find_tool(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    winget_root = Path.home() / "AppData" / "Local" / "Microsoft" / "WinGet" / "Packages"
    if winget_root.exists():
        matches = sorted(
            winget_root.glob(f"**/{name}.exe"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if matches:
            return str(matches[0])
    return name


FFMPEG  = _find_tool("ffmpeg")
FFPROBE = _find_tool("ffprobe")


# ── Truy vấn metadata bằng ffprobe ─────────────────────────────────────────────

def get_duration(video: Path) -> float | None:
    cmd = [
        FFPROBE, "-v", "error",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        str(video),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return None
    try:
        return float(r.stdout.strip())
    except ValueError:
        return None


def has_stream(video: Path, kind: str) -> bool:
    """kind: 'v' (video) hoặc 'a' (audio)."""
    cmd = [
        FFPROBE, "-v", "error",
        "-select_streams", kind,
        "-show_entries", "stream=codec_type",
        "-of", "csv=p=0",
        str(video),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0 and bool(r.stdout.strip())


# ── Đo độ sáng khung hình (YAVG) ────────────────────────────────────────────────

def frame_brightness(video: Path, t: float) -> float | None:
    """Trích 1 frame tại giây t, trả về YAVG (độ sáng trung bình 0-255)."""
    cmd = [
        FFMPEG, "-hide_banner", "-ss", f"{t:.3f}",
        "-i", str(video),
        "-frames:v", "1",
        "-vf", "signalstats,metadata=print",
        "-f", "null", "-",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    m = re.search(r"lavfi\.signalstats\.YAVG=([\d.]+)", r.stderr)
    if m:
        return float(m.group(1))
    return None


def export_frame(video: Path, t: float, out: Path) -> bool:
    """Xuất 1 frame tại giây t ra ảnh JPG (để soi trực quan khi cần kiểm duyệt)."""
    cmd = [
        FFMPEG, "-hide_banner", "-y", "-ss", f"{t:.3f}",
        "-i", str(video),
        "-frames:v", "1",
        str(out),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0 and out.exists()


def check_not_black(video: Path, duration: float) -> tuple[bool, float]:
    """
    Trích vài frame rải đều ở giữa/cuối video, lấy YAVG lớn nhất.
    Trả về (đạt?, YAVG_max). Đạt nếu có ít nhất 1 frame sáng hơn ngưỡng.

    Frame đầu (hook) được kiểm riêng bằng check ở FIRST_FRAME_T (RULE #2 mới yêu cầu
    hook hiện đầy đủ ngay frame đầu để thumbnail nền tảng không bị đen).
    """
    samples = sorted({
        min(2.0, duration * 0.1),
        duration * 0.5,
        max(duration - 2.0, duration * 0.9),
    })
    brightnesses = []
    for t in samples:
        y = frame_brightness(video, t)
        if y is not None:
            brightnesses.append(y)
            log.info(f"  YAVG @ {t:.1f}s = {y:.1f}")
    if not brightnesses:
        log.warning("  Không đọc được YAVG của frame nào — bỏ qua kiểm tra đen.")
        return True, -1.0
    y_max = max(brightnesses)
    return y_max > BLACK_YAVG_THRESHOLD, y_max


# ── Đo loudness tích hợp (EBU R128) ─────────────────────────────────────────────

def integrated_lufs(video: Path) -> float | None:
    cmd = [
        FFMPEG, "-hide_banner", "-i", str(video),
        "-af", "ebur128", "-f", "null", "-",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    matches = re.findall(r"I:\s*(-?[\d.]+)\s*LUFS", r.stderr)
    if matches:
        try:
            return float(matches[-1])  # dòng tổng kết Integrated nằm cuối
        except ValueError:
            return None
    return None


# ── Kiểm tra 1 video ─────────────────────────────────────────────────────────

def verify_video(video: Path, *, min_duration: float, full: bool) -> list[str]:
    """Trả về danh sách lỗi nghiêm trọng (rỗng = đạt)."""
    errors: list[str] = []
    label = video.name

    if not video.exists() or video.stat().st_size == 0:
        errors.append(f"{label}: không tồn tại hoặc rỗng")
        return errors

    size_mb = video.stat().st_size / (1024 * 1024)
    log.info(f"[{label}] {size_mb:.1f} MB")

    # Streams
    if not has_stream(video, "v"):
        errors.append(f"{label}: thiếu luồng video")
    if not has_stream(video, "a"):
        errors.append(f"{label}: thiếu luồng audio (mất tiếng)")

    # Duration
    duration = get_duration(video)
    if duration is None:
        errors.append(f"{label}: không đọc được thời lượng")
        return errors
    log.info(f"[{label}] thời lượng {duration:.1f}s")
    if duration < min_duration:
        errors.append(f"{label}: thời lượng {duration:.1f}s < tối thiểu {min_duration:.0f}s")

    # Khung hình không đen
    ok_bright, y_max = check_not_black(video, duration)
    if not ok_bright:
        errors.append(
            f"{label}: khung hình có vẻ ĐEN (YAVG_max={y_max:.1f} <= {BLACK_YAVG_THRESHOLD})"
        )

    # Hook ở frame đầu — chỉ áp dụng bản đầy đủ. Nền tảng dùng frame đầu làm thumbnail
    # nên hook PHẢI hiện ngay, không được đen/trống (RULE #2).
    if full:
        y0 = frame_brightness(video, FIRST_FRAME_T)
        export_frame(video, FIRST_FRAME_T, FRAME0_JPG)
        if y0 is None:
            log.warning(f"[{label}] không đọc được YAVG frame đầu @ {FIRST_FRAME_T}s — bỏ qua check.")
        else:
            log.info(f"[{label}] YAVG frame đầu @ {FIRST_FRAME_T}s = {y0:.1f}")
            if y0 <= BLACK_YAVG_THRESHOLD:
                errors.append(
                    f"{label}: frame đầu @ {FIRST_FRAME_T}s ĐEN/TRỐNG (YAVG={y0:.1f} <= "
                    f"{BLACK_YAVG_THRESHOLD}) — hook chưa hiện ngay, thumbnail nền tảng sẽ bị đen"
                )

    # Loudness — chỉ áp dụng bản đầy đủ, CẢNH BÁO (không chặn)
    if full:
        lufs = integrated_lufs(video)
        if lufs is None:
            log.warning(f"[{label}] không đo được loudness.")
        else:
            log.info(f"[{label}] loudness {lufs:.1f} LUFS (mục tiêu {TARGET_LUFS})")
            if abs(lufs - TARGET_LUFS) > LUFS_WARN_DELTA:
                log.warning(
                    f"[{label}] loudness {lufs:.1f} LUFS lệch xa {TARGET_LUFS} "
                    f"(±{LUFS_WARN_DELTA}) — cân nhắc thêm loudnorm ở bước 06."
                )

    return errors


# ── Main ──────────────────────────────────────────────────────────────────────

def run(full_video: Path = FINAL_FULL, short_video: Path = FINAL_SHORT) -> bool:
    log.info("Bắt đầu VERIFY output (RULE #8)...")
    log.info(f"ffmpeg={FFMPEG} | ffprobe={FFPROBE}")

    # Bản đầy đủ = cổng chặn
    errors = verify_video(full_video, min_duration=MIN_DURATION_SECONDS, full=True)

    # Bản ngắn = chỉ cảnh báo, không chặn
    if short_video.exists():
        short_errors = verify_video(short_video, min_duration=MIN_DURATION_SHORT, full=False)
        for e in short_errors:
            log.warning(f"[bản ngắn — không chặn] {e}")
    else:
        log.info("Không có final_short.mp4 — bỏ qua kiểm tra bản ngắn.")

    if errors:
        log.error(f"VERIFY FAILED — {len(errors)} lỗi nghiêm trọng:")
        for e in errors:
            log.error(f"  ✗ {e}")
        sys.exit(1)

    log.info("VERIFY PASSED — final.mp4 sẵn sàng đăng duyệt.")
    return True


if __name__ == "__main__":
    run()
