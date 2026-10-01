/** Outbound-only Zalo Bot Platform transport. No webhook, polling, queue or retries. */

function thuTuanZaloSafeReason_(error) {
  var allowed = ['ZALO_ISOLATION_REQUIRED','ZALO_TOKEN_REQUIRED','ZALO_TARGET_REQUIRED','ZALO_GROUP_CONFIRMATION_REQUIRED',
    'ZALO_INVALID_UNICODE','ZALO_TEXT_TOO_LONG','ZALO_CONFIG_CHANGED','SEPARATE_SHEETS_REQUIRED','INVALID_TEST_MODE',
    'MISSING_APPROVAL_SECRET','MISSING_SHEET_CONFIG','MISSING_SHEET','INVALID_HEADERS'];
  return error && allowed.indexOf(error.message) >= 0 ? error.message : 'ZALO_IO_BLOCKED';
}

function thuTuanZaloHash_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

/** Pins are independently recorded by the operator, never inferred from a send response. */
function thuTuanZaloConfig_(cfg) {
  var p = cfg.zaloProperties || {}, env = p.THU_TUAN_ZALO_ENV;
  if (cfg.testModeValue !== 'true' && cfg.testModeValue !== 'false') throw new Error('ZALO_ISOLATION_REQUIRED');
  if ((env !== 'TEST' && env !== 'PROD') || (env === 'TEST') !== (cfg.testMode === true))
    throw new Error('ZALO_ISOLATION_REQUIRED');
  var requiredPins = ['SCRIPT_ID','CONTENT_SHEET_ID','PRIVATE_SHEET_ID','BOT_ID','CHAT_SHA256'];
  function profileFor(name, required) {
    var profilePrefix = 'THU_TUAN_ZALO_' + name + '_', profile = {}, configured = false;
    requiredPins.forEach(function(key) { if (p[profilePrefix + key]) configured = true; });
    if (!required && !configured) return null;
    requiredPins.forEach(function(key) {
      profile[key] = p[profilePrefix + key];
      if (typeof profile[key] !== 'string' || !profile[key] || profile[key] !== profile[key].trim())
        throw new Error('ZALO_ISOLATION_REQUIRED');
    });
    if (!/^[a-f0-9]{64}$/.test(profile.CHAT_SHA256)) throw new Error('ZALO_ISOLATION_REQUIRED');
    return profile;
  }
  // A project may be TEST-only before a Production deployment exists. Its pinned
  // active identity is still mandatory; an absent opposite profile cannot be used.
  var active = profileFor(env, true), other = profileFor(env === 'TEST' ? 'PROD' : 'TEST', false);
  if (other) {
    ['SCRIPT_ID','BOT_ID','CHAT_SHA256'].forEach(function(key) {
      if (active[key] === other[key]) throw new Error('ZALO_ISOLATION_REQUIRED');
    });
    var sheetIds = [active.CONTENT_SHEET_ID,active.PRIVATE_SHEET_ID,other.CONTENT_SHEET_ID,other.PRIVATE_SHEET_ID];
    if (new Set(sheetIds).size !== 4) throw new Error('ZALO_ISOLATION_REQUIRED');
  }
  var prefix = 'THU_TUAN_ZALO_' + env + '_';
  var token = p[prefix + 'BOT_TOKEN'], chat = p[prefix + 'CHAT_ID'];
  // Tokens are URL path segments. Reject path/query/control injection rather than changing them.
  if (typeof token !== 'string' || !/^[A-Za-z0-9_:-]{8,512}$/.test(token)) throw new Error('ZALO_TOKEN_REQUIRED');
  if (typeof chat !== 'string' || !chat || chat.length > 256 || /[\s\x00-\x1f\x7f]/.test(chat)) throw new Error('ZALO_TARGET_REQUIRED');
  if (ScriptApp.getScriptId() !== active.SCRIPT_ID || cfg.contentId !== active.CONTENT_SHEET_ID ||
      cfg.privateId !== active.PRIVATE_SHEET_ID || thuTuanZaloHash_(chat) !== active.CHAT_SHA256)
    throw new Error('ZALO_ISOLATION_REQUIRED');
  if (p[prefix + 'GROUP_CONFIRMED'] !== 'true') throw new Error('ZALO_GROUP_CONFIRMATION_REQUIRED');
  return { env:env, token:token, chatId:chat, botId:active.BOT_ID, targetHash:active.CHAT_SHA256 };
}

