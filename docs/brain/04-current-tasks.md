# 04-current-tasks.md - Nhật ký công việc hiện tại

## Phương án1 — mẫu ảnh và caption sẵn sàng (03/10/2026)

- Đã tạo quote-cardLD04712/10 nềnkemđỏtrầm4:3,1448×1086, giữ đầy đủ nguồn; caption1023UTF16 từ bản đã nghiệm thu. Asset/prompt/manifest/preview ở .work/thu-tuan-zalo-photo ngoài repo, ảnh đã hiển thị cho owner.
- Chờ quyết định link công khai chỉảnh để Zalo tải; chưa gửiảnh hoặc sửa sender/cloud. Cần nghiệm thu ảnh+caption trên fixture/SheetTESTmới, không dùng lại kỳ12/10đãSENT. Production vẫn chờ05/10.

## Xác nhận phía nhận mẫu một tin — 03/10/2026

- Owner xác nhận “Đã hiện đầy đủ rồi”; nghiệm thu gửi mẫu LD047 TEST hoàn tất. Trạng thái chờ human trong mục dưới là lịch sử. TESTdisabled/0trigger, helper mới ở managed worktree chưa commit/push; Production vẫn chờ lịch05/10. User hỏi đề xuất làm tin đẹp hơn, chưa cho đổi định dạng/gửi mẫu mới.

## TEST mẫu Zalo một tin — 03/10/2026

- User chấp nhận LD-047/12-10. Managed worktree review PR17 head1fb1fe2 có helper mới chỉTEST và171/171 regression; WIP main/Claude giữ nguyên. TEST backup→append17–20header→nhập một dòng→duyệtv3→preview1phần/1023UTF16→send1/receipt1→auditclear→rerun0 hoàn tất. Cuối enabled=false/0trigger account, log05/10 giữ nguyên.
- Chờ owner xác nhận tin đầy đủ phía nhận; không gọi overall runtime PASS khi chưa xác nhận. PR17 chưa merge; helper mới chưa commit/push. PROD vẫn chờ nghiệm thu lịch05/10, không cập nhật source hoặc Sheet PROD. Chi tiết code/log/docs nằm ở managed worktree thu-tuan-single-message-review, không cherry-pick vào main cũ.

## Production Zalo — Phase13 hoàn tất, Phase14 chờ lịch05/10 (02/10/2026)

- Verdict hiện tại `THU_TUAN_ZALO_PRODUCTION_PILOT_PASS_AUTOMATION_PENDING` theo ngoại lệ dùng lại Bot. Pilot2phần/2receipt thật riêng biệt, owner nhận đủ/đúng thứ tự/không trùng; dedupe sent=attempted=0, alreadySent2, pending/unknown0 và log không đổi.
- PR #15 merge/main `4bb781c91935626fd500557dcd8c1a96bdd2b5f6`; 154/154 test/syntax21GS, CI PR36960890347/main36960984664 success. Cloud4GS+manifest reload/readback khớp main từ managed checkout sạch; checkout gốc được giữ.
- Dòng thật05/10/2026 LD-001 official APPROVED/HMAC thật từ nguồn công khai đã đối chiếu PDF; readback nguồn/dòng pilot không đổi. Selector THU_TUAN_APPROVAL_WEEK đã xóa/readback vắng, tổng16Properties.
- Owner đã xác nhận theo dõi tài khoản sở hữu trigger. PROD enabledtrue/testModefalse/ZALO/PROD/grouptrue; cài chính thức0→1, kiểm lịch enabledtrue/triggersOfThisAccount1. UI guiThuTuan, thứ Hai07–08 GMT+07, thông báo lỗi ngay, chưa last-run timer. TEST disabled/0trigger/không receiver song song.
- Heartbeat `nghi-m-thu-l-ch-zalo-prod` ACTIVE trong chat, kiểm08:10 thứ Hai sau cửa sổ đầu tiên05/10/2026. Tiếp theo chỉ đọc execution Time-driven/log/receipt thật rồi owner xác nhận thư kỳ mới. Không dùng pilot thay timer, không manual resend/reset log. Nếu bất thường disable/readback trước đối soát, giữ receipt. Chưa Production Acceptance PASS; checkpoint dưới là lịch sử.

