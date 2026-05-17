/**
 * ============================================================
 * MODULE: GOOGLE SHEETS DATABASE
 * Lưu trữ và truy xuất dữ liệu
 * ============================================================
 */

const SHEET_HEADERS = {
  TIN_TUC: [
    'Ngày', 'Tiêu đề', 'Tóm tắt', 'Chủ đề',
    'Ưu tiên', 'Thông điệp', 'Nguồn', 'Link', 'Từ khóa', 'Đã gửi'
  ],
  DANG_KY: [
    'Email', 'Họ tên', 'Đơn vị', 'Chủ đề quan tâm',
    'Kênh nhận', 'Telegram Username', 'Ngày đăng ký', 'Trạng thái'
  ],
  THONG_KE: [
    'Ngày', 'Số bài tin', 'Email đã gửi', 'Tỷ lệ mở',
    'Lượt đọc Web', 'Lượt làm Quiz', 'Đăng ký mới'
  ],
  PHAN_BAC: [
    'Ngày tạo', 'Chủ đề', 'Luận điệu sai trái',
    'Luận điểm phản bác', 'Bằng chứng', 'Nguồn'
  ],
  PHAN_BAC_KHO: [
    'ID', 'Chủ đề', 'Luận điệu sai trái', 'Phản bác chính',
    'Dẫn chứng JSON', 'Từ khóa', 'Nguồn', 'Độ ưu tiên',
    'Trạng thái duyệt', 'Pinecone ID', 'Ngày cập nhật'
  ],
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
  TROLY35_HISTORY: [
    'Thời gian', 'Request ID', 'Chế độ', 'Chủ đề', 'Độ nguy hiểm',
    'Input preview', 'Full input', 'Source URL', 'Analysis JSON',
    'Result JSON', 'Knowledge JSON', 'Rating', 'Ghi chú',
    'Trạng thái', 'Lỗi'
  ],
  QUIZ: [
    'ID', 'Câu hỏi', 'Đáp án A', 'Đáp án B',
    'Đáp án C', 'Đáp án D', 'Đáp án đúng', 'Giải thích', 'Chủ đề'
  ],
  QUIZ_RESULT: [
    'Thời gian', 'Người làm', 'Đơn vị', 'Điểm', 'Tổng câu', 'Chi tiết'
  ],
  TROLY35_FEEDBACK: [
    'Thời gian', 'Query Hash', 'Rating', 'Comment', 'Response ID',
    'Access Code Hash', 'Query Preview', 'Response Preview', 'Reason'
  ]
};

/**
 * Khởi tạo cấu trúc các sheet (chạy 1 lần khi setup).
 */
function initializeSheets() {
  const ss = getSpreadsheet_();

  Object.keys(SHEET_HEADERS).forEach(name => {
    createSheetIfNotExists(ss, name, SHEET_HEADERS[name]);
  });

  Logger.log('✅ Đã khởi tạo đầy đủ cấu trúc Sheets');
}

function getSpreadsheet_() {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG);
  return SpreadsheetApp.openById(CONFIG.SHEET_ID);
}

function getSheet_(name) {
  const ss = getSpreadsheet_();
  return createSheetIfNotExists(ss, name, SHEET_HEADERS[name] || []);
}

/**
 * Tạo sheet nếu chưa tồn tại, đồng thời đảm bảo header đúng.
 */
function createSheetIfNotExists(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    Logger.log(`✅ Đã tạo sheet: ${name}`);
  }

  ensureSheetHeaders_(sheet, headers);
  return sheet;
}

