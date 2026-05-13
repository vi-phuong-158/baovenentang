# 🤖 KẾ HOẠCH CHI TIẾT - TÍNH NĂNG ĐỘT PHÁ

# AI PHẢN BÁC REALTIME — "Trợ lý 35 trên máy"

> **Mục tiêu:** Xây dựng công cụ AI giúp cán bộ, đoàn viên nhanh chóng nhận diện và phản bác các luận điệu sai trái trên không gian mạng.  
> **Phiên bản:** 1.0 — Tháng 5/2026  
> **Tác giả:** Vi Ngọc Phương — PA01, Công an tỉnh Phú Thọ

---

## I. TỔNG QUAN

### 1.1 Vấn đề thực tiễn

Hiện nay, khi cán bộ, đoàn viên phát hiện bài viết/comment xuyên tạc trên Facebook, TikTok, YouTube, họ thường gặp 3 khó khăn:

| Vấn đề | Hệ quả |
|--------|--------|
| Không có thời gian tra cứu luận điểm phản bác | Bỏ qua, để luận điệu sai lan rộng |
| Không biết phản bác bằng dẫn chứng nào cho thuyết phục | Comment cảm tính, dễ bị "bẻ lại" |
| Không có template/văn phong phù hợp | Viết khô cứng, không sinh động |

→ **Giải pháp:** Một công cụ AI 24/7, paste bài xuyên tạc vào → ra ngay phương án phản bác chuyên nghiệp.

### 1.2 Giá trị cốt lõi

**Trước khi có công cụ:**
- ⏱️ Mất 30-60 phút để soạn 1 phản hồi chất lượng
- 📚 Phải tra cứu nhiều nguồn
- ❌ Nhiều cán bộ bỏ cuộc, không phản hồi

**Sau khi có công cụ:**
- ⚡ Chỉ mất 2-5 phút có ngay phản hồi
- ✅ Dẫn chứng có sẵn, có nguồn chính thống
- 📈 Tăng 10x số phản hồi/cán bộ/tuần

### 1.3 Khác biệt so với ChatGPT/Gemini thông thường

| Tiêu chí | ChatGPT/Gemini | Trợ lý 35 |
|----------|----------------|-----------|
| Bảo mật | Gửi data ra nước ngoài | Lưu trữ trong nước, an toàn |
| Chuyên môn | Trả lời chung chung | Chuyên sâu về Nghị quyết, Luật VN |
| Dẫn chứng | Bịa, không kiểm chứng được | Trích từ kho văn bản chính thống |
| Văn phong | Văn dịch, cứng | Văn phong báo chí cách mạng |
| Định hướng | Trung lập | Đúng định hướng Đảng |

---

## II. KIẾN TRÚC KỸ THUẬT

### 2.1 Sơ đồ tổng quan

```
┌──────────────────────────────────────────────────┐
│             NGƯỜI DÙNG (Cán bộ, ĐV)              │
│  Paste bài xuyên tạc / Câu hỏi từ người dân     │
└────────────────────────┬─────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────┐
│        TẦNG 1: PHÂN TÍCH ĐẦU VÀO (AI)            │
│  • Nhận diện luận điệu sai trái                  │
│  • Phân loại chủ đề (15 nhóm)                    │
│  • Đánh giá độ nhạy cảm (1-5)                    │
└────────────────────────┬─────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────┐
│        TẦNG 2: TÌM KIẾM NGỮ NGHĨA (RAG)          │
│  • Tìm trong kho 200+ luận điểm có sẵn           │
│  • Tìm trong văn bản Đảng, Luật                  │
│  • Lấy top 5 nội dung liên quan nhất             │
└────────────────────────┬─────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────┐
│        TẦNG 3: SINH PHẢN BÁC (Gemini)            │
│  • Tổng hợp các nguồn → phản bác có cấu trúc     │
│  • Sinh 3 phiên bản: ngắn / dài / comment        │
│  • Đề xuất hashtag, đường link nguồn             │
└────────────────────────┬─────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────┐
│             KẾT QUẢ HIỂN THỊ                     │
│  ✅ Phân tích luận điệu (5 ý chính)              │
│  ✅ Phản bác chi tiết (có dẫn chứng)             │
│  ✅ Comment ngắn để paste lại                     │
│  ✅ Nguồn tham khảo                              │
│  ✅ Đánh giá chất lượng / Báo cáo                │
└──────────────────────────────────────────────────┘
```

