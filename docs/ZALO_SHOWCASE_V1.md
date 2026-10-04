# Zalo Bot Showcase V1

Trình diễn mô hình **TUYỆT ĐỐI TRUNG THÀNH - CHỦ ĐỘNG, SÁNG TẠO** qua nội dung được kiểm soát. Mô hình và nền nếp học tập là trọng tâm; Bot là phương tiện hỗ trợ. V1 không gọi Gemini, không RAG/AI sinh nội dung và không ghi kết quả quiz hay danh sách người sử dụng vào bảng người nhận Thư tuần.

## Trạng thái

- Code và test trên nhánh `codex/zalo-showcase-v1`, từ main `3789dd53d844c4fb2d13e94fb9a348a723c7337b`.
- Nghiệm thu tương tác Zalo/GAS/Preview thật **chưa chạy**. Session không có credential TEST, local clasp authorization hoặc endpoint TEST đã xác minh. Nghiệm thu Thư tuần TEST trước đây không chứng minh Showcase này.
- Runtime blocker: `ZALO_SHOWCASE_V1_RUNTIME_BLOCKED_NO_TEST_CREDENTIALS`.
- Ảnh F: `BLOCKED_PRIVATE_MEDIA`. Text hoạt động độc lập với ảnh.
- Không deploy, merge, gửi Production, sửa token/Properties/trigger/lịch Production hoặc đổi quyền Drive trong task này.

## Kiến trúc và ranh giới tin cậy

1. Zalo gọi `POST /api/zalo-webhook` trên **Preview/TEST**.
2. Relay kiểm chính xác header `X-Bot-Api-Secret-Token`, Content-Type và kích thước JSON. Không lấy secret từ body/query, không dùng token API chung. Deployment `VERCEL_ENV=production` hoặc thiếu môi trường bị chặn.
3. Relay ký HMAC-SHA256 envelope riêng, gửi tới Apps Script TEST `/exec/zalo-showcase-v1`. Payload ký là JSON của `["ZALO_SHOWCASE_V1_TEST", 1, timestamp, nonce, eventJsonString]`. Cửa sổ 5 phút; nonce UUID. Đây là giao thức **nội bộ relay**, không phải signature/schema của Zalo.
4. `doPost` yêu cầu **cả path lẫn action `zalo_showcase_v1`**, từ chối payload lẫn `update_id`. Body Zalo trực tiếp luôn bị từ chối. Telegram và POST API hiện có giữ router riêng.
5. `backend/13-zalo-bot.gs` kiểm pin TEST, HMAC envelope, official `{ok:true,result:{event_name,message}}`, chat GROUP allowlist, bot/self, độ dài/date/message ID. Tin thường bị bỏ qua.
6. ScriptLock → dedupe bền vững → rate guard → deterministic router → đọc source/approval → getMe đúng Bot → kiểm lại cấu hình và approval trước **và sau** ghi SENDING → sendMessage → xác minh receipt → SENT. Timeout/kết quả không chắc chắn bị giữ, không tự gửi lại.

`services/thu-tuan/ZaloTransport.gs` vẫn chỉ là outbound transport Thư tuần. Không thêm interactive router, doPost, trigger hoặc thuộc tính chọn tuần vào service này.

## Tái sử dụng nguồn duy nhất

