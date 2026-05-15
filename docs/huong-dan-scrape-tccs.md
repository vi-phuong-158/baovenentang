# Hướng dẫn: Scrape và Chunk tự động từ Tạp chí Cộng sản vào Pinecone

## Tổng quan

Script này chạy trên **Google Apps Script (GAS)**, thực hiện toàn bộ pipeline:

```
Tạp chí Cộng sản (web)
→ Fetch danh sách bài mới
→ Fetch nội dung từng bài
→ Gemini phân tích và chia chunk ngữ nghĩa
→ Lưu vào Google Sheet (trạng thái Draft)
→ Admin duyệt → Approved
→ Tạo embedding → Upsert vào Pinecone
```

---

## Yêu cầu trước khi bắt đầu

### Tài khoản và API key cần có
- Google account (để dùng GAS + Google Sheets)
- Gemini API key → lấy tại https://aistudio.google.com
- Pinecone API key → lấy tại https://app.pinecone.io
- Pinecone Index đã tạo sẵn với dimension phù hợp với embedding model

### Cấu trúc Google Sheet cần tạo trước

Tạo một Google Spreadsheet với **3 sheet** sau:

**Sheet 1: `articles`**

| Cột | Tên cột | Mô tả |
|-----|---------|-------|
| A | id | UUID tự sinh |
| B | title | Tiêu đề bài viết |
| C | topic | Chủ đề (AI tự phân loại) |
| D | source_url | URL bài gốc |
| E | full_text | Toàn bộ nội dung đã extract |
| F | author | Tên tác giả |
| G | published_date | Ngày đăng |
| H | status | Draft / Approved / Indexed |
| I | scraped_at | Thời điểm scrape |
| J | notes | Ghi chú của admin |

**Sheet 2: `chunks`**

| Cột | Tên cột | Mô tả |
|-----|---------|-------|
| A | chunk_id | UUID tự sinh |
| B | article_id | Liên kết với sheet articles |
| C | title | Tiêu đề bài viết gốc |
| D | topic | Chủ đề |
| E | section_type | Loại đoạn (xem bên dưới) |
| F | content | Nội dung chunk (có prefix ngữ cảnh) |
| G | raw_content | Nội dung chunk gốc (không có prefix) |
| H | chunk_index | Thứ tự chunk trong bài |
| I | word_count | Số từ |
| J | source_url | URL bài gốc |
| K | vector_id | ID trên Pinecone (điền sau khi index) |
| L | status | Draft / Approved / Indexed |
| M | indexed_at | Thời điểm index vào Pinecone |

**Sheet 3: `scrape_log`**

| Cột | Tên cột | Mô tả |
|-----|---------|-------|
| A | timestamp | Thời điểm chạy |
| B | action | Hành động |
| C | url | URL liên quan |
| D | status | success / error |
| E | message | Thông tin chi tiết |

### Các giá trị section_type hợp lệ

```
luan_dieu_sai     → Đoạn nêu luận điệu sai trái của địch
boi_canh          → Đoạn giải thích bối cảnh, lịch sử, pháp lý
phan_tich         → Đoạn phân tích vì sao luận điệu đó sai
luan_cu_phan_bac  → Đoạn đưa ra căn cứ, dẫn chứng phản bác
giai_phap         → Đoạn đề xuất giải pháp, kết luận
tong_hop          → Đoạn tổng hợp, không rõ loại
```

### Các giá trị topic hợp lệ

```
chinh-tri-dang        → Chính trị, vai trò lãnh đạo của Đảng
dan-chu-nhan-quyen    → Dân chủ, nhân quyền, tự do
kinh-te               → Kinh tế thị trường định hướng XHCN
quoc-phong-an-ninh    → Quốc phòng, an ninh, quân đội
doi-ngoai             → Đối ngoại, chủ quyền, biển đảo
van-hoa-xa-hoi        → Văn hóa, xã hội, dân tộc, tôn giáo
tu-tuong-ho-chi-minh  → Tư tưởng Hồ Chí Minh
the-che-phap-luat     → Thể chế, pháp luật, nhà nước pháp quyền
khac                  → Chủ đề khác
```

---

## Cấu hình (CONFIG)

Đặt ở đầu file GAS, thay toàn bộ giá trị YOUR_... bằng thông tin thực:

```javascript
const CONFIG = {
  // Google Sheet
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',
  // Lấy SHEET_ID từ URL của Sheet: 
  // https://docs.google.com/spreadsheets/d/SHEET_ID_Ở_ĐÂY/edit

  // Gemini API
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',
  GEMINI_MODEL_CHAT: 'gemini-2.0-flash',
  GEMINI_MODEL_EMBEDDING: 'text-embedding-004',
  // text-embedding-004 có dimension = 768

  // Pinecone
  PINECONE_API_KEY: 'YOUR_PINECONE_API_KEY',
  PINECONE_HOST: 'YOUR_PINECONE_HOST',
  // PINECONE_HOST lấy từ Pinecone console, dạng:
  // https://your-index-name-xxxx.svc.aped-xxxx.pinecone.io

  // Scrape config
  BASE_URL: 'https://www.tapchicongsan.org.vn',
  SECTION_PATH: '/dau-tranh-phan-bac-cac-luan-dieu-sai-trai-thu-dich',
  MAX_ARTICLES_PER_RUN: 10,
  // Giới hạn số bài mỗi lần chạy, tránh timeout GAS (6 phút)

  // Chunk config
  MIN_CHUNK_WORDS: 80,
  // Chunk ít hơn số từ này sẽ bị bỏ qua
  MAX_CHUNK_WORDS: 500,
  // Chunk nhiều hơn sẽ được Gemini tự chia nhỏ hơn

  // Delay giữa các request (ms) - tránh bị block
  REQUEST_DELAY: 1500,
};
```

---

## Toàn bộ code GAS

Copy toàn bộ phần code sau vào một file GAS duy nhất.

### Phần 1: Hàm tiện ích

```javascript
// ============================================================
// PHẦN 1: HÀM TIỆN ÍCH
// ============================================================

/**
 * Ghi log vào sheet scrape_log
 */
function writeLog(action, url, status, message) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
                                .getSheetByName('scrape_log');
    sheet.appendRow([
      new Date(),
      action,
      url || '',
      status,
      message || ''
    ]);
  } catch (e) {
    // Không làm gì nếu log thất bại, tránh vòng lặp lỗi
  }
}

/**
 * Tạo UUID đơn giản
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * Delay để tránh bị block khi scrape
 */
function sleep(ms) {
  Utilities.sleep(ms);
}

/**
 * Lấy danh sách URL đã scrape rồi (để bỏ qua)
 */
function getIndexedUrls() {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
                              .getSheetByName('articles');
  const data = sheet.getDataRange().getValues();
  const urls = new Set();
  // Cột D (index 3) là source_url
  data.slice(1).forEach(row => {
    if (row[3]) urls.add(row[3].toString().trim());
  });
  return urls;
}

/**
 * Gọi Gemini API - dùng cho cả chat và embedding
 */
function callGeminiChat(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL_CHAT}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      // Temperature thấp để output ổn định, ít sáng tạo
    }
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const data = JSON.parse(response.getContentText());

    if (data.error) {
      throw new Error(`Gemini error: ${data.error.message}`);
    }

    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    writeLog('callGeminiChat', '', 'error', e.message);
    throw e;
  }
}

/**
 * Gọi Gemini Embedding API
 * Trả về mảng số (vector)
 */
function callGeminiEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL_EMBEDDING}:embedContent?key=${CONFIG.GEMINI_API_KEY}`;

  const payload = {
    model: `models/${CONFIG.GEMINI_MODEL_EMBEDDING}`,
    content: { parts: [{ text: text }] }
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const data = JSON.parse(response.getContentText());

    if (data.error) {
      throw new Error(`Embedding error: ${data.error.message}`);
    }

    return data.embedding.values;
  } catch (e) {
    writeLog('callGeminiEmbedding', '', 'error', e.message);
    throw e;
  }
}

/**
 * Upsert vector vào Pinecone
 */
function upsertToPinecone(vectorId, values, metadata) {
  const url = `${CONFIG.PINECONE_HOST}/vectors/upsert`;

  const payload = {
    vectors: [{
      id: vectorId,
      values: values,
      metadata: metadata
    }]
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Api-Key': CONFIG.PINECONE_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (response.getResponseCode() !== 200) {
      throw new Error(`Pinecone error: ${JSON.stringify(result)}`);
    }

    return result;
  } catch (e) {
    writeLog('upsertToPinecone', vectorId, 'error', e.message);
    throw e;
  }
}

/**
 * Làm sạch text HTML cơ bản
 * Bỏ các tag HTML, giữ lại text thuần
 */
function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Đếm số từ trong chuỗi tiếng Việt
 */
function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}
```

---

### Phần 2: Scrape danh sách bài và nội dung

```javascript
// ============================================================
// PHẦN 2: SCRAPE
// ============================================================

/**
 * Lấy danh sách link bài viết từ trang chuyên mục
 * Trả về mảng { url, title }
 */
function fetchArticleList() {
  const url = CONFIG.BASE_URL + CONFIG.SECTION_PATH;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)'
      }
    });

    const html = response.getContentText('UTF-8');
    const articles = [];

    // Pattern URL của bài viết trong chuyên mục này
    // Dạng: /en/dau-tranh-.../chi-tiet/-/asset_publisher/.../content/[slug]
    // Hoặc: /web/guest/dau-tranh-.../[-/...]/content/[slug]
    const patterns = [
      /href="(\/[^"]*dau-tranh-phan-bac[^"]*chi-tiet[^"]*content\/[^"]+)"/gi,
      /href="(\/en\/dau-tranh[^"]*content\/[^"]+)"/gi,
      /href="(\/web\/guest\/dau-tranh[^"]*\/\d{4}\/\d+\/[^"]+\.aspx)"/gi,
    ];

    const seen = new Set();

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const path = match[1];
        const fullUrl = CONFIG.BASE_URL + path;
        
        if (!seen.has(fullUrl)) {
          seen.add(fullUrl);
          articles.push({ url: fullUrl, title: '' });
        }
      }
    });

    writeLog('fetchArticleList', url, 'success', `Tìm thấy ${articles.length} bài`);
    return articles;

  } catch (e) {
    writeLog('fetchArticleList', url, 'error', e.message);
    return [];
  }
}

