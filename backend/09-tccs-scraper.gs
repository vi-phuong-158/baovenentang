/**
 * ============================================================
 * MODULE: TCCS SCRAPER
 * Scrape Tạp chí Cộng sản thành kho chunk chọn lọc động cho Trợ lý 35.
 * ============================================================
 */

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
        return;
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

/**
 * Index các chunk TCCS đã được duyệt lên Pinecone.
 */
function syncTccsApprovedChunksToPinecone(maxRows) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG.concat(REQUIRED_GEMINI_CONFIG).concat(REQUIRED_PINECONE_CONFIG));

  const limit = Math.max(1, Number(maxRows) || 25);
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  if (sheet.getLastRow() <= 1) {
    Logger.log('[TCCS] Chưa có chunk để đồng bộ.');
    return { success: true, upserted: 0 };
  }

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
    .map((row, index) => ({ rowIndex: index + 2, data: row }))
    .filter(item => {
      const status = cleanValue_(item.data[11]).toLowerCase();
      return ['approved', 'đã duyệt', 'da duyet'].includes(status) && !cleanValue_(item.data[12]);
    })
    .slice(0, limit);

  if (rows.length === 0) {
    Logger.log('[TCCS] Không có chunk Approved chưa index.');
    return { success: true, upserted: 0 };
  }

  const vectors = rows.map(item => {
    const row = item.data;
    const chunkId = cleanValue_(row[0]);
    const vectorId = tccsSafeVectorId_(chunkId);
    const content = cleanValue_(row[5]);
    const rawContent = cleanValue_(row[6]);

    return {
      rowIndex: item.rowIndex,
      vectorId,
      vector: {
        id: vectorId,
        values: troLy35EmbedText_(content),
        metadata: {
          source_type: 'tccs_chunk',
          source: 'tccs',
          tccs_chunk_id: chunkId,
          tccs_article_id: cleanValue_(row[1]),
          title: cleanValue_(row[2]).substring(0, 500),
          topic: cleanValue_(row[3]),
          section_type: cleanValue_(row[4]),
          source_url: cleanValue_(row[9]),
          content_hash: cleanValue_(row[10]),
          word_count: Number(row[8]) || 0,
          preview: rawContent.substring(0, 500)
        }
      }
    };
  });

  troLy35UpsertPineconeVectors_(vectors.map(item => item.vector));

  vectors.forEach(item => {
    sheet.getRange(item.rowIndex, 12, 1, 3)
      .setValues([['Indexed', item.vectorId, new Date()]]);
  });

  Logger.log(`[TCCS] Đã đồng bộ ${vectors.length} chunk lên Pinecone.`);
  return {
    success: true,
    upserted: vectors.length
  };
}

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

function tccsCreateCoreChunks_(fullText, context) {
  return tccsCreateKnowledgeChunks_(fullText, context);
}

function tccsCreateKnowledgeChunks_(fullText, context) {
  const paragraphs = tccsSplitArticleParagraphs_(fullText);
  if (paragraphs.length === 0) {
    throw new Error('Không tìm thấy đoạn văn hợp lệ để tạo chunk TCCS.');
  }

  const plan = tccsCreateDynamicChunkPlan_(paragraphs, context);
  const chunks = tccsMaterializeChunkPlan_(paragraphs, context, plan);
  if (chunks.length > 0) return chunks;

  const fallback = tccsBuildFallbackChunkPlan_(paragraphs, context, 'fallback_empty_plan');
  return tccsMaterializeChunkPlan_(paragraphs, context, fallback);
}

function tccsCreateDynamicChunkPlan_(paragraphs, context) {
  const fallback = tccsBuildFallbackChunkPlan_(paragraphs, context, 'fallback_score');

  if (isBlank_(CONFIG.GEMINI_API_KEY) || typeof troLy35CallGeminiJson_ !== 'function') {
    return fallback;
  }

  const articleWords = paragraphs.reduce((total, paragraph) => total + tccsCountWords_(paragraph), 0);
  const maxChunks = tccsTargetDynamicChunkCount_(articleWords);
  const paragraphInput = tccsBuildParagraphPlanInput_(paragraphs);
  const sectionTypes = TCCS_DYNAMIC_SECTION_TYPES.map(type => `${type}: ${TCCS_SECTION_LABELS[type]}`).join('\n');
  const prompt = `Bạn là trợ lý biên tập dữ liệu RAG cho chatbot bảo vệ nền tảng tư tưởng.

Nhiệm vụ: đọc các đoạn đã đánh số của bài Tạp chí Cộng sản và lập kế hoạch chunk động. AI chỉ chọn số đoạn, không viết lại nội dung. Code sẽ ghép nguyên văn các đoạn được chọn.

Mục tiêu:
- Không chia cơ học theo số từ.
- Không bắt buộc bài nào cũng có cùng số chunk hoặc cùng loại chunk.
- Chọn các đơn vị tri thức thật sự có giá trị tra cứu cho chatbot.
- Mỗi chunk nên dùng các đoạn cùng một ý, khoảng ${TCCS_AI_CHUNK_MIN_WORDS}-${TCCS_AI_CHUNK_MAX_WORDS} từ nếu có thể.
- Luôn ưu tiên có 1 article_brief nếu bài đủ dài, dùng các đoạn gốc đại diện cho toàn bài.
- Tổng số chunk đề xuất tối đa ${maxChunks}; bài ngắn có thể chỉ 1-2 chunk.

Các section_type hợp lệ:
${sectionTypes}

Quy tắc chọn:
1. paragraph_indexes là số thứ tự đoạn 1-based trong danh sách.
2. Không chọn đoạn ít giá trị, điều hướng web, thông tin lặp lại.
3. Không tự tạo nội dung mới, không sửa câu chữ.
4. Nếu bài không có một loại nội dung nào thì không tạo chunk loại đó.
5. Ưu tiên luận điểm chính, luận điệu sai trái, cơ sở lý luận, dẫn chứng thực tiễn, giải pháp/kiến nghị.

TIÊU ĐỀ:
${context.title}

CHỦ ĐỀ:
${context.topic}

CÁC ĐOẠN:
${paragraphInput}`;
  const schema = {
    type: 'object',
    properties: {
      article_type: { type: 'string' },
      chunks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            section_type: { type: 'string' },
            purpose: { type: 'string' },
            paragraph_indexes: {
              type: 'array',
              items: { type: 'number' }
            },
            priority: { type: 'integer' }
          },
          required: ['section_type', 'paragraph_indexes']
        }
      }
    },
    required: ['chunks']
  };

  try {
    const result = troLy35CallGeminiJson_(prompt, schema);
    const normalized = tccsNormalizeChunkPlan_(result, paragraphs, context, 'ai_chunk_plan');
    if (normalized.chunks.length === 0) return fallback;
    return normalized;
  } catch (error) {
    Logger.log(`[TCCS] Gemini lập chunk plan lỗi, dùng fallback: ${error}`);
    return fallback;
  }
}

