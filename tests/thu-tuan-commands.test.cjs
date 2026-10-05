// Synthetic identities/data only. No network, real Sheets or Bot credentials.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=['Code.gs','EmailAssets.gs','ZaloTransport.gs','ZaloCommands.gs','ZaloProductionOperations.gs'].map(n=>fs.readFileSync(path.join(root,'services/thu-tuan',n),'utf8')).join('\n');
const secret='synthetic-approval-secret-0123456789abcdef',relaySecret='synthetic-relay-secret-0123456789abcdef',webhookSecret='synthetic-webhook-secret-0123456789abcdef';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const now=Date.parse('2026-10-12T01:00:00Z');
const photoBytes=Buffer.from([137,80,78,71,13,10,26,10,1,2,3,4]);
function approvePhoto(w) {
 w.catalog.data.push(['ANHTUAN','ANH-2026-10-12','LD-047','https://drive.google.com/uc?export=download&id=synthetic-D',sha(photoBytes)]);
 w.props.THU_TUAN_ZALO_COMMAND_CATALOG_STAMP=w.ctx.thuTuanCommandCatalog_(w.ctx.thuTuanCommandConfig_('TEST'),false).stamp;
}
function sheet(headers,rows=[]){
 const data=[headers.slice(),...rows.map(r=>r.slice())];return {data,getLastRow:()=>data.length,getLastColumn:()=>Math.max(...data.map(r=>r.length)),getRange(r,c,n=1,m=1){return{
  getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>data[r+i-1]?.[c+j-1]??'')),
  setValues:values=>values.forEach((row,i)=>{data[r+i-1]??=[];row.forEach((v,j)=>data[r+i-1][c+j-1]=v);}),setNumberFormat(){}
 };}};
}
function world(env='TEST'){
 const props={THU_TUAN_TRANSPORT:'ZALO',THU_TUAN_TEST_MODE:String(env==='TEST'),THU_TUAN_ENABLED:'false',
  THU_TUAN_ZALO_ENV:env,THU_TUAN_CONTENT_SHEET_ID:'content-'+env,THU_TUAN_PRIVATE_SHEET_ID:'private-'+env,
  THU_TUAN_APPROVER_EMAILS:'reviewer@example.test',THU_TUAN_APPROVAL_SECRET:secret,
  THU_TUAN_ZALO_COMMANDS_ENABLED:'true',THU_TUAN_ZALO_COMMAND_RELAY_SECRET:relaySecret};
 Object.assign(props,Object.fromEntries(Object.entries({SCRIPT_ID:'script-'+env,CONTENT_SHEET_ID:'content-'+env,
  PRIVATE_SHEET_ID:'private-'+env,BOT_ID:'bot-'+env,CHAT_SHA256:sha('synthetic-chat-'+env),
  CHAT_ID:'synthetic-chat-'+env,BOT_TOKEN:'synthetic-token-'+env,GROUP_CONFIRMED:'true'}).map(([k,v])=>['THU_TUAN_ZALO_'+env+'_'+k,v])));
 const sheets={},calls=[],writes=[],messages=[],logs=[];let beforeFetch,failSend=false,failReceipt=false,lock=true,actor='reviewer@example.test';
 const ctx=vm.createContext({Intl,Date:class extends Date{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}},
  Utilities:{formatDate:d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(d),
   Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>Array.from(crypto.createHash('sha256').update(Array.isArray(s)?Buffer.from(s):s).digest()),
   computeHmacSha256Signature:(s,k)=>Array.from(crypto.createHmac('sha256',k).update(s).digest())},
  PropertiesService:{getScriptProperties:()=>({getProperties:()=>({...props}),getProperty:k=>props[k]??null,setProperty:(k,v)=>{writes.push(k);props[k]=v;}})},
  ScriptApp:{getScriptId:()=> 'script-'+env},Session:{getActiveUser:()=>({getEmail:()=>actor})},
  LockService:{getScriptLock:()=>({tryLock:()=>lock,releaseLock(){}})},Logger:{log:s=>logs.push(s)},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},
  SpreadsheetApp:{flush(){if(failReceipt&&messages.length)throw Error('synthetic receipt failure');},openById:id=>({getSheetByName:name=>sheets[id+'|'+name],insertSheet:name=>sheets[id+'|'+name]=sheet([])})},
  UrlFetchApp:{fetch(url,options){const method=options.method==='get'?'asset':url.split('/').at(-1);calls.push(method);if(beforeFetch)beforeFetch(method);
   if(method==='asset')return {getResponseCode:()=>200,getBlob:()=>({getContentType:()=> 'image/png',getBytes:()=>Array.from(photoBytes)})};
   const payload=JSON.parse(options.payload);
   if(method==='sendMessage'||method==='sendPhoto'){messages.push(payload);if(failSend)throw Error('synthetic token leaked in exception');}
   const result=method==='getMe'?{id:'bot-'+env,can_join_groups:true}:{message_id:'synthetic.receipt.1'};
   return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({ok:true,result})};
  }}
 });vm.runInContext(source,ctx);
 const catalogRows=[['GIOITHIEU','MOHINH','Mô hình học tập','Nội dung giới thiệu tổng quan.','Bản mô tả — bản thử'],
  ['THONGTIN','KHẨUHIỆU','Khẩu hiệu','Bản lĩnh, sáng tạo.','Bản mô tả — bản thử'],
  ['LICHTUAN','TUAN-01','LD-001','2026-10-05','Lịch thử'],['LICHTUAN','TUAN-02','LD-047','2026-10-12','Lịch thử'],
  ['TAILIEU','DOC-01','Bản mô tả','Liên hệ người phụ trách để nhận tài liệu.','Danh mục thử'],
  ['KHOANH','KHO-ANH','Kho ảnh D/F','https://drive.google.com/drive/folders/synthetic-fixture','Kho thử'],
  ['KHOANH','LD-047-D','Ảnh ngang LD-047','https://drive.google.com/file/d/synthetic-D/view','Kho thử'],
  ['KHOANH','LD-047-F','Ảnh dọc LD-047','https://drive.google.com/file/d/synthetic-F/view','Kho thử']];
 catalogRows[1][1]='KHAUHIEU';
 const catalog=sheet(ctx.THU_TUAN_COMMAND_CATALOG_HEADERS_,catalogRows),log=sheet(ctx.THU_TUAN_COMMAND_LOG_HEADERS_);
 const row={Ky:'2026-10-12',MaLoiDay:'LD-047',ChuDe:'Chủ đề tình báo — fixture',NoiDungNguyenVan:'Nguyên văn thử tiếng Việt.',NguonTrich:'Nguồn thử, Tập 1, tr. 1.',
  BoiCanh:'Bối cảnh thử',PhanTich:'Phân tích thử',LienHeCAND:'Liên hệ thử',HanhDongTuanNay:'Hành động thử',NotebookLM_URL:'',TrangThai:'DaDuyet',
  BoiCanhZalo:'Bối cảnh thử',YNgiaVanDungZalo:'Ý nghĩa thử',HanhDongTuanNayZalo:'Hành động thử',
  NguoiDuyet:'reviewer@example.test',NgayDuyet:'2026-10-01T01:00:00Z',PhienBan:'1'};
 row.DauVanBanDuyet=ctx.thuTuanDigest_(row,secret);
 const content=sheet(ctx.THU_TUAN_HEADERS.LoiDay_NoiDung,[ctx.THU_TUAN_HEADERS.LoiDay_NoiDung.map(h=>row[h]??'')]);
 sheets['content-'+env+'|ThuTuan_TraCuu']=catalog;sheets['content-'+env+'|LoiDay_NoiDung']=content;sheets['private-'+env+'|ThuTuan_Zalo_Lenh']=log;
 props.THU_TUAN_ZALO_COMMAND_CATALOG_STAMP=ctx.thuTuanCommandCatalog_(ctx.thuTuanCommandConfig_(env),false).stamp;
 function event(text='/gioithieu',id='incoming.1'){return {ok:true,result:{event_name:'message.text.received',message:{from:{id:'synthetic-user',is_bot:false},chat:{id:'synthetic-chat-'+env,chat_type:'GROUP'},text,message_id:id,date:now}}};}
 function envelope(input=event()){
  const e={environment:env,timestamp:now,nonce:crypto.randomUUID(),eventJson:JSON.stringify(input)};
  e.signature=ctx.thuTuanCommandHmac_(['THU_TUAN_ZALO_COMMAND_V1',e.environment,e.timestamp,e.nonce,e.eventJson].join('\n'),relaySecret);return e;
 }
 return {ctx,props,sheets,catalog,log,content,row,messages,calls,writes,logs,event,envelope,run:(text,id)=>ctx.thuTuanCommandProcess_(envelope(event(text,id))),
  mutateFetch:fn=>{beforeFetch=fn;},failSend:()=>{failSend=true;},failReceipt:()=>{failReceipt=true;},busy:()=>{lock=false;},actor:s=>{actor=s;}};
}