### 2.2 Stack công nghệ

| Tầng | Công nghệ | Chi phí/tháng |
|------|-----------|---------------|
| Frontend | HTML/CSS/JS thuần (giữ thống nhất hệ sinh thái) | 0đ |
| Backend chính | Google Apps Script (mở rộng từ Trận Địa Số) | 0đ |
| AI sinh phản bác | Gemini 2.0 Flash (đã có) | ~100k |
| Vector Search (RAG) | **Pinecone Free tier** (1 index, 100k vectors) | 0đ |
| Embedding | Gemini text-embedding-004 (miễn phí) | 0đ |
| Database | Google Sheets (đã có) | 0đ |
| Hosting | Vercel (đã có) | 0đ |
| **Tổng** | | **~100k/tháng** |

> Có thể bắt đầu **không cần Pinecone** (dùng keyword search đơn giản trong Sheets), sau scale lên mới cần.

### 2.3 Luồng dữ liệu chi tiết

#### Bước 1: Nhận input
```javascript
{
  "type": "bai_viet" | "comment" | "cau_hoi",
  "content": "Toàn bộ nội dung xuyên tạc...",
  "source_url": "https://facebook.com/..." (optional),
  "language": "vi"
}
```

#### Bước 2: AI phân tích (Gemini call #1)
```javascript
{
  "luan_diem_sai": [
    "Cho rằng Đảng đàn áp tự do ngôn luận",
    "Lấy ví dụ vụ X để chứng minh"
  ],
  "chu_de": "Tự do ngôn luận",
  "do_nguy_hiem": 4,
  "tu_khoa_chinh": ["tự do ngôn luận", "đàn áp", "kiểm duyệt"],
  "doi_tuong_huong_den": "Người trẻ, dùng MXH"
}
```

#### Bước 3: Tìm kiếm trong kho dữ liệu
- Query Google Sheets `PHAN_BAC_KHO` bằng từ khóa
- Lấy 3-5 luận điểm phản bác có sẵn
- Lấy 2-3 trích dẫn từ văn bản Đảng/Luật

#### Bước 4: Tổng hợp phản bác (Gemini call #2)
```javascript
{
  "phan_tich_chi_tiet": "...",
  "phan_bac_day_du": "Luận điểm phản bác đầy đủ 300-500 từ...",
  "comment_ngan": "Bạn ơi, thực ra... (dưới 200 từ, văn phong tự nhiên)",
  "dan_chung": [
    {"loai": "Hiến pháp", "noi_dung": "...", "nguon": "Điều 25 HP 2013"},
    {"loai": "Số liệu", "noi_dung": "...", "nguon": "..."}
  ],
  "hashtag": ["#BaoVeNenTangTuTuong", "#PhuTho"],
  "luu_y": "Nên đăng vào khung giờ 8-10h tối để có tương tác cao nhất"
}
```

---

## III. TÍNH NĂNG CHI TIẾT

### 3.1 Tính năng cốt lõi (MVP - Tuần 1-3)

#### 🎯 F1: Phân tích bài viết xuyên tạc
- Paste link Facebook/YouTube/TikTok
- Hoặc paste trực tiếp nội dung
- AI bóc tách các luận điệu sai trái cụ thể
- Đánh giá độ nguy hiểm (5 mức)

#### 🎯 F2: Sinh phản bác đa dạng
Mỗi yêu cầu sinh ra **3 phiên bản**:
1. **Phản bác chi tiết** (500-800 từ) — dùng cho bài viết phân tích
2. **Comment phản hồi** (100-200 từ) — paste trực tiếp vào comment Facebook
3. **Tóm tắt nhanh** (3-5 ý) — gửi báo cáo lãnh đạo

