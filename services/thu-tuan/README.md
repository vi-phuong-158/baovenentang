# Thư tuần “Lời Bác dạy”

> **Chỉ còn Production (05/10/2026):** đã gỡ công cụ TEST khỏi mã nguồn — `ZaloAcceptance.gs` (gửi fixture TEST), hai lệnh `taoBangLenhZaloTest`/`duyetKhoTraCuuZaloTest`, và hàm chuyển đổi một lần `chuyenNhomTestThanhProduction`/`tatLichProductionCu` (đã chạy xong trên cloud). Dùng `taoBangLenhZaloProd`, `duyetKhoTraCuuZaloProd`, `kiemTraProductionDaChuyen` (kiểm tuần thứ Hai sắp gửi, không gửi tin) và `batLichProductionDaChuyen`. Sau `clasp push --force`, tệp `ZaloAcceptance.gs` trên cloud cũng bị xoá. `THU_TUAN_START_WEEK` sai định dạng nay báo lỗi `INVALID_START_WEEK` thay vì âm thầm bỏ qua. Các ghi chú TEST bên dưới chỉ là lịch sử.

> **Chỉ đạo hiện hành05/10/2026:** owner chuyển nhóm TEST thành Production. Project/hai Sheets của nhóm đã đổi tên PROD; profile hoạt động PROD/TEST_MODE=false, credential giữ nguyên. Lịch Production cũ tắt. Weekly adapter mới dùng ảnh ANHTUAN đúng Ky/MaLoiDay + toàn bộ thư v3 trong một tin khi THU_TUAN_ZALO_WEEKLY_PHOTO=true; thiếu ảnh/approval/hash hợp lệ sẽ chặn. THU_TUAN_START_WEEK=2026-10-12 ngăn gửi lại tuần05/10. TEST receipts/content được giữ ở4 tab hậu tố _TEST_20261005;51 bài vận hành,12/10 đã duyệt,50 bài còn Nhap phải được con người duyệt trước kỳ gửi. Ghi chú TEST-only bên dưới là lịch sử. Xem brain01/03/06 và ZaloProductionOperations.gs cho cutover/kiểm tra.

> **Lệnh Zalo TEST (04/10/2026 23:35):** `/tuan` đã gửi ảnh D kèm toàn bộ thư trong một tin; dùng `/tuan 2` hoặc `/tuan 2026-10-12`. Owner cấp riêng quyền xem theo liên kết cho51 ảnhD. Web App version3/catalog224/flags true; native PNG/hash/caption xác minh, controlled trial SENT và replay ALREADY_HANDLED/no duplicate, webhook healthy/log12. 201 regression/33 actualcloudcompat/syntax22GAS đạt; owner đã thử mention /tuan 2 và xác nhận ảnh/thư hiển thị đúng. Properties cũ/lịch tuần/Production giữ nguyên. Chi tiết [ZALO-COMMANDS.md](ZALO-COMMANDS.md).

Module Apps Script **độc lập**, gửi nội dung đã được con người duyệt trong Google Sheets qua Gmail (mặc định) hoặc Zalo Bot (plain text).

> **Chuẩn bị pilot Production (01/10/2026, chỉ code/test, chưa chạy PROD):** thêm receiver PROD `nhanSuKienZaloThuTuanProd` (chỉ pin `THU_TUAN_ZALO_PROD_CHAT_ID/CHAT_SHA256`), hàm chỉ đọc `kiemTraSanSangZaloProduction`, trigger báo lỗi `THU_TUAN_TRIGGER_ATTENTION:<STATUS>` và CI `.github/workflows/thu-tuan.yml`. Regression local **148/148**. Chưa tạo project/Bot PROD, chưa gửi Production. Quy trình bắt buộc ở mục 12 “Pilot Production”. `THU_TUAN_ZALO_TEST_RUNTIME_ACCEPTANCE_PASS` **không** phải nghiệm thu Production; `READY_FOR_PRODUCTION_PILOT` **không** phải `PRODUCTION_ACCEPTANCE_PASS`.

> **Sau review PR #12 (01/10/2026):** đã sửa báo tiến độ gửi dở dang, phân biệt chặn trước API với UNKNOWN, và tắt TEST cả khi SEND lỗi guard/adapter/BUSY. Marker mới mỗi phiên; cấu hình chỉ giữ credential Zalo hoạt động và pin isolation cần thiết. Regression **135/135 local**. Bản sửa đã lưu lên GAS TEST (01/10/2026) và chạy lại chỉ đọc: preview `PREVIEW` alreadySent1/pending0/unknown0, đối soát 1 SENT/receipt hợp lệ/`reconciliationClear:true`; không gửi thêm tin. Lần gửi thật trong verdict runtime PASS bên dưới vẫn thuộc source trước bản sửa; các nhánh lỗi mới chỉ kiểm local. Không mở Production.

> **Chỉ đạo hiện hành 01/10/2026 (ưu tiên hơn các ghi chú lịch sử bên dưới):** TEST-only không cần profile PROD chưa tồn tại. Giữ nguyên token TEST và `THU_TUAN_APPROVAL_SECRET` cho tới khi test thành công; owner sẽ thay cả hai cùng lượt sau đó. Rotation không phải gate điều tra. Không gửi, cấu hình, deploy hoặc tạo trigger Production. Các verdict 30/9 bên dưới là lịch sử, không phải kết luận về nguyên nhân nhận event.

> **Nghiệm thu TEST hoàn tất 01/10/2026:** `THU_TUAN_ZALO_TEST_RUNTIME_ACCEPTANCE_PASS`. GAS đã pin đúng GROUP target/hash, membership owner được xác nhận, OAuth/getMe/full preflight OK. Fixture riêng2026-10-05 đã tạo Nhap→APPROVED→preview seal (1 phần/765 ký tự), gửi COMPLETE/sent1/unknown0. Receipt audit có1SENT/phần1of1/message_id hợp lệ, reconciliationClear=true; chạy lại sent0/alreadySent1/pending0, không gửi thêm. Owner trả lời “Xác nhận đã có đủ tin rồi” cho yêu cầu kiểm đủ nội dung/đúng thứ tự/chỉ một tin trong nhóm Test; gate quan sát phía nhận đã hoàn tất. Cuối enabled=false/0trigger account, lịch sử giữ nguyên. Regression120/120 local; independent security review không finding mới. Đây là nghiệm thu TEST, Production vẫn chưa mở. Owner thay token TEST và approval secret cùng lượt sau test; agent không tự rotate. Các snapshot bên dưới là lịch sử đã được thay thế.

> **Bằng chứng runtime mới 01/10, sau owner cấp quyền:** `capQuyenZaloThuTuanTest` đã thực thi GAS xác minh scope được cấp. getMe trong GAS trên cả hai host tài liệu/SDK trả HTTP 200, ok=true, Bot ID chuỗi/account/display/capability khớp pin TEST. getWebhookInfo GAS cả hai trả HTTP 200 / ok=false / 404, trạng thái webhook UNKNOWN. Local trước đó cũng có kết quả tương ứng nhưng là evidence riêng. Gate FETCH/AUTHORIZATION trước đó đã được gỡ; verdict OAuth cũ là lịch sử. Log Zalo đúng 16 cột, 0 dòng; log Gmail 9 cột, 5 dòng và tuần hiện tại đã có 1 lịch sử Gmail. Acceptance vẫn cần GROUP target, approval/preview/preflight chính thức, fixture/receipt/dedupe/reconciliation; chưa gửi và không kết luận nguyên nhân receive path Zalo.

> **Phiên nhận mới sau OAuth:** READY GAS00:53:46.995–00:55:49.743 giờ VN, 122748ms, bốn request30 giây đều HTTP200/408, không event. Owner chưa xác nhận marker đã gửi trong cửa sổ nên timing vẫn UNVERIFIED; verdict `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_GROUP_MARKER_TIMING_UNVERIFIED`. Không pin/send; enabled=false/0 trigger tài khoản kiểm tra sau phiên. Không quy lỗi Platform và không tự poll lại.

> **Cập nhật sau ảnh06:03:** owner xác nhận chưa gửi trong phiên00:53–00:55; tin mới “xin chào” lúc06:03 không marker/không trong cửa sổ đó. Main chuẩn bị và mở riêng phiên GAS06:05:16.087–06:07:18.198, READY khi đang chạy; bốn request30 giây HTTP200/408, không event. Chưa xác nhận marker đã gửi trong phiên mới nên verdict timing UNVERIFIED giữ nguyên. Không đọc ID từ ảnh, không pin/send hoặc tự mở thêm phiên. GAS cuối enabled=false/0 trigger account. OAuth/getMe đã đạt, receipt/dedupe/reconciliation vẫn chưa nghiệm thu.

> **Snapshot lịch sử 30/9/2026 sau bổ sung token:** đã cập nhật `Mã.gs` (Code.gs local), `ZaloTransport.gs` và manifest chỉ trên project TEST; đọc lại cả ba khớp source local. Đã tạo/đọc lại log Zalo 16 cột. `ENABLED=false`, `TEST_MODE=true`, transport ZALO, ENV TEST; bốn pin script/Sheets/Bot TEST đã lưu. getMe trực tiếp từ máy xác nhận token hợp lệ, account_name khớp Bot TEST và can_join_groups=true; đây chưa phải preflight GAS. Preview GAS đã thử nhưng dừng ở OAuth trước khi thực thi. Owner xác nhận đã mention Bot; hai lần getUpdates giới hạn timeout đều trả HTTP 200 / error_code 408, không có event hay chat.id. Chưa gửi fixture, chưa có receipt/dedupe/reconciliation runtime. Verdict: `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_GETUPDATES_408_OAUTH_AND_PROD_ISOLATION`. Owner xác nhận chưa có project/Bot Production nên không dựng năm pin PROD giả. Regression local 82/82; Python vẫn thiếu pytest. Production không thay đổi. Xem cập nhật cuối mục 12.

