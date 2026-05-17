/**
 * ============================================================
 * MODULE: TCCS PHAN_BAC_KHO GENERATOR
 * Tự động sinh entry PHAN_BAC_KHO từ toàn văn bài TCCS
 * đã scrape, sử dụng Gemini AI để trích xuất cặp
 * "luận điệu sai trái → phản bác".
 * ============================================================
 */

// ============================================================
// HẰNG SỐ - PBK GENERATOR
// ============================================================

const PBK_MAX_ARTICLES_PER_RUN = 3;

const PBK_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          chu_de: { type: 'string' },
          luan_dieu_sai_trai: { type: 'string' },
          phan_bac_chinh: { type: 'string' },
          dan_chung: {
            type: 'object',
            properties: {
              van_ban: { type: 'array', items: { type: 'string' } },
              so_lieu: { type: 'array', items: { type: 'string' } },
              trich_dan: { type: 'array', items: { type: 'string' } }
            }
          },
          tu_khoa: { type: 'array', items: { type: 'string' } },
          do_uu_tien: { type: 'integer' }
        },
        required: ['chu_de', 'luan_dieu_sai_trai', 'phan_bac_chinh', 'tu_khoa']
      }
    }
  },
  required: ['entries']
};

// ============================================================
// PUBLIC: PBK GENERATOR
// ============================================================

/**
 * Hàm chính: sinh entry PHAN_BAC_KHO từ bài TCCS đã scrape.
 * Chạy sau khi đã có dữ liệu trong TCCS_ARTICLE_TEXTS.
 * Mỗi lần chạy tối đa maxArticles bài để tránh timeout GAS.
 */
function generatePhanBacFromTccs(maxArticles) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG.concat(REQUIRED_GEMINI_CONFIG));

  const limit = Math.max(1, Number(maxArticles) || PBK_MAX_ARTICLES_PER_RUN);
  const processedIds = pbkGetProcessedArticleIds_();
  const articleMeta = pbkGetArticleMeta_();

  const textSheet = tccsGetSheet_('TCCS_ARTICLE_TEXTS');
  if (textSheet.getLastRow() <= 1) {
    Logger.log('[PBK] Chưa có dữ liệu TCCS_ARTICLE_TEXTS. Hãy chạy runTccsScrapeDrafts() trước.');
    return { success: true, processed: 0, saved: 0 };
  }

  const toProcess = textSheet.getRange(2, 1, textSheet.getLastRow() - 1, textSheet.getLastColumn())
    .getValues()
    .filter(row => {
      const articleId = cleanValue_(row[0]);
      return articleId && !processedIds.has(articleId);
    })
    .slice(0, limit);

  if (toProcess.length === 0) {
    Logger.log('[PBK] Tất cả bài TCCS đã được xử lý rồi.');
    return { success: true, processed: 0, saved: 0 };
  }

  Logger.log(`[PBK] Bắt đầu xử lý ${toProcess.length} bài TCCS → PHAN_BAC_KHO`);

  let processed = 0;
  let saved = 0;

  toProcess.forEach((row, index) => {
    const articleId = cleanValue_(row[0]);
    const sourceUrl = cleanValue_(row[1]);
    const fullText = cleanValue_(row[2]);
    const meta = articleMeta[articleId] || {};
    const title = meta.title || 'Bài viết Tạp chí Cộng sản';
    const topic = meta.topic || 'Các vấn đề thời sự';

    try {
      Logger.log(`[PBK] Bài ${index + 1}/${toProcess.length}: ${title}`);
      Utilities.sleep(2500);

      const entries = pbkExtractFromArticle_(title, topic, sourceUrl, fullText);

      if (entries.length === 0) {
        Logger.log(`[PBK] Bài này không có luận điệu sai trái cụ thể, bỏ qua.`);
        pbkMarkProcessed_(articleId);
        processed++;
        return;
      }

      const savedCount = pbkSaveEntries_(entries, articleId, title, sourceUrl);
      processed++;
      saved += savedCount;
      Logger.log(`[PBK] Lưu ${savedCount} entry mới từ bài: ${title}`);
    } catch (error) {
      Logger.log(`[PBK] Lỗi bài ${articleId}: ${error}`);
    }
  });

  Logger.log(`[PBK] Hoàn thành: ${processed} bài, ${saved} entry mới trong PHAN_BAC_KHO`);
  Logger.log('[PBK] Bước tiếp: mở sheet PHAN_BAC_KHO, đổi "Chờ duyệt" → "Đã duyệt" cho entry hợp lệ.');
  return { success: true, processed, saved };
}

/**
 * Xem nhanh các entry đang chờ duyệt.
 */
function reviewPendingPhanBac() {
  const sheet = getSheet_('PHAN_BAC_KHO');
  if (sheet.getLastRow() <= 1) {
    Logger.log('[PBK] Sheet PHAN_BAC_KHO chưa có dữ liệu.');
    return;
  }

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const pending = rows.filter(row => cleanValue_(row[8]) === 'Chờ duyệt');

  Logger.log(`[PBK] === PHAN_BAC_KHO đang chờ duyệt: ${pending.length} entry ===`);
  pending.slice(0, 10).forEach(row => {
    Logger.log(`\nID: ${row[0]}`);
    Logger.log(`Chủ đề: ${row[1]}`);
    Logger.log(`Luận điệu: ${String(row[2]).substring(0, 150)}...`);
    Logger.log(`Phản bác (preview): ${String(row[3]).substring(0, 100)}...`);
    Logger.log(`Nguồn: ${String(row[6]).substring(0, 80)}`);
    Logger.log('---');
  });

  if (pending.length > 10) {
    Logger.log(`... và ${pending.length - 10} entry khác`);
  }
}

