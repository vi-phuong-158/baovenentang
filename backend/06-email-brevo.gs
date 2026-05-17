/**
 * ============================================================
 * MODULE: EMAIL (BREVO)
 * Gửi bản tin qua email
 * ============================================================
 */

/**
 * Gửi bản tin email hàng ngày cho tất cả người đăng ký
 */
function sendDailyEmailDigest(articles) {
  if (!articles || articles.length === 0) {
    Logger.log('[Email] Không có bài để gửi');
    return;
  }

  if (!hasRequiredConfig_(REQUIRED_BREVO_CONFIG)) {
    Logger.log('[Email] Bỏ qua gửi email vì chưa cấu hình BREVO_API_KEY hoặc SENDER_EMAIL');
    return;
  }
  
  // Lấy danh sách đăng ký nhận email
  const subscribers = getSubscribers('Email');
  
  if (subscribers.length === 0) {
    Logger.log('[Email] Không có người đăng ký');
    return;
  }
  
  Logger.log(`[Email] Bắt đầu gửi cho ${subscribers.length} người`);
  
  let sent = 0;
  let failed = 0;
  
  subscribers.forEach(sub => {
    try {
      // Lọc bài theo chủ đề người dùng đăng ký
      const relevantArticles = filterArticlesByTopics(articles, sub.topics);
      
      if (relevantArticles.length === 0) return;
      
      const htmlBody = buildEmailHTML(sub.name, relevantArticles);
      const result = sendEmailViaBrevo({
        toEmail: sub.email,
        toName: sub.name,
        subject: `🛡️ Bản tin Trợ lý 35 - ${new Date().toLocaleDateString('vi-VN')}`,
        htmlContent: htmlBody
      });
      
      if (result.success) {
        sent++;
      } else {
        failed++;
        Logger.log(`[Email] Lỗi gửi cho ${sub.email}: ${result.error}`);
      }
      
      // Tránh rate limit, delay 100ms
      Utilities.sleep(100);
      
    } catch(e) {
      failed++;
      Logger.log(`[Email] Exception ${sub.email}: ${e}`);
    }
  });
  
  Logger.log(`[Email] ✅ Đã gửi: ${sent}, ❌ Thất bại: ${failed}`);
}

/**
 * Lọc bài viết theo chủ đề người dùng quan tâm
 */
function filterArticlesByTopics(articles, userTopics) {
  if (!userTopics || userTopics === 'Tất cả') return articles;
  
  const topics = userTopics.toString().split(',').map(t => t.trim());
  return articles.filter(a => topics.includes(a.category));
}

/**
 * Gửi email qua Brevo API
 */
