# Kế hoạch triển khai module video Trợ lý 35

Ngày lập: 24/05/2026
Cập nhật: 24/05/2026 - điều chỉnh sau review khả thi.

Tài liệu này chuyển nội dung đề xuất trong `docs/TROLY35_VIDEO_MODULE.md` thành kế hoạch triển khai theo giai đoạn, ưu tiên không ảnh hưởng workflow hiện tại của hệ thống Trợ lý 35.

## 0. Điều chỉnh sau review (24/05/2026)

Bản kế hoạch gốc đúng hướng về kiến trúc, nhưng có 7 điểm cần sửa trước khi bắt đầu code. Phần này ghi rõ thay đổi và lý do để tránh quay lại tranh luận sau.

### 0.1. Lock file phải cross-platform ngay từ đầu

- **Thay đổi:** không dùng `fcntl` trong `daily_run.py`. Viết helper `acquire_lock()` dùng `psutil.pid_exists(pid)` để kiểm tra job cũ còn sống không, hoạt động trên cả Windows và Linux.
- **Lý do:** máy chạy hiện tại là Windows. `fcntl` chỉ có trên Unix, code mẫu trong `TROLY35_VIDEO_MODULE.md` §6 sẽ crash ngay lần chạy đầu. File MODULE có ghi chú "lưu ý Windows" nhưng để sau là sai thứ tự — lock là thứ phải có ngay từ ngày đầu để không tạo video trùng.

### 0.2. PoC render video sớm trong Tuần 1, song song extractor

- **Thay đổi:** không đợi tới Giai đoạn 3 mới đụng HyperFrames. Trong Tuần 1, làm song song:
  - Track A: extractor + validator (như kế hoạch cũ).
  - Track B: PoC HyperFrames render 1 scene tĩnh 9:16 trên máy local, đo thời gian render và mức RAM.
- **Quyết định ở cuối Tuần 1:** nếu render 1 scene > 60s hoặc cài Puppeteer lỗi, fallback sang **MoviePy + Pillow** cho Giai đoạn 3.
- **Lý do:** HyperFrames + Puppeteer + GSAP là phần rủi ro kỹ thuật cao nhất, nhưng kế hoạch cũ để tới Tuần 2 mới chạm. Nếu phát hiện không khả thi muộn, phải làm lại từ Giai đoạn 3. Bản tin chính luận chủ yếu là text + logo + ảnh tĩnh — MoviePy hoàn toàn đủ và rẻ hơn nhiều về độ phức tạp môi trường.

### 0.3. TTS: thử edge-tts (miễn phí) trước, FPT.AI sau nếu cần

- **Thay đổi:** thứ tự ưu tiên provider trong adapter TTS:
  1. **edge-tts** (Microsoft Edge TTS, miễn phí, giọng `vi-VN-NamMinhNeural` nam Bắc và `vi-VN-HoaiMyNeural` nữ Bắc) — primary.
  2. FPT.AI (`banmai`/`leminh`) — backup khi cần giọng chính luận đặc thù hơn.
  3. Viettel AI — backup thứ hai.
  4. OpenAI TTS — dự phòng cuối.
- **Lý do:** FPT.AI free tier ~10k ký tự/tháng. Mỗi video 90 giây ≈ 1,500 ký tự, chạy 30 ngày = 45k ký tự → vượt free tier ngay tháng đầu, phải trả phí. edge-tts miễn phí không giới hạn, chất lượng tiếng Việt giọng Bắc tốt, đủ cho bản tin chính luận. Vẫn giữ adapter pattern để đổi provider không phải sửa code chính.

### 0.4. Cập nhật tên model LLM

- **Thay đổi:** trong `.env.example` và mọi tài liệu, đổi:
  - `LLM_MODEL=claude-opus-4-5` → `LLM_MODEL=claude-sonnet-4-6` (mặc định).
  - Ghi rõ có thể nâng lên `claude-opus-4-7` nếu cần chất lượng cao hơn cho scene khó.
