"""
Bước 1: Trích xuất facts từ bản tin markdown.
Dùng regex + rule, KHÔNG dùng LLM.

Input:  input/today_news.md  (hoặc fixture truyền qua arg)
Output: data/extracted_facts.json
"""

import re
import json
import sys
import logging
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent.parent
INPUT_FILE = ROOT / "input" / "today_news.md"
OUTPUT_FILE = ROOT / "data" / "extracted_facts.json"
DEFAULT_WEBSITE = "https://www.troly35.info.vn/"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# --- Regex số hiệu văn bản ---

# Văn bản nhà nước có năm: 181/2026/NĐ-CP, 23/2026/TT-BCA, 18/2026/QH15
# Suffix bắt đầu bằng chữ, cho phép chữ số sau (QH15, QH14...)
GOV_DOC_RE = re.compile(
    r"\b(\d{1,4}/\d{4}/[A-ZĐa-zđ][A-ZĐa-zđ0-9]{1,11}(?:-[A-ZĐa-zđ]{2,10})?)\b"
)

# Văn bản Đảng: 57-NQ/TW, 38-CT/TW, 12-QĐ/TW
PARTY_DOC_RE = re.compile(r"\b(\d{1,4}-[A-ZĐ]{2,4}/TW)\b")

# Văn bản địa phương không có năm: 183/KH-UBND
LOCAL_DOC_RE = re.compile(r"\b(\d{1,4}/[A-ZĐa-zđ]{2,8}-[A-ZĐa-zđ]{2,8})\b")

# Loại văn bản
DOC_TYPE_RE = re.compile(
    r"(Nghị định|Thông tư|Quyết định|Nghị quyết|Chỉ thị|Luật|Kế hoạch|Hướng dẫn|Thông báo|Pháp lệnh)\s+(?:số\s+)?",
    re.IGNORECASE,
)

ISSUER_SUFFIX_MAP = {
    "NĐ-CP":    "Chính phủ",
    "QH15":     "Quốc hội",
    "QH14":     "Quốc hội",
    "QH":       "Quốc hội",
    "TT-BCA":   "Bộ Công an",
    "TT-BNV":   "Bộ Nội vụ",
    "TT-BTC":   "Bộ Tài chính",
    "TT-BGDĐT": "Bộ Giáo dục và Đào tạo",
    "TT-BYT":   "Bộ Y tế",
    "TT-BTTTT": "Bộ Thông tin và Truyền thông",
    "QĐ-TTg":   "Thủ tướng Chính phủ",
    "KH-UBND":  "UBND",
    "QĐ-UBND":  "UBND",
    "NQ-HĐND":  "HĐND",
    "NQ/TW":    "Bộ Chính trị / Ban Chấp hành Trung ương",
    "CT/TW":    "Ban Bí thư",
    "QĐ/TW":    "Ban Chấp hành Trung ương",
}

DOC_TYPE_SUFFIX_MAP = {
    "NĐ":   "Nghị định",
    "TT":   "Thông tư",
    "QH":   "Luật",
    "QĐ":   "Quyết định",
    "NQ":   "Nghị quyết",
    "CT":   "Chỉ thị",
    "KH":   "Kế hoạch",
}


def _guess_from_suffix(suffix: str, table: dict) -> str:
    su = suffix.upper()
    for key, val in table.items():
        if key.upper() in su:
            return val
    return suffix


def _find_date_near(text: str, start: int, end: int, window: int = 120) -> str:
    ctx = text[max(0, start - window): min(len(text), end + window)]
    m = re.search(r"ngày\s+(\d{1,2})/(\d{1,2})/(\d{4})", ctx)
    if m:
        return f"{m.group(1)}/{m.group(2)}/{m.group(3)}"
    return ""


def extract_date(text: str) -> tuple[str, str]:
    """Trích ngày tháng và thứ từ dòng header."""
    m = re.search(
        r"(Thứ [A-ZÀ-Ỵa-zà-ỵ]+|Chủ Nhật),?\s+ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})",
        text,
    )
    if m:
        weekday = m.group(1)
        day, month, year = m.group(2), m.group(3), m.group(4)
        return f"{day}/{month}/{year}", weekday
    return "", ""


