# Trợ lý 35 — Module video bản tin tự động

> File hướng dẫn cho AI coding agent (Claude Code / Codex / Cursor) để bổ sung
> tính năng tạo và đăng video bản tin hằng ngày vào dự án Trợ lý 35 đang chạy.

---

## 0. Đọc trước khi code

Đây là **module bổ sung** cho hệ thống Trợ lý 35 đã hoạt động ổn định.
Trợ lý 35 hiện tại đã làm được những việc sau:

- Tổng hợp tin từ báo chính thống mỗi sáng.
- Sinh ra **bản tin dạng text** với cấu trúc cố định (xem `samples/today_news.md`).
- Đăng bản tin text vào nhóm Telegram qua bot đã có.

Module này **không thay thế** luồng cũ. Nó chỉ:

1. Nhận `today_news.md` mà Trợ lý 35 đã sinh ra.
2. Tạo video dọc 9:16 dài 60–90 giây từ bản tin đó.
3. Đăng video vào **nhóm Telegram duyệt nội bộ** trước.
4. Sau khi có lệnh `/approve`, mới đăng sang nhóm chính.

**Nguyên tắc quan trọng — đọc kỹ:**

- Đây là nội dung chính luận, dùng cho hoạt động của cán bộ An ninh.
  Sai một số hiệu nghị định, sai tên người, sai cấp ban hành đều là vấn đề
  nghiêm trọng. **Không được tin AI tóm tắt 100%.**
- Số hiệu văn bản, tên riêng, ngày tháng, cấp ban hành phải được **trích
  nguyên văn** từ bản tin gốc, không cho LLM viết lại.
- Trong **4–8 tuần đầu**, luôn phải qua nhóm duyệt `/approve`. Không bật chế độ
  tự đăng thẳng vào nhóm chính.

---

## 1. Mục tiêu cụ thể của module

Đầu vào: file `input/today_news.md` (Trợ lý 35 đã tạo).

Đầu ra:

- `output/final.mp4` — video dọc 1080×1920, 60–90 giây, có voice-over tiếng
  Việt giọng Bắc, có phụ đề, đăng vào nhóm Telegram duyệt.
- `logs/run_YYYYMMDD.log` — log đầy đủ để kiểm tra khi có lỗi.

Một lần chạy thành công = một video đã được đăng vào nhóm duyệt + có thông báo
trong log.

---

## 2. Kiến trúc

```text
input/today_news.md  (do Trợ lý 35 sinh)
        │
        ▼
[1] Extractor — trích số hiệu VB, tên riêng, ngày tháng (regex + rule)
        │
        ▼
[2] Script generator — LLM viết kịch bản scenes.json, có ràng buộc
        │
        ▼
[3] Validator — diff scenes.json với bản tin gốc, lệch là báo lỗi
        │
        ▼
[4] TTS normalizer — pre-process lời đọc theo dictionary
        │
        ▼
[5] TTS — gọi API (FPT.AI hoặc Viettel) sinh voiceover.mp3
        │
        ▼
[6] HyperFrames — render video_raw.mp4 từ scenes.json
        │
        ▼
[7] FFmpeg — ghép audio, nén, kiểm tra dung lượng
        │
        ▼
[8] Telegram — đăng vào nhóm duyệt, kèm caption + nút /approve
        │
        ▼
[9] Approve handler — khi cán bộ gõ /approve, gửi tiếp sang nhóm chính
```

**Tại sao có bước [1] và [3]:** đây là hai bước bảo vệ chống AI hallucinate
số hiệu văn bản. Không có hai bước này thì không nên triển khai thật.

---

## 3. Cấu trúc thư mục đề xuất

Tạo thư mục `video_module/` trong project Trợ lý 35 hiện có. Không động vào
các file cũ.

