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
- **Cập nhật 2026-06-10**:
  - `IP_HASH_SALT` là cấu hình bắt buộc ở proxy; nếu thiếu, proxy trả lỗi cấu hình thay vì fallback sang token hoặc chuỗi mặc định yếu.
  - Frontend không nhúng token qua `VITE_API_TOKEN`; token chỉ do proxy server-side inject.
  - Frontend production luôn gọi `/api/gas`; dev có thể đặt `VITE_GAS_URL` nếu cần trỏ thẳng Apps Script nhưng URL này không được coi là secret.
  - Action admin qua proxy gồm `feedback_stats`, `video_export`, `bantin35_generate`, `bantin35_setup_trigger`, `bantin35_trigger_status`.

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

## 5. Tủ sách số dùng RAG gọn nhẹ theo tóm tắt
- **Mục tiêu**: Cung cấp một tủ sách/tài liệu chính thống có thể tra cứu nhanh và hỏi đáp AI mà không tăng độ phức tạp vận hành.
- **Giải pháp**:
  - Lưu catalog trong sheet `TU_SACH` gồm metadata, tóm tắt, podcast gợi ý, sơ đồ tư duy, link NotebookLM và nguồn.
  - Expose ba action API: `books`, `book`, `ask_book`.
  - `ask_book` không tạo vector index riêng; backend chỉ nạp tóm tắt và metadata của cuốn được chọn vào ngữ cảnh rồi gọi `callGeminiAPI` sẵn có với JSON schema ổn định.
- **Lý do**: Phạm vi hiện tại là danh mục nhỏ và tài liệu mẫu hợp pháp, nên Google Sheets + context ngắn đủ đơn giản, dễ rollback và không cần thêm thư viện/dịch vụ mới.
- **Giới hạn**: Câu trả lời AI chỉ có độ tin cậy trong phạm vi tóm tắt/nguồn của từng cuốn. Nếu mở rộng sang toàn văn hoặc tài liệu nội bộ lớn, cần thiết kế lại theo RAG/Pinecone, phân quyền truy cập và quy trình duyệt nguồn.

## 6. Gộp NotebookLM vào Tủ sách trong Học tập
- **Mục tiêu**: Giảm trùng lặp giữa `Tủ sách` và `Sổ tay AI`, đồng thời giữ bottom nav cân đối với 3 mục chính: `Tin tức`, `Trợ lý 35`, `Học tập`.
- **Giải pháp**:
  - Gỡ page/tab bottom nav `Sổ tay AI` độc lập.
  - Đưa `Tủ sách` thành mục con trong tab `Học tập`, đặt cùng nhóm với Video, Infographic và Kiểm tra.
  - Giữ NotebookLM như hành động trong chi tiết từng tài liệu của `Tủ sách`, dùng trường `TU_SACH.NotebookLM URL` sẵn có và không tạo API mới.
- **Cập nhật 2026-06-11**: Tủ sách dùng chung một NotebookLM URL (`https://notebooklm.google.com/notebook/ee1792f7-45ff-4952-9ce6-50cc1cd4ad1a`) cho toàn bộ tài liệu. Khi hỏi đáp, người vận hành chọn/tích đúng nguồn tài liệu trong NotebookLM.
- **Lý do dùng một link chung**: Đơn giản hóa vận hành và cập nhật nguồn; người dùng không phải mở nhiều notebook riêng, trong khi vẫn có thể giới hạn ngữ cảnh bằng thao tác chọn nguồn trong NotebookLM.
- **Giới hạn**: Cần duy trì kỷ luật đặt tên nguồn trong NotebookLM rõ ràng theo từng PDF để tránh hỏi nhầm tài liệu hoặc tổng hợp ngoài phạm vi mong muốn.

## 7. Tạm tắt hỏi đáp AI trực tiếp trong Tủ sách, chỉ dùng NotebookLM (2026-06-09)
- **Mục tiêu**: Giảm rủi ro chi phí/lạm dụng từ endpoint `ask_book` (public, chưa có quota/phân quyền — phát hiện trong review kiến trúc 2026-06-09).
- **Giải pháp**:
  - Frontend `TuSach.jsx`: gỡ form "Hỏi AI" (state/handler/import `askBookAI`); thay bằng nút mở NotebookLM theo cuốn đang chọn.
  - Backend `07-main.gs`: `case 'ask_book'` trả `{ success: false, error: '... đang tạm tắt ...' }`, không gọi Gemini.
  - Giữ nguyên hàm `askBookAI`, schema và sheet `TU_SACH` để bật lại nhanh.
- **Lý do giữ code thay vì xóa**: Đây là quyết định tạm thời; giữ hàm/contract giúp re-enable rẻ và không phá schema.
- **Điều kiện bật lại**: Bổ sung quota/giới hạn theo người dùng cho `ask_book` (tương tự `troLy35AssertDailyLimit_`) trước khi mở lại UI hỏi đáp.
