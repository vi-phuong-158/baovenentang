# Trợ lý 35 — triển khai hướng học tập theo lời Bác

Ngày 19/9/2026. Nhánh: `codex/troly35-hoc-tap-loi-bac`, bắt đầu từ main tại thời điểm tạo nhánh. Đây là thay đổi mã nguồn cục bộ, chưa triển khai, chưa xác nhận dữ liệu production hoặc nghiệm thu toàn hệ thống. Hồ sơ công tác và danh sách cán bộ không được sao chép vào repository hoặc ứng dụng công khai.

## Quyết định và phạm vi

Chọn phạm vi học tập công khai có duyệt, không xây hệ thống đánh giá cán bộ hoặc xác thực nội bộ bằng mã chung. Hồ sơ mô hình, ứng dụng công khai và thư tuần được nghiệm thu riêng. Giữ React/Vite + Apps Script + Sheets, không thêm dependency.

- Chặn history, trends, rate, feedback và lưu quiz ở proxy; backend cũng từ chối để không thể đi vòng qua URL GAS. Tạm dừng feedback vì đang phụ thuộc lịch sử và chứa preview/nội dung phản hồi. Không xóa dữ liệu cũ tự động.
- Luồng Trợ lý 35 không ghi lịch sử mới hoặc dùng cache kết quả hội thoại chung; UI không phục hồi/lưu session chat và xóa khóa session cũ trên tab hiện tại khi mở. Không khẳng định đã xóa dữ liệu trên nhà cung cấp, thiết bị khác hoặc dữ liệu lịch sử cũ.
- Tủ sách và quiz chỉ phục vụ hàng DaDuyet có nguồn, người duyệt, ngày duyệt, phiên bản. GET sách không tự seed hoặc thay dữ liệu. Tủ sách không dùng cache local cũ; mở chi tiết phải lấy lại bản hiện hành, lỗi thì không phục hồi bản cũ.
- Quiz chọn chuyên đề trước lấy câu, tính theo số câu thật, xem giải thích/nguồn, không ghi kết quả cá nhân. Bộ câu hỏi thiếu metadata chưa hiển thị; đây là chuyển đổi cần duyệt, không tự gắn dấu duyệt.
- Thư tuần nằm ở services/thu-tuan, chạy trong project Apps Script riêng, không đưa vào backend public. Mặc định tắt, không tạo trigger hoặc gửi thư khi chỉ copy mã. Email dựng từ các trường nội dung đã duyệt theo đúng bố cục; có HTML responsive, plain-text fallback và escape giá trị Sheet. Dấu duyệt (HMAC có khóa trong Script Properties) ràng buộc nội dung, metadata duyệt, NotebookLM URL và phiên bản; người duyệt phải thuộc allowlist. NotebookLM là tùy chọn, chỉ là link tra cứu cuối thư kèm nhắc đối chiếu nguồn.

## Phân tích tác động trước sửa

Đã dùng CodeGraph explore/impact/callers/callees. authorizeAction được handler proxy gọi; getRandomQuiz có caller ở doGet và Telegram; getBooks ảnh hưởng API và HocTap/TuSach. CodeGraph không trả caller handleTroLy35History dù doPost thực tế có gọi; đã đọc router để bổ sung. Các hàm lịch sử gọi getSheet_/đọc bảng chung, nên chặn ngay handler trước I/O. Không thay luồng tạo nội dung AI hoặc module video.

Giữ tên action và envelope success/data/error; các action bị tạm dừng trả success=false (proxy HTTP 403, GAS JSON lỗi). quiz thêm tham số category tùy chọn và GET quiz_topics; trường câu hỏi thêm source/version. Cột schema chỉ thêm cuối; không đổi thứ tự cột cũ. Không di chuyển dữ liệu hay tự chạy setupSystem.

## Chuyển dữ liệu trong môi trường thử nghiệm

Sao lưu có kiểm soát tại nơi được phép trước thay schema; không dùng bản sao nghiệp vụ để thử.

| Sheet | Cột thêm cuối, đúng thứ tự | Điều kiện phục vụ |
|---|---|---|
| QUIZ | Nguồn; Trạng thái duyệt; Người duyệt; Ngày duyệt; Phiên bản | DaDuyet; đủ câu/đáp án/giải thích/chủ đề/nguồn/dấu vết duyệt |
| TU_SACH | Người duyệt; Ngày duyệt; Phiên bản | Trạng thái đổi sang DaDuyet sau duyệt thật; đủ nguồn và URL |

Người phụ trách phải rà soát, được phép công bố và duyệt từng tài liệu; không tự chuyển tất cả Hoạt động thành DaDuyet. Danh mục cũ có thể tạm trống cho đến khi hoàn tất bước này. Mã chưa phát hiện tự động mọi sửa đổi sau duyệt ở TU_SACH/QUIZ: quy trình bắt buộc đưa về nháp, sửa và duyệt lại, khóa quyền chỉnh sửa phù hợp. Dấu kiểm tra sửa sau duyệt tự động hiện có ở module thư tuần riêng.

