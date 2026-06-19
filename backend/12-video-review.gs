/**
 * ============================================================
 * MODULE: VIDEO REVIEW
 * Xử lý duyệt/từ chối video qua Telegram inline keyboard.
 * Giai đoạn 5 — Video module Trợ lý 35.
 *
 * Luồng:
 *  1. Bot gửi video vào nhóm duyệt (bước 7 Python, 07_post_telegram_review.py).
 *  2. Người duyệt bấm nút → Telegram gửi callback_query đến webhook GAS.
 *  3. doPost() (07-main.gs) nhận callback_query → gọi handleVideoCallbackQuery().
 *  4. Kiểm tra quyền → approve (copyMessage sang nhóm chính) hoặc reject.
 *  5. editMessageCaption để cập nhật trạng thái trong nhóm duyệt.
 *  6. answerCallbackQuery để tắt loading icon trên nút.
 *
 * Script Properties cần có:
 *   TELEGRAM_REVIEW_CHAT_ID  — chat_id nhóm duyệt
 *   TELEGRAM_MAIN_CHAT_ID    — chat_id nhóm chính
 *   TELEGRAM_APPROVER_IDS    — user_id cách nhau bằng dấu phẩy
 * ============================================================
 */

// ── Dispatcher ────────────────────────────────────────────────────────────────

/**
 * Entry point — gọi từ doPost() khi nhận callback_query từ Telegram webhook.
 */
function handleVideoCallbackQuery(callbackQuery) {
  if (!callbackQuery) return;

  const callbackId = callbackQuery.id;
  const data       = (callbackQuery.data || '').trim();
  const userId     = callbackQuery.from && callbackQuery.from.id;
  const userName   = callbackQuery.from
    ? (callbackQuery.from.first_name || '') + ' ' + (callbackQuery.from.last_name || '')
    : 'Không rõ';

  Logger.log(`[VideoReview] callback_query data="${data}" from user_id=${userId} (${userName.trim()})`);

  // Chỉ xử lý callback từ video review (approve/reject)
  if (data !== 'approve' && data !== 'reject') {
    Logger.log(`[VideoReview] Bỏ qua callback không liên quan: "${data}"`);
    return;
  }

  if (!isApprovedReviewer_(userId)) {
    answerCallbackQuery_(callbackId, '⛔ Bạn không có quyền duyệt video.', true);
    Logger.log(`[VideoReview] Từ chối quyền: user_id=${userId}`);
    return;
  }

  // Idempotency 2 lớp để chống race khi 2 approver bấm gần đồng thời:
  //  1) LockService global — chỉ 1 execution xử lý 1 lúc;
  //  2) CacheService per-message_id — flag tồn tại 1h, bền hơn snapshot
  //     reply_markup vì callback_query.message là snapshot lúc Telegram
  //     gửi sự kiện, có thể outdated.
  const message   = callbackQuery.message;
  const chatId    = message && message.chat && message.chat.id;
  const messageId = message && message.message_id;
  const cacheKey  = `vr_handled_${chatId}_${messageId}`;
  const cache     = CacheService.getScriptCache();
  const lock      = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    answerCallbackQuery_(callbackId, '⚠️ Hệ thống đang bận, thử lại sau vài giây.', true);
    Logger.log(`[VideoReview] LockService busy, bỏ qua cb cho message_id=${messageId}`);
    return;
  }
  try {
    if (cache.get(cacheKey) || isAlreadyHandled_(message)) {
      answerCallbackQuery_(callbackId, 'ℹ️ Video này đã được xử lý trước đó.', true);
      Logger.log(`[VideoReview] Bỏ qua callback duplicate cho message_id=${messageId}`);
      return;
    }
    // Đặt flag NGAY trước khi gọi Telegram API để execution khác (chờ lock) khi
    // lấy được lock sẽ thấy flag và skip — kể cả nếu execution này crash giữa
    // chừng cũng không xử lý lại trong 1h.
    cache.put(cacheKey, '1', 3600);

    if (data === 'approve') {
      handleVideoApprove_(callbackQuery, userName.trim());
    } else {
      handleVideoReject_(callbackQuery, userName.trim());
    }
  } finally {
    lock.releaseLock();
  }
}

