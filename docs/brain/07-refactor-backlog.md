# 07-refactor-backlog.md - Backlog refactor & hardening (chi tiết)

> Nguồn: review kiến trúc CodeGraph ngày **2026-06-09**. Đây là các đề xuất **còn lại** sau khi đã tạm tắt hỏi đáp AI Tủ sách.
> Mỗi task có checklist **"TRƯỚC KHI CODE"** bắt buộc theo `CLAUDE.md` (phân tích tác động, đóng băng contract, rollback).
> Thứ tự ưu tiên: **TOOL-1 → nhóm SEC → nhóm REF**. Không gộp nhiều task vào một commit.

---

## Quy tắc chung "TRƯỚC KHI CODE" (áp dụng cho mọi task)

1. **Đọc brain**: `docs/brain/01-architecture.md`, `03-decisions.md`, file này.
2. **Phân tích tác động bằng CodeGraph** cho symbol/đối tượng sẽ sửa:
   - `codegraph_explore <symbol/file>` để xem source + blast radius.
   - `codegraph_callers <symbol>` và `codegraph_impact <symbol>` (chỉ hiệu lực với JS/JSX/Python — xem **TOOL-1** về điểm mù `.gs`).
   - Với backend `.gs`: tạm thời dùng `Grep` toàn thư mục `backend/` để liệt kê caller cho tới khi TOOL-1 xong.
3. **Đóng băng contract**: ghi lại payload/response của các action `doGet`/`doPost` bị chạm; **không đổi tên action, key request/response** nếu không bắt buộc.
4. **Ghi rollback**: nêu rõ cách hoàn tác (thường là `git restore` + `clasp push` lại bản trước).
5. **Sau khi sửa**: chạy đúng bộ test ở mục "Kiểm thử"; cập nhật `06-ai-working-log.md`; cập nhật `01-architecture.md`/`03-decisions.md` nếu đổi luồng/contract/schema.
6. **Branch**: tạo nhánh riêng, không push thẳng `main`.

---

## TOOL-1 — Cho CodeGraph index file `.gs` (Apps Script)
- **Trạng thái**: HOÀN THÀNH 2026-06-10.
- **Ưu tiên**: CAO (làm đầu tiên — gỡ điểm mù backend cho mọi task sau).
- **Vấn đề**: CodeGraph hiện chỉ index `javascript/jsx/python`. Toàn bộ `backend/*.gs` (~9.000 dòng, lõi router/auth/RAG/DB) **không có trong index** → `codegraph_impact`/`callers` cho backend luôn rỗng, trái với yêu cầu "dùng CodeGraph trước khi sửa" của `CLAUDE.md`.
- **Trước khi code**:
  - Đọc cấu hình CodeGraph trong `.codegraph/` và tài liệu công cụ; xác định cách khai báo mapping phần mở rộng (đuôi `.gs` → parser JavaScript).
  - Xác nhận `.gs` về cơ bản là JavaScript V8 nên có thể parse như `.js`.
- **Các bước**:
  1. Thêm `.gs` vào danh sách phần mở rộng được index (map sang ngôn ngữ `javascript`).
  2. Chạy lại `codegraph index`.
  3. Kiểm tra `codegraph_status` thấy số file tăng (+~13 file `.gs`) và `codegraph_search doPost`/`askBookAI` trả về node backend.
- **Kiểm thử/Done**: `codegraph_callers handleTroLy35Run` và `codegraph_impact validateApiToken_` trả ra kết quả thật từ `.gs`. Không cần build/test runtime (chỉ đụng tooling).
- **Kết quả 2026-06-10**:
  - Đã thêm `.gs` → `javascript` trong `EXTENSION_MAP` của bundle CodeGraph global local.
  - `codegraph index --force` index 61 file, 1.210 nodes, 2.664 edges; `backend/` có 16 file `.gs` dưới language `javascript`.
  - `codegraph_search doPost` trả `backend/07-main.gs:268`; `codegraph_callers handleTroLy35Run` trả caller `doPost`; `codegraph_impact validateApiToken_` trả impact thật trong `backend/07-main.gs`.
  - Lưu ý: thay đổi nằm ngoài repo trong gói CodeGraph cài global, có thể mất khi nâng cấp/cài lại CodeGraph; nếu mất, áp lại mapping `.gs` → `javascript` rồi chạy `codegraph index --force`.