function tccsBuildParagraphPlanInput_(paragraphs) {
  const lines = [];
  let totalChars = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const preview = tccsTrimTextToChars_(paragraph, TCCS_PLAN_PARAGRAPH_PREVIEW_CHARS);
    const line = `[${i + 1}] (${tccsCountWords_(paragraph)} từ) ${preview}`;
    if (totalChars + line.length > TCCS_PLAN_PROMPT_MAX_CHARS && lines.length >= 8) break;
    lines.push(line);
    totalChars += line.length;
  }

  return lines.join('\n\n');
}

function tccsNormalizeChunkPlan_(result, paragraphs, context, method) {
  const articleWords = paragraphs.reduce((total, paragraph) => total + tccsCountWords_(paragraph), 0);
  const maxChunks = tccsTargetDynamicChunkCount_(articleWords);
  const rawChunks = Array.isArray(result && result.chunks) ? result.chunks : [];
  const seen = {};
  const chunks = [];

  rawChunks.forEach((item, index) => {
    const sectionType = tccsNormalizeDynamicSectionType_(item.section_type || item.sectionType || item.type);
    const indexes = tccsNormalizeParagraphIndexes_(
      item.paragraph_indexes || item.paragraphs || item.selected_paragraphs,
      paragraphs.length
    );
    if (indexes.length === 0) return;

    const key = `${sectionType}:${indexes.join(',')}`;
    if (seen[key]) return;
    seen[key] = true;

    chunks.push({
      sectionType,
      purpose: cleanValue_(item.purpose || TCCS_SECTION_LABELS[sectionType]).substring(0, 300),
      indexes,
      priority: Number(item.priority) || (rawChunks.length - index)
    });
  });

  const ensured = tccsEnsureBriefPlan_(chunks, paragraphs);
  return {
    method,
    articleType: cleanValue_(result && result.article_type).substring(0, 120) || 'auto',
    chunks: ensured
      .sort((a, b) => {
        if (a.sectionType === 'article_brief') return -1;
        if (b.sectionType === 'article_brief') return 1;
        return (b.priority || 0) - (a.priority || 0);
      })
      .slice(0, maxChunks)
  };
}

function tccsEnsureBriefPlan_(chunks, paragraphs) {
  if (chunks.some(chunk => chunk.sectionType === 'article_brief')) return chunks;

  return [{
    sectionType: 'article_brief',
    purpose: 'Tóm lược bài bằng các đoạn gốc đại diện',
    indexes: tccsBuildBriefIndexes_(paragraphs),
    priority: 999
  }].concat(chunks);
}

function tccsBuildFallbackChunkPlan_(paragraphs, context, method) {
  const articleWords = paragraphs.reduce((total, paragraph) => total + tccsCountWords_(paragraph), 0);
  const maxChunks = tccsTargetDynamicChunkCount_(articleWords);
  const chunks = [{
    sectionType: 'article_brief',
    purpose: 'Tóm lược bài bằng các đoạn gốc đại diện',
    indexes: tccsBuildBriefIndexes_(paragraphs),
    priority: 999
  }];
  const sectionOrder = [
    'wrong_claim',
    'counter_argument',
    'theoretical_basis',
    'legal_policy_basis',
    'practical_evidence',
    'historical_context',
    'recommendation',
    'quote_material',
    'core_argument'
  ];
  const usedKeys = { article_brief: true };

  sectionOrder.forEach(sectionType => {
    if (chunks.length >= maxChunks || usedKeys[sectionType]) return;
    const ranked = tccsRankParagraphsForSection_(paragraphs, sectionType);
    const indexes = tccsPickIndexesForWordTarget_(
      paragraphs,
      ranked,
      TCCS_AI_CHUNK_MIN_WORDS,
      TCCS_AI_CHUNK_MAX_WORDS,
      TCCS_AI_CHUNK_TARGET_WORDS
    );
    if (indexes.length === 0) return;
    chunks.push({
      sectionType,
      purpose: TCCS_SECTION_LABELS[sectionType],
      indexes,
      priority: 100 - chunks.length
    });
    usedKeys[sectionType] = true;
  });

  if (chunks.length === 1 && maxChunks > 1) {
    chunks.push({
      sectionType: 'core_argument',
      purpose: TCCS_SECTION_LABELS.core_argument,
      indexes: tccsPickIndexesForWordTarget_(
        paragraphs,
        tccsRankCoreParagraphs_(paragraphs),
        TCCS_AI_CHUNK_MIN_WORDS,
        TCCS_AI_CHUNK_MAX_WORDS,
        TCCS_AI_CHUNK_TARGET_WORDS
      ),
      priority: 90
    });
  }

  return {
    method,
    articleType: cleanValue_(context && context.topic) || 'fallback',
    chunks: chunks.slice(0, maxChunks)
  };
}

