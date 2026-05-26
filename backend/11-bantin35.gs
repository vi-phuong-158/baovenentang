/**
 * ============================================================
 * MODULE: BAN TIN 35
 * Doc noi dung cong khai tu mot so nguon doi lap/hai ngoai,
 * dung AI tom tat cac noi dung chinh va luu thanh ban tin noi bo.
 *
 * Luu y thiet ke:
 * - Khong theo doi du luan, binh luan ca nhan hay tai khoan ca nhan.
 * - Ban tin noi bo gui Telegram co kem link nguon de can bo phu trach
 *   kiem chung thu cong khi can.
 * - Khong tu dong dang, chia se, hoac tao chien dich phan hoi.
 * ============================================================
 */

const BANTIN35_DEFAULT_MAX_ITEMS_PER_SOURCE = 5;
const BANTIN35_DEFAULT_LOOKBACK_DAYS = 7;
const BANTIN35_MAX_AI_ITEMS = 12;
const BANTIN35_AI_EXCERPT_CHARS = 1200;
const BANTIN35_MAX_CONTENT_CHARS = 4500;
const BANTIN35_REQUEST_DELAY_MS = 1500;

const BANTIN35_SOURCE_DEFINITIONS = [
  {
    id: 'rfa_vi',
    name: 'RFA Tiếng Việt',
    type: 'rss',
    rssUrl: 'https://www.rfa.org/arc/outboundfeeds/vietnamese/rss/',
    maxItems: 5
  },
  {
    id: 'voa_vi',
    name: 'VOA Tiếng Việt',
    type: 'rss_index',
    rssIndexUrl: 'https://www.voatiengviet.com/rssfeeds',
    maxFeeds: 4,
    maxItems: 5
  },
  {
    id: 'bbc_vi',
    name: 'BBC News Tiếng Việt',
    type: 'html',
    listUrl: 'https://www.bbc.com/vietnamese',
    maxItems: 5,
    articleUrlPatterns: [
      /^https:\/\/www\.bbc\.com\/vietnamese\/articles\/[a-z0-9]+/i,
      /^https:\/\/www\.bbc\.com\/vietnamese\/vietnam-[^?#]+/i,
      /^https:\/\/www\.bbc\.com\/vietnamese\/world-[^?#]+/i
    ],
    excludeUrlPatterns: [
      /\/av\//i,
      /\/media-/i,
      /\.(?:jpg|jpeg|png|gif|webp|mp4|mp3)(?:\?|$)/i
    ]
  },
  {
    id: 'rfi_vi',
    name: 'RFI Tiếng Việt',
    type: 'html',
    listUrl: 'https://www.rfi.fr/vi/',
    maxItems: 5,
    articleUrlPatterns: [
      /^https:\/\/www\.rfi\.fr\/vi\/[^?#]+\/\d{8}-[^?#]+/i,
      /^https:\/\/www\.rfi\.fr\/vi\/vi%E1%BB%87t-nam\/\d{8}-[^?#]+/i
    ],
    excludeUrlPatterns: [
      /\/podcast\//i,
      /\/ph%C3%A1t-tr%E1%BB%B1c-ti%E1%BA%BFp/i,
      /\.(?:jpg|jpeg|png|gif|webp|mp4|mp3)(?:\?|$)/i
    ]
  }
];

const BANTIN35_SHEET_HEADERS = {
  BANTIN35_ITEMS: [
    'Thời gian quét', 'Nguồn', 'Tiêu đề', 'Ngày đăng',
    'Nội dung trích xuất', 'Tóm tắt chính', 'Chủ đề',
    'Luận điểm nhạy cảm JSON', 'Cách đặt vấn đề', 'Mức rủi ro',
    'Từ khóa', 'URL nội bộ', 'Content Hash', 'Trạng thái'
  ],
  BANTIN35_REPORTS: [
    'Thời gian tạo', 'Cửa sổ ngày', 'Nguồn', 'Số mục',
    'Tiêu đề bản tin', 'Tóm tắt chung', 'Chủ đề nổi bật JSON',
    'Luận điểm chính JSON', 'Khuyến nghị theo dõi JSON',
    'Bản tin nội bộ', 'Trạng thái',
    'Tóm tắt rủi ro', 'Luận điểm nhạy cảm JSON',
    'Khung diễn giải JSON', 'Điểm cần kiểm chứng JSON',
    'Ưu tiên xử lý JSON', 'Link nguồn JSON'
  ],
  BANTIN35_LOG: [
    'Thời gian', 'Action', 'Nguồn/URL', 'Trạng thái', 'Message'
  ]
};

const BANTIN35_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    item_summaries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          topic: { type: 'string' },
          main_summary: { type: 'string' },
          sensitive_claims: { type: 'array', items: { type: 'string' } },
          framing: { type: 'string' },
          risk_level: { type: 'integer' },
          keywords: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'topic', 'main_summary', 'sensitive_claims', 'framing', 'risk_level', 'keywords']
      }
    },
    report: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        overview: { type: 'string' },
        top_topics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              count: { type: 'integer' },
              summary: { type: 'string' }
            },
            required: ['topic', 'count', 'summary']
          }
        },
        main_narratives: { type: 'array', items: { type: 'string' } },
        risk_summary: { type: 'string' },
        sensitive_claims_summary: { type: 'array', items: { type: 'string' } },
        framing_patterns: { type: 'array', items: { type: 'string' } },
        verification_needed: { type: 'array', items: { type: 'string' } },
        response_priority: { type: 'array', items: { type: 'string' } },
        recommended_follow_up: { type: 'array', items: { type: 'string' } },
        editor_note: { type: 'string' }
      },
      required: [
        'title', 'overview', 'top_topics', 'main_narratives',
        'risk_summary', 'sensitive_claims_summary', 'framing_patterns',
        'verification_needed', 'response_priority',
        'recommended_follow_up', 'editor_note'
      ]
    }
  },
  required: ['item_summaries', 'report']
};

