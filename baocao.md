# Báo cáo: Kiểm tra RAG phản bác "lấy không được căn cứ" (Trợ lý 35)

> Ngày: 2026-06-25
> Phạm vi: mode `rebuttal` của Trợ lý 35, pipeline RAG (Pinecone + Google Sheets) và khâu nạp/sync kho tư liệu.
> Nhánh phát triển: `claude/ai-rag-rebuttal-constraints-39pagy`

---

## 1. Vấn đề báo cáo

Mode phản bác của Trợ lý 35 thường trả về "Chưa đủ căn cứ" / 0 dẫn chứng, dù kho tư liệu có nội dung liên quan. Nghi vấn ban đầu: pipeline RAG bị cấu hình quá "chặt".

## 2. Kết quả kiểm tra (chẩn đoán)

Có **hai** nguyên nhân độc lập, nằm ở hai tầng khác nhau.

### 2.1. Tầng code — cổng chặn vứt bỏ tư liệu RAG (nguyên nhân trực tiếp)

File: `backend/08-troly35.gs`

- **Cổng chặn cứng** trong `troLy35GenerateRebuttalDraft_`: khi phân tích đặt
  `analysis.co_luan_dieu_sai_trai === false`, hàm trả về luôn bản "Chưa đủ căn cứ"
  với `dan_chung_su_dung: []` và **vứt bỏ toàn bộ `knowledge` đã lấy được từ RAG**.
  → Kết quả: dù retrieval thành công, người dùng vẫn thấy 0 căn cứ.
- **Prompt phân tích quá dè dặt** (`troLy35AnalyzeInput_`): dễ gán
  `co_luan_dieu_sai_trai=false` cho nội dung mơ hồ, kể cả khi người dùng đang
  chủ động ở mode phản bác.

### 2.2. Tầng vận hành — kho RAG chưa duyệt / chưa sync (nguyên nhân gốc)

Toàn bộ chuỗi cung ứng tư liệu RAG là **human-in-the-loop, chạy tay**:

| Khâu | Trạng thái khi tạo | Vào được RAG? | Vị trí code |
|------|--------------------|---------------|-------------|
| Scrape TCCS → `TCCS_CHUNKS` | `Draft` / `Needs Review` | ❌ | `09a:600-601`, `09b:249,703` |
| Sinh `PHAN_BAC_KHO` tự động | `Chờ duyệt` | ❌ | `09d:209` |
| Duyệt tay → `Đã duyệt` | `Đã duyệt` | ✅ | thủ công trên Google Sheet |
| Sync Pinecone | chỉ nhận `Đã duyệt` | ✅ | `09c:30`, `syncTroLy35KnowledgeToPinecone` |

Hai chốt chặn quyết định:

1. **Cả 2 khâu sync + Sheets fallback chỉ nhận dòng `Đã duyệt`**
   (`troLy35IsApprovedKnowledge_`, `09c:30`). Dòng `Chờ duyệt`/`Draft` bị loại
   khỏi cả Pinecone lẫn fallback.
2. **Không có trigger tự động** cho scrape/generate/sync RAG. `07-main.gs` chỉ
   có trigger time-based cho `runDailyNewsBot`, `runMonthlyArchive`,
   `runBanTin35DailyStep`. Toàn bộ pipeline RAG phải chạy tay.

➡️ Nếu chưa duyệt tay + chưa chạy sync → namespace Pinecone rỗng → RAG luôn trả
rỗng → "không có căn cứ", bất kể code phản bác có nới hay không.

### 2.3. Điểm KHÔNG phải nguyên nhân (đã loại trừ)

- **Khâu Pinecone không hề chặt**: `troLy35QueryPinecone_` lấy `topK=5`, **không
  lọc theo ngưỡng điểm tương đồng** (`08-troly35.gs:856-885`). Nếu index có
  vector thì luôn trả về 5 tư liệu. ⇒ Vấn đề không nằm ở retrieval/threshold.
- **Điều kiện score > 0 của Sheets fallback** trên thực tế hiếm khi loại bỏ dòng
  đã duyệt, vì mỗi dòng được cộng `doUuTien` (thường ≥ 1) vào score.

## 3. Các việc ĐÃ làm

Trên nhánh `claude/ai-rag-rebuttal-constraints-39pagy`:

### Commit `847ec30` — nới ràng buộc code phản bác (`backend/08-troly35.gs`)