/** UTF-16 ceiling; preserve whole graphemes, including GAS runtimes without Intl.Segmenter. */
function thuTuanZaloGraphemes_(text) {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
    return Array.from(new Intl.Segmenter('vi', { granularity:'grapheme' }).segment(text), function(x) { return x.segment; });
  var units = Array.from(text), clusters = [], regionalCount = 0;
  units.forEach(function(ch, i) {
    var cp = ch.codePointAt(0), prev = units[i-1];
    if (cp >= 0xD800 && cp <= 0xDFFF) throw new Error('ZALO_INVALID_UNICODE');
    var regional = cp >= 0x1F1E6 && cp <= 0x1F1FF;
    var continuation = /\p{M}/u.test(ch) || cp === 0x200D || prev === '\u200D' ||
      (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF) ||
      (cp >= 0x1F3FB && cp <= 0x1F3FF) || (cp >= 0xE0020 && cp <= 0xE007F) ||
      (ch === '\n' && prev === '\r') || (regional && regionalCount % 2 === 1);
    if (continuation && clusters.length) clusters[clusters.length-1] += ch;
    else clusters.push(ch);
    regionalCount = regional ? regionalCount+1 : 0;
  });
  return clusters;
}

function thuTuanZaloSplit_(text) {
  if (typeof text !== 'string' || !text || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(text))
    throw new Error('ZALO_INVALID_UNICODE');
  var clusters = thuTuanZaloGraphemes_(text), parts = [], part = '';
  clusters.forEach(function(cluster) {
    if (cluster.length > 1800) throw new Error('ZALO_TEXT_TOO_LONG');
    if (part.length + cluster.length > 1800) { parts.push(part); part = ''; }
    part += cluster;
  });
  if (part) parts.push(part);
  if (parts.length > 3) throw new Error('ZALO_TEXT_TOO_LONG');
  return parts;
}

/** Drop all raw exceptions/body/description. Disable redirects so the token cannot leave this host. */
function thuTuanZaloRequest_(zalo, method, payload) {
  try {
    var response = UrlFetchApp.fetch('https://bot-api.zaloplatforms.com/bot' + zalo.token + '/' + method, {
      method:'post', contentType:'application/json; charset=utf-8', payload:JSON.stringify(payload),
      muteHttpExceptions:true, followRedirects:false, validateHttpsCertificates:true
    });
    var status = response.getResponseCode();
    if (!Number.isInteger(status) || status < 200 || status >= 300) return null;
    var body = JSON.parse(response.getContentText());
    if (!body || body.ok !== true || !body.result || typeof body.result !== 'object' || Array.isArray(body.result)) return null;
    return body.result;
  } catch (_) { return null; }
}

function thuTuanZaloPreflight_(zalo) {
  var me = thuTuanZaloRequest_(zalo,'getMe',{});
  if (!me) return 'ZALO_PREFLIGHT_UNCONFIRMED';
  // String-only IDs avoid precision loss for the large IDs shown in the official sample.
  if (typeof me.id !== 'string' || me.id !== zalo.botId) return 'ZALO_BOT_MISMATCH';
  if (me.can_join_groups !== true) return 'ZALO_GROUP_UNAVAILABLE';
  return 'OK';
}

function thuTuanZaloMessageId_(result) {
  return result && typeof result.message_id === 'string' && /^[A-Za-z0-9_.:-]{1,256}$/.test(result.message_id)
    ? result.message_id : '';
}