function sendEmailViaBrevo(params) {
  try {
    assertRequiredConfig_(REQUIRED_BREVO_CONFIG);

    const payload = {
      sender: {
        name: CONFIG.SENDER_NAME,
        email: CONFIG.SENDER_EMAIL
      },
      to: [{
        email: params.toEmail,
        name: params.toName
      }],
      subject: params.subject,
      htmlContent: params.htmlContent
    };
    
    const response = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'post',
      headers: {
        'api-key': CONFIG.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const code = response.getResponseCode();
    if (code === 201 || code === 200) {
      return { success: true };
    }
    
    return { 
      success: false, 
      error: `Mã ${code}: ${response.getContentText()}` 
    };
    
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Xây dựng nội dung HTML email
 */
function buildEmailHTML(name, articles) {
  const today = formatVietnameseDate(new Date());
  
  // Phân nhóm bài viết
  const important = articles.filter(a => a.priority === 'Quan trọng');
  const normal = articles.filter(a => a.priority === 'Bình thường');
  
  // Build các block tin
  const importantHTML = important.map(a => buildArticleBlock(a, true)).join('');
  const normalHTML = normal.slice(0, 5).map(a => buildArticleBlock(a, false)).join('');
  
  // Thông điệp ngày
  const messageOfDay = articles.find(a => a.message)?.message || '';
  const safeName = escapeHtml_(name || 'bạn');
  
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Be Vietnam Pro',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#c0392b 0%,#8b0000 100%);padding:30px 20px;text-align:center;">
              <h1 style="color:white;margin:0;font-size:28px;letter-spacing:1px;">🛡️ TRỢ LÝ 35</h1>
              <p style="color:#fadbd8;margin:8px 0 0;font-size:14px;">Bản tin tư tưởng hàng ngày</p>
              <p style="color:#fadbd8;margin:5px 0 0;font-size:13px;">${today}</p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding:25px 30px 0;">
              <p style="margin:0;font-size:16px;color:#333;">Xin chào <strong>${safeName}</strong>,</p>
              <p style="margin:10px 0 0;color:#666;font-size:14px;line-height:1.6;">
                Trợ lý 35 gửi đến bạn các tin chọn lọc trong ngày, được phân tích và tổng hợp tự động.
              </p>
            </td>
          </tr>
          
          ${important.length > 0 ? `
          <!-- Tin quan trọng -->
          <tr>
            <td style="padding:25px 30px 0;">
              <div style="background:#fdf2f2;border-left:4px solid #c0392b;padding:12px 18px;border-radius:4px;">
                <h2 style="margin:0;color:#c0392b;font-size:18px;">🔴 TIN QUAN TRỌNG</h2>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:15px 30px 0;">
              ${importantHTML}
            </td>
          </tr>
          ` : ''}
          
          ${normal.length > 0 ? `
          <!-- Tin bình thường -->
          <tr>
            <td style="padding:25px 30px 0;">
              <div style="background:#fef9e7;border-left:4px solid #f39c12;padding:12px 18px;border-radius:4px;">
                <h2 style="margin:0;color:#d68910;font-size:18px;">🟡 HÔM NAY CẦN BIẾT</h2>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:15px 30px 0;">
              ${normalHTML}
            </td>
          </tr>
          ` : ''}
          
          ${messageOfDay ? `
          <!-- Thông điệp ngày -->
          <tr>
            <td style="padding:25px 30px;">
              <div style="background:linear-gradient(135deg,#2c3e50,#34495e);padding:25px;border-radius:8px;text-align:center;">
                <p style="color:#bdc3c7;margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">💬 Thông điệp ngày</p>
                <p style="color:white;margin:0;font-size:16px;font-style:italic;line-height:1.6;">"${escapeHtml_(messageOfDay)}"</p>
              </div>
            </td>
          </tr>
          ` : ''}
          
          <!-- CTA -->
          <tr>
            <td style="padding:0 30px 30px;text-align:center;">
              <a href="https://baovenentang.vercel.app/" 
                 style="display:inline-block;background:#c0392b;color:white;padding:12px 30px;border-radius:30px;text-decoration:none;font-weight:bold;margin:5px;">
                🧠 Làm Quiz hôm nay
              </a>
              <a href="https://baovenentang.vercel.app/" 
                 style="display:inline-block;background:#34495e;color:white;padding:12px 30px;border-radius:30px;text-decoration:none;font-weight:bold;margin:5px;">
                📚 Mở Trợ lý 35
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background:#f8f8f8;padding:25px 30px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#888;font-size:13px;line-height:1.6;">
                © 2026 <strong>Trợ lý 35</strong> — Công an tỉnh Phú Thọ<br>
                Bản tin tự động phục vụ công tác bảo vệ nền tảng tư tưởng của Đảng
              </p>
              <p style="margin:15px 0 0;font-size:12px;">
                <a href="https://baovenentang.vercel.app/" style="color:#c0392b;text-decoration:none;">Trang chủ</a> &nbsp;|&nbsp;
                <a href="https://t.me/baovenentang" style="color:#c0392b;text-decoration:none;">Telegram</a> &nbsp;|&nbsp;
                <a href="#" style="color:#999;text-decoration:none;">Hủy đăng ký</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build 1 block bài viết
 */
function buildArticleBlock(article, isImportant) {
  const icon = CATEGORIES[article.category] || '📰';
  const accent = isImportant ? '#c0392b' : '#f39c12';
  
  return `
    <div style="background:white;border:1px solid #eee;border-radius:8px;padding:18px;margin:12px 0;">
      <div style="margin-bottom:8px;">
        <span style="background:${accent};color:white;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;">
          ${icon} ${escapeHtml_(article.category || 'Khác')}
        </span>
      </div>
      <h3 style="margin:0 0 10px;color:#2c3e50;font-size:17px;line-height:1.4;">
        ${escapeHtml_(article.title || '')}
      </h3>
      <p style="margin:0 0 12px;color:#555;font-size:14px;line-height:1.6;">
        ${escapeHtml_(article.summary || '')}
      </p>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="color:#999;font-size:12px;">📰 ${escapeHtml_(article.source || '')}</span>
        <a href="${escapeHtml_(article.link || '#')}" 
           style="color:${accent};font-size:13px;font-weight:bold;text-decoration:none;">
          Đọc đầy đủ →
        </a>
      </div>
    </div>`;
}

/**
 * Gửi email chào mừng khi có người mới đăng ký
 */
function sendWelcomeEmail(subscriber) {
  if (!hasRequiredConfig_(REQUIRED_BREVO_CONFIG)) {
    Logger.log('[Email] Bỏ qua email chào mừng vì chưa cấu hình Brevo');
    return;
  }

  const safeName = escapeHtml_(subscriber.name || subscriber.email || 'bạn');
  const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#c0392b;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;">🛡️ Chào mừng đến TRỢ LÝ 35</h1>
  </div>
  <div style="background:white;padding:30px;border:1px solid #eee;border-radius:0 0 8px 8px;">
    <p>Xin chào <strong>${safeName}</strong>,</p>
    <p>Cảm ơn bạn đã đăng ký nhận bản tin Trợ lý 35!</p>
    <p>Từ ngày mai, mỗi sáng lúc 6h30, bạn sẽ nhận được bản tin tổng hợp các thông tin quan trọng về:</p>
    <ul>
      <li>📰 Tin chính trị - tư tưởng</li>
      <li>🛡️ An ninh - trật tự</li>
      <li>⚖️ Pháp luật - chính sách</li>
      <li>💻 Chuyển đổi số</li>
    </ul>
    <p>Bạn có thể truy cập website để tra cứu luận điểm phản bác và làm quiz kiểm tra nhận thức.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="https://baovenentang.vercel.app/" style="background:#c0392b;color:white;padding:12px 30px;border-radius:30px;text-decoration:none;">
        Khám phá ngay
      </a>
    </div>
    <p style="color:#888;font-size:13px;">Trân trọng,<br><strong>Đội ngũ Trợ lý 35</strong></p>
  </div>
</body></html>`;

  sendEmailViaBrevo({
    toEmail: subscriber.email,
    toName: subscriber.name,
    subject: '🛡️ Chào mừng đến Trợ lý 35!',
    htmlContent: html
  });
}

// escapeHtml_() đã chuyển sang 00-utils.gs
