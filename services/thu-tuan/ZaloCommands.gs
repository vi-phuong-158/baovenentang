/** Optional authenticated command ingress. Install only in the standalone Thư tuần project.
 * No polling, webhook registration, weekly-send/approval command or trigger mutation.
 * Requires the separately reviewed deployment described in ZALO-COMMANDS.md.
 */
var THU_TUAN_COMMAND_CATALOG_HEADERS_ = ['Loai','Ma','TieuDe','NoiDung','Nguon'];
var THU_TUAN_COMMAND_LOG_HEADERS_ = ['Khoa','TrangThai','CapNhatLuc','MaLenh','MessageId','Environment','TargetHash'];

function thuTuanCommandEqual_(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var diff=0; for(var i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i); return diff===0;
}
function thuTuanCommandHmac_(text,secret) {
  return Utilities.computeHmacSha256Signature(text,secret,Utilities.Charset.UTF_8)
    .map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
}
function thuTuanCommandConfig_(env) {
  var cfg=thuTuanConfig_(),p=PropertiesService.getScriptProperties().getProperties();
  if (cfg.transport!=='ZALO' || ['TEST','PROD'].indexOf(env)<0 ||
      cfg.zaloProperties.THU_TUAN_ZALO_ENV!==env) throw new Error('COMMAND_ISOLATION_REQUIRED');
  var zalo=thuTuanZaloConfig_(cfg);
  if (typeof p.THU_TUAN_ZALO_COMMAND_RELAY_SECRET!=='string' || p.THU_TUAN_ZALO_COMMAND_RELAY_SECRET.length<32 ||
      typeof cfg.secret!=='string' || cfg.secret.length<32) throw new Error('COMMAND_CONFIG_REQUIRED');
  return {cfg:cfg,zalo:zalo,enabled:p.THU_TUAN_ZALO_COMMANDS_ENABLED==='true',
    relaySecret:p.THU_TUAN_ZALO_COMMAND_RELAY_SECRET,stamp:p.THU_TUAN_ZALO_COMMAND_CATALOG_STAMP||''};
}
function thuTuanCommandSheet_(id,name,headers) {
  var sheet=SpreadsheetApp.openById(id).getSheetByName(name);
  if (!sheet || sheet.getLastColumn()!==headers.length ||
      JSON.stringify(sheet.getRange(1,1,1,headers.length).getValues()[0])!==JSON.stringify(headers))
    throw new Error('COMMAND_SCHEMA_REQUIRED');
  return sheet;
}
function thuTuanCommandCatalog_(state,verify) {
  var sheet=thuTuanCommandSheet_(state.cfg.contentId,'ThuTuan_TraCuu',THU_TUAN_COMMAND_CATALOG_HEADERS_);
  if (sheet.getLastRow()<2 || sheet.getLastRow()>301) throw new Error('COMMAND_CATALOG_INVALID');
  var raw=sheet.getRange(2,1,sheet.getLastRow()-1,5).getValues(),seen={};
  var rows=raw.map(function(row){
    if (row.some(function(v){return typeof v!=='string';})) throw new Error('COMMAND_CATALOG_INVALID');
    var item={};THU_TUAN_COMMAND_CATALOG_HEADERS_.forEach(function(h,i){item[h]=row[i];});
    if (['GIOITHIEU','THONGTIN','LICHTUAN','TAILIEU','KHOANH','ANHTUAN'].indexOf(item.Loai)<0 ||
        !/^[A-Z0-9_-]{1,40}$/.test(item.Ma) || !item.TieuDe || item.TieuDe.length>120 ||
        !item.NoiDung || item.NoiDung.length>1200 || !item.Nguon || item.Nguon.length>300 ||
        row.some(function(v){return /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v);}) || seen[item.Ma])
      throw new Error('COMMAND_CATALOG_INVALID');
    seen[item.Ma]=true;
    if (item.Loai==='LICHTUAN' && (!/^TUAN-\d{2}$/.test(item.Ma) ||
        !/^LD-\d{3}$/.test(item.TieuDe) || !thuTuanCommandMonday_(item.NoiDung)))
      throw new Error('COMMAND_CATALOG_INVALID');
    if (item.Loai==='KHOANH' && !/^https:\/\/drive\.google\.com\/(?:file\/d\/[A-Za-z0-9_-]+\/view|drive\/folders\/[A-Za-z0-9_-]+)(?:\?[^\s<>"']*)?$/.test(item.NoiDung))
      throw new Error('COMMAND_CATALOG_INVALID');
    if (item.Loai==='ANHTUAN' && (!thuTuanCommandMonday_(item.Ma.replace(/^ANH-/,'')) ||
        !/^ANH-\d{4}-\d{2}-\d{2}$/.test(item.Ma) || !/^LD-\d{3}$/.test(item.TieuDe) ||
        !/^https:\/\/drive\.google\.com\/uc\?export=download&id=[A-Za-z0-9_-]+$/.test(item.NoiDung) ||
        !/^[a-f0-9]{64}$/.test(item.Nguon))) throw new Error('COMMAND_CATALOG_INVALID');
    return item;
  });
  if (rows.filter(function(r){return r.Loai==='GIOITHIEU';}).length!==1 ||
      new Set(rows.filter(function(r){return r.Loai==='LICHTUAN';}).map(function(r){return r.NoiDung;})).size!==
      rows.filter(function(r){return r.Loai==='LICHTUAN';}).length) throw new Error('COMMAND_CATALOG_INVALID');
  var payload=JSON.stringify(['THU_TUAN_COMMAND_CATALOG_V1',state.zalo.env,
    ScriptApp.getScriptId(),state.cfg.contentId,state.zalo.botId,state.zalo.targetHash,state.cfg.approvers,raw]);
  var stamp=thuTuanCommandHmac_(payload,state.cfg.secret);
  if (verify && !thuTuanCommandEqual_(state.stamp,stamp)) throw new Error('COMMAND_CATALOG_NOT_APPROVED');
  return {rows:rows,stamp:stamp};
}
function thuTuanCommandMonday_(key) {
  if (typeof key!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  var date=new Date(key+'T00:00:00Z');return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===key && date.getUTCDay()===1;
}
function thuTuanCommandNormalize_(text) {
  return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
}
function thuTuanCommandParse_(text) {
  if (typeof text!=='string' || text.length>240 || /[\x00-\x1f\x7f]/.test(text)) return null;
  text=text.trim().replace(/^@[^/\n]{1,100}\s+(?=\/)/,'');
  var explicit=text.charAt(0)==='/',normalized=thuTuanCommandNormalize_(text.replace(/^\//,''));
  var aliases=[['gioi thieu','gioithieu'],['gioithieu','gioithieu'],['start','gioithieu'],
    ['tro giup','trogiup'],['trogiup','trogiup'],['help','trogiup'],['tra cuu','tracuu'],
    ['tracuu','tracuu'],['tim','tracuu'],['tuan','tuan'],['lich','lich'],['tai lieu','tailieu'],
    ['tailieu','tailieu'],['kho anh','khoanh'],['khoanh','khoanh']];
  for(var i=0;i<aliases.length;i++){
    var name=aliases[i][0];
    if(normalized===name || normalized.indexOf(name+' ')===0)
      return {name:aliases[i][1],query:normalized.slice(name.length).trim()};
  }
  return explicit?{name:'trogiup',query:''}:null;
}
function thuTuanCommandHelp_() {
  return 'CÁC LỆNH TRA CỨU\n\n/gioithieu — Giới thiệu mô hình và cách sử dụng Bot.\n'+
    '/tracuu <từ khóa hoặc mã LD> — Tìm thông tin dự án và lời dạy đã duyệt.\n'+
    '/tuan [số tuần hoặc YYYY-MM-DD] — Ảnh và toàn bộ thư tuần đã duyệt; bỏ trống để xem tuần hiện tại.\n'+
    '/lich [trang] — Lịch học tập, 10 tuần mỗi trang.\n/tailieu [từ khóa hoặc mã] — Danh mục tài liệu.\n'+
    '/khoanh [mã LD] — Kho ảnh D/F.\n/trogiup — Xem hướng dẫn.\n\n'+
    'Ví dụ: /tracuu ban linh; /tracuu LD-047; /tuan 2; /lich 2. Có thể gõ không dấu.';
}
function thuTuanCommandPublished_(state,catalog) {
  var rows=thuTuanRows_(thuTuanSheet_(state.cfg.contentId,'LoiDay_NoiDung'),'LoiDay_NoiDung');
  return catalog.filter(function(r){return r.Loai==='LICHTUAN';}).map(function(schedule){
    var matches=rows.filter(function(r){return r.Ky===schedule.NoiDung && r.MaLoiDay===schedule.TieuDe;});
    var sameWeek=rows.filter(function(r){return r.Ky===schedule.NoiDung;});
    if (matches.length!==1 || sameWeek.length!==1) return null;
    var row=matches[0];
    if (thuTuanApprovalProblem_(row,thuTuanDigest_(row,state.cfg.secret),state.cfg.approvers)) return null;
    return row;
  }).filter(Boolean);
}
function thuTuanCommandQuote_(row) {
  var text='LỜI BÁC DẠY\n'+row.MaLoiDay+' · '+row.Ky+'\n'+row.ChuDe+'\n\n'+
    row.NoiDungNguyenVan+'\n\nNguồn: '+row.NguonTrich;
  var link=thuTuanNotebookUrl_(row.NotebookLM_URL);
  if (link) text+='\n\nTra cứu thêm: '+link+'\n'+THU_TUAN_NOTEBOOK_NOTE;
  return text;
}
function thuTuanCommandWeek_(query,state,rows,now) {
  var key=query||thuTuanWeekKey_(new Date(now));
  if(/^\d{1,2}$/.test(key)) {var week=rows.filter(function(r){return r.Ma==='TUAN-'+('0'+Number(key)).slice(-2);})[0];key=week?week.NoiDung:'';}
  if(!thuTuanCommandMonday_(key)) return {text:'Dùng /tuan <số tuần> hoặc ngày thứ Hai YYYY-MM-DD; ví dụ /tuan 2.'};
  if(!rows.some(function(r){return r.Loai==='LICHTUAN' && r.NoiDung===key;}))
    return {text:'Tuần '+key+' chưa có trong lịch học tập đã duyệt.'};
  var content=thuTuanCommandPublished_(state,rows).filter(function(r){return r.Ky===key;})[0];
  return content?{content:content}:{text:'Tuần '+key+' đã có trong lịch; nội dung chưa có bản duyệt hợp lệ để cung cấp.'};
}
function thuTuanCommandLetter_(content) {
  // Use the deployed renderer: v3 binds the editorial Zalo fields into approval.
  return typeof thuTuanZaloOneMessage_==='function'?thuTuanZaloOneMessage_(content):thuTuanRenderText_(content);
}
function thuTuanCommandPlan_(command,state,catalog,now) {
  var text,photo=null;
  if(command.name==='tuan') {
    var week=thuTuanCommandWeek_(command.query,state,catalog.rows,now);
    text=week.text;
    if(week.content) {
      try{text=thuTuanCommandLetter_(week.content);}catch(_){
        return {method:'sendMessage',payload:{text:'Thư tuần vượt độ dài một tin hoặc chưa có bản nội dung Zalo hợp lệ. Liên hệ người phụ trách; /tailieu để xem tài liệu.'}};
      }
      photo=catalog.rows.filter(function(r){return r.Loai==='ANHTUAN' && r.Ma==='ANH-'+week.content.Ky && r.TieuDe===week.content.MaLoiDay;})[0];
    }
  } else text=thuTuanCommandReply_(command,state,catalog,now);
  // Exactly one API send/receipt per event, including photo plus full caption.
  if(text.length>1800) {text='Nội dung vượt độ dài một tin. Dùng từ khóa hoặc mã cụ thể hơn; /tailieu để xem tài liệu đầy đủ.';photo=null;}
  if(thuTuanZaloSplit_(text).length!==1)throw new Error('COMMAND_REPLY_INVALID');
  return photo?{method:'sendPhoto',payload:{photo:photo.NoiDung,caption:text},imageHash:photo.Nguon}:
    {method:'sendMessage',payload:{text:text}};
}
function thuTuanCommandPhotoOk_(plan) {
  if(plan.method!=='sendPhoto')return true;
  try {
    var response=UrlFetchApp.fetch(plan.payload.photo,{method:'get',muteHttpExceptions:true,
      followRedirects:true,validateHttpsCertificates:true});
    if(response.getResponseCode()!==200)return false;
    var blob=response.getBlob(),bytes=blob.getBytes();
    if(blob.getContentType().split(';')[0]!=='image/png' || bytes.length<8 || bytes.length>10485760 ||
        [137,80,78,71,13,10,26,10].some(function(b,i){return ((bytes[i]+256)%256)!==b;}))return false;
    var hash=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes)
      .map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
    return thuTuanCommandEqual_(hash,plan.imageHash);
  }catch(_){return false;}
}
function thuTuanCommandReply_(command,state,catalog,now) {
  var rows=catalog.rows,q=command.query,match=function(r){return thuTuanCommandNormalize_([r.Ma,r.TieuDe,r.NoiDung,r.Nguon].join(' ')).indexOf(q)>=0;};
  if (command.name==='trogiup') return thuTuanCommandHelp_();
  if (command.name==='gioithieu') {var intro=rows.filter(function(r){return r.Loai==='GIOITHIEU';})[0];return intro.TieuDe+'\n\n'+intro.NoiDung+'\n\nNguồn: '+intro.Nguon+'\n\nDùng /trogiup để xem các lệnh.';}
  if (command.name==='lich') {
    var page=q===''?1:Number(q),weeks=rows.filter(function(r){return r.Loai==='LICHTUAN';}).sort(function(a,b){return a.NoiDung.localeCompare(b.NoiDung);});
    var pages=Math.ceil(weeks.length/10);
    if (!/^\d{1,2}$/.test(q||'1') || page<1 || page>pages) return 'Dùng /lich <trang>, từ 1 đến '+pages+'.';
    return 'LỊCH HỌC TẬP · Trang '+page+'/'+pages+'\n\n'+weeks.slice((page-1)*10,page*10).map(function(r){return r.Ma.replace('TUAN-','Tuần ')+' · '+r.NoiDung+' · '+r.TieuDe;}).join('\n')+'\n\nLịch là kế hoạch; nội dung chỉ được cung cấp sau khi duyệt. Dùng /tuan <số tuần> để xem.';
  }
  if (command.name==='tailieu' || command.name==='khoanh') {
    var kind=command.name==='tailieu'?'TAILIEU':'KHOANH';
    var selected=rows.filter(function(r){return r.Loai===kind && (q?match(r):kind==='TAILIEU'||r.Ma==='KHO-ANH');});
    if (!selected.length) return 'Chưa có mục phù hợp trong danh mục đã duyệt.';
    return selected.slice(0,5).map(function(r){return r.Ma+' · '+r.TieuDe+'\n'+r.NoiDung+'\nNguồn: '+r.Nguon;}).join('\n\n');
  }
  if(command.name==='tracuu' && !q) return 'Dùng /tracuu <từ khóa hoặc mã>, ví dụ /tracuu ban linh hoặc /tracuu LD-047.';
  if(command.name==='tuan') {
    var week=thuTuanCommandWeek_(q,state,rows,now);
    return week.content?thuTuanCommandLetter_(week.content):week.text;
  }
  var published=thuTuanCommandPublished_(state,rows);
  var infos=rows.filter(function(r){return ['GIOITHIEU','THONGTIN','TAILIEU'].indexOf(r.Loai)>=0 && match(r);});
  var quotes=published.filter(function(r){return thuTuanCommandNormalize_([r.MaLoiDay,r.ChuDe,r.NoiDungNguyenVan,r.NguonTrich].join(' ')).indexOf(q)>=0;});
  var exact=infos.filter(function(r){return thuTuanCommandNormalize_(r.Ma)===q;});
  if(exact.length===1) return exact[0].TieuDe+'\n\n'+exact[0].NoiDung+'\n\nNguồn: '+exact[0].Nguon;
  var exactQuotes=quotes.filter(function(r){return thuTuanCommandNormalize_(r.MaLoiDay)===q;});
  if(exactQuotes.length===1) return thuTuanCommandQuote_(exactQuotes[0]);
  if(infos.length===1 && !quotes.length) return infos[0].TieuDe+'\n\n'+infos[0].NoiDung+'\n\nNguồn: '+infos[0].Nguon;
  if(!infos.length && !quotes.length) return 'Chưa tìm thấy thông tin trong kho đã duyệt. Thử từ khóa khác, /tailieu hoặc /trogiup.';
  return 'KẾT QUẢ TRA CỨU\n\n'+infos.slice(0,3).map(function(r){return r.Ma+' · '+r.TieuDe+'\nXem: /tracuu '+r.Ma;}).concat(quotes.slice(0,3).map(function(r){return r.MaLoiDay+' · '+r.ChuDe+' · '+r.Ky+'\nXem: /tuan '+r.Ky;})).join('\n\n')+'\n\nTìm tối đa 3 mục thông tin và 3 lời dạy mỗi lượt; dùng từ khóa cụ thể hơn để thu hẹp kết quả.';
}
function thuTuanCommandEnvelope_(envelope,state,now) {
  if(!envelope || envelope.environment!==state.zalo.env || !Number.isInteger(envelope.timestamp) ||
      Math.abs(now-envelope.timestamp)>60000 || typeof envelope.nonce!=='string' ||
      !/^[0-9a-f-]{36}$/.test(envelope.nonce) || typeof envelope.eventJson!=='string' ||
      envelope.eventJson.length>32768) throw new Error('COMMAND_AUTH_REQUIRED');
  var message=['THU_TUAN_ZALO_COMMAND_V1',envelope.environment,envelope.timestamp,envelope.nonce,envelope.eventJson].join('\n');
  if(!thuTuanCommandEqual_(envelope.signature,thuTuanCommandHmac_(message,state.relaySecret))) throw new Error('COMMAND_AUTH_REQUIRED');
  var event=JSON.parse(envelope.eventJson),m=event && event.result && event.result.message;
  if(event.ok!==true || event.result.event_name!=='message.text.received' || !m ||
      !m.chat || m.chat.chat_type!=='GROUP' || m.chat.id!==state.zalo.chatId ||
      !m.from || m.from.is_bot!==false || typeof m.from.id!=='string' || !m.from.id || m.from.id===state.zalo.botId ||
      typeof m.message_id!=='string' || !/^[A-Za-z0-9_.:-]{1,256}$/.test(m.message_id) ||
      !Number.isInteger(m.date) || m.date<now-300000 || m.date>now+30000) return null;
  var command=thuTuanCommandParse_(m.text);if(!command)return null;
  return {command:command,key:thuTuanZaloHash_(JSON.stringify([state.zalo.env,m.chat.id,m.message_id]))};
}
function thuTuanCommandProcess_(envelope) {
  var props=PropertiesService.getScriptProperties();
  if(props.getProperty('THU_TUAN_ZALO_COMMANDS_ENABLED')!=='true')return {status:'DISABLED'};
  var lock=LockService.getScriptLock();if(!lock.tryLock(1000))return {status:'BUSY'};
  var attempted=false,logSheet=null,logRow=0,receipt='',state,key,commandName,now=new Date().getTime();
  function write(status,receipt){
    logSheet.getRange(logRow,1,1,7).setValues([[key,status,new Date().toISOString(),commandName,receipt||'',state.zalo.env,state.zalo.targetHash]]);
    SpreadsheetApp.flush();
    var read=logSheet.getRange(logRow,1,1,7).getValues()[0];
    if(read[0]!==key || read[1]!==status || read[3]!==commandName || read[4]!==(receipt||'') ||
        read[5]!==state.zalo.env || read[6]!==state.zalo.targetHash)throw new Error('COMMAND_WRITE_UNCONFIRMED');
  }
  try{
    state=thuTuanCommandConfig_(envelope && envelope.environment);
    if(!state.enabled)return {status:'DISABLED'};
    var event=thuTuanCommandEnvelope_(envelope,state,now);if(!event)return {status:'IGNORED'};
    key=event.key;commandName=event.command.name;
    logSheet=thuTuanCommandSheet_(state.cfg.privateId,'ThuTuan_Zalo_Lenh',THU_TUAN_COMMAND_LOG_HEADERS_);
    if(logSheet.getLastRow()>5001)throw new Error('COMMAND_LOG_CAPACITY');
    var logs=logSheet.getLastRow()>1?logSheet.getRange(2,1,logSheet.getLastRow()-1,7).getValues():[];
    if(logs.some(function(r){return ['SENT','SENDING','UNKNOWN'].indexOf(r[1])<0 ||
        typeof r[0]!=='string' || !/^[a-f0-9]{64}$/.test(r[0]) ||
        r[5]!==state.zalo.env || r[6]!==state.zalo.targetHash ||
        !Number.isFinite(new Date(r[2]).getTime()) ||
        (r[1]==='SENT' && !thuTuanZaloMessageId_({message_id:r[4]}));}))return {status:'RECONCILIATION_REQUIRED'};
    if(new Set(logs.map(function(r){return r[0];})).size!==logs.length)return {status:'RECONCILIATION_REQUIRED'};
    var prior=logs.filter(function(r){return r[0]===key;});
    if(prior.length)return {status:prior[0][1]==='SENT'?'ALREADY_HANDLED':'RECONCILIATION_REQUIRED'};
    if(logs.some(function(r){return r[1]!=='SENT';}))return {status:'RECONCILIATION_REQUIRED'};
    if(logs.filter(function(r){var time=new Date(r[2]).getTime();return !Number.isFinite(time)||time>now-60000;}).length>=10)return {status:'RATE_LIMITED'};
    var catalog=thuTuanCommandCatalog_(state,true),plan=thuTuanCommandPlan_(event.command,state,catalog,now);
    if(!thuTuanCommandPhotoOk_(plan))throw new Error('COMMAND_PHOTO_UNCONFIRMED');
    if(thuTuanZaloPreflight_(state.zalo)!=='OK')throw new Error('COMMAND_BOT_UNVERIFIED');
    logRow=logSheet.getLastRow()+1;write('SENDING','');
    var current=thuTuanCommandConfig_(state.zalo.env),currentCatalog=thuTuanCommandCatalog_(current,true);
    var fresh=thuTuanCommandPlan_(event.command,current,currentCatalog,now);
    if(JSON.stringify(current)!==JSON.stringify(state) || JSON.stringify(fresh)!==JSON.stringify(plan))throw new Error('COMMAND_CONFIG_CHANGED');
    if(!thuTuanCommandPhotoOk_(plan))throw new Error('COMMAND_PHOTO_UNCONFIRMED');
    if(JSON.stringify(thuTuanCommandConfig_(state.zalo.env))!==JSON.stringify(state))throw new Error('COMMAND_CONFIG_CHANGED');
    attempted=true;
    var candidate=thuTuanZaloMessageId_(thuTuanZaloRequest_(state.zalo,plan.method,Object.assign({chat_id:state.zalo.chatId},plan.payload)));
    if(!candidate || candidate.indexOf(state.zalo.token)>=0 || candidate.indexOf(state.zalo.chatId)>=0)throw new Error('COMMAND_SEND_UNCONFIRMED');
    receipt=candidate;
    write('SENT',receipt);return {status:'SENT',sent:1};
  }catch(_){
    // A persisted SENDING write may throw. It remains blocked even before the API.
    if(logRow && attempted){try{write('UNKNOWN',receipt);}catch(__){}return {status:'REPLY_UNCONFIRMED'};}
    return {status:logRow?'RECONCILIATION_REQUIRED':'COMMAND_BLOCKED'};
  }finally{lock.releaseLock();}
}
/** No GET endpoint or unauthenticated bot-event handler. Only a signed relay envelope. */
function doPost(e) {
  var result;
  try{
    var text=e && e.postData && e.postData.contents;
    if(typeof text!=='string' || text.length>70000)result={status:'COMMAND_BLOCKED'};
    else result=thuTuanCommandProcess_(JSON.parse(text));
  }catch(_){result={status:'COMMAND_BLOCKED'};}
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
function thuTuanCommandAdmin_(event,env,approve) {
  if(event)return {status:'COMMAND_MANUAL_ONLY'};
  var lock=LockService.getScriptLock();if(!lock.tryLock(1000))return {status:'BUSY'};
  try{
    var state=thuTuanCommandConfig_(env),actor=thuTuanText_(Session.getActiveUser().getEmail()).toLowerCase();
    if(state.enabled || !actor || state.cfg.approvers.indexOf(actor)<0)return {status:'COMMAND_ADMIN_BLOCKED'};
    var definitions=[[state.cfg.contentId,'ThuTuan_TraCuu',THU_TUAN_COMMAND_CATALOG_HEADERS_],
      [state.cfg.privateId,'ThuTuan_Zalo_Lenh',THU_TUAN_COMMAND_LOG_HEADERS_]];
    if(!approve){
      definitions.forEach(function(d){var book=SpreadsheetApp.openById(d[0]);if(!book.getSheetByName(d[1])){
        var sheet=book.insertSheet(d[1]);sheet.getRange(1,1,1,d[2].length).setValues([d[2]]);
        sheet.getRange(1,1,301,d[2].length).setNumberFormat('@');
      }thuTuanCommandSheet_(d[0],d[1],d[2]);});
      return {status:'COMMAND_SHEETS_READY'};
    }
    var catalog=thuTuanCommandCatalog_(state,false),current=thuTuanCommandConfig_(env);
    if(JSON.stringify(current)!==JSON.stringify(state) || thuTuanCommandCatalog_(current,false).stamp!==catalog.stamp)
      return {status:'COMMAND_APPROVAL_CHANGED'};
    var props=PropertiesService.getScriptProperties();props.setProperty('THU_TUAN_ZALO_COMMAND_CATALOG_STAMP',catalog.stamp);
    if(props.getProperty('THU_TUAN_ZALO_COMMAND_CATALOG_STAMP')!==catalog.stamp)return {status:'COMMAND_APPROVAL_UNCONFIRMED'};
    return {status:'COMMAND_CATALOG_APPROVED',rows:catalog.rows.length};
  }catch(_){return {status:'COMMAND_ADMIN_BLOCKED'};}finally{lock.releaseLock();}
}
function thuTuanCommandAdminResult_(event,env,approve){
  var result=thuTuanCommandAdmin_(event,env,approve);Logger.log(JSON.stringify(result));return result;
}
function taoBangLenhZaloProd(event){return thuTuanCommandAdminResult_(event,'PROD',false);}
function duyetKhoTraCuuZaloProd(event){return thuTuanCommandAdminResult_(event,'PROD',true);}
