# 🛡️ TRẬN ĐỊA SỐ

> **Nền tảng bản tin tự động bảo vệ nền tảng tư tưởng của Đảng**  
> Ứng dụng AI và tự động hóa để phục vụ công tác tuyên truyền từ cơ sở

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![Made by](https://img.shields.io/badge/made%20by-Vi%20Ngọc%20Phương-c0392b.svg)]()

---

## 📖 Giới thiệu

**Trận Địa Số** là hệ thống tự động hoàn toàn, mỗi ngày lúc 6h sáng:

1. 📥 Crawl tin tức từ các báo chính thống (Nhân Dân, CAND, Báo Chính phủ...)
2. 🤖 Dùng Gemini AI để tóm tắt, phân loại, đánh giá mức độ ưu tiên
3. 📱 Gửi bản tin qua Telegram Channel
4. 📧 Gửi email cá nhân hóa qua Brevo
5. 💾 Lưu trữ vào Google Sheets làm database
6. 🌐 Hiển thị trên Web App với tính năng Quiz và Thư viện phản bác

---

## ✨ Tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| 📰 **Bản tin tự động** | AI tổng hợp, không cần thao tác hàng ngày |
| 🧠 **Quiz nhận thức** | Trắc nghiệm về Nghị quyết, chính sách |
| 📚 **Thư viện phản bác** | Kho luận điểm chống lại quan điểm sai trái |
| 📱 **Telegram Bot** | Tin nhanh, lệnh tra cứu |
| 📧 **Email cá nhân hóa** | Brevo gửi 300 email/ngày miễn phí |
| 🌐 **Web App** | Giao diện đẹp, responsive |

---

## 🏗️ Cấu trúc dự án

```
tran-dia-so/
├── backend/                     # Google Apps Script
│   ├── 01-config.gs            # Đọc cấu hình từ Script Properties
│   ├── 02-rss-crawler.gs       # Crawl tin RSS
│   ├── 03-gemini-ai.gs         # Xử lý AI
│   ├── 04-sheets-db.gs         # Database
│   ├── 05-telegram-bot.gs      # Bot Telegram
│   ├── 06-email-brevo.gs       # Gửi email
│   ├── 07-main.gs              # Entry point + Web API
│   ├── appsscript.json         # Manifest Apps Script
│   └── README.md               # Hướng dẫn triển khai backend
│
├── web/                         # Frontend Web App
│   ├── index.html              # Trang chủ
│   ├── css/
│   │   └── styles.css          # Stylesheet
│   └── js/
│       └── app.js              # JavaScript
│
└── docs/                        # Tài liệu
    ├── README.md               # File này
    ├── SETUP.md                # Hướng dẫn cài đặt
    └── DEPLOY.md               # Hướng dẫn deploy
```

---

## 🚀 Quick Start

### Yêu cầu
- Tài khoản Google (cho Apps Script, Sheets)
- API key của [Gemini AI](https://aistudio.google.com/app/apikey) - **MIỄN PHÍ**
- Bot Telegram (tạo qua [@BotFather](https://t.me/BotFather))
- Tài khoản [Brevo](https://www.brevo.com/) - **MIỄN PHÍ 300 email/ngày**
- Tài khoản [Vercel](https://vercel.com/) (hoặc Netlify) để host web - **MIỄN PHÍ**

### Cài đặt nhanh

1. **Clone code** này về máy
2. **Đọc** `docs/SETUP.md` để cấu hình backend
3. **Đọc** `docs/DEPLOY.md` để deploy web app

---

## 💰 Chi phí vận hành

| Dịch vụ | Gói | Chi phí/tháng |
|---------|-----|---------------|
| Google Apps Script | Free | **0đ** |
| Google Sheets | Free | **0đ** |
| Gemini API | Free tier | ~50.000đ |
| Telegram Bot | Free | **0đ** |
| Brevo (300 email/ngày) | Free | **0đ** |
| Vercel hosting | Hobby | **0đ** |
| **Tổng** | | **~50.000đ/tháng** |

> Khi scale lên 5.000+ người dùng, nâng Brevo Starter ~250.000đ/tháng

---

## 📈 Lộ trình phát triển

### Phase 1 (Đã có)
- ✅ Backend tự động crawl + AI + gửi tin
- ✅ Telegram bot với lệnh /quiz, /phanbac
- ✅ Email cá nhân hóa qua Brevo
- ✅ Web app với Quiz, Thư viện phản bác

### Phase 2 (Sắp tới)
- 🔄 Dashboard admin quản lý nội dung
- 🔄 Leaderboard đơn vị thi đua
- 🔄 AI tự động sinh luận điểm phản bác từ tin nóng

### Phase 3 (Tương lai)
- 📌 Tích hợp Zalo OA (nếu được phê duyệt)
- 📌 Mobile app React Native
- 📌 Voice bot trả lời câu hỏi

---

## 🤝 Đóng góp

Dự án phục vụ nội bộ Công an tỉnh Phú Thọ, mọi góp ý xin gửi về:
- **Tác giả:** Vi Ngọc Phương  
- **Đơn vị:** Phòng PA01 - Công an tỉnh Phú Thọ
- **Email:** [liên hệ tác giả]

---

## 📜 Giấy phép

Dự án phát triển phục vụ công tác chuyên môn, không thương mại hóa.

---

*"Thông tin đúng — Tư tưởng vững — Trận địa số vững chắc"*

**© 2026 Trận Địa Số - Phục vụ Cuộc thi Chính luận bảo vệ nền tảng tư tưởng của Đảng 2026**
