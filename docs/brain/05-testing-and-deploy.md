# 05-testing-and-deploy.md - Kiểm thử và Triển khai

## Validation chuẩn bị pilot Production Thư tuần (01/10/2026)

- `node --test tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs`: **148/148** (132 module + 16 acceptance), local/synthetic, không network. 13 test mới: receiver PROD chỉ ghi cặp PROD, không send/không lộ dữ liệu/không ghi TEST, chặn từng gate, cô lập entrypoint hai chiều, GROUP_CONFIRMED hiện có/race, marker cũ/PRIVATE/sai/domain TEST, readiness READY chỉ getMe + không mutation, NOT_READY theo mã, privacy output, trigger attention, `caiLichThuTuan` PROD, trigger PROD gửi một lần rồi alreadySent.
- Mutation check thủ công: bỏ guard GROUP_CONFIRMED, bỏ kiểm trùng PROD/TEST, bỏ throw trigger, bỏ quét UNKNOWN/trigger, bỏ kiểm alreadySent → mỗi lần đều có test fail; khôi phục lại 148/148.
- Syntax: parse toàn bộ 21 file `.gs` đã track bằng `vm.Script` (cùng lệnh với CI); không dùng `node --check` cho `.gs`. CI `.github/workflows/thu-tuan.yml` chạy cùng hai bước trên Node 22 cho PR/push `main`; chưa chạy trên GitHub tới khi push.
- Không chạy GAS/Production. Pilot thật cần owner làm theo mục 12 “Pilot Production” trong README module; chỉ sau gửi thật + đối chiếu mới có `PRODUCTION_ACCEPTANCE_PASS`.

## Validation patch review PR #12 (01/10/2026)

- Main tự chạy `node --test tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs`: **135/135** (119 module,16 acceptance), local/synthetic, không network. Parse syntax năm `.gs` bằng Node vm.Script, `git diff --check` đạt. Không gọi PASS toàn repo.
- Fault injection: lỗi SENDING/loop read sau part1, receipt hợp lệ nhưng SENT write hỏng, postflush guard trước API, FAILED write hỏng, clock lỗi sau receipt, resume phần chưa gửi và ngăn đảo thứ tự. UNKNOWN/SENDING giữ fail closed/no retry. TEST SEND lỗi initial guard/adapter/BUSY vẫn false verified; PROD/unverified project/trigger không property write; disable readback hỏng giữ operationStatus/counters.
- Security: active-only credentials/opposite pins, Gmail không mang token Zalo; fresh marker khác phiên chống replay với timestamp mới, nonce/secret/raw data không output; đổi tên Bot không bỏ identity pin; Gmail tab vắng được phép, header sai vẫn chặn.
- GAS TEST đã lưu đúng source 5896c84 (hash 4 file khớp sau reload) và chạy lại chỉ đọc: PREVIEW alreadySent1/pending0/unknown0/part1 765/sealed; doiSoat 1 SENT/receipt hợp lệ/reconciliationClear. Không gửi thêm tin, ENABLED vẫn false. Lần gửi thật/dedupe và 120/120 dưới đây thuộc source trước patch; nhánh lỗi mới (pre-send FAILED, kill switch BUSY) chỉ kiểm bằng mocks, không cố tạo lỗi thật trên nhóm. Không cần gửi thêm fixture để hoàn tất review source; triển khai TEST bản mới là bước riêng, không Production.

## Gate hiện hành 01/10/2026 — ưu tiên hơn lịch sử 30/9