function runBanTin35Digest(maxItems) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG.concat(REQUIRED_GEMINI_CONFIG));
  initializeBanTin35Sheets();

  const startedAt = new Date();
  const maxPerSource = Math.max(
    1,
    Number(maxItems) ||
      Number(CONFIG.BANTIN35_MAX_ITEMS_PER_SOURCE) ||
      BANTIN35_DEFAULT_MAX_ITEMS_PER_SOURCE
  );

  banTin35WriteLog_('runBanTin35Digest', '', 'start', `Bat dau quet toi da ${maxPerSource} muc/nguon`);

  const existingHashes = banTin35GetExistingHashes_();
  const fetchedItems = banTin35FetchAllSources_(maxPerSource);
  const recentItems = fetchedItems.filter(item => banTin35IsRecent_(item.publishedAt));
  const enrichedItems = recentItems
    .map(item => {
      const content = banTin35EnsureArticleContent_(item);
      const hash = banTin35Hash_([item.sourceId, item.link, item.title, content].join('\n'));
      return Object.assign({}, item, {
        content,
        contentHash: hash
      });
    });
  const newItems = enrichedItems
    .filter(item => !existingHashes.has(item.contentHash))
    .slice(0, BANTIN35_MAX_AI_ITEMS);

  Logger.log(`[BanTin35] Ung vien fetch: ${fetchedItems.length}, trong cua so ngay: ${recentItems.length}, moi sau dedupe: ${newItems.length}`);
  banTin35WriteLog_(
    'runBanTin35Digest',
    '',
    'info',
    `Fetch ${fetchedItems.length}, recent ${recentItems.length}, new ${newItems.length}`
  );

  let itemsForReport = newItems;
  let sourceMode = 'new';
  let savedItems = 0;

  if (itemsForReport.length === 0) {
    const storedItems = banTin35GetStoredItemsForDigest_(BANTIN35_MAX_AI_ITEMS);
    if (storedItems.length === 0) {
      banTin35WriteLog_('runBanTin35Digest', '', 'done', 'Khong co noi dung moi va chua co item cu de tao lai ban tin');
      Logger.log('[BanTin35] Khong co noi dung moi va BANTIN35_ITEMS chua co du lieu de tao lai ban tin.');
      return {
        success: true,
        savedItems: 0,
        report: null,
        message: 'Khong co noi dung moi va chua co item cu de tao lai ban tin.',
        counters: {
          fetched: fetchedItems.length,
          recent: recentItems.length,
          newItems: newItems.length
        }
      };
    }

    itemsForReport = storedItems;
    sourceMode = 'stored';
    Logger.log(`[BanTin35] Khong co item moi; tao lai ban tin tu ${storedItems.length} item da luu gan nhat.`);
    banTin35WriteLog_('runBanTin35Digest', '', 'reuse', `Tao lai ban tin tu ${storedItems.length} item da luu gan nhat`);
  }

  const analysis = banTin35AnalyzeItems_(itemsForReport);
  if (sourceMode === 'new') {
    savedItems = banTin35SaveItems_(itemsForReport, analysis.item_summaries || []);
  }
  const report = banTin35SaveReport_(analysis.report || {}, itemsForReport, startedAt);

  banTin35WriteLog_('runBanTin35Digest', '', 'done', `Da luu ${savedItems} muc va 1 ban tin (${sourceMode})`);

  return {
    success: true,
    savedItems,
    sourceMode,
    report: banTin35ReportForApi_(report),
    counters: {
      fetched: fetchedItems.length,
      recent: recentItems.length,
      newItems: newItems.length
    }
  };
}

function handleBanTin35Generate(data) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG.concat(REQUIRED_GEMINI_CONFIG));
  banTin35RequireAccess_(data && data.accessCode);

  const maxItems = Math.min(10, Math.max(1, Number(data && data.maxItems) || BANTIN35_DEFAULT_MAX_ITEMS_PER_SOURCE));
  return runBanTin35Digest(maxItems);
}

function handleBanTin35Latest(data) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG);
  banTin35RequireAccess_(data && data.accessCode);

  const report = banTin35GetLatestReport_();
  return {
    success: true,
    data: report ? banTin35ReportForApi_(report) : null
  };
}

