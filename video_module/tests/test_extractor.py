"""Unit tests cho scripts/01_extract_facts.py."""

import importlib.util
import sys
from pathlib import Path

# Load module có tên bắt đầu bằng số
_spec = importlib.util.spec_from_file_location(
    "extract_facts",
    Path(__file__).parent.parent / "scripts" / "01_extract_facts.py",
)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

extract_date = _mod.extract_date
extract_legal_documents = _mod.extract_legal_documents
extract_top_news = _mod.extract_top_news
extract_key_message = _mod.extract_key_message
extract_overview = _mod.extract_overview
extract_website = _mod.extract_website

SAMPLES_DIR = Path(__file__).parent.parent / "samples"


# ── extract_date ────────────────────────────────────────────────────────────

def test_extract_date_thu_sau():
    text = "📅 Thứ Sáu, ngày 22 tháng 5 năm 2026"
    date, weekday = extract_date(text)
    assert date == "22/5/2026"
    assert weekday == "Thứ Sáu"


def test_extract_date_thu_nam():
    text = "📅 Thứ Năm, ngày 21 tháng 5 năm 2026"
    date, weekday = extract_date(text)
    assert date == "21/5/2026"
    assert weekday == "Thứ Năm"


def test_extract_date_chu_nhat():
    text = "📅 Chủ Nhật, ngày 3 tháng 1 năm 2027"
    date, weekday = extract_date(text)
    assert date == "3/1/2027"
    assert weekday == "Chủ Nhật"


def test_extract_date_missing():
    date, weekday = extract_date("Không có ngày tháng ở đây")
    assert date == ""
    assert weekday == ""


# ── extract_legal_documents ─────────────────────────────────────────────────

def test_gov_doc_standard():
    text = "Nghị định số 181/2026/NĐ-CP ngày 21/5/2026 của Chính phủ"
    docs = extract_legal_documents(text)
    numbers = [d["number"] for d in docs]
    assert "181/2026/NĐ-CP" in numbers


def test_gov_doc_thong_tu():
    text = "Thông tư số 23/2026/TT-BCA ngày 20/5/2026"
    docs = extract_legal_documents(text)
    numbers = [d["number"] for d in docs]
    assert "23/2026/TT-BCA" in numbers
    d = next(d for d in docs if d["number"] == "23/2026/TT-BCA")
    assert "Công an" in d["issuer"]


def test_party_doc_nq_tw():
    text = "Nghị quyết số 57-NQ/TW ngày 22/12/2024 của Bộ Chính trị"
    docs = extract_legal_documents(text)
    numbers = [d["number"] for d in docs]
    assert "57-NQ/TW" in numbers


def test_party_doc_ct_tw():
    text = "Chỉ thị số 38-CT/TW ngày 18/5/2026 của Ban Bí thư"
    docs = extract_legal_documents(text)
    numbers = [d["number"] for d in docs]
    assert "38-CT/TW" in numbers


def test_luat_quoc_hoi():
    text = "Quốc hội thông qua Luật số 18/2026/QH15 ngày 19/5/2026"
    docs = extract_legal_documents(text)
    numbers = [d["number"] for d in docs]
    assert "18/2026/QH15" in numbers


def test_no_duplicate():
    text = "181/2026/NĐ-CP đề cập ở đầu và 181/2026/NĐ-CP đề cập ở cuối"
    docs = extract_legal_documents(text)
    numbers = [d["number"] for d in docs]
    assert numbers.count("181/2026/NĐ-CP") == 1


def test_multiple_docs():
    text = (
        "Nghị định số 181/2026/NĐ-CP và Thông tư số 23/2026/TT-BCA "
        "và Nghị quyết 57-NQ/TW"
    )
    docs = extract_legal_documents(text)
    numbers = {d["number"] for d in docs}
    assert "181/2026/NĐ-CP" in numbers
    assert "23/2026/TT-BCA" in numbers
    assert "57-NQ/TW" in numbers


def test_empty_text():
    docs = extract_legal_documents("Không có số hiệu văn bản nào.")
    assert docs == []


# ── extract_top_news ────────────────────────────────────────────────────────

def test_top_news_from_sample():
    text = SAMPLES_DIR / "news_20260522.md"
    content = text.read_text(encoding="utf-8")
    news = extract_top_news(content)
    assert len(news) >= 2
    titles = [n["title"] for n in news]
    # Phải có ít nhất 1 tiêu đề liên quan đến Nghị định
    assert any("doanh nghiệp" in t.lower() or "an ninh" in t.lower() for t in titles)


def test_top_news_excludes_section_headers():
    text = "🔴 TIN QUAN TRỌNG\n\n📜 Chính phủ ban hành văn bản quan trọng\nNguồn: Chính phủ\n"
    news = extract_top_news(text)
    titles = [n["title"] for n in news]
    assert "TIN QUAN TRỌNG" not in titles
    assert any("Chính phủ ban hành" in t for t in titles)


# ── extract_key_message ─────────────────────────────────────────────────────

def test_key_message_standard():
    text = '_"Đây là thông điệp quan trọng của ngày hôm nay về chính sách mới."_'
    msg = extract_key_message(text)
    assert "thông điệp" in msg


def test_key_message_from_sample():
    content = (SAMPLES_DIR / "news_20260522.md").read_text(encoding="utf-8")
    msg = extract_key_message(content)
    assert len(msg) > 20
    assert "181/2026/NĐ-CP" in msg or "Nghị định" in msg


# ── extract_website ─────────────────────────────────────────────────────────

def test_website_baovenentang():
    text = "Xem thêm tại https://www.troly35.info.vn/"
    url = extract_website(text)
    assert "troly35.info.vn" in url


def test_website_fallback():
    url = extract_website("Không có URL nào")
    assert url == "https://www.troly35.info.vn/"


# ── integration: chạy với file fixture thật ─────────────────────────────────

def test_run_with_fixture_20260522(tmp_path):
    src = SAMPLES_DIR / "news_20260522.md"
    out = tmp_path / "extracted_facts.json"

    # Patch OUTPUT_FILE trong module để không ghi vào data/
    import importlib.util as ilu
    spec = ilu.spec_from_file_location(
        "ef",
        Path(__file__).parent.parent / "scripts" / "01_extract_facts.py",
    )
    mod = ilu.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.OUTPUT_FILE = out
    facts = mod.run(src)

    assert facts["date"] == "22/5/2026"
    assert facts["weekday"] == "Thứ Sáu"
    assert len(facts["legal_documents"]) >= 2
    nums = {d["number"] for d in facts["legal_documents"]}
    assert "181/2026/NĐ-CP" in nums
    assert "23/2026/TT-BCA" in nums


def test_run_with_fixture_20260520(tmp_path):
    src = SAMPLES_DIR / "news_20260520.md"
    import importlib.util as ilu
    spec = ilu.spec_from_file_location(
        "ef2",
        Path(__file__).parent.parent / "scripts" / "01_extract_facts.py",
    )
    mod = ilu.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.OUTPUT_FILE = tmp_path / "ef2.json"
    facts = mod.run(src)

    assert facts["date"] == "20/5/2026"
    nums = {d["number"] for d in facts["legal_documents"]}
    assert "18/2026/QH15" in nums
    assert "38-CT/TW" in nums