> **Snapshot lịch sử sau ảnh lỗi isolation:** bỏ yêu cầu profile PROD khi chạy TEST-only, giữ chặt pin active; source `ZaloTransport.gs` đã cập nhật riêng lên TEST. Run lại dừng vì thiếu `THU_TUAN_ZALO_TEST_CHAT_SHA256` (cùng thiếu TEST `CHAT_ID` và `GROUP_CONFIRMED`), trước getMe. TEST vẫn ENABLED=false. Regression Zalo local 83/83. Lần chẩn đoán cuối cũng làm credential TEST xuất hiện trong đầu ra công cụ; dừng mọi API call tới khi owner thay Bot TEST token và approval secret TEST cùng một lượt. Verdict: `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_MISSING_TEST_CHAT_ID_HASH_GROUP_CONFIRMATION_AND_SECRET_ROTATION`; không thay đổi Production.

> **Snapshot lịch sử trước bổ sung token (30/9/2026):** kiểm tra lại trực tiếp project TEST qua phiên Google đang đăng nhập, không dựa vào kết quả mock. `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_MISSING_TEST_TOKEN_AND_ISOLATION_CONFIG`: token/chat/Bot/pin vẫn thiếu; ENABLED=false, TEST_MODE=false, transport chưa khai báo (GMAIL mặc định), trang trigger tài khoản hiện tại có 0 trigger. Chưa triển khai hoặc gửi. Xem checklist bổ sung cuối mục 12; 82/82 test local vẫn đạt, không thay thế acceptance thật.

> **Cập nhật 28/9/2026:** regression cục bộ trên branch sạch đạt 52/52 (tests/thu-tuan.test.cjs). Apps Script TEST acceptance trước đó đã gửi một thư qua code path mới tới đúng một mailbox TEST được cho phép; Gmail Web xác nhận banner inline, MIME, nội dung và dedupe. Cấu hình gửi đã được tắt, TEST_MODE tắt, override bị xóa và trigger bằng 0. Production configuration/runtime remains unverified. Không tìm thấy Apps Script Production riêng nên chưa thể nghiệm thu Production. Trong task này không gửi email Production và không sửa trigger, Script Properties, Sheet, approval hoặc recipient data Production. Xem docs/brain/06-ai-working-log.md để biết bằng chứng và giới hạn.

## 0. Nguyên tắc không đổi

- **Không có AI khi gửi.** Thư chỉ ghép các ô đã duyệt, không tạo, tóm tắt hay sửa câu chữ.
- **Chỉ gửi nội dung đã duyệt:** `NHÁP → kiểm tra nguồn → DUYỆT (khóa phiên bản) → được phép gửi`. Thiếu gì hoặc bị sửa sau duyệt thì **dừng, không gửi**.
- **Cấu trúc thư canonical (giữ nguyên thứ tự):** tiêu đề · ảnh banner cố định (nếu khả dụng) · Tuần/Chủ đề/Mã lời dạy · trích dẫn Lời Bác dạy và nguồn · Bối cảnh · Phân tích / ý nghĩa · Liên hệ với Công an nhân dân · Hành động tuần này · phần kỹ thuật tùy chọn. Cuối thư **có thể** có nút NotebookLM để tra cứu thêm, kèm lời nhắc: NotebookLM không phải nguồn chính thức, phải đối chiếu nguồn gốc. Ô NotebookLM để trống thì thư không có phần này. Email dùng table và inline style, co về chiều rộng màn hình, không tải font ngoài. Không có mục Liên hệ An ninh đối ngoại hoặc Gợi ý tự soi, tự liên hệ trong email.
- **Ảnh banner cố định:** `EmailAssets.gs` giữ một JPEG nội tuyến dạng Base64. Khi gửi, Apps Script tạo Blob và ghép `inlineImages` với `cid:loi-bac-hero`; email không tải ảnh từ Drive, Sheet, URL công khai hoặc mạng, và không cần OAuth scope mới. Có thể tắt bằng `THU_TUAN_HERO_IMAGE_ENABLED_ = false`; nếu tắt hoặc không tạo được Blob, ảnh được bỏ qua còn HTML và plain-text vẫn gửi. Ảnh có `alt`; hiển thị trên mobile là best-effort và phụ thuộc email client.
- **Gmail: mỗi người nhận một thư riêng**, không CC/BCC, không lộ địa chỉ người khác. Zalo gửi vào đúng nhóm đã pin theo mục 12. Không có đường dẫn theo dõi cá nhân.
- **Không public:** không deploy Web App, không `doGet/doPost`, không copy vào `backend/`.

## 1. Chuẩn bị (làm một lần)

### 1.1. Project Apps Script riêng

1. Vào script.google.com → *Dự án mới*. Đặt tên, ví dụ “Thư tuần Lời Bác dạy”.
2. Tạo `Code.gs`, `EmailAssets.gs`, `ZaloTransport.gs`, chép ba tệp tương ứng; project dùng Zalo chép thêm `ZaloDiagnostics.gs` để pin target bằng receiver thủ công. Bật *Cài đặt dự án → Hiển thị tệp kê khai “appsscript.json”* rồi dán manifest (múi giờ `Asia/Ho_Chi_Minh`). Manifest thêm quyền `script.external_request`; chủ project phải cấp quyền này khi dùng Zalo.
3. **Không** bấm *Triển khai → Ứng dụng web*.

Tài khoản sở hữu project là tài khoản gửi thư. Chọn tài khoản công vụ/được phép, có người dự phòng.

### 1.2. Hai bảng tính tách biệt

| Bảng tính | Trang tính (tên chính xác) | Hàng 1 – tiêu đề, đúng thứ tự | Ai được sửa |
|---|---|---|---|
| **A – Nội dung** | `LoiDay_NoiDung` | `Ky, MaLoiDay, NoiDungNguyenVan, NguonTrich, GoiYLienHe, TrangThai, NguoiDuyet, NgayDuyet, PhienBan, DauVanBanDuyet, ChuDe, BoiCanh, PhanTich, LienHeCAND, LienHeAnNinhDoiNgoai, HanhDongTuanNay, NotebookLM_URL` | Người biên soạn, người duyệt |
| **B – Hạn chế** | `ThuTuan_NguoiNhan` | `MaCB, Email, TrangThai, NgayDangKy` | Chỉ người vận hành |
| **B – Hạn chế** | `ThuTuan_NhatKyGui` | `Khoa, Ky, MaCB, MaLoiDay, PhienBan, DauVanBanDuyet, TrangThai, CapNhatLuc, MaLoi` | Chỉ script + người vận hành (khi đối soát) |

- 10 cột đầu của LoiDay_NoiDung là cấu trúc cũ, **không được đổi thứ tự hay ý nghĩa**; 7 cột sau được nối thêm. GoiYLienHe và LienHeAnNinhDoiNgoai được giữ lại chỉ để tương thích dữ liệu/cột cũ: **LEGACY INPUT ONLY — DO NOT RENDER**. Chúng không bắt buộc, không được xuất ra thư và không nằm trong HMAC canonical v2. Importer chấp nhận nhãn An ninh đối ngoại từ Markdown cũ nhưng bỏ giá trị đó; các cột legacy trong CSV nháp luôn để trống. Dấu duyệt phiên bản cũ không còn hợp lệ sau khi nâng lên v2; nội dung cần được duyệt lại qua hàm duyệt. Sai/thiếu/thừa tiêu đề → script báo INVALID_HEADERS và không làm gì.
- **Trước khi nhập dữ liệu**, chọn cột `Ky` (bảng A) và cột `MaCB` (bảng B) → *Định dạng → Số → Văn bản thuần túy*. Nếu Sheets tự đổi `2026-10-05` thành ngày, script báo `KY_NOT_PLAIN_TEXT` và dừng. Nhật ký do script tự định dạng.
- `Ky` = **ngày thứ Hai** mở đầu tuần, dạng `YYYY-MM-DD` (giờ Việt Nam).
- Người nhận: `TrangThai` = `DangNhan` (đang nhận) hoặc `TamDung` (dừng nhận). `MaCB` là mã nội bộ, chỉ gồm chữ/số/`-`/`_`, **không trùng** trên toàn trang (kể cả dòng TamDung).
- Không đưa email thật, ID bảng tính hay khóa vào repository.

### 1.3. Script Properties (*Cài đặt dự án → Thuộc tính tập lệnh*)

| Tên | Giá trị |
|---|---|
| `THU_TUAN_ENABLED` | `false`. Chỉ đổi thành đúng chữ `true` khi được phép gửi. Mọi giá trị khác đều là tắt. |
| `THU_TUAN_TRANSPORT` | Bỏ trống mặc định `GMAIL`; chỉ chấp nhận `GMAIL` hoặc `ZALO`. Zalo cần toàn bộ cấu hình mục 12. Không tự chuyển transport khi gửi lỗi. |
| `THU_TUAN_CONTENT_SHEET_ID` | ID bảng tính A (đoạn giữa `/d/` và `/edit` trong đường dẫn) |
| `THU_TUAN_PRIVATE_SHEET_ID` | ID bảng tính B (phải khác A) |
| `THU_TUAN_APPROVER_EMAILS` | Email người duyệt được phân công, cách nhau bằng dấu phẩy |
| `THU_TUAN_APPROVAL_SECRET` | **Không tự gõ.** Chạy hàm `taoKhoaDuyetThuTuan` một lần để script tự tạo. Không sao chép ra ngoài. |
| `THU_TUAN_TEST_MODE` | Mặc định `false`. Chỉ bật trong project TEST khi đã chỉ định một recipient bên dưới; khi bật, script bỏ qua bảng `ThuTuan_NguoiNhan`. |
| `THU_TUAN_TEST_RECIPIENT_EMAIL` | Một địa chỉ thử được cho phép; bắt buộc khi TEST_MODE bật. Không chấp nhận danh sách hoặc nhiều địa chỉ. |

Khóa duyệt dùng để ký “dấu duyệt” (`DauVanBanDuyet`). Người chỉ có quyền sửa bảng tính không thể tự tạo dấu hợp lệ. **Đổi hoặc xóa khóa làm mọi bản đã duyệt mất hiệu lực** (phải duyệt lại).