function tccsMaterializeChunkPlan_(paragraphs, context, plan) {
  const seen = {};
  const chunks = [];

  (plan.chunks || []).forEach(planItem => {
    const composed = tccsComposePlannedChunkText_(paragraphs, planItem.indexes, planItem.sectionType);
    const rawContent = composed.rawContent;
    const wordCount = tccsCountWords_(rawContent);
    if (!rawContent || wordCount < 80) return;

    const hash = tccsHash_([context.sourceUrl, planItem.sectionType, rawContent].join('\n'));
    if (seen[hash]) return;
    seen[hash] = true;

    const status = tccsIsChunkWordCountOk_(planItem.sectionType, wordCount) && !composed.forcedSplit
      ? 'Draft'
      : 'Needs Review';
    const content = tccsBuildEmbeddingContent_({
      title: context.title,
      topic: context.topic,
      sectionType: planItem.sectionType,
      sourceUrl: context.sourceUrl,
      rawContent
    });
    const notes = [
      'dynamic_chunk',
      `Method: ${plan.method}`,
      `Article Type: ${plan.articleType}`,
      `Purpose: ${planItem.purpose || TCCS_SECTION_LABELS[planItem.sectionType] || ''}`,
      composed.selectedParagraphs.length ? `Paragraphs: ${composed.selectedParagraphs.join(', ')}` : '',
      `Words: ${wordCount}`,
      composed.forcedSplit ? 'Needs review: có đoạn quá dài đã tách theo câu.' : '',
      status === 'Needs Review' ? 'Needs review: ngoài khoảng từ mục tiêu.' : ''
    ].filter(Boolean).join(' | ');

    chunks.push({
      chunkIndex: chunks.length + 1,
      sectionType: planItem.sectionType,
      rawContent,
      content,
      wordCount,
      status,
      notes,
      contentHash: hash
    });
  });

  return chunks.map((chunk, index) => ({
    ...chunk,
    chunkIndex: index + 1
  }));
}

function tccsComposePlannedChunkText_(paragraphs, preferredIndexes, sectionType) {
  const target = sectionType === 'article_brief' ? TCCS_BRIEF_CHUNK_TARGET_WORDS : TCCS_AI_CHUNK_TARGET_WORDS;
  const minWords = sectionType === 'article_brief' ? TCCS_BRIEF_CHUNK_MIN_WORDS : TCCS_AI_CHUNK_MIN_WORDS;
  const maxWords = sectionType === 'article_brief' ? TCCS_BRIEF_CHUNK_MAX_WORDS : TCCS_AI_CHUNK_MAX_WORDS;
  const adjacent = tccsAdjacentIndexes_(preferredIndexes || [], paragraphs.length);
  const candidates = tccsUniqueNumbers_(
    (preferredIndexes || [])
      .filter(index => Number.isInteger(index) && index >= 0 && index < paragraphs.length)
      .concat(adjacent)
      .concat(tccsRankParagraphsForSection_(paragraphs, sectionType))
      .concat(tccsRankCoreParagraphs_(paragraphs))
  );
  const selected = [];
  const selectedTextByIndex = {};
  let selectedWords = 0;
  let forcedSplit = false;

  candidates.forEach(index => {
    if (selectedWords >= target) return;

    let paragraph = paragraphs[index];
    let words = tccsCountWords_(paragraph);
    if (words < 20) return;

    if (words > maxWords) {
      paragraph = tccsTrimTextToWordLimit_(paragraph, maxWords);
      words = tccsCountWords_(paragraph);
      forcedSplit = true;
    }

    if (selectedWords + words > maxWords) {
      const remaining = maxWords - selectedWords;
      if (selectedWords < minWords && remaining >= 80) {
        const trimmed = tccsTrimTextToWordLimit_(paragraph, remaining);
        const trimmedWords = tccsCountWords_(trimmed);
        if (trimmedWords >= 50) {
          selected.push(index);
          selectedTextByIndex[index] = trimmed;
          selectedWords += trimmedWords;
          forcedSplit = true;
        }
      }
      return;
    }

    selected.push(index);
    selectedTextByIndex[index] = paragraph;
    selectedWords += words;
  });

  if (selected.length === 0) {
    return {
      rawContent: tccsTrimTextToWordLimit_(paragraphs.join('\n\n'), maxWords),
      selectedParagraphs: [],
      forcedSplit: true
    };
  }

  const ordered = selected.sort((a, b) => a - b);
  return {
    rawContent: ordered.map(index => selectedTextByIndex[index] || paragraphs[index]).join('\n\n').trim(),
    selectedParagraphs: ordered.map(index => index + 1),
    forcedSplit
  };
}

function tccsIsChunkWordCountOk_(sectionType, wordCount) {
  if (sectionType === 'article_brief') {
    return wordCount >= TCCS_BRIEF_CHUNK_MIN_WORDS && wordCount <= TCCS_BRIEF_CHUNK_MAX_WORDS;
  }
  return wordCount >= TCCS_AI_CHUNK_MIN_WORDS && wordCount <= TCCS_AI_CHUNK_MAX_WORDS;
}

