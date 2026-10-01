/** Manual TEST fixture acceptance. Uses the existing approval, adapter and state machine. */
var THU_TUAN_ZALO_ACCEPTANCE_KEY_ = '2026-10-05';
var THU_TUAN_ZALO_ACCEPTANCE_SOURCE_KEY_ = '2026-09-28';
var THU_TUAN_ZALO_ACCEPTANCE_SEAL_ = 'THU_TUAN_ZALO_TEST_ACCEPTANCE_PREVIEW';

/** PropertiesService does not promise key enumeration order. Compare every key and value. */
function thuTuanZaloAcceptanceSameState_(left,right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object' ||
      Array.isArray(left) !== Array.isArray(right)) return false;
  if (Array.isArray(left) && left.length !== right.length) return false;
  var leftKeys = Object.keys(left).sort(), rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every(function(key,index) {
    return key === rightKeys[index] && thuTuanZaloAcceptanceSameState_(left[key],right[key]);
  });
}

function thuTuanZaloAcceptanceGuard_(event, sending) {
  if (event) throw new Error('TEST_ACCEPTANCE_MANUAL_ONLY');
  var cfg = thuTuanConfig_(), p = cfg.zaloProperties;
  if (cfg.enabledValue !== (sending ? 'true' : 'false') || cfg.testModeValue !== 'true' ||
      cfg.transport !== 'ZALO' || p.THU_TUAN_ZALO_ENV !== 'TEST')
    throw new Error('TEST_ACCEPTANCE_ISOLATION_REQUIRED');
  var zalo = thuTuanZaloConfig_(cfg);
  thuTuanDigest_({},cfg.secret);
  return {cfg:cfg,zalo:zalo};
}

function thuTuanZaloAcceptanceHistory_(io) {
  var key = THU_TUAN_ZALO_ACCEPTANCE_KEY_;
  return io.logs().filter(function(row) {
    return thuTuanText_(row.Ky) === key || thuTuanText_(row.Khoa).indexOf(key+'|') === 0;
  });
}

function thuTuanZaloAcceptanceFixture_(io) {
  var rows = io.content();
  if (rows.some(function(row) { return thuTuanIsDate_(row.Ky); })) throw new Error('TEST_ACCEPTANCE_CONTENT_BLOCKED');
  var current = thuTuanForKey_(rows,THU_TUAN_ZALO_ACCEPTANCE_KEY_);
  if (current.length !== 1) throw new Error('TEST_ACCEPTANCE_CONTENT_BLOCKED');
  var source = thuTuanForKey_(rows,THU_TUAN_ZALO_ACCEPTANCE_SOURCE_KEY_);
  if (source.length !== 1 || thuTuanApprovalProblem_(source[0],io.digest(source[0]),io.approvers))
    throw new Error('TEST_ACCEPTANCE_CONTENT_BLOCKED');
  function draftCopy(row) {
    return Object.assign(thuTuanCanonicalContent_(row),{Ky:THU_TUAN_ZALO_ACCEPTANCE_KEY_,
      TrangThai:'Nhap',NguoiDuyet:'',NgayDuyet:'',DauVanBanDuyet:''});
  }
  if (JSON.stringify(draftCopy(current[0])) !== JSON.stringify(draftCopy(source[0])))
    throw new Error('TEST_ACCEPTANCE_CONTENT_BLOCKED');
  return current[0];
}

function thuTuanZaloAcceptanceSeal_(state,io,content) {
  var digest = io.digest(content);
  if (thuTuanApprovalProblem_(content,digest,io.approvers)) throw new Error('TEST_ACCEPTANCE_CONTENT_BLOCKED');
  var parts = thuTuanZaloSplit_(thuTuanRenderText_(content));
  return {key:THU_TUAN_ZALO_ACCEPTANCE_KEY_,environment:'TEST',
    bindingHash:thuTuanZaloHash_(JSON.stringify([ScriptApp.getScriptId(),state.cfg.contentId,state.cfg.privateId,state.zalo.botId])),
    targetHash:state.zalo.targetHash,approvalDigest:digest,
    planHash:thuTuanZaloHash_(JSON.stringify(parts)),partCount:parts.length};
}