## Production Zalo — pilot và dedupe đạt; chuẩn bị lịch đầu tiên (02/10/2026)

- Phase6 phiên2 READY09:59:11.811 VN, GROUP mới/marker đúng/timestamp đúng; ghim09:59:40.199, một poll và elapsed28388ms. Readback15Properties, CHAT_ID/SHA256 khớp, GROUP_CONFIRMED vẫn vắng. Owner sau pin xác nhận đúng nhóm/Bot là thành viên; mới lưu/readback GROUP_CONFIRMED=true,16Properties, gửi vẫn tắt. Bot dùng lại TEST theo chỉ đạo, không claim hai Bot độc lập.
- Phát hiện helper duyệt editor còn YYYY-MM-DD. Nhánh riêng/PR14 sửa chọn kỳ hiện tại qua helper timezone; CodeGraph impact/explore, 151/151 tests, syntax21GS/diffcheck, CI PR và main đạt. PR14 merge/main126e7382a9f011970e12cd29dd801a9afbf7d0da; worktree biệt lập sạch đúng main. Cloud reload/readback đủ5file khớp main, không TEST helper hoặc wrapper cloud.
- Phase7 một dòng thật kỳ2026-09-28, LD-001 “Vì Nhân dân phục vụ”, bản public-safe-v1: đối chiếu PDF Tập5 trang in498/trang vật lý512 bằng ảnh gốc, giữ nguyên nội dung biên tập công khai. Nhap→duyetKyThuTuan→APPROVED bằng identity/HMAC thật; readback nội dung không đổi, không fixture/credential giả. Phase8 READY_FOR_PRODUCTION_PILOT,2part/pending2/already0/unknown0/trigger0, toàn log0SENDING/UNKNOWN/OTHER.
- Phase9 enable/readback→guiThuTuan đúng01lần→COMPLETE sent=attempted=confirmed=2→disable/readback. Phase10 2SENT, part1/2, receipt riêng biệt; target/plan hash tính lại khớp, phần1800/319ký tự. Owner xác nhận nhận đủ/đúng thứ tự/không trùng. Phase11 cùng kỳ enable/readback→rerun COMPLETE sent0/attempted0/alreadySent2→disable/readback; preview pending0/alreadySent2/unknown0, log nguyên trạng.
- Phase12 kiemTraLichThuTuan: enabledfalse/0trigger tài khoản hiện tại, không reconciliation. Verdict THU_TUAN_ZALO_PRODUCTION_PILOT_PASS (ngoại lệ dùng lại Bot); chưa Production Acceptance PASS, chưa tạo trigger/lần scheduled execution thật.
- Phase13 cần xác nhận người theo dõi account trigger (đã hỏi đúng một thao tác). Đồng thời chuẩn bị nội dung thật kỳ05/10 và lựa chọn kỳ duyệt explicit qua cấu hình trước hạn; mọi source change tiếp tục PR/CI/merge trước cloud. Các checkpoint dưới là lịch sử.

## Production acceptance Zalo — Phase 6: Bot đã thêm; phiên đầu chưa nhận marker (02/10/2026)

- Owner báo “Đã thêm rồi”. Chạy đúng một lần `nhanSuKienZaloThuTuanProd` chính thức, không sửa runtime hoặc tạo wrapper. Trước chạy: ENABLED=false, TEST_MODE=false, PROD; CHAT_ID/hash/GROUP_CONFIRMED vắng, secret riêng có mặt.
- GAS READY lúc 09:22:11.212 VN; phát marker mới qua yêu cầu mention trong nhóm nghiệp vụ. Phiên kết thúc 09:24:13.974 VN, elapsed122762ms, bốn poll HTTP200/api408 không event; status `PROD_RECEIVE_NO_VERIFIED_GROUP_MARKER`. Chưa có owner báo gửi marker đúng phiên, không kết luận lỗi Platform/membership. Marker phiên này đã hết hạn; không dùng lại hoặc tự poll tiếp.
- GAS getMe thực tế HTTP200/oktrue, Bot khớp pin/canJoinGroups=true; getWebhookInfo HTTP200/api404, webhookUrlPresent=null (UNKNOWN, không suy chắc chắn không webhook). Receiver không gửi tin, không ghim đích hoặc xác nhận nhóm.
- Settings readback sau chạy: 13 Properties, cấu hình trước giữ nguyên; enabledfalse, target/hash/GROUP_CONFIRMED vẫn vắng. UI PROD 0 trigger của tài khoản hiện tại. Phase6 chưa hoàn tất; bước người dùng còn cần là báo sẵn sàng khi đang mở nhóm để nhận marker mới trong phiên tiếp theo, rồi attest nhóm sau khi pin.
- Evidence: `phase6-receiver-ready.json`, `phase6-receiver-session-1.json`, `phase6-disabled-after-session-1.json`, ảnh nhật ký đã cắt. Không receipt/pilot/automation/Production Acceptance PASS. Các checkpoint dưới là lịch sử.