// ============================================================
// NỘI BỘ: PBK GENERATOR
// ============================================================

function pbkExtractFromArticle_(title, topic, sourceUrl, fullText) {
  const topicList = TROLY35_TOPICS.join(' | ');
  const text = fullText.substring(0, 8000);

  const prompt = `Bạn là chuyên gia phân tích văn bản chính luận. Đọc bài từ Tạp chí Cộng sản và trích xuất các cặp "luận điệu sai trái → phản bác" thực sự có trong bài.

QUY TẮC BẮT BUỘC:
1. luan_dieu_sai_trai: viết đúng giọng của người phát tán trên mạng (cụ thể, không chung chung).
   ✓ Đúng: "Đảng CS VN độc tài, người dân không được nói khác ý Đảng"
   ✗ Sai: "luận điệu phủ nhận vai trò lãnh đạo của Đảng"
2. phan_bac_chinh: tổng hợp lập luận phản bác từ bài, 200-400 từ, có cấu trúc rõ.
3. dan_chung: CHỈ lấy những dẫn chứng THỰC SỰ có trong bài (số liệu, văn bản pháp lý, trích dẫn danh nhân). TUYỆT ĐỐI không bịa.
4. tu_khoa: 4-6 từ/cụm từ người dùng hay gõ khi phát tán luận điệu này trên Facebook/TikTok.
5. chu_de: chọn đúng 1 trong danh sách: ${topicList}
6. do_uu_tien: 1-3 (3=phổ biến và nguy hiểm nhất).
7. Tối đa 3 entries mỗi bài. Nếu bài là lý luận thuần túy không có luận điệu cụ thể, trả về entries=[].

TIÊU ĐỀ: ${title}
CHỦ ĐỀ: ${topic}
NGUỒN: ${sourceUrl}

NỘI DUNG BÀI:
${text}`;

  const result = troLy35CallGeminiJson_(prompt, PBK_EXTRACTION_SCHEMA);
  const entries = Array.isArray(result && result.entries) ? result.entries : [];

  return entries.filter(entry =>
    cleanValue_(entry.luan_dieu_sai_trai).length >= 40 &&
    cleanValue_(entry.phan_bac_chinh).length >= 150
  );
}

function pbkSaveEntries_(entries, articleId, articleTitle, sourceUrl) {
  if (!entries || entries.length === 0) return 0;

  const sheet = getSheet_('PHAN_BAC_KHO');
  const today = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  const idPrefix = `PBK-AUTO-${today}`;
  const existingCount = Math.max(0, sheet.getLastRow() - 1);
  const rows = [];

  entries.forEach(entry => {
    const id = `${idPrefix}-${existingCount + rows.length + 1}`;
    const danChung = entry.dan_chung || {};
    const tuKhoa = Array.isArray(entry.tu_khoa) ? entry.tu_khoa.join(', ') : '';
    const nguon = `TCCS-ARTICLE-${articleId} | ${articleTitle} | ${sourceUrl}`.substring(0, 500);

    rows.push([
      id,
      cleanValue_(entry.chu_de) || 'Các vấn đề thời sự',
      cleanValue_(entry.luan_dieu_sai_trai).substring(0, 1000),
      cleanValue_(entry.phan_bac_chinh).substring(0, 3000),
      JSON.stringify(danChung).substring(0, 4000),
      tuKhoa.substring(0, 500),
      nguon,
      Math.min(3, Math.max(1, Number(entry.do_uu_tien) || 2)),
      'Chờ duyệt',
      '',
      new Date()
    ]);
  });

  appendRows_(sheet, rows);
  return rows.length;
}

function pbkGetProcessedArticleIds_() {
  const sheet = getSheet_('PHAN_BAC_KHO');
  if (sheet.getLastRow() <= 1) return new Set();

  const ids = new Set();
  sheet.getRange(2, 7, sheet.getLastRow() - 1, 1).getValues()
    .flat().map(cleanValue_)
    .forEach(nguon => {
      const match = nguon.match(/TCCS-ARTICLE-(TCCS-A-[a-f0-9-]+)/);
      if (match) ids.add(match[1]);
    });

  return ids;
}

function pbkMarkProcessed_(articleId) {
  const sheet = getSheet_('PHAN_BAC_KHO');
  sheet.appendRow([
    `PBK-SKIP-${articleId.substring(0, 12)}`,
    'SKIP', 'Bài không có luận điệu sai trái cụ thể',
    '', '', '', `TCCS-ARTICLE-${articleId} | SKIP`, 0,
    'Bỏ qua', '', new Date()
  ]);
}

function pbkGetArticleMeta_() {
  const sheet = tccsGetSheet_('TCCS_ARTICLES');
  if (sheet.getLastRow() <= 1) return {};

  const meta = {};
  sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues()
    .forEach(row => {
      const articleId = cleanValue_(row[0]);
      if (articleId) {
        meta[articleId] = { title: cleanValue_(row[1]), topic: cleanValue_(row[2]) };
      }
    });
  return meta;
}
