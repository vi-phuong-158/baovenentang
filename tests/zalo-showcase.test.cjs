// Local fixtures only. No cloud runtime claim and no real Google/Zalo request.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=['backend/00-utils.gs','backend/04-sheets-db.gs','backend/07-main.gs','backend/13a-thu-tuan-read-core.gs','backend/13b-zalo-model-content.gs','backend/13-zalo-bot.gs']
  .map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const SECRET='synthetic-approval-secret-0123456789abcdef';
const RELAY='synthetic_relay_secret_0123456789abcdef';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const hm=(s,k)=>Array.from(crypto.createHmac('sha256',k).update(s).digest());
function world(options={}) {
  let now=Date.parse(options.time||'2026-10-04T02:00:00Z'), n=0, locked=false;
  const props=options.props||{
    ZALO_BOT_ENV:'TEST',ZALO_BOT_ENABLED:'true',ZALO_BOT_TEST_SCRIPT_ID:'test-script',
    ZALO_BOT_TEST_BOT_ID:'test-bot',ZALO_BOT_TEST_BOT_TOKEN:'synthetic-token-only',
    ZALO_BOT_TEST_CHAT_ID:'test-group',ZALO_BOT_TEST_CHAT_SHA256:hash('test-group'),
    ZALO_BOT_TEST_GROUP_CONFIRMED:'true',ZALO_BOT_TEST_CONTENT_SHEET_ID:'test-content',
    ZALO_BOT_TEST_QUIZ_SHEET_ID:'test-quiz',ZALO_BOT_TEST_RELAY_SECRET:RELAY,
    THU_TUAN_APPROVAL_SECRET:SECRET,THU_TUAN_APPROVER_EMAILS:'reviewer@example.test',ZALO_BOT_TEST_QUIZ_IDS:'Q1'
  };
  const state=new Map(), calls=[], sent=[], logs=[], mutations=[], rows=[];
  const quizzes=[['Q1','Fixture question?', 'Option A','Option B','Option C','Option D','B','Fixture explanation','fixture']];
  const propertyService={getProperties:()=>({...props}),getProperty:k=>Object.hasOwn(props,k)?props[k]:null,
    setProperty(k,v){ mutations.push(k);if(options.beforeProperty)options.beforeProperty(k,v); props[k]=v;return this; },
    deleteProperty:k=>{mutations.push(k);delete props[k];}};
  const cache={get(k){const v=state.get(k);if(!v||v.until<=now){state.delete(k);return null;}return v.value;},
    put(k,v,ttl){state.set(k,{value:v,until:now+ttl*1000});},remove:k=>state.delete(k)};
  class ClockDate extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  let ctx;
  const sheet=(headers,values)=>({getLastColumn:()=>headers.length,getLastRow:()=>values().length+1,
    getRange(r,c,nr=1,nc=1){return {getValues:()=>[headers,...values()].slice(r-1,r-1+nr).map(a=>a.slice(c-1,c-1+nc))};}});
  ctx=vm.createContext({console,Date:ClockDate,JSON,Number,Math,Intl,
    Utilities:{formatDate:(d,tz)=>new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(d),
      computeHmacSha256Signature:hm,computeDigest:(_,s)=>Array.from(crypto.createHash('sha256').update(s).digest()),
      Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'}},
    CONFIG:{API_ACCESS_TOKEN:'synthetic-api-token',TELEGRAM_WEBHOOK_SECRET:'synthetic-telegram-secret'},
    Logger:{log:v=>logs.push(String(v))},PropertiesService:{getScriptProperties:()=>propertyService},CacheService:{getScriptCache:()=>cache},
    ScriptApp:{getScriptId:()=>options.script||'test-script'},
    LockService:{getScriptLock:()=>({tryLock(){if(options.busy||locked)return false;locked=true;return true;},releaseLock(){assert.ok(locked);locked=false;}})},
    SpreadsheetApp:{openById(id){calls.push(['sheet',id]);return {getSheetByName(name){
      if(id==='test-content'&&name==='LoiDay_NoiDung')return sheet(ctx.THU_TUAN_HEADERS.LoiDay_NoiDung,()=>rows.map(r=>ctx.THU_TUAN_HEADERS.LoiDay_NoiDung.map(h=>r[h]??'')));
      if(id==='test-quiz'&&name==='QUIZ')return sheet(vm.runInContext('SHEET_HEADERS.QUIZ',ctx),()=>quizzes);
      throw Error('Unexpected sheet access');
    }};}},
    UrlFetchApp:{fetch(url,params){calls.push(['api',url.split('/').pop()]);assert.equal(params.followRedirects,false);
      const method=url.split('/').pop();
      if(options.fetch) return options.fetch(method,params,sent);
      let result;
      if(method==='getMe')result={id:'test-bot',can_join_groups:true};
      else {assert.equal(method,'sendMessage');sent.push(JSON.parse(params.payload));result={message_id:'receipt-'+sent.length};}
      return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({ok:true,result})};
    }},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({text:s,setMimeType(){return this;}})},
    callGeminiAPI(){throw Error('AI must not run');},handleTroLy35Run(){throw Error('AI must not run');}
  });
  vm.runInContext(source,ctx);
  function row(extra={}) {return {Ky:'2026-09-28',ChuDe:'Fixture theme',MaLoiDay:'LD-001',NoiDungNguyenVan:'  Fixture original quote\nsecond line  ',
    NguonTrich:'Fixture source, Tập 0, tr. 0',BoiCanh:'Fixture context',PhanTich:'Fixture meaning',LienHeCAND:'Fixture application',
    HanhDongTuanNay:'Fixture action',GoiYLienHe:'UNSIGNED_LEGACY',LienHeAnNinhDoiNgoai:'UNSIGNED_LEGACY_2',NotebookLM_URL:'',
    TrangThai:'DaDuyet',NguoiDuyet:'reviewer@example.test',NgayDuyet:'2026-09-26T02:00:00Z',PhienBan:'1',...extra};}
  function stamp(r){r.DauVanBanDuyet=ctx.thuTuanDigest_(r,props.THU_TUAN_APPROVAL_SECRET);return r;}
  rows.push(stamp(row()),stamp(row({Ky:'2026-10-05',MaLoiDay:'LD-002',NoiDungNguyenVan:'FUTURE_SENTINEL'})));
  function event(text,extra={}) {return {ok:true,result:{event_name:'message.text.received',message:{from:{id:'test-owner',is_bot:false},
    chat:{id:'test-group',chat_type:'GROUP'},message_id:'fixture-'+(++n),date:now,text,...extra}}};}
  function envelope(body) {const data={action:'zalo_showcase_v1',version:1,timestamp:now,nonce:crypto.randomUUID(),event:JSON.stringify(body)};
    data.signature=ctx.zaloBotHmac_(JSON.stringify(['ZALO_SHOWCASE_V1_TEST',1,data.timestamp,data.nonce,data.event]),props.ZALO_BOT_TEST_RELAY_SECRET);return data;}
  function runBody(body){return ctx.zaloBotHandleRelay_(envelope(body));}
  return {ctx,props,state,cache,calls,sent,logs,mutations,rows,quizzes,row,stamp,event,envelope,runBody,run:text=>runBody(event(text)),
    tick:ms=>{now+=ms;},time:value=>{now=Date.parse(value);},now:()=>now,properties:propertyService};
}
const reply=w=>w.sent.map(m=>m.text).join('');

