# CLAUDE.md - Hướng dẫn làm việc trong dự án Trợ lý 35

Tài liệu này dành cho Claude/Codex/AI agent khi làm việc trong repository `baovenentang`.

## Tóm tắt dự án

Đây là hệ thống Trợ lý 35 phục vụ công tác bảo vệ nền tảng tư tưởng:

- Frontend: React 18 + Vite trong `web/`.
- Backend: Google Apps Script trong `backend/`.
- Database: Google Sheets.
- AI: Gemini text generation + Gemini embedding.
- RAG: Pinecone vector database.
- Tích hợp: Telegram Bot API, Brevo Email, Vercel API proxy.

Ứng dụng web hiện có 3 tab chính:

- `Tin tức`
- `Trợ lý 35`
- `Quiz`

Tính năng `Thư viện phản bác` công khai đã bị gỡ. Không re-add route/page/API public này nếu không có yêu cầu rõ ràng từ người dùng.

## Trạng thái chức năng quan trọng

### Tin tức

- File chính: `web/src/pages/TinTuc.jsx`.
- UI dùng phân trang, hiện 10 bài/trang (`PAGE_LIMIT = 10`).
- API frontend gọi `getArticles(days, page, limit)` và `searchArticles(q, page, limit)`.
- Khi chuyển trang, danh sách được thay mới, không concat thêm.
- Backend vẫn đọc/lọc/cache tập dữ liệu từ Google Sheets rồi slice trang trả về.

### Trợ lý 35

- File UI chính: `web/src/pages/TroLy35.jsx`.
- Backend chính: `backend/08-troly35.gs`.
- **Truy cập tự do**: UI đã bỏ ô nhập mã. Proxy `web/api/gas.js` tự gắn `accessCode` (từ env `TROLY35_ACCESS_CODE`) cho mọi action `troly35_*` khi client không gửi. Hệ quả: hạn mức/ngày và lịch sử/xu hướng dùng CHUNG cho mọi người (cùng một mã). Backend không đổi.
- Có 3 mode:
  - `rebuttal`
  - `fact_check`
  - `article_writer`
- UI truyền mode đang chọn vào `troly35_run`.
- Mode `rebuttal` có thêm tham số `style` (`chinhluan` | `tretrung` | `ngangon`) đổi tông giọng (không đổi schema output).
- Hỗ trợ hội thoại đa lượt: UI gửi `history` (mảng `{role,text}`); backend neo phân tích/RAG vào câu gốc, coi câu mới là yêu cầu tinh chỉnh. Khi có `history`, min-length đầu vào hạ từ 20 xuống 2 ký tự.
- Lịch sử lấy qua `troly35_history`.
- Feedback tốt/xấu gửi qua `troly35_feedback`.
- Backend lưu feedback vào `TROLY35_FEEDBACK` và cập nhật rating/note trong `TROLY35_HISTORY`.

### Logo

- Logo app chính: `web/logo.png`.
- `web/index.html` khai báo favicon/apple touch icon/OG image bằng `/logo.png`.
- `BottomNav` và màn Trợ lý 35 import logo từ `../../logo.png`.

### Backend Google Apps Script

Các file quan trọng:

- `backend/00-utils.gs`: helper chung.
- `backend/01-config.gs`: cấu hình đọc từ Script Properties.
- `backend/02-news-crawler.gs`: crawl RSS/HTML nguồn tin.
- `backend/03-gemini-ai.gs`: Gemini text/embedding.
- `backend/04-sheets-db.gs`: Google Sheets database.
- `backend/05-telegram-bot.gs`: Telegram bot/webhook.
- `backend/06-email-brevo.gs`: Brevo email.
- `backend/07-main.gs`: `runDailyNewsBot`, `doGet`, `doPost`, setup/test.
- `backend/08-troly35.gs`: Trợ lý 35, RAG, history, feedback.
- `backend/09a` đến `09d`: pipeline TCCS.
- `backend/11-bantin35.gs`: Bản tin 35 nội bộ.

## Lệnh thường dùng

### Frontend

```powershell
cd web
npm install
npm run dev
npm run build
npm run preview
```

Build phải pass trước khi hoàn tất thay đổi frontend có ảnh hưởng runtime:

```powershell
cd web
npm.cmd run build
```

### Apps Script

Nếu cần push code GAS bằng clasp:

```powershell
cd backend
npx.cmd --yes @google/clasp@latest push --force
```

`backend/.clasp.json` bị ignore và không được commit.

Sau khi `clasp push`, nếu Web App production đang pin version cũ, cần cập nhật deployment trong Apps Script UI.

### Git

Kiểm tra nhanh:

```powershell
git status --short
git diff --stat
git diff --ignore-cr-at-eol --stat
```