- **Rollback**: bỏ dòng mapping `.gs` trong `EXTENSION_MAP` của bundle CodeGraph global local, rồi chạy `codegraph index --force` lại; nếu CodeGraph được nâng cấp/cài lại thì mapping có thể tự trở về mặc định.

---

## SEC-1 — Chuẩn hóa policy public/private + bỏ phụ thuộc GAS URL hardcode
- **Trạng thái**: HOÀN THÀNH 2026-06-10.
- **Ưu tiên**: CAO.
- **Vấn đề**:
  - `web/src/api.js:3` hardcode URL `/exec` của GAS cho môi trường dev → lộ trong bundle; ai có URL gọi thẳng GAS, bỏ qua proxy.
  - Nhiều action POST không kiểm tra token ở GAS (`troly35_run`, `troly35_history/rate/feedback/trends`, `bantin35_latest`) → công khai trên thực tế. Cần một bảng policy rõ ràng thay vì ngầm định.
- **File/symbol liên quan**: `web/src/api.js` (`API_URL`, `postApi`), `web/api/gas.js` (`TOKEN_INJECT_ACTIONS`, `ADMIN_ACTIONS`, `authorizeAction`), `backend/07-main.gs` (`doGet`, `doPost`, `validateApiToken_`).
- **Trước khi code**:
  - Lập **bảng policy** từng action: `public` | `cần api_token` | `admin`. Đối chiếu 3 nơi: `api.js`, `gas.js`, `07-main.gs` để phát hiện lệch.
  - Đóng băng danh sách action hiện tại (liệt kê trong `CLAUDE.md` mục "Public API").
  - Quyết định: dev có nên gọi qua một biến env (`VITE_GAS_URL`) thay vì hardcode không.
- **Các bước**:
  1. Đưa GAS dev URL ra biến môi trường `VITE_GAS_URL` (không có giá trị mặc định nhạy cảm); fallback an toàn khi thiếu.
  2. Thống nhất tập action cần token giữa `gas.js` và `07-main.gs`; với action public, ghi chú rõ "public, dựa vào quota/captcha" trong code.
  3. Cập nhật bảng policy vào `CLAUDE.md` + `01-architecture.md`.
- **Kiểm thử**: `cd web; npm run build`; `node --check` cho `07-main.gs`; thử từng action qua proxy và (dev) trực tiếp để xác nhận hành vi token nhất quán.
- **Kết quả 2026-06-10**:
  - `web/src/api.js` không còn hardcode GAS deployment URL; production gọi `/api/gas`, dev dùng `VITE_GAS_URL` nếu cần, fallback an toàn là `/api/gas`.
  - `web/api/gas.js` đưa `video_export` vào nhóm admin cùng `feedback_stats` và các action Bản tin 35 admin.
  - Bảng policy endpoint đã cập nhật trong `01-architecture.md` và README.
- **Done**: không còn URL `/exec` literal trong source; có bảng policy duy nhất; build pass.
- **Rollback**: `git restore web/src/api.js web/api/gas.js backend/07-main.gs`.

---