function thuTuanZaloAcceptanceSafe_(result) {
  var safe = {status:result.status,key:THU_TUAN_ZALO_ACCEPTANCE_KEY_};
  if (result.reason) safe.reason = ['PRE_SEND_BLOCKED','PRE_SEND_LOG_UNCONFIRMED'].indexOf(result.reason) >= 0 ?
    result.reason : thuTuanZaloSafeReason_({message:result.reason});
  ['sent','attempted','confirmed','pending','unknown','alreadySent','total','valid','invalid','duplicate'].forEach(function(key) {
    if (Number.isInteger(result[key]) && result[key] >= 0) safe[key] = result[key];
  });
  return safe;
}

/** Fixed codes only. Never return native exception text, IDs, credential values or URLs. */
function thuTuanZaloAcceptanceReason_(error) {
  var allowed = ['TEST_ACCEPTANCE_MANUAL_ONLY','TEST_ACCEPTANCE_ISOLATION_REQUIRED',
    'TEST_ACCEPTANCE_CONTENT_BLOCKED','TEST_ACCEPTANCE_PREVIEW_REQUIRED','APPROVER_REQUIRED',
    'INVALID_WEEK','INCOMPLETE_CONTENT','INVALID_NOTEBOOKLM_URL','BUSY'];
  if (error && allowed.indexOf(error.message) >= 0) return error.message;
  return thuTuanZaloSafeReason_(error);
}

function thuTuanZaloAcceptancePrepare_(state,io) {
  var sourceKey = THU_TUAN_ZALO_ACCEPTANCE_SOURCE_KEY_, key = THU_TUAN_ZALO_ACCEPTANCE_KEY_;
  if (thuTuanWeekKey_(new Date()) !== sourceKey) throw new Error('TEST_ACCEPTANCE_CONTENT_BLOCKED');
  if (sourceKey === key || thuTuanForKey_(io.content(),key).length || thuTuanZaloAcceptanceHistory_(io).length)
    return {status:'TEST_FIXTURE_ALREADY_EXISTS_OR_HAS_HISTORY',key:key};
  var source = thuTuanForKey_(io.content(),sourceKey);
  if (source.length !== 1 || thuTuanApprovalProblem_(source[0],io.digest(source[0]),io.approvers))
    return {status:'TEST_FIXTURE_SOURCE_NOT_APPROVED',key:key};
  var fixture = Object.assign(thuTuanCanonicalContent_(source[0]),{
    Ky:key,TrangThai:'Nhap',NguoiDuyet:'',NgayDuyet:'',DauVanBanDuyet:''
  });
  var parts = thuTuanZaloSplit_(thuTuanRenderText_(fixture));
  if (!thuTuanZaloAcceptanceSameState_(thuTuanZaloAcceptanceGuard_(null,false),state))
    throw new Error('TEST_ACCEPTANCE_ISOLATION_REQUIRED');
  var sheet = thuTuanSheet_(state.cfg.contentId,'LoiDay_NoiDung'), row = sheet.getLastRow()+1;
  var values = THU_TUAN_HEADERS.LoiDay_NoiDung.map(function(field) { return fixture[field] == null ? '' : fixture[field]; });
  sheet.getRange(row,1,1,values.length).setNumberFormat('@');
  sheet.getRange(row,1,1,values.length).setValues([values]);
  SpreadsheetApp.flush();
  var saved = thuTuanZaloAcceptanceFixture_(io);
  if (JSON.stringify(thuTuanCanonicalContent_(saved)) !== JSON.stringify(fixture))
    throw new Error('TEST_ACCEPTANCE_CONTENT_BLOCKED');
  return {status:'TEST_FIXTURE_DRAFT_CREATED',key:key,partCount:parts.length};
}

