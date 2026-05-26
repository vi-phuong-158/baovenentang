"""Unit tests cho scripts/03_validate_script.py."""

import importlib.util
import json
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "validate_script",
    Path(__file__).parent.parent / "scripts" / "03_validate_script.py",
)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

validate = _mod.validate
find_doc_numbers = _mod.find_doc_numbers

REQUIRED_IDS = list(_mod.REQUIRED_SCENE_IDS)


def _make_facts(doc_numbers: list[str] | None = None, date: str = "22/5/2026") -> dict:
    docs = [{"number": n, "type": "Nghị định", "issuer": "Chính phủ", "issue_date": ""} for n in (doc_numbers or [])]
    return {
        "date": date,
        "weekday": "Thứ Sáu",
        "legal_documents": docs,
        "top_news": [],
        "key_message": "",
        "website": "https://www.troly35.info.vn/",
    }


def _make_scenes(
    ids: list[str] | None = None,
    duration_seconds: int = 75,
    doc_in_scene: str | None = None,
    text_long: bool = False,
    headline_long: bool = False,
    empty_voiceover_id: str | None = None,
    bad_starts: bool = False,
) -> dict:
    all_ids = ids if ids is not None else list(_mod.REQUIRED_SCENE_IDS)
    # Phân bổ thời gian đều
    per_scene = duration_seconds // len(all_ids) if all_ids else 0
    scenes = []
    cursor = 0
    for i, sid in enumerate(all_ids):
        dur = per_scene
        if i == len(all_ids) - 1:
            dur = duration_seconds - cursor  # scene cuối lấy phần còn lại
        start = cursor if not bad_starts else cursor + 99
        vo = "" if sid == empty_voiceover_id else f"Đây là lời đọc cho scene {sid}."
        text = "từ " * 20 if text_long and sid == "news1" else f"Nội dung scene {sid}"
        headline = "từ " * 10 if headline_long and sid == "news1" else f"Tin {sid}"
        if doc_in_scene and sid == "news1":
            text = f"{doc_in_scene} — {text}"
            vo = f"{doc_in_scene} — {vo}"
        scenes.append({
            "id": sid,
            "start": start,
            "duration": dur,
            "headline": headline.strip(),
            "text": text.strip(),
            "voiceover": vo,
            "visual_hint": "nền đỏ",
        })
        cursor += dur
    return {"title": "Test", "date": "22/5/2026", "weekday": "Thứ Sáu", "duration_seconds": duration_seconds, "scenes": scenes}


# ── Trường hợp hợp lệ ────────────────────────────────────────────────────────

def test_valid_no_docs():
    scenes = _make_scenes()
    facts = _make_facts()
    errors = validate(scenes, facts)
    assert errors == [], f"Không nên có lỗi: {errors}"


def test_valid_with_matching_doc():
    scenes = _make_scenes(doc_in_scene="181/2026/NĐ-CP")
    facts = _make_facts(doc_numbers=["181/2026/NĐ-CP"])
    errors = validate(scenes, facts)
    assert errors == [], f"Không nên có lỗi: {errors}"


def test_valid_party_doc():
    scenes = _make_scenes(doc_in_scene="57-NQ/TW")
    facts = _make_facts(doc_numbers=["57-NQ/TW"])
    errors = validate(scenes, facts)
    assert errors == [], f"Không nên có lỗi: {errors}"


# ── Thiếu scene ─────────────────────────────────────────────────────────────

def test_missing_scene_id():
    ids = [i for i in REQUIRED_IDS if i != "cta"]
    scenes = _make_scenes(ids=ids, duration_seconds=70)
    facts = _make_facts()
    errors = validate(scenes, facts)
    assert any("cta" in e for e in errors)


def test_extra_scene_id():
    ids = REQUIRED_IDS + ["bonus"]
    scenes = _make_scenes(ids=ids, duration_seconds=90)
    facts = _make_facts()
    errors = validate(scenes, facts)
    assert any("bonus" in e for e in errors)


def test_wrong_count():
    # 7 scene hợp lệ về id nhưng thiếu 1
    ids = REQUIRED_IDS[:7]
    scenes = _make_scenes(ids=ids, duration_seconds=65)
    facts = _make_facts()
    errors = validate(scenes, facts)
    assert any("8 scene" in e for e in errors)


# ── Thời lượng ───────────────────────────────────────────────────────────────

def test_duration_too_short():
    scenes = _make_scenes(duration_seconds=45)
    facts = _make_facts()
    errors = validate(scenes, facts)
    assert any("45s" in e or "thời lượng" in e.lower() for e in errors)


def test_duration_too_long():
    scenes = _make_scenes(duration_seconds=120)
    facts = _make_facts()
    errors = validate(scenes, facts)
    assert any("120s" in e or "thời lượng" in e.lower() for e in errors)


def test_duration_boundary_60():
    scenes = _make_scenes(duration_seconds=60)
    facts = _make_facts()
    errors = [e for e in validate(scenes, facts) if "thời lượng" in e.lower()]
    assert errors == []


def test_duration_boundary_90():
    scenes = _make_scenes(duration_seconds=90)
    facts = _make_facts()
    errors = [e for e in validate(scenes, facts) if "thời lượng" in e.lower()]
    assert errors == []


# ── Số hiệu văn bản hallucinated ─────────────────────────────────────────────

def test_hallucinated_doc_number():
    # LLM tự bịa 999/2099/NĐ-CP không có trong facts
    scenes = _make_scenes(doc_in_scene="999/2099/NĐ-CP")
    facts = _make_facts(doc_numbers=["181/2026/NĐ-CP"])  # facts KHÔNG có 999/...
    errors = validate(scenes, facts)
    assert any("999/2099/NĐ-CP" in e for e in errors)


