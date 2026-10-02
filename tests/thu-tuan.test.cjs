// Thư tuần "Lời Bác dạy": deterministic tests, all Google services mocked; no mail leaves this process.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const root=path.resolve(__dirname,'..');
const CODE=[
 fs.readFileSync(path.join(root,'services/thu-tuan/Code.gs'),'utf8'),
 fs.readFileSync(path.join(root,'services/thu-tuan/EmailAssets.gs'),'utf8'),
 fs.readFileSync(path.join(root,'services/thu-tuan/ZaloTransport.gs'),'utf8'),
 fs.readFileSync(path.join(root,'services/thu-tuan/ZaloDiagnostics.gs'),'utf8')
].join('\n');
const SECRET='fixture-approval-key-0123456789abcdef';
const REVIEWER='reviewer@example.test';
const noIO=new Proxy({}, {get(){throw Error('Unexpected I/O');}});
const Utilities={
 formatDate:(date,tz)=>new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(date),
 computeHmacSha256Signature:(value,key)=>Array.from(crypto.createHmac('sha256',key).update(value,'utf8').digest()).map(b=>b>127?b-256:b),
 computeDigest:(_,value)=>Array.from(crypto.createHash('sha256').update(value,'utf8').digest()),
 DigestAlgorithm:{SHA_256:'sha256'},
 base64Decode:value=>Array.from(Buffer.from(value,'base64')),
 newBlob:(bytes,mimeType,name)=>({bytes:Array.from(bytes),mimeType,name}),
 Charset:{UTF_8:'utf8'},getUuid:()=>crypto.randomUUID()
};
function weekly(extra={}){
 const contextExtras={...extra};
 const testUtilities={...Utilities,...(contextExtras.Utilities||{})};
 delete contextExtras.Utilities;
 const ctx=vm.createContext({console,Date,JSON,Number,Math,Utilities:testUtilities,Logger:{log(){}},...contextExtras});
 vm.runInContext(CODE,ctx);
 return ctx;
}
function contentRow(o={}){return Object.assign({Ky:'2026-09-21',ChuDe:'Kỷ luật và trách nhiệm',MaLoiDay:'LD-TEST-1',NoiDungNguyenVan:'Fixture only',NguonTrich:'Fixture source, Tập 0, tr. 0',GoiYLienHe:'LEGACY_REFLECTION_SENTINEL',BoiCanh:'Fixture context',PhanTich:'Fixture analysis',LienHeCAND:'Fixture CAND link',LienHeAnNinhDoiNgoai:'LEGACY_ANND_SENTINEL',HanhDongTuanNay:'Fixture action',NotebookLM_URL:'https://notebooklm.google.com/notebook/fixture-123',TrangThai:'DaDuyet',NguoiDuyet:REVIEWER,NgayDuyet:new Date('2026-09-19T03:00:00Z'),PhienBan:'1'},o);}
function stamp(ctx,c){c.DauVanBanDuyet=ctx.thuTuanDigest_(c,SECRET);return c;}
function fixture(ctx=weekly(),o={}){
 const content=stamp(ctx,contentRow(o));
 const recipients=[{MaCB:'CB1',Email:'one@example.test',TrangThai:'DangNhan'},{MaCB:'CB2',Email:'two@example.test',TrangThai:'DangNhan'}],logs=[],sent=[];
 let clock=0;
 const io={now:()=>clock,approvers:[REVIEWER],content:()=>[content],recipients:()=>recipients.map(r=>({...r})),logs:()=>logs.map(x=>({...x})),quota:()=>10,
  digest:c=>ctx.thuTuanDigest_(c,SECRET),put:e=>{const i=logs.findIndex(x=>x.Khoa===e.Khoa);if(i<0)logs.push({...e});else logs[i]={...e};},send:(r,c)=>sent.push({email:r.Email,key:c.Ky})};
 return {ctx,io,content,recipients,logs,sent,tick:ms=>{clock+=ms;},run:dry=>ctx.thuTuanRun_(io,content.Ky,dry)};
}

// ---------- In-memory Sheets that behaves like the real one on the points that matter ----------
function memSheet(headers,rows=[],{textCols=[]}={}){
 const data=[headers.slice(),...rows.map(r=>r.slice())],fmt={};
 textCols.forEach(c=>{for(let r=1;r<=500;r++)fmt[r+','+c]='@';});
 const coerce=(r,c,v)=>{
  if(v instanceof Date)return new Date(Math.floor(v.getTime()/1000)*1000); // Sheets keeps seconds
  if(fmt[r+','+c]!=='@'&&typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v))return new Date(v+'T00:00:00+07:00'); // auto date
  return v;
 };
 const sheet={data,fmt,formatCalls:[],getLastRow:()=>data.length,getLastColumn:()=>Math.max(0,...data.map(row=>row.length)),
  getRange(r,c,nr=1,nc=1){return{
   getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>(data[r-1+i]||[])[c-1+j]??'')),
   setValues:v=>v.forEach((row,i)=>{data[r-1+i]=data[r-1+i]||[];row.forEach((x,j)=>{data[r-1+i][c-1+j]=coerce(r+i,c+j,x);});}),
   setNumberFormat:f=>{sheet.formatCalls.push([r,c,nr,nc,f]);for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)fmt[(r+i)+','+(c+j)]=f;}
  };}};
 return sheet;
}
function world({enabled=true,testMode=false,testRecipientEmail='',forbidRecipientSheetRead=false,approvers=REVIEWER,secret=SECRET,actor=REVIEWER,content=[],recipients=[],triggers=[]}={}){
 const ctx0=weekly(),H=ctx0.THU_TUAN_HEADERS;
 const props={THU_TUAN_ENABLED:String(enabled),THU_TUAN_TEST_MODE:String(testMode),THU_TUAN_TEST_RECIPIENT_EMAIL:testRecipientEmail,THU_TUAN_CONTENT_SHEET_ID:'content-id',THU_TUAN_PRIVATE_SHEET_ID:'private-id',THU_TUAN_APPROVER_EMAILS:approvers};
 if(secret)props.THU_TUAN_APPROVAL_SECRET=secret;
 const sheets={
  'content-id|LoiDay_NoiDung':memSheet(H.LoiDay_NoiDung,content.map(c=>H.LoiDay_NoiDung.map(h=>c[h]??'')),{textCols:[1]}),
  'private-id|ThuTuan_NguoiNhan':memSheet(H.ThuTuan_NguoiNhan,recipients.map(r=>H.ThuTuan_NguoiNhan.map(h=>r[h]??''))),
  'private-id|ThuTuan_NhatKyGui':memSheet(H.ThuTuan_NhatKyGui)
 };
 const mail=[],created=[],deleted=[],logs=[];
 const builder={timeBased(){return this;},inTimezone(tz){this.tz=tz;return this;},onWeekDay(d){this.day=d;return this;},atHour(h){this.hour=h;return this;},everyWeeks(n){this.every=n;return this;},create(){created.push({tz:this.tz,day:this.day,hour:this.hour,every:this.every});return {};}};
 const ctx=weekly({
  Logger:{log:v=>logs.push(String(v))},
  PropertiesService:{getScriptProperties:()=>({getProperties:()=>({...props}),getProperty:k=>props[k]??null,setProperty:(k,v)=>{props[k]=v;}})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  Session:{getActiveUser:()=>({getEmail:()=>actor})},
  SpreadsheetApp:{openById:id=>({getSheetByName:name=>{if(forbidRecipientSheetRead&&name==='ThuTuan_NguoiNhan')throw Error('TEST_MODE_MUST_NOT_READ_RECIPIENT_SHEET');return sheets[id+'|'+name]||null;}}),flush(){}},
  MailApp:{sendEmail:m=>mail.push(m),getRemainingDailyQuota:()=>100},
  ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:h=>{builder.handler=h;return builder;},deleteTrigger:t=>deleted.push(t),WeekDay:{MONDAY:'MONDAY'}}
 });
 return {ctx,props,sheets,mail,created,deleted,logs,H,setNow:iso=>{ctx.Date=class extends Date{constructor(...a){super(...(a.length?a:[iso]));}static now(){return new Date(iso).getTime();}};}};
}
const draft=o=>contentRow(Object.assign({TrangThai:'Nhap',NguoiDuyet:'',NgayDuyet:'',DauVanBanDuyet:''},o));
const zaloDraft=o=>draft({NotebookLM_URL:'',BoiCanhZalo:'Short context',YNgiaVanDungZalo:'Meaning connected to a concrete CAND application.',HanhDongTuanNayZalo:'Check one completed task this week.',...o});

// Synthetic TEST/PROD identities only; no credentials or network leave this process.
function zaloWorld({env='TEST',contentOverrides={},response,enabled=true}={}){
 const w=world({enabled,content:[draft({NotebookLM_URL:'',...contentOverrides})],forbidRecipientSheetRead:true});
 const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
 Object.assign(w.props,{THU_TUAN_TRANSPORT:'ZALO',THU_TUAN_TEST_MODE:String(env==='TEST'),THU_TUAN_ZALO_ENV:env});
 for(const name of ['TEST','PROD']){
  const p='THU_TUAN_ZALO_'+name+'_';
  Object.assign(w.props,{
   [p+'SCRIPT_ID']:'script-'+name,[p+'CONTENT_SHEET_ID']:name==='TEST'?'content-id':'prod-content-id',
   [p+'PRIVATE_SHEET_ID']:name==='TEST'?'private-id':'prod-private-id',[p+'BOT_ID']:'bot-'+name,
   [p+'CHAT_SHA256']:sha('synthetic-chat-'+name),[p+'GROUP_CONFIRMED']:'true'
  });
 }
 const prefix='THU_TUAN_ZALO_'+env+'_';
 w.props[prefix+'BOT_TOKEN']='synthetic-token-'+env;
 w.props[prefix+'CHAT_ID']='synthetic-chat-'+env;
 if(env==='PROD'){
  w.props.THU_TUAN_CONTENT_SHEET_ID='prod-content-id';w.props.THU_TUAN_PRIVATE_SHEET_ID='prod-private-id';
  for(const [key,sheet] of Object.entries({...w.sheets}))w.sheets[key.replace('content-id|','prod-content-id|').replace('private-id|','prod-private-id|')]=sheet;
 }
 const privateId=w.props.THU_TUAN_PRIVATE_SHEET_ID;
 w.zaloLog=memSheet(w.H.ThuTuan_Zalo_NhatKyGui);
 w.sheets[privateId+'|ThuTuan_Zalo_NhatKyGui']=w.zaloLog;
 w.ctx.ScriptApp.getScriptId=()=> 'script-'+env;
 w.ctx.MailApp=noIO;
 w.requests=[];w.sendRequests=[];
 w.ctx.UrlFetchApp={fetch(url,options){
  const method=url.split('/').at(-1),payload=JSON.parse(options.payload);
  const request={method,payload,url,options};w.requests.push(request);
  if(method==='sendMessage')w.sendRequests.push(request);
  const standard=method==='getMe'?{ok:true,result:{id:'bot-'+env,can_join_groups:true}}:{ok:true,result:{message_id:'receipt-'+w.sendRequests.length}};
  const value=response?response({w,method,payload,standard}):standard;
  if(value instanceof Error)throw value;
  return {getResponseCode:()=>value?.http??200,getContentText:()=>typeof value==='string'?value:JSON.stringify(value)};
 }};
 // Legacy delivery tests simulate v2 approval before the new Zalo editorial gate.
 w.setNow('2026-09-21T01:00:00Z');w.props.THU_TUAN_TRANSPORT='GMAIL';w.ctx.duyetNoiDungThuTuan('2026-09-21');w.props.THU_TUAN_TRANSPORT='ZALO';
 const legacySheet=w.sheets[w.props.THU_TUAN_CONTENT_SHEET_ID+'|LoiDay_NoiDung'];
 const legacy=Object.fromEntries(w.H.LoiDay_NoiDung.map((key,i)=>[key,legacySheet.data[1][i]]));legacy.DauVanBanDuyet='';
 legacySheet.data[1][9]=w.ctx.thuTuanDigest_(legacy,SECRET);
 w.row=w.sheets[w.props.THU_TUAN_CONTENT_SHEET_ID+'|LoiDay_NoiDung'].data[1];
 w.zaloEntries=()=>w.zaloLog.data.slice(1).map(row=>Object.fromEntries(w.H.ThuTuan_Zalo_NhatKyGui.map((key,i)=>[key,row[i]])));
 return w;
}

// ---------- Week key ----------
test('week key handles Vietnam midnight, ISO year boundary and week 53',()=>{
 const ctx=weekly();for(const [date,key] of [['2026-09-20T16:59:59Z','2026-09-14'],['2026-09-20T17:00:00Z','2026-09-21'],['2027-01-01T00:00:00Z','2026-12-28'],['2027-01-04T00:00:00Z','2027-01-04']])assert.equal(ctx.thuTuanWeekKey_(new Date(date)),key);
});

// ---------- Approval / integrity ----------
test('only complete DaDuyet content from an allow-listed reviewer with a valid stamp is sendable',()=>{
 const f=fixture();assert.equal(f.run(false).status,'COMPLETE');assert.equal(f.sent.length,2);
});
test('each missing required field or approval field fails closed with a reason',()=>{
 const cases={TrangThai:'NOT_APPROVED',NguoiDuyet:'MISSING_REVIEWER',NgayDuyet:'INVALID_APPROVAL_DATE',PhienBan:'INCOMPLETE_CONTENT',NguonTrich:'INCOMPLETE_CONTENT',ChuDe:'INCOMPLETE_CONTENT',MaLoiDay:'INCOMPLETE_CONTENT',NoiDungNguyenVan:'INCOMPLETE_CONTENT',BoiCanh:'INCOMPLETE_CONTENT',PhanTich:'INCOMPLETE_CONTENT',LienHeCAND:'INCOMPLETE_CONTENT',HanhDongTuanNay:'INCOMPLETE_CONTENT',DauVanBanDuyet:'STAMP_MISMATCH'};
 for(const [field,reason] of Object.entries(cases)){const f=fixture();f.content[field]='';const r=f.run(false);assert.equal(r.status,'CONTENT_NOT_APPROVED',field);assert.equal(r.reason,reason,field);assert.equal(f.sent.length,0);assert.equal(f.logs.length,0);}
 for(const status of ['Nhap','daduyet','DaDuyet ','ChoDuyet']){const f=fixture();f.content.TrangThai=status;assert.equal(f.run(false).status,'CONTENT_NOT_APPROVED');assert.equal(f.sent.length,0);}
});
test('invalid approval date is rejected even when re-stamped',()=>{
 const ctx=weekly();const f=fixture(ctx,{NgayDuyet:'not-a-date'});assert.equal(f.run(false).reason,'INVALID_APPROVAL_DATE');assert.equal(f.sent.length,0);
});
test('editing any canonical stamped field after approval invalidates it (and NotebookLM)',()=>{
 for(const field of ['ChuDe','MaLoiDay','NoiDungNguyenVan','NguonTrich','BoiCanh','PhanTich','LienHeCAND','HanhDongTuanNay','PhienBan']){
  const f=fixture();f.content[field]+=' (sửa)';const r=f.run(false);
  assert.equal(r.status,'CONTENT_NOT_APPROVED',field);assert.equal(r.reason,'STAMP_MISMATCH',field);assert.equal(f.sent.length,0);
 }
 const f=fixture();f.content.NotebookLM_URL='https://notebooklm.google.com/notebook/another-id';assert.equal(f.run(false).reason,'STAMP_MISMATCH');
 const g=fixture();g.content.NguoiDuyet='other@example.test';assert.equal(g.run(false).status,'CONTENT_NOT_APPROVED');
 const h=fixture();h.content.NgayDuyet=new Date('2026-09-20T03:00:00Z');assert.equal(h.run(false).reason,'STAMP_MISMATCH');
});
test('legacy input cannot affect canonical HMAC and old approval stamps fail closed',()=>{
 const f=fixture(),stamp=f.content.DauVanBanDuyet;
 for(const field of f.ctx.THU_TUAN_LEGACY_INPUT_FIELDS_)assert.equal(f.ctx.THU_TUAN_CANONICAL_FIELDS_.includes(field),false);
 f.content.GoiYLienHe='changed legacy reflection';f.content.LienHeAnNinhDoiNgoai='changed legacy ANĐN';
 assert.equal(f.ctx.thuTuanDigest_(f.content,SECRET),stamp);assert.equal(f.run(false).status,'COMPLETE');
 const oldKeys=['Ky','ChuDe','MaLoiDay','NoiDungNguyenVan','NguonTrich','GoiYLienHe','BoiCanh','PhanTich','LienHeCAND','LienHeAnNinhDoiNgoai','HanhDongTuanNay','NotebookLM_URL','TrangThai','NguoiDuyet','NgayDuyet','PhienBan'];
 const oldValue=JSON.stringify(oldKeys.map(k=>k==='NgayDuyet'?new Date(f.content[k]).toISOString():String(f.content[k])));
 f.content.DauVanBanDuyet=crypto.createHmac('sha256',SECRET).update(oldValue).digest('hex');
 assert.equal(f.run(false).reason,'STAMP_MISMATCH');
});
test('a stamp forged without the Script Properties key is rejected',()=>{
 const f=fixture(),c=f.content;const plain=JSON.stringify([2,...['Ky','ChuDe','MaLoiDay','NoiDungNguyenVan','NguonTrich','BoiCanh','PhanTich','LienHeCAND','HanhDongTuanNay','NotebookLM_URL','TrangThai','NguoiDuyet','NgayDuyet','PhienBan'].map(k=>k==='NgayDuyet'?new Date(c[k]).toISOString():String(c[k]))]);
 c.NoiDungNguyenVan='Nội dung chưa duyệt';
 for(const forged of [crypto.createHash('sha256').update(plain).digest('hex'),f.ctx.thuTuanDigest_(c,'x'.repeat(32))]){c.DauVanBanDuyet=forged;assert.equal(f.run(false).reason,'STAMP_MISMATCH');}
 assert.equal(f.sent.length,0);
});
test('reviewer outside the allow-list, or an empty allow-list, blocks sending',()=>{
 const ctx=weekly();const f=fixture(ctx,{NguoiDuyet:'intruder@example.test'});assert.equal(f.run(false).reason,'REVIEWER_NOT_ALLOWED');
 const g=fixture();g.io.approvers=[];assert.equal(g.run(false).reason,'REVIEWER_NOT_ALLOWED');
 const h=fixture(ctx,{NguoiDuyet:'Reviewer@Example.test'});assert.equal(h.run(false).status,'COMPLETE');
 assert.equal(f.sent.length+g.sent.length,0);
});
test('digest refuses to run without a strong approval key',()=>{
 const ctx=weekly();for(const k of [undefined,'','short'])assert.throws(()=>ctx.thuTuanDigest_(contentRow(),k),/MISSING_APPROVAL_SECRET/);
});
test('NotebookLM link is optional, but a non-empty value must be a real NotebookLM notebook URL',()=>{
 const ctx=weekly();const f=fixture(ctx,{NotebookLM_URL:''});assert.equal(f.run(false).status,'COMPLETE');assert.equal(f.sent.length,2);
 for(const url of ['javascript:alert(1)','https://notebooklm.google.com.evil.test/notebook/id','https://example.test/notebook/id','http://notebooklm.google.com/notebook/id','https://notebooklm.google.com/notebook/id"onmouseover=x']){
  const g=fixture(ctx,{NotebookLM_URL:url});const r=g.run(false);assert.equal(r.status,'CONTENT_NOT_APPROVED',url);assert.equal(r.reason,'INVALID_NOTEBOOKLM_URL');assert.equal(g.sent.length,0);
 }
});

// ---------- Week selection ----------
test('missing, duplicated or non-Monday weeks do not send',()=>{
 const ctx=weekly();const f=fixture(ctx);assert.equal(ctx.thuTuanRun_(f.io,'2026-09-28',false).status,'CONTENT_MISSING_OR_DUPLICATE');
 const g=fixture(ctx,{Ky:'2026-09-22'});assert.equal(ctx.thuTuanRun_(g.io,'2026-09-21',false).status,'CONTENT_MISSING_OR_DUPLICATE');
 const h=fixture(ctx);const dup={...h.content};h.io.content=()=>[h.content,dup];assert.equal(h.run(false).status,'CONTENT_MISSING_OR_DUPLICATE');
 const e=fixture(ctx);e.io.content=()=>[];assert.equal(e.run(false).status,'CONTENT_MISSING_OR_DUPLICATE');
 assert.equal(f.sent.length+g.sent.length+h.sent.length+e.sent.length,0);
});
test('a Ky cell turned into a date by Sheets is reported, never guessed',()=>{
 const f=fixture();f.content.Ky=new Date('2026-09-21T00:00:00+07:00');assert.equal(f.ctx.thuTuanRun_(f.io,'2026-09-21',false).status,'KY_NOT_PLAIN_TEXT');assert.equal(f.sent.length,0);
});

