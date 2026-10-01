/** Read-only TEST diagnostics plus an explicit paired-marker receiver that can pin the verified TEST target. Never sends. */
var THU_TUAN_ZALO_DIAGNOSTIC_HOSTS_ = [
  'https://bot-api.zaloplatforms.com',
  'https://bot-api.zapps.me'
];
var THU_TUAN_ZALO_DIAGNOSTIC_MARKER_ = 'THU_TUAN_ZALO_TEST_20261001_7C4D';

function thuTuanZaloDiagnosticConfig_() {
  var p = PropertiesService.getScriptProperties().getProperties();
  if (p.THU_TUAN_ENABLED !== 'false' || p.THU_TUAN_TEST_MODE !== 'true' ||
      p.THU_TUAN_TRANSPORT !== 'ZALO' || p.THU_TUAN_ZALO_ENV !== 'TEST')
    throw new Error('TEST_DIAGNOSTIC_ISOLATION_REQUIRED');
  var keys = ['SCRIPT_ID','CONTENT_SHEET_ID','PRIVATE_SHEET_ID','BOT_ID'];
  keys.forEach(function(key) {
    var value = p['THU_TUAN_ZALO_TEST_' + key];
    if (typeof value !== 'string' || !value || value !== value.trim())
      throw new Error('TEST_DIAGNOSTIC_ISOLATION_REQUIRED');
  });
  if (ScriptApp.getScriptId() !== p.THU_TUAN_ZALO_TEST_SCRIPT_ID ||
      p.THU_TUAN_CONTENT_SHEET_ID !== p.THU_TUAN_ZALO_TEST_CONTENT_SHEET_ID ||
      p.THU_TUAN_PRIVATE_SHEET_ID !== p.THU_TUAN_ZALO_TEST_PRIVATE_SHEET_ID ||
      p.THU_TUAN_CONTENT_SHEET_ID === p.THU_TUAN_PRIVATE_SHEET_ID)
    throw new Error('TEST_DIAGNOSTIC_ISOLATION_REQUIRED');
  var token = p.THU_TUAN_ZALO_TEST_BOT_TOKEN;
  if (typeof token !== 'string' || !/^[A-Za-z0-9_:-]{8,512}$/.test(token))
    throw new Error('TEST_DIAGNOSTIC_TOKEN_REQUIRED');
  return {token:token, botId:p.THU_TUAN_ZALO_TEST_BOT_ID,
    scriptId:p.THU_TUAN_ZALO_TEST_SCRIPT_ID, contentId:p.THU_TUAN_CONTENT_SHEET_ID,
    privateId:p.THU_TUAN_PRIVATE_SHEET_ID};
}

function thuTuanZaloDiagnosticKind_(value) {
  if (value == null) return 'NONE';
  if (Array.isArray(value)) return 'ARRAY';
  var kinds = {object:'OBJECT',string:'STRING',number:'NUMBER',boolean:'BOOLEAN'};
  return kinds[typeof value] || 'OTHER';
}

