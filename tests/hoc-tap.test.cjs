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
 const headers=vm.runInContext('SHEET_HEADERS.QUIZ.slice()',ctx);
 ctx.getSpreadsheet_=()=>({getSheetByName:()=>({getLastRow:()=>rows.length+1,getLastColumn:()=>14,getRange:r=>({getValues:()=>r===1?[headers]:rows})})});
 const result=ctx.getRandomQuiz(10,'topic-a');assert.equal(result.length,1);assert.equal(result[0].source,'source');assert.equal(result[0].explanation,'explanation');
 assert.equal(ctx.getQuizTopics().length,2);assert.throws(()=>ctx.saveQuizResult({}),/tự học/);
});
test('public quiz reads fail closed on missing or mismatched schema without creating or rewriting a sheet',()=>{
 const source=fs.readFileSync(path.join(root,'backend/04-sheets-db.gs'),'utf8');
 for(const kind of ['missing','mismatched']){
  const ctx=load('backend/04-sheets-db.gs',{cleanValue_:v=>v==null?'':String(v).trim()});let writes=0,inserts=0;
  const headers=vm.runInContext('SHEET_HEADERS.QUIZ.slice()',ctx);
  if(kind==='mismatched')headers[0]='Legacy ID';
  const sheet=kind==='missing'?null:{getLastColumn:()=>14,getLastRow:()=>1,getRange:()=>({getValues:()=>[headers],setValues(){writes++;}})};
  ctx.getSpreadsheet_=()=>({getSheetByName:()=>sheet,insertSheet(){inserts++;throw Error('public GET must not create a sheet');}});
  assert.equal(ctx.getQuizTopics().length,0,kind);
  assert.equal(ctx.getRandomQuiz(10).length,0,kind);
  assert.equal(writes,0,kind);assert.equal(inserts,0,kind);
 }
 assert.ok(source.includes('function getReadOnlySheet_'));
});
test('public book reads fail closed on missing or legacy schema without creating or rewriting a sheet',()=>{
 const ctx=load('backend/04-sheets-db.gs',{cleanValue_:v=>v==null?'':String(v).trim()});
 vm.runInContext(fs.readFileSync(path.join(root,'backend/08-tusach.gs'),'utf8'),ctx);
 for(const kind of ['missing','mismatched']){
  let writes=0,inserts=0;
  const headers=vm.runInContext('SHEET_HEADERS.TU_SACH.slice()',ctx);
  if(kind==='mismatched')headers[14]='Legacy version';
  const sheet=kind==='missing'?null:{getLastColumn:()=>15,getLastRow:()=>1,getRange:()=>({getValues:()=>[headers],setValues(){writes++;}})};
  ctx.getSpreadsheet_=()=>({getSheetByName:()=>sheet,insertSheet(){inserts++;throw Error('public GET must not create a sheet');}});
  assert.equal(ctx.getBooks().length,0,kind);
  assert.throws(()=>ctx.getBookById('legacy-book'),/Không tìm/);
  assert.equal(writes,0,kind);assert.equal(inserts,0,kind);
 }
});

// Weekly-letter ("Thư tuần") tests live in tests/thu-tuan.test.cjs.

test('proxy rejects disabled GET/POST actions without calling upstream',async()=>{
 const file=fs.readFileSync(path.join(root,'web/api/gas.js'),'utf8').replace("import { createHash } from 'crypto';",'').replace('export default async function handler','async function handler');
 let calls=0;const ctx=vm.createContext({createHash:crypto.createHash,URL,process:{env:{GAS_DEPLOYMENT_URL:'https://example.test',IP_HASH_SALT:'test',TROLY35_ACCESS_CODE:'shared'}},fetch:async()=>{calls++;throw Error('unexpected');}});vm.runInContext(file,ctx);
 for(const method of ['GET','POST'])for(const action of ['troly35_history','troly35_trends','troly35_feedback','troly35_rate','submit_quiz']){
  const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await ctx.handler({method,headers:{},query:{action},body:{action}},res);assert.equal(res.code,403);assert.equal(res.data.success,false);
 }assert.equal(calls,0);
});
