"""
Bước 4: Chuẩn hoá văn bản và tổng hợp voiceover.

Input:  data/scenes.json + data/tts_dictionary.json
Output: audio/voiceover.mp3

Provider được chọn qua biến môi trường TTS_PROVIDER (mặc định: edge).
"""

import json
import os
import re
import sys
import logging
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

# Thêm ROOT vào path để import scripts.tts.*
import sys as _sys
if str(ROOT) not in _sys.path:
    _sys.path.insert(0, str(ROOT))

SCENES_FILE  = ROOT / "data" / "scenes.json"
DICT_FILE    = ROOT / "data" / "tts_dictionary.json"
OUTPUT_AUDIO = ROOT / "audio" / "voiceover.mp3"

TTS_PROVIDER = os.getenv("TTS_PROVIDER", "edge")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# ── Regex số hiệu văn bản ────────────────────────────────────────────────────

GOV_DOC_RE   = re.compile(r"\b(\d{1,4})/(\d{4})/([A-ZĐa-zđ][A-ZĐa-zđ0-9]{1,11}(?:-[A-ZĐa-zđ]{2,10})?)\b")
PARTY_DOC_RE = re.compile(r"\b(\d{1,4})-([A-ZĐ]{2,4}/TW)\b")


# ── Normalizer ────────────────────────────────────────────────────────────────

def spell_digits(s: str) -> str:
    """Đọc từng chữ số: '181' → 'một tám một'."""
    digit_map = {
        "0": "không", "1": "một", "2": "hai", "3": "ba", "4": "bốn",
        "5": "năm",   "6": "sáu", "7": "bảy", "8": "tám", "9": "chín",
    }
    return " ".join(digit_map.get(c, c) for c in s)


def _doc_type_label(suffix: str, dictionary: dict) -> str:
    """Tra doc_type_label từ suffix văn bản."""
    prefix_map = dictionary.get("doc_type_prefix", {})
    su = suffix.upper()
    for k, v in prefix_map.items():
        if k.upper() in su:
            return v
    return suffix


def expand_gov_doc(m: re.Match, dictionary: dict) -> str:
    """181/2026/NĐ-CP → 'Nghị định số một tám một năm hai không hai sáu của Chính phủ'."""
    num, year, suffix = m.group(1), m.group(2), m.group(3)
    issuer = _doc_type_label(suffix, dictionary)

    # Tìm label loại văn bản
    label_map = dictionary.get("doc_type_label", {})
    su = suffix.upper()
    label = "Văn bản số"
    for k, v in label_map.items():
        if su.startswith(k):
            label = v
            break

    # Đọc số: "181" → "một tám một", "2026" → "hai không hai sáu"
    num_spoken  = spell_digits(num)
    year_spoken = spell_digits(year)
    return f"{label} {num_spoken} năm {year_spoken} {issuer}"


def expand_party_doc(m: re.Match, dictionary: dict) -> str:
    """57-NQ/TW → 'Nghị quyết số năm mươi bảy của Bộ Chính trị'."""
    num, suffix = m.group(1), m.group(2)
    issuer = _doc_type_label(suffix, dictionary)
    label_map = dictionary.get("doc_type_label", {})
    su = suffix.split("/")[0].upper()
    label = "Văn bản số"
    for k, v in label_map.items():
        if su.startswith(k):
            label = v
            break
    num_spoken = spell_digits(num)
    return f"{label} {num_spoken} {issuer}"


def expand_abbreviations(text: str, dictionary: dict) -> str:
    """Mở rộng viết tắt theo dictionary."""
    abbr = dictionary.get("abbreviations", {})
    # Tìm và thay thế theo word boundary (tránh thay giữa từ)
    for abbr_key, full in abbr.items():
        pattern = r"\b" + re.escape(abbr_key) + r"\b"
        text = re.sub(pattern, full, text)
    return text


