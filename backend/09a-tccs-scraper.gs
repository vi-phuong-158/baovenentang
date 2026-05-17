/**
 * ============================================================
 * MODULE: TCCS SCRAPER
 * Scrape bài viết từ Tạp chí Cộng sản — fetch, parse HTML,
 * extract nội dung bài, lưu vào staging Sheets.
 *
 * Workflow:
 *   1. runTccsScrapeDrafts()              → scrape bài, tạo chunk động vào staging Sheets
 *   2. syncTccsApprovedChunksToPinecone() → duyệt chunk lên Pinecone (09c)
 *   3. generatePhanBacFromTccs()          → sinh entry PHAN_BAC_KHO (09d)
 * ============================================================
 */

// ============================================================
// HẰNG SỐ - TCCS SCRAPER
// ============================================================

const TCCS_CHUNK_MIN_WORDS = 600;
const TCCS_CHUNK_TARGET_WORDS = 700;
const TCCS_CHUNK_MAX_WORDS = 800;
const TCCS_CHUNK_SOFT_MAX_WORDS = 850;
const TCCS_CORE_CHUNK_MIN_WORDS = 850;
const TCCS_CORE_CHUNK_TARGET_WORDS = 1000;
const TCCS_CORE_CHUNK_MAX_WORDS = 1200;
const TCCS_AI_CHUNK_MIN_WORDS = 700;
const TCCS_AI_CHUNK_TARGET_WORDS = 850;
const TCCS_AI_CHUNK_MAX_WORDS = 1000;
const TCCS_AI_CHUNK_SOFT_MAX_WORDS = 1100;
const TCCS_BRIEF_CHUNK_MIN_WORDS = 450;
const TCCS_BRIEF_CHUNK_TARGET_WORDS = 650;
const TCCS_BRIEF_CHUNK_MAX_WORDS = 800;
const TCCS_MAX_DYNAMIC_CHUNKS = 8;
const TCCS_DEFAULT_MAX_ARTICLES_PER_RUN = 2;
const TCCS_MAX_RUNTIME_MS = 280000;
const TCCS_PLAN_PROMPT_MAX_CHARS = 36000;
const TCCS_PLAN_PARAGRAPH_PREVIEW_CHARS = 1000;
const TCCS_DEFAULT_BASE_URL = 'https://www.tapchicongsan.org.vn';
const TCCS_DEFAULT_SECTION_PATH = '/dau-tranh-phan-bac-cac-luan-dieu-sai-trai-thu-dich';

const TCCS_SHEET_HEADERS = {
  TCCS_ARTICLES: [
    'ID', 'Tiêu đề', 'Chủ đề', 'URL nguồn', 'Tác giả',
    'Ngày đăng', 'Số từ', 'Số chunk', 'Trạng thái',
    'Scraped At', 'Ghi chú'
  ],
  TCCS_CHUNKS: [
    'Chunk ID', 'Article ID', 'Tiêu đề', 'Chủ đề', 'Section Type',
    'Nội dung embedding', 'Nội dung gốc', 'Chunk Index', 'Word Count',
    'Source URL', 'Content Hash', 'Trạng thái duyệt', 'Pinecone ID',
    'Indexed At', 'Notes'
  ],
  TCCS_SCRAPE_LOG: [
    'Thời gian', 'Action', 'URL', 'Trạng thái', 'Message'
  ],
  TCCS_ARTICLE_TEXTS: [
    'Article ID', 'URL nguồn', 'Nội dung toàn văn', 'Số từ', 'Saved At'
  ]
};

