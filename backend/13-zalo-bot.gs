/** Interactive adapter with pinned TEST/PROD profiles. Weekly outbound stays independent. */
var ZALO_BOT_MAX_AGE_MS_ = 300000;
var ZALO_BOT_QUIZ_TTL_ = 300;
var ZALO_BOT_EVENT_PREFIX_ = 'ZALO_BOT_EVENT_';

function zaloBotConfig_() {
  var p = PropertiesService.getScriptProperties().getProperties();
  function need(key, pattern) {
    var v = p[key];
    if (typeof v !== 'string' || !pattern.test(v)) throw new Error('CONFIG_BLOCKED');
    return v;
  }
  var environment=p.ZALO_BOT_ENV;
  if (['TEST','PROD'].indexOf(environment)<0 || p.ZALO_BOT_ENABLED !== 'true') throw new Error('BOT_DISABLED');
  var prefix='ZALO_BOT_'+environment+'_';
  var cfg = {
    environment:environment,
    script:need(prefix+'SCRIPT_ID',/^[A-Za-z0-9_-]{1,256}$/),
    bot:need(prefix+'BOT_ID',/^[A-Za-z0-9_.-]{1,256}$/),
    token:need(prefix+'BOT_TOKEN',/^[A-Za-z0-9_:-]{8,512}$/),
    chat:need(prefix+'CHAT_ID',/^[^\s\x00-\x1f\x7f]{1,256}$/),
    chatHash:need(prefix+'CHAT_SHA256',/^[a-f0-9]{64}$/),
    contentId:need(prefix+'CONTENT_SHEET_ID',/^[A-Za-z0-9_-]{1,256}$/),
    quizId:need(prefix+'QUIZ_SHEET_ID',/^[A-Za-z0-9_-]{1,256}$/),
    relaySecret:need(prefix+'RELAY_SECRET',/^[A-Za-z0-9_-]{32,256}$/),
    secret:need('THU_TUAN_APPROVAL_SECRET',/^[\s\S]{32,512}$/),
    approvers:thuTuanText_(p.THU_TUAN_APPROVER_EMAILS).toLowerCase().split(',').map(thuTuanText_).filter(Boolean),
    quizIds:thuTuanText_(p[prefix+'QUIZ_IDS']).split(',').map(thuTuanText_).filter(Boolean)
  };
  if (cfg.script !== ScriptApp.getScriptId() || p[prefix+'GROUP_CONFIRMED'] !== 'true' ||
      cfg.chatHash !== hashSha256_(cfg.chat) || !cfg.approvers.length ||
      cfg.quizIds.length > 500 || cfg.quizIds.some(function(id) { return !/^[A-Za-z0-9_-]{1,64}$/.test(id); }))
    throw new Error('ISOLATION_BLOCKED');
  // Environment selection never falls back to the other profile's credentials.
  var opposite=environment==='TEST' ? 'PROD' : 'TEST';
  ['ZALO_BOT_'+opposite+'_','THU_TUAN_ZALO_'+opposite+'_'].forEach(function(otherPrefix) {
    [['SCRIPT_ID',cfg.script],['BOT_ID',cfg.bot],['BOT_TOKEN',cfg.token],['CHAT_ID',cfg.chat],
      ['CHAT_SHA256',cfg.chatHash],['CONTENT_SHEET_ID',cfg.contentId],['CONTENT_SHEET_ID',cfg.quizId],
      ['PRIVATE_SHEET_ID',cfg.contentId],['PRIVATE_SHEET_ID',cfg.quizId],['QUIZ_SHEET_ID',cfg.quizId],
      ['RELAY_SECRET',cfg.relaySecret]]
      .forEach(function(pair) { if (p[otherPrefix+pair[0]] === pair[1]) throw new Error('ISOLATION_BLOCKED'); });
  });
  // A backend adapter must not be installed into the independent weekly sender project
  // or read its private recipients/log workbook, even in the same environment.
  var weeklyPrefix='THU_TUAN_ZALO_'+environment+'_';
  if (p[weeklyPrefix+'SCRIPT_ID']===cfg.script ||
      p[weeklyPrefix+'PRIVATE_SHEET_ID']===cfg.contentId || p[weeklyPrefix+'PRIVATE_SHEET_ID']===cfg.quizId ||
      cfg.relaySecret===cfg.secret || cfg.relaySecret===cfg.token) throw new Error('ISOLATION_BLOCKED');
  return cfg;
}

