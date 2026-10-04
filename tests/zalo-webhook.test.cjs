const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ready=import('../web/api/zalo-webhook.js');
const secret='synthetic-webhook-secret',relay='synthetic_relay_secret_0123456789abcdef';
function env(extra={}){return {VERCEL_ENV:'preview',ZALO_SHOWCASE_ENV:'TEST',ZALO_SHOWCASE_TEST_WEBHOOK_SECRET:secret,
  ZALO_SHOWCASE_TEST_RELAY_SECRET:relay,ZALO_SHOWCASE_TEST_GAS_URL:'https://script.google.com/macros/s/test-deployment/exec/zalo-showcase-v1',...extra};}
function body(){return {ok:true,result:{event_name:'message.text.received',message:{from:{id:'test-owner',is_bot:false},chat:{id:'test-group',chat_type:'GROUP'},message_id:'test-event',date:1,text:'/trogiup'}}};}
function request(extra={}){return {method:'POST',headers:{'x-bot-api-secret-token':secret,'content-type':'application/json'},body:body(),...extra};}
function response(){return {code:0,value:null,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(v){this.value=v;return this;}};}
test('official secret header verified; forward signed domain envelope, no credential copied',async()=>{
  const {createHandler}=await ready,calls=[],r=response();
  await createHandler({env:env(),clock:()=>1770000000000,fetchImpl:async(u,p)=>{calls.push({u,p});return {ok:true,json:async()=>({success:true,status:'SENT',raw:'must not escape'})};}})(request(),r);
  assert.equal(r.code,200);assert.deepEqual(r.value,{ok:true,status:'SENT'});assert.equal(calls.length,1);
  const envelope=JSON.parse(calls[0].p.body),expected=crypto.createHmac('sha256',relay).update(JSON.stringify(['ZALO_SHOWCASE_V1_TEST',1,envelope.timestamp,envelope.nonce,envelope.event])).digest('hex');
  assert.equal(envelope.signature,expected);assert.equal(envelope.timestamp,1770000000000);assert.deepEqual(JSON.parse(envelope.event),body());
  assert.ok(!calls[0].p.headers['x-bot-api-secret-token']);assert.ok(!calls[0].p.body.includes(secret));assert.equal(r.headers['Cache-Control'],'no-store');
});
for(const provided of [undefined,'wrong',secret+' ',[secret]])test('missing/incorrect/ambiguous auth header denied '+JSON.stringify(provided),async()=>{
  const {createHandler}=await ready,r=response();let calls=0;await createHandler({env:env(),fetchImpl:()=>{calls++;}})(request({headers:{'x-bot-api-secret-token':provided,'content-type':'application/json'}}),r);assert.equal(r.code,403);assert.equal(calls,0);
});
test('query/body/header-in-body never authenticate webhook',async()=>{const {createHandler}=await ready,r=response();await createHandler({env:env(),fetchImpl:()=>assert.fail('No fetch')})(request({headers:{'content-type':'application/json'},query:{secret},body:{...body(),secret,headers:{'x-bot-api-secret-token':secret}}}),r);assert.equal(r.code,403);});
for(const [k,v] of [['VERCEL_ENV','production'],['VERCEL_ENV',undefined],['ZALO_SHOWCASE_ENV','PROD'],['ZALO_SHOWCASE_TEST_WEBHOOK_SECRET','short'],['ZALO_SHOWCASE_TEST_RELAY_SECRET','short'],['ZALO_SHOWCASE_TEST_GAS_URL','https://example.invalid/exec'],['ZALO_SHOWCASE_TEST_GAS_URL','https://script.google.com/macros/s/test/exec']])
test('configuration fail closed '+k+' '+v,async()=>{const {createHandler}=await ready,r=response();await createHandler({env:env({[k]:v}),fetchImpl:()=>assert.fail('No fetch')})(request(),r);assert.equal(r.code,503);});
test('method/type/size and malformed bodies blocked',async()=>{
  const {createHandler}=await ready;for(const [req,status] of [[request({method:'GET'}),405],[request({headers:{'x-bot-api-secret-token':secret,'content-type':'text/plain'}}),415],[request({body:'x'.repeat(16001)}),413],[request({body:null}),400],[request({body:{event_name:'message.text.received'}}),400],[request({body:{ok:true,result:[]}}),400]]){const r=response();await createHandler({env:env(),fetchImpl:()=>assert.fail('No fetch')})(req,r);assert.equal(r.code,status);}
});
test('raw JSON and Buffer bodies accepted without schema guessing',async()=>{const {createHandler}=await ready;for(const b of [JSON.stringify(body()),Buffer.from(JSON.stringify(body()))]){const r=response();await createHandler({env:env(),fetchImpl:async()=>({ok:true,json:async()=>({status:'DUPLICATE'})})})(request({body:b}),r);assert.equal(r.code,200);}});
test('upstream error redacted and never automatically retried',async()=>{const {createHandler}=await ready,r=response();let count=0;await createHandler({env:env(),fetchImpl:async()=>{count++;throw Error(secret+' '+relay+' test-group');}})(request(),r);assert.equal(count,1);assert.equal(r.code,503);assert.deepEqual(r.value,{ok:false,status:'REQUEST_UNCONFIRMED'});});
test('invalid upstream/auth result remains blocked',async()=>{const {createHandler}=await ready;for(const value of [{ok:false,json:async()=>({})},{ok:true,json:async()=>({status:'AUTH_DENIED'})},{ok:true,json:async()=>({status:'BUSY'})},{ok:true,json:async()=>({status:'invented'})}]){const r=response();await createHandler({env:env(),fetchImpl:async()=>value})(request(),r);assert.equal(r.code,503);}});
test('uncertain/duplicate/ignored deliveries ack without second send',async()=>{const {createHandler}=await ready;for(const status of ['DUPLICATE','HELD_NO_RETRY','IGNORED_CHAT','IGNORED_SELF','RATE_LIMITED']){const r=response();await createHandler({env:env(),fetchImpl:async()=>({ok:true,json:async()=>({status,raw:secret})})})(request(),r);assert.equal(r.code,200);assert.deepEqual(r.value,{ok:true,status});}});
test('invalid JSON never reaches backend',async()=>{const {createHandler}=await ready,r=response();await createHandler({env:env(),fetchImpl:()=>assert.fail('No fetch')})(request({body:'{'}),r);assert.equal(r.code,503);});
test('relay envelope signature binds exact event, timestamp and nonce',async()=>{const {makeEnvelope}=await ready;const e=makeEnvelope('original',relay,1,'fixture-nonce');const h=crypto.createHmac('sha256',relay).update(JSON.stringify(['ZALO_SHOWCASE_V1_TEST',1,1,'fixture-nonce','original'])).digest('hex');assert.equal(e.signature,h);assert.notEqual(makeEnvelope('tampered',relay,1,'fixture-nonce').signature,h);});