/**
 * Fetch và extract nội dung một bài viết
 * Trả về { title, author, publishedDate, mainText }
 */
function fetchArticleContent(articleUrl) {
  try {
    sleep(CONFIG.REQUEST_DELAY);

    const response = UrlFetchApp.fetch(articleUrl, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; research-bot/1.0)'
      }
    });

    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP ${response.getResponseCode()}`);
    }

    const html = response.getContentText('UTF-8');

    // --- Extract tiêu đề ---
    let title = '';
    const titlePatterns = [
      /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
      /<h1[^>]*>([\s\S]*?)<\/h1>/i,
      /<title>([\s\S]*?)<\/title>/i,
    ];
    for (const pattern of titlePatterns) {
      const m = html.match(pattern);
      if (m) {
        title = stripHtml(m[1]).trim();
        // Bỏ phần " - Tạp chí Cộng sản" nếu có trong thẻ title
        title = title.replace(/\s*[-–|]\s*Tạp chí Cộng sản.*$/i, '').trim();
        if (title.length > 10) break;
      }
    }

    // --- Extract tác giả ---
    let author = '';
    const authorPatterns = [
      /<[^>]*class="[^"]*author[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i,
      /<[^>]*class="[^"]*writer[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i,
    ];
    for (const pattern of authorPatterns) {
      const m = html.match(pattern);
      if (m) {
        author = stripHtml(m[1]).trim();
        if (author.length > 2) break;
      }
    }

    // --- Extract ngày đăng ---
    let publishedDate = '';
    const datePatterns = [
      /<[^>]*class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i,
      /<time[^>]*datetime="([^"]+)"/i,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
    ];
    for (const pattern of datePatterns) {
      const m = html.match(pattern);
      if (m) {
        publishedDate = m[1].trim();
        break;
      }
    }

    // --- Extract nội dung chính ---
    // Thứ tự ưu tiên: tìm container nội dung chính
    let mainHtml = '';
    const contentPatterns = [
      /<div[^>]*class="[^"]*journal-content-article[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*article-footer/i,
      /<div[^>]*class="[^"]*portlet-body[^"]*"[^>]*>([\s\S]*?)<div[^>]*class="[^"]*article-footer/i,
      /<div[^>]*id="content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
    ];
    for (const pattern of contentPatterns) {
      const m = html.match(pattern);
      if (m && m[1].length > 200) {
        mainHtml = m[1];
        break;
      }
    }

    // Fallback: lấy toàn bộ body rồi strip
    if (!mainHtml) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      mainHtml = bodyMatch ? bodyMatch[1] : html;
    }

    // Chuyển <p> thành dòng mới để giữ cấu trúc đoạn văn
    mainHtml = mainHtml.replace(/<\/p>/gi, '\n\n');
    mainHtml = mainHtml.replace(/<br\s*\/?>/gi, '\n');
    mainHtml = mainHtml.replace(/<\/h[1-6]>/gi, '\n\n');

    let mainText = stripHtml(mainHtml);

    // Loại bỏ các đoạn rác phổ biến trên trang này
    const junkPhrases = [
      /Tạp chí Cộng sản\s*$/gm,
      /^\s*TCCS\s*-?\s*/gm,
      /Chia sẻ bài viết.*/gm,
      /Đọc thêm.*/gm,
      /Bài liên quan.*/gm,
      /^\s*Tags?:.*/gm,
    ];
    junkPhrases.forEach(p => { mainText = mainText.replace(p, ''); });

    // Làm sạch khoảng trắng thừa
    mainText = mainText.replace(/\n{3,}/g, '\n\n').trim();

    if (mainText.length < 200) {
      throw new Error('Nội dung quá ngắn, có thể extract thất bại');
    }

    writeLog('fetchArticleContent', articleUrl, 'success', `${countWords(mainText)} từ`);

    return { title, author, publishedDate, mainText };

  } catch (e) {
    writeLog('fetchArticleContent', articleUrl, 'error', e.message);
    return null;
  }
}
```

---

### Phần 3: Gemini phân tích ngữ nghĩa và tạo chunk

```javascript
// ============================================================
// PHẦN 3: GEMINI SEMANTIC CHUNKING
// ============================================================

/**
 * Dùng Gemini để phân loại chủ đề bài viết
 */
function classifyTopic(title, textSnippet) {
  const prompt = `Phân loại bài viết sau vào đúng 1 chủ đề dưới đây.