```text
troly35/
├── (các file cũ của Trợ lý 35 — KHÔNG sửa)
└── video_module/
    ├── README.md
    ├── .env.example
    ├── requirements.txt           # python deps
    ├── package.json               # cho hyperframes
    ├── daily_run.py               # gom bước 01→07
    ├── input/
    │   └── today_news.md          # symlink hoặc copy từ Trợ lý 35
    ├── data/
    │   ├── scenes.json
    │   ├── extracted_facts.json   # output của bước [1]
    │   ├── tts_dictionary.json    # dictionary đọc số/ký hiệu
    │   └── pending_review.json    # video đang chờ duyệt
    ├── prompts/
    │   └── make_script.md         # prompt template cho LLM
    ├── assets/
    │   ├── logo_baoven.png
    │   ├── bg_pattern.png
    │   └── fonts/
    │       └── BeVietnamPro-*.ttf
    ├── audio/
    │   └── voiceover.mp3
    ├── hyperframes/
    │   ├── package.json
    │   ├── index.html
    │   └── compositions/
    │       └── daily-news.html
    ├── output/
    │   ├── video_raw.mp4
    │   └── final.mp4
    ├── archive/
    │   └── YYYYMMDD/              # tạo tự động mỗi ngày
    │       ├── today_news.md
    │       ├── extracted_facts.json
    │       ├── scenes.json
    │       ├── voiceover.mp3
    │       ├── final.mp4
    │       └── run.log
    ├── logs/
    │   ├── run.lock               # chống chạy trùng
    │   └── run_YYYYMMDD.log
    ├── scripts/
    │   ├── tts/
    │   │   ├── base.py            # interface chung TTS
    │   │   ├── fpt.py             # adapter FPT.AI
    │   │   ├── viettel.py         # adapter Viettel AI
    │   │   └── openai_tts.py      # adapter OpenAI TTS (dự phòng)
    │   ├── 01_extract_facts.py
    │   ├── 02_make_script.py
    │   ├── 03_validate_script.py
    │   ├── 04_make_voice.py
    │   ├── 05_render_video.py
    │   ├── 06_compress_video.py
    │   ├── 07_post_telegram.py
    │   └── 08_approve_handler.py  # long-running service, chạy riêng
    └── tests/
        ├── test_extractor.py
        └── test_validator.py
```

---

## 4. Yêu cầu môi trường

- **Python 3.11+** (đã có sẵn trong Trợ lý 35).
- **Node.js 22+** — bắt buộc cho HyperFrames.
- **FFmpeg** — phải có trong PATH.
- **Bun** (tuỳ chọn, HyperFrames dùng Bun nhưng `npx` vẫn chạy được).
- **Chromium / Chrome** — Puppeteer tự cài.

Kiểm tra trước khi bắt đầu code:

```bash
node --version    # phải >= v22
ffmpeg -version   # phải có
python --version  # phải >= 3.11
```

Nếu thiếu, dừng lại và báo người dùng cài trước.

---

## 5. Các bước triển khai chi tiết

### Bước 1 — Extractor (`scripts/01_extract_facts.py`)

**Vai trò:** đọc `today_news.md`, dùng **regex + rule**, KHÔNG dùng LLM, trích
ra các facts không được phép sai.

**Output `data/extracted_facts.json`:**

```json
{
  "date": "24/5/2026",
  "weekday": "Chủ Nhật",
  "legal_documents": [
    {
      "number": "181/2026/NĐ-CP",
      "type": "Nghị định",
      "issuer": "Chính phủ",
      "issue_date": "21/5/2026"
    },
    {
      "number": "57-NQ/TW",
      "type": "Nghị quyết",
      "issuer": "Bộ Chính trị",
      "issue_date": "22/12/2024"
    }
  ],
  "top_news": [
    {
      "title": "Tiêu chuẩn, điều kiện bổ nhiệm người quản lý doanh nghiệp nhà nước",
      "category": "policy"
    },
    {
      "title": "Bảo mật thông tin trong kỷ nguyên số",
      "category": "tech"
    },
    {
      "title": "Phát hiện, tố giác hành vi bạo hành trẻ em",
      "category": "social"
    }
  ],
  "key_message": "Việc ban hành nghị định mới về quản lý doanh nghiệp nhà nước...",
  "website": "https://baovenentang.vercel.app/"
}
```

**Regex gợi ý cho số hiệu văn bản Việt Nam:**