// ---------- Recipients ----------
test('malformed or duplicate recipients stop the run before any mail',()=>{
 for(const email of ['ONE@example.test','a@example.test,b@example.test','a@example.test;b@example.test','invalid','<a@example.test>','bad..dots@example.invalid','.leading@example.invalid','trailing.@example.invalid','user@example..invalid','user@-example.invalid','user@example-.invalid','user@example/path.invalid','']){const f=fixture();f.recipients[1].Email=email;assert.equal(f.run(false).status,'INVALID_RECIPIENT_LIST',email);assert.equal(f.sent.length,0);}
 for(const id of ['CB 2','','CB1']){const f=fixture();f.recipients[1].MaCB=id;assert.equal(f.run(false).status,'INVALID_RECIPIENT_LIST',id);assert.equal(f.sent.length,0);}
 const f=fixture();f.recipients.push({MaCB:'CB1',Email:'old@example.test',TrangThai:'TamDung'});assert.equal(f.run(false).status,'INVALID_RECIPIENT_LIST');assert.equal(f.sent.length,0);
});
test('inactive recipient rows are validated and duplicate counts include all duplicate IDs',()=>{
 const f=fixture();f.recipients[1].TrangThai='TamDung';f.recipients[1].Email='bad address';
 assert.equal(f.run(true).status,'INVALID_RECIPIENT_LIST');
 const g=fixture();g.recipients.push({MaCB:'CB1',Email:'old@example.test',TrangThai:'TamDung'});
 const r=g.run(true);assert.equal(r.status,'INVALID_RECIPIENT_LIST');assert.equal(r.total,3);assert.equal(r.valid,1);assert.equal(r.invalid,2);assert.equal(r.duplicate,2);
});
test('valid recipient IDs that match JavaScript object property names are handled normally',()=>{
 for(const id of ['constructor','toString','__proto__']){const f=fixture();f.recipients[0].MaCB=id;assert.equal(f.run(false).status,'COMPLETE',id);assert.equal(f.sent.length,2,id);}
});
test('paused recipients are skipped and may reuse an address; order is deterministic',()=>{
 const f=fixture();f.recipients.push({MaCB:'CB3',Email:'one@example.test',TrangThai:'TamDung'},{MaCB:'CB4',Email:'four@example.test',TrangThai:'TamDung'});
 assert.equal(f.run(false).status,'COMPLETE');assert.deepEqual(f.sent.map(s=>s.email),['one@example.test','two@example.test']);
});

// ---------- Preview ----------
test('preview reports counts and codes without sending or writing',()=>{
 const f=fixture();f.io.put=()=>{throw Error('preview must not write');};f.io.send=()=>{throw Error('preview must not send');};
 const r=f.run(true);assert.equal(r.status,'PREVIEW');assert.equal(r.total,2);assert.equal(r.valid,2);assert.equal(r.invalid,0);assert.equal(r.duplicate,0);assert.equal(r.pending,2);assert.equal(r.alreadySent,0);assert.equal(r.sent,0);assert.equal(r.maLoiDay,'LD-TEST-1');assert.equal(r.quota,10);assert.equal(r.notebookLM,true);
 assert.equal(JSON.stringify(r).includes('@'),false);
});

// ---------- Idempotency ----------
test('a completed week is never resent and logs keep no address or content',()=>{
 const f=fixture();assert.equal(f.run(false).sent,2);const again=f.run(false);assert.equal(again.sent,0);assert.equal(again.alreadySent,2);assert.equal(f.sent.length,2);
 assert.ok(f.logs.every(x=>!JSON.stringify(x).includes('@')&&!('NoiDungNguyenVan' in x)));
});
test('failed SENDING write prevents the send',()=>{const f=fixture();f.io.put=()=>{throw Error('write failed');};assert.throws(()=>f.run(false));assert.equal(f.sent.length,0);});
test('accepted mail followed by a failed SENT write is held as UNKNOWN, not resent',()=>{
 const f=fixture(),put=f.io.put;let once=true;f.io.put=e=>{if(e.TrangThai==='SENT'&&once){once=false;throw Error('lost write');}put(e);};
 assert.equal(f.run(false).status,'RECONCILIATION_REQUIRED');assert.equal(f.sent.length,1);assert.equal(f.logs[0].TrangThai,'UNKNOWN');
 const again=f.run(false);assert.equal(again.unknown,1);assert.equal(again.status,'RECONCILIATION_REQUIRED');assert.equal(f.sent.filter(x=>x.email==='one@example.test').length,1);
});
test('send exception with a failed UNKNOWN write leaves SENDING, which is also held',()=>{
 const f=fixture(),put=f.io.put;f.io.send=()=>{throw Error('mail service error');};f.io.put=e=>{if(e.TrangThai==='UNKNOWN')throw Error('lost');put(e);};
 assert.equal(f.run(false).status,'RECONCILIATION_REQUIRED');assert.equal(f.logs[0].TrangThai,'SENDING');
 f.io.send=(r,c)=>f.sent.push({email:r.Email});assert.equal(f.run(false).unknown,1);assert.equal(f.sent.some(s=>s.email==='one@example.test'),false);
});
test('SENDING, UNKNOWN, blank or unrecognised states are held; only operator-set PENDING/FAILED retry, once',()=>{
 for(const state of ['SENDING','UNKNOWN','Sent','']){const f=fixture();f.run(false);f.logs[0].TrangThai=state;const r=f.run(false);
  assert.equal(r.unknown,1,state);assert.equal(r.status,'RECONCILIATION_REQUIRED');assert.equal(f.sent.length,2,state);}
 for(const state of ['PENDING','FAILED']){const f=fixture();f.run(false);f.logs[0].TrangThai=state;assert.equal(f.run(false).sent,1);assert.equal(f.run(false).sent,0);assert.equal(f.sent.filter(s=>s.email==='one@example.test').length,2);}
});
test('duplicate log rows or rows whose key does not match stop the run',()=>{
 const f=fixture();f.run(false);f.logs.push({...f.logs[0]});assert.equal(f.run(false).status,'DUPLICATE_OR_INVALID_LOG');
 const g=fixture();g.run(false);g.logs[0].Khoa='garbled';assert.equal(g.run(false).status,'DUPLICATE_OR_INVALID_LOG');
 const h=fixture();h.run(false);h.logs[0].MaCB='CB9';assert.equal(h.run(false).status,'DUPLICATE_OR_INVALID_LOG');
 const i=fixture();i.run(false);i.logs[0].Ky='2026-09-28';assert.equal(i.run(false).status,'DUPLICATE_OR_INVALID_LOG');
 assert.equal(f.sent.length+g.sent.length+h.sent.length+i.sent.length,8);
});
test('REGRESSION: log Ky turned into a date by Sheets still prevents a resend (matched by Khoa)',()=>{
 const f=fixture();f.run(false);f.logs.forEach(l=>{l.Ky=new Date('2026-09-21T00:00:00+07:00');});
 const r=f.run(false);assert.equal(r.alreadySent,2);assert.equal(r.sent,0);assert.equal(f.sent.length,2);
});

// ---------- Quota / runtime ----------
test('quota shortage sends none and records nothing',()=>{const f=fixture();f.io.quota=()=>1;const r=f.run(false);assert.equal(r.status,'QUOTA_DEFERRED');assert.equal(r.pending,2);assert.equal(f.logs.length,0);assert.equal(f.sent.length,0);});
test('time budget stops with DEFERRED; a later manual run finishes without duplicates',()=>{
 const f=fixture();const send=f.io.send;f.io.send=(r,c)=>{send(r,c);f.tick(250000);};
 const r=f.run(false);assert.equal(r.status,'DEFERRED');assert.equal(r.sent,1);assert.equal(r.remaining,1);
 f.io.send=send;const r2=f.run(false);assert.equal(r2.status,'COMPLETE');assert.equal(r2.sent,1);assert.equal(r2.alreadySent,1);
 assert.deepEqual(f.sent.map(s=>s.email),['one@example.test','two@example.test']);
});
test('quota exhausted mid-run defers instead of failing',()=>{
 const f=fixture();let q=3;f.io.quota=()=>q;const send=f.io.send;f.io.send=(r,c)=>{send(r,c);q=0;};
 const r=f.run(false);assert.equal(r.status,'DEFERRED');assert.equal(f.sent.length,1);assert.equal(f.logs.filter(l=>l.TrangThai==='SENT').length,1);
});

// ---------- Mid-run changes ----------
test('opt-out is honoured before send; a revised version cannot mix into the same week',()=>{
 const ctx=weekly(),f=fixture(ctx);f.recipients[0].TrangThai='TamDung';assert.equal(f.run(false).sent,1);
 f.content.PhienBan='2';stamp(ctx,f.content);assert.equal(f.run(false).status,'CONTENT_CHANGED_DURING_WEEK');assert.equal(f.sent.length,1);
});
test('approval withdrawn or content edited mid-run stops the next recipient',()=>{
 const f=fixture();const send=f.io.send;f.io.send=(r,c)=>{send(r,c);f.content.NguoiDuyet='';};assert.equal(f.run(false).status,'CONTENT_CHANGED_DURING_WEEK');assert.equal(f.sent.length,1);
 const g=fixture();const s2=g.io.send;g.io.send=(r,c)=>{s2(r,c);g.content.NoiDungNguyenVan='Sửa giữa chừng';};assert.equal(g.run(false).status,'CONTENT_CHANGED_DURING_WEEK');assert.equal(g.sent.length,1);
 const h=fixture();const s3=h.io.send;h.io.send=(r,c)=>{s3(r,c);h.io.approvers=[];};assert.equal(h.run(false).status,'CONTENT_CHANGED_DURING_WEEK');assert.equal(h.sent.length,1);
});
test('UNKNOWN for a paused or removed recipient remains visible for reconciliation',()=>{
 const f=fixture();assert.equal(f.run(false).sent,2);f.logs[0].TrangThai='UNKNOWN';f.recipients[0].TrangThai='TamDung';
 const r=f.run(false);assert.equal(r.status,'RECONCILIATION_REQUIRED');assert.equal(r.unknown,1);assert.equal(r.alreadySent,1);assert.equal(r.sent,0);assert.equal(f.sent.length,2);
 const g=fixture();assert.equal(g.run(false).sent,2);g.logs[0].TrangThai='SENDING';g.recipients.splice(0,1);
 const r2=g.run(false);assert.equal(r2.status,'RECONCILIATION_REQUIRED');assert.equal(r2.unknown,1);assert.equal(r2.alreadySent,1);assert.equal(r2.sent,0);assert.equal(g.sent.length,2);
});

// ---------- Runner guards ----------
test('THU_TUAN_ENABLED other than exactly "true" blocks sending before any lock, sheet or mail access',()=>{
 for(const value of [undefined,'false','TRUE','yes','1',' true']){
  const props=value===undefined?{}:{THU_TUAN_ENABLED:value};
  const ctx=weekly({PropertiesService:{getScriptProperties:()=>({getProperties:()=>props})},LockService:noIO,SpreadsheetApp:noIO,MailApp:noIO});
  assert.equal(ctx.guiThuTuan().status,'DISABLED',String(value));
 }
});
test('lock contention returns BUSY without reading; the lock is released on failure',()=>{
 const ctx=weekly();ctx.thuTuanConfig_=()=>({enabled:true});ctx.LockService={getScriptLock:()=>({tryLock:()=>false})};ctx.thuTuanAdapter_=()=>{throw Error('must not read');};assert.equal(ctx.guiThuTuan().status,'BUSY');assert.equal(ctx.xemTruocThuTuan().status,'BUSY');
 let released=false;ctx.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{released=true;}})};ctx.thuTuanAdapter_=()=>{throw Error('bad schema');};assert.throws(()=>ctx.guiThuTuan());assert.equal(released,true);
});
test('adapter refuses shared sheets or a missing approval key before opening any sheet',()=>{
 const ctx=weekly({SpreadsheetApp:noIO});
 assert.throws(()=>ctx.thuTuanAdapter_({contentId:'a',privateId:'a',secret:SECRET}),/SEPARATE_SHEETS_REQUIRED/);
 assert.throws(()=>ctx.thuTuanAdapter_({contentId:'a',privateId:'b',secret:''}),/MISSING_APPROVAL_SECRET/);
});
test('TEST_MODE requires exactly one explicit email and rejects malformed or list recipients before sheet access',()=>{
 for(const email of ['',undefined,'qa@example.test,other@example.test','qa@example.test;other@example.test','not-an-email','bad..dots@example.invalid','user@-example.invalid']){
  const ctx=weekly({SpreadsheetApp:noIO});
  assert.throws(()=>ctx.thuTuanAdapter_({contentId:'content',privateId:'private',secret:SECRET,testMode:true,testRecipientEmail:email}),/INVALID_TEST_RECIPIENT/,String(email));
 }
 const invalidMode=weekly({SpreadsheetApp:noIO});assert.throws(()=>invalidMode.thuTuanAdapter_({contentId:'content',privateId:'private',secret:SECRET,testMode:false,testModeValue:'TRUE'}),/INVALID_TEST_MODE/);
 const strayRecipient=weekly({SpreadsheetApp:noIO});assert.throws(()=>strayRecipient.thuTuanAdapter_({contentId:'content',privateId:'private',secret:SECRET,testMode:false,testRecipientEmail:'qa@example.test'}),/TEST_RECIPIENT_WITHOUT_TEST_MODE/);
});
test('TEST_MODE sends only to its explicit override, retains approval/HMAC, and dedupes the reserved log ID',()=>{
 const w=world({enabled:true,testMode:true,testRecipientEmail:'qa@example.test',forbidRecipientSheetRead:true,
  content:[draft({})],recipients:[{MaCB:'LIVE1',Email:'live-one@example.test',TrangThai:'DangNhan'},{MaCB:'LIVE2',Email:'live-two@example.test',TrangThai:'DangNhan'}]});
 w.setNow('2026-09-21T01:00:00Z');
 assert.equal(w.ctx.xemTruocThuTuan().reason,'NOT_APPROVED');assert.equal(w.mail.length,0);
 w.ctx.duyetNoiDungThuTuan('2026-09-21');
 const preview=w.ctx.xemTruocThuTuan();assert.equal(preview.status,'PREVIEW');assert.equal(preview.pending,1);assert.equal(preview.unknown,0);assert.equal(preview.alreadySent,0);assert.equal(w.mail.length,0);
 const sent=w.ctx.guiThuTuan();assert.equal(sent.status,'COMPLETE');assert.equal(sent.sent,1);assert.equal(w.mail.length,1);
 assert.equal(w.mail[0].to,'qa@example.test');assert.equal(w.mail[0].subject,'Lời Bác dạy — tuần từ 2026-09-21');
 assert.ok(w.mail[0].body.length>0);assert.ok(w.mail[0].htmlBody.length>0);assert.deepEqual(Object.keys(w.mail[0].inlineImages),[w.ctx.THU_TUAN_HERO_IMAGE_CID_]);
 const log=w.sheets['private-id|ThuTuan_NhatKyGui'];assert.equal(log.data[1][2],'THU_TUAN_TEST_OVERRIDE');assert.equal(log.data[1][6],'SENT');
 const again=w.ctx.xemTruocThuTuan();assert.equal(again.pending,0);assert.equal(again.alreadySent,1);assert.equal(w.ctx.guiThuTuan().sent,0);assert.equal(w.mail.length,1);
 assert.ok(!w.mail.some(m=>['live-one@example.test','live-two@example.test'].includes(m.to)));
});
test('TEST_MODE cannot install a trigger and trigger events cannot send',()=>{
 const w=world({enabled:true,testMode:true,testRecipientEmail:'qa@example.test',recipients:[{MaCB:'CB1',Email:'qa@example.test',TrangThai:'DangNhan'}]});
 assert.throws(()=>w.ctx.caiLichThuTuan(),/TEST_MODE_CANNOT_SCHEDULE/);assert.equal(w.created.length,0);
 assert.throws(()=>w.ctx.guiThuTuan({triggerUid:'fixture'}),/^Error: THU_TUAN_TRIGGER_ATTENTION:TEST_MODE_MANUAL_ONLY$/);assert.equal(w.mail.length,0);
});
test('a leftover test address or misspelled TEST_MODE fails closed before normal recipients can send',()=>{
 for(const options of [{testRecipientEmail:'qa@example.test'},{testMode:true,testRecipientEmail:'qa@example.test'}]){
  const w=world({enabled:true,content:[draft({})],recipients:[{MaCB:'CB1',Email:'live-one@example.test',TrangThai:'DangNhan'}],...options});
  w.setNow('2026-09-21T01:00:00Z');w.ctx.duyetNoiDungThuTuan('2026-09-21');
  if(options.testMode){w.props.THU_TUAN_TEST_MODE='TRUE';}
  assert.throws(()=>w.ctx.guiThuTuan(),/TEST_RECIPIENT_WITHOUT_TEST_MODE|INVALID_TEST_MODE/);assert.equal(w.mail.length,0);
  assert.throws(()=>w.ctx.caiLichThuTuan(),/TEST_RECIPIENT_WITHOUT_TEST_MODE|INVALID_TEST_MODE/);assert.equal(w.created.length,0);
 }
});
test('the reserved TEST_MODE recipient ID is invalid in normal recipient mode',()=>{
 const f=fixture();f.recipients[0].MaCB='THU_TUAN_TEST_OVERRIDE';assert.equal(f.run(false).status,'INVALID_RECIPIENT_LIST');assert.equal(f.sent.length,0);
});
test('header drift and unexpected extra columns are rejected',()=>{
 const w=world();w.sheets['content-id|LoiDay_NoiDung'].data[0][11]='BoiCanhX';assert.throws(()=>w.ctx.xemTruocThuTuan(),/INVALID_HEADERS/);
 const extra=world();extra.sheets['content-id|LoiDay_NoiDung'].data[0].push('Unexpected');assert.throws(()=>extra.ctx.xemTruocThuTuan(),/INVALID_HEADERS/);
});

// ---------- Email rendering ----------
test('mail: formal responsive layout, all approved sections, escaping, inline hero, optional NotebookLM and one private message per recipient',()=>{
 const w=world({content:[],recipients:[]});const adapter=w.ctx.thuTuanAdapter_({contentId:'content-id',privateId:'private-id',secret:SECRET});
 const content=contentRow({ChuDe:'<script>alert(1)</script>',NoiDungNguyenVan:'Lời Bác & <dạy>\ndòng 2',NguonTrich:'Nguồn & <sách> "chính" và \'nguyên văn\'',GoiYLienHe:'LEGACY_REFLECTION_SENTINEL',LienHeAnNinhDoiNgoai:'LEGACY_ANND_SENTINEL'});
 const digestBefore=w.ctx.thuTuanDigest_(content,SECRET);adapter.send({Email:'one@example.test'},content);
 const m=w.mail[0];assert.deepEqual(Object.keys(m).sort(),['body','htmlBody','inlineImages','subject','to']);assert.equal(m.to,'one@example.test');assert.doesNotMatch(m.subject,/[\r\n]/);
 assert.deepEqual(Object.keys(m.inlineImages),[w.ctx.THU_TUAN_HERO_IMAGE_CID_]);
 const hero=m.inlineImages[w.ctx.THU_TUAN_HERO_IMAGE_CID_];assert.equal(hero.mimeType,'image/jpeg');assert.equal(Buffer.from(hero.bytes).subarray(0,2).toString('hex'),'ffd8');assert.ok(hero.bytes.length<50000);
 let width=0,height=0;for(let i=2;i<hero.bytes.length-9;){if(hero.bytes[i++]!==0xff)continue;const marker=hero.bytes[i++];if(marker===0xd8||marker===0xd9||marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;const size=(hero.bytes[i]<<8)|hero.bytes[i+1];if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){height=(hero.bytes[i+3]<<8)|hero.bytes[i+4];width=(hero.bytes[i+5]<<8)|hero.bytes[i+6];break;}i+=size;}
 assert.equal(width,1280);assert.equal(height,427);
 const imageTag=(m.htmlBody.match(/<img\b[^>]*>/i)||[])[0]||'';assert.ok(imageTag);assert.match(imageTag,/src="cid:loi-bac-hero"/);assert.match(imageTag,/alt="Minh họa chân dung Chủ tịch Hồ Chí Minh"/);assert.match(imageTag,/width:100%/);assert.match(imageTag,/height:auto/);assert.doesNotMatch(imageTag,/https?:\/\//i);
 assert.match(m.htmlBody,/THƯ TUẦN – LỜI BÁC DẠY/);assert.match(m.htmlBody,/Học tập – Liên hệ – Hành động/);assert.match(m.htmlBody,/Tuần/);assert.match(m.htmlBody,/Chủ đề/);assert.match(m.htmlBody,/Mã lời dạy/);
 const labels=['Lời Bác dạy','Nguồn trích dẫn','Bối cảnh','Phân tích / ý nghĩa','Liên hệ với Công an nhân dân','Hành động tuần này'];
 let previous=-1;for(const label of labels){const p=m.htmlBody.indexOf(label);assert.ok(p>previous,'missing or out of order: '+label);previous=p;}
 assert.match(m.htmlBody,/name="viewport"/i);assert.match(m.htmlBody,/charset="utf-8"/i);assert.match(m.htmlBody,/max-width:640px/);assert.match(m.htmlBody,/font:15px\/1\.65 Arial,Helvetica,sans-serif/);assert.match(m.htmlBody,/overflow-wrap:anywhere/);
 assert.match(m.htmlBody,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);assert.doesNotMatch(m.htmlBody,/<script>/);assert.match(m.htmlBody,/Lời Bác &amp; &lt;dạy&gt;<br>dòng 2/);
 assert.match(m.htmlBody,/Nguồn &amp; &lt;sách&gt; &quot;chính&quot; và &#39;nguyên văn&#39;/);assert.doesNotMatch(m.htmlBody+m.body,/LEGACY_REFLECTION_SENTINEL|LEGACY_ANND_SENTINEL|An ninh đối ngoại|Gợi ý tự soi/);
 assert.match(m.htmlBody,/href="https:\/\/notebooklm\.google\.com\/notebook\/fixture-123"/);assert.match(m.htmlBody,/Tra cứu thêm trên NotebookLM/);assert.ok(m.htmlBody.indexOf('Nguồn trích dẫn')<m.htmlBody.indexOf('Tra cứu thêm trên NotebookLM'));
 assert.match(m.htmlBody,/không phải nguồn chính thức/);assert.match(m.body,/THƯ TUẦN – LỜI BÁC DẠY/);assert.match(m.body,/Học tập – Liên hệ – Hành động/);
 for(const value of ['Lời Bác & <dạy>\ndòng 2','Nguồn & <sách> "chính" và \'nguyên văn\'','Fixture context','Fixture analysis','Fixture CAND link','Fixture action'])assert.ok(m.body.includes(value),'plain text missing '+value);assert.doesNotMatch(m.body,/LEGACY_REFLECTION_SENTINEL|LEGACY_ANND_SENTINEL|An ninh đối ngoại|Gợi ý tự soi/);
 assert.match(m.body,/Tra cứu thêm trên NotebookLM/);assert.match(m.body,/đối chiếu nội dung với nguồn gốc trích dẫn/);
 assert.match(m.body,/Thư tuần “Lời Bác dạy” – nội dung đã được kiểm duyệt trước khi gửi\./);assert.match(m.body,/Muốn dừng nhận thư/);assert.match(m.htmlBody,/Thư tuần “Lời Bác dạy” – nội dung đã được kiểm duyệt trước khi gửi\./);assert.match(m.htmlBody,/Muốn dừng nhận thư/);
 assert.doesNotMatch(m.body+m.htmlBody,/one@example\.test|two@example\.test/);
 assert.equal(w.ctx.thuTuanDigest_(content,SECRET),digestBefore,'rendering must not change the approved HMAC payload');
 adapter.send({Email:'two@example.test'},contentRow({NotebookLM_URL:''}));
 assert.equal(w.mail.length,2);assert.equal(w.mail[1].to,'two@example.test');assert.ok(w.mail[1].inlineImages);assert.doesNotMatch(w.mail[1].htmlBody,/NotebookLM|href=/);assert.doesNotMatch(w.mail[1].body,/NotebookLM/);
});
test('mail: disabled or unavailable hero falls back to valid HTML and plain text without inline images',()=>{
 for(const unavailable of [false,true]){
  const w=world({content:[],recipients:[]});
  if(unavailable)w.ctx.Utilities.newBlob=()=>{throw Error('fixture image unavailable');};
  else w.ctx.THU_TUAN_HERO_IMAGE_ENABLED_=false;
  const adapter=w.ctx.thuTuanAdapter_({contentId:'content-id',privateId:'private-id',secret:SECRET});
  assert.doesNotThrow(()=>adapter.send({Email:'one@example.test'},contentRow()));
  const message=w.mail[0];assert.equal(message.to,'one@example.test');assert.equal(message.inlineImages,undefined);
  assert.match(message.htmlBody,/THƯ TUẦN – LỜI BÁC DẠY/);assert.match(message.htmlBody,/name="viewport"/i);assert.doesNotMatch(message.htmlBody,/<img\b|src="cid:/i);
  assert.match(message.body,/LỜI BÁC DẠY/);assert.match(message.body,/Fixture only/);
 }
});
test('runtime never calls AI, exposes no web endpoint, and network I/O belongs only to Zalo',()=>{
 for(const banned of [/generativelanguage|gemini|openai/i,/function\s+doGet|function\s+doPost/,/\bbcc\s*:|\bcc\s*:/i])assert.doesNotMatch(CODE,banned);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'services/thu-tuan/Code.gs'),'utf8'),/UrlFetchApp/);
});