function ensureSheetHeaders_(sheet, headers) {
  if (!headers || headers.length === 0) return;

  const lastColumn = Math.max(sheet.getLastColumn(), headers.length);
  const existingHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const needsUpdate = headers.some((header, index) => existingHeaders[index] !== header);

  if (needsUpdate) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#c0392b')
    .setFontColor('white')
    .setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * Lưu các bài viết đã xử lý vào sheet TIN_TUC.
 */
function saveArticlesToSheet(articles) {
  if (!articles || articles.length === 0) return 0;

  const sheet = getSheet_('TIN_TUC');
  const today = new Date();

  const rows = articles.map(a => [
    today,
    a.title || '',
    a.summary || '',
    a.category || 'Khác',
    a.priority || 'Bình thường',
    a.message || '',
    a.source || '',
    a.link || '',
    Array.isArray(a.keywords) ? a.keywords.join(', ') : (a.keywords || ''),
    'Chưa'
  ]);

  appendRows_(sheet, rows);
  invalidateArticleCache_();
  Logger.log(`[Sheets] Đã lưu ${rows.length} bài vào TIN_TUC`);
  return rows.length;
}

function invalidateArticleCache_() {
  try {
    const cache = CacheService.getScriptCache();
    [1, 7, 30].forEach(days => cache.remove('articles_' + days));
    PropertiesService.getScriptProperties().setProperty('ARTICLE_CACHE_VERSION', String(Date.now()));
  } catch (_) {}
}

function getArticleCacheVersion_() {
  try {
    return PropertiesService.getScriptProperties().getProperty('ARTICLE_CACHE_VERSION') || '1';
  } catch (_) {
    return '1';
  }
}

function appendRows_(sheet, rows) {
  if (!rows || rows.length === 0) return;

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
    .setValues(rows);
}

/**
 * Lấy danh sách người đăng ký theo kênh và chủ đề.
 */
function getSubscribers(channel, topic) {
  const sheet = getSheet_('DANG_KY');

  if (sheet.getLastRow() <= 1) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const channelFilter = channel ? channel.toString().toLowerCase() : '';

  return data.filter(row => {
    const userChannel = (row[4] || '').toString().toLowerCase();
    const userTopics = (row[3] || 'Tất cả').toString();
    const status = (row[7] || 'Hoạt động').toString();

    if (status !== 'Hoạt động') return false;
    if (channelFilter && !userChannel.includes(channelFilter)) return false;
    if (topic && userTopics !== 'Tất cả' && !userTopics.includes(topic)) return false;

    return true;
  }).map(row => ({
    email: row[0],
    name: row[1],
    organization: row[2],
    topics: row[3],
    channel: row[4],
    telegramUsername: row[5],
    registeredDate: row[6]
  }));
}

/**
 * Thêm người đăng ký mới.
 */
function addSubscriber(data) {
  const email = normalizeEmail_(data && data.email);
  const name = cleanValue_(data && data.name);

  if (!validateEmail_(email)) {
    return { success: false, message: 'Email không hợp lệ' };
  }

  const sheet = getSheet_('DANG_KY');

  if (sheet.getLastRow() > 1) {
    const emails = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
      .getValues()
      .flat()
      .map(normalizeEmail_);

    if (emails.includes(email)) {
      return { success: false, message: 'Email đã đăng ký trước đó' };
    }
  }

  sheet.appendRow([
    email,
    name || email,
    cleanValue_(data.organization),
    cleanValue_(data.topics) || 'Tất cả',
    cleanValue_(data.channel) || 'Email',
    cleanValue_(data.telegramUsername),
    new Date(),
    'Hoạt động'
  ]);

  return {
    success: true,
    message: 'Đăng ký thành công!',
    subscriber: {
      email,
      name: name || email,
      organization: cleanValue_(data.organization),
      topics: cleanValue_(data.topics) || 'Tất cả',
      channel: cleanValue_(data.channel) || 'Email',
      telegramUsername: cleanValue_(data.telegramUsername)
    }
  };
}

/**
 * Lấy bài viết của ngày hôm nay.
 */
function getTodayArticles() {
  const sheet = getSheet_('TIN_TUC');

  if (sheet.getLastRow() <= 1) return [];

  const today = new Date();
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  return data
    .filter(row => isSameDay_(row[0], today))
    .map(row => ({
      date: row[0],
      title: row[1],
      summary: row[2],
      category: row[3],
      priority: row[4],
      message: row[5],
      source: row[6],
      link: row[7],
      keywords: row[8]
    }));
}

/**
 * Lấy hoặc tạo mới Spreadsheet lưu trữ backup.
 * ID được lưu vào Script Property 'ARCHIVE_SHEET_ID' sau lần tạo đầu tiên.
 */
function getOrCreateArchiveSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const archiveId = props.getProperty('ARCHIVE_SHEET_ID');

  if (archiveId) {
    try {
      return SpreadsheetApp.openById(archiveId);
    } catch (e) {
      Logger.log(`[Archive] Không mở được backup (${archiveId}), tạo mới: ${e}`);
    }
  }

  const ss = SpreadsheetApp.create('Trợ lý 35 - Archive Bản tin');
  props.setProperty('ARCHIVE_SHEET_ID', ss.getId());
  Logger.log(`[Archive] Đã tạo backup spreadsheet: ${ss.getUrl()}`);
  return ss;
}

