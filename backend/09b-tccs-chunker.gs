/**
 * ============================================================
 * MODULE: TCCS CHUNKER
 * AI chunk planning — lập kế hoạch và tạo chunk động từ bài
 * Tạp chí Cộng sản bằng Gemini AI hoặc fallback heuristic.
 * ============================================================
 */

// ============================================================
// PUBLIC: Chunk creation entry points
// ============================================================

function tccsCreateCoreChunks_(fullText, context) {
  return tccsCreateKnowledgeChunks_(fullText, context);
}

function tccsCreateKnowledgeChunks_(fullText, context) {
  const paragraphs = tccsSplitArticleParagraphs_(fullText);
  if (paragraphs.length === 0) {
    throw new Error('Không tìm thấy đoạn văn hợp lệ để tạo chunk TCCS.');
  }

  const plan = tccsCreateDynamicChunkPlan_(paragraphs, context);
  const chunks = tccsMaterializeChunkPlan_(paragraphs, context, plan);
  if (chunks.length > 0) return chunks;

  const fallback = tccsBuildFallbackChunkPlan_(paragraphs, context, 'fallback_empty_plan');
  return tccsMaterializeChunkPlan_(paragraphs, context, fallback);
}

// ============================================================
// NỘI BỘ: Dynamic chunk planning (AI)
// ============================================================

function tccsCreateDynamicChunkPlan_(paragraphs, context) {
  const fallback = tccsBuildFallbackChunkPlan_(paragraphs, context, 'fallback_score');

  if (isBlank_(CONFIG.GEMINI_API_KEY) || typeof troLy35CallGeminiJson_ !== 'function') {
    return fallback;
  }

  const articleWords = paragraphs.reduce((total, paragraph) => total + tccsCountWords_(paragraph), 0);
  const maxChunks = tccsTargetDynamicChunkCount_(articleWords);
  const paragraphInput = tccsBuildParagraphPlanInput_(paragraphs);
  const sectionTypes = TCCS_DYNAMIC_SECTION_TYPES.map(type => `${type}: ${TCCS_SECTION_LABELS[type]}`).join('\n');
  const prompt = `Bạn là trợ lý biên tập dữ liệu RAG cho chatbot bảo vệ nền tảng tư tưởng.

Nhiệm vụ: đọc các đoạn đã đánh số của bài Tạp chí Cộng sản và lập kế hoạch chunk động. AI chỉ chọn số đoạn, không viết lại nội dung. Code sẽ ghép nguyên văn các đoạn được chọn.

Mục tiêu:
- Không chia cơ học theo số từ.
- Không bắt buộc bài nào cũng có cùng số chunk hoặc cùng loại chunk.
- Chọn các đơn vị tri thức thật sự có giá trị tra cứu cho chatbot.
- Mỗi chunk nên dùng các đoạn cùng một ý, khoảng ${TCCS_AI_CHUNK_MIN_WORDS}-${TCCS_AI_CHUNK_MAX_WORDS} từ nếu có thể.
- Luôn ưu tiên có 1 article_brief nếu bài đủ dài, dùng các đoạn gốc đại diện cho toàn bài.
- Tổng số chunk đề xuất tối đa ${maxChunks}; bài ngắn có thể chỉ 1-2 chunk.

Các section_type hợp lệ:
${sectionTypes}

Quy tắc chọn:
1. paragraph_indexes là số thứ tự đoạn 1-based trong danh sách.
2. Không chọn đoạn ít giá trị, điều hướng web, thông tin lặp lại.
3. Không tự tạo nội dung mới, không sửa câu chữ.
4. Nếu bài không có một loại nội dung nào thì không tạo chunk loại đó.
5. Ưu tiên luận điểm chính, luận điệu sai trái, cơ sở lý luận, dẫn chứng thực tiễn, giải pháp/kiến nghị.

TIÊU ĐỀ:
${context.title}

CHỦ ĐỀ:
${context.topic}

CÁC ĐOẠN:
${paragraphInput}`;
  const schema = {
    type: 'object',
    properties: {
      article_type: { type: 'string' },
      chunks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            section_type: { type: 'string' },
            purpose: { type: 'string' },
            paragraph_indexes: {
              type: 'array',
              items: { type: 'number' }
            },
            priority: { type: 'integer' }
          },
          required: ['section_type', 'paragraph_indexes']
        }
      }
    },
    required: ['chunks']
  };

  try {
    const result = troLy35CallGeminiJson_(prompt, schema);
    const normalized = tccsNormalizeChunkPlan_(result, paragraphs, context, 'ai_chunk_plan');
    if (normalized.chunks.length === 0) return fallback;
    return normalized;
  } catch (error) {
    Logger.log(`[TCCS] Gemini lập chunk plan lỗi, dùng fallback: ${error}`);
    return fallback;
  }
}