```python
import re

# Nghị định, Thông tư: 181/2026/NĐ-CP, 47/2020/NĐ-CP, 01/2011/TT-BNV
DOC_NUMBER_RE = re.compile(
    r"\b(\d{1,4})/(\d{4})/([A-ZĐ]{2,5}(?:-[A-ZĐ]{2,5})?)\b"
)

# Nghị quyết, Quyết định của TW Đảng: 57-NQ/TW, 12-QĐ/TW
PARTY_DOC_RE = re.compile(r"\b(\d{1,4})-([A-ZĐ]{1,3})/TW\b")

# Phân loại văn bản: Nghị định số X, Thông tư số X
DOC_TYPE_RE = re.compile(
    r"(Nghị định|Thông tư|Quyết định|Nghị quyết|Chỉ thị|Luật|Pháp lệnh|Lệnh)\s*"
    r"(?:số\s*)?",
    re.IGNORECASE,
)
```

**Lưu ý:** trong bản tin mẫu, số hiệu xuất hiện ở nhiều chỗ. Phải khớp `type`
+ `number` đúng cặp. Test kỹ với `samples/today_news.md` trước.

### Bước 2 — Script generator (`scripts/02_make_script.py`)

**Vai trò:** gọi LLM (Claude / GPT) sinh `scenes.json` từ bản tin + facts.

**Prompt template (lưu thành file `prompts/make_script.md`):**

```text
Bạn là biên tập viên video bản tin chính luận của "Trợ lý 35" — kênh thông
tin của Phòng An ninh đối ngoại Công an tỉnh Phú Thọ.

Nhiệm vụ: từ bản tin và danh sách facts đã trích, tạo kịch bản video dọc
9:16 dài 60-90 giây dạng JSON.

QUY TẮC TUYỆT ĐỐI:
1. Tất cả số hiệu văn bản, tên riêng, ngày tháng, cấp ban hành phải LẤY
   NGUYÊN VĂN từ phần "FACTS" dưới đây. KHÔNG được tự sinh, tự đoán, tự
   viết lại.
2. Nếu bản tin không cho biết một thông tin nào đó, KHÔNG được suy diễn.
   Viết "theo bản tin" hoặc bỏ qua.
3. Voiceover dùng giọng bản tin chính luận: trang trọng, khách quan, ngắn
   gọn. Không cảm thán, không hỏi tu từ, không kêu gọi cảm xúc.
4. Mỗi scene tối đa 12 từ trên màn hình.
5. Số hiệu văn bản trong VOICEOVER phải viết theo cách đọc, ví dụ:
   "181/2026/NĐ-CP" → "Nghị định số một tám một, năm hai nghìn không trăm
   hai mươi sáu, Nghị định Chính phủ".
   Nhưng trong TEXT hiển thị giữ nguyên "181/2026/NĐ-CP".
6. Cấu trúc 8 scene cố định: intro, summary, news1, news2, news3, briefs,
   message, cta.

FACTS:
{{EXTRACTED_FACTS_JSON}}

BẢN TIN GỐC:
{{NEWS_TEXT}}

Trả về JSON theo schema sau, không có gì khác:
{
  "title": "Bản tin Trợ lý 35",
  "date": "...",
  "duration_seconds": <60-90>,
  "scenes": [
    {
      "id": "intro|summary|news1|news2|news3|briefs|message|cta",
      "start": <giây>,
      "duration": <giây>,
      "headline": "<≤6 từ>",
      "text": "<≤12 từ hiển thị>",
      "voiceover": "<lời đọc của scene này>",
      "visual_hint": "<gợi ý hình ảnh>"
    }
  ]
}
```

**Gọi LLM:** dùng model LLM mạnh, ưu tiên Claude hoặc GPT có khả năng trả
JSON ổn định. Tên model cụ thể đặt trong `.env` (biến `LLM_MODEL`), không
hard-code trong script. Set `temperature=0.2` để giảm sáng tạo. Yêu cầu
trả về JSON thuần, parse bằng `json.loads`, retry tối đa 2 lần nếu lỗi
parse trước khi báo lỗi.

### Bước 3 — Validator (`scripts/03_validate_script.py`)

**Vai trò:** so `scenes.json` với `extracted_facts.json`. Đây là **cổng an
toàn quan trọng nhất**.

**Quy tắc kiểm tra:**

1. Mọi số hiệu văn bản xuất hiện trong scenes.json (cả text lẫn voiceover)
   phải có trong `extracted_facts.legal_documents[].number`.
