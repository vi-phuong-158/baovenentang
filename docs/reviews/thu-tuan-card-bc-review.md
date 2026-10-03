# Prompt review độc lập — Card Studio B/C

Hãy review độc lập nhánh `codex/thu-tuan-card-bc` so với `main` trong repository `vi-phuong-158/baovenentang`. Đọc AGENTS.md, CLAUDE.md, README, docs/brain và hướng dẫn Card Studio trước khi đánh giá. Dùng CodeGraph; nếu MCP mất transport thì ghi rõ giới hạn, truy vấn SQLite index read-only và đối chiếu nguồn mới chưa được index. Giữ nguyên WIP, không cài thêm công cụ/dependency.

Yêu cầu đã chốt: bỏ mẫu A, chỉ B/C; tên mô hình đủ một dòng; khẩu hiệu IN HOA lớn; chủ đề nổi bật và tâm nét chữ nằm chính giữa dải nền cả hai chiều. Câu ngắn C không tách một từ cuối; câu dài giữ đủ nguyên văn và nguồn. Mẫu B/C đang ở bước xem trước, chưa thay đồng loạt bộ ảnh đang sử dụng.

Phạm vi PR: `services/thu-tuan/tools/card-studio/{build.cjs,template.html,README.md}`, `tests/thu-tuan-card-studio.test.cjs`, workflow Thu tuan và tài liệu brain. Không có portrait/corpus/PNG/Drive links thật trong Git. Đây là công cụ tạo ảnh offline, không phải sender media theo lịch. PR16/17 và nghiệm thu cloud TEST trước đó là bối cảnh riêng, không phải code hoặc bằng chứng nghiệm thu của PR này.

Kiểm tra bằng tình huống cụ thể:

1. JSON chỉ serialize trường nội dung được phép, không mang token/approval/ID thừa; không escape thiếu khi có `</script>`, Unicode, `$&`; file xuất chứa dữ liệu riêng phải ở ngoài Git, kể cả symlink thư mục; không ghi đè input/output. Ngày thứ Hai/trùng kỳ, nguồn cần review, link chưa hỗ trợ và caption trên 1.800 UTF-16 phải bị chặn.
2. Renderer B/C giữ nguyên quote/source; tránh orphan, có fallback khi câu dài, không âm thầm cắt chữ hoặc xuất ZIP thiếu bài. Kiểm tra chủ đề dài, câu rất dài, ảnh sai định dạng, lỗi tải portrait và trạng thái nút lúc khởi tạo/lỗi. Kiểm tra giới hạn bộ nhớ khi nhiều kỳ.
3. Tạo HTML với dữ liệu giả lập và ảnh PNG/JPEG cục bộ ngoài Git, mở bằng Chrome/Edge. Xem PNG thực để đánh giá căn giữa, font tiếng Việt, khoảng cách, nguồn và crop chân dung. Test Canvas VM không đủ kết luận thị giác. Nếu có dữ liệu thật được cấp trong workspace riêng, chỉ đọc và lưu artifact riêng; không đưa vào Git/comment công khai.
4. Xuất ZIP qua UI: kiểm CRC, số PNG/caption/manifest, kích thước 1600 × 1200, SHA256, caption từng byte và báo cáo layout. Trang không được gọi API, upload Drive, phê duyệt nội dung hoặc gửi Zalo.
5. Chạy `node --test tests/thu-tuan-card-studio.test.cjs tests/thu-tuan.test.cjs tests/thu-tuan-acceptance.test.cjs`; parse tracked `.gs` bằng `vm.Script`; `git diff --check`. Đối chiếu CI với đúng SHA của PR, không dùng kết quả nhánh khác.

Chỉ review và báo cáo, không tự sửa/commit/push/merge/deploy, gửi tin, thay quyền Drive hoặc sửa Sheet/Properties/trigger. Không chạy helper SEND để chứng minh thiết kế. Không khẳng định approval hay Production acceptance từ kết quả test offline.

Đầu ra: findings theo P0–P3, mỗi finding có file:dòng, cách tái hiện, tác động và sửa tối thiểu; tách lỗi chức năng/bảo mật khỏi nhận xét mỹ thuật. Liệt kê lệnh đã chạy, kết quả và bước bị chặn. Nếu không có lỗi đáng kể, nói rõ và nêu giới hạn/rủi ro còn lại; không suy đoán PASS từ bước chưa chạy. Một lượt review độc lập, không tạo vòng review qua lại.