// ---------- End-to-end through the real adapter and approval, on Sheets-like storage ----------
test('E2E: approve → preview → send → rerun sends nothing, with Sheets date coercion in play',()=>{
 const w=world({content:[draft({})],recipients:[{MaCB:'CB1',Email:'one@example.test',TrangThai:'DangNhan'},{MaCB:'CB2',Email:'two@example.test',TrangThai:'DangNhan'}]});
 w.setNow('2026-09-21T01:00:00.789Z');
 assert.equal(w.ctx.xemTruocThuTuan().reason,'NOT_APPROVED');
 const a=w.ctx.duyetNoiDungThuTuan('2026-09-21');assert.equal(a.status,'APPROVED');
 const row=w.sheets['content-id|LoiDay_NoiDung'].data[1];assert.equal(row[5],'DaDuyet');assert.equal(row[6],REVIEWER);assert.equal(row[7].getUTCMilliseconds(),0);assert.match(row[9],/^v3:[0-9a-f]{64}$/);
 const p=w.ctx.xemTruocThuTuan();assert.equal(p.status,'PREVIEW');assert.equal(p.pending,2);assert.equal(w.mail.length,0);assert.equal(w.sheets['private-id|ThuTuan_NhatKyGui'].data.length,1);
 const s=w.ctx.guiThuTuan();assert.equal(s.status,'COMPLETE');assert.equal(s.sent,2);assert.equal(w.mail.length,2);
 const log=w.sheets['private-id|ThuTuan_NhatKyGui'];assert.equal(log.data[1][1],'2026-09-21');assert.ok(log.formatCalls.every(c=>c[1]===1&&c[3]===7&&c[4]==='@'));
 const again=w.ctx.guiThuTuan();assert.equal(again.sent,0);assert.equal(again.alreadySent,2);assert.equal(w.mail.length,2);
 assert.ok(w.logs.every(l=>!l.includes('@example')&&!l.includes('Fixture')&&!l.includes(SECRET)));
});
test('E2E: without the plain-text guard the log would have lost its Ky, yet Khoa still blocks a resend',()=>{
 const w=world({content:[draft({})],recipients:[{MaCB:'CB1',Email:'one@example.test',TrangThai:'DangNhan'}]});w.setNow('2026-09-21T01:00:00Z');
 w.ctx.duyetNoiDungThuTuan('2026-09-21');w.ctx.guiThuTuan();
 const log=w.sheets['private-id|ThuTuan_NhatKyGui'];log.data[1][1]=new Date('2026-09-21T00:00:00+07:00');
 assert.equal(w.ctx.guiThuTuan().sent,0);assert.equal(w.mail.length,1);
});
test('approval: allow-list, Monday key, completeness, NotebookLM and missing current week all fail closed',()=>{
 const base={content:[draft({})],recipients:[]};
 assert.throws(()=>world({...base,actor:'intruder@example.test'}).ctx.duyetNoiDungThuTuan('2026-09-21'),/APPROVER_REQUIRED/);
 assert.throws(()=>world({...base,actor:''}).ctx.duyetNoiDungThuTuan('2026-09-21'),/APPROVER_REQUIRED/);
 assert.throws(()=>world({...base,approvers:''}).ctx.duyetNoiDungThuTuan('2026-09-21'),/APPROVER_REQUIRED/);
 for(const ky of ['2026-09-22','21/09/2026','',undefined])assert.throws(()=>world(base).ctx.duyetNoiDungThuTuan(ky),/INVALID_WEEK/);
 const missingCurrent=world(base);missingCurrent.setNow('2026-09-28T01:00:00Z');assert.throws(()=>missingCurrent.ctx.duyetKyThuTuan(),/INVALID_WEEK/);
 assert.throws(()=>world(base).ctx.duyetNoiDungThuTuan('2026-09-28'),/INVALID_WEEK/);
 assert.throws(()=>world({...base,secret:''}).ctx.duyetNoiDungThuTuan('2026-09-21'),/MISSING_APPROVAL_SECRET/);
 assert.throws(()=>world({content:[draft({NguonTrich:''})]}).ctx.duyetNoiDungThuTuan('2026-09-21'),/INCOMPLETE_CONTENT/);
 assert.throws(()=>world({content:[draft({PhienBan:''})]}).ctx.duyetNoiDungThuTuan('2026-09-21'),/INCOMPLETE_CONTENT/);
 assert.throws(()=>world({content:[draft({NotebookLM_URL:'https://evil.test'})]}).ctx.duyetNoiDungThuTuan('2026-09-21'),/INVALID_NOTEBOOKLM_URL/);
 const ok=world({content:[draft({NotebookLM_URL:''})]});ok.setNow('2026-09-20T01:00:00Z');assert.equal(ok.ctx.duyetNoiDungThuTuan('2026-09-21').status,'APPROVED');
});
test('editor approval can approve an explicit future week before its scheduled send without touching the current week',()=>{
 const w=world({enabled:false,content:[draft({Ky:'2026-09-28',NotebookLM_URL:''}),draft({Ky:'2026-10-05',NotebookLM_URL:''})]});w.setNow('2026-10-02T01:00:00Z');w.props.THU_TUAN_APPROVAL_WEEK='2026-10-05';
 const sheet=w.sheets['content-id|LoiDay_NoiDung'],currentBefore=JSON.stringify(sheet.data[1]);
 const result=w.ctx.duyetKyThuTuan();assert.equal(result.status,'APPROVED');assert.equal(result.key,'2026-10-05');assert.equal(JSON.stringify(sheet.data[1]),currentBefore);
 const future=w.ctx.thuTuanRows_(sheet,'LoiDay_NoiDung')[1];assert.equal(w.ctx.thuTuanApprovalProblem_(future,w.ctx.thuTuanDigest_(future,SECRET),[REVIEWER]),'');
 assert.equal(w.ctx.xemTruocThuTuan().reason,'NOT_APPROVED');assert.equal(w.mail.length,0);assert.equal(w.created.length,0);assert.equal(w.props.THU_TUAN_ENABLED,'false');
});
test('an invalid explicit approval week fails closed even when a valid current-week draft exists',()=>{
 for(const key of ['', ' ', 'YYYY-MM-DD', '2026-10-06', '2026-10-05 ', '2026-10-05']){
  const w=world({enabled:false,content:[draft({Ky:'2026-09-28'})]});w.setNow('2026-10-02T01:00:00Z');w.props.THU_TUAN_APPROVAL_WEEK=key;const before=JSON.stringify(w.sheets['content-id|LoiDay_NoiDung'].data);
  assert.throws(()=>w.ctx.duyetKyThuTuan(),/INVALID_WEEK/);assert.equal(JSON.stringify(w.sheets['content-id|LoiDay_NoiDung'].data),before);assert.equal(w.mail.length,0);
 }
});
test('explicit future-week approval keeps reviewer and duplicate-row gates',()=>{
 for(const [options,reason] of [[{actor:'intruder@example.test'},/APPROVER_REQUIRED/],[{content:[draft({Ky:'2026-10-05'}),draft({Ky:'2026-10-05'})]},/INVALID_WEEK/]]){
  const w=world({enabled:false,content:[draft({Ky:'2026-10-05'})],...options});w.setNow('2026-10-02T01:00:00Z');w.props.THU_TUAN_APPROVAL_WEEK='2026-10-05';const before=JSON.stringify(w.sheets['content-id|LoiDay_NoiDung'].data);
  assert.throws(()=>w.ctx.duyetKyThuTuan(),reason);assert.equal(JSON.stringify(w.sheets['content-id|LoiDay_NoiDung'].data),before);assert.equal(w.mail.length,0);assert.equal(w.created.length,0);
 }
});

test('editor approval selects only the Vietnam current week at the Monday boundary and verifies its stamp',()=>{
 for(const [now,key,index] of [['2026-09-20T16:59:59Z','2026-09-14',1],['2026-09-20T17:00:00Z','2026-09-21',2]]){
  const w=world({enabled:false,content:['2026-09-14','2026-09-21','2026-09-28'].map(Ky=>draft({Ky,NotebookLM_URL:''}))});w.setNow(now);
  const result=w.ctx.duyetKyThuTuan();assert.equal(result.status,'APPROVED');assert.equal(result.key,key);
  const rows=w.sheets['content-id|LoiDay_NoiDung'].data;
  for(let i=1;i<rows.length;i++){assert.equal(rows[i][5],i===index?'DaDuyet':'Nhap');assert.equal(rows[i][6],i===index?REVIEWER:'');assert.equal(!!rows[i][9],i===index);}
  const saved=w.ctx.thuTuanRows_(w.sheets['content-id|LoiDay_NoiDung'],'LoiDay_NoiDung')[index-1];
  assert.equal(w.ctx.thuTuanApprovalProblem_(saved,w.ctx.thuTuanDigest_(saved,SECRET),[REVIEWER]),'');
  assert.equal(w.props.THU_TUAN_ENABLED,'false');assert.equal(w.mail.length,0);assert.equal(w.created.length,0);assert.equal(w.sheets['private-id|ThuTuan_NhatKyGui'].data.length,1);
 }
});
test('editor approval keeps identity and completeness gates without writing or sending on rejection',()=>{
 for(const [options,reason] of [[{actor:'intruder@example.test'},/APPROVER_REQUIRED/],[{actor:''},/APPROVER_REQUIRED/],[{secret:''},/MISSING_APPROVAL_SECRET/],[{content:[draft({NguonTrich:''})]},/INCOMPLETE_CONTENT/]]){
  const w=world({enabled:false,content:[draft({})],...options});w.setNow('2026-09-21T01:00:00Z');const before=JSON.stringify(w.sheets['content-id|LoiDay_NoiDung'].data);
  assert.throws(()=>w.ctx.duyetKyThuTuan(),reason);assert.equal(JSON.stringify(w.sheets['content-id|LoiDay_NoiDung'].data),before);assert.equal(w.mail.length,0);assert.equal(w.created.length,0);
 }
});
test('editor approval rejects duplicate current-week rows without approving another week',()=>{
 const w=world({enabled:false,content:[draft({}),draft({}),draft({Ky:'2026-09-28'})]});w.setNow('2026-09-21T01:00:00Z');const before=JSON.stringify(w.sheets['content-id|LoiDay_NoiDung'].data);
 assert.throws(()=>w.ctx.duyetKyThuTuan(),/INVALID_WEEK/);assert.equal(JSON.stringify(w.sheets['content-id|LoiDay_NoiDung'].data),before);assert.equal(w.mail.length,0);
});

test('approval is verified by reading back; a stamp that does not survive Sheets is reported',()=>{
 const w=world({content:[draft({})]});w.setNow('2026-09-21T01:00:00Z');const sheet=w.sheets['content-id|LoiDay_NoiDung'];
 const orig=sheet.getRange;sheet.getRange=(r,c,nr,nc)=>{const g=orig(r,c,nr,nc);if(r===2&&c===6)return{...g,setValues:v=>g.setValues([[v[0][0],v[0][1],new Date(v[0][2].getTime()+3600e3),v[0][3],v[0][4]]])};return g;};
 assert.throws(()=>w.ctx.duyetNoiDungThuTuan('2026-09-21'),/APPROVAL_NOT_VERIFIED:STAMP_MISMATCH/);
 assert.equal(w.ctx.xemTruocThuTuan().reason,'STAMP_MISMATCH');
});
test('re-approving a week that already has send logs is refused before any write; a forged re-stamp still blocks sending',()=>{
 const w=world({content:[draft({})],recipients:[{MaCB:'CB1',Email:'one@example.test',TrangThai:'DangNhan'},{MaCB:'CB2',Email:'two@example.test',TrangThai:'TamDung'}]});
 w.setNow('2026-09-21T01:00:00Z');w.ctx.duyetNoiDungThuTuan('2026-09-21');w.ctx.guiThuTuan();
 const sheet=w.sheets['content-id|LoiDay_NoiDung'],before=JSON.stringify(sheet.data);
 w.setNow('2026-09-21T05:00:00Z');
 assert.throws(()=>w.ctx.duyetNoiDungThuTuan('2026-09-21'),/WEEK_HAS_DELIVERY_HISTORY/);
 assert.throws(()=>w.ctx.duyetKyThuTuan(),/WEEK_HAS_DELIVERY_HISTORY/);
 assert.equal(JSON.stringify(sheet.data),before);assert.equal(w.mail.length,1);
 // A stamp written outside the helper must still be caught by the send-time guard.
 const forged=w.ctx.thuTuanRows_(sheet,'LoiDay_NoiDung')[0];forged.NgayDuyet=new Date('2026-09-21T05:00:00Z');
 sheet.data[1][7]=forged.NgayDuyet;sheet.data[1][9]=w.ctx.thuTuanDigest_(forged,SECRET);
 w.sheets['private-id|ThuTuan_NguoiNhan'].data[2][2]='DangNhan';
 assert.equal(w.ctx.guiThuTuan().status,'CONTENT_CHANGED_DURING_WEEK');assert.equal(w.mail.length,1);
});
test('history guard: any Zalo log state of the week (also by Khoa when Ky became a date) refuses approval; other weeks stay approvable',()=>{
 for(const state of ['SENT','SENDING','UNKNOWN','PENDING','FAILED']){
  const w=zaloWorld({env:'PROD'});
  assert.equal(w.ctx.guiThuTuan().status,'COMPLETE');
  w.zaloLog.data[1][6]=state;w.zaloLog.data[1][1]=new Date('2026-09-21T00:00:00+07:00');
  const before=JSON.stringify(w.row),requests=w.requests.length;
  assert.throws(()=>w.ctx.duyetKyThuTuan(),/WEEK_HAS_DELIVERY_HISTORY/);
  w.props.THU_TUAN_APPROVAL_WEEK='2026-09-21';assert.throws(()=>w.ctx.duyetKyThuTuan(),/WEEK_HAS_DELIVERY_HISTORY/);
  assert.equal(JSON.stringify(w.row),before);assert.equal(w.requests.length,requests);
 }
 const w=zaloWorld({env:'PROD'});assert.equal(w.ctx.guiThuTuan().status,'COMPLETE');
 const sheet=w.sheets['prod-content-id|LoiDay_NoiDung'];
 sheet.data.push(w.H.LoiDay_NoiDung.map(h=>draft({Ky:'2026-09-28',NotebookLM_URL:'',BoiCanhZalo:'Short context',YNgiaVanDungZalo:'Meaning and application',HanhDongTuanNayZalo:'One action'})[h]??''));
 const logBefore=JSON.stringify(w.zaloLog.data);
 w.props.THU_TUAN_APPROVAL_WEEK='2026-09-28';const result=w.ctx.duyetKyThuTuan();
 assert.equal(result.status,'APPROVED');assert.equal(result.key,'2026-09-28');assert.equal(JSON.stringify(w.zaloLog.data),logBefore);
 assert.equal(w.ctx.xemTruocThuTuan().alreadySent,1);
});
test('runbook B: a week with history edited after sending stays blocked, refuses re-approval, and resumes only the eligible part once restored exactly',()=>{
 const w=world({content:[draft({})],recipients:[{MaCB:'CB1',Email:'one@example.test',TrangThai:'DangNhan'},{MaCB:'CB2',Email:'two@example.test',TrangThai:'DangNhan'}]});
 w.setNow('2026-09-21T01:00:00Z');w.ctx.duyetNoiDungThuTuan('2026-09-21');
 const log=w.sheets['private-id|ThuTuan_NhatKyGui'],sheet=w.sheets['content-id|LoiDay_NoiDung'];
 assert.equal(w.ctx.guiThuTuan().sent,2);log.data[2][6]='FAILED';
 const original=sheet.data[1].slice();sheet.data[1][2]='Edited after send';
 const blocked=w.ctx.guiThuTuan();assert.equal(blocked.status,'CONTENT_NOT_APPROVED');assert.equal(w.mail.length,2);
 assert.throws(()=>w.ctx.duyetKyThuTuan(),/WEEK_HAS_DELIVERY_HISTORY/);assert.equal(sheet.data[1][2],'Edited after send');
 sheet.data[1]=original;
 const preview=w.ctx.xemTruocThuTuan();assert.equal(preview.status,'PREVIEW');assert.equal(preview.pending,1);assert.equal(preview.alreadySent,1);assert.equal(preview.unknown,0);
 const resumed=w.ctx.guiThuTuan();assert.equal(resumed.status,'COMPLETE');assert.equal(resumed.sent,1);assert.equal(w.mail.length,3);assert.equal(w.mail[2].to,'two@example.test');
});
test('history guard fails closed when no delivery log sheet exists, without writing the stamp',()=>{
 const w=world({enabled:false,content:[draft({})]});delete w.sheets['private-id|ThuTuan_NhatKyGui'];
 w.setNow('2026-09-21T01:00:00Z');const before=JSON.stringify(w.sheets['content-id|LoiDay_NoiDung'].data);
 assert.throws(()=>w.ctx.duyetKyThuTuan(),/MISSING_SHEET/);
 assert.equal(JSON.stringify(w.sheets['content-id|LoiDay_NoiDung'].data),before);
});

// ---------- Triggers and key ----------
test('trigger: requires enabled, is idempotent per account, Monday 07:00 Asia/Ho_Chi_Minh, and can be removed',()=>{
 assert.throws(()=>world({enabled:false}).ctx.caiLichThuTuan(),/ENABLE_AFTER_APPROVAL/);
 const w=world();assert.equal(w.ctx.caiLichThuTuan().status,'CREATED');assert.deepEqual(w.created,[{tz:'Asia/Ho_Chi_Minh',day:'MONDAY',hour:7,every:1}]);
 const mine={getHandlerFunction:()=>'guiThuTuan'},other={getHandlerFunction:()=>'somethingElse'};
 const x=world({triggers:[mine,other]});assert.equal(x.ctx.caiLichThuTuan().status,'EXISTS');assert.equal(x.created.length,0);
 assert.deepEqual({...x.ctx.kiemTraLichThuTuan()},{enabled:true,triggersOfThisAccount:1});
 assert.equal(x.ctx.goLichThuTuan().count,1);assert.deepEqual(x.deleted,[mine]);
});
test('approval key is created once, never overwritten and never logged',()=>{
 const w=world({secret:''});assert.equal(w.ctx.taoKhoaDuyetThuTuan().status,'CREATED');const k=w.props.THU_TUAN_APPROVAL_SECRET;assert.ok(k.length>=64);
 assert.equal(w.ctx.taoKhoaDuyetThuTuan().status,'EXISTS');assert.equal(w.props.THU_TUAN_APPROVAL_SECRET,k);assert.ok(w.logs.every(l=>!l.includes(k)));
});
test('manifest pins Asia/Ho_Chi_Minh, V8 and only the scopes the module needs',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'services/thu-tuan/appsscript.json'),'utf8'));
 assert.equal(m.timeZone,'Asia/Ho_Chi_Minh');assert.equal(m.runtimeVersion,'V8');assert.equal(m.webapp,undefined);
 assert.deepEqual(m.oauthScopes.slice().sort(),['https://www.googleapis.com/auth/script.external_request','https://www.googleapis.com/auth/script.scriptapp','https://www.googleapis.com/auth/script.send_mail','https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/userinfo.email']);
});