function tccsTargetDynamicChunkCount_(wordCount) {
  const configured = Number(CONFIG.TCCS_MAX_DYNAMIC_CHUNKS);
  const hardMax = Math.min(
    TCCS_MAX_DYNAMIC_CHUNKS,
    Number.isFinite(configured) && configured > 0 ? configured : TCCS_MAX_DYNAMIC_CHUNKS
  );

  if (wordCount < 1200) return Math.min(1, hardMax);
  if (wordCount < 1500) return Math.min(2, hardMax);
  if (wordCount <= 3500) return Math.min(4, hardMax);
  if (wordCount <= 7000) return Math.min(6, hardMax);
  return hardMax;
}

function tccsBuildBriefIndexes_(paragraphs) {
  const last = paragraphs.length - 1;
  const candidates = [0, 1, last - 1, last]
    .filter(index => index >= 0 && index < paragraphs.length)
    .concat(tccsRankCoreParagraphs_(paragraphs));
  return tccsPickIndexesForWordTarget_(
    paragraphs,
    candidates,
    TCCS_BRIEF_CHUNK_MIN_WORDS,
    TCCS_BRIEF_CHUNK_MAX_WORDS,
    TCCS_BRIEF_CHUNK_TARGET_WORDS
  );
}

function tccsPickIndexesForWordTarget_(paragraphs, candidates, minWords, maxWords, targetWords) {
  const selected = [];
  let words = 0;

  tccsUniqueNumbers_(candidates || []).forEach(index => {
    if (words >= targetWords) return;
    if (!Number.isInteger(index) || index < 0 || index >= paragraphs.length) return;

    const paragraphWords = tccsCountWords_(paragraphs[index]);
    if (paragraphWords < 20) return;
    if (words + Math.min(paragraphWords, maxWords) > maxWords && words >= minWords) return;

    selected.push(index);
    words += Math.min(paragraphWords, maxWords);
  });

  return selected;
}

function tccsAdjacentIndexes_(indexes, total) {
  const result = [];
  (indexes || []).forEach(index => {
    [index - 1, index + 1].forEach(candidate => {
      if (candidate >= 0 && candidate < total) result.push(candidate);
    });
  });
  return result;
}

function tccsRankParagraphsForSection_(paragraphs, sectionType) {
  return paragraphs
    .map((paragraph, index) => ({
      index,
      score: tccsScoreParagraphForSection_(paragraph, index, paragraphs.length, sectionType)
    }))
    .filter(item => item.score > 0 || sectionType === 'core_argument' || sectionType === 'article_brief')
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(item => item.index);
}

function tccsScoreParagraphForSection_(paragraph, index, total, sectionType) {
  const text = cleanValue_(paragraph).toLowerCase();
  const words = tccsCountWords_(paragraph);
  let score = sectionType === 'core_argument' || sectionType === 'article_brief'
    ? tccsScoreCoreParagraph_(paragraph, index, total)
    : 0;
  const keywords = tccsSectionKeywords_(sectionType);

  keywords.forEach(keyword => {
    if (text.includes(keyword)) score += 5;
  });
  if (words >= 80 && words <= 280) score += 2;
  if (words < 40) score -= 2;
  if (index <= 2 && ['article_brief', 'wrong_claim', 'historical_context'].includes(sectionType)) score += 2;
  if (index >= total - 4 && sectionType === 'recommendation') score += 3;
  return score;
}

function tccsSectionKeywords_(sectionType) {
  const groups = {
    wrong_claim: ['xuyên tạc', 'luận điệu', 'sai trái', 'thù địch', 'phản động', 'cho rằng', 'rao giảng', 'kích động', 'lợi dụng'],
    counter_argument: ['phản bác', 'bác bỏ', 'khẳng định', 'thực tế cho thấy', 'cho thấy', 'minh chứng', 'không thể', 'sự thật'],
    theoretical_basis: ['chủ nghĩa mác', 'lê-nin', 'hồ chí minh', 'tư tưởng', 'lý luận', 'quan điểm', 'nguyên tắc'],
    legal_policy_basis: ['hiến pháp', 'pháp luật', 'nghị quyết', 'văn kiện', 'chính sách', 'nhà nước', 'luật pháp quốc tế'],
    practical_evidence: ['thực tiễn', 'thành tựu', 'kết quả', 'dẫn chứng', 'số liệu', 'minh chứng', 'đổi mới'],
    historical_context: ['lịch sử', 'bối cảnh', 'trước đây', 'sinh thời', 'quá trình', 'năm ', 'thời kỳ'],
    recommendation: ['một là', 'hai là', 'ba là', 'giải pháp', 'cần', 'cần phải', 'tiếp tục', 'tăng cường', 'nhiệm vụ'],
    quote_material: ['“', '”', '"', 'trích', 'khẳng định', 'nhấn mạnh'],
    core_argument: ['vì vậy', 'do đó', 'từ đó', 'khẳng định', 'cần phải', 'cho thấy']
  };
  return groups[sectionType] || groups.core_argument;
}

function tccsNormalizeDynamicSectionType_(value) {
  const key = tccsNormalizeKey_(value);
  const aliases = {
    article_brief: 'article_brief',
    brief: 'article_brief',
    summary: 'article_brief',
    tom_luoc: 'article_brief',
    core_argument: 'core_argument',
    core: 'core_argument',
    luan_diem_chinh: 'core_argument',
    wrong_claim: 'wrong_claim',
    luan_dieu_sai: 'wrong_claim',
    counter_argument: 'counter_argument',
    phan_bac: 'counter_argument',
    luan_cu_phan_bac: 'counter_argument',
    theoretical_basis: 'theoretical_basis',
    co_so_ly_luan: 'theoretical_basis',
    legal_policy_basis: 'legal_policy_basis',
    co_so_phap_ly: 'legal_policy_basis',
    practical_evidence: 'practical_evidence',
    thuc_tien: 'practical_evidence',
    historical_context: 'historical_context',
    boi_canh: 'historical_context',
    recommendation: 'recommendation',
    giai_phap: 'recommendation',
    quote_material: 'quote_material',
    trich_dan: 'quote_material'
  };

  if (aliases[key]) return aliases[key];
  if (key.includes('sai') || key.includes('xuyen_tac')) return 'wrong_claim';
  if (key.includes('phan_bac') || key.includes('luan_cu')) return 'counter_argument';
  if (key.includes('ly_luan') || key.includes('tu_tuong')) return 'theoretical_basis';
  if (key.includes('phap') || key.includes('chinh_sach')) return 'legal_policy_basis';
  if (key.includes('thuc_tien') || key.includes('dan_chung')) return 'practical_evidence';
  if (key.includes('giai_phap') || key.includes('kien_nghi')) return 'recommendation';
  return 'core_argument';
}