function zaloBotHmac_(value, secret) {
  return Utilities.computeHmacSha256Signature(value, secret, Utilities.Charset.UTF_8)
    .map(function(b) { return ('0'+((b+256)%256).toString(16)).slice(-2); }).join('');
}

function zaloBotVerifyRelay_(data, cfg, now) {
  if (!data || data.action !== 'zalo_showcase_v1' || data.version !== 1 ||
      !Number.isSafeInteger(data.timestamp) || Math.abs(now-data.timestamp)>ZALO_BOT_MAX_AGE_MS_ ||
      typeof data.nonce !== 'string' || !/^[a-f0-9-]{36}$/.test(data.nonce) ||
      typeof data.event !== 'string' || data.event.length>16000 ||
      typeof data.signature !== 'string' || !/^[a-f0-9]{64}$/.test(data.signature)) return false;
  var canonical = JSON.stringify(['ZALO_SHOWCASE_V1_'+cfg.environment,1,data.timestamp,data.nonce,data.event]);
  return constantTimeEquals_(data.signature,zaloBotHmac_(canonical,cfg.relaySecret));
}

function zaloBotEvent_(body, cfg, now) {
  // Official webhook wrapper, not a guessed Telegram/OA schema.
  if (!body || body.ok !== true || !body.result || typeof body.result !== 'object' || Array.isArray(body.result))
    return {status:'MALFORMED_EVENT'};
  if (body.result.event_name !== 'message.text.received') return {status:'IGNORED_EVENT'};
  var m = body.result.message;
  if (!m || !m.from || !m.chat || typeof m.from.id !== 'string' ||
      typeof m.from.is_bot !== 'boolean' || typeof m.chat.id !== 'string' ||
      typeof m.message_id !== 'string' || !/^[A-Za-z0-9_.:-]{1,256}$/.test(m.message_id) ||
      typeof m.text !== 'string' || m.text.length>1000 ||
      !Number.isSafeInteger(m.date) || Math.abs(now-m.date)>ZALO_BOT_MAX_AGE_MS_) return {status:'MALFORMED_EVENT'};
  if (m.from.is_bot || m.from.id===cfg.bot) return {status:'IGNORED_SELF'};
  if (m.chat.chat_type !== 'GROUP' || m.chat.id !== cfg.chat) return {status:'IGNORED_CHAT'};
  if (!m.from.id || m.from.id.length>256) return {status:'MALFORMED_EVENT'};
  return {message:m};
}

function zaloBotParse_(text) {
  if (typeof text !== 'string' || text.length>1000) return {kind:'ignore'};
  var value = text.normalize('NFC').trim();
  // Group messages may carry a leading @mention (display names can contain spaces).
  // Strip only that prefix; the command/answer itself must still be a separate token.
  if (value.charAt(0)==='@') {
    var mention = /^@[^\n]*?\s(\/[\s\S]*)$/.exec(value) || /^@[^\n]*\s([ABCD])$/i.exec(value);
    if (mention) value = mention[1].trim();
  }
  if (/^[ABCD]$/i.test(value)) return {kind:'answer',answer:value.toUpperCase()};
  if (value.charAt(0)!=='/') return {kind:'ignore'};
  var match = /^\/([a-z0-9]+)(?:\s+([\s\S]*))?$/i.exec(value);
  return match ? {kind:'command',command:match[1].toLowerCase(),query:(match[2]||'').trim()} :
    {kind:'command',command:'unknown',query:''};
}

function zaloBotRows_(cfg) {
  return thuTuanRows_(thuTuanSheet_(cfg.contentId,'LoiDay_NoiDung'),'LoiDay_NoiDung');
}

function zaloBotSchedule_(rows) {
  var keys = Object.create(null);
  rows.forEach(function(row) {
    if (typeof row.Ky !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.Ky) ||
        thuTuanWeekKey_(new Date(row.Ky+'T00:00:00+07:00')) !== row.Ky ||
        typeof row.MaLoiDay !== 'string' || !/^LD-\d{3,6}$/.test(row.MaLoiDay)) throw new Error('CONTENT_BLOCKED');
    if (keys[row.Ky]) throw new Error('CONTENT_BLOCKED');
    keys[row.Ky] = {key:row.Ky,code:row.MaLoiDay};
  });
  return Object.keys(keys).sort().map(function(key) { return keys[key]; });
}

