# 03-decisions.md - Quyết định kỹ thuật

## Quyết định 02/10/2026 — Bỏ ngày mẫu khỏi helper duyệt editor

- Apps Script editor không truyền đối số khi Run. Literal YYYY-MM-DD làm helper luôn INVALID_WEEK và buộc source cloud lệch main mỗi khi reviewer thay ngày. Chọn tuần hiện tại theo cùng timezone với luồng gửi; reviewer phải đối chiếu nguồn/dòng kỳ trước khi chạy tay.
- Giữ `duyetNoiDungThuTuan(ky)` có tham số và toàn bộ approval guard. Không hardcode kỳ pilot, không wrapper cloud hoặc fixture PROD. Duyệt kỳ khác cần gọi API có tham số một cách tường minh.

## Chuẩn bị pilot Production Thư tuần Zalo (01/10/2026)

- Receiver PROD dùng chung core TEST thay vì nhân bản; môi trường là hằng số của entrypoint để property không thể đổi hành vi entrypoint. Thêm kiểm trùng pin PROD với TEST. Không thêm preview seal/acceptance wrapper PROD, webhook, retry, fallback Gmail, telemetry hay cột log.
- Bất kỳ `GROUP_CONFIRMED` hiện có đều chặn pin mới, áp dụng cả TEST và PROD, để xác nhận của target cũ không bao giờ tự áp sang target mới. Không tự reset; con người xóa xác nhận trước khi pin lại.
- Readiness là hàm riêng chỉ đọc, chạy sau bước duyệt, gọi getMe nhưng không bọc thêm ScriptLock vì preview core tự lock. Quét SENDING/UNKNOWN toàn lịch sử (cả log Gmail nếu có); trạng thái lạ cũng chặn vì core coi là chưa đối soát. `READY_FOR_PRODUCTION_PILOT` ≠ `PRODUCTION_ACCEPTANCE_PASS`; TEST acceptance ≠ PROD acceptance.
- Trigger báo lỗi bằng throw mã cố định (không email riêng) để dùng cơ chế thông báo lỗi trigger sẵn có. COMPLETE (kể cả sent=0/alreadySent=N) và DISABLED không throw. Hai test cũ kỳ vọng `TEST_MODE_MANUAL_ONLY` trả về từ trigger được cập nhật để kỳ vọng throw theo yêu cầu mới; exception gốc của runner giữ nguyên.
- `caiLichThuTuan` giữ gate hiện có (ENABLED=true, không TEST_MODE, toàn bộ `thuTuanZaloConfig_`); không gọi getMe. Readiness phải chạy trước khi owner bật ENABLED và cài lịch.

## Sau review PR #12 — tiến độ và fail-closed TEST (01/10/2026)

- Sửa ba findings trước merge, không chấp nhận rủi ro báo sent=0 sau delivery hoặc UNKNOWN khi chưa gọi API. Counters riêng cho attempts/receipts/durable SENT; auto FAILED chỉ khi có bằng chứng nội bộ chưa invoke send, không tự retry cùng lượt. Ghi FAILED không chắc chắn thì log vẫn held cho operator.
- Theo yêu cầu kết thúc TEST tắt gửi, BUSY của manual fixture SEND cũng tắt verified TEST như kill switch ở guard kế tiếp. Không hủy request đang bay/khóa/log của lượt khác. Production hoặc identity không kiểm chứng tuyệt đối không property write; disable-unconfirmed phải giữ kết quả gửi và không được tuyên bố flag false.
- Thu hẹp cfg thay vì sao chép toàn bộ Properties; vẫn giữ active token/target và opposite identity pins để fail closed trước tráo môi trường. Fresh UUID/HMAC challenge thay marker cố định công khai, không đổi secret/scopes/dependency. Bot ID string pin đủ làm identity; tên Bot thay đổi không buộc sửa code.
- Giữ rechecks từng phần để chống race; không tối ưu số lần đọc bằng cách bỏ guard. Giữ helper fixed-week như artifact của nghiệm thu TEST lịch sử; không đưa helper vào bộ cài Production hoặc biến thành fixture sender thường trực.
- Chỉ local regression/security review cho patch; không mở GAS, gửi lại fixture, merge hay mở Production. Runtime PASS trước patch được giữ như lịch sử với giới hạn rõ ràng.

