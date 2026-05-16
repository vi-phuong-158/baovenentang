/**
 * ============================================================
 * MODULE: TRO LY 35
 * Phân tích, RAG Pinecone, sinh bản nháp phản hồi và thống kê.
 * ============================================================
 */

const TROLY35_MODES = {
  REBUTTAL: 'rebuttal',
  FACT_CHECK: 'fact_check',
  ARTICLE_WRITER: 'article_writer'
};

const TROLY35_EMBEDDING_DIMENSION = 768;
const TROLY35_EMBEDDING_MAX_CHARS = 12000;
const TROLY35_MAX_INPUT_CHARS = 6000;
const TROLY35_TOP_K = 5;

const TROLY35_TOPICS = [
  'Vai trò lãnh đạo của Đảng',
  'Dân chủ XHCN',
  'Nhân quyền',
  'Tự do ngôn luận, internet',
  'Tự do tôn giáo',
  'Tham nhũng và chống tham nhũng',
  'Kinh tế thị trường định hướng XHCN',
  'Quan hệ đối ngoại',
  'Chủ quyền biển đảo',
  'Quân đội, Công an',
  'Lịch sử Đảng',
  'Tư tưởng Hồ Chí Minh',
  'Đoàn kết dân tộc',
  'Phát triển bền vững, môi trường',
  'Các vấn đề thời sự'
];

const TROLY35_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    co_luan_dieu_sai_trai: { type: 'boolean' },
    do_nguy_hiem: { type: 'integer' },
    luan_diem_sai: { type: 'array', items: { type: 'string' } },
    chu_de: { type: 'string' },
    thu_doan: { type: 'array', items: { type: 'string' } },
    tu_khoa_chinh: { type: 'array', items: { type: 'string' } },
    doi_tuong_huong_den: { type: 'string' },
    muc_tieu_chinh_tri: { type: 'string' },
    canh_bao_an_toan: { type: 'array', items: { type: 'string' } }
  },
  required: [
    'co_luan_dieu_sai_trai',
    'do_nguy_hiem',
    'luan_diem_sai',
    'chu_de',
    'thu_doan',
    'tu_khoa_chinh',
    'doi_tuong_huong_den',
    'muc_tieu_chinh_tri',
    'canh_bao_an_toan'
  ],
  propertyOrdering: [
    'co_luan_dieu_sai_trai',
    'do_nguy_hiem',
    'luan_diem_sai',
    'chu_de',
    'thu_doan',
    'tu_khoa_chinh',
    'doi_tuong_huong_den',
    'muc_tieu_chinh_tri',
    'canh_bao_an_toan'
  ]
};

const TROLY35_REBUTTAL_SCHEMA = {
  type: 'object',
  properties: {
    phien_ban_day_du: { type: 'string' },
    phien_ban_comment: { type: 'string' },
    phien_ban_tom_tat: { type: 'array', items: { type: 'string' } },
    dan_chung_su_dung: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          loai: { type: 'string' },
          noi_dung: { type: 'string' },
          nguon: { type: 'string' }
        }
      }
    },
    hashtag_de_xuat: { type: 'array', items: { type: 'string' } },
    ghi_chu: { type: 'string' },
    nhan_kiem_duyet: { type: 'string' }
  },
  required: [
    'phien_ban_day_du',
    'phien_ban_comment',
    'phien_ban_tom_tat',
    'dan_chung_su_dung',
    'hashtag_de_xuat',
    'ghi_chu',
    'nhan_kiem_duyet'
  ]
};

const TROLY35_FACT_CHECK_SCHEMA = {
  type: 'object',
  properties: {
    muc_danh_gia: { type: 'string' },
    do_tin_cay: { type: 'integer' },
    nhan_dinh_chinh: { type: 'string' },
    diem_can_kiem_chung: { type: 'array', items: { type: 'string' } },
    bang_chung_doi_chieu: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          noi_dung: { type: 'string' },
          nguon: { type: 'string' }
        }
      }
    },
    khuyen_nghi_xu_ly: { type: 'string' },
    ghi_chu: { type: 'string' },
    nhan_kiem_duyet: { type: 'string' }
  },
  required: [
    'muc_danh_gia',
    'do_tin_cay',
    'nhan_dinh_chinh',
    'diem_can_kiem_chung',
    'bang_chung_doi_chieu',
    'khuyen_nghi_xu_ly',
    'ghi_chu',
    'nhan_kiem_duyet'
  ]
};

const TROLY35_ARTICLE_SCHEMA = {
  type: 'object',
  properties: {
    tieu_de: { type: 'string' },
    mo_ta_ngan: { type: 'string' },
    dan_y: { type: 'array', items: { type: 'string' } },
    bai_viet: { type: 'string' },
    caption_mxh: { type: 'string' },
    dan_chung_su_dung: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          noi_dung: { type: 'string' },
          nguon: { type: 'string' }
        }
      }
    },
    hashtag_de_xuat: { type: 'array', items: { type: 'string' } },
    ghi_chu: { type: 'string' },
    nhan_kiem_duyet: { type: 'string' }
  },
  required: [
    'tieu_de',
    'mo_ta_ngan',
    'dan_y',
    'bai_viet',
    'caption_mxh',
    'dan_chung_su_dung',
    'hashtag_de_xuat',
    'ghi_chu',
    'nhan_kiem_duyet'
  ]
};