// ---------- Corpus import tool ----------
const tool=require(path.join(root,'services/thu-tuan/tools/corpus-to-sheet.cjs'));
const MD=`# Fixture corpus\n\n## Tuần 01 — Chủ đề A\n\n**LD-901 · TAG**\n\n> Dòng một\n> dòng hai\n\n**Nguồn:** Tác phẩm giả; Tập 1, tr. 2\n\n**Bối cảnh:** BC\n\n**Phân tích:** PT, có "ngoặc"\n\n**Liên hệ CAND:** CAND\n\n**Liên hệ An ninh đối ngoại — phản gián:** ANĐN\n\n**Hành động tuần này:** HĐ\n\n## Tuần 02 — Chủ đề B\n\n**LD-902 · TAG**\n\n> Trích B\n\n**Nguồn:** Tác phẩm giả; Tập 3, tr. 4\n\n**Bối cảnh:** BC2\n\n**Phân tích:** PT2\n\n**Liên hệ CAND:** C2\n\n**Liên hệ An ninh đối ngoại — phản gián:** A2\n\n**Hành động tuần này:** H2\n`;
test('corpus tool: parses weeks into the approved structure and exports drafts only',()=>{
 const {weeks,errors}=tool.parseCorpus(MD);assert.deepEqual(errors,[]);assert.equal(weeks.length,2);
 assert.deepEqual({...weeks[0]},{tuan:1,ChuDe:'Chủ đề A',MaLoiDay:'LD-901',NoiDungNguyenVan:'Dòng một\ndòng hai',NguonTrich:'Tác phẩm giả; Tập 1, tr. 2',BoiCanh:'BC',PhanTich:'PT, có "ngoặc"',LienHeCAND:'CAND',HanhDongTuanNay:'HĐ'});
 assert.deepEqual(tool.auditWeeks(weeks,2),[]);
 const headers=tool.loadHeaders();assert.deepEqual(headers,[...weekly().THU_TUAN_HEADERS.LoiDay_NoiDung]);
 const rows=tool.buildRows(weeks,'2026-10-05',{headers});const obj=rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
 assert.deepEqual(obj.map(o=>o.Ky),['2026-10-05','2026-10-12']);
 for(const o of obj){assert.equal(o.TrangThai,'Nhap');assert.equal(o.NguoiDuyet,'');assert.equal(o.NgayDuyet,'');assert.equal(o.DauVanBanDuyet,'');assert.equal(o.NotebookLM_URL,'');assert.equal(o.GoiYLienHe,'');assert.equal(o.LienHeAnNinhDoiNgoai,'');}
 const csv=tool.toCsv(headers,rows);assert.ok(csv.startsWith('﻿Ky,MaLoiDay'));assert.match(csv,/"Dòng một\ndòng hai"/);assert.match(csv,/"PT, có ""ngoặc"""/);
 assert.throws(()=>tool.toCsv(['a'],[['=HYPERLINK("x")']]),/FORMULA/);
});
test('corpus tool: reports gaps, duplicates and bad dates instead of inventing content',()=>{
 const broken=MD.replace('**Bối cảnh:** BC2\n','').replace('LD-902','LD-901').replace('Tuần 02','Tuần 03');
 const {weeks}=tool.parseCorpus(broken);const codes=tool.auditWeeks(weeks,3).map(i=>i.code).sort();
 assert.deepEqual(codes,['COUNT_MISMATCH','DUPLICATE_CODE','MISSING_FIELD','MISSING_WEEK']);
 assert.throws(()=>tool.mondayKeys('2026-10-06',1),/MONDAY/);assert.throws(()=>tool.mondayKeys('2026-02-30',1),/INVALID/);
 assert.equal(tool.isInside(path.join(root,'x.csv'),root),true);assert.equal(tool.isInside(path.join(os.tmpdir(),'x.csv'),root),false);
});

// ---------- Zalo renderer and Unicode ----------
test('Zalo sends exactly the shared approved text, preserving markup, URLs, spacing and legacy exclusion',()=>{
 const w=zaloWorld({contentOverrides:{NoiDungNguyenVan:'  **Nguyên văn** <b>giữ</b> 👩🏽‍🚒\r\nDòng 2  ',PhanTich:'https://example.test/a_b?q=*x*'}});
 const expected=w.ctx.thuTuanRenderText_(w.ctx.thuTuanRows_(w.sheets['content-id|LoiDay_NoiDung'],'LoiDay_NoiDung')[0]);
 assert.equal(w.ctx.guiThuTuan().status,'COMPLETE');
 assert.equal(w.sendRequests.map(x=>x.payload.text).join(''),expected);
 assert.ok(expected.includes('  **Nguyên văn** <b>giữ</b> 👩🏽‍🚒\r\nDòng 2  '));
 assert.doesNotMatch(expected,/LEGACY_/);
 for(const request of w.sendRequests){assert.deepEqual(Object.keys(request.payload).sort(),['chat_id','text']);assert.ok(request.payload.text.length<=1800);}
 assert.equal(w.requests[0].method,'getMe');assert.equal(w.requests[0].options.method,'post');
 assert.equal(w.requests[0].options.followRedirects,false);assert.equal(w.requests[0].options.validateHttpsCertificates,true);
});
test('split supports 1, 2 or 3 exact parts and rejects a fourth without truncation',()=>{
 const ctx=weekly();
 for(const size of [1,1799,1800,1801,3600,3601,5400]){
  const source='x'.repeat(size),parts=[...ctx.thuTuanZaloSplit_(source)];
  assert.equal(parts.join(''),source);assert.equal(parts.length,Math.ceil(size/1800));assert.ok(parts.every(x=>x.length<=1800));
 }
 for(const source of ['',null,'x'.repeat(5401),'a\uD800','\uDC00'])assert.throws(()=>ctx.thuTuanZaloSplit_(source),/ZALO_/);
});
test('splitting never breaks emoji, combining marks, flags, keycaps, variation selectors or CRLF (including GAS fallback)',()=>{
 for(const useFallback of [false,true]){
  const ctx=weekly(useFallback?{Intl:{}}:{});
  for(const cluster of ['😀','👩🏽‍🚒','👨‍👩‍👧‍👦','🇻🇳','1️⃣','a\u0301','✈️','\r\n','🏴\u{E0067}\u{E0062}\u{E007F}']){
   for(const offset of [1799,1798,1800]){
    const text='x'.repeat(offset)+cluster+'z'.repeat(50),parts=[...ctx.thuTuanZaloSplit_(text)];
    assert.equal(parts.join(''),text);assert.ok(parts.some(part=>part.includes(cluster)),JSON.stringify(cluster));
    assert.ok(parts.every(part=>part.length<=1800));
   }
  }
  assert.throws(()=>ctx.thuTuanZaloSplit_('a'+'\u0301'.repeat(1800)),/ZALO_TEXT_TOO_LONG/);
 }
});
test('oversized approved content fails before preflight, writes, Gmail or Zalo delivery',()=>{
 const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(5400)}});
 assert.equal(w.ctx.guiThuTuan().reason,'ZALO_TEXT_TOO_LONG');assert.equal(w.requests.length,0);assert.equal(w.zaloLog.data.length,1);
});
test('preview and disabled sends are entirely offline and never write Zalo logs',()=>{
 const w=zaloWorld({enabled:false});w.ctx.UrlFetchApp=noIO;
 const p=w.ctx.xemTruocThuTuan();assert.equal(p.status,'PREVIEW');assert.equal(p.transport,'ZALO');assert.equal(p.environment,'TEST');assert.equal(p.quota,null);
 assert.equal(w.ctx.guiThuTuan().status,'DISABLED');assert.equal(w.zaloLog.data.length,1);
});

// ---------- Strict response confirmation and stop policy ----------
test('every uncertain send response produces UNKNOWN, stops later parts and is never automatically retried',()=>{
 const cases=[{ok:false,description:'sensitive'}, {},{ok:'true',result:{message_id:'bad'}},{ok:true},{ok:true,result:{}},
  {ok:true,result:{message_id:''}},{ok:true,result:{message_id:123}},{ok:true,result:{message_id:'unsafe\nreceipt'}},
  {ok:true,result:{message_id:'valid'},http:302},{ok:true,result:{message_id:'valid'},http:500},
  {ok:false,error_code:408},{ok:false,error_code:429},{http:408},{http:429},{http:403},
  {ok:true,result:{message_id:'valid'},http:'200'},
  {ok:true,result:{message_id:'synthetic-token-TEST'}},{ok:true,result:{message_id:'echo-synthetic-chat-TEST'}},
  '<html>private error</html>',new Error('timeout token URL and full chat')];
 for(const failure of cases){
  const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)},response:({method,standard})=>method==='getMe'?standard:failure});
  const result=w.ctx.guiThuTuan();assert.equal(result.status,'RECONCILIATION_REQUIRED',JSON.stringify(failure));assert.equal(result.sent,0);assert.equal(result.unknown,1);
  assert.equal(w.sendRequests.length,1);assert.equal(w.zaloEntries()[0].TrangThai,'UNKNOWN');assert.equal(w.zaloEntries()[0].MaLoi,'SEND_OR_LOG_UNCERTAIN');
  assert.equal(w.ctx.guiThuTuan().status,'RECONCILIATION_REQUIRED');assert.equal(w.sendRequests.length,1);
  assert.equal(w.requests.length,2); // getMe + one send; rerun does not even preflight.
 }
});
test('successful API receipts are persisted per part and reruns perform no fetch or send',()=>{
 const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)}});
 const result=w.ctx.guiThuTuan();assert.equal(result.status,'COMPLETE');assert.equal(result.sent,3);
 const entries=w.zaloEntries();assert.equal(entries.length,3);
 assert.deepEqual(entries.map(x=>x.Part),[1,2,3]);assert.deepEqual(entries.map(x=>x.MessageId),['receipt-1','receipt-2','receipt-3']);
 assert.ok(entries.every(x=>x.TrangThai==='SENT'&&x.PartCount===3&&x.PlanHash===entries[0].PlanHash));
 const again=w.ctx.guiThuTuan();assert.equal(again.sent,0);assert.equal(again.alreadySent,3);assert.equal(w.requests.length,4);
});
test('a timeout after confirmed part 1 holds part 2 UNKNOWN and never sends part 3',()=>{
 const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)},response:({w,method,standard})=>method==='sendMessage'&&w.sendRequests.length===2?new Error('timeout'):standard});
 assert.equal(w.ctx.guiThuTuan().sent,1);assert.deepEqual(w.zaloEntries().map(x=>x.TrangThai),['SENT','UNKNOWN']);
 assert.equal(w.ctx.guiThuTuan().status,'RECONCILIATION_REQUIRED');assert.equal(w.sendRequests.length,2);
});
test('SENDING is durably flushed before calling Zalo; a failed initial write prevents the API request',()=>{
 const w=zaloWorld({response:({w,method,standard})=>{
  if(method==='sendMessage')assert.equal(w.zaloEntries().at(-1).TrangThai,'SENDING');return standard;
 }});
 assert.equal(w.ctx.guiThuTuan().status,'COMPLETE');
 const failed=zaloWorld();failed.ctx.SpreadsheetApp.flush=()=>{throw Error('private spreadsheet failure');};
 const blocked=failed.ctx.guiThuTuan();assert.equal(blocked.status,'RECONCILIATION_REQUIRED');assert.equal(blocked.reason,'PRE_SEND_LOG_UNCONFIRMED');assert.equal(blocked.attempted,0);assert.equal(failed.sendRequests.length,0);
 assert.equal(failed.ctx.guiThuTuan().status,'RECONCILIATION_REQUIRED');assert.equal(failed.sendRequests.length,0);
});
test('confirmed delivery with a failed SENT write is UNKNOWN; failed UNKNOWN write preserves SENDING',()=>{
 for(const failUnknown of [false,true]){
  const w=zaloWorld(),getRange=w.zaloLog.getRange;
  w.zaloLog.getRange=(...args)=>{const range=getRange(...args);return {...range,setValues:values=>{
   if(values[0][6]==='SENT'||(failUnknown&&values[0][6]==='UNKNOWN'))throw Error('private write error');range.setValues(values);
  }};};
  assert.equal(w.ctx.guiThuTuan().status,'RECONCILIATION_REQUIRED');assert.equal(w.zaloEntries()[0].TrangThai,failUnknown?'SENDING':'UNKNOWN');
  assert.equal(w.ctx.guiThuTuan().status,'RECONCILIATION_REQUIRED');assert.equal(w.sendRequests.length,1);
 }
});
test('operator-confirmed non-delivery resumes only the unresolved part; confirmed earlier parts are not repeated',()=>{
 const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)},response:({w,method,standard})=>method==='sendMessage'&&w.sendRequests.length===2?new Error('timeout'):standard});
 w.ctx.guiThuTuan();w.zaloLog.data[2][6]='PENDING';
 const resumed=w.ctx.guiThuTuan();assert.equal(resumed.status,'COMPLETE');assert.equal(resumed.alreadySent,1);assert.equal(resumed.sent,2);
 assert.equal(w.sendRequests.filter(x=>x.payload.text===w.sendRequests[0].payload.text).length,1);
});
test('lost execution, invalid status or an unresolved removed target never allows pending parts to continue',()=>{
 for(const status of ['SENDING','UNKNOWN','','Sent']){
  const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)}});w.ctx.guiThuTuan();w.zaloLog.data[1][6]=status;
  assert.equal(w.ctx.guiThuTuan().status,'RECONCILIATION_REQUIRED');assert.equal(w.sendRequests.length,3);
 }
});
test('duplicate rows, part gaps, wrong environment/target/plan and forged SENT without receipt fail closed',()=>{
 for(const mutate of [
  w=>w.zaloLog.data.push(w.zaloLog.data[1].slice()),w=>w.zaloLog.data.splice(1,1),
  w=>w.zaloLog.data[1][10]='PROD',w=>w.zaloLog.data[1][11]='0'.repeat(64),w=>w.zaloLog.data[1][14]='0'.repeat(64),
  w=>w.zaloLog.data[1][12]=0,w=>w.zaloLog.data[1][13]=2,w=>w.zaloLog.data[1][15]='',w=>w.zaloLog.data[1][0]='garbled'
 ]){
  const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)}});w.ctx.guiThuTuan();mutate(w);
  assert.equal(w.ctx.guiThuTuan().status,'DUPLICATE_OR_INVALID_LOG');assert.equal(w.sendRequests.length,3);
 }
});
test('renderer changes and target changes cannot create a second plan for the same week',()=>{
 const w=zaloWorld();w.ctx.guiThuTuan();w.ctx.THU_TUAN_NOTEBOOK_NOTE+='changed';
 // Optional NotebookLM is absent, so alter an actually rendered label by wrapping the renderer.
 const render=w.ctx.thuTuanRenderText_;w.ctx.thuTuanRenderText_=content=>render(content)+' new footer';
 assert.equal(w.ctx.guiThuTuan().status,'DUPLICATE_OR_INVALID_LOG');assert.equal(w.sendRequests.length,1);
 const x=zaloWorld();x.ctx.guiThuTuan();x.props.THU_TUAN_ZALO_TEST_CHAT_ID='another-chat';x.props.THU_TUAN_ZALO_TEST_CHAT_SHA256=crypto.createHash('sha256').update('another-chat').digest('hex');
 assert.equal(x.ctx.guiThuTuan().status,'DUPLICATE_OR_INVALID_LOG');assert.equal(x.sendRequests.length,1);
});

// ---------- Preflight and environment isolation ----------
test('getMe mismatch, unavailable groups, malformed success, HTTP failure and timeout block all sends and log writes',()=>{
 const cases=[{ok:true,result:{id:'another-bot',can_join_groups:true}},{ok:true,result:{id:123,can_join_groups:true}},
  {ok:true,result:{id:'bot-TEST',can_join_groups:false}},{ok:true,result:{id:'bot-TEST',can_join_groups:'true'}},
  {ok:true,result:{id:'bot-TEST'}},{ok:false},{ok:'true',result:{}},{ok:true,result:[]},'invalid',new Error('sensitive timeout'),{http:401}];
 for(const body of cases){
  const w=zaloWorld({response:()=>body});const result=w.ctx.guiThuTuan();assert.match(result.status,/^ZALO_(PREFLIGHT_UNCONFIRMED|BOT_MISMATCH|GROUP_UNAVAILABLE)$/);
  assert.equal(w.requests.length,1);assert.equal(w.sendRequests.length,0);assert.equal(w.zaloLog.data.length,1);
 }
});
test('explicit preflight performs only getMe even while disabled and never sends or writes',()=>{
 const w=zaloWorld({enabled:false});assert.equal(w.ctx.kiemTraZaloThuTuan().status,'OK');
 assert.equal(w.requests.length,1);assert.equal(w.sendRequests.length,0);assert.equal(w.zaloLog.data.length,1);
});
test('active environment binding is mandatory; a partial inactive profile and colliding complete profiles fail closed',()=>{
 const required=['SCRIPT_ID','CONTENT_SHEET_ID','PRIVATE_SHEET_ID','BOT_ID','CHAT_SHA256'];
 for(const env of ['TEST','PROD'])for(const key of required){
  const w=zaloWorld({env});delete w.props['THU_TUAN_ZALO_'+env+'_'+key];assert.equal(w.ctx.guiThuTuan().reason,'ZALO_ISOLATION_REQUIRED');assert.equal(w.requests.length,0);
 }
 for(const env of ['TEST','PROD']){
  const inactive=env==='TEST'?'PROD':'TEST', prefix='THU_TUAN_ZALO_'+inactive+'_';
  const partial=zaloWorld({env});delete partial.props[prefix+'BOT_ID'];
  assert.equal(partial.ctx.guiThuTuan().reason,'ZALO_ISOLATION_REQUIRED');assert.equal(partial.requests.length,0);
 }
 for(const key of ['SCRIPT_ID','BOT_ID','CHAT_SHA256']){
  const w=zaloWorld();w.props['THU_TUAN_ZALO_PROD_'+key]=w.props['THU_TUAN_ZALO_TEST_'+key];assert.equal(w.ctx.guiThuTuan().reason,'ZALO_ISOLATION_REQUIRED');assert.equal(w.requests.length,0);
 }
 const w=zaloWorld();w.props.THU_TUAN_ZALO_PROD_PRIVATE_SHEET_ID='content-id';assert.equal(w.ctx.guiThuTuan().reason,'ZALO_ISOLATION_REQUIRED');assert.equal(w.requests.length,0);
});
test('TEST-only and PROD-only deployments can preflight without inventing an opposite-environment profile',()=>{
 for(const env of ['TEST','PROD']){
  const w=zaloWorld({env}), inactive=env==='TEST'?'PROD':'TEST', prefix='THU_TUAN_ZALO_'+inactive+'_';
  Object.keys(w.props).filter(key=>key.startsWith(prefix)).forEach(key=>delete w.props[key]);
  assert.equal(w.ctx.kiemTraZaloThuTuan().status,'OK');
  assert.equal(w.requests.length,1);assert.equal(w.requests[0].method,'getMe');assert.equal(w.sendRequests.length,0);
  w.props.THU_TUAN_ZALO_ENV=inactive;w.props.THU_TUAN_TEST_MODE=String(inactive==='TEST');
  assert.equal(w.ctx.kiemTraZaloThuTuan().reason,'ZALO_ISOLATION_REQUIRED');assert.equal(w.sendRequests.length,0);
 }
});
test('TEST and PROD swaps in mode, script, sheet, Bot and chat cannot send to the other environment',()=>{
 for(const env of ['TEST','PROD']){
  const other=env==='TEST'?'PROD':'TEST';
  const isolated=zaloWorld({env});
  assert.equal(isolated.ctx.guiThuTuan().status,'COMPLETE');
  assert.ok(isolated.sendRequests.every(request=>request.payload.chat_id==='synthetic-chat-'+env));
  assert.ok(isolated.requests.every(request=>request.url.includes('/botsynthetic-token-'+env+'/')));
  assert.equal(isolated.props['THU_TUAN_ZALO_'+other+'_BOT_TOKEN'],undefined);
  for(const mutate of [
   w=>w.props.THU_TUAN_ZALO_ENV=other,w=>w.props.THU_TUAN_TEST_MODE=String(env!=='TEST'),
   w=>w.ctx.ScriptApp.getScriptId=()=> 'script-'+other,w=>w.props.THU_TUAN_PRIVATE_SHEET_ID=w.props['THU_TUAN_ZALO_'+other+'_PRIVATE_SHEET_ID'],
   w=>w.props['THU_TUAN_ZALO_'+env+'_CHAT_ID']='synthetic-chat-'+other
  ]){
   const w=zaloWorld({env});mutate(w);assert.equal(w.ctx.guiThuTuan().reason,'ZALO_ISOLATION_REQUIRED');assert.equal(w.requests.length,0);
  }
  const w=zaloWorld({env,response:({method,standard})=>method==='getMe'?{ok:true,result:{id:'bot-'+other,can_join_groups:true}}:standard});
  assert.equal(w.ctx.guiThuTuan().status,'ZALO_BOT_MISMATCH');assert.equal(w.sendRequests.length,0);
 }
});
test('missing token, invalid token URL segments, missing target and absent group confirmation block preflight',()=>{
 for(const [field,value,reason] of [
  ['BOT_TOKEN','','ZALO_TOKEN_REQUIRED'],['BOT_TOKEN','abc/evil?token','ZALO_TOKEN_REQUIRED'],['BOT_TOKEN',' token123 ','ZALO_TOKEN_REQUIRED'],
  ['CHAT_ID','','ZALO_TARGET_REQUIRED'],['CHAT_ID','chat\nprivate','ZALO_TARGET_REQUIRED'],['GROUP_CONFIRMED','TRUE','ZALO_GROUP_CONFIRMATION_REQUIRED']
 ]){
  const w=zaloWorld();w.props['THU_TUAN_ZALO_TEST_'+field]=value;
  assert.equal(w.ctx.guiThuTuan().reason,reason);assert.equal(w.requests.length,0);assert.equal(w.ctx.kiemTraZaloThuTuan().reason,reason);
 }
});
test('TEST Zalo cannot schedule or send from trigger events; manual sending still requires ENABLED',()=>{
 const w=zaloWorld();assert.throws(()=>w.ctx.caiLichThuTuan(),/TEST_MODE_CANNOT_SCHEDULE/);
 assert.throws(()=>w.ctx.guiThuTuan({triggerUid:'synthetic'}),/THU_TUAN_TRIGGER_ATTENTION:TEST_MODE_MANUAL_ONLY/);assert.equal(w.requests.length,0);
 w.props.THU_TUAN_ENABLED='false';assert.equal(w.ctx.guiThuTuan().status,'DISABLED');assert.equal(w.requests.length,0);
});
test('Zalo preserves approval, HMAC and lock gates',()=>{
 for(const mutation of [w=>w.row[2]+='edit',w=>w.props.THU_TUAN_APPROVER_EMAILS='',w=>w.row[5]='Nhap']){
  const w=zaloWorld();mutation(w);assert.equal(w.ctx.guiThuTuan().status,'CONTENT_NOT_APPROVED');assert.equal(w.requests.length,0);assert.equal(w.zaloLog.data.length,1);
 }
 const w=zaloWorld();w.ctx.LockService={getScriptLock:()=>({tryLock:()=>false,releaseLock(){throw Error('not acquired');}})};
 assert.equal(w.ctx.guiThuTuan().status,'BUSY');assert.equal(w.requests.length,0);
});
test('canonical edits or approval withdrawal between parts stop later deliveries',()=>{
 for(const mutate of [w=>w.row[2]+='changed',w=>w.row[5]='Nhap']){
  const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)},response:({w,method,standard})=>{if(method==='sendMessage'&&w.sendRequests.length===1)mutate(w);return standard;}});
  assert.equal(w.ctx.guiThuTuan().status,'CONTENT_CHANGED_DURING_WEEK');assert.equal(w.sendRequests.length,1);
 }
});
test('configuration changes during preflight or between parts stop before using a stale destination/token',()=>{
 for(const phase of ['getMe','sendMessage'])for(const mutate of [
  w=>w.props.THU_TUAN_ZALO_TEST_CHAT_ID='another-chat',w=>w.props.THU_TUAN_ZALO_TEST_BOT_TOKEN='another-token',
  w=>w.props.THU_TUAN_ENABLED='false',w=>w.props.THU_TUAN_TRANSPORT='GMAIL',w=>w.props.THU_TUAN_APPROVER_EMAILS=''
 ]){
  const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)},response:({w,method,standard})=>{if(method===phase&&(phase==='getMe'||w.sendRequests.length===1))mutate(w);return standard;}});
  const r=w.ctx.guiThuTuan();assert.equal(r.status,'ZALO_CONFIG_CHANGED');assert.equal(r.sent,phase==='getMe'?0:1);assert.equal(w.sendRequests.length,phase==='getMe'?0:1);
 }
});
test('time budget defers unsent parts and the next manual run skips all confirmed parts',()=>{
 const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)},response:({w,method,standard})=>{if(method==='sendMessage'&&w.sendRequests.length===1)w.setNow('2026-09-21T01:05:00Z');return standard;}});
 assert.equal(w.ctx.guiThuTuan().status,'DEFERRED');assert.equal(w.sendRequests.length,1);
 assert.equal(w.ctx.guiThuTuan().status,'COMPLETE');assert.equal(w.sendRequests.length,3);
});
test('transport switching during an active week never invokes Gmail fallback or duplicates Zalo',()=>{
 const w=zaloWorld();w.ctx.guiThuTuan();w.props.THU_TUAN_TRANSPORT='GMAIL';w.props.THU_TUAN_TEST_RECIPIENT_EMAIL='one@example.test';
 w.ctx.MailApp=noIO;
 assert.equal(w.ctx.guiThuTuan().status,'TRANSPORT_CHANGED_DURING_WEEK');assert.equal(w.sendRequests.length,1);
 const x=zaloWorld();const mailLog=x.sheets['private-id|ThuTuan_NhatKyGui'];
 mailLog.data.push(['2026-09-21|CB1','2026-09-21','CB1','LD-TEST-1','1',x.row[9],'UNKNOWN',new Date(),'']);
 assert.equal(x.ctx.guiThuTuan().status,'TRANSPORT_CHANGED_DURING_WEEK');assert.equal(x.requests.length,0);
});
test('Gmail remains the default and malformed transport settings fail closed without a send',()=>{
 const w=world({content:[draft({})],recipients:[{MaCB:'CB1',Email:'one@example.test',TrangThai:'DangNhan'}]});
 w.setNow('2026-09-21T01:00:00Z');w.ctx.duyetNoiDungThuTuan('2026-09-21');w.ctx.UrlFetchApp=noIO;
 assert.equal(w.ctx.thuTuanConfig_().transport,'GMAIL');assert.equal(w.ctx.guiThuTuan().status,'COMPLETE');assert.equal(w.mail.length,1);
 for(const value of ['zalo',' ZALO','GMAIL ','unknown']){w.props.THU_TUAN_TRANSPORT=value;assert.throws(()=>w.ctx.guiThuTuan(),/INVALID_TRANSPORT/);assert.equal(w.mail.length,1);}
});
test('Zalo log, runner output and error reporting contain no token, chat ID, URL, raw error or body',()=>{
 const sensitive='https://bot-api.zaloplatforms.com/botsynthetic-token-TEST/sendMessage synthetic-chat-TEST PRIVATE_ERROR_DETAILS';
 for(const failure of [new Error(sensitive),{ok:false,description:sensitive},sensitive]){
  const w=zaloWorld({response:({method,standard})=>method==='getMe'?standard:failure});
  const result=w.ctx.guiThuTuan(),stored=JSON.stringify([result,w.logs,w.zaloEntries()]);
  for(const value of ['synthetic-token-TEST','synthetic-chat-TEST','PRIVATE_ERROR_DETAILS','bot-api.zaloplatforms.com','Fixture'])assert.equal(stored.includes(value),false,value);
 }
 const w=zaloWorld();w.ctx.SpreadsheetApp.openById=()=>{throw Error(sensitive);};
 const result=w.ctx.guiThuTuan();assert.equal(result.reason,'ZALO_IO_BLOCKED');assert.equal(JSON.stringify(w.logs).includes(sensitive),false);
});
test('config or approval changed during the SENDING flush prevents the actual API send',()=>{
 for(const mutate of [w=>w.props.THU_TUAN_ZALO_TEST_CHAT_ID='another-chat',w=>w.row[2]+='edited',w=>w.row[5]='Nhap']){
  const w=zaloWorld();w.ctx.SpreadsheetApp.flush=()=>mutate(w);
  const r=w.ctx.guiThuTuan();assert.equal(r.status,'ZALO_PRE_SEND_BLOCKED');assert.equal(r.unknown,0);assert.equal(r.attempted,0);assert.equal(w.sendRequests.length,0);assert.equal(w.zaloEntries()[0].TrangThai,'FAILED');
 }
});