/**
 * Archive các bài viết cũ hơn 6 tháng từ sheet TIN_TUC sang Spreadsheet backup riêng.
 * Hàm này được gọi tự động vào ngày 1 mỗi tháng qua trigger runMonthlyArchive().
 * @returns {{ archived: number, remaining: number, archiveUrl: string }}
 */
function archiveOldArticles() {
  const sheet = getSheet_('TIN_TUC');
  if (sheet.getLastRow() <= 1) {
    Logger.log('[Archive] Sheet TIN_TUC trống, bỏ qua.');
    return { archived: 0, remaining: 0, archiveUrl: '' };
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  cutoff.setHours(0, 0, 0, 0);

  const numCols = sheet.getLastColumn();
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getValues();

  const toKeep = [];
  const toArchive = [];

  data.forEach(row => {
    const d = row[0] ? new Date(row[0]) : null;
    if (d && !isNaN(d.getTime()) && d < cutoff) {
      toArchive.push(row);
    } else {
      toKeep.push(row);
    }
  });

  if (toArchive.length === 0) {
    Logger.log('[Archive] Không có bài nào cũ hơn 6 tháng.');
    return { archived: 0, remaining: toKeep.length, archiveUrl: '' };
  }

  // Ghi sang backup spreadsheet
  const archiveSs = getOrCreateArchiveSpreadsheet_();
  let archiveSheet = archiveSs.getSheetByName('TIN_TUC');
  if (!archiveSheet) {
    archiveSheet = archiveSs.insertSheet('TIN_TUC');
    archiveSheet.getRange(1, 1, 1, SHEET_HEADERS.TIN_TUC.length)
      .setValues([SHEET_HEADERS.TIN_TUC]);
    archiveSheet.getRange(1, 1, 1, SHEET_HEADERS.TIN_TUC.length)
      .setBackground('#1a3a5c')
      .setFontColor('white')
      .setFontWeight('bold');
    archiveSheet.setFrozenRows(1);
  }

  const archiveLastRow = archiveSheet.getLastRow();
  archiveSheet.getRange(archiveLastRow + 1, 1, toArchive.length, numCols)
    .setValues(toArchive);

  // Ghi log dòng phân cách theo tháng vào backup để dễ tra sau
  const archiveNote = `[Archived ${new Date().toLocaleDateString('vi-VN')} — ${toArchive.length} bài từ trước ${cutoff.toLocaleDateString('vi-VN')}]`;
  Logger.log(`[Archive] ${archiveNote}`);

  // Xoá data cũ khỏi sheet chính (giữ nguyên header và định dạng)
  sheet.deleteRows(2, sheet.getLastRow() - 1);
  if (toKeep.length > 0) {
    sheet.getRange(2, 1, toKeep.length, numCols).setValues(toKeep);
  }

  Logger.log(`[Archive] Xong: ${toArchive.length} bài đã chuyển, còn lại ${toKeep.length} bài.`);
  return {
    archived: toArchive.length,
    remaining: toKeep.length,
    archiveUrl: archiveSs.getUrl()
  };
}

/**
 * Lấy bài viết trong N ngày gần nhất, mới nhất trước.
 * @param {number} days - Số ngày nhìn lại (1 = hôm nay, 7 = 7 ngày gần nhất,...)
 */
function getArticles(days, page, limit) {
  const parsedDays = Math.max(1, parseInt(days) || 1);
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 20), 50);

  const cacheKey = 'articles_' + getArticleCacheVersion_() + '_' + parsedDays;
  const cache = CacheService.getScriptCache();
  let articles;

  const cached = cache.get(cacheKey);
  if (cached) {
    try { articles = JSON.parse(cached); } catch (_) { articles = null; }
  }

  if (!articles) {
    const sheet = getSheet_('TIN_TUC');
    if (sheet.getLastRow() <= 1) return { data: [], total: 0, page: parsedPage, hasMore: false };

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (parsedDays - 1));
    cutoff.setHours(0, 0, 0, 0);

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

    articles = data
      .filter(row => row[0] && new Date(row[0]) >= cutoff)
      .map(row => ({
        date: row[0],
        title: row[1],
        summary: row[2],
        category: row[3],
        priority: row[4],
        message: row[5],
        source: row[6],
        link: row[7],
        keywords: row[8]
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    try { cache.put(cacheKey, JSON.stringify(articles), 300); } catch (_) {}
  }

  const total = articles.length;
  const start = (parsedPage - 1) * parsedLimit;
  const paged = articles.slice(start, start + parsedLimit);

  return { data: paged, total, page: parsedPage, hasMore: start + parsedLimit < total };
}

/**
 * Lấy câu hỏi quiz ngẫu nhiên.
 */
function getRandomQuiz(count = 1) {
  const sheet = getSheet_('QUIZ');

  if (sheet.getLastRow() <= 1) return [];

  const limit = Math.max(1, Number(count) || 1);
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const shuffled = shuffleRows_(data);

  return shuffled.slice(0, limit).map(row => ({
    id: row[0],
    question: row[1],
    options: {
      A: row[2],
      B: row[3],
      C: row[4],
      D: row[5]
    },
    correct: (row[6] || '').toString().trim().toUpperCase(),
    explanation: row[7],
    category: row[8]
  }));
}

/**
 * Lưu kết quả làm quiz.
 */
function saveQuizResult(data) {
  const sheet = getSheet_('QUIZ_RESULT');
  const details = data.details || data.answers || {};

  sheet.appendRow([
    new Date(),
    cleanValue_(data.user) || 'Khách',
    cleanValue_(data.organization),
    Number(data.score) || 0,
    Number(data.total) || 0,
    JSON.stringify(details)
  ]);
}

/**
 * Cập nhật thống kê hàng ngày.
 */
function updateDailyStats(stats) {
  const sheet = getSheet_('THONG_KE');
  sheet.appendRow([
    new Date(),
    Number(stats.articlesCount) || 0,
    Number(stats.emailsSent) || 0,
    stats.openRate || '0%',
    Number(stats.webVisits) || 0,
    Number(stats.quizAttempts) || 0,
    Number(stats.newSubscribers) || 0
  ]);
}

/**
 * Tìm kiếm bài viết toàn bộ sheet TIN_TUC theo từ khoá.
 * Tìm trong: tiêu đề, tóm tắt, nguồn, từ khóa.
 * @param {string} query - Từ khoá tìm kiếm
 * @param {number} limit - Số kết quả tối đa (mặc định 50, tối đa 100)
 */
function searchArticles(query, page, limit) {
  const sheet = getSheet_('TIN_TUC');
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 20), 50);
  if (sheet.getLastRow() <= 1) return { data: [], total: 0, page: parsedPage, hasMore: false };

  const q = (query || '').toString().toLowerCase().trim();
  if (!q) return { data: [], total: 0, page: parsedPage, hasMore: false };

  const cacheKey = 'search_' + getArticleCacheVersion_() + '_' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, q).map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('').substring(0, 16);
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  let results;
  if (cached) {
    try { results = JSON.parse(cached); } catch (_) { results = null; }
  }

  if (!results) {
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

    results = [];
    for (let i = data.length - 1; i >= 0; i--) {
      const row = data[i];
      const title    = (row[1] || '').toString().toLowerCase();
      const summary  = (row[2] || '').toString().toLowerCase();
      const source   = (row[6] || '').toString().toLowerCase();
      const keywords = (row[8] || '').toString().toLowerCase();

      if (title.includes(q) || summary.includes(q) || source.includes(q) || keywords.includes(q)) {
        results.push({
          date:     row[0],
          title:    row[1],
          summary:  row[2],
          category: row[3],
          priority: row[4],
          message:  row[5],
          source:   row[6],
          link:     row[7],
          keywords: row[8]
        });
      }
    }

    try { cache.put(cacheKey, JSON.stringify(results), 600); } catch (_) {}
  }

  const total = results.length;
  const start = (parsedPage - 1) * parsedLimit;
  const paged = results.slice(start, start + parsedLimit);
  return { data: paged, total, page: parsedPage, hasMore: start + parsedLimit < total };
}