## Quyết định 01/10/2026 — Phân biệt nguyên nhân receive path trong TEST

- Sau GROUP marker thực tế 06:13–06:14, không poll/chẩn đoán nhận thêm. Dùng target/hash đã xác minh và membership owner để chạy fixture kỳ riêng. Sửa false-positive snapshot guard: JSON.stringify phụ thuộc thứ tự PropertiesService keys; dùng strict recursive own-key/value comparison, không bỏ bất kỳ thuộc tính cấu hình nào. Test tái hiện thất bại trước sửa; regression 120/120 và security review độc lập không có finding mới. GAS PREPARE/APPROVE/PREVIEW đã thành công sau sửa.
- Giữ guard outbound đầy đủ; helper chẩn đoán riêng chỉ đọc trong TEST bị tắt, không cần chat pin để kiểm getMe/bootstrap. Không cài/chạy SDK hoặc thêm dependency; đọc source SDK được tài liệu chính thức liên kết để đối chiếu request/schema.
- Tài liệu dùng bot-api.zaloplatforms.com, SDK Node 0.1.6 và Python 0.1.9 dùng bot-api.zapps.me. Đây là giả thuyết cần runtime comparison, chưa đủ căn cứ đổi endpoint gửi hoặc quy lỗi Platform.
- Không suy webhook state từ 404 hoặc quyền/token/secret từ 408; token Bot, secret_token webhook và HMAC approval secret là ba vai trò khác nhau. GROUP marker đúng schema và đúng phiên nhận mới là evidence cho target; PRIVATE không được dùng làm đích nhóm.
- Theo chỉ đạo owner: giữ token TEST và approval secret tới khi test thành công, owner thay cùng lượt sau đó. Profile PROD chưa tồn tại được để trống toàn bộ. Hai điều này không còn là gate điều tra/nghiệm thu TEST-only; ghi chú cũ được giữ như lịch sử.
- GAS thực tế thiếu quyền UrlFetch dù manifest có scope; dùng requireScopes đúng external_request với guard TEST/manual để mở native consent, không invalidateAuth hoặc yêu cầu lại tất cả scope. Giữ getMe local và GAS thành hai loại evidence riêng. Không đổi endpoint dựa trên khác biệt docs/SDK khi local cả hai đã trả Bot đúng.
- Sau consent đã đo getMe GAS thành công cả hai host; receiver GAS bốn HTTP200/408 chưa có owner timing confirmation. Không tiếp tục poll mù/đổ lỗi Platform. Chuẩn bị fixture ở kỳ riêng thay vì sửa log Gmail hoặc hạ guard đổi transport. Helper phải bind nguồn đã duyệt, full TEST và preview seal; verifier approval đặt trong lock hiện có để tránh race config/Sheets/history trước write. Send luôn tắt và readback khi đã giữ lock; uncertainty không tự retry. Audit receipt thật không được thay bằng dữ liệu giả hoặc claim runtime UNKNOWN đã thử.

Dưới đây là các quyết định kỹ thuật cốt lõi đã được thống nhất và áp dụng trong dự án:

## Quyết định 30/9/2026 — Zalo outbound cho Thư tuần

