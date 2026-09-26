# Thư tuần “Lời Bác dạy”

Module Apps Script **độc lập**, gửi mỗi sáng thứ Hai một thư điện tử lấy **nguyên văn** nội dung đã được con người duyệt trong Google Sheets.

> **Trạng thái 26/9/2026:** mã nguồn đã hoàn thiện và qua kiểm thử cục bộ (Google được giả lập). **Chưa chạy trên tài khoản Google thật, chưa bật gửi, chưa cài lịch.** Không coi tài liệu này là bằng chứng đã vận hành.

## 0. Nguyên tắc không đổi

- **Không có AI khi gửi.** Thư chỉ ghép các ô đã duyệt, không tạo, tóm tắt hay sửa câu chữ.
- **Chỉ gửi nội dung đã duyệt:** `NHÁP → kiểm tra nguồn → DUYỆT (khóa phiên bản) → được phép gửi`. Thiếu gì hoặc bị sửa sau duyệt thì **dừng, không gửi**.
- **Cấu trúc thư (giữ nguyên thứ tự):** Tuần/Chủ đề · Mã lời dạy · Lời Bác dạy · Nguồn · Bối cảnh · Phân tích · Liên hệ với Công an nhân dân · Liên hệ với công tác An ninh đối ngoại · Hành động tuần này. Cuối thư **có thể** có liên kết NotebookLM để tra cứu thêm, kèm lời nhắc: NotebookLM không phải nguồn chính thức, phải đối chiếu nguồn gốc. Ô NotebookLM để trống thì thư không có phần này.
- **Mỗi người nhận một thư riêng**, không CC/BCC, không lộ địa chỉ người khác. Không có đường dẫn theo dõi cá nhân.
- **Không public:** không deploy Web App, không `doGet/doPost`, không copy vào `backend/`.

## 1. Chuẩn bị (làm một lần)

### 1.1. Project Apps Script riêng

1. Vào script.google.com → *Dự án mới*. Đặt tên, ví dụ “Thư tuần Lời Bác dạy”.
2. Dán toàn bộ `Code.gs`. Bật *Cài đặt dự án → Hiển thị tệp kê khai “appsscript.json”* rồi dán `appsscript.json` (múi giờ `Asia/Ho_Chi_Minh`).
3. **Không** bấm *Triển khai → Ứng dụng web*.

Tài khoản sở hữu project là tài khoản gửi thư. Chọn tài khoản công vụ/được phép, có người dự phòng.

### 1.2. Hai bảng tính tách biệt

| Bảng tính | Trang tính (tên chính xác) | Hàng 1 – tiêu đề, đúng thứ tự | Ai được sửa |
|---|---|---|---|
| **A – Nội dung** | `LoiDay_NoiDung` | `Ky, MaLoiDay, NoiDungNguyenVan, NguonTrich, GoiYLienHe, TrangThai, NguoiDuyet, NgayDuyet, PhienBan, DauVanBanDuyet, ChuDe, BoiCanh, PhanTich, LienHeCAND, LienHeAnNinhDoiNgoai, HanhDongTuanNay, NotebookLM_URL` | Người biên soạn, người duyệt |
| **B – Hạn chế** | `ThuTuan_NguoiNhan` | `MaCB, Email, TrangThai, NgayDangKy` | Chỉ người vận hành |
| **B – Hạn chế** | `ThuTuan_NhatKyGui` | `Khoa, Ky, MaCB, MaLoiDay, PhienBan, DauVanBanDuyet, TrangThai, CapNhatLuc, MaLoi` | Chỉ script + người vận hành (khi đối soát) |

- 10 cột đầu của `LoiDay_NoiDung` là cấu trúc cũ, **không được đổi thứ tự hay ý nghĩa**; 7 cột sau được nối thêm. `GoiYLienHe` là cột cũ, không in ra thư nhưng vẫn nằm trong dấu duyệt. Sai/thiếu tiêu đề → script báo `INVALID_HEADERS` và không làm gì.
- **Trước khi nhập dữ liệu**, chọn cột `Ky` (bảng A) và cột `MaCB` (bảng B) → *Định dạng → Số → Văn bản thuần túy*. Nếu Sheets tự đổi `2026-10-05` thành ngày, script báo `KY_NOT_PLAIN_TEXT` và dừng. Nhật ký do script tự định dạng.
- `Ky` = **ngày thứ Hai** mở đầu tuần, dạng `YYYY-MM-DD` (giờ Việt Nam).
- Người nhận: `TrangThai` = `DangNhan` (đang nhận) hoặc `TamDung` (dừng nhận). `MaCB` là mã nội bộ, chỉ gồm chữ/số/`-`/`_`, **không trùng** trên toàn trang (kể cả dòng TamDung).
- Không đưa email thật, ID bảng tính hay khóa vào repository.

