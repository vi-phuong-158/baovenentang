/**
 * ============================================================
 * MODULE: TCCS PINECONE
 * Đồng bộ chunk TCCS đã duyệt lên Pinecone, tìm kiếm chunk
 * trong Sheets và từ Pinecone matches.
 * ============================================================
 */

// ============================================================
// PUBLIC: Pinecone sync
// ============================================================

/**
 * Index các chunk TCCS đã được duyệt lên Pinecone.
 */
function syncTccsApprovedChunksToPinecone(maxRows) {
  assertRequiredConfig_(REQUIRED_SHEET_CONFIG.concat(REQUIRED_GEMINI_CONFIG).concat(REQUIRED_PINECONE_CONFIG));

  const limit = Math.max(1, Number(maxRows) || 25);
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  if (sheet.getLastRow() <= 1) {
    Logger.log('[TCCS] Chưa có chunk để đồng bộ.');
    return { success: true, upserted: 0 };
  }

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
    .map((row, index) => ({ rowIndex: index + 2, data: row }))
    .filter(item => {
      const status = cleanValue_(item.data[11]).toLowerCase();
      return ['approved', 'đã duyệt', 'da duyet'].includes(status) && !cleanValue_(item.data[12]);
    })
    .slice(0, limit);

  if (rows.length === 0) {
    Logger.log('[TCCS] Không có chunk Approved chưa index.');
    return { success: true, upserted: 0 };
  }

  const vectors = rows.map(item => {
    const row = item.data;
    const chunkId = cleanValue_(row[0]);
    const vectorId = tccsSafeVectorId_(chunkId);
    const content = cleanValue_(row[5]);
    const rawContent = cleanValue_(row[6]);

    return {
      rowIndex: item.rowIndex,
      vectorId,
      vector: {
        id: vectorId,
        values: troLy35EmbedText_(content),
        metadata: {
          source_type: 'tccs_chunk',
          source: 'tccs',
          tccs_chunk_id: chunkId,
          tccs_article_id: cleanValue_(row[1]),
          title: cleanValue_(row[2]).substring(0, 500),
          topic: cleanValue_(row[3]),
          section_type: cleanValue_(row[4]),
          source_url: cleanValue_(row[9]),
          content_hash: cleanValue_(row[10]),
          word_count: Number(row[8]) || 0,
          preview: rawContent.substring(0, 500)
        }
      }
    };
  });

  troLy35UpsertPineconeVectors_(vectors.map(item => item.vector));

  vectors.forEach(item => {
    sheet.getRange(item.rowIndex, 12, 1, 3)
      .setValues([['Indexed', item.vectorId, new Date()]]);
  });

  Logger.log(`[TCCS] Đã đồng bộ ${vectors.length} chunk lên Pinecone.`);
  return {
    success: true,
    upserted: vectors.length
  };
}

// ============================================================
// NỘI BỘ: Search & lookup
// ============================================================

function tccsSearchChunksInSheets_(analysis, content, topicHint, limit) {
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  if (sheet.getLastRow() <= 1) return [];

  const keywords = [].concat(analysis.tu_khoa_chinh || [], troLy35ExtractKeywords_(content), topicHint || '')
    .map(item => cleanValue_(item).toLowerCase()).filter(Boolean);
  const topic = cleanValue_(analysis.chu_de || topicHint).toLowerCase();

  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
    .map((row, index) => tccsChunkRowToObject_(row, index + 2))
    .filter(item => tccsIsApprovedChunkStatus_(item.status))
    .map(item => {
      const haystack = [item.title, item.topic, item.sectionType, item.rawContent, item.sourceUrl].join(' ').toLowerCase();
      let score = topic && item.topic.toLowerCase().includes(topic) ? 8 : 0;
      keywords.forEach(keyword => { if (keyword && haystack.includes(keyword)) score += 2; });
      return { item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit || TROLY35_TOP_K)
    .map(scored => tccsChunkToKnowledge_(scored.item, scored.score, 'tccs_sheets'));
}

function tccsKnowledgeFromPineconeMatch_(match) {
  const meta = match.metadata || {};
  const chunkId = cleanValue_(meta.tccs_chunk_id);
  const vectorId = cleanValue_(match.id);
  const chunk = tccsFindChunk_(chunkId, vectorId);

  if (chunk) return tccsChunkToKnowledge_(chunk, match.score || 0, 'tccs_pinecone');

  return {
    id: chunkId || vectorId,
    chuDe: cleanValue_(meta.topic),
    luanDiemSaiTrai: 'Tư liệu bài viết chính thống từ Tạp chí Cộng sản',
    phanBacChinh: cleanValue_(meta.preview),
    danChung: {
      title: cleanValue_(meta.title),
      source_url: cleanValue_(meta.source_url),
      section_type: cleanValue_(meta.section_type),
      word_count: Number(meta.word_count) || 0
    },
    tuKhoa: '',
    nguon: tccsBuildSourceLabel_(cleanValue_(meta.title), cleanValue_(meta.source_url)),
    score: match.score || 0,
    source: 'tccs_pinecone'
  };
}

function tccsFindChunk_(chunkId, vectorId) {
  const sheet = tccsGetSheet_('TCCS_CHUNKS');
  if (sheet.getLastRow() <= 1) return null;

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if ((chunkId && cleanValue_(row[0]) === chunkId) ||
        (vectorId && cleanValue_(row[12]) === vectorId)) {
      return tccsChunkRowToObject_(row, i + 2);
    }
  }
  return null;
}

function tccsChunkRowToObject_(row, rowIndex) {
  return {
    rowIndex,
    chunkId: cleanValue_(row[0]), articleId: cleanValue_(row[1]),
    title: cleanValue_(row[2]), topic: cleanValue_(row[3]),
    sectionType: cleanValue_(row[4]), content: cleanValue_(row[5]),
    rawContent: cleanValue_(row[6]), chunkIndex: Number(row[7]) || 0,
    wordCount: Number(row[8]) || 0, sourceUrl: cleanValue_(row[9]),
    contentHash: cleanValue_(row[10]), status: cleanValue_(row[11]),
    pineconeId: cleanValue_(row[12]), indexedAt: row[13], notes: cleanValue_(row[14])
  };
}

function tccsChunkToKnowledge_(chunk, score, source) {
  return {
    id: chunk.chunkId, chuDe: chunk.topic,
    luanDiemSaiTrai: 'Tư liệu bài viết chính thống từ Tạp chí Cộng sản',
    phanBacChinh: chunk.rawContent,
    danChung: {
      title: chunk.title, source_url: chunk.sourceUrl,
      section_type: chunk.sectionType, word_count: chunk.wordCount, chunk_index: chunk.chunkIndex
    },
    tuKhoa: typeof troLy35ExtractKeywords_ === 'function'
      ? troLy35ExtractKeywords_([chunk.title, chunk.topic, chunk.rawContent].join(' ')).join(', ')
      : '',
    nguon: tccsBuildSourceLabel_(chunk.title, chunk.sourceUrl),
    score: score || 0, source
  };
}

function tccsIsApprovedChunkStatus_(status) {
  const normalized = cleanValue_(status).toLowerCase();
  return ['approved', 'indexed', 'đã duyệt', 'da duyet'].includes(normalized);
}
