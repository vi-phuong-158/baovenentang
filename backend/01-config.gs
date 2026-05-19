/**
 * ============================================================
 * TRỢ LÝ 35 - Cấu hình Google Apps Script
 * ============================================================
 * Khuyến nghị triển khai:
 * - Không điền API key trực tiếp trong file này.
 * - Vào Apps Script > Project Settings > Script Properties.
 * - Thêm các key theo mẫu trong hàm showConfigSetupInstructions().
 * ============================================================
 */

const CONFIG_DEFAULTS = {
  // ===== Gemini AI =====
  GEMINI_API_KEY: '',
  GEMINI_MODEL: 'gemini-2.5-flash',
  GEMINI_EMBEDDING_MODEL: 'gemini-embedding-2',

  // ===== Telegram Bot =====
  TELEGRAM_TOKEN: '',
  TELEGRAM_CHANNEL: '',
  TELEGRAM_WEBHOOK_SECRET: '',

  // ===== API Security =====
  API_ACCESS_TOKEN: '',

  // ===== Brevo Email =====
  BREVO_API_KEY: '',
  SENDER_EMAIL: '',
  SENDER_NAME: 'Trợ lý 35 - Phú Thọ',

  // ===== Google Sheets =====
  SHEET_ID: '',

  // ===== Pinecone RAG cho Trợ lý 35 =====
  PINECONE_API_KEY: '',
  PINECONE_INDEX_HOST: '',
  PINECONE_NAMESPACE: 'troly35',

  // ===== Trợ lý 35 =====
  TROLY35_ACCESS_CODE_SHA256: '',
  TROLY35_DAILY_LIMIT: 50,
  TROLY35_SAVE_FULL_INPUT: false,

  // ===== Scrape Tạp chí Cộng sản cho Trợ lý 35 =====
  TCCS_BASE_URL: 'https://www.tapchicongsan.org.vn',
  TCCS_SECTION_PATH: '/dau-tranh-phan-bac-cac-luan-dieu-sai-trai-thu-dich',
  TCCS_MAX_ARTICLES_PER_RUN: 5,
  TCCS_REQUEST_DELAY_MS: 2500,

  // ===== Crawl nguồn HTML không có RSS =====
  HTML_SOURCE_MAX_ARTICLES_PER_SOURCE: 5,
  HTML_SOURCE_REQUEST_DELAY_MS: 1500,

  // ===== Ban tin 35 tu cac nguon cong khai can theo doi =====
  BANTIN35_MAX_ITEMS_PER_SOURCE: 5,
  BANTIN35_LOOKBACK_DAYS: 7,
  BANTIN35_REQUEST_DELAY_MS: 1500,

  // ===== Web App URL =====
  WEB_APP_URL: '',

  // ===== Cấu hình hoạt động =====
  MAX_ARTICLES_PER_DAY: 10,
  MAX_ARTICLES_TELEGRAM: 5,
  RUN_HOUR: 6,

  // ===== Email admin nhận thông báo lỗi =====
  ADMIN_EMAIL: ''
};

const CONFIG = loadConfig_();

const REQUIRED_SHEET_CONFIG = ['SHEET_ID'];
const REQUIRED_GEMINI_CONFIG = ['GEMINI_API_KEY'];
const REQUIRED_PINECONE_CONFIG = ['PINECONE_API_KEY', 'PINECONE_INDEX_HOST'];
const REQUIRED_TROLY35_CONFIG = ['GEMINI_API_KEY', 'PINECONE_API_KEY', 'PINECONE_INDEX_HOST', 'TROLY35_ACCESS_CODE_SHA256'];
const REQUIRED_TELEGRAM_CONFIG = ['TELEGRAM_TOKEN', 'TELEGRAM_CHANNEL'];
const REQUIRED_BREVO_CONFIG = ['BREVO_API_KEY', 'SENDER_EMAIL'];

/**
 * Đọc cấu hình từ Script Properties, fallback sang CONFIG_DEFAULTS.
 */
function loadConfig_() {
  let properties = {};

  try {
    properties = PropertiesService.getScriptProperties().getProperties();
  } catch (e) {
    Logger.log(`[Config] Không đọc được Script Properties: ${e}`);
  }

  return Object.keys(CONFIG_DEFAULTS).reduce((config, key) => {
    const fallback = CONFIG_DEFAULTS[key];
    const value = properties[key];
    config[key] = value !== undefined && value !== ''
      ? coerceConfigValue_(value, fallback)
      : fallback;
    return config;
  }, {});
}

function coerceConfigValue_(value, fallback) {
  if (typeof fallback === 'number') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  if (typeof fallback === 'boolean') {
    return ['true', '1', 'yes', 'y', 'on'].includes(value.toString().trim().toLowerCase());
  }

  return value;
}

function assertRequiredConfig_(keys) {
  const missing = getMissingConfigKeys_(keys);
  if (missing.length > 0) {
    throw new Error(
      `Thiếu cấu hình Script Properties: ${missing.join(', ')}. ` +
      'Chạy showConfigSetupInstructions() để xem mẫu cấu hình.'
    );
  }
}

function hasRequiredConfig_(keys) {
  return getMissingConfigKeys_(keys).length === 0;
}

function getMissingConfigKeys_(keys) {
  return keys.filter(key => isBlank_(CONFIG[key]));
}

function isBlank_(value) {
  return value === undefined || value === null || value.toString().trim() === '';
}

/**
 * Chạy hàm này trong Apps Script để xem danh sách Script Properties cần điền.
 */