function zaloBotDateLabel_(key) { return key.slice(8,10)+'/'+key.slice(5,7)+'/'+key.slice(0,4); }
function zaloBotWeekNumber_(schedule, key) {
  return schedule.length ? String(1+Math.round((Date.parse(key)-Date.parse(schedule[0].key))/604800000)).padStart(2,'0') : '';
}

function zaloBotApproved_(cfg, rows, key) {
  var found = thuTuanForKey_(rows,key);
  if (found.length!==1 || typeof found[0].Ky!=='string' || !/^LD-\d{3,6}$/.test(found[0].MaLoiDay)) return null;
  var digest = thuTuanDigest_(found[0],cfg.secret);
  if (thuTuanApprovalProblem_(found[0],digest,cfg.approvers)) return null;
  return {row:thuTuanCanonicalContent_(found[0]),digest:digest};
}

function zaloBotLoiBac_(cfg, now, code) {
  var key = thuTuanWeekKey_(new Date(now)), rows = zaloBotRows_(cfg);
  if (code) {
    var past = rows.filter(function(r) { return typeof r.Ky==='string' && r.Ky<=key && r.MaLoiDay===code; })
      .sort(function(a,b) { return b.Ky.localeCompare(a.Ky); });
    key = past.length ? past[0].Ky : '';
  }
  var approved = key && zaloBotApproved_(cfg,rows,key);
  if (!approved) return {text:code ? '⏳ Nội dung mã lời dạy này chưa được phê duyệt để phát hành.' :
    '⏳ Nội dung Lời Bác dạy của tuần này chưa được phê duyệt để phát hành.'};
  var r=approved.row, schedule=zaloBotSchedule_(rows);
  return {text:'🇻🇳 LỜI BÁC DẠY - '+(code ? 'TRA CỨU' : 'TUẦN NÀY')+'\n\n'+
    '📅 Tuần '+zaloBotWeekNumber_(schedule,key)+' · '+zaloBotDateLabel_(key)+' · '+r.MaLoiDay+'\n\n'+
    '“'+r.NoiDungNguyenVan+'”\n\n📖 Nguồn:\n'+r.NguonTrich+'\n\n'+
    '💡 HỌC VÀ LÀM THEO\n'+r.PhanTich+'\n\n'+r.LienHeCAND+'\n\n'+
    (r.HanhDongTuanNay ? '🎯 GỢI MỞ HÀNH ĐỘNG\n'+r.HanhDongTuanNay+'\n\n' : '')+
    'Vững vàng bản lĩnh - Sâu sát tình hình - Chủ động đổi mới.',
    approval:{key:key,digest:approved.digest,current:!code},imageStatus:'BLOCKED_PRIVATE_MEDIA'};
}

function zaloBotQuiz_(cfg) {
  if (!cfg.quizIds.length) return null;
  var sheet=SpreadsheetApp.openById(cfg.quizId).getSheetByName('QUIZ');
  if (!sheet || sheet.getLastColumn()!==SHEET_HEADERS.QUIZ.length || sheet.getLastRow()<2) return null;
  var headers=sheet.getRange(1,1,1,SHEET_HEADERS.QUIZ.length).getValues()[0];
  if (SHEET_HEADERS.QUIZ.some(function(h,i) { return headers[i]!==h; })) return null;
  var quizzes=quizFromRows_(sheet.getRange(2,1,sheet.getLastRow()-1,SHEET_HEADERS.QUIZ.length).getValues());
  var allowed=quizzes.filter(function(q) {
    return cfg.quizIds.indexOf(String(q.id))>=0 && typeof q.question==='string' && q.question.trim() &&
      /^[ABCD]$/.test(q.correct) && ['A','B','C','D'].every(function(k) { return typeof q.options[k]==='string' && q.options[k].trim(); });
  });
  // Duplicate IDs make state/authorization ambiguous; do not silently choose one.
  if (allowed.some(function(q,i) { return allowed.findIndex(function(x) { return String(x.id)===String(q.id); })!==i; })) return null;
  return allowed.length ? allowed[Math.floor(Math.random()*allowed.length)] : null;
}

