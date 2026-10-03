# Card Studio B/C — bản thiết kế offline

Template mới nhất giữ hai bố cục B/C theo phản hồi người dùng. Dòng tên mô hình một dòng, khẩu hiệu in hoa lớn, chủ đề đỏ đậm 64 px và tâm nét chữ trùng tâm dải nền theo cả hai chiều. Câu ngắn của C nằm một dòng; câu dài đổi bố cục/co font và tránh dòng cuối chỉ một từ. Không cắt nguyên văn để vừa ảnh.

Ảnh 1600 × 1200 chứa lời dạy và nguồn. Caption đầy đủ nằm trong TXT riêng, tối đa 1.800 UTF-16. Đây là bộ thiết kế chờ duyệt, không phải hệ thống gửi Zalo theo lịch.

## Tạo công cụ

Dùng Node có sẵn, không cần npm install. Đầu vào và ảnh chân dung lưu trong workspace riêng ngoài Git. Tạo thư mục đầu ra trước; đầu ra phải nằm ngoài mọi Git checkout và chưa tồn tại.

```powershell
node services/thu-tuan/tools/card-studio/build.cjs --input <rows.json> --portrait <portrait.jpg> --out <studio.html>
```

rows.json là mảng 1–366 object, mỗi object có chuỗi không rỗng: Ky, MaLoiDay, ChuDe, NoiDungNguyenVan, NguonTrich, BoiCanhZalo, YNgiaVanDungZalo, HanhDongTuanNayZalo. Ky dạng YYYY-MM-DD thứ Hai và không trùng; MaLoiDay dạng LD-xxx (3–6 chữ số). sourceReviewRequired nếu có phải false; NotebookLM_URL nếu có phải rỗng (bản này chưa hỗ trợ link). Các ô approval, token, ID nội bộ hoặc caption có sẵn không được chép vào HTML; tool chỉ lấy các trường đã liệt kê và luôn gắn DRAFT_NOT_APPROVED.

Ảnh đầu vào JPEG/PNG tối đa 10 MiB; signature được kiểm tra tại builder, khả năng giải mã được kiểm tra bởi trình duyệt. File HTML được tạo chứa toàn bộ nội dung và ảnh chân dung, do đó cũng là tài liệu riêng tư. Không đưa HTML, PNG, ZIP, TXT, manifest hoặc input thật vào repository công khai.

## Xem và xuất

Mở studio.html bằng Chrome/Edge có sẵn. Trang không gọi API, không tải font/ảnh ngoài, không sửa Drive/Sheets và không gửi tin. Hai nút tải bộ mẫu hoặc toàn bộ bộ ảnh bằng ZIP không nén, chứa PNG/TXT/manifest SHA256. Link tải chỉ xuất hiện sau khi toàn bộ thao tác thành công; bài không vừa cả B/C làm lượt xuất bị chặn.

Đọc báo cáo mẫu và xem PNG ở kích thước thật, đặc biệt bài dài nhất và chủ đề dài. Hình thức phụ thuộc font hệ thống Times New Roman/Arial; font thay thế trên hệ khác có thể đổi xuống dòng. Test VM chỉ kiểm logic, không thay nghiệm thu ảnh bằng trình duyệt.

Giữ B/C ở bước xem trước đến khi người dùng phản hồi lượt mẫu. Bộ 51 ảnh và link Drive đang dùng không tự cập nhật khi merge PR này. Việc duyệt nội dung, cấp quyền media và tích hợp sender cần đợt triển khai riêng; caption này không được dùng thay dấu duyệt của service.

## Kiểm tra

```powershell
node --test tests/thu-tuan-card-studio.test.cjs tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs
```

Kiểm tra thủ công: tiêu đề đúng chính giữa; model và motto mỗi trường một dòng; B ảnh trái, C ảnh tròn; câu ngắn C không có từ lẻ cuối; câu dài đủ nguyên văn/nguồn; ZIP mở được, số PNG/manifest bằng số kỳ và hash đúng. Không gửi tin hoặc chạy helper cloud để review PR thiết kế.
