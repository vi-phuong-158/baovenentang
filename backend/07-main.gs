/**
 * ============================================================
 * MAIN ENTRY POINT
 * - runDailyNewsBot(): Chạy tự động mỗi sáng (qua Trigger)
 * - doGet/doPost: Web App API cho frontend gọi
 * ============================================================
 */

/**
 * 🎯 HÀM CHÍNH - Chạy tự động mỗi 6h sáng
 * Quy trình: Crawl → Filter → AI → Save → Send
 */
function runDailyNewsBot() {
  const startTime = new Date();
  Logger.log('═══════════════════════════════════');
  Logger.log('🚀 TRỢ LÝ 35 - Bắt đầu chu trình hàng ngày');
  Logger.log(`Thời gian: ${startTime.toLocaleString('vi-VN')}`);
  Logger.log('═══════════════════════════════════');
  
  try {
    assertRequiredConfig_(REQUIRED_SHEET_CONFIG.concat(REQUIRED_GEMINI_CONFIG));

    // Bước 1: Crawl tin từ RSS và các nguồn HTML đã cấu hình
    Logger.log('\n📥 BƯỚC 1: Crawl nguồn tin');
    const rawArticles = fetchAllNewsSources();
    
    if (rawArticles.length === 0) {
      Logger.log('⚠️ Không có bài viết nào từ các nguồn đã cấu hình');
      return;
    }
    
    // Bước 2: Lọc theo từ khóa
    Logger.log('\n🔍 BƯỚC 2: Lọc theo từ khóa');
    const filtered = filterByKeywords(rawArticles);
    
    // Bước 3: Loại bài trùng
    Logger.log('\n🔄 BƯỚC 3: Loại bài trùng');
    const unique = removeDuplicates(filtered);
    
    if (unique.length === 0) {
      Logger.log('ℹ️ Không có bài mới nào hôm nay');
      return;
    }
    
    // Bước 4: Sắp xếp ưu tiên
    const sorted = sortArticles(unique);
    
    // Bước 5: AI tóm tắt và phân loại
    Logger.log('\n🤖 BƯỚC 4: Gemini AI xử lý');
    const enriched = summarizeWithGemini(sorted);
    
    // Bước 6: Lưu vào Sheets
    Logger.log('\n💾 BƯỚC 5: Lưu vào Sheets');
    saveArticlesToSheet(enriched);
    
    // Bước 7: Gửi Telegram
    Logger.log('\n📱 BƯỚC 6: Gửi Telegram');
    const topArticles = enriched.slice(0, CONFIG.MAX_ARTICLES_TELEGRAM);
    sendTelegramDailyDigest(topArticles);
    
    // Bước 8: Gửi Email
    Logger.log('\n📧 BƯỚC 7: Gửi Email');
    sendDailyEmailDigest(enriched);

    // Bước 8: Cập nhật thống kê
    Logger.log('\n📊 BƯỚC 8: Cập nhật thống kê');
    updateDailyStats({
      articlesCount: enriched.length,
      emailsSent: getSubscribers('Email').length,
      newSubscribers: 0
    });
    
    const duration = (new Date() - startTime) / 1000;
    Logger.log(`\n✅ HOÀN THÀNH! Thời gian: ${duration}s`);
    Logger.log('═══════════════════════════════════');
    
  } catch(error) {
    Logger.log(`\n❌ LỖI: ${error}`);
    Logger.log(error.stack);
    notifyAdminError(error);
  }
}

/**
 * Gửi email báo lỗi cho admin
 */
function notifyAdminError(error) {
  try {
    if (!hasRequiredConfig_(REQUIRED_BREVO_CONFIG) || isBlank_(CONFIG.ADMIN_EMAIL)) {
      Logger.log('Không gửi email báo lỗi vì thiếu cấu hình Brevo hoặc ADMIN_EMAIL');
      return;
    }

    sendEmailViaBrevo({
      toEmail: CONFIG.ADMIN_EMAIL,
      toName: 'Admin',
      subject: '❌ Trợ lý 35 - Lỗi hệ thống',
      htmlContent: `<h2>Lỗi xảy ra trong runDailyNewsBot</h2>
        <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
        <p><strong>Lỗi:</strong> ${error.toString()}</p>
        <pre>${error.stack || ''}</pre>`
    });
  } catch(e) {
    Logger.log('Không thể gửi email báo lỗi');
  }
}

// ============================================================
// WEB APP API - Cho phép frontend gọi qua HTTP
// ============================================================

/**
 * GET request - Trả về dữ liệu (tin tức, quiz, phản bác)
 */
function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || 'home';
  let result;
  
  try {
    switch(action) {
      case 'today':
        result = { success: true, data: getTodayArticles() };
        break;

      case 'articles':
        const days = parseInt(params.days, 10) || 1;
        const page = parseInt(params.page, 10) || 1;
        const limit = parseInt(params.limit, 10) || 20;
        result = { success: true, data: getArticles(days, page, limit) };
        break;

      case 'quiz':
        const count = parseInt(params.count, 10) || 10;
        result = { success: true, data: getRandomQuiz(count) };
        break;
        
      case 'search':
        const searchQuery = params.q || params.query || '';
        const searchPage = parseInt(params.page, 10) || 1;
        const searchLimit = parseInt(params.limit, 10) || 50;
        result = { success: true, data: searchArticles(searchQuery, searchPage, searchLimit) };
        break;

      case 'stats':
        result = { success: true, data: getStatistics() };
        break;

      case 'feedback_stats':
        validateApiToken_(params, e);
        result = { success: true, data: getTroLy35FeedbackStats_() };
        break;
        
      default:
        result = { 
          success: true, 
          message: 'Trợ lý 35 API',
          version: '1.0',
          endpoints: ['today', 'articles', 'search', 'quiz', 'stats'],
          postActions: ['subscribe', 'submit_quiz', 'troly35_run', 'troly35_rate', 'troly35_feedback', 'troly35_history', 'troly35_trends', 'bantin35_generate', 'bantin35_latest']
        };
    }
  } catch(error) {
    result = { success: false, error: error.toString() };
  }
  
  return jsonResponse_(result);
}

// ============================================================
// SECURITY - Authentication & Validation
// ============================================================

/**
 * Validate API token cho các endpoint nhạy cảm.
 * Token có thể gửi qua body/query `api_token`, header `X-Api-Token` hoặc Bearer token.
 */
function validateApiToken_(data, e) {
  const expected = cleanValue_(CONFIG.API_ACCESS_TOKEN);
  if (!expected) {
    throw new Error('Chưa cấu hình API_ACCESS_TOKEN.');
  }

  const payload = data || {};
  const authHeader = getRequestHeader_(e, 'Authorization');
  const bearerToken = authHeader.toLowerCase().indexOf('bearer ') === 0
    ? authHeader.substring(7)
    : '';
  const provided = cleanValue_(
    payload.api_token ||
    payload.apiToken ||
    getRequestHeader_(e, 'X-Api-Token') ||
    bearerToken ||
    (e && e.parameter && (e.parameter.api_token || e.parameter.apiToken))
  );

  if (!constantTimeEquals_(provided, expected)) {
    throw new Error('Token không hợp lệ.');
  }
}

/**
 * Validate Telegram webhook secret header.
 */
function validateTelegramWebhook_(e) {
  const secret = cleanValue_(CONFIG.TELEGRAM_WEBHOOK_SECRET);
  if (!secret) {
    throw new Error('Chưa cấu hình TELEGRAM_WEBHOOK_SECRET.');
  }

  const provided =
    getRequestHeader_(e, 'X-Telegram-Bot-Api-Secret-Token') ||
    (e && e.parameter && e.parameter.secret);

  if (!constantTimeEquals_(provided, secret)) {
    throw new Error('Telegram webhook secret không khớp.');
  }
}

function validateInput_(data, schema) {
  const payload = data || {};
  Object.keys(schema || {}).forEach(field => {
    const rule = schema[field] || {};
    const value = payload[field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      throw new Error(`${field} là bắt buộc.`);
    }

    if (value === undefined || value === null || value === '') return;

    if (rule.type && typeof value !== rule.type) {
      throw new Error(`${field} không đúng kiểu dữ liệu.`);
    }

    if (rule.maxLength && typeof value === 'string') {
      assertMaxLength_(value, rule.maxLength, rule.label || field);
    }
  });
}

/**
 * Validate input string length.
 */
function assertMaxLength_(value, maxLen, fieldName) {
  if (typeof value === 'string' && value.length > maxLen) {
    throw new Error(`${fieldName} vượt quá ${maxLen} ký tự.`);
  }
}

/**
 * POST request - Nhận dữ liệu (đăng ký, kết quả quiz, webhook Telegram)
 */
function doPost(e) {
  let result;

  try {
    const data = parsePostData_(e);

    // Telegram webhook — validate secret
    if (data.update_id) {
      validateTelegramWebhook_(e);
      if (data.message) {
        handleTelegramMessage(data.message);
      }
      return ContentService.createTextOutput('OK');
    }

    const action = data.action || ((e && e.parameter) ? e.parameter.action : '');

    switch(action) {
      case 'subscribe':
        validateApiToken_(data, e);
        validateInput_(data, {
          email: { type: 'string', required: true, maxLength: 254, label: 'Email' },
          name: { type: 'string', maxLength: 100, label: 'Tên' }
        });
        if (!validateEmail_(data.email)) throw new Error('Email không hợp lệ.');
        result = addSubscriber(data);
        if (result.success) {
          sendWelcomeEmail(result.subscriber);
        }
        break;

      case 'submit_quiz':
        validateApiToken_(data, e);
        saveQuizResult(data);
        result = { success: true, message: 'Đã lưu kết quả' };
        break;

      case 'troly35_run':
        validateInput_(data, {
          content: { type: 'string', required: true, maxLength: 5000, label: 'Nội dung' },
          topic: { type: 'string', maxLength: 200, label: 'Chủ đề' },
          sourceUrl: { type: 'string', maxLength: 500, label: 'URL nguồn' }
        });
        result = handleTroLy35Run(data);
        break;

      case 'troly35_rate':
        result = handleTroLy35Rate(data);
        break;

      case 'troly35_feedback':
        result = handleTroLy35Feedback(data);
        break;

      case 'troly35_history':
        result = handleTroLy35History(data);
        break;

      case 'troly35_trends':
        result = handleTroLy35Trends(data);
        break;

      case 'bantin35_generate':
        validateApiToken_(data, e);
        result = handleBanTin35Generate(data);
        break;

      case 'bantin35_latest':
        result = handleBanTin35Latest(data);
        break;

      case 'contact':
        validateApiToken_(data, e);
        validateInput_(data, {
          message: { type: 'string', required: true, maxLength: 2000, label: 'Tin nhắn' },
          name: { type: 'string', maxLength: 100, label: 'Tên' }
        });
        result = { success: true };
        break;

      default:
        result = { success: false, error: 'Action không hợp lệ' };
    }

  } catch(error) {
    result = { success: false, error: error.toString() };
  }

  return jsonResponse_(result);
}

