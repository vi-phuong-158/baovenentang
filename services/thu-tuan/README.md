# Thư tuần “Lời Bác dạy”

Module độc lập cho nội dung đã duyệt. **Chưa bật gửi, chưa cài lịch, chưa kiểm thử tài khoản thật.** Không copy thư mục này vào backend Apps Script public; không deploy Web App. Không có doGet/doPost hoặc API lấy danh sách nhận.

## Chuẩn bị

Dùng project Apps Script riêng với Code.gs và appsscript.json. Chỉ người vận hành được phép có quyền chỉnh sửa. Tạo bảng tính nội dung và bảng tính hạn chế riêng; điền hàng đầu theo THU_TUAN_HEADERS trong Code.gs. Các cột Ky phải định dạng plain text YYYY-MM-DD, là ngày thứ Hai mở đầu tuần theo Asia/Ho_Chi_Minh. Không dùng dữ liệu thật trước khi nơi lưu, quyền và thời hạn lưu/xóa được chấp thuận.

Giữ nguyên thứ tự 10 cột hiện có của LoiDay_NoiDung và nối thêm 7 cột theo thứ tự: ChuDe, BoiCanh, PhanTich, LienHeCAND, LienHeAnNinhDoiNgoai, HanhDongTuanNay, NotebookLM_URL. Cần thêm các tiêu đề này trước khi thử runtime; thiếu cột thì module từ chối đọc sheet. GoiYLienHe được giữ nguyên như cột cũ để bảo toàn dữ liệu; email mới lấy nội dung từ các cột cấu trúc được nối thêm, không tự động chuyển dữ liệu cũ.

Script Properties:

| Tên | Giá trị/ý nghĩa |
|---|---|
| THU_TUAN_ENABLED | false; chỉ chuyển true sau khi có quyền thử gửi |
| THU_TUAN_CONTENT_SHEET_ID | ID bảng tính nội dung, không ghi giá trị thật vào repo |
| THU_TUAN_PRIVATE_SHEET_ID | ID bảng tính chứa người nhận và nhật ký, khác bảng nội dung |
| THU_TUAN_APPROVER_EMAILS | Danh sách email người duyệt được phân công; giữ trong cấu hình hạn chế |

Nội dung và người nhận do người phụ trách nhập, không có seed lời dạy hoặc địa chỉ thật. Trạng thái nhập Nhap; sau đối chiếu nguồn, người duyệt gọi duyetNoiDungThuTuan với ngày mở đầu kỳ để đóng dấu phiên bản. Hàm kiểm tra Session.getActiveUser và danh sách người duyệt; thiếu danh tính thì từ chối. Có thể chạy một hàm bao thủ công trong editor để truyền tham số. Email lấy nguyên văn các trường đã duyệt theo thứ tự Tuần/Chủ đề, Mã lời dạy, Lời Bác dạy, Nguồn, Bối cảnh, Phân tích, Liên hệ CAND, Liên hệ An ninh đối ngoại, Hành động tuần này. Runtime không gọi AI để soạn thư.

Dấu duyệt ràng buộc digest với mọi trường nội dung dùng trong email, URL NotebookLM, trạng thái, người duyệt, ngày duyệt và phiên bản. Sửa nội dung hoặc metadata sau duyệt làm digest không còn khớp và ngừng gửi; quyền sửa metadata/dấu duyệt vẫn phải được hạn chế tại Sheets/project. NotebookLM chỉ xuất hiện dưới dạng liên kết tra cứu ở cuối thư, kèm yêu cầu đối chiếu nguồn trích dẫn.

## Thử và mở lịch

1. Chạy xemTruocThuTuan(): không gửi/không ghi log, trả số pending/alreadySent/unknown. Kiểm tra đúng kỳ và nội dung.
2. Khi đã có quyền gửi thử, cấu hình true và chạy guiThuTuan() với nhóm địa chỉ thử được phép. Không chạy bằng danh sách toàn đơn vị trước nghiệm thu.
3. Mỗi người nhận được một email responsive HTML cùng plain-text fallback, không CC/BCC. Mọi giá trị Sheet được HTML-escape. Sai/trùng địa chỉ làm dừng trước lượt; sửa danh sách rồi chạy lại. Đăng ký có thể dừng bằng TamDung.
4. Khi đạt kiểm thử, người vận hành mới gọi caiLichThuTuan(): thứ Hai 7h–8h Asia/Ho_Chi_Minh. Hàm không tạo thêm nếu cùng tài khoản đã có trigger; trigger của tài khoản khác có thể không hiện trong danh sách, vì vậy bàn giao phải rà soát cả tài khoản cũ. Khóa và nhật ký vẫn chặn gửi lặp trong cùng project.
5. Đọc Apps Script Executions/kết quả hàm để theo dõi. Module không gửi email cảnh báo tự động, tránh phụ thuộc chính quota đang lỗi; đầu mối cần lịch kiểm tra kết quả gửi.

## Gửi dở và đối soát

SENDING ghi trước MailApp và flush. Ghi SENT chỉ sau lệnh được chấp nhận. SENDING/UNKNOWN tồn tại từ lần trước không tự retry; người phụ trách xác minh trước khi quyết định đánh dấu SENT hoặc PENDING. Không suy lỗi ghi log nghĩa là chưa gửi. Trạng thái COMPLETE là hoàn tất xử lý lượt trong phạm vi danh sách hợp lệ, không chứng minh người nhận đã đọc hoặc thư vào inbox.

Không sửa nội dung giữa tuần đã có log: cần xử lý theo quy trình có duyệt, không tự xóa nhật ký để gửi lại. Chạy lại thủ công trong cùng tuần tiếp tục phần chưa gửi. Lượt tự dừng sau khoảng bốn phút để giữ khoảng trống trước giới hạn runtime; người vận hành xử lý DEFERRED, không có trigger retry tự động.

## Dữ liệu, thời hạn và bàn giao

Nhật ký chỉ giữ mã người nhận và metadata/trạng thái; không email hoặc nội dung thư. SENT/UNKNOWN dùng cho chống gửi trùng; không xóa log của kỳ đang hoạt động. Thực hiện xóa/ẩn danh theo thời hạn đã duyệt tại nơi vận hành, kể cả bản sao. Bản mã này chưa tự động xóa dữ liệu vì chưa có thời hạn được xác nhận.

Giới hạn số người nhận, quota, thời gian và khả năng phát thư phải thử trên tài khoản thật. Không cam kết gửi đúng một lần tuyệt đối qua hai dịch vụ MailApp/Sheets. Tài khoản sở hữu, quyền Sheets, trigger và dự phòng phải được bàn giao; copy code không đủ.

Kiểm thử cục bộ: node --test tests/hoc-tap.test.cjs từ gốc repo. Các gate runtime chi tiết ở docs/TROLY35_HOC_TAP_V6_1.md và Mẫu 09 hồ sơ mô hình.