function tccsNormalizeKey_(value) {
  return cleanValue_(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function tccsTrimTextToChars_(text, maxChars) {
  const value = cleanValue_(text);
  if (value.length <= maxChars) return value;
  return value.substring(0, Math.max(1, maxChars - 3)).trim() + '...';
}

function tccsSelectCoreParagraphs_(paragraphs, context) {
  const fallback = {
    indexes: tccsRankCoreParagraphs_(paragraphs),
    method: 'fallback_score',
    reason: 'AI không khả dụng hoặc không trả về lựa chọn hợp lệ.'
  };

  if (isBlank_(CONFIG.GEMINI_API_KEY) || typeof troLy35CallGeminiJson_ !== 'function') {
    return fallback;
  }

  const numberedParagraphs = paragraphs
    .map((paragraph, index) => `[${index + 1}] ${paragraph}`)
    .join('\n\n');
  const prompt = `Bạn là trợ lý biên tập dữ liệu RAG cho chatbot bảo vệ nền tảng tư tưởng.

Nhiệm vụ: chọn các đoạn NGUYÊN VĂN quan trọng nhất từ bài Tạp chí Cộng sản để ghép thành 1 core chunk khoảng ${TCCS_CORE_CHUNK_TARGET_WORDS} từ, hợp lệ trong khoảng ${TCCS_CORE_CHUNK_MIN_WORDS}-${TCCS_CORE_CHUNK_MAX_WORDS} từ.

Ưu tiên chọn đoạn có:
- luận điểm trung tâm của bài;
- nhận diện luận điệu/ý đồ xuyên tạc;
- luận cứ, dẫn chứng phản bác;
- kết luận hoặc định hướng chính trị có giá trị sử dụng cho chatbot.

Không chọn đoạn mở rộng ít giá trị, lời dẫn dư thừa, thông tin lặp lại. Chỉ trả về số thứ tự đoạn, không viết lại nội dung.

TIÊU ĐỀ:
${context.title}

CHỦ ĐỀ:
${context.topic}

CÁC ĐOẠN VĂN:
${numberedParagraphs}`;
  const schema = {
    type: 'object',
    properties: {
      selected_paragraphs: {
        type: 'array',
        items: { type: 'number' }
      },
      reason: { type: 'string' }
    },
    required: ['selected_paragraphs']
  };

  try {
    const result = troLy35CallGeminiJson_(prompt, schema);
    const indexes = tccsNormalizeParagraphIndexes_(result.selected_paragraphs, paragraphs.length);
    if (indexes.length === 0) return fallback;
    return {
      indexes,
      method: 'ai_extract',
      reason: cleanValue_(result.reason).substring(0, 500)
    };
  } catch (error) {
    Logger.log(`[TCCS] Gemini chọn core chunk lỗi, dùng fallback: ${error}`);
    return fallback;
  }
}

function tccsComposeCoreChunkText_(paragraphs, preferredIndexes) {
  const candidates = tccsUniqueNumbers_(
    (preferredIndexes || [])
      .filter(index => Number.isInteger(index) && index >= 0 && index < paragraphs.length)
      .concat(tccsRankCoreParagraphs_(paragraphs))
  );
  const selected = [];
  const selectedTextByIndex = {};
  let selectedWords = 0;

  candidates.forEach(index => {
    if (selectedWords >= TCCS_CORE_CHUNK_TARGET_WORDS) return;

    let paragraph = paragraphs[index];
    let words = tccsCountWords_(paragraph);
    if (words < 20) return;

    if (words > TCCS_CORE_CHUNK_MAX_WORDS) {
      paragraph = tccsTrimTextToWordLimit_(paragraph, TCCS_CORE_CHUNK_MAX_WORDS);
      words = tccsCountWords_(paragraph);
    }

    if (selectedWords + words > TCCS_CORE_CHUNK_MAX_WORDS) {
      const remaining = TCCS_CORE_CHUNK_MAX_WORDS - selectedWords;
      if (selectedWords < TCCS_CORE_CHUNK_MIN_WORDS && remaining >= 80) {
        const trimmed = tccsTrimTextToWordLimit_(paragraph, remaining);
        const trimmedWords = tccsCountWords_(trimmed);
        if (trimmedWords >= 50) {
          selected.push(index);
          selectedTextByIndex[index] = trimmed;
          selectedWords += trimmedWords;
        }
      }
      return;
    }

    selected.push(index);
    selectedTextByIndex[index] = paragraph;
    selectedWords += words;
  });

  if (selected.length === 0) {
    const fallbackText = tccsTrimTextToWordLimit_(paragraphs.join('\n\n'), TCCS_CORE_CHUNK_MAX_WORDS);
    return {
      rawContent: fallbackText,
      selectedParagraphs: []
    };
  }

  const ordered = selected.sort((a, b) => a - b);
  return {
    rawContent: ordered.map(index => selectedTextByIndex[index] || paragraphs[index]).join('\n\n').trim(),
    selectedParagraphs: ordered.map(index => index + 1)
  };
}

function tccsRankCoreParagraphs_(paragraphs) {
  return paragraphs
    .map((paragraph, index) => ({
      index,
      score: tccsScoreCoreParagraph_(paragraph, index, paragraphs.length)
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(item => item.index);
}

function tccsScoreCoreParagraph_(paragraph, index, total) {
  const text = cleanValue_(paragraph).toLowerCase();
  const words = tccsCountWords_(paragraph);
  const keywords = [
    'xuyên tạc', 'luận điệu', 'sai trái', 'thù địch', 'phản bác',
    'cho rằng', 'lập luận', 'khẳng định', 'thực tiễn', 'dẫn chứng',
    'chủ nghĩa mác', 'lê-nin', 'hồ chí minh', 'đảng', 'dân tộc',
    'đại đoàn kết', 'quyền dân tộc tự quyết', 'giải pháp', 'cần phải',
    'vì vậy', 'do đó', 'từ đó'
  ];
  let score = 0;

  keywords.forEach(keyword => {
    if (text.includes(keyword)) score += 3;
  });
  if (index <= 2) score += 2;
  if (index >= total - 3) score += 1;
  if (words >= 80 && words <= 260) score += 2;
  if (words < 40) score -= 3;
  if (words > 450) score -= 1;
  return score;
}

function tccsTrimTextToWordLimit_(text, limit) {
  const maxWords = Math.max(1, Number(limit) || TCCS_CORE_CHUNK_TARGET_WORDS);
  const sentences = tccsSplitSentences_(text);
  const selected = [];
  let selectedWords = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const words = tccsCountWords_(sentence);
    if (selectedWords + words > maxWords) break;
    selected.push(sentence);
    selectedWords += words;
  }

  if (selected.length > 0) return selected.join(' ').trim();
  return cleanValue_(text).split(/\s+/).slice(0, maxWords).join(' ');
}

function tccsSplitArticleParagraphs_(fullText) {
  return cleanValue_(fullText).split(/\n{2,}/)
    .map(item => item.trim())
    .filter(item => tccsCountWords_(item) > 0);
}

function tccsNormalizeParagraphIndexes_(indexes, total) {
  if (!Array.isArray(indexes)) return [];
  return tccsUniqueNumbers_(indexes
    .map(item => Number(item) - 1)
    .filter(index => Number.isInteger(index) && index >= 0 && index < total));
}

function tccsUniqueNumbers_(items) {
  const seen = {};
  return (items || []).filter(item => {
    const key = String(item);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function tccsCreateChunks_(fullText, context) {
  const paragraphs = tccsSplitArticleParagraphs_(fullText);
  const units = [];

  paragraphs.forEach(paragraph => {
    if (tccsCountWords_(paragraph) <= TCCS_CHUNK_MAX_WORDS) {
      units.push({ text: paragraph, forcedSplit: false });
      return;
    }

    tccsSplitLongParagraph_(paragraph).forEach(unit => units.push(unit));
  });

  const chunks = [];
  let current = [];
  let currentWords = 0;
  let currentForced = false;

  units.forEach(unit => {
    const unitWords = tccsCountWords_(unit.text);

    if (currentWords === 0) {
      current = [unit.text];
      currentWords = unitWords;
      currentForced = unit.forcedSplit;
      return;
    }

    if (currentWords + unitWords <= TCCS_CHUNK_MAX_WORDS) {
      current.push(unit.text);
      currentWords += unitWords;
      currentForced = currentForced || unit.forcedSplit;
      return;
    }

    if (currentWords >= TCCS_CHUNK_MIN_WORDS) {
      tccsPushChunk_(chunks, current, currentForced);
      current = [unit.text];
      currentWords = unitWords;
      currentForced = unit.forcedSplit;
      return;
    }

    if (currentWords + unitWords <= TCCS_CHUNK_SOFT_MAX_WORDS) {
      current.push(unit.text);
      currentWords += unitWords;
      currentForced = true;
      tccsPushChunk_(chunks, current, currentForced);
      current = [];
      currentWords = 0;
      currentForced = false;
      return;
    }

    tccsPushChunk_(chunks, current, true);
    current = [unit.text];
    currentWords = unitWords;
    currentForced = unit.forcedSplit;
  });

  if (currentWords > 0) {
    tccsPushChunk_(chunks, current, currentForced);
  }

  tccsRepairLastChunk_(chunks);

  return chunks.map((chunk, index) => {
    const rawContent = chunk.rawContent;
    const wordCount = tccsCountWords_(rawContent);
    const sectionType = tccsGuessSectionType_(rawContent);
    const status = chunk.needsReview || wordCount < TCCS_CHUNK_MIN_WORDS || wordCount > TCCS_CHUNK_MAX_WORDS
      ? 'Needs Review'
      : 'Draft';
    const content = tccsBuildEmbeddingContent_({
      title: context.title,
      topic: context.topic,
      sectionType,
      sourceUrl: context.sourceUrl,
      rawContent
    });

    return {
      chunkIndex: index + 1,
      sectionType,
      rawContent,
      content,
      wordCount,
      status,
      notes: status === 'Needs Review' ? 'Chunk ngoài khoảng 600-800 từ hoặc có fallback tách câu/từ.' : '',
      contentHash: tccsHash_(rawContent)
    };
  });
}

function tccsSplitLongParagraph_(paragraph) {
  const sentences = tccsSplitSentences_(paragraph);
  if (sentences.length <= 1) {
    return tccsSplitByWords_(paragraph).map(text => ({ text, forcedSplit: true }));
  }

  const units = [];
  let current = [];
  let currentWords = 0;

  sentences.forEach(sentence => {
    const sentenceWords = tccsCountWords_(sentence);
    if (sentenceWords > TCCS_CHUNK_MAX_WORDS) {
      if (currentWords > 0) {
        units.push({ text: current.join(' '), forcedSplit: false });
        current = [];
        currentWords = 0;
      }
      tccsSplitByWords_(sentence).forEach(text => units.push({ text, forcedSplit: true }));
      return;
    }

    if (currentWords > 0 && currentWords + sentenceWords > TCCS_CHUNK_MAX_WORDS) {
      units.push({ text: current.join(' '), forcedSplit: false });
      current = [sentence];
      currentWords = sentenceWords;
      return;
    }

    current.push(sentence);
    currentWords += sentenceWords;
  });

  if (currentWords > 0) {
    units.push({ text: current.join(' '), forcedSplit: false });
  }

  return units;
}

function tccsSplitSentences_(text) {
  const matches = cleanValue_(text).match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g);
  return (matches || [text]).map(item => item.trim()).filter(Boolean);
}

function tccsSplitByWords_(text) {
  const words = cleanValue_(text).split(/\s+/).filter(Boolean);
  const chunks = [];

  for (let i = 0; i < words.length; i += TCCS_CHUNK_TARGET_WORDS) {
    chunks.push(words.slice(i, i + TCCS_CHUNK_TARGET_WORDS).join(' '));
  }

  return chunks;
}

function tccsPushChunk_(chunks, parts, needsReview) {
  const rawContent = parts.join('\n\n').trim();
  if (!rawContent) return;
  chunks.push({ rawContent, needsReview: needsReview === true });
}

function tccsRepairLastChunk_(chunks) {
  if (chunks.length <= 1) return;

  const last = chunks[chunks.length - 1];
  const lastWords = tccsCountWords_(last.rawContent);
  if (lastWords >= TCCS_CHUNK_MIN_WORDS) return;

  const previous = chunks[chunks.length - 2];
  const merged = `${previous.rawContent}\n\n${last.rawContent}`;
  const mergedWords = tccsCountWords_(merged);

  if (mergedWords <= TCCS_CHUNK_SOFT_MAX_WORDS) {
    previous.rawContent = merged;
    previous.needsReview = previous.needsReview || last.needsReview || mergedWords > TCCS_CHUNK_MAX_WORDS;
    chunks.pop();
    return;
  }

  last.needsReview = true;
}

function tccsSaveArticle_(article, topic, chunks) {
  const sheet = tccsGetSheet_('TCCS_ARTICLES');
  const articleId = `TCCS-A-${Utilities.getUuid()}`;
  const validDrafts = chunks.filter(chunk => chunk.status === 'Draft').length;
  const status = validDrafts > 0 ? 'Draft' : 'Needs Review';

  sheet.appendRow([
    articleId,
    article.title,
    topic,
    article.sourceUrl,
    article.author,
    article.publishedDate,
    tccsCountWords_(article.mainText),
    chunks.length,
    status,
    new Date(),
    ''
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
    articleId,
    url,
    article.mainText,
    tccsCountWords_(article.mainText),
    new Date()
  ]);
}

function tccsSaveChunks_(articleId, article, topic, chunks) {
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  const rows = chunks.map(chunk => [
    `TCCS-C-${Utilities.getUuid()}`,
    articleId,
    article.title,
    topic,
    chunk.sectionType,
    chunk.content,
    chunk.rawContent,
    chunk.chunkIndex,
    chunk.wordCount,
    article.sourceUrl,
    chunk.contentHash,
    chunk.status,
    '',
    '',
    chunk.notes
  ]);

  appendRows_(sheet, rows);
  return rows.length;
}

function tccsGetExistingArticleUrls_() {
  const sheet = tccsGetSheet_('TCCS_ARTICLES');
  if (sheet.getLastRow() <= 1) return new Set();

  const urls = sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).getValues()
    .flat()
    .map(cleanValue_)
    .filter(Boolean);
  return new Set(urls);
}

function tccsGetExistingChunkHashes_() {
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  if (sheet.getLastRow() <= 1) return new Set();

  const hashes = sheet.getRange(2, 11, sheet.getLastRow() - 1, 1).getValues()
    .flat()
    .map(cleanValue_)
    .filter(Boolean);
  return new Set(hashes);
}

function tccsGetExistingPlannedChunkUrls_() {
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  if (sheet.getLastRow() <= 1) return new Set();

  const urls = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
    .filter(row => tccsIsDynamicChunkRow_(row))
    .map(row => cleanValue_(row[9]))
    .filter(Boolean);
  return new Set(urls);
}

function tccsFindArticleByUrl_(articleUrl) {
  const sheet = tccsGetSheet_('TCCS_ARTICLES');
  if (sheet.getLastRow() <= 1) return null;

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (cleanValue_(rows[i][3]) === cleanValue_(articleUrl)) {
      return {
        rowIndex: i + 2,
        articleId: cleanValue_(rows[i][0])
      };
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

function tccsSearchChunksInSheets_(analysis, content, topicHint, limit) {
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  if (sheet.getLastRow() <= 1) return [];

  const keywords = [].concat(analysis.tu_khoa_chinh || [], troLy35ExtractKeywords_(content), topicHint || '')
    .map(item => cleanValue_(item).toLowerCase())
    .filter(Boolean);
  const topic = cleanValue_(analysis.chu_de || topicHint).toLowerCase();

  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
    .map((row, index) => tccsChunkRowToObject_(row, index + 2))
    .filter(item => tccsIsApprovedChunkStatus_(item.status))
    .map(item => {
      const haystack = [
        item.title,
        item.topic,
        item.sectionType,
        item.rawContent,
        item.sourceUrl
      ].join(' ').toLowerCase();
      let score = topic && item.topic.toLowerCase().includes(topic) ? 8 : 0;
      keywords.forEach(keyword => {
        if (keyword && haystack.includes(keyword)) score += 2;
      });
      return { item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit || TROLY35_TOP_K)
    .map(scored => tccsChunkToKnowledge_(scored.item, scored.score, 'tccs_sheets'));
}

function tccsKnowledgeFromPineconeMatch_(match) {
  const meta = match.metadata || {};
  const chunkId = cleanValue_(meta.tccs_chunk_id);
  const vectorId = cleanValue_(match.id);
  const chunk = tccsFindChunk_(chunkId, vectorId);

  if (chunk) {
    return tccsChunkToKnowledge_(chunk, match.score || 0, 'tccs_pinecone');
  }

  return {
    id: chunkId || vectorId,
    chuDe: cleanValue_(meta.topic),
    luanDiemSaiTrai: 'Tư liệu bài viết chính thống từ Tạp chí Cộng sản',
    phanBacChinh: cleanValue_(meta.preview),
    danChung: {
      title: cleanValue_(meta.title),
      source_url: cleanValue_(meta.source_url),
      section_type: cleanValue_(meta.section_type),
      word_count: Number(meta.word_count) || 0
    },
    tuKhoa: '',
    nguon: tccsBuildSourceLabel_(cleanValue_(meta.title), cleanValue_(meta.source_url)),
    score: match.score || 0,
    source: 'tccs_pinecone'
  };
}

function tccsFindChunk_(chunkId, vectorId) {
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  if (sheet.getLastRow() <= 1) return null;

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if ((chunkId && cleanValue_(row[0]) === chunkId) ||
        (vectorId && cleanValue_(row[12]) === vectorId)) {
      return tccsChunkRowToObject_(row, i + 2);
    }
  }

  return null;
}

function tccsChunkRowToObject_(row, rowIndex) {
  return {
    rowIndex,
    chunkId: cleanValue_(row[0]),
    articleId: cleanValue_(row[1]),
    title: cleanValue_(row[2]),
    topic: cleanValue_(row[3]),
    sectionType: cleanValue_(row[4]),
    content: cleanValue_(row[5]),
    rawContent: cleanValue_(row[6]),
    chunkIndex: Number(row[7]) || 0,
    wordCount: Number(row[8]) || 0,
    sourceUrl: cleanValue_(row[9]),
    contentHash: cleanValue_(row[10]),
    status: cleanValue_(row[11]),
    pineconeId: cleanValue_(row[12]),
    indexedAt: row[13],
    notes: cleanValue_(row[14])
  };
}

function tccsChunkToKnowledge_(chunk, score, source) {
  return {
    id: chunk.chunkId,
    chuDe: chunk.topic,
    luanDiemSaiTrai: 'Tư liệu bài viết chính thống từ Tạp chí Cộng sản',
    phanBacChinh: chunk.rawContent,
    danChung: {
      title: chunk.title,
      source_url: chunk.sourceUrl,
      section_type: chunk.sectionType,
      word_count: chunk.wordCount,
      chunk_index: chunk.chunkIndex
    },
    tuKhoa: typeof troLy35ExtractKeywords_ === 'function'
      ? troLy35ExtractKeywords_([chunk.title, chunk.topic, chunk.rawContent].join(' ')).join(', ')
      : '',
    nguon: tccsBuildSourceLabel_(chunk.title, chunk.sourceUrl),
    score: score || 0,
    source
  };
}

function tccsIsApprovedChunkStatus_(status) {
  const normalized = cleanValue_(status).toLowerCase();
  return ['approved', 'indexed', 'đã duyệt', 'da duyet'].includes(normalized);
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
    properties: {
      topic: { type: 'string' }
    },
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
  const title = tccsHtmlToText_(value)
    .replace(/\s+/g, ' ')
    .trim();
  const parts = title.split(/\s+[-\u2013|]\s+/);
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
  const key = cleanValue_(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return key === 'tap chi cong san' ||
    key === 'tccs' ||
    key === 'tap chi cong san dien tu' ||
    key === 'tap chi cong san online';
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
      if (words >= 100) {
        candidates.push({ html: match[1], words });
      }
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
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
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
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TroLy35-TCCS-Scraper/1.0)'
    }
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

function tccsGetSheet_(name) {
  const ss = getSpreadsheet_();
  return createSheetIfNotExists(ss, name, TCCS_SHEET_HEADERS[name] || []);
}

function tccsWriteLog_(action, url, status, message) {
  try {
    const sheet = tccsGetSheet_('TCCS_SCRAPE_LOG');
    sheet.appendRow([
      new Date(),
      action,
      url || '',
      status,
      message || ''
    ]);
  } catch (error) {
    Logger.log(`[TCCS Log] ${action} ${status}: ${message} (${error})`);
  }
}

function tccsBuildSourceLabel_(title, sourceUrl) {
  return `Tạp chí Cộng sản: ${title || 'Bài viết'}${sourceUrl ? ` (${sourceUrl})` : ''}`;
}

function tccsSafeVectorId_(chunkId) {
  return `tccs-${cleanValue_(chunkId)}`
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .substring(0, 120);
}

function tccsHash_(text) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    cleanValue_(text),
    Utilities.Charset.UTF_8
  );

  return digest.map(byte => {
    const value = byte < 0 ? byte + 256 : byte;
    return value.toString(16).padStart(2, '0');
  }).join('');
}

function tccsCountWords_(text) {
  return cleanValue_(text).split(/\s+/).filter(Boolean).length;
}
