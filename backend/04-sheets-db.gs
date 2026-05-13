/**
 * ============================================================
 * MODULE: GOOGLE SHEETS DATABASE
 * Lưu trữ và truy xuất dữ liệu
 * ============================================================
 */

/**
 * Khởi tạo cấu trúc các sheet (chạy 1 lần khi setup)
 */
function initializeSheets() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  
  // Sheet TIN_TUC
  createSheetIfNotExists(ss, 'TIN_TUC', [
    'Ngày', 'Tiêu đề', 'Tóm tắt', 'Chủ đề', 
    'Ưu tiên', 'Thông điệp', 'Nguồn', 'Link', 'Từ khóa', 'Đã gửi'
  ]);
  
  // Sheet DANG_KY
  createSheetIfNotExists(ss, 'DANG_KY', [
    'Email', 'Họ tên', 'Đơn vị', 'Chủ đề quan tâm', 
    'Kênh nhận', 'Telegram Username', 'Ngày đăng ký', 'Trạng thái'
  ]);
  
  // Sheet THONG_KE
  createSheetIfNotExists(ss, 'THONG_KE', [
    'Ngày', 'Số bài tin', 'Email đã gửi', 'Tỷ lệ mở', 
    'Lượt đọc Web', 'Lượt làm Quiz', 'Đăng ký mới'
  ]);
  
  // Sheet PHAN_BAC
  createSheetIfNotExists(ss, 'PHAN_BAC', [
    'Ngày tạo', 'Chủ đề', 'Luận điệu sai trái', 
    'Luận điểm phản bác', 'Bằng chứng', 'Nguồn'
  ]);
  
  // Sheet QUIZ
  createSheetIfNotExists(ss, 'QUIZ', [
    'ID', 'Câu hỏi', 'Đáp án A', 'Đáp án B', 
    'Đáp án C', 'Đáp án D', 'Đáp án đúng', 'Giải thích', 'Chủ đề'
  ]);
  
  // Sheet QUIZ_RESULT
  createSheetIfNotExists(ss, 'QUIZ_RESULT', [
    'Thời gian', 'Người làm', 'Đơn vị', 'Điểm', 'Tổng câu', 'Chi tiết'
  ]);
  
  Logger.log('✅ Đã khởi tạo đầy đủ cấu trúc Sheets');
}

/**
 * Tạo sheet nếu chưa tồn tại
 */
function createSheetIfNotExists(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
         .setBackground('#c0392b')
         .setFontColor('white')
         .setFontWeight('bold');
    sheet.setFrozenRows(1);
    Logger.log(`✅ Đã tạo sheet: ${name}`);
  }
  
  return sheet;
}

/**
 * Lưu các bài viết đã xử lý vào sheet TIN_TUC
 */
function saveArticlesToSheet(articles) {
  if (articles.length === 0) return;
  
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('TIN_TUC');
  const today = new Date();
  
  const rows = articles.map(a => [
    today,
    a.title,
    a.summary,
    a.category,
    a.priority,
    a.message,
    a.source,
    a.link,
    (a.keywords || []).join(', '),
    'Chưa'
  ]);
  
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
         .setValues(rows);
  }
  
  Logger.log(`[Sheets] Đã lưu ${rows.length} bài vào TIN_TUC`);
}

/**
 * Lấy danh sách người đăng ký theo kênh và chủ đề
 */
function getSubscribers(channel, topic) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('DANG_KY');
  
  if (sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  
  return data.filter(row => {
    const userChannel = row[4]; // Kênh nhận
    const userTopics = row[3];  // Chủ đề quan tâm
    const status = row[7];      // Trạng thái
    
    if (status !== 'Hoạt động') return false;
    if (channel && !userChannel.toString().toLowerCase().includes(channel.toLowerCase())) return false;
    if (topic && userTopics !== 'Tất cả' && !userTopics.toString().includes(topic)) return false;
    
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
 * Thêm người đăng ký mới
 */
function addSubscriber(data) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('DANG_KY');
  
  // Check trùng email
  if (sheet.getLastRow() > 1) {
    const emails = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    if (emails.includes(data.email)) {
      return { success: false, message: 'Email đã đăng ký trước đó' };
    }
  }
  
  sheet.appendRow([
    data.email,
    data.name,
    data.organization,
    data.topics || 'Tất cả',
    data.channel || 'Email',
    data.telegramUsername || '',
    new Date(),
    'Hoạt động'
  ]);
  
  return { success: true, message: 'Đăng ký thành công!' };
}

/**
 * Lấy bài viết của ngày hôm nay
 */
function getTodayArticles() {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('TIN_TUC');
  
  if (sheet.getLastRow() <= 1) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  
  return data
    .filter(row => {
      const rowDate = new Date(row[0]);
      rowDate.setHours(0, 0, 0, 0);
      return rowDate.getTime() === today.getTime();
    })
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
 * Lấy câu hỏi quiz ngẫu nhiên
 */
function getRandomQuiz(count = 1) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('QUIZ');
  
  if (sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  
  // Trộn ngẫu nhiên
  const shuffled = data.sort(() => Math.random() - 0.5);
  
  return shuffled.slice(0, count).map(row => ({
    id: row[0],
    question: row[1],
    options: {
      A: row[2],
      B: row[3],
      C: row[4],
      D: row[5]
    },
    correct: row[6],
    explanation: row[7],
    category: row[8]
  }));
}

/**
 * Lưu kết quả làm quiz
 */
function saveQuizResult(data) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('QUIZ_RESULT');
  sheet.appendRow([
    new Date(),
    data.user,
    data.organization,
    data.score,
    data.total,
    JSON.stringify(data.details || {})
  ]);
}

/**
 * Cập nhật thống kê hàng ngày
 */
function updateDailyStats(stats) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('THONG_KE');
  sheet.appendRow([
    new Date(),
    stats.articlesCount || 0,
    stats.emailsSent || 0,
    stats.openRate || '0%',
    stats.webVisits || 0,
    stats.quizAttempts || 0,
    stats.newSubscribers || 0
  ]);
}

/**
 * Lấy danh sách luận điểm phản bác
 */
function getRebuttals(searchKeyword) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('PHAN_BAC');
  
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
    const kw = searchKeyword.toLowerCase();
    results = results.filter(r => 
      r.topic.toLowerCase().includes(kw) || 
      r.rebuttal.toLowerCase().includes(kw)
    );
  }
  
  return results;
}

/**
 * Lưu luận điểm phản bác mới
 */
function saveRebuttal(data) {
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('PHAN_BAC');
  sheet.appendRow([
    new Date(),
    data.topic,
    data.wrongClaim,
    data.rebuttal,
    (data.evidence || []).join('\n'),
    (data.sources || []).join('\n')
  ]);
}