- Audit từ main baseline: `05-telegram-bot.gs` giữ Telegram handler/callback; `07-main.gs` là POST router cần discriminator rõ; `08-troly35.gs` là AI/RAG, không gọi cho P0. Article/search phục vụ tin tức, không phải nguồn canonical LD. Quiz ở `04-sheets-db.gs` có mapper dùng lại; dữ liệu người nhận/kết quả quiz Web không dùng cho Zalo.
- `services/thu-tuan/Code.gs` sở hữu schema, current-week, canonical HMAC v2, sender/dedupe/reconciliation; `ZaloTransport.gs` sở hữu outbound TEST/PROD và receipt. Chỉ core đọc được đưa vào backend qua generator; sender, reconciliation và Card Studio không sửa.
- `tools/build-zalo-read-core.cjs` sinh `backend/13a-thu-tuan-read-core.gs` từ **đúng đoạn source hiện hữu** trong Code.gs/ZaloTransport.gs: timezone/current-week, canonical v2, HMAC, approval gate, đọc schema/rows, chọn Ky, split Unicode. Không copy sender, approval mutation, config sender hoặc nhật ký/recipient I/O. Không sửa generated file bằng tay.
- Chạy `node tools/build-zalo-read-core.cjs` sau khi sửa nguồn core; CI `--check` chặn artifact lệch source. Không chép toàn bộ service Thư tuần vào Web App.
- Quiz dùng `quizFromRows_` trong module DB hiện hữu; `getRandomQuiz` Telegram/Web tiếp tục dùng chính mapper đó. Adapter chỉ đọc QUIZ có schema đúng, lọc ID đã cho phép; không seed/tạo sheet, không copy ngân hàng.
- Định danh người sử dụng Zalo chỉ dùng hash cho state ngắn hạn; không đọc bảng người nhận Thư tuần, không gọi `saveQuizResult`.

## Lệnh

| Lệnh | Hành vi |
|---|---|
| `/gioithieu` | Giới thiệu mô hình, khẩu hiệu/tư tưởng, nền nếp và hai công cụ hỗ trợ; static controlled copy |
| `/loibac` | Chọn thứ Hai hiện tại theo `Asia/Ho_Chi_Minh`, đúng Ky/LD; chỉ phát hành sau approval hợp lệ |
| `/quiz` | Một câu từ QUIZ được phép; gửi A/B/C/D để chấm; state 5 phút, theo Bot/chat/người gửi |
| `/tracuu <từ khóa>` | Tên, khẩu hiệu, tư tưởng, phương châm, Ba nhất, bốn nhóm, sản phẩm, Thư tuần, Trợ lý 35; có dấu/không dấu |
| `/lich [trang]` | 7 kỳ/trang quanh hiện tại; `▶` đánh dấu tuần hiện tại; tương lai chỉ là metadata kế hoạch |
| `/trogiup` | Menu gọn sáu lệnh và ví dụ |

`/tuan` là alias current-week; `/tracuu LD-xxx` chỉ tra kỳ hiện tại hoặc quá khứ, cùng approval gate. Không lấy tuần sau. Không có `/phanbac`, `/kiemchung`, `/vietbai`. Command không phân biệt hoa thường; Unicode NFC/NFD được xử lý; input tối đa 1.000 UTF-16. URL trong query không bao giờ được fetch.

## Current week và approval

Ky trong `LoiDay_NoiDung` là ngày thứ Hai dạng text `YYYY-MM-DD`. `/loibac` gọi lại `thuTuanWeekKey_(new Date())`; không phụ thuộc ENABLED/lịch gửi/`THU_TUAN_APPROVAL_WEEK`, không có fallback sang kỳ khác. Số tuần hiển thị tính từ kỳ đầu tiên trong lịch, kể cả khoảng trống giữa các kỳ.

`thuTuanApprovalProblem_` giữ nguyên semantics: `TrangThai=DaDuyet`, reviewer trong allowlist, ngày duyệt hợp lệ, đủ trường, NotebookLM hợp lệ nếu có và HMAC canonical v2 khớp. Chỉ có record trong lịch không đủ để phát hành. Ky trùng, draft, stamp sai, dữ liệu đổi sau duyệt đều bị từ chối. Nguyên văn/nguồn/PhanTich/LienHeCAND/HanhDongTuanNay chép trực tiếp; hai trường legacy ngoài HMAC không render. Mọi phần text LD kiểm lại approval/current-week trước gửi; không cắt/paraphrase để ép vừa tin. Split giữ nguyên Unicode, tối đa 3 phần × 1.800 UTF-16; dữ liệu quá dài bị giữ an toàn để người vận hành xử lý.