/** Classify standard GAS signatures locally. Categories are hints, never raw error text or proven causes. */
function thuTuanZaloDiagnosticErrorCategory_(error, phase) {
  if (phase === 'JSON_PARSE') return 'JSON_INVALID';
  if (phase === 'HTTP_STATUS' || phase === 'RESPONSE_BODY') return 'RESPONSE_UNREADABLE';
  var message = error && typeof error.message === 'string' ? error.message : '';
  message = message.replace(/^Exception:\s*/i,'');
  if (/^(You do not have permission to call|Specified permissions are not sufficient to call UrlFetchApp\.fetch|Authorization is required to perform that action|Access denied:\s*UrlFetchApp|Required permissions:)/i.test(message))
    return 'AUTHORIZATION';
  if (/^(SSL (error|certificate)|TLS handshake failed|Certificate validation failed|PKIX path building failed)/i.test(message))
    return 'TLS_CERTIFICATE';
  if (/^(Address unavailable:|Unable to resolve (host|address)|DNS resolution failed|UnknownHostException:)/i.test(message))
    return 'DNS_ADDRESS';
  if (/^(Timeout:|The request timed out|Request timed out|SocketTimeoutException:|Connection timed out)/i.test(message))
    return 'NETWORK_TIMEOUT';
  if (/^(Service invoked too many times|Limit exceeded:|Bandwidth quota exceeded|Quota exceeded:)/i.test(message))
    return 'QUOTA';
  if (/^(Invalid argument:|Invalid arguments:|The parameters .* don't match the method signature for UrlFetchApp\.fetch)/i.test(message))
    return 'INVALID_ARGUMENT';
  return 'FETCH_UNCLASSIFIED';
}

/** Internal response stays in memory; only the summary is returned by public entrypoints. */
function thuTuanZaloDiagnosticRequest_(cfg, host, method, payload) {
  if (THU_TUAN_ZALO_DIAGNOSTIC_HOSTS_.indexOf(host) < 0 ||
      ['getMe','getWebhookInfo','getUpdates'].indexOf(method) < 0)
    throw new Error('TEST_DIAGNOSTIC_METHOD_DENIED');
  var expected = method === 'getUpdates' ? {timeout:'30'} : {};
  if (JSON.stringify(payload) !== JSON.stringify(expected))
    throw new Error('TEST_DIAGNOSTIC_METHOD_DENIED');
  if (JSON.stringify(thuTuanZaloDiagnosticConfig_()) !== JSON.stringify(cfg))
    throw new Error('TEST_DIAGNOSTIC_CONFIG_CHANGED');
  var started = Date.now();
  var summary = {httpStatus:null, json:false, ok:false, apiCode:null, resultKind:'NONE',
    phase:'FETCH',errorCategory:null,elapsedMs:0};
  try {
    var response = UrlFetchApp.fetch(host + '/bot' + cfg.token + '/' + method, {
      method:'post', contentType:'application/json; charset=utf-8', payload:JSON.stringify(expected),
      muteHttpExceptions:true, followRedirects:false, validateHttpsCertificates:true
    });
    summary.phase = 'HTTP_STATUS';
    var status = response.getResponseCode();
    if (Number.isInteger(status) && status >= 100 && status <= 599) summary.httpStatus = status;
    else summary.errorCategory = 'RESPONSE_UNREADABLE';
    if (status < 200 || status >= 300 || !Number.isInteger(status)) return {summary:summary};
    summary.phase = 'RESPONSE_BODY';
    var raw = response.getContentText();
    summary.phase = 'JSON_PARSE';
    var body = JSON.parse(raw);
    summary.json = true;
    summary.phase = 'COMPLETE';
    if (!body || typeof body !== 'object' || Array.isArray(body)) return {summary:summary};
    summary.ok = body.ok === true;
    if (Number.isInteger(body.error_code) && Math.abs(body.error_code) <= 9999) summary.apiCode = body.error_code;
    summary.resultKind = thuTuanZaloDiagnosticKind_(body.result);
    return {summary:summary, result:summary.ok ? body.result : undefined};
  } catch (error) {
    summary.errorCategory = thuTuanZaloDiagnosticErrorCategory_(error,summary.phase);
    return {summary:summary};
  } finally { summary.elapsedMs = Math.max(0,Math.floor(Date.now()-started)); }
}

function thuTuanZaloDiagnosticMe_(response, cfg) {
  var me = response.result;
  var object = response.summary.ok && response.summary.resultKind === 'OBJECT';
  return Object.assign({},response.summary, {
    botMatches:!!object && typeof me.id === 'string' && me.id === cfg.botId,
    accountMatches:!!object && me.account_name === 'bot.POyBVXga',
    displayNameMatches:!!object && me.display_name === 'Bot Mô hình học tập lời Bác',
    canJoinGroups:!!object && me.can_join_groups === true
  });
}

function thuTuanZaloDiagnosticWebhook_(response) {
  var result = response.result;
  var confirmed = response.summary.ok && response.summary.resultKind === 'OBJECT' &&
    typeof result.url === 'string';
  return Object.assign({},response.summary,{webhookUrlPresent:confirmed ? !!result.url : null});
}

function thuTuanZaloDiagnosticSheets_(cfg) {
  try {
    if (JSON.stringify(thuTuanZaloDiagnosticConfig_()) !== JSON.stringify(cfg))
      return {status:'TEST_DIAGNOSTIC_IO_BLOCKED'};
    var config = thuTuanConfig_(), key = thuTuanWeekKey_(new Date());
    var zalo = thuTuanRows_(thuTuanSheet_(cfg.privateId,'ThuTuan_Zalo_NhatKyGui'),'ThuTuan_Zalo_NhatKyGui');
    var gmail = thuTuanRows_(thuTuanSheet_(cfg.privateId,'ThuTuan_NhatKyGui'),'ThuTuan_NhatKyGui');
    var rows = thuTuanRows_(thuTuanSheet_(cfg.contentId,'LoiDay_NoiDung'),'LoiDay_NoiDung');
    var current = thuTuanForKey_(rows,key);
    function currentCount(logs) {
      return logs.filter(function(row) {
        return thuTuanText_(row.Ky) === key || thuTuanText_(row.Khoa).indexOf(key+'|') === 0;
      }).length;
    }
    var summary = {status:'TEST_DIAGNOSTIC_SHEETS_VERIFIED',key:key,
      zaloHeaders:16,zaloRows:zalo.length,zaloCurrentWeekRows:currentCount(zalo),
      gmailHeaders:9,gmailRows:gmail.length,gmailCurrentWeekRows:currentCount(gmail),
      currentContentRows:current.length,approvalProblem:'CONTENT_MISSING_OR_DUPLICATE'};
    if (rows.some(function(row) { return thuTuanIsDate_(row.Ky); })) summary.approvalProblem = 'KY_NOT_PLAIN_TEXT';
    else if (current.length === 1) {
      summary.approvalProblem = thuTuanApprovalProblem_(current[0],thuTuanDigest_(current[0],config.secret),config.approvers) || 'OK';
      if (summary.approvalProblem === 'OK') {
        var parts = thuTuanZaloSplit_(thuTuanRenderText_(current[0]));
        summary.partLengths = parts.map(function(part) { return part.length; });
      }
    }
    return summary;
  } catch (_) { return {status:'TEST_DIAGNOSTIC_IO_BLOCKED'}; }
}

function thuTuanZaloDiagnosticEvent_(response, started, observed) {
  var result = response.result, message = result && result.message, chat = message && message.chat;
  var object = response.summary.ok && response.summary.resultKind === 'OBJECT' &&
    result.event_name === 'message.text.received';
  var type = object && chat && ['GROUP','PRIVATE'].indexOf(chat.chat_type) >= 0 ? chat.chat_type : 'UNKNOWN';
  var idValid = !!chat && typeof chat.id === 'string' && !!chat.id && chat.id.length <= 256 &&
    !/[\s\x00-\x1f\x7f]/.test(chat.id);
  // Official event examples use Unix milliseconds. Never accept an old queued marker as a fresh handshake.
  var date = message && message.date;
  var timestampValid = Number.isInteger(date) && date >= started && date <= Math.min(observed,started+120000);
  var text = message && message.text;
  // Mentions may surround the marker. Require one complete whitespace-delimited token,
  // and reject additional occurrences even if embedded in a longer token.
  var markerMatched = !!object && typeof text === 'string' &&
    text.split(THU_TUAN_ZALO_DIAGNOSTIC_MARKER_).length === 2 &&
    text.split(/\s+/).filter(function(token) { return token === THU_TUAN_ZALO_DIAGNOSTIC_MARKER_; }).length === 1;
  var valid = !!object && type !== 'UNKNOWN' && idValid && typeof text === 'string' && Number.isInteger(date);
  return Object.assign({},response.summary, {chatType:type, markerMatched:markerMatched,
    timestampInWindow:!!timestampValid, eventValid:valid,
    verifiedGroupMarker:valid && markerMatched && timestampValid && type === 'GROUP'});
}

/** Only the manually paired receiver calls this; target stays inside Script Properties. */
function thuTuanZaloDiagnosticPin_(cfg, response, started, observed) {
  try {
    if (!thuTuanZaloDiagnosticEvent_(response,started,observed).verifiedGroupMarker)
      return {status:'TEST_TARGET_PIN_EVENT_UNVERIFIED'};
    if (JSON.stringify(thuTuanZaloDiagnosticConfig_()) !== JSON.stringify(cfg))
      return {status:'TEST_TARGET_PIN_CONFIG_CHANGED'};
    var chat = response.result.message.chat.id, hash = thuTuanZaloHash_(chat);
    var props = PropertiesService.getScriptProperties(), values = props.getProperties();
    var idKey = 'THU_TUAN_ZALO_TEST_CHAT_ID', hashKey = 'THU_TUAN_ZALO_TEST_CHAT_SHA256';
    if ((values[idKey] !== undefined && values[idKey] !== chat) ||
        (values[hashKey] !== undefined && values[hashKey] !== hash))
      return {status:'TEST_TARGET_PIN_CONFLICT'};
    if (values[idKey] !== chat || values[hashKey] !== hash) {
      var pair = {}; pair[idKey] = chat; pair[hashKey] = hash;
      props.setProperties(pair,false); // One pair update; preserve all other properties and membership attestations.
    }
    var saved = props.getProperties();
    if (saved[idKey] !== chat || saved[hashKey] !== hash ||
        JSON.stringify(thuTuanZaloDiagnosticConfig_()) !== JSON.stringify(cfg))
      return {status:'TEST_TARGET_PIN_UNCONFIRMED'};
    return {status:'TEST_TARGET_PINNED',membershipConfirmationRequired:true};
  } catch (_) { return {status:'TEST_TARGET_PIN_UNCONFIRMED'}; }
}

function thuTuanZaloDiagnosticRun_(event, receive) {
  if (event) return {status:'TEST_DIAGNOSTIC_MANUAL_ONLY'};
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return {status:'BUSY'};
  var report;
  try {
    var cfg = thuTuanZaloDiagnosticConfig_();
    if (!receive) {
      report = {status:'TEST_DIAGNOSTIC', environment:'TEST', hosts:[]};
      THU_TUAN_ZALO_DIAGNOSTIC_HOSTS_.forEach(function(host,i) {
        var me = thuTuanZaloDiagnosticMe_(thuTuanZaloDiagnosticRequest_(cfg,host,'getMe',{}),cfg);
        var item = {host:i === 0 ? 'DOCS' : 'SDK', getMe:me};
        if (me.botMatches) item.getWebhookInfo = thuTuanZaloDiagnosticWebhook_(
          thuTuanZaloDiagnosticRequest_(cfg,host,'getWebhookInfo',{}));
        report.hosts.push(item);
      });
      report.sheets = thuTuanZaloDiagnosticSheets_(cfg);
    } else {
      var host = THU_TUAN_ZALO_DIAGNOSTIC_HOSTS_[1];
      var me = thuTuanZaloDiagnosticMe_(thuTuanZaloDiagnosticRequest_(cfg,host,'getMe',{}),cfg);
      report = {status:'TEST_RECEIVE_PREFLIGHT_BLOCKED', environment:'TEST', host:'SDK', getMe:me};
      if (me.botMatches && me.accountMatches && me.displayNameMatches && me.canJoinGroups) {
        var webhook = thuTuanZaloDiagnosticWebhook_(thuTuanZaloDiagnosticRequest_(cfg,host,'getWebhookInfo',{}));
        report.getWebhookInfo = webhook;
        if (webhook.webhookUrlPresent !== true) {
          var started = Date.now();
          report.status = 'TEST_RECEIVE_NO_VERIFIED_GROUP_MARKER';
          report.startedAt = new Date(started).toISOString();
          report.polls = [];
          Logger.log(JSON.stringify({status:'TEST_RECEIVE_READY', marker:THU_TUAN_ZALO_DIAGNOSTIC_MARKER_,
            startedAt:report.startedAt, budgetSeconds:120, maxRequests:4}));
          for (var i=0;i<4 && Date.now()-started<120000;i++) {
            var response = thuTuanZaloDiagnosticRequest_(cfg,host,'getUpdates',{timeout:'30'});
            var safe = thuTuanZaloDiagnosticEvent_(response,started,Date.now());
            report.polls.push(safe);
            if (safe.verifiedGroupMarker) {
              report.pin = thuTuanZaloDiagnosticPin_(cfg,response,started,Date.now());
              report.status = report.pin.status === 'TEST_TARGET_PINNED' ?
                'TEST_RECEIVE_GROUP_TARGET_PINNED' : 'TEST_RECEIVE_GROUP_TARGET_PIN_BLOCKED';
              break;
            }
            // Unmatched valid events may precede the fresh marker; keep the same bounded session.
            if (safe.ok && !safe.eventValid) { report.status = 'TEST_RECEIVE_MALFORMED_EVENT'; break; }
            if (!safe.ok && (safe.httpStatus !== 200 || safe.apiCode !== 408 || !safe.json)) break;
          }
          report.elapsedMs = Math.max(0,Date.now()-started);
          report.endedAt = new Date().toISOString();
        } else report.status = 'TEST_RECEIVE_WEBHOOK_PRESENT';
      }
    }
  } catch (_) { report = {status:'TEST_DIAGNOSTIC_BLOCKED'}; }
  finally { lock.releaseLock(); }
  Logger.log(JSON.stringify(report));
  return report;
}

/** Initial read-only comparison. Never receives events. */
function chanDoanZaloThuTuan(event) { return thuTuanZaloDiagnosticRun_(event,false); }

/** Run only after the owner handshake and no-other-consumer confirmation; pins a fresh GROUP target pair, never membership. */
function nhanSuKienZaloThuTuanTest(event) { return thuTuanZaloDiagnosticRun_(event,true); }

/** Manual TEST-only scope request. Google owns the consent prompt; no auth URL or exception is logged here. */
function capQuyenZaloThuTuanTest(event) {
  if (event) return {status:'TEST_DIAGNOSTIC_MANUAL_ONLY'};
  try { thuTuanZaloDiagnosticConfig_(); }
  catch (_) { return {status:'TEST_DIAGNOSTIC_BLOCKED'}; }
  // requireScopes ends this execution and renders the native consent prompt when consent is missing.
  // Keep it outside an exception handler so the Google authorization flow is not suppressed.
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL,['https://www.googleapis.com/auth/script.external_request']);
  var result = {status:'TEST_EXTERNAL_REQUEST_SCOPE_GRANTED',environment:'TEST'};
  Logger.log(JSON.stringify(result));
  return result;
}