- Giữ Gmail mặc định/rollback qua property; không đổi stack, không bổ sung dependency. Tách `thuTuanStorage_` và kiểm tra nội dung dùng chung trong Code.gs; ZaloTransport.gs triển khai adapter outbound UrlFetchApp. Không clone renderer/state machine từ bandocapt, không webhook/Vercel.
- Đã nghiên cứu source/test/README/brain hiện tại của bandocapt và module Zalo trong Git snapshot `9c2554cb47b1829e6a920a62b65b47bad2157202` (checkout hiện tại không còn module). Logic chấp nhận HTTP thành công thiếu receipt và split UTF-16 thô không đáp ứng yêu cầu Thư tuần. Quy tắc chỉ cho PRIVATE trong module cũ là chính sách sản phẩm, không chứng minh Platform cấm group.
- Tài liệu chính thức sendMessage/getMe/call-api/error-code/group được đối chiếu lại: text tối đa 2000, plain text khi không có parse_mode/text_styles, bot ID chuỗi, can_join_groups và nhóm đang thử nghiệm nội bộ theo trang 3/6/2026. Không kết luận group khả dụng cho Bot cụ thể trước getMe + xác nhận nhóm bởi owner.
- Chia nguyên văn renderer text tối đa 3 phần, mỗi phần ≤1800 đơn vị UTF-16; dùng Intl.Segmenter khi có, fallback bảo vệ dấu kết hợp tiếng Việt, surrogate, emoji ZWJ/skin tone/flag/tag/variation selector và CRLF. Vượt giới hạn thì fail closed, không cắt bớt nội dung/đổi câu chữ. HMAC vẫn canonical v2; plan hash bảo vệ thay đổi cách render/split sau khi có log.
- SENT chỉ khi HTTP 2xx, ok boolean true, message_id chuỗi hợp lệ. Không chắc chắn → UNKNOWN và dừng; không retry 408/429/timeout, không tự Gmail fallback để tránh gửi trùng. Nhật ký Zalo riêng 16 cột ghi từng phần, receipt/hash nhưng không chat_id/token/nội dung; đọc cả log Gmail để chặn chuyển transport cùng kỳ.
- Cách ly yêu cầu pin đầy đủ profile đang hoạt động và ENV↔TEST_MODE khớp; profile đối diện có thể vắng mặt hoàn toàn trước khi môi trường đó được tạo. Nếu profile đối diện khai báo dở thì chặn; nếu đủ cả hai profile thì bắt buộc script/Bot/chat hash và bốn workbook phải khác nhau. So sánh `ScriptApp.getScriptId()` ngăn đổi môi trường trong nhầm project. Chỉ active profile giữ token/chat_id; TEST chặn trigger. Thêm external_request OAuth scope; exceptionLogging NONE và loại bỏ raw API errors/redirects.
- getMe không kiểm chứng membership của chat_id; GROUP_CONFIRMED là attest thủ công cần owner. Không tìm thấy idempotency/receipt lookup trong các trang đã đọc: mọi UNKNOWN phải đối soát từng phần, chỉ PENDING khi xác minh chưa giao; rollback cho kỳ chưa có lịch sử Zalo.
- Local 82 test/build thành công chưa đủ pilot: TEST hiện thiếu toàn bộ cấu hình Zalo, chưa upload/chạy cloud; Python regression thiếu pytest. Không gửi/cấu hình Production; quy trình bàn giao nằm mục 12 README service.

## 1. Sử dụng Google Sheets làm Cơ sở dữ liệu chính
- **Mục tiêu**: Giảm thiểu chi phí vận hành về $0 và tận dụng giao diện có sẵn của Google Sheets cho người dùng nghiệp vụ không chuyên về công nghệ.
- **Giải pháp**: GAS đọc/ghi trực tiếp lên các sheet đã định nghĩa cấu trúc cột. Các dữ liệu lớn như tin tức sẽ được GAS phân trang trước khi trả về frontend.
- **Hạn chế**: Tốc độ đọc ghi chậm hơn SQL truyền thống.
- **Biện pháp khắc phục**: Tích hợp Apps Script `CacheService` để cache kết quả tin tức và các cấu hình tĩnh, đồng thời dọn dẹp lưu trữ định kỳ bằng trigger hàng tháng (`runMonthlyArchive`).