function handleTroLy35Run(data) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG.concat(REQUIRED_TROLY35_CONFIG));
  troLy35RequireAccess_(data && data.accessCode);

  const mode = troLy35NormalizeMode_(data && data.mode);
  const rawContent = cleanValue_(data && data.content).substring(0, TROLY35_MAX_INPUT_CHARS);
  const content = troLy35NormalizeRequestInput_(rawContent);
  const sourceUrl = cleanValue_(data && data.sourceUrl).substring(0, 500);
  const topicHint = cleanValue_(data && data.topic).substring(0, 160);

  if (content.length < 20) {
    throw new Error('Vui lòng nhập nội dung cần xử lý tối thiểu 20 ký tự.');
  }

  if (troLy35IsUrlOnly_(content)) {
    throw new Error('Bản đầu chưa tự lấy nội dung từ Facebook/TikTok/YouTube. Vui lòng dán nội dung bài viết hoặc bình luận vào ô nhập.');
  }

  troLy35AssertDailyLimit_(data.accessCode);
  troLy35IncrementDailyLimit_(data.accessCode);

  const requestId = troLy35CreateRequestId_();
  let analysis = {};
  let knowledge = [];
  let result = {};

  try {
    if (mode === TROLY35_MODES.ARTICLE_WRITER) {
      analysis = troLy35BuildArticleAnalysis_(content, topicHint);
      knowledge = troLy35SearchKnowledge_(analysis, content, topicHint);
      result = troLy35GenerateArticle_(content, topicHint, knowledge);
    } else {
      analysis = troLy35AnalyzeInput_(content, topicHint, mode);
      knowledge = troLy35SearchKnowledge_(analysis, content, topicHint);

      if (mode === TROLY35_MODES.FACT_CHECK) {
        result = troLy35GenerateFactCheck_(content, analysis, knowledge);
      } else {
        result = troLy35GenerateRebuttalDraft_(content, analysis, knowledge);
      }
    }

    troLy35SaveHistory_({
      requestId,
      mode,
      input: content,
      sourceUrl,
      analysis,
      result,
      knowledge,
      status: 'DONE'
    });

    return {
      success: true,
      requestId,
      analysis,
      knowledge,
      result
    };
  } catch (error) {
    troLy35SaveHistory_({
      requestId,
      mode,
      input: content,
      sourceUrl,
      analysis,
      result,
      knowledge,
      status: 'ERROR',
      error: error.toString()
    });
    throw error;
  }
}

function handleTroLy35Rate(data) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG);
  troLy35RequireAccess_(data && data.accessCode);

  const requestId = cleanValue_(data && data.requestId);
  const rating = Number(data && data.rating);
  const note = cleanValue_(data && data.note).substring(0, 1000);

  if (!requestId) throw new Error('Thiếu requestId.');
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating phải từ 1 đến 5.');
  }

  const sheet = getSheet_('TROLY35_HISTORY');
  const rowIndex = troLy35FindHistoryRow_(sheet, requestId);
  if (!rowIndex) throw new Error('Không tìm thấy lịch sử cần đánh giá.');

  sheet.getRange(rowIndex, 12, 1, 2).setValues([[rating, note]]);

  return {
    success: true,
    message: 'Đã lưu đánh giá',
    requestId,
    rating
  };
}

function handleTroLy35History(data) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG);
  troLy35RequireAccess_(data && data.accessCode);

  const limit = Math.min(50, Math.max(1, Number(data && data.limit) || 20));
  const sheet = getSheet_('TROLY35_HISTORY');
  if (sheet.getLastRow() <= 1) return { success: true, data: [] };

  const start = Math.max(2, sheet.getLastRow() - limit + 1);
  const dataRows = sheet.getRange(start, 1, sheet.getLastRow() - start + 1, sheet.getLastColumn()).getValues();
  const rows = dataRows.reverse().map(row => ({
    timestamp: row[0],
    requestId: row[1],
    mode: row[2],
    topic: row[3],
    dangerLevel: row[4],
    inputPreview: row[5],
    sourceUrl: row[7],
    rating: row[11],
    note: row[12],
    status: row[13],
    error: row[14]
  }));

  return { success: true, data: rows };
}

