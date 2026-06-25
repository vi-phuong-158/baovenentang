# Báo cáo: Quick wins nhóm Chatbot (Trợ lý 35)

> Ngày: 2026-05-30 · Phạm vi: nâng cấp tính năng phản bác của chatbot cho hợp giới trẻ
> Trạng thái: **đã code xong + verify tự động**, chờ deploy GAS để test thật.

---

## 1. Tóm tắt

Đã triển khai 2 nâng cấp cho Trợ lý 35 theo đúng phạm vi đã chốt:

1. **Bộ chọn phong cách phản bác** — 3 phong cách: *Chính luận / Trẻ trung / Ngắn gọn*. Chỉ áp dụng cho mode **Phản bác** (theo yêu cầu).
2. **Hội thoại đa lượt** — người dùng hỏi tiếp "ngắn hơn", "thêm dẫn chứng", "đổi giọng"… để tinh chỉnh câu trả lời trước, không phải nhập lại từ đầu.

**Không đổi schema** Google Sheets hay schema output JSON; chỉ thêm tham số + đổi tông prompt + thêm UI. Blast radius gọn: `backend/08-troly35.gs`, `backend/07-main.gs`, `web/src/pages/TroLy35.jsx`.

---

## 2. Tính năng 1 — Bộ chọn phong cách

### Hoạt động
Cùng một luận điệu sai trái, người dùng chọn phong cách → 3 phiên bản trả lời (đầy đủ / comment / tóm tắt) được viết theo tông tương ứng. **Dữ kiện, số liệu, nguồn giữ nguyên — chỉ đổi cách diễn đạt.**

| Phong cách | Mã | Tông giọng |
|---|---|---|
| Chính luận *(mặc định)* | `chinhluan` | Trang trọng, lập luận chặt, cho diễn đàn/báo cáo chính thống. |
| Trẻ trung | `tretrung` | Gần gũi, câu ngắn, hợp bình luận Facebook/Threads/TikTok. **Vẫn nghiêm túc, lịch sự; không tiếng lóng phản cảm, hạn chế emoji** (kênh của Công an). |
| Ngắn gọn | `ngangon` | Súc tích tối đa, đi thẳng ý chính để phản hồi nhanh. |

### Thay đổi kỹ thuật
- **Backend** [`backend/08-troly35.gs`](backend/08-troly35.gs):
  - Thêm hằng `TROLY35_STYLES`, `TROLY35_STYLE_GUIDE` và helper `troLy35NormalizeStyle_`, `troLy35StylePrompt_`.
  - `handleTroLy35Run` đọc `data.style`, đưa vào `troLy35RunCacheKey_` (mỗi phong cách cache riêng).
  - `troLy35GenerateRebuttalDraft_` nhận thêm `style`, chèn khối hướng dẫn phong cách vào prompt.
- **Backend** [`backend/07-main.gs`](backend/07-main.gs): thêm `style` (string, ≤20 ký tự) vào schema validate của `troly35_run`.
- **Frontend** [`web/src/pages/TroLy35.jsx`](web/src/pages/TroLy35.jsx): dải nút chọn phong cách (chỉ hiện ở mode Phản bác), nhớ lựa chọn qua `localStorage`, gửi `style` trong request.

---

## 3. Tính năng 2 — Hội thoại đa lượt

### Hoạt động
Khung chat đã hiển thị cả thread. Giờ khi người dùng gõ câu tiếp theo (vd "ngắn hơn"), hệ thống **tinh chỉnh câu trả lời gần nhất** thay vì coi đó là một luận điệu mới.

Cơ chế **"neo câu gốc"**:
- Frontend gửi kèm `history` (các lượt trước, tối đa 8 lượt, mỗi lượt cắt còn ≤800 ký tự ở backend).
- Backend **neo `analyze` + RAG vào câu user ĐẦU thread** (luận điệu gốc) — vì câu "ngắn hơn" không có nghĩa để phân tích/RAG. Câu mới được coi là **yêu cầu tinh chỉnh** và đưa vào prompt cùng ngữ cảnh hội thoại.
- **Nới min-length**: lượt đầu vẫn yêu cầu ≥20 ký tự; khi đã có hội thoại, cho phép câu tinh chỉnh ngắn (≥2 ký tự) ở cả frontend lẫn backend.

### Thay đổi kỹ thuật
- **Backend** [`backend/08-troly35.gs`](backend/08-troly35.gs):
  - Helper `troLy35NormalizeHistory_`, `troLy35HistoryAnchor_`, `troLy35BuildHistoryContext_`, `troLy35HistorySignature_`.
  - `handleTroLy35Run`: tính `isFollowUp`, `anchorContent`, `instruction`, `conversationBlock`; nới min-length; chạy analyze/RAG trên `anchorContent`.
  - Cả 3 generator (`rebuttal`/`fact_check`/`article`) nhận `conversationBlock` và chèn vào prompt → áp dụng đa lượt cho mọi mode.
