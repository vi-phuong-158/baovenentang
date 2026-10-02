// Synthetic local acceptance-helper tests. No Google service or network is contacted.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=['Code.gs','ZaloTransport.gs','ZaloAcceptance.gs'].map(file=>fs.readFileSync(path.join(root,'services/thu-tuan',file),'utf8')).join('\n');
const secret='synthetic-acceptance-secret-0123456789abcdef',reviewer='reviewer@example.test';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function sheet(headers,rows=[]){
 const data=[headers.slice(),...rows.map(row=>row.slice())],writes=[];
 return {data,writes,getLastRow:()=>data.length,getLastColumn:()=>Math.max(...data.map(row=>row.length)),
  getRange(r,c,nr=1,nc=1){return {
   getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>data[r+i-1]?.[c+j-1]??'')),
   setNumberFormat(){},setValues(values){writes.push({row:r,column:c,values});values.forEach((row,i)=>{data[r+i-1]??=[];row.forEach((v,j)=>{data[r+i-1][c+j-1]=v;});});}
  };}};
}
function world(){
 let time=Date.parse('2026-10-01T03:00:00Z');
 class Clock extends Date {constructor(...args){super(...(args.length?args:[time]));}static now(){return time;}}
 const props={THU_TUAN_ENABLED:'false',THU_TUAN_TEST_MODE:'true',THU_TUAN_TRANSPORT:'ZALO',THU_TUAN_ZALO_ENV:'TEST',
  THU_TUAN_CONTENT_SHEET_ID:'synthetic-content',THU_TUAN_PRIVATE_SHEET_ID:'synthetic-private',THU_TUAN_APPROVER_EMAILS:reviewer,THU_TUAN_APPROVAL_SECRET:secret,
  THU_TUAN_ZALO_TEST_SCRIPT_ID:'synthetic-script',THU_TUAN_ZALO_TEST_CONTENT_SHEET_ID:'synthetic-content',THU_TUAN_ZALO_TEST_PRIVATE_SHEET_ID:'synthetic-private',
  THU_TUAN_ZALO_TEST_BOT_ID:'synthetic-bot',THU_TUAN_ZALO_TEST_BOT_TOKEN:'synthetic-token',THU_TUAN_ZALO_TEST_CHAT_ID:'synthetic-group',
  THU_TUAN_ZALO_TEST_CHAT_SHA256:sha('synthetic-group'),THU_TUAN_ZALO_TEST_GROUP_CONFIRMED:'true'};
 const tables={},logs=[],requests=[],deliveries=[],propertyWrites=[];
 const w={props,tables,logs,requests,deliveries,propertyWrites,busy:false,actor:reviewer,sendFailure:false,tick:()=>{time+=1000;}};
 const ctx=vm.createContext({Date:Clock,JSON,Math,Number,Set,Intl,
  Utilities:{Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},
   formatDate:date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date),
   computeDigest:(_,value)=>Array.from(crypto.createHash('sha256').update(value).digest()),
   computeHmacSha256Signature:(value,key)=>Array.from(crypto.createHmac('sha256',key).update(value).digest())},
  Logger:{log:value=>logs.push(String(value))},Session:{getActiveUser:()=>({getEmail:()=>w.actor})},
  PropertiesService:{getScriptProperties:()=>({getProperties:()=>({...props}),getProperty:key=>props[key]??null,
   setProperty(key,value){propertyWrites.push(key);if(w.propertyWriteHook)w.propertyWriteHook(key,value);else props[key]=value;}})},
  LockService:{getScriptLock:()=>({tryLock(){if(w.lockHook)w.lockHook();return !w.busy;},releaseLock(){}})},
  ScriptApp:{getScriptId:()=> 'synthetic-script'},
  SpreadsheetApp:{openById:id=>({getSheetByName:name=>tables[id+'|'+name]??null}),flush(){}},
  MailApp:new Proxy({},{get(){throw Error('Gmail must never be used');}}),
  UrlFetchApp:{fetch(url,options){
   const method=url.split('/').at(-1);requests.push(method);
   const body=method==='getMe'?{ok:true,result:{id:props.THU_TUAN_ZALO_TEST_BOT_ID,can_join_groups:true}}:
    w.sendFailure?{ok:false,error_code:408}:{ok:true,result:{message_id:'synthetic-receipt-'+(deliveries.length+1)}};
   if(method==='sendMessage'&&!w.sendFailure)deliveries.push(JSON.parse(options.payload));
   return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(body)};
  }}
 });
 vm.runInContext(source,ctx);w.ctx=ctx;
 const H=ctx.THU_TUAN_HEADERS;
 const row={Ky:'2026-09-28',MaLoiDay:'LD-TEST-SOURCE',ChuDe:'TEST canonical clone',NoiDungNguyenVan:'TEST synthetic quote',NguonTrich:'TEST synthetic source',
  BoiCanhZalo:'TEST short context',YNgiaVanDungZalo:'TEST meaning and application',HanhDongTuanNayZalo:'TEST weekly action',BoiCanh:'TEST context',PhanTich:'TEST analysis',LienHeCAND:'TEST connection',HanhDongTuanNay:'TEST action',NotebookLM_URL:'',
  TrangThai:'DaDuyet',NguoiDuyet:reviewer,NgayDuyet:new Date('2026-09-28T01:00:00Z'),PhienBan:'1',GoiYLienHe:'legacy excluded',LienHeAnNinhDoiNgoai:'legacy excluded'};
 row.DauVanBanDuyet=ctx.thuTuanDigest_(row,secret);
 w.content=sheet(H.LoiDay_NoiDung,[H.LoiDay_NoiDung.map(key=>row[key]??'')]);
 w.gmail=sheet(H.ThuTuan_NhatKyGui,[['2026-09-28|SOURCE','2026-09-28','SOURCE',row.MaLoiDay,'1',row.DauVanBanDuyet,'SENT',new Date(),'']]);
 w.zalo=sheet(H.ThuTuan_Zalo_NhatKyGui);
 tables['synthetic-content|LoiDay_NoiDung']=w.content;tables['synthetic-private|ThuTuan_NhatKyGui']=w.gmail;tables['synthetic-private|ThuTuan_Zalo_NhatKyGui']=w.zalo;
 w.oldContent=JSON.stringify(w.content.data);w.oldGmail=JSON.stringify(w.gmail.data);
 return w;
}
function previewed(w){
 assert.equal(w.ctx.chuanBiFixtureZaloThuTuanTest().status,'TEST_FIXTURE_DRAFT_CREATED');
 assert.equal(w.ctx.duyetFixtureZaloThuTuanTest().status,'APPROVED');
 assert.equal(w.ctx.xemTruocFixtureZaloThuTuanTest().previewSealed,true);
}
test('fixture preparation appends an unapproved canonical clone and preserves current Gmail history',()=>{
 const w=world(),r=w.ctx.chuanBiFixtureZaloThuTuanTest();assert.equal(r.status,'TEST_FIXTURE_DRAFT_CREATED');assert.equal(r.key,'2026-10-05');
 const row=w.content.data[2];assert.equal(row[0],'2026-10-05');assert.deepEqual(row.slice(5,8),['Nhap','','']);assert.equal(row[9],'');assert.equal(row[4],'');assert.equal(row[14],'');
 assert.equal(JSON.stringify(w.content.data.slice(0,2)),w.oldContent);assert.equal(JSON.stringify(w.gmail.data),w.oldGmail);assert.equal(w.zalo.data.length,1);
 assert.equal(w.requests.length,0);assert.equal(w.ctx.xemTruocFixtureZaloThuTuanTest().status,'TEST_ACCEPTANCE_BLOCKED');
 const before=JSON.stringify(w.content.data);assert.equal(w.ctx.chuanBiFixtureZaloThuTuanTest().status,'TEST_FIXTURE_ALREADY_EXISTS_OR_HAS_HISTORY');assert.equal(JSON.stringify(w.content.data),before);
});
test('manual fixture workflow uses real core receipts, disables sending, dedupes and performs a read-only receipt audit',()=>{
 const w=world();previewed(w);assert.equal(w.requests.length,0);
 const approved=w.content.data[2].slice(),seal=JSON.parse(w.props.THU_TUAN_ZALO_TEST_ACCEPTANCE_PREVIEW);
 for(const forbidden of ['synthetic-script','synthetic-bot','synthetic-group','synthetic-token',secret,'TEST synthetic quote'])assert.equal(JSON.stringify(seal).includes(forbidden),false);
 w.props.THU_TUAN_ENABLED='true';const sent=w.ctx.guiFixtureZaloThuTuanTest();assert.equal(sent.status,'COMPLETE');assert.equal(sent.sent,1);assert.equal(w.props.THU_TUAN_ENABLED,'false');
 assert.deepEqual(w.requests,['getMe','sendMessage']);assert.equal(w.deliveries.length,1);assert.equal(w.zalo.data[1][6],'SENT');assert.equal(w.zalo.data[1][15],'synthetic-receipt-1');
 const expected=w.ctx.thuTuanRenderZaloText_(Object.fromEntries(w.ctx.THU_TUAN_HEADERS.LoiDay_NoiDung.map((key,i)=>[key,approved[i]])));
 assert.equal(w.deliveries[0].text,expected);
 w.props.THU_TUAN_ENABLED='true';const rerun=w.ctx.guiFixtureZaloThuTuanTest();assert.equal(rerun.sent,0);assert.equal(rerun.alreadySent,1);assert.equal(w.requests.length,2);assert.equal(w.props.THU_TUAN_ENABLED,'false');
 const before=JSON.stringify([w.content.data,w.gmail.data,w.zalo.data,w.props]),audit=w.ctx.doiSoatFixtureZaloThuTuanTest();
 assert.equal(audit.reconciliationClear,true);assert.equal(audit.states.SENT,1);assert.equal(audit.receipts[0].messageIdPresent,true);assert.equal(audit.sentReceiptsDistinct,true);
 assert.equal(JSON.stringify([w.content.data,w.gmail.data,w.zalo.data,w.props]),before);assert.equal(JSON.stringify(w.gmail.data),w.oldGmail);
 const safe=JSON.stringify([sent,rerun,audit,w.logs]);for(const hidden of ['synthetic-group','synthetic-token',secret,'TEST synthetic quote','synthetic-receipt-1'])assert.equal(safe.includes(hidden),false);
});
test('full TEST isolation, disabled preparation, manual invocation and lock guards prevent writes and requests',()=>{
 for(const mutate of [w=>w.props.THU_TUAN_ENABLED='true',w=>w.props.THU_TUAN_TEST_MODE='false',w=>w.props.THU_TUAN_ZALO_ENV='PROD',w=>delete w.props.THU_TUAN_ZALO_TEST_GROUP_CONFIRMED,w=>w.props.THU_TUAN_ZALO_TEST_CHAT_SHA256='0'.repeat(64)]){
  const w=world();mutate(w);const before=JSON.stringify([w.content.data,w.gmail.data,w.zalo.data,w.props]);
  assert.equal(w.ctx.chuanBiFixtureZaloThuTuanTest().status,'TEST_ACCEPTANCE_BLOCKED');assert.equal(JSON.stringify([w.content.data,w.gmail.data,w.zalo.data,w.props]),before);assert.equal(w.requests.length,0);
 }
 const w=world();assert.equal(w.ctx.chuanBiFixtureZaloThuTuanTest({triggerUid:'synthetic'}).status,'TEST_ACCEPTANCE_BLOCKED');
 w.busy=true;assert.equal(w.ctx.chuanBiFixtureZaloThuTuanTest().status,'BUSY');assert.equal(w.content.data.length,2);assert.equal(w.propertyWrites.length,0);
});
test('existing fixture history or unrelated content cannot be replaced or approved by acceptance helpers',()=>{
 const w=world();w.gmail.data.push(['2026-10-05|OLD','2026-10-05','OLD','old','1','old','SENT',new Date(),'']);
 const before=JSON.stringify(w.gmail.data);assert.equal(w.ctx.chuanBiFixtureZaloThuTuanTest().status,'TEST_FIXTURE_ALREADY_EXISTS_OR_HAS_HISTORY');assert.equal(JSON.stringify(w.gmail.data),before);
 const x=world();x.content.data.push(x.content.data[1].slice());x.content.data[2][0]='2026-10-05';x.content.data[2][2]='unrelated';x.content.data[2][5]='Nhap';
 assert.equal(x.ctx.chuanBiFixtureZaloThuTuanTest().status,'TEST_FIXTURE_ALREADY_EXISTS_OR_HAS_HISTORY');assert.equal(x.ctx.duyetFixtureZaloThuTuanTest().status,'TEST_ACCEPTANCE_BLOCKED');assert.equal(x.content.data[2][5],'Nhap');assert.equal(x.requests.length,0);
});
test('approval allowlist and changes to source or fixture cannot be bypassed by the wrappers',()=>{
 const w=world();w.ctx.chuanBiFixtureZaloThuTuanTest();w.actor='intruder@example.test';assert.equal(w.ctx.duyetFixtureZaloThuTuanTest().status,'TEST_ACCEPTANCE_BLOCKED');assert.equal(w.content.data[2][5],'Nhap');
 const x=world();previewed(x);x.content.data[2][2]+=' altered';x.props.THU_TUAN_ENABLED='true';assert.equal(x.ctx.guiFixtureZaloThuTuanTest().status,'TEST_ACCEPTANCE_BLOCKED');assert.equal(x.requests.length,0);assert.equal(x.props.THU_TUAN_ENABLED,'false');
 const y=world();y.content.data[1][2]+=' altered';assert.equal(y.ctx.chuanBiFixtureZaloThuTuanTest().status,'TEST_FIXTURE_SOURCE_NOT_APPROVED');assert.equal(y.content.data.length,2);
});
test('sending requires the exact preview seal and changing target invalidates it',()=>{
 const w=world();w.ctx.chuanBiFixtureZaloThuTuanTest();w.ctx.duyetFixtureZaloThuTuanTest();w.props.THU_TUAN_ENABLED='true';assert.equal(w.ctx.guiFixtureZaloThuTuanTest().status,'TEST_ACCEPTANCE_BLOCKED');assert.equal(w.requests.length,0);assert.equal(w.props.THU_TUAN_ENABLED,'false');
 const x=world();previewed(x);x.props.THU_TUAN_ZALO_TEST_CHAT_ID='another-synthetic-group';x.props.THU_TUAN_ZALO_TEST_CHAT_SHA256=sha('another-synthetic-group');x.props.THU_TUAN_ENABLED='true';assert.equal(x.ctx.guiFixtureZaloThuTuanTest().status,'TEST_ACCEPTANCE_BLOCKED');assert.equal(x.requests.length,0);
 const y=world();previewed(y);y.tick();assert.equal(y.ctx.duyetFixtureZaloThuTuanTest().status,'APPROVED');assert.equal(y.props.THU_TUAN_ZALO_TEST_ACCEPTANCE_PREVIEW,'');y.props.THU_TUAN_ENABLED='true';assert.equal(y.ctx.guiFixtureZaloThuTuanTest().status,'TEST_ACCEPTANCE_BLOCKED');assert.equal(y.requests.length,0);
});
test('uncertain API delivery stays UNKNOWN, stops, is audited honestly and never retried automatically',()=>{
 const w=world();previewed(w);w.sendFailure=true;w.props.THU_TUAN_ENABLED='true';
 const first=w.ctx.guiFixtureZaloThuTuanTest();assert.equal(first.status,'RECONCILIATION_REQUIRED');assert.equal(w.zalo.data[1][6],'UNKNOWN');assert.equal(w.props.THU_TUAN_ENABLED,'false');
 w.props.THU_TUAN_ENABLED='true';assert.equal(w.ctx.guiFixtureZaloThuTuanTest().status,'RECONCILIATION_REQUIRED');assert.equal(w.requests.length,2);assert.equal(w.deliveries.length,0);
 const before=JSON.stringify(w.zalo.data),audit=w.ctx.doiSoatFixtureZaloThuTuanTest();assert.equal(audit.states.UNKNOWN,1);assert.equal(audit.reconciliationClear,false);assert.equal(audit.receipts[0].messageIdPresent,false);assert.equal(JSON.stringify(w.zalo.data),before);
});
test('approval rechecks TEST configuration, fixture and history inside its single genuine approval lock',()=>{
 for(const mutate of [w=>w.props.THU_TUAN_CONTENT_SHEET_ID='wrong-sheet',w=>w.content.data[2][2]+=' raced',w=>w.gmail.data.push(['2026-10-05|RACE','2026-10-05','RACE','x','1','x','SENDING',new Date(),''])]){
  const w=world();w.ctx.chuanBiFixtureZaloThuTuanTest();const writes=w.content.writes.length;let lockCalls=0;
  w.lockHook=()=>{lockCalls++;mutate(w);};
  assert.equal(w.ctx.duyetFixtureZaloThuTuanTest().status,'TEST_ACCEPTANCE_BLOCKED');assert.equal(lockCalls,1);
  assert.equal(w.content.writes.length,writes);assert.equal(w.content.data[2][5],'Nhap');assert.equal(w.content.data[2][9],'');assert.equal(w.requests.length,0);
 }
});
test('approval also rejects a wrong captured core Sheet even when current configuration has reverted',()=>{
 const w=world();w.ctx.chuanBiFixtureZaloThuTuanTest();
 const wrong=sheet(w.ctx.THU_TUAN_HEADERS.LoiDay_NoiDung,w.content.data.slice(1));w.tables['wrong-content|LoiDay_NoiDung']=wrong;
 const getProps=w.ctx.PropertiesService.getScriptProperties;let reads=0;
 w.ctx.PropertiesService.getScriptProperties=()=>{const p=getProps();return {...p,getProperties(){
  const values=p.getProperties();if(++reads===2)values.THU_TUAN_CONTENT_SHEET_ID='wrong-content';return values;
 }};};
 assert.equal(w.ctx.duyetFixtureZaloThuTuanTest().status,'TEST_ACCEPTANCE_BLOCKED');
 assert.equal(wrong.writes.length,0);assert.equal(w.content.data[2][5],'Nhap');assert.equal(w.requests.length,0);
});
test('send teardown verifies the disabled flag readback without losing real receipt history',()=>{
 const w=world();previewed(w);w.props.THU_TUAN_ENABLED='true';
 w.propertyWriteHook=(key,value)=>{if(key!=='THU_TUAN_ENABLED')w.props[key]=value;};
 const r=w.ctx.guiFixtureZaloThuTuanTest();assert.equal(r.status,'TEST_ACCEPTANCE_DISABLE_UNCONFIRMED');
 assert.equal(r.operationStatus,'COMPLETE');assert.equal(r.sent,1);assert.equal(r.confirmed,1);assert.equal(r.attempted,1);
 assert.equal(w.props.THU_TUAN_ENABLED,'true');assert.equal(w.deliveries.length,1);assert.equal(w.zalo.data[1][6],'SENT');assert.equal(w.zalo.data[1][15],'synthetic-receipt-1');
 assert.equal(w.requests.length,2);
});