function tccsBuildParagraphPlanInput_(paragraphs) {
  const lines = [];
  let totalChars = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const preview = tccsTrimTextToChars_(paragraph, TCCS_PLAN_PARAGRAPH_PREVIEW_CHARS);
    const line = `[${i + 1}] (${tccsCountWords_(paragraph)} từ) ${preview}`;
    if (totalChars + line.length > TCCS_PLAN_PROMPT_MAX_CHARS && lines.length >= 8) break;
    lines.push(line);
    totalChars += line.length;
  }

  return lines.join('\n\n');
}

function tccsNormalizeChunkPlan_(result, paragraphs, context, method) {
  const articleWords = paragraphs.reduce((total, paragraph) => total + tccsCountWords_(paragraph), 0);
  const maxChunks = tccsTargetDynamicChunkCount_(articleWords);
  const rawChunks = Array.isArray(result && result.chunks) ? result.chunks : [];
  const seen = {};
  const chunks = [];

  rawChunks.forEach((item, index) => {
    const sectionType = tccsNormalizeDynamicSectionType_(item.section_type || item.sectionType || item.type);
    const indexes = tccsNormalizeParagraphIndexes_(
      item.paragraph_indexes || item.paragraphs || item.selected_paragraphs,
      paragraphs.length
    );
    if (indexes.length === 0) return;

    const key = `${sectionType}:${indexes.join(',')}`;
    if (seen[key]) return;
    seen[key] = true;

    chunks.push({
      sectionType,
      purpose: cleanValue_(item.purpose || TCCS_SECTION_LABELS[sectionType]).substring(0, 300),
      indexes,
      priority: Number(item.priority) || (rawChunks.length - index)
    });
  });

  const ensured = tccsEnsureBriefPlan_(chunks, paragraphs);
  return {
    method,
    articleType: cleanValue_(result && result.article_type).substring(0, 120) || 'auto',
    chunks: ensured
      .sort((a, b) => {
        if (a.sectionType === 'article_brief') return -1;
        if (b.sectionType === 'article_brief') return 1;
        return (b.priority || 0) - (a.priority || 0);
      })
      .slice(0, maxChunks)
  };
}

function tccsEnsureBriefPlan_(chunks, paragraphs) {
  if (chunks.some(chunk => chunk.sectionType === 'article_brief')) return chunks;

  return [{
    sectionType: 'article_brief',
    purpose: 'Tóm lược bài bằng các đoạn gốc đại diện',
    indexes: tccsBuildBriefIndexes_(paragraphs),
    priority: 999
  }].concat(chunks);
}

function tccsBuildFallbackChunkPlan_(paragraphs, context, method) {
  const articleWords = paragraphs.reduce((total, paragraph) => total + tccsCountWords_(paragraph), 0);
  const maxChunks = tccsTargetDynamicChunkCount_(articleWords);
  const chunks = [{
    sectionType: 'article_brief',
    purpose: 'Tóm lược bài bằng các đoạn gốc đại diện',
    indexes: tccsBuildBriefIndexes_(paragraphs),
    priority: 999
  }];
  const sectionOrder = [
    'wrong_claim', 'counter_argument', 'theoretical_basis',
    'legal_policy_basis', 'practical_evidence', 'historical_context',
    'recommendation', 'quote_material', 'core_argument'
  ];
  const usedKeys = { article_brief: true };

  sectionOrder.forEach(sectionType => {
    if (chunks.length >= maxChunks || usedKeys[sectionType]) return;
    const ranked = tccsRankParagraphsForSection_(paragraphs, sectionType);
    const indexes = tccsPickIndexesForWordTarget_(
      paragraphs, ranked,
      TCCS_AI_CHUNK_MIN_WORDS, TCCS_AI_CHUNK_MAX_WORDS, TCCS_AI_CHUNK_TARGET_WORDS
    );
    if (indexes.length === 0) return;
    chunks.push({
      sectionType,
      purpose: TCCS_SECTION_LABELS[sectionType],
      indexes,
      priority: 100 - chunks.length
    });
    usedKeys[sectionType] = true;
  });

  if (chunks.length === 1 && maxChunks > 1) {
    chunks.push({
      sectionType: 'core_argument',
      purpose: TCCS_SECTION_LABELS.core_argument,
      indexes: tccsPickIndexesForWordTarget_(
        paragraphs, tccsRankCoreParagraphs_(paragraphs),
        TCCS_AI_CHUNK_MIN_WORDS, TCCS_AI_CHUNK_MAX_WORDS, TCCS_AI_CHUNK_TARGET_WORDS
      ),
      priority: 90
    });
  }

  return {
    method,
    articleType: cleanValue_(context && context.topic) || 'fallback',
    chunks: chunks.slice(0, maxChunks)
  };
}