const TCCS_SECTION_LABELS = {
  article_brief: 'Tóm lược bài bằng đoạn gốc',
  core_argument: 'Nội dung chính đã chọn lọc',
  wrong_claim: 'Luận điệu sai trái cần phản bác',
  counter_argument: 'Lập luận phản bác',
  theoretical_basis: 'Cơ sở lý luận',
  legal_policy_basis: 'Cơ sở pháp lý, chính sách',
  practical_evidence: 'Dẫn chứng thực tiễn',
  historical_context: 'Bối cảnh lịch sử',
  recommendation: 'Giải pháp, kiến nghị',
  quote_material: 'Tư liệu trích dẫn giá trị',
  luan_dieu_sai: 'Luận điệu sai trái cần phản bác',
  boi_canh: 'Bối cảnh vấn đề',
  phan_tich: 'Phân tích luận điệu sai',
  luan_cu_phan_bac: 'Luận cứ và dẫn chứng phản bác',
  giai_phap: 'Giải pháp và kết luận',
  tong_hop: 'Nội dung tổng hợp'
};

const TCCS_DYNAMIC_SECTION_TYPES = [
  'article_brief',
  'core_argument',
  'wrong_claim',
  'counter_argument',
  'theoretical_basis',
  'legal_policy_basis',
  'practical_evidence',
  'historical_context',
  'recommendation',
  'quote_material'
];

// ============================================================
// PUBLIC: TCCS SCRAPER
// ============================================================

/**
 * Test một URL Tạp chí Cộng sản mà không ghi dữ liệu vào Sheets.
 */
function testTccsSingleUrl(url) {
  const articleUrl = cleanValue_(url);
  if (!articleUrl) throw new Error('Thiếu URL bài viết Tạp chí Cộng sản.');

  const article = tccsFetchArticleContent_(articleUrl);
  const topic = tccsClassifyTopic_(article.title, article.mainText);
  const chunks = tccsCreateKnowledgeChunks_(article.mainText, {
    title: article.title,
    topic,
    sourceUrl: articleUrl
  });

  Logger.log(`[TCCS] Tiêu đề: ${article.title}`);
  Logger.log(`[TCCS] Chủ đề: ${topic}`);
  Logger.log(`[TCCS] Số từ bài: ${tccsCountWords_(article.mainText)}`);
  Logger.log(`[TCCS] Số chunk chọn lọc: ${chunks.length}`);
  chunks.forEach(chunk => {
    Logger.log(`[TCCS] Chunk ${chunk.chunkIndex}: ${chunk.wordCount} từ, ${chunk.status}, ${chunk.sectionType}`);
    Logger.log(`[TCCS] Notes: ${chunk.notes}`);
  });

  return {
    success: true,
    title: article.title,
    url: articleUrl,
    topic,
    wordCount: tccsCountWords_(article.mainText),
    chunks: chunks.map(chunk => ({
      chunkIndex: chunk.chunkIndex,
      wordCount: chunk.wordCount,
      status: chunk.status,
      sectionType: chunk.sectionType,
      preview: chunk.rawContent.substring(0, 300)
    }))
  };
}

function testTccsLeninArticle() {
  return testTccsSingleUrl('https://www.tapchicongsan.org.vn/web/guest/dau-tranh-phan-bac-cac-luan-dieu-sai-trai-thu-dich/chi-tiet/-/asset_publisher/YqSB2JpnYto9/content/nhan-dien-y-do-xuyen-tac-tu-tuong-cua-v-i-le-nin-ve-quyen-dan-toc-tu-quyet-pha-hoai-khoi-dai-doan-ket-toan-dan-toc-o-viet-nam-hien-nay');
}

function runTccsSaveLeninArticleCoreDraft() {
  return runTccsSaveLeninArticlePlannedDraft();
}

function runTccsSaveLeninArticlePlannedDraft() {
  return runTccsSaveSingleUrlPlannedDraft('https://www.tapchicongsan.org.vn/web/guest/dau-tranh-phan-bac-cac-luan-dieu-sai-trai-thu-dich/chi-tiet/-/asset_publisher/YqSB2JpnYto9/content/nhan-dien-y-do-xuyen-tac-tu-tuong-cua-v-i-le-nin-ve-quyen-dan-toc-tu-quyet-pha-hoai-khoi-dai-doan-ket-toan-dan-toc-o-viet-nam-hien-nay');
}

