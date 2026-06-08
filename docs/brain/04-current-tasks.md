# 04-current-tasks.md - Nhật ký công việc hiện tại

## Các tính năng đã hoàn thành
- ✅ **Bộ chọn phong cách phản bác**: Thêm tham số `style` (`chinhluan`, `tretrung`, `ngangon`) cho mode Phản bác ở cả frontend UI và backend prompt generator.
- ✅ **Hội thoại đa lượt (Trợ lý 35)**: Cho phép tinh chỉnh câu trả lời của AI, neo phân tích/RAG vào câu hỏi gốc đầu tiên của luồng chat, hiển thị thread chat và nới lỏng giới hạn ký tự cho câu tinh chỉnh.
- ✅ **Daily News Crawler Bot**: Scraper RSS/HTML tự động tóm tắt tin tức bằng Gemini và gửi thông báo qua Telegram/Brevo.
- ✅ **TCCS Scraper & RAG Pipeline**: Scrape bài tạp chí, chunk bài viết, duyệt và sync dữ liệu lên Pinecone.
- ✅ **Module Video tự động**: Tích hợp hook 3 giây đầu, nhạc nền ducking, caption karaoke, và xuất short.
- ✅ **Trắc nghiệm Quiz lý luận**: Tải câu hỏi trắc nghiệm chính trị và ghi nhận kết quả người làm bài.
- ✅ **Bản tin 35 nội bộ**: Module tổng hợp tin tức nhạy cảm và khuyến nghị gửi riêng qua Telegram Bot.

## Công việc đang thực hiện
- 🚧 **Thiết lập bộ nhớ dự án dùng chung (Shared AI Project Brain)**: Tạo các tài liệu hướng dẫn và lưu trữ ngữ cảnh dự án (`AGENTS.md`, `CLAUDE.md` và thư mục `docs/brain/`) cho Claude Code và Codex.

## Công việc tiếp theo (Backlog/Chờ thực hiện)
- [ ] Deploy thử nghiệm phiên bản Apps Script mới nhất lên Google Apps Script bằng clasp:
  ```powershell
  cd backend
  npx @google/clasp push --force
  ```
- [ ] Kiểm thử thủ công giao diện chat đa lượt và bộ chọn phong cách phản bác trên môi trường local:
  ```powershell
  cd web
  npm run dev
  ```
- [ ] Xác minh kết nối cơ sở dữ liệu Google Sheets khi cập nhật lịch sử chat đa lượt và feedback.