## Nguồn V10 và media

Đã đối chiếu `01_BAN_MO_TA_MO_HINH_v10.md` trên Drive, sửa lần cuối 30/9/2026. Tên/khẩu hiệu/tư tưởng/phương châm và vai trò sản phẩm khớp prompt. **File vẫn ghi DỰ THẢO**. Controlled copy dùng nội dung giới thiệu owner yêu cầu và tên bốn nhóm tại mục VII; không công bố toàn văn/Drive ID/file private hoặc tự gắn approved cho LD từ bản mô tả.

Tài liệu sendPhoto hiện mô tả trường `photo` là URL; chưa có phương thức upload Blob/private Drive được tài liệu này xác nhận. Card Studio hiện xuất D/F và manifest `DRAFT_NOT_APPROVED`, không phải media approval/delivery store. V1 không thêm sendPhoto hoặc public link, không đổi quyền Drive, không upload ảnh tới dịch vụ khác. Muốn mở ảnh F cần thiết kế/review media approval gắn đúng Ky/LD/hash, cùng đường phân phối riêng được phép; text không bị phụ thuộc bước này.

## Cấu hình TEST (không lưu giá trị thật trong Git)

Tạo/cài **backend Apps Script TEST riêng**; không dùng project service Thư tuần hoặc backend Production. Có thể dùng cùng kho nội dung TEST đã ký với Thư tuần TEST, nhưng không dùng bảng riêng tư recipient/log của service. Không chạy setupSystem để tạo triggers. Mọi key dưới đây ở Script Properties của backend TEST.

| Key | Giá trị/ý nghĩa |
|---|---|
| `ZALO_BOT_ENV` | Chính xác TEST; V1 không hỗ trợ PROD |
| `ZALO_BOT_ENABLED` | true để xử lý; false để ngừng |
| `ZALO_BOT_TEST_SCRIPT_ID` | Pin project backend TEST thực tế, so `ScriptApp.getScriptId()` |
| `ZALO_BOT_TEST_BOT_ID` / `ZALO_BOT_TEST_BOT_TOKEN` | Bot TEST đã xác minh, token trong secret store |
| `ZALO_BOT_TEST_CHAT_ID` / `ZALO_BOT_TEST_CHAT_SHA256` | chat.id nhóm TEST từ event; SHA-256 UTF-8 của đúng chuỗi |
| `ZALO_BOT_TEST_GROUP_CONFIRMED` | true sau khi owner xác nhận Bot ở đúng nhóm |
| `ZALO_BOT_TEST_CONTENT_SHEET_ID` | Pin workbook TEST `LoiDay_NoiDung`, schema service hiện hữu |
| `THU_TUAN_APPROVAL_SECRET` | Khóa HMAC đúng với nội dung nguồn TEST, tối thiểu 32 ký tự; không tự ký/đổi khóa |
| `THU_TUAN_APPROVER_EMAILS` | Allowlist người duyệt nội dung nguồn, dấu phẩy |
| `ZALO_BOT_TEST_QUIZ_SHEET_ID` | Workbook TEST có QUIZ, schema backend hiện hữu |
| `ZALO_BOT_TEST_QUIZ_IDS` | ID câu hỏi được phép sử dụng, dấu phẩy; vắng/rỗng không phát hành câu hỏi |
| `ZALO_BOT_TEST_RELAY_SECRET` | Base64url/random 32–256 ký tự, riêng với Bot/webhook/approval secret |

Pin/credential/target trùng profile PROD đã khai báo (`ZALO_BOT_PROD_*`, `THU_TUAN_ZALO_PROD_*`) bị chặn. TEST metadata phải xuất phát từ môi trường đã xác minh; không dựng pin giả hoặc chép Production credential để qua gate.

