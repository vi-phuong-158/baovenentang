# 06-ai-working-log.md - Nhật ký hoạt động của AI

Nhật ký ghi lại các thay đổi, sửa đổi mã nguồn và kiến trúc được thực hiện bởi các trợ lý AI lập trình (Claude Code, Codex, v.v.).

---

## [2026-06-08] Khởi tạo Bộ nhớ Dự án Dùng chung (Shared AI Project Brain)

### Nội dung thực hiện
- Thiết lập hệ thống tài liệu hướng dẫn và lưu trữ ngữ cảnh hoạt động của dự án nhằm đồng bộ thông tin giữa Claude Code và Codex.
- Tạo các file chỉ dẫn ở thư mục gốc:
  - [AGENTS.md](file:///d:/Code/baovenentang/AGENTS.md): Bản hướng dẫn dành cho Codex.
  - [CLAUDE.md](file:///d:/Code/baovenentang/CLAUDE.md): Bản hướng dẫn dành cho Claude Code.
- Khởi tạo thư mục bộ nhớ [docs/brain/](file:///d:/Code/baovenentang/docs/brain) chứa các file tài liệu ngữ cảnh chuyên biệt:
  - [00-project-overview.md](file:///d:/Code/baovenentang/docs/brain/00-project-overview.md): Mục tiêu dự án, đối tượng người dùng chính và phạm vi hoạt động.
  - [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md): Stack công nghệ, sơ đồ luồng dữ liệu và vai trò các thành phần (React frontend, GAS backend, Google Sheets, Gemini AI, Pinecone RAG, Python video module).
  - [02-coding-rules.md](file:///d:/Code/baovenentang/docs/brain/02-coding-rules.md): Quy chuẩn viết code, quy tắc đặt tên hàm/biến (các hàm nội bộ của GAS kết thúc bằng `_`), cách xử lý ký tự kết thúc dòng (CRLF/LF) và bảo mật thông tin (không commit token/key).
  - [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md): Các quyết định kỹ thuật cốt lõi (sử dụng Google Sheets làm CSDL, thiết lập proxy serverless trên Vercel, thuật toán neo câu gốc khi chat đa lượt, giới hạn phong cách phản bác trong mode `rebuttal`).
  - [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md): Bản đồ theo dõi tiến độ (liệt kê các tính năng đã hoàn thành, đang triển khai và backlog chờ xử lý).
  - [05-testing-and-deploy.md](file:///d:/Code/baovenentang/docs/brain/05-testing-and-deploy.md): Danh sách lệnh phát triển local, build dự án, deploy bằng clasp và chạy các test suite trên môi trường cloud.

### Trạng thái
- **Hoàn thành**: Đã tạo đầy đủ cấu trúc 9 file theo yêu cầu nghiệp vụ.
- **Tiếp theo**: Đề xuất commit thay đổi này với thông điệp: `"chore: initialize shared AI project brain"`.
