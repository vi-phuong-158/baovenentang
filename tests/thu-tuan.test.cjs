// Thư tuần "Lời Bác dạy": deterministic tests, all Google services mocked; no mail leaves this process.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const root=path.resolve(__dirname,'..');
const CODE=fs.readFileSync(path.join(root,'services/thu-tuan/Code.gs'),'utf8');
const SECRET='fixture-approval-key-0123456789abcdef';
const REVIEWER='reviewer@example.test';
const noIO=new Proxy({}, {get(){throw Error('Unexpected I/O');}});
const Utilities={
 formatDate:(date,tz)=>new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(date),
 computeHmacSha256Signature:(value,key)=>Array.from(crypto.createHmac('sha256',key).update(value,'utf8').digest()).map(b=>b>127?b-256:b),
 Charset:{UTF_8:'utf8'},getUuid:()=>crypto.randomUUID()
};
function weekly(extra={}){const ctx=vm.createContext({console,Date,JSON,Number,Math,Utilities,Logger:{log(){}},...extra});vm.runInContext(CODE,ctx);return ctx;}
function contentRow(o={}){return Object.assign({Ky:'2026-09-21',ChuDe:'Kỷ luật và trách nhiệm',MaLoiDay:'LD-TEST-1',NoiDungNguyenVan:'Fixture only',NguonTrich:'Fixture source, Tập 0, tr. 0',GoiYLienHe:'',BoiCanh:'Fixture context',PhanTich:'Fixture analysis',LienHeCAND:'Fixture CAND link',LienHeAnNinhDoiNgoai:'Fixture external security link',HanhDongTuanNay:'Fixture action',NotebookLM_URL:'https://notebooklm.google.com/notebook/fixture-123',TrangThai:'DaDuyet',NguoiDuyet:REVIEWER,NgayDuyet:new Date('2026-09-19T03:00:00Z'),PhienBan:'1'},o);}
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
 const sheet={data,fmt,formatCalls:[],getLastRow:()=>data.length,
  getRange(r,c,nr=1,nc=1){return{
   getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>(data[r-1+i]||[])[c-1+j]??'')),
   setValues:v=>v.forEach((row,i)=>{data[r-1+i]=data[r-1+i]||[];row.forEach((x,j)=>{data[r-1+i][c-1+j]=coerce(r+i,c+j,x);});}),
   setNumberFormat:f=>{sheet.formatCalls.push([r,c,nr,nc,f]);for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)fmt[(r+i)+','+(c+j)]=f;}
  };}};
 return sheet;
}
function world({enabled=true,approvers=REVIEWER,secret=SECRET,actor=REVIEWER,content=[],recipients=[],triggers=[]}={}){
 const ctx0=weekly(),H=ctx0.THU_TUAN_HEADERS;
 const props={THU_TUAN_ENABLED:String(enabled),THU_TUAN_CONTENT_SHEET_ID:'content-id',THU_TUAN_PRIVATE_SHEET_ID:'private-id',THU_TUAN_APPROVER_EMAILS:approvers};
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
  SpreadsheetApp:{openById:id=>({getSheetByName:name=>sheets[id+'|'+name]||null}),flush(){}},
  MailApp:{sendEmail:m=>mail.push(m),getRemainingDailyQuota:()=>100},
  ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:h=>{builder.handler=h;return builder;},deleteTrigger:t=>deleted.push(t),WeekDay:{MONDAY:'MONDAY'}}
 });
 return {ctx,props,sheets,mail,created,deleted,logs,H,setNow:iso=>{ctx.Date=class extends Date{constructor(...a){super(...(a.length?a:[iso]));}static now(){return new Date(iso).getTime();}};}};
}
const draft=o=>contentRow(Object.assign({TrangThai:'Nhap',NguoiDuyet:'',NgayDuyet:'',DauVanBanDuyet:''},o));

// ---------- Week key ----------
test('week key handles Vietnam midnight, ISO year boundary and week 53',()=>{
 const ctx=weekly();for(const [date,key] of [['2026-09-20T16:59:59Z','2026-09-14'],['2026-09-20T17:00:00Z','2026-09-21'],['2027-01-01T00:00:00Z','2026-12-28'],['2027-01-04T00:00:00Z','2027-01-04']])assert.equal(ctx.thuTuanWeekKey_(new Date(date)),key);
});