2. Ngày tháng trong scenes.json phải khớp với facts (cho phép format khác
   nhau: "21/5/2026" = "ngày 21 tháng 5 năm 2026").
3. Mọi tên cơ quan/cấp ban hành phải có trong facts.
4. Tổng `duration` phải nằm trong [60, 90] giây.
5. Phải đủ 8 scene theo đúng id quy định.

Nếu fail bất kỳ rule nào → exit code 1, ghi log chi tiết, **không chạy tiếp**.

```python
# Pseudo-code
def validate(scenes, facts):
    errors = []
    facts_doc_numbers = {d["number"] for d in facts["legal_documents"]}

    for scene in scenes["scenes"]:
        text_blob = scene["text"] + " " + scene["voiceover"]
        # Tìm mọi pattern giống số hiệu VB trong text
        found_numbers = DOC_NUMBER_RE.findall(text_blob) + PARTY_DOC_RE.findall(text_blob)
        for n in found_numbers:
            num_str = format_number(n)
            if num_str not in facts_doc_numbers:
                errors.append(f"Scene {scene['id']}: số hiệu '{num_str}' không có trong facts")

    if errors:
        raise ValidationError(errors)
```

### Bước 4 — TTS normalizer + TTS (`scripts/04_make_voice.py`)

**Pre-process lời đọc** trước khi gửi TTS, dùng `data/tts_dictionary.json`:

```json
{
  "abbreviations": {
    "BCA": "Bộ Công an",
    "BNG": "Bộ Ngoại giao",
    "UBND": "Ủy ban nhân dân",
    "HĐND": "Hội đồng nhân dân",
    "TW": "Trung ương",
    "NĐ-CP": "Nghị định Chính phủ",
    "TT-BNV": "Thông tư Bộ Nội vụ",
    "NQ/TW": "Nghị quyết Trung ương"
  },
  "names": {
    "Vi Ngọc Phương": "Vi Ngọc Phương",
    "_comment": "Thêm các tên thường bị đọc sai vào đây"
  },
  "regex_replacements": [
    {
      "pattern": "(\\d{1,4})/(\\d{4})/NĐ-CP",
      "replacement": "Nghị định số {{spell:1}}, năm {{spell:2}}, Nghị định Chính phủ"
    }
  ]
}
```

Hàm `spell_number_vi(n)` đọc số sang tiếng Việt:
`181` → "một tám một" (đọc từng chữ số, không đọc "một trăm tám mươi mốt"
cho số hiệu).

**Thiết kế theo adapter pattern** để sau này đổi TTS không phải sửa script
chính. Cấu trúc thư mục TTS:

```text
scripts/tts/
├── base.py          # interface chung: def synthesize(text) -> bytes
├── fpt.py           # adapter FPT.AI
├── viettel.py       # adapter Viettel AI
└── openai_tts.py    # adapter OpenAI TTS (backup)
```

`04_make_voice.py` chỉ import adapter tương ứng theo biến môi trường
`TTS_PROVIDER` trong `.env`, không gọi trực tiếp API nào.

Ưu tiên provider mặc định:

1. **FPT.AI TTS** (`https://api.fpt.ai/hmi/tts/v5`) — giọng `banmai` hoặc
   `leminh`. Tiếng Việt chính luận tốt nhất hiện tại.
2. **Viettel AI TTS** — backup khi FPT.AI gián đoạn. Dùng giọng
   `hn-quynhanh` (không dùng `hcm-diemmy` vì giọng Nam không phù hợp bản
   tin chính luận miền Bắc).
3. **OpenAI TTS** — dự phòng cuối, chất lượng tiếng Việt kém hơn hai trên.

### Bước 5 — Render video (`scripts/05_render_video.py`)

**Cài HyperFrames lần đầu (chạy một lần):**

```bash
cd video_module/hyperframes
npx hyperframes init . --non-interactive --example blank
npx skills add heygen-com/hyperframes
```

**Render từ scenes.json:** viết một composition HTML đọc `data/scenes.json`
qua `data-*` attributes, render bằng:

```bash
npx hyperframes render \
  --composition compositions/daily-news.html \
  --output ../output/video_raw.mp4 \
  --width 1080 --height 1920 --fps 30
```

