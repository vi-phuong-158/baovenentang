# 06-ai-working-log.md - Nhật ký hoạt động của AI

## [2026-10-02] Phương án B — Zalo một tin, gộp ý nghĩa và vận dụng

- User phê duyệt triển khai; tạo worktree sạch/nhánh codex/thu-tuan-zalo-single-message từ PR16 d576967; main có WIP khác giữ nguyên. Không thấy bản Claude chưa commit nên triển khai trên PR16. Đọc toàn bộ brain; CodeGraph index .gs bằng hook local, refs/impact approval/digest/render (14 symbols), phạm vi module độc lập, không public API.
- Files code: services/thu-tuan/{Code.gs,ZaloTransport.gs,ZaloDiagnostics.gs,ZaloAcceptance.gs,tools/zalo-content-to-sheet.cjs}, tests/{thu-tuan.test.cjs,thu-tuan-acceptance.test.cjs}, .github/workflows/thu-tuan.yml. Docs: README root/module, brain01/03/04/05/06.
- Lý do: ba ô biên tập Zalo, đoạn ý nghĩa-vận dụng chung/một hành động; ký v3, kiểm <=1800 lúc duyệt và sender; giữ email và v2 HMAC/render/PlanHash/dedupe. Migration append-only disabled/allowlist; preview trả fulltext/count cho reviewer, không log. CI chạy stackedPR. Export offline/outside repo, giữ lịch/email/quote/source, không approval.
- Dữ liệu ngoài repo: .work/thu-tuan-zalo-single-message có100JSON/preview, CSV12Q4 và51tuần, báo cáo/preview lịch; 14 bài biên tập lại LD001/002+12Q4, 86 chọn câu hoàn chỉnh cần đọc biên tập. LD071/072 chờ nguồn, tool chặn lịch. 12/10 dùngLD047. Đo100/100<=1317, median1087.5UTF16; lịch12/51 một phần.
- Rủi ro: mọi approval mới v3, Gmail→Zalo cần ba ô/one-message; chạm ô mới kỳv2 làm stamp sai. Code cũ không đọc20header/v3stamp; rollback cần backup đồng bộ, không xóa cột/log hoặc duyệt lại kỳ có lịch sử. Nháp cần kiểm nguồn/duyệt người. Không sửa nguồnMD, mainWIP, credential hoặc cloud.
- Validation:166/166local, parse21GS/toolCJS/diff; mutation bỏapprovegate→2fail, rendereremail→4fail, HMACbỏ3ô→1fail; khôi phục source và rerun. Harness approval GMAIL rồi dựng dấu v2 mô phỏng đúng bản đã duyệt trước, gate mới có test riêng.
- Runtime evidence: clasp list/clone TEST chỉ đọc; clasp run doiSoatFixtureZaloThuTuanTest trả storage NOT_FOUND, không verdict mới. Không upload/source/Properties/Sheet/send/trigger. Không thêm APIexec/WebApp. Sau review chạy TEST editor freshfixtureapproved→preview1/send1/receipt1/rerun0/disabled; PRODchờ lịch05/10, merge16→PRnày rồi upload/readback/migrate/nháp/approve12/10.

## [2026-10-02] Review độc lập PROD Zalo và guard duyệt lại kỳ đã gửi