test('manual SEND disables verified TEST on initial guard, adapter and BUSY failures without sending',()=>{
 for(const mutate of [w=>delete w.props.THU_TUAN_ZALO_TEST_GROUP_CONFIRMED,
  w=>w.props.THU_TUAN_ZALO_TEST_CHAT_ID='mismatched-chat',w=>delete w.props.THU_TUAN_APPROVAL_SECRET,
  w=>w.zalo.data[0].push('wrong header'),w=>{w.busy=true;}]){
  const w=world();w.props.THU_TUAN_ENABLED='true';mutate(w);
  const r=w.ctx.guiFixtureZaloThuTuanTest();assert.ok(['TEST_ACCEPTANCE_BLOCKED','BUSY'].includes(r.status));
  assert.equal(w.props.THU_TUAN_ENABLED,'false');assert.equal(w.requests.length,0);assert.equal(w.zalo.writes.length,0);
 }
});

test('SEND teardown refuses Production, unverified identity and trigger calls',()=>{
 for(const mutate of [w=>w.props.THU_TUAN_ZALO_ENV='PROD',w=>w.props.THU_TUAN_TEST_MODE='false',
  w=>w.props.THU_TUAN_TRANSPORT='GMAIL',w=>delete w.props.THU_TUAN_ZALO_TEST_SCRIPT_ID,
  w=>w.props.THU_TUAN_ZALO_TEST_SCRIPT_ID='production-script',w=>w.props.THU_TUAN_ZALO_PROD_SCRIPT_ID='synthetic-script']){
  const w=world();w.props.THU_TUAN_ENABLED='true';mutate(w);
  const r=w.ctx.guiFixtureZaloThuTuanTest();assert.equal(r.status,'TEST_ACCEPTANCE_DISABLE_UNCONFIRMED');
  assert.equal(w.props.THU_TUAN_ENABLED,'true');assert.equal(w.propertyWrites.length,0);assert.equal(w.requests.length,0);
 }
 const w=world();w.props.THU_TUAN_ENABLED='true';assert.equal(w.ctx.guiFixtureZaloThuTuanTest({triggerUid:'synthetic'}).status,'TEST_ACCEPTANCE_BLOCKED');
 assert.equal(w.propertyWrites.length,0);assert.equal(w.props.THU_TUAN_ENABLED,'true');
});

