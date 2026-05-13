/**
 * ============================================================
 * TRẬN ĐỊA SỐ - File cấu hình
 * ============================================================
 * QUAN TRỌNG: Điền đầy đủ các API key trước khi chạy script
 * Không chia sẻ file này công khai để bảo mật key
 * ============================================================
 */

const CONFIG = {
  // ===== Gemini AI =====
  // Lấy tại: https://aistudio.google.com/app/apikey
  GEMINI_API_KEY: 'DAN_GEMINI_API_KEY_VAO_DAY',
  GEMINI_MODEL: 'gemini-2.0-flash',
  
  // ===== Telegram Bot =====
  // Tạo bot qua @BotFather trên Telegram, lấy token
  TELEGRAM_TOKEN: 'DAN_TELEGRAM_BOT_TOKEN_VAO_DAY',
  TELEGRAM_CHANNEL: '@trandiadso_phutho', // Tên channel của bạn
  
  // ===== Brevo Email =====
  // Đăng ký tại: https://www.brevo.com/, lấy API key
  BREVO_API_KEY: 'DAN_BREVO_API_KEY_VAO_DAY',
  SENDER_EMAIL: 'no-reply@trandiadso.vn',
  SENDER_NAME: 'Trận Địa Số - Phú Thọ',
  
  // ===== Google Sheets =====
  // ID lấy từ URL của Google Sheet
  SHEET_ID: 'DAN_GOOGLE_SHEET_ID_VAO_DAY',
  
  // ===== Web App URL =====
  // URL của Web App sau khi deploy GAS
  WEB_APP_URL: 'https://script.google.com/macros/s/.../exec',
  
  // ===== Cấu hình hoạt động =====
  MAX_ARTICLES_PER_DAY: 10,    // Số bài tối đa xử lý mỗi ngày
  MAX_ARTICLES_TELEGRAM: 5,    // Số tin tối đa gửi qua Telegram
  RUN_HOUR: 6,                  // Giờ chạy hàng ngày (24h format)
  
  // ===== Email lãnh đạo nhận thông báo lỗi =====
  ADMIN_EMAIL: 'vingocphuong@example.com'
};

// ===== Nguồn RSS =====
const RSS_SOURCES = [
  { 
    url: 'https://nhandan.vn/rss/chinhtri-1.rss', 
    name: 'Báo Nhân Dân',
    priority: 1 
  },
  { 
    url: 'https://nhandan.vn/rss/phap-luat-2.rss', 
    name: 'Báo Nhân Dân - Pháp luật',
    priority: 1 
  },
  { 
    url: 'https://cand.com.vn/rss/Thoi-su-1.rss', 
    name: 'Báo CAND',
    priority: 1 
  },
  { 
    url: 'https://baochinhphu.vn/rss/thoi-su.rss', 
    name: 'Báo Chính phủ',
    priority: 1 
  },
  { 
    url: 'https://vov.vn/rss/chinh-tri-105.rss', 
    name: 'VOV',
    priority: 2 
  }
];

// ===== Từ khóa lọc bài =====
const KEYWORDS = [
  'tư tưởng', 'nghị quyết', 'an ninh', 'pháp luật',
  'chuyển đổi số', 'phòng chống', 'bảo vệ nền tảng',
  'Đảng', 'Nhà nước', 'cán bộ', 'đoàn viên',
  'tham nhũng', 'dân vận', 'tuyên giáo',
  'chống diễn biến', 'Cộng sản', 'xã hội chủ nghĩa',
  'an toàn thông tin', 'không gian mạng',
  'Phú Thọ', 'Công an'
];

// ===== Phân loại chủ đề =====
const CATEGORIES = {
  'Chính trị - Tư tưởng': '🔴',
  'An ninh - Trật tự': '🛡️',
  'Pháp luật': '⚖️',
  'Kinh tế - Phát triển': '💰',
  'Đối ngoại': '🌏',
  'Chuyển đổi số': '💻',
  'Khác': '📰'
};
