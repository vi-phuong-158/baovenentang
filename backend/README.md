# Backend Google Sheets + Google Apps Script

Backend này chạy hoàn toàn trên Google Apps Script và dùng Google Sheets làm database. Apps Script chịu trách nhiệm crawl RSS, gọi Gemini, ghi dữ liệu vào Sheets, gửi Telegram, gửi email qua Brevo và cung cấp API cho frontend.

## 1. Tạo Google Sheet

Tạo một Google Sheet mới, ví dụ `Trận Địa Số - Database`, rồi copy `SHEET_ID` trong URL:

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
appsscript.json
```

Nếu dùng Apps Script editor thủ công, bật manifest tại `Project Settings > Show "appsscript.json" manifest file in editor`, rồi thay nội dung bằng file `appsscript.json` trong thư mục này.

## 3. Cấu hình Script Properties

Không điền API key trực tiếp vào source. Vào `Project Settings > Script Properties` và thêm các key:

```text
SHEET_ID=...
GEMINI_API_KEY=...
TELEGRAM_TOKEN=...
TELEGRAM_CHANNEL=@ten_channel
BREVO_API_KEY=...
SENDER_EMAIL=email-da-verify@domain.vn
SENDER_NAME=Trận Địa Số - Phú Thọ
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
testRun()          // kiểm tra RSS, Gemini, Telegram nếu đã cấu hình đủ
```

`setupSystem()` sẽ tạo các sheet:

```text
TIN_TUC
DANG_KY
THONG_KE
PHAN_BAC
QUIZ
QUIZ_RESULT
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
```

## 6. Cập nhật frontend

Trong `web/js/app.js`, thay:

```javascript
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

bằng URL Web App đã deploy.

## Ghi chú vận hành

- Telegram webhook và API frontend cùng dùng entrypoint `doPost(e)` trong `07-main.gs`.
- Nếu chưa cấu hình Telegram hoặc Brevo, daily job vẫn crawl, tóm tắt và lưu Sheets; phần gửi tương ứng sẽ được bỏ qua có log cảnh báo.
- API key nên nằm trong Script Properties, không commit vào Git.