function runTccsSaveLeninArticleDraft() {
  return runTccsSaveLeninArticleCoreDraft();
}

function runTccsSaveSingleUrlDraft(url) {
  return runTccsSaveSingleUrlPlannedDraft(url);
}

function runTccsSaveSingleUrlCoreDraft(url) {
  return runTccsSaveSingleUrlPlannedDraft(url);
}

function runTccsSaveSingleUrlPlannedDraft(url) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG);

  const articleUrl = cleanValue_(url);
  if (!articleUrl) throw new Error('Thiếu URL bài viết Tạp chí Cộng sản.');

  if (tccsHasPlannedChunksForUrl_(articleUrl)) {
    tccsWriteLog_('runTccsSaveSingleUrlPlannedDraft', articleUrl, 'skip', 'URL đã có chunk plan động trong TCCS_CHUNKS');
    Logger.log(`[TCCS] URL đã có chunk plan động, bỏ qua: ${articleUrl}`);
    return { success: true, skipped: true, articles: 0, chunks: 0 };
  }

  const existingHashes = tccsGetExistingChunkHashes_();
  const existingArticle = tccsFindArticleByUrl_(articleUrl);
  tccsWriteLog_('runTccsSaveSingleUrlPlannedDraft', articleUrl, 'processing', 'Bắt đầu lưu chunk plan động bài viết đơn lẻ');

  const article = tccsFetchArticleContent_(articleUrl);
  const topic = tccsClassifyTopic_(article.title, article.mainText);
  let chunks = tccsCreateKnowledgeChunks_(article.mainText, {
    title: article.title,
    topic,
    sourceUrl: articleUrl
  });

  chunks = chunks.filter(chunk => !existingHashes.has(chunk.contentHash));
  if (chunks.length === 0) {
    tccsWriteLog_('runTccsSaveSingleUrlPlannedDraft', articleUrl, 'skip', 'Không có chunk mới sau khi deduplicate');
    return { success: true, skipped: true, articles: 0, chunks: 0 };
  }

  const articleId = existingArticle ? existingArticle.articleId : tccsSaveArticle_(article, topic, chunks);
  tccsSaveArticleTextIfMissing_(articleId, article);
  const savedChunks = tccsSaveChunks_(articleId, article, topic, chunks);

  tccsWriteLog_('runTccsSaveSingleUrlPlannedDraft', articleUrl, 'success', `Lưu ${savedChunks} chunk chọn lọc`);
  Logger.log(`[TCCS] Đã lưu bài: ${article.title}`);
  Logger.log(`[TCCS] Article ID: ${articleId}`);
  Logger.log(`[TCCS] Số chunk chọn lọc: ${savedChunks}`);

  return {
    success: true,
    skipped: false,
    articleId,
    title: article.title,
    articles: existingArticle ? 0 : 1,
    chunks: savedChunks
  };
}

/**
 * Scrape bài mới từ chuyên mục TCCS và lưu chunk ở trạng thái Draft/Needs Review.
 */
