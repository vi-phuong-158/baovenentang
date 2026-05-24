"""
Bước 3: Validate scenes.json với extracted_facts.json.
Đây là cổng an toàn quan trọng nhất — fail thì dừng pipeline.

Input:  data/scenes.json + data/extracted_facts.json
Output: exit 0 (hợp lệ) hoặc exit 1 (có lỗi)
"""

import re
import json
import sys
import logging
from pathlib import Path

ROOT = Path(__file__).parent.parent
SCENES_FILE = ROOT / "data" / "scenes.json"
FACTS_FILE = ROOT / "data" / "extracted_facts.json"

REQUIRED_SCENE_IDS = {"intro", "summary", "news1", "news2", "news3", "briefs", "message", "cta"}
DURATION_MIN = 60
DURATION_MAX = 90
MAX_TEXT_WORDS = 12
MAX_HEADLINE_WORDS = 6

# Dùng lại pattern từ extractor (suffix cho phép chữ số — QH15, QH14)
GOV_DOC_RE = re.compile(
    r"\b(\d{1,4}/\d{4}/[A-ZĐa-zđ][A-ZĐa-zđ0-9]{1,11}(?:-[A-ZĐa-zđ]{2,10})?)\b"
)
PARTY_DOC_RE = re.compile(r"\b(\d{1,4}-[A-ZĐ]{2,4}/TW)\b")
# LOCAL_DOC_RE dùng trong extractor; validator chỉ dùng 2 pattern trên
# để tránh false positive khi kiểm tra hallucination

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def find_doc_numbers(text: str) -> set[str]:
    found: set[str] = set()
    for m in GOV_DOC_RE.finditer(text):
        found.add(m.group(1))
    for m in PARTY_DOC_RE.finditer(text):
        found.add(m.group(1))
    return found


def validate(scenes: dict, facts: dict) -> list[str]:
    errors: list[str] = []
    scene_list = scenes.get("scenes", [])

    # 1. Đúng 8 scene
    scene_ids = {s.get("id") for s in scene_list}
    missing = REQUIRED_SCENE_IDS - scene_ids
    extra = scene_ids - REQUIRED_SCENE_IDS
    if missing:
        errors.append(f"Thiếu scene id: {sorted(missing)}")
    if extra:
        errors.append(f"Scene id không hợp lệ: {sorted(extra)}")
    if len(scene_list) != 8:
        errors.append(f"Phải có đúng 8 scene, thực tế: {len(scene_list)}")

    # 2. Tổng thời lượng
    total = scenes.get("duration_seconds") or sum(s.get("duration", 0) for s in scene_list)
    if not (DURATION_MIN <= total <= DURATION_MAX):
        errors.append(f"Tổng thời lượng {total}s ngoài khoảng [{DURATION_MIN}, {DURATION_MAX}]")

    # 3. start phải liên tục (start[i+1] == start[i] + duration[i])
    sorted_scenes = sorted(scene_list, key=lambda s: s.get("start", 0))
    cursor = 0
    for s in sorted_scenes:
        s_start = s.get("start", 0)
        s_dur = s.get("duration", 0)
        if abs(s_start - cursor) > 1:
            errors.append(
                f"Scene '{s.get('id')}': start={s_start} không khớp cursor={cursor}"
            )
        cursor = s_start + s_dur

    # 4. Số hiệu văn bản trong scenes phải có trong facts
    facts_doc_numbers = {d["number"] for d in facts.get("legal_documents", [])}
    for scene in scene_list:
        blob = " ".join([
            scene.get("headline", ""),
            scene.get("text", ""),
            scene.get("voiceover", ""),
        ])
        found = find_doc_numbers(blob)
        for num in found:
            if num not in facts_doc_numbers:
                errors.append(
                    f"Scene '{scene.get('id')}': số hiệu '{num}' không có trong facts. "
                    f"Facts có: {sorted(facts_doc_numbers)}"
                )

    # 5. Text không quá dài
    for scene in scene_list:
        text = scene.get("text", "")
        words = len(text.split())
        if words > MAX_TEXT_WORDS:
            errors.append(
                f"Scene '{scene.get('id')}': text có {words} từ, tối đa {MAX_TEXT_WORDS}"
            )
        headline = scene.get("headline", "")
        hw = len(headline.split())
        if hw > MAX_HEADLINE_WORDS:
            errors.append(
                f"Scene '{scene.get('id')}': headline có {hw} từ, tối đa {MAX_HEADLINE_WORDS}"
            )

    # 6. Voiceover không rỗng
    for scene in scene_list:
        if not scene.get("voiceover", "").strip():
            errors.append(f"Scene '{scene.get('id')}': voiceover rỗng")

    return errors


def run(
    scenes_file: Path = SCENES_FILE,
    facts_file: Path = FACTS_FILE,
) -> bool:
    for f in [scenes_file, facts_file]:
        if not f.exists():
            log.error(f"Thiếu file: {f}")
            sys.exit(1)

    scenes = json.loads(scenes_file.read_text(encoding="utf-8"))
    facts = json.loads(facts_file.read_text(encoding="utf-8"))

    log.info("Bắt đầu validate scenes.json...")
    errors = validate(scenes, facts)

    if errors:
        log.error(f"Validation FAILED — {len(errors)} lỗi:")
        for e in errors:
            log.error(f"  ✗ {e}")
        sys.exit(1)

    scene_count = len(scenes.get("scenes", []))
    duration = scenes.get("duration_seconds", sum(s.get("duration", 0) for s in scenes.get("scenes", [])))
    log.info(f"Validation PASSED — {scene_count} scenes, {duration}s")
    return True


if __name__ == "__main__":
    run()