function handleTroLy35Trends(data) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG);
  troLy35RequireAccess_(data && data.accessCode);

  const windowDays = Math.min(30, Math.max(1, Number(data && data.windowDays) || 7));
  const since = new Date();
  since.setDate(since.getDate() - windowDays + 1);
  since.setHours(0, 0, 0, 0);

  const sheet = getSheet_('TROLY35_HISTORY');
  if (sheet.getLastRow() <= 1) {
    return {
      success: true,
      data: troLy35EmptyTrend_(windowDays)
    };
  }

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
    .filter(row => {
      const timestamp = new Date(row[0]);
      return !Number.isNaN(timestamp.getTime()) && timestamp >= since && row[13] === 'DONE';
    });

  const topics = {};
  let dangerTotal = 0;
  let dangerCount = 0;
  let rated = 0;
  let goodRated = 0;

  rows.forEach(row => {
    const topic = row[3] || 'Chưa phân loại';
    topics[topic] = (topics[topic] || 0) + 1;

    const danger = Number(row[4]);
    if (Number.isFinite(danger) && danger > 0) {
      dangerTotal += danger;
      dangerCount++;
    }

    const rating = Number(row[11]);
    if (Number.isFinite(rating) && rating > 0) {
      rated++;
      if (rating >= 4) goodRated++;
    }
  });

  const topTopics = Object.keys(topics)
    .map(topic => ({ topic, count: topics[topic] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    success: true,
    data: {
      windowDays,
      totalRequests: rows.length,
      averageDangerLevel: dangerCount ? Number((dangerTotal / dangerCount).toFixed(2)) : 0,
      goodRatingRate: rated ? Math.round((goodRated / rated) * 100) : 0,
      topTopics,
      lastUpdate: new Date().toLocaleString('vi-VN')
    }
  };
}

function syncTroLy35KnowledgeToPinecone(maxRows) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG.concat(REQUIRED_GEMINI_CONFIG).concat(REQUIRED_PINECONE_CONFIG));

  const limit = Math.max(1, Number(maxRows) || 25);
  const knowledgeRows = troLy35GetKnowledgeRows_()
    .filter(item => troLy35IsApprovedKnowledge_(item))
    .slice(0, limit);

  if (knowledgeRows.length === 0) {
    Logger.log('[Trợ lý 35] Không có dòng PHAN_BAC_KHO đã duyệt để đồng bộ.');
    return { success: true, upserted: 0 };
  }

  const vectors = knowledgeRows.map(item => {
    const vectorId = item.pineconeId || `troly35-${item.id}`.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const embedding = troLy35EmbedText_(troLy35KnowledgeToEmbeddingText_(item));
    return {
      rowIndex: item.rowIndex,
      vector: {
        id: vectorId,
        values: embedding,
        metadata: {
          knowledge_id: item.id,
          chu_de: item.chuDe,
          luan_diem_sai_trai: item.luanDiemSaiTrai.substring(0, 2000),
          phan_bac_chinh: item.phanBacChinh.substring(0, 3000),
          dan_chung_json: item.danChungJson.substring(0, 4000),
          tu_khoa: item.tuKhoa,
          nguon: item.nguon,
          do_uu_tien: item.doUuTien
        }
      }
    };
  });

  troLy35UpsertPineconeVectors_(vectors.map(item => item.vector));

  const sheet = getSheet_('PHAN_BAC_KHO');
  vectors.forEach(item => {
    sheet.getRange(item.rowIndex, 10, 1, 2).setValues([[item.vector.id, new Date()]]);
  });

  Logger.log(`[Trợ lý 35] Đã đồng bộ ${vectors.length} vector lên Pinecone.`);
  return {
    success: true,
    upserted: vectors.length
  };
}

function seedTroLy35KnowledgeFromPhanBac() {
  const sourceSheet = getSheet_('PHAN_BAC');
  const targetSheet = getSheet_('PHAN_BAC_KHO');

  if (sourceSheet.getLastRow() <= 1) {
    Logger.log('[Trợ lý 35] PHAN_BAC chưa có dữ liệu để import.');
    return 0;
  }

  const existingIds = targetSheet.getLastRow() > 1
    ? targetSheet.getRange(2, 1, targetSheet.getLastRow() - 1, 1).getValues().flat().map(cleanValue_)
    : [];

  const rows = sourceSheet.getRange(2, 1, sourceSheet.getLastRow() - 1, sourceSheet.getLastColumn()).getValues();
  const newRows = [];

  rows.forEach((row, index) => {
    const id = `PBK${String(index + 1).padStart(3, '0')}`;
    if (existingIds.includes(id)) return;

    const evidence = {
      van_ban: cleanValue_(row[4]) ? cleanValue_(row[4]).split('\n') : [],
      nguon: cleanValue_(row[5])
    };

    newRows.push([
      id,
      cleanValue_(row[1]),
      cleanValue_(row[2]),
      cleanValue_(row[3]),
      JSON.stringify(evidence),
      troLy35ExtractKeywords_([row[1], row[2], row[3]].join(' ')).join(', '),
      cleanValue_(row[5]),
      2,
      'Đã duyệt',
      '',
      new Date()
    ]);
  });

  appendRows_(targetSheet, newRows);
  Logger.log(`[Trợ lý 35] Đã import ${newRows.length} dòng từ PHAN_BAC sang PHAN_BAC_KHO.`);
  return newRows.length;
}

function importTroLy35KnowledgeCsv(csvText) {
  const rows = Utilities.parseCsv(csvText || '');
  if (!rows || rows.length <= 1) {
    throw new Error('CSV không có dữ liệu.');
  }

  const headers = rows[0].map(cleanValue_);
  const indexOf = name => headers.indexOf(name);
  const topicIndex = indexOf('Chủ đề');
  const wrongIndex = indexOf('Luận điệu sai trái');
  const rebuttalIndex = indexOf('Luận điểm phản bác');
  const evidenceIndex = indexOf('Bằng chứng');
  const sourceIndex = indexOf('Nguồn');

  if ([topicIndex, wrongIndex, rebuttalIndex].some(index => index < 0)) {
    throw new Error('CSV cần có cột: Chủ đề, Luận điệu sai trái, Luận điểm phản bác.');
  }

  const sheet = getSheet_('PHAN_BAC_KHO');
  const existingIds = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat().map(cleanValue_)
    : [];
  const startNumber = existingIds.length + 1;
  const newRows = [];

  rows.slice(1).forEach((row, index) => {
    const topic = cleanValue_(row[topicIndex]);
    const wrongClaim = cleanValue_(row[wrongIndex]);
    const rebuttal = cleanValue_(row[rebuttalIndex]);
    if (!topic || !wrongClaim || !rebuttal) return;

    const id = `PBK${String(startNumber + newRows.length).padStart(3, '0')}`;
    const evidence = {
      van_ban: cleanValue_(row[evidenceIndex]) ? cleanValue_(row[evidenceIndex]).split(/\.\s+/).filter(Boolean) : [],
      nguon: sourceIndex >= 0 ? cleanValue_(row[sourceIndex]) : ''
    };

    newRows.push([
      id,
      topic,
      wrongClaim,
      rebuttal,
      JSON.stringify(evidence),
      troLy35ExtractKeywords_([topic, wrongClaim, rebuttal].join(' ')).join(', '),
      sourceIndex >= 0 ? cleanValue_(row[sourceIndex]) : '',
      2,
      'Đã duyệt',
      '',
      new Date()
    ]);
  });

  appendRows_(sheet, newRows);
  Logger.log(`[Trợ lý 35] Đã import ${newRows.length} dòng CSV vào PHAN_BAC_KHO.`);
  return newRows.length;
}