function zaloBotRoute_(parsed, cfg, now, stateKey, cache) {
  if (parsed.kind==='answer') {
    var raw=cache.get(stateKey);
    if (!raw) return null;
    cache.remove(stateKey);
    var state;
    try { state=JSON.parse(raw); } catch (_) { return null; }
    if (!state || !Number.isSafeInteger(state.expires) || state.expires<=now || !/^[ABCD]$/.test(state.correct)) return null;
    return {text:(parsed.answer===state.correct ? '✅ Chính xác!' : '❌ Chưa chính xác.\n\nĐáp án đúng: '+state.correct)+
      (state.explanation ? '\n\n'+state.explanation : '')+'\n\nGõ /quiz để làm câu tiếp theo.'};
  }
  if (parsed.kind!=='command') return null;
  if (parsed.command==='gioithieu') return {text:zaloBotIntroduction_()};
  if (parsed.command==='trogiup') return {text:zaloBotHelp_()};
  if (parsed.command==='loibac' || parsed.command==='tuan') {
    if (parsed.query) return {text:'Gõ /loibac để xem nội dung tuần hiện tại.'};
    return zaloBotLoiBac_(cfg,now);
  }
  if (parsed.command==='tracuu') {
    if (!parsed.query) return {text:'🔎 Gõ /tracuu <từ khóa>\nVí dụ: /tracuu khẩu hiệu\n/tracuu phương châm'};
    var controlled=zaloBotControlledLookup_(parsed.query);
    if (controlled) return {text:'🔎 TRA CỨU\n\n'+controlled};
    if (/^LD-\d{3,6}$/i.test(parsed.query)) return zaloBotLoiBac_(cfg,now,parsed.query.toUpperCase());
    if (['loi bac','loi bac day'].indexOf(zaloBotNormalize_(parsed.query))>=0) return zaloBotLoiBac_(cfg,now);
    return {text:'🔎 Chưa có nội dung đã duyệt phù hợp.\nThử: tên mô hình, khẩu hiệu, tư tưởng, phương châm, Ba nhất, bốn nhóm hành động, sản phẩm số, Thư tuần hoặc Trợ lý 35.'};
  }
  if (parsed.command==='quiz') {
    cache.remove(stateKey);
    var q=zaloBotQuiz_(cfg);
    if (!q) return {text:'⏳ Chưa có câu hỏi được phép sử dụng. Vui lòng quay lại sau.'};
    return {text:'🧠 TỰ KIỂM TRA\n\n'+q.question+'\n\n'+['A','B','C','D'].map(function(k) { return k+'. '+q.options[k]; }).join('\n')+
      '\n\nTrả lời bằng A, B, C hoặc D.\nCâu hỏi có hiệu lực trong 5 phút.',
      quizState:{correct:q.correct,explanation:typeof q.explanation==='string' ? q.explanation : '',expires:now+ZALO_BOT_QUIZ_TTL_*1000}};
  }
  if (parsed.command==='lich') {
    if (parsed.query && !/^[1-9]\d?$/.test(parsed.query)) return {text:'Gõ /lich hoặc /lich 2 để xem lịch học tập.'};
    var schedule=zaloBotSchedule_(zaloBotRows_(cfg)), key=thuTuanWeekKey_(new Date(now));
    var index=schedule.findIndex(function(s) { return s.key>=key; });
    if (index<0) index=Math.max(0,schedule.length-1);
    var page=Number(parsed.query||1), start=Math.max(0,index-2)+(page-1)*7;
    var items=schedule.slice(start,start+7);
    return {text:'📅 LỊCH HỌC TẬP · Trang '+page+'\nTuần hiện tại: '+zaloBotDateLabel_(key)+'\n\n'+
      (items.length ? items.map(function(s) { return (s.key===key ? '▶ ' : '')+'Tuần '+zaloBotWeekNumber_(schedule,s.key)+' · '+zaloBotDateLabel_(s.key)+' · '+s.code; }).join('\n') : 'Chưa có lịch tại trang này.')+
      (start+7<schedule.length ? '\n\nGõ /lich '+(page+1)+' để xem tiếp.' : '')+
      '\n\nLịch là kế hoạch; nội dung chỉ phát hành sau khi được duyệt hợp lệ.'};
  }
  return {text:'⌨️ Lệnh chưa được hỗ trợ. Gõ /trogiup để xem 6 lệnh chính.'};
}