### Chế độ gửi một người nhận TEST

- Chỉ dùng trong Apps Script project và Sheets TEST riêng. Đặt `THU_TUAN_TEST_MODE=true` cùng đúng một `THU_TUAN_TEST_RECIPIENT_EMAIL`; `guiThuTuan` gửi tới địa chỉ này thay cho toàn bộ bảng recipient và log bằng mã `THU_TUAN_TEST_OVERRIDE`.
- Vẫn cần `THU_TUAN_ENABLED=true`, kỳ được duyệt hợp lệ, người duyệt nằm trong allowlist và HMAC hợp lệ. `caiLichThuTuan` từ chối khi TEST_MODE bật; lời gọi có event trigger cũng dừng, nên phải chạy thủ công.
- Chạy xemTruocThuTuan và xác nhận total:1, valid:1, invalid:0, duplicate:0, pending:1, unknown:0 trước khi gửi. Chạy lại để xác nhận alreadySent:1, pending:0. Không dùng cơ chế này để thử lên cấu hình hoặc dữ liệu Production.
- Sau thử nghiệm: đặt `THU_TUAN_ENABLED=false`, `THU_TUAN_TEST_MODE=false`, xóa `THU_TUAN_TEST_RECIPIENT_EMAIL`, xác nhận không có trigger và kiểm tra log không còn `SENDING/UNKNOWN`.

### Chọn kỳ duyệt trước lịch gửi

Apps Script editor không truyền đối số. Để duyệt trước một kỳ, đặt Script Property `THU_TUAN_APPROVAL_WEEK` thành ngày thứ Hai của đúng dòng đã đối chiếu nguồn (ví dụ `2026-10-05`), rồi chạy `duyetKyThuTuan`. Sau khi thấy APPROVED đúng key và readback, xóa property này. Khi key vắng, helper chọn tuần hiện tại theo giờ Việt Nam; key rỗng/sai ngày hoặc kỳ thiếu/đúp bị từ chối, không tự chuyển sang kỳ khác. Cấu hình này chỉ chọn dòng duyệt; preview, gửi và trigger vẫn dùng tuần hiện tại. Identity/allow-list/HMAC không đổi.

### 1.4. Quyền và danh tính người duyệt

- Hàm duyệt đọc email người đang chạy (`Session.getActiveUser`). Google chỉ trả email khi người chạy là **chủ project** hoặc **cùng miền Google Workspace** với chủ project; trường hợp khác trả rỗng → `APPROVER_REQUIRED` (từ chối, an toàn). Hãy thử duyệt một kỳ nháp ở môi trường TEST trước.
- Ai có quyền sửa project Apps Script thì có toàn quyền với module (sửa mã, đọc khóa). Chỉ cấp cho người vận hành và người duyệt.
- Người duyệt bị gỡ khỏi `THU_TUAN_APPROVER_EMAILS` → các bản họ đã duyệt không được gửi nữa (phải người khác duyệt lại).

## 2. Nhập nội dung

### Từ bộ 52 thư tuần có sẵn

Bộ Markdown “52 Thư tuần Lời Bác dạy” nằm **ngoài** repository. Công cụ chuyển sang CSV nháp:

```
node services/thu-tuan/tools/corpus-to-sheet.cjs --input <đường dẫn .md> --start 2026-10-05 --out <thư mục ngoài repo>\LoiDay_NoiDung_NHAP.csv
```

- `--start` là thứ Hai của Tuần 01; mỗi tuần sau cộng 7 ngày. Công cụ từ chối ghi file vào trong repo (repo công khai).
- Công cụ kiểm tra đủ 52 tuần, không trùng tuần/mã, đủ 8 trường canonical, nguồn có tập/trang; có lỗi thì **không** xuất file. Nhãn legacy nếu xuất hiện trong nguồn cũ sẽ bị bỏ qua, không được đưa vào CSV.
- Mọi dòng xuất ra ở trạng thái `Nhap`; `NguoiDuyet`, `NgayDuyet`, `DauVanBanDuyet`, `PhienBan`, `NotebookLM_URL` để trống. Công cụ **không bao giờ** đánh dấu `DaDuyet`.
- Nhập vào bảng tính A: *Tệp → Nhập → Tải lên*, chọn *Chèn (các) trang tính mới* và **bỏ chọn** “Chuyển đổi văn bản thành số, ngày tháng và công thức”. CSV đã có đúng hàng tiêu đề. Kiểm tra lại rồi đổi tên trang mới thành `LoiDay_NoiDung` (trang cùng tên cũ, nếu còn, phải đổi tên/xóa trước). Đặt cột `Ky` là văn bản thuần túy.

### Nhập tay

Mỗi kỳ một dòng, `TrangThai` = `Nhap`. Không dán nội dung từ kết quả AI vào `NoiDungNguyenVan`; nguyên văn chép từ bản gốc.

## 3. Quy trình mỗi tuần

| Bước | Ai | Làm gì | Kết quả mong đợi |
|---|---|---|---|
| 1. Kiểm nguồn | Người biên soạn/duyệt | Đối chiếu nguyên văn, tập, trang với Hồ Chí Minh Toàn tập; điền PhienBan (ví dụ 1) | Dòng đủ 8 trường canonical + phiên bản |
| 2. Duyệt | Người duyệt | Đối chiếu nguồn và dòng kỳ, chọn `duyetKyThuTuan` → *Chạy*; dùng `THU_TUAN_APPROVAL_WEEK` cho kỳ tường minh, nếu key vắng thì chọn tuần hiện tại theo giờ Việt Nam | Nhật ký: `{"status":"APPROVED",...}`; dòng có `DaDuyet`, người duyệt, ngày duyệt, dấu duyệt |
| 3. Xem trước | Người vận hành | Chạy xemTruocThuTuan (không gửi, không ghi) | PREVIEW, đúng key (thứ Hai tuần này), đúng maLoiDay; kiểm tra total/valid/invalid/duplicate của danh sách, cùng pending/alreadySent/unknown, và quota ≥ pending |
| 4. Gửi | Lịch tự động hoặc chạy `guiThuTuan` | Chỉ gửi khi `THU_TUAN_ENABLED=true` | `COMPLETE`, `sent` = số thư gửi lần này |
| 5. Đối soát | Người vận hành | *Executions* của project; trang `ThuTuan_NhatKyGui` | Không còn `SENDING/UNKNOWN`; xử lý mục 5 nếu có |

Sửa bất kỳ trường canonical nào đã duyệt (kể cả NotebookLM, phiên bản, người/ngày duyệt) → dấu duyệt không khớp → không gửi được kỳ này; sửa nội dung, tăng phiên bản và duyệt lại. Hai trường legacy có thể thay đổi mà không ảnh hưởng thư hoặc dấu v2. **Không sửa hoặc duyệt lại kỳ đã bắt đầu gửi** – script sẽ dừng cả kỳ (CONTENT_CHANGED_DURING_WEEK) để không trộn hai phiên bản.

### Lỗi khi duyệt

| Thông báo | Ý nghĩa | Xử lý |
|---|---|---|
| `APPROVER_REQUIRED` | Người chạy không có trong danh sách hoặc Google không trả email | Kiểm tra `THU_TUAN_APPROVER_EMAILS`, tài khoản chạy (mục 1.4) |
| `INVALID_WEEK` | Ngày truyền cho `duyetNoiDungThuTuan(ky)` không phải thứ Hai dạng `YYYY-MM-DD`, hoặc không có/đúp dòng kỳ đó | Kiểm tra cột `Ky`; Kiểm tra/xóa `THU_TUAN_APPROVAL_WEEK` nếu chọn kỳ tường minh; key vắng mới chọn tuần hiện tại theo giờ Việt Nam |
| `INCOMPLETE_CONTENT` | Thiếu một trong 8 trường canonical hoặc `PhienBan` | Điền đủ |
| `INVALID_NOTEBOOKLM_URL` | Ô NotebookLM có giá trị nhưng không phải `https://notebooklm.google.com/notebook/...` | Sửa hoặc để trống |
| `MISSING_APPROVAL_SECRET` | Chưa tạo khóa duyệt | Chạy `taoKhoaDuyetThuTuan` |
| `APPROVAL_NOT_VERIFIED:...` | Đọc lại sau khi ghi không khớp | Không gửi được kỳ này; báo kỹ thuật |

## 4. Đọc kết quả chạy

Kết quả ghi trong *Executions* (chỉ số đếm và mã, không email, không nội dung).