function makeTroLy35AccessCodeHash(accessCode) {
  const hash = troLy35Hash_(accessCode);
  Logger.log(`TROLY35_ACCESS_CODE_SHA256=${hash}`);
  return hash;
}

function setTroLy35AccessCode(accessCode) {
  const cleanCode = cleanValue_(accessCode);
  if (cleanCode.length < 6) {
    throw new Error('Mã truy cập nên dài tối thiểu 6 ký tự.');
  }

  const hash = troLy35Hash_(cleanCode);
  PropertiesService.getScriptProperties().setProperty('TROLY35_ACCESS_CODE_SHA256', hash);
  Logger.log('Đã cập nhật TROLY35_ACCESS_CODE_SHA256. Người dùng đăng nhập bằng mã gốc vừa nhập, không nhập chuỗi hash.');
  return hash;
}

function setTroLy35AccessCodeFromTemporaryProperty() {
  const properties = PropertiesService.getScriptProperties();
  const temporaryCode = cleanValue_(properties.getProperty('TROLY35_NEW_ACCESS_CODE'));
  if (!temporaryCode) {
    throw new Error('Chưa có Script Property TROLY35_NEW_ACCESS_CODE. Hãy tạo key này với mã nội bộ mới, chạy hàm, rồi hệ thống sẽ tự xóa key tạm.');
  }

  const hash = setTroLy35AccessCode(temporaryCode);
  properties.deleteProperty('TROLY35_NEW_ACCESS_CODE');
  Logger.log('Đã xóa Script Property tạm TROLY35_NEW_ACCESS_CODE. Từ giờ đăng nhập bằng mã gốc vừa đặt.');
  return hash;
}

function verifyTroLy35AccessCode(accessCode) {
  try {
    troLy35RequireAccess_(accessCode);
    Logger.log('Mã truy cập hợp lệ.');
    return true;
  } catch (error) {
    Logger.log(`Mã truy cập không hợp lệ: ${error}`);
    return false;
  }
}

function testTroLy35Setup() {
  Logger.log('--- Test cấu hình Trợ lý 35 ---');
  initializeSheets();

  const missing = getMissingConfigKeys_(REQUIRED_TROLY35_CONFIG);
  if (missing.length > 0) {
    Logger.log(`Thiếu cấu hình: ${missing.join(', ')}`);
  } else {
    Logger.log('Đã đủ cấu hình Gemini, Pinecone và mã truy cập.');
  }

  const knowledgeCount = troLy35GetKnowledgeRows_().length;
  Logger.log(`PHAN_BAC_KHO hiện có ${knowledgeCount} dòng.`);
  Logger.log('Nếu PHAN_BAC_KHO chưa có dữ liệu, chạy seedSampleData() hoặc seedTroLy35KnowledgeFromPhanBac().');
}

function troLy35AnalyzeInput_(content, topicHint, mode) {
  const topicList = TROLY35_TOPICS.join(' | ');
  const prompt = `Bạn là trợ lý phân tích thông tin chính trị - xã hội. Nhiệm vụ là phân tích nội dung để hỗ trợ cán bộ con người rà soát và phản hồi có trách nhiệm.

CHẾ ĐỘ: ${mode}
CHỦ ĐỀ GỢI Ý: ${topicHint || 'Không có'}
NỘI DUNG:
"""
${content}
"""

Trả về JSON đúng schema. Quy tắc bắt buộc:
1. Nếu nội dung là yêu cầu phản bác một quan điểm (VD: "phản bác quan điểm cho rằng X", "bác bỏ luận điểm X", "chứng minh sai X"...), hãy trích xuất luận điểm X cần phản bác, đặt co_luan_dieu_sai_trai=true, và ghi luận điểm đó vào luan_diem_sai. Phân tích luận điểm X như thể đó là nội dung cần phản hồi.
2. Nếu không thấy luận điệu sai trái rõ ràng và không phải yêu cầu phản bác, đặt co_luan_dieu_sai_trai=false và giải thích ngắn trong muc_tieu_chinh_tri.
3. chu_de phải chọn gần nhất trong danh sách: ${topicList}.
4. do_nguy_hiem là số nguyên 1-5.
5. Thêm canh_bao_an_toan nếu nội dung có nguy cơ nhạy cảm, thiếu nguồn hoặc cần người duyệt.`;

  const analysis = troLy35CallGeminiJson_(prompt, TROLY35_ANALYSIS_SCHEMA);
  return troLy35NormalizeAnalysis_(analysis);
}

function troLy35BuildArticleAnalysis_(content, topicHint) {
  return {
    co_luan_dieu_sai_trai: false,
    do_nguy_hiem: 1,
    luan_diem_sai: [],
    chu_de: topicHint || troLy35GuessTopic_(content),
    thu_doan: [],
    tu_khoa_chinh: troLy35ExtractKeywords_(content),
    doi_tuong_huong_den: 'Cán bộ, đoàn viên và người dân quan tâm',
    muc_tieu_chinh_tri: 'Hỗ trợ xây dựng bài viết tuyên truyền dựa trên chủ đề người dùng cung cấp.',
    canh_bao_an_toan: ['Bản nháp cần người dùng rà soát nguồn và văn phong trước khi sử dụng.']
  };
}