## 2. Thiết lập Vercel Serverless Proxy cho Google Apps Script
- **Mục tiêu**: Tránh CORS khi gọi API trực tiếp từ trình duyệt, che giấu mã xác thực `API_ACCESS_TOKEN`, đồng thời thực hiện các bước lọc bảo mật.
- **Giải pháp**: Tạo API route `/api/gas.js` trên Vercel nhận request từ React SPA, băm IP client kèm salt (`IP_HASH_SALT`), đính kèm mã token bảo mật và chuyển tiếp đến Web App Apps Script `/exec`.
- **Cập nhật 2026-06-10**:
  - `IP_HASH_SALT` là cấu hình bắt buộc ở proxy; nếu thiếu, proxy trả lỗi cấu hình thay vì fallback sang token hoặc chuỗi mặc định yếu.
  - Frontend không nhúng token qua `VITE_API_TOKEN`; token chỉ do proxy server-side inject.
  - Frontend production luôn gọi `/api/gas`; dev có thể đặt `VITE_GAS_URL` nếu cần trỏ thẳng Apps Script nhưng URL này không được coi là secret.
  - Action admin qua proxy gồm `feedback_stats`, `video_export`, `bantin35_generate`, `bantin35_setup_trigger`, `bantin35_trigger_status`.

## 3. Cơ chế hội thoại đa lượt và Neo câu gốc trong Trợ lý 35
- **Mục tiêu**: Hỗ trợ người dùng tinh chỉnh câu trả lời của AI (như yêu cầu "ngắn hơn", "thêm dẫn chứng") mà không phải nhập lại toàn bộ thông tin từ đầu và bảo đảm RAG hoạt động đúng ngữ cảnh.
- **Giải pháp**:
  - Giao diện React gửi kèm mảng `history` chứa các lượt hội thoại trước đó (tối đa 8 lượt).
  - Khi phát hiện là câu hỏi tinh chỉnh (lượt > 1), backend sẽ **neo hoạt động trích xuất từ khóa và truy vấn RAG (Pinecone) vào câu hỏi ĐẦU TIÊN** của chuỗi hội thoại.
  - Lý do: Các câu tinh chỉnh như "ngắn hơn" hoặc "đổi giọng" không chứa đủ từ khóa ngữ nghĩa để thực hiện tìm kiếm vector RAG. Việc neo câu gốc giúp AI tiếp tục truy cập đúng kho tri thức của chủ đề đang thảo luận.
  - Các lượt tinh chỉnh cho phép độ dài câu hỏi ngắn hơn (tối thiểu 2 ký tự) so với yêu cầu 20 ký tự ở lượt đầu tiên.

## 4. Tích hợp bộ chọn phong cách phản bác chuyên biệt
- **Mục tiêu**: Giúp tuyên truyền viên linh hoạt chọn cách hành văn phù hợp với từng đối tượng tiếp cận (diễn đàn chính thống vs. mạng xã hội trẻ trung).
- **Giải pháp**:
  - Thêm tham số `style` (chấp nhận 3 giá trị: `chinhluan`, `tretrung`, `ngangon`).
  - Phong cách `chinhluan` (Chính luận - Mặc định): Văn phong trang trọng, lập luận sắc bén cho báo cáo/diễn đàn chính thống.
  - Phong cách `tretrung` (Trẻ trung): Viết ngắn, gần gũi, phù hợp bình luận Facebook/Threads/TikTok nhưng **phải bảo đảm lịch sự, nghiêm túc, không có tiếng lóng phản cảm hay emoji lạm dụng**.
  - Phong cách `ngangon` (Ngắn gọn): Đi thẳng vào vấn đề để phản hồi nhanh.
  - Tích hợp tham số phong cách trực tiếp vào prompt generator phía backend.
  - **Giới hạn**: Chỉ áp dụng cho chế độ **Phản bác** (`rebuttal`) của Trợ lý 35. Các chế độ Viết bài hay Kiểm chứng giữ nguyên prompt tiêu chuẩn.

