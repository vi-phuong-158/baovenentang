# 04-current-tasks.md - Nhật ký công việc hiện tại

## Zalo một tin — phương án B (02/10/2026)

- Code, preview/export, schema/HMAC v3, gate một tin, compatibility v2 và docs trên nhánh codex/thu-tuan-zalo-single-message xếp PR16. Local166/166; mutation3/3 bị bắt.
- Có100 nháp bên .work (14 biên tập lại, còn lại chọn câu), 12 kỳQ4 và51 kỳ theo lịch từ12/10; tất cả một phần. LD071/072 chờ nguồn. Chưa import/duyệt.
- Còn nghiệm thu mẫu mới trên GAS TEST/editor và đọc biên tập nội dung. APIexecutionTEST trả NOT_FOUND, cloud giữ nguyên. PRODchờ kết quả lịch05/10; dùng mẫu mới từ12/10 sau merge/upload/schema/readback/approval.

## Chuẩn bị pilot Production Thư tuần Zalo (01/10/2026)

- Hoàn tất code/test/CI/docs: receiver PROD, readiness chỉ đọc, trigger attention, guard GROUP_CONFIRMED, CI. Regression local **148/148**; syntax 21 file `.gs`. Branch `claude/thu-tuan-prod-pilot-readiness`, chưa commit/push/PR khi ghi mục này.
- Verdict vòng này: `THU_TUAN_ZALO_READY_FOR_PRODUCTION_PILOT` ở mức code/test. **Không** phải `PRODUCTION_ACCEPTANCE_PASS`: chưa có project/Bot/nhóm PROD, chưa chạy receiver/readiness PROD, chưa gửi Production.
- Việc tiếp theo của owner (ngoài vòng này): review/merge; tạo PROD và cấu hình theo mục 12 “Pilot Production” trong `services/thu-tuan/README.md`; pin → xác nhận người → GROUP_CONFIRMED=true → duyệt → readiness → quyết định bật gửi. CI chỉ chạy được sau khi workflow lên GitHub.

## Sau review PR #12 (01/10/2026)

- Đã sửa ba lỗi luồng gửi, marker public cố định, cfg toàn Properties; thêm chặn replay sai thứ tự và sửa diagnostic Gmail optional/tên Bot. Main local regression **135/135**, syntax năm GAS files và diff check đạt. Review độc lập không blocker mới và tự chạy **135/135**; không merge.
- GAS TEST đã lưu đúng source 5896c84 (hash 4 file khớp sau reload) và chạy lại chỉ đọc: PREVIEW alreadySent1/pending0/unknown0/part1 765/sealed; doiSoat 1 SENT/receipt hợp lệ/reconciliationClear. Không gửi thêm tin, ENABLED vẫn false. Lần gửi thật trong runtime acceptance PASS bên dưới vẫn thuộc source trước patch. Không yêu cầu owner gửi thêm tin; không thay cloud, secret, trigger hay Production. Helper fixed-week giữ phạm vi TEST lịch sử; recheck mỗi phần vẫn cần thiết để chống race.

## Hiện hành 01/10/2026 — Zalo TEST acceptance

- Trạng thái mới nhất: GROUP marker nhận trong GAS06:13:15–06:14:09 VN, target/hash pin an toàn, membership owner đã xác nhận. OAuth/getMe GAS/full preflight OK; webhook404 vẫn UNKNOWN, không quy lỗi Platform từ phiên408 trước đó.
- Fixture2026-10-05 clone nguồn đã duyệt, Nhap rồi APPROVED bằng tài khoản/HMAC thật. Preview sealed 1 phần/765, total=valid=pending=1, invalid=duplicate=unknown=0. Gửi GAS COMPLETE/sent=1/unknown=0. Audit1log SENT, part1/1, receipt hợp lệ, reconciliationClear=true, không SENDING/UNKNOWN. Rerun cùng fixture COMPLETE/sent=0/alreadySent=1/pending=0, không thêm tin.
- **Đã hoàn tất:** `THU_TUAN_ZALO_TEST_RUNTIME_ACCEPTANCE_PASS`. Owner xác nhận “Xác nhận đã có đủ tin rồi” sau yêu cầu kiểm đủ nội dung, đúng thứ tự và chỉ một tin trong nhóm Test. Không còn gate TEST chờ xử lý. Cuối gửi và dedupe helper tự tắt/readback ENABLED=false; kiểm lịch cuối enabled=false/triggersOfThisAccount=0. Giữ lịch sử Gmail/Zalo; token/secret chưa bị agent thay. Bước tiếp theo do owner thực hiện: thay hai secret TEST cùng lượt sau nghiệm thu, duyệt lại nội dung cần dùng sau đổi HMAC, giữ lịch sử. Không Production/pilot.
- Main regression120/120 (107module+13acceptance), independent security review không blocker mới. File helper thêm safe phase/reason và strict snapshot key/value để bỏ false-positive do enumerationorder; giữ đầy đủ guard/race/HMAC/UNKNOWN. Screenshot đã che được giữ riêng trong workspace của task; không đưa ảnh runtime vào repository/PR.