TIÊU ĐỀ: ${title}
ĐOẠN ĐẦU: ${textSnippet.substring(0, 500)}

CÁC CHỦ ĐỀ HỢP LỆ:
- chinh-tri-dang: Chính trị, vai trò lãnh đạo của Đảng, xây dựng Đảng
- dan-chu-nhan-quyen: Dân chủ, nhân quyền, tự do ngôn luận, tự do báo chí
- kinh-te: Kinh tế thị trường định hướng XHCN, phát triển kinh tế
- quoc-phong-an-ninh: Quốc phòng, an ninh, quân đội, công an
- doi-ngoai: Đối ngoại, chủ quyền biển đảo, quan hệ quốc tế
- van-hoa-xa-hoi: Văn hóa, xã hội, dân tộc, tôn giáo
- tu-tuong-ho-chi-minh: Tư tưởng Hồ Chí Minh, xuyên tạc lịch sử
- the-che-phap-luat: Thể chế, pháp luật, nhà nước pháp quyền
- khac: Không thuộc các chủ đề trên

Chỉ trả về đúng tên chủ đề, không giải thích, không thêm gì khác.
Ví dụ: chinh-tri-dang`;

  try {
    const result = callGeminiChat(prompt).trim().toLowerCase();
    const validTopics = [
      'chinh-tri-dang', 'dan-chu-nhan-quyen', 'kinh-te',
      'quoc-phong-an-ninh', 'doi-ngoai', 'van-hoa-xa-hoi',
      'tu-tuong-ho-chi-minh', 'the-che-phap-luat', 'khac'
    ];
    return validTopics.includes(result) ? result : 'khac';
  } catch (e) {
    return 'khac';
  }
}

/**
 * Dùng Gemini để chia nội dung bài thành các chunk ngữ nghĩa
 * 
 * Trả về mảng:
 * [
 *   {
 *     section_type: "luan_dieu_sai" | "boi_canh" | "phan_tich" | "luan_cu_phan_bac" | "giai_phap" | "tong_hop",
 *     raw_content: "nội dung gốc của chunk",
 *   },
 *   ...
 * ]
 */
function semanticChunkWithGemini(title, fullText) {
  // Giới hạn độ dài đầu vào để tránh vượt context window
  const textToAnalyze = fullText.substring(0, 6000);

  const prompt = `Bạn là chuyên gia phân tích văn bản chính luận tiếng Việt.

Hãy đọc bài viết sau từ Tạp chí Cộng sản và chia thành các đoạn có nghĩa độc lập.

YÊU CẦU:
1. Chia thành 3-6 chunk, mỗi chunk khoảng 150-450 từ
2. Mỗi chunk phải có ý nghĩa độc lập (đọc một mình vẫn hiểu được)
3. Xác định section_type cho mỗi chunk theo các loại sau:
   - luan_dieu_sai: Đoạn nêu luận điệu sai trái, xuyên tạc của các thế lực thù địch
   - boi_canh: Đoạn giải thích bối cảnh lịch sử, chính trị, pháp lý
   - phan_tich: Đoạn phân tích, lý giải vì sao luận điệu đó sai hoặc phiến diện
   - luan_cu_phan_bac: Đoạn đưa ra dẫn chứng, số liệu, trích dẫn văn bản để phản bác
   - giai_phap: Đoạn đề xuất giải pháp, phương hướng, kết luận
   - tong_hop: Đoạn không rõ thuộc loại nào trong các loại trên
4. Giữ NGUYÊN VĂN nội dung, KHÔNG tóm tắt, KHÔNG paraphrase
5. Nếu chunk quá dài (>500 từ), chia nhỏ thêm

TIÊU ĐỀ BÀI: ${title}

NỘI DUNG:
${textToAnalyze}