// ---------- Approval / integrity ----------
test('only complete DaDuyet content from an allow-listed reviewer with a valid stamp is sendable',()=>{
 const f=fixture();assert.equal(f.run(false).status,'COMPLETE');assert.equal(f.sent.length,2);
});
test('each missing required field or approval field fails closed with a reason',()=>{
 const cases={TrangThai:'NOT_APPROVED',NguoiDuyet:'MISSING_REVIEWER',NgayDuyet:'INVALID_APPROVAL_DATE',PhienBan:'INCOMPLETE_CONTENT',NguonTrich:'INCOMPLETE_CONTENT',ChuDe:'INCOMPLETE_CONTENT',MaLoiDay:'INCOMPLETE_CONTENT',NoiDungNguyenVan:'INCOMPLETE_CONTENT',BoiCanh:'INCOMPLETE_CONTENT',PhanTich:'INCOMPLETE_CONTENT',LienHeCAND:'INCOMPLETE_CONTENT',LienHeAnNinhDoiNgoai:'INCOMPLETE_CONTENT',HanhDongTuanNay:'INCOMPLETE_CONTENT',DauVanBanDuyet:'STAMP_MISMATCH'};
 for(const [field,reason] of Object.entries(cases)){const f=fixture();f.content[field]='';const r=f.run(false);assert.equal(r.status,'CONTENT_NOT_APPROVED',field);assert.equal(r.reason,reason,field);assert.equal(f.sent.length,0);assert.equal(f.logs.length,0);}
 for(const status of ['Nhap','daduyet','DaDuyet ','ChoDuyet']){const f=fixture();f.content.TrangThai=status;assert.equal(f.run(false).status,'CONTENT_NOT_APPROVED');assert.equal(f.sent.length,0);}
});
test('invalid approval date is rejected even when re-stamped',()=>{
 const ctx=weekly();const f=fixture(ctx,{NgayDuyet:'not-a-date'});assert.equal(f.run(false).reason,'INVALID_APPROVAL_DATE');assert.equal(f.sent.length,0);
});
test('editing any stamped field after approval invalidates it (incl. legacy GoiYLienHe and NotebookLM)',()=>{
 for(const field of ['ChuDe','MaLoiDay','NoiDungNguyenVan','NguonTrich','GoiYLienHe','BoiCanh','PhanTich','LienHeCAND','LienHeAnNinhDoiNgoai','HanhDongTuanNay','PhienBan']){
  const f=fixture();f.content[field]+=' (sửa)';const r=f.run(false);
  assert.equal(r.status,'CONTENT_NOT_APPROVED',field);assert.equal(r.reason,'STAMP_MISMATCH',field);assert.equal(f.sent.length,0);
 }
 const f=fixture();f.content.NotebookLM_URL='https://notebooklm.google.com/notebook/another-id';assert.equal(f.run(false).reason,'STAMP_MISMATCH');
 const g=fixture();g.content.NguoiDuyet='other@example.test';assert.equal(g.run(false).status,'CONTENT_NOT_APPROVED');
 const h=fixture();h.content.NgayDuyet=new Date('2026-09-20T03:00:00Z');assert.equal(h.run(false).reason,'STAMP_MISMATCH');
});
test('a stamp forged without the Script Properties key is rejected',()=>{
 const f=fixture();const c=f.content;const plain=JSON.stringify(['Ky','ChuDe','MaLoiDay','NoiDungNguyenVan','NguonTrich','GoiYLienHe','BoiCanh','PhanTich','LienHeCAND','LienHeAnNinhDoiNgoai','HanhDongTuanNay','NotebookLM_URL','TrangThai','NguoiDuyet','NgayDuyet','PhienBan'].map(k=>k==='NgayDuyet'?new Date(c[k]).toISOString():String(c[k])));
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
 for(const email of ['ONE@example.test','a@example.test,b@example.test','a@example.test;b@example.test','invalid','<a@example.test>','']){const f=fixture();f.recipients[1].Email=email;assert.equal(f.run(false).status,'INVALID_RECIPIENT_LIST',email);assert.equal(f.sent.length,0);}
 for(const id of ['CB 2','','CB1']){const f=fixture();f.recipients[1].MaCB=id;assert.equal(f.run(false).status,'INVALID_RECIPIENT_LIST',id);assert.equal(f.sent.length,0);}
 const f=fixture();f.recipients.push({MaCB:'CB1',Email:'old@example.test',TrangThai:'TamDung'});assert.equal(f.run(false).status,'INVALID_RECIPIENT_LIST');assert.equal(f.sent.length,0);
});
test('paused recipients are skipped and may reuse an address; order is deterministic',()=>{
 const f=fixture();f.recipients.push({MaCB:'CB3',Email:'one@example.test',TrangThai:'TamDung'},{MaCB:'CB4',Email:'four@example.test',TrangThai:'TamDung'});
 assert.equal(f.run(false).status,'COMPLETE');assert.deepEqual(f.sent.map(s=>s.email),['one@example.test','two@example.test']);
});