def extract_legal_documents(text: str) -> list[dict]:
    """Trích tất cả số hiệu văn bản; không trùng."""
    seen: set[str] = set()
    docs: list[dict] = []

    def _add(number: str, suffix: str, start: int, end: int) -> None:
        if number in seen:
            return
        seen.add(number)
        prefix = text[max(0, start - 60): start]
        tm = DOC_TYPE_RE.search(prefix)
        doc_type = tm.group(1) if tm else _guess_from_suffix(suffix, DOC_TYPE_SUFFIX_MAP)
        issuer = _guess_from_suffix(suffix, ISSUER_SUFFIX_MAP)
        issue_date = _find_date_near(text, start, end)
        docs.append({
            "number": number,
            "type": doc_type,
            "issuer": issuer,
            "issue_date": issue_date,
        })

    for m in GOV_DOC_RE.finditer(text):
        parts = m.group(1).split("/")
        suffix = "/".join(parts[2:]) if len(parts) >= 3 else parts[-1]
        _add(m.group(1), suffix, m.start(), m.end())

    for m in PARTY_DOC_RE.finditer(text):
        num = m.group(1)
        # suffix là phần sau dấu gạch ngang: NQ/TW, CT/TW ...
        suffix_m = re.search(r"-([A-ZĐ]+/TW)$", num)
        suffix = suffix_m.group(1) if suffix_m else "TW"
        _add(num, suffix, m.start(), m.end())

    # Span của các match đã bắt — để tránh LOCAL_DOC_RE match trùng vào bên trong
    covered_spans = [(m.start(), m.end()) for m in GOV_DOC_RE.finditer(text)]
    covered_spans += [(m.start(), m.end()) for m in PARTY_DOC_RE.finditer(text)]

    def _is_covered(start: int, end: int) -> bool:
        return any(cs <= start and end <= ce for cs, ce in covered_spans)

    for m in LOCAL_DOC_RE.finditer(text):
        num = m.group(1)
        if num in seen:
            continue
        if _is_covered(m.start(), m.end()):
            continue
        suffix_m = re.search(r"/([A-ZĐa-zđ]+-[A-ZĐa-zđ]+)$", num)
        suffix = suffix_m.group(1) if suffix_m else num
        _add(num, suffix, m.start(), m.end())

    return docs


def extract_top_news(text: str) -> list[dict]:
    """Trích tiêu đề tin nổi bật (dòng ngay trước 'Nguồn:')."""
    news: list[dict] = []
    lines = text.splitlines()
    for i, line in enumerate(lines):
        stripped = line.strip()
        if re.match(r"Nguồn\s*:", stripped) and i > 0:
            title_raw = lines[i - 1].strip()
            # Bỏ emoji đầu dòng
            title = re.sub(r"^[\U00010000-\U0010ffff‍️☀-⟿\s]+", "", title_raw).strip()
            # Bỏ qua section header (toàn chữ in hoa hoặc quá ngắn)
            if title and len(title) > 8 and not re.match(r"^[A-ZĐÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂẮẶẺẼẸÊẾỆ\s]+$", title):
                news.append({"title": title})
    return news[:6]


def extract_overview(text: str) -> str:
    m = re.search(r"TỔNG QUAN NGÀY\s*\n(.+?)(?:\n━|$)", text, re.DOTALL)
    if m:
        return m.group(1).strip()
    return ""


def extract_key_message(text: str) -> str:
    # Pattern: _"..."_
    m = re.search(r'_"(.+?)"_', text, re.DOTALL)
    if m:
        return m.group(1).strip()
    # Fallback: nội dung sau THÔNG ĐIỆP NGÀY
    m = re.search(r"THÔNG ĐIỆP NGÀY\s*\n_?\"?(.*?)\"?_?\n", text, re.DOTALL)
    if m:
        return m.group(1).strip().strip('"\'')
    return ""


def extract_website(text: str) -> str:
    # Lấy URL cuối cùng (thường là website chính)
    urls = re.findall(r"https?://[^\s\)\]]+", text)
    # Ưu tiên URL của baovenentang
    for url in reversed(urls):
        if "troly35.info.vn" in url or "baovenentang" in url or "vercel" in url:
            return url
    return urls[-1] if urls else DEFAULT_WEBSITE


def run(input_path: Path = INPUT_FILE) -> dict:
    if not input_path.exists():
        log.error(f"File không tồn tại: {input_path}")
        sys.exit(1)

    text = input_path.read_text(encoding="utf-8")
    log.info(f"Đọc: {input_path.name} ({len(text)} ký tự)")

    date_str, weekday = extract_date(text)
    legal_docs = extract_legal_documents(text)
    top_news = extract_top_news(text)
    key_message = extract_key_message(text)
    overview = extract_overview(text)
    website = extract_website(text)

    facts = {
        "date": date_str,
        "weekday": weekday,
        "overview": overview,
        "legal_documents": legal_docs,
        "top_news": top_news,
        "key_message": key_message,
        "website": website,
        "_source_file": input_path.name,
        "_extracted_at": datetime.now().isoformat(),
    }

    OUTPUT_FILE.parent.mkdir(exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(facts, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info(f"→ {OUTPUT_FILE.name}")
    log.info(f"  ngày={date_str}  văn bản={len(legal_docs)}  tin={len(top_news)}")
    return facts


if __name__ == "__main__":
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else INPUT_FILE
    run(src)
