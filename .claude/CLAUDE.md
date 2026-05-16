# 🛡️ TRẬN ĐỊA SỐ - BẢO VỆ NỀN TẢNG (ASSISTANT 3.5)

Dự án AI chuyên biệt hỗ trợ cán bộ, đoàn viên (PA01 - Công an tỉnh Phú Thọ) trong công tác bảo vệ nền tảng tư tưởng của Đảng, nhận diện và phản bác thông tin sai trái.

## 🏗️ Kiến trúc hệ thống
- **Backend (Google Apps Script):** 
  - `01-config.gs`: Quản lý cấu hình tập trung từ Script Properties.
  - `02-news-crawler.gs`: Thu thập tin tức từ RSS (Nhân Dân, CAND, Chính phủ...) và HTML nguồn không có RSS.
  - `03-gemini-ai.gs`: Xử lý ngôn ngữ tự nhiên (Tóm tắt, Phân tích, Embedding).
  - `04-sheets-db.gs`: Giao tiếp với Google Sheets (Database).
  - `05-telegram-bot.gs`: Tích hợp bot thông báo qua Telegram.
  - `06-email-brevo.gs`: Gửi thông báo/email digest qua Brevo API.
  - `07-main.gs`: Điểm khởi đầu (Entry points: `doGet`, `doPost`, `runDailyNewsBot`).
  - `08-troly35.gs`: Logic cốt lõi của Trợ lý 35 (RAG, Pinecone integration).
  - `09-tccs.gs`: Pipeline TCCS — Scrape Tạp chí Cộng sản, tạo chunk động (AI paragraph plan), đồng bộ Pinecone, và sinh PHAN_BAC_KHO tự động từ toàn văn bài.
  - `11-bantin35.gs`: Module Bản tin 35 nội bộ — thu thập nguồn công khai cần theo dõi, phân tích AI, gửi Telegram/Email.
- **Frontend (Static Web):**
  - Đặt tại `/web`, deploy trên Vercel.
  - Sử dụng Vanilla JS (`app.js`, `troly35.js`) kết hợp CSS hiện đại.
  - Kết nối với Backend qua Web App URL của Apps Script.

## 🚀 Lệnh & Quy trình vận hành (Apps Script)
### Khởi tạo & Kiểm tra
- `setupSystem()`: Khởi tạo các Sheet, tạo Trigger hàng ngày và cấu hình ban đầu.
- `seedSampleData()`: Đổ dữ liệu mẫu cho Quiz và các luận điểm phản bác ban đầu.
- `testRun()`: Kiểm tra toàn bộ luồng Crawl -> AI -> Telegram.
- `showConfigSetupInstructions()`: Xem danh sách các Script Properties cần thiết.

### Quản lý Trợ lý 35 (RAG)
- `makeTroLy35AccessCodeHash('MA_CUA_BAN')`: Tạo mã hash SHA256 để điền vào cấu hình.
- `seedTroLy35KnowledgeFromPhanBac()`: Chuyển dữ liệu từ Sheet `PHAN_BAC` sang kho tri thức `PHAN_BAC_KHO`.
- `syncTroLy35KnowledgeToPinecone()`: Vector hóa và đồng bộ dữ liệu đã duyệt lên Pinecone.
- `testTroLy35Setup()`: Kiểm tra kết nối Gemini và Pinecone.
- `testTccsSingleUrl('URL')`: Kiểm tra extract/chunk plan động một bài Tạp chí Cộng sản.
- `runTccsSaveLeninArticlePlannedDraft()`: Lưu toàn văn và các chunk chọn lọc draft cho bài Lenin đang dùng để test.
- `runTccsSaveLeninArticleCoreDraft()`: Alias tương thích, trỏ sang chunk plan động.
- `runTccsScrapeDrafts(2)`: Lưu bài/chunk chọn lọc TCCS mới vào staging Sheets, mặc định chạy lô nhỏ để tránh timeout Apps Script.
- `syncTccsApprovedChunksToPinecone()`: Vector hóa chunk TCCS đã duyệt.
- `generatePhanBacFromTccs(3)`: Tự động sinh entry PHAN_BAC_KHO từ toàn văn bài TCCS đã scrape (tối đa N bài/lần, tránh timeout). Entry sinh ra có status "Chờ duyệt", cần admin duyệt trước khi sync Pinecone.
- `reviewPendingPhanBac()`: Xem danh sách entry PHAN_BAC_KHO đang chờ duyệt.

### Telegram & Webhook
- `setTelegramWebhook()`: Kích hoạt Webhook để Bot Telegram có thể nhận tin nhắn.

## 🌐 API Endpoints (doGet/doPost)
- `GET ?action=today`: Lấy danh sách tin tức trong ngày.
- `GET ?action=stats`: Lấy thống kê lượt dùng, bài viết.
- `GET ?action=quiz&count=10`: Lấy bộ câu hỏi trắc nghiệm ngẫu nhiên.
- `POST action: troly35_run`: Chạy phân tích/phản bác (Input: `mode`, `content`).
- `POST action: subscribe`: Đăng ký nhận tin qua Email/Telegram.

---

## 🧠 NGUYÊN TẮC PHÁT TRIỂN (KARPATHY GUIDELINES)

### 1. Suy nghĩ trước khi viết code (Think Before Coding)
- **Không giả định:** Nếu yêu cầu không rõ ràng, hãy dừng lại và hỏi.
- **Công khai sự nhầm lẫn:** Nếu có nhiều cách hiểu, hãy trình bày các phương án.
- **Ưu tiên sự đơn giản:** Luôn đề xuất giải pháp đơn giản nhất trước.

### 2. Sự đơn giản là trên hết (Simplicity First)
- **Code tối thiểu:** Chỉ viết mã cần thiết để giải quyết vấn đề.
- **Không trừu tượng hóa sớm:** Tránh tạo các class/function phức tạp cho việc chỉ dùng 1 lần.
- **Giới hạn GAS:** Nhớ rằng Apps Script có giới hạn thời gian chạy (6-30 phút) và quota UrlFetch.

### 3. Thay đổi mang tính "phẫu thuật" (Surgical Changes)
- **Chỉ chạm vào những gì cần thiết:** Không tự ý refactor code xung quanh nếu không liên quan.
- **Bảo vệ Metadata:** Không làm mất các docstring JSDoc quan trọng trong file `.gs`.
- **Khớp phong cách:** Tuân thủ cách đặt tên và cấu trúc modular hiện tại.

### 4. Thực thi theo mục tiêu (Goal-Driven Execution)
- **Xác minh thực tế:** Sau khi sửa code, hãy nêu rõ hàm nào cần chạy (ví dụ: `testRun`) để kiểm tra.
- **Lập kế hoạch từng bước:** 
  1. Chỉnh sửa logic xử lý → `Logger.log` kiểm tra data.
  2. Test end-to-end → Xác nhận kết quả trong Google Sheets.

---
> *"Vũ khí không thay thế được chiến sĩ, nhưng giúp chiến sĩ chiến đấu hiệu quả hơn 10 lần."*