function parsePostData_(e) {
  const contents = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  try {
    return JSON.parse(contents);
  } catch (err) {
    throw new Error('Dữ liệu gửi lên không phải JSON hợp lệ.');
  }
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function generateApiAccessToken() {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('API_ACCESS_TOKEN', token);
  Logger.log('Đã tạo API_ACCESS_TOKEN trong Script Properties.');
  return token;
}

function generateTelegramWebhookSecret() {
  const secret = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').substring(0, 16);
  PropertiesService.getScriptProperties().setProperty('TELEGRAM_WEBHOOK_SECRET', secret);
  Logger.log('Đã tạo TELEGRAM_WEBHOOK_SECRET trong Script Properties.');
  return secret;
}

/**
 * Lấy thống kê tổng quan
 */
function getStatistics() {
  const tinTucSheet = getSheet_('TIN_TUC');
  const dangKySheet = getSheet_('DANG_KY');
  const quizSheet = getSheet_('QUIZ_RESULT');
  
  return {
    totalArticles: Math.max(0, tinTucSheet.getLastRow() - 1),
    totalSubscribers: Math.max(0, dangKySheet.getLastRow() - 1),
    totalQuizAttempts: Math.max(0, quizSheet.getLastRow() - 1),
    lastUpdate: new Date().toLocaleString('vi-VN')
  };
}

// ============================================================
// SETUP - Chạy 1 lần khi bắt đầu
// ============================================================

/**
 * 🛠️ SETUP - Chạy hàm này 1 lần để khởi tạo hệ thống
 */
function setupSystem() {
  Logger.log('🛠️ Bắt đầu setup hệ thống...');
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG);
  
  // 1. Tạo cấu trúc sheets
  initializeSheets();
  
  // 2. Tạo trigger chạy hàng ngày + archive hàng tháng
  setupDailyTrigger();
  setupBanTin35Trigger();
  setupArchiveTrigger();
  
  // 3. Setup Telegram webhook (nếu đã có Web App URL)
  if (!isBlank_(CONFIG.WEB_APP_URL) && hasRequiredConfig_(REQUIRED_TELEGRAM_CONFIG)) {
    setTelegramWebhook();
  } else {
    Logger.log('ℹ️ Chưa set Telegram webhook vì thiếu WEB_APP_URL hoặc cấu hình Telegram');
  }

  logMissingOptionalConfig_();
  
  Logger.log('✅ Setup hoàn tất!');
  Logger.log('📌 Tiếp theo:');
  Logger.log('   1. Deploy Web App (Deploy > New deployment > Web app)');
  Logger.log('   2. Copy URL Web App vào Script Property WEB_APP_URL');
  Logger.log('   3. Chạy setTelegramWebhook() để kích hoạt bot');
  Logger.log('   4. Test bằng cách chạy testRun()');
}

/**
 * Tạo trigger chạy tự động hàng ngày
 */
function setupDailyTrigger() {
  // Xóa trigger cũ
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runDailyNewsBot') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Tạo trigger mới
  ScriptApp.newTrigger('runDailyNewsBot')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.RUN_HOUR)
    .create();

  Logger.log(`✅ Đã tạo trigger tin tức chạy lúc ${CONFIG.RUN_HOUR}h hàng ngày`);
}

/**
 * Tạo trigger archive tự động — chạy ngày 1 mỗi tháng lúc 2h sáng.
 * Gọi trong setupSystem() hoặc chạy thủ công 1 lần.
 */
function setupArchiveTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'runMonthlyArchive') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('runMonthlyArchive')
    .timeBased()
    .onMonthDay(1)
    .atHour(2)
    .create();

  Logger.log('✅ Đã tạo trigger archive chạy ngày 1 mỗi tháng lúc 2h sáng');
}

/**
 * Handler trigger — tự động chạy ngày 1 mỗi tháng.
 * Archive bài viết cũ hơn 6 tháng sang Spreadsheet backup riêng.
 */
function runMonthlyArchive() {
  Logger.log('📦 Bắt đầu archive bản tin cũ (> 6 tháng)...');
  try {
    assertRequiredConfig_(REQUIRED_SHEET_CONFIG);
    const result = archiveOldArticles();
    Logger.log(`✅ Archive hoàn tất — đã chuyển: ${result.archived} bài, còn lại: ${result.remaining} bài`);
    if (result.archiveUrl) Logger.log(`📄 Backup: ${result.archiveUrl}`);
  } catch (e) {
    Logger.log(`❌ Lỗi archive: ${e}`);
    notifyAdminError(e);
  }
}

/**
 * Chạy thủ công để kiểm tra archive (không cần chờ trigger tháng).
 */
function runArchiveNow() {
  runMonthlyArchive();
}

/**
 * Tạo trigger riêng cho Bản tin 35 (chạy sau runDailyNewsBot 2 tiếng)
 */
function setupBanTin35Trigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runBanTin35DailyStep') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  const hour = Number(CONFIG.BANTIN35_RUN_HOUR) || (Number(CONFIG.RUN_HOUR) + 2) || 8;
  ScriptApp.newTrigger('runBanTin35DailyStep')
    .timeBased()
    .everyDays(1)
    .atHour(hour)
    .create();

  Logger.log(`✅ Đã tạo trigger Bản tin 35 chạy lúc ${hour}h hàng ngày`);
}

function logMissingOptionalConfig_() {
  const checks = [
    { name: 'Gemini AI', keys: REQUIRED_GEMINI_CONFIG },
    { name: 'Pinecone RAG', keys: REQUIRED_PINECONE_CONFIG },
    { name: 'Trợ lý 35', keys: REQUIRED_TROLY35_CONFIG },
    { name: 'Telegram', keys: REQUIRED_TELEGRAM_CONFIG.concat(['WEB_APP_URL']) },
    { name: 'Brevo Email', keys: REQUIRED_BREVO_CONFIG.concat(['ADMIN_EMAIL']) }
  ];

  checks.forEach(check => {
    const missing = getMissingConfigKeys_(check.keys);
    if (missing.length > 0) {
      Logger.log(`⚠️ ${check.name} chưa đủ cấu hình: ${missing.join(', ')}`);
    }
  });
}

/**
 * 🧪 TEST - Chạy thử để kiểm tra hệ thống
 */
function testRun() {
  Logger.log('🧪 Bắt đầu test...');
  
  try {
    // Test 1: Kéo nguồn tin
    Logger.log('\n--- Test 1: News Sources Crawler ---');
    const articles = fetchAllNewsSources();
    Logger.log(`Kéo được ${articles.length} bài`);
    
    if (articles.length > 0) {
      Logger.log(`Bài đầu: ${articles[0].title}`);
    }
    
    // Test 2: Gemini
    Logger.log('\n--- Test 2: Gemini AI ---');
    const filtered = filterByKeywords(articles.slice(0, 3));
    if (!hasRequiredConfig_(REQUIRED_GEMINI_CONFIG)) {
      Logger.log('Bỏ qua Gemini test vì thiếu GEMINI_API_KEY');
    } else if (filtered.length > 0) {
      const summary = summarizeWithGemini(filtered);
      Logger.log(`Tóm tắt: ${JSON.stringify(summary[0])}`);
    }
    
    // Test 3: Telegram (chỉ gửi 1 tin test)
    Logger.log('\n--- Test 3: Telegram ---');
    if (!hasRequiredConfig_(REQUIRED_TELEGRAM_CONFIG)) {
      Logger.log('Bỏ qua Telegram test vì thiếu TELEGRAM_TOKEN hoặc TELEGRAM_CHANNEL');
    } else if (filtered.length > 0) {
      sendTelegramMessage(
        CONFIG.TELEGRAM_CHANNEL, 
        '🧪 *Test*: Đây là tin nhắn kiểm tra từ Trợ lý 35'
      );
    }
    
    Logger.log('\n✅ Test hoàn tất!');
    
  } catch(e) {
    Logger.log(`❌ Lỗi test: ${e}`);
  }
}

/**
 * Tạo dữ liệu mẫu cho Quiz và Phản bác (chạy 1 lần)
 */
function seedSampleData() {
  // Sample Quiz
  const quizSheet = getSheet_('QUIZ');
  const sampleQuizzes = [
    [
      'Q001',
      'Đại hội đại biểu toàn quốc lần thứ XIV của Đảng Cộng sản Việt Nam dự kiến tổ chức vào năm nào?',
      '2024', '2025', '2026', '2027',
      'C',
      'Đại hội XIV dự kiến tổ chức đầu năm 2026',
      'Chính trị'
    ],
    [
      'Q002',
      'Văn kiện nào quan trọng nhất trong việc bảo vệ nền tảng tư tưởng của Đảng?',
      'Nghị quyết 35-NQ/TW',
      'Nghị quyết 04-NQ/TW',
      'Nghị quyết 26-NQ/TW',
      'Nghị quyết 06-NQ/TW',
      'A',
      'Nghị quyết 35-NQ/TW ngày 22/10/2018 của Bộ Chính trị về tăng cường bảo vệ nền tảng tư tưởng của Đảng',
      'Tư tưởng'
    ],
    [
      'Q003',
      'Ai là Tổng Bí thư đầu tiên của Đảng Cộng sản Việt Nam?',
      'Trần Phú',
      'Hồ Chí Minh',
      'Lê Hồng Phong',
      'Trường Chinh',
      'A',
      'Đồng chí Trần Phú là Tổng Bí thư đầu tiên (1930)',
      'Lịch sử Đảng'
    ]
  ];
  
  sampleQuizzes.forEach(q => quizSheet.appendRow(q));
  
  // Sample Phản bác
  const rebuttalSheet = getSheet_('PHAN_BAC');
  const sampleRebuttals = [
    [
      new Date(),
      'Vai trò lãnh đạo của Đảng',
      'Một số quan điểm cho rằng cần "đa nguyên đa đảng" để có dân chủ',
      'Đảng Cộng sản Việt Nam là lực lượng duy nhất có đủ uy tín, năng lực và bản lĩnh chính trị để lãnh đạo cách mạng. Lịch sử đã chứng minh, dưới sự lãnh đạo của Đảng, dân tộc ta đã giành độc lập, thống nhất và phát triển. Đa đảng không đồng nghĩa với dân chủ thực chất.',
      'Hiến pháp 2013 - Điều 4\nThực tiễn 95 năm lãnh đạo của Đảng\nNghị quyết Trung ương 4 khóa XII',
      'Báo Nhân Dân, Tạp chí Cộng sản'
    ]
  ];
  
  sampleRebuttals.forEach(r => rebuttalSheet.appendRow(r));

  seedTroLy35KnowledgeFromPhanBac();
  
  Logger.log('✅ Đã tạo dữ liệu mẫu');
}

/**
 * Thêm 150 câu hỏi Nghị quyết XIV (chạy 1 lần)
 * Nguồn: hoc-nghi-quyet/src/data/quiz.json
 */
