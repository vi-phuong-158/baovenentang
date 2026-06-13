# 04-current-tasks.md - Nhật ký công việc hiện tại

## Các tính năng đã hoàn thành
- ✅ **Bộ chọn phong cách phản bác**: Thêm tham số `style` (`chinhluan`, `tretrung`, `ngangon`) cho mode Phản bác ở cả frontend UI và backend prompt generator.
- ✅ **Hội thoại đa lượt (Trợ lý 35)**: Cho phép tinh chỉnh câu trả lời của AI, neo phân tích/RAG vào câu hỏi gốc đầu tiên của luồng chat, hiển thị thread chat và nới lỏng giới hạn ký tự cho câu tinh chỉnh.
- ✅ **Daily News Crawler Bot**: Scraper RSS/HTML tự động tóm tắt tin tức bằng Gemini và gửi thông báo qua Telegram/Brevo.
- ✅ **TCCS Scraper & RAG Pipeline**: Scrape bài tạp chí, chunk bài viết, duyệt và sync dữ liệu lên Pinecone.
- ✅ **Module Video tự động**: Tích hợp hook 3 giây đầu, nhạc nền ducking, caption karaoke, và xuất short.
- ✅ **Trắc nghiệm Quiz lý luận**: Tải câu hỏi trắc nghiệm chính trị và ghi nhận kết quả người làm bài.
- ✅ **Bản tin 35 nội bộ**: Module tổng hợp tin tức nhạy cảm và khuyến nghị gửi riêng qua Telegram Bot.
- ✅ **Tủ sách số AI**: Thêm sheet `TU_SACH`, API `books`/`book`/`ask_book`, giao diện danh mục sách, chi tiết từng cuốn và hỏi đáp AI theo tóm tắt.
- ✅ **NotebookLM trong Tủ sách**: Gộp điểm vào NotebookLM vào mục `Tủ sách` trong tab `Học tập`, lấy link từ `TU_SACH.NotebookLM URL` theo từng tài liệu.

## Công việc đang thực hiện
- 🚧 **Thiết lập bộ nhớ dự án dùng chung (Shared AI Project Brain)**: Tạo các tài liệu hướng dẫn và lưu trữ ngữ cảnh dự án (`AGENTS.md`, `CLAUDE.md` và thư mục `docs/brain/`) cho Claude Code và Codex.
- 🚧 **Nâng cấp UX chatbot Trợ lý 35 (review 2026-06-13)**: Lộ trình 3 đợt cải thiện trải nghiệm hội thoại và giao diện, không thêm package Node mới (dùng `dompurify` đã có).
  - **Đợt 1 (đang làm)** — gọn, rủi ro thấp, hiệu quả thấy ngay:
    1. Render Markdown nhẹ trong bong bóng câu trả lời (đậm/nghiêng/danh sách/heading) thay cho `MessageText` chỉ tách đoạn theo `\n\n`. Tự viết parser → HTML, sanitize bằng `dompurify`, không thêm dependency.
    2. Hiển thị tiến trình theo bước khi chờ trả lời (Đang phân tích → Tra cứu dẫn chứng → Soạn nội dung) khớp 3 bước backend `analyze → searchKnowledge → generate`.
    3. Copy theo phần cho mode Viết bài/Phản bác (bản đầy đủ, comment ngắn, caption MXH, hashtag) thay vì chỉ copy cả khối.
    4. Hỗ trợ phím tắt Ctrl/Cmd+Enter để gửi câu hỏi.
  - **Đợt 2 (đã làm)**: Hiện khối "Phân tích & dẫn chứng" có thể gập (độ nguy hiểm dạng badge màu, luận điểm sai, thủ đoạn, cảnh báo an toàn) + danh sách dẫn chứng RAG kèm link nguồn; badge nhãn kiểm duyệt (`nhan_kiem_duyet`) tách khỏi nội dung; persist phiên chat hiện tại vào `sessionStorage` (khôi phục khi reload).
  - **Đợt 3 (backlog)**: Tách inline style `TroLy35.jsx`/`BottomNav.jsx` sang CSS class; Dark mode qua `prefers-color-scheme`; cải thiện a11y (`role="log"`/`aria-live`, tương phản `--ink-mute`).

## Công việc tiếp theo (Backlog/Chờ thực hiện)

> 📋 **Backlog refactor & hardening chi tiết (review 2026-06-09)**: xem [07-refactor-backlog.md](07-refactor-backlog.md) — gồm các task card TOOL-1, SEC-1..6, REF-1..7 với checklist "trước khi code", các bước, kiểm thử và rollback cho từng việc. Thứ tự ưu tiên hiện tại: nhóm SEC → nhóm REF. TOOL-1 đã hoàn thành ngày 2026-06-10.

