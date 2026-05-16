/**
 * ============================================================
 * MODULE: NEWS CRAWLER
 * Tự động kéo tin tức từ RSS và các nguồn HTML không có RSS.
 * (Gộp từ 02-rss-crawler.gs + 10-html-crawler.gs)
 * ============================================================
 */

// ============================================================
// ENTRY POINT: Gộp cả hai nguồn
// ============================================================

function fetchAllNewsSources() {
  const rssArticles = fetchAllRSS();
  const htmlArticles = fetchAllHtmlSources();
  const allArticles = rssArticles.concat(htmlArticles);

  Logger.log(`[Sources] RSS: ${rssArticles.length}, HTML: ${htmlArticles.length}, tổng: ${allArticles.length}`);
  return allArticles;
}

// ============================================================
// RSS CRAWLER
// ============================================================

/**
 * Kéo tất cả tin từ các nguồn RSS đã cấu hình
 * @return {Array} Mảng các bài viết thô
 */
function fetchAllRSS() {
  const allArticles = [];

  RSS_SOURCES.forEach(source => {
    try {
      Logger.log(`[RSS] Đang kéo từ: ${source.name}`);
      const response = UrlFetchApp.fetch(source.url, {
        muteHttpExceptions: true,
        followRedirects: true
      });

      if (response.getResponseCode() !== 200) {
        Logger.log(`[RSS] Lỗi ${response.getResponseCode()} từ ${source.name}`);
        return;
      }

      const xmlText = response.getContentText('UTF-8');
      const xml = XmlService.parse(xmlText);
      const channel = xml.getRootElement().getChild('channel');

      if (!channel) {
        Logger.log(`[RSS] Không tìm thấy channel trong ${source.name}`);
        return;
      }

      const items = channel.getChildren('item');
      Logger.log(`[RSS] ${source.name}: ${items.length} bài`);

      items.forEach(item => {
        try {
          const article = {
            title: cleanText(item.getChildText('title')),
            link: item.getChildText('link'),
            description: cleanText(item.getChildText('description')),
            pubDate: item.getChildText('pubDate'),
            source: source.name,
            sourcePriority: source.priority
          };

          if (isRecentArticle(article.pubDate)) {
            allArticles.push(article);
          }
        } catch(e) {
          Logger.log(`[RSS] Lỗi parse item: ${e}`);
        }
      });

    } catch(error) {
      Logger.log(`[RSS] Lỗi kéo ${source.name}: ${error}`);
    }
  });

  Logger.log(`[RSS] Tổng cộng: ${allArticles.length} bài viết`);
  return allArticles;
}

/**
 * Lọc bài theo từ khóa quan tâm
 * @param {Array} articles - Danh sách bài viết
 * @return {Array} Bài đã lọc
 */
function filterByKeywords(articles) {
  const filtered = articles.filter(article => {
    const searchText = (article.title + ' ' + article.description).toLowerCase();
    return KEYWORDS.some(kw => searchText.includes(kw.toLowerCase()));
  });

  Logger.log(`[Filter] Sau lọc từ khóa: ${filtered.length} bài`);
  return filtered;
}

/**
 * Loại bỏ các bài trùng lặp (theo title)
 */
function removeDuplicates(articles) {
  const seen = new Set();
  const sheet = getSheet_('TIN_TUC');

  if (sheet.getLastRow() > 1) {
    const existingData = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
    existingData.forEach(row => seen.add(row[0]));
  }

  const unique = articles.filter(a => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });

  Logger.log(`[Dedup] Sau loại trùng: ${unique.length} bài`);
  return unique;
}

/**
 * Sắp xếp bài theo độ ưu tiên nguồn và mới nhất
 */
function sortArticles(articles) {
  return articles.sort((a, b) => {
    if (a.sourcePriority !== b.sourcePriority) {
      return a.sourcePriority - b.sourcePriority;
    }
    return new Date(b.pubDate) - new Date(a.pubDate);
  });
}

/**
 * Kiểm tra bài có phải trong 24h gần đây không
 */
function isRecentArticle(pubDateStr) {
  if (!pubDateStr) return true;

  try {
    const pubDate = new Date(pubDateStr);
    const now = new Date();
    const diffHours = (now - pubDate) / (1000 * 60 * 60);
    return diffHours <= 24;
  } catch(e) {
    return true;
  }
}