## Production acceptance Zalo — Phase 3–5 đạt kiểm tra chuẩn bị, Phase 6 chờ thêm Bot (02/10/2026)

- OAuth không còn chặn lần chạy tạo khóa: UI execution `taoKhoaDuyetThuTuan` bắt đầu/kết thúc 08:52:45, status hoàn tất. Secret trước vắng, sau có đúng hình dạng hai UUID, cấu hình 12 key giữ nguyên; tổng 13 Properties, ENABLED=false. Không in secret hoặc giả kết quả logger CREATED; bằng chứng là source branch và before/after readback của lần chạy chính thức.
- Phase 4 native readback đủ 1000 hàng/tab: headers exact17/4/9/16, 0 dòng data/log; cột Ky có numberFormat TEXT; cả hai file chỉ user owner và shared=false, owner khớp account project. Hai file khác cả bốn workbook cũ, không đổi/xóa log.
- Phase 5 gọi getMe trực tiếp với token PROD đã chuyển từ TEST: HTTP200/ok=true, ID chuỗi khớp pin, can_join_groups=true. Đây là API identity evidence, chưa GAS preflight hoặc xác minh membership. Bot độc lập được owner thay bằng dùng lại Bot cũ; không gọi PASS tiêu chí hai Bot riêng.
- Đã yêu cầu đúng một bước owner thêm Bot cũ vào nhóm nghiệp vụ mới, báo “đã thêm”; chưa gửi marker. Sau đó mới mở receiver PROD chính thức, phát READY/marker và yêu cầu một mention đúng phiên; không tự suy chat ID hoặc GROUP_CONFIRMED từ tên nhóm/getMe.
- PROD còn tắt, không CHAT_ID/hash/GROUP_CONFIRMED, không gửi/trigger. Chưa nội dung thật/approval kỳ hiện tại/readiness/pilot/delivery/dedupe/scheduled execution, không Production Acceptance PASS. Checkpoint OAuth bên dưới là lịch sử trước khi được gỡ trong cùng phiên.

## Production acceptance Zalo — dùng lại Bot; Phase 2 đạt, Phase 3 chờ OAuth (02/10/2026)

- Owner đã yêu cầu dùng lại Bot TEST, không còn chờ tạo Bot mới. Namespace PROD đã nhận đúng token/ID Bot hiện có. Đọc TEST `ENABLED=false`, 0 trigger của tài khoản hiện tại; không đổi TEST/token/log. Chế độ dùng lại Bot được ghi rõ trong brain01/03, không tuyên bố Bot TEST/PROD độc lập.
- Project PROD mới đã lưu Code.gs, EmailAssets.gs, ZaloTransport.gs, ZaloDiagnostics.gs và manifest; cloud reload/readback đủ 5 file có hash khớp source main `b4a92d40a724a44ecc810868626d12a18b8930c9`, chỉ CRLF→LF. Helper TEST không deploy. Main/CI SHA không đổi, CI success.
- 12 Properties PROD đã lưu/readback đúng: ENABLED=false, TEST_MODE=false, ZALO/PROD, pin project/2 Sheet riêng/Bot thật, allow-list owner thực tế. Không CHAT_ID/SHA256, GROUP_CONFIRMED, TEST profile, approval secret hoặc fixture seal sao chép.
- Đã chọn/chạy hàm chính thức `taoKhoaDuyetThuTuan`; Google hiện dừng ở dialog “Yêu cầu ủy quyền”, chưa có secret/CREATED hoặc completion. Đã yêu cầu đúng một hành động owner: “Xem lại quyền” và cấp OAuth cho project PROD. Browser giữ handoff; ảnh cắt không chứa ID/credential. Khi cấp xong, tiếp tục đúng hàm tạo secret, đọc lại secret chỉ boolean/shape, kiểm Sheet Phase 4 rồi getMe/target theo runbook.
- Chưa gửi tin/pin target/cài trigger. Các gate nội dung thật, membership, receipt/delivery/dedupe/scheduled execution vẫn chưa đạt. Không ghi Production Acceptance PASS.