function weeklyPhotoWorld(){
 const w=world();approvePhoto(w);
 w.props.THU_TUAN_ENABLED='true';w.props.THU_TUAN_ZALO_WEEKLY_PHOTO='true';
 w.sheets['private-TEST|ThuTuan_Zalo_NhatKyGui']=sheet(w.ctx.THU_TUAN_HEADERS.ThuTuan_Zalo_NhatKyGui);
 return w;
}
test('scheduled weekly adapter uses the same full v3 letter and one verified photo receipt, then deduplicates offline',()=>{
 const w=weeklyPhotoWorld(),preview=w.ctx.xemTruocThuTuan();
 assert.equal(preview.status,'PREVIEW');assert.equal(preview.total,1);assert.deepEqual(w.calls,[]);
 assert.equal(w.ctx.guiThuTuan().status,'COMPLETE');assert.equal(w.messages.length,1);
 assert.equal(w.messages[0].caption,w.ctx.thuTuanZaloOneMessage_(w.row));assert.ok(w.messages[0].photo);
 assert.equal(w.sheets['private-TEST|ThuTuan_Zalo_NhatKyGui'].data[1][15],'synthetic.receipt.1');
 const calls=w.calls.length;assert.equal(w.ctx.guiThuTuan().alreadySent,1);assert.equal(w.calls.length,calls);
});
test('weekly photo catalog approval, week and quotation identity are mandatory',()=>{
 for(const mutate of [w=>w.catalog.data.at(-1)[2]='LD-003',w=>w.catalog.data.at(-1)[1]='ANH-2026-10-19',w=>w.catalog.data.at(-1)[4]='0'.repeat(64)]){
  const w=weeklyPhotoWorld();mutate(w);
  assert.equal(w.ctx.guiThuTuan().status,'ZALO_RUN_BLOCKED');assert.deepEqual(w.messages,[]);
 }
 const w=weeklyPhotoWorld();w.catalog.data.pop();
 w.props.THU_TUAN_ZALO_COMMAND_CATALOG_STAMP=w.ctx.thuTuanCommandCatalog_(w.ctx.thuTuanCommandConfig_('TEST'),false).stamp;
 assert.equal(w.ctx.guiThuTuan().status,'ZALO_RUN_BLOCKED');assert.deepEqual(w.calls,[]);
});
test('weekly photo checks catalog changes again after preflight and holds uncertain delivery without replay',()=>{
 const drift=weeklyPhotoWorld();drift.mutateFetch(method=>{if(method==='getMe')drift.catalog.data.at(-1)[3]='https://drive.google.com/uc?export=download&id=edited';});
 assert.equal(drift.ctx.guiThuTuan().status,'ZALO_RUN_BLOCKED');assert.equal(drift.messages.length,0);
 const w=weeklyPhotoWorld();w.failSend();assert.equal(w.ctx.guiThuTuan().unknown,1);
 assert.equal(w.ctx.guiThuTuan().status,'RECONCILIATION_REQUIRED');assert.equal(w.messages.length,1);
});
test('new v3 approval binds every Zalo field and cannot downgrade by removing the fields',()=>{
 const w=world();assert.match(w.row.DauVanBanDuyet,/^v3:/);
 for(const k of ['BoiCanhZalo','YNgiaVanDungZalo','HanhDongTuanNayZalo'])assert.notEqual(w.ctx.thuTuanDigest_({...w.row,[k]:'edited'},secret),w.row.DauVanBanDuyet);
 const stripped={...w.row,BoiCanhZalo:'',YNgiaVanDungZalo:'',HanhDongTuanNayZalo:''};
 assert.match(w.ctx.thuTuanDigest_(stripped,secret),/^v3:/);assert.notEqual(w.ctx.thuTuanDigest_(stripped,secret),w.row.DauVanBanDuyet);
});
test('cutover start week prevents a current-week delivery or preview before the new production lifecycle',()=>{
 const w=weeklyPhotoWorld();w.props.THU_TUAN_START_WEEK='2026-10-19';
 assert.equal(w.ctx.guiThuTuan().status,'BEFORE_START_WEEK');assert.equal(w.ctx.xemTruocThuTuan().status,'BEFORE_START_WEEK');
 assert.deepEqual(w.calls,[]);assert.equal(w.sheets['private-TEST|ThuTuan_Zalo_NhatKyGui'].data.length,1);
});
test('malformed start week is surfaced as a trigger failure, never a quiet skip',()=>{
 for(const value of ['2026-10-13','12/10/2026','2026-10-1']){
  const w=weeklyPhotoWorld();w.props.THU_TUAN_START_WEEK=value;
  assert.equal(w.ctx.guiThuTuan().status,'INVALID_START_WEEK');
  assert.throws(()=>w.ctx.thuTuanTriggerResult_({triggerUid:'synthetic'},w.ctx.guiThuTuan()),/THU_TUAN_TRIGGER_ATTENTION:INVALID_START_WEEK/);
  assert.deepEqual(w.calls,[]);
 }
});
test('production check previews the upcoming Monday, never before the cutover week',()=>{
 const w=world('PROD');assert.equal(w.ctx.thuTuanPromotedWeek_(),'2026-10-12');
 assert.equal(w.ctx.chuyenNhomTestThanhProduction,undefined);assert.equal(w.ctx.tatLichProductionCu,undefined);
});
test('parser accepts accented/unaccented commands and mention prefix; ignores conversation',()=>{
 const w=world();for(const text of ['/gioithieu','/giới thiệu','giới thiệu','@Bot Mẫu /start'])assert.equal(w.ctx.thuTuanCommandParse_(text).name,'gioithieu');
 assert.equal(w.ctx.thuTuanCommandParse_('/tra cứu BẢN LĨNH').query,'ban linh');assert.equal(w.ctx.thuTuanCommandParse_('xin chào'),null);
 assert.equal(w.ctx.thuTuanCommandParse_('/gui').name,'trogiup');assert.equal(w.ctx.thuTuanCommandParse_('/tracuu\nsecret'),null);
});
test('all user commands render project information, schedule, documents and both images',()=>{
 for(const [cmd,expected] of [['/gioithieu','giới thiệu'],['/trogiup','/tracuu'],['/tracuu khau hieu','Bản lĩnh, sáng tạo.'],['/tracuu MOHINH','tổng quan'],
  ['/tracuu tinh bao','LD-047'],['/tracuu LD-047','Nguyên văn thử'],['/tuan','Nguyên văn thử'],['/tuan 2','THƯ TUẦN'],['/lich','TUẦN'],
  ['/tailieu','Bản mô tả'],['/khoanh','Kho ảnh D/F'],['/khoanh LD-047','Ảnh dọc'],['/tracuu nonexistent','Chưa tìm thấy']]){
  const w=world(),r=w.run(cmd);assert.equal(r.status,'SENT',cmd);assert.equal(w.messages.length,1);assert.ok(w.messages[0].text.toLowerCase().includes(expected.toLowerCase()),cmd);
  assert.ok(w.messages[0].text.length<=1800);assert.equal(w.props.THU_TUAN_ENABLED,'false');assert.equal(w.writes.length,0);
 }
});
test('valid TEST and PROD use only their pinned group; no MailApp or weekly log I/O',()=>{
 for(const env of ['TEST','PROD']){const w=world(env);assert.equal(w.run('/gioithieu').status,'SENT');assert.equal(w.messages[0].chat_id,'synthetic-chat-'+env);assert.equal(w.log.data.length,2);}
});
test('same incoming event with new relay nonce cannot send twice',()=>{
 const w=world();assert.equal(w.run('/gioithieu').status,'SENT');assert.equal(w.run('/gioithieu').status,'ALREADY_HANDLED');assert.deepEqual(w.calls,['getMe','sendMessage']);assert.equal(w.log.data.length,2);
});
test('week command sends one verified photo with the entire approved letter and dedupes its receipt',()=>{
 for(const cmd of ['/tuan','/tuan 2','/tuan 2026-10-12']) {
  const w=world();approvePhoto(w);assert.equal(w.run(cmd).status,'SENT');
  assert.equal(w.messages.length,1);assert.equal(w.calls.filter(m=>m==='sendPhoto').length,1);assert.ok(!w.calls.includes('sendMessage'));
  assert.equal(w.messages[0].photo,'https://drive.google.com/uc?export=download&id=synthetic-D');
  assert.equal(w.messages[0].caption,w.ctx.thuTuanCommandLetter_(w.row));
  for(const value of [w.row.NoiDungNguyenVan,w.row.NguonTrich,w.row.BoiCanh,w.row.HanhDongTuanNay])assert.ok(w.messages[0].caption.includes(value));
  assert.equal(w.run(cmd).status,'ALREADY_HANDLED');assert.equal(w.messages.length,1);
  assert.equal(w.log.data[1][1],'SENT');assert.equal(w.props.THU_TUAN_ENABLED,'false');assert.equal(w.writes.length,0);
 }
});
test('week without an approved photo returns its complete letter and never substitutes another week image',()=>{
 const w=world();approvePhoto(w);w.catalog.data.at(-1)[1]='ANH-2026-10-19';
 w.props.THU_TUAN_ZALO_COMMAND_CATALOG_STAMP=w.ctx.thuTuanCommandCatalog_(w.ctx.thuTuanCommandConfig_('TEST'),false).stamp;
 assert.equal(w.run('/tuan 2').status,'SENT');assert.equal(w.messages[0].text,w.ctx.thuTuanCommandLetter_(w.row));assert.ok(!w.calls.includes('sendPhoto'));
});
test('photo catalog rejects external URL, invalid date/hash and tampering before any send',()=>{
 for(const [column,value] of [[3,'https://example.test/asset.png'],[1,'ANH-2026-10-13'],[4,'not-a-hash']]) {
  const w=world();approvePhoto(w);w.catalog.data.at(-1)[column]=value;assert.equal(w.run('/tuan 2').status,'COMMAND_BLOCKED');assert.equal(w.calls.length,0);
 }
 const w=world();approvePhoto(w);w.catalog.data.at(-1)[3]='https://drive.google.com/uc?export=download&id=other';assert.equal(w.run('/tuan 2').status,'COMMAND_BLOCKED');assert.equal(w.messages.length,0);
});
test('changed image bytes or HTML are blocked before the command log and sendPhoto',()=>{
 for(const mode of ['bytes','html']) {
  const w=world();approvePhoto(w);const original=w.ctx.UrlFetchApp.fetch;
  w.ctx.UrlFetchApp.fetch=(url,options)=>options.method==='get'?{getResponseCode:()=>200,getBlob:()=>({getContentType:()=>mode==='html'?'text/html':'image/png',getBytes:()=>Array.from(Buffer.from('changed'))})}:original(url,options);
  assert.equal(w.run('/tuan 2').status,'COMMAND_BLOCKED');assert.equal(w.messages.length,0);assert.equal(w.log.data.length,1);
 }
});
test('photo/approval changes during preflight and uncertain photo delivery never cause a second send',()=>{
 const drift=world();approvePhoto(drift);drift.mutateFetch(method=>{if(method==='getMe')drift.content.data[1][2]='edited';});
 assert.equal(drift.run('/tuan 2').status,'RECONCILIATION_REQUIRED');assert.equal(drift.messages.length,0);
 const w=world();approvePhoto(w);w.failSend();assert.equal(w.run('/tuan 2').status,'REPLY_UNCONFIRMED');
 assert.equal(w.log.data[1][1],'UNKNOWN');assert.equal(w.run('/tuan 2').status,'RECONCILIATION_REQUIRED');assert.equal(w.messages.length,1);
});
test('authenticated but wrong group/private/bot/old events never read catalog or send',()=>{
 for(const mutate of [e=>e.result.message.chat.id='other',e=>e.result.message.chat.chat_type='PRIVATE',e=>e.result.message.from.is_bot=true,
  e=>e.result.message.from.id='bot-TEST',e=>e.result.message.date=now-300001,e=>e.result.message.date=now+30001,e=>e.result.message.message_id='',e=>e.result.event_name='message.image.received']){
  const w=world(),e=w.event();mutate(e);assert.equal(w.ctx.thuTuanCommandProcess_(w.envelope(e)).status,'IGNORED');assert.equal(w.calls.length,0);
 }
});
test('forged signatures, altered environment, expired relay and direct unsigned requests fail closed',()=>{
 for(const mutate of [e=>e.signature='0'.repeat(64),e=>e.eventJson=e.eventJson.replace('gioithieu','tailieu'),e=>e.environment='PROD',e=>e.timestamp=now-60001]){
  const w=world(),e=w.envelope();mutate(e);assert.equal(w.ctx.thuTuanCommandProcess_(e).status,'COMMAND_BLOCKED');assert.equal(w.calls.length,0);
 }
 const w=world();assert.ok(w.ctx.doPost({postData:{contents:JSON.stringify(w.event())}}).text.includes('COMMAND_BLOCKED'));assert.equal(w.calls.length,0);
});
test('disabled commands and BUSY never send or mutate weekly flags',()=>{
 const w=world();w.props.THU_TUAN_ZALO_COMMANDS_ENABLED='false';assert.equal(w.run().status,'DISABLED');w.props.THU_TUAN_ZALO_COMMANDS_ENABLED='true';w.busy();assert.equal(w.run().status,'BUSY');assert.equal(w.calls.length,0);assert.equal(w.writes.length,0);
});
test('catalog edits and schema mismatch invalidate publication before preflight',()=>{
 for(const mutate of [w=>w.catalog.data[1][3]='edited',w=>w.catalog.data[0][0]='wrong',w=>w.catalog.data.push(w.catalog.data[1].slice())]){
  const w=world();mutate(w);assert.equal(w.run('/gioithieu').status,'COMMAND_BLOCKED');assert.equal(w.calls.length,0);
 }
});
test('draft, forged content, removed reviewer and duplicate week cannot disclose quote',()=>{
 for(const mutate of [w=>w.content.data[1][5]='Nhap',w=>w.content.data[1][2]='UNAPPROVED RAW',w=>w.props.THU_TUAN_APPROVER_EMAILS='other@example.test',w=>w.content.data.push(w.content.data[1].slice())]){
  const w=world();mutate(w);
  // Changing the reviewer allowlist invalidates the catalog too; re-review it to test quote gating independently.
  w.props.THU_TUAN_ZALO_COMMAND_CATALOG_STAMP=w.ctx.thuTuanCommandCatalog_(w.ctx.thuTuanCommandConfig_('TEST'),false).stamp;
  assert.equal(w.run('/tuan 2').status,'SENT');assert.ok(w.messages[0].text.includes('chưa có bản duyệt'));assert.ok(!w.messages[0].text.includes('Nguyên văn thử'));assert.ok(!w.messages[0].text.includes('UNAPPROVED RAW'));
 }
});
test('week lookup rejects impossible dates, non-Mondays and invalid page numbers',()=>{
 for(const cmd of ['/tuan 2026-02-30','/tuan 2026-10-13','/tuan 0','/lich 2.5','/lich -1']){const w=world();assert.equal(w.run(cmd).status,'SENT');assert.ok(!w.messages[0].text.includes('Nguyên văn thử'));}
 const w=world();assert.equal(w.run('/tuan 1').status,'SENT');assert.ok(w.messages[0].text.includes('chưa có bản duyệt'));
});
test('uncertain API send blocks retry and every later reply until reconciled',()=>{
 const w=world();w.failSend();assert.equal(w.run('/gioithieu').status,'REPLY_UNCONFIRMED');assert.equal(w.log.data[1][1],'UNKNOWN');
 assert.equal(w.run('/gioithieu').status,'RECONCILIATION_REQUIRED');assert.equal(w.run('/tailieu','incoming.2').status,'RECONCILIATION_REQUIRED');assert.equal(w.messages.length,1);
});
test('receipt write failure leaves durable SENDING/SENT uncertainty and cannot resend',()=>{
 const w=world();w.failReceipt();assert.equal(w.run('/gioithieu').status,'REPLY_UNCONFIRMED');assert.ok(['UNKNOWN','SENT','SENDING'].includes(w.log.data[1][1]));assert.notEqual(w.run('/gioithieu').status,'SENT');assert.equal(w.messages.length,1);
});
test('SENDING persistence failure never reaches API',()=>{
 const w=world(),original=w.log.getRange;w.log.getRange=function(...args){const r=original(...args),set=r.setValues;r.setValues=v=>{set(v);throw Error('write persisted then threw');};return r;};
 assert.equal(w.run('/gioithieu').status,'RECONCILIATION_REQUIRED');assert.equal(w.messages.length,0);assert.equal(w.log.data[1][1],'SENDING');
});
test('pin, enable switch or publication changes during preflight block API send',()=>{
 for(const mutate of [w=>w.props.THU_TUAN_ZALO_TEST_CHAT_ID='other',w=>w.props.THU_TUAN_ZALO_COMMANDS_ENABLED='false',w=>w.catalog.data[1][3]='changed']){
  const w=world();w.mutateFetch(method=>{if(method==='getMe')mutate(w);});assert.equal(w.run('/gioithieu').status,'RECONCILIATION_REQUIRED');assert.equal(w.messages.length,0);
 }
});
test('persisted log rate limit is shared across requests, not instance memory',()=>{
 const w=world();for(let i=0;i<10;i++)assert.equal(w.run('/trogiup','incoming.'+i).status,'SENT');assert.equal(w.run('/trogiup','incoming.11').status,'RATE_LIMITED');assert.equal(w.messages.length,10);
});
test('oversized original quote is never truncated or split into extra replies',()=>{
 const w=world();w.row.NoiDungNguyenVan='Nguyên văn '.repeat(200);w.row.DauVanBanDuyet=w.ctx.thuTuanDigest_(w.row,secret);w.content.data[1]=w.ctx.THU_TUAN_HEADERS.LoiDay_NoiDung.map(h=>w.row[h]??'');
 assert.equal(w.run('/tuan 2').status,'SENT');assert.ok(w.messages[0].text.includes('vượt độ dài'));assert.ok(!w.messages[0].text.includes('Nguyên văn'));assert.equal(w.messages.length,1);
});
test('approval requires allowlisted actor, explicit manual PROD and disabled commands',()=>{
 const w=world('PROD');assert.equal(w.ctx.duyetKhoTraCuuZaloProd().status,'COMMAND_ADMIN_BLOCKED');w.props.THU_TUAN_ZALO_COMMANDS_ENABLED='false';w.actor('other@example.test');assert.equal(w.ctx.duyetKhoTraCuuZaloProd().status,'COMMAND_ADMIN_BLOCKED');w.actor('reviewer@example.test');
 assert.equal(w.ctx.thuTuanCommandAdmin_(undefined,'TEST',true).status,'COMMAND_ADMIN_BLOCKED');assert.equal(w.ctx.duyetKhoTraCuuZaloProd({}).status,'COMMAND_MANUAL_ONLY');assert.equal(w.ctx.duyetKhoTraCuuZaloProd().status,'COMMAND_CATALOG_APPROVED');assert.deepEqual(w.writes,['THU_TUAN_ZALO_COMMAND_CATALOG_STAMP']);
 assert.equal(w.ctx.taoBangLenhZaloTest,undefined);assert.equal(w.ctx.duyetKhoTraCuuZaloTest,undefined);
});
test('HTTP response/status exposes no event, key, query, credential or raw exception',()=>{
 const w=world();w.failSend();const result=w.ctx.doPost({postData:{contents:JSON.stringify(w.envelope())}});assert.deepEqual(JSON.parse(result.text),{status:'REPLY_UNCONFIRMED'});assert.equal(w.logs.length,0);
});
test('setup creates only missing command tabs and preserves existing data; wrong schema is blocked',()=>{
 const w=world('PROD');w.props.THU_TUAN_ZALO_COMMANDS_ENABLED='false';
 const before=JSON.stringify(w.content.data),catalogBefore=JSON.stringify(w.catalog.data);
 assert.equal(w.ctx.taoBangLenhZaloProd().status,'COMMAND_SHEETS_READY');assert.equal(JSON.stringify(w.content.data),before);assert.equal(JSON.stringify(w.catalog.data),catalogBefore);
 delete w.sheets['private-PROD|ThuTuan_Zalo_Lenh'];assert.equal(w.ctx.taoBangLenhZaloProd().status,'COMMAND_SHEETS_READY');assert.equal(w.sheets['private-PROD|ThuTuan_Zalo_Lenh'].data.length,1);
 w.catalog.data[0][0]='wrong';assert.equal(w.ctx.taoBangLenhZaloProd().status,'COMMAND_ADMIN_BLOCKED');assert.equal(w.catalog.data[0][0],'wrong');
 assert.ok(w.logs.every(s=>!s.includes(secret)&&!s.includes('synthetic-chat')&&!s.includes('content-PROD')));
});
test('missing receipt, malformed log, duplicate key and filled log all fail closed',()=>{
 for(const mutate of [w=>w.log.data.push(['bad','SENT',new Date(now),'gioithieu','', 'TEST',sha('synthetic-chat-TEST')]),
  w=>{const r=[sha('duplicate'),'SENT',new Date(now),'gioithieu','receipt','TEST',sha('synthetic-chat-TEST')];w.log.data.push(r,r.slice());},
  w=>{const r=[sha('unresolved'),'SENDING',new Date(now),'gioithieu','','TEST',sha('synthetic-chat-TEST')];w.log.data.push(r);}]){
  const w=world();mutate(w);assert.equal(w.run('/gioithieu').status,'RECONCILIATION_REQUIRED');assert.equal(w.calls.length,0);
 }
 const w=world();for(let i=0;i<5001;i++)w.log.data.push([sha(String(i)),'SENT',new Date(now-120000),'gioithieu','receipt','TEST',sha('synthetic-chat-TEST')]);assert.equal(w.run('/gioithieu').status,'COMMAND_BLOCKED');assert.equal(w.calls.length,0);
});
test('reviewer removal and malformed Unicode invalidate catalog/reply before sending',()=>{
 const w=world();w.props.THU_TUAN_APPROVER_EMAILS='other@example.test';assert.equal(w.run('/gioithieu').status,'COMMAND_BLOCKED');assert.equal(w.calls.length,0);
 const bad=world();bad.catalog.data[1][3]='broken\ud800';bad.props.THU_TUAN_ZALO_COMMAND_CATALOG_STAMP=bad.ctx.thuTuanCommandCatalog_(bad.ctx.thuTuanCommandConfig_('TEST'),false).stamp;
 assert.equal(bad.run('/gioithieu').status,'COMMAND_BLOCKED');assert.equal(bad.messages.length,0);
});
function response(){return {code:0,data:null,setHeader(){},status(n){this.code=n;return this;},json(d){this.data=d;return this;}};}
async function withRelay(fn){
 const names=['ZALO_COMMANDS_ENABLED','ZALO_COMMAND_ENV','ZALO_WEBHOOK_SECRET','ZALO_COMMAND_RELAY_SECRET','ZALO_COMMAND_GAS_URL'];
 const saved=Object.fromEntries(names.map(k=>[k,process.env[k]])),originalFetch=global.fetch,originalNow=Date.now;
 Date.now=()=>now;
 Object.assign(process.env,{ZALO_COMMANDS_ENABLED:'true',ZALO_COMMAND_ENV:'TEST',ZALO_WEBHOOK_SECRET:webhookSecret,ZALO_COMMAND_RELAY_SECRET:relaySecret,ZALO_COMMAND_GAS_URL:'https://script.google.com/macros/s/synthetic-fixture/exec'});
 try{return await fn((await import('../web/api/zalo.js')).default);}finally{global.fetch=originalFetch;Date.now=originalNow;for(const k of names){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}}
}
test('relay authenticates Zalo header and GAS verifies its exact signed envelope end to end',async()=>withRelay(async handler=>{
 const w=world();global.fetch=async(url,opts)=>{assert.equal(url,process.env.ZALO_COMMAND_GAS_URL);const result=w.ctx.thuTuanCommandProcess_(JSON.parse(opts.body));return {ok:true,json:async()=>result};};
 const r=response();await handler({method:'POST',headers:{'x-bot-api-secret-token':webhookSecret},body:w.event()},r);assert.equal(r.code,200);assert.equal(r.data.status,'SENT');assert.equal(w.messages.length,1);
}));

