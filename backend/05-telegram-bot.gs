/**
 * ============================================================
 * MODULE: TELEGRAM BOT
 * Gửi bản tin và xử lý lệnh người dùng
 * ============================================================
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

/**
 * Gửi bản tin hàng ngày qua Telegram Channel
 */
function sendTelegramDailyDigest(articles, digestOverview) {
  if (!articles || articles.length === 0) {
    Logger.log('[Telegram] Không có bài để gửi');
    return;
  }

  if (!hasRequiredConfig_(REQUIRED_TELEGRAM_CONFIG)) {
    Logger.log('[Telegram] Bỏ qua gửi bản tin vì chưa cấu hình TELEGRAM_TOKEN hoặc TELEGRAM_CHANNEL');
    return;
  }
  
  const message = buildTelegramDigest(articles, digestOverview);
  
  try {
    sendTelegramMessage(CONFIG.TELEGRAM_CHANNEL, message);
    Logger.log('[Telegram] ✅ Đã gửi bản tin hàng ngày');
  } catch(e) {
    Logger.log(`[Telegram] ❌ Lỗi gửi: ${e}`);
  }
}

/**
 * Xây dựng nội dung bản tin Telegram
 */
function buildTelegramDigest(articles, digestOverview) {
  const today = formatVietnameseDate(new Date());
  const maxItems = getTelegramDigestMaxItems_();
  const selectedArticles = (articles || []).slice(0, maxItems);
  const siteUrl = getPublicSiteUrl_();
  
  let msg = `🛡️ *BẢN TIN TRỢ LÝ 35*\n`;
  msg += `📅 _${today}_\n`;
  msg += `━━━━━━━━━━━━━━━━━\n\n`;

  const overviewText = buildTelegramOverviewSection_(digestOverview || buildDailyNewsOverviewFallback_(selectedArticles));
  if (overviewText) {
    msg += overviewText;
  }
  
  // Phân loại theo mức ưu tiên
  const important = selectedArticles.filter(isImportantNewsArticle_);
  const normal = selectedArticles.filter(a => !isImportantNewsArticle_(a));
  const footer = `━━━━━━━━━━━━━━━━━\n` +
    `✅ Gõ /quiz để kiểm tra nhận thức\n` +
    `🌐 Web: ${siteUrl}`;
  const maxMessageLength = 3900;
  
  // Tin quan trọng
  if (important.length > 0) {
    let section = '';
    important.slice(0, 3).forEach((a, idx) => {
      const item = buildTelegramArticleItem_(a, true);
      if ((msg + `🔴 *TIN QUAN TRỌNG*\n\n` + section + item + footer).length <= maxMessageLength) {
        section += item;
      }
    });
    if (section) msg += `🔴 *TIN QUAN TRỌNG*\n\n${section}`;
  }
  
  // Tin bình thường
  if (normal.length > 0) {
    let section = '';
    normal.slice(0, maxItems - Math.min(important.length, 3)).forEach(a => {
      const item = buildTelegramArticleItem_(a, false);
      if ((msg + `🟡 *HÔM NAY CẦN BIẾT*\n\n` + section + item + footer).length <= maxMessageLength) {
        section += item;
      }
    });
    if (section) msg += `🟡 *HÔM NAY CẦN BIẾT*\n\n${section}`;
  }
  
  // Thông điệp ngày
  const messageOfDay = selectedArticles.find(a => a.message);
  if (messageOfDay && messageOfDay.message) {
    const messageSection = `━━━━━━━━━━━━━━━━━\n` +
      `💬 *THÔNG ĐIỆP NGÀY*\n` +
      `_"${escapeMarkdown(truncateAtWord_(messageOfDay.message, 220))}"_\n\n`;
    if ((msg + messageSection + footer).length <= maxMessageLength) {
      msg += messageSection;
    }
  }
  
  msg += footer;
  
  return msg;
}

function buildTelegramArticleItem_(article, isImportant) {
  const icon = CATEGORIES[article.category] || '📰';
  const title = escapeMarkdown(truncateAtWord_(article.title || '', 140));
  const summaryLength = isImportant ? 220 : 180;
  const summary = escapeMarkdown(trimTelegramSummary_(article.summary, summaryLength));
  const label = isImportant ? 'Đọc đầy đủ' : 'Đọc thêm';
  const source = article.source ? `Nguồn: ${escapeMarkdown(article.source)}\n` : '';

  return `${icon} *${title}*\n` +
    source +
    `${summary}\n` +
    `[${label}](${article.link})\n\n`;
}

function getTelegramDigestMaxItems_() {
  return Math.max(10, Number(CONFIG.MAX_ARTICLES_TELEGRAM) || 10);
}