- **Lý do:** `claude-opus-4-5` đã không còn là model hiện hành. Task này là structured JSON output từ prompt cố định, temperature 0.2 — Sonnet 4.6 dư sức và rẻ hơn Opus đáng kể (~5x). Chỉ nâng Opus nếu thực tế thấy Sonnet output kém.

### 0.5. Pipeline phải fail sớm khi chưa có bản tin mới

- **Thay đổi:** thêm bước 00 trong `daily_run.py`: kiểm tra `today_news.md` (hoặc JSON tương đương) có timestamp trong vòng 2 giờ gần nhất không. Nếu không, exit code 2 và gửi thông báo nhẹ "chưa có bản tin mới, bỏ qua hôm nay", **không** notify_failure (vì không phải lỗi).
- **Thay đổi cron:** dời từ 6:30 sáng → **7:30 sáng** để đảm bảo `runDailyNewsBot()` đã chạy xong.
- **Lý do:** nếu cron video chạy trước khi bản tin text sẵn sàng, sẽ tạo video từ bản tin của ngày hôm trước hoặc rỗng — sai nội dung là rủi ro nghiêm trọng với nội dung chính luận.

### 0.6. Giai đoạn 1 thuần local, KHÔNG sửa Apps Script

- **Thay đổi:** Giai đoạn 1 không thêm endpoint export trong GAS nữa. Thay vào đó:
  - Copy tay 3 bản tin thật gần nhất từ Telegram/Sheets thành 3 file `samples/news_YYYYMMDD.md`.
  - Pipeline khô (extractor + validator + scenes.json) chạy hoàn toàn trên fixture local.
  - Chỉ khi pipeline khô đã ổn (Giai đoạn 2 xong), mới đụng vào GAS để thêm endpoint export — sẽ làm trong Giai đoạn 4 hoặc 5.
- **Lý do:** nguyên tắc số 1 là "không chạm luồng chính nếu chưa cần". Sửa `backend/07-main.gs` để thêm endpoint export là chạm vào file đã production. Trì hoãn việc này tới khi thật sự cần video chạy tự động giảm rủi ro phá vỡ webhook `/quiz`, `/start`, `runDailyNewsBot()`.

### 0.7. Rút gọn lộ trình từ 6 giai đoạn ~4 tuần xuống MVP 2 tuần để đánh giá

- **Thay đổi:** đặt **mốc Go/No-Go ở cuối Tuần 2**. Nếu sau 2 tuần chưa có `final.mp4` xem được trên máy local, dừng lại đánh giá lại scope — có thể module không khả thi với resource hiện tại.
- **Lý do:** kế hoạch 6 giai đoạn dễ trôi 6-8 tuần mà không có sản phẩm nhìn thấy được. Mốc 2 tuần buộc team chốt sớm: HyperFrames hay MoviePy, edge-tts hay FPT.AI, fixture local hay export GAS.

### 0.8. Tổng kết các thay đổi áp dụng vào từng giai đoạn

| Giai đoạn | Thay đổi chính |
| --- | --- |
| 0 | Cài FFmpeg PATH, verify ngay; không cài clasp mới; không đăng ký FPT.AI vội |
| 1 | Bỏ task "thêm endpoint GAS"; dùng fixture local copy tay |
| 2 | Đổi default model `claude-sonnet-4-6`; thêm PoC HyperFrames song song |
| 3 | Đổi default TTS provider sang `edge-tts`; có nhánh fallback MoviePy nếu HyperFrames PoC fail |
| 4 | Lock file dùng `psutil` (không `fcntl`); thêm bước 00 check freshness bản tin |
| 5 | Endpoint export GAS chuyển vào đây (nếu pipeline đã ổn định) |
| 6 | Cron 7:30 sáng (không 6:30) |

## 1. Kết luận triển khai

Module video khả thi, nhưng cần triển khai như một worker độc lập chạy bên cạnh hệ thống hiện tại.

Workflow hiện tại không nên bị thay thế:

```text
Google Apps Script -> crawl/tóm tắt -> lưu Google Sheets -> gửi Telegram text/email
```

