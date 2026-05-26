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