### 1.3. Script Properties (*Cài đặt dự án → Thuộc tính tập lệnh*)

| Tên | Giá trị |
|---|---|
| `THU_TUAN_ENABLED` | `false`. Chỉ đổi thành đúng chữ `true` khi được phép gửi. Mọi giá trị khác đều là tắt. |
| `THU_TUAN_CONTENT_SHEET_ID` | ID bảng tính A (đoạn giữa `/d/` và `/edit` trong đường dẫn) |
| `THU_TUAN_PRIVATE_SHEET_ID` | ID bảng tính B (phải khác A) |
| `THU_TUAN_APPROVER_EMAILS` | Email người duyệt được phân công, cách nhau bằng dấu phẩy |
| `THU_TUAN_APPROVAL_SECRET` | **Không tự gõ.** Chạy hàm `taoKhoaDuyetThuTuan` một lần để script tự tạo. Không sao chép ra ngoài. |

Khóa duyệt dùng để ký “dấu duyệt” (`DauVanBanDuyet`). Người chỉ có quyền sửa bảng tính không thể tự tạo dấu hợp lệ. **Đổi hoặc xóa khóa làm mọi bản đã duyệt mất hiệu lực** (phải duyệt lại).

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
- Công cụ kiểm tra đủ 52 tuần, không trùng tuần/mã, đủ 9 trường, nguồn có tập/trang; có lỗi thì **không** xuất file.
- Mọi dòng xuất ra ở trạng thái `Nhap`; `NguoiDuyet`, `NgayDuyet`, `DauVanBanDuyet`, `PhienBan`, `NotebookLM_URL` để trống. Công cụ **không bao giờ** đánh dấu `DaDuyet`.
- Nhập vào bảng tính A: *Tệp → Nhập → Tải lên*, chọn *Chèn (các) trang tính mới* và **bỏ chọn** “Chuyển đổi văn bản thành số, ngày tháng và công thức”. CSV đã có đúng hàng tiêu đề. Kiểm tra lại rồi đổi tên trang mới thành `LoiDay_NoiDung` (trang cùng tên cũ, nếu còn, phải đổi tên/xóa trước). Đặt cột `Ky` là văn bản thuần túy.

### Nhập tay

Mỗi kỳ một dòng, `TrangThai` = `Nhap`. Không dán nội dung từ kết quả AI vào `NoiDungNguyenVan`; nguyên văn chép từ bản gốc.

## 3. Quy trình mỗi tuần

| Bước | Ai | Làm gì | Kết quả mong đợi |
|---|---|---|---|
| 1. Kiểm nguồn | Người biên soạn/duyệt | Đối chiếu nguyên văn, tập, trang với Hồ Chí Minh Toàn tập; điền `PhienBan` (ví dụ `1`) | Dòng đủ 9 trường + phiên bản |
| 2. Duyệt | Người duyệt | Trong editor, sửa ngày trong hàm `duyetKyThuTuan` thành thứ Hai của kỳ, lưu, chọn hàm đó → *Chạy* | Nhật ký: `{"status":"APPROVED",...}`; dòng có `DaDuyet`, người duyệt, ngày duyệt, dấu duyệt |
| 3. Xem trước | Người vận hành | Chạy `xemTruocThuTuan` (không gửi, không ghi) | `PREVIEW`, đúng `key` (thứ Hai tuần này), đúng `maLoiDay`, `pending` = số người sẽ nhận, `quota` ≥ `pending` |
| 4. Gửi | Lịch tự động hoặc chạy `guiThuTuan` | Chỉ gửi khi `THU_TUAN_ENABLED=true` | `COMPLETE`, `sent` = số thư gửi lần này |
| 5. Đối soát | Người vận hành | *Executions* của project; trang `ThuTuan_NhatKyGui` | Không còn `SENDING/UNKNOWN`; xử lý mục 5 nếu có |