Workflow video nên chạy sau, tách biệt:

```text
Google Apps Script đã tạo bản tin -> export dữ liệu -> video_module tạo video -> gửi nhóm duyệt -> duyệt mới gửi nhóm chính
```

Nguyên tắc chính:

- Không sửa luồng crawl, tóm tắt, lưu Sheets, gửi bản tin text/email hiện tại nếu không cần thiết.
- Nếu module video lỗi, bản tin text/email vẫn phải chạy bình thường.
- Không tự đăng video vào nhóm chính trong giai đoạn đầu.
- Mọi số hiệu văn bản, tên riêng, ngày tháng, cơ quan ban hành phải được lấy từ dữ liệu gốc và qua validator.
- Không để Python polling Telegram song song với webhook Apps Script hiện tại.

## 2. Hiện trạng cần lưu ý

Repo hiện tại dùng:

- Frontend React/Vite trong `web/`.
- Backend Google Apps Script trong `backend/`.
- Google Sheets làm database.
- Gemini cho tóm tắt và AI.
- Telegram bot đang được xử lý qua Apps Script webhook.

Các điểm chưa khớp với tài liệu module video:

- Chưa có file `samples/today_news.md`.
- Chưa thấy pipeline hiện tại xuất `input/today_news.md`.
- Bản tin đang nằm trong Sheets/Apps Script, không phải file markdown local.
- Máy local đã có Python và Node đủ yêu cầu, nhưng thiếu FFmpeg trong PATH.
- Approve handler nên tích hợp vào webhook Apps Script hiện có, không nên tạo polling service dùng chung bot.

## 3. Mục tiêu theo giai đoạn

Nếu bắt đầu từ ngày 25/05/2026, lộ trình thực tế nên chia như sau.

| Giai đoạn | Thời gian dự kiến | Mục tiêu chính | Mức ảnh hưởng workflow hiện tại |
| --- | --- | --- | --- |
| 0 | 1-2 ngày | Chốt đầu vào, môi trường, phạm vi | Không ảnh hưởng |
| 1 | 2-4 ngày | Export bản tin thành dữ liệu cố định | Thấp |
| 2 | 4-6 ngày | Tạo `scenes.json` và validator | Không ảnh hưởng gửi tin |
| 3 | 4-7 ngày | Tạo voiceover và video local | Không ảnh hưởng gửi tin |
| 4 | 3-5 ngày | Gửi video vào nhóm duyệt | Thấp |
| 5 | 3-5 ngày | Duyệt/từ chối qua Telegram webhook | Trung bình thấp |
| 6 | 2-4 tuần | Chạy thử vận hành, tinh chỉnh | Thấp nếu giữ duyệt thủ công |

> **Mốc Go/No-Go cuối Tuần 2 (§0.7):** sau 2 tuần kể từ ngày bắt đầu, phải có `final.mp4` xem được trên máy local (kết quả của Giai đoạn 0+1+2+3). Nếu chưa có, dừng và đánh giá lại scope thay vì cố hoàn thành Giai đoạn 4-6.

## 4. Giai đoạn 0 - Chuẩn bị và chốt phạm vi

Mục tiêu: bảo đảm module video có thể phát triển mà không chạm vào luồng chính.

Task cần làm:

- Chọn nguồn đầu vào cho video:
  - Phương án A: dùng bản tin hằng ngày từ `runDailyNewsBot()`.
  - Phương án B: dùng bản tin nội bộ từ `BANTIN35_REPORTS`.
  - Khuyến nghị: bắt đầu với dữ liệu có cấu trúc tốt nhất trong Sheets, sau đó mới xuất markdown nếu cần.
- Xác định nhóm Telegram duyệt nội bộ và nhóm chính.
- Cài FFmpeg trên máy/server chạy worker, verify `ffmpeg -version` chạy được trong PowerShell.
- **Không** đăng ký FPT.AI TTS ở giai đoạn này (xem §0.3) — sẽ dùng edge-tts miễn phí làm primary, chỉ đăng ký FPT.AI nếu edge-tts không đủ chất lượng.
- Chốt nơi chạy worker:
  - Máy Windows qua Task Scheduler.
  - Hoặc VPS chạy cron/PM2.