test('Zalo preserves prior delivery counts when a later SENDING write fails before the API',()=>{
 const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)}}),getRange=w.zaloLog.getRange;
 w.zaloLog.getRange=(...args)=>{const range=getRange(...args);return {...range,setValues(values){
  if(values[0][12]===2&&values[0][6]==='SENDING')throw Error('private log failure');range.setValues(values);
 }};};
 const r=w.ctx.guiThuTuan();assert.equal(r.status,'ZALO_PRE_SEND_BLOCKED');
 assert.equal(r.sent,1);assert.equal(r.confirmed,1);assert.equal(r.attempted,1);assert.equal(r.unknown,0);
 assert.deepEqual(w.zaloEntries().map(e=>e.TrangThai),['SENT','FAILED']);assert.equal(w.sendRequests.length,1);
});

test('a loop read failure after part one preserves counts and never reports a pre-send gate',()=>{
 const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)}}),adapter=w.ctx.thuTuanZaloAdapter_;
 w.ctx.thuTuanZaloAdapter_=cfg=>{const io=adapter(cfg),content=io.content;return {...io,content(){
  if(w.sendRequests.length)throw Error('private read failure');return content();
 }};};
 const r=w.ctx.guiThuTuan();assert.equal(r.status,'ZALO_RUN_BLOCKED');assert.equal(r.sent,1);
 assert.equal(r.confirmed,1);assert.equal(r.attempted,1);assert.equal(w.sendRequests.length,1);
 assert.equal(JSON.stringify([r,w.logs]).includes('private read failure'),false);
});

test('valid API receipt followed by failed SENT write reports receipt separately and cannot retry',()=>{
 const w=zaloWorld(),getRange=w.zaloLog.getRange;
 w.zaloLog.getRange=(...args)=>{const range=getRange(...args);return {...range,setValues(values){
  if(values[0][6]==='SENT')throw Error('private log failure');range.setValues(values);
 }};};
 const r=w.ctx.guiThuTuan();assert.equal(r.status,'RECONCILIATION_REQUIRED');assert.equal(r.sent,0);
 assert.equal(r.confirmed,1);assert.equal(r.attempted,1);assert.equal(r.unknown,1);
 assert.equal(w.ctx.guiThuTuan().attempted,0);assert.equal(w.sendRequests.length,1);
});

test('pre-send guard failure with an unconfirmed FAILED write holds the row without API invocation',()=>{
 const w=zaloWorld(),getRange=w.zaloLog.getRange;
 w.ctx.SpreadsheetApp.flush=()=>{w.props.THU_TUAN_ENABLED='false';};
 w.zaloLog.getRange=(...args)=>{const range=getRange(...args);return {...range,setValues(values){
  if(values[0][6]==='FAILED')throw Error('private log failure');range.setValues(values);
 }};};
 const r=w.ctx.guiThuTuan();assert.equal(r.status,'RECONCILIATION_REQUIRED');assert.equal(r.reason,'PRE_SEND_LOG_UNCONFIRMED');
 assert.equal(r.attempted,0);assert.equal(r.confirmed,0);assert.equal(w.zaloEntries()[0].TrangThai,'SENDING');assert.equal(w.sendRequests.length,0);
 w.props.THU_TUAN_ENABLED='true';assert.equal(w.ctx.guiThuTuan().status,'RECONCILIATION_REQUIRED');assert.equal(w.sendRequests.length,0);
});

test('a known non-send before a later SENT cannot replay multipart content out of order',()=>{
 for(const state of ['FAILED','PENDING']){
  const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)}});w.ctx.guiThuTuan();w.zaloLog.data[1][6]=state;
  assert.equal(w.ctx.guiThuTuan().status,'DUPLICATE_OR_INVALID_LOG');assert.equal(w.sendRequests.length,3);
 }
});

test('a guard blocking part two preserves part one and a later manual run resumes only unsent parts',()=>{
 const w=zaloWorld({contentOverrides:{PhanTich:'x'.repeat(4000)}});
 w.ctx.SpreadsheetApp.flush=()=>{if(w.zaloEntries().some(e=>e.Part===2&&e.TrangThai==='SENDING'))w.props.THU_TUAN_ENABLED='false';};
 const r=w.ctx.guiThuTuan();assert.equal(r.status,'ZALO_PRE_SEND_BLOCKED');assert.equal(r.sent,1);
 assert.equal(r.attempted,1);assert.equal(r.confirmed,1);assert.equal(r.unknown,0);
 w.ctx.SpreadsheetApp.flush=()=>{};w.props.THU_TUAN_ENABLED='true';
 const resumed=w.ctx.guiThuTuan();assert.equal(resumed.status,'COMPLETE');assert.equal(resumed.alreadySent,1);assert.equal(resumed.sent,2);
 assert.equal(w.sendRequests.length,3);assert.equal(w.sendRequests.filter(x=>x.payload.text===w.sendRequests[0].payload.text).length,1);
});

test('an unexpected error after API receipt remains held and keeps the receipt count',()=>{
 const w=zaloWorld(),adapter=w.ctx.thuTuanZaloAdapter_;
 w.ctx.thuTuanZaloAdapter_=cfg=>{const io=adapter(cfg),now=io.now;return {...io,now(){
  if(w.sendRequests.length)throw Error('private clock failure');return now();
 }};};
 const r=w.ctx.guiThuTuan();assert.equal(r.status,'RECONCILIATION_REQUIRED');assert.equal(r.sent,0);
 assert.equal(r.attempted,1);assert.equal(r.confirmed,1);assert.equal(r.unknown,1);assert.equal(w.zaloEntries()[0].TrangThai,'SENDING');
 w.ctx.thuTuanZaloAdapter_=adapter;
 assert.equal(w.ctx.guiThuTuan().status,'RECONCILIATION_REQUIRED');assert.equal(w.sendRequests.length,1);
});

test('configuration retains only active Zalo credentials and required isolation pins',()=>{
 for(const env of ['TEST','PROD']){
  const w=zaloWorld({env}),inactive=env==='TEST'?'PROD':'TEST';
  w.props.UNRELATED_SECRET='unrelated-secret';w.props['THU_TUAN_ZALO_'+inactive+'_BOT_TOKEN']='inactive-secret';
  w.props['THU_TUAN_ZALO_'+inactive+'_CHAT_ID']='inactive-chat';w.props.THU_TUAN_ZALO_TEST_ACCEPTANCE_PREVIEW='unrelated-seal';
  const cfg=w.ctx.thuTuanConfig_(),p=cfg.zaloProperties;
  assert.equal(p['THU_TUAN_ZALO_'+env+'_BOT_TOKEN'],'synthetic-token-'+env);
  assert.equal(p['THU_TUAN_ZALO_'+inactive+'_SCRIPT_ID'],'script-'+inactive);
  for(const key of ['UNRELATED_SECRET','THU_TUAN_APPROVAL_SECRET','THU_TUAN_ZALO_TEST_ACCEPTANCE_PREVIEW','THU_TUAN_ZALO_'+inactive+'_BOT_TOKEN','THU_TUAN_ZALO_'+inactive+'_CHAT_ID'])assert.equal(p[key],undefined);
  w.props.THU_TUAN_TRANSPORT='GMAIL';assert.equal(Object.keys(w.ctx.thuTuanConfig_().zaloProperties).length,0);
 }
});
test('a Zalo SENT log whose week was coerced to Date still prevents sending again',()=>{
 const w=zaloWorld();w.ctx.guiThuTuan();w.zaloLog.data[1][1]=new Date('2026-09-21T00:00:00+07:00');
 assert.equal(w.ctx.guiThuTuan().alreadySent,1);assert.equal(w.sendRequests.length,1);
});
test('Zalo headers and missing approval key fail closed without any fetch',()=>{
 const w=zaloWorld();w.zaloLog.data[0].push('unexpected');assert.equal(w.ctx.guiThuTuan().reason,'INVALID_HEADERS');assert.equal(w.requests.length,0);
 const x=zaloWorld();delete x.props.THU_TUAN_APPROVAL_SECRET;assert.equal(x.ctx.guiThuTuan().reason,'MISSING_APPROVAL_SECRET');assert.equal(x.requests.length,0);
});

