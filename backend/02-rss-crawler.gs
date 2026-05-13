/**
 * ============================================================
 * MODULE: CRAWL RSS
 * Tự động kéo tin tức từ các báo chính thống
 * ============================================================
 */

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
          
          // Chỉ lấy bài trong 24h gần nhất
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
  const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName('TIN_TUC');
  
  // Lấy các title đã có trong sheet (7 ngày gần nhất)
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
  if (!pubDateStr) return true; // Nếu không có ngày thì cho qua
  
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
