# REVIEW — Trợ lý 35 (Đánh giá kỹ thuật toàn diện)

> Ngày review: 2026-05-14  
> Người review: Claude Code (AI Assistant)  
> Phạm vi: Backend GAS, Frontend Web, Kiến trúc tổng thể

---

## TÓM TẮT ĐIỂM SỐ

| Hạng mục | Điểm | Ghi chú |
|----------|------|---------|
| Bảo mật | 4/10 | Nhiều lỗ hổng nghiêm trọng |
| Hiệu năng | 6/10 | Chức năng hoạt động nhưng chưa tối ưu |
| Chất lượng code | 7/10 | Khá sạch, còn một số vấn đề nhỏ |
| Giao diện/UX | 7/10 | Đẹp, thiếu accessibility và edge cases |
| Kiến trúc | 6/10 | Modular tốt, nhưng coupling chặt |

---

## NHÓM 1 — BẢO MẬT (Security)

### [SEC-01] API URL bị lộ trong client-side JavaScript
- **Mức độ:** CRITICAL
- **File:** `web/js/app.js:6`, `web/js/troly35.js:5`
- **Vấn đề:** URL của Google Apps Script Web App được hardcode trong JavaScript. Bất kỳ ai mở DevTools đều thấy endpoint thực, có thể dùng để tấn công hoặc spam API trực tiếp.
- **Hậu quả:** Kẻ tấn công biết chính xác endpoint để khai thác các lỗ hổng khác.

---

### [SEC-02] Không có authentication trên toàn bộ API
- **Mức độ:** HIGH
- **File:** `backend/07-main.gs` — hàm `doGet`, `doPost`
- **Vấn đề:** Tất cả endpoints (`today`, `quiz`, `rebuttals`, `subscribe`) đều hoàn toàn công khai, không cần bất kỳ token hay key nào.
- **Hậu quả:** Bot tự động có thể scrape toàn bộ nội dung, spam đăng ký, gọi API vô hạn.

---

### [SEC-03] Mã truy cập Trợ lý 35 dùng SHA-256 không có salt
- **Mức độ:** HIGH
- **File:** `backend/08-troly35.gs` — hàm `troLy35Hash_()` (~dòng 1050)
- **Vấn đề:** SHA-256 thuần không salt. Cùng mật khẩu luôn cho cùng hash — dễ tấn công bằng rainbow table. Không có giới hạn số lần thử sai.
- **Hậu quả:** Mã truy cập có thể bị crack nếu kẻ tấn công có hash.

---

### [SEC-04] Link "Hủy đăng ký" trong email không hoạt động
- **Mức độ:** HIGH (pháp lý)
- **File:** `backend/06-email-brevo.gs` — HTML email template (~dòng 243)
- **Vấn đề:** `<a href="#">Hủy đăng ký</a>` trỏ vào `#`, không có endpoint xử lý unsubscribe.
- **Hậu quả:** Vi phạm quy định email marketing, email dễ bị báo spam, mất uy tín.

---

### [SEC-05] Dữ liệu người dùng lưu plaintext trên Google Sheets
- **Mức độ:** MEDIUM
- **File:** `backend/04-sheets-db.gs` — hàm `addSubscriber()` (~dòng 171)
- **Vấn đề:** Email, họ tên, username Telegram lưu văn bản thường trên Sheets. Nếu link Sheets bị lộ hoặc share nhầm là lộ toàn bộ.
- **Hậu quả:** Rò rỉ thông tin cán bộ, ảnh hưởng an ninh.

---

### [SEC-06] Không có rate limiting trên API
- **Mức độ:** MEDIUM
- **File:** `backend/07-main.gs`
- **Vấn đề:** Không giới hạn số lần gọi API từ một IP/client. Không có debounce phía frontend cho search.
- **Hậu quả:** Bot có thể làm cạn quota Gemini, Pinecone, Brevo trong vài phút.

---

### [SEC-07] Validation đầu vào yếu
- **Mức độ:** MEDIUM
- **File:** `backend/08-troly35.gs` (~dòng 177), `backend/04-sheets-db.gs` (~dòng 380)
- **Vấn đề:** `topic` từ người dùng được đưa thẳng vào prompt Gemini mà không sanitize → prompt injection risk. Email validation dùng regex đơn giản có thể bypass.
- **Hậu quả:** Có thể thao túng hành vi AI, inject nội dung độc hại vào prompt.