function troLy35GenerateRebuttalDraft_(content, analysis, knowledge) {
  if (analysis.co_luan_dieu_sai_trai === false) {
    return {
      phien_ban_day_du: 'Chưa phát hiện luận điểm sai trái rõ ràng trong nội dung đã nhập. Nên rà soát thêm ngữ cảnh và nguồn trước khi phản hồi.',
      phien_ban_comment: 'Mình chưa thấy đủ căn cứ để kết luận nội dung này là sai trái. Nên kiểm tra thêm nguồn gốc và bối cảnh trước khi bình luận.',
      phien_ban_tom_tat: ['Chưa đủ căn cứ kết luận', 'Cần kiểm tra nguồn và bối cảnh', 'Không nên phản hồi theo hướng quy chụp'],
      dan_chung_su_dung: [],
      hashtag_de_xuat: [],
      ghi_chu: 'Không tự động phản hồi khi chưa đủ căn cứ.',
      nhan_kiem_duyet: 'Bản nháp cần người dùng rà soát trước khi sử dụng.'
    };
  }

  const prompt = `Bạn là trợ lý soạn bản nháp phản hồi cho cán bộ con người. Hãy viết tự tin, có lập luận rõ ràng, không công kích cá nhân, không kêu gọi spam, không tự động đăng lên mạng xã hội.

NỘI DUNG GỐC:
"""
${content}
"""

PHÂN TÍCH:
${JSON.stringify(analysis, null, 2)}

TƯ LIỆU RAG ĐÃ DUYỆT:
${troLy35KnowledgePrompt_(knowledge)}

Yêu cầu:
1. Chỉ dùng số liệu/dẫn chứng có trong tư liệu. Nếu thiếu căn cứ cụ thể, KHÔNG nhúng disclaimer vào phien_ban_day_du — hãy ghi riêng vào ghi_chu.
2. Không bịa nguồn, không bịa số liệu. Viết phien_ban_day_du mạch lạc, dứt khoát, không thêm chú thích ngoặc đơn vào cuối.
3. Tạo 3 phiên bản: phản bác đầy đủ, comment ngắn, tóm tắt nhanh.
4. Đặt nhãn kiểm duyệt vào nhan_kiem_duyet, không nhúng vào nội dung chính.
5. Trả về JSON đúng schema.`;

  return troLy35CallGeminiJson_(prompt, TROLY35_REBUTTAL_SCHEMA);
}

function troLy35GenerateFactCheck_(content, analysis, knowledge) {
  const news = troLy35SearchOfficialNews_(analysis);
  const prompt = `Bạn là trợ lý thẩm định nhanh nguồn tin. Hãy đánh giá mức độ có căn cứ của nội dung, không kết luận vượt quá tư liệu.

NỘI DUNG CẦN THẨM ĐỊNH:
"""
${content}
"""

PHÂN TÍCH:
${JSON.stringify(analysis, null, 2)}

TƯ LIỆU RAG:
${troLy35KnowledgePrompt_(knowledge)}

TIN CHÍNH THỐNG ĐANG CÓ TRONG HỆ THỐNG:
${JSON.stringify(news, null, 2)}

Chọn muc_danh_gia là một trong: "đủ cơ sở", "cần kiểm chứng thêm", "thiếu nguồn".
Quy tắc: không bịa nguồn, không bịa số liệu, nêu rõ điểm cần kiểm chứng, không công kích cá nhân. Trả về JSON đúng schema.`;

  return troLy35CallGeminiJson_(prompt, TROLY35_FACT_CHECK_SCHEMA);
}

function troLy35GenerateArticle_(content, topicHint, knowledge) {
  const prompt = `Bạn là trợ lý viết bản nháp bài tuyên truyền cho cán bộ con người. Hãy viết mạch lạc, có căn cứ, không bịa nguồn, không tự động đăng hay kêu gọi spam.

CHỦ ĐỀ/THÔNG ĐIỆP:
"""
${content}
"""

CHỦ ĐỀ GỢI Ý: ${topicHint || 'Không có'}

TƯ LIỆU RAG:
${troLy35KnowledgePrompt_(knowledge)}

Yêu cầu:
1. Viết một bản nháp 800-1200 từ.
2. Có dàn ý, caption MXH ngắn, hashtag đề xuất.
3. Chỉ dùng dẫn chứng có nguồn trong tư liệu hoặc ghi "cần kiểm chứng thêm".
4. Luôn thêm nhãn: "Bản nháp cần người dùng rà soát trước khi sử dụng."
5. Trả về JSON đúng schema.`;

  return troLy35CallGeminiJson_(prompt, TROLY35_ARTICLE_SCHEMA);
}

function troLy35SearchKnowledge_(analysis, content, topicHint) {
  const queryText = troLy35BuildKnowledgeQuery_(analysis, content, topicHint);

  try {
    const vector = troLy35EmbedText_(queryText);
    const pineconeMatches = troLy35QueryPinecone_(vector, TROLY35_TOP_K);
    const results = pineconeMatches
      .map(troLy35KnowledgeFromPineconeMatch_)
      .filter(item => item && item.id);
    if (results.length > 0) return results;
  } catch (error) {
    Logger.log(`[Trợ lý 35] Pinecone lỗi, fallback Sheets keyword: ${error}`);
  }

  return troLy35SearchKnowledgeInSheets_(analysis, content, topicHint, TROLY35_TOP_K);
}

