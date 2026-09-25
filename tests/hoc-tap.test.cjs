const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function load(file,extra={}){const ctx=vm.createContext({console,Date,JSON,Set,Map,Number,Math,...extra});vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);return ctx;}
const noIO=new Proxy({}, {get(){throw Error('Unexpected I/O');}});
test('history, trends, feedback and ratings reject even with a shared access code, without I/O',()=>{
 const ctx=load('backend/08-troly35.gs',{SpreadsheetApp:noIO,CacheService:noIO});
 for(const name of ['handleTroLy35History','handleTroLy35Trends','handleTroLy35Feedback','handleTroLy35Rate']) assert.equal(ctx[name]({accessCode:'shared'}).success,false);
 assert.equal(ctx.troLy35SaveHistory_({input:'private',result:{answer:'private'}}),false);
 assert.equal(ctx.troLy35GetCachedRun_('old'),null);
 assert.equal(ctx.troLy35PutCachedRun_('key',{input:'private'}),false);
});
test('direct GAS router rejects historical actions and quiz persistence',()=>{
 const ctx=load('backend/07-main.gs',{parsePostData_:e=>e,ContentService:{createTextOutput:v=>({text:v,setMimeType(){return this;}}),MimeType:{JSON:'json'}},Logger:{log(){}},validateApiToken_:()=>{},saveQuizResult:()=>{throw Error('self-study');}});
 vm.runInContext(fs.readFileSync(path.join(root,'backend/08-troly35.gs'),'utf8'),ctx);
 for(const action of ['troly35_history','troly35_trends','troly35_feedback','troly35_rate','submit_quiz']){
   const result=ctx.doPost({action,accessCode:'shared'});assert.equal(JSON.parse(result.text).success,false);
 }
});
test('book requires explicit approval metadata; blank/legacy/revoked never public',()=>{
 const ctx=load('backend/08-tusach.gs',{cleanValue_:v=>v==null?'':String(v).trim()});
 const row=['id','title','author','2026','topic','summary','','','',JSON.stringify({label:'source',url:'https://example.test'}),'DaDuyet',new Date(),'reviewer',new Date(),'1'];
 assert.equal(ctx.tuSachIsApproved_(ctx.tuSachRowToBook_(row)),true);
 for(const status of ['', 'Hoạt động','Nhap','ThuHoi']){const copy=[...row];copy[10]=status;assert.equal(ctx.tuSachIsApproved_(ctx.tuSachRowToBook_(copy)),false);}
 for(const col of [9,12,13,14]){const copy=[...row];copy[col]='';assert.equal(!!ctx.tuSachIsApproved_(ctx.tuSachRowToBook_(copy)),false);}
});
test('public book reads do not seed or mutate catalog',()=>{
 const ctx=load('backend/08-tusach.gs',{cleanValue_:v=>v==null?'':String(v).trim()});ctx.seedTuSach=()=>{throw Error('must not seed');};ctx.tuSachGetRows_=()=>[];
 assert.equal(ctx.getBooks().length,0);assert.throws(()=>ctx.getBookById('absent'),/Không tìm/);
});
test('quiz filters approval and topic before sampling; legacy rows stay closed',()=>{
 const row=['q','question','a','b','c','d','A','explanation','topic-a','source','DaDuyet','reviewer','2026-09-19','1'];
 const rows=[row,[...row.slice(0,8),'topic-b',...row.slice(9)],[...row.slice(0,10),'Nhap',...row.slice(11)],row.slice(0,9)];
 const ctx=load('backend/04-sheets-db.gs',{cleanValue_:v=>v==null?'':String(v).trim(),shuffleRows_:v=>v});
 ctx.getSheet_=()=>({getLastRow:()=>rows.length+1,getLastColumn:()=>14,getRange:()=>({getValues:()=>rows})});
 const result=ctx.getRandomQuiz(10,'topic-a');assert.equal(result.length,1);assert.equal(result[0].source,'source');assert.equal(result[0].explanation,'explanation');
 assert.equal(ctx.getQuizTopics().length,2);assert.throws(()=>ctx.saveQuizResult({}),/tự học/);
});