test('generated read core matches sole source; contains no weekly sender/approval mutation',()=>{
  const {build,target}=require('../tools/build-zalo-read-core.cjs');assert.equal(fs.readFileSync(target,'utf8'),build());
  assert.doesNotMatch(build(),/function (guiThuTuan|duyetNoiDungThuTuan|caiLichThuTuan)|MailApp|setValues|setProperty/);
});
for(const command of ['/gioithieu','/Gioithieu','/GIOITHIEU','  /gioithieu  '])test('controlled introduction '+command,()=>{
  const w=world();assert.equal(w.run(command).status,'SENT');assert.equal(w.sent.length,1);
  assert.match(reply(w),/TUYỆT ĐỐI TRUNG THÀNH/);assert.match(reply(w),/công nghệ chỉ là công cụ hỗ trợ/);
  assert.ok(reply(w).length<=1800);assert.equal(w.calls.filter(c=>c[0]==='sheet').length,0);
});
test('/loibac current approved quote/source/application are verbatim and independent of scheduler',()=>{
  const w=world();w.props.THU_TUAN_ENABLED='false';w.props.THU_TUAN_APPROVAL_WEEK='2026-10-05';
  assert.equal(w.run('/loibac').status,'SENT');assert.match(reply(w),/28\/09\/2026 · LD-001/);
  for(const key of ['NoiDungNguyenVan','NguonTrich','PhanTich','LienHeCAND','HanhDongTuanNay'])assert.ok(reply(w).includes(w.rows[0][key]));
  assert.doesNotMatch(reply(w),/FUTURE_SENTINEL|UNSIGNED_LEGACY/);assert.equal(w.props.THU_TUAN_ENABLED,'false');
});
for(const [time,key] of [['2026-10-04T16:59:59Z','2026-09-28'],['2026-10-04T17:00:00Z','2026-10-05'],['2027-01-01T00:00:00Z','2026-12-28']])
 test('Vietnam Monday boundary '+time,()=>{const w=world({time});assert.equal(w.ctx.thuTuanWeekKey_(new Date(time)),key);if(key==='2026-10-05'){w.run('/loibac');assert.match(reply(w),/LD-002/);}});
