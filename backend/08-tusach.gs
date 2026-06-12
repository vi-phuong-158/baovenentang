/**
 * ============================================================
 * MODULE: TU SACH SO
 * Danh muc sach/tai lieu va hoi dap AI gon nhe theo tom tat.
 * ============================================================
 */

const TU_SACH_NOTEBOOK_URL = 'https://notebooklm.google.com/notebook/ee1792f7-45ff-4952-9ce6-50cc1cd4ad1a';

const TU_SACH_LEGACY_SAMPLE_IDS = [
  'hien-phap-2013',
  'tuyen-ngon-doc-lap-1945',
  'di-chuc-ho-chi-minh',
  'duong-kach-menh',
  'loi-keu-goi-toan-quoc-khang-chien',
  'luat-an-ninh-mang-2018',
  'luat-tiep-can-thong-tin-2016',
  'luat-bien-viet-nam-2012',
  'van-kien-dai-hoi-xiii',
  'nghi-quyet-35'
];

const TU_SACH_ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    references: { type: 'array', items: { type: 'string' } }
  },
  required: ['answer', 'references']
};

const TU_SACH_SAMPLE_BOOKS = [
  {
    id: 'cam-nang-phong-chong-tin-gia',
    title: 'Cẩm nang phòng chống tin giả, tin sai sự thật trên không gian mạng',
    author: 'Cục Phát thanh, truyền hình và thông tin điện tử - Bộ Thông tin và Truyền thông',
    year: '2022',
    topic: 'Phòng chống tin giả',
    summary: 'Cẩm nang cung cấp kiến thức nền và kỹ năng thực hành để nhận diện, kiểm chứng, xử lý tin giả, tin sai sự thật trên không gian mạng. Nội dung bao gồm dấu hiệu nhận biết tin giả, cách tránh bẫy tin giả, trách nhiệm hành xử trên mạng, hậu quả pháp lý và quy trình tiếp nhận, xử lý thông tin sai lệch.',
    podcast: 'Gợi ý tập 8-10 phút: Nhận diện tin giả, kiểm chứng nguồn tin và hành động có trách nhiệm trên không gian mạng.',
    mindMap: 'Tin giả -> Dấu hiệu nhận biết | Kiểm chứng nguồn | Tránh bẫy tin giả | Trách nhiệm người dùng | Chế tài pháp lý',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'PDF Google Drive - Cam_nang_phong_chong_tin_gia.pdf',
    sourceUrl: 'https://drive.google.com/file/d/1Hkc-MoxEnmOo-S3kGowq5eH6DTnUYgQN/view?usp=sharing'
  },
  {
    id: 'bao-ve-nen-tang-tu-tuong-cua-dang-trong-tinh-hinh-moi',
    title: 'Bảo vệ nền tảng tư tưởng của Đảng trong tình hình mới',
    author: 'Ban Tuyên giáo Trung ương; Ban Chỉ đạo 35 Trung ương',
    year: '2020',
    topic: 'Bảo vệ nền tảng tư tưởng',
    summary: 'Tài liệu hệ thống các vấn đề lý luận và thực tiễn về bảo vệ chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh, vai trò lãnh đạo của Đảng, đường lối đổi mới và đấu tranh phản bác các quan điểm sai trái, thù địch. Nội dung phù hợp cho cán bộ tuyên truyền khi nhận diện luận điệu xuyên tạc và xây dựng lập luận phản bác trong bối cảnh mới.',
    podcast: 'Gợi ý tập 10-12 phút: Vì sao bảo vệ nền tảng tư tưởng của Đảng là nhiệm vụ sống còn trong tình hình mới.',
    mindMap: 'Nền tảng tư tưởng -> Chủ nghĩa Mác - Lênin | Tư tưởng Hồ Chí Minh | Vai trò lãnh đạo của Đảng | Nghị quyết 35 | Phản bác quan điểm sai trái',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'PDF Google Drive - Bao_ve_nen_tang_tu_tuong_cua_Dang_trong_tinh_hinh_moi.pdf',
    sourceUrl: 'https://drive.google.com/file/d/1CqzN40Te3AvIoRQXti0BYbnyBIQSh-Kp/view?usp=sharing'
  },
  {
    id: 'tang-cuong-xay-dung-dang-trong-cong-an-nhan-dan',
    title: 'Tăng cường xây dựng Đảng trong Công an nhân dân theo Di chúc của Chủ tịch Hồ Chí Minh',
    author: 'Đại tướng, GS.TS. Tô Lâm (Chủ biên); Cục Công tác đảng và công tác chính trị, Bộ Công an',
    year: '2022',
    topic: 'Xây dựng Đảng trong Công an nhân dân',
    summary: 'Cuốn sách làm rõ yêu cầu xây dựng, chỉnh đốn Đảng trong Công an nhân dân theo tư tưởng, đạo đức, phong cách Hồ Chí Minh và những căn dặn trong Di chúc. Nội dung nhấn mạnh đạo đức cách mạng, trách nhiệm nêu gương, tổ chức đảng trong sạch vững mạnh và vai trò của lực lượng Công an nhân dân trong bảo vệ Đảng, Nhà nước và nhân dân.',
    podcast: 'Gợi ý tập 10 phút: Xây dựng Đảng trong Công an nhân dân từ lời căn dặn của Chủ tịch Hồ Chí Minh.',
    mindMap: 'Xây dựng Đảng trong CAND -> Di chúc Hồ Chí Minh | Đạo đức cách mạng | Chỉnh đốn Đảng | Nêu gương | Công an nhân dân',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'PDF Google Drive - tang_cuong_ct_XDD_cong_an.pdf',
    sourceUrl: 'https://drive.google.com/file/d/1CeixPxMEiW6HN8TB1WOgTA2fnexd1qyB/view?usp=sharing'
  },
  {
    id: 'phat-huy-suc-manh-toan-dan-toc-bao-ve-an-ninh-quoc-gia',
    title: 'Phát huy sức mạnh toàn dân tộc bảo vệ an ninh quốc gia trong tình hình mới',
    author: 'Bộ Công an; Học viện Chính trị quốc gia Hồ Chí Minh; Ủy ban Quốc phòng và An ninh của Quốc hội; Nhà xuất bản Chính trị quốc gia Sự thật',
    year: '2022',
    topic: 'An ninh quốc gia - Sức mạnh toàn dân',
    summary: 'Kỷ yếu hội thảo khoa học quốc gia phân tích tư tưởng Hồ Chí Minh, đường lối của Đảng, vai trò của nhân dân và các nguồn lực xã hội trong bảo vệ an ninh quốc gia. Tài liệu tập trung vào vị trí của lực lượng Công an nhân dân, phong trào toàn dân bảo vệ an ninh Tổ quốc và các nhiệm vụ, giải pháp phát huy sức mạnh toàn dân tộc trong tình hình mới.',
    podcast: 'Gợi ý tập 12 phút: Sức mạnh toàn dân trong bảo vệ an ninh quốc gia và xây dựng thế trận an ninh nhân dân.',
    mindMap: 'Sức mạnh toàn dân tộc -> Tư tưởng Hồ Chí Minh | An ninh quốc gia | Nguồn lực xã hội | Công an nhân dân | Toàn dân bảo vệ ANTQ',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'PDF Google Drive - phat_huy_suc_manh_toàn_dan_toc.pdf',
    sourceUrl: 'https://drive.google.com/file/d/1yoaGG-gPjoa6ARPJFkdyvqbbANTx2D70/view?usp=sharing'
  },
  {
    id: 'phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc',
    title: 'Phát huy truyền thống đại đoàn kết toàn dân tộc, xây dựng đất nước ta ngày càng giàu mạnh, văn minh, hạnh phúc',
    author: 'Nguyễn Phú Trọng',
    year: '2023',
    topic: 'Đại đoàn kết toàn dân tộc',
    summary: 'Cuốn sách hệ thống hóa sự lãnh đạo, chỉ đạo của Đảng và Tổng Bí thư Nguyễn Phú Trọng về xây dựng, củng cố, phát huy truyền thống đại đoàn kết toàn dân tộc. Nội dung nhấn mạnh vai trò của nhân dân, đồng thuận xã hội, khơi dậy tinh thần yêu nước, ý chí tự lực tự cường và khát vọng phát triển đất nước phồn vinh, hạnh phúc.',
    podcast: 'Gợi ý tập 10 phút: Đại đoàn kết toàn dân tộc là cội nguồn sức mạnh để xây dựng đất nước phồn vinh, hạnh phúc.',
    mindMap: 'Đại đoàn kết toàn dân tộc -> Truyền thống dân tộc | Niềm tin nhân dân | Đồng thuận xã hội | Khát vọng phát triển | Mục tiêu 2030-2045',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'PDF Google Drive - Sach_Phat_huy_truyen_thong_dai_doan_ket.pdf',
    sourceUrl: 'https://drive.google.com/file/d/1ui2XXYKinNWPuKHLfO3K5ap2Di9HXnxZ/view?usp=sharing'
  }
];