## Lịch sử 01/10 trước GROUP marker — đã được trạng thái hiện hành thay thế

- **Mới nhất sau ảnh06:03:** owner xác nhận chưa gửi trong phiên đầu; tin “xin chào” mới không marker. Phiên GROUP GAS thứ hai06:05:16.087–06:07:18.198 VN, elapsed122111ms, bốn HTTP200/408 không event, chưa có xác nhận marker trong phiên. Verdict `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_GROUP_MARKER_TIMING_UNVERIFIED`; không pin/fixture/send, GAS cuối enabled=false/0 trigger account. Không tự poll tiếp hoặc kết luận Platform; cần owner xác nhận đúng tin/thời điểm trước phép phân biệt tiếp.

- **Mới nhất sau owner cấp quyền:** scope helper thực thi thành công; GAS getMe cả hai host HTTP 200/ok=true/đúng Bot ID chuỗi/account/display/capability. OAuth gate đã gỡ bằng runtime evidence. getWebhookInfo GAS cả hai 404 giữ UNKNOWN. Log Zalo 16 cột/0 dòng. Chưa receiver/send trong lượt sau consent; còn GROUP target và fixture kỳ riêng trước acceptance.
- **Sau phiên nhận:** GAS SDK host READY00:53:46.995–00:55:49.743 VN, elapsed122748ms, bốn request30 giây đềuHTTP200/408, không event. Chưa owner xác nhận marker gửi trong cửa sổ nên `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_GROUP_MARKER_TIMING_UNVERIFIED`; không suy receive path thất bại đồng bộ hoặc lỗi Platform. Không pin/send; kiểm lịch GAS cuối enabled=false/0 trigger account. Helper fixture kỳ riêng đang chuẩn bị local, chưa cloud/run.
- **Chuẩn bị hoàn tất:** helper `ZaloAcceptance.gs`, guard approval trong `Code.gs`, tests acceptance riêng đã được main chạy 117/117. Review độc lập phát hiện/sửa approval race trong lock và readback tắt gửi. Đã lưu Mã.gs/helper riêng TEST, so baseline cloud trước write và readback sau reload đều khớp. Chưa tạo/duyệt fixture hoặc gửi, chưa có target/group confirmation; không thay Production.

- Agents rà soát source/security, tài liệu/SDK và phép chẩn đoán độc lập; main điều phối mọi thao tác cloud. Các snapshot/verdict 30/9 bên dưới là lịch sử, không ghi nguyên nhân Platform.
- Cloud đã xác minh lại: ENABLED=false, TEST_MODE=true, ZALO/ENV=TEST; pin script/hai Sheet TEST khớp; token/Bot/approval secret có, chat/hash/GROUP_CONFIRMED thiếu. Code.gs/ZaloTransport.gs khớp local; manifest có cùng scopes/timeZone/runtime/exceptionLogging nhưng thêm metadata webapp MYSELF hiện có (không phải bằng chứng deployment). Giữ metadata này nguyên trạng. Kiểm tra lịch chạy trong GAS trả enabled:false, triggersOfThisAccount:0.
- Giữ hai secret TEST theo owner đến khi test thành công; không rotation trước API. TEST-only không cần PROD chưa tồn tại. Chuẩn bị helper chỉ đọc để so sánh GAS/getMe hai host tài liệu và SDK, xác minh log rồi phối hợp một phiên nhận có giới hạn.
- Chưa gửi fixture; preview/getMe chính thức, receipt/dedupe/reconciliation chưa hoàn tất. Không mở pilot hoặc thay đổi Production.
- Kết quả mới: local getMe hai host HTTP 200/ok=true/đúng Bot pin; local getWebhookInfo hai host HTTP 200/404, webhook UNKNOWN. GAS getMe cả hai host FETCH/AUTHORIZATION, không có HTTP response. Schema runtime: Zalo 16 cột/0 dòng; Gmail 9 cột/5 dòng, tuần hiện tại có lịch sử Gmail, approval hiện tại OK và render 1 phần/765. Không tái sử dụng kỳ Gmail này làm fixture Zalo.
- Helper `capQuyenZaloThuTuanTest` đã lưu riêng lên TEST và chạy mở native Google permission prompt; “Xem lại quyền” chưa đưa cửa sổ consent vào tab điều khiển được. Chờ owner hoàn tất đúng external_request, rồi chạy lại scope helper/diagnostic trước phiên GROUP marker. Verdict: `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_GAS_EXTERNAL_REQUEST_OAUTH`; nguyên nhân receive path chưa xác định. Regression main **107/107**; không getUpdates/send/config mutation trong lượt này.

## Lịch sử 30/9/2026 — Thư tuần Zalo chờ runtime gate

