/**
 * ============================================================
 * MODULE: BAN TIN 35
 * Doc noi dung cong khai tu mot so nguon doi lap/hai ngoai,
 * dung AI tom tat cac noi dung chinh va luu thanh ban tin noi bo.
 *
 * Luu y thiet ke:
 * - Khong theo doi du luan, binh luan ca nhan hay tai khoan ca nhan.
 * - API tra ban tin KHONG kem link; URL chi luu noi bo de chong trung
 *   va phuc vu kiem chung thu cong khi can.
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
    'Bản tin không link', 'Trạng thái'
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
        recommended_follow_up: { type: 'array', items: { type: 'string' } },
        editor_note: { type: 'string' }
      },
      required: ['title', 'overview', 'top_topics', 'main_narratives', 'recommended_follow_up', 'editor_note']
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
  sendBanTin35EmailDigest_(report);
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
Nhiệm vụ: đọc các mục nội dung từ một số nguồn đối lập/hải ngoại, gom chủ đề trùng nhau và viết bản tin ngắn gọn bằng tiếng Việt có dấu đầy đủ.

QUY TẮC BẮT BUỘC:
1. Chỉ tóm tắt và phân loại nội dung; không viết lời kêu gọi hành động, không công kích cá nhân.
2. Không tạo link, không đưa URL vào kết quả.
3. Không suy diễn dư luận xã hội. Chỉ viết về "nhóm nguồn được quét" hoặc "các bài được quét".
4. Tránh lặp cụm "các nguồn này đang tập trung vào". Mỗi ý viết thẳng vào nội dung chính.
5. Bỏ qua mục ít giá trị nghiệp vụ như tin tổng hợp, chương trình, diễn đàn, văn hóa giải trí nếu không liên quan trực tiếp Việt Nam, chính trị, an ninh, đối ngoại, kinh tế hoặc thông tin sai lệch.
6. overview tối đa 3 câu. top_topics tối đa 4 mục. main_narratives tối đa 5 mục, mỗi mục tối đa 25 từ. recommended_follow_up tối đa 3 mục.
7. Nếu nội dung có tính một chiều, thiếu căn cứ, hoặc có dấu hiệu bôi nhọ/xuyên tạc, ghi nhận ở sensitive_claims/framing.
8. Trả về JSON đúng schema, toàn bộ nội dung tiếng Việt có dấu.

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
    recommendedFollowUp: Array.isArray(report.recommended_follow_up) ? report.recommended_follow_up : [],
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
    normalized.status
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
    status: cleanValue_(row[10])
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

  polished.recommendedFollowUp = banTin35UniqueTexts_(polished.recommendedFollowUp || [])
    .map(item => banTin35LimitWords_(banTin35CleanOutputText_(item), 30))
    .filter(Boolean)
    .slice(0, 3);

  polished.editorNote = banTin35CleanOutputText_(polished.editorNote) ||
    'Bản tin nội bộ, cần cán bộ phụ trách kiểm duyệt trước khi sử dụng.';

  return polished;
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

function sendBanTin35EmailDigest_(report) {
  if (!hasRequiredConfig_(REQUIRED_BREVO_CONFIG)) {
    Logger.log('[BanTin35][Email] Bo qua vi thieu BREVO_API_KEY hoac SENDER_EMAIL');
    return;
  }

  const subscribers = getSubscribers('Email');
  if (subscribers.length === 0) {
    Logger.log('[BanTin35][Email] Khong co subscriber email');
    return;
  }

  let sent = 0;
  let failed = 0;

  subscribers.forEach(subscriber => {
    try {
      const result = sendEmailViaBrevo({
        toEmail: subscriber.email,
        toName: subscriber.name,
        subject: `Bản tin 35 nội bộ - ${new Date().toLocaleDateString('vi-VN')}`,
        htmlContent: banTin35BuildEmailHtml_(subscriber.name, report)
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
        Logger.log(`[BanTin35][Email] Loi gui cho ${subscriber.email}: ${result.error}`);
      }

      Utilities.sleep(100);
    } catch (error) {
      failed++;
      Logger.log(`[BanTin35][Email] Exception ${subscriber.email}: ${error}`);
    }
  });

  Logger.log(`[BanTin35][Email] Da gui: ${sent}, that bai: ${failed}`);
}

function banTin35BuildTelegramMessage_(report) {
  const topicLines = (report.topTopics || [])
    .slice(0, 5)
    .map((item, index) =>
      `${index + 1}. ${escapeMarkdown(item.topic || 'Chưa rõ')} (${Number(item.count) || 0} mục): ${escapeMarkdown(item.summary || '')}`
    )
    .join('\n');

  const narrativeLines = (report.mainNarratives || [])
    .slice(0, 6)
    .map((item, index) => `${index + 1}. ${escapeMarkdown(item)}`)
    .join('\n');

  const followUpLines = (report.recommendedFollowUp || [])
    .slice(0, 5)
    .map((item, index) => `${index + 1}. ${escapeMarkdown(item)}`)
    .join('\n');

  let message = `*BẢN TIN 35 NỘI BỘ*\n`;
  message += `${escapeMarkdown(new Date(report.generatedAt).toLocaleString('vi-VN'))}\n`;
  message += `Nguồn tổng hợp: ${escapeMarkdown(report.sourceNames || '')}\n`;
  message += `Số mục đọc: ${Number(report.itemCount) || 0}\n\n`;
  message += `*Tóm tắt chung*\n${escapeMarkdown(report.overview || 'Chưa có tóm tắt.')}\n\n`;
  message += `*Chủ đề nổi bật*\n${topicLines || 'Chưa xác định.'}\n\n`;
  message += `*Nội dung chính*\n${narrativeLines || 'Chưa xác định.'}\n\n`;
  message += `*Gợi ý theo dõi tiếp*\n${followUpLines || 'Chưa có.'}\n\n`;
  message += `_Bản tin nội bộ, không kèm link nguồn. Cần cán bộ phụ trách kiểm duyệt trước khi sử dụng._`;

  return message.length > 4000 ? message.substring(0, 3990) + '...' : message;
}

function banTin35BuildEmailHtml_(name, report) {
  const safeName = banTin35EscapeHtml_(name || 'đồng chí');
  const topics = banTin35ListToHtml_(report.topTopics || [], item =>
    `<strong>${banTin35EscapeHtml_(item.topic || 'Chưa rõ')}</strong> (${Number(item.count) || 0} mục): ${banTin35EscapeHtml_(item.summary || '')}`
  );
  const narratives = banTin35ListToHtml_(report.mainNarratives || [], item => banTin35EscapeHtml_(item));
  const followUp = banTin35ListToHtml_(report.recommendedFollowUp || [], item => banTin35EscapeHtml_(item));

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="680" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
          <tr>
            <td style="background:#8b0000;color:#ffffff;padding:24px 28px;">
              <h1 style="margin:0;font-size:24px;">BẢN TIN 35 NỘI BỘ</h1>
              <p style="margin:8px 0 0;font-size:13px;color:#f8d7da;">${banTin35EscapeHtml_(new Date(report.generatedAt).toLocaleString('vi-VN'))}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;color:#222;font-size:15px;line-height:1.6;">
              <p style="margin-top:0;">Xin chao <strong>${safeName}</strong>,</p>
              <p>Hệ thống gửi bản tin tổng hợp nội dung chính từ các nguồn công khai cần theo dõi. Bản tin không kèm link nguồn.</p>
              <p style="color:#666;font-size:13px;">Nguồn tổng hợp: ${banTin35EscapeHtml_(report.sourceNames || '')}<br>Số mục đọc: ${Number(report.itemCount) || 0}</p>

              <h2 style="font-size:18px;color:#8b0000;margin:24px 0 8px;">I. Tóm tắt chung</h2>
              <p>${banTin35TextToHtml_(report.overview || 'Chưa có tóm tắt.')}</p>

              <h2 style="font-size:18px;color:#8b0000;margin:24px 0 8px;">II. Chủ đề nổi bật</h2>
              ${topics || '<p>Chưa xác định.</p>'}

              <h2 style="font-size:18px;color:#8b0000;margin:24px 0 8px;">III. Nội dung chính</h2>
              ${narratives || '<p>Chưa xác định.</p>'}

              <h2 style="font-size:18px;color:#8b0000;margin:24px 0 8px;">IV. Gợi ý theo dõi tiếp</h2>
              ${followUp || '<p>Chưa có.</p>'}

              <div style="margin-top:24px;padding:14px 16px;background:#f8f8f8;border-left:4px solid #8b0000;color:#555;font-size:13px;">
                Bản tin nội bộ, cần cán bộ phụ trách kiểm duyệt trước khi sử dụng. Nội dung chỉ phản ánh các chủ đề trong nhóm nguồn công khai được quét, không suy diễn dư luận xã hội.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function banTin35ListToHtml_(items, renderItem) {
  if (!items || items.length === 0) return '';
  return `<ol style="padding-left:22px;margin-top:8px;">${items
    .slice(0, 8)
    .map(item => `<li style="margin-bottom:8px;">${renderItem(item)}</li>`)
    .join('')}</ol>`;
}

function banTin35TextToHtml_(text) {
  return banTin35EscapeHtml_(text).replace(/\n/g, '<br>');
}

function banTin35EscapeHtml_(value) {
  if (value === undefined || value === null) return '';
  return value.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    recommendedFollowUp: report.recommendedFollowUp,
    reportText: report.reportText,
    status: report.status
  };
}

function banTin35BuildReportText_(report) {
  const topics = (report.topTopics || []).map((item, index) =>
    `${index + 1}. ${item.topic || 'Chưa rõ'} (${Number(item.count) || 0} mục): ${item.summary || ''}`
  ).join('\n');

  const narratives = (report.mainNarratives || []).map((item, index) => `${index + 1}. ${item}`).join('\n');
  const followUp = (report.recommendedFollowUp || []).map((item, index) => `${index + 1}. ${item}`).join('\n');

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
    'IV. Gợi ý theo dõi tiếp',
    followUp || 'Chưa có gợi ý theo dõi.',
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
    link: '',
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
