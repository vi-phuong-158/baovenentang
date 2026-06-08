# 05-testing-and-deploy.md - Kiểm thử và Triển khai

## 1. Cài đặt và Chạy thử local (Frontend)
Yêu cầu Node.js phiên bản 18 hoặc 20 và npm.

```powershell
# Di chuyển vào thư mục frontend
cd web

# Cài đặt thư viện
npm install

# Khởi chạy môi trường phát triển local
npm run dev
```
Môi trường local mặc định chạy tại địa chỉ: `http://127.0.0.1:5173/`

## 2. Build và Kiểm tra Frontend
Trước khi deploy frontend lên Vercel, luôn chạy lệnh build để xác minh không có lỗi cú pháp hoặc lỗi TypeScript/Vite:

```powershell
cd web
npm run build
```

## 3. Triển khai Backend Google Apps Script (GAS)
Sử dụng công cụ `clasp` để đẩy mã nguồn từ local lên cloud:

```powershell
# Di chuyển vào thư mục backend
cd backend

# Đăng nhập clasp (chỉ cần làm lần đầu)
npx @google/clasp login

# Đẩy code lên Apps Script (ghi đè code trên cloud)
npx @google/clasp push --force
```

> **Lưu ý quan trọng sau khi push code**:
> 1. Mở giao diện lập trình web Apps Script.
> 2. Truy cập vào mục `Deploy > Manage deployments`.
> 3. Chọn deployment Web App đang hoạt động và cập nhật lên phiên bản mới nhất để áp dụng thay đổi cho API sản phẩm.

## 4. Kiểm tra Cú pháp Backend (Local)
GAS là JavaScript nhưng chạy trên môi trường Google, do đó không thể test local trực tiếp một cách đầy đủ. Tuy nhiên, có thể kiểm tra lỗi cú pháp JavaScript bằng node:

```powershell
# Chạy kiểm tra lỗi cú pháp trên từng file .gs
node --check backend/07-main.gs
node --check backend/08-troly35.gs
```

## 5. Kiểm thử nghiệp vụ trên Apps Script
Trong Apps Script Editor, bạn có thể chạy trực tiếp các hàm kiểm thử sau để xác minh hệ thống:
- `setupSystem()`: Khởi tạo các bảng và kiểm tra cấu trúc Google Sheets.
- `testRun()`: Kiểm tra chạy thử crawler tin tức hàng ngày.
- `testTroLy35Setup()`: Kiểm tra khả năng kết nối Gemini AI, Pinecone RAG và ghi nhận lịch sử của Trợ lý 35.
- `syncTccsApprovedChunksToPinecone()`: Chạy đồng bộ kho dữ liệu tạp chí đã duyệt lên vector database.