test('TEST kill switch on BUSY stops the active sender at its next guard without releasing its lock',()=>{
 const w=world();w.props.THU_TUAN_ENABLED='true';const io=w.ctx.thuTuanZaloAdapter_(w.ctx.thuTuanConfig_());
 w.ctx.LockService={getScriptLock:()=>({tryLock:()=>false,releaseLock(){throw Error('not owned');}})};
 assert.equal(w.ctx.guiFixtureZaloThuTuanTest().status,'BUSY');assert.equal(w.props.THU_TUAN_ENABLED,'false');
 assert.throws(()=>io.beforeSend(),/ZALO_CONFIG_CHANGED/);assert.equal(w.requests.length,0);
});

test('acceptance reports only fixed phase and reason codes, never native error details',()=>{
 const w=world();delete w.props.THU_TUAN_ZALO_TEST_GROUP_CONFIRMED;
 const blocked=w.ctx.chuanBiFixtureZaloThuTuanTest();assert.equal(blocked.phase,'INITIAL_GUARD');assert.equal(blocked.reason,'ZALO_GROUP_CONFIRMATION_REQUIRED');
 const x=world();x.ctx.thuTuanZaloAcceptancePrepare_=()=>{throw Error('private '+secret+' synthetic-group https://invalid.test/private');};
 const unknown=x.ctx.chuanBiFixtureZaloThuTuanTest();assert.equal(unknown.phase,'PREPARE');assert.equal(unknown.reason,'ZALO_IO_BLOCKED');
 for(const hidden of [secret,'synthetic-group','https://invalid.test/private'])assert.equal(JSON.stringify([unknown,x.logs]).includes(hidden),false);
 assert.equal(x.deliveries.length,0);
});