// ============================================================
// NỘI BỘ: Materialize chunk plan → actual chunks
// ============================================================

function tccsMaterializeChunkPlan_(paragraphs, context, plan) {
  const seen = {};
  const chunks = [];

  (plan.chunks || []).forEach(planItem => {
    const composed = tccsComposePlannedChunkText_(paragraphs, planItem.indexes, planItem.sectionType);
    const rawContent = composed.rawContent;
    const wordCount = tccsCountWords_(rawContent);
    if (!rawContent || wordCount < 80) return;

    const hash = tccsHash_([context.sourceUrl, planItem.sectionType, rawContent].join('\n'));
    if (seen[hash]) return;
    seen[hash] = true;

    const status = tccsIsChunkWordCountOk_(planItem.sectionType, wordCount) && !composed.forcedSplit
      ? 'Draft'
      : 'Needs Review';
    const content = tccsBuildEmbeddingContent_({
      title: context.title,
      topic: context.topic,
      sectionType: planItem.sectionType,
      sourceUrl: context.sourceUrl,
      rawContent
    });
    const notes = [
      'dynamic_chunk',
      `Method: ${plan.method}`,
      `Article Type: ${plan.articleType}`,
      `Purpose: ${planItem.purpose || TCCS_SECTION_LABELS[planItem.sectionType] || ''}`,
      composed.selectedParagraphs.length ? `Paragraphs: ${composed.selectedParagraphs.join(', ')}` : '',
      `Words: ${wordCount}`,
      composed.forcedSplit ? 'Needs review: có đoạn quá dài đã tách theo câu.' : '',
      status === 'Needs Review' ? 'Needs review: ngoài khoảng từ mục tiêu.' : ''
    ].filter(Boolean).join(' | ');

    chunks.push({
      chunkIndex: chunks.length + 1,
      sectionType: planItem.sectionType,
      rawContent,
      content,
      wordCount,
      status,
      notes,
      contentHash: hash
    });
  });

  return chunks.map((chunk, index) => ({
    ...chunk,
    chunkIndex: index + 1
  }));
}