Chỉ cấu hình **Preview** environment variables trên Vercel:

| Key | Giá trị |
|---|---|
| `ZALO_SHOWCASE_ENV` | TEST |
| `ZALO_SHOWCASE_TEST_WEBHOOK_SECRET` | secret_token 8–256 ký tự đặt qua setWebhook của Bot TEST |
| `ZALO_SHOWCASE_TEST_RELAY_SECRET` | Cùng khóa với backend TEST relay; không dùng approval/Bot token |
| `ZALO_SHOWCASE_TEST_GAS_URL` | URL TEST đã xác minh, đúng `https://script.google.com/macros/s/<deployment>/exec/zalo-showcase-v1` |

Không `VITE_*`, không credentials Production. `/api/zalo-webhook` không cần Bot token, GAS_API_TOKEN, AI accessCode hoặc IP_HASH_SALT. Không thay `/api/gas` hiện có.

## Setup và nghiệm thu TEST thực tế

1. Xác minh Bot/project/nhóm/kho TEST, không trùng Production. Không thay credential/lịch Thư tuần. Với Bot TEST đang dùng getUpdates cho chẩn đoán, phối hợp dừng consumer trước setWebhook vì hai cơ chế loại trừ nhau; không tự xóa webhook đang tồn tại để thử.
2. Chạy generator/check; đưa backend và generated core vào project backend TEST riêng. Manifest giữ V8/timezone; dùng scopes Sheets/external_request hiện hữu. Triển khai Web App **chỉ TEST** có `/exec` truy cập được; bất kỳ route showcase không có HMAC đều fail closed. Không chép Code.gs sender, không thêm trigger.
3. Cấu hình Script Properties TEST theo bảng. Chạy `kiemTraZaloShowcaseTest()` chỉ đọc: phải đúng Bot/can_join_groups, currentWeek đúng, currentApproved và quizAvailable đúng với dữ liệu đã duyệt. Hàm không gửi/ghi Sheet/Property. Không in Properties hoặc event thô.
4. Cài Preview TEST relay; xác minh endpoint truy cập được từ Zalo. Nếu Preview protection chặn Zalo, dừng và xử lý cấu hình truy cập TEST được phép; không public Drive hay tắt bảo vệ toàn dự án để thử. POST header sai phải 403 trước forward. POST hợp lệ nhưng envelope sai tới GAS phải AUTH_DENIED.
5. Đăng ký URL Preview qua **setWebhook của Bot TEST**, kèm webhook secret; đọc verification/testWebhook theo tài liệu. Secret qua TLS/secret store, không URL/query/log. Không đăng ký Production webhook. Task code-only này chưa thực hiện bước đăng ký.
6. Tại nhóm TEST, gửi `/trogiup`, `/gioithieu`, `/loibac`, `/quiz` rồi A/B/C/D, `/tracuu phương châm`, `/lich`. Đối chiếu đúng một logical response/lệnh (LD dài có thể nhiều phần), đúng nguyên văn/nguồn/Ky/LD, static V10, chấm và clear/TTL state. Ghi thời điểm, hash event, status/phần/latency và ảnh nhận đã che; không log chat ID/token/message thô.
7. Replay **cùng message_id và event gốc**, với relay nonce mới hợp lệ: DUPLICATE, không có tin mới. Negative chat ngoài allowlist, from.is_bot, malformed, auth sai phải không trả nội dung. Kiểm draft/stamp sai trên fixture TEST riêng đã được phép; không sửa row thật đã phát hành hoặc sửa HMAC của Production.
8. Kết thúc TEST: tắt `ZALO_BOT_ENABLED` trong backend TEST; giữ tombstone để đối soát. Không thay trigger/Properties sender. Chỉ ghi `ZALO_SHOWCASE_V1_TEST_RUNTIME_ACCEPTANCE_PASS` khi có evidence thật đủ; local fixtures không thay bước này.

## State, sự cố và đối soát