- Regression main: `node --test tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs` **120/120** (local/synthetic). Test thứ tự PropertiesService keys đã fail trước sửa/pass sau sửa; exact values/key sets/array order, privacy allowlist, approval race, tamper, UNKNOWN, disable readback và core dedupe vẫn được kiểm. Independent review helper không finding mới.
- Runtime GAS riêng: external_request grant/getMe hai host đã PASS; GROUP marker06:13–06:14 pin target và membership owner; full preflight OK/TEST. Log schema16 cột hợp lệ. PREPARE→APPROVED→PREVIEW sealed1part/765, pending1/unknown0. SEND COMPLETE/sent1; receipt audit1SENT/part1of1/messageIdPresent/reconciliationClear, 0SENDING/UNKNOWN. Rerun cùng fixture sent0/alreadySent1/pending0; cuối enabledfalse/0trigger tài khoản đang chạy. Local getMe trước đó là evidence khác, không thay runtime GAS.
- **Verdict:** `THU_TUAN_ZALO_TEST_RUNTIME_ACCEPTANCE_PASS`. Owner đã xác nhận nhận đủ tin khi được hỏi kiểm nội dung/thứ tự/chỉ một tin trong nhóm Test, hoàn tất gate phía nhận. Không fake receipt hoặc làm log UNKNOWN giả để thử; nhánh lỗi UNKNOWN được regression local kiểm, runtime audit chỉ xác nhận không còn unresolved states. Không Production/pilot/trigger/deploy. Sau test thành công owner thay hai secret TEST cùng lượt; giữ log, các approval cũ sẽ cần duyệt lại khi đổi HMAC secret. Lượt chốt chỉ sửa tài liệu, không chạy thêm cloud/send hoặc thay source; giữ kết quả regression120/120 đã chạy sau sửa source và không gọi PASS toàn repo.

## Lịch sử phép đo 01/10 trước GROUP marker — đã được trạng thái hiện hành thay thế

- **Phiên GROUP sau ảnh06:03:** owner nói chưa gửi phiên đầu; tin mới “xin chào” không dùng pin. Main mở GAS06:05:16.087–06:07:18.198 VN, UI READY/running trước hướng dẫn marker; bốn timeout chuỗi30 HTTP200/408, không event. Chưa marker timing confirmation trong phiên mới, không coi thử GROUP đồng bộ đã hoàn tất. Không retry/poll tiếp; xác nhận tin đã gửi trước chọn PRIVATE control hoặc ghép cặp lại. TEST cuối enabled=false/0 trigger account; source/tests không đổi trong lượt này.

- **Sau consent owner:** `capQuyenZaloThuTuanTest` chạy thật trong GAS xác minh scope, `chanDoanZaloThuTuan` trả getMe HTTP 200/ok=true/Bot ID chuỗi đúng pin trên cả hai host. Các dòng OAuth BLOCKED bên dưới mô tả phép đo trước consent, đã được gỡ. Webhook 404 vẫn UNKNOWN; không thay bằng mock/local hoặc quy lỗi Platform.
- Phiên GAS SDK host thực tế00:53:46.995–00:55:49.743 VN (122748ms), bốn POST timeout chuỗi30 HTTP200/408, không event. Chưa xác nhận owner gửi GROUP marker trong phiên: timing UNVERIFIED, không mở lại/poll mù hoặc bắt owner gửi lặp. Receiver UI được xác minh READY/running trước hướng dẫn gửi. Kiểm enabled=false/0 trigger account sau kết thúc.
- Main regression helper fixture + module: `node --test tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs` **117/117**. Bao gồm preservation log/clone Nhap, full isolation, HMAC/identity, config/row/history approval race, preview seal/target tamper, receipt/dedupe/UNKNOWN, disable readback. Mock/local không thay nghiệm thu runtime. Helper/Mã.gs đã lưu/readback TEST, chưa chạy prepare/approve/preview/send/audit vì thiếu GROUP target. Trình tự chi tiết ở README module mục12; không fake receipt/UNKNOWN hoặc xóa log.