// ---------- Manual TEST diagnostics and explicitly paired TEST target capture ----------
function diagnosticSessionMarker(w){
 return JSON.parse(w.logs.findLast(x=>JSON.parse(x).status==='TEST_RECEIVE_READY')).marker;
}
function diagnosticWorld(response){
 const w=zaloWorld({enabled:false});
 for(const field of ['CHAT_ID','CHAT_SHA256','GROUP_CONFIRMED'])delete w.props['THU_TUAN_ZALO_TEST_'+field];
 w.requests=[];
 w.ctx.UrlFetchApp={fetch(url,options){
  const host=new URL(url).origin,method=url.split('/').at(-1);
  w.requests.push({host,method,options});
  const standard=method==='getMe'?{ok:true,result:{id:'bot-TEST',account_name:'bot.POyBVXga',display_name:'Bot Mô hình học tập lời Bác',can_join_groups:true}}:
   method==='getWebhookInfo'?{ok:false,error_code:404}:{ok:false,error_code:408};
  const value=response?response({w,host,method,standard}):standard;
  if(value instanceof Error)throw value;
  return {getResponseCode:()=>value?.http??200,getContentText:()=>typeof value==='string'?value:JSON.stringify(value)};
 }};
 w.ctx.MailApp=noIO;
 w.pinWrites=[];
 const originalProperties=w.ctx.PropertiesService.getScriptProperties;
 w.ctx.PropertiesService.getScriptProperties=()=>({...originalProperties(),setProperties(values,deleteAllOthers){
  assert.equal(deleteAllOthers,false);assert.deepEqual(Object.keys(values).sort(),['THU_TUAN_ZALO_TEST_CHAT_ID','THU_TUAN_ZALO_TEST_CHAT_SHA256']);
  w.pinWrites.push({...values});
  if(w.pinWriteHook)w.pinWriteHook(values);else Object.assign(w.props,values);
 }});
 w.propsBefore=JSON.stringify(w.props);
 return w;
}
test('TEST diagnosis compares both official hosts without requiring target or changing cloud state',()=>{
 const w=diagnosticWorld(),r=w.ctx.chanDoanZaloThuTuan();
 assert.equal(r.status,'TEST_DIAGNOSTIC');assert.equal(r.hosts.length,2);
 assert.deepEqual(w.requests.map(x=>x.method),['getMe','getWebhookInfo','getMe','getWebhookInfo']);
 assert.deepEqual(w.requests.map(x=>x.host),['https://bot-api.zaloplatforms.com','https://bot-api.zaloplatforms.com','https://bot-api.zapps.me','https://bot-api.zapps.me']);
 assert.ok(r.hosts.every(x=>x.getMe.botMatches&&x.getMe.canJoinGroups));
 assert.ok(r.hosts.every(x=>x.getWebhookInfo.apiCode===404&&x.getWebhookInfo.webhookUrlPresent===null));
 assert.equal(JSON.stringify(w.props),w.propsBefore);assert.equal(w.zaloLog.data.length,1);
 for(const x of w.requests){assert.equal(x.options.followRedirects,false);assert.equal(x.options.validateHttpsCertificates,true);assert.equal(x.options.method,'post');}
});
test('diagnostic false flags, missing pins, script and Sheet swaps prevent every request',()=>{
 for(const [key,value] of [
  ['THU_TUAN_ENABLED','true'],['THU_TUAN_ENABLED',' false '],['THU_TUAN_ENABLED',undefined],
  ['THU_TUAN_TEST_MODE','false'],['THU_TUAN_TEST_MODE',' true '],['THU_TUAN_TRANSPORT','GMAIL'],['THU_TUAN_ZALO_ENV','PROD'],
  ['THU_TUAN_ZALO_TEST_SCRIPT_ID','script-PROD'],['THU_TUAN_ZALO_TEST_BOT_ID',123],['THU_TUAN_ZALO_TEST_BOT_ID',' bot-TEST'],
  ['THU_TUAN_ZALO_TEST_CONTENT_SHEET_ID','other-sheet'],['THU_TUAN_ZALO_TEST_PRIVATE_SHEET_ID',undefined],
  ['THU_TUAN_ZALO_TEST_BOT_TOKEN','bad/token?secret']
 ]){
  const w=diagnosticWorld();w.props[key]=value;
  assert.equal(w.ctx.chanDoanZaloThuTuan().status,'TEST_DIAGNOSTIC_BLOCKED');assert.equal(w.requests.length,0);
  assert.equal(w.ctx.nhanSuKienZaloThuTuanTest().status,'TEST_DIAGNOSTIC_BLOCKED');assert.equal(w.requests.length,0);
 }
 const w=diagnosticWorld();w.ctx.ScriptApp.getScriptId=()=> 'script-PROD';
 assert.equal(w.ctx.chanDoanZaloThuTuan().status,'TEST_DIAGNOSTIC_BLOCKED');assert.equal(w.requests.length,0);
});
test('diagnostics reject trigger events and lock collision without API calls',()=>{
 const w=diagnosticWorld();assert.equal(w.ctx.chanDoanZaloThuTuan({triggerUid:'synthetic'}).status,'TEST_DIAGNOSTIC_MANUAL_ONLY');
 assert.equal(w.ctx.nhanSuKienZaloThuTuanTest({triggerUid:'synthetic'}).status,'TEST_DIAGNOSTIC_MANUAL_ONLY');
 w.ctx.LockService={getScriptLock:()=>({tryLock:()=>false,releaseLock(){throw Error('not owned');}})};
 assert.equal(w.ctx.chanDoanZaloThuTuan().status,'BUSY');assert.equal(w.ctx.nhanSuKienZaloThuTuanTest().status,'BUSY');assert.equal(w.requests.length,0);
});
test('wrong Bot or malformed getMe never permits webhook lookup or receiving',()=>{
 for(const body of [{ok:true,result:{id:123}},{ok:true,result:{id:'bot-PROD'}},{ok:'true',result:{id:'bot-TEST'}},{ok:true,result:[]}]){
  const w=diagnosticWorld(()=>body);w.ctx.chanDoanZaloThuTuan();assert.equal(w.requests.length,2);assert.ok(w.requests.every(x=>x.method==='getMe'));
  w.requests=[];assert.equal(w.ctx.nhanSuKienZaloThuTuanTest().status,'TEST_RECEIVE_PREFLIGHT_BLOCKED');assert.equal(w.requests.length,1);
 }
});
test('diagnostic host, method and payload allowlists prevent sends, webhook changes and URL injection',()=>{
 const w=diagnosticWorld(),cfg=w.ctx.thuTuanZaloDiagnosticConfig_();
 for(const [host,method,payload] of [
  ['https://evil.example.test','getMe',{}],['http://bot-api.zapps.me','getMe',{}],
  ['https://bot-api.zapps.me','sendMessage',{}],['https://bot-api.zapps.me','deleteWebhook',{}],
  ['https://bot-api.zapps.me','setWebhook',{}],['https://bot-api.zapps.me','getMe',{token:'leak'}],
  ['https://bot-api.zapps.me','getUpdates',{timeout:'300'}]
 ])assert.throws(()=>w.ctx.thuTuanZaloDiagnosticRequest_(cfg,host,method,payload),/TEST_DIAGNOSTIC_METHOD_DENIED/);
 assert.equal(w.requests.length,0);
});
test('config changes are rechecked before each diagnostic request and stop receiving',()=>{
 const w=diagnosticWorld(({w,standard})=>{w.props.THU_TUAN_ENABLED='true';return standard;});
 assert.equal(w.ctx.chanDoanZaloThuTuan().status,'TEST_DIAGNOSTIC_BLOCKED');assert.equal(w.requests.length,1);
 const x=diagnosticWorld(({w,method,standard})=>{if(method==='getUpdates')w.props.THU_TUAN_ZALO_TEST_BOT_TOKEN='changed-token';return standard;});
 assert.equal(x.ctx.nhanSuKienZaloThuTuanTest().status,'TEST_DIAGNOSTIC_BLOCKED');assert.equal(x.requests.filter(r=>r.method==='getUpdates').length,1);
});
test('redirects, invalid JSON and raw errors remain safe diagnostic summaries',()=>{
 const sensitive='PRIVATE_ERROR synthetic-token-TEST synthetic-chat-TEST https://private.example.test/?token=raw';
 for(const failure of [new Error(sensitive),sensitive,{http:302,ok:true,result:{id:'bot-TEST'}},{ok:false,error_code:404,description:sensitive,result:{url:sensitive}}]){
  const w=diagnosticWorld(()=>failure),r=w.ctx.chanDoanZaloThuTuan(),stored=JSON.stringify([r,w.logs]);
  for(const forbidden of ['PRIVATE_ERROR','synthetic-token-TEST','synthetic-chat-TEST','private.example.test','token=raw'])assert.equal(stored.includes(forbidden),false);
  assert.ok(w.requests.every(x=>x.method==='getMe'));
 }
});
test('confirmed webhook URL prevents polling without returning the URL',()=>{
 const url='https://private.example.test/hook/secret';
 const w=diagnosticWorld(({method,standard})=>method==='getWebhookInfo'?{ok:true,result:{url}}:standard);
 const r=w.ctx.nhanSuKienZaloThuTuanTest();assert.equal(r.status,'TEST_RECEIVE_WEBHOOK_PRESENT');
 assert.equal(r.getWebhookInfo.webhookUrlPresent,true);assert.equal(w.requests.length,2);assert.equal(JSON.stringify([r,w.logs]).includes(url),false);
});
test('bounded TEST receiving uses only SDK host, four string timeout requests and safe READY evidence',()=>{
 const w=diagnosticWorld(),r=w.ctx.nhanSuKienZaloThuTuanTest();
 assert.equal(r.status,'TEST_RECEIVE_NO_VERIFIED_GROUP_MARKER');assert.equal(r.polls.length,4);
 assert.ok(w.requests.every(x=>x.host==='https://bot-api.zapps.me'));
 assert.ok(w.requests.filter(x=>x.method==='getUpdates').every(x=>x.options.payload==='{"timeout":"30"}'));
 assert.ok(w.logs.some(x=>JSON.parse(x).status==='TEST_RECEIVE_READY'));assert.equal(JSON.stringify(w.props),w.propsBefore);
});
test('diagnostic singular GROUP event requires the marker, string ID and current timestamp; PRIVATE is never a group',()=>{
 const start=Date.parse('2026-10-01T03:00:00Z'),now=start+10000;
 const w=diagnosticWorld(),marker='THU_TUAN_ZALO_TEST_'+'a'.repeat(64);
 const event=(chatType='GROUP',text=marker,date=start,id='synthetic-chat-TEST')=>({summary:{ok:true,resultKind:'OBJECT',httpStatus:200},result:{event_name:'message.text.received',message:{chat:{chat_type:chatType,id},text,date}}});
 assert.equal(w.ctx.thuTuanZaloDiagnosticEvent_(event(),start,now,marker).verifiedGroupMarker,true);
 for(const e of [event('PRIVATE'),event('GROUP','wrong-marker'),event('GROUP',marker,start-1),event('GROUP',marker,now+1),event('GROUP',marker,String(start)),event('GROUP',marker,start/1000),event('GROUP',marker,start,123),event('GROUP',marker,start,'bad id')])
  assert.equal(w.ctx.thuTuanZaloDiagnosticEvent_(e,start,now,marker).verifiedGroupMarker,false);
 const array={summary:{ok:true,resultKind:'ARRAY'},result:[event().result]};assert.equal(w.ctx.thuTuanZaloDiagnosticEvent_(array,start,now,marker).chatType,'UNKNOWN');
 assert.equal(JSON.stringify(w.ctx.thuTuanZaloDiagnosticEvent_(event(),start,now,marker)).includes('synthetic-chat'),false);
 assert.equal(w.ctx.thuTuanZaloDiagnosticEvent_(event(),start,now).verifiedGroupMarker,false);
});
test('fresh GROUP marker pins only the verified TEST target pair and leaves membership unconfirmed',()=>{
 const w=diagnosticWorld(({w,method,standard})=>method==='getUpdates'?diagnosticGroupEvent(w):standard);
 const r=w.ctx.nhanSuKienZaloThuTuanTest();assert.equal(r.status,'TEST_RECEIVE_GROUP_TARGET_PINNED');assert.equal(r.polls.length,1);
 assert.equal(w.pinWrites.length,1);assert.equal(w.props.THU_TUAN_ZALO_TEST_CHAT_ID,'synthetic-chat-TEST');
 assert.equal(w.props.THU_TUAN_ZALO_TEST_CHAT_SHA256,crypto.createHash('sha256').update('synthetic-chat-TEST').digest('hex'));
 assert.equal(w.props.THU_TUAN_ZALO_TEST_GROUP_CONFIRMED,undefined);
 const preserved={...w.props};delete preserved.THU_TUAN_ZALO_TEST_CHAT_ID;delete preserved.THU_TUAN_ZALO_TEST_CHAT_SHA256;
 assert.equal(JSON.stringify(preserved),w.propsBefore);assert.equal(JSON.stringify([r,w.logs]).includes('synthetic-chat-TEST'),false);
 assert.equal(w.ctx.kiemTraZaloThuTuan().reason,'ZALO_GROUP_CONFIRMATION_REQUIRED');
});
test('diagnostic Sheets metadata verifies both logs and approval without exposing text or writing',()=>{
 const w=diagnosticWorld(),before=JSON.stringify(Object.values(w.sheets).map(x=>[x.data,x.formatCalls]));
 const r=w.ctx.chanDoanZaloThuTuan();
 assert.equal(r.sheets.status,'TEST_DIAGNOSTIC_SHEETS_VERIFIED');assert.equal(r.sheets.zaloHeaders,16);assert.equal(r.sheets.gmailHeaders,9);
 assert.equal(r.sheets.zaloRows,0);assert.equal(r.sheets.gmailRows,0);assert.equal(r.sheets.currentContentRows,1);assert.equal(r.sheets.approvalProblem,'OK');
 assert.ok(r.sheets.partLengths.length>=1&&r.sheets.partLengths.every(n=>Number.isInteger(n)&&n<=1800));
 assert.equal(JSON.stringify(Object.values(w.sheets).map(x=>[x.data,x.formatCalls])),before);
 const safe=JSON.stringify([r,w.logs]);for(const hidden of [SECRET,REVIEWER,'Fixture','content-id','private-id','bot-TEST'])assert.equal(safe.includes(hidden),false);
 const x=diagnosticWorld();x.zaloLog.data[0].push('invalid');assert.equal(x.ctx.chanDoanZaloThuTuan().sheets.status,'TEST_DIAGNOSTIC_IO_BLOCKED');
});
test('bounded receiving stops on network failure and at its elapsed-time limit',()=>{
 const w=diagnosticWorld(({method,standard})=>method==='getUpdates'?new Error('secret network exception'):standard);
 assert.equal(w.ctx.nhanSuKienZaloThuTuanTest().polls.length,1);
 const x=diagnosticWorld(({w,method,standard})=>{if(method==='getUpdates')w.setNow('2026-09-21T01:02:01Z');return standard;});
 assert.equal(x.ctx.nhanSuKienZaloThuTuanTest().polls.length,1);
});
function diagnosticGroupEvent(w,overrides={}){
 const chat={chat_type:'GROUP',id:'synthetic-chat-TEST',...(overrides.chat||{})};
 return {ok:true,result:{event_name:'message.text.received',message:{chat,text:diagnosticSessionMarker(w),date:w.ctx.Date.now(),...overrides,chat}}};
}
test('paired receiver permits surrounding mentions but rejects duplicate or embedded marker tokens',()=>{
 for(const makeText of [m=>m+' '+m,m=>'prefix'+m,m=>m+'suffix',m=>m+' prefix'+m]){
  const w=diagnosticWorld(({w,method,standard})=>method==='getUpdates'?diagnosticGroupEvent(w,{text:makeText(diagnosticSessionMarker(w))}):standard);
  const r=w.ctx.nhanSuKienZaloThuTuanTest();assert.equal(r.polls.length,4);assert.equal(w.pinWrites.length,0);assert.equal(JSON.stringify(w.props),w.propsBefore);
 }
 const w=diagnosticWorld(({w,method,standard})=>method==='getUpdates'?diagnosticGroupEvent(w,{text:'@Bot '+diagnosticSessionMarker(w)+' xin chào'}):standard);
 assert.equal(w.ctx.nhanSuKienZaloThuTuanTest().status,'TEST_RECEIVE_GROUP_TARGET_PINNED');assert.equal(w.pinWrites.length,1);
});
test('PRIVATE, stale and wrong-marker events cannot pin; valid unmatched events allow the later paired marker',()=>{
 for(const override of [w=>({chat:{chat_type:'PRIVATE'}}),w=>({date:w.ctx.Date.now()-1}),w=>({text:'unmatched'})]){
  const w=diagnosticWorld(({w,method,standard})=>method==='getUpdates'?diagnosticGroupEvent(w,override(w)):standard);
  assert.equal(w.ctx.nhanSuKienZaloThuTuanTest().polls.length,4);assert.equal(w.pinWrites.length,0);assert.equal(JSON.stringify(w.props),w.propsBefore);
 }
 let count=0;const w=diagnosticWorld(({w,method,standard})=>method==='getUpdates'?diagnosticGroupEvent(w,++count===1?{text:'previous event'}:{}):standard);
 assert.equal(w.ctx.nhanSuKienZaloThuTuanTest().status,'TEST_RECEIVE_GROUP_TARGET_PINNED');assert.equal(count,2);assert.equal(w.pinWrites.length,1);
});
test('malformed successful events stop the paired receiver without target writes',()=>{
 const w=diagnosticWorld(({method,standard})=>method==='getUpdates'?{ok:true,result:{message:{chat:{chat_type:'GROUP',id:123}}}}:standard);
 const r=w.ctx.nhanSuKienZaloThuTuanTest();assert.equal(r.status,'TEST_RECEIVE_MALFORMED_EVENT');assert.equal(r.polls.length,1);assert.equal(w.pinWrites.length,0);
});
test('paired receiver refuses existing conflicting ID or hash and never replaces them',()=>{
 for(const [key,value] of [['THU_TUAN_ZALO_TEST_CHAT_ID','previous-verified-group'],['THU_TUAN_ZALO_TEST_CHAT_SHA256','0'.repeat(64)]]){
  const w=diagnosticWorld(({w,method,standard})=>method==='getUpdates'?diagnosticGroupEvent(w):standard);
  w.props[key]=value;const before=JSON.stringify(w.props),r=w.ctx.nhanSuKienZaloThuTuanTest();
  assert.equal(r.status,'TEST_RECEIVE_GROUP_TARGET_PIN_BLOCKED');assert.equal(r.pin.status,'TEST_TARGET_PIN_CONFLICT');
  assert.equal(w.pinWrites.length,0);assert.equal(JSON.stringify(w.props),before);
 }
});
test('paired receiver verifies readback and reports uncertainty without fabricating or retrying a target',()=>{
 const w=diagnosticWorld(({w,method,standard})=>method==='getUpdates'?diagnosticGroupEvent(w):standard);
 w.pinWriteHook=values=>{w.props.THU_TUAN_ZALO_TEST_CHAT_ID=values.THU_TUAN_ZALO_TEST_CHAT_ID;};
 const r=w.ctx.nhanSuKienZaloThuTuanTest();assert.equal(r.status,'TEST_RECEIVE_GROUP_TARGET_PIN_BLOCKED');assert.equal(r.pin.status,'TEST_TARGET_PIN_UNCONFIRMED');
 assert.equal(w.pinWrites.length,1);assert.equal(r.polls.length,1);assert.equal(w.props.THU_TUAN_ZALO_TEST_GROUP_CONFIRMED,undefined);
 assert.equal(JSON.stringify([r,w.logs]).includes('synthetic-chat-TEST'),false);
});
test('configuration changes during marker arrival prevent any pin write',()=>{
 const w=diagnosticWorld(({w,method,standard})=>{
  if(method!=='getUpdates')return standard;
  const body=diagnosticGroupEvent(w);w.props.THU_TUAN_ENABLED='true';return body;
 });
 const r=w.ctx.nhanSuKienZaloThuTuanTest();assert.equal(r.status,'TEST_RECEIVE_GROUP_TARGET_PIN_BLOCKED');assert.equal(w.pinWrites.length,0);
 assert.equal(w.props.THU_TUAN_ZALO_TEST_CHAT_ID,undefined);assert.equal(w.props.THU_TUAN_ZALO_TEST_CHAT_SHA256,undefined);
});
test('GAS diagnostic failure categories use only fixed signatures and never expose sensitive error text',()=>{
 const sensitive=' synthetic-token-TEST synthetic-chat-TEST https://private.example.test/?token=secret PRIVATE_ERROR';
 for(const [message,category] of [
  ['You do not have permission to call UrlFetchApp.fetch. Required permissions: script.external_request','AUTHORIZATION'],
  ['Specified permissions are not sufficient to call UrlFetchApp.fetch. Required permissions: script.external_request','AUTHORIZATION'],
  ['Exception: Authorization is required to perform that action.','AUTHORIZATION'],
  ['SSL Error:','TLS_CERTIFICATE'],['Address unavailable:','DNS_ADDRESS'],['The request timed out','NETWORK_TIMEOUT'],
  ['Service invoked too many times for one day: urlfetch.','QUOTA'],['Invalid argument: contentType','INVALID_ARGUMENT'],
  ['Unexpected transport failure','FETCH_UNCLASSIFIED'],['private payload contains timeout DNS SSL authorization','FETCH_UNCLASSIFIED']
 ]){
  const w=diagnosticWorld(()=>new Error(message+sensitive)),r=w.ctx.chanDoanZaloThuTuan();
  assert.ok(r.hosts.every(x=>x.getMe.phase==='FETCH'&&x.getMe.errorCategory===category&&x.getMe.httpStatus===null));
  assert.ok(r.hosts.every(x=>Number.isInteger(x.getMe.elapsedMs)&&x.getMe.elapsedMs>=0));
  const safe=JSON.stringify([r,w.logs]);for(const hidden of ['synthetic-token-TEST','synthetic-chat-TEST','private.example.test','PRIVATE_ERROR','script.external_request'])assert.equal(safe.includes(hidden),false);
  assert.equal(w.pinWrites.length,0);
 }
});
test('GAS diagnostics distinguish fetch, response reads, HTTP responses, malformed JSON and API errors',()=>{
 for(const [body,phase,category,httpStatus] of [
  [new Error('unexpected private failure'),'FETCH','FETCH_UNCLASSIFIED',null],
  ['invalid private JSON','JSON_PARSE','JSON_INVALID',200],
  [{http:302},'HTTP_STATUS',null,302],
  [{http:500},'HTTP_STATUS',null,500],
  [{ok:false,error_code:408},'COMPLETE',null,200]
 ]){
  const w=diagnosticWorld(()=>body),r=w.ctx.chanDoanZaloThuTuan();
  assert.ok(r.hosts.every(x=>x.getMe.phase===phase&&x.getMe.errorCategory===category&&x.getMe.httpStatus===httpStatus));
 }
 for(const failurePhase of ['HTTP_STATUS','RESPONSE_BODY']){
  const w=diagnosticWorld();w.ctx.UrlFetchApp.fetch=()=>({
   getResponseCode(){if(failurePhase==='HTTP_STATUS')throw Error('secret status error');return 200;},
   getContentText(){throw Error('secret response error');}
  });
  const r=w.ctx.chanDoanZaloThuTuan();assert.ok(r.hosts.every(x=>x.getMe.phase===failurePhase&&x.getMe.errorCategory==='RESPONSE_UNREADABLE'));
  assert.equal(JSON.stringify([r,w.logs]).includes('secret'),false);
 }
});
test('manual TEST scope helper requests only external_request and logs success after grant',()=>{
 const w=diagnosticWorld(),calls=[];
 w.ctx.ScriptApp.AuthMode={FULL:'FULL'};w.ctx.ScriptApp.requireScopes=(mode,scopes)=>calls.push({mode,scopes:[...scopes]});
 w.ctx.UrlFetchApp=noIO;
 const r=w.ctx.capQuyenZaloThuTuanTest();assert.equal(r.status,'TEST_EXTERNAL_REQUEST_SCOPE_GRANTED');
 assert.deepEqual(calls,[{mode:'FULL',scopes:['https://www.googleapis.com/auth/script.external_request']}]);
 assert.equal(w.pinWrites.length,0);assert.equal(JSON.stringify(w.props),w.propsBefore);
 assert.equal(w.logs.at(-1),JSON.stringify(r));
});
test('TEST scope helper rejects trigger and isolation failures before requesting consent',()=>{
 for(const mutate of [w=>w.props.THU_TUAN_ENABLED='true',w=>w.props.THU_TUAN_ZALO_ENV='PROD',w=>w.props.THU_TUAN_TEST_MODE='false',w=>w.ctx.ScriptApp.getScriptId=()=> 'script-PROD']){
  const w=diagnosticWorld();w.ctx.ScriptApp.requireScopes=()=>{throw Error('scope method must not be called');};mutate(w);
  assert.equal(w.ctx.capQuyenZaloThuTuanTest().status,'TEST_DIAGNOSTIC_BLOCKED');assert.equal(w.logs.length,1); // only fixture approval log
  assert.equal(w.pinWrites.length,0);assert.equal(w.requests.length,0);
 }
 const w=diagnosticWorld();w.ctx.ScriptApp.requireScopes=()=>{throw Error('scope method must not be called');};
 assert.equal(w.ctx.capQuyenZaloThuTuanTest({triggerUid:'synthetic'}).status,'TEST_DIAGNOSTIC_MANUAL_ONLY');
});
test('TEST scope helper does not claim grant or suppress the native consent termination',()=>{
 const w=diagnosticWorld(),before=w.logs.length;
 w.ctx.ScriptApp.AuthMode={FULL:'FULL'};w.ctx.ScriptApp.requireScopes=()=>{throw Error('NATIVE_CONSENT_TERMINATION');};
 assert.throws(()=>w.ctx.capQuyenZaloThuTuanTest(),/NATIVE_CONSENT_TERMINATION/);
 assert.equal(w.logs.length,before);assert.equal(w.pinWrites.length,0);assert.equal(w.requests.length,0);
});

test('every receiver session uses a fresh challenge and a previous challenge cannot pin even with a fresh timestamp',()=>{
 let previous='',updates=0;
 const w=diagnosticWorld(({w,method,standard})=>{
  if(method!=='getUpdates'||!previous)return standard;
  return diagnosticGroupEvent(w,++updates===1?{text:previous}:{});
 });
 const nonces=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
 w.ctx.Utilities={...w.ctx.Utilities,getUuid:()=>nonces.shift()};
 assert.equal(w.ctx.nhanSuKienZaloThuTuanTest().status,'TEST_RECEIVE_NO_VERIFIED_GROUP_MARKER');
 previous=diagnosticSessionMarker(w);assert.equal(w.pinWrites.length,0);
 const r=w.ctx.nhanSuKienZaloThuTuanTest();assert.notEqual(diagnosticSessionMarker(w),previous);
 assert.equal(r.polls[0].timestampInWindow,true);assert.equal(r.polls[0].markerMatched,false);
 assert.equal(r.polls[1].verifiedGroupMarker,true);assert.equal(r.status,'TEST_RECEIVE_GROUP_TARGET_PINNED');
 assert.equal(updates,2);assert.equal(w.pinWrites.length,1);
});

test('public receiver challenge is an opaque domain-separated HMAC and never reveals its nonce or secrets',()=>{
 const w=diagnosticWorld(),nonce='11111111-1111-4111-8111-111111111111';
 w.ctx.Utilities={...w.ctx.Utilities,getUuid:()=>nonce};
 const now=w.ctx.Date.now(),r=w.ctx.nhanSuKienZaloThuTuanTest(),marker=diagnosticSessionMarker(w);
 assert.match(marker,/^THU_TUAN_ZALO_TEST_[0-9a-f]{64}$/);
 assert.equal(marker,'THU_TUAN_ZALO_TEST_'+crypto.createHmac('sha256',SECRET).update('THU_TUAN_ZALO_TEST_CHALLENGE\n'+nonce+'\n'+now).digest('hex'));
 const safe=JSON.stringify([r,w.logs]);
 for(const hidden of [SECRET,nonce,'synthetic-token-TEST','synthetic-chat-TEST','content-id','private-id','bot-TEST'])assert.equal(safe.includes(hidden),false);
 assert.equal(JSON.stringify(r).includes(marker),false);assert.equal(JSON.stringify(w.props),w.propsBefore);
 const x=diagnosticWorld();x.ctx.Utilities={...x.ctx.Utilities,getUuid:()=>undefined};
 assert.equal(x.ctx.nhanSuKienZaloThuTuanTest().status,'TEST_DIAGNOSTIC_BLOCKED');
 assert.equal(x.requests.filter(item=>item.method==='getUpdates').length,0);assert.equal(x.pinWrites.length,0);
 assert.equal(x.logs.some(log=>JSON.parse(log).status==='TEST_RECEIVE_READY'),false);
});

