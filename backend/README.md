# Backend Google Sheets + Google Apps Script

Backend này chạy hoàn toàn trên Google Apps Script và dùng Google Sheets làm database. Apps Script chịu trách nhiệm crawl RSS và nguồn HTML không có RSS, gọi Gemini, ghi dữ liệu vào Sheets, gửi Telegram, gửi email qua Brevo và cung cấp API cho frontend.

## 1. Tạo Google Sheet

Tạo một Google Sheet mới, ví dụ `Trợ lý 35 - Database`, rồi copy `SHEET_ID` trong URL:

```text
https://docs.google.com/spreadsheets/d/SHEET_ID/edit
```

## 2. Tạo Apps Script project

Trong Google Sheet: `Extensions > Apps Script`.

Tạo/copy các file trong thư mục này lên Apps Script:

```text
01-config.gs
02-rss-crawler.gs
03-gemini-ai.gs
04-sheets-db.gs
05-telegram-bot.gs
06-email-brevo.gs
07-main.gs
08-troly35.gs
09-tccs-scraper.gs
10-html-crawler.gs
appsscript.json
```

Nếu dùng Apps Script editor thủ công, bật manifest tại `Project Settings > Show "appsscript.json" manifest file in editor`, rồi thay nội dung bằng file `appsscript.json` trong thư mục này.

## 3. Cấu hình Script Properties

Không điền API key trực tiếp vào source. Vào `Project Settings > Script Properties` và thêm các key:

```text
SHEET_ID=...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
PINECONE_API_KEY=...
PINECONE_INDEX_HOST=https://your-index-host.svc....
PINECONE_NAMESPACE=troly35
TROLY35_ACCESS_CODE_SHA256=...
TROLY35_DAILY_LIMIT=50
TROLY35_SAVE_FULL_INPUT=false
TCCS_BASE_URL=https://www.tapchicongsan.org.vn
TCCS_SECTION_PATH=/dau-tranh-phan-bac-cac-luan-dieu-sai-trai-thu-dich
TCCS_MAX_ARTICLES_PER_RUN=5
TCCS_REQUEST_DELAY_MS=2500
HTML_SOURCE_MAX_ARTICLES_PER_SOURCE=5
HTML_SOURCE_REQUEST_DELAY_MS=1500
TELEGRAM_TOKEN=...
TELEGRAM_CHANNEL=@ten_channel
BREVO_API_KEY=...
SENDER_EMAIL=email-da-verify@domain.vn
SENDER_NAME=Trợ lý 35 - Phú Thọ
WEB_APP_URL=https://script.google.com/macros/s/.../exec
ADMIN_EMAIL=admin@domain.vn
MAX_ARTICLES_PER_DAY=10
MAX_ARTICLES_TELEGRAM=5
RUN_HOUR=6
```

Có thể chạy hàm `showConfigSetupInstructions()` trong Apps Script để in mẫu cấu hình ra Execution log.

## 4. Khởi tạo hệ thống

Chạy lần lượt:

```text
setupSystem()
seedSampleData()   // tùy chọn, tạo quiz và phản bác mẫu
testRun()          // kiểm tra nguồn tin, Gemini, Telegram nếu đã cấu hình đủ
```

`setupSystem()` sẽ tạo các sheet:

```text
TIN_TUC
DANG_KY
THONG_KE
PHAN_BAC
QUIZ
QUIZ_RESULT
PHAN_BAC_KHO
TCCS_ARTICLES
TCCS_CHUNKS
TCCS_SCRAPE_LOG
TROLY35_HISTORY
```

và tạo trigger chạy `runDailyNewsBot()` hằng ngày theo `RUN_HOUR`.

## 5. Deploy Web App

Trong Apps Script chọn `Deploy > New deployment > Web app`.

Cấu hình:

```text
Execute as: Me
Who has access: Anyone
```

Sau khi deploy, copy URL vào Script Property `WEB_APP_URL`, sau đó chạy:

```text
setTelegramWebhook()
```

Các endpoint API cho frontend:

```text
GET  ?action=today
GET  ?action=stats
GET  ?action=quiz&count=10
GET  ?action=rebuttals&keyword=...
POST { "action": "subscribe", ... }
POST { "action": "submit_quiz", ... }
POST { "action": "troly35_run", "accessCode": "...", "mode": "rebuttal|fact_check|article_writer", "content": "...", "sourceUrl": "...", "topic": "..." }
POST { "action": "troly35_rate", "accessCode": "...", "requestId": "...", "rating": 1-5, "note": "..." }
POST { "action": "troly35_history", "accessCode": "...", "limit": 20 }
POST { "action": "troly35_trends", "accessCode": "...", "windowDays": 7|30 }
```

## 6. Thiết lập Trợ lý 35

1. Tạo Pinecone dense index dimension `768`, metric `cosine`.
2. Điền `PINECONE_API_KEY` và `PINECONE_INDEX_HOST` vào Script Properties.
3. Chạy `makeTroLy35AccessCodeHash('MA_NOI_BO')`, copy hash vào `TROLY35_ACCESS_CODE_SHA256`.
4. Chạy `seedSampleData()` hoặc `seedTroLy35KnowledgeFromPhanBac()` để đổ dữ liệu từ `PHAN_BAC` sang `PHAN_BAC_KHO`. Nếu muốn import trực tiếp CSV mẫu, copy nội dung `docs/phanbac-sample-data.csv` và chạy `importTroLy35KnowledgeCsv(\`...\`)`.
5. Kiểm tra các dòng trong `PHAN_BAC_KHO` có `Trạng thái duyệt = Đã duyệt`.
6. Chạy `syncTroLy35KnowledgeToPinecone()` để vector hóa dữ liệu đã duyệt.
7. Chạy `testTroLy35Setup()` để kiểm tra cấu hình.

### Nạp dữ liệu Tạp chí Cộng sản cho RAG

1. Chạy `testTccsSingleUrl('URL_BAI_VIET')` để kiểm tra extract và chunk 600-800 từ.
2. Chạy `runTccsScrapeDrafts(3)` để lưu bài/chunk mới vào `TCCS_ARTICLES` và `TCCS_CHUNKS`.
3. Kiểm tra `TCCS_CHUNKS`, đổi `Trạng thái duyệt` từ `Draft` sang `Approved` cho chunk dùng được.
4. Chạy `syncTccsApprovedChunksToPinecone()` để index các chunk đã duyệt.
5. Trợ lý 35 sẽ hydrate full chunk từ `TCCS_CHUNKS` khi Pinecone trả về match có `source_type=tccs_chunk`.

## 7. Cập nhật frontend

Trong `web/js/app.js` và `web/js/troly35.js`, thay:

```javascript
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

bằng URL Web App đã deploy.

## Ghi chú vận hành

- Telegram webhook và API frontend cùng dùng entrypoint `doPost(e)` trong `07-main.gs`.
- Nếu chưa cấu hình Telegram hoặc Brevo, daily job vẫn crawl, tóm tắt và lưu Sheets; phần gửi tương ứng sẽ được bỏ qua có log cảnh báo.
- API key nên nằm trong Script Properties, không commit vào Git.