#### 🎯 F3: Kho dẫn chứng có sẵn
- 50+ trích dẫn Hồ Chí Minh
- 30+ trích dẫn từ Hiến pháp 2013
- 100+ trích dẫn Nghị quyết các kỳ đại hội
- 200+ số liệu thực tế (GDP, HDI, ASEAN...)

#### 🎯 F4: Lưu lịch sử và đánh giá
- Mỗi phản bác được lưu lại
- Người dùng đánh giá chất lượng (1-5 sao)
- AI tự học từ phản hồi để cải thiện

### 3.2 Tính năng nâng cao (Tuần 4-6)

#### ⭐ F5: Chế độ "Thẩm định nhanh"
- Paste bất kỳ tin tức nào → AI đánh giá tính chính thống
- Cảnh báo nếu là tin giả/tin tức không kiểm chứng
- So sánh với báo chính thống

#### ⭐ F6: Trợ lý viết bài tuyên truyền
- Input: chủ đề + thông điệp chính
- Output: bài viết 800-1500 từ đúng văn phong báo chí cách mạng
- Có gợi ý ảnh, hashtag

#### ⭐ F7: Phân tích xu hướng dư luận
- Aggregate các phân tích trong tuần
- Hiển thị top 5 chủ đề đang được xuyên tạc
- Cảnh báo điểm nóng

### 3.3 Tính năng đột phá (Tuần 7-8)

#### 🚀 F8: Chế độ "Tranh luận" với AI
- Người dùng đóng vai phản động → AI phản bác
- Người dùng đóng vai cán bộ → AI đóng vai phản động để luyện tập
- Như tập đánh boxing với bao cát

#### 🚀 F9: API mở cho các đơn vị khác
- Đơn vị khác có thể nhúng widget vào app của họ
- API key có quota riêng
- Dashboard quản lý

---

## IV. KHO DỮ LIỆU (CRITICAL)

### 4.1 Cấu trúc kho 200+ luận điểm

Đây là phần **quan trọng nhất** quyết định chất lượng AI. Cần xây dựng có hệ thống.

#### 15 nhóm chủ đề cần phủ:

| STT | Nhóm | Số luận điểm cần | Độ ưu tiên |
|-----|------|------------------|------------|
| 1 | Vai trò lãnh đạo của Đảng | 20 | ⭐⭐⭐ |
| 2 | Dân chủ XHCN | 15 | ⭐⭐⭐ |
| 3 | Nhân quyền | 15 | ⭐⭐⭐ |
| 4 | Tự do ngôn luận, internet | 15 | ⭐⭐⭐ |
| 5 | Tự do tôn giáo | 10 | ⭐⭐ |
| 6 | Tham nhũng và chống tham nhũng | 15 | ⭐⭐⭐ |
| 7 | Kinh tế thị trường định hướng XHCN | 15 | ⭐⭐ |
| 8 | Quan hệ đối ngoại | 15 | ⭐⭐ |
| 9 | Chủ quyền biển đảo | 10 | ⭐⭐⭐ |
| 10 | Quân đội, Công an | 15 | ⭐⭐⭐ |
| 11 | Lịch sử Đảng | 10 | ⭐⭐ |
| 12 | Tư tưởng Hồ Chí Minh | 15 | ⭐⭐⭐ |
| 13 | Đoàn kết dân tộc | 10 | ⭐⭐ |
| 14 | Phát triển bền vững, môi trường | 10 | ⭐ |
| 15 | Các vấn đề thời sự | 15 | ⭐⭐ |

**Tổng: 205 luận điểm**

### 4.2 Cấu trúc 1 luận điểm chuẩn

```json
{
  "id": "PB001",
  "chu_de": "Vai trò lãnh đạo của Đảng",
  "luan_diem_sai_trai": [
    "Cần đa nguyên đa đảng để có dân chủ",
    "Việt Nam không có dân chủ thực sự",
    "Đảng độc quyền dẫn đến độc tài"
  ],
  "phan_bac_chinh": "Luận điểm phản bác 300-500 từ...",
  "dan_chung": {
    "van_ban": [
      "Hiến pháp 2013 - Điều 4",
      "Cương lĩnh 2011"
    ],
    "su_kien_lich_su": [
      "Cách mạng tháng Tám 1945",
      "Chiến thắng 1975",
      "Đổi mới 1986"
    ],
    "so_lieu": [
      "GDP tăng từ 8 tỷ USD (1986) lên 430 tỷ USD (2023)",
      "30 triệu người thoát nghèo"
    ],
    "trich_dan": [
      "Hồ Chí Minh: 'Đảng ta là Đảng cầm quyền...'",
      "Nguyễn Phú Trọng: 'Đảng là người tổ chức...'"
    ]
  },
  "tu_khoa": ["đa đảng", "dân chủ", "Đảng lãnh đạo"],
  "do_uu_tien": 3,
  "ngon_ngu": "vi",
  "ngay_cap_nhat": "2026-05-13"
}
```

