/**
 * ============================================================
 * MODULE: GEMINI AI
 * Tóm tắt, phân loại bài viết bằng AI
 * ============================================================
 */

/**
 * Tóm tắt một mảng bài viết bằng Gemini
 * @param {Array} articles - Danh sách bài viết thô
 * @return {Array} Bài viết đã được AI xử lý
 */
function summarizeWithGemini(articles) {
  if (articles.length === 0) return [];
  
  // Giới hạn số bài để tránh vượt quota
  const limited = articles.slice(0, CONFIG.MAX_ARTICLES_PER_DAY);
  
  // Chuẩn bị dữ liệu gửi cho AI
  const articlesForAI = limited.map((a, idx) => ({
    id: idx,
    title: a.title,
    description: a.description ? a.description.substring(0, 500) : '',
    source: a.source,
    link: a.link
  }));
  
  const prompt = buildGeminiPrompt(articlesForAI);
  
  try {
    const response = callGeminiAPI(prompt);
    const aiResults = parseGeminiResponse(response);
    
    // Gộp kết quả AI với data gốc
    const enriched = limited.map((original, idx) => {
      const aiData = aiResults.find(r => r.id === idx) || {};
      return {
        ...original,
        summary: aiData.summary || (original.description || '').substring(0, 200),
        category: aiData.category || 'Khác',
        priority: aiData.priority || 'Bình thường',
        message: aiData.message || '',
        keywords: aiData.keywords || []
      };
    });
    
    Logger.log(`[Gemini] Đã xử lý ${enriched.length} bài`);
    return enriched;
    
  } catch(error) {
    Logger.log(`[Gemini] Lỗi: ${error}`);
    // Fallback: dùng description gốc
    return limited.map(a => ({
      ...a,
      summary: ((a.description || a.title || '').substring(0, 200)) + '...',
      category: 'Khác',
      priority: 'Bình thường',
      message: '',
      keywords: []
    }));
  }
}

/**
 * Xây dựng prompt cho Gemini
 */
function buildGeminiPrompt(articles) {
  const categoryList = Object.keys(CATEGORIES).join('|');
  
  return `Bạn là chuyên gia phân tích tin tức chính trị - xã hội Việt Nam, phục vụ công tác bảo vệ nền tảng tư tưởng của Đảng.

Hãy phân tích danh sách bài báo sau, với MỖI bài trả về JSON theo cấu trúc:
{
  "id": <số id của bài>,
  "summary": "<tóm tắt 2-3 câu súc tích, rõ ràng, đúng tinh thần báo chí cách mạng>",
  "category": "<chọn một trong: ${categoryList}>",
  "priority": "<Quan trọng hoặc Bình thường>",
  "message": "<1 câu thông điệp cốt lõi để tuyên truyền, mang tính tích cực>",
  "keywords": ["<từ khóa 1>", "<từ khóa 2>", "<từ khóa 3>"]
}

QUY TẮC:
1. Tóm tắt phải khách quan, không thêm thắt, không suy diễn
2. Ưu tiên cao cho: tin về Nghị quyết Đảng, an ninh quốc gia, chính sách lớn, sự kiện chính trị quan trọng
3. Thông điệp phải tích cực, đúng định hướng tư tưởng
4. Trả về MẢNG JSON (array), không thêm giải thích

DANH SÁCH BÀI VIẾT:
${JSON.stringify(articles, null, 2)}

Trả về mảng JSON kết quả:`;
}

/**
 * Gọi Gemini API
 */
function callGeminiAPI(prompt) {
  assertRequiredConfig_(REQUIRED_GEMINI_CONFIG);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json'
    }
  };
  
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  const code = response.getResponseCode();
  if (code !== 200) {
    throw new Error(`Gemini API trả về ${code}: ${response.getContentText()}`);
  }
  
  const data = JSON.parse(response.getContentText());
  
  if (!data.candidates || data.candidates.length === 0 ||
      !data.candidates[0].content || !data.candidates[0].content.parts ||
      data.candidates[0].content.parts.length === 0) {
    throw new Error('Gemini không trả về kết quả');
  }
  
  return data.candidates[0].content.parts[0].text;
}

/**
 * Parse JSON từ response của Gemini
 */
function parseGeminiResponse(text) {
  // Loại bỏ markdown code blocks nếu có
  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();
  
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch(e) {
    Logger.log(`[Gemini] Lỗi parse JSON: ${e}`);
    Logger.log(`Raw text: ${text.substring(0, 500)}`);
    return [];
  }
}

/**
 * Tạo câu hỏi quiz từ một bài viết (cho tính năng /quiz)
 */
function generateQuizFromArticle(article) {
  const prompt = `Dựa vào bài viết sau, tạo 1 câu hỏi trắc nghiệm 4 đáp án để kiểm tra nhận thức chính trị.

Bài viết:
Tiêu đề: ${article.title}
Nội dung: ${article.summary}

Trả về JSON:
{
  "question": "<câu hỏi>",
  "options": ["A. <đáp án 1>", "B. <đáp án 2>", "C. <đáp án 3>", "D. <đáp án 4>"],
  "correct": "<A hoặc B hoặc C hoặc D>",
  "explanation": "<giải thích ngắn gọn>"
}

Chỉ trả JSON, không giải thích thêm.`;

  try {
    const response = callGeminiAPI(prompt);
    const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch(e) {
    Logger.log(`[Quiz] Lỗi tạo câu hỏi: ${e}`);
    return null;
  }
}

/**
 * Sinh luận điểm phản bác từ một tin nóng (cho thư viện phản bác)
 */
function generateRebuttal(topic) {
  const prompt = `Là chuyên gia bảo vệ nền tảng tư tưởng của Đảng, hãy xây dựng luận điểm phản bác cho chủ đề sau:

Chủ đề: ${topic}

Trả về JSON:
{
  "topic": "<chủ đề>",
  "wrongClaim": "<luận điệu sai trái thường gặp>",
  "rebuttal": "<luận điểm phản bác có căn cứ, ngắn gọn 3-5 câu>",
  "evidence": ["<bằng chứng 1>", "<bằng chứng 2>"],
  "sources": ["<nguồn tham khảo>"]
}

Chỉ trả JSON.`;

  try {
    const response = callGeminiAPI(prompt);
    const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  } catch(e) {
    Logger.log(`[Rebuttal] Lỗi: ${e}`);
    return null;
  }
}
