# Card Studio D/F — bản thiết kế offline

Người dùng chốt hai mẫu cùng phong cách “băng đỏ”, thay cho B/C: **D** khổ ngang 1600 × 1200 và **F** khổ dọc 1080 × 1350 cho điện thoại. Mỗi kỳ luôn xuất cả hai ảnh. Dải đỏ trên cùng có nền trống đồng, tên mô hình (một dòng) và khẩu hiệu in hoa; chân dung Bác trong khung tròn; lời dạy chữ đỏ lớn với dấu ngoặc kép vàng; nguồn hai tầng: “Hồ Chí Minh” in đậm căn giữa (không gạch đầu dòng), phần còn lại giữ nguyên văn. “Hà Nội”, “Tập N”, “tr. N” không bị ngắt dòng.

- D: chủ đề căn trái cạnh chân dung, tâm nét chữ theo chiều dọc nằm giữa dải chủ đề.
- F: chủ đề nằm trong dải đỏ, tâm nét chữ trùng tâm dải theo cả hai chiều.
- Lời dạy co chữ trong khoảng cho phép và tránh dòng cuối chỉ một từ; không vừa thì chặn, không cắt nguyên văn.

Nền trống đồng lấy từ `assets/trong-dong.webp` (tác phẩm được phép công bố), được builder nhúng vào HTML; trình duyệt tách hoa văn thành mặt nạ và tô vàng nhạt trên nền đỏ, vàng rất mờ trên nền kem.

Ảnh chứa lời dạy và nguồn. Caption đầy đủ nằm trong TXT riêng, tối đa 1.800 UTF-16. Đây là bộ thiết kế chờ duyệt, không phải hệ thống gửi Zalo theo lịch.

## Tạo công cụ

Dùng Node có sẵn, không cần npm install. Đầu vào và ảnh chân dung lưu trong workspace riêng ngoài Git. Tạo thư mục đầu ra trước; đầu ra phải nằm ngoài mọi Git checkout và chưa tồn tại.

```powershell
node services/thu-tuan/tools/card-studio/build.cjs --input <rows.json> --portrait <portrait.jpg> --out <studio.html>
```

rows.json là mảng 1–366 object, mỗi object có chuỗi không rỗng: Ky, MaLoiDay, ChuDe, NoiDungNguyenVan, NguonTrich, BoiCanhZalo, YNgiaVanDungZalo, HanhDongTuanNayZalo. Ky dạng YYYY-MM-DD thứ Hai và không trùng; MaLoiDay dạng LD-xxx (3–6 chữ số). sourceReviewRequired bắt buộc có và bằng false; NguonTrich phải có “Tập N” và “tr. N” như bước audit corpus, thiếu là bị chặn. NotebookLM_URL nếu có phải rỗng (bản này chưa hỗ trợ link). File JSON có BOM (mặc định của Windows PowerShell 5.1) vẫn đọc được. Các ô approval, token, ID nội bộ hoặc caption có sẵn không được chép vào HTML; tool chỉ lấy các trường đã liệt kê và luôn gắn DRAFT_NOT_APPROVED.

Ảnh đầu vào JPEG/PNG tối đa 10 MiB; signature được kiểm tra tại builder, khả năng giải mã được kiểm tra bởi trình duyệt. Ảnh luôn được phóng để phủ kín khung tròn với mọi tỷ lệ (dọc, vuông, ngang). File HTML được tạo chứa toàn bộ nội dung và ảnh chân dung, do đó cũng là tài liệu riêng tư. Không đưa HTML, PNG, ZIP, TXT, manifest hoặc input thật vào repository công khai.

## Xem và xuất

Mở studio.html bằng Chrome/Edge có sẵn. Trang không gọi API, không tải font/ảnh ngoài, không sửa Drive/Sheets và không gửi tin. Hai nút tải bộ mẫu hoặc toàn bộ bộ ảnh bằng ZIP không nén, chứa PNG/TXT/manifest SHA256. Link tải chỉ xuất hiện sau khi toàn bộ thao tác thành công; một kỳ không vừa D hoặc F làm lượt xuất bị chặn. Xuất lại thay link cũ và giải phóng bộ nhớ của ZIP trước. Bộ mẫu không lặp bài khi bài đầu cũng là bài dài nhất.

ZIP (manifest version 2) gồm mỗi kỳ: `<Ky>_<MaLoiDay>_D.png`, `_F.png`, một `-caption.txt` và một `-manifest.json` liệt kê hai ảnh (kích thước, imageSha256, báo cáo khung chữ). Ảnh D khoảng 1 MB, F khoảng 0,5 MB. Manifest ghi portraitSha256, drumSha256 và captionFileSha256 là SHA256 đúng các byte của tệp -caption.txt (gồm ký tự xuống dòng cuối); captionUtf16Length tính trên nội dung caption không kể ký tự đó.

Đọc báo cáo mẫu và xem PNG ở kích thước thật, đặc biệt bài dài nhất và chủ đề dài. Hình thức phụ thuộc font hệ thống Times New Roman/Arial; font thay thế trên hệ khác có thể đổi xuống dòng. Test VM chỉ kiểm logic, không thay nghiệm thu ảnh bằng trình duyệt.

Bộ 51 ảnh và link Drive đang dùng không tự cập nhật khi merge PR này. Việc duyệt nội dung, cấp quyền media và tích hợp sender cần đợt triển khai riêng; caption này không được dùng thay dấu duyệt của service.

## Kiểm tra

```powershell
node --test tests/thu-tuan-card-studio.test.cjs tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs
```

Kiểm tra thủ công: model và motto mỗi trường một dòng; chủ đề D căn trái cạnh chân dung, F căn giữa dải; chân dung phủ kín khung tròn; câu dài đủ nguyên văn/nguồn, không từ lẻ cuối; ZIP mở được, mỗi kỳ có D, F, caption, manifest và hash đúng. Không gửi tin hoặc chạy helper cloud để review PR thiết kế.