**Composition HTML mẫu** (`compositions/daily-news.html`):

```html
<div id="root" data-composition-id="troly35-daily"
     data-start="0" data-width="1080" data-height="1920">

  <!-- Đọc scenes.json qua fetch tại preview, hoặc inline khi build -->
  <script>
    const scenes = /* injected at build time */;
  </script>

  <!-- Mỗi scene là một div.clip -->
  <div class="clip" data-start="0" data-duration="6" data-track-index="0">
    <!-- Intro: logo + tiêu đề -->
  </div>

  <!-- ...các scene khác... -->

  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
  <script>
    const tl = gsap.timeline({ paused: true });
    // Đăng ký animation cho từng scene
    window.__timelines = { "troly35-daily": tl };
  </script>
</div>
```

**Khi tạo composition:** nếu dùng Claude Code và đã cài skill HyperFrames
(`npx skills add heygen-com/hyperframes`), ưu tiên dùng slash command
`/hyperframes` — skill này biết các quy tắc bắt buộc. Nếu môi trường không
có slash command này, đọc tài liệu trong repo HyperFrames và tuân thủ thủ
công các quy tắc: `class="clip"`, `data-start`, `data-duration`,
`data-track-index`, GSAP timeline `{ paused: true }`, đăng ký vào
`window.__timelines`.

Phong cách hình ảnh:

- Màu: nền đen-đỏ-vàng (chính luận, công an)
- Font: Be Vietnam Pro Bold cho tiêu đề, Regular cho body
- Logo: góc trên-trái, kích thước 120px
- Tiêu đề: căn giữa, font-size 96-120px
- Phụ đề từ voiceover: nửa dưới, font-size 56px, viền đen dày 4px

### Bước 6 — Compress (`scripts/06_compress_video.py`)

```bash
# Ghép audio
ffmpeg -y \
  -i output/video_raw.mp4 \
  -i audio/voiceover.mp3 \
  -c:v copy -c:a aac -b:a 128k \
  -shortest -map 0:v:0 -map 1:a:0 \
  output/final_with_audio.mp4

# Nén để Telegram ổn định (< 50MB cho video 90s)
ffmpeg -y \
  -i output/final_with_audio.mp4 \
  -c:v libx264 -crf 26 -preset medium \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output/final.mp4
```

Kiểm tra dung lượng sau khi nén. Nếu > 50MB, tăng `crf` lên 28-30.

### Bước 7 — Đăng nhóm duyệt (`scripts/07_post_telegram.py`)

**Dùng bot Telegram đã có** của Trợ lý 35 — không tạo bot mới. Trong `.env`:

```env
TELEGRAM_BOT_TOKEN=...     # đã có từ Trợ lý 35
TELEGRAM_REVIEW_CHAT_ID=-100...   # nhóm duyệt nội bộ MỚI
TELEGRAM_MAIN_CHAT_ID=-100...     # nhóm chính, đã có
```

Đăng video kèm inline keyboard có nút Duyệt / Từ chối:

```python
import os, requests, json
from datetime import datetime

BOT = os.getenv("TELEGRAM_BOT_TOKEN")
REVIEW_CHAT = os.getenv("TELEGRAM_REVIEW_CHAT_ID")

caption = f"""🎬 Bản tin Trợ lý 35 — {datetime.now():%d/%m/%Y}

⚠️ Bản nháp — chờ duyệt
👀 Vui lòng xem kỹ trước khi duyệt

✅ /approve để đăng nhóm chính
❌ /reject để từ chối
"""

with open("output/final.mp4", "rb") as f:
    r = requests.post(
        f"https://api.telegram.org/bot{BOT}/sendVideo",
        data={
            "chat_id": REVIEW_CHAT,
            "caption": caption,
            "supports_streaming": True,
            "reply_markup": json.dumps({
                "inline_keyboard": [[
                    {"text": "✅ Duyệt & đăng", "callback_data": "approve"},
                    {"text": "❌ Từ chối", "callback_data": "reject"}
                ]]
            })
        },
        files={"video": f},
        timeout=180
    )
    r.raise_for_status()
    msg_id = r.json()["result"]["message_id"]
    # Lưu msg_id để approve handler biết video nào cần forward
    with open("data/pending_review.json", "w") as out:
        json.dump({"message_id": msg_id, "file_path": "output/final.mp4"}, out)
```