## Cấu hình và secret

Không commit:

- `.env`
- `tools/.env`
- `backend/.clasp.json`
- API key Gemini/Pinecone/Brevo
- Telegram token
- Vercel token
- access code thật của Trợ lý 35

Backend GAS đọc cấu hình qua Script Properties trong `backend/01-config.gs`.

Biến Vercel quan trọng:

- `GAS_DEPLOYMENT_URL`
- `GAS_API_TOKEN` hoặc `API_ACCESS_TOKEN`
- `ADMIN_API_TOKEN`
- `IP_HASH_SALT`
- `TROLY35_ACCESS_CODE`: mã gốc (plaintext) của Trợ lý 35, khớp với `TROLY35_ACCESS_CODE_SHA256` trong Script Properties. Proxy `web/api/gas.js` tự gắn mã này vào các action `troly35_*` khi client không gửi, phục vụ chế độ "truy cập tự do" (không bắt người dùng nhập mã). Đặt ở env Vercel (server-side), KHÔNG dùng `VITE_`.

Không đưa secret thật vào biến `VITE_*` vì sẽ lộ trong frontend bundle. Riêng dev gọi trực tiếp GAS (không qua proxy) có thể tạm đặt `VITE_TROLY35_ACCESS_CODE` trong `.env` local để test; để trống ở production.

## Quy tắc chỉnh sửa

- Sửa đúng file/module liên quan, tránh refactor lan rộng.
- Không chỉnh `web/dist`.
- Không đổi schema Google Sheets nếu không thật sự cần.
- Nếu đổi schema, cập nhật `SHEET_HEADERS` trong `backend/04-sheets-db.gs` và README.
- Không xóa hoặc đổi thứ tự cột sheet khi code đang đọc bằng index.
- Không re-add `web/src/pages/ThuVien.jsx`, `getRebuttals`, action `rebuttals`, hoặc lệnh Telegram `/phanbac` nếu không có yêu cầu rõ.
- Giữ backend GAS tương thích V8.
- Không dùng package Node mới nếu dự án chưa cần.
- Ưu tiên helper/pattern hiện có.

## Cảnh báo line ending

Repo từng bị nhiễu CRLF/LF khiến hàng chục file hiện `M` dù không đổi nội dung.

Trước khi commit, luôn kiểm tra:

```powershell
git diff --ignore-cr-at-eol --name-status
git diff --ignore-cr-at-eol --stat
```

Nếu file chỉ khác line ending, không commit. Có thể restore các file nhiễu bằng:

```powershell
git restore --worktree -- path/to/file
```

Không chạy formatter toàn repo nếu không được yêu cầu.

## Kiểm thử khuyến nghị

### Khi sửa frontend

- Chạy `npm.cmd run build` trong `web/`.
- Nếu sửa UI đang chạy local, kiểm tra tại `http://127.0.0.1:5173/`.
- Với Tin tức, kiểm tra phân trang và search.
- Với Trợ lý 35, kiểm tra chọn mode, gửi prompt, history, feedback.

### Khi sửa backend GAS

Chạy trong Apps Script:

- `showConfigSetupInstructions()`
- `testRun()`
- `testTroLy35Setup()`
- `runBanTin35Digest(1)` nếu sửa Bản tin 35

Nếu sửa API:

- Kiểm tra `doGet`/`doPost` trong `backend/07-main.gs`.
- Kiểm tra wrapper tương ứng trong `web/src/api.js`.
- Kiểm tra proxy `web/api/gas.js` nếu action cần token/admin.

## Public API hiện tại

GET:

- `today`
- `articles`
- `search`
- `quiz`
- `stats`
- `feedback_stats` (cần token)

POST:

- `subscribe`
- `submit_quiz`
- `troly35_run`
- `troly35_rate`
- `troly35_feedback`
- `troly35_history`
- `troly35_trends`
- `bantin35_generate`
- `bantin35_latest`
- `contact`

## Ghi chú triển khai

- Frontend production đi qua `/api/gas` trên Vercel.
- Local development hiện gọi trực tiếp GAS URL trong `web/src/api.js`.
- `web/vercel.json` có rewrite SPA và security headers.
- `clasp push` chỉ cập nhật source code Apps Script, không đảm bảo deployment `/exec` đã dùng version mới.

## Tài liệu liên quan

- `README.md`: tài liệu tổng quan và vận hành chi tiết.
- `backend/README.md`: hướng dẫn backend GAS.
- `docs/SETUP.md`: ghi chú setup.
- `docs/ke-hoach-troly35.md`: kế hoạch Trợ lý 35.
- `docs/huong-dan-scrape-tccs.md`: hướng dẫn scrape TCCS.