test('live root-level text callbacks normalize to signed GAS events and share dedupe with wrapped events',async()=>withRelay(async handler=>{
 const w=world(),input=w.event('/trogiup');let upstreamCalls=0;
 global.fetch=async(_,options)=>{upstreamCalls++;const envelope=JSON.parse(options.body);assert.deepEqual(JSON.parse(envelope.eventJson),input);
  return {ok:true,json:async()=>w.ctx.thuTuanCommandProcess_(envelope)};};
 const rootInput={event_name:input.result.event_name,message:input.result.message};
 const denied=response();await handler({method:'POST',headers:{},body:rootInput},denied);assert.equal(denied.code,403);assert.equal(upstreamCalls,0);
 const sent=response();await handler({method:'POST',headers:{'x-bot-api-secret-token':webhookSecret},body:rootInput},sent);
 assert.equal(sent.data.status,'SENT');assert.equal(w.messages.length,1);
 const replay=response();await handler({method:'POST',headers:{'x-bot-api-secret-token':webhookSecret},body:input},replay);
 assert.equal(replay.data.status,'ALREADY_HANDLED');assert.equal(w.messages.length,1);
}));

test('root-level normalization keeps rejection flags, body ceiling and group isolation intact',async()=>withRelay(async handler=>{
 let upstreamCalls=0;const w=world();global.fetch=async(_,options)=>{upstreamCalls++;return {ok:true,json:async()=>w.ctx.thuTuanCommandProcess_(JSON.parse(options.body))};};
 const root=()=>({event_name:'message.text.received',message:w.event().result.message});
 for(const ok of [false,'true',null]){const r=response();await handler({method:'POST',headers:{'x-bot-api-secret-token':webhookSecret},body:{...root(),ok}},r);assert.equal(r.code,400);}
 const huge=response();await handler({method:'POST',headers:{'x-bot-api-secret-token':webhookSecret},body:{...root(),extra:'x'.repeat(33000)}},huge);assert.equal(huge.code,413);assert.equal(upstreamCalls,0);
 for(const mutate of [m=>m.chat.id='other-group',m=>m.chat.chat_type='PRIVATE',m=>m.from.is_bot=true]){
  const input=root();mutate(input.message);const r=response();await handler({method:'POST',headers:{'x-bot-api-secret-token':webhookSecret},body:input},r);assert.equal(r.data.status,'IGNORED');
 }
 assert.equal(w.messages.length,0);
}));
test('relay rejects missing/forged/duplicate header and GET before any upstream request',async()=>withRelay(async handler=>{
 let calls=0;global.fetch=async()=>{calls++;throw Error('unexpected');};for(const header of [undefined,'wrong',[webhookSecret,webhookSecret]]){const r=response();await handler({method:'POST',headers:{'x-bot-api-secret-token':header},body:world().event()},r);assert.equal(r.code,403);}
 const r=response();await handler({method:'GET',headers:{}},r);assert.equal(r.code,405);assert.equal(calls,0);
}));
test('authenticated non-text and webhook probe payloads are acknowledged without Bot/GAS calls',async()=>withRelay(async handler=>{
 let calls=0;global.fetch=async()=>{calls++;throw Error('unexpected');};
 for(const body of [{},{ok:true,result:{event_name:'synthetic.verification'}},{ok:true,result:{event_name:'message.image.received'}}]){
  const r=response();await handler({method:'POST',headers:{'x-bot-api-secret-token':webhookSecret},body},r);assert.equal(r.code,200);assert.equal(r.data.status,'IGNORED');
 }assert.equal(calls,0);
}));