- Giữ token TEST và approval secret tới khi test thành công theo owner; không rotate và không dùng rotation làm gate. Profile PROD chưa tồn tại được vắng hoàn toàn; pin active TEST vẫn bắt buộc đủ trước gửi.
- Chỉ helper chẩn đoán TEST bị tắt được phép đọc getMe/getWebhookInfo mà chưa có chat/hash/group; guard gửi chính thức không đổi. So sánh endpoint tài liệu và SDK bằng metadata an toàn, không raw event/error/URL/token.
- getUpdates cần result object, timeout chuỗi; không chạy local/GAS đồng thời. Chỉ mở phiên nhận tối đa 4 request/120 giây sau khi owner xác nhận không consumer khác và sẵn sàng; phát READY rồi yêu cầu một mention marker mới. Không suy thời điểm từ tin gửi trước đó.
- Kiểm tra lịch GAS đã trả enabled:false/triggersOfThisAccount:0. Runtime acceptance còn phải xác minh UrlFetch/getMe GAS, log schema, GROUP target, approval, preview, fixture receipts, dedupe và reconciliation. Local regression không thay runtime.
- Main đã tự chạy **107/107** test module sau sửa helper/tests. GAS diagnostic đã xác minh log Zalo 16 cột/0 dòng và đọc approval hiện tại; getMe GAS cả hai host còn FETCH/AUTHORIZATION, trước HTTP. Local hai getMe HTTP 200/đúng Bot không thay nghiệm thu GAS. getWebhookInfo local 404 giữ UNKNOWN.
- Khi thiếu scope, chạy `capQuyenZaloThuTuanTest` thủ công trong project TEST đang tắt, bấm “Xem lại quyền”, cấp đúng external_request qua Google; không revoke toàn bộ grant hoặc rotate secret. Chạy lại helper để thấy scope success, rồi diagnostic để thấy GAS HTTP/getMe khớp. Sau đó mới phối hợp một GROUP marker và lưu target. Tuần hiện tại có lịch sử Gmail: chuẩn bị/duyệt fixture kỳ khác để guard chống đổi transport được giữ nguyên.

## Lịch sử gate Thư tuần Zalo (30/9/2026)

- Cập nhật sau ảnh lỗi: `ZaloTransport.gs` mới đã lưu và đọc lại trên Apps Script project TEST; pin TEST script/content/private khớp, `TEST_MODE=true`, transport ZALO, ENV TEST, ENABLED=false. Hàm `kiemTraZaloThuTuan` vẫn trả `ZALO_ISOLATION_REQUIRED` vì thiếu active pin `THU_TUAN_ZALO_TEST_CHAT_SHA256`; `THU_TUAN_ZALO_TEST_CHAT_ID` và `THU_TUAN_ZALO_TEST_GROUP_CONFIRMED` cũng chưa có. Dừng trước getMe/UrlFetch; chưa send. Cấu hình PROD không cần để khởi động TEST sau sửa code.
- Khi inspect Script Properties UI, một snapshot không che đã đi vào đầu ra công cụ và chứa credential TEST. Không sử dụng credential đó; cần owner reset Bot TEST token và thay approval secret TEST cùng lượt trước bất kỳ API call nào, rồi duyệt lại fixture. Không ghi giá trị vào repo. Production vẫn không được truy cập/thay đổi.
- Sau thay đổi isolation bootstrap: `node --test tests/thu-tuan.test.cjs` đạt **83/83**. Đây là test local/mock, không phải runtime acceptance; verdict hiện vẫn BLOCKED.

- **Gate mới nhất:** `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_GETUPDATES_408_OAUTH_AND_PROD_ISOLATION`. Owner xác nhận đã mention Bot; hai getUpdates TEST trả HTTP 200/error_code=408, chưa có event/chat.id; không cần gửi lại tin. getMe trực tiếp xác nhận Bot/capability. GAS preview dừng ở yêu cầu OAuth. Theo chỉ đạo owner, hoãn thay token và approval secret TEST đã lộ tới cuối đợt kiểm tra; không lưu chúng vào repo. Năm pin PROD thật chưa có vì chưa có project/Bot Production. Không có fixture/sendMessage/receipt/dedupe/reconciliation runtime. Không thay đổi Production.

- Lượt tiếp tục runtime TEST: `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_MISSING_TEST_TOKEN_AND_ISOLATION_CONFIG`, xác minh trực tiếp qua browser đã đăng nhập đúng project TEST. ENABLED=false, TEST_MODE=false, transport/ENV/token/chat/Bot/pin thiếu; hai ID bảng chung hiện có và khác nhau nhưng chưa pin profile; 0 trigger hiển thị cho account hiện tại. Chưa cloud deploy/create log/getMe/preview/send/dedupe/reconciliation; local Node 82/82 và syntax thành công không thay thế runtime. Owner phải cấp Bot/group TEST + metadata xác minh trong project TEST theo phần checklist cuối mục 12 README; không cung cấp token qua chat. Không thay đổi Production, không hạ isolation để chạy qua gate.

