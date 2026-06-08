# 00-project-overview.md - Tổng quan dự án

## Mục tiêu dự án
Hệ thống **Trợ lý 35 - Bảo vệ nền tảng tư tưởng** là một nền tảng bán tự động hỗ trợ lực lượng chuyên trách (Nhóm 35) trong công tác tuyên truyền, phản bác luận điệu sai trái, kiểm chứng thông tin và định hướng dư luận trên môi trường số.

Dự án tích hợp các công nghệ AI tiên tiến, quy trình RAG (Retrieval-Augmented Generation) từ kho tri thức chính thống, hệ thống phân phối thông tin đa kênh và quy trình biên tập video tự động để nâng cao hiệu suất và chất lượng công việc nghiệp vụ.

## Người dùng chính
- **Cán bộ chỉ đạo và biên tập viên lực lượng 35**: Người sử dụng trực tiếp công cụ Trợ lý 35 để tham khảo nội dung phản bác, kiểm chứng thông tin, duyệt kho tri thức và phân phối tin tức.
- **Tuyên truyền viên và Cộng tác viên**: Tham gia trả lời câu hỏi lý luận (Quiz), cập nhật tin tức và nhận bản tin định hướng hằng ngày.
- **Quản trị viên hệ thống (Admin)**: Người cấu hình kỹ thuật, duy trì các kết nối API, cơ sở dữ liệu và giám sát hiệu suất vận hành của hệ thống.

## Phạm vi dự án
Hệ thống bao gồm các phân hệ cốt lõi sau:
1. **Chatbot Trợ lý 35**: Hỗ trợ 3 chế độ hoạt động AI chuyên sâu:
   - `rebuttal` (Phản bác luận điệu sai trái) kèm bộ chọn phong cách (Chính luận, Trẻ trung, Ngắn gọn) và hội thoại đa lượt để tinh chỉnh phản hồi.
   - `fact_check` (Kiểm chứng, đánh giá độ tin cậy thông tin).
   - `article_writer` (Soạn bài, viết caption, chuẩn bị nội dung truyền thông).
2. **Hệ thống RAG và Kho tri thức**: Tự động scrape bài viết từ Tạp chí Cộng sản (TCCS), phân đoạn (chunking), phê duyệt và đồng bộ lên cơ sở dữ liệu vector Pinecone để làm nguồn tham chiếu tin cậy cho chatbot.
3. **Daily News Crawler Bot**: Tự động cào tin từ các nguồn báo chí chính thống, lọc trùng, tóm tắt nội dung bằng Gemini AI và cập nhật vào trang tin công khai.
4. **Hệ thống phân phối thông tin**: Tích hợp gửi email hàng loạt qua Brevo và gửi tin nhanh qua Telegram Bot (Bản tin 35 nội bộ).
5. **Trắc nghiệm trực tuyến (Quiz)**: Nền tảng quiz trực quan phục vụ học tập, kiểm tra lý luận chính trị và lưu trữ lịch sử làm bài.
6. **Module Video tự động (video_module)**: Bộ công cụ Python biên tập video nhanh bao gồm tạo hook 3 giây đầu, lồng nhạc nền tự động giảm âm lượng (ducking), tạo phụ đề karaoke và xuất bản ngắn dọc (short/reel/tiktok).