function runTccsScrapeDrafts(maxArticles) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG);

  const startedAt = Date.now();
  const maxRuntimeMs = Number(CONFIG.TCCS_MAX_RUNTIME_MS) || TCCS_MAX_RUNTIME_MS;
  const limit = Math.max(1, Number(maxArticles) || Number(CONFIG.TCCS_MAX_ARTICLES_PER_RUN) || TCCS_DEFAULT_MAX_ARTICLES_PER_RUN);
  tccsWriteLog_('runTccsScrapeDrafts', '', 'start', `Bắt đầu scrape tối đa ${limit} bài`);

  const plannedUrls = tccsGetExistingPlannedChunkUrls_();
  const existingHashes = tccsGetExistingChunkHashes_();
  const articleList = tccsFetchArticleList_();
  const toProcess = articleList
    .filter(article => !plannedUrls.has(article.url))
    .slice(0, limit);

  let articleCount = 0;
  let chunkCount = 0;
  let errorCount = 0;

  for (let index = 0; index < toProcess.length; index++) {
    const articleRef = toProcess[index];
    if (!tccsHasRuntimeLeft_(startedAt, maxRuntimeMs)) {
      tccsWriteLog_('runTccsScrapeDrafts', articleRef.url, 'paused', 'Gần hết thời gian Apps Script, dừng batch để lần sau chạy tiếp');
      break;
    }

    try {
      tccsWriteLog_('runTccsScrapeDrafts', articleRef.url, 'processing', `Bài ${index + 1}/${toProcess.length}`);

      tccsSleep_();
      const article = tccsFetchArticleContent_(articleRef.url);
      const topic = tccsClassifyTopic_(article.title, article.mainText);
      let chunks = tccsCreateKnowledgeChunks_(article.mainText, {
        title: article.title,
        topic,
        sourceUrl: articleRef.url
      });

      chunks = chunks.filter(chunk => !existingHashes.has(chunk.contentHash));
      if (chunks.length === 0) {
        tccsWriteLog_('runTccsScrapeDrafts', articleRef.url, 'skip', 'Không có chunk mới sau khi deduplicate');
        continue;
      }

      const existingArticle = tccsFindArticleByUrl_(articleRef.url);
      const articleId = existingArticle ? existingArticle.articleId : tccsSaveArticle_(article, topic, chunks);
      tccsSaveArticleTextIfMissing_(articleId, article);
      const savedChunks = tccsSaveChunks_(articleId, article, topic, chunks);
      chunks.forEach(chunk => existingHashes.add(chunk.contentHash));
      plannedUrls.add(articleRef.url);

      articleCount++;
      chunkCount += savedChunks;
      tccsWriteLog_('runTccsScrapeDrafts', articleRef.url, 'success', `Lưu ${savedChunks} chunk chọn lọc`);
    } catch (error) {
      errorCount++;
      tccsWriteLog_('runTccsScrapeDrafts', articleRef.url, 'error', error.toString());
    }
  }

  tccsWriteLog_('runTccsScrapeDrafts', '', 'done',
    `Hoàn thành: ${articleCount} bài, ${chunkCount} chunk, ${errorCount} lỗi`);

  return {
    success: true,
    articles: articleCount,
    chunks: chunkCount,
    errors: errorCount
  };
}

// ============================================================
// NỘI BỘ: TCCS SCRAPER — Fetch & Parse
// ============================================================

function tccsFetchArticleList_() {
  const sectionPath = CONFIG.TCCS_SECTION_PATH || TCCS_DEFAULT_SECTION_PATH;
  const sectionUrl = tccsBuildUrl_(sectionPath);
  const response = tccsFetch_(sectionUrl);
  if (response.getResponseCode() !== 200) {
    throw new Error(`TCCS section HTTP ${response.getResponseCode()}`);
  }
  const html = response.getContentText('UTF-8');
  const seen = {};
  const articles = [];
  const hrefPattern = /href\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = hrefPattern.exec(html)) !== null) {
    const href = tccsDecodeHtmlEntities_(match[1]);
    if (!tccsLooksLikeArticleHref_(href)) continue;

    const url = tccsBuildUrl_(href);
    if (seen[url]) continue;

    seen[url] = true;
    articles.push({ url });
  }

  tccsWriteLog_('tccsFetchArticleList', sectionUrl, 'success', `Tìm thấy ${articles.length} link bài viết`);
  return articles;
}

function tccsFetchArticleContent_(articleUrl) {
  const response = tccsFetch_(articleUrl);
  const code = response.getResponseCode();
  if (code !== 200) throw new Error(`TCCS HTTP ${code}`);

  const html = response.getContentText('UTF-8');
  const title = tccsExtractTitle_(html);
  const author = tccsExtractAuthor_(html);
  const publishedDate = tccsExtractPublishedDate_(html);
  const mainHtml = tccsExtractMainHtml_(html);
  const mainText = tccsCleanArticleText_(tccsHtmlToText_(mainHtml));
  const wordCount = tccsCountWords_(mainText);

  if (wordCount < TCCS_CHUNK_MIN_WORDS) {
    throw new Error(`Nội dung quá ngắn để tạo chunk TCCS hữu ích (${wordCount} từ)`);
  }

  return {
    title,
    author,
    publishedDate,
    sourceUrl: articleUrl,
    mainText
  };
}