function zaloBotApi_(cfg, method, payload) {
  // Method is a closed internal enum; never a user URL or free-form API operation.
  if (['getMe','sendMessage'].indexOf(method)<0) return null;
  try {
    var r=UrlFetchApp.fetch('https://bot-api.zaloplatforms.com/bot'+cfg.token+'/'+method,{
      method:'post',contentType:'application/json',payload:JSON.stringify(payload),
      muteHttpExceptions:true,followRedirects:false,validateHttpsCertificates:true});
    if (r.getResponseCode()<200 || r.getResponseCode()>=300) return null;
    var body=JSON.parse(r.getContentText());
    return body && body.ok===true && body.result && !Array.isArray(body.result) ? body.result : null;
  } catch (_) { return null; }
}

function zaloBotIdentity_(cfg) {
  var me=zaloBotApi_(cfg,'getMe',{});
  return !!me && me.id===cfg.bot && me.can_join_groups===true;
}

/** No writes/sends; output contains only status/counters, never credentials or IDs. */
function zaloBotPreflight_(environment) {
  try {
    var cfg=zaloBotConfig_();
    if (cfg.environment!==environment) throw new Error('ISOLATION_BLOCKED');
    var rows=zaloBotRows_(cfg), key=thuTuanWeekKey_(new Date());
    return {status:zaloBotIdentity_(cfg) ? environment+'_PREFLIGHT_OK' : environment+'_BOT_UNCONFIRMED',
      environment:environment,currentWeek:key,currentApproved:!!zaloBotApproved_(cfg,rows,key),
      quizAvailable:!!zaloBotQuiz_(cfg),imageStatus:'BLOCKED_PRIVATE_MEDIA'};
  } catch (_) { return {status:environment+'_PREFLIGHT_BLOCKED'}; }
}

function kiemTraZaloShowcaseTest() { return zaloBotPreflight_('TEST'); }
function kiemTraZaloShowcaseProduction() { return zaloBotPreflight_('PROD'); }

function zaloBotClaim_(props, eventKey, now) {
  if (props.getProperty(eventKey)!==null) return false;
  var all=props.getProperties(), count=0;
  Object.keys(all).filter(function(k) { return k.indexOf(ZALO_BOT_EVENT_PREFIX_)===0; }).forEach(function(k) {
    var item;
    try { item=JSON.parse(all[k]); } catch (_) { throw new Error('STATE_BLOCKED'); }
    if (!item || !Number.isSafeInteger(item.until)) throw new Error('STATE_BLOCKED');
    if (item.until<=now) props.deleteProperty(k); else count++;
  });
  if (count>=500) throw new Error('STATE_BLOCKED');
  var claim=JSON.stringify({until:now+86400000,phase:'CLAIMED',confirmed:0});
  props.setProperty(eventKey,claim);
  if (props.getProperty(eventKey)!==claim) throw new Error('STATE_BLOCKED');
  return true;
}

function zaloBotCheckFresh_(cfg, response) {
  var fresh=zaloBotConfig_();
  if (JSON.stringify(fresh)!==JSON.stringify(cfg)) throw new Error('CONFIG_CHANGED');
  if (response.approval) {
    var a=response.approval, current=zaloBotApproved_(fresh,zaloBotRows_(fresh),a.key);
    if (!current || current.digest!==a.digest ||
        (a.current && thuTuanWeekKey_(new Date())!==a.key)) throw new Error('CONTENT_CHANGED');
  }
}

