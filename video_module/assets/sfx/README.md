# SFX — hiệu ứng âm thanh (tùy chọn)

Thả file SFX **royalty-free** (`.wav`, `.mp3`, `.ogg`, `.m4a`, `.aac`) vào thư mục này.
Bước `06_compress_video.py` sẽ tự chèn vào video theo timing của `scenes.json`.

**SFX là TÙY CHỌN**: nếu thư mục này trống (hoặc thiếu tên file phù hợp), pipeline vẫn
chạy bình thường, chỉ bỏ qua phần SFX. Không có file nào bị bắt buộc.

## Quy ước đặt tên

Mỗi "loại" SFX, hệ thống thử lần lượt các tên dưới đây (lấy file đầu tiên tìm thấy):

| Loại | Dùng cho | Tên file ưu tiên |
|---|---|---|
| `transition` | mỗi lần chuyển cảnh | `whoosh`, `swoosh`, `transition`, `swipe` |
| `hook` | mở đầu (scene `intro`) | `pop`, `notify`, `ding` |
| `cta` | màn kêu gọi (scene `cta`) | `success`, `ding`, `chime`, `notify` |

Ví dụ: đặt `whoosh.wav`, `pop.wav`, `success.wav` vào đây là đủ cho cả 3 loại.

## Âm lượng & bật/tắt

- Âm lượng mặc định (dB) cấu hình trong `SFX_DB` của `06_compress_video.py`
  (transition −14 dB, hook/cta −12 dB). SFX được trộn **dưới** giọng đọc;
  loudnorm ở bước nén cuối đảm bảo tổng thể vẫn ~−16 LUFS.
- Tắt hoàn toàn SFX: đặt biến môi trường `SFX_ENABLED=0` trong `.env`.

## Nguồn SFX royalty-free gợi ý

- Pixabay Sound Effects, Mixkit, freesound.org (kiểm tra giấy phép trước khi dùng).