function weekly(extra={}){return load('services/thu-tuan/Code.gs',{Utilities:{formatDate:(date,tz)=>new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(date),computeDigest:(_,text)=>Array.from(crypto.createHash('sha256').update(text).digest()),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'}},...extra});}
function weeklyContent(overrides={}){return Object.assign({Ky:'2026-09-21',ChuDe:'Kỷ luật và trách nhiệm',MaLoiDay:'LD1',NoiDungNguyenVan:'Fixture only',NguonTrich:'Fixture source',GoiYLienHe:'Fixture guidance',BoiCanh:'Fixture context',PhanTich:'Fixture analysis',LienHeCAND:'Fixture CAND link',LienHeAnNinhDoiNgoai:'Fixture external security link',HanhDongTuanNay:'Fixture action',NotebookLM_URL:'https://notebooklm.google.com/notebook/fixture-123',TrangThai:'DaDuyet',NguoiDuyet:'reviewer@example.test',NgayDuyet:'2026-09-19',PhienBan:'1'},overrides);}
function fixture(ctx){
 const content=weeklyContent();content.DauVanBanDuyet=ctx.thuTuanDigest_(content);
 const recipients=[{MaCB:'CB1',Email:'one@example.test',TrangThai:'DangNhan'},{MaCB:'CB2',Email:'two@example.test',TrangThai:'DangNhan'}],logs=[],sent=[];
 const io={now:()=>0,content:()=>[content],recipients:()=>recipients,logs:()=>logs.map(x=>({...x})),quota:()=>10,digest:ctx.thuTuanDigest_,put:e=>{const i=logs.findIndex(x=>x.Khoa===e.Khoa);if(i<0)logs.push({...e});else logs[i]={...e};},send:(r,c)=>sent.push({email:r.Email,key:c.Ky})};
 return {io,content,recipients,logs,sent,run:dry=>ctx.thuTuanRun_(io,content.Ky,dry)};
}
test('week key handles Vietnam midnight, ISO year boundary and week 53',()=>{
 const ctx=weekly();for(const [date,key] of [['2026-09-20T16:59:59Z','2026-09-14'],['2026-09-20T17:00:00Z','2026-09-21'],['2027-01-01T00:00:00Z','2026-12-28'],['2027-01-04T00:00:00Z','2027-01-04']])assert.equal(ctx.thuTuanWeekKey_(new Date(date)),key);
});
test('weekly preview performs no send/write and completed week does not resend',()=>{
 const f=fixture(weekly());assert.equal(f.run(true).pending,2);assert.equal(f.sent.length,0);assert.equal(f.logs.length,0);
 assert.equal(f.run(false).sent,2);assert.equal(f.run(false).alreadySent,2);assert.equal(f.sent.length,2);
 assert.ok(f.logs.every(x=>!('Email' in x)&&!('NoiDungNguyenVan' in x)));
});
test('draft, missing review metadata and edited content fail closed',()=>{
 for(const field of ['TrangThai','NguoiDuyet','NgayDuyet','PhienBan','NguonTrich','DauVanBanDuyet']){const f=fixture(weekly());f.content[field]='';assert.equal(f.run(false).status,'CONTENT_NOT_APPROVED');assert.equal(f.sent.length,0);}
 const f=fixture(weekly());f.content.GoiYLienHe+=' edited';assert.equal(f.run(false).status,'CONTENT_NOT_APPROVED');
});
test('duplicate/malformed recipient addresses stop before any mail',()=>{
 for(const email of ['one@example.test','a@example.test,b@example.test','a@example.test;b@example.test','invalid']){const f=fixture(weekly());f.recipients[1].Email=email;assert.equal(f.run(false).status,'INVALID_RECIPIENT_LIST');assert.equal(f.sent.length,0);}
});
test('quota shortage sends none and does not mark the week complete',()=>{const f=fixture(weekly());f.io.quota=()=>1;assert.equal(f.run(false).status,'QUOTA_DEFERRED');assert.equal(f.logs.length,0);});
test('failed SENDING write prevents send',()=>{const f=fixture(weekly());f.io.put=()=>{throw Error('write failed');};assert.throws(()=>f.run(false));assert.equal(f.sent.length,0);});
test('accepted mail followed by failed SENT write is held, not automatically resent',()=>{
 const f=fixture(weekly()),put=f.io.put;let once=true;f.io.put=e=>{if(e.TrangThai==='SENT'&&once){once=false;throw Error('lost write');}put(e);};
 assert.equal(f.run(false).status,'RECONCILIATION_REQUIRED');assert.equal(f.sent.length,1);assert.equal(f.logs[0].TrangThai,'UNKNOWN');
 assert.equal(f.run(false).unknown,1);assert.equal(f.sent.filter(x=>x.email==='one@example.test').length,1);
});
test('persisted SENDING after abrupt stop also prevents resend',()=>{const f=fixture(weekly());f.run(false);f.logs[0].TrangThai='SENDING';assert.equal(f.run(false).unknown,1);assert.equal(f.sent.length,2);});
test('opt out observed before send; revised content cannot mix versions in same week',()=>{
 const ctx=weekly(),f=fixture(ctx);f.recipients[0].TrangThai='TamDung';assert.equal(f.run(false).sent,1);
 f.content.PhienBan='2';f.content.DauVanBanDuyet=ctx.thuTuanDigest_(f.content);assert.equal(f.run(false).status,'CONTENT_CHANGED_DURING_WEEK');assert.equal(f.sent.length,1);
});
test('public-facing runner is off by default and lock prevents simultaneous work',()=>{
 const ctx=weekly();ctx.thuTuanConfig_=()=>({enabled:false});ctx.LockService=noIO;assert.equal(ctx.guiThuTuan().status,'DISABLED');
 ctx.thuTuanConfig_=()=>({enabled:true});ctx.LockService={getScriptLock:()=>({tryLock:()=>false})};ctx.thuTuanAdapter_=()=>{throw Error('must not read');};assert.equal(ctx.guiThuTuan().status,'BUSY');
});
test('runner releases lock on adapter failure',()=>{
 const ctx=weekly();let released=false;ctx.thuTuanConfig_=()=>({enabled:true});ctx.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{released=true;}})};ctx.thuTuanAdapter_=()=>{throw Error('bad schema');};assert.throws(()=>ctx.guiThuTuan());assert.equal(released,true);
});
test('approval fails closed without a listed reviewer',()=>{const ctx=weekly();ctx.thuTuanConfig_=()=>({approvers:[]});ctx.Session={getActiveUser:()=>({getEmail:()=>''})};ctx.SpreadsheetApp=noIO;assert.throws(()=>ctx.duyetNoiDungThuTuan('2026-09-21'),/APPROVER_REQUIRED/);});

test('approval stamps reviewer and date into the integrity digest',()=>{
 let ctx,written;
 const row=weeklyContent({TrangThai:'Nhap',NguoiDuyet:'',NgayDuyet:'',DauVanBanDuyet:''});
 const sheet={getLastRow:()=>2,getRange:(r,c,n,cols)=>({
  getValues:()=>r===1?[ctx.THU_TUAN_HEADERS.LoiDay_NoiDung.slice(0,cols)]:[ctx.THU_TUAN_HEADERS.LoiDay_NoiDung.map(k=>row[k]??'')],
  setValues:v=>{written=v;}
 })};
 ctx=weekly({
  PropertiesService:{getScriptProperties:()=>({getProperties:()=>({THU_TUAN_CONTENT_SHEET_ID:'content',THU_TUAN_PRIVATE_SHEET_ID:'private',THU_TUAN_APPROVER_EMAILS:'reviewer@example.test'})})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  Session:{getActiveUser:()=>({getEmail:()=>'reviewer@example.test'})},
  SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush(){}}
 });
 assert.equal(ctx.duyetNoiDungThuTuan(row.Ky).status,'APPROVED');
 const [status,reviewer,date,version,digest]=written[0];
 assert.equal(status,'DaDuyet');assert.equal(reviewer,'reviewer@example.test');assert.equal(version,'1');
 assert.equal(digest,ctx.thuTuanDigest_({...row,TrangThai:status,NguoiDuyet:reviewer,NgayDuyet:date,PhienBan:version}));
});
test('changing approval metadata after review invalidates the digest',()=>{
 for(const [field,value] of [['NguoiDuyet','other@example.test'],['NgayDuyet','2026-09-20']]){
  const f=fixture(weekly());f.content[field]=value;
  assert.equal(f.run(false).status,'CONTENT_NOT_APPROVED');assert.equal(f.sent.length,0);
 }
});
test('NotebookLM URL is required, restricted to NotebookLM and digest-bound',()=>{
 for(const url of ['', 'javascript:alert(1)', 'https://notebooklm.google.com.evil.test/notebook/id', 'https://example.test/notebook/id']){
  const f=fixture(weekly());f.content.NotebookLM_URL=url;
  assert.equal(f.run(false).status,'CONTENT_NOT_APPROVED');assert.equal(f.sent.length,0);
 }
 const f=fixture(weekly());f.content.NotebookLM_URL='https://notebooklm.google.com/notebook/another-id';
 assert.equal(f.run(false).status,'CONTENT_NOT_APPROVED');assert.equal(f.sent.length,0);
});
test('mail uses ordered responsive HTML and text, escapes Sheet values and labels NotebookLM as reference',()=>{
 let ctx,message;
 ctx=weekly({
  SpreadsheetApp:{openById:()=>({getSheetByName:()=>({getRange:()=>({getValues:()=>[ctx.THU_TUAN_HEADERS.ThuTuan_NhatKyGui]})})})},
  MailApp:{sendEmail:value=>{message=value;}}
 });
 const adapter=ctx.thuTuanAdapter_({contentId:'content',privateId:'private'});
 const content=weeklyContent({ChuDe:'<script>alert(1)</script>',NoiDungNguyenVan:'Lời Bác & <dạy>'});
 adapter.send({Email:'one@example.test'},content);
 const labels=['Tuần/Chủ đề','Mã lời dạy','Lời Bác dạy','Nguồn','Bối cảnh','Phân tích','Liên hệ CAND','Liên hệ An ninh đối ngoại','Hành động tuần này'];
 const positions=labels.map(label=>message.htmlBody.indexOf('>'+label+'</h2>'));
 assert.ok(positions.every((p,i)=>p>=0&&(i===0||p>positions[i-1])));
 assert.match(message.htmlBody,/name="viewport"/i);assert.match(message.htmlBody,/&lt;script&gt;/);assert.doesNotMatch(message.htmlBody,/<script>/);
 assert.match(message.htmlBody,/href="https:\/\/notebooklm\.google\.com\/notebook\/fixture-123"/);
 assert.match(message.htmlBody,/không phải nguồn chính thức/);
 assert.match(message.body,/Lời Bác & <dạy>/);assert.match(message.body,/Tra cứu mở rộng trên NotebookLM/);assert.match(message.body,/Muốn dừng nhận thư/);assert.match(message.htmlBody,/Muốn dừng nhận thư/);
 assert.match(message.body,/đối chiếu nội dung với nguồn gốc trích dẫn/);
});

test('proxy rejects disabled GET/POST actions without calling upstream',async()=>{
 const file=fs.readFileSync(path.join(root,'web/api/gas.js'),'utf8').replace("import { createHash } from 'crypto';",'').replace('export default async function handler','async function handler');
 let calls=0;const ctx=vm.createContext({createHash:crypto.createHash,URL,process:{env:{GAS_DEPLOYMENT_URL:'https://example.test',IP_HASH_SALT:'test',TROLY35_ACCESS_CODE:'shared'}},fetch:async()=>{calls++;throw Error('unexpected');}});vm.runInContext(file,ctx);
 for(const method of ['GET','POST'])for(const action of ['troly35_history','troly35_trends','troly35_feedback','troly35_rate','submit_quiz']){
  const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await ctx.handler({method,headers:{},query:{action},body:{action}},res);assert.equal(res.code,403);assert.equal(res.data.success,false);
 }assert.equal(calls,0);
});

test('approval metadata withdrawn mid-run stops the next recipient',()=>{
 const f=fixture(weekly()); const send=f.io.send; f.io.send=(r,c)=>{send(r,c);f.content.NguoiDuyet='';};
 assert.equal(f.run(false).status,'CONTENT_CHANGED_DURING_WEEK'); assert.equal(f.sent.length,1);
});