test('ignored-event diagnostics reveal only fixed classes and booleans, never payload secrets',async()=>withRelay(async handler=>{
 const captured=[],original=console.info;console.info=s=>captured.push(s);
 try{
  const body={ok:true,event_name:'message.text.received',message:{text:secret,chat:{id:'private-chat'}},
   result:{event_name:relaySecret,message:{from:{id:'private-user'},text:webhookSecret}},data:{event_name:'message.image.received'}};
  const denied=response();await handler({method:'POST',headers:{'x-bot-api-secret-token':'wrong'},body},denied);
  assert.equal(denied.code,403);assert.equal(captured.length,0);
  const allowed=response();await handler({method:'POST',headers:{'x-bot-api-secret-token':webhookSecret},body},allowed);
  assert.deepEqual(allowed.data,{status:'IGNORED'});assert.equal(captured.length,1);
  const report=JSON.parse(captured[0]);assert.equal(report.rootEvent,'message.text.received');assert.equal(report.resultEvent,'OTHER');
  assert.equal(report.dataEvent,'message.image.received');
  for(const value of [secret,relaySecret,webhookSecret,'private-chat','private-user'])assert.ok(!captured[0].includes(value));
  for(const [key,value] of Object.entries(report))assert.ok(typeof value==='boolean'||['status','rootEvent','resultEvent','dataEvent'].includes(key));
 }finally{console.info=original;}
}));
test('relay configuration defaults closed, bounds event body and sanitizes upstream failures',async()=>withRelay(async handler=>{
 let calls=0;global.fetch=async()=>{calls++;return {ok:true,json:async()=>({status:'SECRET_TOKEN_RAW'})};};
 const req={method:'POST',headers:{'x-bot-api-secret-token':webhookSecret},body:world().event()};
 const disabled=response();process.env.ZALO_COMMANDS_ENABLED='false';await handler(req,disabled);assert.equal(disabled.data.status,'DISABLED');process.env.ZALO_COMMANDS_ENABLED='true';
 const url=process.env.ZALO_COMMAND_GAS_URL;process.env.ZALO_COMMAND_GAS_URL='https://example.test/steal';const bad=response();await handler(req,bad);assert.equal(bad.code,503);process.env.ZALO_COMMAND_GAS_URL=url;
 const huge=response();await handler({...req,body:{ok:true,result:{text:'x'.repeat(33000)}}},huge);assert.equal(huge.code,413);
 const raw=response();await handler(req,raw);assert.equal(raw.code,502);assert.deepEqual(raw.data,{status:'PROCESSOR_UNAVAILABLE'});assert.equal(calls,1);
}));