- Tạo file `.env.example` riêng cho `video_module`.
- Không dùng chung file cấu hình nhạy cảm của Apps Script.

Tiêu chí hoàn thành:

- Có quyết định rõ nguồn đầu vào.
- Có môi trường chạy được `python --version`, `node --version`, `ffmpeg -version`.
- Có nhóm duyệt nội bộ.
- Có nguyên tắc: video lỗi không làm hỏng bản tin text.

## 5. Giai đoạn 1 - Chuẩn hóa đầu vào (chỉ local, không sửa GAS)

Mục tiêu: tạo đầu vào ổn định cho video module **mà không chạm Apps Script**.

> **Điều chỉnh sau review (§0.6):** Giai đoạn này KHÔNG còn thêm endpoint GAS. Endpoint export chuyển sang Giai đoạn 5 và chỉ làm khi pipeline khô đã ổn định.

Task cần làm:

- Copy tay 3 bản tin thật gần nhất từ Telegram/Sheets thành fixture local:
  - `video_module/samples/news_YYYYMMDD_1.md`;
  - `video_module/samples/news_YYYYMMDD_2.md`;
  - `video_module/samples/news_YYYYMMDD_3.md`.
- Định nghĩa schema JSON đầu vào (chưa cần script generate, viết tay 1 file `samples/sample_news.json` đối chiếu với 1 trong 3 file markdown để chốt cấu trúc).
- Schema tối thiểu gồm:
  - ngày bản tin;
  - tiêu đề;
  - tổng hợp chung;
  - 3 tin nổi bật;
  - nguồn/link kiểm chứng;
  - văn bản pháp luật nếu có;
  - thông điệp/ngữ cảnh chính;
  - website/caption mặc định.

Tiêu chí hoàn thành:

- Có 3 file markdown bản tin thật trong `samples/`.
- Có 1 file `sample_news.json` thể hiện schema.
- Chưa đụng vào bất kỳ file nào trong `backend/`.

## 6. Giai đoạn 2 - Pipeline khô + PoC render (song song)

Mục tiêu: từ input tạo được `scenes.json` hợp lệ **VÀ** chốt được công nghệ render trước khi sang Giai đoạn 3.

> **Điều chỉnh sau review (§0.2):** thêm Track B chạy song song với pipeline khô để chốt sớm HyperFrames có khả thi hay phải fallback MoviePy. Đây là cách tránh phát hiện rủi ro kỹ thuật muộn ở Giai đoạn 3.

### Track A - Pipeline khô (như cũ)

Task cần làm:

- Tạo thư mục `video_module/` theo cấu trúc tối thiểu:

```text
video_module/
├── README.md
├── .env.example
├── requirements.txt
├── daily_run.py
├── input/
├── data/
├── logs/
├── prompts/
├── scripts/
└── tests/
```

- Viết `scripts/01_extract_facts.py`:
  - trích số hiệu văn bản;
  - trích ngày tháng;
  - trích cơ quan ban hành;
  - trích tiêu đề/tin chính;
  - không dùng LLM.
- Viết `prompts/make_script.md`.
- Viết `scripts/02_make_script.py`:
  - gọi LLM qua biến môi trường `LLM_MODEL` (mặc định `claude-sonnet-4-6`, xem §0.4);
  - temperature thấp (0.2);
  - bắt buộc JSON thuần;
  - retry khi parse lỗi.
- Viết `scripts/03_validate_script.py`:
  - đủ 8 scene cố định;
  - tổng thời lượng 60-90 giây;
  - số hiệu văn bản trong scene phải có trong facts;
  - ngày tháng phải khớp facts;
  - tên cơ quan/cấp ban hành phải khớp facts;
  - scene text không quá dài.
- Viết unit test:
  - `tests/test_extractor.py`;
  - `tests/test_validator.py`.

### Track B - PoC render (song song với Track A)