## SEC-2 — Thêm quota/abuse-guard cho `ask_book` trước khi bật lại
- **Ưu tiên**: CAO (điều kiện bắt buộc để re-enable Tủ sách AI — xem quyết định #7 trong `03-decisions.md`).
- **Vấn đề**: `askBookAI` (`backend/08-tusach.gs:168`) gọi `callGeminiAPI` mà **không có quota/accessCode/brute-force** như `troly35_run`. Hiện đã tạm tắt; muốn bật lại an toàn cần quota theo người dùng.
- **File/symbol liên quan**: `backend/08-tusach.gs` (`askBookAI`), tham chiếu mẫu `backend/08-troly35.gs` (`troLy35AssertDailyLimit_:1406`, `troLy35IncrementDailyLimit_:1418`, `troLy35DailyLimitKey_:1425`), `backend/07-main.gs` (`case 'ask_book'`), `backend/01-config.gs` (thêm `TUSACH_DAILY_LIMIT`).
- **Trước khi code**:
  - Quyết định khóa quota theo gì: `clientIpHash` (proxy đã gửi) hay `accessCode`. Vì Tủ sách không có accessCode → dùng `clientIpHash` + giới hạn ngày.
  - Đóng băng response schema `ask_book` (`{ success, data: { answer, references, book } }`).
- **Các bước**:
  1. Thêm `TUSACH_DAILY_LIMIT` (mặc định nhỏ, vd 20) vào `01-config.gs`.
  2. Viết `tuSachAssertDailyLimit_(key)` / `tuSachIncrementDailyLimit_(key)` dựa trên `clientIpHash` (tái dùng pattern hashing của `08-troly35.gs`).
  3. Gọi guard trong `askBookAI` trước khi gọi Gemini; tăng đếm sau khi thành công.
  4. Bật lại `case 'ask_book'` trong `07-main.gs` (khôi phục `validateInput_` + gọi `askBookAI`) **và** UI hỏi đáp trong `TuSach.jsx` (khôi phục import/state/handler đã gỡ — xem log 2026-06-09).
- **Kiểm thử**: `node --check 08-tusach.gs 07-main.gs`; chạy `ask_book` vượt ngưỡng để xác nhận bị chặn; `npm run build`.
- **Done**: gọi quá `TUSACH_DAILY_LIMIT` lần/ngày/IP bị từ chối; dưới ngưỡng trả lời bình thường.
- **Rollback**: giữ nguyên trạng thái "tạm tắt" hiện tại (revert là an toàn vì feature đang off).

---

## SEC-3 — Rate-limit proxy không đáng tin trên serverless
- **Trạng thái**: HOÀN THÀNH 2026-06-10 theo phương án B.
- **Ưu tiên**: TRUNG BÌNH.
- **Vấn đề**: `web/api/gas.js:9` dùng `Map` in-memory (`ipHits`). Trên Vercel mỗi instance ephemeral đếm riêng → rate-limit thực tế lỏng, reset liên tục.
- **Trước khi code**:
  - Đo nhu cầu thật: đây là chặn chi phí Gemini hay chỉ chống spam? Nếu là chi phí → lớp chặn THẬT phải nằm ở GAS (SEC-2), proxy chỉ là phụ.
  - Khảo sát lựa chọn store bền (Vercel KV/Upstash Redis) vs. chấp nhận giới hạn và dồn quota về GAS.
- **Các bước (1 trong 2)**:
  - (A) Chuyển `ipHits` sang store bền (KV) nếu chấp nhận thêm dependency/cost; hoặc
  - (B) Giữ in-memory như "best effort", ghi chú rõ giới hạn, và đảm bảo mọi endpoint tốn tiền đều có quota ở GAS.
- **Kiểm thử**: test proxy với nhiều request; xác nhận hành vi 429 đúng kỳ vọng theo phương án chọn.
- **Kết quả 2026-06-10**: giữ `Map` in-memory ở proxy là best-effort, thêm ghi chú trực tiếp trong `web/api/gas.js` và `01-architecture.md` rằng chặn chi phí thật phải nằm ở GAS quota/guard. Hiện `troly35_run` có quota backend, `ask_book` vẫn tạm tắt cho tới khi SEC-2 được yêu cầu/bật lại.
- **Done**: tài liệu hóa rõ "lớp chặn chi phí thật ở đâu"; không còn ngộ nhận proxy là hàng rào cứng.

---

## SEC-4 — Bỏ footgun `VITE_API_TOKEN`
- **Trạng thái**: HOÀN THÀNH 2026-06-10.
- **Ưu tiên**: TRUNG BÌNH.
- **Vấn đề**: `web/src/api.js:4,125` nhúng `VITE_API_TOKEN` vào request nếu được set; biến `VITE_*` bị bake vào bundle → nếu ai tưởng là secret thật sẽ **lộ token**. Token thật phải do proxy chèn ở server.
- **Trước khi code**: xác nhận không còn luồng nào dựa vào `API_TOKEN` phía client (grep `API_TOKEN`, `VITE_API_TOKEN`).
- **Các bước**: gỡ `API_TOKEN`/`VITE_API_TOKEN` khỏi `api.js`; bỏ nhánh chèn `api_token`/header `X-Api-Token` phía client; để proxy `gas.js` là nơi duy nhất gắn token.
- **Kiểm thử**: `npm run build`; kiểm tra các action cần token (`subscribe`, `submit_quiz`, admin) vẫn chạy qua proxy.
- **Kết quả 2026-06-10**: `web/src/api.js` đã gỡ `API_TOKEN`/`VITE_API_TOKEN`, không gửi `api_token` hoặc `X-Api-Token` từ client nữa; README nêu rõ không dùng `VITE_API_TOKEN`.
- **Done**: bundle không chứa biến token; tài liệu nêu rõ "không đặt secret vào VITE_*".

---

## SEC-5 — Bắt buộc cấu hình `IP_HASH_SALT`
- **Trạng thái**: HOÀN THÀNH 2026-06-10.
- **Ưu tiên**: TRUNG BÌNH.
- **Vấn đề**: `web/api/gas.js:31` fallback salt sang `GAS_API_TOKEN` rồi chuỗi `'bvnt'` → hash IP có thể đoán/không nhất quán.
- **Trước khi code**: xác nhận `IP_HASH_SALT` đã có trong tài liệu env (`CLAUDE.md`, `README`).
- **Các bước**: nếu thiếu `IP_HASH_SALT` thì trả `500 misconfigured` (fail fast) thay vì fallback yếu; cập nhật hướng dẫn deploy Vercel.
- **Kiểm thử**: chạy proxy khi thiếu/đủ salt; xác nhận fail-fast khi thiếu.
- **Kết quả 2026-06-10**: `web/api/gas.js` dùng `IP_HASH_SALT` bắt buộc và trả lỗi cấu hình nếu thiếu; không còn fallback sang `GAS_API_TOKEN` hoặc `'bvnt'`.
- **Done**: không còn fallback salt yếu.

---

## SEC-6 — Harden `tuSachParseGeminiObject_`
- **Ưu tiên**: THẤP.
- **Vấn đề**: `backend/08-tusach.gs:321` `JSON.parse` không bọc try/catch; Gemini trả sai định dạng sẽ ném lỗi (được catch ở `doPost`, trả lỗi chung, mất thông điệp thân thiện).
- **Trước khi code**: chỉ áp dụng khi SEC-2 bật lại `ask_book`.
- **Các bước**: bọc try/catch, trả fallback `{ answer: '', references: [] }` hoặc thông báo rõ; log nguyên văn để debug.
- **Kiểm thử**: mock response Gemini không phải JSON, xác nhận không vỡ luồng.
- **Done**: input bẩn không gây lỗi 500 khó hiểu.

---

## REF-1 — Tách lớp cache khỏi `web/src/api.js`
- **Trạng thái**: HOÀN THÀNH 2026-06-10.
- **Ưu tiên**: TRUNG BÌNH (blast radius nhỏ, làm sớm để lấy đà).
- **Vấn đề**: `api.js` trộn config URL/token + lớp cache localStorage SWR (`cacheGet/cacheSet/cacheTrim/cached/invalidateCache`, dòng 17-84) + wrappers API.
- **Trước khi code**: `codegraph_callers cached`, `invalidateCache`; xác nhận export `invalidateCache` còn ai dùng (grep `web/src`).
- **Các bước**: chuyển khối cache sang `web/src/cache.js`; `api.js` import lại; giữ nguyên chữ ký `cached(key, fetcher)` và `invalidateCache`.
- **Kiểm thử**: `npm run build`; kiểm tra Tin tức (phân trang/search dùng cache) và `getBooks` (cache key `books-v2`) hoạt động.
- **Kết quả 2026-06-10**:
  - Thêm `web/src/cache.js` chứa `cached` và `invalidateCache` với logic localStorage/SWR giữ nguyên.
  - `web/src/api.js` import `cached` và re-export `invalidateCache`, giữ nguyên chữ ký public.
  - `getArticles`, `getStats`, `getBooks` tiếp tục dùng `cached` như trước.
- **Done**: `api.js` chỉ còn config + wrappers; cache ở module riêng; build pass.
- **Rollback**: `git restore web/src/api.js` + xóa `cache.js`.

---

## REF-2 — Tách `web/src/pages/TroLy35.jsx` (728 dòng)
- **Ưu tiên**: TRUNG BÌNH.
- **Vấn đề**: component ôm mode + style + chat đa lượt + feedback.
- **Trước khi code**: `codegraph_explore TroLy35.jsx`; liệt kê sub-state và handler; đóng băng contract API (`troly35_run/history/rate/feedback/trends`) — chỉ refactor UI, **không** đụng `api.js`/backend.
- **Các bước**: tách sub-component thuần UI (vd `ModeSelector`, `StylePicker`, `ChatThread`, `FeedbackBar`) trong `web/src/components/troly35/`; giữ state điều phối ở page.
- **Kiểm thử**: `npm run build`; test thủ công chọn mode, gửi prompt, chat đa lượt, feedback tốt/xấu.
- **Done**: page mỏng hơn rõ rệt, hành vi không đổi.

---

## REF-3 — Tách router/auth/setup trong `backend/07-main.gs` (887 dòng)
- **Ưu tiên**: TRUNG BÌNH (nên làm SAU khi TOOL-1 xong để có impact analysis thật).
- **Vấn đề**: 1 file ôm router (`doGet`/`doPost`), auth/validate (`validateApiToken_`, `validateInput_`, `assertMaxLength_`), setup/stats/trigger.
- **Trước khi code**: `codegraph_callers doGet/doPost/validateApiToken_/validateInput_`; đóng băng tập action + thứ tự switch (đặc biệt nhánh Telegram webhook `data.update_id`).
- **Các bước**: tách `07b-auth.gs` (validate/token), `07c-setup.gs` (setup/stats/trigger); `07-main.gs` chỉ giữ router + `runDailyNewsBot`. GAS không có module → chỉ tách file, giữ tên hàm global (tránh đụng caller).
- **Kiểm thử**: `node --check` từng file; `clasp push` lên project test; chạy `doGet?action=...` và vài POST.
- **Done**: file router gọn; mọi action giữ nguyên hành vi.
- **Rủi ro**: GAS dùng global scope — trùng tên giữa file sẽ ghi đè. Kiểm tra không trùng tên hàm.

---

## REF-4 — Tách `backend/08-troly35.gs` (1527 dòng) theo trục
- **Ưu tiên**: TRUNG BÌNH-CAO (file lớn nhất, nhiều trách nhiệm).
- **Vấn đề**: ôm auth+quota+brute-force, RAG/Pinecone, prompt/Gemini, history/feedback, trends.
- **Trước khi code**: TOOL-1 phải xong. `codegraph_explore handleTroLy35Run`; vẽ call graph nội bộ; đóng băng contract các handler `handleTroLy35*`.
- **Các bước**: tách thành `08a-troly35-auth.gs` (access/quota/brute-force), `08b-troly35-rag.gs` (Pinecone/embedding), `08c-troly35-prompt.gs` (build prompt + Gemini), `08d-troly35-history.gs` (history/feedback/trends). Giữ tên hàm global.
- **Kiểm thử**: `node --check` tất cả file mới; `testTroLy35Setup()` trong Apps Script; test chat thật + feedback.
- **Done**: mỗi file một trục trách nhiệm; hành vi không đổi.

---

## REF-5 — Tách `backend/11-bantin35.gs` (1275 dòng)
- **Ưu tiên**: THẤP-TRUNG BÌNH.
- **Trước khi code**: TOOL-1 xong; đóng băng action `bantin35_generate/latest/setup_trigger/trigger_status` và `runBanTin35Digest`.
- **Các bước**: tách phần thu thập/tổng hợp dữ liệu và phần render/gửi Telegram thành file riêng; giữ tên hàm global.
- **Kiểm thử**: `node --check`; `runBanTin35Digest(1)` trong Apps Script.
- **Done**: tách trách nhiệm rõ; digest chạy đúng.

---

## REF-6 — Chuẩn hóa lớp truy cập Google Sheets (repository)
- **Ưu tiên**: THẤP (làm CUỐI — rủi ro cao nhất vì đụng đọc theo index cột).
- **Vấn đề**: mỗi module tự đọc sheet theo index cột (`row[9]`, `row[10]`...). Đổi schema dễ vỡ ngầm; `CLAUDE.md` cấm đổi thứ tự cột khi code đọc bằng index.
- **Trước khi code**: liệt kê toàn bộ chỗ đọc theo index (grep `getRange`, `getValues`, `row[`); đối chiếu `SHEET_HEADERS` trong `backend/04-sheets-db.gs`; đóng băng schema hiện tại.
- **Các bước**: xây helper map theo tên cột (dựa `SHEET_HEADERS`) thay vì index cứng; migrate từng sheet một, mỗi sheet một commit.
- **Kiểm thử**: `node --check`; test đọc/ghi từng sheet bị chạm (TIN_TUC, TROLY35_*, TU_SACH, QUIZ...).
- **Done**: không còn index cứng ở module nghiệp vụ; đổi cột chỉ cần sửa `SHEET_HEADERS`.

---

## REF-7 — Dọn nhẹ module Tủ sách (gộp vào lần chạm `08-tusach.gs` kế tiếp)
- **Ưu tiên**: THẤP.
- **Nội dung**:
  - Tách dữ liệu seed `TU_SACH_SAMPLE_BOOKS` (`08-tusach.gs:19`, ~130 dòng) ra file data riêng để file logic gọn.
  - Giảm I/O: mỗi `getBooks`/`getBookById`/`askBookAI` gọi `seedTuSach()` rồi `tuSachGetRows_()` → cân nhắc đọc rows 1 lần và truyền lại, hoặc cache `CacheService` ngắn cho catalog.
- **Trước khi code**: chỉ làm khi đã chạm file vì lý do khác (vd SEC-2) để tránh thay đổi rời rạc.
- **Kiểm thử**: `node --check`; action `books`/`book` trả đúng như trước.
- **Done**: file logic ngắn hơn; số lần đọc sheet/ngày giảm.

---

## Bảng tổng hợp ưu tiên

| Mã | Việc | Ưu tiên | Phụ thuộc |
|----|------|---------|-----------|
| TOOL-1 | CodeGraph index `.gs` | CAO | — |
| SEC-1 | Policy endpoint + bỏ URL hardcode | CAO | — |
| SEC-2 | Quota `ask_book` (điều kiện bật lại) | CAO | — |
| SEC-3 | Rate-limit serverless | TB | SEC-2 |
| SEC-4 | Bỏ `VITE_API_TOKEN` | TB | SEC-1 |
| SEC-5 | Bắt buộc `IP_HASH_SALT` | TB | — |
| SEC-6 | Harden parse Gemini | THẤP | SEC-2 |
| REF-1 | Tách cache `api.js` | TB | — |
| REF-2 | Tách `TroLy35.jsx` | TB | — |
| REF-3 | Tách `07-main.gs` | TB | TOOL-1 |
| REF-4 | Tách `08-troly35.gs` | TB-CAO | TOOL-1 |
| REF-5 | Tách `11-bantin35.gs` | THẤP-TB | TOOL-1 |
| REF-6 | Repository Sheets | THẤP | TOOL-1 |
| REF-7 | Dọn `08-tusach.gs` | THẤP | (gộp SEC-2) |
