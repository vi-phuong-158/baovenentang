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
        priority: normalizeNewsPriority_(aiData.priority),
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
      priority: normalizeNewsPriority_('Bình thường'),
      message: '',
      keywords: []
    }));
  }
}

const DAILY_NEWS_OVERVIEW_SCHEMA = {
  type: 'object',
  properties: {
    overview: { type: 'string' },
    general_assessment: { type: 'string' },
    why_it_matters: { type: 'string' },
    important_points: { type: 'array', items: { type: 'string' } },
    watch_points: { type: 'array', items: { type: 'string' } }
  },
  required: ['overview', 'general_assessment', 'why_it_matters', 'important_points', 'watch_points']
};

function generateDailyNewsOverview(articles) {
  const selected = (articles || []).slice(0, Math.max(1, Number(CONFIG.MAX_ARTICLES_PER_DAY) || 10));
  if (selected.length === 0) return buildDailyNewsOverviewFallback_([]);

  const data = selected.map((article, index) => ({
    id: index,
    title: article.title || '',
    summary: article.summary || article.description || '',
    category: article.category || 'Khác',
    priority: normalizeNewsPriority_(article.priority),
    source: article.source || ''
  }));

  const prompt = `Bạn là biên tập viên bản tin nội bộ. Hãy đọc các tin đã được tóm tắt dưới đây và viết phần tổng hợp đầu bản tin.

Yêu cầu:
1. Chỉ dựa trên nội dung được cung cấp, không suy diễn thêm sự kiện ngoài danh sách.
2. Viết giọng khách quan, ngắn gọn, phù hợp bản tin nội bộ hằng ngày.
3. "overview" nêu bức tranh nổi bật trong ngày, tối đa 2 câu.
4. "general_assessment" không lặp lại overview; chỉ đánh giá mức độ đáng chú ý hoặc nói rõ chủ yếu là cập nhật thường kỳ.
5. "why_it_matters" nêu vì sao cán bộ cần biết, tối đa 1 câu.
6. "important_points" chỉ nêu chính sách mới, văn bản/quyết định/nghị quyết/chỉ đạo/quan điểm chính thức hoặc vấn đề an ninh lớn có tác động rộng.
7. "watch_points" nêu việc cần theo dõi tiếp, không trùng với important_points.
8. Nếu không có chính sách/chỉ đạo mới nổi bật, nói rõ tin trong ngày chủ yếu là hoạt động thường kỳ/cập nhật tình hình.

Trả về JSON:
{
  "overview": "<2-3 câu tóm tắt tổng hợp toàn bản tin>",
  "general_assessment": "<1-2 câu đánh giá chung, không phóng đại>",
  "why_it_matters": "<1 câu vì sao cần chú ý>",
  "important_points": ["<điểm quan trọng 1>", "<điểm quan trọng 2>"],
  "watch_points": ["<vấn đề nên theo dõi tiếp 1>", "<vấn đề nên theo dõi tiếp 2>"]
}

DANH SÁCH TIN:
${JSON.stringify(data, null, 2)}

Chỉ trả JSON.`;

  try {
    const response = callGeminiAPI(prompt, DAILY_NEWS_OVERVIEW_SCHEMA);
    const parsed = parseGeminiObjectResponse_(response);
    const overview = normalizeDailyNewsOverview_(parsed, selected);
    Logger.log('[Gemini] Đã tạo tóm tắt tổng hợp bản tin');
    return overview;
  } catch (error) {
    Logger.log(`[Gemini] Lỗi tạo tóm tắt tổng hợp: ${error}`);
    return buildDailyNewsOverviewFallback_(selected);
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
2. Chỉ đặt "priority": "Quan trọng" khi bài có chính sách mới, văn bản/quyết định/nghị quyết/chỉ thị/kết luận mới, quan điểm hoặc chỉ đạo chính thức mới của lãnh đạo Đảng, Nhà nước, Chính phủ, bộ/ngành/tỉnh, hoặc vấn đề an ninh - pháp luật lớn có tác động rộng
3. Các tin hoạt động thường kỳ, hội nghị không có chỉ đạo mới, cập nhật sự kiện, trao đổi/khánh thành/thăm hỏi, tin địa phương không tạo thay đổi chính sách thì đặt "Bình thường"
4. Thông điệp phải tích cực, đúng định hướng tư tưởng
5. Trả về MẢNG JSON (array), không thêm giải thích

DANH SÁCH BÀI VIẾT:
${JSON.stringify(articles, null, 2)}

Trả về mảng JSON kết quả:`;
}

/**
 * Gọi Gemini API
 */
function callGeminiAPI(prompt, responseJsonSchema) {
  assertRequiredConfig_(REQUIRED_GEMINI_CONFIG);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent`;

  const generationConfig = {
    temperature: 0.3,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json'
  };

  if (responseJsonSchema) {
    generationConfig.responseJsonSchema = responseJsonSchema;
  }

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig
  };
  
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': CONFIG.GEMINI_API_KEY },
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

function parseGeminiObjectResponse_(text) {
  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? (parsed[0] || {}) : parsed;
}

function normalizeDailyNewsOverview_(data, articles) {
  const fallback = buildDailyNewsOverviewFallback_(articles);
  return {
    overview: cleanValue_(data && data.overview) || fallback.overview,
    generalAssessment: cleanValue_(data && data.general_assessment) || fallback.generalAssessment,
    whyItMatters: cleanValue_(data && data.why_it_matters) || fallback.whyItMatters,
    importantPoints: normalizeOverviewList_(data && data.important_points, fallback.importantPoints),
    watchPoints: normalizeOverviewList_(data && data.watch_points, fallback.watchPoints)
  };
}

function normalizeOverviewList_(items, fallback) {
  const result = (Array.isArray(items) ? items : [])
    .map(item => cleanValue_(item))
    .filter(Boolean)
    .slice(0, 4);
  return result.length > 0 ? result : (fallback || []);
}

function buildDailyNewsOverviewFallback_(articles) {
  const list = articles || [];
  const important = list.filter(isImportantNewsArticle_);
  const categories = {};

  list.forEach(article => {
    const category = article.category || 'Khác';
    categories[category] = (categories[category] || 0) + 1;
  });

  const categoryText = Object.keys(categories)
    .sort((a, b) => categories[b] - categories[a])
    .slice(0, 3)
    .map(category => `${category} (${categories[category]} tin)`)
    .join(', ');

  return {
    overview: list.length > 0
      ? `Bản tin hôm nay tổng hợp ${list.length} tin đáng chú ý${categoryText ? `, tập trung vào ${categoryText}` : ''}.`
      : 'Bản tin hôm nay chưa có tin phù hợp để tổng hợp.',
    generalAssessment: important.length > 0
      ? `Có ${important.length} tin cần ưu tiên theo dõi do liên quan đến chính sách, chỉ đạo hoặc vấn đề có tác động rộng.`
      : 'Các tin trong ngày chủ yếu là cập nhật tình hình và hoạt động thường kỳ, chưa nổi bật chính sách hoặc chỉ đạo mới.',
    whyItMatters: important.length > 0
      ? 'Các nội dung này giúp nắm sớm điểm chính sách và vấn đề cần truyền thông thống nhất.'
      : 'Bản tin giúp nắm tình hình chung, làm nền cho theo dõi các diễn biến tiếp theo.',
    importantPoints: important.slice(0, 3).map(article => article.title || article.summary || '').filter(Boolean),
    watchPoints: list.slice(0, 3).map(article => article.category || 'Khác').filter(Boolean)
  };
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
