# CLAUDE.md

> **Dành cho Claude Code và các AI Assistant khác**

## Yêu cầu cốt lõi
- **ĐỌC ĐẦU TIÊN**: Luôn luôn đọc toàn bộ các tài liệu trong thư mục [docs/brain/](file:///d:/Code/baovenentang/docs/brain) trước khi bắt đầu viết code hoặc thực hiện bất kỳ thay đổi nào.
- **SỬ DỤNG CODEGRAPH**:
  - Luôn sử dụng CodeGraph (`codegraph`) để hiểu kiến trúc toàn diện của dự án trước khi tiến hành sửa đổi mã nguồn.
  - Tuyệt đối không sửa code khi chưa xác định rõ các file, symbol (lớp, hàm, biến) và dependency (phụ thuộc) liên quan.
  - Trước mỗi thay đổi lớn, bắt buộc phải phân tích tác động (impact analysis): hàm nào đang gọi đến nó (incoming references), hàm nào được nó gọi đến (dependencies), và những route/API nào sẽ bị ảnh hưởng.
- **CẬP NHẬT NHẬT KÝ & TÓM TẮT**:
  - Sau mỗi lần sửa code thành công, bắt buộc phải cập nhật nhật ký hoạt động tại [docs/brain/06-ai-working-log.md](file:///d:/Code/baovenentang/docs/brain/06-ai-working-log.md).
  - Bản log phải tóm tắt rõ: danh sách file đã sửa, lý do sửa, rủi ro đi kèm và hướng dẫn cách test chi tiết.
- **CẬP NHẬT KIẾN TRÚC & QUYẾT ĐỊNH**: Nếu thay đổi kiến trúc, luồng xử lý, API, cấu trúc database (Google Sheets headers) hoặc cấu trúc thư mục, bắt buộc phải cập nhật:
  - [docs/brain/01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md)
  - [docs/brain/03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md)
- **QUY TRÌNH BRANCH**: Không push trực tiếp code lên nhánh `main` trừ khi có yêu cầu rõ ràng từ người dùng. Luôn tạo nhánh riêng hoặc đề xuất commit để người dùng xem xét.

## Các lệnh chính
- **Chạy dev frontend**: `cd web; npm run dev`
- **Build frontend**: `cd web; npm run build`
- **Đẩy code Apps Script**: `cd backend; npx @google/clasp push --force`
- **Truy vấn CodeGraph**:
  - Tìm kiếm node: `codegraph search <query>`
  - Xem thông tin chi tiết node: `codegraph view <node-id>`
  - Phân tích references: `codegraph refs <node-id>`
  - Cập nhật chỉ mục: `codegraph index`

Xem chi tiết hướng dẫn chạy và kiểm thử tại [docs/brain/05-testing-and-deploy.md](file:///d:/Code/baovenentang/docs/brain/05-testing-and-deploy.md).