- Quiz: CacheService 5 phút; khóa hash Bot/chat/sender; chứa đáp án, giải thích, expires. A/B/C/D khi không có state bị ignore. Sau answer/new quiz state cũ được clear, không lưu hồ sơ cá nhân/kết quả dài hạn.
- Dedupe: Script Properties `ZALO_BOT_EVENT_<SHA256>` 24 giờ, tối đa 500 claim còn hạn; chỉ phase/until/confirmed, không chat ID/text/receipt thô. Message timestamp tối đa lệch 5 phút nên event cũ bị chặn cả sau retention. Claim tồn tại bị skip xuyên process/cache eviction. ScriptLock chống race. Cache rate guard là best effort, tối đa 10 command/answer mỗi người trong 10 giây; capacity đầy fail closed.
- SENDING/UNKNOWN hoặc HELD_NO_RETRY: không tự xóa claim/gửi lại. Đối chiếu tin nhận và số phần xác nhận, xử lý nguyên nhân ở TEST rồi dùng **tin người dùng mới** nếu thật sự cần. Phiên retry không tự resend; không có guarantee exactly-once của API Zalo.
- BOT_UNCONFIRMED: getMe không khớp pin hoặc group capability; không gửi, claim giữ để không replay vô hạn. BUSY chưa claim có thể retry. Thiếu pin/secret/disable → REQUEST_BLOCKED; lỗi auth → AUTH_DENIED.
- Không lấy status duplicate như evidence rằng lần gửi trước đã thành công; đọc phase và đối chiếu phía nhận. Tin quá dài/Unicode hỏng, cache/property I/O, đổi config/content giữa các phần đều dừng an toàn, không fallback AI.
- Log chỉ component/command thuộc enum/status/latency. Raw exception, token, auth, URL token, chat ID, user text không log hoặc trả qua relay.
- Rollback: tắt adapter TEST, gỡ/cập nhật webhook **TEST** theo evidence và cấu hình cũ đã lưu; revert commit source rồi redeploy TEST. Không tự xóa/đổi Production webhook, sender flags/triggers hoặc lịch sử Thư tuần.

## Kiểm thử local và tài liệu chính thức

Kết quả local ngày 04/10/2026: **264/264 PASS** (96 test Showcase/relay, 168 regression Thư tuần/Card Studio); frontend Vite build PASS. Có test relay → router → adapter bằng Google/Zalo giả lập, timezone ở ranh giới thứ Hai Việt Nam, draft/stamp sai, quiz state/TTL, durable duplicate, chat/auth/self/malformed, Telegram và POST API. Đây là evidence local, không phải runtime acceptance. CI kiểm generated core, cú pháp và toàn bộ 5 suite.

```bash
node tools/build-zalo-read-core.cjs --check
node --check web/api/zalo-webhook.js
node --test tests/zalo-showcase.test.cjs tests/zalo-webhook.test.cjs tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs tests/thu-tuan-card-studio.test.cjs
cd web
npm ci --no-audit --no-fund
npm run build
```

Đã đọc tài liệu chính thức ngày 04/10/2026 (Zalo Hub build 01/10/2026): [webhook](https://docs.zaloplatforms.com/docs/BOT/webhook), [setWebhook](https://docs.zaloplatforms.com/docs/BOT/apis/setWebhook), [getMe](https://docs.zaloplatforms.com/docs/BOT/apis/getMe), [sendMessage](https://docs.zaloplatforms.com/docs/BOT/apis/sendMessage), [sendPhoto](https://docs.zaloplatforms.com/docs/BOT/apis/sendPhoto), [getUpdates](https://docs.zaloplatforms.com/docs/BOT/apis/getUpdates). GAS event fields: [Google Web Apps](https://developers.google.com/apps-script/guides/web); duration relay Node API qua config export: [Vercel Functions](https://vercel.com/docs/functions/configuring-functions/duration).
