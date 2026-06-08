# 02-coding-rules.md - Quy tắc viết code và bảo mật

## Quy tắc chung
1. **Duy trì tính nhất quán**: Giữ nguyên cấu trúc, phong cách code hiện tại của dự án. Không thay đổi hoặc refactor diện rộng nếu không có yêu cầu cụ thể.
2. **Không dùng placeholder**: Luôn viết code hoàn chỉnh và có thể chạy được. Không để lại ghi chú kiểu `// TODO: implement later` hoặc code bị cắt xén.
3. **Quản lý ký tự kết thúc dòng (CRLF/LF)**:
   - Khi git diff báo thay đổi trên diện rộng mà không đổi nội dung, đó có thể là do line-ending.
   - Luôn sử dụng lệnh `git diff --ignore-cr-at-eol` để kiểm tra thay đổi nội dung thực sự. Không commit các thay đổi chỉ do line-ending.

## Quy tắc viết code theo từng phân hệ

### 1. Frontend (React / Vite)
- **Component**:
  - Đặt tên Component dùng `PascalCase` (ví dụ: `TroLy35.jsx`, `TinTuc.jsx`).
  - Viết code UI bằng CSS thuần (Vanilla CSS), tránh sử dụng Tailwind CSS trừ khi có yêu cầu cụ thể.
- **API**:
  - Luôn thông qua proxy `/api/gas.js` trên Vercel khi gọi API từ client. Không gọi trực tiếp URL Apps Script Web App trong môi trường production.
  - Xử lý lỗi cẩn thận bằng React Error Boundary và hiển thị skeleton load thân thiện khi tải dữ liệu.
- **Trạng thái**:
  - Giao diện Trợ lý 35 lưu trữ lựa chọn phong cách (`style`) của người dùng vào `localStorage` để tự động phục hồi trong lần sử dụng sau.

### 2. Backend (Google Apps Script)
- **Đặt tên**:
  - Biến và hàm nghiệp vụ dùng `camelCase`.
  - Các hàm tiện ích bổ trợ hoặc các hàm nội bộ không công khai ra bên ngoài (helper) bắt buộc phải có ký tự gạch dưới `_` ở cuối tên hàm (ví dụ: `troLy35NormalizeStyle_`, `troLy35StylePrompt_`).
- **Thao tác Google Sheets**:
  - Đọc/ghi dữ liệu theo chỉ mục cột được cấu hình trước. Tránh tự ý thay đổi vị trí các cột trong sheet để không làm sai lệch luồng đọc.
  - Sử dụng CacheService để lưu trữ các kết quả trung gian hoặc cấu hình tĩnh nhằm giảm thiểu số lượng truy vấn trực tiếp đến Google Sheets (giúp tăng tốc API).
- **Hội thoại đa lượt**:
  - Trợ lý 35 giới hạn lịch sử hội thoại tối đa gửi lên backend là 8 lượt, và mỗi lượt được cắt ngắn còn tối đa 800 ký tự để tránh tràn ngữ cảnh (context window) của mô hình.

### 3. Module Video (Python)
- **Kiểm thử**: Tất cả các cập nhật trên module video phải được xác minh và kiểm thử tự động bằng FFmpeg thật để bảo đảm video render ra đúng định dạng.

## Quy tắc bảo mật
1. **KHÔNG COMMIT SECRET**: Tuyệt đối không đưa các khóa API (Gemini API Key, Pinecone Key, Brevo API Key), token Telegram, URL Apps Script nhạy cảm, mật khẩu hoặc khóa master key của Rails vào mã nguồn git.
2. **Cấu hình biến môi trường**:
   - Sử dụng **Script Properties** trong Google Apps Script cho các cấu hình bí mật ở backend.
   - Sử dụng **Environment Variables** trên Vercel cho các cấu hình phía serverless proxy.
3. **Che giấu dữ liệu nhạy cảm**:
   - Biến cấu hình `TROLY35_SAVE_FULL_INPUT` trong Script Properties nếu đặt là `false` sẽ giúp hệ thống không lưu toàn bộ nội dung prompt của người dùng vào Google Sheets, tránh lộ thông tin nội bộ.
   - Băm địa chỉ IP bằng salt (`IP_HASH_SALT`) ở lớp proxy để không ghi nhận IP thực tế của người dùng vào log lịch sử của Google Sheets.