### 4.3 Nguồn dữ liệu để xây kho

**Nguồn chính thống có sẵn:**
1. 📚 Báo Nhân Dân — chuyên mục "Bảo vệ nền tảng tư tưởng"
2. 📚 Tạp chí Cộng sản — các bài phân tích chuyên sâu
3. 📚 Báo Công an Nhân dân — chuyên mục "Phòng chống tự diễn biến"
4. 📚 Tạp chí Quốc phòng toàn dân
5. 📚 Nhà xuất bản Chính trị Quốc gia Sự thật

**Nguồn AI hỗ trợ tạo nhanh:**
- Dùng Gemini với prompt chuẩn để tạo bản nháp
- Cán bộ chuyên môn hiệu đính
- Hội đồng nghiệm thu (3-5 chuyên gia)

---

## V. KẾ HOẠCH TRIỂN KHAI

### 5.1 Lộ trình 8 tuần

#### Tuần 1: Nghiên cứu & Thiết kế
- [ ] Đọc kỹ Nghị quyết 35-NQ/TW
- [ ] Khảo sát 5-10 cán bộ về nhu cầu thực tế
- [ ] Vẽ wireframe giao diện
- [ ] Thiết kế prompt mẫu cho Gemini
- [ ] Tìm hiểu Pinecone Free tier (nếu cần)

#### Tuần 2: Xây dựng kho dữ liệu (50 luận điểm đầu)
- [ ] Định nghĩa schema JSON
- [ ] Tạo Google Sheet `PHAN_BAC_KHO`
- [ ] Soạn 50 luận điểm ưu tiên cao nhất
- [ ] Mỗi luận điểm cần dẫn chứng đầy đủ
- [ ] Hội đồng chuyên môn duyệt (nếu có)

#### Tuần 3: Backend - Tầng phân tích
- [ ] Tạo function `analyzeInput()` gọi Gemini
- [ ] Thiết kế prompt phân tích luận điểm sai
- [ ] Test với 20 mẫu input thực tế
- [ ] Lưu kết quả phân tích vào Sheets

#### Tuần 4: Backend - Tầng tìm kiếm + sinh phản bác
- [ ] Function `searchKnowledgeBase(keywords)` 
- [ ] Function `generateRebuttal(analysis, knowledge)`
- [ ] Tinh chỉnh prompt sinh 3 phiên bản
- [ ] Test end-to-end với 30 mẫu

#### Tuần 5: Frontend - Giao diện
- [ ] Trang "Trợ lý 35" với textarea lớn
- [ ] Hiển thị kết quả 3 cột (chi tiết / comment / tóm tắt)
- [ ] Nút copy nhanh cho từng phiên bản
- [ ] Lưu lịch sử cá nhân

#### Tuần 6: Tích hợp + Bổ sung kho dữ liệu
- [ ] Kết nối Frontend với Backend
- [ ] Thêm 100 luận điểm còn lại
- [ ] Tính năng đánh giá chất lượng
- [ ] Test với 10 cán bộ thực tế

#### Tuần 7: Tính năng nâng cao
- [ ] F5: Thẩm định tin tức
- [ ] F6: Trợ lý viết bài
- [ ] F7: Phân tích xu hướng dư luận

#### Tuần 8: Hoàn thiện + Marketing
- [ ] Video demo 3 phút
- [ ] Tài liệu hướng dẫn sử dụng
- [ ] Đào tạo 20 cán bộ đầu tiên
- [ ] Thu thập case study thực tế