- **Frontend** [`web/src/pages/TroLy35.jsx`](web/src/pages/TroLy35.jsx): dựng `history` từ `messages`, gửi kèm; nới validation; đổi placeholder ô nhập khi đang có hội thoại ("Nhập yêu cầu tinh chỉnh…").

---

## 4. Danh sách file thay đổi

| File | Nội dung |
|---|---|
| `backend/08-troly35.gs` | Phong cách + đa lượt (chính, +127 dòng) |
| `backend/07-main.gs` | Thêm `style` vào schema validate `troly35_run` |
| `web/src/pages/TroLy35.jsx` | UI phong cách + gửi history + nới min-length + placeholder động |
| `backend/README.md`, `README.md`, `.claude/CLAUDE.md` | Ghi chú tham số `style`/`history` cho `troly35_run` |

> Luồng tham số *pass-through*: `runTroLy35(data)` → `postApi` → proxy `web/api/gas.js` (giữ nguyên body) → `doPost`. **Không cần sửa** `api.js` hay proxy.

---

## 5. Đã kiểm thử (tự động)

- ✅ **Build frontend**: `npm run build` trong `web/` — **pass** (chunk `TroLy35` 18.08 kB, built in 4.79s).
- ✅ **Cú pháp backend**: `node --check` (qua `new Function`) trên `08-troly35.gs` và `07-main.gs` — **OK**.
- ✅ **Không nhiễu CRLF**: `git diff --ignore-cr-at-eol --stat` chỉ hiện thay đổi nội dung thật.

## 6. Cần bạn làm để lên production

> Backend là Google Apps Script nên không test local được — phải deploy.

1. Push code GAS:
   ```powershell
   cd backend
   npx.cmd --yes @google/clasp@latest push --force
   ```
2. Nếu Web App production pin version cũ → cập nhật deployment trong Apps Script UI (theo `.claude/CLAUDE.md`).
3. (Tùy chọn) chạy `testTroLy35Setup()` trong Apps Script.
4. **Test thủ công UI** tại `http://127.0.0.1:5173/` hoặc bản deploy:
   - Mode **Phản bác** → thấy dải nút *Chính luận / Trẻ trung / Ngắn gọn*; đổi phong cách và gửi cùng một luận điệu → tông trả lời khác nhau, dữ kiện giữ nguyên.
   - Sau khi có câu trả lời, gõ "ngắn hơn" / "thêm dẫn chứng" → câu trả lời được viết lại theo yêu cầu (đa lượt).
   - Kiểm tra lịch sử, feedback tốt/xấu vẫn hoạt động.

## 7. Ghi chú & giới hạn v1

- **Phong cách chỉ cho mode Phản bác** (đúng phạm vi đã chốt). Mode Viết bài / Kiểm chứng không có nút phong cách.
- **Neo câu gốc**: nếu giữa thread người dùng đổi hẳn chủ đề, ngữ cảnh sẽ neo nhầm vào luận điệu cũ → xử lý bằng nút **"Xóa hội thoại"** đã có.
- Mỗi lượt (kể cả tinh chỉnh) vẫn tính vào *daily limit* và mỗi lượt tinh chỉnh gọi lại Gemini (embedding có cache 24h, phân tích chạy lại) — chấp nhận được ở v1.
- Chưa commit gì (theo quy ước, chỉ commit khi bạn yêu cầu).

---

## Phụ lục — Video quick wins (đã làm trước đó trong cùng phiên)

Trong working tree còn các thay đổi của nhóm **Video** (làm trước khi chuyển sang Chatbot), tất cả đã verify bằng ffmpeg thật (14/14 check pass):

- **Hook 3 giây đầu** (`prompts/make_script.md` + `05_render_video.py`)
- **Nhạc nền có ducking** (`06_compress_video.py` + thư mục `assets/music/`)
- **Caption karaoke** (`05_render_video.py`)
- **Bản ngắn ~30s** cho TikTok/Reels (`08_make_short.py` + nối `daily_run.py` + `07_post_telegram_review.py`)

Chi tiết video xem `video_module/README.md` mục *Video quick wins*.

> Các file `logo.png`, `Logo-troly35.png`, `.claude/settings.local.json`, `hyperframes/index.html` ở trạng thái thay đổi/untracked **có sẵn từ trước**, không thuộc các thay đổi này.