| `status` | Ý nghĩa | Việc cần làm |
|---|---|---|
| `PREVIEW` | Xem trước, không gửi | Đối chiếu kỳ, mã lời dạy, số người |
| `COMPLETE` | Đã xử lý hết danh sách hợp lệ | Không. (Lệnh gửi được chấp nhận ≠ chắc chắn đã vào hộp thư/được đọc.) |
| `DISABLED` | `THU_TUAN_ENABLED` không phải `true` | Chủ ý tắt: không làm gì |
| `BUSY` | Một lượt khác đang chạy | Chờ vài phút rồi chạy lại |
| `CONTENT_NOT_APPROVED` + `reason` | Nội dung kỳ này chưa được phép gửi. `NOT_APPROVED`: chưa duyệt; `MISSING_REVIEWER`/`REVIEWER_NOT_ALLOWED`: người duyệt trống/không trong danh sách; `INVALID_APPROVAL_DATE`; `INCOMPLETE_CONTENT`; `INVALID_NOTEBOOKLM_URL`; `STAMP_MISMATCH`: đã bị sửa sau duyệt hoặc dấu không hợp lệ | Duyệt (lại) đúng quy trình. **Tuần đó không có thư** cho tới khi xong |
| `CONTENT_MISSING_OR_DUPLICATE` | Không có, hoặc có hơn một dòng cho thứ Hai tuần này | Thêm/xóa dòng trùng |
| `KY_NOT_PLAIN_TEXT` | Có ô `Ky` bị Sheets đổi thành ngày | Đổi cột `Ky` sang văn bản thuần túy, gõ lại |
| `INVALID_RECIPIENT_LIST` | Email sai dạng/trùng, `MaCB` sai dạng/trùng/trống | Sửa danh sách rồi chạy lại. Chưa ai nhận thư |
| `QUOTA_DEFERRED` | Hạn mức gửi còn lại trong ngày < số người cần gửi. Chưa gửi ai | Chạy lại hôm sau hoặc giảm danh sách |
| `DEFERRED` | Dừng giữa chừng vì gần hết 4 phút hoặc hết hạn mức; `remaining` = số còn lại | Chạy lại `guiThuTuan` (cùng tuần) – chỉ gửi người chưa nhận |
| `RECONCILIATION_REQUIRED` | Có người ở trạng thái `SENDING/UNKNOWN` | Làm mục 5 |
| `Error: THU_TUAN_TRIGGER_ATTENTION:<STATUS>` | Chỉ khi `guiThuTuan` chạy từ trigger và kết quả khác `COMPLETE`/`DISABLED` (kể cả `COMPLETE` với `sent:0, alreadySent:N` là dedupe hợp lệ, không báo lỗi). Execution bị đánh dấu *Failed* để Google gửi thông báo lỗi trigger; thông điệp chỉ có mã trạng thái cố định | Đọc `<STATUS>` theo bảng này. Kết quả và nhật ký đã được ghi, lock đã nhả trước khi báo lỗi. Chạy tay vẫn trả kết quả như cũ, không throw |
| `CONTENT_CHANGED_DURING_WEEK` | Nội dung/duyệt thay đổi khi kỳ đã có nhật ký | Dừng. Không xóa nhật ký. Báo người phụ trách quyết định |
| `DUPLICATE_OR_INVALID_LOG` | Nhật ký có dòng trùng `Khoa` hoặc `Khoa` sai dạng | Sửa nhật ký thủ công có kiểm soát |

## 5. Trạng thái nhật ký và đối soát

| `TrangThai` trong nhật ký | Ý nghĩa | Script làm gì ở lần chạy sau |
|---|---|---|
| `SENDING` | Đã ghi “đang gửi” rồi mới gọi lệnh gửi; script dừng đột ngột trước khi ghi kết quả | **Giữ lại, không gửi lại** |
| `SENT` | Dịch vụ thư đã chấp nhận lệnh gửi | Bỏ qua (không gửi trùng) |
| `UNKNOWN` | Lệnh gửi báo lỗi hoặc không ghi được kết quả – **có thể đã gửi** | **Giữ lại, không gửi lại** |
| `PENDING` hoặc `FAILED` | Người vận hành đã xác minh là **chưa** gửi | Gửi lại một lần |
| Giá trị khác/để trống | Không rõ | Giữ lại (an toàn) |

`DEFERRED` và `QUOTA_DEFERRED` là kết quả của lượt chạy, không phải trạng thái nhật ký.

**Đối soát `SENDING/UNKNOWN`:** mở mục *Đã gửi* của tài khoản gửi (thư MailApp thường xuất hiện ở đó) hoặc hỏi trực tiếp người nhận (tra `MaCB` → email trong bảng B).
- Đã nhận → sửa `TrangThai` thành `SENT`.
- Chắc chắn chưa nhận → sửa thành `PENDING`, rồi chạy `guiThuTuan`.
- Không chắc → **để nguyên**. Thà thiếu một thư còn hơn gửi trùng.

Giới hạn: MailApp và Sheets là hai dịch vụ tách biệt nên **không thể bảo đảm tuyệt đối “đúng một lần”**; thiết kế chọn “không gửi lại khi nghi ngờ”, có thể có người thiếu thư cần đối soát tay.

## 6. Lịch gửi tự động

| Việc | Hàm | Ghi chú |
|---|---|---|
| Cài | `caiLichThuTuan` | Chỉ chạy được khi `THU_TUAN_ENABLED=true`. Thứ Hai, 7–8 giờ, `Asia/Ho_Chi_Minh`. Chạy lại không tạo thêm (`EXISTS`). |
| Kiểm tra | `kiemTraLichThuTuan` | Số lịch do **tài khoản đang chạy** tạo. Google không cho xem lịch của tài khoản khác. |
| Tạm dừng nhanh | Đặt `THU_TUAN_ENABLED=false` | Lịch vẫn chạy nhưng trả `DISABLED`, không gửi |
| Gỡ | `goLichThuTuan` | Chỉ gỡ lịch do tài khoản đang chạy tạo |
| Bàn giao | Người cũ chạy `goLichThuTuan` → người mới chạy `caiLichThuTuan` | Nếu người cũ không còn truy cập: đặt `false`, nhờ quản trị Workspace gỡ, hoặc tạo project mới. Khóa script chống chạy song song trong cùng project; nhật ký chống gửi trùng. |

Không có trigger tự thử lại. Lỗi/`DEFERRED` do người vận hành xử lý. Module không tự gửi email cảnh báo; mọi trạng thái bất thường từ trigger làm execution thất bại với `THU_TUAN_TRIGGER_ATTENTION:<STATUS>` để thông báo lỗi trigger mặc định của Google (theo cài đặt thông báo của trigger) báo cho chủ trigger. Người vận hành vẫn cần xem *Executions* sáng thứ Hai.
`caiLichThuTuan` luôn từ chối khi `THU_TUAN_TEST_MODE=true`; event trigger cũng không gửi trong chế độ này.

## 7. Hạn mức và thời gian

- Hạn mức người nhận/ngày của MailApp phụ thuộc loại tài khoản (theo tài liệu Google: khoảng 100 với tài khoản Gmail thường, 1.500 với Workspace – kiểm tra lại khi triển khai). `xemTruocThuTuan` trả `quota` còn lại.
- Nếu `pending` > hạn mức: script **không gửi ai** (`QUOTA_DEFERRED`). Danh sách lớn hơn hạn mức/ngày cần tài khoản Workspace hoặc tách project.
- Mỗi lượt tự dừng sau ~4 phút (giới hạn Apps Script 6 phút); chạy lại để gửi tiếp.

## 8. Không được làm

- Không tự đổi `UNKNOWN/SENDING` thành `PENDING` khi chưa xác minh.
- Không sửa nội dung đã duyệt rồi vẫn cố gửi; không tự điền `DaDuyet`/dấu duyệt bằng tay.
- Không xóa nhật ký của kỳ đang gửi hoặc vừa gửi.
- Không dùng email/họ tên thật trong dữ liệu thử, fixture hay repository.
- Không đưa khóa, ID bảng tính, danh sách người nhận vào mã nguồn/tài liệu công khai.
- Không deploy Web App, không bật gửi với danh sách toàn đơn vị trước khi nghiệm thu TEST.

## 9. Nghiệm thu runtime trên môi trường TEST (`THU_TUAN_RUNTIME_ACCEPTANCE`)

Dùng project + 2 bảng tính **TEST** riêng, một dòng nội dung giả có chữ TEST và đúng một mailbox thử được phép cấu hình qua TEST_MODE. Ghi bằng chứng không chứa email, ID sheet, khóa hoặc nội dung nhạy cảm:

1. `THU_TUAN_ENABLED=false`, chạy `taoKhoaDuyetThuTuan` → `CREATED`.
2. `xemTruocThuTuan` khi chưa duyệt → `CONTENT_NOT_APPROVED`, `reason: NOT_APPROVED`; nhật ký trống.
3. Người duyệt chạy `duyetKyThuTuan` → `APPROVED`. Thử bằng tài khoản ngoài danh sách → `APPROVER_REQUIRED`.
4. xemTruocThuTuan → PREVIEW, total:1/valid:1/invalid:0/duplicate:0/pending:1; **không có thư, nhật ký trống**.
5. `guiThuTuan` khi còn `false` → `DISABLED`, không thư.
6. Chỉ trong Apps Script project TEST, bật THU_TUAN_TEST_MODE=true và đặt đúng một mailbox ở THU_TUAN_TEST_RECIPIENT_EMAIL. Sau khi xác nhận preview chỉ có một người nhận, đặt THU_TUAN_ENABLED=true, chạy thủ công guiThuTuan → COMPLETE, sent:1. Kiểm tra thư đó: tiêu đề, thứ tự nội dung canonical, tiếng Việt, nguồn, NotebookLM (nếu có) và lời nhắc, bản xem trên điện thoại; bảo đảm không có phần An ninh đối ngoại/Gợi ý tự soi và chỉ có mailbox thử được chỉ định.
7. Chạy lại guiThuTuan → alreadySent:1, pending:0, không có thư mới.
8. Trong một bản thử độc lập, sửa một trường canonical sau duyệt → STAMP_MISMATCH; thay đổi hai trường legacy không được làm đổi thư/HMAC. Không sửa nội dung của tuần đã gửi. Thử chữ ký v1 cũ phải fail closed; duyệt lại test fixture bằng hàm duyệt.
9. Sửa một dòng nhật ký thành `UNKNOWN` → chạy lại → `RECONCILIATION_REQUIRED`, không thư mới.
10. Xác nhận TEST_MODE chặn cài trigger. Đặt THU_TUAN_ENABLED=false, THU_TUAN_TEST_MODE=false, xóa mailbox override và xác nhận không có trigger hoặc mục SENDING/UNKNOWN.

Chỉ khi đủ 10 bước mới ghi `THU_TUAN_TEST_RUNTIME_ACCEPTANCE_PASS`.

## 10. Dữ liệu và thời hạn lưu

Nhật ký chỉ giữ mã người nhận và metadata, không email hay nội dung thư. Không xóa nhật ký kỳ đang hoạt động. Xóa/ẩn danh theo thời hạn đã được phê duyệt tại nơi vận hành (mã chưa tự xóa vì chưa có thời hạn được xác nhận). Tài khoản sở hữu, quyền Sheets, lịch và người dự phòng phải được bàn giao; sao chép mã là chưa đủ.

## 11. Kiểm thử cục bộ

```
node --test tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs
```

