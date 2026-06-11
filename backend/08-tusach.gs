/**
 * ============================================================
 * MODULE: TU SACH SO
 * Danh muc sach/tai lieu va hoi dap AI gon nhe theo tom tat.
 * ============================================================
 */

const TU_SACH_NOTEBOOK_URL = 'https://notebooklm.google.com/notebook/94347c0d-1ead-4341-b0e8-284e4a06d2fc';

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
    id: 'hien-phap-2013',
    title: 'Hiến pháp nước CHXHCN Việt Nam năm 2013',
    author: 'Quốc hội nước CHXHCN Việt Nam',
    year: '2013',
    topic: 'Nhà nước pháp quyền',
    summary: 'Văn bản nền tảng quy định chế độ chính trị, quyền và nghĩa vụ cơ bản của công dân, tổ chức bộ máy nhà nước, nguyên tắc quản lý xã hội và bảo vệ Tổ quốc. Đây là nguồn tham khảo cốt lõi khi giải thích các vấn đề về chủ quyền nhân dân, quyền con người, quyền công dân và trách nhiệm của cơ quan nhà nước.',
    podcast: 'Gợi ý tập 8-10 phút: Vì sao Hiến pháp 2013 là nền tảng của Nhà nước pháp quyền xã hội chủ nghĩa Việt Nam.',
    mindMap: 'Hiến pháp 2013 -> Chế độ chính trị | Quyền công dân | Bộ máy nhà nước | Bảo vệ Tổ quốc | Hiệu lực pháp lý',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'Cổng thông tin điện tử Quốc hội / văn bản pháp luật chính thức',
    sourceUrl: 'https://quochoi.vn/'
  },
  {
    id: 'tuyen-ngon-doc-lap-1945',
    title: 'Tuyên ngôn Độc lập 1945',
    author: 'Chủ tịch Hồ Chí Minh',
    year: '1945',
    topic: 'Lịch sử - Tư tưởng Hồ Chí Minh',
    summary: 'Văn kiện lịch sử tuyên bố sự ra đời của nước Việt Nam Dân chủ Cộng hòa, khẳng định quyền độc lập, tự do của dân tộc Việt Nam và cơ sở pháp lý, chính nghĩa của cuộc đấu tranh giành độc lập. Tài liệu phù hợp để đối chiếu các luận điểm về độc lập dân tộc, chủ quyền quốc gia và giá trị của Cách mạng Tháng Tám.',
    podcast: 'Gợi ý tập 6-8 phút: Ba lớp ý nghĩa lịch sử, pháp lý và chính trị trong Tuyên ngôn Độc lập.',
    mindMap: 'Tuyên ngôn Độc lập -> Quyền dân tộc | Chủ quyền quốc gia | Chính nghĩa cách mạng | Nhà nước mới',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'Trang thông tin Chủ tịch Hồ Chí Minh',
    sourceUrl: 'https://hochiminh.vn/'
  },
  {
    id: 'di-chuc-ho-chi-minh',
    title: 'Di chúc của Chủ tịch Hồ Chí Minh',
    author: 'Chủ tịch Hồ Chí Minh',
    year: '1969',
    topic: 'Xây dựng Đảng - Đạo đức cách mạng',
    summary: 'Tác phẩm kết tinh tư tưởng về đoàn kết trong Đảng, chăm lo nhân dân, bồi dưỡng thế hệ cách mạng cho đời sau, xây dựng đất nước sau chiến tranh và giữ gìn đạo đức cách mạng. Đây là tài liệu quan trọng khi nghiên cứu trách nhiệm nêu gương, đoàn kết và phụng sự nhân dân.',
    podcast: 'Gợi ý tập 8 phút: Những lời căn dặn còn nguyên giá trị trong xây dựng Đảng và giáo dục thế hệ trẻ.',
    mindMap: 'Di chúc -> Đoàn kết | Đạo đức cách mạng | Nhân dân | Thanh niên | Xây dựng đất nước',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'Trang thông tin Chủ tịch Hồ Chí Minh',
    sourceUrl: 'https://hochiminh.vn/'
  },
  {
    id: 'duong-kach-menh',
    title: 'Đường Kách mệnh',
    author: 'Nguyễn Ái Quốc',
    year: '1927',
    topic: 'Lý luận cách mạng',
    summary: 'Tác phẩm trình bày những vấn đề cơ bản về đường lối cách mạng, vai trò của tổ chức, đạo đức người cách mạng và yêu cầu gắn lý luận với thực tiễn. Tài liệu có giá trị nền tảng khi tìm hiểu sự hình thành tư tưởng cách mạng Việt Nam và vai trò lãnh đạo của Đảng.',
    podcast: 'Gợi ý tập 10 phút: Từ bồi dưỡng cán bộ đến xây dựng tổ chức cách mạng.',
    mindMap: 'Đường Kách mệnh -> Người cách mạng | Tổ chức | Quần chúng | Lý luận | Thực tiễn',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'Trang thông tin Chủ tịch Hồ Chí Minh',
    sourceUrl: 'https://hochiminh.vn/'
  },
  {
    id: 'loi-keu-goi-toan-quoc-khang-chien',
    title: 'Lời kêu gọi toàn quốc kháng chiến',
    author: 'Chủ tịch Hồ Chí Minh',
    year: '1946',
    topic: 'Lịch sử kháng chiến',
    summary: 'Văn kiện hiệu triệu toàn dân đoàn kết bảo vệ nền độc lập non trẻ trước nguy cơ xâm lược, thể hiện tinh thần tự lực, tự cường và ý chí bảo vệ Tổ quốc. Tài liệu phù hợp để phân tích sức mạnh đại đoàn kết toàn dân và thế trận lòng dân trong bảo vệ đất nước.',
    podcast: 'Gợi ý tập 6 phút: Tinh thần toàn dân kháng chiến và bài học về ý chí bảo vệ Tổ quốc.',
    mindMap: 'Toàn quốc kháng chiến -> Độc lập | Đoàn kết | Tự lực | Thế trận lòng dân | Bảo vệ Tổ quốc',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'Trang thông tin Chủ tịch Hồ Chí Minh',
    sourceUrl: 'https://hochiminh.vn/'
  },
  {
    id: 'luat-an-ninh-mang-2018',
    title: 'Luật An ninh mạng 2018',
    author: 'Quốc hội nước CHXHCN Việt Nam',
    year: '2018',
    topic: 'An ninh mạng',
    summary: 'Luật quy định nguyên tắc, biện pháp bảo vệ an ninh quốc gia và trật tự an toàn xã hội trên không gian mạng; trách nhiệm của cơ quan, tổ chức, cá nhân khi tham gia môi trường số. Đây là nguồn tham khảo quan trọng cho nội dung về chủ quyền số, phòng chống thông tin xấu độc và bảo vệ hệ thống thông tin.',
    podcast: 'Gợi ý tập 9 phút: Chủ quyền số và trách nhiệm công dân trên không gian mạng.',
    mindMap: 'Luật An ninh mạng -> Chủ quyền số | Hệ thống thông tin | Nội dung vi phạm | Trách nhiệm tổ chức cá nhân',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'Cơ sở dữ liệu văn bản pháp luật',
    sourceUrl: 'https://vanban.chinhphu.vn/'
  },
  {
    id: 'luat-tiep-can-thong-tin-2016',
    title: 'Luật Tiếp cận thông tin 2016',
    author: 'Quốc hội nước CHXHCN Việt Nam',
    year: '2016',
    topic: 'Minh bạch thông tin',
    summary: 'Luật quy định quyền tiếp cận thông tin của công dân, trách nhiệm cung cấp thông tin của cơ quan nhà nước, các trường hợp hạn chế tiếp cận và quy trình thực hiện. Tài liệu hữu ích khi xây dựng nội dung về minh bạch, trách nhiệm giải trình và sử dụng thông tin chính thống.',
    podcast: 'Gợi ý tập 7 phút: Quyền tiếp cận thông tin và trách nhiệm sử dụng nguồn tin chính thống.',
    mindMap: 'Tiếp cận thông tin -> Quyền công dân | Cơ quan nhà nước | Thông tin hạn chế | Quy trình yêu cầu',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'Cơ sở dữ liệu văn bản pháp luật',
    sourceUrl: 'https://vanban.chinhphu.vn/'
  },
  {
    id: 'luat-bien-viet-nam-2012',
    title: 'Luật Biển Việt Nam 2012',
    author: 'Quốc hội nước CHXHCN Việt Nam',
    year: '2012',
    topic: 'Chủ quyền biển đảo',
    summary: 'Luật quy định về đường cơ sở, vùng biển Việt Nam, chế độ pháp lý của từng vùng biển, quản lý và bảo vệ biển đảo phù hợp luật pháp quốc tế. Đây là tài liệu nền để giải thích chủ quyền, quyền chủ quyền, quyền tài phán và trách nhiệm bảo vệ biển đảo.',
    podcast: 'Gợi ý tập 8 phút: Hiểu đúng vùng biển Việt Nam và trách nhiệm bảo vệ chủ quyền biển đảo.',
    mindMap: 'Luật Biển Việt Nam -> Vùng biển | Chủ quyền | Quyền chủ quyền | Quyền tài phán | Hợp tác quốc tế',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'Cơ sở dữ liệu văn bản pháp luật',
    sourceUrl: 'https://vanban.chinhphu.vn/'
  },
  {
    id: 'van-kien-dai-hoi-xiii',
    title: 'Văn kiện Đại hội XIII của Đảng',
    author: 'Đảng Cộng sản Việt Nam',
    year: '2021',
    topic: 'Đường lối - Chính sách',
    summary: 'Văn kiện định hướng mục tiêu phát triển đất nước, xây dựng Đảng, phát triển kinh tế - xã hội, bảo vệ Tổ quốc, đối ngoại và hội nhập quốc tế trong giai đoạn mới. Tài liệu phù hợp để tra cứu các luận điểm chính thống về khát vọng phát triển, đổi mới sáng tạo và sức mạnh đại đoàn kết toàn dân tộc.',
    podcast: 'Gợi ý tập 12 phút: Những trục tư tưởng lớn trong Văn kiện Đại hội XIII.',
    mindMap: 'Đại hội XIII -> Xây dựng Đảng | Phát triển đất nước | Quốc phòng an ninh | Đối ngoại | Đại đoàn kết',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'Cổng thông tin Tư liệu - Văn kiện Đảng',
    sourceUrl: 'https://tulieuvankien.dangcongsan.vn/'
  },
  {
    id: 'nghi-quyet-35',
    title: 'Nghị quyết số 35-NQ/TW về bảo vệ nền tảng tư tưởng của Đảng',
    author: 'Bộ Chính trị',
    year: '2018',
    topic: 'Bảo vệ nền tảng tư tưởng',
    summary: 'Nghị quyết xác định nhiệm vụ tăng cường bảo vệ nền tảng tư tưởng của Đảng, đấu tranh phản bác các quan điểm sai trái, thù địch trong tình hình mới. Đây là tài liệu trọng tâm cho lực lượng 35 khi xây dựng nội dung tuyên truyền, phản bác, lan tỏa thông tin tích cực và nâng cao sức đề kháng trên không gian mạng.',
    podcast: 'Gợi ý tập 10 phút: Nghị quyết 35 và yêu cầu bảo vệ nền tảng tư tưởng trên môi trường số.',
    mindMap: 'Nghị quyết 35 -> Nền tảng tư tưởng | Quan điểm sai trái | Không gian mạng | Tuyên truyền tích cực | Lực lượng 35',
    notebookUrl: TU_SACH_NOTEBOOK_URL,
    source: 'Cổng thông tin Tư liệu - Văn kiện Đảng',
    sourceUrl: 'https://tulieuvankien.dangcongsan.vn/'
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
  if (sheet.getLastRow() > 1) return 0;

  const rows = TU_SACH_SAMPLE_BOOKS.map(tuSachBookToRow_);
  appendRows_(sheet, rows);
  Logger.log(`[TuSach] Đã seed ${rows.length} tài liệu mẫu.`);
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
