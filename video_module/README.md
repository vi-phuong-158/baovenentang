# Video Module — Trợ lý 35

Module tạo video bản tin hằng ngày từ nội dung Trợ lý 35 đã sinh, gửi vào nhóm duyệt nội bộ, chờ `/approve` mới đăng sang nhóm chính.

**Đọc trước khi chạy:**
- [`docs/TROLY35_VIDEO_MODULE.md`](../docs/TROLY35_VIDEO_MODULE.md) — kiến trúc tổng thể
- [`docs/TROLY35_VIDEO_IMPLEMENTATION_PLAN.md`](../docs/TROLY35_VIDEO_IMPLEMENTATION_PLAN.md) — kế hoạch triển khai theo giai đoạn

Module này **không** chạm vào luồng crawl, tóm tắt, gửi bản tin text/email của Trợ lý 35.

---

## Trạng thái hiện tại

| Giai đoạn | Mô tả | Trạng thái |
|---|---|---|
| 0 | Môi trường: Python ✅ Node ✅ FFmpeg ❌ (cần cài) | ⚠️ Cần cài FFmpeg trước Giai đoạn 3 |
| 1 | Fixture bản tin + schema JSON | ✅ Hoàn thành 24/05/2026 |
| 2 | Extractor + validator + scenes.json + PoC render | ⏳ Tiếp theo |
| 3 | Voiceover + video local | Chưa bắt đầu |
| 4 | Đăng nhóm duyệt Telegram | Chưa bắt đầu |
| 5 | Duyệt qua webhook Apps Script + endpoint export GAS | Chưa bắt đầu |
| 6 | Daily run tự động | Chưa bắt đầu |

---

## Cài đặt

```powershell
cd video_module
pip install -r requirements.txt
copy .env.example .env
# Điền giá trị thật vào .env
```

**Kiểm tra môi trường:**
```powershell
python --version     # >= 3.11
node --version       # >= 22
ffmpeg -version      # phải có — cài tại https://ffmpeg.org/download.html
```

---

## Cấu trúc thư mục

```text
video_module/
├── README.md
├── .env.example
├── requirements.txt
├── daily_run.py              # gom bước 00→07 (Giai đoạn 6)
├── samples/                  # fixture bản tin thật để test
│   ├── news_20260520.md
│   ├── news_20260521.md
│   ├── news_20260522.md
│   └── sample_news.json      # schema JSON đầu vào
├── input/
│   └── today_news.md         # bản tin ngày hôm nay (copy hoặc symlink)
├── data/
│   ├── extracted_facts.json  # output bước [1]
│   ├── scenes.json           # output bước [2]
│   ├── tts_dictionary.json   # từ điển đọc số/ký hiệu cho TTS
│   └── pending_review.json   # video đang chờ duyệt
├── prompts/
│   └── make_script.md        # prompt template cho LLM
├── scripts/
│   ├── tts/
│   │   ├── base.py           # interface chung
│   │   ├── edge.py           # adapter edge-tts (primary)
│   │   ├── fpt.py            # adapter FPT.AI (backup)
│   │   ├── viettel.py        # adapter Viettel AI
│   │   └── openai_tts.py     # adapter OpenAI TTS (dự phòng)
│   ├── 01_extract_facts.py
│   ├── 02_make_script.py
│   ├── 03_validate_script.py
│   ├── 04_make_voice.py
│   ├── 05_render_video.py
│   ├── 06_compress_video.py
│   ├── 07_post_telegram.py
│   └── 08_approve_handler.py
├── assets/
│   ├── logo_baoven.png
│   └── fonts/
├── audio/
│   └── voiceover.mp3
├── output/
│   ├── video_raw.mp4
│   └── final.mp4
├── archive/
│   └── YYYYMMDD/
├── logs/
└── tests/
    ├── test_extractor.py
    └── test_validator.py
```

---

## Chạy thủ công (Giai đoạn 1-4)

```powershell
# Bước 1: Trích facts từ bản tin
python scripts/01_extract_facts.py --input samples/news_20260522.md

# Bước 2: Sinh scenes.json (cần ANTHROPIC_API_KEY trong .env)
python scripts/02_make_script.py

# Bước 3: Validate scenes.json
python scripts/03_validate_script.py

# Bước 4: Sinh voiceover
python scripts/04_make_voice.py

# Bước 5: Render video
python scripts/05_render_video.py

# Bước 6: Nén + ghép audio
python scripts/06_compress_video.py

# Bước 6: Nén + ghép audio (tự trộn nhạc nền nếu có)
python scripts/06_compress_video.py

# Bước 8: Tạo bản ngắn ~30s cho TikTok/Reels (tùy chọn, không chặn pipeline)
python scripts/08_make_short.py

# Bước 7: Đăng nhóm duyệt (gửi kèm bản ngắn nếu có)
python scripts/07_post_telegram_review.py
```

---

## Video quick wins (hấp dẫn hơn với giới trẻ)

Bốn nâng cấp tập trung tăng độ "bắt mắt" mà vẫn giữ tính chính xác của bản tin chính luận:

| Quick win | Nằm ở | Ghi chú |
|---|---|---|
| **Hook 3 giây đầu** | `prompts/make_script.md` (nội dung) + `05_render_video.py` (visual) | Scene `intro` thành câu mở giữ chân + vào hình kiểu pop/zoom-out, lộ trọn nội dung ngay giây đầu. |
| **Nhạc nền có ducking** | `06_compress_video.py` | Thả nhạc royalty-free vào `assets/music/` (xem README ở đó). Tự lặp + giảm tự động dưới giọng đọc. |
| **Caption karaoke** | `05_render_video.py` | Mỗi từ phụ đề pop sáng + phóng to rồi lắng về vàng, bám theo voiceover — phong cách TikTok. |
| **Bản ngắn ~30s** | `08_make_short.py` | Cắt-nối các scene chính từ `final.mp4` → `final_short.mp4` cho TikTok/Reels/Shorts. Cấu hình qua `SHORT_SCENES`, `SHORT_MAX_SECONDS`. |

- Nhạc nền và bản ngắn đều **tùy chọn**: thiếu file nhạc hoặc lỗi tạo bản ngắn thì pipeline vẫn chạy bình thường với bản đầy đủ chỉ có voiceover.
- Các biến cấu hình mới xem trong `.env.example` (mục *Nhạc nền + bản ngắn*).