/**
 * Làm sạch text: loại bỏ HTML, CDATA, whitespace thừa
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// HTML CRAWLER
// ============================================================

function fetchAllHtmlSources() {
  const allArticles = [];

  if (typeof HTML_SOURCES === 'undefined' || !HTML_SOURCES || HTML_SOURCES.length === 0) {
    Logger.log('[HTML] Chưa cấu hình nguồn HTML');
    return allArticles;
  }

  HTML_SOURCES.forEach(source => {
    try {
      Logger.log(`[HTML] Đang kéo từ: ${source.name}`);

      const embeddedArticles = htmlFetchEmbeddedArticles_(source);
      embeddedArticles.forEach(article => {
        if (htmlIsRecentArticle_(article.pubDate)) allArticles.push(article);
      });

      const refs = source.skipLinkCrawler ? [] : htmlFetchArticleRefs_(source);
      Logger.log(`[HTML] ${source.name}: tìm thấy ${refs.length} link ứng viên`);

      refs.forEach((ref, index) => {
        try {
          if (index > 0) htmlSleep_();

          const article = htmlFetchArticleContent_(ref, source);
          if (!htmlIsRecentArticle_(article.pubDate)) return;

          allArticles.push(article);
        } catch (e) {
          Logger.log(`[HTML] Lỗi parse bài ${ref.url}: ${e}`);
        }
      });
    } catch (error) {
      Logger.log(`[HTML] Lỗi kéo ${source.name}: ${error}`);
    }
  });

  Logger.log(`[HTML] Tổng cộng: ${allArticles.length} bài viết`);
  return allArticles;
}

function htmlFetchEmbeddedArticles_(source) {
  if (!source.extractEmbeddedArticles) return [];

  const listUrls = source.listUrls && source.listUrls.length ? source.listUrls : [source.url];
  const limit = Math.max(1, Number(source.maxArticlesPerRun) ||
    Number(CONFIG.HTML_SOURCE_MAX_ARTICLES_PER_SOURCE) || 5);
  const seen = {};
  const articles = [];

  listUrls.forEach((listUrl, index) => {
    if (index > 0) htmlSleep_();
    if (articles.length >= limit) return;

    const response = htmlFetch_(listUrl);
    if (response.getResponseCode() !== 200) {
      Logger.log(`[HTML] ${source.name}: HTTP ${response.getResponseCode()} tại ${listUrl}`);
      return;
    }

    const html = response.getContentText('UTF-8');
    const found = htmlExtractEmbeddedArticles_(html, source, listUrl);
    found.forEach(article => {
      if (articles.length >= limit) return;
      if (seen[article.title]) return;

      seen[article.title] = true;
      articles.push(article);
    });
  });

  Logger.log(`[HTML] ${source.name}: lấy được ${articles.length} bài nhúng`);
  return articles;
}

function htmlFetchArticleRefs_(source) {
  const listUrls = source.listUrls && source.listUrls.length ? source.listUrls : [source.url];
  const limit = Math.max(1, Number(source.maxArticlesPerRun) ||
    Number(CONFIG.HTML_SOURCE_MAX_ARTICLES_PER_SOURCE) || 5);
  const seen = {};
  const refs = [];

  listUrls.forEach((listUrl, index) => {
    if (index > 0) htmlSleep_();

    const response = htmlFetch_(listUrl);
    if (response.getResponseCode() !== 200) {
      Logger.log(`[HTML] ${source.name}: HTTP ${response.getResponseCode()} tại ${listUrl}`);
      return;
    }

    const html = response.getContentText('UTF-8');
    const links = htmlExtractLinks_(html, listUrl, source);

    links.forEach(link => {
      if (refs.length >= limit) return;
      if (seen[link.url]) return;
      seen[link.url] = true;
      refs.push(link);
    });
  });

  return refs.slice(0, limit);
}

function htmlExtractLinks_(html, listUrl, source) {
  const links = [];
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const href = htmlDecodeEntities_(match[1]);
    const url = htmlBuildUrl_(href, listUrl, source);
    if (!url || !htmlSourceAllowsUrl_(url, source)) continue;

    const title = htmlCleanText_(htmlToText_(match[2]));
    links.push({ url, title });
  }

  return links;
}

function htmlExtractEmbeddedArticles_(html, source, listUrl) {
  const payload = htmlDecodeEmbeddedPayload_(html);
  const articles = [];
  const pattern = /"blog"\s*:\s*\{([\s\S]*?)"rootOrgId"\s*:\s*"[^"]+"/g;
  let match;

  while ((match = pattern.exec(payload)) !== null) {
    const block = match[1];
    if (!/"status"\s*:\s*"approved"/.test(block)) continue;
    if (!/"type"\s*:\s*"news"/.test(block)) continue;

    const title = htmlExtractObjectString_(block, 'title');
    const description = htmlExtractObjectString_(block, 'description');
    const pubDate = htmlExtractObjectString_(block, 'publishDate') ||
      htmlExtractObjectString_(block, 'createdAt');
    const slug = htmlExtractObjectString_(block, 'slug');
    const id = htmlExtractObjectString_(block, 'id');

    if (!title || title.length < 12) continue;
    if (!description || description.length < 40) continue;

    articles.push({
      title,
      link: htmlBuildEmbeddedArticleLink_(slug, id, listUrl),
      description: description.substring(0, 700),
      pubDate,
      source: source.name,
      sourcePriority: source.priority || 5
    });
  }

  return articles;
}

function htmlExtractObjectString_(block, key) {
  const pattern = new RegExp('"' + key + '"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"', 'i');
  const match = block.match(pattern);
  if (!match) return '';
  return htmlCleanText_(htmlDecodeJsonText_(match[1]));
}

function htmlDecodeEmbeddedPayload_(html) {
  return cleanValue_(html)
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"');
}

function htmlDecodeJsonText_(text) {
  return cleanValue_(text)
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&');
}

function htmlBuildEmbeddedArticleLink_(slug, id, listUrl) {
  const cleanSlug = cleanValue_(slug);
  if (cleanSlug) return `${htmlNormalizeUrl_(listUrl)}#${cleanSlug}`;
  if (id) return `${htmlNormalizeUrl_(listUrl)}#${id}`;
  return htmlNormalizeUrl_(listUrl);
}

function htmlSourceAllowsUrl_(url, source) {
  const normalized = htmlNormalizeUrl_(url);
  const listUrls = (source.listUrls || [source.url]).map(htmlNormalizeUrl_);
  if (listUrls.indexOf(normalized) >= 0) return false;

  if (htmlGetHost_(normalized) !== htmlGetHost_(source.url)) return false;
  if (/\.(?:jpg|jpeg|png|gif|webp|svg|ico|mp4|mp3|zip|rar)(?:\?|$)/i.test(normalized)) return false;

  const excludePatterns = source.excludeUrlPatterns || [];
  if (excludePatterns.some(pattern => htmlRegexTest_(pattern, normalized))) return false;

  const includePatterns = source.articleUrlPatterns || [];
  if (includePatterns.length === 0) return true;

  return includePatterns.some(pattern => htmlRegexTest_(pattern, normalized));
}

function htmlFetchArticleContent_(ref, source) {
  const response = htmlFetch_(ref.url);
  const code = response.getResponseCode();
  if (code !== 200) throw new Error(`HTTP ${code}`);

  const html = response.getContentText('UTF-8');
  const title = htmlExtractTitle_(html, ref.title);
  const mainHtml = htmlExtractMainHtml_(html, source);
  const mainText = htmlCleanArticleText_(htmlToText_(mainHtml));
  const description = htmlExtractDescription_(html, mainText);
  const pubDate = htmlExtractPublishedDate_(html, mainText);
  const wordCount = htmlCountWords_(mainText);

  if (!title || title.length < 12) throw new Error('Không tìm thấy tiêu đề hợp lệ');
  if (wordCount < 40 && description.length < 120) {
    throw new Error(`Nội dung quá ngắn (${wordCount} từ)`);
  }

  return {
    title,
    link: ref.url,
    description,
    pubDate,
    source: source.name,
    sourcePriority: source.priority || 5
  };
}

function htmlExtractTitle_(html, fallbackTitle) {
  const candidates = [];
  const h1Pattern = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let h1Match;

  while ((h1Match = h1Pattern.exec(html)) !== null) {
    candidates.push({ value: h1Match[1], priority: 1 });
  }

  [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i
  ].forEach((pattern, index) => {
    const match = html.match(pattern);
    if (match) candidates.push({ value: match[1], priority: 10 + index });
  });

  if (fallbackTitle) candidates.push({ value: fallbackTitle, priority: 30 });
  candidates.sort((a, b) => a.priority - b.priority);

  for (let i = 0; i < candidates.length; i++) {
    const title = htmlCleanTitle_(candidates[i].value);
    if (title.length >= 12) return title;
  }

  return '';
}

function htmlCleanTitle_(value) {
  const title = htmlCleanText_(htmlToText_(value));
  const parts = title.split(/\s+[-–|]\s+/);

  if (parts.length > 1) {
    const tail = htmlNormalizeTextKey_(parts[parts.length - 1]);
    if ([
      'huong sen viet',
      'lan toa gia tri viet',
      'tap chi ly luan chinh tri dien tu',
      'tap chi ly luan chinh tri',
      'trang thong tin dien tu cong an tinh phu tho',
      'ban tuyen giao va dan van trung uong'
    ].indexOf(tail) >= 0) {
      return parts.slice(0, -1).join(' - ').trim();
    }
  }

  return title;
}

function htmlExtractDescription_(html, mainText) {
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = html.match(patterns[i]);
    if (!match) continue;

    const description = htmlCleanText_(htmlDecodeEntities_(match[1]));
    if (description.length >= 40) return description.substring(0, 700);
  }

  return htmlCleanText_(mainText).substring(0, 700);
}

function htmlExtractPublishedDate_(html, mainText) {
  const patterns = [
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']pubdate["'][^>]+content=["']([^"']+)["']/i,
    /<time[^>]+datetime=["']([^"']+)["']/i,
    /(\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2})?)/,
    /(\d{4}-\d{2}-\d{2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?)?)/
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = html.match(patterns[i]) || mainText.match(patterns[i]);
    if (!match) continue;

    const date = htmlCleanText_(htmlDecodeEntities_(match[1]));
    if (date) return date;
  }

  return '';
}

function htmlExtractMainHtml_(html, source) {
  const candidates = [];
  const patterns = (source.contentPatterns || []).concat([
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
    /<div[^>]+class=["'][^"']*(?:article-content|detail-content|entry-content|post-content|content-detail|news-detail|td-post-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]+id=["'][^"']*(?:article|content|detail|main-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi
  ]);

  patterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const text = htmlCleanArticleText_(htmlToText_(match[1]));
      const words = htmlCountWords_(text);
      if (words >= 40) candidates.push({ html: match[1], words });
    }
  });

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.words - a.words);
    return candidates[0].html;
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

function htmlCleanArticleText_(text) {
  return htmlCleanText_(text)
    .replace(/^\s*(Tin liên quan|Bài liên quan|Xem thêm|Đọc thêm|Chia sẻ|Theo dõi|Nguồn tin)\s*:?.*$/gmi, '')
    .replace(/^\s*(- Advertisement -|Advertisement)\s*$/gmi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function htmlToText_(html) {
  return htmlDecodeEntities_(cleanValue_(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<\/(?:p|div|article|section|h[1-6]|blockquote|tr)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n\s+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim());
}

function htmlCleanText_(text) {
  return cleanValue_(text)
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function htmlDecodeEntities_(text) {
  return cleanValue_(text)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function htmlBuildUrl_(href, listUrl, source) {
  const value = htmlDecodeEntities_(cleanValue_(href));
  if (!value || value.startsWith('#') || /^javascript:|^mailto:|^tel:/i.test(value)) return '';

  if (/^https?:\/\//i.test(value)) return htmlNormalizeUrl_(value);
  if (value.startsWith('//')) return htmlNormalizeUrl_(`https:${value}`);

  const baseUrl = source.url || listUrl;
  const originMatch = baseUrl.match(/^(https?:\/\/[^\/]+)/i);
  if (!originMatch) return '';

  if (value.startsWith('/')) return htmlNormalizeUrl_(`${originMatch[1]}${value}`);

  const basePath = listUrl.replace(/[?#].*$/, '').replace(/\/[^\/]*$/, '/');
  return htmlNormalizeUrl_(`${basePath}${value}`);
}

function htmlNormalizeUrl_(url) {
  return cleanValue_(url)
    .replace(/#.*$/, '')
    .replace(/[?&](?:utm_[^=&]+|fbclid|zarsrc)=[^&]*/gi, '')
    .replace(/[?&]$/, '')
    .trim();
}