---

## NHÓM 2 — HIỆU NĂNG (Performance)

### [PERF-01] RSS fetch tuần tự thay vì song song
- **Mức độ:** MEDIUM
- **File:** `backend/02-rss-crawler.gs`
- **Vấn đề:** Dùng `forEach` loop + `UrlFetchApp.fetch()` riêng lẻ cho từng RSS source. Với 5 nguồn, mất 5× latency.
- **Sửa đơn giản:** Dùng `UrlFetchApp.fetchAll()` — fetch song song tất cả cùng lúc.

---

### [PERF-02] Không có caching — đọc Sheets mỗi request
- **Mức độ:** MEDIUM
- **File:** `backend/04-sheets-db.gs`, `backend/07-main.gs`
- **Vấn đề:** Mỗi lần gọi `?action=today` hay `?action=rebuttals` đều đọc lại toàn bộ Sheets. Nhiều người dùng đồng thời = nhiều lần đọc trùng lặp.
- **Sửa:** Dùng `CacheService.getScriptCache()` của GAS (TTL 1-6 giờ, miễn phí).

---

### [PERF-03] Scan toàn bộ bảng lịch sử để lọc dữ liệu
- **Mức độ:** MEDIUM
- **File:** `backend/08-troly35.gs` (~dòng 319)
- **Vấn đề:** Load `sheet.getLastRow()` dòng vào memory, rồi mới `.filter()`. Khi bảng lớn (10.000+ dòng) sẽ rất chậm và có thể timeout GAS.
- **Sửa:** Chỉ đọc N ngày gần nhất (ví dụ: 90 ngày), implement phân trang.

---

### [PERF-04] Email gửi quá nhanh — vi phạm rate limit Brevo
- **Mức độ:** MEDIUM
- **File:** `backend/06-email-brevo.gs`
- **Vấn đề:** `Utilities.sleep(100)` = 10 emails/giây. Brevo free tier giới hạn 300 emails/ngày (~1 email/5 giây). Gửi nhanh quá sẽ bị chặn, subscriber không nhận được.
- **Sửa:** Tăng delay lên `Utilities.sleep(5000)`.

---

### [PERF-05] Không có caching cho kết quả Gemini embeddings
- **Mức độ:** LOW
- **File:** `backend/08-troly35.gs`
- **Vấn đề:** Mỗi câu query đều gọi Gemini embedding API mới, kể cả câu hỏi đã hỏi trước đó.
- **Sửa:** Cache embedding theo nội dung query trong PropertiesService.

---

## NHÓM 3 — CHẤT LƯỢNG CODE (Code Quality)

### [CODE-01] Xử lý lỗi không nhất quán
- **Mức độ:** MEDIUM
- **File:** Nhiều file backend
- **Vấn đề:** `02-rss-crawler.gs` catch và log im lặng; `07-main.gs` notify admin; `06-email-brevo.gs` chỉ đếm `failed++`. Không có chuẩn xử lý lỗi thống nhất.
- **Hậu quả:** Khó debug khi có sự cố production, không biết lỗi ở đâu.

---

### [CODE-02] Hàm quá dài — khó test từng bước
- **Mức độ:** MEDIUM
- **File:** `backend/07-main.gs` — `runDailyNewsBot()` (~70 dòng), `backend/08-troly35.gs` — `handleTroLy35Run()` (~73 dòng)
- **Vấn đề:** Một hàm làm quá nhiều việc: fetch + filter + AI + save + notify. Khi lỗi khó biết bước nào thất bại.
- **Sửa:** Tách thành pipeline nhỏ, mỗi hàm một trách nhiệm.

---

### [CODE-03] Frontend gọi action strings trực tiếp — dễ vỡ khi refactor
- **Mức độ:** LOW
- **File:** `web/js/app.js` — nhiều chỗ
- **Vấn đề:** `fetch(\`${API_URL}?action=today\`)` rải khắp file. Đổi tên action ở backend là vỡ frontend ngay.
- **Sửa:** Tập trung vào một `API` object với các method rõ ràng.

---

