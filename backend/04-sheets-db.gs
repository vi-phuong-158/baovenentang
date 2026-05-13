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
  QUIZ: [
    'ID', 'Câu hỏi', 'Đáp án A', 'Đáp án B',
    'Đáp án C', 'Đáp án D', 'Đáp án đúng', 'Giải thích', 'Chủ đề'
  ],
  QUIZ_RESULT: [
    'Thời gian', 'Người làm', 'Đơn vị', 'Điểm', 'Tổng câu', 'Chi tiết'
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
  Logger.log(`[Sheets] Đã lưu ${rows.length} bài vào TIN_TUC`);
  return rows.length;
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

  if (!email || !isValidEmail_(email)) {
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
 * Lấy danh sách luận điểm phản bác.
 */
function getRebuttals(searchKeyword) {
  const sheet = getSheet_('PHAN_BAC');

  if (sheet.getLastRow() <= 1) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  let results = data.map(row => ({
    date: row[0],
    topic: row[1],
    wrongClaim: row[2],
    rebuttal: row[3],
    evidence: row[4],
    sources: row[5]
  }));

  if (searchKeyword) {
    const keyword = searchKeyword.toString().toLowerCase();
    results = results.filter(item =>
      (item.topic || '').toString().toLowerCase().includes(keyword) ||
      (item.rebuttal || '').toString().toLowerCase().includes(keyword)
    );
  }

  return results;
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

function cleanValue_(value) {
  return value === undefined || value === null ? '' : value.toString().trim();
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