- Cài HyperFrames trong `video_module/hyperframes`.
- Tạo composition tối giản 9:16 với 1 scene tĩnh (logo + tiêu đề).
- Render thử bằng `npx hyperframes render`.
- Đo:
  - thời gian render 1 scene 6 giây;
  - mức RAM peak;
  - có cài đặt thêm gì ngoài hướng dẫn không.

### Quyết định Go/No-Go cuối Giai đoạn 2

- Nếu render 1 scene < 30s và môi trường ổn → Giai đoạn 3 dùng **HyperFrames**.
- Nếu render > 60s, hoặc Puppeteer/Chromium lỗi không khắc phục được trong 1 ngày → Giai đoạn 3 fallback **MoviePy + Pillow** (xem §0.2).

Tiêu chí hoàn thành:

- Từ fixture thật tạo được `data/extracted_facts.json`.
- Tạo được `data/scenes.json`.
- Validator fail khi LLM bịa số hiệu văn bản.
- Có quyết định rõ HyperFrames hay MoviePy cho Giai đoạn 3.
- Chưa có bất kỳ lệnh gửi Telegram nào trong giai đoạn này.

## 7. Giai đoạn 3 - Voiceover và video local

Mục tiêu: tạo được `output/final.mp4` trên máy local, chưa tự đăng.

Task cần làm:

- Viết `data/tts_dictionary.json`.
- Viết normalizer cho TTS:
  - đọc số hiệu văn bản theo từng chữ số;
  - mở rộng viết tắt như `BCA`, `UBND`, `TW`, `NĐ-CP`;
  - giữ nguyên text hiển thị, chỉ đổi lời đọc.
- Viết adapter TTS (xem §0.3, thứ tự ưu tiên đã đổi):
  - `scripts/tts/base.py`;
  - `scripts/tts/edge.py` — **primary**, dùng edge-tts (miễn phí, không quota), giọng `vi-VN-NamMinhNeural` hoặc `vi-VN-HoaiMyNeural`;
  - `scripts/tts/fpt.py` — backup;
  - `scripts/tts/viettel.py` — backup thứ 2;
  - `scripts/tts/openai_tts.py` — dự phòng cuối.
- Viết `scripts/04_make_voice.py` đọc `TTS_PROVIDER` từ `.env`, mặc định `edge`.
- Render video:
  - Nếu Giai đoạn 2 chốt HyperFrames: mở rộng composition từ 1 scene PoC lên đủ 8 scene.
  - Nếu chốt MoviePy: viết `scripts/05_render_video.py` dùng MoviePy + Pillow, không cần Node/HyperFrames.
- Viết `scripts/06_compress_video.py` dùng FFmpeg.
- Kiểm tra dung lượng video, mục tiêu dưới 50 MB.

Tiêu chí hoàn thành:

- Có `audio/voiceover.mp3`.
- Có `output/video_raw.mp4`.
- Có `output/final.mp4`.
- Video xem được, đúng 9:16, phụ đề không tràn.
- Chưa đăng lên Telegram tự động.

## 8. Giai đoạn 4 - Đăng nhóm duyệt nội bộ

Mục tiêu: video chỉ được gửi vào nhóm duyệt, không gửi nhóm chính.

Task cần làm:

- Viết `scripts/07_post_telegram_review.py`.
- Dùng bot Telegram hiện có.
- Gửi video bằng `sendVideo`.
- Caption phải ghi rõ đây là bản nháp chờ duyệt.
- Kèm inline keyboard:
  - Duyệt và đăng;
  - Từ chối.
- Lưu trạng thái pending:
  - ngày tạo;
  - message_id;
  - Telegram file_id nếu có;
  - đường dẫn local;
  - hash file;
  - trạng thái `pending`.
- Log đầy đủ request/response, nhưng không log token.

Tiêu chí hoàn thành:

- Chạy script thì video xuất hiện ở nhóm duyệt.
- Nhóm chính chưa nhận video.
- Có file pending review để đối chiếu.

## 9. Giai đoạn 5 - Duyệt qua Telegram webhook Apps Script + endpoint export

