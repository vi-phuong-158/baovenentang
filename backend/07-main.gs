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

      case 'rebuttals':
        const keyword = params.keyword || '';
        result = { success: true, data: getRebuttals(keyword) };
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
          endpoints: ['today', 'quiz', 'rebuttals', 'stats'],
          postActions: ['subscribe', 'submit_quiz', 'troly35_run', 'troly35_rate', 'troly35_history', 'troly35_trends', 'bantin35_generate', 'bantin35_latest']
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