Trả về JSON array theo cấu trúc sau, không thêm bất kỳ text nào khác:
[
  {
    "section_type": "luan_dieu_sai",
    "raw_content": "Nội dung nguyên văn của chunk này..."
  },
  {
    "section_type": "luan_cu_phan_bac", 
    "raw_content": "Nội dung nguyên văn của chunk này..."
  }
]`;

  try {
    const rawResult = callGeminiChat(prompt);

    // Parse JSON - Gemini đôi khi trả về markdown code block
    let jsonStr = rawResult;
    const codeBlockMatch = rawResult.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    const chunks = JSON.parse(jsonStr.trim());

    // Validate kết quả
    if (!Array.isArray(chunks) || chunks.length === 0) {
      throw new Error('Gemini trả về không phải array hợp lệ');
    }

    const validTypes = ['luan_dieu_sai', 'boi_canh', 'phan_tich', 'luan_cu_phan_bac', 'giai_phap', 'tong_hop'];
    const validChunks = chunks.filter(chunk => {
      return chunk.raw_content
        && chunk.raw_content.trim().length > 50
        && countWords(chunk.raw_content) >= CONFIG.MIN_CHUNK_WORDS;
    }).map(chunk => ({
      section_type: validTypes.includes(chunk.section_type) ? chunk.section_type : 'tong_hop',
      raw_content: chunk.raw_content.trim()
    }));

    if (validChunks.length === 0) {
      throw new Error('Không có chunk nào hợp lệ sau khi filter');
    }

    return validChunks;

  } catch (e) {
    writeLog('semanticChunkWithGemini', '', 'error', e.message);

    // Fallback: chia đơn giản theo đoạn văn nếu Gemini thất bại
    return fallbackChunkByParagraph(fullText);
  }
}

/**
 * Fallback: Chia chunk đơn giản theo đoạn văn
 * Dùng khi Gemini thất bại
 */
function fallbackChunkByParagraph(fullText) {
  const paragraphs = fullText.split('\n\n').filter(p => {
    return p.trim().length > 0 && countWords(p) >= CONFIG.MIN_CHUNK_WORDS;
  });

  // Gộp các đoạn ngắn với đoạn tiếp theo
  const chunks = [];
  let current = '';

  paragraphs.forEach(para => {
    current += (current ? '\n\n' : '') + para.trim();
    if (countWords(current) >= 150) {
      chunks.push({
        section_type: 'tong_hop',
        raw_content: current.trim()
      });
      current = '';
    }
  });

  // Đẩy phần còn lại
  if (current.trim().length > 50) {
    chunks.push({
      section_type: 'tong_hop',
      raw_content: current.trim()
    });
  }

  return chunks.length > 0 ? chunks : [{
    section_type: 'tong_hop',
    raw_content: fullText.substring(0, 2000)
  }];
}

/**
 * Tạo nội dung chunk có prefix ngữ cảnh
 * Đây là nội dung sẽ được embedding và lưu vào Pinecone
 */
function buildChunkWithContext(title, topic, sectionType, rawContent, sourceUrl) {
  const sectionLabels = {
    luan_dieu_sai: 'Luận điệu sai trái cần phản bác',
    boi_canh: 'Bối cảnh vấn đề',
    phan_tich: 'Phân tích luận điệu sai',
    luan_cu_phan_bac: 'Luận cứ và dẫn chứng phản bác',
    giai_phap: 'Giải pháp và kết luận',
    tong_hop: 'Nội dung tổng hợp'
  };

  const label = sectionLabels[sectionType] || 'Nội dung';

  return `[Chủ đề: ${title}]
[Phần: ${label}]
[Nguồn: Tạp chí Cộng sản - ${sourceUrl}]

${rawContent}`;
}
```

---

### Phần 4: Lưu vào Google Sheet

```javascript
// ============================================================
// PHẦN 4: LƯU VÀO GOOGLE SHEET
// ============================================================

/**
 * Lưu thông tin bài viết vào sheet articles
 * Trả về articleId vừa tạo
 */
function saveArticle(title, topic, sourceUrl, fullText, author, publishedDate) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
                              .getSheetByName('articles');
  
  const articleId = generateUUID();

  sheet.appendRow([
    articleId,          // A: id
    title,              // B: title
    topic,              // C: topic
    sourceUrl,          // D: source_url
    fullText,           // E: full_text
    author,             // F: author
    publishedDate,      // G: published_date
    'Draft',            // H: status
    new Date(),         // I: scraped_at
    ''                  // J: notes
  ]);

  return articleId;
}

/**
 * Lưu các chunk vào sheet chunks
 */
function saveChunks(articleId, title, topic, sourceUrl, chunks) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
                              .getSheetByName('chunks');

  chunks.forEach((chunk, index) => {
    const chunkId = generateUUID();
    const contentWithContext = buildChunkWithContext(
      title, topic, chunk.section_type, chunk.raw_content, sourceUrl
    );

    sheet.appendRow([
      chunkId,                // A: chunk_id
      articleId,              // B: article_id
      title,                  // C: title
      topic,                  // D: topic
      chunk.section_type,     // E: section_type
      contentWithContext,     // F: content (có prefix)
      chunk.raw_content,      // G: raw_content
      index + 1,              // H: chunk_index
      countWords(chunk.raw_content), // I: word_count
      sourceUrl,              // J: source_url
      '',                     // K: vector_id (để trống)
      'Draft',                // L: status
      ''                      // M: indexed_at (để trống)
    ]);
  });
}

/**
 * Cập nhật trạng thái bài viết trong sheet articles
 */
function updateArticleStatus(articleId, status) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
                              .getSheetByName('articles');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === articleId) {
      sheet.getRange(i + 1, 8).setValue(status); // Cột H = status
      break;
    }
  }
}

/**
 * Cập nhật vector_id và trạng thái cho chunk sau khi index xong
 */
function updateChunkAfterIndex(chunkId, vectorId) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
                              .getSheetByName('chunks');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === chunkId) {
      sheet.getRange(i + 1, 11).setValue(vectorId);   // Cột K = vector_id
      sheet.getRange(i + 1, 12).setValue('Indexed');  // Cột L = status
      sheet.getRange(i + 1, 13).setValue(new Date()); // Cột M = indexed_at
      break;
    }
  }
}
```

