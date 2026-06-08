# 03-decisions.md - Quyết định kỹ thuật

Dưới đây là các quyết định kỹ thuật cốt lõi đã được thống nhất và áp dụng trong dự án:

## 1. Sử dụng Google Sheets làm Cơ sở dữ liệu chính
- **Mục tiêu**: Giảm thiểu chi phí vận hành về $0 và tận dụng giao diện có sẵn của Google Sheets cho người dùng nghiệp vụ không chuyên về công nghệ.
- **Giải pháp**: GAS đọc/ghi trực tiếp lên các sheet đã định nghĩa cấu trúc cột. Các dữ liệu lớn như tin tức sẽ được GAS phân trang trước khi trả về frontend.
- **Hạn chế**: Tốc độ đọc ghi chậm hơn SQL truyền thống.
- **Biện pháp khắc phục**: Tích hợp Apps Script `CacheService` để cache kết quả tin tức và các cấu hình tĩnh, đồng thời dọn dẹp lưu trữ định kỳ bằng trigger hàng tháng (`runMonthlyArchive`).

## 2. Thiết lập Vercel Serverless Proxy cho Google Apps Script
- **Mục tiêu**: Tránh CORS khi gọi API trực tiếp từ trình duyệt, che giấu mã xác thực `API_ACCESS_TOKEN`, đồng thời thực hiện các bước lọc bảo mật.
- **Giải pháp**: Tạo API route `/api/gas.js` trên Vercel nhận request từ React SPA, băm IP client kèm salt (`IP_HASH_SALT`), đính kèm mã token bảo mật và chuyển tiếp đến Web App Apps Script `/exec`.

## 3. Cơ chế hội thoại đa lượt và Neo câu gốc trong Trợ lý 35
- **Mục tiêu**: Hỗ trợ người dùng tinh chỉnh câu trả lời của AI (như yêu cầu "ngắn hơn", "thêm dẫn chứng") mà không phải nhập lại toàn bộ thông tin từ đầu và bảo đảm RAG hoạt động đúng ngữ cảnh.
- **Giải pháp**:
  - Giao diện React gửi kèm mảng `history` chứa các lượt hội thoại trước đó (tối đa 8 lượt).
  - Khi phát hiện là câu hỏi tinh chỉnh (lượt > 1), backend sẽ **neo hoạt động trích xuất từ khóa và truy vấn RAG (Pinecone) vào câu hỏi ĐẦU TIÊN** của chuỗi hội thoại.
  - Lý do: Các câu tinh chỉnh như "ngắn hơn" hoặc "đổi giọng" không chứa đủ từ khóa ngữ nghĩa để thực hiện tìm kiếm vector RAG. Việc neo câu gốc giúp AI tiếp tục truy cập đúng kho tri thức của chủ đề đang thảo luận.
  - Các lượt tinh chỉnh cho phép độ dài câu hỏi ngắn hơn (tối thiểu 2 ký tự) so với yêu cầu 20 ký tự ở lượt đầu tiên.

## 4. Tích hợp bộ chọn phong cách phản bác chuyên biệt
- **Mục tiêu**: Giúp tuyên truyền viên linh hoạt chọn cách hành văn phù hợp với từng đối tượng tiếp cận (diễn đàn chính thống vs. mạng xã hội trẻ trung).
- **Giải pháp**:
  - Thêm tham số `style` (chấp nhận 3 giá trị: `chinhluan`, `tretrung`, `ngangon`).
  - Phong cách `chinhluan` (Chính luận - Mặc định): Văn phong trang trọng, lập luận sắc bén cho báo cáo/diễn đàn chính thống.
  - Phong cách `tretrung` (Trẻ trung): Viết ngắn, gần gũi, phù hợp bình luận Facebook/Threads/TikTok nhưng **phải bảo đảm lịch sự, nghiêm túc, không có tiếng lóng phản cảm hay emoji lạm dụng**.
  - Phong cách `ngangon` (Ngắn gọn): Đi thẳng vào vấn đề để phản hồi nhanh.
  - Tích hợp tham số phong cách trực tiếp vào prompt generator phía backend.
  - **Giới hạn**: Chỉ áp dụng cho chế độ **Phản bác** (`rebuttal`) của Trợ lý 35. Các chế độ Viết bài hay Kiểm chứng giữ nguyên prompt tiêu chuẩn.