test('current week missing never picks next approved week',()=>{const w=world();w.rows.shift();w.run('/loibac');assert.match(reply(w),/tuần này chưa được phê duyệt/);assert.doesNotMatch(reply(w),/FUTURE_SENTINEL/);});
for(const [field,value] of [['TrangThai','Nhap'],['DauVanBanDuyet','bad'],['NguoiDuyet','stranger@example.test'],['NgayDuyet','invalid'],['NguonTrich',''],['PhienBan',''],['NoiDungNguyenVan','tamper']])
 test('approval deny '+field,()=>{const w=world();w.rows[0][field]=value;w.run('/loibac');assert.match(reply(w),/chưa được phê duyệt/);assert.doesNotMatch(reply(w),/Fixture original quote|tamper/);});
test('signed unapproved state still denied by shared gate',()=>{const w=world();w.rows[0].TrangThai='Nhap';w.stamp(w.rows[0]);w.run('/loibac');assert.doesNotMatch(reply(w),/Fixture original/);});
test('signed unauthorized reviewer still denied',()=>{const w=world();w.rows[0].NguoiDuyet='other@example.test';w.stamp(w.rows[0]);w.run('/loibac');assert.doesNotMatch(reply(w),/Fixture original/);});
test('missing/short approval secret blocks before I/O',()=>{for(const s of ['', 'short']){const w=world();w.props.THU_TUAN_APPROVAL_SECRET=s;assert.equal(w.run('/loibac').status,'REQUEST_BLOCKED');assert.equal(w.calls.length,0);}});
test('duplicate current week fails closed',()=>{const w=world();w.rows.push({...w.rows[0]});w.run('/loibac');assert.doesNotMatch(reply(w),/Fixture original/);});
test('/tuan alias passes same gate',()=>{const w=world();w.rows[0].DauVanBanDuyet='bad';w.run('/tuan');assert.match(reply(w),/chưa được phê duyệt/);});
test('LD lookup allows approved current/past, rejects future and tampered',()=>{
  for(const [q,expected] of [['LD-001','Fixture original'],['LD-002','chưa được phê duyệt']]){const w=world();w.run('/tracuu '+q);assert.ok(reply(w).includes(expected));assert.doesNotMatch(reply(w),/FUTURE_SENTINEL/);}
  const w=world();w.rows[0].DauVanBanDuyet='bad';w.run('/tracuu LD-001');assert.doesNotMatch(reply(w),/Fixture original/);
});
test('legacy fields never rendered even when changed',()=>{const w=world();w.rows[0].GoiYLienHe='injected';w.run('/loibac');assert.doesNotMatch(reply(w),/injected|UNSIGNED_LEGACY/);});
test('quote approval revoked after SENDING write stops before send',()=>{
  let w;w=world({beforeProperty(k,v){if(k.startsWith('ZALO_BOT_EVENT_')&&JSON.parse(v).phase==='SENDING')w.rows[0].TrangThai='Nhap';}});
  assert.equal(w.run('/loibac').status,'HELD_NO_RETRY');assert.equal(w.sent.length,0);
});
test('config changed after SENDING write stops before send',()=>{
  let w;w=world({beforeProperty(k,v){if(k.startsWith('ZALO_BOT_EVENT_')&&JSON.parse(v).phase==='SENDING')w.props.ZALO_BOT_TEST_BOT_TOKEN='different-synthetic-token';}});
  assert.equal(w.run('/trogiup').status,'HELD_NO_RETRY');assert.equal(w.sent.length,0);
});
test('split preserves exact approved content; later part tamper stops further delivery',()=>{
  const w=world();w.rows[0].PhanTich='Ý nghĩa '.repeat(350);w.stamp(w.rows[0]);const expected=w.ctx.zaloBotLoiBac_(w.ctx.zaloBotConfig_(),w.now()).text;
  assert.equal(w.run('/loibac').status,'SENT');assert.equal(reply(w),expected);assert.ok(w.sent.length>1);assert.ok(w.sent.every(m=>m.text.length<=1800));
  let x;x=world({fetch(method,params,sent){if(method==='getMe')return response({id:'test-bot',can_join_groups:true});sent.push(JSON.parse(params.payload));x.rows[0].TrangThai='Nhap';return response({message_id:'fixture-receipt'});}});
  x.rows[0].PhanTich='Ý nghĩa '.repeat(350);x.stamp(x.rows[0]);assert.equal(x.run('/loibac').status,'HELD_NO_RETRY');assert.equal(x.sent.length,1);
});
test('image blocked independently, approved text still sent; no Drive/media URL fetch',()=>{const w=world();const r=w.run('/loibac');assert.equal(r.status,'SENT');assert.equal(r.imageStatus,'BLOCKED_PRIVATE_MEDIA');assert.ok(w.calls.filter(c=>c[0]==='api').every(c=>['getMe','sendMessage'].includes(c[1])));});