### 5.2 Resource cần thiết

| Loại | Số lượng | Ghi chú |
|------|----------|---------|
| Thời gian cá nhân | 4-6h/ngày × 8 tuần | ~250 giờ |
| Chuyên gia tư vấn | 2-3 người | Lãnh đạo phòng, đồng nghiệp |
| Người duyệt nội dung | 1-2 người | Cán bộ chuyên môn |
| Tester | 10 người | Cán bộ, đoàn viên |
| Chi phí | ~500k | API + tên miền |

---

## VI. MẪU PROMPT CHO GEMINI

### 6.1 Prompt phân tích đầu vào

```text
Bạn là chuyên gia phân tích thông tin chính trị - xã hội, làm việc cho 
lực lượng Công an nhân dân Việt Nam. Nhiệm vụ của bạn là phân tích nội 
dung sau và bóc tách các luận điệu sai trái, xuyên tạc.

NỘI DUNG CẦN PHÂN TÍCH:
"""
{user_input}
"""

Hãy phân tích và trả về JSON theo cấu trúc:
{
  "co_luan_dieu_sai_trai": true/false,
  "do_nguy_hiem": 1-5 (1=ít nghiêm trọng, 5=rất nghiêm trọng),
  "luan_diem_sai": [
    "Liệt kê từng luận điểm sai trái cụ thể, viết ngắn gọn"
  ],
  "chu_de": "Một trong 15 chủ đề: Vai trò lãnh đạo của Đảng | Dân chủ XHCN | Nhân quyền | ...",
  "thu_doan": [
    "Liệt kê các thủ đoạn được sử dụng: cắt ghép thông tin, xuyên tạc lịch sử, ..."
  ],
  "tu_khoa_chinh": ["3-5 từ khóa"],
  "doi_tuong_huong_den": "Nhóm người dễ bị ảnh hưởng",
  "muc_tieu_chinh_tri": "Phân tích ý đồ thực sự của người viết"
}

QUY TẮC:
1. Khách quan, không suy diễn
2. Phân tích sâu thủ đoạn của địch
3. Chỉ ra rõ ràng từng luận điểm sai
4. Trả về JSON, không thêm giải thích
```

### 6.2 Prompt sinh phản bác

```text
Bạn là chuyên gia bảo vệ nền tảng tư tưởng của Đảng Cộng sản Việt Nam, 
có trình độ lý luận chính trị cao cấp, am hiểu sâu sắc về tư tưởng Hồ 
Chí Minh, Nghị quyết của Đảng và pháp luật Việt Nam.

PHÂN TÍCH ĐẦU VÀO:
{analysis_from_step_1}

TƯ LIỆU THAM KHẢO TỪ KHO DỮ LIỆU:
{relevant_knowledge_from_rag}

Hãy soạn phản bác theo 3 phiên bản:

### PHIÊN BẢN 1: PHẢN BÁC ĐẦY ĐỦ (500-800 từ)
Cấu trúc:
- Mở bài: nêu vấn đề khách quan
- Phân tích từng luận điểm sai
- Đưa ra dẫn chứng có nguồn gốc rõ ràng
- Kết luận: định hướng tư tưởng tích cực

### PHIÊN BẢN 2: COMMENT PHẢN HỒI (100-200 từ)
- Văn phong tự nhiên, gần gũi như người trẻ nói chuyện
- Bắt đầu bằng "Bạn ơi" hoặc "Mình thấy..."
- Dùng 1-2 dẫn chứng mạnh nhất
- Kết thúc bằng câu mở ra suy nghĩ tích cực
- TRÁNH: lên gân, dạy đời, sách vở

### PHIÊN BẢN 3: TÓM TẮT NHANH (3-5 gạch đầu dòng)
- Dành cho báo cáo lãnh đạo
- Mỗi ý 1 dòng ngắn
- Có số liệu/dẫn chứng cụ thể

Trả về JSON:
{
  "phien_ban_day_du": "...",
  "phien_ban_comment": "...",
  "phien_ban_tom_tat": ["...", "..."],
  "dan_chung_su_dung": [
    {"loai": "...", "noi_dung": "...", "nguon": "..."}
  ],
  "hashtag_de_xuat": ["#...", "#..."],
  "ghi_chu": "Lưu ý khi sử dụng phản bác này"
}

YÊU CẦU BẮT BUỘC:
1. Sử dụng văn phong báo chí cách mạng: chính xác, khoa học, có sức 
   thuyết phục
2. Mọi dẫn chứng phải có nguồn cụ thể (Văn bản nào, năm nào, ai nói)
3. KHÔNG bịa số liệu, KHÔNG suy diễn
4. Tránh giáo điều, áp đặt
5. Định hướng tích cực, mở ra niềm tin
```