function thuTuanZaloAcceptanceAudit_(io) {
  var content = thuTuanZaloAcceptanceFixture_(io);
  var preview = thuTuanZaloAcceptanceSafe_(thuTuanRun_(io,THU_TUAN_ZALO_ACCEPTANCE_KEY_,true));
  var history = thuTuanZaloAcceptanceHistory_(io);
  var states = {SENT:0,SENDING:0,UNKNOWN:0,PENDING:0,FAILED:0,OTHER:0};
  var receipts = [];
  history.forEach(function(row) {
    var state = Object.prototype.hasOwnProperty.call(states,row.TrangThai) ? row.TrangThai : 'OTHER';
    states[state]++;
    receipts.push({part:Number.isInteger(row.Part) ? row.Part : null,
      partCount:Number.isInteger(row.PartCount) ? row.PartCount : null,status:state,
      messageIdPresent:!!thuTuanZaloMessageId_({message_id:row.MessageId})});
  });
  var sentIds = history.filter(function(row) { return row.TrangThai === 'SENT'; }).map(function(row) { return row.MessageId; });
  return {status:'TEST_FIXTURE_RECEIPT_AUDIT',key:THU_TUAN_ZALO_ACCEPTANCE_KEY_,preview:preview,
    logRows:history.length,states:states,receipts:receipts,
    sentReceiptsDistinct:new Set(sentIds).size === sentIds.length,
    reconciliationClear:preview.status === 'PREVIEW' && preview.unknown === 0 &&
      preview.pending === 0 && preview.alreadySent === thuTuanZaloSplit_(thuTuanRenderText_(content)).length};
}