test('/quiz reuses shared mapping and allowed bank only, no result persistence',()=>{
  const w=world();w.quizzes.unshift(['NOT_ALLOWED','Do not publish','A','B','C','D','A','','']);w.run('/quiz');
  assert.match(reply(w),/Fixture question/);assert.doesNotMatch(reply(w),/Do not publish/);assert.match(reply(w),/A\. Option A[\s\S]*D\. Option D/);
  assert.ok([...w.state.keys()].some(k=>k.startsWith('ZALO_QUIZ_')));assert.ok(w.mutations.every(k=>k.startsWith('ZALO_BOT_EVENT_')));
});
for(const a of ['A','B','C','D'])test('quiz state grades '+a+' and clears',()=>{
  const w=world();w.run('/quiz');w.tick(1000);const r=w.run(a);assert.equal(r.status,'SENT');const text=w.sent.at(-1).text;
  assert.match(text,a==='B'?/✅ Chính xác!/:/❌ Chưa chính xác\.[\s\S]*Đáp án đúng: B/);assert.match(text,/Fixture explanation/);
  w.tick(1000);assert.equal(w.run(a).status,'IGNORED_NO_PENDING_QUIZ');assert.equal(w.sent.length,2);
});
test('answer without pending quiz ignored',()=>{const w=world();assert.equal(w.run('B').status,'IGNORED_NO_PENDING_QUIZ');assert.equal(w.sent.length,0);});
test('expired quiz cache ignored',()=>{const w=world();w.run('/quiz');w.tick(301000);assert.equal(w.run('B').status,'IGNORED_NO_PENDING_QUIZ');assert.equal(w.sent.length,1);});
test('embedded TTL checked even if cache returns stale state',()=>{const w=world();w.run('/quiz');const key=[...w.state.keys()].find(k=>k.startsWith('ZALO_QUIZ_'));w.state.get(key).value=JSON.stringify({correct:'B',expires:w.now()-1});w.run('B');assert.equal(w.sent.length,1);});
test('quiz state belongs to sender; other user answer ignored',()=>{const w=world();w.run('/quiz');w.runBody(w.event('B',{from:{id:'someone-else',is_bot:false}}));assert.equal(w.sent.length,1);});
test('quiz unauthorized/malformed/duplicate ID bank withheld',()=>{for(const variant of ['empty','bad','duplicate']){const w=world();if(variant==='empty')w.props.ZALO_BOT_TEST_QUIZ_IDS='';if(variant==='bad')w.quizzes[0][6]='Z';if(variant==='duplicate')w.quizzes.push([...w.quizzes[0]]);w.run('/quiz');assert.match(reply(w),/Chưa có câu hỏi được phép/);}});
test('new quiz failure clears earlier pending question',()=>{const w=world();w.run('/quiz');w.quizzes[0][6]='invalid';w.run('/quiz');w.run('B');assert.equal(w.sent.length,2);});