Sửa bất kỳ ô nào đã duyệt (kể cả NotebookLM, phiên bản, người/ngày duyệt) → dấu duyệt không khớp → không gửi. Muốn sửa: sửa nội dung, tăng `PhienBan`, duyệt lại. **Không sửa hoặc duyệt lại kỳ đã bắt đầu gửi** – script sẽ dừng cả kỳ (`CONTENT_CHANGED_DURING_WEEK`) để không trộn hai phiên bản.

### Lỗi khi duyệt

| Thông báo | Ý nghĩa | Xử lý |
|---|---|---|
| `APPROVER_REQUIRED` | Người chạy không có trong danh sách hoặc Google không trả email | Kiểm tra `THU_TUAN_APPROVER_EMAILS`, tài khoản chạy (mục 1.4) |
| `INVALID_WEEK` | Ngày không phải thứ Hai dạng `YYYY-MM-DD`, chưa sửa `YYYY-MM-DD` mẫu, hoặc không có/đúp dòng kỳ đó | Sửa ngày; kiểm tra cột `Ky` |
| `INCOMPLETE_CONTENT` | Thiếu một trong 9 trường hoặc `PhienBan` | Điền đủ |
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

Không có trigger tự thử lại. Lỗi/`DEFERRED` do người vận hành xử lý. Module không gửi email cảnh báo – người vận hành cần xem *Executions* sáng thứ Hai.

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

Dùng project + 2 bảng tính **TEST** riêng, 1 dòng nội dung giả có chữ `TEST`, 2–3 địa chỉ thử được phép. Ghi lại bằng chứng (ảnh *Executions*, ảnh nhật ký, thư nhận được) cho từng bước:

1. `THU_TUAN_ENABLED=false`, chạy `taoKhoaDuyetThuTuan` → `CREATED`.
2. `xemTruocThuTuan` khi chưa duyệt → `CONTENT_NOT_APPROVED`, `reason: NOT_APPROVED`; nhật ký trống.
3. Người duyệt chạy `duyetKyThuTuan` → `APPROVED`. Thử bằng tài khoản ngoài danh sách → `APPROVER_REQUIRED`.
4. `xemTruocThuTuan` → `PREVIEW`, đúng số người; **không có thư, nhật ký trống**.
5. `guiThuTuan` khi còn `false` → `DISABLED`, không thư.
6. Đặt `true`, `guiThuTuan` → `COMPLETE`. Kiểm tra mỗi hộp thư: tiêu đề, thứ tự 9 mục, tiếng Việt, nguồn, liên kết NotebookLM (nếu có) và lời nhắc, bản xem trên điện thoại, *chỉ thấy địa chỉ của chính mình*.
7. Chạy lại `guiThuTuan` → `alreadySent` = số người, không thư mới.
8. Sửa một chữ trong nội dung → `xemTruocThuTuan` → `STAMP_MISMATCH`. Hoàn tác.
9. Sửa một dòng nhật ký thành `UNKNOWN` → chạy lại → `RECONCILIATION_REQUIRED`, không thư mới.
10. `caiLichThuTuan` → `CREATED`, chạy lại → `EXISTS`; `kiemTraLichThuTuan`; `goLichThuTuan`. Đặt lại `false`.

Chỉ khi đủ 10 bước mới ghi `THU_TUAN_TEST_RUNTIME_ACCEPTANCE_PASS`.

## 10. Dữ liệu và thời hạn lưu

Nhật ký chỉ giữ mã người nhận và metadata, không email hay nội dung thư. Không xóa nhật ký kỳ đang hoạt động. Xóa/ẩn danh theo thời hạn đã được phê duyệt tại nơi vận hành (mã chưa tự xóa vì chưa có thời hạn được xác nhận). Tài khoản sở hữu, quyền Sheets, lịch và người dự phòng phải được bàn giao; sao chép mã là chưa đủ.

## 11. Kiểm thử cục bộ

```
node --test tests/thu-tuan.test.cjs
```

Toàn bộ dịch vụ Google được giả lập, kể cả việc Sheets tự đổi chuỗi ngày thành Date và làm tròn giây. Đây **không** thay thế nghiệm thu mục 9.