## 5. Tủ sách số dùng RAG gọn nhẹ theo tóm tắt
- **Mục tiêu**: Cung cấp một tủ sách/tài liệu chính thống có thể tra cứu nhanh và hỏi đáp AI mà không tăng độ phức tạp vận hành.
- **Giải pháp**:
  - Lưu catalog trong sheet `TU_SACH` gồm metadata, tóm tắt, podcast gợi ý, sơ đồ tư duy, link NotebookLM và nguồn.
  - Expose ba action API: `books`, `book`, `ask_book`.
  - `ask_book` không tạo vector index riêng; backend chỉ nạp tóm tắt và metadata của cuốn được chọn vào ngữ cảnh rồi gọi `callGeminiAPI` sẵn có với JSON schema ổn định.
- **Lý do**: Phạm vi hiện tại là danh mục nhỏ và tài liệu mẫu hợp pháp, nên Google Sheets + context ngắn đủ đơn giản, dễ rollback và không cần thêm thư viện/dịch vụ mới.
- **Giới hạn**: Câu trả lời AI chỉ có độ tin cậy trong phạm vi tóm tắt/nguồn của từng cuốn. Nếu mở rộng sang toàn văn hoặc tài liệu nội bộ lớn, cần thiết kế lại theo RAG/Pinecone, phân quyền truy cập và quy trình duyệt nguồn.

## 6. Gộp NotebookLM vào Tủ sách trong Học tập
- **Mục tiêu**: Giảm trùng lặp giữa `Tủ sách` và `Sổ tay AI`, đồng thời giữ bottom nav cân đối với 3 mục chính: `Tin tức`, `Trợ lý 35`, `Học tập`.
- **Giải pháp**:
  - Gỡ page/tab bottom nav `Sổ tay AI` độc lập.
  - Đưa `Tủ sách` thành mục con trong tab `Học tập`, đặt cùng nhóm với Video, Infographic và Kiểm tra.
  - Giữ NotebookLM như hành động trong chi tiết từng tài liệu của `Tủ sách`, dùng trường `TU_SACH.NotebookLM URL` sẵn có và không tạo API mới.
- **Cập nhật 2026-06-11**: Tủ sách dùng chung một NotebookLM URL (`https://notebooklm.google.com/notebook/ee1792f7-45ff-4952-9ce6-50cc1cd4ad1a`) cho toàn bộ tài liệu. Khi hỏi đáp, người vận hành chọn/tích đúng nguồn tài liệu trong NotebookLM.
- **Lý do dùng một link chung**: Đơn giản hóa vận hành và cập nhật nguồn; người dùng không phải mở nhiều notebook riêng, trong khi vẫn có thể giới hạn ngữ cảnh bằng thao tác chọn nguồn trong NotebookLM.
- **Giới hạn**: Cần duy trì kỷ luật đặt tên nguồn trong NotebookLM rõ ràng theo từng PDF để tránh hỏi nhầm tài liệu hoặc tổng hợp ngoài phạm vi mong muốn.

## 7. Tạm tắt hỏi đáp AI trực tiếp trong Tủ sách, chỉ dùng NotebookLM (2026-06-09)
- **Mục tiêu**: Giảm rủi ro chi phí/lạm dụng từ endpoint `ask_book` (public, chưa có quota/phân quyền — phát hiện trong review kiến trúc 2026-06-09).
- **Giải pháp**:
  - Frontend `TuSach.jsx`: gỡ form "Hỏi AI" (state/handler/import `askBookAI`); thay bằng nút mở NotebookLM theo cuốn đang chọn.
  - Backend `07-main.gs`: `case 'ask_book'` trả `{ success: false, error: '... đang tạm tắt ...' }`, không gọi Gemini.
  - Giữ nguyên hàm `askBookAI`, schema và sheet `TU_SACH` để bật lại nhanh.
- **Lý do giữ code thay vì xóa**: Đây là quyết định tạm thời; giữ hàm/contract giúp re-enable rẻ và không phá schema.
- **Điều kiện bật lại**: Bổ sung quota/giới hạn theo người dùng cho `ask_book` (tương tự `troLy35AssertDailyLimit_`) trước khi mở lại UI hỏi đáp.