## Production acceptance Zalo — tài nguyên sạch đã tạo, chờ Bot PROD (02/10/2026)

- Owner đã cung cấp tên nhóm nghiệp vụ chính thức trong cuộc trò chuyện. Chưa xác minh nhóm tồn tại, membership hoặc target; không suy ra `GROUP_CONFIRMED=true` từ tên nhóm.
- Phase 1: tạo project standalone mới `PROD - Thu Tuan Zalo - Loi Bac Day` trong phiên Google hiện tại và hai workbook native mới `PROD - ThuTuan Zalo - NoiDung`, `PROD - ThuTuan Zalo - Rieng tu`. Cả hai Sheet khác nhau và khác cả bốn Sheet TEST/PRODUCTION cũ; quyền chỉ owner, `shared=false`. Project và Sheet thuộc cùng tài khoản hiện tại.
- Schema đọc từ source main đã xác minh: nội dung 17 headers; private 3 tab có 4/9/16 headers. Readback toàn bộ 1000 hàng: chỉ tiêu đề, 0 dòng nội dung/người nhận/Gmail log/Zalo log. Giữ nguyên mọi workbook/lịch sử cũ. Đây là chuẩn bị danh tính tài nguyên Phase 1; vẫn phải kiểm tra lại Phase 4 sau deploy/config.
- Project hiện chỉ có source mặc định; chưa `PROD_SOURCE_MATCH`, Properties, approval, pin target, gửi tin hoặc trigger. Phase 1 chưa PASS: đã yêu cầu đúng một thao tác owner tạo Bot PROD riêng và cung cấp tên Bot; không gửi token qua chat. Tài khoản trigger dự kiến là tài khoản triển khai hiện tại, chưa xác nhận trách nhiệm theo dõi vận hành.
- Baseline/CI main được kiểm lại không đổi. Chưa có pilot hoặc scheduled execution, không kết luận Production Acceptance PASS.

## Production acceptance Zalo — Phase 0 hoàn tất, Phase 1 chờ xác định đích (01/10/2026)

- Theo yêu cầu triển khai đầy đủ từ main sau PR #13. GitHub xác nhận PR #13 MERGED, main hiện tại `b4a92d40a724a44ecc810868626d12a18b8930c9`; workflow `Thu tuan` run `36892870386` completed/success trên đúng SHA.
- Checkout gốc có dữ liệu runtime untracked được giữ nguyên. Dùng managed worktree riêng tại cùng SHA để xác minh baseline sạch: 148/148 test, parse 21 `.gs` bằng `vm.Script`, `git diff --check` thành công. Không commit/push/merge hoặc sửa runtime source.
- Phase 1 chỉ đọc: phiên Google hiện tại đã đăng nhập; tìm thấy project TEST nhưng chưa xác minh project/Bot/nhóm PROD. Hai workbook `PRODUCTION - ThuTuan - NoiDung` và `PRODUCTION - ThuTuan - Rieng tu` có ID khác TEST, nhưng chứa 2 bản nội dung TEST và 5 dòng Gmail TEST. Cả 5 dòng lịch sử khớp chính xác workbook TEST; private workbook chưa có tab Zalo. Không được dùng các workbook này làm bằng chứng isolation/nghiệm thu PROD và không xóa lịch sử để vượt gate.
- Chưa tạo/sửa tài nguyên cloud, Script Properties, approval, trigger hoặc gửi tin; chưa chuyển Phase 2. Đang yêu cầu owner cung cấp tên nhóm Zalo Production chính thức để hoàn tất bản đồ đích nghiệp vụ. Sau đó tiếp tục xác định Bot/tài khoản owner và dùng tài nguyên sạch theo runbook; xác nhận membership và nhận đủ tin vẫn là các gate con người riêng.
- Chưa có `PROD_SOURCE_MATCH`, pilot hoặc scheduled execution thực tế; không ghi Production Acceptance PASS. Evidence cục bộ chỉ lưu trạng thái, số đếm và source SHA, không credential hoặc Script/Sheet/chat/Bot IDs.

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