function htmlGetHost_(url) {
  const match = cleanValue_(url).match(/^https?:\/\/([^\/]+)/i);
  return match ? match[1].toLowerCase().replace(/^www\./, '') : '';
}

function htmlRegexTest_(pattern, value) {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

function htmlCountWords_(text) {
  const value = htmlCleanText_(text);
  if (!value) return 0;
  return value.split(/\s+/).filter(Boolean).length;
}

function htmlIsRecentArticle_(pubDateStr) {
  if (!pubDateStr) return true;

  const pubDate = htmlParseDate_(pubDateStr);
  if (!pubDate) return true;

  const now = new Date();
  const diffHours = (now - pubDate) / (1000 * 60 * 60);
  return diffHours <= 24;
}

function htmlParseDate_(value) {
  const text = cleanValue_(value);
  if (!text) return null;

  const vietnameseDate = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (vietnameseDate) {
    return new Date(
      Number(vietnameseDate[3]),
      Number(vietnameseDate[2]) - 1,
      Number(vietnameseDate[1]),
      Number(vietnameseDate[4] || 0),
      Number(vietnameseDate[5] || 0)
    );
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function htmlNormalizeTextKey_(value) {
  return cleanValue_(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function htmlFetch_(url) {
  return UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TranDiaSo-HtmlCrawler/1.0)'
    }
  });
}

function htmlSleep_() {
  const delay = Number(CONFIG.HTML_SOURCE_REQUEST_DELAY_MS) || 1500;
  if (delay > 0) Utilities.sleep(delay);
}