function tccsComposePlannedChunkText_(paragraphs, preferredIndexes, sectionType) {
  const target = sectionType === 'article_brief' ? TCCS_BRIEF_CHUNK_TARGET_WORDS : TCCS_AI_CHUNK_TARGET_WORDS;
  const minWords = sectionType === 'article_brief' ? TCCS_BRIEF_CHUNK_MIN_WORDS : TCCS_AI_CHUNK_MIN_WORDS;
  const maxWords = sectionType === 'article_brief' ? TCCS_BRIEF_CHUNK_MAX_WORDS : TCCS_AI_CHUNK_MAX_WORDS;
  const adjacent = tccsAdjacentIndexes_(preferredIndexes || [], paragraphs.length);
  const candidates = tccsUniqueNumbers_(
    (preferredIndexes || [])
      .filter(index => Number.isInteger(index) && index >= 0 && index < paragraphs.length)
      .concat(adjacent)
      .concat(tccsRankParagraphsForSection_(paragraphs, sectionType))
      .concat(tccsRankCoreParagraphs_(paragraphs))
  );
  const selected = [];
  const selectedTextByIndex = {};
  let selectedWords = 0;
  let forcedSplit = false;

  candidates.forEach(index => {
    if (selectedWords >= target) return;

    let paragraph = paragraphs[index];
    let words = tccsCountWords_(paragraph);
    if (words < 20) return;

    if (words > maxWords) {
      paragraph = tccsTrimTextToWordLimit_(paragraph, maxWords);
      words = tccsCountWords_(paragraph);
      forcedSplit = true;
    }

    if (selectedWords + words > maxWords) {
      const remaining = maxWords - selectedWords;
      if (selectedWords < minWords && remaining >= 80) {
        const trimmed = tccsTrimTextToWordLimit_(paragraph, remaining);
        const trimmedWords = tccsCountWords_(trimmed);
        if (trimmedWords >= 50) {
          selected.push(index);
          selectedTextByIndex[index] = trimmed;
          selectedWords += trimmedWords;
          forcedSplit = true;
        }
      }
      return;
    }

    selected.push(index);
    selectedTextByIndex[index] = paragraph;
    selectedWords += words;
  });

  if (selected.length === 0) {
    return {
      rawContent: tccsTrimTextToWordLimit_(paragraphs.join('\n\n'), maxWords),
      selectedParagraphs: [],
      forcedSplit: true
    };
  }

  const ordered = selected.sort((a, b) => a - b);
  return {
    rawContent: ordered.map(index => selectedTextByIndex[index] || paragraphs[index]).join('\n\n').trim(),
    selectedParagraphs: ordered.map(index => index + 1),
    forcedSplit
  };
}

function tccsIsChunkWordCountOk_(sectionType, wordCount) {
  if (sectionType === 'article_brief') {
    return wordCount >= TCCS_BRIEF_CHUNK_MIN_WORDS && wordCount <= TCCS_BRIEF_CHUNK_MAX_WORDS;
  }
  return wordCount >= TCCS_AI_CHUNK_MIN_WORDS && wordCount <= TCCS_AI_CHUNK_MAX_WORDS;
}

function tccsTargetDynamicChunkCount_(wordCount) {
  const configured = Number(CONFIG.TCCS_MAX_DYNAMIC_CHUNKS);
  const hardMax = Math.min(
    TCCS_MAX_DYNAMIC_CHUNKS,
    Number.isFinite(configured) && configured > 0 ? configured : TCCS_MAX_DYNAMIC_CHUNKS
  );

  if (wordCount < 1200) return Math.min(1, hardMax);
  if (wordCount < 1500) return Math.min(2, hardMax);
  if (wordCount <= 3500) return Math.min(4, hardMax);
  if (wordCount <= 7000) return Math.min(6, hardMax);
  return hardMax;
}

function tccsBuildBriefIndexes_(paragraphs) {
  const last = paragraphs.length - 1;
  const candidates = [0, 1, last - 1, last]
    .filter(index => index >= 0 && index < paragraphs.length)
    .concat(tccsRankCoreParagraphs_(paragraphs));
  return tccsPickIndexesForWordTarget_(
    paragraphs, candidates,
    TCCS_BRIEF_CHUNK_MIN_WORDS, TCCS_BRIEF_CHUNK_MAX_WORDS, TCCS_BRIEF_CHUNK_TARGET_WORDS
  );
}

function tccsPickIndexesForWordTarget_(paragraphs, candidates, minWords, maxWords, targetWords) {
  const selected = [];
  let words = 0;

  tccsUniqueNumbers_(candidates || []).forEach(index => {
    if (words >= targetWords) return;
    if (!Number.isInteger(index) || index < 0 || index >= paragraphs.length) return;

    const paragraphWords = tccsCountWords_(paragraphs[index]);
    if (paragraphWords < 20) return;
    if (words + Math.min(paragraphWords, maxWords) > maxWords && words >= minWords) return;

    selected.push(index);
    words += Math.min(paragraphWords, maxWords);
  });

  return selected;
}

function tccsAdjacentIndexes_(indexes, total) {
  const result = [];
  (indexes || []).forEach(index => {
    [index - 1, index + 1].forEach(candidate => {
      if (candidate >= 0 && candidate < total) result.push(candidate);
    });
  });
  return result;
}

// ============================================================
// NỘI BỘ: Paragraph ranking & scoring
// ============================================================

function tccsRankParagraphsForSection_(paragraphs, sectionType) {
  return paragraphs
    .map((paragraph, index) => ({
      index,
      score: tccsScoreParagraphForSection_(paragraph, index, paragraphs.length, sectionType)
    }))
    .filter(item => item.score > 0 || sectionType === 'core_argument' || sectionType === 'article_brief')
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(item => item.index);
}