Đối với nguồn video/infographic tĩnh, RAG/Pinecone và NotebookLM: tiếp tục lập danh mục, kiểm tra quyền công bố, phiên bản, bản sao và thu hồi. Không suy từ sửa Tủ sách/quiz rằng mọi nguồn dữ liệu đã đạt điều kiện.

## Điều kiện kiểm tra bản triển khai

1. Ghi commit/bản build và deployment GAS thử nghiệm cụ thể; không coi branch là phiên bản production.
2. Phiên sạch và gọi trực tiếp API không được đọc lịch sử/xu hướng, kể cả biết mã chung; kiểm tra cả frontend cũ gọi backend mới.
3. Dùng dữ liệu giả lập để kiểm tra không có lịch sử/preview/feedback mới; rà soát thêm logger, cache phụ trợ, nhà cung cấp và dữ liệu cũ bằng người có thẩm quyền.
4. Tủ sách nháp/trống/thu hồi/thiếu nguồn không có trong danh mục lẫn GET book; quiz không trộn chủ đề và không ghi QUIZ_RESULT.
5. Kiểm tra chọn chuyên đề, đáp án, giải thích, số câu và lỗi tải; rà soát giao diện di động.
6. Thư tuần: theo README riêng và Mẫu 09. Không bật gửi hoặc tạo lịch trước khi nơi lưu danh sách, nội dung và chạy thử được chấp thuận.
7. Chỉ chấp thuận phạm vi đã kiểm tra; các gate chưa chạy giữ CHƯA KIỂM TRA.

## Kiểm tra cục bộ

`node --test tests/hoc-tap.test.cjs tests/thu-tuan.test.cjs` chạy bằng Node built-in test, dùng dữ liệu giả và I/O mock. hoc-tap: router trực tiếp, proxy, trạng thái duyệt Tủ sách/quiz, lọc chủ đề. thu-tuan (từ 26/9/2026 tách riêng): duyệt/dấu HMAC/allowlist, khóa, preview, quota, thời gian, giao năm, gửi dở, đối soát, trigger, mô phỏng Sheets đổi chuỗi ngày thành Date, công cụ nhập corpus. Đây không phải thử trên Google runtime hoặc gửi thư thật.

`npm run build` trong web xác minh bundle; dùng kiểm tra cú pháp qua Node VM cho .gs vì Node không nhận trực tiếp extension .gs.

## Kết quả kiểm tra ngày 19/9/2026

- Node v24.11.0: node --test tests/hoc-tap.test.cjs — 19/19 thành công, không bỏ qua; toàn bộ Google I/O dùng mock. Có kiểm tra thu hồi metadata duyệt giữa lượt gửi và direct GAS submit_quiz.
- npm run build trong web — thành công với dependencies có sẵn; không cài mới.
- Parse 17 tệp .gs bằng Node VM và đọc manifest JSON — không lỗi cú pháp. Đây không thay kiểm tra Google runtime.
- git diff --check — không có lỗi khoảng trắng; Git cảnh báo chuẩn hóa LF/CRLF và quyền đọc cache sẵn có, không thay đổi các cache đó.
- Browser trên bản build với API fixture tại loopback: chọn chuyên đề B, đúng 2 câu của B; hiển thị đáp án/giải thích/nguồn; làm một đúng, một sai cho kết quả 1/2 = 50%; lỗi tải được hiển thị; chi tiết sách bị thu hồi không dùng bản cũ; giao diện trợ lý có thông báo phạm vi công khai và không có lịch sử/xu hướng/feedback. Nhật ký fixture không có submit_quiz hoặc API lịch sử.
- Fixture không nối backend thật; CSP chặn kết nối/ảnh/frame ngoài origin. Chưa kiểm tra AI thật, Google Sheets/MailApp, phát thư, thiết bị di động hoặc nghiệm thu toàn bộ hệ thống.
- Chưa commit, push, tạo trigger, nhập người nhận hoặc deploy. Bước còn lại trước vận hành: dữ liệu duyệt, chuyển schema có kiểm soát, cấu hình được phép và kiểm tra deployment cụ thể.

## Hoàn tác và vận hành

Chưa deploy nên không có production cần rollback trong đợt này. Nếu thay đổi chưa phù hợp, giữ nhánh để xem diff và chỉnh từng phần; không reset/discard thay đổi người dùng. Khi có đợt triển khai được phép, ghi phiên bản trước đó và kiểm tra khôi phục trên môi trường thử trước. Không khôi phục endpoint lịch sử chung chỉ để hết lỗi giao diện. Thư tuần dừng bằng THU_TUAN_ENABLED=false, rồi xử lý trigger bằng tài khoản đã tạo; không tự gửi lại UNKNOWN.

## Phần còn cần bằng chứng thực tế

Deployment đang dùng; tồn kho dữ liệu cũ; nơi lưu/retention được phép; duyệt nguồn; quyền biên tập và thu hồi; tài khoản gửi; quota; người vận hành/dự phòng; kết quả Google runtime và kết luận cho phép sử dụng. Không đưa tên, email hoặc cấu hình thật vào tài liệu này.