## Card Studio B/C (2026-10-03)

- Mã template B/C, builder offline và kiểm thử được đưa vào nhánh review riêng; dữ liệu/ảnh thật giữ ngoài Git.
- Chờ review PR và phản hồi mẫu B/C trước thay đồng loạt bộ 51 ảnh. Không dùng merge PR thiết kế làm tín hiệu triển khai PROD hoặc thay approval media.

## Card Studio D/F (2026-10-03)

- Nhánh claude/thu-tuan-card-df (tách từ PR18) đưa mẫu D/F vào Card Studio kèm test. Bộ 102 ảnh D/F của 51 kỳ đã xuất ngoài Git để người dùng duyệt.
- Chưa thay ảnh/Drive đang dùng; việc thay bộ ảnh và tích hợp sender cần duyệt riêng.

## Lệnh Zalo TEST — /tuan ảnh + toàn bộ thư đã nghiệm thu từ Zalo (04/10/2026)

- Owner đã cho phép public và lưu cấu hình server TEST. GAS TEST Web App/public, module/readback/catalog173 đã hoàn tất; project Vercel riêng thu-tuan-zalo-test READY, hai khóa mới + URL GAS dạng Secret tại Production/Preview; server env TEST, hai command flags=true. Bot token/khóa duyệt giữ ở GAS, Properties cũ/weekly disabled/zero triggers và sender Production giữ nguyên.
- setWebhook verified và testWebhook healthy. Native audit cuối: COMMAND_WEBHOOK_HEALTHY, catalogRows173/logRows7, toàn SENT/receipt/target hợp lệ, không đúp/UNKNOWN/SENDING. Bảy input synthetic kiểm soát đã tạo bảy phản hồi thật trong nhóm TEST; replay sự kiện đầu ALREADY_HANDLED, không gửi lại. Callback/sai header/sai nhóm/unsigned HMAC gates thực tế đạt; helper thử gọi lồng nhau đã gỡ sau lỗi phản hồi không xác nhận, dùng phiên ngoài GAS cùng event keys để hoàn tất.
- Owner mention thật22:31 chưa có reply. Vercel200 nhưng khôngdoPost; freshcallback22:42 metadata cho thấy event_name/message tạiroot, khôngresult/ok-wrapper. Đã sửa relay normalize roottext sauauth/rawbodylimit, explicitokfalse bị400, wrappedpath/dedupe/pin giữ nguyên; bảnfixREADY. 196regression/28cloudcompat/fiverootshape live probes đạt, nativehealthy vẫnlog7. Chờ owner gửi mention mới sau bảnfix để xác nhậnROOT→SENT/receipt và nhận reply; không gọi controlled test hoặc testWebhook thay human-origin E2E. Giữ log; nếu bất thường tắt riêng command flags và đối soát, không reset/resend thư tuần.

- Checkpoint23:35 thay trạng thái log7 ở trên: owner yêu cầu /tuan trả ảnh+thư và cấp riêng public51D/viewer. Web App version3/module mới/catalog224 sealed/flags true; đúng51D được chia sẻ, ảnhTEST ngoài lịch/F/folder/tài liệu/Sheets không đổi quyền. Native preview tuần2 PNG/hash đúng/caption1023; controlled event→SENT13,019s, cùng event→ALREADY_HANDLED/no duplicate. Nativehealth224/log12 toànreceipt/SENT/target hợp lệ, khôngUNKNOWN/SENDING. 201regression/33cloudcompat/syntax22 đạt. Corecloudv3 giữ nguyên, không đẩy corecheckoutv2.
- Owner đã thử mention /tuan2 và xác nhận ảnh/caption hiển thị đúng; callback23:37:59 ROOT→SENT/HTTP200. Human photo flow đã được xác nhận riêng với lượt kiểm soát. /tuan không tham số chọn tuần hiện tại Việt Nam; ngày04/10 trước lịch05/10 nên chưa có kỳ trong lịch, không tự lấy tuần tương lai. /tuan2=12/10 có ảnh/bản duyệt để thử. Giữlog, khôngreset hoặc retry receipt chưa xác nhận.