function thuTuanZaloAcceptanceRun_(event,operation) {
  var sending = operation === 'SEND', state, lock, locked = false, result, phase = 'OPERATION';
  try {
    if (['PREPARE','APPROVE','PREVIEW','SEND','AUDIT'].indexOf(operation) < 0)
      throw new Error('TEST_ACCEPTANCE_MANUAL_ONLY');
    phase = 'INITIAL_GUARD';
    state = thuTuanZaloAcceptanceGuard_(event,sending);
    phase = 'ADAPTER';
    var io = thuTuanZaloAdapter_(state.cfg);
    if (operation === 'APPROVE') {
      phase = 'APPROVAL_PREFLIGHT';
      if (thuTuanZaloAcceptanceHistory_(io).length) throw new Error('TEST_ACCEPTANCE_CONTENT_BLOCKED');
      thuTuanZaloAcceptanceFixture_(io);
      phase = 'APPROVAL';
      var approved = thuTuanApproveContent_(THU_TUAN_ZALO_ACCEPTANCE_KEY_,function(capturedCfg,row,approvedRow,digest) {
        phase = 'APPROVAL_RECHECK';
        // The core already owns ScriptLock. Rebind both its captured config and current cloud state here.
        var current = thuTuanZaloAcceptanceGuard_(null,false);
        if (!thuTuanZaloAcceptanceSameState_(capturedCfg,state.cfg) || !thuTuanZaloAcceptanceSameState_(current,state))
          throw new Error('TEST_ACCEPTANCE_ISOLATION_REQUIRED');
        var currentIo = thuTuanZaloAdapter_(current.cfg), currentRow = thuTuanZaloAcceptanceFixture_(currentIo);
        if (thuTuanZaloAcceptanceHistory_(currentIo).length || row._row !== currentRow._row ||
            JSON.stringify(thuTuanCanonicalContent_(row)) !== JSON.stringify(thuTuanCanonicalContent_(currentRow)) ||
            thuTuanDigest_(approvedRow,current.cfg.secret) !== digest)
          throw new Error('TEST_ACCEPTANCE_CONTENT_BLOCKED');
        PropertiesService.getScriptProperties().setProperty(THU_TUAN_ZALO_ACCEPTANCE_SEAL_,'');
      });
      result = {status:approved.status,key:THU_TUAN_ZALO_ACCEPTANCE_KEY_};
    } else {
      phase = 'LOCK';
      lock = LockService.getScriptLock();
      if (!lock.tryLock(1000)) throw new Error('BUSY');
      locked = true;
      phase = 'LOCK_RECHECK';
      if (!thuTuanZaloAcceptanceSameState_(thuTuanZaloAcceptanceGuard_(null,sending),state))
        throw new Error('TEST_ACCEPTANCE_ISOLATION_REQUIRED');
      if (operation === 'PREPARE') { phase = 'PREPARE'; result = thuTuanZaloAcceptancePrepare_(state,io); }
      if (operation === 'AUDIT') { phase = 'AUDIT'; result = thuTuanZaloAcceptanceAudit_(io); }
      if (operation === 'PREVIEW' || sending) {
        phase = 'FIXTURE_SEAL';
        var content = thuTuanZaloAcceptanceFixture_(io), seal = thuTuanZaloAcceptanceSeal_(state,io,content);
        var props = PropertiesService.getScriptProperties();
        phase = 'PREVIEW_SEAL_VERIFY';
        if (sending && props.getProperty(THU_TUAN_ZALO_ACCEPTANCE_SEAL_) !== JSON.stringify(seal))
          throw new Error('TEST_ACCEPTANCE_PREVIEW_REQUIRED');
        phase = sending ? 'SEND_RUN' : 'PREVIEW_RUN';
        result = thuTuanZaloAcceptanceSafe_(thuTuanRun_(io,THU_TUAN_ZALO_ACCEPTANCE_KEY_,!sending));
        if (!sending && result.status === 'PREVIEW' && result.unknown === 0) {
          phase = 'PREVIEW_SEAL_SAVE';
          props.setProperty(THU_TUAN_ZALO_ACCEPTANCE_SEAL_,JSON.stringify(seal));
          if (props.getProperty(THU_TUAN_ZALO_ACCEPTANCE_SEAL_) !== JSON.stringify(seal))
            throw new Error('TEST_ACCEPTANCE_PREVIEW_REQUIRED');
          result.partCount = seal.partCount;
          result.partLengths = thuTuanZaloSplit_(thuTuanRenderText_(content)).map(function(part) { return part.length; });
          result.previewSealed = true;
        }
      }
    }
  } catch (error) { result = {status:error && error.message === 'BUSY' ? 'BUSY' : 'TEST_ACCEPTANCE_BLOCKED',phase:phase,reason:thuTuanZaloAcceptanceReason_(error)}; }
  finally {
    if (!event && sending) {
      try {
        var finalProps = PropertiesService.getScriptProperties();
        var finalValues = finalProps.getProperties(), actualScript = ScriptApp.getScriptId();
        // A manual SEND is also a TEST kill switch. On BUSY, the active runner will stop at its next guard.
        // No log or lock owned by another execution is changed. Never write an unverified/PROD project.
        if (finalValues.THU_TUAN_TEST_MODE !== 'true' || finalValues.THU_TUAN_TRANSPORT !== 'ZALO' ||
            finalValues.THU_TUAN_ZALO_ENV !== 'TEST' || typeof actualScript !== 'string' || !actualScript ||
            finalValues.THU_TUAN_ZALO_TEST_SCRIPT_ID !== actualScript ||
            finalValues.THU_TUAN_ZALO_PROD_SCRIPT_ID === actualScript)
          throw new Error('TEST_ACCEPTANCE_DISABLE_UNCONFIRMED');
        finalProps.setProperty('THU_TUAN_ENABLED','false');
        if (finalProps.getProperty('THU_TUAN_ENABLED') !== 'false') throw new Error('TEST_ACCEPTANCE_DISABLE_UNCONFIRMED');
      }
      catch (_) {
        result = Object.assign({},result,{status:'TEST_ACCEPTANCE_DISABLE_UNCONFIRMED',operationStatus:result.status});
      }
    }
    if (locked) lock.releaseLock();
  }
  Logger.log(JSON.stringify(result));
  return result;
}

function chuanBiFixtureZaloThuTuanTest(event) { return thuTuanZaloAcceptanceRun_(event,'PREPARE'); }
function duyetFixtureZaloThuTuanTest(event) { return thuTuanZaloAcceptanceRun_(event,'APPROVE'); }
function xemTruocFixtureZaloThuTuanTest(event) { return thuTuanZaloAcceptanceRun_(event,'PREVIEW'); }
function guiFixtureZaloThuTuanTest(event) { return thuTuanZaloAcceptanceRun_(event,'SEND'); }
function doiSoatFixtureZaloThuTuanTest(event) { return thuTuanZaloAcceptanceRun_(event,'AUDIT'); }
