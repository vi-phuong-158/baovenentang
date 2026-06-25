---
name: loha-video-maker
description: >
  Làm video dọc 9:16 (hoặc 16:9) chuyên nghiệp bằng Hermes — 2 chế độ:
  (A) FACELESS scene-slides tự sinh giọng AI, và (B) EDIT video tự quay (footage)
  với card neon 3D + phụ đề karaoke + mockup UI + screenshot thật + nhạc + SFX.
  Dùng khi user nói "làm video", "edit video", "dựng video hướng dẫn/review/giới thiệu".
  Engine: build_scene_slides.py / edit_footage.py + F5-TTS + HyperFrames + ffmpeg.
metadata:
  type: skill
  author: LoHa Tech
  version: "1.0"
---

# 🎬 loha-video-maker — Skill làm video tự động bằng Hermes

Skill này gói TOÀN BỘ quy trình làm video LoHa Tech vào 1 file. Có 2 chế độ. Bám đúng RULE CỨNG ở cuối để không lỗi.

## 0. CẦN GÌ (prerequisites — cài 1 lần)
- **video-pipeline** (repo): `build_scene_slides.py`, `run_video.ps1`, `edit_footage.py`, `build_overlays.py`, `build_captions.py`, `fit_scenes.py`, `sfx_mixer.py`, `capture_shot.ps1`.
- **2 venv**: `.venv` (render/mux) · `.venv-f5` (F5-TTS + faster-whisper).
- **HyperFrames** (`npm run render` trong `hf-demo/`, chạy qua **cmd** không qua ps1 — execution policy chặn npm.ps1).
- **ffmpeg/ffprobe** ở `tools/`. **Giọng clone**: `refvoice/clone_ref.wav`. **SFX**: `hf-demo/assets/sfx/*.wav`. **Nhạc**: `hf-demo/assets/music/*.mp3`.
- GPU NVIDIA (F5 nhanh). GTX 16xx cần patch fp32. HF offline: đặt `HF_HUB_OFFLINE=1` + `TRANSFORMERS_OFFLINE=1`.

---

## A. CHẾ ĐỘ FACELESS (scene-slides — tự sinh giọng AI) — DÙNG NHIỀU NHẤT
Mỗi nhịp lời nói = 1 slide full-màn thiết kế (label → heading 2 tông → 1 component → karaoke đáy). Tạo 3 file rồi chạy 1 lệnh.