test('diagnostics use the pinned Bot ID even when display name and account name change',()=>{
 const renamed='RENAMED_DISPLAY_PRIVATE',account='RENAMED_ACCOUNT_PRIVATE';
 const w=diagnosticWorld(({w,method,standard})=>method==='getMe'?{ok:true,result:{id:'bot-TEST',display_name:renamed,account_name:account,can_join_groups:true}}:
  method==='getUpdates'?diagnosticGroupEvent(w):standard);
 const initial=w.ctx.chanDoanZaloThuTuan();assert.ok(initial.hosts.every(host=>host.getMe.botMatches));
 const r=w.ctx.nhanSuKienZaloThuTuanTest();assert.equal(r.status,'TEST_RECEIVE_GROUP_TARGET_PINNED');
 assert.equal(w.pinWrites.length,1);const safe=JSON.stringify([initial,r,w.logs]);
 for(const hidden of [renamed,account,'accountMatches','displayNameMatches'])assert.equal(safe.includes(hidden),false);
});

test('diagnostic Gmail counterpart log is optional while an existing malformed schema still blocks',()=>{
 const w=diagnosticWorld();delete w.sheets['private-id|ThuTuan_NhatKyGui'];
 const before=JSON.stringify(w.sheets),r=w.ctx.chanDoanZaloThuTuan();
 assert.equal(r.sheets.status,'TEST_DIAGNOSTIC_SHEETS_VERIFIED');assert.equal(r.sheets.gmailPresent,false);
 assert.equal(r.sheets.gmailHeaders,null);assert.equal(r.sheets.gmailRows,0);assert.equal(r.sheets.gmailCurrentWeekRows,0);
 assert.equal(r.sheets.zaloHeaders,16);assert.equal(r.sheets.approvalProblem,'OK');assert.equal(JSON.stringify(w.sheets),before);
 const x=diagnosticWorld();x.sheets['private-id|ThuTuan_NhatKyGui'].data[0][0]='bad-header';
 assert.equal(x.ctx.chanDoanZaloThuTuan().sheets.status,'TEST_DIAGNOSTIC_IO_BLOCKED');assert.equal(x.pinWrites.length,0);
});

// ---------- Production pilot readiness: PROD receiver, readiness gate and trigger attention (synthetic only) ----------
const shaHex=value=>crypto.createHash('sha256').update(value).digest('hex');
const plain=value=>JSON.parse(JSON.stringify(value));
function receiverWorld(env,response){
 const w=zaloWorld({env,enabled:false});
 for(const field of ['CHAT_ID','CHAT_SHA256','GROUP_CONFIRMED'])delete w.props['THU_TUAN_ZALO_'+env+'_'+field];
 w.requests=[];
 w.ctx.UrlFetchApp={fetch(url,options){
  const host=new URL(url).origin,method=url.split('/').at(-1);
  w.requests.push({host,method,url,options});
  const standard=method==='getMe'?{ok:true,result:{id:'bot-'+env,can_join_groups:true}}:
   method==='getWebhookInfo'?{ok:false,error_code:404}:{ok:false,error_code:408};
  const value=response?response({w,host,method,standard}):standard;
  if(value instanceof Error)throw value;
  return {getResponseCode:()=>value?.http??200,getContentText:()=>typeof value==='string'?value:JSON.stringify(value)};
 }};
 w.ctx.MailApp=noIO;w.pinWrites=[];
 const original=w.ctx.PropertiesService.getScriptProperties;
 w.ctx.PropertiesService.getScriptProperties=()=>({...original(),setProperties(values,deleteAllOthers){
  w.pinWrites.push({keys:Object.keys(values).sort(),deleteAllOthers});
  if(w.pinWriteHook)w.pinWriteHook(values);else Object.assign(w.props,values);
 },setProperty(){throw Error('receiver must not call setProperty');},deleteProperty(){throw Error('receiver must not delete');}});
 w.propsBefore=JSON.stringify(w.props);
 return w;
}
function receiverMarker(w,env){return JSON.parse(w.logs.findLast(x=>JSON.parse(x).status===env+'_RECEIVE_READY')).marker;}
function receiverGroupEvent(w,env,overrides={}){
 const chat={chat_type:'GROUP',id:'synthetic-chat-'+env,...(overrides.chat||{})};
 return {ok:true,result:{event_name:'message.text.received',message:{text:receiverMarker(w,env),date:w.ctx.Date.now(),...overrides,chat}}};
}
const pinEvent=env=>({w,method,standard})=>method==='getUpdates'?receiverGroupEvent(w,env):standard;
const receiverFn=env=>env==='PROD'?'nhanSuKienZaloThuTuanProd':'nhanSuKienZaloThuTuanTest';

test('PROD receiver pins only the PROD CHAT_ID/SHA256 pair from a fresh GROUP marker and never confirms membership',()=>{
 const w=receiverWorld('PROD',pinEvent('PROD')),r=w.ctx.nhanSuKienZaloThuTuanProd();
 assert.equal(r.status,'PROD_RECEIVE_GROUP_TARGET_PINNED');assert.equal(r.environment,'PROD');assert.equal(r.pin.status,'PROD_TARGET_PINNED');
 assert.match(receiverMarker(w,'PROD'),/^THU_TUAN_ZALO_PROD_[0-9a-f]{64}$/);
 assert.deepEqual(plain(w.pinWrites),[{keys:['THU_TUAN_ZALO_PROD_CHAT_ID','THU_TUAN_ZALO_PROD_CHAT_SHA256'],deleteAllOthers:false}]);
 assert.equal(w.props.THU_TUAN_ZALO_PROD_CHAT_ID,'synthetic-chat-PROD');assert.equal(w.props.THU_TUAN_ZALO_PROD_CHAT_SHA256,shaHex('synthetic-chat-PROD'));
 assert.equal(w.props.THU_TUAN_ZALO_PROD_GROUP_CONFIRMED,undefined);
 const rest={...w.props};delete rest.THU_TUAN_ZALO_PROD_CHAT_ID;delete rest.THU_TUAN_ZALO_PROD_CHAT_SHA256;
 assert.equal(JSON.stringify(rest),w.propsBefore);
 assert.equal(w.ctx.kiemTraZaloThuTuan().reason,'ZALO_GROUP_CONFIRMATION_REQUIRED');
});
test('PROD receiver never sends, never returns token, chat, IDs or hash, and never touches TEST properties',()=>{
 const w=receiverWorld('PROD',pinEvent('PROD'));
 const testProps=()=>JSON.stringify(Object.entries(w.props).filter(([key])=>key.startsWith('THU_TUAN_ZALO_TEST_')));
 const testBefore=testProps(),r=w.ctx.nhanSuKienZaloThuTuanProd();
 assert.equal(r.status,'PROD_RECEIVE_GROUP_TARGET_PINNED');
 assert.deepEqual(w.requests.map(x=>x.method),['getMe','getWebhookInfo','getUpdates']);
 assert.ok(w.requests.every(x=>x.host==='https://bot-api.zapps.me'&&x.url.includes('/botsynthetic-token-PROD/')));
 assert.equal(testProps(),testBefore);assert.equal(w.zaloLog.data.length,1);
 const safe=JSON.stringify([r,w.logs]);
 for(const hidden of ['synthetic-token-PROD','synthetic-chat-PROD',shaHex('synthetic-chat-PROD'),'script-PROD','prod-content-id','prod-private-id','bot-PROD',SECRET])
  assert.equal(safe.includes(hidden),false,hidden);
});
test('PROD receiver is blocked before any request unless ENABLED, TEST_MODE, ENV, script, Sheet and Bot pins all hold',()=>{
 for(const mutate of [
  w=>w.props.THU_TUAN_ENABLED='true',w=>delete w.props.THU_TUAN_ENABLED,w=>w.props.THU_TUAN_ENABLED=' false',
  w=>w.props.THU_TUAN_TEST_MODE='true',w=>delete w.props.THU_TUAN_TEST_MODE,w=>w.props.THU_TUAN_TEST_MODE='FALSE',
  w=>w.props.THU_TUAN_ZALO_ENV='TEST',w=>delete w.props.THU_TUAN_ZALO_ENV,w=>w.props.THU_TUAN_TRANSPORT='GMAIL',
  w=>w.ctx.ScriptApp.getScriptId=()=> 'script-TEST',w=>w.props.THU_TUAN_ZALO_PROD_SCRIPT_ID='script-other',
  w=>w.props.THU_TUAN_CONTENT_SHEET_ID='content-id',w=>w.props.THU_TUAN_PRIVATE_SHEET_ID='private-id',
  w=>w.props.THU_TUAN_ZALO_PROD_PRIVATE_SHEET_ID='other-private',w=>delete w.props.THU_TUAN_ZALO_PROD_BOT_ID,
  w=>w.props.THU_TUAN_ZALO_PROD_BOT_ID='bot-TEST',w=>w.props.THU_TUAN_ZALO_TEST_SCRIPT_ID='script-PROD',
  w=>w.props.THU_TUAN_ZALO_TEST_PRIVATE_SHEET_ID='prod-private-id',w=>w.props.THU_TUAN_ZALO_PROD_BOT_TOKEN='bad/token?x'
 ]){
  const w=receiverWorld('PROD',pinEvent('PROD'));mutate(w);const before=JSON.stringify(w.props);
  assert.equal(w.ctx.nhanSuKienZaloThuTuanProd().status,'PROD_DIAGNOSTIC_BLOCKED');
  assert.equal(w.requests.length,0);assert.equal(w.pinWrites.length,0);assert.equal(JSON.stringify(w.props),before);
 }
 for(const body of [{ok:true,result:{id:'bot-TEST',can_join_groups:true}},{ok:true,result:{id:'bot-PROD',can_join_groups:false}},{ok:true,result:{id:123,can_join_groups:true}}]){
  const w=receiverWorld('PROD',({method,standard})=>method==='getMe'?body:standard),r=w.ctx.nhanSuKienZaloThuTuanProd();
  assert.equal(r.status,'PROD_RECEIVE_PREFLIGHT_BLOCKED');assert.deepEqual(w.requests.map(x=>x.method),['getMe']);assert.equal(w.pinWrites.length,0);
 }
 const t=receiverWorld('PROD',pinEvent('PROD'));
 assert.equal(t.ctx.nhanSuKienZaloThuTuanProd({triggerUid:'synthetic'}).status,'PROD_DIAGNOSTIC_MANUAL_ONLY');
 t.ctx.LockService={getScriptLock:()=>({tryLock:()=>false,releaseLock(){throw Error('not owned');}})};
 assert.equal(t.ctx.nhanSuKienZaloThuTuanProd().status,'BUSY');
 assert.equal(t.requests.length,0);assert.equal(t.pinWrites.length,0);assert.equal(JSON.stringify(t.props),t.propsBefore);
});
test('receiver entrypoints are isolated both ways: TEST with ENV=PROD and PROD with ENV=TEST are blocked',()=>{
 const prod=receiverWorld('PROD',pinEvent('PROD'));
 assert.equal(prod.ctx.nhanSuKienZaloThuTuanTest().status,'TEST_DIAGNOSTIC_BLOCKED');assert.equal(prod.ctx.chanDoanZaloThuTuan().status,'TEST_DIAGNOSTIC_BLOCKED');
 assert.equal(prod.requests.length,0);assert.equal(prod.pinWrites.length,0);assert.equal(JSON.stringify(prod.props),prod.propsBefore);
 const testWorld=receiverWorld('TEST',pinEvent('TEST'));
 const prodProps=()=>JSON.stringify(Object.entries(testWorld.props).filter(([key])=>key.startsWith('THU_TUAN_ZALO_PROD_'))),prodBefore=prodProps();
 assert.equal(testWorld.ctx.nhanSuKienZaloThuTuanProd().status,'PROD_DIAGNOSTIC_BLOCKED');
 assert.equal(testWorld.requests.length,0);assert.equal(testWorld.pinWrites.length,0);assert.equal(JSON.stringify(testWorld.props),testWorld.propsBefore);
 // Flipping only the mode properties inside the TEST project still fails the PROD script and Sheet pins.
 const flipped=receiverWorld('TEST',pinEvent('PROD'));flipped.props.THU_TUAN_ZALO_ENV='PROD';flipped.props.THU_TUAN_TEST_MODE='false';
 flipped.props.THU_TUAN_ZALO_PROD_BOT_TOKEN='synthetic-token-PROD';
 assert.equal(flipped.ctx.nhanSuKienZaloThuTuanProd().status,'PROD_DIAGNOSTIC_BLOCKED');assert.equal(flipped.requests.length,0);assert.equal(flipped.pinWrites.length,0);
 assert.equal(testWorld.ctx.nhanSuKienZaloThuTuanTest().status,'TEST_RECEIVE_GROUP_TARGET_PINNED');
 assert.deepEqual(plain(testWorld.pinWrites),[{keys:['THU_TUAN_ZALO_TEST_CHAT_ID','THU_TUAN_ZALO_TEST_CHAT_SHA256'],deleteAllOthers:false}]);
 assert.equal(prodProps(),prodBefore);assert.equal(testWorld.props.THU_TUAN_ZALO_PROD_CHAT_ID,undefined);
});
test('an existing GROUP_CONFIRMED of any value blocks a new pin before any request and changes no property',()=>{
 for(const env of ['PROD','TEST'])for(const value of ['true','false','','TRUE']){
  const w=receiverWorld(env,pinEvent(env));w.props['THU_TUAN_ZALO_'+env+'_GROUP_CONFIRMED']=value;const before=JSON.stringify(w.props);
  const r=w.ctx[receiverFn(env)]();assert.equal(r.status,env+'_RECEIVE_GROUP_CONFIRMATION_PRESENT',env+':'+value);
  assert.equal(w.requests.length,0);assert.equal(w.pinWrites.length,0);assert.equal(JSON.stringify(w.props),before);
 }
 // A confirmation written while the session waits for the marker is rechecked immediately before the write.
 const w=receiverWorld('PROD',({w,method,standard})=>{
  if(method!=='getUpdates')return standard;w.props.THU_TUAN_ZALO_PROD_GROUP_CONFIRMED='true';return receiverGroupEvent(w,'PROD');
 });
 const r=w.ctx.nhanSuKienZaloThuTuanProd();assert.equal(r.status,'PROD_RECEIVE_GROUP_TARGET_PIN_BLOCKED');
 assert.equal(r.pin.status,'PROD_TARGET_PIN_GROUP_CONFIRMATION_PRESENT');assert.equal(w.pinWrites.length,0);
 assert.equal(w.props.THU_TUAN_ZALO_PROD_CHAT_ID,undefined);assert.equal(w.props.THU_TUAN_ZALO_PROD_CHAT_SHA256,undefined);
});
test('PRIVATE, stale, wrong, TEST-domain, duplicated or previous-session markers never pin PROD',()=>{
 for(const override of [w=>({chat:{chat_type:'PRIVATE'}}),w=>({date:w.ctx.Date.now()-1}),w=>({text:'unmatched'}),
  w=>({text:receiverMarker(w,'PROD').replace('THU_TUAN_ZALO_PROD_','THU_TUAN_ZALO_TEST_')}),
  w=>({text:receiverMarker(w,'PROD')+' '+receiverMarker(w,'PROD')})]){
  const w=receiverWorld('PROD',({w,method,standard})=>method==='getUpdates'?receiverGroupEvent(w,'PROD',override(w)):standard);
  const r=w.ctx.nhanSuKienZaloThuTuanProd();assert.equal(r.status,'PROD_RECEIVE_NO_VERIFIED_GROUP_MARKER');assert.equal(r.polls.length,4);
  assert.equal(w.pinWrites.length,0);assert.equal(JSON.stringify(w.props),w.propsBefore);
 }
 let previous='',updates=0;
 const w=receiverWorld('PROD',({w,method,standard})=>{
  if(method!=='getUpdates'||!previous)return standard;updates++;return receiverGroupEvent(w,'PROD',{text:previous});
 });
 assert.equal(w.ctx.nhanSuKienZaloThuTuanProd().status,'PROD_RECEIVE_NO_VERIFIED_GROUP_MARKER');previous=receiverMarker(w,'PROD');
 assert.equal(w.ctx.nhanSuKienZaloThuTuanProd().status,'PROD_RECEIVE_NO_VERIFIED_GROUP_MARKER');assert.notEqual(receiverMarker(w,'PROD'),previous);
 assert.equal(updates,4);assert.equal(w.pinWrites.length,0);
 const start=w.ctx.Date.now(),testMarker='THU_TUAN_ZALO_TEST_'+'a'.repeat(64);
 const event={summary:{ok:true,resultKind:'OBJECT'},result:{event_name:'message.text.received',message:{chat:{chat_type:'GROUP',id:'synthetic-chat-PROD'},text:testMarker,date:start}}};
 assert.equal(w.ctx.thuTuanZaloDiagnosticEvent_(event,start,start,testMarker,'PROD').verifiedGroupMarker,false);
 assert.equal(w.ctx.thuTuanZaloDiagnosticEvent_(event,start,start,testMarker,'TEST').verifiedGroupMarker,true);
});

function readinessWorld(options={}){
 const w=zaloWorld({env:'PROD',enabled:false,...options});
 w.writes=[];const original=w.ctx.PropertiesService.getScriptProperties;
 w.ctx.PropertiesService.getScriptProperties=()=>({...original(),setProperty(){w.writes.push('setProperty');},
  setProperties(){w.writes.push('setProperties');},deleteProperty(){w.writes.push('deleteProperty');}});
 w.ctx.ScriptApp.deleteTrigger=()=>w.writes.push('deleteTrigger');
 w.snapshot=()=>JSON.stringify([w.props,Object.entries(w.sheets).map(([key,sheet])=>[key,sheet.data,sheet.formatCalls]),w.created,w.deleted]);
 w.gmailLog=w.sheets['prod-private-id|ThuTuan_NhatKyGui'];
 return w;
}
const zaloLogRow=(w,values)=>w.H.ThuTuan_Zalo_NhatKyGui.map(key=>values[key]??'');
test('Production readiness is READY only through getMe and an offline preview, with no send, write or trigger change',()=>{
 const w=readinessWorld(),before=w.snapshot(),r=w.ctx.kiemTraSanSangZaloProduction();
 assert.deepEqual(plain(r),{status:'READY_FOR_PRODUCTION_PILOT',environment:'PROD',testMode:'false',enabled:'false',transport:'ZALO',
  scriptPinned:true,sheetsPinned:true,targetPinned:true,groupConfirmed:true,isolation:'OK',bot:'OK',key:'2026-09-21',
  preview:'PREVIEW',approval:'OK',maLoiDay:'LD-TEST-1',phienBan:'1',partCount:1,pending:1,alreadySent:0,unknown:0,
  triggersOfThisAccount:0,logSending:0,logUnknown:0,logUnrecognized:0,failed:[]});
 assert.deepEqual(w.requests.map(x=>x.method),['getMe']);assert.equal(w.sendRequests.length,0);
 assert.equal(w.snapshot(),before);assert.deepEqual(w.writes,[]);assert.equal(w.created.length,0);assert.equal(w.deleted.length,0);
});
test('Production readiness is NOT_READY with short codes for each failed gate and stays read-only',()=>{
 const otherBot=({method,standard})=>method==='getMe'?{ok:true,result:{id:'bot-TEST',can_join_groups:true}}:standard;
 for(const [code,mutate,options] of [
  ['ENABLED_NOT_FALSE',w=>{w.props.THU_TUAN_ENABLED='true';}],
  ['TRIGGER_PRESENT',w=>{w.ctx.ScriptApp.getProjectTriggers=()=>[{getHandlerFunction:()=>'guiThuTuan'}];}],
  ['CONTENT_NOT_APPROVED',w=>{w.row[5]='Nhap';}],
  ['LOG_UNKNOWN',w=>{w.zaloLog.data.push(zaloLogRow(w,{Khoa:'2026-09-14|ZALO_PROD_OLD_1_1',Ky:'2026-09-14',MaCB:'ZALO_PROD_OLD_1_1',TrangThai:'UNKNOWN'}));}],
  ['LOG_SENDING',w=>{w.gmailLog.data.push(['2026-09-07|CB1','2026-09-07','CB1','LD-OLD','1','old','SENDING',new Date(0),'']);}],
  ['LOG_STATE_UNRECOGNIZED',w=>{w.zaloLog.data.push(zaloLogRow(w,{Khoa:'2026-09-14|ZALO_PROD_OLD_1_1',Ky:'2026-09-14',TrangThai:'Sent'}));}],
  ['ENV_NOT_PROD',w=>{w.props.THU_TUAN_ZALO_ENV='TEST';}],
  ['TEST_MODE_NOT_FALSE',w=>{w.props.THU_TUAN_TEST_MODE='true';}],
  ['BOT_IDENTITY',()=>{},{response:otherBot}],
  ['GROUP_NOT_CONFIRMED',w=>{delete w.props.THU_TUAN_ZALO_PROD_GROUP_CONFIRMED;}],
  ['SCRIPT_PIN',w=>{w.ctx.ScriptApp.getScriptId=()=> 'script-TEST';}],
  ['TARGET_PIN',w=>{w.props.THU_TUAN_ZALO_PROD_CHAT_SHA256='0'.repeat(64);}],
  ['NO_PENDING',w=>{w.props.THU_TUAN_ENABLED='true';w.ctx.guiThuTuan();w.props.THU_TUAN_ENABLED='false';}],
  ['ALREADY_SENT',w=>{w.props.THU_TUAN_ENABLED='true';w.ctx.guiThuTuan();w.props.THU_TUAN_ENABLED='false';}]
 ]){
  const w=readinessWorld(options||{});mutate(w);const sends=w.sendRequests.length,before=w.snapshot();
  const r=w.ctx.kiemTraSanSangZaloProduction();
  assert.equal(r.status,'NOT_READY',code);assert.ok(r.failed.includes(code),code+' in '+r.failed.join(','));
  assert.equal(w.sendRequests.length,sends,code);assert.ok(w.requests.slice(-1).every(x=>x.method==='getMe'||x.method==='sendMessage'),code);
  assert.equal(w.snapshot(),before,code);assert.deepEqual(w.writes,[],code);assert.equal(w.created.length,0,code);
 }
 const test=receiverWorld('TEST');test.props.THU_TUAN_ZALO_TEST_CHAT_ID='synthetic-chat-TEST';test.props.THU_TUAN_ZALO_TEST_CHAT_SHA256=shaHex('synthetic-chat-TEST');
 const r=test.ctx.kiemTraSanSangZaloProduction();assert.equal(r.status,'NOT_READY');assert.equal(r.environment,'TEST');
 assert.equal(r.bot,'NOT_CHECKED');assert.equal(r.preview,'NOT_CHECKED');assert.equal(test.requests.length,0);
});
test('Production readiness output carries no token, chat ID, script/Sheet/Bot ID, hash, receipt or content',()=>{
 const outputs=[];
 for(const mutate of [()=>{},w=>{w.row[5]='Nhap';},w=>{w.props.THU_TUAN_ZALO_ENV='TEST';},w=>{w.props.THU_TUAN_ENABLED='true';w.ctx.guiThuTuan();w.props.THU_TUAN_ENABLED='false';}]){
  const w=readinessWorld();mutate(w);outputs.push(w.ctx.kiemTraSanSangZaloProduction(),w.logs.at(-1),w.row[9]);
 }
 const digest=outputs.filter(x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x));
 const safe=JSON.stringify(outputs.filter(x=>!digest.includes(x)));
 for(const hidden of ['synthetic-token-PROD','synthetic-chat-PROD','synthetic-chat-TEST',shaHex('synthetic-chat-PROD'),shaHex('synthetic-chat-TEST'),'script-PROD','script-TEST',
  'prod-content-id','prod-private-id','bot-PROD','bot-TEST',SECRET,REVIEWER,'Fixture','receipt-',...digest])
  assert.equal(safe.includes(hidden),false,hidden);
});