### Bước 8 — Approve handler (`scripts/08_approve_handler.py`)

**Giai đoạn đầu dùng polling** (đơn giản, không cần domain HTTPS):

```python
# Polling getUpdates mỗi 3-5 giây — đủ dùng cho nhóm nhỏ nội bộ
while True:
    updates = get_updates(offset=last_update_id)
    for update in updates:
        handle(update)
        last_update_id = update["update_id"] + 1
    time.sleep(3)
```

Chuyển sang webhook chỉ khi: có VPS với domain HTTPS ổn định và cần phản
hồi < 1 giây. Giai đoạn đầu polling là đủ.

Chạy như **long-running service**: dùng PM2 (`pm2 start 08_approve_handler.py`)
trên VPS, hoặc Task Scheduler với restart policy trên Windows.

Khi nhận callback `approve`:

1. Kiểm tra user gõ lệnh có phải admin của nhóm duyệt không.
2. Đọc `data/pending_review.json` lấy file path.
3. Gửi video sang `TELEGRAM_MAIN_CHAT_ID` với caption chính thức.
4. Trả lời trong nhóm duyệt: "Đã đăng lúc HH:MM bởi @user".

Caption nhóm chính:

```text
🛡️ BẢN TIN TRỢ LÝ 35
📅 {weekday}, ngày {date}

📌 Tổng quan 3 tin nổi bật trong ngày
🔗 Chi tiết: https://baovenentang.vercel.app/

#troly35 #anninhdoingoai #phutho
```

---

## 6. Daily run (`daily_run.py`)

Gom các bước 1-7 vào một file. Bước 8 chạy riêng làm service.

```python
"""
Daily run cho video module Trợ lý 35.
Chạy bằng cron / Task Scheduler lúc 6:30 sáng (sau khi Trợ lý 35 sinh today_news.md).
"""
import sys, os, subprocess, logging, requests, shutil, fcntl
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
DATE_STR = datetime.now().strftime("%Y%m%d")
LOG = ROOT / "logs" / f"run_{DATE_STR}.log"
LOCK = ROOT / "logs" / "run.lock"
ARCHIVE = ROOT / "archive" / DATE_STR
LOG.parent.mkdir(exist_ok=True)
ARCHIVE.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    filename=LOG,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

BOT = os.getenv("TELEGRAM_BOT_TOKEN")
REVIEW_CHAT = os.getenv("TELEGRAM_REVIEW_CHAT_ID")


def notify_failure(step_name: str, error_detail: str):
    """Gửi thông báo lỗi vào nhóm duyệt Telegram. Không raise nếu gửi lỗi."""
    try:
        msg = (
            f"🚨 *Video module lỗi*\n"
            f"Bước: `{step_name}`\n"
            f"Ngày: {datetime.now():%d/%m/%Y %H:%M}\n\n"
            f"```\n{error_detail[:500]}\n```"
        )
        requests.post(
            f"https://api.telegram.org/bot{BOT}/sendMessage",
            json={"chat_id": REVIEW_CHAT, "text": msg, "parse_mode": "Markdown"},
            timeout=15,
        )
    except Exception as e:
        logging.warning(f"Không gửi được thông báo lỗi Telegram: {e}")


def acquire_lock():
    """Chống chạy trùng: tạo lock file, dừng nếu job cũ còn sống."""
    lock_file = open(LOCK, "w")
    try:
        fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        logging.error("Job khác đang chạy (lock file tồn tại). Dừng.")
        sys.exit(0)
    lock_file.write(str(os.getpid()))
    lock_file.flush()
    return lock_file   # giữ reference để lock còn hiệu lực


def release_lock(lock_file):
    fcntl.flock(lock_file, fcntl.LOCK_UN)
    lock_file.close()
    LOCK.unlink(missing_ok=True)


def archive_outputs():
    """Lưu trữ đầu ra theo ngày để đối chiếu sau này."""
    targets = [
        ROOT / "input" / "today_news.md",
        ROOT / "data" / "extracted_facts.json",
        ROOT / "data" / "scenes.json",
        ROOT / "audio" / "voiceover.mp3",
        ROOT / "output" / "final.mp4",
        LOG,
    ]
    for src in targets:
        if src.exists():
            shutil.copy2(src, ARCHIVE / src.name)
    logging.info(f"[ARCHIVE] Đã lưu vào archive/{DATE_STR}/")


STEPS = [
    ("Trích facts",       "scripts/01_extract_facts.py"),
    ("Sinh kịch bản",     "scripts/02_make_script.py"),
    ("Validate kịch bản", "scripts/03_validate_script.py"),
    ("Sinh voiceover",    "scripts/04_make_voice.py"),
    ("Render video",      "scripts/05_render_video.py"),
    ("Nén + ghép audio",  "scripts/06_compress_video.py"),
    ("Đăng nhóm duyệt",   "scripts/07_post_telegram.py"),
]


def main():
    lock_file = acquire_lock()
    try:
        for name, script in STEPS:
            logging.info(f"[BẮT ĐẦU] {name}")
            r = subprocess.run(
                [sys.executable, str(ROOT / script)],
                capture_output=True, text=True,
            )
            if r.returncode != 0:
                detail = f"STDOUT:\n{r.stdout}\nSTDERR:\n{r.stderr}"
                logging.error(f"[LỖI] {name}\n{detail}")
                notify_failure(name, r.stderr or r.stdout)
                sys.exit(1)
            logging.info(f"[XONG] {name}")

        archive_outputs()
        logging.info("[HOÀN TẤT] Video đã được đăng vào nhóm duyệt.")
    finally:
        release_lock(lock_file)


if __name__ == "__main__":
    main()
```

