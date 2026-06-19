import copy
import importlib.util
from pathlib import Path


SCRIPT = Path(__file__).parent.parent / "scripts" / "04_make_voice.py"


def load_voice_module():
    spec = importlib.util.spec_from_file_location("make_voice", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_mp3_duration_reader_sums_frames(tmp_path):
    mod = load_voice_module()
    frame = b"\xff\xfb\x90\x64" + (b"\0" * 413)
    audio = tmp_path / "sample.mp3"
    audio.write_bytes(frame * 10)

    duration = mod.get_mp3_duration_seconds(audio)

    assert abs(duration - (10 * 1152 / 44100)) < 0.001


def test_sync_scene_timing_matches_audio_duration():
    mod = load_voice_module()
    scenes = {
        "duration_seconds": 10,
        "scenes": [
            {"id": "intro", "start": 0, "duration": 5, "voiceover": "one two"},
            {"id": "cta", "start": 5, "duration": 5, "voiceover": "one two three four six eight"},
        ],
    }

    changed = mod.sync_scene_timing_to_audio(copy.deepcopy(scenes), {}, 10.2)
    assert changed is False

    changed_scenes = copy.deepcopy(scenes)
    changed = mod.sync_scene_timing_to_audio(changed_scenes, {}, 16.0)

    assert changed is True
    assert changed_scenes["duration_seconds"] == 16.0
    assert changed_scenes["scenes"][0]["start"] == 0
    assert changed_scenes["scenes"][1]["start"] == 4.0
    assert changed_scenes["scenes"][0]["duration"] == 4.0
    assert changed_scenes["scenes"][1]["duration"] == 12.0


def test_cumulative_drift_triggers_resync():
    """Nhiều khe nhỏ (mỗi khe < TIMING_GAP_TOLERANCE) nhưng cộng dồn vượt
    AUDIO_SYNC_TOLERANCE → phải trigger re-sync."""
    mod = load_voice_module()
    # 8 scene, mỗi cặp liền kề có khe 0.04s (< 0.05 tolerance đơn lẻ)
    # Tổng = 7 × 0.04 = 0.28s, dưới AUDIO_SYNC_TOLERANCE_SECONDS=0.5
    # Tăng lên: 8 scene × khe 0.08s mỗi cặp = 0.56s > 0.5 → phải trigger
    scenes = {
        "duration_seconds": 10,
        "scenes": [
            {"id": str(i), "start": i * 1.0, "duration": 1.0 - 0.08, "voiceover": "x"}
            for i in range(8)
        ],
    }
    # Tổng duration 8 × 0.92 = 7.36s, nhưng start spaced 1.0s → 8s tổng. Có drift.
    # audio_duration 7.5s — trong tolerance 0.5 so với duration_seconds=10? Không,
    # 10-7.5=2.5 > 0.5 nên sẽ trigger qua nhánh thứ nhất bất kể.
    # Để test riêng nhánh cumulative_drift, đặt audio_duration sát duration_seconds:
    scenes["duration_seconds"] = 7.36
    changed = mod.sync_scene_timing_to_audio(copy.deepcopy(scenes), {}, 7.4)
    assert changed is True, "Phải re-sync khi cumulative drift > AUDIO_SYNC_TOLERANCE"


def test_no_resync_when_drift_is_small():
    """Khe rất nhỏ giữa các scene → không trigger re-sync."""
    mod = load_voice_module()
    scenes = {
        "duration_seconds": 10,
        "scenes": [
            {"id": "intro", "start": 0, "duration": 5.0001, "voiceover": "a"},
            {"id": "cta",   "start": 5.0001, "duration": 4.9999, "voiceover": "b"},
        ],
    }
    changed = mod.sync_scene_timing_to_audio(copy.deepcopy(scenes), {}, 10.1)
    assert changed is False