function seedNghiQuyetXIVQuiz() {
  const sheet = getSheet_('QUIZ');
  const existing = sheet.getDataRange().getValues().map(r => r[0]);
  if (existing.includes('NQ001')) {
    Logger.log('⚠️ Dữ liệu NQ đã tồn tại, bỏ qua.');
    return;
  }
  const T = 'Nghị quyết XIV';
  const rows = [
    ['NQ001','Đại hội đại biểu toàn quốc lần thứ XIV của Đảng được tổ chức vào thời gian nào?','Từ ngày 15 đến 20/01/2026.','Từ ngày 19 đến 23/01/2026.','Từ ngày 20 đến 25/01/2026.','Từ ngày 18 đến 22/01/2026.','B','',T],
    ['NQ002','Đại hội XIV của Đảng đánh dấu bước chuyển quan trọng nào trong giai đoạn phát triển của đất nước?','Từ ổn định chính trị sang phát triển kinh tế thị trường.','Từ hội nhập khu vực sang hội nhập toàn cầu.','Từ "tạo nền tảng phát triển" sang "phát triển bứt phá" trong kỷ nguyên mới.','Từ công nghiệp hóa sang hiện đại hóa.','C','',T],
    ['NQ003','Một trong những mục tiêu chiến lược được Đại hội XIV của Đảng xác định đến năm 2045 là gì?','Trở thành nước đang phát triển có thu nhập trung bình.','Trở thành nước công nghiệp theo hướng hiện đại.','Trở thành nước phát triển, thu nhập cao theo định hướng xã hội chủ nghĩa.','Trở thành trung tâm tài chính của khu vực Đông Nam Á.','C','',T],
    ['NQ004','Phương châm Đại hội XIV của Đảng là:','Đoàn kết - Dân chủ - Kỷ cương - Đột phá - Phát triển.','Đoàn kết - Dân chủ - Đột phá - Kỷ cương - Phát triển.','Đoàn kết - Đột phá - Dân chủ - Kỷ cương - Phát triển.','Đoàn kết - Phát triển - Đột phá - Dân chủ - Kỷ cương.','A','',T],
    ['NQ005','Đại hội XIV xác định mấy "kiên định" về chính trị, tư tưởng làm định hướng chiến lược của toàn Đảng?','2','3','4','5','C','',T],
    ['NQ006','Trong Văn kiện Đại hội XIV, Đảng ta xác định lĩnh vực nào là động lực trung tâm của phát triển?','Quốc phòng - An ninh - Đối ngoại.','Khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số.','Văn hóa và con người Việt Nam.','Xây dựng Đảng.','B','',T],
    ['NQ007','Đại hội XIV xác định lĩnh vực nào là nền tảng tinh thần của xã hội, sức mạnh nội sinh, nguồn lực và động lực phát triển của đất nước?','Khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số.','Kinh tế thị trường định hướng xã hội chủ nghĩa.','Xây dựng Đảng và hệ thống chính trị.','Văn hóa và con người.','D','',T],
    ['NQ008','Văn kiện Đại hội XIV xác định yếu tố nào là "điểm nghẽn của điểm nghẽn" nhưng cũng là "đột phá của đột phá"?','Khoa học và công nghệ.','Phát triển nguồn nhân lực chất lượng cao.','Thể chế.','Kết cấu hạ tầng giao thông.','C','',T],
    ['NQ009','Đại hội XIV của Đảng xác định mục tiêu tổng quát phát triển đất nước trong giai đoạn tới nhằm xây dựng?','Một nước Việt Nam độc lập, dân chủ.','Một nước Việt Nam xã hội chủ nghĩa hòa bình, độc lập, dân chủ, giàu mạnh, phồn vinh, văn minh, hạnh phúc.','Một nước Việt Nam giàu mạnh, văn minh, hạnh phúc.','Một nước Việt Nam văn minh.','B','',T],
    ['NQ010','Văn kiện Đại hội XIV xác định công tác nào là "then chốt của then chốt"?','Công tác cán bộ.','Công tác xây dựng Đảng.','Công tác kiểm tra, giám sát.','Công tác thi đua - khen thưởng.','A','',T],
    ['NQ011','Theo Văn kiện Đại hội XIV của Đảng, việc xác lập mô hình tăng trưởng mới, đẩy mạnh công nghiệp hóa, hiện đại hóa dựa trên động lực chính nào?','Khai thác tối đa tài nguyên thiên nhiên và sử dụng lao động giá rẻ.','Dựa hoàn toàn vào vốn đầu tư trực tiếp nước ngoài (FDI) và xuất khẩu.','Khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số.','Tập trung vào việc mở rộng quy mô các doanh nghiệp nhà nước trong mọi lĩnh vực.','C','',T],
    ['NQ012','Đại hội XIV xác định loại hình kinh tế nào là một động lực quan trọng nhất của nền kinh tế?','Kinh tế nhà nước.','Kinh tế tư nhân.','Kinh tế tập thể.','Kinh tế có vốn đầu tư nước ngoài.','B','',T],
    ['NQ013','Tại Đại hội XIV, Đảng ta dự báo tình hình thế giới trong giai đoạn mới như thế nào?','Đơn cực ổn định lâu dài.','Song cực rõ rệt.','Chuyển biến nhanh, phức tạp chưa từng có theo hướng đa cực, đa trung tâm, đa tầng, phân mảnh và phân tuyến mạnh.','Không còn cạnh tranh chiến lược giữa các nước lớn.','C','',T],
    ['NQ014','Tại Đại hội XIV, Đảng ta dự báo tình hình khu vực châu Á - Thái Bình Dương và Ấn Độ Dương trong giai đoạn mới như thế nào?','Tiếp tục là trung tâm phát triển năng động, song cũng là khu vực trọng điểm cạnh tranh chiến lược giữa các nước lớn.','Là trung tâm phát triển mới.','Là khu vực trọng điểm thế giới.','Là khu vực phát triển mạnh mẽ.','A','',T],
    ['NQ015','Tại Đại hội XIV, Đảng ta nhận định cơ đồ của đất nước sau 40 năm đổi mới như thế nào?','Cơ đồ và uy tín quốc tế được mở rộng.','Cơ đồ phát triển mạnh mẽ, nhiều thành tựu có ý nghĩa lịch sử.','Cơ đồ tươi sáng.','Cơ đồ, tiềm lực, vị thế và uy tín quốc tế của đất nước được nâng lên, là nền tảng quan trọng để đất nước vươn mình trong kỷ nguyên mới.','D','',T],
    ['NQ016','Nội dung nào sau đây không phải là một khâu đột phá chiến lược được nêu trong Nghị quyết Đại hội XIV của Đảng?','Đột phá mạnh mẽ về thể chế phát triển.','Tập trung chuyển đổi cơ cấu và nâng cao chất lượng nguồn nhân lực.','Tranh thủ tối đa hợp tác quốc tế.','Tiếp tục hoàn thiện đồng bộ và đột phá mạnh mẽ trong xây dựng kết cấu hạ tầng kinh tế - xã hội.','C','',T],
    ['NQ017','Chương trình hành động của Ban chấp hành Trung ương Đảng khóa XIV hướng đến xây dựng nền giáo dục quốc dân hiện đại, ngang tầm khu vực và thế giới nhấn mạnh nội dung nào sau đây?','Xây dựng cơ chế, chính sách đột phá và tập trung đầu tư phát triển một số cơ sở giáo dục đại học trở thành các trung tâm khoa học, công nghệ và đổi mới sáng tạo quốc gia ngang tầm các nước tiên tiến.','Xây dựng cơ chế, chính sách để Việt Nam là nước dẫn đầu ASEAN về giáo dục.','Xây dựng cơ chế, chính sách để giáo dục Việt Nam đạt vị thế trung bình khu vực.','Phát triển tập trung các cơ sở giáo dục nghề nghiệp đạt trình độ tương đương với khu vực và thế giới.','A','',T],
    ['NQ018','Điền vào chỗ trống cụm từ còn thiếu: "Nghiên cứu cơ chế tạo sự liên thông giữa khu vực công và khu vực tư; phát hiện, tuyển chọn, đào tạo cán bộ trẻ, cán bộ nữ, cán bộ người dân tộc, cán bộ khoa học kỹ thuật; triển khai cơ chế khuyến khích và bảo vệ cán bộ…… vì lợi ích chung"','Dám nghĩ, dám làm, tích cực đổi mới.','Đổi mới, sáng tạo, dám nghĩ, dám làm.','Đổi mới, sáng tạo.','Năng động, sáng tạo, dám chịu trách nhiệm.','B','',T],
    ['NQ019','Theo Chương trình hành động của Ban chấp hành Trung ương Đảng khóa XIV, phấn đấu đến năm nào môi trường kinh doanh của Việt Nam thuộc nhóm 3 quốc gia hàng đầu của ASEAN và nhóm 30 quốc gia hàng đầu thế giới?','2030','2035','2040','2045','A','',T],
    ['NQ020','Theo Nghị quyết Đại hội XIV, một trong những nhiệm vụ trọng tâm trong nhiệm kỳ Đại hội XIV được Đảng xác định là?','Phát triển văn hóa Việt Nam rực rỡ.','Phát triển kinh tế nhanh và bền vững.','Xây dựng Nhà nước pháp quyền.','Tiếp tục xây dựng Quân đội nhân dân, Công an nhân dân cách mạng, chính quy, tinh nhuệ, hiện đại, bảo vệ vững chắc độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ, biển, đảo của đất nước.','D','',T],
    ['NQ021','Theo Nghị quyết Đại hội XIV, nội dung nào không phải là đột phá chiến lược trong nhiệm kỳ Đại hội XIV?','Đột phá mạnh mẽ về thể chế phát triển.','Tập trung chuyển đổi cơ cấu và nâng cao chất lượng nguồn nhân lực.','Xây dựng Đảng trong sạch, vững mạnh toàn diện.','Tiếp tục hoàn thiện đồng bộ và đột phá mạnh mẽ trong xây dựng kết cấu hạ tầng kinh tế - xã hội.','C','',T],
    ['NQ022','Theo Nghị quyết Đại hội XIV, trong nền kinh tế thị trường định hướng xã hội chủ nghĩa, thành phần kinh tế nào giữ vai trò chủ đạo?','Kinh tế tư nhân.','Kinh tế nhà nước.','Kinh tế tập thể.','Kinh tế có vốn đầu tư nước ngoài.','B','',T],
    ['NQ023','Nghị quyết Đại hội XIV của Đảng xác định định hướng phát triển đất nước giai đoạn 2026 - 2030 gồm bao nhiêu nội dung?','9','10','11','12','D','',T],
    ['NQ024','Nghị quyết Đại hội XIV của Đảng xác định mấy quan điểm chỉ đạo?','3','4','5','6','C','',T],
    ['NQ025','Văn kiện Đại hội XIV của Đảng xác định mục tiêu phấn đấu đạt tốc độ tăng trưởng tổng sản phẩm trong nước (GDP) bình quân cho giai đoạn 2026 - 2030 là bao nhiêu %/năm trở lên?','7%/năm trở lên.','8%/năm trở lên.','9%/năm trở lên.','10%/năm trở lên.','D','',T],
    ['NQ026','Văn kiện Đại hội XIV của Đảng xác định mục tiêu phấn đấu đến năm 2030, GDP bình quân đầu người của nước ta đạt khoảng bao nhiêu USD/năm?','5.000 USD/năm.','7.500 USD/năm.','8.500 USD/năm.','10.000 USD/năm.','C','',T],
    ['NQ027','Tầm nhìn đến năm 2045, Đại hội XIV đặt mục tiêu Việt Nam trở thành?','Nước đang phát triển, có công nghiệp hiện đại, thu nhập trung bình cao.','Nước phát triển, có nền công nghiệp hiện đại.','Nước phát triển, thu nhập cao.','Nước đang phát triển, thu nhập cao.','C','',T],
    ['NQ028','Sau 40 năm đổi mới, bài học kinh nghiệm nào được Đảng ta xác định là "nhân tố quyết định mọi thắng lợi của công cuộc đổi mới, xây dựng và bảo vệ Tổ quốc"?','Quán triệt quan điểm "Dân là gốc".','Giữ vững và tăng cường vai trò lãnh đạo, cầm quyền và sức chiến đấu của Đảng Cộng sản Việt Nam.','Không ngừng đổi mới tư duy chiến lược.','Bám sát thực tiễn, tốn trọng quy luật khách quan.','B','',T],
    ['NQ029','Trong quan điểm "Dân là gốc", Đảng ta xác định Nhân dân giữ vai trò, vị trí nào?','Người chủ đất nước.','Là lực lượng quan trọng nhất.','Vai trò chủ thể, vị trí trung tâm.','Là mục tiêu, là động lực.','C','',T],
    ['NQ030','Trong Văn kiện Đại hội XIV, lý luận về đường lối đổi mới được hiểu là?','Là tổng thể các quan điểm, mục tiêu, tầm nhìn, định hướng phát triển đất nước và bảo vệ vững chắc Tổ quốc Việt Nam xã hội chủ nghĩa.','Là tầm nhìn, định hướng phát triển đất nước trong kỷ nguyên mới.','Là tổng thể các quan điểm, mục tiêu phát triển đất nước và bảo vệ vững chắc Tổ quốc Việt Nam xã hội chủ nghĩa.','Là tổng thể các quan điểm, mục tiêu bảo vệ vững chắc Tổ quốc Việt Nam xã hội chủ nghĩa.','A','',T],
    ['NQ031','Trong bốn nguy cơ mà Đảng đã chỉ ra trong Văn kiện Đại hội XIV, nguy cơ nào được xác định là nguy cơ bao trùm?','Nguy cơ tụt hậu, nhất là về công nghệ và rơi vào bẫy thu nhập trung bình.','Nguy cơ tụt hậu xa hơn về kinh tế.','Nguy cơ tham nhũng, lãng phí, tiêu cực.','Nguy cơ diễn biến hoà bình.','A','',T],
    ['NQ032','Văn kiện đại hội XIV của Đảng nêu mục tiêu phát triển 5 năm, từ năm 2026 - 2030 về chỉ số phát triển con người (HDI) đạt?','0,6 điểm.','0,7 điểm.','0,8 điểm.','0,9 điểm.','C','',T],
    ['NQ033','Để xây dựng, hoàn thiện đồng bộ thể chế phát triển nhanh và bền vững đất nước, Văn kiện Đại hội XIV của Đảng xác định thể chế nào là trọng tâm?','Chính trị.','An ninh.','Đối ngoại.','Kinh tế.','D','',T],
    ['NQ034','Văn kiện Đại hội XIV của Đảng xác định định hướng xây dựng và phát triển nền văn hóa Việt Nam như thế nào?','Nhân văn, khoa học, đại chúng.','Dân tộc, khoa học và đại chúng.','Tiên tiến, đậm đà bản sắc dân tộc, đồng bộ trên nền tảng hệ giá trị quốc gia, hệ giá trị văn hóa, hệ giá trị gia đình và chuẩn mực con người Việt Nam.','Dân tộc, dân chủ, nhân văn, khoa học và đại chúng.','C','',T],
    ['NQ035','Văn kiện Đại hội XIV của Đảng nêu quan điểm chỉ đạo xác định yếu tố trung tâm của đất nước trong kỷ nguyên mới là?','Phát triển văn hoá, con người.','Quốc phòng, an ninh, đối ngoại.','Phát triển kinh tế, xã hội, bảo vệ môi trường.','Xây dựng Đảng.','C','',T],
    ['NQ036','Trong Văn kiện Đại hội XIV, Đảng ta định hướng đến năm nào Việt Nam cơ bản không còn hộ nghèo và cơ bản miễn viện phí toàn dân?','2030','2035','2040','2045','A','',T],
    ['NQ037','Trong Văn kiện Đại hội XIV của Đảng về mục tiêu phát triển đến năm 2030, tỷ trọng kinh tế số nước ta phấn đấu đạt khoảng bao nhiêu phần trăm GDP?','20% GDP.','25% GDP.','30% GDP.','35% GDP.','C','',T],
    ['NQ038','Theo Văn kiện Đại hội XIV của Đảng, năm 2025, Việt Nam đã chính thức gia nhập nhóm nước có thu nhập ở mức nào?','Thu nhập trung bình thấp.','Thu nhập trung bình cao.','Thu nhập cao.','Thu nhập thấp.','B','',T],
    ['NQ039','Trong Văn kiện Đại hội XIV, Đảng ta xác định nhiệm vụ xây dựng Đảng về cán bộ cần tập trung vào?','Xây dựng đội ngũ cán bộ các cấp, trọng tâm là cấp chiến lược và cấp cơ sở, nhất là người đứng đầu.','Xây dựng đội ngũ cán bộ các cấp, trọng tâm là cấp chiến lược.','Xây dựng đội ngũ cán bộ các cấp, trọng tâm là cấp cơ sở.','Xây dựng đội ngũ cán bộ các cấp, nhất là người đứng đầu.','A','',T],
    ['NQ040','Mô hình kinh tế nào không được coi là mô hình kinh tế mới trong Văn kiện Đại hội XIV?','Kinh tế số.','Kinh tế xanh.','Kinh tế tuần hoàn.','Kinh tế có vốn đầu tư nước ngoài.','D','',T],
    ['NQ041','Trong 40 năm đổi mới, Việt Nam đã đảm nhiệm nhiều trọng trách quốc tế quan trọng trong tổ chức nào?','ASEAN và Liên hợp quốc.','WTO.','APEC.','OPEC.','A','',T],
    ['NQ042','Một trong những thành tựu cơ bản, bao trùm của nhiệm vụ bảo vệ Tổ quốc trong thời gian qua là gì?','Mở rộng liên minh quân sự với các nước lớn.','Giữ vững độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Tổ quốc.','Linh hoạt trong bảo vệ Tổ Quốc.','Mở rộng hợp tác bảo vệ Tổ quốc.','B','',T],
    ['NQ043','Một trong những nội dung quan trọng được đánh giá trong Báo cáo tổng kết 15 năm thi hành điều lệ Đảng (2011-2025) và đề xuất, định hướng bổ sung, sửa đổi điều lệ Đảng là?','Công tác kiểm tra, giám sát','Công tác ngoại giao','Công tác tài chính nhà nước','Công tác lập pháp','A','',T],
    ['NQ044','Theo Văn kiện Đại hội XIV của Đảng, tỉ lệ đảng viên so với tổng dân số Việt Nam hiện nay khoảng bao nhiêu?','4,8%.','5,0%.','5,4%.','6,0%.','C','',T],
    ['NQ045','Theo Báo cáo tổng kết một số vấn đề lý luận và thực tiễn về công cuộc đổi mới theo định hướng xã hội chủ nghĩa trong 40 năm qua, một trong những mối quan hệ lớn cần giải quyết tốt là mối quan hệ nào sau đây?','Quan hệ giữa kinh tế nhà nước và kinh tế tư nhân.','Quan hệ giữa đổi mới, ổn định và phát triển.','Quan hệ giữa kinh tế trong nước và kinh tế quốc tế','Quan hệ giữa Nhà nước và thị trường.','B','',T],
    ['NQ046','Theo Văn kiện đại hội XIV của Đảng, chủ trương nào được nhấn mạnh trong công tác cán bộ?','Công khai, minh bạch.','Có vào, có ra; có lên, có xuống.','Dân chủ, kỷ cương.','Trách nhiệm, hiệu quả.','B','',T],
    ['NQ047','Văn kiện Đại hội XIV của Đảng xác định nhiệm vụ đẩy mạnh chuyển đổi số trong công tác kiểm tra, giám sát đáp ứng yêu cầu gì?','Kiểm tra, giám sát trên dữ liệu.','Kiểm tra, giám sát thông qua giấy tờ, hội họp.','Kiểm tra, giám sát thông qua báo cáo.','Kiểm tra, giám sát thông qua khảo sát.','A','',T],
    ['NQ048','Theo Văn kiện Đại hội XIV của Đảng, xây dựng con người Việt Nam phát triển toàn diện cần đáp ứng những tiêu chí nào?','Trí tuệ, đạo đức, thể chất, thẩm mỹ.','Trí tuệ, đạo đức, thể chất, thẩm mỹ, năng lực sáng tạo, kỹ năng sống.','Trí tuệ, đạo đức, thể chất, thẩm mỹ, ý thức công dân, tuân thủ pháp luật.','Đạo đức, trí tuệ, ý thức dân tộc, trách nhiệm công dân, thượng tôn pháp luật, năng lực sáng tạo, thẩm mỹ, thể lực, kỹ năng sống, kỹ năng nghề nghiệp, kỹ năng số.','D','',T],
    ['NQ049','Theo Văn kiện Đại hội XIV, Đảng ta xác định tính chất của hoạt động đối ngoại và hội nhập quốc tế của Việt Nam là?','Sâu rộng, toàn diện, hiệu quả','Toàn diện, sâu rộng.','Sâu rộng, hiệu quả.','Hiệu quả, toàn diện.','A','',T],
    ['NQ050','Theo đánh giá của Đại hội XIV của Đảng, một hạn chế trong đội ngũ cán bộ hiện nay là gì?','Thiếu cán bộ trẻ tham gia quản lý.','Thiếu cán bộ lãnh đạo, quản lý giỏi, nhà khoa học và chuyên gia đầu ngành trên nhiều lĩnh vực.','Thiếu cán bộ làm việc trong khu vực nhà nước.','Thiếu cán bộ làm việc ở địa phương.','B','',T],
    ['NQ051','Theo Báo cáo tổng kết lý luận và thực tiễn về xây dựng chủ nghĩa xã hội ở Việt Nam, vai trò của Đảng Cộng sản Việt Nam được xác định là?','Lực lượng quản lý trực tiếp nền kinh tế.','Lực lượng lãnh đạo Nhà nước và xã hội.','Lực lượng đại diện cho giai cấp công nhân.','Lực lượng điều hành toàn bộ hoạt động của hệ thống chính trị.','B','',T],
    ['NQ052','Theo Văn kiện Đại hội XIV của Đảng, cơ chế vận hành của Nhà nước pháp quyền xã hội chủ nghĩa Việt Nam được xác định theo phương châm?','Đảng lãnh đạo, Nhà nước điều hành, Nhân dân tham gia.','Đảng lãnh đạo, Nhà nước quản lý, Nhân dân làm chủ.','Đảng lãnh đạo, Nhà nước tổ chức, Nhân dân thực hiện.','Đảng lãnh đạo, Nhà nước phục vụ, Nhân dân giám sát.','B','',T],
    ['NQ053','Theo Văn kiện Đại hội XIV của Đảng, một trong những nguyên nhân chủ quan làm hạn chế hiệu quả phát triển kinh tế thị trường định hướng xã hội chủ nghĩa ở nước ta là gì?','Nhận thức về nền kinh tế thị trường định hướng xã hội chủ nghĩa trên một số mặt còn chậm, chưa sâu sắc và thống nhất.','Nhận thức về nền kinh tế thị trường định hướng xã hội chủ nghĩa chưa đầy đủ và hoàn thiện.','Nhà nước không tham gia quản lý nền kinh tế thị trường','Nền kinh tế thị trường đã phát triển hoàn toàn tự do.','A','',T],
    ['NQ054','Theo Văn kiện Đại hội XIV của Đảng, xu thế nào của thế giới được xác định là "xu thế lớn nhưng sẽ đứng trước nhiều trở ngại, thách thức"?','Đa phương hóa.','Song phương và đa phương hóa.','Hòa bình, hợp tác.','Hòa bình, hợp tác và phát triển.','D','',T],
    ['NQ055','Chủ trương nào được nhấn mạnh trong triển khai các chính sách xã hội trong Văn kiện Đại hội XIV của Đảng?','Chuyển đổi số.','Kinh tế số, kinh tế tri thức.','"Không để ai bị bỏ lại phía sau".','Không để ai bị thiệt thòi.','C','',T],
    ['NQ056','Theo Văn kiện Đại hội XIV của Đảng, yếu tố nào được dự báo sẽ ngày càng ảnh hưởng lớn đến phát triển kinh tế, an ninh, xung đột và niềm tin giữa các quốc gia?','Dân chủ.','Văn hóa.','Công nghệ.','Khoa học, công nghệ.','B','',T],
    ['NQ057','Theo định hướng của Đại hội XIV của Đảng, nền giáo dục Việt Nam phấn đấu đạt trình độ tiên tiến trong khu vực, thuộc nhóm bao nhiêu quốc gia có hệ thống giáo dục đại học tốt nhất châu Á?','5.','10.','15.','20.','B','',T],
    ['NQ058','Theo Văn kiện Đại hội XIV của Đảng, mục tiêu xây dựng Nhà nước pháp quyền xã hội chủ nghĩa Việt Nam được xác định với những đặc điểm nào sau đây?','Vững mạnh, hoạt động hiệu quả.','Tinh gọn, vững mạnh, hoạt động hiệu quả.','Tinh gọn, vững mạnh, hoạt động hiệu lực, hiệu quả.','Tinh gọn, trong sạch, vững mạnh, hoạt động hiệu lực, hiệu quả.','D','',T],
    ['NQ059','Theo Văn kiện Đại hội XIV của Đảng, văn hóa được xác định là mục tiêu, nguồn lực nội sinh và động lực to lớn, đồng thời là gì đối với sự phát triển nhanh và bền vững của đất nước?','Hệ điều hành.','Hệ tiêu chí.','Hệ đánh giá.','Hệ điều tiết.','D','',T],
    ['NQ060','Nội dung nào được Đảng ta nhấn mạnh trong đột phá phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số quốc gia trong Văn kiện Đại hội XIV?','Xây dựng và triển khai các khung khổ pháp lý, cơ chế, chính sách thử nghiệm, thí điểm vượt trội trong khoa học, công nghệ và đổi mới sáng tạo.','Xây dựng mạng lưới đổi mới sáng tạo quy mô lớn.','Xây dựng và triển khai các khung chính sách thử nghiệm mới.','Xây dựng cơ chế đặt hàng khoa học.','A','',T],
    ['NQ061','Đại hội XIV được xác định là dấu mốc quan trọng nào của cách mạng Việt Nam?','Kết thúc giai đoạn quá độ lên chủ nghĩa xã hội.','Mở ra kỷ nguyên mới: Kỷ nguyên vươn mình của dân tộc.','Hoàn thành mục tiêu công nghiệp hóa, hiện đại hóa.','Trở thành nước phát triển có thu nhập cao ngay trong năm 2030.','B','',T],
    ['NQ062','Chủ đề của Đại hội XIV nhấn mạnh vào yếu tố trọng tâm nào?','Phát triển kinh tế nhanh, bền vững.','Tự chủ chiến lược, tự cường, tự tin.','Mở rộng quan hệ đối ngoại đa phương hóa.','Tập trung hoàn thiện hạ tầng số.','B','',T],
    ['NQ063','Mục tiêu 100 năm được Đảng ta nhấn mạnh trong Văn kiện Đại hội XIV là gì?','100 năm thành lập Đảng (1930 - 2030) và 100 năm thành lập Nước (1945 - 2045).','100 năm thành lập Đảng (1930 - 2030).','100 năm thành lập Nước (1945 - 2045).','100 năm ngày bầu cử Quốc hội đầu tiên.','A','',T],
    ['NQ064','"Kỷ nguyên mới" được xác định bắt đầu từ dấu mốc nào?','Sau khi hoàn thành kế hoạch 5 năm 2021 - 2025.','Từ Đại hội XIV của Đảng.','Khi Việt Nam trở thành nước có thu nhập cao.','Sau khi hoàn thành đường sắt tốc độ cao Bắc - Nam.','B','',T],
    ['NQ065','Đâu không phải là bài học kinh nghiệm được Đảng ta nhấn mạnh trong Văn kiện Đại hội XIV?','Kiên định, vận dụng và phát triển sáng tạo chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh.','Giữ vững và tăng cường vai trò lãnh đạo, cầm quyền và sức chiến đấu của Đảng Cộng sản Việt Nam.','Quán triệt sâu sắc và thực hành triệt để quan điểm "Dân là gốc".','Phát triển kinh tế là trung tâm.','D','',T],
    ['NQ066','Trong hệ giá trị "Tự chủ, tự tin, tự lực, tự cường, tự hào dân tộc", "Tự chủ" được hiểu chủ yếu trên phương diện nào?','Tự quyết định chi tiêu ngân sách địa phương.','Tự chủ về đường lối, quyết sách chiến lược, không lệ thuộc vào bên ngoài.','Tự do hoạt động không cần tuân thủ pháp luật quốc tế.','Tự sản xuất toàn bộ hàng hóa tiêu dùng trong nước.','B','',T],
    ['NQ067','Giá trị "Tự tin" trong Văn kiện Đại hội XIV hướng tới điều gì?','Tự tin vào sức mạnh quân sự tuyệt đối.','Tự tin vào cơ đồ, tiềm lực, vị thế, uy tín đất nước và con đường đi lên chủ nghĩa xã hội.','Tự tin rằng Việt Nam đã là nước phát triển nhất khu vực.','Tự tin vào việc vay vốn quốc tế dễ dàng.','B','',T],
    ['NQ068','Trong Văn kiện Đại hội XIV, Đảng ta xác định hoàn thiện thể chế nhằm thực hiện nhiệm vụ gì?','Nâng cao năng lực tự chủ của nền kinh tế và hiệu quả hội nhập kinh tế quốc tế, sức mạnh tổng hợp và nâng cao năng lực cạnh tranh của nền kinh tế.','Phát huy nội lực của đất nước, sức mạnh của khối đại đoàn kết toàn dân tộc.','Kết hợp sức mạnh dân tộc và sức mạnh thời đại.','Phát huy cao nhất lợi ích quốc gia - dân tộc.','A','',T],
    ['NQ069','"Tự hào dân tộc" được đưa vào hệ giá trị tinh thần nhằm?','Phê phán văn hóa của các quốc gia khác.','Khơi dậy khát vọng cống hiến, tạo động lực tinh thần to lớn cho mọi người dân.','Tập trung quảng bá du lịch quốc gia.','Hạn chế việc người dân đi lao động tại nước ngoài.','B','',T],
    ['NQ070','Công tác kiểm tra của tổ chức đảng đối với việc tu dưỡng, rèn luyện đạo đức, lối sống của cán bộ, đảng viên được thực hiện với tinh thần như thế nào?','Thận trọng, từng bước.','Quyết liệt, "không ngừng, không nghỉ", "không chùng xuống".','Linh hoạt theo từng địa phương.','Thực hiện khi có vi phạm.','B','',T],
    ['NQ071','Quan điểm mới về quản lý nhà nước trong kỷ nguyên mới được Đại hội XIV nhấn mạnh là gì?','Tăng cường kiểm soát bằng các thủ tục hành chính.','Đổi mới tư duy từ quản lý sang quản trị, kiến tạo phát triển vùng.','Tập trung quyền lực tuyệt đối vào các cơ quan Trung ương.','Hạn chế quyền tự quyết của các địa phương.','B','',T],
    ['NQ072','Phương châm chỉ đạo mới trong Văn kiện Đại hội XIV về việc phân cấp, phân quyền là gì?','Trung ương quyết định, địa phương báo cáo.','Địa phương quyết, địa phương làm, địa phương chịu trách nhiệm.','Bộ ngành hướng dẫn, địa phương chờ phê duyệt.','Chia nhỏ nguồn lực cho tất cả các tỉnh, thành.','B','',T],
    ['NQ073','Đâu là cuộc cách mạng mang tính lịch sử được Đảng ta nhấn mạnh trong Văn kiện Đại hội XIV?','Cách mạng nông nghiệp xanh.','Cách mạng chuyển đổi số.','Cách mạng công nghiệp nặng.','Đổi mới, sắp xếp, tinh gọn tổ chức bộ máy và đơn vị hành chính.','D','',T],
    ['NQ074','Văn kiện Đại hội XIV của Đảng chủ trương phát triển hệ thống đổi mới sáng tạo quốc gia, hệ sinh thái khởi nghiệp sáng tạo với vai trò của các chủ thể liên quan là gì?','Doanh nghiệp là trung tâm, viện nghiên cứu và trường đại học là chủ thể nghiên cứu mạnh, Nhà nước đóng vai trò kiến tạo.','Doanh nghiệp đóng vai trò kiến tạo.','Nhà nước đóng vai trò trung tâm.','Viện nghiên cứu và trường đại học là trung tâm.','A','',T],
    ['NQ075','Đại hội XIV xác định công tác nào được đặt ngang hàng với phòng, chống tham nhũng, tiêu cực trong giai đoạn tới?','Công tác thi đua khen thưởng.','Công tác phòng, chống lãng phí.','Công tác lễ tân đối ngoại.','Công tác thông tin tuyên truyền.','B','',T],
    ['NQ076','Mục tiêu của việc sắp xếp tổ chức bộ máy của hệ thống chính trị theo quan điểm của Đại hội XIV là gì?','Tăng thêm các đầu mối để chuyên môn hóa sâu.','Tinh - Gọn - Mạnh - Hiệu năng - Hiệu lực - Hiệu quả.','Giữ nguyên số lượng biên chế để ổn định xã hội.','Thành lập thêm các cấp quản lý trung gian.','B','',T],
    ['NQ077','Công tác xây dựng Đảng trong giai đoạn tới được Đại hội XIV xác định đặt trọng tâm vào yếu tố nào?','Chỉ tập trung vào số lượng đảng viên.','Nâng cao năng lực lãnh đạo, năng lực cầm quyền và sức chiến đấu của Đảng.','Mở rộng quy mô các chi bộ cơ sở.','Giảm bớt các kỳ sinh hoạt đảng định kỳ.','B','',T],
    ['NQ078','Quan điểm mới về "nêu gương" của cán bộ, đảng viên trong Văn kiện Đại hội XIV là gì?','Chỉ áp dụng cho cán bộ cấp cao.','Cán bộ, đảng viên giữ chức vụ càng cao càng phải gương mẫu, nêu gương.','Chỉ cần gương mẫu trong đời sống sinh hoạt.','Là việc tự nguyện, không bắt buộc.','B','',T],
    ['NQ079','Theo Văn kiện Đại hội XIV của Đảng, ba trụ cột chính trong việc triển khai đồng bộ và toàn diện hoạt động đối ngoại của Việt Nam là gì?','Đối ngoại Đảng, Ngoại giao Nhà nước và Đối ngoại Nhân dân.','Quốc phòng, An ninh và Kinh tế đối ngoại.','Đối ngoại Đa phương, Đối ngoại Song phương và Hội nhập quốc tế.','Ngoại giao Kinh tế, Ngoại giao Văn hóa và Ngoại giao Chính trị.','A','',T],
    ['NQ080','Trong Văn kiện Đại hội XIV, Đảng ta nhấn mạnh nội dung nào trong nhiệm vụ đổi mới mạnh mẽ công tác cán bộ; tăng cường bảo vệ chính trị nội bộ?','Tập trung xây dựng đội ngũ cán bộ các cấp vừa hồng, vừa chuyên.','Tập trung xây dựng đội ngũ cán bộ các cấp thực sự tiêu biểu về bản lĩnh chính trị, phẩm chất, đạo đức, năng lực nổi trội, dám đổi mới, sáng tạo, dám đương đầu với khó khăn, thử thách, dám chịu trách nhiệm vì lợi ích chung, là hạt nhân đoàn kết.','Tập trung xây dựng đội ngũ cán bộ các cấp vững mạnh toàn diện.','Tập trung xây dựng đội ngũ cán bộ các cấp có lòng yêu nước, tự hào dân tộc.','B','',T],
    ['NQ081','Biện pháp nào trong đấu tranh phòng, chống tham nhũng, lãng phí, tiêu cực được Đảng ta nhấn mạnh trong Văn kiện Đại hội XIV?','Chủ động xử lý hình sự.','Phát hiện vi phạm là chính.','Phòng ngừa là chính.','Kết hợp chặt chẽ giữa tích cực phòng ngừa với chủ động phát hiện, xử lý nghiêm minh, kịp thời các hành vi tham nhũng, lãng phí, tiêu cực, không có vùng cấm, không có ngoại lệ; trong đó, phòng ngừa là chính, là cơ bản, lâu dài, phát hiện, xử lý là quan trọng, đột phá.','D','',T],
    ['NQ082','Trong Văn kiện Đại hội XIV, nhiệm vụ nào được Đảng ta nhấn mạnh trong việc tiếp tục đổi mới mạnh mẽ phương thức lãnh đạo, cầm quyền của Đảng?','Xây dựng và vận hành hệ thống dữ liệu quốc gia về dân cư.','Xây dựng và vận hành hệ thống dữ liệu cán bộ, đảng viên thống nhất, liên thông; triển khai hiệu quả các phần mềm, ứng dụng dùng chung trong Đảng và mạng truyền số liệu chuyên dùng đồng bộ, an toàn, hiện đại.','Xây dựng và vận hành hệ thống dữ liệu quốc gia về đất đai.','Xây dựng và vận hành hệ thống dữ liệu quốc gia về thuế.','B','',T],
    ['NQ083','Trong quan điểm "Dân là gốc" được đề cập tại Văn kiện Đại hội XIV, đâu là nội dung không được Đảng nhấn mạnh?','Thật sự tin tưởng, tôn trọng và phát huy quyền làm chủ của Nhân dân.','Thực hành "Dân biết, dân bàn, dân làm, dân kiểm tra, dân giám sát, dân thụ hưởng".','Dân quyết các quyết sách lớn.','Thắt chặt mối quan hệ mật thiết giữa Đảng với Nhân dân, dựa vào Nhân dân để xây dựng Đảng và hệ thống chính trị.','C','',T],
    ['NQ084','Văn kiện Đại hội XIV của Đảng xác định phương pháp nào là phương thức lãnh đạo chủ yếu, rất quan trọng để giữ vững kỷ cương, kỷ luật của Đảng?','Tự phê bình và phê bình.','Kiểm tra, giám sát.','Tuyên truyền, giáo dục.','Nêu gương.','B','',T],
    ['NQ085','Trong Văn kiện Đại hội XIV, Đảng ta xác định yêu cầu đặt ra đối với công tác phòng, chống tham nhũng, lãng phí, quan liêu, tiêu cực là gì?','Phải được triển khai quyết liệt để thu hồi nhiều tài sản cho Nhà nước.','Phải xử lý nghiêm minh nhiều cán bộ vi phạm.','Phải mang tính răn đe mạnh mẽ.','Phải đặt lợi ích của quốc gia - dân tộc lên trên hết và đồng hành cùng nhiệm vụ phát triển kinh tế - xã hội, phục vụ yêu cầu phát triển đất nước.','D','',T],
    ['NQ086','Trong Văn kiện Đại hội XIV, đâu không phải là nội dung được đề cập trong nhiệm vụ đột phá về thể chế?','Xây dựng khung khổ pháp lý đáp ứng yêu cầu thúc đẩy phát triển nền kinh tế số.','Xây dựng cơ chế, chính sách đột phá, vượt trội để huy động và sử dụng hiệu quả nguồn lực phát triển các mô hình kinh tế mới, các công trình trọng điểm quốc gia.','Thúc đẩy mạnh mẽ thể chế về tháo gỡ khó khăn cho khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số quốc gia.','Áp dụng cơ chế, chính sách đặc thù, đặc biệt, có khả năng cạnh tranh quốc tế cho các vùng động lực, cực tăng trưởng...','C','',T],
    ['NQ087','Vai trò của Mặt trận Tổ quốc và các tổ chức chính trị - xã hội trong xây dựng Đảng được Đại hội XIV xác định như thế nào?','Chỉ thực hiện các hoạt động phong trào.','Giám sát và phản biện xã hội, góp ý xây dựng Đảng và chính quyền.','Hoạt động độc lập hoàn toàn với Đảng.','Không được tham gia vào công tác cán bộ.','B','',T],
    ['NQ088','Khái niệm "Văn hóa chính trị" trong Đảng nhấn mạnh những nội dung nào?','Khả năng biểu diễn nghệ thuật của đảng viên.','Sự liêm chính, lòng tự trọng, danh dự và tinh thần phục vụ của cán bộ.','Việc trang trí trụ sở cơ quan.','Việc tổ chức các lễ kỷ niệm hoành tráng.','B','',T],
    ['NQ089','Trong Văn kiện Đại hội XIV, nhiệm vụ nào được Đảng ta nhấn mạnh trong đột phá phát triển nguồn nhân lực chất lượng cao và đổi mới công tác cán bộ?','Từng bước xây dựng "Hệ thống chấm điểm năng lực cán bộ" trên nền tảng số.','Khoa học công nghệ, đổi mới sáng tạo và chuyển đổi số.','Đầu tư phát triển đội ngũ các nhà khoa học đầu ngành.','Đầu tư phát triển nguồn lao động dồi dào.','A','',T],
    ['NQ090','"Kinh tế xanh, kinh tế tuần hoàn" được xác định trong Văn kiện Đại hội XIV như thế nào?','Một phong trào tự nguyện của doanh nghiệp.','Xu thế tất yếu và mục tiêu phát triển bền vững.','Giải pháp tạm thời khi thiếu hụt năng lượng.','Chỉ áp dụng cho ngành nông nghiệp.','B','',T],
    ['NQ091','Theo Văn kiện Đại hội XIV của Đảng, việc đẩy mạnh đấu tranh phòng, chống tham nhũng, tiêu cực nhằm mục tiêu gì?','Mở rộng quyền lực của các cơ quan kiểm tra.','Tăng chi ngân sách cho hoạt động kiểm tra.','Giữ vững kỷ luật của Đảng và củng cố niềm tin của Nhân dân.','Thay thế toàn bộ đội ngũ cán bộ hiện tại.','C','',T],
    ['NQ092','Đại hội XIV xác định Việt Nam phấn đấu trở thành quốc gia thuộc nhóm nào về chỉ số đổi mới sáng tạo (GII)?','Nhóm 10 nước dẫn đầu thế giới.','Nhóm các quốc gia dẫn đầu trong các nước thu nhập trung bình cao.','Giữ nguyên vị trí hiện tại.','Không tham gia xếp hạng quốc tế.','B','',T],
    ['NQ093','Quan điểm của Đảng về phát triển kinh tế tư nhân được xác định trong Văn kiện Đại hội XIV như thế nào?','Hạn chế quy mô các tập đoàn tư nhân.','Phát triển kinh tế tư nhân thực sự trở thành một động lực quan trọng nhất của nền kinh tế.','Chỉ khuyến khích hộ kinh doanh cá thể.','Chuyển toàn bộ vốn tư nhân sang vốn nhà nước.','B','',T],
    ['NQ094','Dự án hạ tầng nào được coi là "biểu tượng" và "trục xương sống" trong kỷ nguyên mới?','Đường bộ cao tốc Bắc - Nam phía Đông.','Đường sắt tốc độ cao trên trục Bắc - Nam.','Các sân bay địa phương cấp 4.','Hệ thống đê điều ven biển.','B','',T],
    ['NQ095','Phát triển "hạ tầng số" bao gồm những yếu tố cốt lõi nào?','Chỉ là việc phủ sóng 4G/5G.','Mạng viễn thông, trung tâm dữ liệu, điện toán đám mây và nền tảng số quốc gia.','Mua sắm thêm nhiều máy tính cho văn phòng.','Thay thế toàn bộ nhân sự bằng rôbốt.','B','',T],
    ['NQ096','Đại hội XIV xác định việc làm chủ công nghệ nào là ưu tiên trong cuộc Cách mạng công nghiệp lần thứ tư?','Công nghệ luyện kim truyền thống.','Trí tuệ nhân tạo (AI), bán dẫn, công nghệ sinh học và năng lượng mới.','Công nghệ sản xuất đồ nhựa dân dụng.','Công nghệ đóng tàu vỏ gỗ.','B','',T],
    ['NQ097','Đại hội XIV xác định mục tiêu của việc đầu tư vào công nghiệp bán dẫn tại Việt Nam là gì?','Chỉ để lắp ráp thiết bị điện tử giá rẻ.','Tham gia sâu vào chuỗi giá trị toàn cầu và tự chủ về công nghệ cốt lõi.','Để thay thế hoàn toàn việc nhập khẩu máy móc.','Để xuất khẩu nguyên liệu thô sang các nước phát triển.','B','',T],
    ['NQ098','Đại hội XIV xác định an ninh mạng có vai trò như thế nào trong phát triển công nghệ?','Là việc phụ của ngành Công an.','Là bộ phận khăng khít của an ninh quốc gia, điều kiện tiên quyết để chuyển đổi số.','Chỉ cần thiết đối với các ngân hàng lớn.','Là rào cản đối với tự do kinh doanh.','B','',T],
    ['NQ099','Quan điểm xuyên suốt về phát triển xã hội trong Văn kiện Đại hội XIV là gì?','Hy sinh môi trường để đổi lấy tăng trưởng GDP.','Tăng trưởng kinh tế gắn kết chặt chẽ hơn với bảo đảm tiến bộ và công bằng xã hội.','Ưu tiên người giàu làm giàu trước rồi mới hỗ trợ người nghèo.','Chỉ tập trung phát triển các đô thị lớn.','B','',T],
    ['NQ100','Yếu tố nào được Đại hội XIV xác định là "trung tâm, chủ thể, là nguồn lực chủ yếu và mục tiêu" của sự phát triển?','Công nghệ hiện đại.','Tài nguyên thiên nhiên.','Con người.','Vốn đầu tư nước ngoài.','C','',T],
    ['NQ101','Mục tiêu của việc phát triển "công nghiệp văn hóa" được Đại hội XIV xác định là gì?','Chỉ để giải trí cho nhân dân.','Biến văn hóa thành sức mạnh nội sinh và đóng góp vào tăng trưởng kinh tế.','Ngăn chặn hoàn toàn văn hóa nước ngoài vào Việt Nam.','Chỉ tập trung bảo tồn các bảo tàng cũ.','B','',T],
    ['NQ102','Nhiệm vụ trọng tâm trong phát triển giáo dục và đào tạo được Đại hội XIV xác định là gì?','Tăng số lượng sinh viên các ngành xã hội.','Đào tạo nhân lực chất lượng cao gắn với thị trường lao động và nhu cầu kinh tế số.','Giữ nguyên chương trình học từ 20 năm trước.','Chỉ tập trung vào giáo dục tiểu học.','B','',T],
    ['NQ103','Đại hội XIV xác định chính sách an sinh xã hội trong kỷ nguyên mới hướng tới điều gì?','Phát tiền định kỳ cho tất cả mọi người.','Hệ thống an sinh đa tầng, hiện đại, bao phủ toàn dân, không để ai bị bỏ lại phía sau.','Chỉ hỗ trợ người dân ở vùng sâu, vùng xa.','Dẹp bỏ hoàn toàn bảo hiểm xã hội tự nguyện.','B','',T],
    ['NQ104','Cam kết của Việt Nam về phát thải ròng bằng "0" (Net Zero) vào năm 2050 được coi là?','Một lời hứa không bắt buộc.','Cơ hội để chuyển đổi mô hình kinh tế sang phát triển xanh, chất lượng cao.','Gánh nặng đối với các doanh nghiệp sản xuất.','Nhiệm vụ chỉ dành cho ngành lâm nghiệp.','B','',T],
    ['NQ105','Quan điểm về đô thị hóa được Đại hội XIV xác định là gì?','Mở rộng đô thị theo vết dầu loang.','Phát triển đô thị bền vững, thông minh, gắn liền với hạ tầng giao thông hiện đại.','Tập trung toàn bộ dân cư vào 2 thành phố lớn là Hà Nội và Thành phố Hồ Chí Minh.','Hạn chế việc xây dựng nhà cao tầng.','B','',T],
    ['NQ106','Đại hội XIV xác định ưu tiên phát triển lĩnh vực y tế theo hướng nào?','Chỉ xây dựng thêm nhiều bệnh viện tư nhân.','Y tế dự phòng, y tế cơ sở và ứng dụng công nghệ cao trong khám, chữa bệnh.','Tăng giá viện phí để tự chủ tài chính.','Nhập khẩu toàn bộ thuốc men từ nước ngoài.','B','',T],
    ['NQ107','Đại hội XIV của Đảng xác định phát triển "kinh tế biển" tập trung vào ngành mũi nhọn nào?','Chỉ đánh bắt cá gần bờ.','Năng lượng tái tạo biển, du lịch biển, kinh tế hàng hải và khai thác hải sản bền vững.','Lấp biển để xây dựng nhà ở.','Chế biến hải sản thủ công.','B','',T],
    ['NQ108','Văn kiện Đại hội XIV của Đảng chủ trương phát triển loại hình kinh tế nào để sớm thích ứng với xu thế già hóa dân số?','Kinh tế thị trường.','Kinh tế nhà nước.','Kinh tế tư nhân.','"Kinh tế bạc".','D','',T],
    ['NQ109','Quan điểm xuyên suốt về bảo vệ Tổ quốc trong Văn kiện Đại hội XIV là gì?','Chỉ đối phó khi có chiến tranh xảy ra.','Bảo vệ Tổ quốc từ sớm, từ xa, giữ nước từ khi nước chưa nguy.','Tập trung hoàn toàn vào mua sắm vũ khí hiện đại.','Chỉ bảo vệ biên giới đất liền.','B','',T],
    ['NQ110','Mục tiêu xây dựng Quân đội nhân dân, Công an nhân dân được Đại hội XIV xác định như thế nào?','Tăng gấp đôi số lượng quân số.','Cách mạng, chính quy, tinh nhuệ, hiện đại, tuyệt đối trung thành với Tổ quốc, với Đảng, Nhà nước và Nhân dân.','Chỉ tập trung vào lực lượng dự bị động viên.','Thay thế toàn bộ vũ khí cũ trong một năm.','B','',T],
    ['NQ111','Nhiệm vụ nào trong tăng cường quốc phòng, an ninh được Đại hội XIV của Đảng nhấn mạnh?','Tăng cường xây dựng, củng cố nền quốc phòng toàn dân, thế trận quốc phòng toàn dân và nền an ninh nhân dân, thế trận an ninh nhân dân, gắn với xây dựng thế trận lòng dân, xây dựng khu vực phòng thủ vững chắc.','Tăng cường thế trận lòng dân rộng rãi.','Chú trọng phát triển các khu vực phòng thủ vững chắc.','Tập trung xây dựng nền an ninh nhân dân vững mạnh.','A','',T],
    ['NQ112','Đại hội XIV xác định mối quan hệ giữa "Phát triển kinh tế - xã hội" và "Quốc phòng - an ninh" như thế nào?','Hai nhiệm vụ tách rời, không liên quan.','Ưu tiên kinh tế trước, quốc phòng sau.','Gắn kết chặt chẽ, hài hoà giữa phát triển kinh tế, văn hoá, xã hội, môi trường với củng cố quốc phòng, an ninh.','Chỉ kết hợp tại các vùng biên giới và hải đảo.','C','',T],
    ['NQ113','Nội dung nào là điểm mới trong tư duy về "an ninh quốc gia" được xác định trong Đại hội XIV?','Chỉ bao gồm an ninh quân sự.','Bao gồm cả an ninh phi truyền thống (an ninh mạng, môi trường, dịch bệnh, năng lượng…).','Chỉ tập trung vào an ninh biên giới.','Không bao gồm an ninh kinh tế.','B','',T],
    ['NQ114','Đâu không phải là nội dung được nhấn mạnh trong nhiệm vụ đẩy mạnh triển khai đồng bộ, sáng tạo hoạt động đối ngoại và hội nhập quốc tế trong Văn kiện Đại hội XIV?','Đẩy mạnh khai thác các khuôn khổ quan hệ đối tác chiến lược toàn diện, đối tác chiến lược, đối tác toàn diện.','Nâng cao vị thế, vai trò của Việt Nam tại các cơ chế đa phương; chủ động, tích cực tham gia định hình các thể chế đa phương.','Nâng tầm đối ngoại đa phương và song phương.','Tham gia tích cực hơn vào các diễn đàn song phương.','D','',T],
    ['NQ115','Mục tiêu cao nhất của công tác đối ngoại được Đại hội XIV xác định là gì?','Trở thành cường quốc quân sự khu vực.','Bảo đảm và bảo vệ cao nhất lợi ích quốc gia - dân tộc trên cơ sở các nguyên tắc cơ bản của luật pháp quốc tế và Hiến chương Liên hợp quốc, hợp tác bình đẳng, cùng có lợi.','Nhận được nhiều viện trợ không hoàn lại nhất.','Chỉ quan hệ với các nước láng giềng.','B','',T],
    ['NQ116','Đại hội XIV xác định vai trò của Việt Nam trong các cơ chế đa phương (như Liên hợp quốc, ASEAN) như thế nào?','Chỉ là thành viên quan sát.','Vai trò thành viên chủ động, tích cực, quan trọng và có trách nhiệm.','Vai trò thành viên quan trọng.','Vai trò thành viên có trách nhiệm.','B','',T],
    ['NQ117','Trong Văn kiện Đại hội XIV, nội dung nào được Đảng ta nhấn mạnh trong yêu cầu đẩy mạnh ngoại giao toàn diện phục vụ phát triển?','Đối ngoại nhân dân.','Ngoại giao nhà nước.','Ngoại giao kinh tế, ngoại giao công nghệ.','Đối ngoại đảng.','C','',T],
    ['NQ118','Công tác đối ngoại đảng, ngoại giao nhà nước và đối ngoại nhân dân được Đại hội XIV xác định mối quan hệ như thế nào?','Là ba kênh độc lập, không liên quan.','Ba trụ cột đối ngoại gắn kết chặt chẽ, hỗ trợ lẫn nhau.','Chỉ cần ngoại giao nhà nước là đủ.','Đối ngoại nhân dân là quan trọng nhất.','B','',T],
    ['NQ119','Sức mạnh bảo vệ Tổ quốc được Đại hội XIV xác định là?','Vũ khí hạt nhân.','Khối đại đoàn kết toàn dân tộc dưới sự lãnh đạo của Đảng.','Các liên minh quân sự quốc tế.','Các tập đoàn kinh tế đa quốc gia.','B','',T],
    ['NQ120','Đại hội XIV xác định tính chất của nhiệm vụ bảo vệ an ninh quốc gia hiện nay như thế nào?','Chỉ là việc đối phó với tội phạm hình sự.','Trọng yếu, thường xuyên, là nhiệm vụ của toàn Đảng, toàn dân, toàn quân.','Chỉ tập trung vào các vùng biên giới và hải đảo.','Là nhiệm vụ riêng biệt của lực lượng Công an.','B','',T],
    ['NQ121','Trong Văn kiện Đại hội XIV, Đảng ta xác định mục tiêu của quốc phòng - an ninh là gì?','Bảo vệ an ninh chính trị và quân sự.','Bảo vệ an ninh chính trị, kinh tế, văn hóa, xã hội, an ninh mạng và các thách thức phi truyền thống.','Bảo vệ bí mật nhà nước.','Bảo đảm và bảo vệ cao nhất lợi ích quốc gia - dân tộc, kiên quyết, kiên trì bảo vệ vững chắc độc lập, chủ quyền, thống nhất, toàn vẹn lãnh thổ của Tổ quốc…','D','',T],
    ['NQ122','Trong Văn kiện Đại hội XIV, Đảng ta xác định Việt Nam chủ động, tích cực đóng góp vào hòa bình, hữu nghị, hợp tác và phát triển bền vững trên tinh thần?','Là bạn, là đối tác tin cậy, là thành viên tích cực, có trách nhiệm của cộng đồng quốc tế.','Là đối tác tin cậy, thành viên có trách nhiệm.','Là thành viên tích cực, tin cậy, có trách nhiệm.','Là thành viên năng động, tích cực, có trách nhiệm','A','',T],
    ['NQ123','Văn kiện Đại hội XIV nhấn mạnh yêu cầu nào để phát huy sức mạnh mềm Việt Nam góp phần tạo thế và lực mới cho đất nước?','Kết hợp hiệu quả giữa kinh tế và quốc phòng, an ninh.','Kết hợp chặt chẽ giữa quốc phòng, an ninh và đối ngoại.','Kết hợp hiệu quả giữa quốc phòng, an ninh và đối ngoại.','Thực hiện có hiệu quả hai nhiệm vụ chiến lược xây dựng và bảo vệ Tổ quốc, kết hợp chặt chẽ, hiệu quả giữa quốc phòng, an ninh với phát triển kinh tế, văn hóa, xã hội và đối ngoại.','D','',T],
    ['NQ124','Những yêu cầu đặt ra đối với nhiệm vụ nghiên cứu, đánh giá, dự báo tình hình trong lĩnh vực quốc phòng - an ninh được nhấn mạnh trong Văn kiện Đại hội XIV như thế nào?','Chủ động nghiên cứu, đánh giá, dự báo đúng tình hình, xử lý kịp thời các tình huống về quốc phòng, an ninh, các vấn đề trật tự, an toàn xã hội, không để bị động, bất ngờ trong mọi tình huống; ngăn ngừa các nguy cơ chiến tranh, xung đột, mất an ninh, trật tự từ sớm, từ xa.','Chủ động phòng ngừa, phát hiện và triệt tiêu các nguy cơ từ sớm, từ xa.','Chủ động xử lý các tình huống từ sớm, từ xa.','Nghiên cứu, đánh giá, dự báo từ sớm, từ xa.','A','',T],
    ['NQ125','Đại hội XIV xác định yếu tố nào là "lá chắn" vững chắc nhất để bảo vệ an ninh quốc gia?','Vũ khí trang bị hiện đại.','Thế trận lòng dân và nền an ninh nhân dân, thế trận an ninh nhân dân.','Hệ thống camera giám sát dày đặc.','Sự hỗ trợ của an ninh các nước lớn.','B','',T],
    ['NQ126','"Chủ quyền quốc gia trên không gian mạng" được Đại hội XIV xác định như thế nào?','Là một khái niệm trừu tượng, không cần bảo vệ.','Là bộ phận hợp thành thống nhất, không thể tách rời của chủ quyền quốc gia.','Chỉ cần thiết đối với các cơ quan chính phủ.','Là trách nhiệm riêng của các nhà mạng viễn thông.','B','',T],
    ['NQ127','Văn kiện Đại hội XIV xác định nhiệm vụ bảo đảm chủ quyền số quốc gia trên không gian mạng như thế nào?','Bảo đảm chủ quyền số quốc gia trên không gian mạng trong mọi tình huống và bảo đảm môi trường số an toàn, ổn định cho phát triển.','Bảo đảm chủ quyền số quốc gia trên không gian mạng tùy từng tình huống cụ thể.','Bảo đảm chủ quyền số quốc gia trên không gian mạng trên từng lĩnh vực cụ thể.','Bảo đảm chủ quyền số quốc gia trên không gian mạng trên lĩnh vực trọng yếu.','A','',T],
    ['NQ128','Đối với các thách thức an ninh truyền thống và phi truyền thống, Đại hội XIV chủ trương ứng phó như thế nào?','Chủ động, tích cực.','Kịp thời, hiệu quả.','Chủ động, hiệu quả.','Hiệu quả, tích cực.','B','',T],
    ['NQ129','Phương hướng công tác xây dựng Đảng nhiệm kỳ Đại hội XIV được Đảng ta nhấn mạnh tập trung vào khâu nào dưới đây?','Đấu tranh ngăn chặn, đẩy lùi, xử lý nghiêm cán bộ, đảng viên suy thoái về tư tưởng chính trị, đạo đức, lối sống, "tự diễn biến", "tự chuyển hoá".','Tăng cường kiểm tra, giám sát, kỷ luật cán bộ.','Bồi dưỡng cán bộ vừa hồng, vừa chuyên.','Phát huy hiệu quả công tác thi đua - khen thưởng.','A','',T],
    ['NQ130','Văn kiện Đại hội XIV nhấn mạnh xây dựng cơ chế, chính sách đặc thù để phát triển kinh tế kết hợp với bảo đảm quốc phòng, an ninh trên biển cho các địa phương, địa bàn nào?','Các đặc khu, đảo như Phú Quốc, Côn Đảo, Vân Đồn, Cồn Cỏ.','Các đặc khu, đảo như Phú Quốc, Côn Đảo, Vân Đồn, Cồn Cỏ, Lý Sơn, Hòn Khoai và các đảo tiền tiêu khác…','Các địa phương biên giới.','Các địa bàn khó khăn, tập trung đông đồng bào dân tộc thiểu số.','B','',T],
    ['NQ131','Nhiệm vụ nào được đẩy mạnh đột phá trong lĩnh vực quốc phòng - an ninh được nhấn mạnh tại Đại hội XIV của Đảng?','Đẩy mạnh đột phá phát triển công nghiệp quốc phòng, công nghiệp an ninh, tự chủ, tự lực, tự cường, lưỡng dụng, hiện đại.','Đẩy mạnh đột phá phát triển nền an ninh nhân dân, thế trận an ninh nhân dân.','Đẩy mạnh đột phá phát triển thế trận quốc phòng toàn dân kết hợp với thế trận lòng dân vững chắc.','Đẩy mạnh đột phá phát triển thế trận lòng dân vững chắc.','A','',T],
    ['NQ132','Nhiệm vụ nào được nhấn mạnh trong lĩnh vực quốc phòng - an ninh tại Đại hội XIV?','Khắc phục hậu quả thiên tai.','Hỗ trợ nhân đạo, tìm kiếm cứu nạn, cứu trợ thảm họa, khắc phục hậu quả chiến tranh.','Phòng cháy, chữa cháy và cứu nạn, cứu hộ mưa bão.','Giữ gìn trật tự, an toàn giao thông.','B','',T],
    ['NQ133','Đảng xác định vai trò lãnh đạo đối với Công an nhân dân như thế nào?','Lãnh đạo gián tiếp qua các văn bản.','Lãnh đạo tuyệt đối, trực tiếp về mọi mặt.','Chia sẻ quyền lãnh đạo với các tổ chức xã hội.','Chỉ lãnh đạo trong thời chiến.','B','',T],
    ['NQ134','Văn kiện Đại hội XIV của Đảng nhấn mạnh việc giữ vững và phát huy truyền thống gì của Công an nhân dân?','Danh dự là điều thiêng liêng, cao quý nhất.','Còn Đảng thì còn mình.','Công an nhân dân vì Đảng, vì dân.','"Vì nước quên thân, vì dân phục vụ".','D','',T],
    ['NQ135','Văn kiện Đại hội XIV xác định nhiệm vụ xây dựng lực lượng dự bị động viên, lực lượng dân quân tự vệ như thế nào?','Xây dựng lực lượng dự bị động viên hùng hậu, lực lượng dân quân tự vệ vững mạnh, rộng khắp, trên các vùng, miền, trên biển.','Xây dựng lực lượng dự bị động viên vững mạnh, lực lượng dân quân tự vệ lớn mạnh.','Xây dựng lực lượng dự bị động viên phát triển, lực lượng dân quân tự vệ trong sạch, vững mạnh.','Xây dựng lực lượng dự bị động viên hùng hậu, lực lượng dân quân tự vệ ngày càng chính quy.','A','',T],
    ['NQ136','Văn kiện Đại hội XIV xác định nhiệm vụ xây dựng lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở như thế nào?','Xây dựng lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở trong sạch.','Xây dựng lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở toàn diện.','Xây dựng lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở vững mạnh.','Xây dựng lực lượng tham gia bảo vệ an ninh, trật tự ở cơ sở chính quy.','C','',T],
    ['NQ137','Đại hội XIV xác định việc tiếp tục hoàn chỉnh tổ chức bộ máy Công an nhân dân theo hướng nào?','"Bộ tỉnh, tỉnh mạnh, huyện toàn diện, xã bám cơ sở".','"Bộ tỉnh, tỉnh toàn diện, xã vững mạnh, bám cơ sở".','"Bộ tỉnh, tỉnh toàn diện, xã bám cơ sở".','"Bộ tỉnh, tỉnh vững mạnh, toàn diện, xã bám cơ sở".','B','',T],
    ['NQ138','Đại hội XIV xác định việc thực hiện "Bộ tinh, tỉnh toàn diện, xã vững mạnh, bám cơ sở" nhằm mục đích gì?','Để tăng số lượng lãnh đạo tại cấp Bộ.','Tinh gọn bộ máy, tăng cường lực lượng trực tiếp chiến đấu và hướng về cơ sở.','Để giảm bớt trách nhiệm cho công an cấp huyện.','Để tập trung toàn bộ quyền lực về cấp Bộ.','B','',T],
    ['NQ139','Công tác tổng kết thực tiễn, bổ sung, phát triển lý luận về quốc phòng, an ninh được đề cập trong Văn kiện Đại hội XIV như thế nào?','Chú trọng tổng kết thực tiễn, phát triển lý luận về quốc phòng, an ninh, nghệ thuật quân sự Việt Nam, nghệ thuật chiến tranh nhân dân bảo vệ Tổ quốc.','Chú trọng tổng kết thực tiễn, bổ sung lý luận về quốc phòng, an ninh, nghệ thuật quân sự Việt Nam, nghệ thuật bảo vệ an ninh quốc gia, bảo đảm trật tự, an toàn xã hội trong tình hình mới.','Chú trọng phát triển lý luận về quốc phòng, an ninh, nghệ thuật bảo vệ an ninh quốc gia, bảo đảm trật tự, an toàn xã hội trong tình hình mới.','Chú trọng tổng kết thực tiễn, bổ sung, phát triển lý luận về quốc phòng, an ninh, nghệ thuật quân sự Việt Nam, nghệ thuật chiến tranh nhân dân bảo vệ Tổ quốc, nghệ thuật bảo vệ an ninh quốc gia, bảo đảm trật tự, an toàn xã hội trong tình hình mới.','D','',T],
    ['NQ140','Nhiệm vụ bảo vệ an ninh được nhấn mạnh trong Văn kiện Đại hội XIV là gì?','Tăng cường bảo vệ an ninh chế độ, an ninh chính trị nội bộ, an ninh văn hoá tư tưởng, an ninh thông tin truyền thông, an ninh tài chính, an ninh năng lượng, an ninh nguồn nước, an ninh lương thực, an ninh tại các địa bàn chiến lược, an ninh cơ sở.','Tăng cường bảo vệ an ninh văn hoá tư tưởng, an ninh thông tin truyền thông, an ninh tài chính, an ninh năng lượng.','Tăng cường bảo vệ an ninh thông tin truyền thông, an ninh tài chính, an ninh năng lượng, an ninh nguồn nước, an ninh lương thực, an ninh tại các địa bàn chiến lược, an ninh cơ sở.','Tăng cường bảo vệ an ninh năng lượng, an ninh nguồn nước, an ninh lương thực, an ninh tại các địa bàn chiến lược, an ninh cơ sở.','A','',T],
    ['NQ141','Quan điểm mới lần đầu tiên được xác lập tại Đại hội XIV của Đảng về an ninh là gì?','An ninh truyền thống.','An ninh quân sự là chủ yếu.','An ninh toàn diện.','An ninh khu vực.','C','',T],
    ['NQ142','"Tự chủ chiến lược về an ninh" được hiểu là gì trong tư duy mới của Đảng?','Phụ thuộc vào hợp tác quốc tế.','Chủ động về nguồn lực, năng lực và phương án bảo đảm an ninh.','Chỉ tập trung vào an ninh quân sự.','Giảm vai trò của lực lượng vũ trang.','B','',T],
    ['NQ143','Một trong những điểm mới quan trọng về mục tiêu của an ninh quốc gia trong Đại hội XIV là gì?','Bảo vệ biên giới là mục tiêu duy nhất.','Lấy an ninh con người làm trung tâm.','Chỉ chú trọng an ninh kinh tế.','Giảm vai trò của nhân dân.','B','',T],
    ['NQ144','Tư duy mới về an ninh nhấn mạnh mối quan hệ nào dưới đây?','Phát triển tách rời an ninh.','An ninh đi sau phát triển.','Lấy phát triển để ổn định, ổn định để phát triển.','Chỉ ưu tiên ổn định.','C','',T],
    ['NQ145','"An ninh chủ động" được hiểu là?','Chỉ phản ứng khi có tình huống xảy ra.','Chủ động phòng ngừa, phát hiện và xử lý sớm nguy cơ.','Chỉ tập trung xử lý hậu quả.','Phụ thuộc vào tình hình quốc tế.','B','',T],
    ['NQ146','Khi xuất hiện dấu hiệu phức tạp về an ninh trật tự tại cơ sở, cách xử lý phù hợp với an ninh chủ động là?','Chờ chỉ đạo cấp trên.','Đợi xảy ra sự việc rồi xử lý.','Chủ động nắm tình hình, tham mưu và giải quyết sớm.','Không can thiệp.','C','',T],
    ['NQ147','"Thế trận lòng dân" trong bảo vệ an ninh, trật tự được hiểu là?','Sự bố trí lực lượng vũ trang.','Sự đồng thuận, tin tưởng và ủng hộ của nhân dân đối với Đảng, Nhà nước.','Hệ thống công trình phòng thủ.','Hoạt động của cơ quan quản lý.','B','',T],
    ['NQ148','Khi địa bàn xuất hiện bức xúc trong nhân dân, giải pháp phù hợp để củng cố "thế trận lòng dân" là?','Không xử lý.','Chỉ áp dụng biện pháp cưỡng chế.','Chủ động đối thoại, giải quyết kiến nghị, tạo đồng thuận xã hội.','Né tránh tiếp xúc.','C','',T],
    ['NQ149','Phát huy vai trò của Hội Cựu Công an nhân dân trong tình hình mới cần tập trung vào nội dung nào sau đây?','Hạn chế sự tham gia của hội viên vào công tác xã hội.','Phát huy vai trò của cựu Công an nhân dân trong giáo dục truyền thống yêu nước, chủ nghĩa anh hùng cách mạng cho thế hệ trẻ, phát huy bản chất, "người công an cách mệnh".','Tách Hội khỏi các nhiệm vụ chính trị.','Chỉ hoạt động nội bộ, không phối hợp.','B','',T],
    ['NQ150','Lực lượng tham gia bảo vệ an ninh, trật tự tại cơ sở có vai trò chủ yếu nào sau đây?','Thay thế hoàn toàn lực lượng Công an nhân dân.','Là lực lượng hỗ trợ, "cánh tay nối dài" của lực lượng Công an nhân dân, góp phần giữ gìn an ninh, trật tự từ sớm, từ xa, từ cơ sở.','Chỉ tham gia hoạt động tuyên truyền.','Không tham gia nhiệm vụ bảo vệ an ninh.','B','',T]
  ];
  rows.forEach(function(row) { sheet.appendRow(row); });
  Logger.log('✅ Đã thêm ' + rows.length + ' câu hỏi Nghị quyết XIV');
}