function troLy35EmbedText_(text) {
  assertRequiredConfig_(REQUIRED_GEMINI_CONFIG);

  const model = CONFIG.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${CONFIG.GEMINI_API_KEY}`;
  const payload = {
    model: `models/${model}`,
    content: {
      parts: [{ text: text.substring(0, TROLY35_EMBEDDING_MAX_CHARS) }]
    },
    outputDimensionality: TROLY35_EMBEDDING_DIMENSION
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code !== 200) {
    throw new Error(`Gemini embedding trả về ${code}: ${response.getContentText()}`);
  }

  const body = JSON.parse(response.getContentText());
  const values = body.embedding && body.embedding.values
    ? body.embedding.values
    : (body.embeddings && body.embeddings[0] && body.embeddings[0].values);

  if (!values || values.length === 0) {
    throw new Error('Gemini embedding không trả về vector.');
  }

  return values;
}

function troLy35QueryPinecone_(vector, topK) {
  assertRequiredConfig_(REQUIRED_PINECONE_CONFIG);

  const url = `${troLy35PineconeHost_()}/query`;
  const payload = {
    namespace: CONFIG.PINECONE_NAMESPACE || 'troly35',
    vector,
    topK: topK || TROLY35_TOP_K,
    includeMetadata: true
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Api-Key': CONFIG.PINECONE_API_KEY,
      'X-Pinecone-API-Version': '2025-04'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code !== 200) {
    throw new Error(`Pinecone query trả về ${code}: ${response.getContentText()}`);
  }

  const body = JSON.parse(response.getContentText());
  return body.matches || [];
}

function troLy35UpsertPineconeVectors_(vectors) {
  if (!vectors || vectors.length === 0) return;

  const url = `${troLy35PineconeHost_()}/vectors/upsert`;
  const payload = {
    namespace: CONFIG.PINECONE_NAMESPACE || 'troly35',
    vectors
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Api-Key': CONFIG.PINECONE_API_KEY,
      'X-Pinecone-API-Version': '2025-04'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code !== 200) {
    throw new Error(`Pinecone upsert trả về ${code}: ${response.getContentText()}`);
  }
}

function troLy35SearchKnowledgeInSheets_(analysis, content, topicHint, limit) {
  const keywords = [].concat(analysis.tu_khoa_chinh || [], troLy35ExtractKeywords_(content), topicHint || '')
    .map(item => cleanValue_(item).toLowerCase())
    .filter(Boolean);
  const topic = cleanValue_(analysis.chu_de || topicHint).toLowerCase();
  const maxResults = limit || TROLY35_TOP_K;

  const knowledgeResults = troLy35GetKnowledgeRows_()
    .filter(troLy35IsApprovedKnowledge_)
    .map(item => {
      const haystack = [
        item.chuDe,
        item.luanDiemSaiTrai,
        item.phanBacChinh,
        item.danChungJson,
        item.tuKhoa,
        item.nguon
      ].join(' ').toLowerCase();

      let score = 0;
      if (topic && item.chuDe.toLowerCase().includes(topic)) score += 10;
      keywords.forEach(keyword => {
        if (keyword && haystack.includes(keyword)) score += 2;
      });
      score += Number(item.doUuTien) || 0;

      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .map(troLy35KnowledgeForApi_);

  const tccsResults = typeof tccsSearchChunksInSheets_ === 'function'
    ? tccsSearchChunksInSheets_(analysis, content, topicHint, maxResults)
    : [];

  return knowledgeResults
    .concat(tccsResults)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, maxResults);
}

function troLy35SearchOfficialNews_(analysis) {
  try {
    const sheet = getSheet_('TIN_TUC');
    if (sheet.getLastRow() <= 1) return [];

    const keywords = (analysis.tu_khoa_chinh || []).map(item => cleanValue_(item).toLowerCase()).filter(Boolean);
    const topic = cleanValue_(analysis.chu_de).toLowerCase();

    return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
      .map(row => ({
        date: row[0],
        title: row[1],
        summary: row[2],
        category: row[3],
        source: row[6],
        link: row[7],
        text: [row[1], row[2], row[3], row[8]].join(' ').toLowerCase()
      }))
      .map(item => {
        let score = topic && item.text.includes(topic) ? 5 : 0;
        keywords.forEach(keyword => {
          if (item.text.includes(keyword)) score += 2;
        });
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => ({
        title: item.title,
        summary: item.summary,
        source: item.source,
        link: item.link
      }));
  } catch (error) {
    Logger.log(`[Trợ lý 35] Không đọc được tin chính thống: ${error}`);
    return [];
  }
}

function troLy35GetKnowledgeRows_() {
  const sheet = getSheet_('PHAN_BAC_KHO');
  if (sheet.getLastRow() <= 1) return [];

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return rows.map((row, index) => ({
    rowIndex: index + 2,
    id: cleanValue_(row[0]),
    chuDe: cleanValue_(row[1]),
    luanDiemSaiTrai: cleanValue_(row[2]),
    phanBacChinh: cleanValue_(row[3]),
    danChungJson: cleanValue_(row[4]),
    tuKhoa: cleanValue_(row[5]),
    nguon: cleanValue_(row[6]),
    doUuTien: Number(row[7]) || 0,
    trangThaiDuyet: cleanValue_(row[8]),
    pineconeId: cleanValue_(row[9]),
    ngayCapNhat: row[10]
  })).filter(item => item.id);
}

function troLy35IsApprovedKnowledge_(item) {
  const status = cleanValue_(item.trangThaiDuyet).toLowerCase();
  return ['đã duyệt', 'da duyet', 'approved', 'duyet'].includes(status);
}

function troLy35KnowledgeFromPineconeMatch_(match) {
  const meta = match.metadata || {};

  if (meta.source_type === 'tccs_chunk' || meta.source === 'tccs') {
    if (typeof tccsKnowledgeFromPineconeMatch_ === 'function') {
      return tccsKnowledgeFromPineconeMatch_(match);
    }

    return {
      id: meta.tccs_chunk_id || match.id,
      chuDe: meta.topic || meta.chu_de || '',
      luanDiemSaiTrai: 'Tư liệu bài viết chính thống từ Tạp chí Cộng sản',
      phanBacChinh: meta.preview || '',
      danChung: {
        title: meta.title || '',
        source_url: meta.source_url || '',
        section_type: meta.section_type || ''
      },
      tuKhoa: meta.keywords || '',
      nguon: meta.source_url || 'Tạp chí Cộng sản',
      score: match.score || 0,
      source: 'tccs_pinecone'
    };
  }

  return {
    id: meta.knowledge_id || match.id,
    chuDe: meta.chu_de || '',
    luanDiemSaiTrai: meta.luan_diem_sai_trai || '',
    phanBacChinh: meta.phan_bac_chinh || '',
    danChung: troLy35ParseEvidence_(meta.dan_chung_json || ''),
    tuKhoa: meta.tu_khoa || '',
    nguon: meta.nguon || '',
    score: match.score || 0,
    source: 'pinecone'
  };
}

function troLy35KnowledgeForApi_(item) {
  return {
    id: item.id,
    chuDe: item.chuDe,
    luanDiemSaiTrai: item.luanDiemSaiTrai,
    phanBacChinh: item.phanBacChinh,
    danChung: troLy35ParseEvidence_(item.danChungJson),
    tuKhoa: item.tuKhoa,
    nguon: item.nguon,
    score: item.score || 0,
    source: 'sheets'
  };
}

function troLy35KnowledgePrompt_(knowledge) {
  if (!knowledge || knowledge.length === 0) {
    return 'Không có tư liệu liên quan trong kho. Nếu thiếu căn cứ, hãy nói rõ cần kiểm chứng thêm.';
  }

  return knowledge.map((item, index) => {
    const evidence = typeof item.danChung === 'string'
      ? item.danChung
      : JSON.stringify(item.danChung || {});
    return `[Tư liệu ${index + 1}]
ID: ${item.id}
Chủ đề: ${item.chuDe}
Luận điểm sai trái: ${item.luanDiemSaiTrai}
Phản bác chính: ${item.phanBacChinh}
Dẫn chứng: ${evidence}
Nguồn: ${item.nguon}`;
  }).join('\n\n');
}

function troLy35KnowledgeToEmbeddingText_(item) {
  return [
    item.chuDe,
    item.luanDiemSaiTrai,
    item.phanBacChinh,
    item.danChungJson,
    item.tuKhoa,
    item.nguon
  ].join('\n');
}

function troLy35BuildKnowledgeQuery_(analysis, content, topicHint) {
  return [
    topicHint,
    analysis.chu_de,
    (analysis.luan_diem_sai || []).join('\n'),
    (analysis.tu_khoa_chinh || []).join(', '),
    content.substring(0, 2000)
  ].filter(Boolean).join('\n');
}

function troLy35SaveHistory_(data) {
  const sheet = getSheet_('TROLY35_HISTORY');
  const analysis = data.analysis || {};
  const result = data.result || {};
  const knowledge = data.knowledge || [];
  const input = cleanValue_(data.input);

  sheet.appendRow([
    new Date(),
    data.requestId,
    data.mode,
    analysis.chu_de || '',
    Number(analysis.do_nguy_hiem) || '',
    input.substring(0, 500),
    CONFIG.TROLY35_SAVE_FULL_INPUT ? input : '',
    cleanValue_(data.sourceUrl),
    troLy35Stringify_(analysis, 45000),
    troLy35Stringify_(result, 45000),
    troLy35Stringify_(knowledge, 45000),
    '',
    '',
    data.status || 'DONE',
    cleanValue_(data.error)
  ]);
}

function troLy35FindHistoryRow_(sheet, requestId) {
  if (sheet.getLastRow() <= 1) return 0;

  const values = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (cleanValue_(values[i][0]) === requestId) return i + 2;
  }
  return 0;
}

function troLy35CallGeminiJson_(prompt, schema) {
  let text;

  try {
    text = callGeminiAPI(prompt, schema);
  } catch (error) {
    Logger.log(`[Trợ lý 35] Structured output lỗi, thử lại không schema: ${error}`);
    text = callGeminiAPI(prompt);
  }

  return troLy35ParseJsonObject_(text);
}

function troLy35ParseJsonObject_(text) {
  const cleaned = cleanValue_(text)
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? (parsed[0] || {}) : parsed;
}

function troLy35NormalizeAnalysis_(analysis) {
  const normalized = analysis || {};
  normalized.co_luan_dieu_sai_trai = normalized.co_luan_dieu_sai_trai === true;
  normalized.do_nguy_hiem = Math.min(5, Math.max(1, Number(normalized.do_nguy_hiem) || 1));
  normalized.luan_diem_sai = Array.isArray(normalized.luan_diem_sai) ? normalized.luan_diem_sai : [];
  normalized.thu_doan = Array.isArray(normalized.thu_doan) ? normalized.thu_doan : [];
  normalized.tu_khoa_chinh = Array.isArray(normalized.tu_khoa_chinh) ? normalized.tu_khoa_chinh : [];
  normalized.canh_bao_an_toan = Array.isArray(normalized.canh_bao_an_toan) ? normalized.canh_bao_an_toan : [];
  normalized.chu_de = normalized.chu_de || 'Các vấn đề thời sự';
  return normalized;
}

function troLy35NormalizeMode_(mode) {
  const value = cleanValue_(mode) || TROLY35_MODES.REBUTTAL;
  const allowed = Object.keys(TROLY35_MODES).map(key => TROLY35_MODES[key]);
  if (!allowed.includes(value)) {
    throw new Error(`Chế độ không hợp lệ: ${value}`);
  }
  return value;
}

function troLy35RequireAccess_(accessCode) {
  if (isBlank_(CONFIG.TROLY35_ACCESS_CODE_SHA256)) {
    throw new Error('Chưa cấu hình TROLY35_ACCESS_CODE_SHA256.');
  }

  const hash = troLy35Hash_(cleanValue_(accessCode));
  if (hash !== cleanValue_(CONFIG.TROLY35_ACCESS_CODE_SHA256).toLowerCase()) {
    throw new Error('Mã truy cập không đúng.');
  }
}

function troLy35AssertDailyLimit_(accessCode) {
  const configuredLimit = Number(CONFIG.TROLY35_DAILY_LIMIT);
  const limit = Number.isFinite(configuredLimit) ? configuredLimit : 50;
  if (limit <= 0) return;

  const key = troLy35DailyLimitKey_(accessCode);
  const current = Number(PropertiesService.getScriptProperties().getProperty(key)) || 0;
  if (current >= limit) {
    throw new Error(`Đã vượt giới hạn ${limit} lượt Trợ lý 35 hôm nay.`);
  }
}

function troLy35IncrementDailyLimit_(accessCode) {
  const key = troLy35DailyLimitKey_(accessCode);
  const properties = PropertiesService.getScriptProperties();
  const current = Number(properties.getProperty(key)) || 0;
  properties.setProperty(key, String(current + 1));
}

function troLy35DailyLimitKey_(accessCode) {
  const today = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  return `troly35_limit_${today}_${troLy35Hash_(cleanValue_(accessCode)).substring(0, 12)}`;
}

function troLy35Hash_(text) {
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

function troLy35CreateRequestId_() {
  return `T35-${Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd-HHmmss')}-${Utilities.getUuid().substring(0, 8)}`;
}

function troLy35IsUrlOnly_(text) {
  return /^https?:\/\/\S+$/i.test(cleanValue_(text));
}

function troLy35PineconeHost_() {
  return cleanValue_(CONFIG.PINECONE_INDEX_HOST).replace(/\/+$/, '');
}

function troLy35ParseEvidence_(value) {
  const raw = cleanValue_(value);
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (error) {
    return { noi_dung: raw };
  }
}

function troLy35ExtractKeywords_(text) {
  const words = cleanValue_(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 4);
  const seen = {};
  const result = [];

  words.forEach(word => {
    if (seen[word]) return;
    seen[word] = true;
    result.push(word);
  });

  return result.slice(0, 8);
}

function troLy35GuessTopic_(text) {
  const lower = cleanValue_(text).toLowerCase();
  const found = TROLY35_TOPICS.find(topic => lower.includes(topic.toLowerCase()));
  return found || 'Các vấn đề thời sự';
}

function troLy35Stringify_(value, maxChars) {
  const text = JSON.stringify(value || {});
  return text.length > maxChars ? text.substring(0, maxChars - 3) + '...' : text;
}

// Nếu người dùng gõ yêu cầu phản bác ("phản bác quan điểm cho rằng X"),
// trích xuất luận điểm X và đóng gói lại thành nội dung sai trái trực tiếp
// để pipeline phân tích xử lý đúng.
function troLy35NormalizeRequestInput_(content) {
  const META_PATTERNS = [
    /^(?:hãy\s+)?phản\s*bác\s+(?:quan\s*điểm\s+)?(?:cho\s+rằng\s+)?(.+)/i,
    /^(?:hãy\s+)?bác\s*bỏ\s+(?:(?:luận\s*)?điểm\s+)?(?:cho\s+rằng\s+)?(.+)/i,
    /^(?:hãy\s+)?chứng\s*minh\s+(?:rằng\s+)?(.+?)\s+(?:là\s+)?(?:sai|không\s+đúng|không\s+chính\s+xác)/i,
    /^(?:hãy\s+)?viết\s+(?:bài\s+)?phản\s*bác\s+(?:(?:về\s+)?(?:luận\s*điểm|quan\s*điểm)\s+)?(?:cho\s+rằng\s+)?(.+)/i,
    /^(?:hãy\s+)?(?:giúp\s+(?:tôi\s+)?)?phản\s*bác\s+(.+)/i
  ];

  for (const pattern of META_PATTERNS) {
    const match = content.match(pattern);
    if (match && match[1] && match[1].trim().length >= 10) {
      const claim = match[1].trim().replace(/[.!?]+$/, '');
      return `Có ý kiến cho rằng: "${claim}". Đây là quan điểm sai trái cần phản bác.`;
    }
  }

  return content;
}

function troLy35EmptyTrend_(windowDays) {
  return {
    windowDays,
    totalRequests: 0,
    averageDangerLevel: 0,
    goodRatingRate: 0,
    topTopics: [],
    lastUpdate: new Date().toLocaleString('vi-VN')
  };
}