## 8. Trợ lý 35 truy cập tự do, tiêm mã chung ở proxy (2026-06-13)
- **Mục tiêu**: Bỏ rào cản nhập mã truy cập nội bộ ở UI Trợ lý 35, cho người dùng dùng tự do mà không lộ mã trong frontend bundle và không phải deploy lại backend GAS.
- **Giải pháp**:
  - Frontend `web/src/pages/TroLy35.jsx`: gỡ card "Truy cập", badge "Nội bộ", toàn bộ state/handler liên quan mã (`accessCode`, `remember`, `saveAccess`, `ACCESS_KEY`). UI gọi thẳng các action `troly35_*`, history/xu hướng tải ngay khi vào trang.
  - Proxy `web/api/gas.js`: thêm `TROLY35_ACTIONS`; với POST các action này, nếu client không gửi `accessCode`, tự gắn từ env server-side `TROLY35_ACCESS_CODE` (không dùng `VITE_`, không lộ trong bundle).
  - Dev gọi trực tiếp GAS (không qua proxy) có thể đặt `VITE_TROLY35_ACCESS_CODE` trong `.env` local; để trống ở production.
- **Lý do không đổi backend**: Giữ nguyên `08-troly35.gs`; mã chung vẫn khớp `TROLY35_ACCESS_CODE_SHA256` nên backend xác thực như cũ, không cần `clasp push`/redeploy.
- **Hệ quả/giới hạn**: Vì mọi người dùng chung một mã, hạn mức/ngày (`troLy35AssertDailyLimit_`) và lịch sử/xu hướng trở thành CHUNG cho tất cả. Nếu cần tách theo người dùng hoặc ẩn lịch sử/xu hướng, phải thiết kế lại (khóa theo IP hash hoặc bỏ panel lịch sử/xu hướng).
- **Điều kiện vận hành**: Bắt buộc đặt env `TROLY35_ACCESS_CODE` trên Vercel (plaintext khớp SHA256 trong Script Properties), nếu không proxy không tiêm mã và backend sẽ từ chối.

## 9. Thư tuần dùng Apps Script riêng và chỉ gửi nội dung đã duyệt
- Phạm vi: services/thu-tuan/ chạy trong Apps Script project riêng, dùng hai bảng tính tách biệt, không public Web App và không dùng backend Trợ lý 35.
- Approval: canonical payload version 2 được ký HMAC-SHA256 bằng secret tối thiểu 32 ký tự trong Script Properties. Người duyệt và ngày duyệt thuộc payload; người duyệt phải nằm trong allow-list. Dấu kiểu cũ hoặc bất kỳ thay đổi canonical nào đều fail closed. Các cột legacy không tham gia HMAC và không được render.
- Nội dung thư: chỉ render tuần, chủ đề, mã lời dạy, nguyên văn, nguồn, bối cảnh, phân tích/ý nghĩa, liên hệ Công an nhân dân, hành động tuần này và NotebookLM tùy chọn. Không render gợi ý tự soi hoặc liên hệ An ninh đối ngoại.
- Người nhận và gửi: kiểm tra mọi dòng recipient trước khi gửi, kể cả dòng tạm dừng; mã cán bộ toàn bảng và email đang hoạt động không được trùng. Mỗi người nhận một email riêng, không CC/BCC. TEST mode chỉ nhận một mailbox override, không cài trigger và không gửi qua event trigger.
- Dedupe: ghi SENDING trước MailApp, bỏ qua SENT, giữ SENDING/UNKNOWN để đối soát thủ công và không tự gửi lại khi kết quả chưa rõ. Banner JPEG cố định được nhúng bằng CID; không dùng Drive hoặc URL ảnh ngoài và không cần OAuth scope mới.
- Production gate: code/test trong repository không xác minh cấu hình hoặc runtime Production. Chỉ owner mới có thể cho go/no-go sau khi review project, Sheets, recipient/approver, secret mới, nguồn/approval, preview, quota, reconciliation và trigger.