---

## VII. MÃ NGUỒN MẪU

### 7.1 Backend - Function chính

```javascript
/**
 * MAIN FUNCTION: Phân tích và sinh phản bác
 * @param {string} userInput - Nội dung người dùng paste vào
 * @return {Object} Kết quả phân tích và phản bác
 */
function analyzeAndRebut(userInput) {
  try {
    // Bước 1: Phân tích đầu vào
    Logger.log('[Trợ lý 35] Bước 1: Phân tích');
    const analysis = analyzeInput(userInput);
    
    if (!analysis.co_luan_dieu_sai_trai) {
      return {
        success: true,
        message: 'Không phát hiện luận điệu sai trái rõ ràng',
        analysis: analysis
      };
    }
    
    // Bước 2: Tìm kiếm trong kho
    Logger.log('[Trợ lý 35] Bước 2: Tìm kiếm RAG');
    const relevantKnowledge = searchKnowledgeBase(
      analysis.tu_khoa_chinh,
      analysis.chu_de
    );
    
    // Bước 3: Sinh phản bác
    Logger.log('[Trợ lý 35] Bước 3: Sinh phản bác');
    const rebuttal = generateRebuttal(analysis, relevantKnowledge);
    
    // Bước 4: Lưu lịch sử
    saveAnalysisHistory({
      input: userInput,
      analysis: analysis,
      rebuttal: rebuttal,
      timestamp: new Date()
    });
    
    return {
      success: true,
      analysis: analysis,
      rebuttal: rebuttal,
      references: relevantKnowledge
    };
    
  } catch(error) {
    Logger.log(`[Trợ lý 35] Lỗi: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Phân tích đầu vào bằng Gemini
 */
function analyzeInput(text) {
  const prompt = `[PROMPT PHÂN TÍCH NHƯ MỤC VI.1]
  
  NỘI DUNG: "${text.substring(0, 3000)}"
  
  Trả về JSON.`;
  
  const response = callGeminiAPI(prompt);
  return JSON.parse(response);
}

/**
 * Tìm kiếm trong kho luận điểm
 */