function getBooks() {
  seedTuSach();
  return tuSachGetRows_()
    .filter(book => book.status === 'Hoạt động')
    .map(tuSachPublicBook_);
}

function getBookById(id) {
  seedTuSach();
  const book = tuSachFindBook_(id);
  if (!book || book.status !== 'Hoạt động') {
    throw new Error('Không tìm thấy sách.');
  }
  return tuSachPublicBook_(book);
}

function askBookAI(data) {
  assertRequiredConfig_(REQUIRED_GEMINI_CONFIG);

  const question = cleanValue_(data && data.question);
  if (question.length < 5) {
    throw new Error('Câu hỏi cần tối thiểu 5 ký tự.');
  }

  seedTuSach();
  const book = tuSachFindBook_(data && data.bookId);
  if (!book || book.status !== 'Hoạt động') {
    throw new Error('Không tìm thấy sách.');
  }

  const context = {
    title: book.title,
    author: book.author,
    year: book.year,
    topic: book.topic,
    summary: book.summary,
    mindMap: book.mindMap,
    source: book.source,
    sourceUrl: book.sourceUrl
  };

  const prompt = `Bạn là trợ lý học tập của Tủ sách số Trợ lý 35.

Chỉ sử dụng NGỮ CẢNH SÁCH bên dưới để trả lời. Nếu ngữ cảnh chưa đủ, hãy nói rõ phần nào cần kiểm tra thêm tại nguồn gốc.
Không bịa số liệu, không suy diễn ngoài tóm tắt. Trả lời ngắn gọn, dễ dùng cho cán bộ tuyên truyền.

NGỮ CẢNH SÁCH:
${JSON.stringify(context, null, 2)}

CÂU HỎI:
${question}

Trả về JSON:
{
  "answer": "<câu trả lời 3-6 câu, có nhắc giới hạn nguồn nếu cần>",
  "references": ["<tên nguồn hoặc trường dữ liệu đã dùng>"]
}`;

  const responseText = callGeminiAPI(prompt, TU_SACH_ANSWER_SCHEMA);
  const parsed = tuSachParseGeminiObject_(responseText);
  const references = Array.isArray(parsed.references)
    ? parsed.references.map(cleanValue_).filter(Boolean).slice(0, 5)
    : [book.source].filter(Boolean);

  return {
    success: true,
    data: {
      answer: cleanValue_(parsed.answer) || 'Chưa tạo được câu trả lời phù hợp từ ngữ cảnh hiện có.',
      references,
      book: tuSachPublicBook_(book)
    }
  };
}

