/** Manual, owner-authorized cutover on 2026-10-05. Never called from HTTP or a trigger. */
var THU_TUAN_PROMOTION_ = {start:'2026-10-12',archive:'_TEST_20261005'};
function thuTuanPromotionActor_(event,cfg) {
  if (event) throw new Error('MANUAL_ONLY');
  var actor = thuTuanText_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!actor || cfg.approvers.indexOf(actor) < 0) throw new Error('APPROVER_REQUIRED');
  thuTuanZaloConfig_(cfg); // The existing independently confirmed profile pins every resource and destination.
}
function thuTuanPromotionArchive_(book,name,headers,values) {
  var original = book.getSheetByName(name), archive = name + THU_TUAN_PROMOTION_.archive;
  if (!original || book.getSheetByName(archive)) throw new Error('ARCHIVE_CONFLICT');
  original.setName(archive); // Preserve original rows, receipts and formatting; never clear/delete history.
  var fresh = book.insertSheet(name);
  fresh.getRange(1,1,Math.max(2,values.length + 1),headers.length).setNumberFormat('@');
  fresh.getRange(1,1,1,headers.length).setValues([headers]);
  if (values.length) fresh.getRange(2,1,values.length,headers.length).setValues(values);
  fresh.setFrozenRows(1);
  SpreadsheetApp.flush();
  if (JSON.stringify(fresh.getRange(1,1,values.length + 1,headers.length).getValues()) !==
      JSON.stringify([headers].concat(values))) throw new Error('ARCHIVE_READBACK_FAILED');
}
function chuyenNhomTestThanhProduction(event) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('BUSY');
  try {
    var cfg = thuTuanConfig_(), props = PropertiesService.getScriptProperties();
    thuTuanPromotionActor_(event,cfg);
    if (props.getProperty('THU_TUAN_PROMOTION_STATE')) throw new Error('PROMOTION_ALREADY_STARTED');
    if (cfg.enabledValue !== 'false' || !cfg.testMode || ScriptApp.getProjectTriggers().length) throw new Error('DISABLE_BEFORE_PROMOTION');
    var state = thuTuanCommandConfig_('TEST'), catalog = thuTuanCommandCatalog_(state,true);
    if (thuTuanZaloPreflight_(state.zalo) !== 'OK') throw new Error('BOT_UNVERIFIED');
    var contentBook = SpreadsheetApp.openById(cfg.contentId), privateBook = SpreadsheetApp.openById(cfg.privateId);
    var headers = THU_TUAN_HEADERS.LoiDay_NoiDung, oldContent = thuTuanRows_(thuTuanSheet_(cfg.contentId,'LoiDay_NoiDung'),'LoiDay_NoiDung');
    var draftSheet = contentBook.getSheetByName('Zalo_Nhap_51_Ky');
    if (!draftSheet || draftSheet.getLastRow() !== 52 || JSON.stringify(draftSheet.getRange(1,1,1,20).getValues()[0]) !== JSON.stringify(headers))
      throw new Error('DRAFT_SCHEMA_REQUIRED');
    var drafts = draftSheet.getRange(2,1,51,20).getValues(), seen = {};
    var values = drafts.map(function(raw) {
      var row = {}; headers.forEach(function(h,i) { row[h] = raw[i]; });
      if (!thuTuanCommandMonday_(row.Ky) || row.Ky < THU_TUAN_PROMOTION_.start || seen[row.Ky] ||
          row.TrangThai !== 'Nhap' || row.NguoiDuyet || row.NgayDuyet || row.DauVanBanDuyet ||
          THU_TUAN_REQUIRED.some(function(k) { return !thuTuanText_(row[k]); })) throw new Error('DRAFT_INVALID');
      seen[row.Ky] = true;
      thuTuanZaloWeeklyPhoto_(row,cfg);
      var approved = oldContent.filter(function(c) { return c.Ky === row.Ky && c.MaLoiDay === row.MaLoiDay &&
        !thuTuanApprovalProblem_(c,thuTuanDigest_(c,cfg.secret),cfg.approvers); });
      if (approved.length > 1) throw new Error('APPROVAL_CONFLICT');
      // Retain a human approval only when every editorial field and version is identical to the draft.
      if (approved.length === 1 && headers.filter(function(h) { return ['TrangThai','NguoiDuyet','NgayDuyet','DauVanBanDuyet'].indexOf(h) < 0; })
          .every(function(h) { return String(approved[0][h] || '') === String(row[h] || ''); })) row = approved[0];
      return headers.map(function(h) { return row[h] || ''; });
    });
    var next = values[0], nextRow = {}; headers.forEach(function(h,i) { nextRow[h] = next[i]; });
    if (nextRow.Ky !== THU_TUAN_PROMOTION_.start || thuTuanApprovalProblem_(nextRow,thuTuanDigest_(nextRow,cfg.secret),cfg.approvers))
      throw new Error('FIRST_WEEK_APPROVAL_REQUIRED');
    var logDefinitions = [['ThuTuan_Zalo_NhatKyGui',THU_TUAN_HEADERS.ThuTuan_Zalo_NhatKyGui,6],
      ['ThuTuan_NhatKyGui',THU_TUAN_HEADERS.ThuTuan_NhatKyGui,6],['ThuTuan_Zalo_Lenh',THU_TUAN_COMMAND_LOG_HEADERS_,1]];
    var archives = ['LoiDay_NoiDung'].map(function(n) { return [contentBook,n]; });
    logDefinitions.forEach(function(d) {
      var sheet = thuTuanCommandSheet_(cfg.privateId,d[0],d[1]);
      var rows = sheet.getLastRow() > 1 ? sheet.getRange(2,1,sheet.getLastRow()-1,d[1].length).getValues() : [];
      if (rows.some(function(r) { return r[d[2]] !== 'SENT'; })) throw new Error('RECONCILIATION_REQUIRED');
      if (d[0] === 'ThuTuan_Zalo_NhatKyGui' && rows.some(function(r) { return r[10] !== 'TEST' || r[11] !== state.zalo.targetHash ||
          !thuTuanZaloMessageId_({message_id:r[15]}); })) throw new Error('TEST_HISTORY_REQUIRED');
      if (d[0] === 'ThuTuan_Zalo_Lenh' && rows.some(function(r) { return r[5] !== 'TEST' || r[6] !== state.zalo.targetHash ||
          !thuTuanZaloMessageId_({message_id:r[4]}); })) throw new Error('TEST_HISTORY_REQUIRED');
      archives.push([privateBook,d[0]]);
    });
    if (archives.some(function(a) { return a[0].getSheetByName(a[1] + THU_TUAN_PROMOTION_.archive); })) throw new Error('ARCHIVE_CONFLICT');
    // All validation is complete. Keep a private in-project property backup without exporting credentials.
    var before = props.getProperties();
    Object.keys(before).forEach(function(k) { props.setProperty('PROMOTION_BACKUP_' + k,before[k]); });
    props.setProperty('THU_TUAN_ENABLED','false');props.setProperty('THU_TUAN_ZALO_COMMANDS_ENABLED','false');
    props.setProperty('THU_TUAN_PROMOTION_STATE','IN_PROGRESS');
    thuTuanPromotionArchive_(contentBook,'LoiDay_NoiDung',headers,values);
    logDefinitions.forEach(function(d) { thuTuanPromotionArchive_(privateBook,d[0],d[1],[]); });
    ['SCRIPT_ID','CONTENT_SHEET_ID','PRIVATE_SHEET_ID','BOT_ID','CHAT_SHA256','BOT_TOKEN','CHAT_ID','GROUP_CONFIRMED'].forEach(function(k) {
      props.setProperty('THU_TUAN_ZALO_PROD_' + k,before['THU_TUAN_ZALO_TEST_' + k]);
    });
    Object.keys(before).filter(function(k) { return k.indexOf('THU_TUAN_ZALO_TEST_') === 0; }).forEach(function(k) { props.deleteProperty(k); });
    props.deleteProperty('THU_TUAN_TEST_RECIPIENT_EMAIL');
    props.setProperty('THU_TUAN_ZALO_ENV','PROD');props.setProperty('THU_TUAN_TEST_MODE','false');
    props.setProperty('THU_TUAN_START_WEEK',THU_TUAN_PROMOTION_.start);props.setProperty('THU_TUAN_ZALO_WEEKLY_PHOTO','true');
    var prodState = thuTuanCommandConfig_('PROD');
    props.setProperty('THU_TUAN_ZALO_COMMAND_CATALOG_STAMP',thuTuanCommandCatalog_(prodState,false).stamp);
    thuTuanCommandCatalog_(thuTuanCommandConfig_('PROD'),true);
    props.setProperty('THU_TUAN_PROMOTION_STATE','MIGRATED');
    var result = {status:'PROMOTED_DISABLED',environment:'PROD',startWeek:THU_TUAN_PROMOTION_.start,drafts:51,
      approved:values.filter(function(r) { return r[5] === 'DaDuyet'; }).length,archives:4,triggers:0};
    Logger.log(JSON.stringify(result));return result;
  } finally { lock.releaseLock(); }
}
function thuTuanPromotedPreview_(event) {
  var cfg = thuTuanConfig_();thuTuanPromotionActor_(event,cfg);
  if (cfg.zaloProperties.THU_TUAN_ZALO_ENV !== 'PROD' || !cfg.weeklyPhoto || cfg.startWeek !== THU_TUAN_PROMOTION_.start ||
      PropertiesService.getScriptProperties().getProperty('THU_TUAN_PROMOTION_STATE') !== 'MIGRATED') throw new Error('PROMOTION_REQUIRED');
  var io = thuTuanAdapter_(cfg), preview = thuTuanRun_(io,THU_TUAN_PROMOTION_.start,true);
  if (preview.status !== 'PREVIEW' || preview.total !== 1 || preview.alreadySent || preview.unknown) throw new Error('PREVIEW_BLOCKED');
  var rows = thuTuanForKey_(io.content(),THU_TUAN_PROMOTION_.start), plan = thuTuanZaloWeeklyPhoto_(rows[0],cfg);
  if (!thuTuanCommandPhotoOk_(plan) || thuTuanZaloPreflight_(thuTuanZaloConfig_(cfg)) !== 'OK') throw new Error('PHOTO_OR_BOT_UNVERIFIED');
  return {status:'PRODUCTION_PHOTO_READY',environment:'PROD',startWeek:preview.key,maLoiDay:preview.maLoiDay,
    messages:1,captionLength:plan.payload.caption.length,photoVerified:true,enabled:cfg.enabled,
    triggers:thuTuanOwnTriggers_().length};
}
function kiemTraProductionDaChuyen(event) {
  var lock = LockService.getScriptLock();if (!lock.tryLock(1000)) throw new Error('BUSY');
  try { var report = thuTuanPromotedPreview_(event);Logger.log(JSON.stringify(report));return report; }
  finally { lock.releaseLock(); }
}
function batLichProductionDaChuyen(event) {
  var lock = LockService.getScriptLock();if (!lock.tryLock(1000)) throw new Error('BUSY');
  try {
    var preview = thuTuanPromotedPreview_(event), cfg = thuTuanConfig_(), zalo = thuTuanZaloConfig_(cfg);
    var info = thuTuanZaloRequest_(zalo,'getWebhookInfo',{});
    var probe = info && info.url === 'https://thu-tuan-zalo-test.vercel.app/api/zalo' ? thuTuanZaloRequest_(zalo,'testWebhook',{}) : null;
    if (!probe || probe.ok !== true) throw new Error('WEBHOOK_UNVERIFIED');
    if (thuTuanOwnTriggers_().length > 1) throw new Error('DUPLICATE_TRIGGER');
    var props = PropertiesService.getScriptProperties();
    props.setProperty('THU_TUAN_ZALO_COMMANDS_ENABLED','true');props.setProperty('THU_TUAN_ENABLED','true');
    if (!thuTuanOwnTriggers_().length) ScriptApp.newTrigger('guiThuTuan').timeBased().inTimezone(THU_TUAN_TZ)
      .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).everyWeeks(1).create();
    if (thuTuanOwnTriggers_().length !== 1 || !thuTuanConfig_().enabled) throw new Error('TRIGGER_NOT_VERIFIED');
    var result = Object.assign({},preview,{status:'PRODUCTION_SCHEDULED',enabled:true,commandsEnabled:true,triggers:1});
    Logger.log(JSON.stringify(result));return result;
  } catch (error) {
    PropertiesService.getScriptProperties().setProperty('THU_TUAN_ENABLED','false');
    PropertiesService.getScriptProperties().setProperty('THU_TUAN_ZALO_COMMANDS_ENABLED','false');
    throw error;
  } finally { lock.releaseLock(); }
}
function tatLichProductionCu(event) {
  if (event || PropertiesService.getScriptProperties().getProperty('THU_TUAN_PROMOTION_STATE')) throw new Error('OLD_PRODUCTION_REQUIRED');
  var cfg = thuTuanConfig_(), actor = thuTuanText_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!actor || cfg.approvers.indexOf(actor) < 0 || cfg.zaloProperties.THU_TUAN_ZALO_ENV !== 'PROD') throw new Error('APPROVER_REQUIRED');
  var lock = LockService.getScriptLock();if (!lock.tryLock(1000)) throw new Error('BUSY');
  try {
    var props = PropertiesService.getScriptProperties();props.setProperty('THU_TUAN_ENABLED','false');
    thuTuanOwnTriggers_().forEach(function(t) { ScriptApp.deleteTrigger(t); });
    var result = {status:'OLD_PRODUCTION_STOPPED',enabled:thuTuanConfig_().enabled,triggers:thuTuanOwnTriggers_().length};
    Logger.log(JSON.stringify(result));return result;
  } finally { lock.releaseLock(); }
}