---

### Phần 5: Hàm chính để chạy

```javascript
// ============================================================
// PHẦN 5: HÀM CHÍNH
// ============================================================

/**
 * BƯỚC 1: Scrape và lưu bài mới vào Sheet (trạng thái Draft)
 * 
 * Cách chạy: Gọi hàm này thủ công hoặc đặt trigger tự động
 * Khuyến nghị: Chạy 1 lần/ngày lúc 7h sáng
 */
function runScrapeNewArticles() {
  writeLog('runScrapeNewArticles', '', 'start', 'Bắt đầu scrape');

  // Lấy danh sách URL đã có trong sheet (để bỏ qua)
  const existingUrls = getIndexedUrls();
  writeLog('runScrapeNewArticles', '', 'info', `Đã có ${existingUrls.size} bài trong sheet`);

  // Lấy danh sách bài mới từ trang chuyên mục
  const articleList = fetchArticleList();
  writeLog('runScrapeNewArticles', '', 'info', `Tìm thấy ${articleList.length} link trên trang`);

  // Lọc chỉ lấy bài chưa có trong sheet
  const newArticles = articleList.filter(a => !existingUrls.has(a.url));
  writeLog('runScrapeNewArticles', '', 'info', `${newArticles.length} bài mới cần scrape`);

  // Giới hạn số bài mỗi lần chạy (tránh timeout GAS 6 phút)
  const toProcess = newArticles.slice(0, CONFIG.MAX_ARTICLES_PER_RUN);

  let successCount = 0;
  let errorCount = 0;

  toProcess.forEach((article, i) => {
    try {
      writeLog('runScrapeNewArticles', article.url, 'processing', `Bài ${i + 1}/${toProcess.length}`);

      // Fetch nội dung bài
      const content = fetchArticleContent(article.url);
      if (!content) {
        errorCount++;
        return;
      }

      // Phân loại chủ đề bằng Gemini
      sleep(CONFIG.REQUEST_DELAY);
      const topic = classifyTopic(content.title, content.mainText);

      // Chia chunk bằng Gemini semantic chunking
      sleep(CONFIG.REQUEST_DELAY);
      const chunks = semanticChunkWithGemini(content.title, content.mainText);

      // Lưu bài vào sheet articles
      const articleId = saveArticle(
        content.title,
        topic,
        article.url,
        content.mainText,
        content.author,
        content.publishedDate
      );

      // Lưu các chunk vào sheet chunks
      saveChunks(articleId, content.title, topic, article.url, chunks);

      writeLog('runScrapeNewArticles', article.url, 'success',
        `Lưu ${chunks.length} chunk, chủ đề: ${topic}`);
      successCount++;

    } catch (e) {
      writeLog('runScrapeNewArticles', article.url, 'error', e.message);
      errorCount++;
    }
  });

  writeLog('runScrapeNewArticles', '', 'done',
    `Hoàn thành: ${successCount} thành công, ${errorCount} lỗi`);
}

/**
 * BƯỚC 2: Index các chunk đã Approved vào Pinecone
 * 
 * Workflow:
 * 1. Admin vào sheet chunks, đổi status từ Draft → Approved cho các chunk muốn index
 * 2. Chạy hàm này
 * 3. Hàm sẽ lấy tất cả chunk có status = Approved, tạo embedding, upsert vào Pinecone
 * 
 * Cách chạy: Thủ công hoặc trigger sau khi admin duyệt xong
 */
function runIndexApprovedChunks() {
  writeLog('runIndexApprovedChunks', '', 'start', 'Bắt đầu index');

  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
                              .getSheetByName('chunks');
  const data = sheet.getDataRange().getValues();

  // Lọc các hàng có status = Approved
  // Cột L (index 11) = status
  const approvedRows = [];
  data.slice(1).forEach((row, i) => {
    if (row[11] === 'Approved') {
      approvedRows.push({ rowIndex: i + 2, data: row });
      // rowIndex + 2 vì: +1 để skip header, +1 vì sheet index bắt đầu từ 1
    }
  });

  writeLog('runIndexApprovedChunks', '', 'info', `${approvedRows.length} chunk cần index`);

  let successCount = 0;
  let errorCount = 0;

  approvedRows.forEach((row, i) => {
    const chunkId    = row.data[0];   // A: chunk_id
    const articleId  = row.data[1];   // B: article_id
    const title      = row.data[2];   // C: title
    const topic      = row.data[3];   // D: topic
    const sectionType = row.data[4];  // E: section_type
    const content    = row.data[5];   // F: content (có prefix)
    const sourceUrl  = row.data[9];   // J: source_url

    try {
      writeLog('runIndexApprovedChunks', chunkId, 'processing', `Chunk ${i + 1}/${approvedRows.length}`);

      sleep(CONFIG.REQUEST_DELAY);

      // Tạo embedding cho content (có prefix ngữ cảnh)
      const vector = callGeminiEmbedding(content);

      // Tạo vector_id dạng: articleId_chunkIndex
      const vectorId = `${articleId}_${chunkId}`.substring(0, 64);
      // Pinecone giới hạn vector ID tối đa 64 ký tự

      // Metadata lưu vào Pinecone
      const metadata = {
        chunk_id: chunkId,
        article_id: articleId,
        title: title,
        topic: topic,
        section_type: sectionType,
        source_url: sourceUrl,
        status: 'approved',
        indexed_at: new Date().toISOString(),
        // Lưu 500 ký tự đầu của raw_content để hiển thị trong kết quả
        preview: row.data[6].toString().substring(0, 500)
      };

      // Upsert vào Pinecone
      upsertToPinecone(vectorId, vector, metadata);

      // Cập nhật trạng thái trong sheet
      updateChunkAfterIndex(chunkId, vectorId);

      writeLog('runIndexApprovedChunks', vectorId, 'success', `Index thành công`);
      successCount++;

    } catch (e) {
      writeLog('runIndexApprovedChunks', chunkId, 'error', e.message);
      errorCount++;
    }
  });

  writeLog('runIndexApprovedChunks', '', 'done',
    `Hoàn thành: ${successCount} thành công, ${errorCount} lỗi`);
}

/**
 * Hàm tiện ích: Approve nhanh tất cả chunk Draft của một bài
 * 
 * Cách dùng: Truyền vào articleId, toàn bộ chunk Draft của bài đó
 * sẽ được chuyển sang Approved
 */
function approveAllChunksOfArticle(articleId) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
                              .getSheetByName('chunks');
  const data = sheet.getDataRange().getValues();

  let count = 0;
  data.slice(1).forEach((row, i) => {
    if (row[1] === articleId && row[11] === 'Draft') {
      sheet.getRange(i + 2, 12).setValue('Approved');
      count++;
    }
  });

  Logger.log(`Đã Approve ${count} chunk của bài ${articleId}`);
  return count;
}

/**
 * Hàm test: Chạy toàn bộ pipeline với 1 URL cụ thể
 * Dùng để test trước khi chạy tự động
 */
function testWithSingleUrl() {
  const testUrl = 'THAY_BẰNG_URL_BÀI_CỤ_THỂ_Ở_ĐÂY';
  // Ví dụ:
  // const testUrl = 'https://www.tapchicongsan.org.vn/en/dau-tranh-.../content/chu-dong-dau-tranh...';

  writeLog('testWithSingleUrl', testUrl, 'start', 'Bắt đầu test');

  const content = fetchArticleContent(testUrl);
  if (!content) {
    Logger.log('Fetch thất bại');
    return;
  }

  Logger.log('Tiêu đề: ' + content.title);
  Logger.log('Số từ: ' + countWords(content.mainText));
  Logger.log('---');

  sleep(CONFIG.REQUEST_DELAY);
  const topic = classifyTopic(content.title, content.mainText);
  Logger.log('Chủ đề: ' + topic);

  sleep(CONFIG.REQUEST_DELAY);
  const chunks = semanticChunkWithGemini(content.title, content.mainText);
  Logger.log('Số chunk: ' + chunks.length);

  chunks.forEach((chunk, i) => {
    Logger.log(`\n--- Chunk ${i + 1} [${chunk.section_type}] ---`);
    Logger.log(`Số từ: ${countWords(chunk.raw_content)}`);
    Logger.log(chunk.raw_content.substring(0, 200) + '...');
  });

  writeLog('testWithSingleUrl', testUrl, 'done', `${chunks.length} chunk, chủ đề: ${topic}`);
}
```