def normalize_text(text: str, dictionary: dict) -> str:
    """Chuẩn hoá text voiceover trước khi gửi TTS."""
    # 1. Expand số hiệu văn bản Chính phủ
    text = GOV_DOC_RE.sub(lambda m: expand_gov_doc(m, dictionary), text)
    # 2. Expand số hiệu văn bản Đảng
    text = PARTY_DOC_RE.sub(lambda m: expand_party_doc(m, dictionary), text)
    # 3. Expand viết tắt
    text = expand_abbreviations(text, dictionary)
    return text


def build_full_script(scenes: dict, dictionary: dict) -> str:
    """Ghép tất cả voiceover của 8 scene thành một đoạn văn đọc liên tục."""
    parts = []
    for scene in scenes.get("scenes", []):
        vo = scene.get("voiceover", "").strip()
        if vo:
            normalized = normalize_text(vo, dictionary)
            parts.append(normalized)
    # Nối bằng dấu chấm + khoảng trắng để TTS tạo pause tự nhiên giữa các scene
    return ". ".join(parts) + "."


# ── Adapter factory ───────────────────────────────────────────────────────────

def get_adapter(provider: str):
    provider = provider.lower().strip()
    if provider == "edge":
        from scripts.tts.edge import EdgeTTS
        voice = os.getenv("EDGE_TTS_VOICE", "vi-VN-NamMinhNeural")
        rate  = os.getenv("EDGE_TTS_RATE", "+0%")
        return EdgeTTS(voice=voice, rate=rate)
    elif provider == "fpt":
        from scripts.tts.fpt import FptTTS
        return FptTTS()
    elif provider == "viettel":
        from scripts.tts.viettel import ViettelTTS
        return ViettelTTS()
    elif provider == "openai":
        from scripts.tts.openai_tts import OpenAITTS
        return OpenAITTS()
    elif provider == "espeak":
        from scripts.tts.espeak import EspeakTTS
        return EspeakTTS()
    else:
        raise ValueError(f"TTS provider không hợp lệ: {provider}. Chọn: edge | fpt | viettel | openai | espeak")


PROVIDER_FALLBACK_ORDER = ["edge", "fpt", "viettel", "openai", "espeak"]


def synthesize_with_fallback(text: str, output: Path, primary: str) -> str:
    """Thử primary trước, nếu fail thì thử lần lượt các fallback."""
    order = [primary] + [p for p in PROVIDER_FALLBACK_ORDER if p != primary]
    for provider in order:
        try:
            adapter = get_adapter(provider)
            log.info(f"Thử TTS provider: {provider}")
            adapter.synthesize(text, output)
            log.info(f"TTS thành công với provider: {provider}")
            return provider
        except Exception as e:
            log.warning(f"TTS provider '{provider}' thất bại: {e}")
    raise RuntimeError("Tất cả TTS provider đều thất bại.")


# ── Main ──────────────────────────────────────────────────────────────────────

def run(
    scenes_file: Path = SCENES_FILE,
    dict_file: Path   = DICT_FILE,
    output: Path      = OUTPUT_AUDIO,
    provider: str     = TTS_PROVIDER,
) -> Path:
    for f in [scenes_file]:
        if not f.exists():
            log.error(f"Thiếu file: {f}")
            sys.exit(1)

    scenes = json.loads(scenes_file.read_text(encoding="utf-8"))
    dictionary = json.loads(dict_file.read_text(encoding="utf-8")) if dict_file.exists() else {}

    full_script = build_full_script(scenes, dictionary)
    log.info(f"Script voiceover: {len(full_script)} ký tự")
    log.debug(f"Script (200 đầu): {full_script[:200]}")

    output.parent.mkdir(exist_ok=True)
    used_provider = synthesize_with_fallback(full_script, output, provider)

    size_kb = output.stat().st_size // 1024
    log.info(f"→ {output.name} ({size_kb} KB) via {used_provider}")
    return output


if __name__ == "__main__":
    run()
