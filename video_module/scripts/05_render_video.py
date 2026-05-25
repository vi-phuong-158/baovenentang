"""
Bước 5: Render video từ scenes.json dùng HyperFrames.

Sinh hyperframes/index.html động từ scenes data, chạy hyperframes render.
Input:  data/scenes.json
Output: output/video_raw.mp4
"""

import html
import json
import os
import subprocess
import sys
import logging
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

SCENES_FILE = ROOT / "data" / "scenes.json"
HF_DIR      = ROOT / "hyperframes"
HF_INDEX    = HF_DIR / "index.html"
OUTPUT_RAW  = ROOT / "output" / "video_raw.mp4"

BROWSER_PATH = os.getenv(
    "HYPERFRAMES_BROWSER_PATH",
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

SCENE_META = {
    "intro":   {"icon": "🛡️", "label": "BẢN TIN NGÀY",      "bg": "#1a0505"},
    "summary": {"icon": "📋", "label": "TỔNG QUAN",          "bg": "#050518"},
    "news1":   {"icon": "🔴", "label": "TIN QUAN TRỌNG",    "bg": "#1a0808"},
    "news2":   {"icon": "🔴", "label": "TIN QUAN TRỌNG",    "bg": "#1a0808"},
    "news3":   {"icon": "🟡", "label": "HÔM NAY CẦN BIẾT",  "bg": "#1a1205"},
    "briefs":  {"icon": "📰", "label": "TIN NGẮN",           "bg": "#050512"},
    "message": {"icon": "💬", "label": "THÔNG ĐIỆP",         "bg": "#0a0a00"},
    "cta":     {"icon": "🛡️", "label": "TRỢ LÝ 35",          "bg": "#050505"},
}

CSS = """
* { margin:0; padding:0; box-sizing:border-box; }
body { width:1080px; background:#000; font-family:'Be Vietnam Pro',Arial,sans-serif; overflow:hidden; }
.scene {
  position:absolute; top:0; left:0;
  width:1080px; height:1920px;
  display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  opacity:0; overflow:hidden;
}
.bar { position:absolute; left:0; right:0; height:8px;
       background:linear-gradient(90deg,#cc0000,#ffcc00,#cc0000); }
.bar-top    { top:0; }
.bar-bottom { bottom:0; }
.logo-strip {
  position:absolute; top:55px; left:0; right:0;
  display:flex; align-items:center; justify-content:center; gap:16px;
}
.logo-icon { font-size:56px; }
.logo-text { font-size:34px; font-weight:700; color:#fff; letter-spacing:3px; }
.content {
  width:100%; padding:0 80px; margin-top:40px;
  display:flex; flex-direction:column; align-items:center; gap:40px;
}
.headline {
  font-size:80px; font-weight:700; color:#fff;
  text-align:center; line-height:1.2;
}
.body-text {
  font-size:52px; color:#ddd; text-align:center; line-height:1.5;
}
.message-text {
  font-size:52px; color:#ffcc00; text-align:center;
  line-height:1.5; font-style:italic;
}
.cta-url { font-size:44px; color:#ffcc00; word-break:break-all; text-align:center; }
.subtitle-bar {
  position:absolute; bottom:110px; left:60px; right:60px;
  text-align:center; font-size:50px; font-weight:500; color:#fff;
  line-height:1.4;
  text-shadow:0 0 8px #000,2px 2px 6px #000,-2px -2px 6px #000;
}
"""


def _e(text: str) -> str:
    """HTML escape."""
    return html.escape(str(text))


def _vo_preview(voiceover: str, max_chars: int = 100) -> str:
    """Lấy phần đầu voiceover để hiển thị làm subtitle (đã escape)."""
    text = voiceover.strip()[:max_chars]
    if len(voiceover.strip()) > max_chars:
        text += "…"
    return _e(text)


def build_scene_div(scene: dict) -> str:
    sid  = scene["id"]
    meta = SCENE_META.get(sid, {"icon": "📋", "label": sid.upper(), "bg": "#050505"})
    bg   = meta["bg"]
    icon = meta["icon"]
    label = _e(meta["label"])

    headline = _e(scene.get("headline", ""))
    text     = _e(scene.get("text", ""))
    vo       = _vo_preview(scene.get("voiceover", ""))

    start = scene["start"]
    dur   = scene["duration"]

    # Nội dung body thay đổi theo loại scene
    if sid == "message":
        body_html = f'<div class="message-text" id="{sid}-text">{text}</div>'
    elif sid == "cta":
        body_html = f'''
      <div class="headline" id="{sid}-headline">{headline}</div>
      <div class="cta-url" id="{sid}-url">{text}</div>'''
    else:
        body_html = f'''
      <div class="headline" id="{sid}-headline">{headline}</div>
      <div class="body-text" id="{sid}-text">{text}</div>'''

    return f"""
  <!-- {sid}: t={start}..{start+dur}s -->
  <div class="scene" id="scene-{sid}"
       data-start="{start}" data-duration="{dur}" data-track-index="0"
       style="background:{bg};">
    <div class="bar bar-top"></div>
    <div class="bar bar-bottom"></div>
    <div class="logo-strip">
      <span class="logo-icon">{icon}</span>
      <span class="logo-text">{label}</span>
    </div>
    <div class="content">{body_html}
    </div>
    <div class="subtitle-bar" id="{sid}-subtitle">{vo}</div>
  </div>"""


def build_gsap_block(scenes: list[dict], total_dur: float) -> str:
    lines = ["  const tl = gsap.timeline({ paused: true });", ""]
    for s in scenes:
        sid   = s["id"]
        start = s["start"]
        dur   = s["duration"]
        fade  = min(0.5, dur * 0.08)
        out_t = start + dur - fade

        lines.append(f"  // {sid}: {start}s → {start+dur}s")
        lines.append(f"  tl.to('#scene-{sid}', {{opacity:1, duration:{fade}}}, {start+0.1});")
        lines.append(f"  tl.to('#scene-{sid} .logo-strip', {{opacity:1, y:0, duration:{fade}}}, {start+0.2});")
        lines.append(f"  tl.to('#{sid}-headline', {{opacity:1, y:0, duration:{fade}}}, {start+0.35});")
        lines.append(f"  tl.to('#{sid}-text, #{sid}-url', {{opacity:1, duration:{fade}}}, {start+0.5});")
        lines.append(f"  tl.to('#{sid}-subtitle', {{opacity:1, duration:{fade}}}, {start+0.7});")
        lines.append(f"  tl.to('#scene-{sid}', {{opacity:0, duration:{fade}}}, {out_t});")
        lines.append("")

    # Hold đến total duration
    lines.append(f"  tl.to({{}}, {{duration:0.001}}, {total_dur - 0.001});")
    lines.append("  window.__timelines = { 'troly35-daily': tl };")
    return "\n".join(lines)


def generate_index_html(scenes: dict) -> str:
    scene_list = scenes["scenes"]
    total_dur  = scenes.get("duration_seconds") or sum(s["duration"] for s in scene_list)

    # Khởi tạo opacity:0 và y:30 cho tất cả animated elements
    init_js_parts = []
    for s in scene_list:
        sid = s["id"]
        init_js_parts.append(
            f"  gsap.set(['#scene-{sid}', '#scene-{sid} .logo-strip', "
            f"'#{sid}-headline', '#{sid}-text', '#{sid}-url', '#{sid}-subtitle'], "
            f"{{opacity:0, y:30}});"
        )

    scene_divs   = "\n".join(build_scene_div(s) for s in scene_list)
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

    scenes = json.loads(scenes_file.read_text(encoding="utf-8"))
    n_scenes = len(scenes.get("scenes", []))
    total    = scenes.get("duration_seconds", "?")
    log.info(f"Render {n_scenes} scenes, {total}s → {output.name}")

    # Sinh index.html
    html_content = generate_index_html(scenes)
    HF_INDEX.write_text(html_content, encoding="utf-8")
    log.info(f"Đã sinh {HF_INDEX} ({len(html_content)} bytes)")

    # Chạy hyperframes render
    output.parent.mkdir(exist_ok=True)
    env = os.environ.copy()
    if BROWSER_PATH and Path(BROWSER_PATH).exists():
        env["HYPERFRAMES_BROWSER_PATH"] = BROWSER_PATH
        log.info(f"Browser: {BROWSER_PATH}")

    cmd = [
        "npx", "hyperframes", "render", ".",
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