function thuTuanZaloAdapter_(cfg) {
  var zalo = thuTuanZaloConfig_(cfg), plan = null;
  function unchanged() {
    var currentCfg = thuTuanConfig_(), current = thuTuanZaloConfig_(currentCfg);
    if (currentCfg.transport !== 'ZALO' || !currentCfg.enabled || currentCfg.secret !== cfg.secret ||
        JSON.stringify(currentCfg.approvers) !== JSON.stringify(cfg.approvers) || JSON.stringify(current) !== JSON.stringify(zalo))
      throw new Error('ZALO_CONFIG_CHANGED');
  }
  function units(content) {
    // Plain-text renderer shared with Gmail; no Markdown cleanup or truncation of approved content.
    var parts = thuTuanZaloSplit_(thuTuanRenderText_(content));
    var hash = thuTuanZaloHash_(JSON.stringify(parts));
    plan = { parts:parts, hash:hash };
    return parts.map(function(text,i) {
      return { MaCB:'ZALO_' + zalo.env + '_' + zalo.targetHash.slice(0,32) + '_' + (i+1) + '_' + parts.length,
        Part:i+1, PartCount:parts.length, PlanHash:hash, text:text };
    });
  }
  return Object.assign(thuTuanStorage_(cfg,'ThuTuan_Zalo_NhatKyGui'), {
    transport:'ZALO',
    summary:{transport:'ZALO',environment:zalo.env},
    recipients:units,
    audit:function(rows) { return { ok:true, recipients:rows, counts:{total:rows.length,valid:rows.length,invalid:0,duplicate:0} }; },
    quota:function() { return null; }, // Zalo has no documented remaining-quota API. Never query MailApp.
    validateLog:function(entry) {
      return entry.Transport === 'ZALO' && entry.Environment === zalo.env && entry.TargetHash === zalo.targetHash &&
        entry.PlanHash === plan.hash && Number.isInteger(entry.Part) && entry.Part >= 1 && entry.Part <= plan.parts.length &&
        entry.PartCount === plan.parts.length && entry.MaCB === unitsId(entry.Part,entry.PartCount) &&
        (entry.TrangThai !== 'SENT' || !!thuTuanZaloMessageId_({message_id:entry.MessageId}));
    },
    validateLogs:function(entries) {
      // Existing part history must be a prefix; a gap must never cause an earlier part to be sent later.
      var sorted = entries.slice().sort(function(a,b) { return a.Part-b.Part; });
      return sorted.every(function(entry,i) {
        if (entry.Part !== i+1) return false;
        // Hold unresolved states for reconciliation; never replay a known non-send before a later SENT.
        if (entry.TrangThai === 'SENT' && sorted.slice(0,i).some(function(prior) {
          return prior.TrangThai === 'PENDING' || prior.TrangThai === 'FAILED';
        })) return false;
        return true;
      });
    },
    preflight:function() { unchanged(); return thuTuanZaloPreflight_(zalo); },
    beforeSend:unchanged,
    decorateEntry:function(entry,unit) {
      Object.assign(entry,{Transport:'ZALO',Environment:zalo.env,TargetHash:zalo.targetHash,Part:unit.Part,
        PartCount:unit.PartCount,PlanHash:unit.PlanHash,MessageId:''});
    },
    send:function(unit) {
      var result = thuTuanZaloRequest_(zalo,'sendMessage',{chat_id:zalo.chatId,text:unit.text});
      var messageId = thuTuanZaloMessageId_(result);
      if (!messageId || messageId.indexOf(zalo.token) >= 0 || messageId.indexOf(zalo.chatId) >= 0)
        throw new Error('ZALO_SEND_UNCONFIRMED');
      return messageId;
    },
    confirmReceipt:function(entry,messageId) {
      if (!thuTuanZaloMessageId_({message_id:messageId})) throw new Error('ZALO_SEND_UNCONFIRMED');
      entry.MessageId = messageId;
    }
  });
  function unitsId(part,count) { return 'ZALO_' + zalo.env + '_' + zalo.targetHash.slice(0,32) + '_' + part + '_' + count; }
}

/** Explicit read-only API preflight. Preview itself never performs network I/O. */
function kiemTraZaloThuTuan() {
  var cfg = thuTuanConfig_();
  if (cfg.transport !== 'ZALO') return { status:'ZALO_NOT_SELECTED' };
  var result;
  try {
    var zalo = thuTuanZaloConfig_(cfg);
    result = { status:thuTuanZaloPreflight_(zalo), transport:'ZALO', environment:zalo.env };
  } catch (error) { result = { status:'ZALO_GATE_BLOCKED', reason:thuTuanZaloSafeReason_(error) }; }
  Logger.log(JSON.stringify(result));
  return result;
}