/**
 * Lưu luận điểm phản bác mới.
 */
function saveRebuttal(data) {
  const sheet = getSheet_('PHAN_BAC');
  sheet.appendRow([
    new Date(),
    cleanValue_(data.topic),
    cleanValue_(data.wrongClaim),
    cleanValue_(data.rebuttal),
    Array.isArray(data.evidence) ? data.evidence.join('\n') : cleanValue_(data.evidence),
    Array.isArray(data.sources) ? data.sources.join('\n') : cleanValue_(data.sources)
  ]);
}

function isSameDay_(value, targetDate) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date.getFullYear() === targetDate.getFullYear() &&
    date.getMonth() === targetDate.getMonth() &&
    date.getDate() === targetDate.getDate();
}

function shuffleRows_(rows) {
  const copy = rows.slice();

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  return copy;
}

function normalizeEmail_(email) {
  return cleanValue_(email).toLowerCase();
}

// ============================================================
// TROLY35 FEEDBACK
// ============================================================

function saveTroLy35Feedback_(data) {
  const sheet = getSheet_('TROLY35_FEEDBACK');
  sheet.appendRow([
    new Date(),
    cleanValue_(data.queryHash),
    cleanValue_(data.rating),
    cleanValue_(data.comment).substring(0, 500),
    cleanValue_(data.responseId),
    cleanValue_(data.accessCodeHash),
    cleanValue_(data.queryPreview).substring(0, 200),
    cleanValue_(data.responsePreview).substring(0, 200),
    cleanValue_(data.reason)
  ]);
}