def test_hallucinated_party_doc():
    scenes = _make_scenes(doc_in_scene="99-NQ/TW")
    facts = _make_facts(doc_numbers=["57-NQ/TW"])
    errors = validate(scenes, facts)
    assert any("99-NQ/TW" in e for e in errors)


def test_doc_in_facts_but_not_in_scenes():
    # Docs trong facts không bắt buộc phải xuất hiện trong scenes
    scenes = _make_scenes()
    facts = _make_facts(doc_numbers=["181/2026/NĐ-CP"])
    errors = validate(scenes, facts)
    assert errors == []


# ── Text quá dài ─────────────────────────────────────────────────────────────

def test_text_too_long():
    scenes = _make_scenes(text_long=True)
    facts = _make_facts()
    errors = validate(scenes, facts)
    assert any("text" in e.lower() and "news1" in e for e in errors)


def test_headline_too_long():
    scenes = _make_scenes(headline_long=True)
    facts = _make_facts()
    errors = validate(scenes, facts)
    assert any("headline" in e.lower() and "news1" in e for e in errors)


# ── Voiceover rỗng ────────────────────────────────────────────────────────────

def test_empty_voiceover():
    scenes = _make_scenes(empty_voiceover_id="summary")
    facts = _make_facts()
    errors = validate(scenes, facts)
    assert any("voiceover" in e.lower() and "summary" in e for e in errors)


# ── find_doc_numbers ─────────────────────────────────────────────────────────

def test_find_doc_numbers_gov():
    found = find_doc_numbers("Nghị định 181/2026/NĐ-CP có hiệu lực")
    assert "181/2026/NĐ-CP" in found


def test_find_doc_numbers_party():
    found = find_doc_numbers("Theo 57-NQ/TW của Bộ Chính trị")
    assert "57-NQ/TW" in found


def test_find_doc_numbers_empty():
    found = find_doc_numbers("Không có số hiệu nào")
    assert found == set()


# ── _load_valid_categories: mtime cache ─────────────────────────────────────

def test_categories_cache_reloads_when_file_changes(tmp_path, monkeypatch):
    """Khi categories.json bị sửa, cache phải tự reload theo mtime."""
    import os
    cat_file = tmp_path / "categories.json"
    cat_file.write_text(json.dumps({
        "categories": [{"key": "alpha"}, {"key": "beta"}]
    }), encoding="utf-8")

    monkeypatch.setattr(_mod, "CATEGORIES_FILE", cat_file)
    monkeypatch.setattr(_mod, "_CATEGORIES_CACHE", None)

    first = _mod._load_valid_categories()
    assert first == {"alpha", "beta"}

    cat_file.write_text(json.dumps({
        "categories": [{"key": "alpha"}, {"key": "gamma"}]
    }), encoding="utf-8")
    # Force mtime cách hẳn 60s để không phụ thuộc filesystem resolution
    # (FAT có 2s precision, một số NFS mount có precision thấp)
    new_mtime = os.path.getmtime(cat_file) + 60
    os.utime(cat_file, (new_mtime, new_mtime))

    second = _mod._load_valid_categories()
    assert second == {"alpha", "gamma"}


def test_categories_cache_returns_same_object_when_unchanged(tmp_path, monkeypatch):
    cat_file = tmp_path / "categories.json"
    cat_file.write_text(json.dumps({"categories": [{"key": "x"}]}), encoding="utf-8")
    monkeypatch.setattr(_mod, "CATEGORIES_FILE", cat_file)
    monkeypatch.setattr(_mod, "_CATEGORIES_CACHE", None)

    a = _mod._load_valid_categories()
    b = _mod._load_valid_categories()
    assert a == b == {"x"}


def test_categories_cache_empty_when_file_missing(tmp_path, monkeypatch):
    monkeypatch.setattr(_mod, "CATEGORIES_FILE", tmp_path / "nope.json")
    monkeypatch.setattr(_mod, "_CATEGORIES_CACHE", None)
    assert _mod._load_valid_categories() == set()


def test_categories_returns_frozenset_not_mutable(tmp_path, monkeypatch):
    """Caller không được mutate cache vô tình."""
    cat_file = tmp_path / "categories.json"
    cat_file.write_text(json.dumps({"categories": [{"key": "x"}]}), encoding="utf-8")
    monkeypatch.setattr(_mod, "CATEGORIES_FILE", cat_file)
    monkeypatch.setattr(_mod, "_CATEGORIES_CACHE", None)

    result = _mod._load_valid_categories()
    import pytest
    with pytest.raises(AttributeError):
        result.add("malicious")  # frozenset không có .add


# ── Date validation cho seed ImagePicker ────────────────────────────────────

def test_validator_accepts_valid_scene_date():
    scenes = _make_scenes()  # default date "22/5/2026"
    facts = _make_facts()
    errors = validate(scenes, facts)
    # date hợp lệ — không có error nhắc đến 'date'
    assert not any("date" in e.lower() and "format" in e.lower() for e in errors)


def test_validator_rejects_missing_scene_date():
    scenes = _make_scenes()
    del scenes["date"]
    facts = _make_facts()
    errors = validate(scenes, facts)
    assert any("date" in e.lower() for e in errors)


def test_validator_rejects_bad_date_format():
    scenes = _make_scenes()
    scenes["date"] = "May 22, 2026"  # sai format
    facts = _make_facts()
    errors = validate(scenes, facts)
    assert any("date" in e.lower() for e in errors)


def test_validator_rejects_non_string_date():
    scenes = _make_scenes()
    scenes["date"] = 20260522
    facts = _make_facts()
    errors = validate(scenes, facts)
    assert any("date" in e.lower() for e in errors)