Mục tiêu: dùng webhook hiện có để xử lý nút duyệt/từ chối, **và đây mới là lúc thêm endpoint export bản tin** (đã dời từ Giai đoạn 1, xem §0.6).

> **Điều chỉnh sau review:** chỉ sửa GAS khi pipeline khô + render + TTS đã ổn định trên fixture local. Trước thời điểm này, mọi thay đổi Apps Script đều bị hoãn để bảo vệ luồng chính.

Task cần làm:

- Thêm endpoint hoặc action export bản tin mới nhất ra JSON (action mới, không sửa action cũ).
- Viết `scripts/00_fetch_input.py` pull JSON từ GAS về `video_module/input/today_news.json`.
- Sửa `backend/07-main.gs` để xử lý `callback_query`.
- Thêm hàm xử lý approve/reject trong `backend/05-telegram-bot.gs` hoặc module riêng.
- Kiểm tra người bấm nút:
  - nằm trong danh sách admin được phép;
  - hoặc là admin của nhóm duyệt nếu gọi được Telegram API.
- Khi approve:
  - lấy `file_id` video từ message ở nhóm duyệt;
  - gửi sang `TELEGRAM_MAIN_CHAT_ID`;
  - cập nhật caption chính thức;
  - trả lời callback;
  - ghi log người duyệt và thời gian.
- Khi reject:
  - cập nhật trạng thái từ chối;
  - trả lời callback;
  - không gửi sang nhóm chính.
- Thêm Script Properties mới:
  - `TELEGRAM_REVIEW_CHAT_ID`;
  - `TELEGRAM_MAIN_CHAT_ID`;
  - `TELEGRAM_APPROVER_IDS`.

Tiêu chí hoàn thành:

- Bấm Duyệt thì video sang nhóm chính.
- Bấm Từ chối thì video không sang nhóm chính.
- Người không có quyền không duyệt được.
- Webhook Telegram hiện tại vẫn xử lý `/quiz`, `/start`, `/help` bình thường.

## 10. Giai đoạn 6 - Daily run và vận hành thử

Mục tiêu: chạy bán tự động hằng ngày, vẫn có người duyệt.

Task cần làm:

- Viết `daily_run.py` gom các bước:
  - **00 check freshness** — kiểm tra bản tin có timestamp < 2h, nếu không thì exit code 2 và log "bỏ qua" (xem §0.5);
  - fetch input;
  - extract facts;
  - make script;
  - validate;
  - make voice;
  - render;
  - compress;
  - post review.
- Thêm lock file cross-platform dùng `psutil.pid_exists()`, **không dùng `fcntl`** (xem §0.1). Verify lock chạy được trên Windows trước khi merge.
- Cron / Task Scheduler đặt **7:30 sáng**, không phải 6:30 (xem §0.5) để chắc chắn `runDailyNewsBot()` đã chạy xong.
- Thêm archive theo ngày:

```text
archive/YYYYMMDD/
├── input.json
├── extracted_facts.json
├── scenes.json
├── voiceover.mp3
├── final.mp4
└── run.log
```

- Cấu hình Task Scheduler/cron chạy sau khi bản tin text đã sinh xong.
- Khi lỗi, gửi thông báo vào nhóm duyệt.
- Lập checklist duyệt video hằng ngày.

Tiêu chí hoàn thành:

- Chạy tự động tạo video và gửi nhóm duyệt.
- Lỗi ở video không ảnh hưởng bản tin text/email.
- Có log và archive đủ để truy vết.
- Vận hành tối thiểu 2 tuần không bỏ qua bước duyệt.

## 11. Ma trận rủi ro