---

### Phần 6: Thiết lập Trigger tự động

```javascript
// ============================================================
// PHẦN 6: TRIGGER TỰ ĐỘNG
// ============================================================

/**
 * Chạy hàm này MỘT LẦN để thiết lập trigger tự động
 * Sau đó KHÔNG cần chạy lại
 */
function setupTriggers() {
  // Xóa tất cả trigger cũ để tránh trùng lặp
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  // Trigger scrape bài mới: mỗi ngày lúc 7h sáng
  ScriptApp.newTrigger('runScrapeNewArticles')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  Logger.log('✅ Đã thiết lập trigger scrape lúc 7h sáng mỗi ngày');
  Logger.log('⚠️  Index vào Pinecone vẫn cần chạy thủ công sau khi admin duyệt');
}

/**
 * Xóa tất cả trigger (dùng khi cần reset)
 */
function clearAllTriggers() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  Logger.log('Đã xóa tất cả trigger');
}
```

---

## Hướng dẫn từng bước để cài đặt

### Bước 1: Tạo Google Sheet

1. Vào https://sheets.google.com → tạo spreadsheet mới
2. Đổi tên spreadsheet thành `Trợ Lý 35 - Knowledge Base`
3. Tạo 3 sheet: `articles`, `chunks`, `scrape_log`
4. Thêm header cho từng sheet theo cấu trúc ở phần đầu tài liệu
5. Copy ID của spreadsheet từ URL (phần giữa `/d/` và `/edit`)