function showConfigSetupInstructions() {
  const sample = {
    SHEET_ID: 'ID_GOOGLE_SHEET',
    GEMINI_API_KEY: 'AIza...',
    GEMINI_MODEL: 'gemini-2.0-flash',
    GEMINI_EMBEDDING_MODEL: 'gemini-embedding-2',
    PINECONE_API_KEY: 'pcsk_...',
    PINECONE_INDEX_HOST: 'https://your-index-xxxx.svc.aped-xxxx.pinecone.io',
    PINECONE_NAMESPACE: 'troly35',
    TROLY35_ACCESS_CODE_SHA256: 'sha256_cua_ma_truy_cap_noi_bo',
    TROLY35_DAILY_LIMIT: '50',
    TROLY35_SAVE_FULL_INPUT: 'false',
    TCCS_BASE_URL: 'https://www.tapchicongsan.org.vn',
    TCCS_SECTION_PATH: '/dau-tranh-phan-bac-cac-luan-dieu-sai-trai-thu-dich',
    TCCS_MAX_ARTICLES_PER_RUN: '5',
    TCCS_REQUEST_DELAY_MS: '2500',
    HTML_SOURCE_MAX_ARTICLES_PER_SOURCE: '5',
    HTML_SOURCE_REQUEST_DELAY_MS: '1500',
    BANTIN35_MAX_ITEMS_PER_SOURCE: '5',
    BANTIN35_LOOKBACK_DAYS: '7',
    BANTIN35_REQUEST_DELAY_MS: '1500',
    TELEGRAM_TOKEN: '123456789:ABC...',
    TELEGRAM_CHANNEL: '@ten_channel',
    TELEGRAM_WEBHOOK_SECRET: 'secret_ngau_nhien_cho_webhook_telegram',
    API_ACCESS_TOKEN: 'token_ngau_nhien_cho_api_noi_bo',
    BREVO_API_KEY: 'xkeysib-...',
    SENDER_EMAIL: 'email-da-verify@domain.vn',
    SENDER_NAME: 'Trợ lý 35 - Phú Thọ',
    WEB_APP_URL: 'https://script.google.com/macros/s/.../exec',
    ADMIN_EMAIL: 'admin@domain.vn',
    MAX_ARTICLES_PER_DAY: '10',
    MAX_ARTICLES_TELEGRAM: '5',
    RUN_HOUR: '6'
  };

  Logger.log('Vào Apps Script > Project Settings > Script Properties và thêm các key sau:');
  Logger.log(JSON.stringify(sample, null, 2));
}

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
    url: 'https://cand.com.vn/rssfeed/',
    name: 'Báo CAND',
    priority: 1
  },
  {
    url: 'https://baochinhphu.vn/home.rss',
    name: 'Báo Chính phủ',
    priority: 1
  },
  {
    url: 'https://vietnamnet.vn/rss/chinh-tri.rss',
    name: 'Vietnamnet - Chính trị',
    priority: 2
  }
];

// ===== Nguồn HTML không có RSS =====
const HTML_SOURCES = [
  {
    url: 'https://tuyengiaodanvan.vn/vn',
    listUrls: [
      'https://tuyengiaodanvan.vn/vn',
      'https://tuyengiaodanvan.vn/vn/van-ban',
      'https://tuyengiaodanvan.vn/vn/bao-ve-nen-tang-tu-tuong-cua-dang'
    ],
    name: 'Ban Tuyên giáo và Dân vận Trung ương',
    priority: 1,
    extractEmbeddedArticles: true,
    skipLinkCrawler: true,
    articleUrlPatterns: [
      /^https:\/\/tuyengiaodanvan\.vn\/vn\/(?!van-ban(?:\/|$)|$)[^?#]+/i,
      /^https:\/\/tuyengiaodanvan\.vn\/(?!api\/v1\/upload|categories\/|_next\/|favicon)[^?#]+-[0-9a-f]{12,}[^?#]*$/i
    ],
    excludeUrlPatterns: [
      /\.(?:pdf|docx?|xlsx?|pptx?)(?:\?|$)/i,
      /\/api\/v1\/upload/i,
      /(?:jpg|jpeg|png|gif|webp)-[0-9a-f]{12,}/i,
      /\/login|\/dang-nhap|\/search|\/tim-kiem/i
    ]
  },
  {
    url: 'https://congan.phutho.gov.vn/',
    listUrls: [
      'https://congan.phutho.gov.vn/'
    ],
    name: 'Công an tỉnh Phú Thọ',
    priority: 1,
    articleUrlPatterns: [
      /^https:\/\/congan\.phutho\.gov\.vn\/article\/[^?#]+/i
    ],
    excludeUrlPatterns: [
      /\.(?:pdf|docx?|xlsx?|pptx?)(?:\?|$)/i
    ],
    contentPatterns: [
      /<div[^>]+class=["'][^"']*(?:news-detail|article-detail|content-detail|detail-content|entry-content|post-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      /<article[^>]*>([\s\S]*?)<\/article>/gi
    ]
  },
  {
    url: 'https://lyluanchinhtri.vn/',
    listUrls: [
      'https://lyluanchinhtri.vn/',
      'https://lyluanchinhtri.vn/bao-ve-nen-tang-tu-tuong-cua-dang'
    ],
    name: 'Tạp chí Lý luận chính trị',
    priority: 1,
    articleUrlPatterns: [
      /^https:\/\/lyluanchinhtri\.vn\/[^\/?#]+-\d+\.html(?:\?.*)?$/i
    ],
    excludeUrlPatterns: [
      /\.(?:pdf|docx?|xlsx?|pptx?)(?:\?|$)/i
    ],
    contentPatterns: [
      /<div[^>]+class=["'][^"']*(?:article-content|detail-content|entry-content|post-content|content-detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
      /<article[^>]*>([\s\S]*?)<\/article>/gi
    ]
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
