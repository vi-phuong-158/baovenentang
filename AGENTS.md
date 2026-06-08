# AGENTS.md

> **Dành cho Codex và các AI Assistant khác**

## Yêu cầu cốt lõi
- **ĐỌC ĐẦU TIÊN**: Luôn luôn đọc toàn bộ các tài liệu trong thư mục [docs/brain/](file:///d:/Code/baovenentang/docs/brain) trước khi bắt đầu viết code hoặc thực hiện bất kỳ thay đổi nào.
- **CẬP NHẬT NHẬT KÝ**: Sau mỗi lần sửa đổi code thành công, bắt buộc phải cập nhật nhật ký hoạt động tại [docs/brain/06-ai-working-log.md](file:///d:/Code/baovenentang/docs/brain/06-ai-working-log.md).
- **CẬP NHẬT KIẾN TRÚC & QUYẾT ĐỊNH**: Nếu thay đổi kiến trúc, luồng xử lý, API, cấu trúc database (Google Sheets headers) hoặc cấu trúc thư mục, bắt buộc phải cập nhật:
  - [docs/brain/01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md)
  - [docs/brain/03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md)
- **GIỮ NGUYÊN TECH STACK**: Không tự ý thay đổi hoặc bổ sung thư viện lớn, thay đổi ngôn ngữ, framework hoặc cơ sở dữ liệu nếu chưa ghi rõ lý do thuyết phục trong [docs/brain/03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md) và được sự đồng ý của người dùng.

## Các lệnh chính
- **Chạy dev frontend**: `cd web; npm run dev`
- **Build frontend**: `cd web; npm run build`
- **Đẩy code Apps Script**: `cd backend; npx @google/clasp push --force`

Xem chi tiết hướng dẫn chạy và kiểm thử tại [docs/brain/05-testing-and-deploy.md](file:///d:/Code/baovenentang/docs/brain/05-testing-and-deploy.md).