for(const [q,expected] of [['khẩu hiệu','VỮNG VÀNG BẢN LĨNH'],['phương châm','Phân định rõ mặt đối tác, mặt đối tượng'],['tu tuong','Trung thành là cốt lõi'],['Ba nhất','Kỷ luật nhất - Trung thành nhất - Gần dân nhất'],['bốn nhóm hành động','Gần dân - kiến tạo - hiệu quả'],['sản phẩm số','tách biệt dữ liệu'],['Thư tuần','không gọi AI'],['Trợ lý 35','tự kiểm tra kiến thức'],['tên mô hình','TUYỆT ĐỐI TRUNG THÀNH']])
 test('controlled lookup '+q,()=>{const w=world();w.run('/tracuu '+q);assert.ok(reply(w).includes(expected));assert.equal(w.calls.filter(c=>c[0]==='sheet').length,0);});
test('Unicode NFD/non-accent/case command parsing keeps query',()=>{const w=world();w.run(' /TrAcUu '+ 'phương châm'.normalize('NFD')+' ');assert.match(reply(w),/Hợp tác đúng nội dung/);});
test('/tracuu missing query gives help; URL query never fetched',()=>{const w=world();w.run('/tracuu');assert.match(reply(w),/Ví dụ:/);w.run('/tracuu https://example.invalid/secrets');assert.ok(w.calls.filter(c=>c[0]==='api').every(c=>['getMe','sendMessage'].includes(c[1])));});
test('/lich marks current and lists future only as plan, no draft contents',()=>{const w=world();w.rows[1].TrangThai='Nhap';w.run('/lich');assert.match(reply(w),/▶ Tuần 01 · 28\/09\/2026 · LD-001/);assert.match(reply(w),/05\/10\/2026 · LD-002/);assert.doesNotMatch(reply(w),/FUTURE_SENTINEL/);assert.match(reply(w),/Lịch là kế hoạch/);});
test('schedule pagination includes current region, seven entries max',()=>{const w=world();for(let i=2;i<17;i++)w.rows.push(w.stamp(w.row({Ky:new Date(Date.parse('2026-09-28')+i*604800000).toISOString().slice(0,10),MaLoiDay:'LD-'+String(i+1).padStart(3,'0')})));w.run('/lich 2');assert.equal(reply(w).split('\n').filter(l=>/^Tuần \d/.test(l)).length,7);assert.match(reply(w),/Trang 2/);});
test('/trogiup shows exactly six primary commands',()=>{const w=world();w.run('/trogiup');assert.equal(w.sent.length,1);assert.equal(reply(w).split('\n').filter(l=>/^\/[a-z]+.*—/.test(l)).length,6);assert.doesNotMatch(reply(w),/phanbac|kiemchung|vietbai/);});
test('unknown commands safe and not logged verbatim',()=>{const w=world();w.run('/sensitiveword');assert.match(reply(w),/trogiup/);assert.doesNotMatch(w.logs.join(''),/sensitiveword/);});
test('ordinary chat ignored, no AI/no API/no Sheet/no property writes',()=>{const w=world();assert.equal(w.run('hello https://example.invalid').status,'IGNORED_CHAT_TEXT');assert.equal(w.calls.length,0);assert.equal(w.mutations.length,0);});
test('oversized input fail safe before any calls',()=>{const w=world();w.run('x'.repeat(1001));assert.equal(w.calls.length,0);assert.equal(w.sent.length,0);});
test('non-allowlisted group and PRIVATE chat ignored',()=>{for(const chat of [{id:'not-allowed',chat_type:'GROUP'},{id:'test-group',chat_type:'PRIVATE'}]){const w=world();assert.equal(w.runBody(w.event('/loibac',{chat})).status,'IGNORED_CHAT');assert.equal(w.calls.length,0);}});
test('duplicate webhook, new relay nonce, and process recreation give one response',()=>{
  const w=world(),e=w.event('/trogiup');assert.equal(w.runBody(e).status,'SENT');assert.equal(w.runBody(e).status,'DUPLICATE');assert.equal(w.sent.length,1);
  const x=world({props:w.props});assert.equal(x.runBody(e).status,'DUPLICATE');assert.equal(x.sent.length,0);
});
test('bot and self events ignored',()=>{for(const from of [{id:'other-bot',is_bot:true},{id:'test-bot',is_bot:false}]){const w=world();assert.equal(w.runBody(w.event('/loibac',{from})).status,'IGNORED_SELF');assert.equal(w.sent.length,0);}});
test('malformed wrapper/schema fail safe',()=>{for(const body of [{},[],{ok:true,result:{}},{ok:true,result:{event_name:'message.text.received',message:{}}}]){const w=world();const r=w.runBody(body);assert.ok(['MALFORMED_EVENT','IGNORED_EVENT'].includes(r.status));assert.equal(w.calls.length,0);}});
test('stale event fails closed and cannot replay after retention',()=>{const w=world();const e=w.event('/trogiup');w.runBody(e);w.tick(86401000);w.runBody(e);assert.equal(w.sent.length,1);});
test('invalid relay signature/expired envelope fails before I/O/state',()=>{for(const type of ['signature','timestamp','event']){const w=world(),e=w.envelope(w.event('/loibac'));if(type==='signature')e.signature='0'.repeat(64);if(type==='timestamp')e.timestamp-=300001;if(type==='event')e.event='{}';assert.equal(w.ctx.zaloBotHandleRelay_(e).status,'AUTH_DENIED');assert.equal(w.calls.length,0);assert.equal(w.mutations.length,0);}});
test('TEST isolation denies PROD, wrong project, membership/hash, and known PROD collision',()=>{
  for(const [key,value] of [['ZALO_BOT_ENV','PROD'],['ZALO_BOT_ENABLED','false'],['ZALO_BOT_TEST_SCRIPT_ID','different-project'],['ZALO_BOT_TEST_GROUP_CONFIRMED','false'],['ZALO_BOT_TEST_CHAT_SHA256','0'.repeat(64)],['THU_TUAN_ZALO_PROD_BOT_ID','test-bot']]){const w=world();w.props[key]=value;assert.equal(w.run('/trogiup').status,'REQUEST_BLOCKED');assert.equal(w.calls.length,0);}
});
test('rate guard stops burst after ten logical responses',()=>{const w=world();for(let i=0;i<11;i++)w.run('/trogiup');assert.equal(w.sent.length,10);w.tick(11000);assert.equal(w.run('/trogiup').status,'SENT');});
function response(result){return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({ok:true,result})};}
test('bad bot identity sends no response',()=>{const w=world({fetch:()=>response({id:'wrong-bot',can_join_groups:true})});assert.equal(w.run('/loibac').status,'BOT_UNCONFIRMED');assert.equal(w.sent.length,0);});
test('delivery timeout held, duplicate no retry; errors/secret never output',()=>{const w=world({fetch(method){if(method==='getMe')return response({id:'test-bot',can_join_groups:true});throw Error('synthetic-token-only '+SECRET+' test-group full message');}}),e=w.event('/loibac');const r=w.runBody(e);assert.equal(r.status,'HELD_NO_RETRY');assert.equal(w.runBody(e).status,'DUPLICATE');assert.equal(w.calls.filter(c=>c[1]==='sendMessage').length,1);assert.doesNotMatch(JSON.stringify(r)+w.logs.join(''),new RegExp(SECRET+'|synthetic-token-only|test-group|full message'));});
test('lock busy has no claim/send and can retry',()=>{const w=world({busy:true});assert.equal(w.run('/quiz').status,'BUSY');assert.equal(w.mutations.length,0);assert.equal(w.calls.length,0);});
test('preflight read-only and sanitized',()=>{const w=world();const r=w.ctx.kiemTraZaloShowcaseTest();assert.equal(r.status,'TEST_PREFLIGHT_OK');assert.equal(r.currentApproved,true);assert.equal(w.sent.length,0);assert.equal(w.mutations.length,0);assert.doesNotMatch(JSON.stringify(r),/test-bot|test-group|synthetic/);});

