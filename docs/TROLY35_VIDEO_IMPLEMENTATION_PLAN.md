# Kế hoạch triển khai module video Trợ lý 35

Ngày lập: 24/05/2026

Tài liệu này chuyển nội dung đề xuất trong `docs/TROLY35_VIDEO_MODULE.md` thành kế hoạch triển khai theo giai đoạn, ưu tiên không ảnh hưởng workflow hiện tại của hệ thống Trợ lý 35.

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

## 4. Giai đoạn 0 - Chuẩn bị và chốt phạm vi

Mục tiêu: bảo đảm module video có thể phát triển mà không chạm vào luồng chính.

Task cần làm:

- Chọn nguồn đầu vào cho video:
  - Phương án A: dùng bản tin hằng ngày từ `runDailyNewsBot()`.
  - Phương án B: dùng bản tin nội bộ từ `BANTIN35_REPORTS`.
  - Khuyến nghị: bắt đầu với dữ liệu có cấu trúc tốt nhất trong Sheets, sau đó mới xuất markdown nếu cần.
- Xác định nhóm Telegram duyệt nội bộ và nhóm chính.
- Cài FFmpeg trên máy/server chạy worker.
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

## 5. Giai đoạn 1 - Chuẩn hóa đầu vào

Mục tiêu: tạo đầu vào ổn định cho video module.

Task cần làm:

- Thêm endpoint hoặc hàm Apps Script để export bản tin mới nhất.
- Output nên là JSON trước, markdown sau nếu cần.
- Dữ liệu export tối thiểu gồm:
  - ngày bản tin;
  - tiêu đề;
  - tổng hợp chung;
  - 3 tin nổi bật;
  - nguồn/link kiểm chứng;
  - văn bản pháp luật nếu có;
  - thông điệp/ngữ cảnh chính;
  - website/caption mặc định.
- Tạo fixture local:
  - `video_module/input/sample_news.json`;
  - `video_module/input/today_news.md` nếu vẫn muốn theo thiết kế ban đầu.
- Viết script pull dữ liệu từ GAS/Sheets về local, ví dụ `scripts/00_fetch_input.py`.

Tiêu chí hoàn thành:

- Chạy một lệnh có thể tạo input local ổn định.
- Có ít nhất 3 fixture từ bản tin thật để test.
- Input không chứa API key hoặc thông tin nhạy cảm không cần thiết.

## 6. Giai đoạn 2 - Pipeline khô: extractor, script generator, validator

Mục tiêu: từ input tạo được `scenes.json` hợp lệ, chưa tạo video.

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
  - gọi LLM qua biến môi trường;
  - temperature thấp;
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

Tiêu chí hoàn thành:

- Từ fixture thật tạo được `data/extracted_facts.json`.
- Tạo được `data/scenes.json`.
- Validator fail khi LLM bịa số hiệu văn bản.
- Chưa có bất kỳ lệnh gửi Telegram nào trong giai đoạn này.

## 7. Giai đoạn 3 - Voiceover và video local

Mục tiêu: tạo được `output/final.mp4` trên máy local, chưa tự đăng.

Task cần làm:

- Viết `data/tts_dictionary.json`.
- Viết normalizer cho TTS:
  - đọc số hiệu văn bản theo từng chữ số;
  - mở rộng viết tắt như `BCA`, `UBND`, `TW`, `NĐ-CP`;
  - giữ nguyên text hiển thị, chỉ đổi lời đọc.
- Viết adapter TTS:
  - `scripts/tts/base.py`;
  - `scripts/tts/fpt.py`;
  - `scripts/tts/viettel.py`;
  - `scripts/tts/openai_tts.py` nếu cần dự phòng.
- Viết `scripts/04_make_voice.py`.
- Cài và thử HyperFrames trong `video_module/hyperframes`.
- Tạo composition 9:16 tối giản trước, sau đó mở rộng đủ 8 scene.
- Viết `scripts/05_render_video.py`.
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

## 9. Giai đoạn 5 - Duyệt qua Telegram webhook Apps Script

Mục tiêu: dùng webhook hiện có để xử lý nút duyệt/từ chối.

Task cần làm:

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
  - fetch input;
  - extract facts;
  - make script;
  - validate;
  - make voice;
  - render;
  - compress;
  - post review.
- Thêm lock file chống chạy trùng.
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