### 1) `<ten>_spec.json` (giọng F5)
```json
{
  "ref": "refvoice/clone_ref.wav", "speed": 1.06,
  "music": "tech", "music_vol": 0.13,
  "lexicon": {"AI":"ây ai","Hermes":"hơ-mét","9Router":"chín rao-tơ","24/7":"hai mươi tư trên bảy","email":"i-meo"},
  "segments": [ {"id":1,"text":"Câu 1 ..."}, {"id":2,"text":"Câu 2 ..."} ]
}
```
- **lexicon = CHÌA KHOÁ phát âm**: viết SỐ/brand ĐÚNG trong `text` (vd `AI`, `24/7`, `Hermes`), lexicon chỉ đổi cách ĐỌC. (Xem RULE #1.)
- Số trong text nên để dạng số `40`, `24/7` + thêm cách đọc vào lexicon. Lời ~8-12 câu cho 45-60s.

### 2) `<ten>_scenes.json` (hình)
```json
{
  "mode":"scenes", "accent":"orange", "width":1080, "height":1920, "caption_bottom":390,
  "keywords":["Hermes","AI","Telegram"],
  "scenes":[
    {"label":"HOOK","heading":[{"text":"Dòng 1"},{"text":"Dòng 2","accent":true}],"subnote":"phụ chú **đậm**","segs":[1]},
    {"label":"...","heading":[...],"comp":{"type":"steps","items":[{"title":"...","sub":"..."}]},"segs":[2]}
  ]
}
```
- **accent (tông màu)**: `orange`/`gold` (tin tức, Content TQ) · `indigo`/`brand` (tím LoHa) · `hocai` (galaxy tím-xanh kênh Học AI) · `chatgpt` (xanh lá) · `viralcrawl` (navy+hồng).
- **comp (1 component/scene)**: `terminal` (lệnh) · `steps` (bước) · `compare` (2 thanh) · `stats` (3 thẻ số) · `bignum` (số to) · `tagcloud` (tag) · `browser` (cửa sổ + biểu đồ) · `tip` (box 💡) · **`shot`** (screenshot/mockup thật trong khung neon — `{type:shot,src:"assets/shots/x.png",title:"domain",badge:"LIVE",fit:"cover|contain"}`).
- **`segs`**: id các câu thuộc scene → tự khớp timing.

### 3) Chạy
```
run_video.ps1 -Spec <ten>_spec.json -Scenes <ten>_scenes.json -Sfx <ten>_sfx.json -Out <ten>
```
→ ra `<ten>_FINAL.mp4` (F5 voice → align → fit timing → build → render → mux nhạc + SFX → loudnorm -16).
- Đổi HÌNH/screenshot mà giữ giọng cũ: thêm `-KeepVoice` (nhanh). Đổi LỜI/lexicon → bỏ -KeepVoice (gen lại giọng).

---

## B. CHẾ ĐỘ EDIT VIDEO TỰ QUAY (footage talking-head/screen-rec)
1. **Transcribe**: `transcribe_video.py --video <mp4> --out selfshot` → `words.json`. Sửa chính tả brand (Cloud→Claude, herme→Hermes...) → `words_fixed.json`.
2. **cards.json** (card neon + nhạc + SFX):
```json
{"footage":"assets/footage.mp4","duration":108,"caption_bottom":380,"music":"tech","music_vol":0.10,
 "keywords":["claude","hermes"],
 "cards":[{"type":"term","title":"...","sub":"...","accent":"cyan","enter":"right","left":600,"top":150,"width":460,"t":2.0,"dur":7.5}],
 "sfx_events":[{"file":"hf-demo/assets/sfx/whoosh.wav","t":2.0,"db":-14}]}
```
   - card types: `term` · `bullet` (rows + cue) · `stat`. accent: cyan/violet/gold/green. `cue`=từ khoá đồng bộ.
3. **Chạy**: `edit_footage.py --spec cards.json --video <mp4> --words words_fixed.json --composition hf-demo --out final.mp4 --caption-chunk 6` (KHÔNG `--post` cho scene-slides).

### MOCKUP UI ĐỘNG (Mức B — video hướng dẫn cần vẽ lại app):
- Vẽ mỗi UI = 1 file HTML HyperFrames riêng (1080x1920, `#stage` + `window.__timelines["main"]`), recreate CHÍNH XÁC từ screenshot thật.
- 🔴 Animation dùng `tl.set()`/`tl.to()` — **KHÔNG `tl.call()`** (không chạy khi render-seek). Gõ chữ = pre-bake từng `<span opacity:0>` rồi `tl.set(span,{opacity:1}, t)`.
- Render mỗi mockup → clip → ffmpeg **overlay cutaway** lên footage đúng giây: `[i]setpts=PTS+START/TB[ci]` + `overlay=enable='between(t,START,END)'` → combined_visual → mux giọng gốc → edit_footage (card + karaoke + SFX).
- Screenshot thật: `capture_shot.ps1 -Url <url> -Out <abs.png>` (Chrome headless). Chụp TRANG CHỦ (không trang login); ra 403/trắng/captcha → dùng trang khác hoặc mockup vẽ.

---

## 🔴 RULE CỨNG (bài học — VI PHẠM = LÀM LẠI)
1. **TEXT/PHỤ ĐỀ ≠ PHIÊN ÂM**: chữ trên màn viết dạng HIỂN THỊ đúng (số = `24/7` `41`, brand = `AI` `Hermes` `9Router`). Phát âm xử lý RIÊNG bằng `lexicon` trong spec. KHÔNG viết phiên âm (`ây-ai`, `hai mươi tư`) vào text — vì text vừa làm giọng vừa thành phụ đề.
2. **HOOK FULL Ở FRAME ĐẦU**: scene[0] hiện đủ chữ hook ngay giây 0 (thumbnail nền tảng = frame 0). build_scene_slides tự render scene[0] tĩnh.
3. **KARAOKE vùng an toàn**: `caption_bottom` 380-390 (không sát đáy). Từ đang nói tô vàng, keyword tô accent.
4. **CARD/MOCKUP KHÔNG ĐÈ NHAU & KHÔNG ĐÈ MẶT**: mỗi card 1 khung giờ; card đặt vùng trống đối diện mặt; mockup cutaway full-màn thì KHÔNG để card cùng lúc.
5. **NHIỀU MOCKUP/MINH HOẠ**: video demo app PHẢI ≥2-3 mockup UI khác nhau (cấm 1). Mỗi tính năng 1 màn.
6. **SFX ĐA DẠNG** (không lặp 1 tiếng): whoosh chuyển cảnh, pop/coin/ding/success/notify/swipe theo loại cảnh.
7. **ĐẶT TÊN FILE = caption đăng**: `<hook tiếng Việt CÓ DẤU> #lohatech #xuhuong #<3 hashtag chủ đề> (9x16).mp4`. Tránh ký tự Windows cấm `< > : " / \ | ? *`.
8. **VERIFY trước khi giao** (KHÔNG bịa): trích frame (output-seek `ffmpeg -i v -ss T -frames:v 1`), xem không đen (YAVG>12), đo loudness (~-16 LUFS), duration ≥45s, phụ đề + mockup đúng. KHÔNG post-process scene-slides (dìm thành đen).
9. **Video DÀI >120s**: caption gộp 1-clip (build_captions đã vá) để không rớt clip.
10. **Batch lớn**: chia chunk nhỏ ~6-8 video/session (tránh tràn context gateway).

---
*Skill của LoHa Tech. Cần video-pipeline + F5-TTS + HyperFrames để chạy. Liên hệ LoHa Tech để được hướng dẫn cài bộ pipeline.*