> **Lưu ý Windows:** `fcntl` không có trên Windows. Thay bằng cách kiểm tra
> file `run.lock` chứa PID rồi dùng `psutil.pid_exists(pid)` để xác định
> job cũ có còn sống không.

---

## 7. Lộ trình triển khai cho AI agent

**Quan trọng — đọc thứ tự này:**

### Tuần 1 — Pipeline khô (không có HyperFrames thật)

1. Tạo cấu trúc thư mục `video_module/`.
2. Viết `01_extract_facts.py` + test với `samples/today_news.md`.
3. Viết `02_make_script.py` + prompt template + gọi LLM.
4. Viết `03_validate_script.py` + test cases.
5. **Mục tiêu cuối tuần:** từ `today_news.md` ra `scenes.json` đã validate.
   Chưa cần video.

### Tuần 2 — Voiceover + video thô

6. Đăng ký FPT.AI TTS, lấy API key.
7. Xây `tts_dictionary.json` từ bản tin mẫu, viết `04_make_voice.py`.
8. Cài Node 22 + HyperFrames, làm composition đơn giản 1 scene.
9. Tạo composition HyperFrames đầy đủ 8 scene — nếu dùng Claude Code đã
   cài skill thì dùng `/hyperframes`, nếu không thì đọc repo và tuân thủ
   quy tắc composition thủ công.
10. Viết `05_render_video.py` + `06_compress_video.py`.
11. **Mục tiêu cuối tuần:** có `final.mp4` chạy local, mở xem được.

### Tuần 3 — Telegram + duyệt

12. Tạo nhóm Telegram duyệt nội bộ (3-5 thành viên là cán bộ phòng).
13. Lấy `chat_id` của nhóm duyệt, thêm vào `.env`.
14. Viết `07_post_telegram.py`.
15. Viết `08_approve_handler.py` chạy service.
16. **Mục tiêu cuối tuần:** chạy `daily_run.py` → video xuất hiện ở nhóm
    duyệt, gõ `/approve` → video sang nhóm chính.

### Tuần 4+ — Vận hành thật

17. Cron job 6:30 sáng (sau khi Trợ lý 35 sinh bản tin).
18. **Mỗi ngày người duyệt phải xem video trước khi `/approve`.**
19. Khi phát hiện lỗi đọc TTS, bổ sung vào `tts_dictionary.json`.
20. Sau 4-8 tuần ổn định, mới cân nhắc bỏ bước duyệt thủ công.

---

## 8. Cho AI agent — hướng dẫn cụ thể

Khi bắt đầu code:

1. **Đọc `samples/today_news.md` trước**, hiểu cấu trúc đầu vào thực tế.
2. **Không skip bước validator.** Đây là cổng an toàn quan trọng nhất.
3. **Không tự thêm tính năng** như: tự chọn tin nổi bật, tự viết lại tiêu
   đề, tự dịch. Tất cả phải lấy nguyên văn từ bản tin gốc.
4. **Khi viết HyperFrames composition:** nếu Claude Code đã cài skill thì
   dùng `/hyperframes`. Nếu không có slash command, đọc tài liệu HyperFrames
   và tuân thủ thủ công: `class="clip"`, `data-start`, `data-duration`,
   GSAP `{ paused: true }`, `window.__timelines`.
5. **Mỗi bước viết xong, làm test với bản tin mẫu trước**, đừng chờ ghép
   end-to-end mới test.
6. **Log đầy đủ.** Mỗi script ghi log riêng. Khi production lỗi, log là
   thứ duy nhất giúp debug.
7. **Không log API key.** Mask khi log.
8. **File `.env` không commit.** Thêm vào `.gitignore`.

---

## 9. File `.env.example`

```env
# Đã có sẵn từ Trợ lý 35 — kế thừa
TELEGRAM_BOT_TOKEN=

# Mới cho video module
TELEGRAM_REVIEW_CHAT_ID=-100xxxxxxxxxx
TELEGRAM_MAIN_CHAT_ID=-100xxxxxxxxxx

# LLM để sinh scenes.json (không hard-code trong script)
ANTHROPIC_API_KEY=
LLM_MODEL=claude-opus-4-5
# hoặc dùng OpenAI:
# OPENAI_API_KEY=
# LLM_MODEL=gpt-4o

# TTS — chọn provider tại đây, không sửa code
TTS_PROVIDER=fpt           # fpt | viettel | openai
FPT_AI_TTS_API_KEY=
FPT_AI_TTS_VOICE=banmai    # banmai (nữ Bắc) hoặc leminh (nam Bắc)
FPT_AI_TTS_SPEED=0
VIETTEL_TTS_API_KEY=
VIETTEL_TTS_VOICE=hn-quynhanh

# Tùy chọn
LOG_LEVEL=INFO
WEBSITE_URL=https://baovenentang.vercel.app/
```

---

## 10. Checklist trước khi đăng video thật lên nhóm chính

Mỗi ngày, cán bộ duyệt phải check:

- [ ] Số hiệu mọi văn bản trong video khớp bản tin gốc.
- [ ] Tên cơ quan ban hành chính xác.
- [ ] Ngày tháng đúng.
- [ ] TTS đọc rõ, không sai tên riêng.
- [ ] Phụ đề không sai chính tả.
- [ ] Thời lượng 60-90 giây.
- [ ] Có logo Trợ lý 35 / Bảo vệ nền tảng.
- [ ] Caption đính kèm đúng định dạng.
- [ ] Không có nội dung nhạy cảm ngoài bản tin gốc.

---

## 11. Gì nên làm trước, gì để sau

**Làm ngay (tuần 1-3):**

- Pipeline 1→7, validator chặt, nhóm duyệt thủ công.
- Lock file chống chạy trùng.
- Archive tự động theo ngày.

**Để sau (tháng 2+):**

- Auto-approve sau khi đã ổn định.
- A/B test 2-3 phong cách hình ảnh.
- Đa giọng TTS (luân phiên giọng nam/nữ).
- Subtitle tự động bằng Whisper (verify lại lời đọc).
- Backup archive lên Drive nội bộ.
- Chuyển approve handler từ polling sang webhook.

**Không nên làm:**

- Để AI tự chọn 3 tin nổi bật mà không qua người duyệt.
- Bỏ qua bước validator.
- Hard-code tên model LLM hoặc tên TTS provider trong script.
- Đăng thẳng nhóm chính trong 2 tháng đầu.
- Lưu API key trong code thay vì `.env`.

---

*Kết thúc file hướng dẫn. Khi anh đưa file này vào Claude Code hoặc Codex,
bảo agent: "Đọc file này, hỏi tôi 3-5 câu rõ ràng nhất trước khi bắt đầu
viết code Tuần 1."*