function runBanTin35DailyStep() {
  try {
    const result = runBanTin35Digest();
    if (result && result.success && result.report) {
      if (result.sourceMode === 'stored') {
        Logger.log('[BanTin35] Gui ban tin tao lai tu du lieu da luu gan nhat.');
      }
      sendBanTin35DigestNotifications(result.report);
    } else {
      const counters = result && result.counters
        ? ` Fetch ${result.counters.fetched}, recent ${result.counters.recent}, new ${result.counters.newItems}.`
        : '';
      Logger.log(`[BanTin35] Khong co ban tin de gui.${counters}`);
    }
    return result;
  } catch (error) {
    Logger.log(`[BanTin35] Loi khi tao/gui ban tin hang ngay: ${error}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

function sendBanTin35DigestNotifications(report) {
  if (!report) return;

  sendBanTin35TelegramDigest_(report);
}

function initializeBanTin35Sheets() {
  const ss = getSpreadsheet_();
  Object.keys(BANTIN35_SHEET_HEADERS).forEach(name => {
    createSheetIfNotExists(ss, name, BANTIN35_SHEET_HEADERS[name]);
  });
}

function banTin35FetchAllSources_(maxPerSource) {
  const allItems = [];

  BANTIN35_SOURCE_DEFINITIONS.forEach(source => {
    try {
      banTin35WriteLog_('fetchSource', source.name, 'processing', 'Dang doc nguon');
      let items = [];

      if (source.type === 'rss') {
        items = banTin35FetchRssItems_(source.rssUrl, source);
      } else if (source.type === 'rss_index') {
        items = banTin35FetchRssIndexItems_(source);
      } else {
        items = banTin35FetchHtmlListItems_(source);
      }

      const limit = Math.max(1, Number(source.maxItems) || maxPerSource);
      items.slice(0, Math.min(limit, maxPerSource)).forEach(item => allItems.push(item));
      banTin35WriteLog_('fetchSource', source.name, 'success', `Lay duoc ${items.length} muc ung vien`);
    } catch (error) {
      banTin35WriteLog_('fetchSource', source.name, 'error', error.toString());
    }
  });

  return banTin35DeduplicateItems_(allItems);
}

function banTin35FetchRssIndexItems_(source) {
  const response = banTin35Fetch_(source.rssIndexUrl);
  if (response.getResponseCode() !== 200) {
    throw new Error(`RSS index HTTP ${response.getResponseCode()}`);
  }

  const html = response.getContentText('UTF-8');
  const feedUrls = banTin35ExtractLinks_(html, source.rssIndexUrl)
    .filter(link => /\/api\/|\/rss|outboundfeeds/i.test(link.url))
    .map(link => link.url)
    .filter((url, index, arr) => arr.indexOf(url) === index)
    .slice(0, Math.max(1, Number(source.maxFeeds) || 3));

  if (feedUrls.length === 0) {
    return banTin35FetchHtmlListItems_(Object.assign({}, source, {
      type: 'html',
      listUrl: source.rssIndexUrl
    }));
  }

  let items = [];
  feedUrls.forEach((feedUrl, index) => {
    if (index > 0) banTin35Sleep_();
    try {
      items = items.concat(banTin35FetchRssItems_(feedUrl, source));
    } catch (error) {
      banTin35WriteLog_('fetchRssFeed', feedUrl, 'error', error.toString());
    }
  });

  return items;
}

function banTin35FetchRssItems_(rssUrl, source) {
  const response = banTin35Fetch_(rssUrl);
  if (response.getResponseCode() !== 200) {
    throw new Error(`RSS HTTP ${response.getResponseCode()}`);
  }

  const xml = XmlService.parse(response.getContentText('UTF-8'));
  const root = xml.getRootElement();
  const channel = root.getChild('channel');
  const items = channel ? channel.getChildren('item') : root.getChildren('entry', root.getNamespace());

  return items.map(item => {
    const isAtom = item.getName() === 'entry';
    const ns = isAtom ? item.getNamespace() : null;
    const title = isAtom ? item.getChildText('title', ns) : item.getChildText('title');
    const description = isAtom
      ? item.getChildText('summary', ns)
      : (item.getChildText('description') || item.getChildText('content:encoded'));
    const link = isAtom ? banTin35AtomLink_(item) : item.getChildText('link');
    const publishedAt = isAtom ? item.getChildText('updated', ns) : item.getChildText('pubDate');

    return {
      sourceId: source.id,
      sourceName: source.name,
      title: banTin35CleanText_(title),
      description: banTin35CleanText_(description),
      link: banTin35NormalizeUrl_(link, rssUrl),
      publishedAt: publishedAt || '',
      content: ''
    };
  }).filter(item => item.title && item.link);
}

function banTin35FetchHtmlListItems_(source) {
  const response = banTin35Fetch_(source.listUrl);
  if (response.getResponseCode() !== 200) {
    throw new Error(`HTML list HTTP ${response.getResponseCode()}`);
  }

  const html = response.getContentText('UTF-8');
  const links = banTin35ExtractLinks_(html, source.listUrl);
  const seen = {};
  const items = [];

  links.forEach(link => {
    if (!banTin35SourceAllowsUrl_(link.url, source)) return;
    if (seen[link.url]) return;
    seen[link.url] = true;

    items.push({
      sourceId: source.id,
      sourceName: source.name,
      title: banTin35CleanText_(link.text),
      description: '',
      link: link.url,
      publishedAt: '',
      content: ''
    });
  });

  return items;
}

function banTin35EnsureArticleContent_(item) {
  const fallback = [item.title, item.description].filter(Boolean).join('\n');

  if (!item.link) return fallback.substring(0, BANTIN35_MAX_CONTENT_CHARS);

  try {
    banTin35Sleep_();
    const response = banTin35Fetch_(item.link);
    if (response.getResponseCode() !== 200) return fallback.substring(0, BANTIN35_MAX_CONTENT_CHARS);

    const html = response.getContentText('UTF-8');
    const title = item.title || banTin35ExtractTitle_(html);
    const description = item.description || banTin35ExtractMetaDescription_(html);
    const mainText = banTin35ExtractMainText_(html);
    const content = [title, description, mainText].filter(Boolean).join('\n\n');
    return banTin35CleanArticleText_(content || fallback).substring(0, BANTIN35_MAX_CONTENT_CHARS);
  } catch (error) {
    banTin35WriteLog_('fetchArticleContent', item.link, 'error', error.toString());
    return fallback.substring(0, BANTIN35_MAX_CONTENT_CHARS);
  }
}

function banTin35AnalyzeItems_(items) {
  const aiInput = items.map((item, index) => ({
    id: index,
    source: item.sourceName,
    title: item.title,
    published_at: item.publishedAt || '',
    content_excerpt: item.content.substring(0, BANTIN35_AI_EXCERPT_CHARS)
  }));

  const prompt = `Bạn là trợ lý biên tập Bản tin 35 nội bộ.
Nhiệm vụ: đọc các mục nội dung từ một số nguồn công khai cần theo dõi, gom chủ đề trùng nhau và viết bản tin nghiệp vụ ngắn gọn bằng tiếng Việt có dấu đầy đủ.

QUY TẮC BẮT BUỘC:
1. Chỉ tóm tắt, phân loại, đánh giá mức cần chú ý; không viết lời kêu gọi hành động, không công kích cá nhân.
2. Không tạo link, không đưa URL vào kết quả. Hệ thống sẽ tự gắn link nguồn sau.
3. Không suy diễn dư luận xã hội. Chỉ viết về "bài viết", "nguồn được quét" hoặc "nhóm nội dung được quét".
4. Tránh lặp cụm "các nguồn này đang tập trung vào". Mỗi ý viết thẳng vào nội dung chính.
5. Bỏ qua hoặc hạ ưu tiên mục ít giá trị nghiệp vụ như tin tổng hợp, chương trình, diễn đàn, văn hóa giải trí nếu không liên quan trực tiếp Việt Nam, chính trị, an ninh, đối ngoại, kinh tế hoặc thông tin sai lệch.
6. overview tối đa 3 câu. top_topics tối đa 4 mục. main_narratives tối đa 5 mục, mỗi mục tối đa 25 từ.
7. risk_summary tối đa 2 câu. sensitive_claims_summary, framing_patterns, verification_needed, response_priority và recommended_follow_up tối đa 4 mục mỗi loại.
8. Nếu bài nêu cáo buộc hoặc nhận định một chiều, phải viết theo dạng gián tiếp như "bài viết cho rằng/nêu/đặt vấn đề", không biến cáo buộc thành khẳng định sự thật.
9. Nếu nội dung thiếu căn cứ, một chiều, hoặc có dấu hiệu bôi nhọ/xuyên tạc, ghi nhận ở sensitive_claims/framing và phần tổng hợp tương ứng.
10. Trả về JSON đúng schema, toàn bộ nội dung tiếng Việt có dấu.

DANH SÁCH NỘI DUNG:
${JSON.stringify(aiInput, null, 2)}`;

  try {
    const text = callGeminiAPI(prompt, BANTIN35_ANALYSIS_SCHEMA);
    const parsed = banTin35ParseJson_(text);
    return banTin35NormalizeAnalysis_(parsed, items);
  } catch (error) {
    Logger.log(`[BanTin35] Gemini structured analysis loi, retry khong schema: ${error}`);
    banTin35WriteLog_('analyzeItemsStructured', '', 'error', error.toString());
  }

  try {
    const retryPrompt = `${prompt}

NẾU KHÔNG DÙNG SCHEMA, HÃY TRẢ VỀ ĐÚNG JSON OBJECT THEO MẪU SAU, KHÔNG THÊM MARKDOWN:
{
  "item_summaries": [
    {
      "id": 0,
      "topic": "chủ đề ngắn gọn",
      "main_summary": "tóm tắt 1 câu",
      "sensitive_claims": ["nội dung/luận điểm nhạy cảm nếu có"],
      "framing": "cách đặt vấn đề của bài",
      "risk_level": 1,
      "keywords": ["từ khóa"]
    }
  ],
  "report": {
    "title": "Bản tin 35 nội bộ",
    "overview": "tóm tắt chung ngắn gọn",
    "top_topics": [{"topic": "chủ đề", "count": 1, "summary": "tóm tắt 1 câu"}],
    "main_narratives": ["nội dung chính"],
    "risk_summary": "nhận định ngắn về mức rủi ro thông tin",
    "sensitive_claims_summary": ["luận điểm/cáo buộc cần chú ý"],
    "framing_patterns": ["cách đặt vấn đề nổi bật"],
    "verification_needed": ["điểm cần kiểm chứng trước khi sử dụng"],
    "response_priority": ["việc cần ưu tiên xử lý hoặc theo dõi"],
    "recommended_follow_up": ["việc cần theo dõi tiếp"],
    "editor_note": "ghi chú biên tập"
  }
}`;

    const text = callGeminiAPI(retryPrompt);
    const parsed = banTin35ParseJson_(text);
    return banTin35NormalizeAnalysis_(parsed, items);
  } catch (error) {
    Logger.log(`[BanTin35] Gemini retry van loi, dung fallback: ${error}`);
    banTin35WriteLog_('analyzeItemsRetry', '', 'error', error.toString());
    return banTin35BuildFallbackAnalysis_(items);
  }
}

function banTin35SaveItems_(rawItems, summaries) {
  const sheet = banTin35GetSheet_('BANTIN35_ITEMS');
  const summaryById = {};
  (summaries || []).forEach(item => {
    summaryById[String(item.id)] = item;
  });

  const rows = rawItems.map((item, index) => {
    const summary = summaryById[String(index)] || {};
    return [
      new Date(),
      item.sourceName,
      item.title,
      item.publishedAt || '',
      item.content.substring(0, 4000),
      cleanValue_(summary.main_summary || item.description || item.title).substring(0, 1500),
      cleanValue_(summary.topic || 'Chưa phân loại'),
      JSON.stringify(summary.sensitive_claims || []),
      cleanValue_(summary.framing || ''),
      Math.min(5, Math.max(1, Number(summary.risk_level) || 1)),
      Array.isArray(summary.keywords) ? summary.keywords.join(', ') : '',
      item.link,
      item.contentHash,
      'Draft'
    ];
  });

  appendRows_(sheet, rows);
  return rows.length;
}

function banTin35SaveReport_(report, rawItems, startedAt) {
  const sheet = banTin35GetSheet_('BANTIN35_REPORTS');
  const windowDays = Number(CONFIG.BANTIN35_LOOKBACK_DAYS) || BANTIN35_DEFAULT_LOOKBACK_DAYS;
  const sourceNames = rawItems
    .map(item => item.sourceName)
    .filter((name, index, arr) => arr.indexOf(name) === index)
    .join(', ');

  const normalized = banTin35PolishReport_({
    generatedAt: startedAt || new Date(),
    windowDays,
    sourceNames,
    itemCount: rawItems.length,
    title: cleanValue_(report.title) || 'Bản tin 35 nội bộ',
    overview: cleanValue_(report.overview),
    topTopics: Array.isArray(report.top_topics) ? report.top_topics : [],
    mainNarratives: Array.isArray(report.main_narratives) ? report.main_narratives : [],
    riskSummary: cleanValue_(report.risk_summary),
    sensitiveClaimsSummary: Array.isArray(report.sensitive_claims_summary) ? report.sensitive_claims_summary : [],
    framingPatterns: Array.isArray(report.framing_patterns) ? report.framing_patterns : [],
    verificationNeeded: Array.isArray(report.verification_needed) ? report.verification_needed : [],
    responsePriority: Array.isArray(report.response_priority) ? report.response_priority : [],
    recommendedFollowUp: Array.isArray(report.recommended_follow_up) ? report.recommended_follow_up : [],
    sourceLinks: banTin35BuildSourceLinks_(rawItems),
    editorNote: cleanValue_(report.editor_note),
    status: 'Draft'
  });
  normalized.reportText = banTin35BuildReportText_(normalized);

  sheet.appendRow([
    normalized.generatedAt,
    normalized.windowDays,
    normalized.sourceNames,
    normalized.itemCount,
    normalized.title,
    normalized.overview,
    JSON.stringify(normalized.topTopics),
    JSON.stringify(normalized.mainNarratives),
    JSON.stringify(normalized.recommendedFollowUp),
    normalized.reportText,
    normalized.status,
    normalized.riskSummary,
    JSON.stringify(normalized.sensitiveClaimsSummary),
    JSON.stringify(normalized.framingPatterns),
    JSON.stringify(normalized.verificationNeeded),
    JSON.stringify(normalized.responsePriority),
    JSON.stringify(normalized.sourceLinks)
  ]);

  return normalized;
}

function banTin35GetLatestReport_() {
  const sheet = banTin35GetSheet_('BANTIN35_REPORTS');
  if (sheet.getLastRow() <= 1) return null;

  const row = sheet.getRange(sheet.getLastRow(), 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    generatedAt: row[0],
    windowDays: Number(row[1]) || 0,
    sourceNames: cleanValue_(row[2]),
    itemCount: Number(row[3]) || 0,
    title: cleanValue_(row[4]),
    overview: cleanValue_(row[5]),
    topTopics: banTin35SafeJson_(row[6], []),
    mainNarratives: banTin35SafeJson_(row[7], []),
    recommendedFollowUp: banTin35SafeJson_(row[8], []),
    reportText: cleanValue_(row[9]),
    status: cleanValue_(row[10]),
    riskSummary: cleanValue_(row[11]),
    sensitiveClaimsSummary: banTin35SafeJson_(row[12], []),
    framingPatterns: banTin35SafeJson_(row[13], []),
    verificationNeeded: banTin35SafeJson_(row[14], []),
    responsePriority: banTin35SafeJson_(row[15], []),
    sourceLinks: banTin35SafeJson_(row[16], [])
  };
}

function banTin35PolishReport_(report) {
  const polished = report || {};
  polished.title = banTin35CleanOutputText_(polished.title || 'Bản tin 35 nội bộ');
  polished.overview = banTin35LimitSentences_(banTin35CleanOutputText_(polished.overview), 3);

  const topics = Array.isArray(polished.topTopics) ? polished.topTopics : [];
  const usefulTopics = topics.filter(item => !banTin35IsLowValueTopic_(item && item.topic));
  polished.topTopics = (usefulTopics.length ? usefulTopics : topics)
    .map(item => ({
      topic: banTin35CleanOutputText_(item && item.topic),
      count: Number(item && item.count) || 0,
      summary: banTin35LimitSentences_(banTin35CleanOutputText_(item && item.summary), 1)
    }))
    .filter(item => item.topic || item.summary)
    .slice(0, 4);

  polished.mainNarratives = banTin35UniqueTexts_(polished.mainNarratives || [])
    .map(item => banTin35LimitWords_(banTin35CleanOutputText_(item), 28))
    .filter(Boolean)
    .slice(0, 5);

  polished.riskSummary = banTin35LimitSentences_(banTin35CleanOutputText_(polished.riskSummary), 2);

  polished.sensitiveClaimsSummary = banTin35UniqueTexts_(polished.sensitiveClaimsSummary || [])
    .map(item => banTin35LimitWords_(banTin35CleanOutputText_(item), 30))
    .filter(Boolean)
    .slice(0, 4);

  polished.framingPatterns = banTin35UniqueTexts_(polished.framingPatterns || [])
    .map(item => banTin35LimitWords_(banTin35CleanOutputText_(item), 26))
    .filter(Boolean)
    .slice(0, 4);

  polished.verificationNeeded = banTin35UniqueTexts_(polished.verificationNeeded || [])
    .map(item => banTin35LimitWords_(banTin35CleanOutputText_(item), 28))
    .filter(Boolean)
    .slice(0, 4);

  polished.responsePriority = banTin35UniqueTexts_(polished.responsePriority || [])
    .map(item => banTin35LimitWords_(banTin35CleanOutputText_(item), 28))
    .filter(Boolean)
    .slice(0, 4);

  polished.recommendedFollowUp = banTin35UniqueTexts_(polished.recommendedFollowUp || [])
    .map(item => banTin35LimitWords_(banTin35CleanOutputText_(item), 30))
    .filter(Boolean)
    .slice(0, 3);

  polished.sourceLinks = (Array.isArray(polished.sourceLinks) ? polished.sourceLinks : [])
    .map(item => ({
      title: banTin35LimitWords_(banTin35CleanOutputText_(item && item.title), 18),
      source: banTin35CleanOutputText_(item && item.source),
      url: cleanValue_(item && item.url)
    }))
    .filter(item => item.title && /^https?:\/\//i.test(item.url))
    .slice(0, 8);

  polished.editorNote = banTin35CleanOutputText_(polished.editorNote) ||
    'Bản tin nội bộ, cần cán bộ phụ trách kiểm duyệt trước khi sử dụng.';

  return polished;
}

function banTin35BuildSourceLinks_(items) {
  const seen = {};
  return (items || [])
    .map(item => ({
      title: cleanValue_(item.title),
      source: cleanValue_(item.sourceName),
      url: cleanValue_(item.link)
    }))
    .filter(item => {
      if (!item.title || !/^https?:\/\//i.test(item.url)) return false;
      const key = item.url.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    })
    .slice(0, 8);
}

function banTin35CleanOutputText_(value) {
  let text = cleanValue_(value).replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const folded = banTin35FoldVietnamese_(text);
  const prefixes = [
    'CAC NGUON NAY DANG TAP TRUNG VAO',
    'CAC NGUON NAY TAP TRUNG VAO',
    'CAC NGUON NAY NHAN MANH',
    'CAC NGUON NAY CHI RA',
    'CAC NGUON NAY DE CAP DEN',
    'NHOM NGUON DUOC QUET DANG TAP TRUNG VAO',
    'NHOM NGUON DUOC QUET TAP TRUNG VAO',
    'NHOM NGUON DUOC QUET',
    'CAC BAI DUOC QUET DANG TAP TRUNG VAO',
    'CAC BAI DUOC QUET TAP TRUNG VAO',
    'CAC BAI DUOC QUET',
    'CAC NGUON NAY'
  ];

  for (let i = 0; i < prefixes.length; i++) {
    if (folded.startsWith(prefixes[i])) {
      text = text.split(/\s+/).slice(prefixes[i].split(/\s+/).length).join(' ');
      break;
    }
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function banTin35LimitSentences_(text, maxSentences) {
  const value = cleanValue_(text);
  if (!value) return '';

  const sentences = value.match(/[^.!?。！？]+[.!?。！？]*/g) || [value];
  return sentences.slice(0, maxSentences).join(' ').replace(/\s+/g, ' ').trim();
}

function banTin35LimitWords_(text, maxWords) {
  const words = cleanValue_(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return cleanValue_(text);
  return words.slice(0, maxWords).join(' ') + '...';
}

function banTin35UniqueTexts_(items) {
  const seen = {};
  const result = [];

  (items || []).forEach(item => {
    const text = cleanValue_(item);
    const key = banTin35FoldVietnamese_(text).replace(/\W+/g, ' ').trim();
    if (!text || seen[key]) return;
    seen[key] = true;
    result.push(text);
  });

  return result;
}

function banTin35IsLowValueTopic_(topic) {
  const folded = banTin35FoldVietnamese_(topic);
  return /TIN TUC TONG HOP|TIN TONG HOP|VAN HOA|DIEN DAN|BAN DOC|CHUONG TRINH|PODCAST|VIDEO/.test(folded);
}

function sendBanTin35TelegramDigest_(report) {
  if (!hasRequiredConfig_(REQUIRED_TELEGRAM_CONFIG)) {
    Logger.log('[BanTin35][Telegram] Bo qua vi thieu TELEGRAM_TOKEN hoac TELEGRAM_CHANNEL');
    return;
  }

  try {
    const message = banTin35BuildTelegramMessage_(report);
    sendTelegramMessage(CONFIG.TELEGRAM_CHANNEL, message, { disablePreview: true });
    Logger.log('[BanTin35][Telegram] Da gui ban tin 35');
  } catch (error) {
    Logger.log(`[BanTin35][Telegram] Loi gui: ${error}`);
  }
}

function banTin35BuildTelegramMessage_(report) {
  const topicLines = (report.topTopics || [])
    .slice(0, 4)
    .map((item, index) =>
      `${index + 1}. ${escapeMarkdown(item.topic || 'Chưa rõ')} (${Number(item.count) || 0} mục): ${escapeMarkdown(item.summary || '')}`
    )
    .join('\n');

  const narrativeLines = banTin35BuildTelegramList_(report.mainNarratives || [], 5, 150);
  const sensitiveLines = banTin35BuildTelegramList_(report.sensitiveClaimsSummary || [], 4, 150);
  const framingLines = banTin35BuildTelegramList_(report.framingPatterns || [], 3, 130);
  const verificationLines = banTin35BuildTelegramList_(report.verificationNeeded || [], 3, 130);
  const priorityLines = banTin35BuildTelegramList_(report.responsePriority || [], 3, 130);
  const followUpLines = banTin35BuildTelegramList_(report.recommendedFollowUp || [], 3, 130);
  const linkLines = (report.sourceLinks || [])
    .slice(0, 6)
    .map((item, index) => {
      const title = escapeMarkdown(banTin35LimitWords_(item.title || item.source || 'Nguồn', 12));
      const source = item.source ? ` - ${escapeMarkdown(item.source)}` : '';
      return `${index + 1}. [${title}${source}](${item.url})`;
    })
    .join('\n');

  let message = `*BẢN TIN 35 NỘI BỘ*\n`;
  message += `${escapeMarkdown(new Date(report.generatedAt).toLocaleString('vi-VN'))}\n`;
  message += `Nguồn tổng hợp: ${escapeMarkdown(report.sourceNames || '')}\n`;
  message += `Số mục đọc: ${Number(report.itemCount) || 0}\n\n`;
  message += `*Tóm tắt điều hành*\n${escapeMarkdown(report.overview || 'Chưa có tóm tắt.')}\n\n`;
  message += `*Chủ đề nổi bật*\n${topicLines || 'Chưa xác định.'}\n\n`;
  message += `*Nội dung chính*\n${narrativeLines || 'Chưa xác định.'}\n\n`;
  message += `*Mức rủi ro*\n${escapeMarkdown(report.riskSummary || 'Chưa có tóm tắt rủi ro.')}\n\n`;
  message += `*Luận điểm cần chú ý*\n${sensitiveLines || 'Chưa xác định.'}\n\n`;
  message += `*Khung diễn giải*\n${framingLines || 'Chưa xác định.'}\n\n`;
  message += `*Ưu tiên xử lý*\n${priorityLines || 'Chưa có.'}\n\n`;
  message += `*Điểm cần kiểm chứng*\n${verificationLines || 'Chưa có.'}\n\n`;
  message += `*Gợi ý theo dõi tiếp*\n${followUpLines || 'Chưa có.'}\n\n`;
  message += `*Link nguồn*\n${linkLines || 'Chưa có link nguồn.'}\n\n`;

  const footer = `_Bản tin nội bộ, có kèm link nguồn để kiểm chứng. Cần cán bộ phụ trách kiểm duyệt trước khi sử dụng._`;
  message += footer;

  if (message.length > 4000) {
    const compactLinks = (report.sourceLinks || [])
      .slice(0, 3)
      .map((item, index) => {
        const title = escapeMarkdown(banTin35LimitWords_(item.title || item.source || 'Nguồn', 10));
        const source = item.source ? ` - ${escapeMarkdown(item.source)}` : '';
        return `${index + 1}. [${title}${source}](${item.url})`;
      })
      .join('\n');

    message = `*BẢN TIN 35 NỘI BỘ*\n`;
    message += `${escapeMarkdown(new Date(report.generatedAt).toLocaleString('vi-VN'))}\n`;
    message += `Nguồn tổng hợp: ${escapeMarkdown(report.sourceNames || '')}\n`;
    message += `Số mục đọc: ${Number(report.itemCount) || 0}\n\n`;
    message += `*Tóm tắt điều hành*\n${escapeMarkdown(truncateAtWord_(report.overview || 'Chưa có tóm tắt.', 500))}\n\n`;
    message += `*Mức rủi ro*\n${escapeMarkdown(truncateAtWord_(report.riskSummary || 'Chưa có tóm tắt rủi ro.', 260))}\n\n`;
    message += `*Ưu tiên xử lý*\n${priorityLines || 'Chưa có.'}\n\n`;
    message += `*Điểm cần kiểm chứng*\n${verificationLines || 'Chưa có.'}\n\n`;
    message += `*Link nguồn*\n${compactLinks || 'Chưa có link nguồn.'}\n\n`;
    message += footer;
  }

  return message;
}

function banTin35BuildTelegramList_(items, limit, maxLen) {
  return (items || [])
    .slice(0, limit)
    .map((item, index) => `${index + 1}. ${escapeMarkdown(truncateAtWord_(item, maxLen))}`)
    .join('\n');
}

function banTin35ReportForApi_(report) {
  if (!report) return null;

  return {
    generatedAt: report.generatedAt,
    windowDays: report.windowDays,
    sourceNames: report.sourceNames,
    itemCount: report.itemCount,
    title: report.title,
    overview: report.overview,
    topTopics: report.topTopics,
    mainNarratives: report.mainNarratives,
    riskSummary: report.riskSummary,
    sensitiveClaimsSummary: report.sensitiveClaimsSummary,
    framingPatterns: report.framingPatterns,
    verificationNeeded: report.verificationNeeded,
    responsePriority: report.responsePriority,
    recommendedFollowUp: report.recommendedFollowUp,
    sourceLinks: report.sourceLinks,
    reportText: report.reportText,
    status: report.status
  };
}

function banTin35BuildReportText_(report) {
  const topics = (report.topTopics || []).map((item, index) =>
    `${index + 1}. ${item.topic || 'Chưa rõ'} (${Number(item.count) || 0} mục): ${item.summary || ''}`
  ).join('\n');

  const narratives = (report.mainNarratives || []).map((item, index) => `${index + 1}. ${item}`).join('\n');
  const sensitiveClaims = (report.sensitiveClaimsSummary || []).map((item, index) => `${index + 1}. ${item}`).join('\n');
  const framing = (report.framingPatterns || []).map((item, index) => `${index + 1}. ${item}`).join('\n');
  const verification = (report.verificationNeeded || []).map((item, index) => `${index + 1}. ${item}`).join('\n');
  const priority = (report.responsePriority || []).map((item, index) => `${index + 1}. ${item}`).join('\n');
  const followUp = (report.recommendedFollowUp || []).map((item, index) => `${index + 1}. ${item}`).join('\n');
  const links = (report.sourceLinks || []).map((item, index) =>
    `${index + 1}. ${item.title || item.source || 'Nguồn'} - ${item.url || ''}`
  ).join('\n');

  return [
    report.title,
    `Thời gian tạo: ${new Date(report.generatedAt).toLocaleString('vi-VN')}`,
    `Nguồn tổng hợp: ${report.sourceNames}`,
    `Số mục đọc: ${report.itemCount}`,
    '',
    'I. Tóm tắt chung',
    report.overview || 'Chưa có tóm tắt.',
    '',
    'II. Chủ đề nổi bật',
    topics || 'Chưa xác định chủ đề nổi bật.',
    '',
    'III. Nội dung chính',
    narratives || 'Chưa xác định luận điểm chính.',
    '',
    'IV. Luận điểm/cách đặt vấn đề cần chú ý',
    sensitiveClaims || 'Chưa xác định luận điểm nhạy cảm nổi bật.',
    '',
    'V. Khung diễn giải nổi bật',
    framing || 'Chưa xác định khung diễn giải nổi bật.',
    '',
    'VI. Mức rủi ro và ưu tiên xử lý',
    report.riskSummary || 'Chưa có tóm tắt rủi ro.',
    priority ? `\n${priority}` : '',
    '',
    'VII. Điểm cần kiểm chứng',
    verification || 'Chưa có điểm kiểm chứng riêng.',
    '',
    'VIII. Gợi ý theo dõi tiếp',
    followUp || 'Chưa có gợi ý theo dõi.',
    '',
    'IX. Link nguồn',
    links || 'Chưa có link nguồn.',
    '',
    'Ghi chú biên tập',
    report.editorNote || 'Bản tin nội bộ, cần cán bộ phụ trách kiểm duyệt trước khi sử dụng.'
  ].join('\n');
}

function banTin35GetExistingHashes_() {
  const sheet = banTin35GetSheet_('BANTIN35_ITEMS');
  if (sheet.getLastRow() <= 1) return new Set();

  const values = sheet.getRange(2, 13, sheet.getLastRow() - 1, 1).getValues().flat();
  return new Set(values.map(cleanValue_).filter(Boolean));
}

function banTin35GetStoredItemsForDigest_(limit) {
  const sheet = banTin35GetSheet_('BANTIN35_ITEMS');
  if (sheet.getLastRow() <= 1) return [];

  const maxRows = Math.min(Math.max(1, Number(limit) || BANTIN35_MAX_AI_ITEMS), sheet.getLastRow() - 1);
  const startRow = Math.max(2, sheet.getLastRow() - maxRows + 1);
  const rows = sheet.getRange(startRow, 1, sheet.getLastRow() - startRow + 1, sheet.getLastColumn()).getValues();

  return rows.reverse().map((row, index) => ({
    sourceId: `stored_${index}`,
    sourceName: cleanValue_(row[1]),
    title: cleanValue_(row[2]),
    description: cleanValue_(row[5]),
    publishedAt: row[3] || row[0] || '',
    link: cleanValue_(row[11]),
    content: cleanValue_(row[4] || row[5] || row[2]).substring(0, BANTIN35_MAX_CONTENT_CHARS),
    contentHash: cleanValue_(row[12])
  })).filter(item => item.title || item.content);
}

function banTin35NormalizeAnalysis_(analysis, items) {
  const normalized = analysis || {};
  const summaries = Array.isArray(normalized.item_summaries) ? normalized.item_summaries : [];
  const byId = {};
  summaries.forEach(item => {
    byId[String(item.id)] = item;
  });

  normalized.item_summaries = items.map((item, index) => {
    const current = byId[String(index)] || {};
    return {
      id: index,
      topic: cleanValue_(current.topic) || 'Chưa phân loại',
      main_summary: cleanValue_(current.main_summary) || (item.description || item.title),
      sensitive_claims: Array.isArray(current.sensitive_claims) ? current.sensitive_claims : [],
      framing: cleanValue_(current.framing),
      risk_level: Math.min(5, Math.max(1, Number(current.risk_level) || 1)),
      keywords: Array.isArray(current.keywords) ? current.keywords.slice(0, 8).map(cleanValue_).filter(Boolean) : []
    };
  });

  normalized.report = normalized.report || {};
  normalized.report.top_topics = Array.isArray(normalized.report.top_topics) ? normalized.report.top_topics : [];
  normalized.report.main_narratives = Array.isArray(normalized.report.main_narratives) ? normalized.report.main_narratives : [];
  normalized.report.sensitive_claims_summary = Array.isArray(normalized.report.sensitive_claims_summary) ? normalized.report.sensitive_claims_summary : [];
  normalized.report.framing_patterns = Array.isArray(normalized.report.framing_patterns) ? normalized.report.framing_patterns : [];
  normalized.report.verification_needed = Array.isArray(normalized.report.verification_needed) ? normalized.report.verification_needed : [];
  normalized.report.response_priority = Array.isArray(normalized.report.response_priority) ? normalized.report.response_priority : [];
  normalized.report.recommended_follow_up = Array.isArray(normalized.report.recommended_follow_up) ? normalized.report.recommended_follow_up : [];

  return normalized;
}

function banTin35BuildFallbackAnalysis_(items) {
  const itemSummaries = items.map((item, index) => ({
    id: index,
    topic: 'Chưa phân loại',
    main_summary: (item.description || item.title || '').substring(0, 500),
    sensitive_claims: [],
    framing: 'Chưa phân tích được bằng AI',
    risk_level: 1,
    keywords: banTin35ExtractKeywords_([item.title, item.description].join(' '))
  }));

  return {
    item_summaries: itemSummaries,
    report: {
      title: 'Bản tin 35 nội bộ',
      overview: `Hệ thống đã lấy ${items.length} mục mới nhưng AI phân tích bị lỗi; cần đọc thủ công.`,
      top_topics: [],
      main_narratives: items.slice(0, 5).map(item => item.title),
      risk_summary: 'Chưa có phân tích rủi ro tự động; cần đọc thủ công trước khi sử dụng.',
      sensitive_claims_summary: [],
      framing_patterns: [],
      verification_needed: ['Đối chiếu thủ công từng link nguồn và kiểm tra log Gemini.'],
      response_priority: ['Chạy lại phân tích khi Gemini ổn định.'],
      recommended_follow_up: ['Kiểm tra log và chạy lại khi Gemini ổn định.'],
      editor_note: 'Bản fallback, không nên sử dụng như bản tin chính thức.'
    }
  };
}

function banTin35ExtractLinks_(html, baseUrl) {
  const links = [];
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = pattern.exec(html || '')) !== null) {
    const url = banTin35NormalizeUrl_(match[1], baseUrl);
    const text = banTin35CleanText_(match[2]);
    if (!url || !text || text.length < 8) continue;
    if (banTin35LooksLikeNonArticleTitle_(text)) continue;
    links.push({ url, text });
  }

  return links;
}

function banTin35LooksLikeNonArticleTitle_(title) {
  const text = banTin35FoldVietnamese_(title);
  if (!text) return true;

  const exactNoise = [
    'TIN TONG HOP',
    'CHUONG TRINH 60 PHUT',
    'PHAT TRUC TIEP',
    'PODCAST',
    'VIDEO',
    'THOI SU'
  ];
  if (exactNoise.includes(text)) return true;

  if (/^(TIN|CHUONG TRINH|PODCAST|VIDEO)\b/.test(text) && text.length <= 40) {
    return true;
  }

  return false;
}

function banTin35FoldVietnamese_(value) {
  return cleanValue_(value)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(new RegExp('\\u0110', 'g'), 'D');
}

function banTin35SourceAllowsUrl_(url, source) {
  const allowed = source.articleUrlPatterns || [];
  const excluded = source.excludeUrlPatterns || [];
  if (excluded.some(pattern => pattern.test(url))) return false;
  if (allowed.length === 0) return true;
  return allowed.some(pattern => pattern.test(url));
}

function banTin35ExtractMainText_(html) {
  const patterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]+class=["'][^"']*(?:story-body|article-body|article__body|article-content|entry-content|post-content|wsw|text-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = (html || '').match(patterns[i]);
    if (match && match[1] && match[1].length > 300) {
      return banTin35HtmlToText_(match[1]);
    }
  }

  const bodyMatch = (html || '').match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return banTin35HtmlToText_(bodyMatch ? bodyMatch[1] : html).substring(0, BANTIN35_MAX_CONTENT_CHARS);
}

function banTin35ExtractTitle_(html) {
  const match = (html || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    (html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? banTin35CleanText_(match[1]) : '';
}

function banTin35ExtractMetaDescription_(html) {
  const match = (html || '').match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    (html || '').match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  return match ? banTin35DecodeEntities_(match[1]) : '';
}

function banTin35HtmlToText_(html) {
  return banTin35DecodeEntities_((html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function banTin35CleanArticleText_(text) {
  return banTin35CleanText_(text)
    .replace(/^\s*(BBC|VOA|RFA|RFI)\s*$/gim, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function banTin35CleanText_(text) {
  return banTin35HtmlToText_(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function banTin35DecodeEntities_(text) {
  return (text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function banTin35NormalizeUrl_(url, baseUrl) {
  const raw = cleanValue_(url);
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('javascript:')) return '';
  if (/^https?:\/\//i.test(raw)) return raw.split('#')[0];

  const base = cleanValue_(baseUrl);
  const originMatch = base.match(/^(https?:\/\/[^\/]+)/i);
  if (!originMatch) return raw;

  if (raw.startsWith('/')) return `${originMatch[1]}${raw}`.split('#')[0];
  return `${base.replace(/\/[^\/]*$/, '/')}${raw}`.split('#')[0];
}

function banTin35AtomLink_(entry) {
  const links = entry.getChildren('link', entry.getNamespace());
  for (let i = 0; i < links.length; i++) {
    const href = links[i].getAttribute('href');
    if (href) return href.getValue();
  }
  return '';
}

function banTin35IsRecent_(dateValue) {
  if (!dateValue) return true;

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return true;

  const lookbackDays = Number(CONFIG.BANTIN35_LOOKBACK_DAYS) || BANTIN35_DEFAULT_LOOKBACK_DAYS;
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  since.setHours(0, 0, 0, 0);
  return parsed >= since;
}

function banTin35DeduplicateItems_(items) {
  const seen = {};
  return (items || []).filter(item => {
    const key = cleanValue_(item.link || item.title).toLowerCase();
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function banTin35ParseJson_(text) {
  let cleaned = cleanValue_(text)
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

function banTin35SafeJson_(value, fallback) {
  try {
    return JSON.parse(cleanValue_(value) || 'null') || fallback;
  } catch (error) {
    return fallback;
  }
}

function banTin35ExtractKeywords_(text) {
  const seen = {};
  const result = [];
  cleanValue_(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 4)
    .forEach(word => {
      if (seen[word]) return;
      seen[word] = true;
      result.push(word);
    });
  return result.slice(0, 8);
}

function banTin35Fetch_(url) {
  return UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BanTin35/1.0; internal research)'
    }
  });
}

function banTin35Sleep_() {
  Utilities.sleep(Number(CONFIG.BANTIN35_REQUEST_DELAY_MS) || BANTIN35_REQUEST_DELAY_MS);
}

function banTin35GetSheet_(name) {
  const ss = getSpreadsheet_();
  return createSheetIfNotExists(ss, name, BANTIN35_SHEET_HEADERS[name] || []);
}

function banTin35WriteLog_(action, target, status, message) {
  try {
    const sheet = banTin35GetSheet_('BANTIN35_LOG');
    sheet.appendRow([new Date(), action, target || '', status, message || '']);
  } catch (error) {
    Logger.log(`[BanTin35 Log] ${action} ${status}: ${message} (${error})`);
  }
}

function banTin35Hash_(text) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    cleanValue_(text),
    Utilities.Charset.UTF_8
  );

  return digest.map(byte => {
    const value = byte < 0 ? byte + 256 : byte;
    return value.toString(16).padStart(2, '0');
  }).join('');
}

function banTin35RequireAccess_(accessCode) {
  if (typeof troLy35RequireAccess_ !== 'function') {
    throw new Error('Chua co ham kiem tra ma truy cap noi bo.');
  }
  troLy35RequireAccess_(accessCode);
}
