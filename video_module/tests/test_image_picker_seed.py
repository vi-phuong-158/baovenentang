"""Test ImagePicker với seed deterministic."""

import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from scripts.image_picker import ImagePicker


def _make_library(tmp_path: Path, categories: dict[str, int]) -> Path:
    lib = tmp_path / "library"
    lib.mkdir()
    for cat, n in categories.items():
        folder = lib / cat
        folder.mkdir()
        for i in range(n):
            (folder / f"img_{i:02d}.jpg").write_bytes(b"\x00")
    return lib


def test_same_seed_picks_same_image(tmp_path):
    lib = _make_library(tmp_path, {"chinhphu": 5})
    p1 = ImagePicker(library_dir=lib, auto_fetch=False, seed="20260526")
    p2 = ImagePicker(library_dir=lib, auto_fetch=False, seed="20260526")
    assert p1.pick("chinhphu").name == p2.pick("chinhphu").name


def test_different_seed_can_pick_different_image(tmp_path):
    lib = _make_library(tmp_path, {"chinhphu": 10})
    # Thử nhiều cặp seed; ít nhất 1 cặp phải khác nhau
    diffs = 0
    for a, b in [("20260101", "20260202"), ("seed-A", "seed-B"), ("1", "999")]:
        p1 = ImagePicker(library_dir=lib, auto_fetch=False, seed=a)
        p2 = ImagePicker(library_dir=lib, auto_fetch=False, seed=b)
        if p1.pick("chinhphu").name != p2.pick("chinhphu").name:
            diffs += 1
    assert diffs > 0, "Hai seed khác nhau phải sinh ra lựa chọn khác nhau ít nhất 1 lần"


def test_picker_does_not_repeat_within_same_run(tmp_path):
    lib = _make_library(tmp_path, {"chinhphu": 3})
    picker = ImagePicker(library_dir=lib, auto_fetch=False, seed="x")
    picked = [picker.pick("chinhphu").name for _ in range(3)]
    assert len(set(picked)) == 3
