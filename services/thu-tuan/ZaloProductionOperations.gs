/** Production-only manual checks after the 2026-10-05 cutover. Never called from HTTP or a trigger.
 * The one-shot TEST→PROD migration already ran in the cloud and was removed with the TEST tooling. */
var THU_TUAN_PROMOTION_ = {start:'2026-10-12'};
function thuTuanPromotionActor_(event,cfg) {
  if (event) throw new Error('MANUAL_ONLY');
  var actor = thuTuanText_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!actor || cfg.approvers.indexOf(actor) < 0) throw new Error('APPROVER_REQUIRED');
  thuTuanZaloConfig_(cfg); // The existing independently confirmed profile pins every resource and destination.
}
/** The next Monday to deliver (today when run on a Monday), never before the cutover week. */
function thuTuanPromotedWeek_() {
  var upcoming = thuTuanWeekKey_(new Date(Date.now() + 6 * 86400000));
  return upcoming < THU_TUAN_PROMOTION_.start ? THU_TUAN_PROMOTION_.start : upcoming;
}
function thuTuanPromotedPreview_(event) {
  var cfg = thuTuanConfig_();thuTuanPromotionActor_(event,cfg);
  if (cfg.zaloProperties.THU_TUAN_ZALO_ENV !== 'PROD' || !cfg.weeklyPhoto || cfg.startWeek !== THU_TUAN_PROMOTION_.start ||
      PropertiesService.getScriptProperties().getProperty('THU_TUAN_PROMOTION_STATE') !== 'MIGRATED') throw new Error('PROMOTION_REQUIRED');
  var ky = thuTuanPromotedWeek_(), io = thuTuanAdapter_(cfg), preview = thuTuanRun_(io,ky,true);
  if (preview.status !== 'PREVIEW' || preview.total !== 1 || preview.alreadySent || preview.unknown) throw new Error('PREVIEW_BLOCKED');
  var rows = thuTuanForKey_(io.content(),ky), plan = thuTuanZaloWeeklyPhoto_(rows[0],cfg);
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
