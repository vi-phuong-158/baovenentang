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
function sendTelegramDailyDigest(articles) {
  if (!articles || articles.length === 0) {
    Logger.log('[Telegram] Không có bài để gửi');
    return;
  }

  if (!hasRequiredConfig_(REQUIRED_TELEGRAM_CONFIG)) {
    Logger.log('[Telegram] Bỏ qua gửi bản tin vì chưa cấu hình TELEGRAM_TOKEN hoặc TELEGRAM_CHANNEL');
    return;
  }
  
  const message = buildTelegramDigest(articles);
  
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
function buildTelegramDigest(articles) {
  const today = formatVietnameseDate(new Date());
  
  let msg = `🛡️ *BẢN TIN TRẬN ĐỊA SỐ*\n`;
  msg += `📅 _${today}_\n`;
  msg += `━━━━━━━━━━━━━━━━━\n\n`;
  
  // Phân loại theo mức ưu tiên
  const important = articles.filter(a => a.priority === 'Quan trọng');
  const normal = articles.filter(a => a.priority === 'Bình thường');
  
  // Tin quan trọng
  if (important.length > 0) {
    msg += `🔴 *TIN QUAN TRỌNG*\n\n`;
    important.slice(0, 3).forEach((a, idx) => {
      const icon = CATEGORIES[a.category] || '📰';
      msg += `${icon} *${escapeMarkdown(a.title)}*\n`;
      msg += `${escapeMarkdown(a.summary)}\n`;
      msg += `📌 [Đọc đầy đủ](${a.link})\n\n`;
    });
  }
  
  // Tin bình thường
  if (normal.length > 0) {
    msg += `🟡 *HÔM NAY CẦN BIẾT*\n\n`;
    normal.slice(0, 4).forEach(a => {
      const icon = CATEGORIES[a.category] || '📰';
      msg += `${icon} *${escapeMarkdown(a.title)}*\n`;
      msg += `${escapeMarkdown((a.summary || '').substring(0, 200))}...\n`;
      msg += `[Đọc thêm](${a.link})\n\n`;
    });
  }
  
  // Thông điệp ngày
  const messageOfDay = articles.find(a => a.message);
  if (messageOfDay && messageOfDay.message) {
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `💬 *THÔNG ĐIỆP NGÀY*\n`;
    msg += `_"${escapeMarkdown(messageOfDay.message)}"_\n\n`;
  }
  
  msg += `━━━━━━━━━━━━━━━━━\n`;
  msg += `✅ Gõ /quiz để kiểm tra nhận thức\n`;
  msg += `📚 Gõ /phanbac để tra cứu luận điểm\n`;
  msg += `🌐 Web: trandiadso.vn`;
  
  // Telegram giới hạn 4096 ký tự/tin
  if (msg.length > 4000) {
    msg = msg.substring(0, 3990) + '...';
  }
  
  return msg;
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
  } else if (text.startsWith('/phanbac')) {
    handleRebuttalCommand(chatId, text);
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
  const msg = `🛡️ *Chào mừng ${userName} đến TRẬN ĐỊA SỐ!*\n\n` +
    `Đây là nền tảng bản tin tự động về:\n` +
    `📰 Tin chính thống hàng ngày\n` +
    `🧠 Kiểm tra nhận thức chính trị\n` +
    `🛡️ Luận điểm phản bác sai trái\n\n` +
    `*Các lệnh khả dụng:*\n` +
    `/quiz - Kiểm tra nhận thức\n` +
    `/phanbac <từ khóa> - Tra cứu luận điểm\n` +
    `/dangky - Đăng ký nhận email\n` +
    `/help - Trợ giúp\n\n` +
    `🌐 Web: trandiadso.vn`;
    
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
 * Lệnh /phanbac
 */
function handleRebuttalCommand(chatId, text) {
  const keyword = text.replace('/phanbac', '').trim();
  
  if (!keyword) {
    sendTelegramMessage(chatId, 
      '📚 *Tra cứu luận điểm phản bác*\n\n' +
      'Sử dụng: `/phanbac <từ khóa>`\n' +
      'Ví dụ: `/phanbac dân chủ`');
    return;
  }
  
  const results = getRebuttals(keyword);
  
  if (results.length === 0) {
    sendTelegramMessage(chatId, `❌ Không tìm thấy luận điểm về "${keyword}"`);
    return;
  }
  
  const r = results[0];
  const msg = `📚 *LUẬN ĐIỂM PHẢN BÁC*\n\n` +
    `*Chủ đề:* ${escapeMarkdown(r.topic)}\n\n` +
    `❌ *Luận điệu sai trái:*\n${escapeMarkdown(r.wrongClaim)}\n\n` +
    `✅ *Phản bác:*\n${escapeMarkdown(r.rebuttal)}\n\n` +
    `📌 *Bằng chứng:*\n${escapeMarkdown(r.evidence)}`;
  
  sendTelegramMessage(chatId, msg);
}

/**
 * Lệnh /dangky
 */
function handleSubscribeCommand(chatId) {
  const msg = `📝 *ĐĂNG KÝ NHẬN BẢN TIN EMAIL*\n\n` +
    `Để nhận bản tin chi tiết qua email, vui lòng truy cập:\n` +
    `🌐 trandiadso.vn/dangky\n\n` +
    `Hoặc tiếp tục theo dõi channel này để nhận tin nhanh hàng ngày!`;
  
  sendTelegramMessage(chatId, msg);
}

/**
 * Lệnh /help
 */
function handleHelpCommand(chatId) {
  const msg = `❓ *HƯỚNG DẪN SỬ DỤNG*\n\n` +
    `*Các lệnh khả dụng:*\n\n` +
    `📰 /start - Bắt đầu\n` +
    `🧠 /quiz - Câu hỏi kiểm tra\n` +
    `📚 /phanbac <từ khóa> - Luận điểm phản bác\n` +
    `📧 /dangky - Đăng ký nhận email\n` +
    `❓ /help - Hiển thị trợ giúp này\n\n` +
    `*Liên hệ:* @your_username\n` +
    `*Web:* trandiadso.vn`;
  
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

  const webhookUrl = encodeURIComponent(CONFIG.WEB_APP_URL);
  const url = `${TELEGRAM_API_BASE}${CONFIG.TELEGRAM_TOKEN}/setWebhook?url=${webhookUrl}`;
  
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
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
