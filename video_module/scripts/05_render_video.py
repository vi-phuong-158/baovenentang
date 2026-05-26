"""
Bước 5: Render video từ scenes.json dùng HyperFrames.

Sinh hyperframes/index.html động từ scenes data, chạy hyperframes render.
Input:  data/scenes.json
Output: output/video_raw.mp4
"""

import html
import re
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

# Cho phép import scripts.image_picker
import sys as _sys
if str(ROOT) not in _sys.path:
    _sys.path.insert(0, str(ROOT))
from scripts.image_picker import ImagePicker

SCENES_FILE = ROOT / "data" / "scenes.json"
HF_DIR      = ROOT / "hyperframes"
HF_INDEX    = HF_DIR / "index.html"
HF_LIB_DIR  = HF_DIR / "library"
OUTPUT_RAW  = ROOT / "output" / "video_raw.mp4"

BROWSER_PATH = os.getenv(
    "HYPERFRAMES_BROWSER_PATH",
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def find_ffmpeg_dir() -> str | None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        return str(Path(ffmpeg).parent)

    winget_root = Path.home() / "AppData" / "Local" / "Microsoft" / "WinGet" / "Packages"
    if winget_root.exists():
        matches = sorted(
            winget_root.glob("**/ffmpeg.exe"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if matches:
            return str(matches[0].parent)

    return None


SCENE_META = {
    "intro":   {"label": "BẢN TIN NGÀY"},
    "summary": {"label": "TỔNG QUAN"},
    "news1":   {"label": "TIN QUAN TRỌNG"},
    "news2":   {"label": "TIN QUAN TRỌNG"},
    "news3":   {"label": "HÔM NAY CẦN BIẾT"},
    "briefs":  {"label": "TIN NGẮN"},
    "message": {"label": "THÔNG ĐIỆP"},
    "cta":     {"label": "TRỢ LÝ 35"},
}

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Bricolage+Grotesque:wght@700;800&display=swap');

* { margin:0; padding:0; box-sizing:border-box; }
body { 
  width:1080px; 
  background:#0C0B0A; 
  font-family:'Be Vietnam Pro',Arial,sans-serif; 
  overflow:hidden; 
  -webkit-font-smoothing: antialiased;
}
.scene {
  position:absolute; top:0; left:0;
  width:1080px; height:1920px;
  display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  opacity:0; overflow:hidden;
}

/* Background image layer (Ken Burns zoom target) */
.bg-image {
  position:absolute; top:0; left:0;
  width:100%; height:100%;
  object-fit:cover;
  z-index:0;
  transform-origin: center center;
  will-change: transform;
}
.bg-overlay {
  position:absolute; top:0; left:0;
  width:100%; height:100%;
  background: linear-gradient(180deg, rgba(12,11,10,0.55) 0%, rgba(12,11,10,0.85) 100%);
  z-index:1;
  pointer-events:none;
}
.scene > .bar, .scene > .logo-strip, .scene > .content, .scene > .subtitle-bar {
  z-index:2;
}

/* Background Gradients */
.bg-intro {
  background: radial-gradient(circle at 50% 50%, #4E1411 0%, #120302 100%);
}
.bg-summary {
  background: radial-gradient(circle at 50% 50%, #0F2D59 0%, #050A10 100%);
}
.bg-news {
  background: radial-gradient(circle at 50% 50%, #5E1A15 0%, #150403 100%);
}
.bg-briefs {
  background: radial-gradient(circle at 50% 50%, #1C2333 0%, #07090D 100%);
}
.bg-message {
  background: radial-gradient(circle at 50% 50%, #543E15 0%, #100B02 100%);
}
.bg-cta {
  background: radial-gradient(circle at 50% 50%, #3B0D0B 0%, #0D0303 100%);
}

/* Borders & Decorative Elements */
.bar { 
  position:absolute; left:0; right:0; height:12px;
  background:linear-gradient(90deg, #B83227 0%, #F4C20D 50%, #B83227 100%); 
  box-shadow: 0 0 15px rgba(184, 50, 39, 0.4);
}
.bar-top    { top:0; }
.bar-bottom { bottom:0; }

/* Header Branding */
.logo-strip {
  position:absolute; top:70px; left:60px; right:60px; height:120px;
  display:flex; align-items:center; justify-content:center; gap:20px;
  border-bottom:2px solid rgba(244, 194, 13, 0.2);
  padding-bottom:24px;
}
.logo-img { 
  height:90px; width:90px; 
  border-radius:50%; 
  object-fit:contain; 
  border: 3px solid #F4C20D;
  box-shadow: 0 0 20px rgba(244, 194, 13, 0.3);
}
.logo-text { 
  font-family:'Bricolage Grotesque',sans-serif;
  font-size:38px; font-weight:800; color:#fff; 
  text-transform:uppercase; letter-spacing:2px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

/* Content Area & Glass Card */
.content {
  position: absolute;
  top: 240px; bottom: 380px; left: 0; right: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 0 60px;
}
.content-card {
  background: rgba(26, 20, 16, 0.55);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 2px solid rgba(244, 194, 13, 0.15);
  border-radius: 36px;
  padding: 60px 48px;
  width: 960px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 36px;
  text-align: center;
}

/* Typography styles */
.headline {
  font-family:'Bricolage Grotesque',sans-serif;
  font-size:60px; font-weight:800; color:#fff;
  text-align:center; line-height:1.25; letter-spacing:-1px;
  text-shadow: 0 4px 16px rgba(0,0,0,0.4);
  word-break: keep-all;
  overflow-wrap: break-word;
}
.body-text {
  font-family:'Be Vietnam Pro',sans-serif;
  font-size:42px; font-weight:500; color:#E5DDC8; 
  text-align:center; line-height:1.5;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.message-text {
  font-family:'Bricolage Grotesque',sans-serif;
  font-size:56px; font-weight:700; color:#F4C20D; 
  text-align:center; line-height:1.4;
  text-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.cta-url { 
  font-family:'Bricolage Grotesque',sans-serif;
  font-size:52px; font-weight:800; color:#1A1410; 
  background: linear-gradient(135deg, #F4C20D, #E5B205);
  padding: 18px 44px;
  border-radius: 99px;
  box-shadow: 0 12px 28px rgba(244, 194, 13, 0.4);
  border: 2px solid #FFFFFF;
  display: inline-block;
  letter-spacing: 1px;
}

/* Subtitle bubble */
.subtitle-bar {
  position:absolute; bottom:140px; left:80px; right:80px;
  padding: 28px 40px;
  border-radius: 28px;
  background: rgba(15, 13, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  text-align:center; 
  font-family:'Be Vietnam Pro',sans-serif;
  font-size:44px; font-weight:600; color:#F4EFE3;
  line-height:1.5; letter-spacing:0.5px;
}
.sub-word {
  opacity: 0.35;
  color: #A89D8A;
  transition: color 0.12s ease, opacity 0.12s ease;
  display: inline-block;
  margin: 0 6px;
}
"""


def _e(text: str) -> str:
    """HTML escape."""
    return html.escape(str(text))


def _vo_preview(voiceover: str) -> str:
    """Lấy toàn bộ voiceover để hiển thị làm phụ đề đầy đủ (đã escape)."""
    return _e(voiceover.strip())


# Regex phát hiện số hiệu văn bản để bọc trong white-space: nowrap
DOC_NUM_RE = re.compile(r"(\b\d+/\d+/[A-ZĐa-zđ0-9-]+|\b\d+-[A-ZĐ]+/TW|\b\d+/[A-ZĐa-zđ]{2,8}-[A-ZĐa-zđ]{2,8})")

def wrap_doc_numbers(text: str) -> str:
    return DOC_NUM_RE.sub(r'<span style="white-space: nowrap;">\1</span>', text)


def build_scene_div(scene: dict, bg_image_rel: str | None = None) -> str:
    sid  = scene["id"]
    meta = SCENE_META.get(sid, {"label": sid.upper()})
    label = _e(meta["label"])

    headline = wrap_doc_numbers(_e(scene.get("headline", "")))
    text     = wrap_doc_numbers(_e(scene.get("text", "")))
    vo       = _vo_preview(scene.get("voiceover", ""))

    start = scene["start"]
    dur   = scene["duration"]

    bg_class = f"bg-{sid}" if sid in ["intro", "summary", "briefs", "message", "cta"] else "bg-news"
    bg_img_html = ""
    if bg_image_rel:
        bg_img_html = (
            f'    <img class="bg-image" id="bg-{sid}" src="{_e(bg_image_rel)}" alt="">\n'
            f'    <div class="bg-overlay"></div>'
        )

    # Nội dung body thay đổi theo loại scene
    if sid == "message":
        body_html = f'<div class="message-text" id="{sid}-text">{text}</div>'
    elif sid == "cta":
        # Chuẩn hóa hiển thị tên web đúng chuẩn troly35.info.vn
        web_display = text.replace("https://", "").replace("http://", "").replace("www.", "").strip("/")
        if "baovenentang" in web_display or "vercel" in web_display or not web_display:
            web_display = "troly35.info.vn"
        body_html = f'''
      <div class="headline" id="{sid}-headline">{headline}</div>
      <div class="cta-url" id="{sid}-url">{web_display}</div>'''
    else:
        body_html = f'''
      <div class="headline" id="{sid}-headline">{headline}</div>
      <div class="body-text" id="{sid}-text">{text}</div>'''

    # Tách các từ trong subtitle để có thể animate từng từ bám sát tiếng thuyết minh
    words = vo.split()
    words_html = "".join(f'<span class="sub-word">{w}</span> ' for w in words)

    return f"""
  <!-- {sid}: t={start}..{start+dur}s -->
  <div class="scene clip {bg_class}" id="scene-{sid}"
       data-start="{start}" data-duration="{dur}" data-track-index="0">
{bg_img_html}
    <div class="bar bar-top"></div>
    <div class="bar bar-bottom"></div>
    <div class="logo-strip">
      <img src="logo.png" class="logo-img" alt="Logo">
      <span class="logo-text">{label}</span>
    </div>
    <div class="content">
      <div class="content-card">
        {body_html}
      </div>
    </div>
    <div class="subtitle-bar" id="{sid}-subtitle">{words_html}</div>
  </div>"""


def build_gsap_block(scenes: list[dict], total_dur: float) -> str:
    lines = ["  const tl = gsap.timeline({ paused: true });", ""]
    for s in scenes:
        sid   = s["id"]
        start = s["start"]
        dur   = s["duration"]
        fade  = min(0.5, dur * 0.08)
        out_t = start + dur - fade

        vo = s.get("voiceover", "").strip()
        words_count = len(vo.split())
        speech_duration = max(0.5, dur - 1.2)
        stagger_delay = round(speech_duration / max(1, words_count), 4)

        lines.append(f"  // {sid}: {start}s → {start+dur}s")
        lines.append(f"  tl.to('#scene-{sid}', {{opacity:1, duration:{fade}}}, {start+0.1});")
        # Ken Burns: zoom nhẹ ảnh nền suốt thời lượng scene
        lines.append(f"  tl.fromTo('#bg-{sid}', {{scale:1.0}}, {{scale:1.08, duration:{dur}, ease:'none'}}, {start});")
        lines.append(f"  tl.to('#scene-{sid} .logo-strip', {{opacity:1, y:0, duration:{fade}}}, {start+0.2});")
        lines.append(f"  tl.to('#scene-{sid} .content-card', {{opacity:1, y:0, duration:{fade}}}, {start+0.25});")
        if sid != "message":
            lines.append(f"  tl.to('#{sid}-headline', {{opacity:1, y:0, duration:{fade}}}, {start+0.35});")
        lines.append(f"  tl.to('#{sid}-text, #{sid}-url', {{opacity:1, duration:{fade}}}, {start+0.5});")
        lines.append(f"  tl.to('#{sid}-subtitle', {{opacity:1, duration:{fade}}}, {start+0.5});")
        if words_count > 0:
            lines.append(f"  tl.to('#scene-{sid} .sub-word', {{opacity:1, color:'#F4C20D', duration:0.15, stagger:{stagger_delay}}}, {start+0.7});")
        lines.append(f"  tl.to('#scene-{sid}', {{opacity:0, duration:{fade}}}, {out_t});")
        lines.append("")

    # Hold đến total duration
    lines.append(f"  tl.to({{}}, {{duration:0.001}}, {total_dur - 0.001});")
    lines.append("  window.__timelines = window.__timelines || {};")
    lines.append("  window.__timelines['troly35-daily'] = tl;")
    return "\n".join(lines)


def generate_index_html(scenes: dict, scene_bg_map: dict[str, str | None] | None = None) -> str:
    scene_list = scenes["scenes"]
    total_dur  = scenes.get("duration_seconds") or sum(s["duration"] for s in scene_list)
    scene_bg_map = scene_bg_map or {}

    # Khởi tạo opacity:0 và y:30 cho tất cả animated elements
    init_js_parts = []
    for s in scene_list:
        sid = s["id"]
        init_js_parts.append(
            f"  gsap.set(['#scene-{sid}', '#scene-{sid} .logo-strip', '#scene-{sid} .content-card', "
            f"'#{sid}-headline', '#{sid}-text', '#{sid}-url', '#{sid}-subtitle'], "
            f"{{opacity:0, y:30}});"
        )

    scene_divs   = "\n".join(build_scene_div(s, scene_bg_map.get(s["id"])) for s in scene_list)
    init_js      = "\n".join(init_js_parts)
    gsap_block   = build_gsap_block(scene_list, total_dur)

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <style>{CSS}</style>
</head>
<body>
<div id="root" data-composition-id="troly35-daily"
     data-start="0" data-width="1080" data-height="1920"
     style="position:relative;width:1080px;height:1920px;overflow:hidden;background:#000;">
{scene_divs}
</div>
<script src="./node_modules/gsap/dist/gsap.min.js"></script>
<script>
{init_js}

{gsap_block}
</script>
</body>
</html>
"""


def run(
    scenes_file: Path = SCENES_FILE,
    output: Path      = OUTPUT_RAW,
) -> Path:
    if not scenes_file.exists():
        log.error(f"Thiếu scenes.json: {scenes_file}")
        log.error("Chạy 02_make_script.py và 03_validate_script.py trước.")
        sys.exit(1)

    # Đảm bảo logo.png tồn tại trong thư mục hyperframes
    src_logo = ROOT.parent / "web" / "logo.png"
    if not src_logo.exists():
        src_logo = ROOT.parent / "logo.png"
    
    if src_logo.exists():
        try:
            shutil.copy2(src_logo, HF_DIR / "logo.png")
            log.info(f"Đã copy logo từ {src_logo} sang {HF_DIR / 'logo.png'}")
        except Exception as e:
            log.warning(f"Không thể copy logo.png: {e}")
    else:
        log.warning("Không tìm thấy logo.png ở thư mục gốc hoặc thư mục web")

    scenes = json.loads(scenes_file.read_text(encoding="utf-8"))
    n_scenes = len(scenes.get("scenes", []))
    total    = scenes.get("duration_seconds", "?")
    log.info(f"Render {n_scenes} scenes, {total}s → {output.name}")

    # Chọn ảnh nền cho mỗi scene + copy vào hyperframes/library/
    picker = ImagePicker()
    HF_LIB_DIR.mkdir(parents=True, exist_ok=True)
    # Xoá cache ảnh từ lần render trước để tránh tích lũy
    for old in HF_LIB_DIR.glob("*"):
        if old.is_file():
            try:
                old.unlink()
            except Exception:
                pass

    scene_bg_map: dict[str, str | None] = {}
    for s in scenes.get("scenes", []):
        sid = s.get("id", "")
        cat = s.get("visual_category") or "default"
        picked = picker.pick(cat)
        if picked and picked.exists():
            dest_name = f"{sid}_{picked.name}"
            dest = HF_LIB_DIR / dest_name
            try:
                shutil.copy2(picked, dest)
                scene_bg_map[sid] = f"library/{dest_name}"
            except Exception as e:
                log.warning(f"Copy ảnh nền cho {sid} thất bại: {e}")
                scene_bg_map[sid] = None
        else:
            scene_bg_map[sid] = None
            log.info(f"Scene '{sid}' không có ảnh nền (kho trống cho '{cat}')")

    # Sinh index.html
    html_content = generate_index_html(scenes, scene_bg_map)
    HF_INDEX.write_text(html_content, encoding="utf-8")
    log.info(f"Đã sinh {HF_INDEX} ({len(html_content)} bytes)")

    # Chạy hyperframes render
    output.parent.mkdir(exist_ok=True)
    env = os.environ.copy()
    ffmpeg_dir = find_ffmpeg_dir()
    if ffmpeg_dir:
        env["PATH"] = ffmpeg_dir + os.pathsep + env.get("PATH", "")
        log.info(f"FFmpeg: {ffmpeg_dir}")
    if BROWSER_PATH and Path(BROWSER_PATH).exists():
        env["HYPERFRAMES_BROWSER_PATH"] = BROWSER_PATH
        log.info(f"Browser: {BROWSER_PATH}")

    npx_cmd = shutil.which("npx") or shutil.which("npx.cmd") or "npx"
    cmd = [
        npx_cmd, "hyperframes", "render", ".",
        "-o", str(output),
        "--resolution", "portrait",
        "-f", "30",
    ]
    log.info(f"Chạy: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=HF_DIR, env=env, capture_output=True, text=True)

    # In stdout/stderr của hyperframes
    if result.stdout:
        for line in result.stdout.strip().splitlines():
            log.info(f"[HF] {line}")
    if result.stderr:
        for line in result.stderr.strip().splitlines():
            log.info(f"[HF] {line}")

    if result.returncode != 0:
        log.error(f"hyperframes render thất bại (exit {result.returncode})")
        sys.exit(1)

    if not output.exists():
        log.error(f"Output không tồn tại sau render: {output}")
        sys.exit(1)

    size_mb = output.stat().st_size / (1024 * 1024)
    log.info(f"→ {output.name} ({size_mb:.1f} MB)")
    return output


if __name__ == "__main__":
    run()