| Rủi ro | Mức độ | Cách giảm rủi ro |
| --- | --- | --- |
| LLM bịa số hiệu văn bản | Cao | Extractor + validator bắt buộc, fail thì dừng |
| TTS đọc sai tên riêng | Trung bình cao | Dictionary, duyệt thủ công, log lỗi để bổ sung |
| Video lỗi làm hỏng bản tin hiện tại | Thấp nếu tách module | Không nối video vào `runDailyNewsBot()` |
| Telegram webhook xung đột polling | Cao | Không dùng polling Python cho bot hiện có |
| FFmpeg/HyperFrames lỗi môi trường | Trung bình | Kiểm tra môi trường ở giai đoạn 0 |
| Video quá nặng | Trung bình | Nén FFmpeg, tăng CRF nếu > 50 MB |
| Lộ token/API key | Cao | `.env`, Script Properties, không log secret |
| Người không có quyền duyệt | Cao | Whitelist approver/admin check |

## 12. Phân công task kỹ thuật chi tiết

### Apps Script

- Export bản tin mới nhất thành JSON.
- Thêm callback handler cho inline keyboard.
- Thêm cấu hình nhóm duyệt, nhóm chính, danh sách người duyệt.
- Giữ nguyên luồng `runDailyNewsBot()` và `runBanTin35DailyStep()`.

### Python worker

- Fetch input từ Apps Script.
- Extract facts.
- Generate script bằng LLM.
- Validate script.
- Normalize TTS.
- Gọi TTS.
- Điều phối daily run.
- Post video vào nhóm duyệt.
- Archive và log.

### Node/HyperFrames

- Tạo composition 9:16.
- Render 8 scene theo `scenes.json`.
- Đảm bảo subtitle không tràn.
- Render được video raw ổn định.

### FFmpeg

- Ghép audio.
- Nén H.264/AAC.
- Kiểm tra dung lượng.
- Xuất `final.mp4`.

### QA vận hành

- Test với ít nhất 3 bản tin thật.
- Test validator với dữ liệu sai cố ý.
- Test nút duyệt/từ chối.
- Test người không có quyền duyệt.
- Test khi TTS lỗi.
- Test khi video render lỗi.

## 13. Thứ tự ưu tiên thực hiện

Ưu tiên 1:

- Chốt đầu vào.
- Tạo fixture thật.
- Viết extractor và validator.

Ưu tiên 2:

- Sinh `scenes.json` ổn định.
- Tạo voiceover.
- Render video local.

Ưu tiên 3:

- Gửi nhóm duyệt.
- Xử lý approve/reject trong Apps Script webhook.

Ưu tiên 4:

- Tự động hóa daily run.
- Archive/log.
- Tinh chỉnh thiết kế video.

Không làm trong giai đoạn đầu:

- Auto-approve.
- Đăng thẳng nhóm chính.
- Tự chọn tin ngoài nguồn đã có.
- Tự tạo nội dung mới không có trong bản tin gốc.
- Thêm polling Telegram song song webhook.

## 14. Mốc nghiệm thu đề xuất

Mốc 1 - Không ảnh hưởng hệ thống:

- Có input fixture.
- Có extractor/validator.
- Không sửa luồng gửi bản tin hiện tại.

Mốc 2 - Có video local:

- Có `final.mp4`.
- Có voiceover tiếng Việt.
- Có subtitle.
- Có archive/log.

Mốc 3 - Có nhóm duyệt:

- Video gửi vào nhóm duyệt.
- Chưa gửi nhóm chính.
- Pending review lưu được trạng thái.

Mốc 4 - Duyệt thật:

- Approve gửi sang nhóm chính.
- Reject không gửi.
- Chỉ người được phép duyệt.

Mốc 5 - Vận hành thử:

- Chạy hằng ngày tối thiểu 2 tuần.
- Không ảnh hưởng bản tin text/email.
- TTS dictionary được cập nhật theo lỗi thực tế.

## 15. Khuyến nghị cuối cùng

Nên bắt đầu bằng một nhánh triển khai rất hẹp:

```text
Export bản tin thật -> scenes.json đã validate -> dừng
```

Chỉ sau khi bước này ổn định mới làm TTS, HyperFrames và Telegram. Đây là cách giảm rủi ro tốt nhất vì phần nguy hiểm nhất không phải render video, mà là bảo đảm nội dung chính xác và không làm gián đoạn workflow hiện tại.