function tccsClassifyTopic_(title, text) {
  const fallback = tccsGuessTopic_([title, text.substring(0, 1000)].join('\n'));

  if (isBlank_(CONFIG.GEMINI_API_KEY) || typeof troLy35CallGeminiJson_ !== 'function') {
    return fallback;
  }

  const topicList = TROLY35_TOPICS.join(' | ');
  const prompt = `Phân loại bài viết Tạp chí Cộng sản sau vào đúng một chủ đề trong danh sách.

DANH SÁCH CHỦ ĐỀ:
${topicList}

TIÊU ĐỀ:
${title}

ĐOẠN ĐẦU:
${text.substring(0, 1800)}

Chỉ chọn đúng một chủ đề gần nhất. Không tóm tắt, không diễn giải nội dung.`;
  const schema = {
    type: 'object',
    properties: { topic: { type: 'string' } },
    required: ['topic']
  };

  try {
    const result = troLy35CallGeminiJson_(prompt, schema);
    const topic = cleanValue_(result.topic);
    return TROLY35_TOPICS.includes(topic) ? topic : fallback;
  } catch (error) {
    Logger.log(`[TCCS] Gemini phân loại lỗi, dùng fallback: ${error}`);
    return fallback;
  }
}

function tccsGuessTopic_(text) {
  const lower = cleanValue_(text).toLowerCase();
  const rules = [
    { topic: 'Vai trò lãnh đạo của Đảng', words: ['đảng lãnh đạo', 'xây dựng đảng', 'đảng cộng sản'] },
    { topic: 'Dân chủ XHCN', words: ['dân chủ', 'xã hội chủ nghĩa'] },
    { topic: 'Nhân quyền', words: ['nhân quyền', 'quyền con người'] },
    { topic: 'Tự do ngôn luận, internet', words: ['tự do ngôn luận', 'internet', 'mạng xã hội'] },
    { topic: 'Tự do tôn giáo', words: ['tôn giáo', 'tín ngưỡng'] },
    { topic: 'Tham nhũng và chống tham nhũng', words: ['tham nhũng', 'tiêu cực'] },
    { topic: 'Kinh tế thị trường định hướng XHCN', words: ['kinh tế thị trường', 'kinh tế'] },
    { topic: 'Quan hệ đối ngoại', words: ['đối ngoại', 'quan hệ quốc tế'] },
    { topic: 'Chủ quyền biển đảo', words: ['biển đảo', 'chủ quyền', 'hoàng sa', 'trường sa'] },
    { topic: 'Quân đội, Công an', words: ['quân đội', 'công an', 'an ninh'] },
    { topic: 'Lịch sử Đảng', words: ['lịch sử đảng', 'cách mạng'] },
    { topic: 'Tư tưởng Hồ Chí Minh', words: ['hồ chí minh', 'tư tưởng'] },
    { topic: 'Đoàn kết dân tộc', words: ['đoàn kết dân tộc', 'dân tộc'] },
    { topic: 'Phát triển bền vững, môi trường', words: ['môi trường', 'phát triển bền vững'] }
  ];

  const found = rules.find(rule => rule.words.some(word => lower.includes(word)));
  return found ? found.topic : 'Các vấn đề thời sự';
}

function tccsExtractTitle_(html) {
  const candidates = [];
  const h1Pattern = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let h1Match;
  while ((h1Match = h1Pattern.exec(html)) !== null) {
    candidates.push({ value: h1Match[1], priority: 1 });
  }

  [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i
  ].forEach((pattern, index) => {
    const match = html.match(pattern);
    if (match) candidates.push({ value: match[1], priority: 10 + index });
  });

  candidates.sort((a, b) => a.priority - b.priority);

  for (let i = 0; i < candidates.length; i++) {
    const title = tccsCleanTitleCandidate_(candidates[i].value);
    if (tccsIsUsefulTitle_(title)) return title;
  }

  return 'Bài viết Tạp chí Cộng sản';
}

