# Kho ảnh nền video — `assets/library/`

Renderer chọn ảnh ngẫu nhiên trong folder tương ứng với `visual_category` của mỗi scene.

## Cấu trúc

```
library/
├── categories.json    # định nghĩa 15 category (KHÔNG sửa key nếu chưa cập nhật prompt + validator)
├── chinhphu/          # ảnh về Chính phủ, Thủ tướng, Nghị định
├── quochoi/           # Quốc hội, kỳ họp, biểu quyết
├── bochinhtri/        # Bộ Chính trị, TW Đảng, Nghị quyết
├── bocongan/          # Công an, ANTT
├── anninhmang/        # cyber, server, hệ thống thông tin
├── kinhte/            # doanh nghiệp, kinh tế, sản xuất
├── khoahoc/           # KHCN, AI, đổi mới sáng tạo
├── giaoduc/           # trường học, trẻ em
├── yte/               # bệnh viện, y tế
├── quocphong/         # quân đội, quốc phòng
├── doingoai/          # đối ngoại, quốc tế
├── xahoi/             # dân sinh, đô thị
├── phutho/            # Phú Thọ, đền Hùng, địa phương
├── tuyengiao/         # cờ Đảng, tuyên giáo, tư tưởng
├── default/           # FALLBACK — cờ đỏ sao vàng, quốc huy
└── _cache/            # ảnh tự download (Unsplash sau này), không commit
```

## Quy tắc ảnh

- **Tỉ lệ**: 9:16 (1080×1920) lý tưởng. Ảnh ngang 16:9 cũng được — renderer crop center + blur.
- **Định dạng**: `.jpg`, `.jpeg`, `.png`, `.webp`.
- **Số lượng**: tối thiểu **3 ảnh/category**, khuyến nghị 5-10 để không trùng liên tiếp.
- **Bản quyền**: chỉ dùng ảnh free — Unsplash, Pexels, Pixabay, Wikipedia Commons, ảnh public domain của báo Chính phủ/TTXVN, hoặc ảnh tự chụp.
- **Tên file**: bất kỳ, nên đặt số thứ tự `01.jpg`, `02.jpg` cho dễ.

## Bắt buộc tối thiểu

Để pipeline chạy được, **folder `default/` phải có ≥1 ảnh** (cờ Tổ quốc / quốc huy). Đây là fallback khi category khác trống.

## Ghi nguồn

Mỗi folder nên có `_credits.txt` ghi:

```
01.jpg | https://unsplash.com/photos/xxx | Tác giả: Nguyen Van A | License: Unsplash Free
02.jpg | TTXVN — public domain
```

## Nguồn gợi ý

| Category | Query Unsplash gợi ý |
|---|---|
| chinhphu | `vietnam government building`, `meeting room formal` |
| bocongan | `vietnam police`, `uniform officer asia` |
| anninhmang | `cyber security`, `server room dark` |
| khoahoc | `laboratory`, `circuit board`, `AI technology` |
| giaoduc | `vietnamese school children`, `classroom asia` |
| phutho | `den hung temple`, `phu tho landscape` |
| tuyengiao | `vietnam flag`, `red star flag` |

## Sau khi thêm/xóa ảnh

Không cần restart gì. Lần render tiếp theo, `image_picker.py` tự đọc lại folder.