function isAlreadyHandled_(message) {
  if (!message) return true;  // phantom callback → skip an toàn
  // Nếu inline_keyboard đã bị xoá → video đã xử lý
  const rm = message.reply_markup;
  if (!rm || !rm.inline_keyboard || rm.inline_keyboard.length === 0) {
    return true;
  }
  // Fallback: caption bắt đầu bằng cờ hiệu chuẩn (prefix + markdown bold) —
  // anchor đầu dòng để tránh false-positive khi nội dung bản tin trùng chữ.
  const caption = message.caption || '';
  if (/^(✅ \*ĐÃ DUYỆT VÀ ĐĂNG\*|❌ \*ĐÃ TỪ CHỐI\*)/.test(caption)) {
    return true;
  }
  return false;
}

// ── Approve ───────────────────────────────────────────────────────────────────

function handleVideoApprove_(callbackQuery, approverName) {
  const callbackId  = callbackQuery.id;
  const message     = callbackQuery.message;
  const reviewChatId = message && message.chat && message.chat.id;
  const messageId   = message && message.message_id;
  const mainChatId  = CONFIG.TELEGRAM_MAIN_CHAT_ID;

  if (!mainChatId) {
    answerCallbackQuery_(callbackId, '❌ Chưa cấu hình TELEGRAM_MAIN_CHAT_ID.', true);
    Logger.log('[VideoReview] Thiếu TELEGRAM_MAIN_CHAT_ID');
    return;
  }

  try {
    // Sao chép video sang nhóm chính (không hiện "Forwarded from")
    const nowVn = formatVietnameseDateTime_(new Date());
    const mainCaption = `🛡️ *VIDEO TRỢ LÝ 35*\n📅 ${nowVn}\n\n_Đã duyệt bởi ${escapeMarkdown(approverName)}_`;
    copyMessageToChat_(reviewChatId, messageId, mainChatId, mainCaption);

    // Cập nhật caption trong nhóm duyệt để đánh dấu đã xử lý
    const reviewCaption = `✅ *ĐÃ DUYỆT VÀ ĐĂNG*\n\n_Người duyệt: ${escapeMarkdown(approverName)}_\n_Thời gian: ${nowVn}_`;
    editMessageCaption_(reviewChatId, messageId, reviewCaption);

    answerCallbackQuery_(callbackId, '✅ Đã duyệt và đăng video lên nhóm chính.');
    Logger.log(`[VideoReview] Duyệt thành công bởi ${approverName} — đã copy sang chat ${mainChatId}`);
  } catch (err) {
    answerCallbackQuery_(callbackId, '❌ Lỗi khi duyệt, xem log GAS.', true);
    Logger.log(`[VideoReview] Lỗi approve: ${err}`);
  }
}

// ── Reject ────────────────────────────────────────────────────────────────────

function handleVideoReject_(callbackQuery, reviewerName) {
  const callbackId = callbackQuery.id;
  const message    = callbackQuery.message;
  const chatId     = message && message.chat && message.chat.id;
  const messageId  = message && message.message_id;

  try {
    const nowVn = formatVietnameseDateTime_(new Date());
    const caption = `❌ *ĐÃ TỪ CHỐI*\n\n_Người từ chối: ${escapeMarkdown(reviewerName)}_\n_Thời gian: ${nowVn}_`;
    editMessageCaption_(chatId, messageId, caption);

    answerCallbackQuery_(callbackId, '❌ Đã từ chối video. Video không được đăng.');
    Logger.log(`[VideoReview] Từ chối bởi ${reviewerName}`);
  } catch (err) {
    answerCallbackQuery_(callbackId, '❌ Lỗi khi từ chối, xem log GAS.', true);
    Logger.log(`[VideoReview] Lỗi reject: ${err}`);
  }
}

// ── Telegram API helpers ──────────────────────────────────────────────────────

function isApprovedReviewer_(userId) {
  const approverIds = CONFIG.TELEGRAM_APPROVER_IDS || '';
  if (!approverIds) return false;
  return approverIds.split(',').map(s => s.trim()).includes(String(userId));
}

function answerCallbackQuery_(callbackQueryId, text, showAlert) {
  const url = `${TELEGRAM_API_BASE}${CONFIG.TELEGRAM_TOKEN}/answerCallbackQuery`;
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text,
      show_alert: showAlert === true,
    }),
    muteHttpExceptions: true,
  });
}

/**
 * copyMessage: sao chép message từ một chat sang chat khác, override caption.
 * Tốt hơn forwardMessage vì không hiện "Forwarded from".
 */