- Review chỉ đọc source `4bb781c`/evidence PROD (pilot ghi trên `126e738`, cloud sau PR #15 khớp `4bb781c`, luồng gửi không đổi giữa hai bản). Verdict giữ `THU_TUAN_ZALO_PRODUCTION_PILOT_PASS_AUTOMATION_PENDING`. Không P0; P1 token Bot dùng chung (owner tự xử lý); lặp LD-001 owner chấp nhận (05/10 là kỳ đầu). Sửa P2 duyệt lại kỳ đã gửi và bổ sung runbook kiểm sau lịch. CodeGraph (index checkout cũ) + grep: chỉ `duyetNoiDungThuTuan` và `duyetFixtureZaloThuTuanTest` gọi `thuTuanApproveContent_`; luồng gửi không đổi.
- Files: `services/thu-tuan/Code.gs` (thêm `thuTuanWeekHasHistory_`, gọi trong approval), `tests/thu-tuan.test.cjs` (viết lại test duyệt lại sau gửi, thêm 2 test guard), `services/thu-tuan/README.md` (lỗi duyệt mới, checklist thứ Hai đối chiếu SHA được chấp thuận cho lần chạy, phân loại bất thường theo toàn bộ lịch sử kỳ: chưa có nhật ký / đã có nhật ký / chưa chắc / không có execution / kỳ sau thiếu nội dung), brain01/03/06. Sau review lần hai: thu hẹp hướng dẫn khôi phục, không hướng dẫn duyệt lại kỳ đã có lịch sử.
- Rủi ro: duyệt đọc thêm bảng B; thiếu cả hai trang nhật ký thì từ chối. Không đổi gửi/trigger/schema. Chưa deploy cloud; không deploy trước 05/10.
- Cách test: `node --test tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs` (156/156), parse 21 `.gs`; mutation check bỏ guard làm 3 test mới fail. Sau merge: upload Code.gs, readback hash, chạy `duyetKyThuTuan` trong tuần đã gửi phải ra `WEEK_HAS_DELIVERY_HISTORY` và dòng không đổi.

## [2026-10-02] Chọn kỳ duyệt trước lịch thật

- CodeGraph flow/impact helper và core từ vòng PR14 giữ nguyên; index checkout gốc còn baseline trướcPR14, đọc đúng helper hiện tại trong managed checkout main126e738 trước sửa. Thêm riêng getter Properties cho explicit week, không sửa identity/HMAC/sender hoặc schema Sheets.
- Files: Code.gs/README service, tests thu-tuan, brain01/03/06. Rủi ro: property còn lưu có thể chọn lại kỳ cũ khi reviewer chạy tay; runbook yêu cầu kiểm APPROVED key rồi xóa. Invalid/empty key fail-closed, không fallback âm thầm.
- Local validation:154/154test hai file Thư tuần, syntax21GS/diff đạt; rà diff helper chỉ thêm getter, truyền nguyên key để core kiểm. CI phải đạt trước merge/cloud. Ba test mới kiểm future approval không chạm current/send/trigger, empty/invalid/missing future row từ chối, reviewer/duplicate gate; test default/timezone/HMAC cũ tiếp tục.

## [2026-10-02] Helper duyệt editor chọn kỳ hiện tại

- CodeGraph explore/impact: duyetKyThuTuan → duyetNoiDungThuTuan → thuTuanApproveContent_/thuTuanWeekKey_; entrypoint không có caller khác, không route backend/frontend. Sửa nhỏ literal YYYY-MM-DD thành current-week helper hiện hữu, không đổi approval core.
- Files: services/thu-tuan/Code.gs, README.md; tests/thu-tuan.test.cjs; brain01/03/06. Rủi ro: chạy sát nửa đêm thứ Hai sẽ chọn kỳ mới; README yêu cầu kiểm dòng kỳ/nguồn trước chạy. API explicit-week giữ nguyên.
- Validation local: 151/151 test Thư tuần, syntax 21 tracked GS và diff check đạt; rà soát diff không thay approval core/transport. CI vẫn cần đạt trước merge/cloud. Test mới kiểm biên Chủ nhật UTC/thứ Hai VN, HMAC readback, không duyệt dòng tuần khác, identity/completeness/missing secret/duplicate fail-closed, không mail/trigger/log gửi.

## [2026-10-01, chuẩn bị pilot Production Thư tuần Zalo] B1/H1/H2 + CI

- Phạm vi khóa theo yêu cầu user: B1 receiver PROD, H1 readiness, H2 trigger attention, test, CI, docs. Không tạo/chạy PROD, không gửi tin, không đổi credential, không mở rộng chức năng. Branch `claude/thu-tuan-prod-pilot-readiness` từ `main` 81e38bc.
- Files: `services/thu-tuan/ZaloDiagnostics.gs` (core TEST/PROD, `nhanSuKienZaloThuTuanProd`, guard GROUP_CONFIRMED, marker domain theo env, kiểm trùng PROD/TEST), `services/thu-tuan/ZaloTransport.gs` (`kiemTraSanSangZaloProduction`, quét log toàn lịch sử), `services/thu-tuan/Code.gs` (`thuTuanTriggerResult_`), `tests/thu-tuan.test.cjs` (+13 test; 2 assertion cũ về `TEST_MODE_MANUAL_ONLY` từ trigger đổi sang kỳ vọng throw theo H2), `.github/workflows/thu-tuan.yml`, `services/thu-tuan/README.md`, brain 01/03/04/05/06.
- Impact: grep/đọc toàn bộ module xác nhận các symbol chỉ dùng trong `services/thu-tuan` và tests; không frontend/backend route, không schema Sheets.
- Rủi ro: TEST receiver giờ cũng từ chối khi `THU_TUAN_ZALO_TEST_GROUP_CONFIRMED` tồn tại (project TEST hiện có key này → muốn pin lại phải xóa trước). Trigger trả trạng thái bất thường giờ làm execution Failed (chủ đích). Số trigger readiness chỉ của tài khoản chạy. Bản GAS TEST trên cloud chưa được cập nhật source mới.
- Test: `node --test tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs` 148/148; syntax 21 `.gs` qua `vm.Script`; mutation check 5 guard đều bị test bắt. Cách test thủ công khi có PROD: theo mục 12 “Pilot Production” README module (receiver → xác nhận người → GROUP_CONFIRMED → duyệt → readiness).
- Verdict: `THU_TUAN_ZALO_READY_FOR_PRODUCTION_PILOT` (code/test). Không ghi PRODUCTION_ACCEPTANCE_PASS.

## [2026-10-01, chạy lại GAS TEST sau review PR #12] Preview và đối soát bản sửa đạt

- Theo yêu cầu user (cho phép sửa code project TEST), Claude mở project `TEST - Thu Tuan Loi Bac Day` trong Chrome của owner. Trước khi sửa, hash 6 file cloud khớp source `226fd46` (appsscript.json chỉ khác định dạng editor). Thay nội dung 4 file `Mã.gs`(Code.gs), `ZaloTransport.gs`, `ZaloDiagnostics.gs`, `ZaloAcceptance.gs` bằng bản `5896c84`, lưu dự án, tải lại trang: hash cả 4 file khớp `5896c84`; manifest và EmailAssets.gs không đổi. Không deploy, không đổi Properties/trigger/Production.
- `xemTruocFixtureZaloThuTuanTest`: `PREVIEW`, key 2026-10-05, sent0/attempted0/confirmed0/pending0/unknown0/alreadySent1, total1/valid1/invalid0/duplicate0, partCount1/partLengths[765], previewSealed=true. Guard preview cần ENABLED=false nên xác nhận gửi vẫn tắt.
- `doiSoatFixtureZaloThuTuanTest`: `TEST_FIXTURE_RECEIPT_AUDIT`, logRows1, SENT1/SENDING0/UNKNOWN0/PENDING0/FAILED0/OTHER0, receipt part1/1 messageIdPresent, sentReceiptsDistinct=true, reconciliationClear=true.
- Sự cố thao tác: một lần ô chọn hàm hiển thị nhầm nên `chuanBiFixtureZaloThuTuanTest` chạy thay đối soát; trả `TEST_FIXTURE_ALREADY_EXISTS_OR_HAS_HISTORY` trước mọi bước ghi, không thay đổi dữ liệu. Sau đó kiểm `aria-selected` trước khi chạy.
- Files: README.md, services/thu-tuan/README.md, docs/brain/{01-architecture.md,04-current-tasks.md,05-testing-and-deploy.md,06-ai-working-log.md}; chỉ cập nhật trạng thái GAS, không sửa code. Rủi ro: lần gửi thật/dedupe vẫn thuộc source trước patch; nhánh lỗi mới (FAILED trước API, kill switch BUSY, ghi log hỏng) chỉ kiểm bằng mocks, không cố tạo lỗi thật trên nhóm. Cách test: chạy lại hai hàm trên trong GAS TEST với ENABLED=false; local `node --test tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs` (135/135).

## [2026-10-01, review PR #12] Sửa state gửi Zalo và thu hẹp credential

- User review xác nhận PR có thể merge TEST sau ba lỗi gửi; main sửa các lỗi và hai security findings, không merge/cloud/send. CodeGraph impact/callees xác định core runner/config ảnh hưởng preview/send/approval/helper, không frontend/backend routes. Agents điều tra/review độc lập; agent source sửa diagnostic/tests, main sửa core/transport/acceptance và tổng hợp.
- Code.gs giữ counters sent/attempted/confirmed tại runner boundary, phase trước API ghi FAILED/PRE_SEND_BLOCKED, failed log recovery held, unknown delivery stop/no retry. Config whitelist pin/profile hoạt động thay toàn Properties. ZaloTransport.gs chặn PENDING/FAILED trước SENT. ZaloAcceptance.gs strict semantic snapshot, TEST kill switch khi initial guard/adapter/BUSY hỏng, identity verification/readback độc lập, không release lock khác; disable-unconfirmed giữ operationStatus/counters.
- ZaloDiagnostics.gs dùng fresh UUID/HMAC public challenge mỗi phiên, marker tham số cho parser/pin, không hardcode account/display, Gmail counterpart optional/schema hiện hữu vẫn kiểm. Hai test files thêm fault injection/credential privacy/session replay/teardown isolation. Không rotate secret, sửa manifest/schema, thêm dependency hoặc fixture receiver thường trực.
- Files: services/thu-tuan/{Code.gs,ZaloTransport.gs,ZaloDiagnostics.gs,ZaloAcceptance.gs,README.md}; tests/{thu-tuan.test.cjs,thu-tuan-acceptance.test.cjs}; README.md; docs/brain/{01-architecture.md,03-decisions.md,04-current-tasks.md,05-testing-and-deploy.md,06-ai-working-log.md}. Tài liệu phân biệt source patch local với evidence GAS trước patch, bỏ hướng dẫn marker cố định và làm rõ helper fixed-week TEST lịch sử.
- Main regression **135/135** (119 module+16 acceptance): lệnh `node --test tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs`; syntax năm GAS files và diff check đạt. Kiểm thử Gmail cũ vẫn đạt. Risks: BUSY kill switch dừng runner TEST ở guard kế tiếp, request đang bay vẫn phải receipt/reconcile; property identity/readback lỗi không được tuyên bố đã tắt. Helper fixed-week không dùng lại cho tuần khác.
- Review độc lập không blocker mới và tự chạy regression 135/135 exit0. Runtime lịch sử vẫn PASS cho source trước patch; patch này chưa lưu/chạy GAS, không gửi lại hoặc pilot Production. Giữ toàn bộ evidence/history/working-tree untracked; chỉ commit/push update PR trong phạm vi user đã cho phép.

## [2026-10-01, owner xác nhận nhận đủ tin] Hoàn tất Zalo TEST runtime acceptance

- Owner trả lời “Xác nhận đã có đủ tin rồi” cho yêu cầu xác nhận Thư tuần kỳ2026-10-05 nhận đủ nội dung, đúng thứ tự và chỉ một tin trong nhóm Test. Xác nhận phía nhận kết hợp bằng chứng GAS thật đã hoàn tất gate cuối; verdict `THU_TUAN_ZALO_TEST_RUNTIME_ACCEPTANCE_PASS`. Đây là attest của owner, không phải ảnh mới được agent tự kiểm. Verdict chờ DELIVERED_CONTENT_CONFIRMATION bên dưới là lịch sử đã được thay thế.
- Evidence giữ nguyên: GAS OAuth/getMe/full preflight OK; GROUP marker đúng phiên/target/hash/membership; approval thật/HMAC/preview1part765; gửi01fixture COMPLETE/sent1; log16cột/1SENT/receipt hợp lệ; chạy lại sent0/alreadySent1/pending0; audit sau dedupe1receipt/0SENDING/UNKNOWN/reconciliationClear. Local120/120, syntax/diff và review độc lập không blocker từ lượt sửa source; local evidence không thay runtime. Final GAS kiểm enabled=false/triggersOfThisAccount=0, giữ lịch sử; giới hạn trigger chỉ tài khoản đã kiểm.
- File thay đổi lượt chốt: README.md, services/thu-tuan/README.md, docs/brain/04-current-tasks.md, 05-testing-and-deploy.md, 06-ai-working-log.md; lý do cập nhật verdict/currentstatus và số regression117 cũ trong runbook thành120 mới. Không sửa code/kiến trúc/schema, không mở receiver/gửi thêm/chạy cloud, không thay Properties/token/secret, không Production/pilot/Gitmutation/install.
- Rủi ro và bàn giao: owner thay Bot TEST token và approval secret TEST cùng lượt theo kế hoạch sau test; đổi HMAC làm approval cũ mất hiệu lực, nội dung dùng tiếp cần duyệt lại. Giữ ENABLED=false và toàn bộ receipt/dedupe history, không dùng kỳ đã SENT để gửi lại. Agent không tự rotate. Cách kiểm: đọc verdict nhất quán trong README/brain và `git diff --check`; không lặp runtime send để kiểm sửa tài liệu.

## [2026-10-01, gửi fixture và kiểm dedupe] Runtime còn chờ nội dung hiển thị

- Sau sửa strict snapshot comparison, GAS PREPARE thực tế trả TEST_FIXTURE_DRAFT_CREATED, key2026-10-05, partCount1. APPROVE bằng tài khoản chạy thật/HMAC trả APPROVED; không giả danh/skip verifier. PREVIEW sealed total1/valid1/pending1/unknown0/invalid0/duplicate0/alreadySent0, part1/765. Source/helper cloud readback exact local. Screenshot preview đã che được giữ trong workspace của task, không đưa ảnh runtime vào repository/PR.
- Chỉ bật ENABLED=true trong đúng project TEST sau đầy đủ preflight. `guiFixtureZaloThuTuanTest` GAS gửi đúng01 fixture: COMPLETE/sent1/unknown0 (pending1 là số trước gửi). Helper finally đã tắt; UI readback enabledfalse. Không sendMessage từ chẩn đoán; đây là gửi fixture duy nhất. Proof `20261001-zalo-fixture-sent.png`.
- `doiSoatFixtureZaloThuTuanTest` chỉ đọc:1log, SENT1, SENDING/UNKNOWN/PENDING/FAILED/OTHER đều0, part1of1, messageIdPresent=true, sentReceiptsDistinct=true, reconciliationClear=true; preview alreadySent1/pending0/unknown0. Message ID thật chỉ giữ trong log riêng tư, không in giá trị/ID/chat/token. Không dựng receipt/error/UNKNOWN. Proof `20261001-zalo-fixture-audit.png`.
- Bật lại TEST cho cùng fixture/approval/preview seal, không sửa log hoặc nội dung; chạy lại SEND trả COMPLETE/sent0/alreadySent1/pending0/unknown0, core không cần fetch khi pending0. Helper lại tắt gửi. `kiemTraLichThuTuan` GAS cuối enabled=false/triggersOfThisAccount=0; không suy trigger account khác. Proof `20261001-zalo-fixture-dedupe.png`, `20261001-zalo-final-disabled.png`; browser tab TEST giữ handoff.
- Đã yêu cầu đúng một xác nhận owner: tin trong nhóm Test đúng kỳ/nội dung đầy đủ/thứ tự và chỉ1tin. Chưa có câu trả lời tại thời điểm ghi log, vì vậy chưa gọi runtime acceptance PASS. Gate còn lại `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_DELIVERED_CONTENT_CONFIRMATION`; không cần marker/secret/request gửi mới. Local120/120 và review độc lập không finding mới không thay gate quan sát phía nhận.
- Docs cập nhật README gốc/module, brain01/03/04/05/06 để ưu tiên state mới, giữ lịch sử các verdict cũ. Guard source chỉ sửa acceptance phase/reason/snapshot comparison; Code.gs shared approval hook và Diagnostics từ phần trước vẫn giữ; ZaloTransport/manifest không sửa lượt này. Không Production/config/deploy/trigger/pilot, không rotate/install/Gitmutation, giữ working-tree và lịch sử. Sau test thành công owner sẽ thay hai secretTEST cùng lượt, approval cũ cần duyệt lại, không xóa receipt/dedupe history.
- Kiểm cuối syntax toàn bộ5fileGS/test acceptance và `git diff --check` thành công, chỉ warning CRLF. Audit lại sau dedupe vẫn1SENT/1receipt/0unresolved/reconciliationClear; proof `20261001-zalo-fixture-audit-after-dedupe.png`. Không thêm test/build không liên quan hoặc gọi PASS toàn repository từ120test module.

## [2026-10-01, phiên GROUP 06:13] Đã pin đích và sửa guard so sánh snapshot

- GAS receiver duy nhất bắt đầu `2026-09-30T23:13:15.529Z`, kết thúc `23:14:09.496Z` (VN06:13:15–06:14:09), elapsed53967ms. Hai getUpdates có GROUP mới; event thứ hai khớp marker được yêu cầu trong nhóm Test, timestamp hợp lệ. Trả `TEST_RECEIVE_GROUP_TARGET_PINNED`; ID/hash lưu trong Properties, không xuất giá trị. Không PRIVATE target/ID suy từ ảnh, không sendMessage. getMe đúng pin/account/display; webhook404 vẫn UNKNOWN. Screenshot đã che được giữ trong workspace của task; không đưa ảnh runtime vào repository/PR.
- Dùng xác nhận membership trước của owner và GROUP marker thực tế để lưu GROUP_CONFIRMED=true. Full GAS `kiemTraZaloThuTuan` trả OK/TEST. ENABLED=false, token/approval secret giữ nguyên. Những verdict thiếu event/timing bên dưới là lịch sử đã được thay thế.
- Fixture prepare bị chặn ở PREPARE/TEST_ACCEPTANCE_ISOLATION_REQUIRED. Main thêm phase/reason allowlist không in native error; test privacy. Test đổi thứ tự khóa của PropertiesService nhưng giữ nguyên mọi giá trị tái hiện chặn nhầm. Sửa ZaloAcceptance.gs bằng so sánh đệ quy đầy đủ own-key/value, chỉ bỏ phụ thuộc thứ tự object keys, giữ thứ tự/độ dài array và exact string; không bỏ secret/pin/guard. CodeGraph caller/callee/impact xác định thay đổi giới hạn helper TEST, không đổi transport/core send.
- Files source/tests: services/thu-tuan/ZaloAcceptance.gs, tests/thu-tuan-acceptance.test.cjs. Main tự chạy `node --test tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs`: 120/120. Kiểm chứng test mới thất bại trước sửa và pass sau sửa; race/approval/tamper/UNKNOWN/teardown vẫn pass. Helper mới lưu riêng TEST sau baseline comparison, readback exact source; chưa gửi fixture. Rủi ro/next: tiếp tục approval/preview và receipt/dedupe/audit thực tế; local tests không thay acceptance GAS.

## [2026-10-01, owner gửi ảnh 06:03] Phiên GROUP ghép cặp thứ hai

- Owner xác nhận trước đó chưa gửi, mới gửi tin “xin chào”; ảnh nhóm Test có tin lúc06:03, không marker. Đây là tin sau phiên00:53–00:55, không chứng minh timing của phiên đó. Không suy chat.id hoặc thao tác chọn Bot từ tên hiển thị trong ảnh. Gate nhận GROUP vẫn cần event API có marker/date/type đúng.
- Main dùng tab TEST đã giữ handoff, chỉ một receiver GAS/SDK host; không local poll hoặc consumer khác. Preflight getMe HTTP200/ok=true/Bot ID chuỗi/account/display/can_join_groups khớp pin, webhook HTTP200/404 giữ UNKNOWN. READY được UI xác minh khi execution còn chạy, bắt đầu `2026-09-30T23:05:16.087Z` (VN06:05:16.087), thông báo owner gửi một GROUP @mention marker và báo đã gửi. Kết thúc `23:07:18.198Z` (VN06:07:18.198), elapsed122111ms. Bốn request timeout chuỗi30 HTTP200/JSON/ok=false/apiCode408, elapsed30271/30267/30502/30955ms, không event/result.
- Chưa owner xác nhận marker gửi trong phiên mới; không gọi đây là kiểm chứng GROUP đồng bộ, không tự mở thêm phiên/poll mù/yêu cầu gửi lặp. Không target pin, không fixture hoặc sendMessage; approval/receipt/dedupe/reconciliation runtime vẫn chưa đạt. Nếu marker đã gửi đúng phiên mới, bước phân biệt tiếp là PRIVATE positive-control riêng; nếu chưa thì cần phối hợp một phiên đúng thời điểm, không dùng tin06:03 làm đích.
- `kiemTraLichThuTuan` GAS cuối enabled=false/triggersOfThisAccount=0, token/approval secret giữ nguyên; không Production/deploy/trigger/rotation/Git mutation. Chỉ thay README module, brain04/05/06 để ghi evidence; không đổi source/tests nên regression117/117 trước đó giữ nguyên, không chạy lại vô cớ. Screenshot đã che được giữ trong workspace task; tab giữ handoff. Verdict: `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_GROUP_MARKER_TIMING_UNVERIFIED`.

## [2026-10-01, sau owner cấp OAuth] GAS external_request đã xác minh

- Owner xác nhận đã cấp quyền và sẵn sàng. Mở lại đúng project TEST bằng phiên browser mới; `capQuyenZaloThuTuanTest` thực thi trả `TEST_EXTERNAL_REQUEST_SCOPE_GRANTED`. Main chạy `chanDoanZaloThuTuan` thực tế GAS: cả DOCS/SDK getMe HTTP 200/JSON/ok=true, Bot ID chuỗi/account/display/can_join_groups khớp pin; không raw response/ID/credential. Gate OAuth trước đó đã được gỡ bằng runtime evidence, không bằng lời xác nhận đơn thuần.
- getWebhookInfo trong GAS cả hai host HTTP 200/JSON/ok=false/error_code=404; webhook state UNKNOWN. Không suy webhook tồn tại/không tồn tại. Log Zalo 16 cột/0 dòng; Gmail 9 cột/5 dòng, kỳ hiện tại có 1 lịch sử Gmail; approval hiện tại OK, render 1 phần/765. Chưa getUpdates/send trong lượt này, token/secret/ENABLED=false giữ nguyên.
- Đã yêu cầu owner xác nhận cụ thể không consumer/webhook khác trước phiên nhận duy nhất; khi READY mới gửi một GROUP mention marker. Agent source chuẩn bị plan fixture kỳ riêng/approval/preview/receipts/dedupe/reconciliation; agent độc lập rà phép phân biệt receive path, không thao tác cloud/API. Screenshot getMe đã che được giữ trong workspace task, không đóng gói cùng repository.
- Không có evidence consumer thay đổi so với xác nhận trước của owner và owner nói sẵn sàng; main thông báo sử dụng xác nhận trước rồi mở duy nhất receiver GAS SDK host. READY được UI xác minh khi execution còn chạy; bắt đầu `2026-09-30T17:53:46.995Z`, kết thúc `17:55:49.743Z` (01/10 giờ VN 00:53:46.995–00:55:49.743), elapsed 122748 ms. Bốn request timeout chuỗi30 đều HTTP200/JSON/ok=false/apiCode408, elapsed30280/30979/31096/30295 ms, không event/result. Không local poll/consumer song song, không target write hoặc send. Giới hạn120 giây giữa request không phải hard timeout, request cuối kết thúc quá120 giây được ghi chính xác.
- Đã báo owner đúng một GROUP @mention marker sau READY và thông báo cửa sổ đóng. Chưa có xác nhận tin mới thực sự gửi trong khoảng bắt đầu/kết thúc; timing vẫn UNVERIFIED. Không kết luận đã kiểm chứng receive GROUP đồng bộ, không đổ lỗi Platform/token/permission/secret, không yêu cầu gửi lặp hoặc tự mở phiên khác. Nếu owner xác nhận đúng tin/thời điểm mà vẫn không event, bước phân biệt kế là một PRIVATE positive-control có phối hợp riêng; PRIVATE không pin đích nhóm.
- Main chạy `kiemTraLichThuTuan` GAS sau receiver: enabled=false, triggersOfThisAccount=0. Token/approval secret giữ nguyên. Screenshot receiver đã che được giữ trong workspace task. OAuth đã PASS runtime; target/fixture/receipt/dedupe/reconciliation chưa hoàn tất. Verdict đang chờ timing: `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_GROUP_MARKER_TIMING_UNVERIFIED`.
- Theo CodeGraph impact/caller/callee và source, normal preview/send bị guard lịch sử Gmail cùng kỳ; agent chuẩn bị local `ZaloAcceptance.gs` + `tests/thu-tuan-acceptance.test.cjs`, helper TEST kỳ riêng clone Nhap từ nguồn đã duyệt, full target isolation, preview seal, core send/dedupe/audit thật. Review độc lập phát hiện approval check ngoài lock có race và teardown chưa readback false. Đã sửa bằng `thuTuanApproveContent_` chung trong Code.gs: public approval giữ behavior cũ, optional internal verifier chạy dưới lock ngay trước write; helper kiểm captured/current config/source/row/history và invalidates seal. Teardown có readback exact false, uncertainty giữ lịch sử/không retry.
- Agent source hết quota sau khi ghi source/tests; main tiếp quản kiểm tra sửa và tự chạy **117/117** (107 module +10 acceptance). Không coi agent kết thúc lỗi là validation pass. Main đọc tests/core/helper và đối chiếu hai finding đã sửa; không thay outbound state machine/manifest/ZaloTransport. Các file thay đổi lượt sau consent: Code.gs, ZaloAcceptance.gs, tests acceptance mới, README module và brain01/03/04/05/06; giữ nguyên working-tree changes có sẵn.
- Main so baseline cloud Mã.gs với local bằng cách loại riêng hook mới, match trước khi ghi; lưu Mã.gs và file acceptance mới chỉ TEST, reload đọc lại cả hai khớp source local. Không deployment, không thêm quyền/scopes/dependency, không trigger, không prepare/approve/preview/send fixture vì target thiếu. Rủi ro: helper cố định hai kỳ cho acceptance hiện tại, prepare sẽ fail closed khi sang tuần khác; finally/readback uncertainty cần operator kiểm thực trạng, không tự retry. Tests là synthetic/local, chưa chứng minh receipt/dedupe/reconciliation runtime. Owner cần xác nhận marker có được gửi đúng @mention trong00:53:47–00:55:49 trước khi chọn phép chẩn đoán tiếp; không yêu cầu gửi lại ngoài phiên.
- Kiểm cuối sau source update: syntax Code.gs/Diagnostics/Acceptance và test acceptance hợp lệ, git diff --check thành công (CRLF warnings). GAS `kiemTraLichThuTuan` thực thi source mới enabled=false/triggersOfThisAccount=0. Screenshot helper đã che được giữ trong workspace task; tab TEST giữ handoff cho lượt tiếp. Chưa có owner timing confirmation mới, không mở receiver lần hai, không tạo ID/hash/fixture/receipt giả hoặc dùng mock thay runtime. Không Production/rotation/install/Git mutation.

## [2026-10-01, tiếp tục acceptance với Agents] Chẩn đoán TEST riêng

- Owner yêu cầu Agents điều tra song song: source/tests/gates; tài liệu Zalo/SDK chính thức; thiết kế phép phân biệt runtime. Main giữ độc quyền cloud, receiver và fixture. Đọc toàn bộ brain/README/hướng dẫn, dùng CodeGraph caller/callee/impact cho config/request/approval/storage/week key. Các ghi chú 30/9 bên dưới là lịch sử; chỉ đạo hiện tại giữ token TEST và approval secret tới khi test thành công, không rotation trước điều tra. TEST-only không cần PROD chưa tồn tại.
- Thêm `services/thu-tuan/ZaloDiagnostics.gs`, mở rộng `tests/thu-tuan.test.cjs`: helper chỉ API đọc, guard TEST bị tắt, Script Lock/manual-only, pin script/hai Sheets/Bot, allowlist host/method/payload, TLS/no redirect, config recheck mỗi request. Initial diagnostic getMe/getWebhookInfo và Sheets metadata; receiver riêng giới hạn 4 timeout chuỗi 30 giây/120 giây giữa request. Không sửa guard outbound, không gửi/ghi Sheets; initial diagnostic không ghi Properties, paired receiver chỉ có pin target được guard như phần review bên dưới. Không raw event/error/chat ID/URL/secret. Rủi ro: UrlFetchApp không hỗ trợ timeout request cứng; cửa sổ cần owner handshake, không consumer khác và timestamp mới. Không chạy receiver tự động.
- Source SDK được trang Zalo chính thức liên kết dùng `bot-api.zapps.me`, tài liệu API dùng `bot-api.zaloplatforms.com`; chưa kết luận nguyên nhân hoặc đổi host transport. getUpdates result object, `message.chat.chat_type` GROUP/PRIVATE, date Unix milliseconds; 404/408 không đủ kết luận webhook/token/quyền. Không cài/chạy SDK.
- Xác minh cloud mới bằng UI đã che: ENABLED=false, TEST_MODE=true, ZALO/ENV TEST, pin script/hai Sheets khớp; token/Bot/approval secret có, chat/hash/group confirmation thiếu. Code.gs và ZaloTransport.gs khớp local; manifest scopes/runtime/timezone/logging khớp nhưng thêm metadata webapp MYSELF sẵn có, giữ nguyên và không deploy. `kiemTraLichThuTuan` thực thi GAS thành công enabled:false/triggersOfThisAccount:0; chưa chứng minh UrlFetch.
- Auto-review chặn truy vấn có thể in nguyên hàng Properties và nguyên dialog/log; đã chuyển sang cấu trúc/redacted booleans/enums, không xuất secrets. Không cần nới quyền để tiếp tục an toàn.
- File tài liệu cập nhật: README service và brain 01/03/04/05/06, thống nhất hướng dẫn hiện hành và giữ lịch sử. Regression main tự chạy: 96/96, helper/test syntax và git diff --check thành công. Đây là mock/local, chưa phải runtime acceptance. Frontend/video không đổi, không gọi PASS toàn repo.
- Cách kiểm tra: `node --test tests/thu-tuan.test.cjs`; `.gs` qua `Get-Content -Raw ... | node --check -`; lưu helper chỉ editor TEST, chạy chanDoanZaloThuTuan khi bị tắt rồi đọc safe summary. Chỉ mở receiver sau owner READY/consumer handshake; chỉ sau GROUP evidence, membership, approval/preview/preflight đủ mới gửi 01 fixture, đối chiếu receipts/dedupe/reconciliation, kết thúc ENABLED=false/không trigger/giữ lịch sử. Chưa gửi bất kỳ tin/email hoặc thay đổi Production.
- Review độc lập phát hiện marker exact toàn chuỗi không chấp nhận @mention và boolean-only output làm mất target sau tiêu thụ event. Đã sửa trước chạy cloud: đúng một marker token độc lập; initial diagnostic vẫn chỉ đọc; paired receiver được user cho phép lưu riêng cặp TEST_CHAT_ID/SHA256 khi GROUP/timestamp/marker khớp. Recheck guard, không ghi đè pin khác, readback fail closed; membership chưa được đặt. PRIVATE/stale/duplicate/substring marker không ghi. Valid unrelated events được đọc tiếp trong cùng bốn request; malformed/failure dừng. Thêm test repair; main tự chạy **102/102**, syntax/helper/test và diff check đạt. Helper đã lưu chỉ file mới trong editor TEST, chưa poll/send/config mutation.
- Chẩn đoán GAS thực sự chạy: log Zalo đúng 16 cột/0 dòng, Gmail 9 cột/5 dòng, tuần hiện tại có 1 lịch sử Gmail; content hiện tại 1 dòng/approval OK/render 1 phần 765. Hai getMe GAS không có HTTP response. Thêm classifier phase/category đã che và 2 test: main **104/104**; GAS chạy lại xác định cả hai FETCH/AUTHORIZATION (1–2 ms), không đánh đồng với Bot mismatch hay lỗi Platform. Local fresh POST getMe hai host HTTP 200/ok=true/ID chuỗi+account+can_join_groups khớp pin; getWebhookInfo cả hai HTTP 200/ok=false/404, webhook state UNKNOWN. Không getUpdates trong lượt này.
- Thêm entrypoint `capQuyenZaloThuTuanTest` với guard TEST disabled/manual/isolation, requireScopes FULL chỉ external_request, không fetch/write/revoke/auth URL; scope termination nằm ngoài catch để Google mở prompt. Thêm 3 test exact scope/guard/native termination. Main tự chạy **107/107** sau sửa. Lưu helper cập nhật riêng TEST, chạy entrypoint: Google hiển thị yêu cầu quyền, bấm “Xem lại quyền”; cửa sổ consent chưa có trong tab điều khiển được, chưa có scope-success/getMe-GAS-success. Đã yêu cầu owner hoàn tất consent tối thiểu, cùng pending readiness/no-other-consumer cho một phiên GROUP marker. Token/approval secret giữ nguyên; không gửi fixture, không ghi pin/Sheets, không đổi Production.
- Verdict hiện hành lúc đó `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_GAS_EXTERNAL_REQUEST_OAUTH`. Tiếp theo: owner consent external_request đúng TEST, main xác minh scope/getMe GAS, rồi một phiên GROUP marker có phối hợp. Nội dung hiện tại là fixture Gmail đã có lịch sử: kỳ Zalo fixture phải riêng, được duyệt/preview và đủ preflight trước 01 send. Receipt/dedupe/reconciliation runtime chưa nghiệm thu, không mock thay runtime và không mở pilot. Screenshot authorization đã che được giữ trong workspace task; mọi kết quả local chỉ là local. Không kết luận nguyên nhân receive path Zalo từ OAuth/404/408.
- Kiểm tra cuối: editor TEST chứa helper cuối khớp source local sau normalize CRLF; chưa có scope-success và execution vẫn chờ consent ngoài tab điều khiển được. Main kiểm syntax helper/tests và git diff --check thành công (chỉ CRLF warnings). Giữ toàn bộ working-tree changes có sẵn, không sửa Code.gs/ZaloTransport.gs/manifest trong lượt này, không install/reset/stash/clean/commit/push. Trạng thái ENABLED=false giữ nguyên và không tạo trigger; kết quả 0 trigger chỉ áp dụng tài khoản đã kiểm tra, không suy mọi account.

## [2026-09-30, sửa isolation bootstrap sau ảnh lỗi] TEST-only profile

- Ảnh Apps Script Execution log cho thấy `kiemTraZaloThuTuan` trả `ZALO_GATE_BLOCKED/ZALO_ISOLATION_REQUIRED`. CodeGraph trace (`thuTuanZaloConfig_`, caller `thuTuanZaloAdapter_`/`kiemTraZaloThuTuan`) chỉ ra nguyên nhân: yêu cầu đủ metadata cho cả TEST lẫn PROD dù không tồn tại project/Bot PROD. Guard dừng trước UrlFetch; không phải lỗi cấp OAuth, không có request Zalo/send.
- Sửa `services/thu-tuan/ZaloTransport.gs`: chỉ profile đang hoạt động phải đủ năm pin; profile đối diện được vắng mặt hoàn toàn; nếu khai báo một phần thì fail closed; nếu khai báo đủ hai profile thì tiếp tục bắt buộc identity và mọi Sheet ID riêng biệt. ENV↔TEST_MODE cùng so sánh `ScriptApp.getScriptId()` tiếp tục ngăn project TEST giả làm PROD.
- Sửa `tests/thu-tuan.test.cjs`: test TEST-only/PROD-only preflight, pin active bắt buộc, profile đối diện một phần bị chặn, đổi môi trường bị chặn và profile kép trùng identity/sheet bị chặn.
- Cập nhật `services/thu-tuan/README.md`, `docs/brain/01-architecture.md`, `03-decisions.md`, `04-current-tasks.md`. Rủi ro: cần cập nhật source lên project TEST trước khi chạy lại; không triển khai Production. Cách test: `node --test tests/thu-tuan.test.cjs`, cú pháp `.gs` bằng `node --check -`, sau đó chạy `kiemTraZaloThuTuan` trong project TEST; hàm chỉ getMe. Giữ ENABLED=false, không fixture-send cho tới khi đủ chat ID/group confirmation và preview.
- Đã triển khai chỉ tệp `ZaloTransport.gs` lên project TEST sau khi regression pass; đọc lại qua editor sau reload cho thấy `profileFor` mới. Không đổi manifest, Code.gs, Properties, Sheet hoặc trigger. Chạy `kiemTraZaloThuTuan`: vẫn `ZALO_GATE_BLOCKED/ZALO_ISOLATION_REQUIRED`; điều kiện cụ thể là pin active `THU_TUAN_ZALO_TEST_CHAT_SHA256` thiếu, đồng thời thiếu `CHAT_ID` và `GROUP_CONFIRMED`, nên dừng trước UrlFetch/getMe. ENABLED=false.
- Trong lần kiểm tra Properties, một snapshot không che vô tình in credential TEST ra đầu ra công cụ. Không sử dụng credential đó thêm; cần thay Bot TEST token và approval secret TEST cùng một lượt trước khi gọi API, rồi duyệt lại fixture. Không ghi giá trị credential vào tài liệu/repo. Không sửa Production.
- Verification: `node --test tests/thu-tuan.test.cjs` — **83/83 pass**; cú pháp `.gs`/`.cjs` và `git diff --check` chạy sau đó. Runtime acceptance chưa đạt.

Nhật ký ghi lại các thay đổi, sửa đổi mã nguồn và kiến trúc được thực hiện bởi các trợ lý AI lập trình (Claude Code, Codex, v.v.).

---

## [2026-09-30, sau owner bổ sung token] Chuẩn bị cloud TEST, acceptance tiếp tục BLOCKED

- Verdict: `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_CREDENTIAL_ROTATION_OAUTH_AND_ISOLATION`. Không gửi Zalo/Gmail, không thay đổi bất kỳ cấu hình/Bot/Sheet/trigger/code Production nào.
- Rà soát source/runbook và CodeGraph impact thuTuanZaloConfig_ (8 symbol liên quan). Không sửa implementation hoặc hạ guard. Regression Node chạy lại 82/82; source cloud TEST đọc lại khớp local sau chuẩn hóa newline. Python regression vẫn bị chặn do thiếu pytest ở lượt trước, không ghi PASS toàn repo.
- Browser xác minh đúng project TEST hiện hữu; Drive connector metadata xác nhận hai workbook TEST đã cấu hình. getMe trực tiếp HTTPS POST ngoài GAS dùng token owner vừa lưu, không redirect, trả ok=true/id string/account_name bot.POyBVXga/can_join_groups=true. Account khớp Bot quan sát trong nhóm Test; không coi capability là membership. getWebhookInfo HTTP 200/ok=false/error_code=404 không đủ xác nhận không webhook; không xuất description/URL, không gọi getUpdates. Owner trả lời chưa có chương trình nhận sự kiện, báo đã gửi “xin chào” nhưng chưa có event/mention được đối chiếu.
- Chỉ ghi Properties TEST: TRANSPORT=ZALO, ZALO_ENV=TEST, TEST_MODE=true; thêm bốn pin ZALO_TEST_SCRIPT_ID/CONTENT_SHEET_ID/PRIVATE_SHEET_ID/BOT_ID từ nguồn đã xác minh. ENABLED giữ false; token owner lưu được giữ nguyên. TEST chat/hash/GROUP_CONFIRMED và năm metadata PROD vẫn thiếu. Owner xác nhận chưa có project/Bot Production; không dựng pin giả hoặc tạo Production để vượt chốt.
- Cập nhật source **chỉ TEST editor**: Mã.gs tương ứng services/thu-tuan/Code.gs, tệp mới ZaloTransport.gs và appsscript.json (external_request, exceptionLogging NONE). Đọc lại ba tệp bằng clipboard editor, khớp source local; EmailAssets.gs hiện có giữ nguyên. Không deploy Web App/API executable, không clasp/backend push. Backup source Mã.gs/manifest trước thay nằm trong thư mục temp do task tạo, không chứa Script Properties/secret.
- Tạo ThuTuan_Zalo_NhatKyGui ở workbook riêng tư TEST, đúng A1:P1 với 16 header theo source, freeze hàng đầu; đọc lại connector và kiểm tra Google-rendered header/hàng trống. Không sửa recipient, nội dung, approval hay log Gmail. Trang trigger hiện 0 cho tài khoản hiện tại (không chứng minh trigger tài khoản khác).
- Chạy xemTruocThuTuan trên TEST nhưng Apps Script dừng ở dialog Yêu cầu ủy quyền trước execution; huỷ, không cấp quyền mới. Chưa có preview thành công/getMe GAS/fixture/sendMessage/message_id/dedupe/reconciliation thật. Không thay bằng giả lập. ENABLED=false, TEST_MODE=true/ENV TEST giữ trạng thái an toàn cuối lượt.
- **Sự cố bảo mật thao tác:** sau click chuyển editor, snapshot trả về DOM cũ của Settings và một lần output chưa được che đã chứa token TEST, approval secret TEST. Đã thông báo owner, dừng dùng token sau phát hiện; source/docs/backup không chứa hai giá trị này. Owner phải reset token ở Zalo Bot Creator và cập nhật token TEST, thay approval secret TEST bằng secret ngẫu nhiên mới ≥32 ký tự; không gửi giá trị qua chat. Không thay credentials bằng thao tác tự động hay sửa Production. Fixture mới cần duyệt lại, lịch sử gửi cũ phải giữ nguyên. Các snapshot tiếp theo chọn lọc dữ liệu/status và che giá trị trước output.
- Chỉ sửa tài liệu local ở lượt này: services/thu-tuan/README.md, docs/brain/04-current-tasks.md, 05-testing-and-deploy.md, 06-ai-working-log.md. Kiến trúc/schema không đổi so với implementation đã hoàn thành; không commit/push/install/discard.
- Next gate: rotation hai secret TEST, OAuth TEST theo manifest, metadata PROD thật trong công việc vận hành riêng, mention marker đúng Bot/group TEST để nhận event chat.id an toàn. Tiếp tục pin hash/membership, preview rồi getMe GAS; chỉ sau toàn bộ gate mới gửi 01 fixture, kiểm chứng receipt/nội dung/dedupe/reconciliation, cuối lượt tắt ENABLED/no trigger. Không mở pilot Production.

## [2026-09-30, owner xác nhận đã mention] Thử đọc event TEST

- Owner xác nhận đã mention Bot trong nhóm; ghi nhận đây là thao tác đã hoàn thành, không yêu cầu gửi lại marker/tin mới.
- Theo chỉ đạo owner, tiếp tục dùng token hiện có trong bước đọc TEST và hoãn thay token cùng approval secret đã lộ tới sau khi runtime ổn định; không in/lưu hai giá trị trong repo.
- Tài liệu chính thức `getUpdates` mô tả POST long polling, `timeout` là chuỗi giây và không dùng được nếu webhook đã thiết lập. Thực hiện hai poll có giới hạn `timeout=1` và `timeout=5`; cả hai HTTP 200 nhưng API trả error_code 408, result/event rỗng. `getWebhookInfo` trước đó cũng trả API 404 nên trạng thái webhook chưa xác định. Không có chat.id để pin, không tiếp tục poll vô hạn, không set/delete webhook, không sendMessage.
- Runtime chưa đạt: OAuth chưa được cấp; TEST_CHAT_ID/CHAT_SHA256/GROUP_CONFIRMED thiếu; năm metadata PROD thiếu do owner xác nhận chưa có project/Bot Production. ENABLED=false, TEST_MODE=true, ENV=TEST; không trigger. Không sửa Production.
- Chỉ cập nhật README service và brain 04/05/06 để ghi chính xác owner đã mention và kết quả 408, đồng thời không lặp yêu cầu nhắn lại.

---

## [2026-09-30, lượt tiếp tục] Runtime acceptance Zalo TEST — thiếu prerequisites

- Verdict: `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_MISSING_TEST_TOKEN_AND_ISOLATION_CONFIG`. Không dùng mock để thay bằng chứng runtime.
- Đã rà soát Code.gs/ZaloTransport.gs/manifest, runbook và graph caller/callee cho thuTuanZaloConfig_/thuTuanZaloAdapter_; không sửa implementation, không hạ fail-closed. Chạy lại `node --test --test-reporter=dot tests/thu-tuan.test.cjs`: 82/82 thành công; syntax toàn bộ .gs qua stdin `node --check -` hợp lệ. Frontend/video không đổi; không thay kết quả regression Python chưa chạy của lượt trước bằng PASS.
- Browser dùng phiên Google hiện có, mở đúng project `TEST - Thu Tuan Loi Bac Day` thuộc tài khoản hiện tại. Editor có Mã.gs, EmailAssets.gs, appsscript.json và chưa có ZaloTransport.gs. Chỉ đọc DOM/UI; không lưu/chạy code. Xuất tên property và boolean/trạng thái an toàn, không xuất giá trị approval secret/approver/Sheet IDs/token/chat IDs.
- Cloud vẫn chỉ có sáu property chung: APPROVAL_SECRET, APPROVER_EMAILS, CONTENT_SHEET_ID, ENABLED, PRIVATE_SHEET_ID, TEST_MODE (prefix THU_TUAN_). ENABLED=false, TEST_MODE=false; transport chưa khai báo nên GMAIL, ENV thiếu. Secret/approver/2 Sheet IDs có, hai bảng khác nhau; chưa thể chứng minh pin môi trường vì toàn bộ 10 metadata TEST/PROD và Bot/token/chat/GROUP_CONFIRMED đều thiếu. Trang Kích hoạt hiển thị 0 trigger cho account hiện tại; Google không bảo đảm liệt kê trigger của account khác.
- Dừng trước deploy/cloud log creation/getMe/preview Zalo/send fixture/dedupe/reconciliation theo yêu cầu thiếu token/quyền phải dừng. Không mở/sửa project Production, không gửi tin/email, không đổi Properties/Sheets/trigger hoặc code TEST. Trạng thái TEST giữ ENABLED=false và không có trigger được tạo bởi task.
- Đối chiếu lại tài liệu chính thức getMe/group/getUpdates: ID chuỗi/can_join_groups, group chat.id từ sự kiện, trưởng nhóm xác nhận lời mời, feature vẫn trial; getUpdates/webhook loại trừ nhau. Checklist bổ sung quy định xác minh chat bằng marker trong TEST khi có token, không cài/xóa webhook hay tranh consumer, không poll Production. Không suy ra chat từ tên/link nhóm.
- Chỉ sửa tài liệu: services/thu-tuan/README.md, docs/brain/04-current-tasks.md, 05-testing-and-deploy.md, 06-ai-working-log.md. Ghi đúng gate còn thiếu và thao tác owner tối thiểu: lưu TEST token/Bot ID trực tiếp Properties, mời Bot vào nhóm TEST + marker hoặc chat/hash đã xác minh, metadata PROD đã kiểm chứng chỉ trong project TEST. Không yêu cầu owner tự deploy/bật gửi; không dựng profile PROD giả. Kiến trúc/schema/API không đổi.
- Rủi ro/next check: capability không chứng minh membership; thiếu metadata PROD thực vẫn BLOCKED. Khi prerequisites đầy đủ: triển khai chỉ TEST, pin project/Sheets, TEST_MODE=true/ZALO/ENV=TEST, ENABLED=false/no trigger, log 16 cột, approve fixture mới/preview/getMe; chỉ gửi 01 fixture sau mọi gate đạt, kiểm chứng receipts/dedupe/reconciliation, cuối lượt ENABLED=false và giữ TEST isolation. Chi tiết cuối mục 12 README service.

---

## [2026-09-30] Thư tuần — transport Zalo outbound, pilot BLOCKED

### File và lý do thay đổi

- `services/thu-tuan/Code.gs`: tách storage/integrity dùng chung, dispatch GMAIL mặc định hoặc ZALO, kiểm tra lịch sử hai transport, preflight/receipt hooks, dừng toàn lượt khi cần reconciliation; giữ approval/HMAC canonical v2, LockService và Gmail renderer/recipient/quota.
- `services/thu-tuan/ZaloTransport.gs` (mới): cấu hình pin TEST/PROD, chia plain text Unicode ≤1800 tối đa 3 phần, getMe kiểm tra Bot/group capability, UrlFetchApp sendMessage receipt nghiêm ngặt, log từng phần và config recheck; không retry/webhook/Vercel.
- `services/thu-tuan/appsscript.json`: thêm external_request OAuth scope, giữ exceptionLogging NONE.
- `tests/thu-tuan.test.cjs`: guard cũ chỉ cập nhật tối thiểu cho source/manifest và mock digest; thêm 30 test Zalo, gồm response/timeout, Unicode fallback, flush ordering, UNKNOWN/dedupe/manual reconciliation, config/content tamper và gửi mock TEST/PROD đúng profile.
- `services/thu-tuan/README.md`, README gốc: kiến trúc thực tế, bảng properties/log, giới hạn group và checklist TEST/rollback.
- `docs/brain/01-architecture.md`, `03-decisions.md`, `04-current-tasks.md`, `05-testing-and-deploy.md`, `06-ai-working-log.md`: đồng bộ schema/luồng/thiết kế và gate chưa hoàn tất.

### Nghiên cứu và đánh giá tác động

- Đọc source, README, tests và toàn bộ brain của checkout đích; dùng CodeGraph xác định thuTuanExecute_/thuTuanRun_, caller/callee/impact. Chỉ service độc lập bị thay đổi; không sửa route/backend/frontend, không dependency mới.
- Đọc bandocapt hiện tại và module Zalo/test trong snapshot `9c2554cb47b1829e6a920a62b65b47bad2157202` vì checkout hiện tại không còn module. Không kế thừa HTTP-only success hay splitter UTF-16 thô; PRIVATE-only policy cũ không phải bằng chứng API cấm group.
- Đối chiếu lại tài liệu chính thức bot.zapps.me: sendMessage cập nhật 10/6/2026 (text 1–2000, ok/result.message_id, plain text không parse_mode/text_styles); getMe (ID chuỗi/can_join_groups); group cập nhật 3/6/2026 vẫn ghi thử nghiệm nội bộ + trưởng nhóm xác nhận lời mời; call-api/error-code có timeout/quota. Các link được ghi tại README service mục 12. Chưa thấy idempotency/receipt lookup trong các trang đã đọc nên giữ UNKNOWN/reconciliation, không retry.

### Kiểm thử, security và runtime gate

- `node --test tests/thu-tuan.test.cjs`: 82/82 thành công (52 cũ + 30 Zalo), không network thật; syntax ba GAS qua stdin node --check và test .cjs hợp lệ.
- `npm run build -- --outDir ../.codex-validation-zalo/web-build` tại web thành công; output tạm do task tạo đã được xóa sau kiểm tra, không thay dist có sẵn.
- Toàn bộ regression Python/video đã thử với bundled Python bằng `python -m pytest tests -q -p no:cacheprovider`: BLOCKED bởi `No module named pytest`. Không cài package/tool để vượt gate khi chưa được yêu cầu; chưa thể gọi toàn repo PASS.
- Rà soát diff và security: không token/chat_id thật, raw API errors hay URL token được log; API host cố định/TLS/no redirect, SENT cần receipt, gửi có durable intent trước API, snapshot config/integrity recheck giữa phần và sau flush, TEST pin tách PROD. Không đổi Git config, commit/push/merge hay discard dữ liệu có sẵn.
- Kiểm tra chỉ đọc trên project cloud `TEST - Thu Tuan Loi Bac Day`: chỉ có sáu thuộc tính approval/Gmail chung; ENABLED=false, TEST_MODE=false, không có property transport/Zalo. Không lấy/log giá trị secret/ID, không sửa code/properties/Sheets/trigger. Thiếu Bot/token/chat/pin/group capability nên dừng trước getMe/sendMessage đúng runtime gate.
- Không gửi Zalo (TEST hoặc Production); không chạm cấu hình Production. Chưa upload implementation lên cloud. Gmail runtime acceptance trước đây không thay thế nghiệm thu Zalo.

### Rủi ro và hướng dẫn test tiếp

- Group là tính năng thử nghiệm theo tài liệu, Bot cụ thể có thể chưa có quyền. getMe không chứng minh membership đúng chat; owner phải xác nhận riêng. OAuth external_request cần cấp khi triển khai; thời gian request GAS không có timeout tùy chỉnh. UNKNOWN phải đối soát từng phần, không retry mù; rollback không được đổi transport cùng kỳ có lịch sử.
- Owner cung cấp Bot/group TEST và metadata pin hai môi trường; chỉ deploy project TEST với ENABLED=false/no trigger, tạo log 16 cột và fixture mới, duyệt/preview không I/O, getMe đúng Bot/capability, gửi TEST thủ công, kiểm chứng từng receipt/nội dung/dedupe/integrity/UNKNOWN/isolation rồi tắt gửi. Chi tiết và reconciliation ở mục 12 README service.
- Chạy lại regression Python trong môi trường có pytest được owner cho phép. Chỉ khi runtime TEST và các gate còn lại hoàn tất mới xin quyết định pilot riêng; verdict hiện tại `THU_TUAN_ZALO_PILOT_BLOCKED`.

---

## [2026-09-28] Tách PR sạch và cập nhật hardening Thư tuần

### File đã sửa
- services/thu-tuan/Code.gs: mang service từ commit ad366861 sang branch sạch; bổ sung kiểm tra cú pháp email chặt hơn cho recipient thường và TEST override.
- services/thu-tuan/EmailAssets.gs, services/thu-tuan/appsscript.json, services/thu-tuan/tools/corpus-to-sheet.cjs, services/thu-tuan/README.md, tests/thu-tuan.test.cjs: mang phần còn lại của service và regression suite sang branch sạch; thêm trường hợp email sai cú pháp vào test hiện có.
- docs/brain/01-architecture.md, docs/brain/03-decisions.md, docs/brain/06-ai-working-log.md: ghi nhận kiến trúc project riêng, các quyết định approval, recipient, TEST, dedupe, banner và nhật ký riêng thuộc Thư tuần.

### Lý do
- PR #10 có thay đổi ngoài phạm vi. Branch này bắt đầu từ origin/main hiện tại và chỉ tái tạo service Thư tuần cùng tài liệu trực tiếp liên quan.
- Validator trước đó chấp nhận một số địa chỉ sai cú pháp như local-part có dấu chấm liên tiếp hoặc domain label có dấu gạch ngang ở đầu/cuối. Kiểm tra mới từ chối các dạng đó trước khi gửi và áp dụng cùng quy tắc cho TEST override.
- README được đồng bộ với 52 test thực tế của branch sạch; không giữ số cũ 50/50 hoặc bộ kết hợp không có trên base.

### Rủi ro
- Test cục bộ giả lập Google Sheets, MailApp, trigger và Script Properties; không chứng minh runtime Apps Script hoặc cấu hình Production.
- Production configuration/runtime remains unverified. Task này không gửi email Production và không sửa trigger, Script Properties, Sheet, approval hoặc recipient data Production.
- Kiểm tra email là kiểm tra cú pháp, không xác minh mailbox tồn tại.

### Kiểm tra và cách chạy lại
1. node --test tests/thu-tuan.test.cjs — 52/52 PASS, bao gồm recipient thường và TEST override sai cú pháp.
2. Get-Content -Raw services/thu-tuan/Code.gs | node --check - — kiểm tra cú pháp Apps Script V8.
3. Trong web/, npm run build -- --outDir <thư mục tạm> — build frontend hiện có mà không ghi đè web/dist.
4. Nghiệm thu runtime TEST chỉ trên project và Sheets TEST riêng theo mục 9 README; bước này không chạy lại trong task tách PR.
5. Không có tests/hoc-tap.test.cjs trên origin/main, nên không có bộ test kết hợp.
6. git diff --check — PASS; staged diff chỉ gồm 9 file trong scope Thư tuần.

## [2026-09-27] Tạm tắt Dark mode chưa hoàn thiện

### Thay đổi
- `web/src/index.css`: đổi `color-scheme` thành `light` và gỡ toàn bộ `@media (prefers-color-scheme: dark)` đang đổi biến màu, bóng đổ và nền trang.
- `docs/brain/04-current-tasks.md`: ghi nhận Dark mode hiện được tạm tắt.

### Lý do
- Theo yêu cầu người dùng, giao diện luôn dùng màu sáng cho tới khi Dark mode được hoàn thiện.

### Rủi ro
- Ứng dụng không còn giao diện tối khi hệ điều hành bật Dark mode; các điều khiển mặc định của trình duyệt cũng được yêu cầu hiển thị theo bảng màu sáng. Không thay đổi luồng ứng dụng hoặc API.

### Kiểm tra
- `cd web; npm run build` — thành công, Vite build 1.608 module.
- `rg -n -i 'prefers-color-scheme|color-scheme' web/src` — chỉ còn `color-scheme: light` trong `index.css`.
- Trình duyệt tại `http://127.0.0.1:5174/`: stylesheet được xác nhận từ đúng checkout; dù `prefers-color-scheme: dark` là `true`, trang đã render với `color-scheme: light` và nền sáng.
- `git -c core.whitespace=cr-at-eol diff --check` — pass.

### Cách kiểm tra thủ công
1. Chạy `cd web; npm run dev`.
2. Bật Dark mode của hệ điều hành/trình duyệt rồi mở ứng dụng hoặc tải lại trang.
3. Xác nhận nền, thẻ, chữ, input và điều khiển vẫn theo bảng màu sáng.

## [2026-06-25] Tro ly 35: noi rang buoc RAG phan bac (lay duoc can cu)

### Van de
Mode `rebuttal` thuong tra ve "Chua du can cu" / 0 dan chung du kho RAG co tu lieu lien quan.

### Nguyen nhan goc (chan doan)
1. **Cong chan cung** trong `troLy35GenerateRebuttalDraft_`: khi `analysis.co_luan_dieu_sai_trai === false` thi tra ve ban de dat va **vut bo toan bo `knowledge` da lay tu RAG** (`dan_chung_su_dung: []`).
2. **Prompt phan tich qua de dat**: `troLy35AnalyzeInput_` de gan `co_luan_dieu_sai_trai=false` cho noi dung mo ho, ke ca khi nguoi dung dang o mode phan bac.
3. Khau Pinecone **khong** chat (khong loc nguong diem, luon tra `topK=5`) -> van de khong nam o retrieval.

### File da sua
- `backend/08-troly35.gs`:
  - `troLy35GenerateRebuttalDraft_`: cong chan chi short-circuit khi `co_luan_dieu_sai_trai === false` **VA** khong co `knowledge`. Neu da co tu lieu RAG -> van sinh ban nhap phan bac dua tren tu lieu. Them `uncertainBlock` vao prompt de model bam vao RAG, ghi diem can kiem chung vao `ghi_chu` thay vi tu choi.
  - `troLy35AnalyzeInput_`: them quy tac mode-aware cho `${TROLY35_MODES.REBUTTAL}` - thien ve trich luan diem can phan bac khi noi dung mot chieu/gay tranh cai/co dau hieu xuyen tac; chi dat false khi noi dung trung lap/khach quan/dung chu truong.

### Khong sua (co y)
- **Khong noi dieu kien "Da duyet"** cua kho `PHAN_BAC_KHO` (`troLy35IsApprovedKnowledge_`) de giu chat luong can cu (tranh dua tu lieu chua kiem duyet vao noi dung nhay cam).
- Khong dong schema, khong dong khau Pinecone/embedding.

### Rui ro
- Mode phan bac se "tu tin" hon, sinh phan bac ca khi noi dung con mo ho (mien la co tu lieu RAG). Van giu nhan kiem duyet + ghi_chu can kiem chung; ket qua van la ban nhap can nguoi dung ra soat.
- Neu kho RAG that su rong (chua approve gi / Pinecone trong) thi van ra it can cu - day la van de du lieu, khong phai code.

### Cach test
1. Apps Script: `testTroLy35Setup()` -> kiem tra cau hinh + chan doan kho RAG (xem duoi).
2. Mode `rebuttal`: dan mot noi dung mot chieu/mo ho ma kho co tu lieu lien quan -> truoc day ra "Chua du can cu", gio phai ra ban phan bac kem dan_chung tu RAG.
3. Dan noi dung trung lap/khach quan that su -> van ra ban de dat (khong quy chup).
4. Kiem tra `analysis.co_luan_dieu_sai_trai` va so "dan chung" hien o `AnalysisBlock`.

### Chan doan tang du lieu/sync (nguyen nhan goc thu 2)
Khi tiep tuc soi chuoi cung ung RAG, phat hien ly do "khong lay duoc can cu" phan lon nam o **van hanh**, khong phai code:
- **TCCS_CHUNKS** tao ra voi status `Draft`/`Needs Review` (09a:600-601, 09b:249,703), KHONG phai "Da duyet".
- **PHAN_BAC_KHO** sinh tu dong (09d:209) co status `Cho duyet`.
- Ca `syncTccsApprovedChunksToPinecone` (09c:30) lan `syncTroLy35KnowledgeToPinecone` + Sheets fallback (`troLy35IsApprovedKnowledge_`) DEU chi nhan dong "Da duyet"/"approved".
- **KHONG co trigger time-based** cho scrape/generate/sync RAG (07-main.gs chi co trigger cho runDailyNewsBot, runMonthlyArchive, runBanTin35DailyStep). Tat ca phai chay tay.
=> Neu chua duyet tay + chua chay sync, Pinecone namespace rong -> RAG luon tra rong -> "khong co can cu". Day la human-in-the-loop co chu y cho noi dung nhay cam, KHONG tu dong noi long.

### File da sua (bo sung)
- `backend/08-troly35.gs`: them `troLy35DiagnoseKnowledge_()` va goi trong `testTroLy35Setup()`. Bao cao: PHAN_BAC_KHO tong/da duyet/da sync, TCCS_CHUNKS tong/da duyet/da index, va probe Pinecone (so match) de biet namespace co vector hay khong.

### Quy trinh nap kho RAG (chay tay theo thu tu)
1. `runTccsScrapeDrafts()` -> scrape bai TCCS thanh chunk Draft.
2. (Tuy chon) `generatePhanBacFromTccs()` -> sinh entry PHAN_BAC_KHO "Cho duyet".
3. Mo Sheet, doi status hop le -> "Da duyet".
4. `syncTccsApprovedChunksToPinecone()` va/hoac `syncTroLy35KnowledgeToPinecone()`.
5. `testTroLy35Setup()` -> xac nhan probe Pinecone > 0 match.

## [2026-06-20] Khac phuc finding review nang cap video tu dong

### Noi dung thuc hien
- `video_module/scripts/08_make_short.py`: xoa `final_short.mp4` cu ngay dau, render qua `final_short.tmp.mp4`, chi thay file dich khi FFmpeg thanh cong de tranh gui nham short cu.
- `video_module/daily_run.py`: doi thu tu pipeline thanh nen -> tao short -> verify -> dang duyet.
- `video_module/scripts/07_post_telegram_review.py`: chi gui short neu `mtime(short) >= mtime(final.mp4)`.
- `video_module/scripts/09_verify_output.py`: them check hook o frame dau `FIRST_FRAME_T=0.05s`, xuat `output/verify_frame0.jpg`, siet canh bao loudness ve nguong 3 LUFS.
- `video_module/scripts/06_compress_video.py`: dung pool SFX va round-robin transition, giu loudnorm/SFX tuy chon va guard file >50MB.

### Rui ro
- Verify frame dau co the chan cac video intro fade-in cham theo pipeline cu; pipeline hien tai yeu cau hook hien ngay tu frame dau.
- Short van la artifact tuy chon: neu tao short fail, pipeline tiep tuc voi video day du nhung khong con gui short cu.

### Kiem thu
- Chay `python -m py_compile` cho cac script video lien quan.
- Chay `python -m pytest tests -q` trong `video_module`.
- Test thu cong: chay `python scripts/09_verify_output.py` sau khi co `output/final.mp4`, kiem tra `output/verify_frame0.jpg`.

---

## [2026-06-13] Tro ly 35 truy cap tu do (an o nhap ma, proxy tiem ma chung)

### File da sua
- `web/api/gas.js`: them `TROLY35_ACCESS_CODE` (env) + set `TROLY35_ACTIONS`; trong POST tu gan `accessCode` cho cac action `troly35_*` khi client khong gui.
- `web/src/pages/TroLy35.jsx`: go card "Truy cap", badge "Noi bo", toan bo state/handler ma truy cap (`accessCode`, `remember`, `accessMsg`, `saveAccess`, `ACCESS_KEY`); them hang `ACCESS_CODE` (fallback dev tu `VITE_TROLY35_ACCESS_CODE`); `loadTrends`/`loadHistory` bo phu thuoc ma va tai ngay khi vao trang; `sendQuestion`/`submitFeedback` bo chan thieu ma.
- `web/src/css/troly35.css`: go cac class khong con dung (`t35-internal-badge`, `t35-header-badges`, `t35-access-*`, `t35-remember`).
- `.claude/CLAUDE.md`: bo sung env Vercel `TROLY35_ACCESS_CODE` va ghi chu truy cap tu do; `docs/brain/03-decisions.md`: them quyet dinh #8.

### Ly do
- Bo rao can nhap ma truy cap noi bo de nguoi dung dung Tro ly 35 tu do, ma van khong lo ma trong frontend bundle (tiem o proxy server-side) va khong phai deploy lai backend GAS.

### Rui ro va dieu kien van hanh
- **Bat buoc dat env `TROLY35_ACCESS_CODE` tren Vercel** (plaintext khop `TROLY35_ACCESS_CODE_SHA256` trong Script Properties). Thieu -> proxy khong tiem ma -> backend tu choi.
- **Han muc/ngay va lich su/xu huong dung CHUNG** cho moi nguoi vi cung mot ma. Neu can tach theo nguoi dung hoac an lich su/xu huong, phai thiet ke lai.
- **Dev local goi truc tiep GAS** (khong qua proxy): dat `VITE_TROLY35_ACCESS_CODE` trong `.env` local; de trong o production.

### Kiem thu da chay
- `cd web; npm run build` -> pass (2 lan, truoc va sau khi don CSS).
- `grep` xac nhan khong con tham chieu `accessCode`/`ACCESS_KEY`/`saveAccess`/`Lock`/`Key` sai sot trong `TroLy35.jsx` (chi con hang `ACCESS_CODE`).

### Cach test thu cong
1. Tren Vercel dat env `TROLY35_ACCESS_CODE` = ma goc Tro ly 35, redeploy.
2. Mo app -> tab `Tro ly 35`: khong con o nhap ma; lich su/xu huong tai ngay.
3. Gui prompt (rebuttal/fact_check/article_writer), kiem tra co ket qua, dat feedback tot/xau, doi cua so xu huong 7/30 ngay.
4. Kiem tra Network: request `troly35_run` tu client khong kem `accessCode` that; backend van tra `success: true`.

## [2026-06-13] Tach toan bo inline style sang CSS class (Dot 3 - bo sung)

### Noi dung thuc hien
- Theo yeu cau ro cua nguoi dung (truoc do tam hoan vi quy tac "tranh refactor lan rong"), tach toan bo inline style:
  - Them `web/src/css/troly35.css`: ~60 class cho trang Tro ly 35 (card, mode/style selector, bong bong chat, badge kiem duyet, khoi phan tich/dan chung, copy, feedback, compose, lich su, xu huong). Import vao `TroLy35.jsx`.
  - `web/src/pages/TroLy35.jsx`: thay TAT CA `style={{...}}` bang className. Doi `dangerColor` -> `dangerClass` (tra 'high'/'mid'/'low'). `MessageText` plain dung `.chat-plain` thay inline `<p>`.
  - `web/src/components/BottomNav.jsx`: thay inline style bang nhom `.bottom-nav`, `.bottom-nav-center`, `.bottom-nav-tab` (them vao `index.css`). Bo cac handler `onMouseDown/Up/Leave` chinh transform, chuyen sang `:active { transform: scale(.94) }` trong CSS.
- Nang specificity cho class mo rong base: `.btn.t35-*` (mode/style/copy/feedback/feedback-send/icon/trend), `.pill.t35-*` (internal-badge/mode-pill/danger/count/history), `.field.t35-compose-input` -> de thang `.btn.sm` (0,2,0) va `textarea.field` (0,1,1) bat ke thu tu chunk CSS.

### Ly do
- Nguoi dung hoi "sao lai hoan? lam luon duoc khong" -> dieu kien "co yeu cau ro" cho phep lam theo CLAUDE.md.

### Rui ro va pham vi anh huong
- Chi anh huong frontend: `TroLy35.jsx`, `BottomNav.jsx`, `index.css`, them `troly35.css`.
- Khong doi logic/state/handler (tru viec bo JS transform o BottomNav, thay bang :active CSS -> hanh vi tuong duong).
- Gia tri style giu nguyen 1-1. Da xu ly can than specificity de khong bi `.btn.sm`/`textarea.field` ghi de.
- troly35.css la chunk lazy load sau index.css.

### Kiem thu da chay
- `cd web; npm run build` -> thanh cong. TroLy35 tach JS ~21.7kB + CSS chunk ~5.8kB. Grep xac nhan khong con `style={{` trong TroLy35.jsx/BottomNav.jsx.

### Cach test thu cong
1. `cd web; npm run dev`, mo Tro ly 35: kiem tra bo cuc card, selector mode/style, bong bong chat user/assistant, badge, khoi phan tich, copy, feedback, lich su, xu huong giong truoc.
2. BottomNav: bam cac tab, nut giua (logo) -> trang thai active dung; hieu ung nhan (scale) khi bam.
3. Bat dark mode -> giao dien toi van dung.

## [2026-06-13] Nang cap UX chatbot Tro ly 35 - Dot 3 (Dark mode + a11y)

### Noi dung thuc hien
- Cap nhat `web/src/index.css`:
  - Them `color-scheme: light dark` vao `:root`.
  - Them khoi `@media (prefers-color-scheme: dark)` override toan bo bien mau/shadow trong `:root` + background `body`. Vi phan lon inline style trong `TroLy35.jsx`/`BottomNav.jsx` dung `var(--...)`, dark mode tu thich ung ma khong can sua tung component.
  - Tang tuong phan `--ink-mute` o light tu `#A89D8A` -> `#8A7E68`.
- Cap nhat `web/src/pages/TroLy35.jsx`:
  - Vung danh sach tin nhan them `role="log"`, `aria-live="polite"`, `aria-relevant`, `aria-label` de screen reader doc cau tra loi moi.
  - Nut tai lai Lich su them `aria-label`.

### Ly do
- Theo yeu cau nguoi dung: tiep tuc Dot 3. Uu tien Dark mode + a11y vi gon va gia tri cao.

### Rui ro va pham vi anh huong
- Chi anh huong CSS dung chung + tab Tro ly 35.
- KHONG thuc hien tach toan bo inline style sang CSS class (Dot 3 ban dau co muc nay): rui ro regression cao va vi pham quy tac "tranh refactor lan rong" trong CLAUDE.md -> de lai backlog.
- `BottomNav.jsx` hardcode rgba sang nen thanh nav giu tong sang trong dark mode (chap nhan duoc, khong vo giao dien).

### Kiem thu da chay
- `cd web; npm run build` -> build thanh cong.

### Cach test thu cong
1. Bat dark mode he dieu hanh/trinh duyet, mo app: nen, card, bong bong chat, input chuyen sang nen toi; chu de doc.
2. Tat dark mode: giao dien tro lai sang binh thuong.
3. Dung screen reader: gui cau hoi, xac nhan cau tra loi moi duoc doc len (aria-live vung chat).

## [2026-06-13] Nang cap UX chatbot Tro ly 35 - Dot 2

### Noi dung thuc hien
- Cap nhat `web/src/pages/TroLy35.jsx`:
  - Them component `AnalysisBlock` (gap/mo) hien thi `analysis` + `knowledge` backend tra ve nhung truoc day bi bo phi: badge do nguy hiem theo mau (`do_nguy_hiem` 1-5), Chu de, danh sach Luan diem sai / Thu doan / Canh bao an toan, va danh sach dan chung RAG (chuDe/phanBacChinh) kem link Nguon neu `nguon` la URL (`ExternalLink`).
  - Them badge nhan kiem duyet (`result.nhan_kiem_duyet`) hien rieng duoi dang canh bao mau vang, tach khoi noi dung chinh; sua `formatAnswer` de khong nhung `nhan_kiem_duyet` vao text nua (van giu `ghi_chu`).
  - Luu `analysis`/`knowledge` vao message assistant khi nhan ket qua `troly35_run`.
  - Persist phien chat hien tai vao `sessionStorage` key `troly35_chat_session` ({messages, mode}); khoi phuc khi mount (loc bo message dang pending); xoa khi clearChat hoac het message.
  - Them helper `loadChatSession`, `dangerColor`, `isUrl`, `AnalysisList`, hang so `DANGER_LABELS`, `CHAT_SESSION_KEY`.
  - Them import icon `ChevronDown/ChevronUp/ExternalLink/ShieldCheck`.

### Ly do
- Theo yeu cau nguoi dung: tiep tuc Dot 2 sau khi tao PR. Tan dung du lieu phan tich/RAG da co tu backend va giu phien chat khong mat khi reload.

### Rui ro va pham vi anh huong
- Chi anh huong frontend tab Tro ly 35.
- Khong doi API/schema/backend GAS. Du lieu `analysis`/`knowledge` da co san trong response `troly35_run`.
- Muc lich su (`openHistoryItem`) khong co analysis/knowledge nen `AnalysisBlock` tu an (return null) -> khong loi.
- `sessionStorage` chi song trong phien tab (an toan hon localStorage cho noi dung gated theo ma truy cap).

### Kiem thu da chay
- `cd web; npm run build` -> build thanh cong (TroLy35 chunk ~25kB).

### Cach test thu cong
1. `cd web; npm run dev`, tab Tro ly 35, nhap ma, gui cau hoi mode Phan bac/Kiem chung.
2. Kiem tra badge nhan kiem duyet mau vang, va nut "Phan tich & dan chung" gap/mo voi badge do nguy hiem + so dan chung.
3. Mo block: thay luan diem sai/thu doan/canh bao an toan va dan chung co link Nguon.
4. Reload trang (F5): hoi thoai van con (khoi phuc tu sessionStorage); bam xoa hoi thoai -> mat va sessionStorage bi xoa.

## [2026-06-13] Nang cap UX chatbot Tro ly 35 - Dot 1

### Noi dung thuc hien
- Doc brain (`04-current-tasks.md`, `06-ai-working-log.md`) va ghi ke hoach 3 dot nang cap chatbot/UI vao `docs/brain/04-current-tasks.md` truoc khi code.
- Them `web/src/lib/markdown.js`: renderer Markdown nhe, tu viet, khong them package Node moi. Ho tro heading (#..###), dam, nghieng, code inline, danh sach (-, *, 1.), blockquote, doan van. Output sanitize bang `dompurify` (da co san) voi allowlist tag/attr.
- Cap nhat `web/src/index.css`: them nhom style `.chat-markdown` cho noi dung render trong bong bong cau tra loi (p/h3-h5/ul/ol/li/strong/em/code/blockquote).
- Cap nhat `web/src/pages/TroLy35.jsx`:
  - `MessageText` render Markdown cho cau tra loi assistant; giu plain text cho tin nhan user va tin loi (prop `plain`).
  - Them `PendingIndicator` hien tien trinh theo buoc (Phan tich -> Tra cuu dan chung -> Soan noi dung) thay cho text "Dang tra loi..." tinh, khop 3 buoc backend.
  - Them `copyParts(mode, raw)` + hang nut "Copy" theo phan cho mode Phan bac (Ban day du/Comment ngan/Hashtag) va Viet bai (Bai viet/Caption MXH/Hashtag), lay tu `message.responseRaw`.
  - `copyText(text, label)` bao toast theo ten phan da copy.
  - Textarea nhap cau hoi ho tro phim tat Ctrl/Cmd+Enter de gui; cap nhat placeholder.

### Ly do
- Theo yeu cau nguoi dung: review du an va trien khai Dot 1 cai thien trai nghiem chatbot, uu tien viec gon - rui ro thap - hieu qua ngay.

### Rui ro va pham vi anh huong
- Chi anh huong frontend tab Tro ly 35 va file CSS dung chung.
- Khong doi API/schema/backend GAS, khong them dependency moi (dung `dompurify` san co).
- Markdown render qua `dangerouslySetInnerHTML` nhung da sanitize bang dompurify voi allowlist han che, khong cho attribute -> giam rui ro XSS.
- `package-lock.json` bi npm install lam nhieu metadata `peer` da duoc restore, khong commit.

### Kiem thu da chay
- `cd web; npm install; npm run build` -> build thanh cong (TroLy35 chunk ~21kB, sanitize chunk dompurify duoc tach rieng).

### Cach test thu cong
1. `cd web; npm run dev`, mo tab Tro ly 35, nhap ma truy cap.
2. Gui mot cau hoi mode Phan bac: kiem tra spinner doi text theo buoc; cau tra loi render dam/nghieng/danh sach; co hang nut Copy (Ban day du/Comment/Hashtag).
3. Doi sang mode Viet bai: kiem tra nut Copy (Bai viet/Caption MXH/Hashtag) copy dung tung phan.
4. Bam Ctrl+Enter trong o nhap de gui nhanh.
5. Mo lai mot muc trong Lich su: noi dung van hien dung (render Markdown an toan voi text thuong).

## [2026-06-12] Them Podcast am thanh cho sach Dai doan ket

### Noi dung thuc hien
- Tai file tu Google Drive cua nguoi dung (ID: `1omsBikggxFp_SaFekBNkIZlPvnRiqB2I`).
- Xac dinh file tải ve thuc chat la file am thanh `.m4a` chu khong phai anh (nguoi dung viet nham "postcard" thanh "postcard").
- Di chuyen va doi ten file thanh `podcast.m4a` va dat tai thu muc `web/public/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/podcast.m4a`.
- Cap nhat [web/src/pages/TuSach.jsx](file:///d:/05. Code/baovenentang/web/src/pages/TuSach.jsx):
  - Dinh nghia map `BOOK_AUDIOS` chua thong tin file am thanh.
  - Them hàm helper `getBookAudio(book)`.
  - Tich hop the `<audio>` controls de phat file audio trong phan Podcast cua modal chi tiet sach.
- Cap nhat [web/src/css/tusach.css](file:///d:/05. Code/baovenentang/web/src/css/tusach.css):
  - Them styling cho `.tusach-audio-player` de trinh phat hien thi dep mat va phu hop giao dien.
- Chay build thu nghiem frontend de xac nhan khong loi compilation.

### Ly do
- Theo yeu cau nguoi dung muon tich hop podcast am thanh cua sach Dai doan ket vao Tu sach so (nguoi dung viet nham tu podcast thanh postcard).

### Rui ro va pham vi anh huong
- Chi anh huong den giao dien chi tiet cua Tu sach so o frontend.
- Khong lam thay doi cấu trúc database Google Sheets hay logic backend Google Apps Script.

### Kiem thu da chay
- `cd web; npm run build` -> build thanh cong khong loi.

### Cach test thu cong
1. Chay dev server frontend local (`npm run dev`).
2. Truy cap Tu sach so, click chon sach "Phat huy truyen thong dai doan ket toan dan toc...".
3. Xac nhan trong phan Podcast co xuat hien trinh phat am thanh.
4. Bấm Play de nghe thu am thanh tu file `podcast.m4a` xem co phat binh thuong hay khong.

## [2026-06-12] Lam dep UI Tu sach va doi ten muc Hoc tap

### Noi dung thuc hien
- Doc lai toan bo `docs/brain/` truoc khi sua code theo quy uoc du an.
- Dung CodeGraph phan tich luong `HocTap` -> `TuSach` -> `getBooks`/`getBookById` va impact cua `TuSach` truoc khi sua UI. Rieng lan doi text cuoi, CodeGraph MCP dang bi `Transport closed`, nen chi doi literal heading mot dong trong `HocTap.jsx`.
- Cap nhat [web/src/pages/TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx):
  - Them thanh thong ke tong quan Tu sach: so tai lieu, chu de, hoc lieu truc quan, NotebookLM.
  - Lam card sach giau thong tin hon: bia sach, nam, badge NotebookLM/So do/Nguon, badge so anh neu co media.
  - Lam modal chi tiet rong va ro cau truc hon: header co bia, nut NotebookLM/Nguon o dau, thong tin tong quan, thu vien lien quan, tom tat nhanh, podcast va so do tu duy dang bang truc quan.
  - Dua sach `phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc` len dau danh sach bang sort frontend `FEATURED_BOOK_ID`, khong doi du lieu Google Sheets.
- Cap nhat [web/src/css/tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css):
  - Style thanh thong ke, card sach, badge, modal chi tiet, thu vien media, lightbox va mindmap board.
  - Bo sung responsive cho mobile.
- Cap nhat [web/src/pages/HocTap.jsx](file:///d:/Code/baovenentang/web/src/pages/HocTap.jsx):
  - Doi heading `Hoc tap Nghi quyet XIV` thanh `Tai lieu hoc tap`.

### Ly do
- Theo yeu cau nguoi dung: lam dep phan Tu sach truoc khi thiet ke `TU_SACH_MEDIA`; uu tien sach Dai doan ket len dau va doi ten muc hoc tap cho dung pham vi noi dung.

### Rui ro va pham vi anh huong
- Chi anh huong frontend UI `HocTap`/`TuSach`.
- Khong doi schema `TU_SACH`, khong them `TU_SACH_MEDIA`, khong doi action API `books`/`book`, khong can deploy lai Apps Script.
- Thu tu uu tien sach dang nam o frontend; neu sau nay can van hanh qua sheet thi nen chuyen sang cot/sheet cau hinh thu tu hien thi.

### Kiem thu da chay
- `cd web; npm run build` -> pass.
- Dev server local dang chay tai `http://127.0.0.1:5173/`; HTTP `/` tra `200 OK` trong qua trinh kiem tra.

### Cach test thu cong
1. Mo `http://127.0.0.1:5173/`.
2. Vao `Hoc tap` va xac nhan tieu de da doi thanh `Tai lieu hoc tap`.
3. Chon `Tu sach`, xac nhan sach `Phat huy truyen thong dai doan ket toan dan toc...` nam dau danh sach.
4. Mo chi tiet sach, xac nhan modal co thu vien lien quan, tom tat nhanh, podcast, so do tu duy va nut NotebookLM/Nguon.

---

## [2026-06-11] Gan so do tu duy va anh minh hoa cho sach Dai doan ket

### Noi dung thuc hien
- Doc lai `docs/brain/` va dung CodeGraph xem luong `TuSach.jsx`/`HocTap.jsx` truoc khi sua.
- Kiem tra folder Drive nguoi dung cung cap: `https://drive.google.com/drive/folders/1YgY9ttTC1j4bFU1gofkq1f7aHd_0nWJk`.
- Xac dinh 3 file cua sach `phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc`:
  - `Phat huy tinh than dai doan ket toan dan toc.png` -> so do tu duy, Drive ID `1k72x3VdROr8F_6byrh_7W5dLOjqPuhdB`.
  - `Sức_mạnh_đại_đoàn_kết.png` -> anh minh hoa, Drive ID `1stAPFHJ-UTRGjKJtqXjoHYr3kZLUYVeK`.
  - `Đại_đoàn_kết_năm_2045.png` -> anh minh hoa, Drive ID `1llSXEBEFZNRWeuDg-w0KCmzbz4Rfm9RY`.
- Tao media toi uu tai `web/public/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/`:
  - File full WebP: `mind-map.webp`, `suc-manh-dai-doan-ket.webp`, `dai-doan-ket-2045.webp`.
  - Thumbnail WebP trong `thumbs/`.
- Cap nhat [web/src/pages/TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx):
  - Them `BOOK_MEDIA` map theo `book.id`.
  - Modal chi tiet sach hien muc `So do tu duy & anh minh hoa`.
  - Bam thumbnail mo lightbox anh lon va co link mo anh goc tren Drive.
- Cap nhat [web/src/css/tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css): style media grid, lightbox anh lon, caption/link Drive.

### Ly do
- Theo yeu cau nguoi dung: truoc tien gan so do tu duy va anh minh hoa trong folder Drive vao sach `Phat huy truyen thong dai doan ket...` de nguoi dung bam xem trong chi tiet sach.

### Rui ro va pham vi anh huong
- Chi anh huong frontend `TuSach`; khong doi schema `TU_SACH`, khong doi API `books`/`book`, khong can deploy lai GAS.
- Media full la WebP toi uu, duoc tai khi nguoi dung bam xem; thumbnail nho duoc tai trong modal.
- Neu thay file Drive goc, can tao lai WebP/thumbnail hoac cap nhat `BOOK_MEDIA`.

### Kiem thu da chay
- `npm run build` trong `web` -> pass.
- Goi `http://127.0.0.1:5173/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/thumbs/mind-map.webp` -> `200 image/webp`.
- Xac nhan `web/dist/tusach-media/...` co du 3 file full va 3 thumbnail sau build.
- `node --check web/src/pages/TuSach.jsx` khong ap dung duoc vi Node bao khong nhan extension `.jsx`; Vite build da parse JSX thanh cong.

### Cach test thu cong
1. Chay `cd web && npm run dev`, mo `http://127.0.0.1:5173/`.
2. Vao `Hoc tap` -> `Tu sach`.
3. Mo sach `Phat huy truyen thong dai doan ket toan dan toc...`.
4. Xac nhan co muc `So do tu duy & anh minh hoa` voi 3 thumbnail.
5. Bam tung thumbnail, xac nhan lightbox hien anh lon va link `Mo anh goc tren Drive` mo dung file.

---

## [2026-06-11] Them bia sach va tang toc tai Tu sach

### Noi dung thuc hien
- Dung CodeGraph de xem luong `HocTap` -> `TuSach` -> `getBooks`/`getBookById` va blast radius truoc khi sua.
- Trich trang dau cua 5 PDF trong `data/` thanh anh bia JPG bang `pdftoppm`, sau do resize/nen bang Pillow.
- Them 5 anh bia static tai `web/public/tusach-covers/`, dung luong sau nen khoang 6-43KB/anh.
- Cap nhat [web/src/pages/TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx):
  - Map `book.id` sang anh bia static, khong doi schema sheet `TU_SACH`.
  - Hien bia tren card sach va phan dau modal chi tiet.
  - Skeleton loading co khung bia de tranh layout shift.
- Cap nhat [web/src/css/tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css): style cover, detail cover, skeleton cover va gioi han clamp tom tat tren card.
- Cap nhat [web/src/cache.js](file:///d:/Code/baovenentang/web/src/cache.js):
  - Them in-flight dedupe de nhieu noi goi cung cache key khong tao request trung.
  - Cho `cached()` nhan TTL tuy bien.
- Cap nhat [web/src/api.js](file:///d:/Code/baovenentang/web/src/api.js): `getBooks()` dung TTL 60 phut vi catalog Tu sach it thay doi.
- Cap nhat [web/src/pages/HocTap.jsx](file:///d:/Code/baovenentang/web/src/pages/HocTap.jsx): prefetch `getBooks()` khi vao tab Hoc tap bang `requestIdleCallback`/`setTimeout`, de khi bam `Tu sach` du lieu thuong da nam trong cache.

### Ly do
- Theo yeu cau nguoi dung: giao dien Tu sach can sinh dong hon bang bia sach trang dau va giam cam giac load cham khi mo danh muc.

### Rui ro va pham vi anh huong
- Chi anh huong frontend Tu sach/Hoc tap va cache client.
- Khong doi Google Sheets schema, khong deploy lai Apps Script, khong doi contract API `books`/`book`.
- Neu sau nay doi ID sach hoac thay PDF, can cap nhat lai file anh trong `web/public/tusach-covers/` va map `BOOK_COVERS`.
- TTL 60 phut giup mo nhanh hon nhung co the lam thay doi catalog moi tren sheet hien cham hon tren may nguoi dung da co cache; khi can co the bump cache key `books-v3`.

### Kiem thu da chay
- `npm run build` trong `web` -> pass.
- Goi `http://127.0.0.1:5173/tusach-covers/cam-nang-phong-chong-tin-gia.jpg` -> `200 image/jpeg`.
- Xac nhan 5 anh bia sau nen co dung luong: 7.8KB, 13.5KB, 33.8KB, 6.8KB, 42.6KB.

### Cach test thu cong
1. Chay `cd web && npm run dev`, mo `http://127.0.0.1:5173/`.
2. Vao `Hoc tap`; doi 1-2 giay de prefetch Tu sach chay nen.
3. Bam `Tu sach`, xac nhan danh sach hien 5 card co bia sach.
4. Bam tung card, xac nhan modal chi tiet co bia va cac nut NotebookLM/Nguon van dung.
5. Reload lai trang va vao lai `Hoc tap` -> `Tu sach`; danh sach phai hien nhanh hon nho localStorage cache.

---

## [2026-06-11] Sua loi dev server tra JS thay vi JSON cho /api/gas

### Noi dung thuc hien
- Re-check CodeGraph cho luong `web/src/api.js` -> `getBooks()` -> `API_URL` va `web/api/gas.js` de phan tach loi dev/prod.
- Xac nhan production `https://baovenentang.vercel.app/api/gas?action=books` van tra JSON dung, nen GAS deploy khong hong.
- Xac nhan local `npm run dev` dang loi do frontend dev fallback sang `/api/gas`, nhung Vite khong co route API nen tra ve ma JS cua file `web/api/gas.js`; client co parse JSON va vo voi thong bao `Unexpected token ... is not valid JSON`.
- Cap nhat [web/vite.config.js](file:///d:/Code/baovenentang/web/vite.config.js):
  - Them `gasDevGuardPlugin`.
  - Neu thieu `VITE_GAS_URL`, request `GET/POST /api/gas` trong Vite dev se tra JSON loi ro rang thay vi source JS/HTML.
- Cap nhat [web/src/api.js](file:///d:/Code/baovenentang/web/src/api.js):
  - Them `parseApiResponse()` dung chung cho GET/POST.
  - Neu backend/proxy tra noi dung khong phai JSON, UI se bao loi ro nguyen nhan va kem snippet response mau.
- Tao [web/.env.local](file:///d:/Code/baovenentang/web/.env.local) voi `VITE_GAS_URL` tro thang toi Web App `/exec` hien tai de local `npm run dev` tai duoc du lieu that ngay.

### Ly do
- Nguoi dung mo webapp bang `npm run dev` de xem thu Tui sach, nhung dev server khong co endpoint `/api/gas`. Loi hien tai de nguoi dung hieu nham la deploy GAS hong, trong khi production proxy va GAS van hoat dong binh thuong.

### Rui ro va pham vi anh huong
- Chi anh huong frontend dev experience va thong bao loi client.
- Them mot file env local trong `web/`; URL nay khong phai secret nhung can cap nhat neu doi Web App deployment URL.
- Khong doi contract production `/api/gas`, khong doi Apps Script, khong doi schema Google Sheet.
- Local dev da co `VITE_GAS_URL` mac dinh o `web/.env.local`; neu doi deployment URL thi can sua file nay.

### Kiem thu da chay
- `npm run build` trong `web` -> pass.
- Goi `http://127.0.0.1:5173/api/gas?action=books` khi KHONG co `VITE_GAS_URL` -> tra JSON loi co chu `Thieu VITE_GAS_URL...`, khong con tra source JS.
- Tao `web/.env.local`, restart `npm run dev`, sau do local frontend se goi thang Apps Script `/exec`.
- Goi production `https://baovenentang.vercel.app/api/gas?action=books` -> van tra JSON 5 tai lieu moi.

### Cach test thu cong
1. Xoa/khong tao `web/.env.local`, chay `cd web && npm run dev`.
2. Mo `Hoc tap` -> `Tu sach`; UI phai hien loi ro `Thieu VITE_GAS_URL...` thay vi `Unexpected token`.
3. Khoi phuc `web/.env.local`, restart dev server.
4. Reload trang va kiem tra `Tu sach` tai duoc 5 tai lieu moi.

---

## [2026-06-11] Cap nhat Tu sach tu 5 PDF tren Google Drive

### Noi dung thuc hien
- Doc lai toan bo `docs/brain/` va re-check CodeGraph cho luong `TU_SACH` truoc khi sua.
- Dung MarkItDown de chuyen 5 PDF trong `data/` sang Markdown tai `data/tusach-md/`:
  - `Cam_nang_phong_chong_tin_gia.md`
  - `Bao_ve_nen_tang_tu_tuong_cua_Dang_trong_tinh_hinh_moi.md`
  - `tang_cuong_ct_XDD_cong_an.md`
  - `phat_huy_suc_manh_toàn_dan_toc.md`
  - `Sach_Phat_huy_truyen_thong_dai_doan_ket.md`
- Tao file du phong `data/tusach_import.csv` gom 5 dong theo dung schema 12 cot cua sheet `TU_SACH`.
- Cap nhat [backend/08-tusach.gs](file:///d:/Code/baovenentang/backend/08-tusach.gs):
  - Doi `TU_SACH_NOTEBOOK_URL` sang NotebookLM chung `https://notebooklm.google.com/notebook/ee1792f7-45ff-4952-9ce6-50cc1cd4ad1a`.
  - Thay 10 tai lieu mau cu bang 5 tai lieu moi tu Drive.
  - Them `TU_SACH_LEGACY_SAMPLE_IDS` va `replaceTuSachWithSampleBooks()` de tu dong thay sheet neu phat hien du lieu mau cu.
- Cap nhat [web/src/api.js](file:///d:/Code/baovenentang/web/src/api.js): doi cache key `books-v2` thanh `books-v3` de tranh hien catalog cu tu localStorage.
- Cap nhat [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md), [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md), [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md): ghi nhan mo hinh mot NotebookLM chung, nguoi dung chon/tich dung nguon trong NotebookLM.
- Deploy Apps Script:
  - `npx @google/clasp push --force` -> pushed 17 files.
  - `npx @google/clasp deploy --deploymentId AKfycbzJ41UZaeQjWFPwk-v6IJYdOZoxMxPSrM7XWK9W-psMEph173IUo9Jq2NWAhU2NQriFzg --description "Update Tu Sach catalog from Drive PDFs"` -> deployment `@24`.
- Goi production `?action=books` sau deploy de `seedTuSach()` thay du lieu cu trong Google Sheet `TU_SACH`; ket qua tra ve 5 tai lieu moi.

### Ly do
- Theo yeu cau nguoi dung: bo toan bo du lieu Tu sach mau cu, dua cac sach/PDF moi tren Drive vao webapp, va dung mot NotebookLM chung de nguoi dung chon nguon tai lieu can hoi.

### Rui ro va pham vi anh huong
- Anh huong truc tiep den du lieu `TU_SACH`, seed backend `08-tusach.gs`, action public GET `books`/`book`, va cache danh sach sach frontend.
- Khong doi schema Google Sheets, khong doi contract response `books`/`book`, khong bat lai `ask_book`.
- `replaceTuSachWithSampleBooks()` se thay noi dung sheet neu phat hien ID mau cu; neu sheet sau nay co du lieu tuy bien can giu, khong nen dua cac legacy ID cu vao lai.
- Markdown/PDF trong `data/` la artifact ho tro doc va import, co kich thuoc lon; can quyet dinh rieng truoc khi commit.

### Kiem thu da chay
- `Get-Content -Raw -Encoding UTF8 backend\08-tusach.gs | node --check -` -> pass.
- `Get-Content -Raw -Encoding UTF8 backend\07-main.gs | node --check -` -> pass.
- `node --check web/src/api.js` -> pass.
- Production `?action=books` -> `success: true`, `count: 5`, ca 5 tai lieu deu dung NotebookLM chung.

### Cach test thu cong
1. Mo webapp -> `Hoc tap` -> `Tu sach`.
2. Xac nhan danh sach chi con 5 tai lieu moi:
   - Cam nang phong chong tin gia, tin sai su that tren khong gian mang.
   - Bao ve nen tang tu tuong cua Dang trong tinh hinh moi.
   - Tang cuong xay dung Dang trong Cong an nhan dan theo Di chuc cua Chu tich Ho Chi Minh.
   - Phat huy suc manh toan dan toc bao ve an ninh quoc gia trong tinh hinh moi.
   - Phat huy truyen thong dai doan ket toan dan toc, xay dung dat nuoc ta ngay cang giau manh, van minh, hanh phuc.
3. Mo chi tiet tung tai lieu, kiem tra nut NotebookLM deu tro toi link chung va nut nguon mo dung file Google Drive.
4. Neu trinh duyet van hien du lieu cu, reload sau it nhat 5 phut hoac xoa localStorage key `bvnt_books-v2`; frontend moi dung key `books-v3`.

---

## [2026-06-10] Sua modal chi tiet Tu sach bi tut xuong duoi viewport

### Noi dung thuc hien
- Dung CodeGraph de xac dinh luong lien quan: [HocTap.jsx](file:///d:/Code/baovenentang/web/src/pages/HocTap.jsx) render [TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx) o che do embedded; modal chi tiet nam trong `detailBook`.
- Cap nhat [TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx): render modal chi tiet bang `createPortal(..., document.body)` de backdrop `position: fixed` bam truc tiep viewport, khong bi ancestor cua tab anh huong.
- Cap nhat [tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css): can giua modal, gioi han chieu cao modal theo viewport va chan overscroll trong modal.
- Cap nhat [index.css](file:///d:/Code/baovenentang/web/src/index.css): khoa scroll body khi modal mo; bo transform/filter/will-change tren `.tab-panel.active` de tranh tao containing block cho overlay.

### Ly do
- Khi `TuSach` nam trong tab `Hoc tap`, CSS animation cua `.tab-panel` co the lam phan tu `position: fixed` bi tinh theo ancestor thay vi viewport. Vi vay modal bi hien lech xuong duoi, nguoi dung phai keo moi thay day modal.
- Portal dua modal ra `body`, la cach on dinh hon cho overlay dung chung trong cac tab/page embedded.

### Rui ro va pham vi anh huong
- Chi anh huong frontend UI cua modal chi tiet sach va active tab panel.
- Khong doi API, backend, Google Sheets schema hoac du lieu `TU_SACH`.
- Active tab khong con giu transform/filter o trang thai da hien thi; transition vao tab van con o trang thai inactive.

### Kiem thu da chay
- `cd web; npm run build` -> pass.
- `codegraph sync` -> pass.
- In-app browser tai `http://127.0.0.1:5173/`: mo `Hoc tap` -> `Tu sach` -> `Hien phap`; modal co parent `BODY`, backdrop `fixed`, viewport cao 794px, modal top 49px, bottom 668px, `fullyWithinViewport: true`.

### Cach test thu cong
1. Refresh `http://127.0.0.1:5173/`.
2. Mo `Hoc tap` -> `Tu sach`.
3. Bam sach `Hien phap nuoc CHXHCN Viet Nam nam 2013`.
4. Xac nhan modal hien ngay trong man hinh, khong can keo xuong moi thay noi dung chinh hoac nut dong.

---

## [2026-06-10] Gộp Tủ sách và Sổ tay AI vào tab Học tập

### Nội dung thực hiện
- Cập nhật [App.jsx](file:///d:/Code/baovenentang/web/src/App.jsx): gỡ route/page lazy `tu-sach` và `so-tay-ai` khỏi bottom nav, giữ 3 page chính `tin-tuc`, `troly35`, `hoc-tap`.
- Cập nhật [BottomNav.jsx](file:///d:/Code/baovenentang/web/src/components/BottomNav.jsx): bottom nav còn 3 mục `Tin tức`, `Trợ lý 35`, `Học tập`.
- Cập nhật [HocTap.jsx](file:///d:/Code/baovenentang/web/src/pages/HocTap.jsx): thêm mục con `Tủ sách` cạnh Video, Infographic và Kiểm tra; render `TuSach` ở chế độ embedded.
- Cập nhật [TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx): hỗ trợ prop `embedded` để dùng lại nội dung Tủ sách trong tab Học tập mà không lặp hero trang riêng.
- Xóa [SoTayAI.jsx](file:///d:/Code/baovenentang/web/src/pages/SoTayAI.jsx) vì NotebookLM không còn là page độc lập.
- Cập nhật [index.css](file:///d:/Code/baovenentang/web/src/index.css) và [tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css) cho layout 4 mục học tập và trạng thái nhúng Tủ sách.
- Cập nhật [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md), [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md), [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) để ghi nhận luồng điều hướng mới.

### Lý do
- Theo yêu cầu người dùng: `Tủ sách` và `Sổ tay AI` bị trùng nội dung, nên gộp thành một mục `Tủ sách` trong `Học tập` để bottom nav cân đối hơn.
- NotebookLM vẫn được giữ theo từng tài liệu qua trường `TU_SACH.NotebookLM URL`; chỉ thay đổi điểm vào UI, không đổi contract API hoặc schema Google Sheets.

### Rủi ro và phạm vi ảnh hưởng
- Ảnh hưởng frontend navigation và layout tab Học tập.
- Người dùng quen mở `Sổ tay AI` ở bottom nav sẽ cần vào `Học tập` -> `Tủ sách`.
- Không đổi backend, không đổi dữ liệu `TU_SACH`, không đổi action `books`/`book`/`ask_book`.

### Kiểm thử đã chạy
- `cd web; npm run build` -> pass.
- `rg` xác nhận không còn route/import/source CSS cũ `so-tay-ai`/`SoTayAI`/`.sotay-*` trong `web/src`.
- `codegraph sync` đã chạy sau thay đổi source.
- In-app browser tại `http://127.0.0.1:5173/` xác nhận bottom nav còn 3 mục; `Học tập` có 4 mục con Video, Infographic, Kiểm tra, Tủ sách; chọn `Tủ sách` render nội dung `TuSach` ở chế độ embedded.

### Cách test thủ công
1. Refresh trang local `http://127.0.0.1:5173/`.
2. Xác nhận bottom nav còn 3 mục: `Tin tức`, `Trợ lý 35`, `Học tập`.
3. Mở `Học tập`, chọn mục `Tủ sách`; danh mục tài liệu hiển thị cùng nhóm với Video, Infographic và Kiểm tra.
4. Mở chi tiết một tài liệu có `NotebookLM URL`, xác nhận vẫn có thể mở NotebookLM từ modal chi tiết.

---

## [2026-06-10] Gỡ khối "Hỏi đáp tài liệu" khỏi tab Tủ sách

### Nội dung thực hiện
- Dùng CodeGraph xác định khối UI cần gỡ nằm trong [TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx) tại section `tusach-ask`.
- Xóa toàn bộ section hiển thị:
  - tiêu đề `Hỏi đáp tài liệu`
  - thông báo "Tính năng hỏi đáp AI trực tiếp đang tạm tắt..."
  - nút `Hỏi đáp qua NotebookLM`
- Giữ nguyên modal chi tiết tài liệu và link `NotebookLM` trong modal để người dùng vẫn mở notebook theo từng tài liệu.

### Lý do
- Theo yêu cầu người dùng: bỏ hoàn toàn khối trung gian trên trang `Tủ sách`, tránh lặp nội dung với modal chi tiết và làm giao diện gọn hơn.

### Rủi ro và phạm vi ảnh hưởng
- Chỉ ảnh hưởng UI frontend của tab `Tủ sách`.
- Không đổi API, không đổi dữ liệu `TU_SACH`, không đổi hành vi modal chi tiết.
- Link `NotebookLM` vẫn còn trong modal chi tiết; người dùng cần mở chi tiết tài liệu để truy cập.

### Kiểm thử đã chạy
- `cd web; npm run build` → pass.
- `rg` trong `web/src/pages/TuSach.jsx` xác nhận không còn chuỗi `Hỏi đáp tài liệu`, `Hỏi đáp qua NotebookLM`, `Tính năng hỏi đáp AI trực tiếp đang tạm tắt`.
- Đã thử xác minh tự động bằng browser automation nhưng môi trường REPL hiện thiếu `playwright-core`, nên không chụp được ảnh xác minh runtime.

### Cách test thủ công
1. Refresh trang local `http://127.0.0.1:5173/`.
2. Mở tab `Tủ sách`.
3. Xác nhận khối `Hỏi đáp tài liệu` không còn xuất hiện giữa danh mục và modal chi tiết.

---

## [2026-06-10] Hoàn thành SEC-3 - Làm rõ rate-limit proxy serverless

### Nội dung thực hiện
- Chọn phương án B trong backlog: giữ `Map` in-memory ở [web/api/gas.js](file:///d:/Code/baovenentang/web/api/gas.js) làm rate-limit best-effort, không thêm Redis/KV/dependency mới.
- Thêm ghi chú trực tiếp trong code proxy: rate-limit này chỉ best-effort trên serverless, chặn chi phí thật phải nằm ở GAS quota.
- Cập nhật [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md), [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md), [07-refactor-backlog.md](file:///d:/Code/baovenentang/docs/brain/07-refactor-backlog.md).

### Lý do
- Vercel serverless có thể tạo nhiều instance; `Map` memory không phải rate-limit cứng. Ghi rõ giới hạn này giúp không nhầm proxy là hàng rào chống lạm dụng chi phí.

### Rủi ro và phạm vi ảnh hưởng
- Không đổi hành vi runtime, chỉ thêm comment/tài liệu.
- Endpoint tốn chi phí vẫn phải dùng guard backend: `troly35_run` hiện có quota; `ask_book` vẫn tạm tắt cho tới khi bổ sung quota riêng nếu muốn bật lại.

### Kiểm thử
- Kiểm tra cú pháp proxy trong đợt test tổng hợp: `node --check web/api/gas.js`.

---

## [2026-06-10] Hoàn thành REF-1 - Tách cache frontend khỏi `api.js`

### Nội dung thực hiện
- Dùng CodeGraph trước khi sửa:
  - `cached` có 3 caller: `getArticles`, `getStats`, `getBooks` trong `web/src/api.js`.
  - `invalidateCache` hiện không có caller nhưng là export public từ `api.js`, cần giữ contract.
  - Impact của `cached` chỉ nằm trong `web/src/api.js`.
- Thêm [web/src/cache.js](file:///d:/Code/baovenentang/web/src/cache.js):
  - Chuyển nguyên logic localStorage cache/SWR (`cacheGet`, `cacheSet`, `cacheTrim`, `cached`, `invalidateCache`) ra module riêng.
- Cập nhật [web/src/api.js](file:///d:/Code/baovenentang/web/src/api.js):
  - Import `cached` từ `cache.js`.
  - Re-export `invalidateCache` để giữ nguyên API module hiện có.
  - Giữ nguyên cache key và chữ ký `cached(key, fetcher)`.
- Cập nhật [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) và [07-refactor-backlog.md](file:///d:/Code/baovenentang/docs/brain/07-refactor-backlog.md).

### Lý do
- Giảm trách nhiệm của `web/src/api.js`: file này chỉ còn cấu hình URL và wrappers API, còn cache nằm ở module chuyên trách.

### Rủi ro và phạm vi ảnh hưởng
- Ảnh hưởng trực tiếp tới các GET có cache: `getArticles`, `getStats`, `getBooks`.
- Không đổi API endpoint, payload, response hoặc cache key.
- `invalidateCache` vẫn export qua `api.js`, nên caller hiện tại/tương lai không cần đổi import.

### Kiểm thử đã chạy
- `node --check web/src/cache.js; node --check web/src/api.js` → pass.
- `cd web; npm run build` → pass (`vite build`, 1605 modules transformed).
- `rg` xác nhận cache internals chỉ còn ở `web/src/cache.js`, không còn trong `web/src/api.js`.

### Cách test thủ công
1. `cd web; npm run dev`.
2. Mở các tab dùng cache: `Tin tức`, `Tủ sách`, `Sổ tay AI`.
3. Reload trang và xác nhận dữ liệu đã tải không lỗi; nếu cần clear cache thì gọi `invalidateCache()` từ module `api.js` như trước.

---

## [2026-06-10] Hoàn thành SEC-1/SEC-4/SEC-5 - Hardening proxy/client API

### Nội dung thực hiện
- Dùng CodeGraph phân tích impact trước khi sửa:
  - `postApi` ảnh hưởng 8 wrapper frontend (`subscribe`, `submitQuiz`, `runTroLy35`, `rateTroLy35`, `getTroLy35History`, `getTrends`, `sendFeedback`, `askBookAI`) và các page gọi wrapper.
  - `authorizeAction` chỉ ảnh hưởng `handler` trong `web/api/gas.js`.
  - `doGet`/`doPost` trong `backend/07-main.gs` được dùng để đóng băng contract action hiện tại.
- Cập nhật [web/src/api.js](file:///d:/Code/baovenentang/web/src/api.js):
  - Bỏ URL Apps Script `/exec` hardcode khỏi client.
  - Production dùng `/api/gas`; dev dùng `VITE_GAS_URL` nếu cần, fallback an toàn là `/api/gas`.
  - Gỡ `API_TOKEN`/`VITE_API_TOKEN`; client không còn tự gửi `api_token` hoặc header `X-Api-Token`.
- Cập nhật [web/api/gas.js](file:///d:/Code/baovenentang/web/api/gas.js):
  - Thêm `IP_HASH_SALT` bắt buộc; thiếu salt thì proxy trả lỗi cấu hình, không fallback sang token hoặc chuỗi mặc định.
  - Đưa `video_export` vào nhóm `ADMIN_ACTIONS` để khớp backend `doGet` đang yêu cầu `validateApiToken_`.
- Cập nhật tài liệu:
  - [README.md](file:///d:/Code/baovenentang/README.md) và [backend/README.md](file:///d:/Code/baovenentang/backend/README.md): env bắt buộc, cấm `VITE_API_TOKEN`, ghi `VITE_GAS_URL` chỉ là URL dev.
  - [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md): thêm bảng policy endpoint public/token/admin/tạm tắt.
  - [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md): ghi quyết định cập nhật proxy ngày 2026-06-10.
  - [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) và [07-refactor-backlog.md](file:///d:/Code/baovenentang/docs/brain/07-refactor-backlog.md): đánh dấu SEC-1/SEC-4/SEC-5 hoàn thành.

### Lý do
- Giảm rủi ro lộ Apps Script deployment URL trong frontend bundle.
- Loại bỏ hiểu nhầm rằng `VITE_API_TOKEN` có thể dùng làm secret.
- Bắt buộc salt ổn định/khó đoán cho hash IP trước khi gửi sang Apps Script.
- Đồng bộ policy admin giữa proxy và backend cho `video_export`.

### Rủi ro và phạm vi ảnh hưởng
- Ảnh hưởng trực tiếp tới mọi request frontend qua `API_URL` và mọi request proxy cần `clientIpHash`.
- Khi chạy `npm run dev` thuần Vite mà không có `VITE_GAS_URL` hoặc một proxy local cho `/api/gas`, request API sẽ không tới Apps Script như trước. Cách chạy dev gọi Apps Script trực tiếp là đặt `VITE_GAS_URL=<Apps Script /exec URL>`.
- Vercel production bắt buộc có `IP_HASH_SALT`; nếu thiếu sẽ fail-fast 500 thay vì âm thầm dùng fallback yếu.
- Không đổi tên action, payload hoặc response backend.

### Kiểm thử đã chạy
- `node --check web/api/gas.js` → pass.
- Mock handler proxy với `GAS_DEPLOYMENT_URL` có giá trị và thiếu `IP_HASH_SALT` → trả `500 {"success":false,"error":"IP hash salt not configured"}`.
- `cd web; npm run build` → pass (`vite build`, 1604 modules transformed).
- `rg` trong `web/src` và `web/api` → không còn `VITE_API_TOKEN`, URL Apps Script hardcode, fallback `'bvnt'` hoặc fallback salt qua `process.env.IP_HASH_SALT ||`.
- `rg` trong `web/dist` → không tìm thấy `VITE_API_TOKEN`, URL Apps Script hardcode, `api_token` hoặc `X-Api-Token`.

### Cách test thủ công
1. Trên Vercel, cấu hình `GAS_DEPLOYMENT_URL`, `GAS_API_TOKEN`/`API_ACCESS_TOKEN`, `ADMIN_API_TOKEN` nếu tách riêng và `IP_HASH_SALT`; redeploy.
2. Gọi GET public qua `/api/gas?action=today` xác nhận vẫn trả dữ liệu.
3. Gọi admin action như `/api/gas?action=feedback_stats` không có admin token phải trả 401; có `X-Api-Token: <ADMIN_API_TOKEN>` phải được proxy inject token GAS.
4. Local dev nếu cần gọi Apps Script trực tiếp: đặt `VITE_GAS_URL` rồi chạy `cd web; npm run dev`.

---

## [2026-06-10] Hoàn thành TOOL-1 - CodeGraph index file `.gs`

### Nội dung thực hiện
- Dùng CodeGraph xác nhận trạng thái trước thay đổi: chỉ index 45 file với language `javascript/jsx/python`, chưa có `backend/*.gs`; `codegraph_search handleTroLy35Run` không trả kết quả backend.
- Kiểm tra CodeGraph CLI/package local và xác định điểm chọn source file nằm ở `EXTENSION_MAP` trong bundle CodeGraph global local.
- Thêm mapping `.gs` → `javascript` trong bundle CodeGraph global local:
  - `C:/Users/admin/AppData/Roaming/npm/node_modules/@colbymchenry/codegraph/node_modules/@colbymchenry/codegraph-win32-x64/lib/dist/extraction/grammars.js`
- Chạy `codegraph index --force`; CodeGraph hiện index 61 file, 1.210 nodes, 2.664 edges, trong đó `backend/` có 16 file `.gs` được nhận là `javascript`.
- Cập nhật [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) và [07-refactor-backlog.md](file:///d:/Code/baovenentang/docs/brain/07-refactor-backlog.md) để đánh dấu TOOL-1 hoàn thành.

### Lý do
- Gỡ điểm mù backend trước khi thực hiện các task SEC/REF. Từ nay có thể dùng `codegraph_search`, `codegraph_callers`, `codegraph_callees` và `codegraph_impact` cho các symbol Google Apps Script như `doPost`, `handleTroLy35Run`, `validateApiToken_`.

### Rủi ro và phạm vi ảnh hưởng
- Không thay đổi mã runtime của frontend/backend/video.
- Có thay đổi tooling ngoài repo trong gói CodeGraph cài global trên máy local. Nếu nâng cấp/cài lại CodeGraph, mapping `.gs` có thể mất và cần áp lại rồi chạy `codegraph index --force`.
- Working tree trước khi làm đã có nhiều thay đổi/untracked file; chỉ cập nhật tài liệu brain trong repo ở bước này.

### Kiểm thử đã chạy
- `codegraph index --force` → pass, index 61 files.
- `codegraph_status` → languages gồm `javascript: 19`, `jsx: 12`, `python: 30`.
- `codegraph_files path=backend` → thấy 16 file `.gs` trong `backend/`.
- `codegraph_search doPost` → trả `backend/07-main.gs:268`.
- `codegraph_search handleTroLy35Run` → trả `backend/08-troly35.gs:189`.
- `codegraph_search askBookAI` → trả cả `web/src/api.js:136` và `backend/08-tusach.gs:168`.
- `codegraph_callers handleTroLy35Run` → caller `doPost`.
- `codegraph_impact validateApiToken_` → impact `validateApiToken_`, `doGet`, `doPost`, `backend/07-main.gs`.

### Cách kiểm tra lại
```powershell
codegraph status
codegraph files --filter backend
codegraph query doPost
codegraph callers handleTroLy35Run
codegraph impact validateApiToken_
```

---

## [2026-06-09] Tạo backlog refactor & hardening chi tiết từ review kiến trúc

### Nội dung thực hiện
- Tạo [07-refactor-backlog.md](file:///d:/Code/baovenentang/docs/brain/07-refactor-backlog.md): 14 task card (TOOL-1, SEC-1..6, REF-1..7) cho các đề xuất còn lại của review 2026-06-09. Mỗi card có: ưu tiên, phụ thuộc, file/symbol liên quan, checklist **"trước khi code"** (phân tích tác động CodeGraph, đóng băng contract, rollback), các bước, kiểm thử và tiêu chí hoàn thành. Kèm template chung "trước khi code" và bảng tổng hợp ưu tiên.
- Đăng ký 14 task tương ứng vào task list của phiên làm việc (TaskCreate #1–#14).
- Cập nhật [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md): trỏ tới backlog chi tiết và đánh dấu việc tạm tắt Tủ sách AI đã xong.

### Lý do
- Theo yêu cầu người dùng: từ bản review, lập task + hướng dẫn chi tiết cần làm **trước khi code**, đúng quy trình bắt buộc trong `CLAUDE.md`.

### Rủi ro và phạm vi ảnh hưởng
- Chỉ thêm tài liệu brain + task tracking; **không** thay đổi mã nguồn runtime.
- Lưu ý điểm mù: CodeGraph chưa index `.gs` (task TOOL-1) nên impact analysis backend hiện phải dùng Grep cho tới khi TOOL-1 xong.

### Cách kiểm tra
- Đọc `docs/brain/07-refactor-backlog.md` xác nhận đủ 14 task card + bảng ưu tiên.
- `TaskList` hiển thị 14 task TOOL-1/SEC/REF.

---

## [2026-06-09] Tạm tắt hỏi đáp AI trực tiếp trong Tủ sách

### Nội dung thực hiện
- Dùng CodeGraph xác định `askBookAI` chỉ được dùng trong `web/src/pages/TuSach.jsx`; backend `.gs` không nằm trong index nên đọc trực tiếp `07-main.gs`, `08-tusach.gs`.
- Frontend [TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx):
  - Gỡ import `askBookAI` và các icon chỉ dùng cho form hỏi đáp (`RefreshCw`, `Send`, `Sparkles`).
  - Gỡ state `question/answer/askLoading/askError`, hàm `handleAsk` và helper `getPostData`.
  - Thay section "Hỏi đáp AI" bằng ghi chú + nút mở NotebookLM theo cuốn đang chọn.
- Backend [07-main.gs](file:///d:/Code/baovenentang/backend/07-main.gs): `case 'ask_book'` trả `{ success: false, error: '... đang tạm tắt ...' }`, không còn gọi `askBookAI`.
- Giữ nguyên hàm `askBookAI`, schema và sheet `TU_SACH` trong [08-tusach.gs](file:///d:/Code/baovenentang/backend/08-tusach.gs) để bật lại nhanh.
- Cập nhật [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md), [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md).

### Lý do sửa
- Theo yêu cầu người dùng: tạm tắt chat AI RAG trực tiếp của Tủ sách, chỉ cho dùng qua link NotebookLM.
- Đồng thời giảm rủi ro endpoint `ask_book` public chưa có quota (phát hiện trong review kiến trúc 2026-06-09).

### Rủi ro và phạm vi ảnh hưởng
- Ảnh hưởng: UI tab `Tủ sách` và action POST `ask_book`. Không đổi schema sheet, không đổi action `books`/`book`.
- `ask_book` vẫn là action hợp lệ nhưng nay luôn trả lỗi "tạm tắt"; client cũ gọi action này sẽ nhận thông báo thay vì câu trả lời.
- `askBookAI` trong `api.js` còn export nhưng không còn caller (giữ lại để re-enable).
- Cần `clasp push` lại backend thì thay đổi `ask_book` mới có hiệu lực trên production.

### Kiểm thử đã chạy
- Build frontend: `cd web; npm run build` → pass (`✓ built`), chunk `TuSach` build bình thường.
- Kiểm tra không còn tham chiếu mồ côi trong `TuSach.jsx` (grep `askBookAI/getPostData/handleAsk/Sparkles/...` → no matches).
- Kiểm tra cú pháp GAS (copy `.gs` sang `.js` rồi `node --check`): `07-main.gs OK`, `08-tusach.gs OK`.

### Cách test thủ công
1. `cd web; npm run dev`, mở tab `Tủ sách`: không còn ô nhập "Hỏi AI"; có nút "Hỏi đáp qua NotebookLM" khi chọn cuốn có `notebookUrl`.
2. Mở chi tiết một cuốn, bấm link NotebookLM/nguồn vẫn hoạt động.
3. (Sau khi `clasp push`) POST `ask_book` trả `success=false` với thông báo tạm tắt.

---

## [2026-06-08] Tách Sổ tay AI thành tính năng NotebookLM riêng

### Nội dung thực hiện
- Dùng CodeGraph để xác định phạm vi ảnh hưởng của `BottomNav`, `HocTap`, `TuSach`, `NotebookPanel` và `PAGES`.
- Cập nhật frontend:
  - [App.jsx](file:///d:/Code/baovenentang/web/src/App.jsx): thêm page lazy `SoTayAI` và route tab `so-tay-ai`.
  - [BottomNav.jsx](file:///d:/Code/baovenentang/web/src/components/BottomNav.jsx): thêm tab `Sổ tay AI`, sắp xếp bottom nav thành 5 mục để `Trợ lý 35` nằm giữa.
  - [HocTap.jsx](file:///d:/Code/baovenentang/web/src/pages/HocTap.jsx): bỏ tab con `Sổ tay AI`, giữ `Học tập` cho video, infographic và kiểm tra.
  - [SoTayAI.jsx](file:///d:/Code/baovenentang/web/src/pages/SoTayAI.jsx): thêm màn hình riêng hiển thị các tài liệu có `notebookUrl` và mở NotebookLM theo từng cuốn.
  - [tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css) và [index.css](file:///d:/Code/baovenentang/web/src/index.css): bổ sung style trang `Sổ tay AI` và chỉnh tabs học tập còn 3 mục.
- Cập nhật [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md), [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md), [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md).
- Bổ sung validate response trong [api.js](file:///d:/Code/baovenentang/web/src/api.js) cho `getBooks`: nếu Apps Script chưa deploy action `books` và trả payload endpoint chung, UI sẽ báo lỗi backend chưa sẵn sàng thay vì hiển thị nhầm `Không có tài liệu phù hợp`.
- Đổi cache key sách từ `books-v1` sang `books-v2` để bỏ qua cache localStorage chứa payload sai cũ.

### Lý do sửa
- Tách rõ `Tủ sách` là catalog/hỏi đáp AI theo tóm tắt, còn `Sổ tay AI` là điểm vào NotebookLM chuyên sâu.
- Chọn mô hình mỗi cuốn/tài liệu có `NotebookLM URL` riêng để giảm nhiễu ngữ cảnh, dễ chia sẻ/phân quyền và dễ cập nhật từng nguồn.

### Rủi ro và phạm vi ảnh hưởng
- Ảnh hưởng trực tiếp tới điều hướng frontend và UI `Học tập`; không thay đổi backend, API contract hoặc cấu trúc sheet.
- Dữ liệu seed hiện có thể vẫn dùng chung một URL NotebookLM mẫu. Khi vận hành thật cần cập nhật từng dòng `TU_SACH.NotebookLM URL` sang link riêng của tài liệu đó.
- Nếu có tài liệu nhạy cảm, cần kiểm tra quyền chia sẻ NotebookLM trước khi đưa link vào sheet.
- Khi frontend local vẫn trỏ tới Apps Script cũ chưa có `books`/`book`/`ask_book`, Tủ sách sẽ báo cần deploy backend mới và chạy `setupSystem()`.

### Kiểm thử đã chạy
- Build frontend:
  ```powershell
  cd web
  npm run build
  ```
- Khởi động dev server local và xác nhận HTTP 200 tại `http://127.0.0.1:5173/`.
- Kiểm tra trực tiếp endpoint dev `?action=books`: Apps Script hiện tại chưa liệt kê action `books`, xác nhận nguyên nhân dữ liệu rỗng là backend cloud chưa được deploy/cập nhật.
- Đã thử kiểm tra bằng Browser plugin nhưng webview attach bị timeout do lỗi runtime/plugin; không có tín hiệu lỗi từ build hoặc dev server.
- Deploy backend Apps Script:
  ```powershell
  cd backend
  npx @google/clasp push --force
  npx @google/clasp deploy --deploymentId AKfycbzJ41UZaeQjWFPwk-v6IJYdOZoxMxPSrM7XWK9W-psMEph173IUo9Jq2NWAhU2NQriFzg --description "Deploy Tu Sach and So Tay AI support"
  ```
- Deployment đang dùng bởi frontend đã lên version `@23`. Kiểm tra `?action=books` trả `success=True`, `count=10`.
- `clasp run setupSystem` không chạy được vì Apps Script project chưa deploy dưới dạng API executable. Riêng `TU_SACH` đã được tạo/seed qua `seedTuSach()` khi gọi action `books`; nếu cần tạo lại toàn bộ trigger hệ thống thì chạy `setupSystem()` trong Apps Script Editor.

### Cách test thủ công
1. Mở frontend local:
   ```powershell
   cd web
   npm run dev
   ```
2. Kiểm tra bottom nav có 5 mục: `Tin tức`, `Học tập`, `Trợ lý 35`, `Tủ sách`, `Sổ tay AI`.
3. Vào `Học tập`, xác nhận chỉ còn `Video`, `Infographic`, `Kiểm tra`.
4. Vào `Sổ tay AI`, xác nhận danh sách NotebookLM lấy từ `TU_SACH.NotebookLM URL`; bấm `Mở NotebookLM` mở đúng link của tài liệu.

---

## [2026-06-08] Triển khai MVP Tủ sách số AI

### Nội dung thực hiện
- Dùng CodeGraph để xác định entry point liên quan: `web/src/App.jsx`, `web/src/components/BottomNav.jsx`, `web/src/api.js`, `backend/07-main.gs`, `backend/04-sheets-db.gs` và helper Gemini `callGeminiAPI`.
- Thêm module backend [08-tusach.gs](file:///d:/Code/baovenentang/backend/08-tusach.gs) với `getBooks`, `getBookById`, `askBookAI`, `seedTuSach` và 10 tài liệu/văn bản mẫu hợp pháp.
- Cập nhật [04-sheets-db.gs](file:///d:/Code/baovenentang/backend/04-sheets-db.gs) để tạo sheet `TU_SACH`.
- Cập nhật [07-main.gs](file:///d:/Code/baovenentang/backend/07-main.gs) để thêm GET action `books`, `book`, POST action `ask_book` và gọi `seedTuSach()` trong `setupSystem()`.
- Cập nhật frontend React:
  - [api.js](file:///d:/Code/baovenentang/web/src/api.js): thêm helper `getBooks`, `getBookById`, `askBookAI`.
  - [App.jsx](file:///d:/Code/baovenentang/web/src/App.jsx): thêm page lazy `TuSach`.
  - [BottomNav.jsx](file:///d:/Code/baovenentang/web/src/components/BottomNav.jsx): thêm tab `Tủ sách`.
  - [TuSach.jsx](file:///d:/Code/baovenentang/web/src/pages/TuSach.jsx): thêm lưới sách, hỏi đáp AI và modal chi tiết.
  - [tusach.css](file:///d:/Code/baovenentang/web/src/css/tusach.css): style riêng dùng biến màu hiện có.
- Cập nhật [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md), [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md) và [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) vì có thay đổi API/sheet/luồng xử lý.

### Lý do sửa
- Xây dựng bản MVP Tủ sách số theo yêu cầu: có catalog sách, chi tiết từng cuốn, nguồn/NotebookLM và hỏi đáp AI nhẹ bằng tóm tắt thay vì thêm vector DB mới.

### Rủi ro và phạm vi ảnh hưởng
- Ảnh hưởng trực tiếp đến route API Apps Script `books`, `book`, `ask_book`, sheet `TU_SACH`, frontend tab `Tủ sách`.
- `ask_book` là endpoint public như `troly35_run`; có validate độ dài input nhưng chưa có phân quyền theo vai trò. Không đưa tài liệu nội bộ nhạy cảm vào `TU_SACH` khi chưa bổ sung auth/policy.
- Hỏi đáp AI chỉ dựa trên tóm tắt và metadata, không thay thế việc tra cứu toàn văn tại nguồn chính thức.

### Kiểm thử đã chạy
- Kiểm tra cú pháp GAS qua stdin vì Node 24 không nhận extension `.gs`:
  ```powershell
  Get-Content -Raw -Encoding UTF8 backend\04-sheets-db.gs | node --check -
  Get-Content -Raw -Encoding UTF8 backend\07-main.gs | node --check -
  Get-Content -Raw -Encoding UTF8 backend\08-tusach.gs | node --check -
  ```
- Build frontend:
  ```powershell
  cd web
  npm run build
  ```

### Cách test thủ công
1. Deploy Apps Script:
   ```powershell
   cd backend
   npx @google/clasp push --force
   ```
2. Trong Apps Script Editor chạy `setupSystem()` để tạo `TU_SACH` và seed 10 tài liệu mẫu.
3. Mở frontend local:
   ```powershell
   cd web
   npm run dev
   ```
4. Vào tab `Tủ sách`, kiểm tra danh sách sách, tìm kiếm, mở chi tiết từng cuốn, bấm link NotebookLM/nguồn.
5. Đặt câu hỏi trong ô AI với một cuốn đang chọn và xác minh response từ `ask_book`.

---

## [2026-06-08] Cài đặt và cấu hình CodeGraph

### Nội dung thực hiện
- Cài đặt công cụ CodeGraph (`@colbymchenry/codegraph`) toàn cục (globally) qua npm.
- Chạy `codegraph install --yes` để cấu hình MCP server cho toàn bộ các tác nhân AI (Claude Code, Cursor, Codex, Gemini, Antigravity).
- Khởi tạo và lập chỉ mục codebase trong dự án bằng lệnh `codegraph init -i`, tạo thành công cơ sở dữ liệu đồ thị codebase với 724 node và 1,072 edge lưu tại thư mục `.codegraph/`.
- Cấu hình tệp tin `.codegraph/.gitignore` để tự động loại bỏ các tệp tin cơ sở dữ liệu đồ thị `.db` khỏi git.
- Cập nhật [AGENTS.md](file:///d:/Code/baovenentang/AGENTS.md) và [CLAUDE.md](file:///d:/Code/baovenentang/CLAUDE.md) quy định bắt buộc sử dụng CodeGraph để phân tích tác động và cấu trúc dự án trước khi sửa code.

### Trạng thái
- **Hoàn thành**: Đã tích hợp và kiểm thử chỉ mục hoạt động bình thường. Đã commit thay đổi với thông điệp: `"chore: integrate CodeGraph tool and guidelines into agents docs"`.

---

## [2026-06-08] Khởi tạo Bộ nhớ Dự án Dùng chung (Shared AI Project Brain)

### Nội dung thực hiện
- Thiết lập hệ thống tài liệu hướng dẫn và lưu trữ ngữ cảnh hoạt động của dự án nhằm đồng bộ thông tin giữa Claude Code và Codex.
- Tạo các file chỉ dẫn ở thư mục gốc:
  - [AGENTS.md](file:///d:/Code/baovenentang/AGENTS.md): Bản hướng dẫn dành cho Codex.
  - [CLAUDE.md](file:///d:/Code/baovenentang/CLAUDE.md): Bản hướng dẫn dành cho Claude Code.
- Khởi tạo thư mục bộ nhớ [docs/brain/](file:///d:/Code/baovenentang/docs/brain) chứa các file tài liệu ngữ cảnh chuyên biệt:
  - [00-project-overview.md](file:///d:/Code/baovenentang/docs/brain/00-project-overview.md): Mục tiêu dự án, đối tượng người dùng chính và phạm vi hoạt động.
  - [01-architecture.md](file:///d:/Code/baovenentang/docs/brain/01-architecture.md): Stack công nghệ, sơ đồ luồng dữ liệu và vai trò các thành phần (React frontend, GAS backend, Google Sheets, Gemini AI, Pinecone RAG, Python video module).
  - [02-coding-rules.md](file:///d:/Code/baovenentang/docs/brain/02-coding-rules.md): Quy chuẩn viết code, quy tắc đặt tên hàm/biến (các hàm nội bộ của GAS kết thúc bằng `_`), cách xử lý ký tự kết thúc dòng (CRLF/LF) và bảo mật thông tin (không commit token/key).
  - [03-decisions.md](file:///d:/Code/baovenentang/docs/brain/03-decisions.md): Các quyết định kỹ thuật cốt lõi (sử dụng Google Sheets làm CSDL, thiết lập proxy serverless trên Vercel, thuật toán neo câu gốc khi chat đa lượt, giới hạn phong cách phản bác trong mode `rebuttal`).
  - [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md): Bản đồ theo dõi tiến độ (liệt kê các tính năng đã hoàn thành, đang triển khai và backlog chờ xử lý).
  - [05-testing-and-deploy.md](file:///d:/Code/baovenentang/docs/brain/05-testing-and-deploy.md): Danh sách lệnh phát triển local, build dự án, deploy bằng clasp và chạy các test suite trên môi trường cloud.

### Trạng thái
- **Hoàn thành**: Đã tạo đầy đủ cấu trúc 9 file theo yêu cầu nghiệp vụ.
- **Tiếp theo**: Đề xuất commit thay đổi này với thông điệp: `"chore: initialize shared AI project brain"`.

---

## [2026-06-08] Cập nhật backlog refactor sau review kiến trúc CodeGraph

### Nội dung thực hiện
- Cập nhật [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) với checklist bắt buộc trước khi thực hiện các thay đổi code tiếp theo.
- Checklist ghi lại các điểm cần phân tích trước khi sửa: contract API `doGet`/`doPost`, entry point có blast radius lớn, caller/callee, luồng UI/API/database bị ảnh hưởng và cách rollback.
- Bổ sung thứ tự refactor an toàn: frontend API/cache, logic `TroLy35.jsx`, router/auth `07-main.gs`, tách `08-troly35.gs`, tách `11-bantin35.gs`, sau cùng mới xử lý repository Google Sheets/TCCS.
- Bổ sung các việc hardening bảo mật cần làm song song: quản lý endpoint/token/env, `IP_HASH_SALT`, `ADMIN_API_TOKEN`, validate quiz payload, policy public/private endpoint, giới hạn tải ảnh trong video module và kiểm soát SSL verification của `edge-tts`.

### Trạng thái
- **Hoàn thành**: Chỉ cập nhật tài liệu brain, chưa sửa code nguồn.
- **Rủi ro**: Không có thay đổi runtime. Cần lưu ý đây là backlog định hướng, trước khi làm từng task vẫn phải chạy lại CodeGraph và impact analysis theo phạm vi thực tế.
- **Cách kiểm tra**: Đọc lại `docs/brain/04-current-tasks.md` để xác nhận checklist xuất hiện dưới mục backlog.

---

## [2026-06-08] Bổ sung backlog tính năng Tủ sách AI/Sổ tay AI

### Nội dung thực hiện
- Dùng CodeGraph kiểm tra hiện trạng tính năng liên quan đến Tủ sách AI/Sổ tay AI.
- Xác định hiện tại frontend chỉ có `NotebookPanel` trong `web/src/pages/HocTap.jsx`, mở link NotebookLM cố định qua `NOTEBOOK_URL`; chưa có backend/API/sheet/quản trị tài liệu riêng.
- Cập nhật [04-current-tasks.md](file:///d:/Code/baovenentang/docs/brain/04-current-tasks.md) để bổ sung nhóm task làm rõ phạm vi và thiết kế trước khi code sâu tính năng Tủ sách AI/Sổ tay AI.

### Trạng thái
- **Hoàn thành**: Chỉ cập nhật tài liệu brain, chưa sửa code nguồn.
- **Rủi ro**: Không có thay đổi runtime. Khi triển khai thật cần quyết định rõ giữ liên kết ngoài NotebookLM hay xây dựng tủ sách nội bộ có dữ liệu, API, phân quyền và đồng bộ RAG.
- **Cách kiểm tra**: Đọc lại mục backlog trong `docs/brain/04-current-tasks.md`, xác nhận có nhóm task Tủ sách AI/Sổ tay AI.

---

## [2026-06-11] Commit và gộp tính năng Tủ sách số vào main

### Nội dung thực hiện
- Review toàn bộ working tree (29 file sửa + ~20 untracked) so với main — phát hiện nhánh `codex/tool-codegraph-gs-index` trỏ cùng commit với `main`, tất cả công việc đang ở working tree chưa commit.
- Phân tích code trước khi commit:
  - Xác nhận mọi helper GAS dùng trong `08-tusach.gs` đều có trong `backend/00-utils.gs`, `01-config.gs`, `03-gemini-ai.gs`, `04-sheets-db.gs`.
  - Chạy `npm run build` → pass (19.59s, 0 lỗi/cảnh báo).
  - Kiểm tra `web/api/gas.js`: `IP_HASH_SALT` giờ bắt buộc; `video_export` đã được thêm vào `ADMIN_ACTIONS`.
- Stage có chọn lọc 11 file thuộc tính năng Tủ sách, loại trừ file rác (`vite-dev.log`, `.codegraph/daemon.pid`, `báo cáo.md`) và file chưa quyết định (`BottomNav.jsx`, `video_module/*`).
- Tạo commit `a4e0540` trên nhánh `codex/tool-codegraph-gs-index`.
- Fast-forward `main` → `a4e0540` (không tạo merge commit).
- Push `origin/main` → `a4e0540` (ahead 3 commits, bao gồm 2 commit CodeGraph trước đó).

### File đã thay đổi trong commit a4e0540
- `backend/08-tusach.gs` (tạo mới): module Tủ sách số — `getBooks`, `getBookById`, `askBookAI`, `seedTuSach`, mapping row/object, 10 tài liệu mẫu.
- `backend/04-sheets-db.gs`: thêm header `TU_SACH` (12 cột).
- `backend/07-main.gs`: thêm action GET `books`/`book` + POST `ask_book` (tạm tắt), `seedTuSach()` trong `setupSystem`, cập nhật danh sách endpoint trong response `/`.
- `web/src/pages/TuSach.jsx` (tạo mới): lưới sách + modal chi tiết qua `createPortal`, hỗ trợ prop `embedded`.
- `web/src/cache.js` (tạo mới): tách logic localStorage SWR cache ra module riêng.
- `web/src/css/tusach.css` (tạo mới): style cho Tủ sách.
- `web/src/api.js`: import `cached`/`invalidateCache` từ `cache.js`; thêm `getBooks`, `getBookById`, `askBookAI`; bỏ URL GAS hardcode và `VITE_API_TOKEN`; dev dùng `VITE_GAS_URL`.
- `web/src/App.jsx`: điều chỉnh thứ tự tab (giữ 3 page chính).
- `web/src/main.jsx`: import `css/tusach.css` global.
- `web/src/pages/HocTap.jsx`: thay panel "Sổ tay AI" bằng section Tủ sách (`TuSach embedded`).
- `web/src/index.css`: thêm `body.modal-open { overflow: hidden }`, bỏ `transform`/`filter`/`will-change` trên `.tab-panel.active`.

### Lý do
- Hoàn thành tính năng Tủ sách số: danh mục 10 tài liệu nền tảng, tìm kiếm client-side, modal chi tiết có podcast/sơ đồ tư duy/link NotebookLM.
- Tính năng hỏi đáp AI (`ask_book`) giữ trong backend nhưng tạm tắt ở proxy, chờ quyết định quota riêng.

### Rủi ro và điều kiện vận hành
- **IP_HASH_SALT bắt buộc trên Vercel**: `web/api/gas.js` trả 500 nếu thiếu env này. Phải set trước khi deploy production.
- **Backend chưa deploy**: phải `clasp push` + cập nhật deployment Apps Script + chạy `setupSystem()`/`seedTuSach()` để tạo sheet `TU_SACH` và seed dữ liệu mẫu. Trước khi deploy, `action=books` sẽ báo lỗi "Tủ sách số chưa sẵn sàng trên Apps Script".
- **Dev local**: đặt `VITE_GAS_URL=<Apps Script /exec URL>` trong `.env.local` nếu muốn gọi trực tiếp Apps Script khi dev.

### Kiểm thử đã chạy
- `cd web; npm run build` → pass, 0 lỗi.
- Tất cả helper GAS được xác nhận tồn tại bằng `grep` trước khi commit.
- `git push origin main` → thành công, `4893351..a4e0540`.

### Cách test thủ công
1. Deploy backend GAS mới, chạy `setupSystem()` trong Apps Script UI.
2. Trên Vercel set `IP_HASH_SALT` và redeploy frontend.
3. Mở app → tab `Học tập` → section `Tủ sách`.
4. Xác nhận danh mục 10 tài liệu hiện ra; bấm vào một tài liệu, modal chi tiết bật lên và nằm trong viewport.
5. Thử tìm kiếm theo tên/chủ đề/tác giả.