Toàn bộ dịch vụ Google được giả lập, kể cả việc Sheets tự đổi chuỗi ngày thành Date và làm tròn giây. Đây **không** thay thế nghiệm thu mục 9.

GitHub Actions `.github/workflows/thu-tuan.yml` chạy trên mọi PR/push vào `main` (Node 22): parse toàn bộ file `.gs` đã track bằng `vm.Script` (Node không `--check` được đuôi `.gs`) rồi chạy hai file test trên. Workflow cố ý không dùng `paths` để có thể đặt làm required check. Kết quả local mới nhất (01/10/2026, sau bổ sung pilot Production): **148/148** (132 module + 16 acceptance).

Kết quả ngày 30/9/2026: **82/82 thành công, 0 lỗi**, gồm 52 regression Gmail/canonical hiện có và 30 test Zalo. tests/hoc-tap.test.cjs không có trong checkout này. Kết quả local không thay thế runtime TEST.

## 12. Transport Zalo: cấu hình, nghiệm thu và rollback

### Hợp đồng API đã đối chiếu

#### Chẩn đoán hiện hành: GAS TEST và hai endpoint

`ZaloDiagnostics.gs` là helper thủ công, không đổi transport gửi. `chanDoanZaloThuTuan()` chỉ đọc: yêu cầu ENABLED=`false`, TEST_MODE=`true`, ZALO/ENV TEST, pin script/hai Sheets/Bot khớp; giữ Script Lock, chặn event trigger, xác minh lại cấu hình trước mỗi request. Nó so sánh getMe/getWebhookInfo trên host tài liệu và SDK, đồng thời đọc schema hai log/approval tuần hiện tại. Chỉ xuất code/count/boolean; không raw event/error/ID/token/secret/webhook URL.

