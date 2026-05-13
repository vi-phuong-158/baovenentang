# 🚀 HƯỚNG DẪN DEPLOY WEB APP

> Deploy phần frontend lên Vercel để có URL công khai, người dùng truy cập được

---

## PHẦN A: Deploy lên Vercel (Khuyên dùng)

### Cách 1: Deploy qua GitHub (Tự động)

#### Bước 1: Push code lên GitHub

1. Tạo repository mới trên [GitHub](https://github.com/)
2. Đặt tên: `tran-dia-so`
3. Vào thư mục dự án trên máy, mở Terminal:

```bash
cd /path/to/tran-dia-so
git init
git add web/
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/tran-dia-so.git
git push -u origin main
```

#### Bước 2: Kết nối Vercel

1. Truy cập [vercel.com](https://vercel.com/)
2. Đăng nhập bằng GitHub
3. Click **"Add New..."** > **"Project"**
4. Chọn repo `tran-dia-so`
5. Cấu hình:
   - **Framework Preset:** Other
   - **Root Directory:** `web` ⚠️ Quan trọng
   - **Build Command:** (để trống)
   - **Output Directory:** (để trống)
6. Click **"Deploy"**
7. Đợi 1-2 phút, Vercel sẽ cấp URL

### Cách 2: Deploy bằng Vercel CLI

```bash
# Cài Vercel CLI
npm install -g vercel

# Vào thư mục web
cd /path/to/tran-dia-so/web

# Deploy
vercel
```

Làm theo hướng dẫn, chọn các option mặc định.

---

## PHẦN B: Cấu hình trước khi Deploy

### ⚠️ QUAN TRỌNG: Cập nhật API URL

Mở file `web/js/app.js`, tìm dòng:

```javascript
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

Thay `YOUR_DEPLOYMENT_ID` bằng URL Web App đã deploy từ Apps Script (lấy ở Bước 9 trong SETUP.md).

Save file rồi mới deploy.

---

## PHẦN C: Tạo file cấu hình Vercel (Tùy chọn)

Tạo file `web/vercel.json`:

```json
{
  "version": 2,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

---

## PHẦN D: Tên miền tùy chỉnh (Tùy chọn)

### Mua tên miền

Anh có thể mua tên miền:
- `.vn` tại [Z.com](https://z.com/) hoặc [Tenten](https://tenten.vn/) - ~750.000đ/năm
- `.com` tại [Namecheap](https://www.namecheap.com/) - ~250.000đ/năm

### Trỏ tên miền vào Vercel

1. Trong Vercel project, vào **Settings** > **Domains**
2. Add domain: `trandiadso.vn`
3. Vercel hiển thị các record DNS cần thêm
4. Vào trang quản lý DNS của nhà cung cấp tên miền
5. Thêm các record A và CNAME theo hướng dẫn của Vercel
6. Đợi 15 phút - vài giờ để DNS lan truyền

---

## PHẦN E: Deploy thay thế (nếu không dùng Vercel)

### Netlify

1. Truy cập [netlify.com](https://www.netlify.com/)
2. Kéo thả thư mục `web/` vào trang Netlify Drop
3. Nhận URL ngay lập tức

### GitHub Pages

1. Push code lên GitHub
2. Vào **Settings** > **Pages**
3. Source: branch `main`, folder `/web`
4. Lưu, đợi vài phút có URL: `username.github.io/tran-dia-so/`

### Cloudflare Pages

Tương tự Vercel, kết nối GitHub repo, chọn folder `web/`.

---

## PHẦN F: Kiểm tra sau Deploy

### Checklist sau deploy:

- [ ] Truy cập URL Web App, trang chủ hiện đúng
- [ ] Section "Bản tin hôm nay" load được dữ liệu (nếu đã có tin)
- [ ] Test Quiz: bấm Bắt đầu → hiện câu hỏi
- [ ] Test Đăng ký: điền form → nhận email welcome
- [ ] Mobile responsive: test trên điện thoại
- [ ] Console không có lỗi đỏ (F12 > Console)

### Nếu API không kết nối:

**Lỗi CORS:** Apps Script Web App đôi khi block CORS. Cách fix:
- Trong Apps Script, deploy lại với option **"Anyone"** (không phải "Anyone with Google account")
- Trong code JS, dùng `mode: 'no-cors'` cho POST request (đã có sẵn)

**Lỗi 401 Unauthorized:** 
- Re-deploy Apps Script Web App
- Lấy URL mới, cập nhật vào `app.js`

---

## PHẦN G: Tích hợp với hệ sinh thái cũ

Anh đã có 5 app web khác. Hãy nhúng banner đăng ký vào tất cả:

### Banner đơn giản (HTML)

```html
<!-- Đặt cuối các trang web cũ -->
<div style="background:linear-gradient(135deg,#c0392b,#8b0000);padding:20px;text-align:center;color:white;border-radius:8px;margin:20px 0;">
  <h3 style="margin:0 0 10px;">🛡️ Đăng ký Bản tin Trận Địa Số</h3>
  <p style="margin:0 0 15px;font-size:14px;">Bản tin tự động hàng ngày về bảo vệ nền tảng tư tưởng của Đảng</p>
  <a href="https://trandiadso.vn" target="_blank" 
     style="background:white;color:#c0392b;padding:10px 24px;border-radius:20px;text-decoration:none;font-weight:bold;display:inline-block;">
    Đăng ký miễn phí →
  </a>
</div>
```

Đặt banner này vào:
- `hocnghiquyet` - cuối trang chủ
- `capphutho` - footer
- `bandocapt` - sidebar
- `mohinh-andn` - banner top
- `van-kien-tinh-doan` - sau hero section

---

## PHẦN H: Theo dõi và phát triển

### Google Analytics (Khuyên dùng)

1. Tạo property tại [analytics.google.com](https://analytics.google.com/)
2. Lấy Measurement ID (G-XXXXXXX)
3. Thêm vào `<head>` của `index.html`:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX');
</script>
```

### Theo dõi từ Vercel Analytics

Vercel có sẵn analytics miễn phí, vào **Project** > **Analytics** xem traffic.

---

## ✅ Hoàn tất!

Sau khi deploy xong, anh có:
- ✅ Backend tự động chạy 6h sáng mỗi ngày
- ✅ Telegram bot gửi tin tự động
- ✅ Email gửi tự động qua Brevo
- ✅ Web app công khai trên `trandiadso.vn`
- ✅ Banner đặt trên các app cũ → lan truyền

**Bước tiếp theo:** Marketing nội bộ, đưa link cho cán bộ đồng nghiệp, đoàn viên!

---

## 🆘 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Apps Script Execution Log (Logs tab)
2. Vercel Deployment Logs (trong Vercel dashboard)
3. Browser Console (F12)

Hoặc dùng AI để hỗ trợ debug từng bước cụ thể.
