# 🛠️ HƯỚNG DẪN CÀI ĐẶT - TRẬN ĐỊA SỐ

> Tài liệu này hướng dẫn từng bước để cài đặt hệ thống. Anh chỉ cần làm theo, không cần biết lập trình sâu.

---

## 📋 Chuẩn bị

Trước khi bắt đầu, anh cần có:

- [ ] Tài khoản Google (Gmail)
- [ ] Số điện thoại để xác thực Telegram
- [ ] Email để đăng ký Brevo
- [ ] Khoảng 1-2 giờ thời gian để setup

---

## BƯỚC 1: Tạo Google Sheets

1. Truy cập [Google Sheets](https://sheets.google.com/)
2. Tạo file mới, đặt tên: **"Trận Địa Số - Database"**
3. **Quan trọng:** Copy ID từ URL:
   ```
   https://docs.google.com/spreadsheets/d/[ID_NÀY_LẤY_RA]/edit
   ```
4. Lưu lại ID này, sẽ dùng ở bước 6

---

## BƯỚC 2: Lấy Gemini API Key (MIỄN PHÍ)

1. Truy cập: https://aistudio.google.com/app/apikey
2. Đăng nhập bằng tài khoản Google
3. Click **"Create API Key"**
4. Chọn project (hoặc tạo mới)
5. Copy API Key, lưu lại

> ⚠️ Gemini Free tier: 1.500 request/ngày — đủ dùng cho dự án này

---

## BƯỚC 3: Tạo Telegram Bot

1. Mở Telegram, tìm **@BotFather**
2. Gõ lệnh `/newbot`
3. Đặt tên bot (ví dụ: "Trận Địa Số PT")
4. Đặt username bot (phải kết thúc bằng `bot`, VD: `trandiadso_pt_bot`)
5. BotFather trả về **Bot Token**, copy lại

### Tạo Channel để bot gửi tin:

1. Trong Telegram, tạo **Channel** mới (Channel chứ không phải Group)
2. Đặt tên: "Trận Địa Số - Phú Thọ"
3. Đặt username (ví dụ: `trandiadso_phutho`)
4. **Thêm bot vừa tạo** vào channel và set quyền **Admin**
5. Lưu lại username channel (có dấu `@` ở đầu)

---

## BƯỚC 4: Đăng ký Brevo (Email Service)

1. Truy cập: https://www.brevo.com/
2. Đăng ký tài khoản miễn phí
3. Vào **SMTP & API** > **API Keys**
4. Click **"Generate a new API key"**
5. Đặt tên: "Trận Địa Số"
6. Copy API Key

### Verify Sender Email:

1. Vào **Senders, Domains & Dedicated IPs**
2. Add sender mới với email anh muốn dùng để gửi
3. Verify qua email xác nhận

> ⚠️ Brevo Free: 300 email/ngày — đủ cho giai đoạn đầu

---

## BƯỚC 5: Tạo Google Apps Script Project

1. Vào Google Sheets vừa tạo ở Bước 1
2. Menu **Extensions** > **Apps Script**
3. Một cửa sổ mới mở ra, đây là code editor
4. Đổi tên project: **"Trận Địa Số Backend"**

### Tạo các file code:

Trong Apps Script editor:

1. Xóa file `Code.gs` mặc định
2. Click dấu **+** > **Script** để tạo file mới
3. Tạo 8 script file và manifest với tên đúng (Click chuột phải > Rename):
   - `01-config.gs`
   - `02-rss-crawler.gs`
   - `03-gemini-ai.gs`
   - `04-sheets-db.gs`
   - `05-telegram-bot.gs`
   - `06-email-brevo.gs`
   - `07-main.gs`
   - `08-troly35.gs`
   - `appsscript.json` (bật hiển thị manifest trong Project Settings nếu copy thủ công)

4. **Copy nội dung từng file** từ thư mục `backend/` của dự án, paste vào file tương ứng

---

## BƯỚC 6: Cấu hình API Keys

Không điền API key trực tiếp vào file code. Trong Apps Script, vào **Project Settings** > **Script Properties** và thêm:

```text
SHEET_ID=1abc...xyz
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_HOST=https://your-index-host.svc....
PINECONE_NAMESPACE=troly35
TROLY35_ACCESS_CODE_SHA256=...
TROLY35_DAILY_LIMIT=50
TROLY35_SAVE_FULL_INPUT=false
TELEGRAM_TOKEN=7123456789:AAH...
TELEGRAM_CHANNEL=@trandiadso_phutho
BREVO_API_KEY=xkeysib-...
SENDER_EMAIL=no-reply@yourdomain.vn
SENDER_NAME=Trận Địa Số - Phú Thọ
ADMIN_EMAIL=admin@yourdomain.vn
MAX_ARTICLES_PER_DAY=10
MAX_ARTICLES_TELEGRAM=5
RUN_HOUR=6
```

Sau khi deploy Web App ở Bước 9, quay lại Script Properties để thêm `WEB_APP_URL`.

---

## BƯỚC 7: Chạy Setup ban đầu

1. Trong Apps Script editor, chọn file `07-main.gs`
2. Trên thanh chọn function, chọn `setupSystem`
3. Click **Run** (nút Play)
4. Lần đầu chạy, Google sẽ hỏi quyền:
   - Click **"Review permissions"**
   - Chọn tài khoản Google
   - Click **"Advanced"** > **"Go to Trận Địa Số (unsafe)"** (vì là script tự tạo)
   - Click **"Allow"**
5. Đợi chạy xong, xem **Execution log** ở dưới
6. Nếu thấy `✅ Setup hoàn tất!` là OK

### Kiểm tra:
- Quay lại Google Sheets, sẽ thấy các sheet mới được tạo: `TIN_TUC`, `DANG_KY`, `THONG_KE`, `PHAN_BAC`, `PHAN_BAC_KHO`, `TROLY35_HISTORY`, `QUIZ`, `QUIZ_RESULT`

### Thiết lập mã truy cập Trợ lý 35:
1. Trong Apps Script, chạy `makeTroLy35AccessCodeHash('MA_NOI_BO_ANH_CHON')`
2. Copy chuỗi hash trong log vào Script Property `TROLY35_ACCESS_CODE_SHA256`
3. Không chia sẻ hash; người dùng chỉ nhập mã gốc trên trang `troly35.html`

---

## BƯỚC 8: Test thử hệ thống

1. Trong Apps Script editor, chọn function `testRun`
2. Click **Run**
3. Xem log: phải thấy bot kéo được tin, AI tóm tắt OK
4. Vào Telegram Channel, sẽ thấy có tin nhắn test

### Nếu lỗi:
- **Telegram lỗi 401:** Kiểm tra lại TOKEN
- **Gemini lỗi 400:** Kiểm tra API Key
- **Brevo lỗi 401:** Kiểm tra API Key và Sender email đã verify chưa

---

## BƯỚC 9: Deploy Web App (cho Telegram Webhook)

1. Trong Apps Script: **Deploy** > **New deployment**
2. Click icon ⚙️ > Chọn **Web app**
3. Cấu hình:
   - **Description:** "Trận Địa Số API v1"
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**
5. Copy URL Web App (dạng: `https://script.google.com/macros/s/.../exec`)
6. Vào **Project Settings** > **Script Properties**, thêm/cập nhật `WEB_APP_URL`
7. Chạy `setTelegramWebhook()` 1 lần

---

## BƯỚC 10: Thêm dữ liệu mẫu (tùy chọn)

Chạy function `seedSampleData` 1 lần để có sẵn:
- 3 câu hỏi quiz mẫu
- 1 luận điểm phản bác mẫu

Sau này anh có thể vào Google Sheets để thêm thủ công các câu hỏi và luận điểm.

### Dữ liệu Trợ lý 35:

Sau khi có dữ liệu trong `PHAN_BAC`, chạy:

```text
seedTroLy35KnowledgeFromPhanBac()
```

Hoặc copy toàn bộ nội dung `docs/phanbac-sample-data.csv` và chạy:

```text
importTroLy35KnowledgeCsv(`DÁN_NỘI_DUNG_CSV_Ở_ĐÂY`)
```

Sau đó kiểm tra `PHAN_BAC_KHO`, để các dòng hợp lệ có `Trạng thái duyệt = Đã duyệt`, rồi chạy:

```text
syncTroLy35KnowledgeToPinecone()
```

Pinecone index cần là dense index dimension `768`, metric `cosine`.

---

## BƯỚC 11: Cài đặt chạy tự động hàng ngày

Function `setupSystem` đã tự tạo trigger chạy lúc 6h sáng mỗi ngày.

Kiểm tra:
1. Trong Apps Script, click biểu tượng **⏰ Triggers** ở thanh bên trái
2. Sẽ thấy 1 trigger: `runDailyNewsBot` - Daily - 6am

✅ **HOÀN TẤT BACKEND!** Hệ thống đã tự động chạy mỗi sáng.

---

## ✅ Checklist hoàn thành

- [ ] Đã có Google Sheets ID
- [ ] Đã có Gemini API Key
- [ ] Đã tạo Telegram Bot + Channel, bot là admin
- [ ] Đã có Brevo API Key, verify sender
- [ ] Đã copy 8 file code và `appsscript.json` vào Apps Script
- [ ] Đã điền đầy đủ thông tin trong Script Properties
- [ ] Đã cấu hình Pinecone và hash mã truy cập Trợ lý 35
- [ ] Chạy `setupSystem` thành công
- [ ] Chạy `syncTroLy35KnowledgeToPinecone` thành công nếu dùng Trợ lý 35
- [ ] Chạy `testRun` thấy bot gửi được tin Telegram
- [ ] Đã deploy Web App, lấy URL
- [ ] Đã cài Telegram Webhook
- [ ] Đã có trigger chạy hàng ngày

---

## 🎯 Bước tiếp theo

Đọc `docs/DEPLOY.md` để deploy phần web app lên Vercel.

---

## 🐛 Xử lý sự cố thường gặp

### "Service not available: ..."
→ Đợi vài phút rồi chạy lại, Google đôi khi delay.

### Quota exceeded
→ Chờ 24h reset, hoặc nâng cấp tài khoản.

### Email không nhận được
→ Check spam folder, verify lại sender domain trên Brevo.

### Bot không nhận lệnh
→ Chạy lại `setTelegramWebhook()` sau khi deploy Web App.

---

*Nếu gặp khó khăn, anh có thể dùng AI (như Claude) để hỗ trợ debug từng bước.*
