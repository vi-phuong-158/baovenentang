import importlib.util
from pathlib import Path


SCRIPT = Path(__file__).parent.parent / "scripts" / "05_render_video.py"


def load_render_module():
    spec = importlib.util.spec_from_file_location("render_video", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_split_chunks_empty():
    mod = load_render_module()
    assert mod._split_chunks("") == []
    assert mod._split_chunks(None) == []
    assert mod._split_chunks("   ") == []


def test_split_chunks_short_sentence_kept_whole():
    mod = load_render_module()
    chunks = mod._split_chunks("Một câu cực ngắn.")
    assert chunks == ["Một câu cực ngắn."]


def test_split_chunks_breaks_at_sentence_boundary():
    mod = load_render_module()
    chunks = mod._split_chunks("Câu một. Câu hai. Câu ba.")
    assert chunks == ["Câu một.", "Câu hai.", "Câu ba."]


def test_split_chunks_respects_word_and_char_limits():
    mod = load_render_module()
    text = (
        "Bộ Lao động Thương binh và Xã hội đề nghị các địa phương tăng cường "
        "truyền thông về phòng chống bạo lực trẻ em, đặc biệt trong môi trường "
        "gia đình và nhà trường."
    )
    chunks = mod._split_chunks(text)

    assert len(chunks) >= 3
    for c in chunks:
        assert len(c.split()) <= mod.SUB_MAX_WORDS, c
        assert len(c) <= mod.SUB_MAX_CHARS, c
    # Phải tái tạo lại toàn bộ từ
    assert " ".join(chunks).split() == text.split()


def test_split_chunks_flushes_at_comma_when_buffer_has_4_plus_words():
    mod = load_render_module()
    chunks = mod._split_chunks("một hai ba bốn, năm sáu bảy.")
    # Sau "bốn," phải flush vì đã có 4 từ
    assert chunks[0] == "một hai ba bốn,"
    assert chunks[1] == "năm sáu bảy."


def test_split_chunks_no_short_flush_when_buffer_under_4_words():
    mod = load_render_module()
    # "ba," không nên flush vì mới có 3 từ
    chunks = mod._split_chunks("một hai ba, bốn năm sáu bảy tám.")
    assert chunks[0] == "một hai ba, bốn năm sáu bảy tám."


def test_build_scene_div_renders_sub_lines():
    mod = load_render_module()
    scene = {
        "id": "summary",
        "headline": "Tiêu đề",
        "text": "Nội dung tổng quan.",
        "voiceover": "Câu một dài hơn chín từ một hai ba bốn năm sáu. Câu hai.",
        "start": 0,
        "duration": 8,
    }
    html = mod.build_scene_div(scene)
    assert 'class="sub-line"' in html
    assert 'id="summary-sub-0"' in html
    # Phải có ít nhất 2 dòng do voiceover có 2 câu
    assert 'id="summary-sub-1"' in html
    # Không còn dùng sub-word
    assert "sub-word" not in html


def test_build_scene_div_skips_subtitle_when_voiceover_empty():
    mod = load_render_module()
    scene = {
        "id": "intro",
        "headline": "X",
        "text": "Y",
        "voiceover": "",
        "start": 0,
        "duration": 5,
    }
    html = mod.build_scene_div(scene)
    assert "subtitle-bar" not in html
    assert "sub-line" not in html


def test_gsap_block_emits_chunk_animations():
    mod = load_render_module()
    scenes = [
        {
            "id": "intro",
            "headline": "H",
            "text": "T",
            "voiceover": "Một hai ba bốn năm. Sáu bảy tám chín mười.",
            "start": 0,
            "duration": 6,
        },
    ]
    js = mod.build_gsap_block(scenes, total_dur=6)
    # Dòng phụ đề đầu tiên fade in
    assert "#intro-sub-0" in js
    # Dòng thứ hai fade in + dòng đầu fade out
    assert "#intro-sub-1" in js
    # Container subtitle vẫn được fade in
    assert "#intro-subtitle" in js
    # Không còn dùng stagger từng từ
    assert ".sub-word" not in js


def test_gsap_block_short_scene_does_not_overflow_fadeout():
    """Scene cực ngắn nhiều chunk: không được lên lịch fade-in dòng phụ đề
    vào/đã qua thời điểm scene fade-out, nhưng vẫn phải giữ dòng đầu tiên."""
    mod = load_render_module()
    scenes = [
        {
            "id": "briefs",
            "headline": "H",
            "text": "T",
            # Nhiều câu để tạo nhiều chunk trong một scene rất ngắn
            "voiceover": "Một. Hai. Ba. Bốn. Năm. Sáu.",
            "start": 0,
            "duration": 1.5,
        },
    ]
    js = mod.build_gsap_block(scenes, total_dur=1.5)
    # Dòng đầu luôn được hiện
    assert "#briefs-sub-0" in js
    # out_t = start + dur - fade; mọi fade-in của sub-line phải nằm trước out_t
    import re
    fade = min(0.5, 1.5 * 0.08)
    out_t = 0 + 1.5 - fade
    for m in re.finditer(r"#briefs-sub-\d+'.*?opacity:1.*?,\s*([\d.]+)\);", js):
        assert float(m.group(1)) < out_t, f"sub-line fade-in tại {m.group(1)} >= out_t {out_t}"