function copyMessageToChat_(fromChatId, messageId, toChatId, caption) {
  const url = `${TELEGRAM_API_BASE}${CONFIG.TELEGRAM_TOKEN}/copyMessage`;
  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id:    toChatId,
      from_chat_id: fromChatId,
      message_id: messageId,
      caption:    caption,
      parse_mode: 'Markdown',
    }),
    muteHttpExceptions: true,
  });
  const result = JSON.parse(resp.getContentText());
  if (!result.ok) {
    throw new Error(`copyMessage thất bại: ${result.description}`);
  }
  return result.result;
}

function editMessageCaption_(chatId, messageId, caption) {
  const url = `${TELEGRAM_API_BASE}${CONFIG.TELEGRAM_TOKEN}/editMessageCaption`;
  // Đồng thời xoá inline_keyboard (gửi reply_markup rỗng) — bấm thêm sẽ không
  // còn nút Duyệt/Từ chối, và idempotency check phát hiện được "đã xử lý".
  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id:      chatId,
      message_id:   messageId,
      caption:      caption,
      parse_mode:   'Markdown',
      reply_markup: { inline_keyboard: [] },
    }),
    muteHttpExceptions: true,
  });
  const result = JSON.parse(resp.getContentText());
  if (!result.ok) {
    // Không throw — caption edit thất bại không phải lỗi nghiêm trọng
    Logger.log(`[VideoReview] editMessageCaption warning: ${result.description}`);
  }
}

// ── Export bản tin cho video pipeline ─────────────────────────────────────────

/**
 * Xuất bản tin hôm nay dạng JSON để script Python 00_fetch_input.py kéo về.
 * Trả về: { markdown: string, date: string, article_count: number }
 */
function exportVideoNewsJson_() {
  const articles = getTodayArticles();
  const dateLabel = formatVietnameseDate(new Date());

  const markdown = buildVideoNewsMarkdown_(articles, dateLabel);
  return {
    markdown:      markdown,
    date:          dateLabel,
    article_count: articles.length,
  };
}

/**
 * Dựng nội dung markdown theo cùng định dạng today_news.md mà pipeline Python kỳ vọng.
 */
function buildVideoNewsMarkdown_(articles, dateLabel) {
  const siteUrl = typeof getPublicSiteUrl_ === 'function'
    ? getPublicSiteUrl_()
    : 'https://www.troly35.info.vn/';
  let md = `🛡️ BẢN TIN TRỢ LÝ 35\n`;
  md += `📅 ${dateLabel}\n`;
  md += `━━━━━━━━━━━━━━━━━\n\n`;

  // Tổng quan — ghép các tóm tắt tin quan trọng
  const important = articles.filter(a => a.priority === 'Quan trọng');
  const normal    = articles.filter(a => a.priority !== 'Quan trọng');

  if (articles.length > 0) {
    md += `📋 TỔNG QUAN NGÀY\n`;
    articles.slice(0, 2).forEach(a => {
      if (a.summary) md += `${a.summary.trim()} `;
    });
    md += '\n\n━━━━━━━━━━━━━━━━━\n\n';
  }

  if (important.length > 0) {
    md += `🔴 TIN QUAN TRỌNG\n\n`;
    important.forEach(a => {
      const icon = CATEGORIES[a.category] || '📰';
      md += `${icon} ${a.title}\n`;
      if (a.source) md += `Nguồn: ${a.source}\n`;
      if (a.summary) md += `${a.summary}\n`;
      if (a.link) md += `[Đọc đầy đủ](${a.link})\n`;
      md += '\n';
    });
  }

  if (normal.length > 0) {
    md += `🟡 HÔM NAY CẦN BIẾT\n\n`;
    normal.forEach(a => {
      const icon = CATEGORIES[a.category] || '📰';
      md += `${icon} ${a.title}\n`;
      if (a.source) md += `Nguồn: ${a.source}\n`;
      if (a.summary) md += `${a.summary}\n`;
      if (a.link) md += `[Đọc thêm](${a.link})\n`;
      md += '\n';
    });
  }

  // Thông điệp ngày
  const msgArticle = articles.find(a => a.message && String(a.message).trim());
  if (msgArticle) {
    md += `━━━━━━━━━━━━━━━━━\n`;
    md += `💬 THÔNG ĐIỆP NGÀY\n`;
    md += `_"${String(msgArticle.message).trim()}"_\n\n`;
  }

  md += `━━━━━━━━━━━━━━━━━\n`;
  md += `✅ Gõ /quiz để kiểm tra nhận thức\n`;
  md += `🌐 Web: ${siteUrl}`;

  return md;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatVietnameseDateTime_(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