test('unchanged property values with a different enumeration order retain strict acceptance guards',()=>{
 const w=world(),getProps=w.ctx.PropertiesService.getScriptProperties;let reads=0;
 w.ctx.PropertiesService.getScriptProperties=()=>{const p=getProps();return {...p,getProperties(){
  const values=p.getProperties(),keys=Object.keys(values);if(++reads%3===0)keys.reverse();
  return Object.fromEntries(keys.map(key=>[key,values[key]]));
 }};};
 previewed(w);w.props.THU_TUAN_ENABLED='true';assert.equal(w.ctx.guiFixtureZaloThuTuanTest().sent,1);
 assert.equal(w.props.THU_TUAN_ENABLED,'false');assert.equal(w.deliveries.length,1);
 assert.equal(w.ctx.doiSoatFixtureZaloThuTuanTest().reconciliationClear,true);
});

test('state comparison checks all keys, exact values and array order without normalizing credentials',()=>{
 const same=world().ctx.thuTuanZaloAcceptanceSameState_;
 assert.equal(same({nested:{a:'value',b:['one','two']}},{nested:{b:['one','two'],a:'value'}}),true);
 for(const changed of [{nested:{a:'value ',b:['one','two']}},{nested:{a:'value',b:['two','one']}},
  {nested:{a:'value',b:['one','two'],extra:''}},{nested:{b:['one','two']}}])
  assert.equal(same({nested:{a:'value',b:['one','two']}},changed),false);
 assert.equal(same({a:undefined},{}),false);assert.equal(same(['one'],{0:'one'}),false);
 assert.equal(same(JSON.parse('{"__proto__":"one"}'),JSON.parse('{"__proto__":"two"}')),false);
});