function zaloBotHandleRelay_(data) {
  var now=Date.now(), lock, claimed=false, eventKey, props, confirmed=0, command='none';
  try {
    var cfg=zaloBotConfig_();
    if (!zaloBotVerifyRelay_(data,cfg,now)) return {success:false,status:'AUTH_DENIED'};
    var normalized=zaloBotEvent_(JSON.parse(data.event),cfg,now);
    if (!normalized.message) return {success:true,status:normalized.status};
    var m=normalized.message, parsed=zaloBotParse_(m.text);
    if (parsed.kind==='ignore') return {success:true,status:'IGNORED_CHAT_TEXT'};
    command=parsed.kind==='answer' ? 'answer' :
      ['gioithieu','trogiup','loibac','tuan','tracuu','quiz','lich'].indexOf(parsed.command)>=0 ? parsed.command : 'unknown';
    var cache=CacheService.getScriptCache();
    var identity=hashSha256_(cfg.bot+'\n'+m.chat.id+'\n'+m.from.id);
    var stateKey='ZALO_QUIZ_'+identity;
    eventKey=ZALO_BOT_EVENT_PREFIX_+hashSha256_(cfg.bot+'\n'+m.chat.id+'\n'+m.message_id);
    lock=LockService.getScriptLock();
    if (!lock.tryLock(1000)) { lock=null; return {success:false,status:'BUSY'}; }
    props=PropertiesService.getScriptProperties();
    if (!zaloBotClaim_(props,eventKey,now)) return {success:true,status:'DUPLICATE'};
    claimed=true;
    var rateKey='ZALO_RATE_'+identity, rate=JSON.parse(cache.get(rateKey)||'{"times":[]}');
    var times=Array.isArray(rate.times) ? rate.times.filter(function(t) { return t>now-10000; }) : [];
    if (times.length>=10) return {success:true,status:'RATE_LIMITED'};
    times.push(now); cache.put(rateKey,JSON.stringify({times:times}),10);
    var response=zaloBotRoute_(parsed,cfg,now,stateKey,cache);
    if (!response) return {success:true,status:'IGNORED_NO_PENDING_QUIZ'};
    var parts=thuTuanZaloSplit_(response.text);
    if (!zaloBotIdentity_(cfg)) return {success:false,status:'BOT_UNCONFIRMED'};
    for (var i=0;i<parts.length;i++) {
      zaloBotCheckFresh_(cfg,response);
      var sending=JSON.stringify({until:now+86400000,phase:'SENDING',confirmed:confirmed});
      props.setProperty(eventKey,sending);
      if (props.getProperty(eventKey)!==sending) throw new Error('STATE_BLOCKED');
      zaloBotCheckFresh_(cfg,response);
      var receipt=zaloBotApi_(cfg,'sendMessage',{chat_id:cfg.chat,text:parts[i]});
      if (!receipt || typeof receipt.message_id!=='string' || !/^[A-Za-z0-9_.:-]{1,256}$/.test(receipt.message_id))
        throw new Error('DELIVERY_UNCONFIRMED');
      confirmed++;
    }
    if (response.quizState) cache.put(stateKey,JSON.stringify(response.quizState),ZALO_BOT_QUIZ_TTL_);
    var done=JSON.stringify({until:now+86400000,phase:'SENT',confirmed:confirmed});
    props.setProperty(eventKey,done);
    if (props.getProperty(eventKey)!==done) throw new Error('STATE_BLOCKED');
    Logger.log(JSON.stringify({component:'zalo_showcase',command:command,status:'SENT',latencyMs:Date.now()-now}));
    return {success:true,status:'SENT',parts:confirmed,imageStatus:response.imageStatus||'NOT_REQUESTED'};
  } catch (error) {
    if (claimed) try { props.setProperty(eventKey,JSON.stringify({until:now+86400000,phase:'UNKNOWN',confirmed:confirmed})); } catch (ignored) {}
    // Raw errors may contain request URLs/tokens; never return/log them.
    var status=claimed ? 'HELD_NO_RETRY' : 'REQUEST_BLOCKED';
    var codes=['CONFIG_BLOCKED','BOT_DISABLED','ISOLATION_BLOCKED','STATE_BLOCKED','CONTENT_BLOCKED',
      'CONFIG_CHANGED','CONTENT_CHANGED','DELIVERY_UNCONFIRMED'];
    var code=error && codes.indexOf(error.message)>=0 ? error.message : 'INTERNAL_UNCONFIRMED';
    try { Logger.log(JSON.stringify({component:'zalo_showcase',command:command,status:status,
      errorCode:code,latencyMs:Date.now()-now})); } catch (ignored) {}
    return {success:false,status:status,parts:confirmed};
  } finally { if (lock) lock.releaseLock(); }
}