function trimTelegramSummary_(summary, maxLength) {
  const text = (summary || '').toString().trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

function buildTelegramOverviewSection_(overview) {
  if (!overview) return '';

  let section = `📌 *TỔNG HỢP - ĐÁNH GIÁ CHUNG*\n`;
  section += `${escapeMarkdown(truncateAtWord_(overview.overview || '', 650))}\n`;

  if (overview.generalAssessment && !isSimilarTelegramText_(overview.overview, overview.generalAssessment)) {
    section += `${escapeMarkdown(truncateAtWord_(overview.generalAssessment, 450))}\n`;
  }

  if (overview.whyItMatters) {
    section += `\n*Vì sao cần chú ý:* ${escapeMarkdown(truncateAtWord_(overview.whyItMatters, 220))}\n`;
  }

  if (overview.importantPoints && overview.importantPoints.length > 0) {
    section += `\n*Điểm cần chú ý:*\n`;
    overview.importantPoints.slice(0, 3).forEach((item, index) => {
      section += `${index + 1}. ${escapeMarkdown(truncateAtWord_(item, 180))}\n`;
    });
  }

  if (overview.watchPoints && overview.watchPoints.length > 0) {
    section += `\n*Cần theo dõi tiếp:*\n`;
    overview.watchPoints.slice(0, 3).forEach((item, index) => {
      section += `${index + 1}. ${escapeMarkdown(truncateAtWord_(item, 160))}\n`;
    });
  }

  section += `\n━━━━━━━━━━━━━━━━━\n\n`;
  return section;
}

function isSimilarTelegramText_(left, right) {
  const a = normalizeTelegramCompareText_(left);
  const b = normalizeTelegramCompareText_(right);
  if (!a || !b) return false;
  return a === b || a.indexOf(b) !== -1 || b.indexOf(a) !== -1;
}

function normalizeTelegramCompareText_(text) {
  return cleanValue_(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Gửi tin nhắn Telegram
 */
function sendTelegramMessage(chatId, text, options = {}) {
  assertRequiredConfig_(['TELEGRAM_TOKEN']);

  const url = `${TELEGRAM_API_BASE}${CONFIG.TELEGRAM_TOKEN}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    disable_web_page_preview: options.disablePreview || false,
    ...options
  };
  
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  const code = response.getResponseCode();
  if (code !== 200) {
    throw new Error(`Telegram API trả về ${code}: ${response.getContentText()}`);
  }
  
  return JSON.parse(response.getContentText());
}

/**
 * Xử lý lệnh từ người dùng
 */
function handleTelegramMessage(message) {
  const chatId = message.chat.id;
  const text = (message.text || '').trim();
  const userName = (message.from && message.from.first_name) || 'Bạn';

  if (handlePendingQuizAnswer_(chatId, text, userName)) {
    return;
  }
  
  // Phân tích lệnh
  if (text.startsWith('/start')) {
    handleStartCommand(chatId, userName);
  } else if (text.startsWith('/quiz')) {
    handleQuizCommand(chatId);
  } else if (text.startsWith('/dangky')) {
    handleSubscribeCommand(chatId);
  } else if (text.startsWith('/help')) {
    handleHelpCommand(chatId);
  } else {
    sendTelegramMessage(chatId, 
      `Xin chào ${userName}! Gõ /help để xem các lệnh khả dụng.`);
  }
}

/**
 * Lệnh /start
 */
function handleStartCommand(chatId, userName) {
  const siteUrl = getPublicSiteUrl_();
  const msg = `🛡️ *Chào mừng ${userName} đến TRỢ LÝ 35!*\n\n` +
    `Đây là nền tảng bản tin tự động về:\n` +
    `📰 Tin chính thống hàng ngày\n` +
    `🧠 Kiểm tra nhận thức chính trị\n\n` +
    `*Các lệnh khả dụng:*\n` +
    `/quiz - Kiểm tra nhận thức\n` +
    `/dangky - Đăng ký nhận email\n` +
    `/help - Trợ giúp\n\n` +
    `🌐 Web: ${siteUrl}`;
    
  sendTelegramMessage(chatId, msg);
}

/**
 * Lệnh /quiz
 */
function handleQuizCommand(chatId) {
  const quizzes = getRandomQuiz(1);
  
  if (quizzes.length === 0) {
    sendTelegramMessage(chatId, '❌ Hiện chưa có câu hỏi nào. Vui lòng quay lại sau!');
    return;
  }
  
  const quiz = quizzes[0];
  const msg = `🧠 *CÂU HỎI NHẬN THỨC*\n\n` +
    `*${quiz.question}*\n\n` +
    `A. ${quiz.options.A}\n` +
    `B. ${quiz.options.B}\n` +
    `C. ${quiz.options.C}\n` +
    `D. ${quiz.options.D}\n\n` +
    `_Trả lời bằng cách gõ A, B, C hoặc D_`;
  
  // Lưu state câu hỏi đang chờ trả lời (dùng PropertiesService)
  PropertiesService.getScriptProperties().setProperty(
    `quiz_${chatId}`,
    JSON.stringify(quiz)
  );
  
  sendTelegramMessage(chatId, msg);
}

/**
 * Xử lý câu trả lời A/B/C/D cho câu quiz đang chờ.
 */
function handlePendingQuizAnswer_(chatId, text, userName) {
  if (!/^[ABCD]$/i.test(text)) return false;

  const key = `quiz_${chatId}`;
  const properties = PropertiesService.getScriptProperties();
  const rawQuiz = properties.getProperty(key);

  if (!rawQuiz) return false;

  const answer = text.toUpperCase();
  let quiz;

  try {
    quiz = JSON.parse(rawQuiz);
  } catch (e) {
    properties.deleteProperty(key);
    Logger.log(`[Quiz] Không đọc được state quiz ${chatId}: ${e}`);
    return false;
  }

  properties.deleteProperty(key);

  const correct = (quiz.correct || '').toString().trim().toUpperCase();
  const isCorrect = answer === correct;
  const resultIcon = isCorrect ? '✅' : '❌';
  const resultText = isCorrect ? 'Chính xác!' : `Chưa đúng. Đáp án đúng là ${correct}.`;

  const msg = `${resultIcon} *${resultText}*\n\n` +
    `${quiz.explanation ? `📌 ${escapeMarkdown(quiz.explanation)}\n\n` : ''}` +
    `Gõ /quiz để làm câu tiếp theo.`;

  saveQuizResult({
    user: userName || `Telegram ${chatId}`,
    organization: 'Telegram',
    score: isCorrect ? 1 : 0,
    total: 1,
    details: {
      questionId: quiz.id,
      question: quiz.question,
      answer,
      correct
    }
  });

  sendTelegramMessage(chatId, msg);
  return true;
}

/**
 * Lệnh /dangky
 */
function handleSubscribeCommand(chatId) {
  const siteUrl = getPublicSiteUrl_();
  const msg = `📝 *ĐĂNG KÝ NHẬN BẢN TIN EMAIL*\n\n` +
    `Để nhận bản tin chi tiết qua email, vui lòng truy cập mục Tin tức:\n` +
    `🌐 ${siteUrl}\n\n` +
    `Hoặc tiếp tục theo dõi channel này để nhận tin nhanh hàng ngày!`;
  
  sendTelegramMessage(chatId, msg);
}

/**
 * Lệnh /help
 */
function handleHelpCommand(chatId) {
  const siteUrl = getPublicSiteUrl_();
  const msg = `❓ *HƯỚNG DẪN SỬ DỤNG*\n\n` +
    `*Các lệnh khả dụng:*\n\n` +
    `📰 /start - Bắt đầu\n` +
    `🧠 /quiz - Câu hỏi kiểm tra\n` +
    `📧 /dangky - Đăng ký nhận email\n` +
    `❓ /help - Hiển thị trợ giúp này\n\n` +
    `*Liên hệ:* @baovenentang\n` +
    `*Web:* ${siteUrl}`;
  
  sendTelegramMessage(chatId, msg);
}

/**
 * Cài đặt webhook (chạy 1 lần khi setup)
 */
function setTelegramWebhook() {
  assertRequiredConfig_(REQUIRED_TELEGRAM_CONFIG);

  if (isBlank_(CONFIG.WEB_APP_URL)) {
    throw new Error('Thiếu WEB_APP_URL. Hãy deploy Web App rồi lưu URL vào Script Properties.');
  }

  let webhookUrl = cleanValue_(CONFIG.WEB_APP_URL);
  const secret = cleanValue_(CONFIG.TELEGRAM_WEBHOOK_SECRET);
  if (secret && webhookUrl.indexOf('secret=') === -1) {
    webhookUrl += (webhookUrl.indexOf('?') === -1 ? '?' : '&') + 'secret=' + encodeURIComponent(secret);
  }

  const payload = { url: webhookUrl };
  if (secret) payload.secret_token = secret;

  const url = `${TELEGRAM_API_BASE}${CONFIG.TELEGRAM_TOKEN}/setWebhook`;
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  Logger.log(`[Webhook] ${response.getContentText()}`);
}

/**
 * Gỡ webhook khi cần debug bằng getUpdates.
 */
function deleteTelegramWebhook() {
  assertRequiredConfig_(['TELEGRAM_TOKEN']);

  const url = `${TELEGRAM_API_BASE}${CONFIG.TELEGRAM_TOKEN}/deleteWebhook`;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log(`[Webhook] ${response.getContentText()}`);
}

/**
 * Helper: Format ngày tiếng Việt
 */
function formatVietnameseDate(date) {
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const day = days[date.getDay()];
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  return `${day}, ngày ${d}/${m}/${y}`;
}

/**
 * Helper: Escape ký tự đặc biệt Markdown
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return text.toString()
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}