function tccsCleanTitleCandidate_(value) {
  const title = tccsHtmlToText_(value).replace(/\s+/g, ' ').trim();
  const parts = title.split(/\s+[-–|]\s+/);
  if (parts.length > 1 && tccsIsGenericTitle_(parts[parts.length - 1])) {
    return parts.slice(0, -1).join(' - ').trim();
  }
  return title;
}

function tccsIsUsefulTitle_(title) {
  if (title.length < 20) return false;
  if (tccsIsGenericTitle_(title)) return false;
  return tccsCountWords_(title) >= 5;
}

function tccsIsGenericTitle_(title) {
  const key = cleanValue_(title).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
  return ['tap chi cong san', 'tccs', 'tap chi cong san dien tu', 'tap chi cong san online'].includes(key);
}

function tccsExtractAuthor_(html) {
  const patterns = [
    /<[^>]*class=["'][^"']*(?:author|writer|tacgia)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /Tác giả\s*:\s*<\/?[^>]*>\s*([^<\n]+)/i
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = html.match(patterns[i]);
    if (!match) continue;
    const author = tccsHtmlToText_(match[1]).trim();
    if (author.length > 2 && author.length < 200) return author;
  }

  return '';
}

function tccsExtractPublishedDate_(html) {
  const patterns = [
    /<time[^>]+datetime=["']([^"']+)["']/i,
    /<[^>]*class=["'][^"']*(?:date|time|publish)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/,
    /(\d{4}-\d{2}-\d{2})/
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = html.match(patterns[i]);
    if (!match) continue;
    const date = tccsHtmlToText_(match[1]).trim();
    if (date) return date;
  }

  return '';
}

function tccsExtractMainHtml_(html) {
  const candidates = [];
  const patterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]+class=["'][^"']*(?:journal-content-article|detail-content|article-content|content-detail|entry-content|news-content|post-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]+id=["'][^"']*(?:content|article|detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const text = tccsCleanArticleText_(tccsHtmlToText_(match[1]));
      const words = tccsCountWords_(text);
      if (words >= 100) candidates.push({ html: match[1], words });
    }
  });

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.words - a.words);
    return candidates[0].html;
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

