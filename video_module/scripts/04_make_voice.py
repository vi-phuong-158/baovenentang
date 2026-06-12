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
AUDIO_SYNC_TOLERANCE_SECONDS = 0.5

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


def _skip_id3v2(data: bytes) -> int:
    """Return byte offset after an optional ID3v2 tag."""
    if len(data) < 10 or data[:3] != b"ID3":
        return 0
    size = 0
    for b in data[6:10]:
        size = (size << 7) | (b & 0x7F)
    return 10 + size


def get_mp3_duration_seconds(path: Path) -> float:
    """Estimate MP3 duration by summing MPEG audio frame durations."""
    data = path.read_bytes()
    i = _skip_id3v2(data)
    total = 0.0

    bitrate_table = {
        3: {
            1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
            2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
            3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
        },
        2: {
            1: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
            2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
            3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
        },
    }
    sample_rate_table = {
        0: [11025, 12000, 8000, 0],
        2: [22050, 24000, 16000, 0],
        3: [44100, 48000, 32000, 0],
    }

    while i + 4 <= len(data):
        header = int.from_bytes(data[i:i + 4], "big")
        if (header & 0xFFE00000) != 0xFFE00000:
            i += 1
            continue

        version_id = (header >> 19) & 0b11
        layer_id = (header >> 17) & 0b11
        bitrate_idx = (header >> 12) & 0b1111
        sample_idx = (header >> 10) & 0b11
        padding = (header >> 9) & 0b1

        if version_id == 1 or layer_id == 0:
            i += 1
            continue

        table_version = 3 if version_id == 3 else 2
        bitrate = bitrate_table[table_version][layer_id][bitrate_idx] * 1000
        sample_rate = sample_rate_table[version_id][sample_idx]
        if bitrate <= 0 or sample_rate <= 0:
            i += 1
            continue

        if layer_id == 3:
            samples = 384
            frame_len = int((12 * bitrate / sample_rate + padding) * 4)
        elif layer_id == 2:
            samples = 1152
            frame_len = int(144 * bitrate / sample_rate + padding)
        else:
            samples = 1152 if version_id == 3 else 576
            coeff = 144 if version_id == 3 else 72
            frame_len = int(coeff * bitrate / sample_rate + padding)

        if frame_len <= 4:
            i += 1
            continue

        total += samples / sample_rate
        i += frame_len

    if total <= 0:
        raise RuntimeError(f"Khong doc duoc duration MP3: {path}")
    return total


def sync_scene_timing_to_audio(scenes: dict, dictionary: dict, audio_duration: float) -> bool:
    """Update scene starts/durations so visual timeline follows actual voiceover."""
    scene_list = scenes.get("scenes", [])
    if not scene_list:
        return False

    # Thử đồng bộ chính xác tuyệt đối bằng SentenceBoundary trước
    boundaries_file = ROOT / "data" / "tts_boundaries.json"
    if boundaries_file.exists():
        try:
            boundaries = json.loads(boundaries_file.read_text(encoding="utf-8"))
            if len(boundaries) > 0:
                scene_sentences = []
                for s in scene_list:
                    vo = s.get("voiceover", "").strip()
                    # Tách câu thực tế
                    sentences = [x.strip() for x in vo.split(".") if x.strip()]
                    scene_sentences.append(max(1, len(sentences)))
                
                boundary_idx = 0
                starts = []
                for count in scene_sentences:
                    if boundary_idx >= len(boundaries):
                        break
                    # Start của scene là offset của boundary đầu tiên thuộc scene này
                    s_start = boundaries[boundary_idx]["offset"] / 10000000
                    starts.append(s_start)
                    boundary_idx += count
                
                if len(starts) == len(scene_list):
                    # Điều chỉnh starts/durations nối liền nhau để tránh kẽ hở
                    for i in range(len(scene_list)):
                        scene_list[i]["start"] = round(starts[i], 3)
                        if i < len(scene_list) - 1:
                            scene_list[i]["duration"] = round(starts[i+1] - starts[i], 3)
                        else:
                            scene_list[i]["duration"] = round(audio_duration - starts[i], 3)
                    
                    scenes["duration_seconds"] = round(audio_duration, 3)
                    log.info("[Sync] Đã đồng bộ bằng mốc SentenceBoundary chính xác từ edge-tts!")
                    # Xoá file tts_boundaries.json sau khi dùng để tránh ảnh hưởng lần chạy sau
                    try:
                        boundaries_file.unlink(missing_ok=True)
                    except Exception:
                        pass
                    return True
        except Exception as e:
            log.warning(f"Lỗi khi đồng bộ timing bằng SentenceBoundary: {e}. Quay lại dùng ước lượng.")

    current_total = scenes.get("duration_seconds") or sum(float(s.get("duration", 0)) for s in scene_list)
    has_timing_gap = False
    for idx, scene in enumerate(scene_list):
        start = float(scene.get("start", 0))
        duration = float(scene.get("duration", 0))
        if idx < len(scene_list) - 1:
            next_start = float(scene_list[idx + 1].get("start", 0))
            if abs((start + duration) - next_start) > 0.0004:
                has_timing_gap = True
                break

    if abs(float(current_total) - audio_duration) <= AUDIO_SYNC_TOLERANCE_SECONDS and not has_timing_gap:
        return False

    weights = []
    for scene in scene_list:
        vo = normalize_text(scene.get("voiceover", "").strip(), dictionary)
        weights.append(max(len(vo.split()), 1))

    weight_total = sum(weights)
    total_duration = round(audio_duration, 3)
    starts = [0.0]
    cursor = 0.0
    for weight in weights[:-1]:
        cursor += audio_duration * weight / weight_total
        starts.append(round(cursor, 3))
    starts.append(total_duration)

    for idx, scene in enumerate(scene_list):
        scene["start"] = starts[idx]
        scene["duration"] = round(max(0.001, starts[idx + 1] - starts[idx]), 3)

    scenes["duration_seconds"] = total_duration
    return True


# ── Adapter factory ───────────────────────────────────────────────────────────

def get_adapter(provider: str):
    provider = provider.lower().strip()
    if provider == "edge":
        from scripts.tts.edge import EdgeTTS
        voice = os.getenv("EDGE_TTS_VOICE", "vi-VN-NamMinhNeural")
        rate  = os.getenv("EDGE_TTS_RATE", "+0%")
        return EdgeTTS(voice=voice, rate=rate)
    elif provider == "google":
        from scripts.tts.google_tts import GoogleTTS
        return GoogleTTS()
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
        raise ValueError(f"TTS provider không hợp lệ: {provider}. Chọn: edge | google | fpt | viettel | openai | espeak")


PROVIDER_FALLBACK_ORDER = ["google", "edge", "fpt", "viettel", "openai", "espeak"]


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

    audio_duration = get_mp3_duration_seconds(output)
    if sync_scene_timing_to_audio(scenes, dictionary, audio_duration):
        scenes_file.write_text(json.dumps(scenes, ensure_ascii=False, indent=2), encoding="utf-8")
        log.info(f"Da dong bo scenes.json theo voiceover: {audio_duration:.2f}s")

    size_kb = output.stat().st_size // 1024
    log.info(f"→ {output.name} ({size_kb} KB) via {used_provider}")
    return output


if __name__ == "__main__":
    run()