function tccsScoreParagraphForSection_(paragraph, index, total, sectionType) {
  const text = cleanValue_(paragraph).toLowerCase();
  const words = tccsCountWords_(paragraph);
  let score = sectionType === 'core_argument' || sectionType === 'article_brief'
    ? tccsScoreCoreParagraph_(paragraph, index, total)
    : 0;
  const keywords = tccsSectionKeywords_(sectionType);

  keywords.forEach(keyword => {
    if (text.includes(keyword)) score += 5;
  });
  if (words >= 80 && words <= 280) score += 2;
  if (words < 40) score -= 2;
  if (index <= 2 && ['article_brief', 'wrong_claim', 'historical_context'].includes(sectionType)) score += 2;
  if (index >= total - 4 && sectionType === 'recommendation') score += 3;
  return score;
}

function tccsSectionKeywords_(sectionType) {
  const groups = {
    wrong_claim: ['xuyên tạc', 'luận điệu', 'sai trái', 'thù địch', 'phản động', 'cho rằng', 'rao giảng', 'kích động', 'lợi dụng'],
    counter_argument: ['phản bác', 'bác bỏ', 'khẳng định', 'thực tế cho thấy', 'cho thấy', 'minh chứng', 'không thể', 'sự thật'],
    theoretical_basis: ['chủ nghĩa mác', 'lê-nin', 'hồ chí minh', 'tư tưởng', 'lý luận', 'quan điểm', 'nguyên tắc'],
    legal_policy_basis: ['hiến pháp', 'pháp luật', 'nghị quyết', 'văn kiện', 'chính sách', 'nhà nước', 'luật pháp quốc tế'],
    practical_evidence: ['thực tiễn', 'thành tựu', 'kết quả', 'dẫn chứng', 'số liệu', 'minh chứng', 'đổi mới'],
    historical_context: ['lịch sử', 'bối cảnh', 'trước đây', 'sinh thời', 'quá trình', 'năm ', 'thời kỳ'],
    recommendation: ['một là', 'hai là', 'ba là', 'giải pháp', 'cần', 'cần phải', 'tiếp tục', 'tăng cường', 'nhiệm vụ'],
    quote_material: ['"', '“', '"', 'trích', 'khẳng định', 'nhấn mạnh'],
    core_argument: ['vì vậy', 'do đó', 'từ đó', 'khẳng định', 'cần phải', 'cho thấy']
  };
  return groups[sectionType] || groups.core_argument;
}

function tccsNormalizeDynamicSectionType_(value) {
  const key = tccsNormalizeKey_(value);
  const aliases = {
    article_brief: 'article_brief', brief: 'article_brief', summary: 'article_brief', tom_luoc: 'article_brief',
    core_argument: 'core_argument', core: 'core_argument', luan_diem_chinh: 'core_argument',
    wrong_claim: 'wrong_claim', luan_dieu_sai: 'wrong_claim',
    counter_argument: 'counter_argument', phan_bac: 'counter_argument', luan_cu_phan_bac: 'counter_argument',
    theoretical_basis: 'theoretical_basis', co_so_ly_luan: 'theoretical_basis',
    legal_policy_basis: 'legal_policy_basis', co_so_phap_ly: 'legal_policy_basis',
    practical_evidence: 'practical_evidence', thuc_tien: 'practical_evidence',
    historical_context: 'historical_context', boi_canh: 'historical_context',
    recommendation: 'recommendation', giai_phap: 'recommendation',
    quote_material: 'quote_material', trich_dan: 'quote_material'
  };

  if (aliases[key]) return aliases[key];
  if (key.includes('sai') || key.includes('xuyen_tac')) return 'wrong_claim';
  if (key.includes('phan_bac') || key.includes('luan_cu')) return 'counter_argument';
  if (key.includes('ly_luan') || key.includes('tu_tuong')) return 'theoretical_basis';
  if (key.includes('phap') || key.includes('chinh_sach')) return 'legal_policy_basis';
  if (key.includes('thuc_tien') || key.includes('dan_chung')) return 'practical_evidence';
  if (key.includes('giai_phap') || key.includes('kien_nghi')) return 'recommendation';
  return 'core_argument';
}

