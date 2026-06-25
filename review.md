# Review nâng cấp tính năng sản xuất video tự động

Ngày review: 2026-06-19

## Phạm vi đã xem

- `video_module/daily_run.py`
- `video_module/scripts/04_make_voice.py`
- `video_module/scripts/05_render_video.py`
- `video_module/scripts/06_compress_video.py`
- `video_module/scripts/08_make_short.py`
- `video_module/scripts/09_verify_output.py`
- `video_module/scripts/07_post_telegram_review.py`
- `video_module/prompts/make_script.md`
- `video_module/data/tts_dictionary.json`
- `docs/brain/06-ai-working-log.md`

## Kết luận nhanh

Các nâng cấp đang đi đúng hướng: giữ số hiệu ở dạng hiển thị cho phụ đề, chuyển phát âm sang TTS normalizer, hiển thị hook ngay frame đầu, nâng phụ đề vào vùng an toàn, thêm loudnorm, SFX tùy chọn, bản short và bước verify trước khi gửi duyệt.

Tuy nhiên có vài điểm cần khắc phục trước khi coi pipeline đủ chắc cho vận hành hằng ngày.

## Finding 1 - Có thể gửi nhầm bản short cũ

Mức độ: P1

`daily_run.py` đang chạy `Verify output` trước `Tạo bản ngắn 30s`. Trong khi đó `08_make_short.py` coi bản short là tùy chọn, nếu FFmpeg lỗi thì exit 0 và không đảm bảo xóa `output/final_short.mp4` cũ. `07_post_telegram_review.py` lại gửi bất cứ `final_short.mp4` nào đang tồn tại.

Rủi ro: nếu hôm nay tạo short lỗi nhưng file short từ lần chạy trước vẫn còn trong `output/`, bot có thể gửi bản short cũ lên nhóm duyệt.

Đề xuất:

1. Trong `08_make_short.py`, xóa `OUTPUT_SHORT` cũ ở đầu `run()`.
2. Render ra file tạm như `final_short.tmp.mp4`.
3. Chỉ replace sang `final_short.mp4` khi FFmpeg thành công.
4. Trong `daily_run.py`, đổi thứ tự thành: nén video -> tạo short -> verify -> đăng nhóm duyệt.
5. Trong `07_post_telegram_review.py`, chỉ gửi short nếu `final_short.mp4` có `mtime >= final.mp4`.

## Finding 2 - Verify chưa kiểm rule hook ở frame đầu

Mức độ: P2

`09_verify_output.py` đang bỏ qua frame 0 và sample từ khoảng 2 giây trở đi. Điều này phù hợp với pipeline cũ có fade-in, nhưng rule mới yêu cầu hook phải hiện đầy đủ ngay frame đầu để thumbnail nền tảng không bị đen/trống.

Rủi ro: video có frame đầu đen vẫn có thể pass verify.

Đề xuất:

1. Thêm check riêng tại `t=0.05s` hoặc `t=0.1s` cho bản đầy đủ.
2. Nếu YAVG thấp hơn ngưỡng thì fail.
3. Cập nhật comment trong verifier, bỏ mô tả cũ về việc tránh frame 0 vì hook fade-in.
4. Nếu cần kiểm duyệt trực quan, xuất thêm `output/verify_frame0.jpg`.

## Finding 3 - CodeGraph đang bị mất index trong working tree

Mức độ: P2

Thư mục `.codegraph` hiện không còn tồn tại trong workspace và `.codegraph/.gitignore` đang bị xóa trong git status. Vì vậy MCP CodeGraph báo project chưa được initialize.

Rủi ro: không đáp ứng workflow bắt buộc trong `AGENTS.md`, mất khả năng impact analysis trước các sửa đổi tiếp theo.

Đề xuất:

1. Restore `.codegraph/.gitignore`.
2. Chạy lại:

```powershell
codegraph init -i
```

3. Kiểm tra lại bằng `codegraph status` hoặc `codegraph_explore`.

## Finding 4 - SFX chưa thật sự đa dạng

Mức độ: P3

`06_compress_video.py` hiện lấy file SFX đầu tiên khớp category và dùng lặp lại cho mọi transition. Rule #6 yêu cầu SFX đa dạng, tránh lặp một tiếng duy nhất.

Đề xuất:

1. Đổi `find_sfx()` thành hàm trả về danh sách candidates.
2. Cycle hoặc random theo event để transition không lặp cùng một file.
3. Với `hook` và `cta`, ưu tiên file riêng; nếu thiếu thì fallback sang pool khác.

## Finding 5 - Ngưỡng cảnh báo loudness còn quá rộng

Mức độ: P3

`09_verify_output.py` đặt `LUFS_WARN_DELTA = 6.0`. Artifact cũ ở khoảng `-20.1 LUFS` vẫn pass mà không cảnh báo rõ, dù mục tiêu của pipeline là khoảng `-16 LUFS`.

Đề xuất:

1. Giảm `LUFS_WARN_DELTA` xuống khoảng `2.5` hoặc `3.0`.
2. Giữ loudness là warning, không nhất thiết chặn pipeline, vì `06_compress_video.py` đã thêm `loudnorm`.

## Kiểm thử đã chạy khi review

```powershell
cd video_module
python -m pytest tests -q
python -m py_compile daily_run.py scripts\04_make_voice.py scripts\05_render_video.py scripts\06_compress_video.py scripts\08_make_short.py scripts\09_verify_output.py
python scripts\09_verify_output.py
```

Kết quả:

- `pytest`: 87 passed.
- `py_compile`: pass.
- `09_verify_output.py`: chạy được trên artifact hiện có, nhưng artifact đó là output cũ nên không thay thế được full render sau diff mới.

## Danh sách khắc phục ưu tiên

1. Fix stale `final_short.mp4`.
2. Chuyển verify xuống sau bước tạo short.
3. Thêm check frame đầu cho hook.
4. Restore và re-index CodeGraph.
5. Làm SFX rotation/cycle.
6. Siết cảnh báo loudness.

## Trạng thái khắc phục (2026-06-20)

- [x] **Finding 1 (P1)** — `08_make_short.py` xóa short cũ + render qua `final_short.tmp.mp4` rồi `os.replace`; `daily_run.py` đổi thứ tự nén → short → verify → đăng duyệt; `07_post_telegram_review.py` chỉ gửi short khi `mtime >= final.mp4`.
- [x] **Finding 2 (P2)** — `09_verify_output.py` thêm check hook tại `FIRST_FRAME_T=0.05s`, xuất `verify_frame0.jpg`, bỏ comment cũ về fade-in.
- [x] **Finding 3 (P2)** — `.codegraph/.gitignore` đã restore. (Cần chạy lại `codegraph init -i` trên máy để tái tạo index.)
- [x] **Finding 4 (P3)** — `find_sfx_pool` + round-robin transition trong `build_sfx_events`.
- [x] **Finding 5 (P3)** — `LUFS_WARN_DELTA` 6.0 → 3.0.

Kiểm thử sau khắc phục: `py_compile` OK · `pytest tests` 87 passed · `09_verify_output.py` PASSED (check frame đầu + cảnh báo loudness mới đều kích hoạt) · test rời SFX rotation đạt.