- `node --test tests/thu-tuan.test.cjs`: 82/82 thành công (52 test cũ, 30 Zalo), services Google/API được mock. Bao phủ renderer nguyên văn, Unicode/split, receipt/HTTP/JSON/timeout, SENDING flush/UNKNOWN, dedupe/đối soát, TEST/PROD, HMAC/lock và thay cấu hình/nội dung giữa phần.
- Kiểm tra cú pháp GAS: đọc nội dung từng `.gs` vào stdin `node --check -` (Node không nhận extension .gs trực tiếp). Kiểm tra `.cjs` bằng `node --check tests/thu-tuan.test.cjs`.
- Frontend regression: tại `web`, `npm run build -- --outDir ../.codex-validation-zalo/web-build` đã thành công; output tạm do task tạo được xóa sau kiểm tra, không sửa dist hiện có. Không có script lint/typecheck/test frontend riêng trong package.json.
- Regression video: bundled Python `python -m pytest tests -q -p no:cacheprovider` tại video_module bị chặn bởi `No module named pytest`; không cài dependency vì chưa được yêu cầu. Không ghi PASS cho toàn repo khi gate này chưa chạy.
- Gate cloud Zalo TEST còn BLOCKED theo cập nhật mới nhất ở trên. Source đã lưu chỉ trong editor TEST, không deploy Web App/API executable; preview không được vượt OAuth/isolation, getMe GAS là hàm riêng chỉ đọc. Thực hiện phần cập nhật cuối mục 12 README service; không dùng lệnh clasp/backend deploy để triển khai service này hoặc chạm Production.
- Pilot chỉ mở sau đủ runtime TEST receipt từng phần/dedupe/integrity/reconciliation/isolation và quyết định riêng của owner. Không đánh dấu runtime PASS bằng kết quả mock. Gmail acceptance trước đây vẫn là bằng chứng riêng cho Gmail.

## 1. Cài đặt và Chạy thử local (Frontend)
Yêu cầu Node.js phiên bản 18 hoặc 20 và npm.

```powershell
# Di chuyển vào thư mục frontend
cd web

# Cài đặt thư viện
npm install

# Khởi chạy môi trường phát triển local
npm run dev
```
Môi trường local mặc định chạy tại địa chỉ: `http://127.0.0.1:5173/`

## 2. Build và Kiểm tra Frontend
Trước khi deploy frontend lên Vercel, luôn chạy lệnh build để xác minh không có lỗi cú pháp hoặc lỗi TypeScript/Vite:

```powershell
cd web
npm run build
```

## 3. Triển khai Backend Google Apps Script (GAS)
Sử dụng công cụ `clasp` để đẩy mã nguồn từ local lên cloud:

```powershell
# Di chuyển vào thư mục backend
cd backend

# Đăng nhập clasp (chỉ cần làm lần đầu)
npx @google/clasp login

# Đẩy code lên Apps Script (ghi đè code trên cloud)
npx @google/clasp push --force
```

> **Lưu ý quan trọng sau khi push code**:
> 1. Mở giao diện lập trình web Apps Script.
> 2. Truy cập vào mục `Deploy > Manage deployments`.
> 3. Chọn deployment Web App đang hoạt động và cập nhật lên phiên bản mới nhất để áp dụng thay đổi cho API sản phẩm.

## 4. Kiểm tra Cú pháp Backend (Local)
GAS là JavaScript nhưng chạy trên môi trường Google, do đó không thể test local trực tiếp một cách đầy đủ. Tuy nhiên, có thể kiểm tra lỗi cú pháp JavaScript bằng node:

```powershell
# Chạy kiểm tra lỗi cú pháp trên từng file .gs
node --check backend/07-main.gs
node --check backend/08-troly35.gs
```

## 5. Kiểm thử nghiệp vụ trên Apps Script
Trong Apps Script Editor, bạn có thể chạy trực tiếp các hàm kiểm thử sau để xác minh hệ thống:
- `setupSystem()`: Khởi tạo các bảng và kiểm tra cấu trúc Google Sheets.
- `testRun()`: Kiểm tra chạy thử crawler tin tức hàng ngày.
- `testTroLy35Setup()`: Kiểm tra khả năng kết nối Gemini AI, Pinecone RAG và ghi nhận lịch sử của Trợ lý 35.
- `syncTccsApprovedChunksToPinecone()`: Chạy đồng bộ kho dữ liệu tạp chí đã duyệt lên vector database.