function getTroLy35FeedbackStats_() {
  const sheet = getSheet_('TROLY35_FEEDBACK');
  if (sheet.getLastRow() <= 1) return { total: 0, good: 0, bad: 0, goodRate: 0, topBadQueries: [], weeklyTrend: [] };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const total = data.length;
  const good = data.filter(r => r[2] === 'good').length;
  const bad = data.filter(r => r[2] === 'bad').length;

  const badByQuery = {};
  data.filter(r => r[2] === 'bad').forEach(r => {
    const preview = r[6] || 'Unknown';
    badByQuery[preview] = (badByQuery[preview] || 0) + 1;
  });
  const topBadQueries = Object.entries(badByQuery)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([query, count]) => ({ query, count }));

  const weeklyTrend = [];
  const now = new Date();
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - (w + 1) * 7);
    const weekEnd = new Date(now); weekEnd.setDate(now.getDate() - w * 7);
    const weekData = data.filter(r => {
      const d = new Date(r[0]);
      return d >= weekStart && d < weekEnd;
    });
    weeklyTrend.push({
      week: `W-${w}`,
      total: weekData.length,
      good: weekData.filter(r => r[2] === 'good').length,
      bad: weekData.filter(r => r[2] === 'bad').length,
    });
  }

  return { total, good, bad, goodRate: total > 0 ? Math.round(good / total * 100) : 0, topBadQueries, weeklyTrend };
}

function getTroLy35FeedbackInsights_() {
  const sheet = getSheet_('TROLY35_FEEDBACK');
  if (sheet.getLastRow() <= 1) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const badEntries = data.filter(r => r[2] === 'bad');
  if (badEntries.length === 0) return [];

  const reasonCounts = {};
  badEntries.forEach(r => {
    const reason = r[8] || 'Không rõ';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });

  return Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count, rate: Math.round(count / badEntries.length * 100) }));
}