function tccsCleanArticleText_(text) {
  return cleanValue_(text)
    .replace(/^\s*TCCS\s*[-–]\s*/gm, '')
    .replace(/Tạp chí Cộng sản\s*$/gm, '')
    .replace(/Chia sẻ bài viết[\s\S]*$/i, '')
    .replace(/Bài liên quan[\s\S]*$/i, '')
    .replace(/Đọc thêm[\s\S]*$/i, '')
    .replace(/^\s*Tags?:.*$/gmi, '')
    .replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function tccsHtmlToText_(html) {
  return tccsDecodeHtmlEntities_(cleanValue_(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<\/(?:p|div|article|section|h[1-6]|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n\s+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim());
}

function tccsDecodeHtmlEntities_(text) {
  return cleanValue_(text)
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function tccsLooksLikeArticleHref_(href) {
  const lower = cleanValue_(href).toLowerCase();
  if (!lower || lower.startsWith('#') || lower.startsWith('javascript:') || lower.startsWith('mailto:')) return false;
  return lower.includes('dau-tranh-phan-bac') &&
    (lower.includes('/content/') || lower.includes('chi-tiet') || /\.aspx(?:\?|$)/.test(lower));
}

function tccsBuildUrl_(pathOrUrl) {
  const value = cleanValue_(pathOrUrl).replace(/&amp;/g, '&');
  if (/^https?:\/\//i.test(value)) return value.split('#')[0];

  const base = cleanValue_(CONFIG.TCCS_BASE_URL || TCCS_DEFAULT_BASE_URL).replace(/\/+$/, '');
  const path = value.startsWith('/') ? value : `/${value}`;
  return `${base}${path}`.split('#')[0];
}

function tccsFetch_(url) {
  return UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TroLy35-TCCS-Scraper/1.0)' }
  });
}

function tccsSleep_() {
  const delay = Number(CONFIG.TCCS_REQUEST_DELAY_MS) || 2500;
  if (delay > 0) Utilities.sleep(delay);
}

function tccsHasRuntimeLeft_(startedAt, maxRuntimeMs) {
  const elapsed = Date.now() - startedAt;
  return elapsed < Math.max(60000, maxRuntimeMs - 30000);
}

// ============================================================
// NỘI BỘ: TCCS SCRAPER — Sheet helpers
// ============================================================

function tccsGetSheet_(name) {
  const ss = getSpreadsheet_();
  return createSheetIfNotExists(ss, name, TCCS_SHEET_HEADERS[name] || []);
}

function tccsWriteLog_(action, url, status, message) {
  try {
    const sheet = tccsGetSheet_('TCCS_SCRAPE_LOG');
    sheet.appendRow([new Date(), action, url || '', status, message || '']);
  } catch (error) {
    Logger.log(`[TCCS Log] ${action} ${status}: ${message} (${error})`);
  }
}

function tccsSaveArticle_(article, topic, chunks) {
  const sheet = tccsGetSheet_('TCCS_ARTICLES');
  const articleId = `TCCS-A-${Utilities.getUuid()}`;
  const validDrafts = chunks.filter(chunk => chunk.status === 'Draft').length;
  const status = validDrafts > 0 ? 'Draft' : 'Needs Review';

  sheet.appendRow([
    articleId, article.title, topic, article.sourceUrl, article.author,
    article.publishedDate, tccsCountWords_(article.mainText), chunks.length,
    status, new Date(), ''
  ]);

  tccsSaveArticleTextIfMissing_(articleId, article);
  return articleId;
}

function tccsSaveArticleTextIfMissing_(articleId, article) {
  if (!articleId || !article || !cleanValue_(article.mainText)) return;

  const sheet = tccsGetSheet_('TCCS_ARTICLE_TEXTS');
  const url = cleanValue_(article.sourceUrl);
  if (sheet.getLastRow() > 1) {
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (cleanValue_(rows[i][0]) === cleanValue_(articleId) || cleanValue_(rows[i][1]) === url) {
        return;
      }
    }
  }

  sheet.appendRow([
    articleId, url, article.mainText, tccsCountWords_(article.mainText), new Date()
  ]);
}

function tccsSaveChunks_(articleId, article, topic, chunks) {
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  const rows = chunks.map(chunk => [
    `TCCS-C-${Utilities.getUuid()}`, articleId, article.title, topic,
    chunk.sectionType, chunk.content, chunk.rawContent, chunk.chunkIndex, chunk.wordCount,
    article.sourceUrl, chunk.contentHash, chunk.status, '', '', chunk.notes
  ]);

  appendRows_(sheet, rows);
  return rows.length;
}

function tccsGetExistingArticleUrls_() {
  const sheet = tccsGetSheet_('TCCS_ARTICLES');
  if (sheet.getLastRow() <= 1) return new Set();

  const urls = sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).getValues()
    .flat().map(cleanValue_).filter(Boolean);
  return new Set(urls);
}

function tccsGetExistingChunkHashes_() {
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  if (sheet.getLastRow() <= 1) return new Set();

  const hashes = sheet.getRange(2, 11, sheet.getLastRow() - 1, 1).getValues()
    .flat().map(cleanValue_).filter(Boolean);
  return new Set(hashes);
}

function tccsGetExistingPlannedChunkUrls_() {
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  if (sheet.getLastRow() <= 1) return new Set();

  const urls = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
    .filter(row => tccsIsDynamicChunkRow_(row))
    .map(row => cleanValue_(row[9])).filter(Boolean);
  return new Set(urls);
}