- `troLy35GenerateRebuttalDraft_`: cổng chặn chỉ short-circuit khi
  `co_luan_dieu_sai_trai === false` **VÀ** không có `knowledge` nào. Nếu đã lấy
  được tư liệu RAG → vẫn sinh bản nháp phản bác dựa trên tư liệu đó.
- Thêm `uncertainBlock` vào prompt: khi phân tích còn dè dặt nhưng có tư liệu,
  hướng model bám vào RAG, ghi điểm cần kiểm chứng vào `ghi_chu` thay vì từ chối.
- `troLy35AnalyzeInput_`: thêm quy tắc mode-aware — ở chế độ `rebuttal`, thiên về
  trích luận điểm cần phản bác; chỉ đặt `false` khi nội dung trung lập/khách quan.

### Commit `409a8bf` — công cụ chẩn đoán kho RAG (`backend/08-troly35.gs`)

- Thêm `troLy35DiagnoseKnowledge_()`, gọi trong `testTroLy35Setup()`. Báo cáo:
  - `PHAN_BAC_KHO`: tổng / đã duyệt / đã sync Pinecone
  - `TCCS_CHUNKS`: tổng / đã duyệt / đã index
  - Probe Pinecone: số match thực tế (0 = namespace rỗng)
- Lý do: `testTroLy35Setup()` cũ chỉ đếm **tổng** dòng → dễ hiểu lầm "đã có dữ
  liệu" trong khi tất cả đang ở "Chờ duyệt".

### Quyết định KHÔNG làm (có chủ đích)

- **Không nới điều kiện "Đã duyệt"** của kho → giữ chất lượng căn cứ, tránh đưa
  tư liệu chưa kiểm duyệt vào nội dung chính trị nhạy cảm.
- **Không tự động hoá việc duyệt** → giữ human-in-the-loop.
- **Không đụng** schema Sheets, khâu Pinecone/embedding.

## 4. Các việc CẦN làm (vận hành — chạy tay trong Apps Script)

Để kho RAG thực sự có căn cứ, chạy theo thứ tự:

1. `runTccsScrapeDrafts()` — scrape bài TCCS thành chunk `Draft`.
2. (tuỳ chọn) `generatePhanBacFromTccs()` — sinh entry `PHAN_BAC_KHO` "Chờ duyệt".
3. Mở Google Sheet, đổi trạng thái dòng hợp lệ → **`Đã duyệt`**.
4. `syncTccsApprovedChunksToPinecone()` và/hoặc `syncTroLy35KnowledgeToPinecone()`.
5. `testTroLy35Setup()` — xác nhận "Pinecone probe trả về N match" với **N > 0**.

### Triển khai code

- `cd backend; npx @google/clasp push --force` để đẩy thay đổi GAS.
- Nếu Web App production pin version cũ → cập nhật deployment trong Apps Script UI.

### Đề xuất (tuỳ chọn, chưa làm)

- Cân nhắc thêm trigger time-based cho scrape/sync nếu muốn kho tự cập nhật định
  kỳ (vẫn giữ khâu duyệt tay).
- Theo dõi tỉ lệ feedback tốt/xấu sau khi nới cổng để tinh chỉnh prompt.

## 5. Cách kiểm thử

1. Apps Script: `testTroLy35Setup()` → xem chẩn đoán kho RAG.
2. Mode `rebuttal`: dán nội dung một chiều/mơ hồ mà kho có tư liệu liên quan →
   trước đây ra "Chưa đủ căn cứ", giờ phải ra bản phản bác kèm `dan_chung` từ RAG.
3. Dán nội dung trung lập/khách quan thật sự → vẫn ra bản dè dặt (không quy chụp).
4. Kiểm tra `analysis.co_luan_dieu_sai_trai` và số "dẫn chứng" hiển thị ở
   `AnalysisBlock` (`web/src/pages/TroLy35.jsx`).

## 6. Kết luận

- "Lấy không được căn cứ" do **hai** nguyên nhân: (a) cổng chặn code vứt bỏ tư
  liệu đã lấy, và (b) kho RAG chưa được duyệt + chưa sync lên Pinecone. Khâu
  retrieval/Pinecone **không** phải thủ phạm.
- Đã sửa (a) và bổ sung công cụ chẩn đoán cho (b). (b) là việc vận hành, cần
  người dùng duyệt + chạy sync — không tự động hoá để giữ kiểm soát nội dung.