function seedTuSach() {
  const sheet = getSheet_('TU_SACH');
  if (sheet.getLastRow() <= 1) {
    return replaceTuSachWithSampleBooks();
  }

  const ids = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getValues()
    .map(row => cleanValue_(row[0]))
    .filter(Boolean);
  const hasLegacyData = TU_SACH_LEGACY_SAMPLE_IDS.some(id => ids.indexOf(id) !== -1);
  if (!hasLegacyData) return 0;

  Logger.log('[TuSach] Phát hiện dữ liệu mẫu cũ, thay bằng danh mục tài liệu mới.');
  return replaceTuSachWithSampleBooks();
}

function replaceTuSachWithSampleBooks() {
  const sheet = getSheet_('TU_SACH');
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, SHEET_HEADERS.TU_SACH.length).clearContent();
  }
  const rows = TU_SACH_SAMPLE_BOOKS.map(tuSachBookToRow_);
  appendRows_(sheet, rows);
  Logger.log(`[TuSach] Đã cập nhật ${rows.length} tài liệu.`);
  return rows.length;
}

function tuSachGetRows_() {
  const sheet = getSheet_('TU_SACH');
  if (sheet.getLastRow() <= 1) return [];

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, SHEET_HEADERS.TU_SACH.length)
    .getValues()
    .map(tuSachRowToBook_)
    .filter(book => book.id);
}

function tuSachFindBook_(id) {
  const targetId = cleanValue_(id);
  if (!targetId) return null;
  return tuSachGetRows_().find(book => book.id === targetId) || null;
}

function tuSachBookToRow_(book) {
  return [
    book.id,
    book.title,
    book.author,
    book.year,
    book.topic,
    book.summary,
    book.podcast,
    book.mindMap,
    book.notebookUrl,
    JSON.stringify({ label: book.source, url: book.sourceUrl }),
    'Hoạt động',
    new Date()
  ];
}

function tuSachRowToBook_(row) {
  const source = tuSachParseSource_(row[9]);
  return {
    id: cleanValue_(row[0]),
    title: cleanValue_(row[1]),
    author: cleanValue_(row[2]),
    year: cleanValue_(row[3]),
    topic: cleanValue_(row[4]),
    summary: cleanValue_(row[5]),
    podcast: cleanValue_(row[6]),
    mindMap: cleanValue_(row[7]),
    notebookUrl: cleanValue_(row[8]),
    source: source.label,
    sourceUrl: source.url,
    status: cleanValue_(row[10]) || 'Hoạt động',
    updatedAt: row[11] || ''
  };
}

function tuSachPublicBook_(book) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    year: book.year,
    topic: book.topic,
    summary: book.summary,
    podcast: book.podcast,
    mindMap: book.mindMap,
    notebookUrl: book.notebookUrl,
    source: book.source,
    sourceUrl: book.sourceUrl,
    updatedAt: book.updatedAt
  };
}

function tuSachParseSource_(value) {
  const raw = cleanValue_(value);
  if (!raw) return { label: '', url: '' };

  try {
    const parsed = JSON.parse(raw);
    return {
      label: cleanValue_(parsed.label),
      url: cleanValue_(parsed.url)
    };
  } catch (_) {
    return { label: raw, url: '' };
  }
}

function tuSachParseGeminiObject_(text) {
  const cleaned = cleanValue_(text)
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? (parsed[0] || {}) : parsed;
}