- Ảnh lỗi từ owner cho thấy chạy `kiemTraZaloThuTuan` trả `ZALO_GATE_BLOCKED/ZALO_ISOLATION_REQUIRED`. Codegraph trace xác định gate bắt buộc đủ cả TEST và PROD, nhưng owner chưa tạo project/Bot PROD. Đây là lỗi thiết kế bootstrap, không phải OAuth/API; chưa có request Zalo hay gửi nào.
- Đã sửa logic local: pin active env là bắt buộc; profile đối diện có thể trống hẳn, profile một phần vẫn bị chặn; nếu đủ hai profile thì giữ kiểm tra identity/sheet không trùng. Đổi ENV/TEST_MODE trong project TEST sang PROD vẫn fail vì script ID không khớp. Chờ test, cập nhật cloud TEST only và chạy lại getMe; không thay đổi Production.
- Đã lưu riêng `ZaloTransport.gs` cập nhật lên project TEST và đọc lại sau reload để xác nhận source mới. Chạy lại `kiemTraZaloThuTuan` vẫn dừng isolation vì pin active `THU_TUAN_ZALO_TEST_CHAT_SHA256` còn thiếu; cùng lúc thiếu `CHAT_ID` và `GROUP_CONFIRMED`. Hàm chưa tới UrlFetch/getMe; ENABLED=false, không gửi. Không mở project Production.
- Trong lúc đọc Script Properties ở lần chẩn đoán này, UI snapshot đã đưa giá trị credential vào đầu ra công cụ ngoài chủ đích. Không dùng token/approval secret hiện tại cho request tiếp theo; trước runtime API cần owner rotate Bot TEST token và approval secret TEST cùng một lượt theo chỉ đạo bảo mật, rồi duyệt lại fixture. Không ghi credential vào repo.

- **Mới nhất sau khi owner xác nhận đã mention Bot:** `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_GETUPDATES_408_OAUTH_AND_PROD_ISOLATION`. Hai getUpdates TEST giới hạn timeout đều trả 408, không có event/chat.id; không yêu cầu owner nhắn lại. getMe trực tiếp xác nhận Bot/can_join_groups, chưa phải GAS preflight; preview dừng ở OAuth. Chưa có project/Bot PROD nên pin môi trường thật còn thiếu. Theo chỉ đạo owner, thay token và khóa duyệt đã lộ cùng một lượt sau khi runtime đủ ổn định; chưa ghi chúng vào repo. Không gửi fixture/Production.

- Lượt tiếp tục runtime TEST đã kiểm tra cloud trực tiếp: `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_MISSING_TEST_TOKEN_AND_ISOLATION_CONFIG`. Google đã đăng nhập; project TEST vẫn thiếu token/Bot/chat và 10 pin metadata; TEST_MODE=false, transport thiếu → GMAIL, ENABLED=false; 0 trigger hiển thị tài khoản hiện tại. Chưa deploy/getMe/preview Zalo/gửi fixture/tạo log. 82/82 test local và syntax vẫn đạt. Checklist owner tối thiểu cuối mục 12 README service; giữ Production nguyên trạng.

- Hoàn tất transport Zalo Apps Script với Gmail mặc định, receipt/log từng phần, cách ly TEST/PROD và guard dùng chung. 82/82 test Node và frontend build thành công.
- `THU_TUAN_ZALO_PILOT_BLOCKED`: project TEST vẫn tắt; source/cloud log và cấu hình TEST một phần đã chuẩn bị, acceptance còn thiếu credential rotation/OAuth/chat/profile PROD. Python regression chưa chạy do thiếu pytest. Production không thay đổi.
- Người vận hành cần cấp Bot/group TEST có quyền, metadata pin hai môi trường, triển khai chỉ TEST và nghiệm thu theo mục 12 `services/thu-tuan/README.md` trước quyết định pilot.

## Cập nhật 27/9/2026 — Tạm tắt Dark mode

- Dark mode đã được gỡ khỏi giao diện cho tới khi hoàn thiện; ứng dụng luôn dùng bảng màu sáng, kể cả khi hệ điều hành bật chế độ tối. Chi tiết thay đổi và cách kiểm tra nằm trong `06-ai-working-log.md`.

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
  - **Đợt 3 (đã làm)**: Dark mode từng được thêm bằng `@media (prefers-color-scheme: dark)` nhưng đã tạm gỡ ngày 27/9/2026 theo yêu cầu vì chưa hoàn thiện. Các phần còn lại gồm cải thiện a11y (vùng chat `role="log"`/`aria-live`, `aria-label` nút tải lại lịch sử, tăng tương phản `--ink-mute`) và **tách toàn bộ inline style** `TroLy35.jsx` sang `web/src/css/troly35.css` và `BottomNav.jsx` sang nhóm `.bottom-nav*` trong `index.css` (theo yêu cầu rõ của người dùng). Giá trị giữ nguyên; selector mở rộng `.btn`/`.pill`/`.field` được nâng specificity (`.btn.t35-*`, `.pill.t35-*`, `.field.t35-compose-input`) để thắng `.btn.sm`/`textarea.field`. BottomNav đổi tương tác scale từ JS handler sang `:active` CSS.

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