`capQuyenZaloThuTuanTest()` kiểm manual/isolation tương tự, rồi dùng [ScriptApp.requireScopes](https://developers.google.com/apps-script/reference/script/script-app#requirescopesauthmode,-oauthscopes) yêu cầu duy nhất scope `script.external_request` đã có trong manifest. Thiếu consent thì Google dừng execution và mở prompt; helper chỉ log `TEST_EXTERNAL_REQUEST_SCOPE_GRANTED` sau khi lời gọi trả về. Không revoke quyền, xuất authorization URL, reset token hoặc ghi cấu hình. Owner hoàn tất consent trong project TEST rồi main chạy lại helper và chẩn đoán để xác minh getMe thực sự chạy từ GAS; scope nằm trong manifest không tự chứng minh đã được cấp.

Tóm tắt failure chỉ dùng phase/category cố định, không raw exception. `FETCH/AUTHORIZATION` trong lượt này phân biệt lỗi trước request GAS với HTTP/API error; không dùng booleans Bot=false khi không có response để kết luận sai Bot. Approval metadata tuần hiện tại hợp lệ và render 1 phần/765 đơn vị UTF-16, nhưng đó là nội dung fixture Gmail cũ; không gửi Zalo lại kỳ đã có lịch sử Gmail. Chuẩn bị kỳ fixture riêng, duyệt và preview sau khi đủ target GROUP.

Trang [hướng dẫn polling chính thức](https://bot.zapps.me/docs/build-your-bot/) liên kết SDK Node/Python. [Source Node 0.1.6](https://cdn.jsdelivr.net/npm/node-zalo-bot@0.1.6/src/constants.js) và [Python 0.1.9](https://pypi.org/project/python-zalo-bot/0.1.9/) dùng `bot-api.zapps.me`, trong khi tài liệu API dùng `bot-api.zaloplatforms.com`. Chỉ đọc source SDK, không cài/chạy SDK; một SDK có nhánh tự gỡ webhook không phù hợp phạm vi này. Khác biệt endpoint là giả thuyết cần runtime evidence, chưa phải căn cứ đổi host send.

`nhanSuKienZaloThuTuanTest()` chỉ được main chạy khi owner sẵn sàng và xác nhận không có consumer khác. Phát READY với marker mới mỗi phiên (UUID và HMAC dùng approval secret hiện có, domain riêng; nonce/secret không xuất), rồi owner chọn Bot trong danh sách @ ở đúng nhóm Test và gửi đúng một tin chứa **marker của READY phiên hiện tại** như một token độc lập. Không dùng marker lịch sử hoặc chuỗi từ repo. Bot ID dạng chuỗi phải khớp pin; tên hiển thị/account không còn là gate viết cứng. Parser nhận một result object, dùng `message.chat.chat_type`, date Unix milliseconds và đúng một marker mới trong cửa sổ. PRIVATE/marker cũ/lặp/sai không được pin. Tối đa bốn request với `timeout:"30"`, kiểm 120 giây giữa request; UrlFetchApp không có timeout request cứng, nên không cam kết kết thúc chính xác sau 120 giây. Tab Gmail log tùy chọn; nếu tồn tại thì vẫn kiểm đủ schema.

Chỉ event GROUP khớp phiên đã phối hợp mới được receiver lưu cặp TEST_CHAT_ID/SHA256 trong Script Properties; recheck guard và readback, từ chối ghi đè pin khác. Không đặt GROUP_CONFIRMED: owner phải xác nhận membership đúng nhóm trước bước gửi. Từ 01/10/2026, nếu `THU_TUAN_ZALO_TEST_GROUP_CONFIRMED` đã tồn tại (bất kỳ giá trị nào) receiver trả `TEST_RECEIVE_GROUP_CONFIRMATION_PRESENT` trước mọi API call; muốn pin lại phải xóa xác nhận cũ trước, để xác nhận của target cũ không tự áp sang target mới. Nếu đọc lại pin không chắc chắn, dừng và giữ trạng thái để đối soát, không dựng ID hoặc tự poll lại. Initial diagnostic không ghi Properties/Sheets. Không set/delete webhook, không trigger, không sendMessage; giữ ENABLED=false.

404 getWebhookInfo giữ trạng thái webhook UNKNOWN; 408 chỉ là mã timeout, không chứng minh token sai/thiếu secret/quyền nhóm. Nếu owner chưa xác nhận tin mới được gửi sau READY thì timing chưa được kiểm chứng. Không nhờ gửi lặp; PRIVATE positive-control, nếu cần, là phiên riêng để phân biệt receive path chung và tương tác GROUP.

#### Fixture TEST kỳ riêng và đối soát receipt

Helper nghiệm thu TEST (`ZaloAcceptance.gs` và các hàm `*FixtureZaloThuTuanTest`) đã hoàn tất nhiệm vụ ngày 01/10/2026 và được gỡ khỏi mã nguồn ngày 05/10/2026 khi chuyển hẳn sang Production.

Validation local mới nhất sau sửa review PR #12: `node --test tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs` đạt **135/135** (119 module +16 acceptance), syntax năm file GAS và `git diff --check` đạt. Đây là local/mock. Trên GAS TEST, bản sửa đã được lưu (hash khớp `5896c84`) và chạy lại preview/đối soát chỉ đọc đạt; không gửi lại fixture. Nghiệm thu source trước bản sửa đã hoàn tất bằng GAS thật, receipt/log/dedupe/audit và xác nhận phía nhận của owner; xem lịch sử đầu tài liệu.

- [sendMessage](https://bot.zapps.me/docs/apis/sendMessage/) mô tả POST `https://bot-api.zaloplatforms.com/bot<TOKEN>/sendMessage`, text 1–2000 ký tự, kết quả có `ok` và `result.message_id`. Module gửi JSON chỉ gồm `chat_id`, `text`, không parse_mode/text_styles; chia tối đa 3 phần, mỗi phần ≤1800 đơn vị UTF-16 để bảo thủ với giới hạn API. Nối các phần phải đúng tuyệt đối `thuTuanRenderText_(content)`: không thêm nhãn, không strip Markdown, không cắt surrogate/emoji ghép. Vượt 3 phần hoặc Unicode hỏng thì dừng trước khi gửi.
- [getMe](https://bot.zapps.me/docs/apis/getMe/) trả `result.id` kiểu chuỗi và `can_join_groups`. Preflight kiểm tra đúng ID đã pin và `can_join_groups===true`, không chuyển ID sang Number.
- [Hướng dẫn group](https://bot.zapps.me/docs/build-bot-interaction-with-group/) cập nhật 3/6/2026 vẫn ghi tính năng đang thử nghiệm nội bộ. Trưởng nhóm phải xác nhận lời mời Bot. `can_join_groups` chỉ chứng minh capability, không chứng minh đã là thành viên đúng nhóm; thứ tự bắt buộc là pin CHAT_ID/SHA256 → con người xác nhận đúng nhóm → mới đặt `GROUP_CONFIRMED=true`. Không suy luận mọi Bot đều bị cấm group hoặc đều đã được cấp quyền.
- [Quy tắc API](https://bot.zapps.me/docs/call-api/) và [mã lỗi](https://bot.zapps.me/docs/error-code/) là căn cứ xử lý lỗi. Chưa tìm thấy cơ chế idempotency/tra cứu receipt để retry an toàn trong các trang API đã đối chiếu; module không retry, không nhận webhook/getUpdates, không dùng Vercel.

### Cách ly cấu hình

Trong **mỗi project riêng**, khai báo đủ metadata của môi trường đang chạy; profile đối diện được vắng mặt hoàn toàn khi chưa tồn tại. Metadata phải do người vận hành đối chiếu độc lập, không tự lấy chat hiện tại làm allowlist:

| Thuộc tính | Quy tắc |
|---|---|
| `THU_TUAN_ZALO_ENV` | Chính xác `TEST` hoặc `PROD`; TEST_MODE phải khai báo rõ `true`/`false` tương ứng |
| `THU_TUAN_ZALO_<ENV>_SCRIPT_ID` | ID project đúng môi trường; so với `ScriptApp.getScriptId()` |
| `THU_TUAN_ZALO_<ENV>_CONTENT_SHEET_ID` | Pin bảng nội dung, phải khớp thuộc tính chung khi ENV hoạt động |
| `THU_TUAN_ZALO_<ENV>_PRIVATE_SHEET_ID` | Pin bảng hạn chế, phải khớp thuộc tính chung khi ENV hoạt động |
| `THU_TUAN_ZALO_<ENV>_BOT_ID` | ID Bot dự kiến dạng chuỗi, lấy từ nguồn vận hành đã xác minh |
| `THU_TUAN_ZALO_<ENV>_CHAT_SHA256` | SHA-256 chat_id đúng nhóm, 64 ký tự hex thường; đối chiếu với CHAT_ID hoạt động |
| `THU_TUAN_ZALO_<ENV>_BOT_TOKEN` | Token bí mật của môi trường hoạt động; không cần token môi trường còn lại |
| `THU_TUAN_ZALO_<ENV>_CHAT_ID` | Chat đã xác minh của môi trường hoạt động; không cần chat_id thô môi trường còn lại |
| `THU_TUAN_ZALO_<ENV>_GROUP_CONFIRMED` | Đúng chữ `true`, **chỉ đặt sau khi** CHAT_ID/SHA256 đã được pin và con người xác nhận Bot ở đúng nhóm đó. Không đặt cùng lúc với CHAT_ID/hash. Khi key này tồn tại (bất kỳ giá trị nào), receiver từ chối pin target mới; muốn đổi target phải xóa key này trước |

`<ENV>` được thay bằng TEST hoặc PROD. Mỗi project chỉ bắt buộc khai báo đủ năm pin của **môi trường đang chạy**: script ID, hai Sheet ID, Bot ID và chat SHA-256. Profile môi trường kia có thể chưa tồn tại; nếu bắt đầu khai báo profile đó thì mọi pin của profile phải đầy đủ, và khi cả hai profile đã có thì script/Bot/chat hash cùng bốn Sheet ID phải khác nhau. Đây cho phép triển khai TEST trước khi Production được tạo mà không giả mạo metadata. Nếu cấu hình ENV/TEST_MODE bị tráo, project ID thực tế không khớp pin của profile kia nên chặn trước API. Sai/mất pin đang hoạt động hoặc cấu hình một profile đối diện chưa hoàn chỉnh thì fail closed. TEST gửi thủ công, chặn event trigger và `caiLichThuTuan`; Gmail TEST_RECIPIENT_EMAIL không điều khiển Zalo.

Tạo trang `ThuTuan_Zalo_NhatKyGui` trong bảng hạn chế đúng môi trường, hàng 1 gồm đúng 16 cột:

```
Khoa, Ky, MaCB, MaLoiDay, PhienBan, DauVanBanDuyet, TrangThai, CapNhatLuc, MaLoi, Transport, Environment, TargetHash, Part, PartCount, PlanHash, MessageId
```

Không đổi schema nhật ký Gmail. Nhật ký Zalo không giữ token, chat_id thô, nội dung hay response lỗi. TargetHash là SHA-256, PlanHash ký nhận toàn bộ kế hoạch chia phần. Không nhập ID/token thật vào repo.

### Trạng thái gửi và an toàn

`Code.gs` dùng chung renderer, approval/HMAC, đọc Sheets, LockService, kiểm tra sửa sau duyệt và state machine; `ZaloTransport.gs` chỉ giữ cấu hình/plan/API/receipt của transport. Trước mỗi phần: đọc lại nội dung, cấu hình và approver, kiểm tra plan, ghi + flush `SENDING`; kiểm tra lại ngay sau flush rồi mới gọi API. Chỉ HTTP 2xx + `ok===true` + message_id chuỗi hợp lệ mới ghi `SENT`. Timeout, 408/429, JSON hỏng, thiếu receipt, lỗi API hoặc ghi receipt thất bại → `UNKNOWN`, dừng ngay. Nếu ghi UNKNOWN cũng thất bại thì SENDING vẫn chặn lần chạy sau. Không có auto retry hay auto fallback Gmail.

Cả hai nhật ký được đọc để chặn đổi transport trong cùng kỳ đã có lịch sử (counterpart log có thể vắng). SENDING/UNKNOWN phải đối soát trước khi gửi thêm. Log phải là prefix và không cho PENDING/FAILED đứng trước phần SENT để tránh replay sai thứ tự. Preflight thất bại trước phần đầu không tạo SENDING. Guard hoặc ghi SENDING thất bại khi chưa gọi API: cố ghi FAILED/`PRE_SEND_BLOCKED`, trả `ZALO_PRE_SEND_BLOCKED` và dừng; chỉ lần chạy thủ công sau mới xét lại. Nếu không xác nhận được log FAILED thì giữ trạng thái đối soát với `PRE_SEND_LOG_UNCONFIRMED`, không gọi API. Các kết quả Zalo báo `sent` (SENT bền vững), `attempted` (đã gọi send), `confirmed` (receipt hợp lệ) trong **lượt hiện tại**; `alreadySent` là lịch sử. Lỗi I/O giữa các phần trả `ZALO_RUN_BLOCKED` giữ counters, lỗi sau gọi API vẫn RECONCILIATION_REQUIRED. Receipt có mà ghi SENT hỏng thì confirmed tăng, sent không tăng, UNKNOWN vẫn chặn retry. `ZALO_GATE_BLOCKED` chỉ dành cho lỗi trước runner, sent/attempted/confirmed=0. Config không mang toàn bộ Script Properties: chỉ whitelist pin Zalo hai môi trường, credential/target/GROUP_CONFIRMED hoạt động; Gmail không giữ credential Zalo. HMAC secret chỉ ở trường core cần ký, không sao chép vào zaloProperties; không log cfg.

Preview/dry-run không gọi UrlFetchApp và không ghi nhật ký. `kiemTraZaloThuTuan()` là thao tác **riêng**, gọi getMe chỉ đọc kể cả khi ENABLED=false. UrlFetch dùng HTTPS cố định, không theo redirect; raw exception/description/URL chứa token không được đưa vào log. Không có timeout tùy chỉnh của UrlFetch; giới hạn thời gian toàn lượt áp dụng giữa các phần, timeout request vẫn là UNKNOWN. getMe mỗi lượt có phần cần gửi không đảm bảo quyền nhóm còn nguyên sau preflight; sendMessage/receipt quyết định trạng thái từng phần.

### Pilot Production: pin target và kiểm tra sẵn sàng

Phần này chỉ mô tả quy trình; vòng 01/10/2026 chưa tạo project/Bot PROD, chưa chạy receiver PROD và chưa gửi Production. Mọi bước do owner/người vận hành thực hiện trong **project PROD riêng** (Code.gs, EmailAssets.gs, ZaloTransport.gs, ZaloDiagnostics.gs và manifest; không cài ZaloAcceptance.gs).

**Hai mức kết luận khác nhau:**
- `THU_TUAN_ZALO_TEST_RUNTIME_ACCEPTANCE_PASS` chỉ chứng minh project/Bot/nhóm **TEST**. Không thay thế nghiệm thu Production.
- `READY_FOR_PRODUCTION_PILOT` (kết quả `kiemTraSanSangZaloProduction`) chỉ nói cấu hình/nội dung/lịch sử PROD **sẵn sàng thử**. Nó **không** phải `PRODUCTION_ACCEPTANCE_PASS`; kết luận đó chỉ có sau lần gửi Production thật, đối chiếu receipt/nội dung phía nhận và dedupe.

**Receiver PROD `nhanSuKienZaloThuTuanProd()`** dùng chung core với `nhanSuKienZaloThuTuanTest()`; môi trường do chính entrypoint cố định (`TEST`/`PROD`), property `THU_TUAN_ZALO_ENV` chỉ phải khớp, không chọn entrypoint. Gọi Test khi ENV=PROD hoặc Prod khi ENV=TEST đều bị chặn trước mọi request. Receiver PROD chỉ chạy khi đồng thời: chạy tay (event trigger → `PROD_DIAGNOSTIC_MANUAL_ONLY`), `THU_TUAN_ENABLED=false`, `THU_TUAN_TEST_MODE=false`, `THU_TUAN_TRANSPORT=ZALO`, `THU_TUAN_ZALO_ENV=PROD`, Script ID thực tế khớp `THU_TUAN_ZALO_PROD_SCRIPT_ID`, hai Sheet khớp pin PROD và khác nhau, pin PROD không trùng project/Bot/Sheet TEST đã khai báo, token PROD hợp lệ, getMe trả đúng `THU_TUAN_ZALO_PROD_BOT_ID` và `can_join_groups`, không có webhook, và **chưa có** `THU_TUAN_ZALO_PROD_GROUP_CONFIRMED`. Marker là UUID + HMAC trong domain `THU_TUAN_ZALO_PROD_CHALLENGE`, dạng `THU_TUAN_ZALO_PROD_<64 hex>`, mới mỗi phiên; giữ nguyên các guard TEST: đúng một token marker, chỉ GROUP, timestamp trong cửa sổ phiên, chặn marker cũ/PRIVATE/event hỏng; marker TEST không bao giờ khớp phiên PROD. Khi đạt, receiver chỉ ghi `THU_TUAN_ZALO_PROD_CHAT_ID` và `THU_TUAN_ZALO_PROD_CHAT_SHA256` (một lần `setProperties`, đọc lại xác minh), không đặt GROUP_CONFIRMED, không sendMessage, không ghi property TEST, không log/trả chat_id/token.

**Quy trình bắt buộc (không đảo thứ tự):**
1. Owner tạo project/Bot/nhóm PROD và hai Sheet PROD riêng; lưu pin script/Sheet/Bot PROD và token PROD; `THU_TUAN_ENABLED=false`, `THU_TUAN_TEST_MODE=false`, `THU_TUAN_TRANSPORT=ZALO`, `THU_TUAN_ZALO_ENV=PROD`. Tạo log Zalo 16 cột. Không có trigger.
2. Nếu đã từng có `THU_TUAN_ZALO_PROD_GROUP_CONFIRMED` (kể cả `false`/rỗng): owner **tự xóa** key này. Receiver không tự reset; còn key thì trả `PROD_RECEIVE_GROUP_CONFIRMATION_PRESENT` trước mọi API call. Nếu đổi sang nhóm khác, owner xóa cả cặp CHAT_ID/SHA256 cũ (nếu không receiver trả `PROD_TARGET_PIN_CONFLICT`).
3. Chạy tay `nhanSuKienZaloThuTuanProd`, lấy marker trong log `PROD_RECEIVE_READY`, owner mention Bot trong **đúng nhóm PROD** kèm marker đó trong cửa sổ phiên. Kỳ vọng `PROD_RECEIVE_GROUP_TARGET_PINNED`.
4. Con người xác nhận Bot đang ở đúng nhóm PROD vừa pin (trưởng nhóm/owner). **Chỉ sau đó** đặt `THU_TUAN_ZALO_PROD_GROUP_CONFIRMED=true`.
5. Duyệt nội dung kỳ hiện tại bằng `duyetKyThuTuan`/`duyetNoiDungThuTuan`.
6. Chạy `kiemTraSanSangZaloProduction()` **sau** bước duyệt, khi gửi vẫn tắt.
7. Chỉ khi kết quả là `READY_FOR_PRODUCTION_PILOT`, owner quyết định bật `THU_TUAN_ENABLED=true` rồi `caiLichThuTuan` (hàm này lại kiểm toàn bộ gate cấu hình Zalo PROD, fail thì không tạo trigger) hoặc gửi tay. Việc này nằm ngoài vòng chuẩn bị hiện tại.

**`kiemTraSanSangZaloProduction()`** chỉ đọc: không gửi, không ghi Sheet/Property, không tạo/xóa trigger, không ghi nhật ký gửi; chỉ gọi mạng `getMe`. Preview dùng core `xemTruocThuTuan` (core tự giữ ScriptLock; hàm readiness không bọc thêm lock). Đầu ra chỉ gồm mã/boolean/số đếm: `environment`, `testMode`, `enabled`, `transport`, `scriptPinned`, `sheetsPinned`, `targetPinned`, `groupConfirmed`, `isolation`, `bot`, `approval`, `preview`, `key`, `maLoiDay`, `phienBan`, `partCount`, `pending`, `alreadySent`, `unknown`, `triggersOfThisAccount`, `logSending`, `logUnknown`, `logUnrecognized`, `failed`. Không có token, chat_id, Sheet/Script/Bot ID, hash hay nội dung thư. `logSending/logUnknown/logUnrecognized` quét **toàn bộ lịch sử** của log Zalo và log Gmail (nếu có), không chỉ tuần hiện tại. Số trigger chỉ là trigger do tài khoản đang chạy tạo (giới hạn của Apps Script).

`READY_FOR_PRODUCTION_PILOT` chỉ khi đồng thời: ENV=PROD, TEST_MODE=false, ENABLED=false, transport ZALO, pin script/Sheet/target hợp lệ, isolation PROD đạt, getMe đúng Bot, GROUP_CONFIRMED=true, nội dung kỳ hiện tại đã duyệt, preview `PREVIEW` (ZALO/PROD, 1–3 phần), pending>0, alreadySent=0, unknown=0, 0 trigger, không còn `SENDING`/`UNKNOWN`/trạng thái lạ ở bất kỳ kỳ nào. Ngược lại trả `NOT_READY` với `failed` là mã ngắn: `TRANSPORT_NOT_ZALO`, `ENV_NOT_PROD`, `TEST_MODE_NOT_FALSE`, `ENABLED_NOT_FALSE`, `SCRIPT_PIN`, `SHEET_PIN`, `TARGET_PIN`, `GROUP_NOT_CONFIRMED`, `ISOLATION`, `BOT_IDENTITY`, `CONTENT_NOT_APPROVED`, `PREVIEW`, `PREVIEW_NOT_CHECKED`, `PART_COUNT`, `NO_PENDING`, `ALREADY_SENT`, `UNKNOWN_CURRENT_WEEK`, `TRIGGER_PRESENT`, `LOG_SENDING`, `LOG_UNKNOWN`, `LOG_STATE_UNRECOGNIZED`, `LOG_UNREADABLE`, `LOG_NOT_CHECKED`, `READINESS_BLOCKED`.

### Runbook runtime TEST và snapshot lịch sử

Ngày 30/9/2026 kiểm tra chỉ đọc project `TEST - Thu Tuan Loi Bac Day`: ENABLED=false, TEST_MODE=false; chỉ có các thuộc tính Gmail/approval chung, chưa có thuộc tính Zalo/transport. Không sửa properties, sheets, trigger, code cloud hoặc gửi thử. Chưa đủ điều kiện gọi getMe/sendMessage.

1. Người vận hành cấp Bot TEST có quyền group, nhóm TEST có trưởng nhóm xác nhận, token/chat_id TEST và metadata pin TEST đã kiểm chứng. Không dùng nhóm/Bot Production để thử. Không tạo profile PROD giả.
2. Chép các file `.gs` và manifest **chỉ vào project TEST**, cấp quyền external_request; giữ ENABLED=false và không trigger. Cấu hình ZALO/ENV=TEST/TEST_MODE=true và pin script/Sheet/Bot. Pin target bằng receiver, con người xác nhận đúng nhóm, **sau đó** mới đặt GROUP_CONFIRMED=true (không đặt cùng lúc với CHAT_ID/hash). Tạo trang log 16 cột; dùng nội dung giả tuần hiện tại chưa có lịch sử gửi Gmail/Zalo.
3. Duyệt fixture bằng hàm hiện có; chạy preview và xác minh 1–3 phần, đúng nguyên văn, không gửi/ghi log. Chạy `kiemTraZaloThuTuan` và yêu cầu đúng Bot + capability group.
4. Sau khi owner xác nhận nhóm TEST, bật gửi **chỉ TEST**, chạy guiThuTuan thủ công. Đối chiếu từng phần/Unicode/thứ tự trong nhóm với preview và message_id trong nhật ký. Chạy lại phải không thêm tin.
5. Với fixture riêng, xác minh sửa sau duyệt bị chặn, SENDING/UNKNOWN chặn lần sau, TEST không tạo trigger; giữ bằng chứng đã che dữ liệu nhạy cảm. Các tình huống timeout giả lập được kiểm tra local, không cần cố tạo lỗi mạng trên nhóm.
6. Tắt ENABLED, xác nhận không trigger, giữ nhật ký. Chỉ sau khi đủ bằng chứng mới ghi `THU_TUAN_ZALO_TEST_RUNTIME_ACCEPTANCE_PASS`. Production pilot là quyết định triển khai riêng của owner sau nghiệm thu; chưa được bật trong task này.

Đối soát theo **từng phần**. Chỉ người vận hành xác minh chắc chắn chưa giao mới được đổi UNKNOWN/SENDING thành PENDING rồi chạy thủ công; phải giữ nguyên phần SENT. Không dựng message_id hoặc đánh dấu SENT thiếu bằng chứng receipt API. Nếu chưa biết đã giao hay chưa, giữ UNKNOWN và dừng. Rollback: tắt ENABLED, chọn GMAIL, kiểm tra cấu hình/quota Gmail và preview cho kỳ chưa có lịch sử Zalo; cùng kỳ đã có log Zalo bị `TRANSPORT_CHANGED_DURING_WEEK`, không xóa log để vượt guard.

### Snapshot lịch sử trước bổ sung token; checklist áp dụng khi thiếu cấu hình

Lượt tiếp tục ngày 30/9/2026 đã mở đúng project TEST hiện có bằng phiên Google đã đăng nhập. Chỉ đọc tên property và trả boolean/trạng thái an toàn, không xuất token/secret/email/ID Sheet/chat. Editor TEST đang có `Mã.gs`, `EmailAssets.gs`, `appsscript.json`, chưa có `ZaloTransport.gs`; chưa thực hiện thao tác lưu/chạy. Hai Sheet ID chung hiện có và khác nhau, approval secret/approver có cấu hình, nhưng chưa có pin để xác minh chúng đúng profile. Các điều kiện dưới đây **chưa đạt runtime**:

| Gate | Kết quả trực tiếp |
|---|---|
| ENABLED / trigger | false; 0 trigger hiển thị cho tài khoản hiện tại |
| TEST_MODE / transport / ENV | false; transport thiếu → GMAIL; ENV thiếu |
| Token / Bot / chat TEST | Đều thiếu; chưa kiểm chứng capability/membership |
| Pin TEST + PROD | Snapshot lịch sử: pin TEST thiếu; PROD chưa tồn tại và không phải gate TEST-only hiện hành |
| Tab log 16 cột | Schema local đã rà soát; chưa kiểm tra/tạo trên cloud do dừng tại gate cấu hình |
| GAS/manifest, getMe, preview Zalo, fixture, receipts/dedupe/reconciliation | Chưa thực hiện runtime; không thay bằng giả lập |

Owner chỉ cần hoàn tất các thao tác bắt buộc sau, không cần tự deploy hoặc gửi fixture:

1. Trên điện thoại, mở **Zalo Bot Creator**, chọn/tạo Bot **TEST riêng**, lấy token và ID Bot từ thông tin quản trị đã xác minh. Trong Apps Script **project TEST** → Cài đặt dự án → Thuộc tính tập lệnh, lưu `THU_TUAN_ZALO_TEST_BOT_TOKEN` và `THU_TUAN_ZALO_TEST_BOT_ID`. Giữ `THU_TUAN_ENABLED=false`; không gửi token trong chat/repo hoặc dán URL token vào trình duyệt. Phiên Google hiện tại không cần đăng nhập lại.
2. Trong Bot Creator chọn **Mời Bot vào nhóm**, chia sẻ lời mời vào **nhóm TEST**, trưởng nhóm nhấn **Thêm Bot vào Nhóm → Xác nhận**. Cho biết tên nhóm TEST được phép (không cần chat_id thô). Nếu không có tính năng mời nhóm hoặc Bot chưa có capability, cần người quản trị/Zalo cấp quyền group; giữ BLOCKED, không dùng Bot Production thay thế.
3. Nếu đã có chat_id xác minh từ sự kiện của đúng nhóm, lưu riêng `THU_TUAN_ZALO_TEST_CHAT_ID` và `THU_TUAN_ZALO_TEST_CHAT_SHA256` (SHA-256 UTF-8 của chuỗi chat_id, hex thường). Nếu chưa có, trong nhóm TEST mention đúng Bot kèm marker mới của `TEST_RECEIVE_READY` trong phiên nhận đã phối hợp, rồi báo đã thực hiện. Chat ID phải lấy từ `chat.id` của sự kiện khớp marker/nhóm, không suy ra từ tên nhóm hoặc link mời. Khi có token và xác nhận nhóm, agent có thể thực hiện kiểm tra nhận sự kiện một lần trong TEST nếu Bot không có webhook/consumer khác; không cài webhook, không xóa webhook hiện có, không poll Production và không in raw event/chat_id. Nếu đã có consumer TEST, owner lấy ID từ consumer đó thay vì tranh đọc event.
4. Không cần có project/Bot Production để nghiệm thu TEST. Chỉ đặt đủ profile TEST thật đã xác minh trong project TEST; để trống toàn bộ profile PROD cho tới khi Production thực sự được tạo và xác minh. Không tạo/sửa project, Sheet, Bot, trigger hoặc cấu hình Production và không dựng ID giả. ENV=TEST, TEST_MODE=true; script ID thực tế cùng hai Sheet ID phải khớp pin TEST.

Sau khi prerequisites đầy đủ, agent triển khai/chấp thuận OAuth chỉ TEST, tạo/kiểm tra log, duyệt fixture mới, preview rồi getMe, chỉ bật gửi tạm khi toàn bộ gate đạt; gửi đúng **01 Thư tuần fixture** (1–3 phần). Đối chiếu nội dung/receipt rồi chạy lại để chứng minh không gửi trùng; kiểm chứng reconciliation không thêm tin, không đánh dấu PENDING cho phần đã giao. Cuối lượt đặt ENABLED=false, giữ TEST_MODE=true/ENV=TEST để không vô tình rơi sang PROD, không tạo trigger và giữ nhật ký. Không đổi verdict runtime thành PASS nếu thiếu bằng chứng trực tiếp.

Tham khảo [group chat.id/mời Bot](https://bot.zapps.me/docs/build-bot-interaction-with-group/) và [getUpdates](https://bot.zapps.me/docs/apis/getUpdates/): polling nhận sự kiện và webhook loại trừ lẫn nhau. Việc xác minh chat một lần ngoài transport không biến service thành receiver/queue/webhook.

### Sau khi owner bổ sung token TEST (30/9/2026)

- Đã kiểm chứng tên hai workbook TEST qua Drive metadata và script ID qua giao diện project TEST; lưu THU_TUAN_ZALO_TEST_SCRIPT_ID, CONTENT_SHEET_ID, PRIVATE_SHEET_ID, BOT_ID. Đặt THU_TUAN_TRANSPORT=ZALO, THU_TUAN_ZALO_ENV=TEST, THU_TUAN_TEST_MODE=true; giữ THU_TUAN_ENABLED=false. Không sửa dữ liệu nội dung/approval/recipient hoặc lịch sử Gmail.
- getMe HTTPS POST chỉ đọc ngoài GAS trả ok=true, ID chuỗi, account_name `bot.POyBVXga`, can_join_groups=true; account_name khớp Bot đã quan sát trong nhóm Test. Owner xác nhận chưa có consumer và đã mention Bot; không yêu cầu nhắn lại. getWebhookInfo trả HTTP 200/ok=false/error_code=404 nên trạng thái webhook chưa xác định. Hai lần thử getUpdates TEST (timeout 1 và 5 giây) trả HTTP 200/error_code=408, không có event; chưa thu thập chat.id. Không tiếp tục poll mù hay chuyển sang webhook.
- Source cloud TEST và manifest đọc lại bằng editor khớp local (chuẩn hóa CRLF/LF). Giữ EmailAssets.gs hiện có. Không deploy web app/API executable. Log ThuTuan_Zalo_NhatKyGui tại workbook riêng tư TEST có đúng A1:P1, 16 cột, hàng dưới trống; đã kiểm tra cả connector và giao diện. Trang Kích hoạt hiện 0 trigger của account đang đăng nhập.
- Preview xemTruocThuTuan đã khởi chạy nhưng Apps Script yêu cầu OAuth cho scope mới; đã huỷ trước khi cấp quyền. Không có kết quả preview hay preflight GAS. Không gửi TEST/PROD, không kiểm chứng runtime receipt/dedupe/reconciliation bằng mock.
- **Sự cố thao tác:** một snapshot chuyển trang chưa che đã đưa token TEST và approval secret TEST vào đầu ra công cụ. Không ghi chúng vào source/docs/backup. Theo hướng dẫn của owner, hoãn thay đồng thời hai giá trị tới sau khi kiểm tra runtime ổn định; không yêu cầu gửi giá trị qua chat. Dùng secret ngẫu nhiên mới ≥32 ký tự cho approval secret TEST. Fixture mới cần được duyệt lại bằng khóa mới; giữ nguyên lịch sử gửi cũ.
- Owner xác nhận chưa có project/Bot Production riêng. Còn thiếu TEST_CHAT_ID/CHAT_SHA256/GROUP_CONFIRMED; toàn bộ profile PROD được để trống và không chặn TEST-only. Không tự tạo Production, không lấy Bot khác làm PROD, không điền sentinel/ID giả, không hạ guard. Khi Production được tạo trong công việc riêng, metadata mới được xác minh độc lập.

### Lỗi chạy `kiemTraZaloThuTuan`: `ZALO_ISOLATION_REQUIRED` (30/9/2026)

Ảnh Execution log cho thấy hàm đã vào code và bị chặn ở isolation gate trước gọi Zalo. Nguyên nhân implementation cũ bắt buộc metadata PROD dù project PROD chưa tồn tại. Đây là ràng buộc bootstrap sai: pinning project/Sheet/Bot/chat của môi trường đang chạy và so sánh `ScriptApp.getScriptId()` đủ để TEST-only deployment không thể chuyển sang profile PROD khác mà vẫn vượt guard.

Đã sửa `ZaloTransport.gs` và cập nhật riêng tệp này trên project TEST sau khi regression local đạt. Profile hoạt động vẫn bắt buộc đủ cả 5 pin; profile đối diện được bỏ trống hoàn toàn. Nếu profile đối diện có khai báo một pin thì yêu cầu đủ tất cả pin và xác minh các ID khác nhau. Đổi `ENV`/`TEST_MODE` trong project TEST sang PROD vẫn bị chặn vì `Script ID` thực tế không khớp pin PROD. `ENABLED=false`; không cập nhật project PROD và không gửi tin.

Sau khi source mới đã lưu trên project TEST, chạy lại `kiemTraZaloThuTuan`. Nếu isolation qua nhưng báo `ZALO_TARGET_REQUIRED`, TEST chat ID chưa được lưu; nếu `ZALO_GROUP_CONFIRMATION_REQUIRED`, chưa xác nhận Bot đã tham gia đúng nhóm. Cả hai dừng trước API send. `kiemTraZaloThuTuan` chỉ gọi getMe, không gửi tin. Chưa đạt runtime acceptance cho tới khi có chat ID sự kiện TEST, preview và fixture được owner cho phép gửi vào nhóm TEST.

### Snapshot lịch sử sau cập nhật source TEST (30/9/2026), đã được chỉ đạo hiện hành thay thế

- `THU_TUAN_TEST_MODE=true`, `THU_TUAN_TRANSPORT=ZALO`, `THU_TUAN_ZALO_ENV=TEST`, `THU_TUAN_ENABLED=false`; pin Script ID và hai Sheet TEST khớp profile. Không có pin PROD, nay hợp lệ cho TEST-only.
- Chạy `kiemTraZaloThuTuan` vẫn trả `ZALO_ISOLATION_REQUIRED` vì thiếu pin active `THU_TUAN_ZALO_TEST_CHAT_SHA256`. Đồng thời chưa có `THU_TUAN_ZALO_TEST_CHAT_ID` và `THU_TUAN_ZALO_TEST_GROUP_CONFIRMED`; không đi tới getMe/sendMessage.
- Lần đọc Script Properties mới nhất vô tình đưa credential TEST vào đầu ra công cụ. Không dùng credential đó thêm; cần thay Bot TEST token và approval secret TEST cùng một lượt trước bất kỳ API call nào, rồi duyệt lại fixture. Không ghi giá trị vào repo.
- Local `node --test tests/thu-tuan.test.cjs`: 83/83. Runtime acceptance vẫn `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_MISSING_TEST_CHAT_ID_HASH_GROUP_CONFIRMATION_AND_SECRET_ROTATION`; Production không thay đổi.

Bước tiếp theo ghi ở lượt 30/9 (lịch sử, đã được runbook hiện hành thay thế): owner đã mention nên không nhắn lại. Để lấy chat.id, cần event TEST đọc được qua getUpdates hoặc consumer hiện có; hai poll đều timeout 408, getWebhookInfo không kết luận được trạng thái webhook. Không lặp poll mù hoặc đổi/xóa webhook. Sau khi có đường đọc event được xác minh, đối chiếu chat.id và membership, tính SHA-256; cấp quyền Google TEST theo manifest, rồi chạy preview/getMe GAS. Owner cần chuẩn bị metadata Production thật trong project TEST; hiện chưa có project/Bot Production và không dựng pin giả. Chỉ sau toàn bộ gate PASS mới bật tạm, gửi 01 fixture TEST, đối chiếu receipt/nội dung/dedupe/reconciliation, tắt ENABLED và thay hai secret TEST cùng một lượt. Verdict: `THU_TUAN_ZALO_TEST_RUNTIME_BLOCKED_GETUPDATES_408_OAUTH_AND_PROD_ISOLATION`; chưa mở pilot Production.