function tccsNormalizeKey_(value) {
  return cleanValue_(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// ============================================================
// NỘI BỘ: Core paragraph selection (AI + fallback)
// ============================================================

function tccsSelectCoreParagraphs_(paragraphs, context) {
  const fallback = {
    indexes: tccsRankCoreParagraphs_(paragraphs),
    method: 'fallback_score',
    reason: 'AI không khả dụng hoặc không trả về lựa chọn hợp lệ.'
  };

  if (isBlank_(CONFIG.GEMINI_API_KEY) || typeof troLy35CallGeminiJson_ !== 'function') {
    return fallback;
  }

  const numberedParagraphs = paragraphs
    .map((paragraph, index) => `[${index + 1}] ${paragraph}`)
    .join('\n\n');
  const prompt = `Bạn là trợ lý biên tập dữ liệu RAG cho chatbot bảo vệ nền tảng tư tưởng.

Nhiệm vụ: chọn các đoạn NGUYÊN VĂN quan trọng nhất từ bài Tạp chí Cộng sản để ghép thành 1 core chunk khoảng ${TCCS_CORE_CHUNK_TARGET_WORDS} từ, hợp lệ trong khoảng ${TCCS_CORE_CHUNK_MIN_WORDS}-${TCCS_CORE_CHUNK_MAX_WORDS} từ.

Ưu tiên chọn đoạn có:
- luận điểm trung tâm của bài;
- nhận diện luận điệu/ý đồ xuyên tạc;
- luận cứ, dẫn chứng phản bác;
- kết luận hoặc định hướng chính trị có giá trị sử dụng cho chatbot.

Không chọn đoạn mở rộng ít giá trị, lời dẫn dư thừa, thông tin lặp lại. Chỉ trả về số thứ tự đoạn, không viết lại nội dung.

TIÊU ĐỀ:
${context.title}

CHỦ ĐỀ:
${context.topic}

CÁC ĐOẠN VĂN:
${numberedParagraphs}`;
  const schema = {
    type: 'object',
    properties: {
      selected_paragraphs: { type: 'array', items: { type: 'number' } },
      reason: { type: 'string' }
    },
    required: ['selected_paragraphs']
  };

  try {
    const result = troLy35CallGeminiJson_(prompt, schema);
    const indexes = tccsNormalizeParagraphIndexes_(result.selected_paragraphs, paragraphs.length);
    if (indexes.length === 0) return fallback;
    return {
      indexes,
      method: 'ai_extract',
      reason: cleanValue_(result.reason).substring(0, 500)
    };
  } catch (error) {
    Logger.log(`[TCCS] Gemini chọn core chunk lỗi, dùng fallback: ${error}`);
    return fallback;
  }
}

function tccsComposeCoreChunkText_(paragraphs, preferredIndexes) {
  const candidates = tccsUniqueNumbers_(
    (preferredIndexes || [])
      .filter(index => Number.isInteger(index) && index >= 0 && index < paragraphs.length)
      .concat(tccsRankCoreParagraphs_(paragraphs))
  );
  const selected = [];
  const selectedTextByIndex = {};
  let selectedWords = 0;

  candidates.forEach(index => {
    if (selectedWords >= TCCS_CORE_CHUNK_TARGET_WORDS) return;

    let paragraph = paragraphs[index];
    let words = tccsCountWords_(paragraph);
    if (words < 20) return;

    if (words > TCCS_CORE_CHUNK_MAX_WORDS) {
      paragraph = tccsTrimTextToWordLimit_(paragraph, TCCS_CORE_CHUNK_MAX_WORDS);
      words = tccsCountWords_(paragraph);
    }

    if (selectedWords + words > TCCS_CORE_CHUNK_MAX_WORDS) {
      const remaining = TCCS_CORE_CHUNK_MAX_WORDS - selectedWords;
      if (selectedWords < TCCS_CORE_CHUNK_MIN_WORDS && remaining >= 80) {
        const trimmed = tccsTrimTextToWordLimit_(paragraph, remaining);
        const trimmedWords = tccsCountWords_(trimmed);
        if (trimmedWords >= 50) {
          selected.push(index);
          selectedTextByIndex[index] = trimmed;
          selectedWords += trimmedWords;
        }
      }
      return;
    }

    selected.push(index);
    selectedTextByIndex[index] = paragraph;
    selectedWords += words;
  });

  if (selected.length === 0) {
    return {
      rawContent: tccsTrimTextToWordLimit_(paragraphs.join('\n\n'), TCCS_CORE_CHUNK_MAX_WORDS),
      selectedParagraphs: []
    };
  }

  const ordered = selected.sort((a, b) => a - b);
  return {
    rawContent: ordered.map(index => selectedTextByIndex[index] || paragraphs[index]).join('\n\n').trim(),
    selectedParagraphs: ordered.map(index => index + 1)
  };
}

function tccsRankCoreParagraphs_(paragraphs) {
  return paragraphs
    .map((paragraph, index) => ({
      index,
      score: tccsScoreCoreParagraph_(paragraph, index, paragraphs.length)
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(item => item.index);
}

function tccsScoreCoreParagraph_(paragraph, index, total) {
  const text = cleanValue_(paragraph).toLowerCase();
  const words = tccsCountWords_(paragraph);
  const keywords = [
    'xuyên tạc', 'luận điệu', 'sai trái', 'thù địch', 'phản bác',
    'cho rằng', 'lập luận', 'khẳng định', 'thực tiễn', 'dẫn chứng',
    'chủ nghĩa mác', 'lê-nin', 'hồ chí minh', 'đảng', 'dân tộc',
    'đại đoàn kết', 'quyền dân tộc tự quyết', 'giải pháp', 'cần phải',
    'vì vậy', 'do đó', 'từ đó'
  ];
  let score = 0;

  keywords.forEach(keyword => {
    if (text.includes(keyword)) score += 3;
  });
  if (index <= 2) score += 2;
  if (index >= total - 3) score += 1;
  if (words >= 80 && words <= 260) score += 2;
  if (words < 40) score -= 3;
  if (words > 450) score -= 1;
  return score;
}

// ============================================================
// NỘI BỘ: Legacy chunk creation (word-count based)
// ============================================================

function tccsCreateChunks_(fullText, context) {
  const paragraphs = tccsSplitArticleParagraphs_(fullText);
  const units = [];

  paragraphs.forEach(paragraph => {
    if (tccsCountWords_(paragraph) <= TCCS_CHUNK_MAX_WORDS) {
      units.push({ text: paragraph, forcedSplit: false });
      return;
    }
    tccsSplitLongParagraph_(paragraph).forEach(unit => units.push(unit));
  });

  const chunks = [];
  let current = [];
  let currentWords = 0;
  let currentForced = false;

  units.forEach(unit => {
    const unitWords = tccsCountWords_(unit.text);

    if (currentWords === 0) {
      current = [unit.text]; currentWords = unitWords; currentForced = unit.forcedSplit; return;
    }

    if (currentWords + unitWords <= TCCS_CHUNK_MAX_WORDS) {
      current.push(unit.text); currentWords += unitWords; currentForced = currentForced || unit.forcedSplit; return;
    }

    if (currentWords >= TCCS_CHUNK_MIN_WORDS) {
      tccsPushChunk_(chunks, current, currentForced);
      current = [unit.text]; currentWords = unitWords; currentForced = unit.forcedSplit; return;
    }

    if (currentWords + unitWords <= TCCS_CHUNK_SOFT_MAX_WORDS) {
      current.push(unit.text); currentWords += unitWords; currentForced = true;
      tccsPushChunk_(chunks, current, currentForced);
      current = []; currentWords = 0; currentForced = false; return;
    }

    tccsPushChunk_(chunks, current, true);
    current = [unit.text]; currentWords = unitWords; currentForced = unit.forcedSplit;
  });

  if (currentWords > 0) tccsPushChunk_(chunks, current, currentForced);

  tccsRepairLastChunk_(chunks);

  return chunks.map((chunk, index) => {
    const rawContent = chunk.rawContent;
    const wordCount = tccsCountWords_(rawContent);
    const sectionType = tccsGuessSectionType_(rawContent);
    const status = chunk.needsReview || wordCount < TCCS_CHUNK_MIN_WORDS || wordCount > TCCS_CHUNK_MAX_WORDS
      ? 'Needs Review' : 'Draft';
    const content = tccsBuildEmbeddingContent_({
      title: context.title, topic: context.topic,
      sectionType, sourceUrl: context.sourceUrl, rawContent
    });

    return {
      chunkIndex: index + 1, sectionType, rawContent, content, wordCount, status,
      notes: status === 'Needs Review' ? 'Chunk ngoài khoảng 600-800 từ hoặc có fallback tách câu/từ.' : '',
      contentHash: tccsHash_(rawContent)
    };
  });
}

function tccsSplitLongParagraph_(paragraph) {
  const sentences = tccsSplitSentences_(paragraph);
  if (sentences.length <= 1) {
    return tccsSplitByWords_(paragraph).map(text => ({ text, forcedSplit: true }));
  }

  const units = [];
  let current = [];
  let currentWords = 0;

  sentences.forEach(sentence => {
    const sentenceWords = tccsCountWords_(sentence);
    if (sentenceWords > TCCS_CHUNK_MAX_WORDS) {
      if (currentWords > 0) {
        units.push({ text: current.join(' '), forcedSplit: false });
        current = []; currentWords = 0;
      }
      tccsSplitByWords_(sentence).forEach(text => units.push({ text, forcedSplit: true }));
      return;
    }

    if (currentWords > 0 && currentWords + sentenceWords > TCCS_CHUNK_MAX_WORDS) {
      units.push({ text: current.join(' '), forcedSplit: false });
      current = [sentence]; currentWords = sentenceWords; return;
    }

    current.push(sentence); currentWords += sentenceWords;
  });

  if (currentWords > 0) units.push({ text: current.join(' '), forcedSplit: false });
  return units;
}

function tccsSplitSentences_(text) {
  const matches = cleanValue_(text).match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g);
  return (matches || [text]).map(item => item.trim()).filter(Boolean);
}

function tccsSplitByWords_(text) {
  const words = cleanValue_(text).split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += TCCS_CHUNK_TARGET_WORDS) {
    chunks.push(words.slice(i, i + TCCS_CHUNK_TARGET_WORDS).join(' '));
  }
  return chunks;
}

function tccsPushChunk_(chunks, parts, needsReview) {
  const rawContent = parts.join('\n\n').trim();
  if (!rawContent) return;
  chunks.push({ rawContent, needsReview: needsReview === true });
}

function tccsRepairLastChunk_(chunks) {
  if (chunks.length <= 1) return;

  const last = chunks[chunks.length - 1];
  const lastWords = tccsCountWords_(last.rawContent);
  if (lastWords >= TCCS_CHUNK_MIN_WORDS) return;

  const previous = chunks[chunks.length - 2];
  const merged = `${previous.rawContent}\n\n${last.rawContent}`;
  const mergedWords = tccsCountWords_(merged);

  if (mergedWords <= TCCS_CHUNK_SOFT_MAX_WORDS) {
    previous.rawContent = merged;
    previous.needsReview = previous.needsReview || last.needsReview || mergedWords > TCCS_CHUNK_MAX_WORDS;
    chunks.pop();
    return;
  }

  last.needsReview = true;
}

// ============================================================
// NỘI BỘ: Text utilities
// ============================================================

function tccsTrimTextToChars_(text, maxChars) {
  const value = cleanValue_(text);
  if (value.length <= maxChars) return value;
  return value.substring(0, Math.max(1, maxChars - 3)).trim() + '...';
}

function tccsTrimTextToWordLimit_(text, limit) {
  const maxWords = Math.max(1, Number(limit) || TCCS_CORE_CHUNK_TARGET_WORDS);
  const sentences = tccsSplitSentences_(text);
  const selected = [];
  let selectedWords = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const words = tccsCountWords_(sentence);
    if (selectedWords + words > maxWords) break;
    selected.push(sentence);
    selectedWords += words;
  }

  if (selected.length > 0) return selected.join(' ').trim();
  return cleanValue_(text).split(/\s+/).slice(0, maxWords).join(' ');
}

function tccsSplitArticleParagraphs_(fullText) {
  return cleanValue_(fullText).split(/\n{2,}/)
    .map(item => item.trim())
    .filter(item => tccsCountWords_(item) > 0);
}

function tccsNormalizeParagraphIndexes_(indexes, total) {
  if (!Array.isArray(indexes)) return [];
  return tccsUniqueNumbers_(indexes
    .map(item => Number(item) - 1)
    .filter(index => Number.isInteger(index) && index >= 0 && index < total));
}

function tccsUniqueNumbers_(items) {
  const seen = {};
  return (items || []).filter(item => {
    const key = String(item);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}