- [x] **Tạm tắt hỏi đáp AI trực tiếp Tủ sách (2026-06-09)**: đã gỡ form "Hỏi AI" trong `TuSach.jsx` và vô hiệu hóa action `ask_book` (chỉ dùng NotebookLM). Bật lại theo task **SEC-2**.
- [x] **Gộp Tủ sách/Sổ tay AI vào Học tập (2026-06-10)**: bottom nav còn 3 mục `Tin tức`, `Trợ lý 35`, `Học tập`; `Tủ sách` là mục con trong `Học tập` cùng Video, Infographic và Kiểm tra.
- [x] **TOOL-1 - CodeGraph index `.gs` (2026-06-10)**: đã thêm mapping `.gs` → `javascript` trong bundle CodeGraph local và re-index; CodeGraph hiện index 16 file `backend/*.gs` như JavaScript, có thể search/callers/impact các symbol GAS (`doPost`, `handleTroLy35Run`, `validateApiToken_`). Lưu ý mapping nằm trong gói CodeGraph global trên máy này, có thể cần áp lại nếu nâng cấp/cài lại CodeGraph.
- [x] **SEC-1/SEC-4/SEC-5 - Hardening proxy/client API (2026-06-10)**: đã bỏ GAS URL hardcode và `VITE_API_TOKEN` khỏi client, bắt buộc `IP_HASH_SALT` ở proxy, đưa `video_export` vào nhóm admin/token và cập nhật bảng policy endpoint.
- [x] **SEC-3 - Làm rõ rate-limit proxy serverless (2026-06-10)**: giữ rate-limit `Map` là best-effort, ghi rõ chặn chi phí thật phải nằm ở GAS quota/guard.
- [x] **REF-1 - Tách cache frontend (2026-06-10)**: đã chuyển localStorage SWR cache từ `web/src/api.js` sang `web/src/cache.js`, giữ nguyên export `invalidateCache` và các wrapper API.
- [ ] **Trước khi refactor hoặc sửa code mới, thực hiện checklist kiến trúc từ review CodeGraph ngày 2026-06-08**:
  1. Đóng băng contract hiện tại của các action `doGet`/`doPost`, payload và response chính trước khi đổi code.
  2. Chạy phân tích CodeGraph cho entry point liên quan, đặc biệt các file có blast radius lớn: `web/src/api.js`, `web/src/pages/TroLy35.jsx`, `web/api/gas.js`, `backend/07-main.gs`, `backend/08-troly35.gs`, `backend/11-bantin35.gs`, `video_module/scripts/05_render_video.py`.
  3. Ghi rõ caller/callee, luồng UI/API/database bị ảnh hưởng và cách rollback trước khi chỉnh.
  4. Ưu tiên refactor an toàn theo thứ tự: tách frontend API/cache; tách logic `TroLy35.jsx`; tách router/auth trong `07-main.gs`; tách `08-troly35.gs` theo auth/quota, RAG, prompt/Gemini, history/feedback; tách `11-bantin35.gs`; cuối cùng mới tách repository Google Sheets/TCCS.
  5. Hardening bảo mật song song: bỏ phụ thuộc vào hardcoded GAS dev URL, không dùng `VITE_API_TOKEN` làm secret thật, bắt buộc cấu hình `IP_HASH_SALT`, tách `ADMIN_API_TOKEN`, validate payload quiz, ghi rõ policy endpoint public/private, giới hạn/allowlist download ảnh trong video module, và chỉ tắt SSL verification của `edge-tts` bằng env opt-in.
  6. Sau mỗi bước nhỏ, chạy test/build phù hợp: `cd web; npm run build`, `node --check` cho các file `.gs` liên quan, và test Python/video khi chạm `video_module`.
- [ ] **Mở rộng Tủ sách số sau bản MVP**:
  1. Thiết kế quy trình quản trị/duyệt tài liệu trước khi đưa nguồn mới lên `TU_SACH`.
  2. Nếu chuyển từ tóm tắt sang toàn văn, cần thiết kế RAG/Pinecone riêng, phân quyền xem tài liệu và policy tài liệu nội bộ/public.
  3. Duy trì một `NotebookLM URL` chung cho toàn bộ tủ sách; trong NotebookLM cần đặt tên nguồn rõ theo từng PDF và hướng dẫn người vận hành chọn/tích đúng tài liệu trước khi hỏi đáp.
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