function tccsFindArticleByUrl_(articleUrl) {
  const sheet = tccsGetSheet_('TCCS_ARTICLES');
  if (sheet.getLastRow() <= 1) return null;

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (cleanValue_(rows[i][3]) === cleanValue_(articleUrl)) {
      return { rowIndex: i + 2, articleId: cleanValue_(rows[i][0]) };
    }
  }
  return null;
}

function tccsHasCoreChunkForUrl_(articleUrl) {
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  if (sheet.getLastRow() <= 1) return false;

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (cleanValue_(rows[i][4]) === 'core_argument' &&
        cleanValue_(rows[i][9]) === cleanValue_(articleUrl)) {
      return true;
    }
  }
  return false;
}

function tccsHasPlannedChunksForUrl_(articleUrl) {
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  if (sheet.getLastRow() <= 1) return false;

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (cleanValue_(rows[i][9]) === cleanValue_(articleUrl) && tccsIsDynamicChunkRow_(rows[i])) {
      return true;
    }
  }
  return false;
}

function tccsIsDynamicChunkRow_(row) {
  const sectionType = cleanValue_(row[4]);
  const notes = cleanValue_(row[14]).toLowerCase();
  return TCCS_DYNAMIC_SECTION_TYPES.includes(sectionType) && notes.includes('dynamic_chunk');
}

function tccsBuildSourceLabel_(title, sourceUrl) {
  return `Tạp chí Cộng sản: ${title || 'Bài viết'}${sourceUrl ? ` (${sourceUrl})` : ''}`;
}

function tccsSafeVectorId_(chunkId) {
  return `tccs-${cleanValue_(chunkId)}`
    .toLowerCase().replace(/[^a-z0-9-_]/g, '-').substring(0, 120);
}

function tccsHash_(text) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, cleanValue_(text), Utilities.Charset.UTF_8
  );
  return digest.map(byte => {
    const value = byte < 0 ? byte + 256 : byte;
    return value.toString(16).padStart(2, '0');
  }).join('');
}

function tccsCountWords_(text) {
  return cleanValue_(text).split(/\s+/).filter(Boolean).length;
}

function tccsGuessSectionType_(text) {
  const lower = cleanValue_(text).toLowerCase();
  if (tccsContainsAny_(lower, ['luận điệu', 'xuyên tạc', 'sai trái', 'thù địch', 'cho rằng', 'rao giảng'])) return 'luan_dieu_sai';
  if (tccsContainsAny_(lower, ['hiến pháp', 'nghị quyết', 'văn kiện', 'số liệu', 'dẫn chứng', 'thực tiễn', 'minh chứng'])) return 'luan_cu_phan_bac';
  if (tccsContainsAny_(lower, ['bối cảnh', 'lịch sử', 'thời gian qua', 'hiện nay', 'trong quá trình'])) return 'boi_canh';
  if (tccsContainsAny_(lower, ['giải pháp', 'cần phải', 'nhiệm vụ', 'kết luận', 'thời gian tới', 'đòi hỏi'])) return 'giai_phap';
  if (tccsContainsAny_(lower, ['vì vậy', 'do đó', 'bởi vậy', 'cho thấy', 'khẳng định'])) return 'phan_tich';
  return 'tong_hop';
}

function tccsContainsAny_(text, keywords) {
  return keywords.some(keyword => text.includes(keyword));
}

function tccsBuildEmbeddingContent_(data) {
  const sectionLabel = TCCS_SECTION_LABELS[data.sectionType] || TCCS_SECTION_LABELS.tong_hop;
  return [
    `[Nguồn: Tạp chí Cộng sản]`,
    `[Tiêu đề: ${data.title}]`,
    `[Chủ đề: ${data.topic}]`,
    `[Phần: ${sectionLabel}]`,
    `[URL: ${data.sourceUrl}]`,
    '',
    data.rawContent
  ].join('\n');
}
