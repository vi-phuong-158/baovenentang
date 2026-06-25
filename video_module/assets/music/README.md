# Nhạc nền cho video bản tin

Thả **một** file nhạc nền vào thư mục này (`.mp3`, `.m4a`, `.wav`, `.ogg`, `.aac`).
Bước `06_compress_video.py` sẽ tự dùng file đầu tiên tìm thấy, **tự lặp** cho đủ độ dài video
và **ducking** (giảm tự động khi có giọng đọc) để voiceover luôn nổi rõ.

## Quy tắc bắt buộc
- Chỉ dùng nhạc **bản quyền tự do / royalty-free / CC0**, hoặc nhạc đã được cấp phép.
  Gợi ý nguồn miễn phí: YouTube Audio Library, Pixabay Music, Free Music Archive (lọc CC0),
  Incompetech (ghi nguồn theo yêu cầu).
- Ưu tiên nhạc nền không lời, tiết tấu vừa phải, mang tính trang trọng/tin tức —
  tránh nhạc quá sôi động làm lệch tông bản tin chính luận.
- **KHÔNG commit file nhạc** vào git (đã được `.gitignore` chặn). Mỗi máy tự đặt file.

## Tùy chỉnh (trong `.env`)
```env
# Chỉ định file cụ thể (bỏ trống = tự quét thư mục này)
BACKGROUND_MUSIC_PATH=
# Âm lượng nhạc nền 0.0–1.0 (khuyến nghị 0.12–0.22)
BACKGROUND_MUSIC_VOLUME=0.18
```

Nếu thư mục này trống và không đặt `BACKGROUND_MUSIC_PATH`, pipeline vẫn chạy bình thường
với chỉ voiceover (không nhạc nền).