function post(w,data,e={}){return w.ctx.doPost({postData:{contents:JSON.stringify(data)},...e});}
test('doPost explicit authenticated Zalo route responds',()=>{const w=world();const r=post(w,w.envelope(w.event('/trogiup')),{pathInfo:'zalo-showcase-v1'});assert.equal(JSON.parse(r.text).status,'SENT');});
test('doPost denies missing path/action, mixed Telegram, and direct official body',()=>{
  for(const type of ['path','action','mixed','direct']){const w=world(),d=w.envelope(w.event('/loibac'));let e={pathInfo:'zalo-showcase-v1'};if(type==='path')e={};if(type==='action')d.action='contact';if(type==='mixed')d.update_id=1;const r=post(w,type==='direct'?w.event('/loibac'):d,type==='direct'?{}:e);assert.equal(JSON.parse(r.text).success,false);assert.equal(w.calls.length,0);}
});
test('Telegram regression includes update_id zero and callback routing',()=>{
  for(const id of [0,123]){const w=world(),messages=[],callbacks=[];w.ctx.handleTelegramMessage=m=>messages.push(m);w.ctx.handleVideoCallbackQuery=q=>callbacks.push(q);
    const out=post(w,{update_id:id,message:{text:'/quiz'},callback_query:{data:'test'}},{parameter:{secret:'synthetic-telegram-secret'}});
    assert.equal(out.text,'OK');assert.equal(messages.length,1);assert.equal(callbacks.length,1);assert.equal(w.sent.length,0);}
});
test('API action regression remains API even with unrelated update_id',()=>{const w=world();let saved;w.ctx.saveQuizResult=d=>{saved=d;};const out=post(w,{action:'submit_quiz',api_token:'synthetic-api-token',update_id:3,score:1});assert.equal(JSON.parse(out.text).success,true);assert.equal(saved.score,1);assert.equal(w.sent.length,0);});
test('existing contact and disabled ask_book actions unchanged',()=>{const w=world();assert.equal(JSON.parse(post(w,{action:'contact',api_token:'synthetic-api-token',message:'test'}).text).success,true);assert.equal(JSON.parse(post(w,{action:'ask_book'}).text).success,false);assert.equal(w.sent.length,0);});
test('malformed POST JSON/null/array and Telegram auth failure safe',()=>{const w=world();for(const d of ['{','null','[]'])assert.equal(JSON.parse(w.ctx.doPost({postData:{contents:d}}).text).success,false);const out=post(w,{update_id:1,message:{text:'test'}},{parameter:{secret:'wrong'}});assert.equal(JSON.parse(out.text).success,false);assert.equal(w.calls.length,0);});
test('getRandomQuiz legacy behavior uses same mapper',()=>{const w=world();w.ctx.getSheet_=()=>({getLastRow:()=>2,getLastColumn:()=>9,getRange:()=>({getValues:()=>w.quizzes})});const q=w.ctx.getRandomQuiz(1);assert.equal(q[0].correct,'B');assert.equal(q[0].id,'Q1');assert.equal(q[0].options.D,'Option D');});

