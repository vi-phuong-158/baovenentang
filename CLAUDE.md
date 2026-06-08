# CLAUDE.md

> **Dành cho Claude Code và các AI Assistant khác**

## Yêu cầu cốt lõi
- **ĐỌC ĐẦU TIÊN**: Luôn luôn đọc toàn bộ các tài liệu trong thư mục [docs/brain/](file:///d:/Code/baovenentang/docs/brain) trước khi bắt đầu viết code hoặc thực hiện bất kỳ thay đổi nào.
- **CẬP NHẬT NHẬT KÝ**: Sau mỗi lần sửa đổi code thành công, bắt buộc phải cập nhật nhật ký hoạt động tại [docs/brain/06-ai-working-log.md](file:///d:/Code/baovenentang/docs/brain/06-ai-working-log.md).
- **CẬP NHẬT KIẾN TRÚC & QUYẾT ĐỊNH**: Nếu thay đổi kiến trúc, luồng xử lý, API, cấu trúc database (Google Sheets headers) hoặc cấu trúc thư mục, bắt buộc phải cập nhật:
  - [docs/brain/01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md)
  - [docs/brain/03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md)
- **QUY TRÌNH BRANCH**: Không push trực tiếp code lên nhánh `main` trừ khi có yêu cầu rõ ràng từ người dùng. Luôn tạo nhánh riêng hoặc đề xuất commit để người dùng xem xét.

## Các lệnh chính
- **Chạy dev frontend**: `cd web; npm run dev`
- **Build frontend**: `cd web; npm run build`
- **Đẩy code Apps Script**: `cd backend; npx @google/clasp push --force`

Xem chi tiết hướng dẫn chạy và kiểm thử tại [docs/brain/05-testing-and-deploy.md](file:///d:/Code/baovenentang/docs/brain/05-testing-and-deploy.md).