function searchKnowledgeBase(keywords, topic) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
    .getSheetByName('PHAN_BAC_KHO');
  
  if (sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getValues();
  
  // Score từng luận điểm
  const scored = data.map(row => {
    const luanDiem = {
      id: row[0],
      chu_de: row[1],
      luan_diem_sai: row[2],
      phan_bac: row[3],
      dan_chung: row[4],
      tu_khoa: row[5]
    };
    
    let score = 0;
    
    // Match chủ đề (trọng số cao)
    if (luanDiem.chu_de === topic) score += 10;
    
    // Match từ khóa
    keywords.forEach(kw => {
      if (luanDiem.tu_khoa.toLowerCase().includes(kw.toLowerCase())) score += 3;
      if (luanDiem.phan_bac.toLowerCase().includes(kw.toLowerCase())) score += 1;
    });
    
    return { ...luanDiem, score };
  });
  
  // Trả về top 5
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/**
 * Sinh phản bác
 */
function generateRebuttal(analysis, knowledge) {
  const knowledgeText = knowledge.map((k, i) => 
    `[Tài liệu ${i+1}] ${k.chu_de}\n` +
    `Phản bác: ${k.phan_bac}\n` +
    `Dẫn chứng: ${k.dan_chung}\n`
  ).join('\n');
  
  const prompt = `[PROMPT SINH PHẢN BÁC NHƯ MỤC VI.2]
  
  PHÂN TÍCH: ${JSON.stringify(analysis)}
  
  TƯ LIỆU: ${knowledgeText}
  
  Sinh phản bác.`;
  
  const response = callGeminiAPI(prompt);
  return JSON.parse(response);
}

/**
 * Lưu lịch sử để học và đo lường
 */
function saveAnalysisHistory(data) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
    .getSheetByName('LICH_SU_PHAN_BAC');
    
  sheet.appendRow([
    data.timestamp,
    data.input.substring(0, 500),
    JSON.stringify(data.analysis),
    JSON.stringify(data.rebuttal),
    '', // user rating (sẽ update sau)
    '' // notes
  ]);
}
```

### 7.2 Frontend - Giao diện trợ lý

Tôi sẽ build chi tiết phần này trong file `web/troly35.html` riêng biệt.

---

## VIII. ĐO LƯỜNG HIỆU QUẢ

### 8.1 KPIs

| Chỉ số | Tháng 1 | Tháng 3 | Tháng 6 |
|--------|---------|---------|---------|
| Số cán bộ đã dùng | 30 | 150 | 500 |
| Lượt phân tích/tháng | 100 | 1000 | 5000 |
| Số phản bác đã được paste lên MXH | 50 | 500 | 2500 |
| Tỷ lệ đánh giá tốt (4-5 sao) | 70% | 80% | 85% |
| Thời gian trung bình/phản bác | 5 phút | 3 phút | 2 phút |

### 8.2 Câu chuyện thành công cần ghi lại

Để đưa vào bài chính luận, ghi nhật ký các trường hợp:
- 📌 Comment phản bác được nhiều like, share
- 📌 Phát hiện và xử lý kịp thời bài xuyên tạc
- 📌 Lan tỏa ra các đơn vị khác xin sử dụng
- 📌 Lãnh đạo cấp trên khen ngợi
- 📌 Báo chí địa phương đưa tin

---

## IX. RỦI RO & GIẢI PHÁP

### 9.1 Rủi ro kỹ thuật

| Rủi ro | Giải pháp |
|--------|-----------|
| Gemini trả lời không đúng định hướng | Tinh chỉnh prompt, có cán bộ chuyên môn duyệt |
| Vượt quota Gemini | Giới hạn 50 phân tích/người/ngày |
| Phản bác quá cứng nhắc | Sinh 3 phiên bản đa dạng, có comment văn phong tự nhiên |
| Lộ thông tin nhạy cảm | Không lưu thông tin cá nhân chi tiết, hash IP |

### 9.2 Rủi ro nghiệp vụ

| Rủi ro | Giải pháp |
|--------|-----------|
| Cán bộ sao chép máy móc, không hiểu | Đào tạo, mỗi phản bác có ghi chú "cần điều chỉnh" |
| Lạm dụng để comment spam | Giới hạn tần suất, theo dõi từ admin |
| Bị các đối tượng phản động khai thác | Yêu cầu đăng nhập, xác thực qua email công an |

### 9.3 Rủi ro pháp lý/chính trị

| Rủi ro | Giải pháp |
|--------|-----------|
| Tạo phản bác sai gây hiểu nhầm | Có cán bộ chuyên môn duyệt nội dung mẫu |
| AI bịa số liệu | Yêu cầu mọi số liệu phải có nguồn cụ thể |
| Bị quy là "vũ khí tư tưởng tự động" | Trình bày rõ: đây là công cụ hỗ trợ, không thay thế tư duy con người |

> ⚠️ **QUAN TRỌNG:** Trước khi triển khai rộng, **xin chủ trương** của lãnh đạo Phòng và Công an tỉnh. Đây là tính năng nhạy cảm.

---

## X. CHIẾN LƯỢC ĐOẠT GIẢI CAO

### 10.1 Làm sao để giám khảo nhớ tới bài viết của anh?

**Yếu tố ấn tượng 1:** Câu chuyện cụ thể
> "Một cán bộ trẻ ở Phú Thọ xây dựng AI giúp 500 đồng nghiệp 
> phản bác kịp thời 2500 luận điệu sai trái trên mạng chỉ trong 6 tháng"

**Yếu tố ấn tượng 2:** Số liệu sinh động
- Trước: 1 cán bộ mất 60 phút/phản bác → bỏ qua nhiều bài xuyên tạc
- Sau: 5 phút/phản bác → kịp thời ngăn chặn lan truyền
- Tổng: tiết kiệm 13.000+ giờ công cho lực lượng tỉnh

**Yếu tố ấn tượng 3:** Tầm nhìn nhân rộng
- 62 tỉnh thành khác có thể áp dụng
- Phục vụ 500.000+ cán bộ, đoàn viên trên toàn quốc
- Ước tính giá trị: tiết kiệm 50 tỷ đồng/năm cho lực lượng

### 10.2 Cấu trúc bài chính luận có sản phẩm này

**Tiêu đề đề xuất:**
> *"Trợ lý 35 trên máy: Ứng dụng trí tuệ nhân tạo trong công tác bảo vệ 
> nền tảng tư tưởng của Đảng từ cơ sở - Mô hình tại Công an tỉnh Phú Thọ"*

**Phần dẫn chứng đắt giá:**
- Screenshot giao diện công cụ
- Bảng so sánh trước/sau triển khai
- Trích lời cán bộ sử dụng thực tế
- Số liệu Quốc tế: Mỹ, Trung Quốc cũng dùng AI cho công tác tư tưởng
- So sánh với chi phí thuê người: tiết kiệm hàng tỷ đồng

---

## XI. KẾ HOẠCH PHỐI HỢP DỰ THI

### Lộ trình kết hợp với cuộc thi chính luận 2026:

| Tháng | Việc cần làm |
|-------|--------------|
| 5/2026 | Triển khai Trận Địa Số cơ bản |
| 6/2026 | Bắt đầu xây Trợ lý 35 (tuần 1-4) |
| 7/2026 | Hoàn thiện Trợ lý 35 (tuần 5-8) |
| 8/2026 | Đào tạo cán bộ sử dụng |
| 9/2026 | Thu thập case study, số liệu |
| 10/2026 | Viết bản nháp bài chính luận |
| 11/2026 | Hoàn thiện, nộp bài |

### Tài liệu phụ trợ kèm bài dự thi:
- 📌 Video demo 3 phút
- 📌 Báo cáo số liệu 3-6 tháng vận hành  
- 📌 Thư xác nhận từ Phòng/Công an tỉnh
- 📌 Phản hồi của người dùng (10-20 trích dẫn)
- 📌 Link sản phẩm thực tế đang chạy

---

## XII. BƯỚC TIẾP THEO NGAY HÔM NAY

Anh có thể bắt đầu **ngay hôm nay** với 3 việc:

### ✅ Việc 1 (30 phút): Xin chủ trương
Soạn 1 email/báo cáo ngắn gửi lãnh đạo Phòng:
- Giới thiệu ý tưởng
- Lợi ích cho công tác
- Xin phép triển khai thử nghiệm

### ✅ Việc 2 (2 giờ): Tạo Google Sheet
- Tạo sheet `PHAN_BAC_KHO` với 15 cột theo schema
- Copy 20 luận điểm có sẵn từ `phanbac-sample-data.csv` của dự án Trận Địa Số
- Bắt đầu mở rộng từ đó

### ✅ Việc 3 (4 giờ): Build prototype
- Mở rộng từ codebase Trận Địa Số
- Thêm function `analyzeAndRebut()` 
- Test với 5 input thực tế

---

## 📞 LIÊN HỆ HỖ TRỢ

Khi anh bắt đầu triển khai, anh có thể quay lại đây để:
- Yêu cầu tôi build code cụ thể cho từng phần
- Soạn prompt mẫu cho 200 luận điểm
- Review case study trước khi đưa vào bài viết
- Phác thảo bài chính luận hoàn chỉnh

---

*"Trên không gian mạng, mỗi cán bộ phải là một chiến sĩ. AI là vũ khí, không phải để thay thế chiến sĩ, mà để giúp mỗi chiến sĩ chiến đấu hiệu quả hơn 10 lần."*

**Vi Ngọc Phương — PA01, Công an tỉnh Phú Thọ — Tháng 5/2026**