test('relay to actual doPost contract, retry with fresh nonce still one logical response (local)',async()=>{
  const {createHandler}=await import('../web/api/zalo-webhook.js'),w=world(),event=w.event('/loibac');
  const handler=createHandler({env:{VERCEL_ENV:'preview',ZALO_SHOWCASE_ENV:'TEST',ZALO_SHOWCASE_TEST_WEBHOOK_SECRET:'fixture-webhook-secret',
    ZALO_SHOWCASE_TEST_RELAY_SECRET:RELAY,ZALO_SHOWCASE_TEST_GAS_URL:'https://script.google.com/macros/s/test/exec/zalo-showcase-v1'},clock:w.now,
    fetchImpl:async(url,options)=>{const output=w.ctx.doPost({pathInfo:'zalo-showcase-v1',postData:{contents:options.body}});return {ok:true,json:async()=>JSON.parse(output.text)};}});
  for(let i=0;i<2;i++){
    const res={code:0,value:null,setHeader(){},status(code){this.code=code;return this;},json(value){this.value=value;return this;}};
    await handler({method:'POST',headers:{'content-type':'application/json','x-bot-api-secret-token':'fixture-webhook-secret'},body:event},res);
    assert.equal(res.code,200);assert.equal(res.value.status,i===0?'SENT':'DUPLICATE');
  }
  assert.equal(w.sent.length,1);assert.match(reply(w),/LD-001/);
});