### [CODE-04] Không có test nào
- **Mức độ:** MEDIUM
- **File:** Toàn dự án
- **Vấn đề:** Không có unit test, integration test. Mỗi lần thay đổi là "thử may".
- **Ảnh hưởng:** Regression bugs khó phát hiện, refactor nguy hiểm.

---

## NHÓM 4 — GIAO DIỆN & UX

### [UX-01] Thiếu ARIA labels — không thân thiện với screen reader
- **Mức độ:** MEDIUM
- **File:** `web/index.html`, `web/troly35.html`
- **Vấn đề:** Icon dùng `data-icon` không có `aria-label`. Form label không liên kết với input bằng `for`/`id`. Màu sắc là dấu hiệu duy nhất phân biệt độ ưu tiên tin.

---

### [UX-02] Loading state không nhất quán
- **Mức độ:** LOW
- **File:** `web/js/app.js`, `web/js/troly35.js`
- **Vấn đề:** Một số nơi có spinner, một số không (ví dụ: `loadStats()`). Nút submit không luôn bị disable trong lúc xử lý → dễ double-submit.

---

### [UX-03] Không có nút "Thử lại" khi lỗi mạng
- **Mức độ:** LOW
- **File:** `web/js/app.js` (~dòng 160)
- **Vấn đề:** Khi API lỗi, chỉ hiện thông báo. Người dùng phải F5 toàn trang.
- **Sửa:** Thêm nút retry cho từng section.

---

### [UX-04] Màu sắc duy nhất phân biệt trạng thái — không accessible
- **Mức độ:** LOW
- **File:** `web/css/styles.css` (~dòng 731)
- **Vấn đề:** `.news-priority-important` chỉ dùng màu đỏ. Người mù màu không phân biệt được.
- **Sửa:** Thêm icon hoặc text label kèm màu: "⚠ Quan trọng" / "Thường".

---

### [UX-05] Hero section biến mất hoàn toàn trên tablet
- **Mức độ:** LOW
- **File:** `web/css/styles.css` (~dòng 1700)
- **Vấn đề:** `display: none` trên viewport < 968px thay vì scale down.

---

## NHÓM 5 — KIẾN TRÚC

### [ARCH-01] Không có versioning cho API
- **Mức độ:** LOW
- **Vấn đề:** Không có `/v1/`, `/v2/`. Thay đổi API sẽ break client cũ ngay lập tức.

---

### [ARCH-02] Không có monitoring/observability
- **Mức độ:** MEDIUM
- **Vấn đề:** Chỉ dùng `Logger.log()` của GAS (mất sau 30 ngày). Không có alerting chủ động khi hệ thống lỗi.

---

### [ARCH-03] Không có backup strategy
- **Mức độ:** MEDIUM
- **Vấn đề:** Toàn bộ data trên Google Sheets, không có backup tự động. Xóa nhầm = mất hết.

---

## BẢNG TỔNG HỢP ƯU TIÊN

| ID | Vấn đề | Mức độ | Effort | Ưu tiên |
|----|--------|--------|--------|---------|
| SEC-04 | Link unsubscribe không hoạt động | HIGH | Thấp | P0 |
| SEC-02 | Không có API authentication | HIGH | Trung bình | P0 |
| SEC-03 | SHA-256 không salt cho access code | HIGH | Thấp | P0 |
| SEC-01 | API URL lộ trong JS | CRITICAL | Thấp | P0 |
| SEC-06 | Không có rate limiting | MEDIUM | Trung bình | P1 |
| PERF-01 | RSS fetch tuần tự | MEDIUM | Thấp | P1 |
| PERF-02 | Không có caching | MEDIUM | Thấp | P1 |
| PERF-04 | Email gửi quá nhanh | MEDIUM | Thấp | P1 |
| CODE-01 | Error handling không nhất quán | MEDIUM | Trung bình | P2 |
| CODE-02 | Hàm quá dài | MEDIUM | Trung bình | P2 |
| UX-01 | Thiếu ARIA labels | MEDIUM | Thấp | P2 |
| UX-03 | Không có nút retry | LOW | Thấp | P2 |
| SEC-05 | Dữ liệu user lưu plaintext | MEDIUM | Cao | P3 |
| ARCH-02 | Không có monitoring | MEDIUM | Cao | P3 |
| CODE-04 | Không có test | MEDIUM | Cao | P3 |