test('trigger attention: COMPLETE and DISABLED stay quiet, every other status throws one fixed code; manual returns unchanged',()=>{
 const ctx=weekly();
 for(const status of ['BUSY','CONTENT_NOT_APPROVED','CONTENT_MISSING_OR_DUPLICATE','DEFERRED','RECONCILIATION_REQUIRED','ZALO_GATE_BLOCKED',
  'ZALO_BOT_MISMATCH','ZALO_PREFLIGHT_UNCONFIRMED','ZALO_GROUP_UNAVAILABLE','ZALO_CONFIG_CHANGED','ZALO_PRE_SEND_BLOCKED','ZALO_RUN_BLOCKED',
  'ZALO_REPORT_BLOCKED','TRANSPORT_CHANGED_DURING_WEEK','DUPLICATE_OR_INVALID_LOG','CONTENT_CHANGED_DURING_WEEK','KY_NOT_PLAIN_TEXT',
  'INVALID_RECIPIENT_LIST','QUOTA_DEFERRED','TEST_MODE_MANUAL_ONLY','PREVIEW']){
  const result={status,sent:0};assert.equal(ctx.thuTuanTriggerResult_(undefined,result),result);
  assert.throws(()=>ctx.thuTuanTriggerResult_({triggerUid:'synthetic'},result),error=>error.message==='THU_TUAN_TRIGGER_ATTENTION:'+status);
 }
 for(const result of [{status:'COMPLETE',sent:0,alreadySent:3},{status:'COMPLETE',sent:2},{status:'DISABLED',sent:0}])
  assert.equal(ctx.thuTuanTriggerResult_({triggerUid:'synthetic'},result),result);
 for(const result of [{status:'private https://x/botTOKEN chat'},{},null])
  assert.throws(()=>ctx.thuTuanTriggerResult_({triggerUid:'synthetic'},result),error=>error.message==='THU_TUAN_TRIGGER_ATTENTION:UNRECOGNIZED');
});
test('trigger attention throws only after the runner logged and released its lock, with no sensitive data',()=>{
 const failAfterGetMe=({method,standard})=>method==='getMe'?standard:new Error('timeout synthetic-token-PROD synthetic-chat-PROD');
 for(const [status,options,mutate] of [
  ['CONTENT_NOT_APPROVED',{},w=>{w.row[5]='Nhap';}],
  ['CONTENT_MISSING_OR_DUPLICATE',{},w=>w.setNow('2026-09-28T01:00:00Z')],
  ['RECONCILIATION_REQUIRED',{response:failAfterGetMe},()=>{}],
  ['ZALO_BOT_MISMATCH',{response:({method,standard})=>method==='getMe'?{ok:true,result:{id:'bot-TEST',can_join_groups:true}}:standard},()=>{}],
  ['ZALO_GATE_BLOCKED',{},w=>{delete w.props.THU_TUAN_ZALO_PROD_GROUP_CONFIRMED;}],
  ['BUSY',{},w=>{w.busy=true;}]
 ]){
  const manual=zaloWorld({env:'PROD',...options});mutate(manual);if(manual.busy)manual.ctx.LockService={getScriptLock:()=>({tryLock:()=>false,releaseLock(){throw Error('not owned');}})};
  assert.equal(manual.ctx.guiThuTuan().status,status,'manual '+status);
  const w=zaloWorld({env:'PROD',...options});mutate(w);let held=0;
  w.ctx.LockService={getScriptLock:()=>({tryLock(){if(w.busy)return false;held++;return true;},releaseLock(){held--;}})};
  let error;assert.throws(()=>w.ctx.guiThuTuan({triggerUid:'synthetic'}),e=>{error=e;return e.message==='THU_TUAN_TRIGGER_ATTENTION:'+status;},status);
  assert.equal(held,0,status);assert.equal(w.logs.at(-1),JSON.stringify({status:'THU_TUAN_TRIGGER_ATTENTION',operationStatus:status}));
  if(status!=='BUSY')assert.equal(JSON.parse(w.logs.at(-2)).status,status);
  if(status==='RECONCILIATION_REQUIRED'){assert.equal(w.zaloEntries()[0].TrangThai,'UNKNOWN');assert.equal(w.sendRequests.length,1);}
  for(const hidden of ['synthetic-token-PROD','synthetic-chat-PROD','Fixture'])assert.equal((String(error)+w.logs.join('')).includes(hidden),false,hidden);
 }
 const g=world({content:[draft({})],recipients:[{MaCB:'CB1',Email:'one@example.test',TrangThai:'DangNhan'},{MaCB:'CB2',Email:'two@example.test',TrangThai:'DangNhan'}]});
 g.setNow('2026-09-21T01:00:00Z');g.ctx.duyetNoiDungThuTuan('2026-09-21');g.ctx.MailApp={...g.ctx.MailApp,getRemainingDailyQuota:()=>1};
 assert.equal(g.ctx.guiThuTuan().status,'QUOTA_DEFERRED');
 assert.throws(()=>g.ctx.guiThuTuan({triggerUid:'synthetic'}),/THU_TUAN_TRIGGER_ATTENTION:QUOTA_DEFERRED/);assert.equal(g.mail.length,0);
 const d=zaloWorld({env:'PROD',enabled:false});assert.equal(d.ctx.guiThuTuan({triggerUid:'synthetic'}).status,'DISABLED');assert.equal(d.requests.length,0);
});
test('caiLichThuTuan installs a Zalo PROD trigger only when every PROD gate passes',()=>{
 const ok=zaloWorld({env:'PROD'});assert.equal(ok.ctx.caiLichThuTuan().status,'CREATED');
 assert.deepEqual(plain(ok.created),[{tz:'Asia/Ho_Chi_Minh',day:'MONDAY',hour:7,every:1}]);assert.equal(ok.requests.length,0);
 for(const mutate of [w=>w.props.THU_TUAN_ENABLED='false',w=>delete w.props.THU_TUAN_ZALO_PROD_GROUP_CONFIRMED,
  w=>w.props.THU_TUAN_ZALO_PROD_GROUP_CONFIRMED='TRUE',w=>w.props.THU_TUAN_ZALO_PROD_CHAT_SHA256='0'.repeat(64),
  w=>w.props.THU_TUAN_ZALO_PROD_CHAT_ID='another-chat',w=>delete w.props.THU_TUAN_ZALO_PROD_BOT_TOKEN,
  w=>w.ctx.ScriptApp.getScriptId=()=> 'script-TEST',w=>w.props.THU_TUAN_PRIVATE_SHEET_ID='private-id',
  w=>w.props.THU_TUAN_ZALO_ENV='TEST',w=>w.props.THU_TUAN_TEST_MODE='true',w=>w.props.THU_TUAN_TEST_MODE='TRUE',
  w=>w.props.THU_TUAN_ZALO_PROD_BOT_ID='bot-TEST',w=>delete w.props.THU_TUAN_ZALO_PROD_SCRIPT_ID]){
  const w=zaloWorld({env:'PROD'});mutate(w);
  assert.throws(()=>w.ctx.caiLichThuTuan());assert.equal(w.created.length,0);assert.equal(w.requests.length,0);
 }
});
test('PROD trigger sends the approved week exactly once; the next trigger is alreadySent and calls no API',()=>{
 const w=zaloWorld({env:'PROD'});
 const first=w.ctx.guiThuTuan({triggerUid:'synthetic'});
 assert.equal(first.status,'COMPLETE');assert.equal(first.sent,1);assert.equal(first.environment,'PROD');
 assert.equal(w.sendRequests.length,1);assert.equal(w.sendRequests[0].payload.chat_id,'synthetic-chat-PROD');
 const requests=w.requests.length,second=w.ctx.guiThuTuan({triggerUid:'synthetic'});
 assert.equal(second.status,'COMPLETE');assert.equal(second.sent,0);assert.equal(second.alreadySent,1);assert.equal(second.pending,0);
 assert.equal(w.requests.length,requests);assert.equal(w.sendRequests.length,1);
 assert.deepEqual(w.zaloEntries().map(entry=>entry.TrangThai),['SENT']);assert.equal(w.zaloEntries()[0].Environment,'PROD');
});
// ---------- Single-message Zalo editorial approval ----------
test('Zalo four-section renderer preserves approved text, merges meaning/application, and leaves email unchanged',()=>{
 const ctx=weekly(),c=zaloDraft({Ky:'2026-10-12',NoiDungNguyenVan:'  Exact quote\r\nwith combining e\u0301 👨‍👩‍👧‍👦  ',NguonTrich:'Exact source *literal*',BoiCanhZalo:'  Exact context  '});
 const text=ctx.thuTuanRenderZaloText_(c),email=ctx.thuTuanRenderText_(c);
 assert.match(text,/Tuần từ 12\/10\/2026/);assert.ok(text.includes(c.NoiDungNguyenVan));assert.ok(text.includes(c.NguonTrich));assert.ok(text.includes(c.BoiCanhZalo));
 assert.match(text,/Ý NGHĨA VÀ VẬN DỤNG/);for(const absent of [c.MaLoiDay,c.PhanTich,c.LienHeCAND,'Muốn dừng nhận thư','nội dung đã được kiểm duyệt'])assert.equal(text.includes(absent),false,absent);
 const old={...c};for(const key of ctx.THU_TUAN_ZALO_FIELDS_)delete old[key];assert.equal(email,ctx.thuTuanRenderText_(old));
 assert.ok(email.includes(c.PhanTich));assert.ok(email.includes(c.LienHeCAND));
});
test('Zalo approval boundary 1800 passes; 1801 rejects before any formatting, row or log write',()=>{
 for(const length of [1800,1801]){
  const ctx=weekly(),c=zaloDraft({HanhDongTuanNayZalo:'x'}),base=ctx.thuTuanRenderZaloText_(c).length;c.HanhDongTuanNayZalo='x'.repeat(1+length-base);
  const w=world({content:[c]});w.props.THU_TUAN_TRANSPORT='ZALO';const sheet=w.sheets['content-id|LoiDay_NoiDung'],before=JSON.stringify(sheet.data);
  if(length===1800){assert.equal(w.ctx.duyetNoiDungThuTuan(c.Ky).status,'APPROVED');assert.match(sheet.data[1][9],/^v3:/);}
  else {assert.throws(()=>w.ctx.duyetNoiDungThuTuan(c.Ky),/ZALO_TEXT_TOO_LONG_FOR_ONE_MESSAGE/);assert.equal(JSON.stringify(sheet.data),before);assert.equal(sheet.formatCalls.length,0);}
  assert.equal(w.mail.length,0);assert.equal(w.sheets['private-id|ThuTuan_NhatKyGui'].data.length,1);
 }
});
test('every Zalo editorial field is required at approval and signed; clearing all fields cannot restore a v2 approval',()=>{
 for(const field of ['BoiCanhZalo','YNgiaVanDungZalo','HanhDongTuanNayZalo']){
  const w=world({content:[zaloDraft({})]});w.props.THU_TUAN_TRANSPORT='ZALO';const row=w.sheets['content-id|LoiDay_NoiDung'].data[1],index=w.H.LoiDay_NoiDung.indexOf(field);
  const saved=row[index];row[index]='';assert.throws(()=>w.ctx.duyetNoiDungThuTuan('2026-09-21'),/ZALO_CONTENT_REQUIRED/);row[index]=saved;
  w.ctx.duyetNoiDungThuTuan('2026-09-21');row[index]+=' edit';const savedRow=w.ctx.thuTuanRows_(w.sheets['content-id|LoiDay_NoiDung'],'LoiDay_NoiDung')[0];assert.equal(w.ctx.thuTuanApprovalProblem_(savedRow,w.ctx.thuTuanDigest_(savedRow,SECRET),[REVIEWER]),'STAMP_MISMATCH');
 }
 const ctx=weekly(),c=stamp(ctx,zaloDraft({TrangThai:'DaDuyet',NguoiDuyet:REVIEWER,NgayDuyet:new Date()}));assert.match(c.DauVanBanDuyet,/^v3:/);
 for(const key of ctx.THU_TUAN_ZALO_FIELDS_)c[key]='';assert.notEqual(ctx.thuTuanDigest_(c,SECRET),c.DauVanBanDuyet);
});
test('legacy v2 approval hash, renderer and multipart receipt dedupe remain identical with the extended schema',()=>{
 const ctx=weekly(),c=stamp(ctx,contentRow({NotebookLM_URL:'',BoiCanh:'x'.repeat(2500)}));
 const oldKeys=Array.from(ctx.THU_TUAN_CANONICAL_FIELDS_),values=[2,...oldKeys.map(key=>key==='NgayDuyet'?new Date(c[key]).toISOString():String(c[key]??''))];
 assert.equal(c.DauVanBanDuyet,crypto.createHmac('sha256',SECRET).update(JSON.stringify(values)).digest('hex'));
 assert.equal(ctx.thuTuanRenderZaloText_(c),ctx.thuTuanRenderText_(c));
 const w=zaloWorld({contentOverrides:{BoiCanh:'x'.repeat(2500)}});assert.equal(w.ctx.guiThuTuan().sent,2);const before=w.requests.length;
 assert.equal(w.ctx.guiThuTuan().alreadySent,2);assert.equal(w.requests.length,before);
 const legacy=world({content:[c]});const sheet=legacy.sheets['content-id|LoiDay_NoiDung'];sheet.data.forEach(row=>row.splice(17));assert.equal(legacy.ctx.thuTuanSheet_('content-id','LoiDay_NoiDung'),sheet);
 sheet.data[0][16]='Wrong header';assert.throws(()=>legacy.ctx.thuTuanSheet_('content-id','LoiDay_NoiDung'),/INVALID_HEADERS/);
});
test('a new Gmail approval cannot bypass the single-message gate after transport changes to Zalo',()=>{
 for(const missing of [true,false]){
  const w=zaloWorld();w.props.THU_TUAN_TRANSPORT='GMAIL';const row=w.row;
  if(!missing)for(const [key,value] of Object.entries(zaloDraft({YNgiaVanDungZalo:'x'.repeat(1800)})))if(w.H.LoiDay_NoiDung.includes(key))row[w.H.LoiDay_NoiDung.indexOf(key)]=value;
  w.ctx.duyetNoiDungThuTuan('2026-09-21');w.props.THU_TUAN_TRANSPORT='ZALO';const r=w.ctx.guiThuTuan();
  assert.equal(r.status,'ZALO_RUN_BLOCKED');assert.equal(r.reason,missing?'ZALO_CONTENT_REQUIRED':'ZALO_TEXT_TOO_LONG_FOR_ONE_MESSAGE');assert.equal(w.requests.length,0);assert.equal(w.zaloLog.data.length,1);
 }
});
test('authorized draft preview shows exact text and counts before approval without logs, writes or network',()=>{
 const w=world({content:[zaloDraft({})]}),before=JSON.stringify(w.sheets['content-id|LoiDay_NoiDung'].data);w.props.THU_TUAN_APPROVAL_WEEK='2026-09-21';
 const p=w.ctx.xemTruocBanNhapZaloThuTuan();assert.equal(p.status,'ZALO_DRAFT_PREVIEW');assert.equal(p.utf16Length,p.text.length);assert.equal(p.partCount,1);assert.equal(p.fitsOneMessage,true);
 assert.equal(JSON.stringify(w.sheets['content-id|LoiDay_NoiDung'].data),before);assert.equal(w.logs.length,0);assert.equal(w.mail.length,0);
 const forbidden=world({actor:'intruder@example.test',content:[zaloDraft({})]});assert.throws(()=>forbidden.ctx.xemTruocNoiDungZaloThuTuan('2026-09-21'),/APPROVER_REQUIRED/);
 w.props.THU_TUAN_APPROVAL_WEEK='';assert.throws(()=>w.ctx.xemTruocBanNhapZaloThuTuan(),/INVALID_WEEK/);
});
test('Unicode and optional NotebookLM are included in the actual single-message check',()=>{
 const ctx=weekly(),c=zaloDraft({NotebookLM_URL:'https://notebooklm.google.com/notebook/test-link',YNgiaVanDungZalo:'👨‍👩‍👧‍👦 e\u0301'});
 const text=ctx.thuTuanZaloOneMessage_(c);assert.ok(text.includes(c.NotebookLM_URL));assert.ok(text.includes(ctx.THU_TUAN_NOTEBOOK_NOTE));
 c.YNgiaVanDungZalo='\uD800';assert.throws(()=>ctx.thuTuanZaloOneMessage_(c),/ZALO_INVALID_UNICODE/);
 c.YNgiaVanDungZalo='x'.repeat(1600);assert.throws(()=>ctx.thuTuanZaloOneMessage_(c),/ZALO_TEXT_TOO_LONG_FOR_ONE_MESSAGE/);
});
test('append-only schema upgrade preserves legacy approvals and rows, requires disabled sending and an authorized reviewer',()=>{
 const ctx=weekly(),c=stamp(ctx,contentRow({})),w=world({enabled:false,content:[c]}),sheet=w.sheets['content-id|LoiDay_NoiDung'];sheet.data.forEach(row=>row.splice(17));sheet.getMaxColumns=()=>26;
 const before=JSON.stringify(sheet.data[1]),oldHeaders=sheet.data[0].slice();
 assert.equal(w.ctx.nangCapCotNoiDungZaloThuTuan().status,'ZALO_COLUMNS_ADDED');assert.equal(JSON.stringify(sheet.data[1]),before);assert.deepEqual(sheet.data[0].slice(0,17),oldHeaders);assert.equal(sheet.data[0].length,20);
 const saved=w.ctx.thuTuanRows_(sheet,'LoiDay_NoiDung')[0];assert.equal(w.ctx.thuTuanDigest_(saved,SECRET),c.DauVanBanDuyet);assert.equal(w.ctx.nangCapCotNoiDungZaloThuTuan().status,'SCHEMA_ALREADY_CURRENT');
 w.props.THU_TUAN_ENABLED='true';assert.throws(()=>w.ctx.nangCapCotNoiDungZaloThuTuan(),/DISABLE_BEFORE_SCHEMA_UPGRADE/);
 const intruder=world({enabled:false,actor:'intruder@example.test'});assert.throws(()=>intruder.ctx.nangCapCotNoiDungZaloThuTuan(),/APPROVER_REQUIRED/);
});
test('local Zalo export round-trips CSV, preserves email fields and calendar, clears approval and refuses uncertain sources',()=>{
 const tool=require('../services/thu-tuan/tools/zalo-content-to-sheet.cjs'),ctx=tool.runtime(),c=zaloDraft({Ky:'2026-10-12',MaLoiDay:'LD-047',NoiDungNguyenVan:'Quote "exact"\nline two',BoiCanh:'Full original email context.'}),headers=Array.from(ctx.THU_TUAN_HEADERS.LoiDay_NoiDung).slice(0,17);
 const csv=require('../services/thu-tuan/tools/corpus-to-sheet.cjs').toCsv(headers,[headers.map(key=>c[key]??'')]);const schedule=tool.parseCsv(csv);
 const r=tool.scheduleRows(schedule,[c],'2026-10-12',ctx)[0];assert.equal(r.Ky,c.Ky);assert.equal(r.NoiDungNguyenVan,c.NoiDungNguyenVan);assert.equal(r.NguonTrich,c.NguonTrich);assert.equal(r.BoiCanh,c.BoiCanh);assert.equal(r.TrangThai,'Nhap');assert.equal(r.DauVanBanDuyet,'');assert.equal(r.NguoiDuyet,'');
 assert.equal(tool.auditDrafts([c],ctx)[0].partCount,1);assert.throws(()=>tool.auditDrafts([c,c],ctx),/INVALID_OR_DUPLICATE_CODE/);
 assert.throws(()=>tool.scheduleRows(schedule,[{...c,sourceReviewRequired:true}],'2026-10-12',ctx),/NEEDS_SOURCE_REVIEW/);
 assert.throws(()=>tool.scheduleRows({...schedule,rows:[{...c,Ky:'2026-02-30'}]},[c],'2026-01-01',ctx),/INVALID_OR_DUPLICATE_WEEK/);
 assert.throws(()=>tool.scheduleRows({...schedule,rows:[c,c]},[c],'2026-10-12',ctx),/INVALID_OR_DUPLICATE_WEEK/);
 assert.equal(tool.scheduleRows(schedule,[c],'2026-10-19',ctx).length,0);
 assert.throws(()=>tool.main(['--input','missing.json','--report',__filename]),/OUTPUT_MUST_BE_OUTSIDE_REPOSITORY/);
 assert.throws(()=>tool.main(['--input','missing.json','--report','report.json','--schedule-preview','preview.md']),/SCHEDULE_PREVIEW_REQUIRES_SCHEDULE/);
});