// ---------- Preview ----------
test('preview reports counts and codes without sending or writing',()=>{
 const f=fixture();f.io.put=()=>{throw Error('preview must not write');};f.io.send=()=>{throw Error('preview must not send');};
 const r=f.run(true);assert.equal(r.status,'PREVIEW');assert.equal(r.pending,2);assert.equal(r.sent,0);assert.equal(r.maLoiDay,'LD-TEST-1');assert.equal(r.quota,10);assert.equal(r.notebookLM,true);
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
 assert.equal(f.sent.length+g.sent.length,4);
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
test('header drift is rejected',()=>{
 const w=world();w.sheets['content-id|LoiDay_NoiDung'].data[0][11]='BoiCanhX';assert.throws(()=>w.ctx.xemTruocThuTuan(),/INVALID_HEADERS/);
});

// ---------- Email rendering ----------
test('mail: one recipient per message, no cc/bcc, ordered sections, escaped values, NotebookLM only as reference',()=>{
 const w=world({content:[],recipients:[]});const adapter=w.ctx.thuTuanAdapter_({contentId:'content-id',privateId:'private-id',secret:SECRET});
 adapter.send({Email:'one@example.test'},contentRow({ChuDe:'<script>alert(1)</script>',NoiDungNguyenVan:'Lời Bác & <dạy>\ndòng 2'}));
 const m=w.mail[0];assert.deepEqual(Object.keys(m).sort(),['body','htmlBody','subject','to']);assert.equal(m.to,'one@example.test');assert.doesNotMatch(m.subject,/[\r\n]/);
 const labels=['Tuần/Chủ đề','Mã lời dạy','Lời Bác dạy','Nguồn','Bối cảnh','Phân tích','Liên hệ với Công an nhân dân','Liên hệ với công tác An ninh đối ngoại','Hành động tuần này'];
 const pos=labels.map(l=>m.htmlBody.indexOf('>'+l+'</h2>'));assert.ok(pos.every((p,i)=>p>=0&&(i===0||p>pos[i-1])),JSON.stringify(pos));
 const tpos=labels.map(l=>m.body.indexOf(l+':\n'));assert.ok(tpos.every((p,i)=>p>=0&&(i===0||p>tpos[i-1])));
 assert.match(m.htmlBody,/name="viewport"/i);assert.match(m.htmlBody,/charset="utf-8"/i);assert.match(m.htmlBody,/&lt;script&gt;/);assert.doesNotMatch(m.htmlBody,/<script>/);assert.match(m.htmlBody,/Lời Bác &amp; &lt;dạy&gt;<br>dòng 2/);
 assert.match(m.htmlBody,/href="https:\/\/notebooklm\.google\.com\/notebook\/fixture-123"/);assert.ok(m.htmlBody.indexOf('NotebookLM')>pos[8]);
 assert.match(m.htmlBody,/không phải nguồn chính thức/);assert.match(m.body,/Lời Bác & <dạy>/);assert.match(m.body,/Tra cứu thêm trên NotebookLM/);assert.match(m.body,/đối chiếu nội dung với nguồn gốc trích dẫn/);
 assert.match(m.body,/Muốn dừng nhận thư/);assert.match(m.htmlBody,/Muốn dừng nhận thư/);
 adapter.send({Email:'two@example.test'},contentRow({NotebookLM_URL:''}));
 assert.doesNotMatch(w.mail[1].htmlBody,/NotebookLM|href=/);assert.doesNotMatch(w.mail[1].body,/NotebookLM/);
});
test('runtime never calls AI or network services and exposes no web endpoint',()=>{
 for(const banned of [/UrlFetchApp/,/generativelanguage|gemini|openai/i,/function\s+doGet|function\s+doPost/,/\bbcc\s*:|\bcc\s*:/i])assert.doesNotMatch(CODE,banned);
});

// ---------- End-to-end through the real adapter and approval, on Sheets-like storage ----------
test('E2E: approve → preview → send → rerun sends nothing, with Sheets date coercion in play',()=>{
 const w=world({content:[draft({})],recipients:[{MaCB:'CB1',Email:'one@example.test',TrangThai:'DangNhan'},{MaCB:'CB2',Email:'two@example.test',TrangThai:'DangNhan'}]});
 w.setNow('2026-09-21T01:00:00.789Z');
 assert.equal(w.ctx.xemTruocThuTuan().reason,'NOT_APPROVED');
 const a=w.ctx.duyetNoiDungThuTuan('2026-09-21');assert.equal(a.status,'APPROVED');
 const row=w.sheets['content-id|LoiDay_NoiDung'].data[1];assert.equal(row[5],'DaDuyet');assert.equal(row[6],REVIEWER);assert.equal(row[7].getUTCMilliseconds(),0);assert.match(row[9],/^[0-9a-f]{64}$/);
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
test('approval: allow-list, Monday key, completeness, NotebookLM and wrapper placeholder all fail closed',()=>{
 const base={content:[draft({})],recipients:[]};
 assert.throws(()=>world({...base,actor:'intruder@example.test'}).ctx.duyetNoiDungThuTuan('2026-09-21'),/APPROVER_REQUIRED/);
 assert.throws(()=>world({...base,actor:''}).ctx.duyetNoiDungThuTuan('2026-09-21'),/APPROVER_REQUIRED/);
 assert.throws(()=>world({...base,approvers:''}).ctx.duyetNoiDungThuTuan('2026-09-21'),/APPROVER_REQUIRED/);
 for(const ky of ['2026-09-22','21/09/2026','',undefined])assert.throws(()=>world(base).ctx.duyetNoiDungThuTuan(ky),/INVALID_WEEK/);
 assert.throws(()=>world(base).ctx.duyetKyThuTuan(),/INVALID_WEEK/);
 assert.throws(()=>world(base).ctx.duyetNoiDungThuTuan('2026-09-28'),/INVALID_WEEK/);
 assert.throws(()=>world({...base,secret:''}).ctx.duyetNoiDungThuTuan('2026-09-21'),/MISSING_APPROVAL_SECRET/);
 assert.throws(()=>world({content:[draft({NguonTrich:''})]}).ctx.duyetNoiDungThuTuan('2026-09-21'),/INCOMPLETE_CONTENT/);
 assert.throws(()=>world({content:[draft({PhienBan:''})]}).ctx.duyetNoiDungThuTuan('2026-09-21'),/INCOMPLETE_CONTENT/);
 assert.throws(()=>world({content:[draft({NotebookLM_URL:'https://evil.test'})]}).ctx.duyetNoiDungThuTuan('2026-09-21'),/INVALID_NOTEBOOKLM_URL/);
 const ok=world({content:[draft({NotebookLM_URL:''})]});ok.setNow('2026-09-20T01:00:00Z');assert.equal(ok.ctx.duyetNoiDungThuTuan('2026-09-21').status,'APPROVED');
});
test('approval is verified by reading back; a stamp that does not survive Sheets is reported',()=>{
 const w=world({content:[draft({})]});w.setNow('2026-09-21T01:00:00Z');const sheet=w.sheets['content-id|LoiDay_NoiDung'];
 const orig=sheet.getRange;sheet.getRange=(r,c,nr,nc)=>{const g=orig(r,c,nr,nc);if(r===2&&c===6)return{...g,setValues:v=>g.setValues([[v[0][0],v[0][1],new Date(v[0][2].getTime()+3600e3),v[0][3],v[0][4]]])};return g;};
 assert.throws(()=>w.ctx.duyetNoiDungThuTuan('2026-09-21'),/APPROVAL_NOT_VERIFIED:STAMP_MISMATCH/);
 assert.equal(w.ctx.xemTruocThuTuan().reason,'STAMP_MISMATCH');
});
test('re-approving a week that already has send logs blocks further sends for that week',()=>{
 const w=world({content:[draft({})],recipients:[{MaCB:'CB1',Email:'one@example.test',TrangThai:'DangNhan'},{MaCB:'CB2',Email:'two@example.test',TrangThai:'TamDung'}]});
 w.setNow('2026-09-21T01:00:00Z');w.ctx.duyetNoiDungThuTuan('2026-09-21');w.ctx.guiThuTuan();
 w.sheets['private-id|ThuTuan_NguoiNhan'].data[2][2]='DangNhan';w.setNow('2026-09-21T05:00:00Z');w.ctx.duyetNoiDungThuTuan('2026-09-21');
 assert.equal(w.ctx.guiThuTuan().status,'CONTENT_CHANGED_DURING_WEEK');assert.equal(w.mail.length,1);
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
 assert.deepEqual(m.oauthScopes.slice().sort(),['https://www.googleapis.com/auth/script.scriptapp','https://www.googleapis.com/auth/script.send_mail','https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/userinfo.email']);
});

// ---------- Corpus import tool ----------
const tool=require(path.join(root,'services/thu-tuan/tools/corpus-to-sheet.cjs'));
const MD=`# Fixture corpus\n\n## Tuần 01 — Chủ đề A\n\n**LD-901 · TAG**\n\n> Dòng một\n> dòng hai\n\n**Nguồn:** Tác phẩm giả; Tập 1, tr. 2\n\n**Bối cảnh:** BC\n\n**Phân tích:** PT, có "ngoặc"\n\n**Liên hệ CAND:** CAND\n\n**Liên hệ An ninh đối ngoại — phản gián:** ANĐN\n\n**Hành động tuần này:** HĐ\n\n## Tuần 02 — Chủ đề B\n\n**LD-902 · TAG**\n\n> Trích B\n\n**Nguồn:** Tác phẩm giả; Tập 3, tr. 4\n\n**Bối cảnh:** BC2\n\n**Phân tích:** PT2\n\n**Liên hệ CAND:** C2\n\n**Liên hệ An ninh đối ngoại — phản gián:** A2\n\n**Hành động tuần này:** H2\n`;
test('corpus tool: parses weeks into the approved structure and exports drafts only',()=>{
 const {weeks,errors}=tool.parseCorpus(MD);assert.deepEqual(errors,[]);assert.equal(weeks.length,2);
 assert.deepEqual({...weeks[0]},{tuan:1,ChuDe:'Chủ đề A',MaLoiDay:'LD-901',NoiDungNguyenVan:'Dòng một\ndòng hai',NguonTrich:'Tác phẩm giả; Tập 1, tr. 2',BoiCanh:'BC',PhanTich:'PT, có "ngoặc"',LienHeCAND:'CAND',LienHeAnNinhDoiNgoai:'ANĐN',HanhDongTuanNay:'HĐ'});
 assert.deepEqual(tool.auditWeeks(weeks,2),[]);
 const headers=tool.loadHeaders();assert.deepEqual(headers,[...weekly().THU_TUAN_HEADERS.LoiDay_NoiDung]);
 const rows=tool.buildRows(weeks,'2026-10-05',{headers});const obj=rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
 assert.deepEqual(obj.map(o=>o.Ky),['2026-10-05','2026-10-12']);
 for(const o of obj){assert.equal(o.TrangThai,'Nhap');assert.equal(o.NguoiDuyet,'');assert.equal(o.NgayDuyet,'');assert.equal(o.DauVanBanDuyet,'');assert.equal(o.NotebookLM_URL,'');}
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