### Bước 2: Tạo Google Apps Script

1. Vào https://script.google.com → tạo project mới
2. Đổi tên project thành `TroLy35-Scraper`
3. Xóa toàn bộ code mặc định
4. Copy toàn bộ code từ tài liệu này vào
5. Điền các giá trị vào phần `CONFIG` ở đầu file

### Bước 3: Test trước khi chạy thật

1. Tìm một URL bài viết cụ thể từ trang Tạp chí Cộng sản
2. Điền vào hàm `testWithSingleUrl()`
3. Chạy hàm đó và kiểm tra log trong `View → Logs`
4. Kiểm tra xem chunk có hợp lý không
5. Nếu ổn, tiếp tục bước 4

### Bước 4: Chạy lần đầu

1. Chạy hàm `runScrapeNewArticles()` một lần thủ công
2. Kiểm tra sheet `articles` và `chunks` xem dữ liệu đã vào chưa
3. Kiểm tra sheet `scrape_log` xem có lỗi không

### Bước 5: Admin duyệt nội dung

1. Mở sheet `chunks`
2. Đọc cột `content` (có prefix) và `raw_content`
3. Những chunk nào chính xác, phù hợp → đổi cột `status` từ `Draft` → `Approved`
4. Chunk nào không chính xác hoặc nội dung chất lượng thấp → để nguyên Draft hoặc xóa

### Bước 6: Index vào Pinecone

1. Sau khi admin đã duyệt xong
2. Chạy hàm `runIndexApprovedChunks()`
3. Kiểm tra Pinecone console xem vector đã vào chưa
4. Kiểm tra sheet `chunks` — các chunk đã index sẽ có `vector_id` và `status = Indexed`

### Bước 7: Thiết lập tự động

1. Chạy hàm `setupTriggers()` một lần
2. Từ đó mỗi ngày 7h sáng hệ thống sẽ tự động scrape bài mới
3. Admin chỉ cần vào duyệt và chạy `runIndexApprovedChunks()` khi muốn index

---

## Xử lý các lỗi thường gặp

### Lỗi: "Nội dung quá ngắn, có thể extract thất bại"

**Nguyên nhân:** Trang web thay đổi cấu trúc HTML hoặc URL không còn hợp lệ.

**Xử lý:** Mở URL bài viết bằng trình duyệt, kiểm tra xem trang có load được không. Nếu có, cần cập nhật các regex trong hàm `fetchArticleContent()` cho phù hợp với cấu trúc HTML mới.

### Lỗi: "Gemini trả về không phải array hợp lệ"

**Nguyên nhân:** Gemini đôi khi trả về text giải thích thêm thay vì JSON thuần.

**Xử lý:** Script đã có xử lý tự động (strip markdown code block). Nếu vẫn lỗi, hệ thống sẽ tự động dùng fallback chia theo đoạn văn. Kiểm tra log để biết bài nào bị fallback.

### Lỗi: "Pinecone error: 400"

**Nguyên nhân thường gặp:**
- Dimension của vector không khớp với index (text-embedding-004 = 768 dimension)
- PINECONE_HOST sai định dạng

**Xử lý:** Kiểm tra lại `PINECONE_HOST` — phải có `https://` ở đầu và không có dấu `/` ở cuối.

### Lỗi: GAS timeout sau 6 phút

**Nguyên nhân:** Quá nhiều bài cần xử lý trong một lần chạy.

**Xử lý:** Giảm `MAX_ARTICLES_PER_RUN` xuống còn 5. Trigger sẽ chạy lại vào ngày hôm sau và tiếp tục với các bài còn lại.

### Lỗi: "Exception: Address unavailable"

**Nguyên nhân:** GAS không thể fetch URL (bị block hoặc trang down).

**Xử lý:** Tăng `REQUEST_DELAY` lên 3000ms. Nếu vẫn lỗi, trang đang block GAS — cần xem xét dùng proxy hoặc fetch từ Vercel API thay vì GAS.

---

## Lưu ý quan trọng

1. **Admin phải duyệt trước khi Index** — Không bao giờ để hệ thống tự động index thẳng vào Pinecone mà không qua bước duyệt của con người. Nội dung chưa được kiểm tra có thể khiến chatbot trả lời sai.

2. **Không để API key trong code khi chia sẻ** — Trước khi copy code cho người khác, thay tất cả giá trị trong `CONFIG` bằng `YOUR_...`.

3. **Quota Gemini** — Mỗi bài tốn 2-3 Gemini API call (1 để chunk, 1 để classify topic, N để embed từng chunk). Free tier của Gemini có giới hạn. Theo dõi usage tại https://aistudio.google.com.

4. **Backup sheet thường xuyên** — Google Sheet là nguồn dữ liệu chính. Nên xuất file Excel backup định kỳ mỗi tuần.

5. **Pinecone free tier** — Free tier cho phép 1 index với 100.000 vectors. Với mỗi bài ~4 chunk thì tương đương ~25.000 bài — đủ dùng cho MVP.
