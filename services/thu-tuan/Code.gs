/** Standalone project. Never deploy as a public Web App or copy into backend/. */
var THU_TUAN_TZ = 'Asia/Ho_Chi_Minh';
var THU_TUAN_HEADERS = {
  LoiDay_NoiDung: ['Ky','MaLoiDay','NoiDungNguyenVan','NguonTrich','GoiYLienHe','TrangThai','NguoiDuyet','NgayDuyet','PhienBan','DauVanBanDuyet',
    'ChuDe','BoiCanh','PhanTich','LienHeCAND','LienHeAnNinhDoiNgoai','HanhDongTuanNay','NotebookLM_URL'],
  ThuTuan_NguoiNhan: ['MaCB','Email','TrangThai','NgayDangKy'],
  ThuTuan_NhatKyGui: ['Khoa','Ky','MaCB','MaLoiDay','PhienBan','DauVanBanDuyet','TrangThai','CapNhatLuc','MaLoi']
};

function thuTuanWeekKey_(date) {
  var local = Utilities.formatDate(date, THU_TUAN_TZ, 'yyyy-MM-dd');
  var day = new Date(local + 'T00:00:00Z');
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0,10);
}

function thuTuanText_(value) { return value == null ? '' : String(value).trim(); }
function thuTuanDigest_(content) {
  var keys = ['Ky','ChuDe','MaLoiDay','NoiDungNguyenVan','NguonTrich','GoiYLienHe','BoiCanh','PhanTich',
    'LienHeCAND','LienHeAnNinhDoiNgoai','HanhDongTuanNay','NotebookLM_URL','TrangThai','NguoiDuyet','NgayDuyet','PhienBan'];
  var value = keys.map(function(key) {
    var raw = content[key];
    if (key === 'NgayDuyet') {
      if (raw == null || raw === '') return '';
      var date = new Date(raw);
      return Number.isFinite(date.getTime()) ? date.toISOString() : 'INVALID:' + String(raw);
    }
    return raw == null ? '' : String(raw);
  });
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value), Utilities.Charset.UTF_8)
    .map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

function thuTuanNotebookUrl_(value) {
  var url = thuTuanText_(value);
  return /^https:\/\/notebooklm\.google\.com\/notebook\/[A-Za-z0-9_-]+\/?(?:[?#][^\s<>"']*)?$/i.test(url) ? url : '';
}

function thuTuanEscapeHtml_(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
  });
}

function thuTuanHtmlText_(value) {
  return thuTuanEscapeHtml_(value).replace(/\r\n|\r|\n/g, '<br>');
}

function thuTuanEmailFields_(content) {
  return [
    ['Tuần/Chủ đề', thuTuanText_(content.Ky) + ' — ' + thuTuanText_(content.ChuDe)],
    ['Mã lời dạy', content.MaLoiDay],
    ['Lời Bác dạy', content.NoiDungNguyenVan],
    ['Nguồn', content.NguonTrich],
    ['Bối cảnh', content.BoiCanh],
    ['Phân tích', content.PhanTich],
    ['Liên hệ CAND', content.LienHeCAND],
    ['Liên hệ An ninh đối ngoại', content.LienHeAnNinhDoiNgoai],
    ['Hành động tuần này', content.HanhDongTuanNay]
  ];
}

function thuTuanRenderText_(content) {
  var sections = thuTuanEmailFields_(content).map(function(field) {
    return field[0] + ':\n' + thuTuanText_(field[1]);
  });
  sections.push('Muốn dừng nhận thư, vui lòng báo người phụ trách.');
  sections.push('Tra cứu mở rộng trên NotebookLM:\n' + thuTuanNotebookUrl_(content.NotebookLM_URL));
  sections.push('NotebookLM chỉ là liên kết tra cứu mở rộng, không phải nguồn chính thức. Hãy đối chiếu nội dung với nguồn gốc trích dẫn.');
  return sections.join('\n\n');
}

function thuTuanRenderHtml_(content) {
  var sections = thuTuanEmailFields_(content).map(function(field) {
    return '<tr><td style="padding:14px 0;border-bottom:1px solid #e5e7eb">' +
      '<h2 style="margin:0 0 8px;font:600 16px/1.4 Arial,sans-serif;color:#17324d">' + thuTuanEscapeHtml_(field[0]) + '</h2>' +
      '<div style="font:16px/1.65 Arial,sans-serif;color:#243447;overflow-wrap:anywhere">' + thuTuanHtmlText_(field[1]) + '</div></td></tr>';
  }).join('');
  var url = thuTuanNotebookUrl_(content.NotebookLM_URL);
  var note = 'NotebookLM chỉ là liên kết tra cứu mở rộng, không phải nguồn chính thức. Hãy đối chiếu nội dung với nguồn gốc trích dẫn.';
  return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;background:#f3f6f8;padding:16px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:20px">' +
    '<tr><td style="font:14px/1.5 Arial,sans-serif;color:#526579;padding-bottom:8px">THƯ TUẦN “LỜI BÁC DẠY”</td></tr>' + sections +
    '<tr><td style="padding-top:20px;font:14px/1.6 Arial,sans-serif;color:#526579">' +
    '<p style="margin:0 0 12px">Muốn dừng nhận thư, vui lòng báo người phụ trách.</p><p style="margin:0 0 12px"><a href="' + thuTuanEscapeHtml_(url) + '" target="_blank" rel="noopener noreferrer" ' +
    'style="display:inline-block;background:#17324d;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px">Mở NotebookLM để tra cứu mở rộng</a></p>' +
    '<p style="margin:0">' + thuTuanEscapeHtml_(note) + '</p></td></tr></table></td></tr></table></body></html>';
}

function thuTuanConfig_() {
  var p = PropertiesService.getScriptProperties().getProperties();
  return {
    enabled: p.THU_TUAN_ENABLED === 'true',
    contentId: thuTuanText_(p.THU_TUAN_CONTENT_SHEET_ID),
    privateId: thuTuanText_(p.THU_TUAN_PRIVATE_SHEET_ID),
    approvers: thuTuanText_(p.THU_TUAN_APPROVER_EMAILS).toLowerCase().split(',').map(thuTuanText_).filter(Boolean)
  };
}

function thuTuanSheet_(id, name) {
  if (!id) throw new Error('MISSING_SHEET_CONFIG');
  var sheet = SpreadsheetApp.openById(id).getSheetByName(name);
  if (!sheet) throw new Error('MISSING_SHEET');
  var expected = THU_TUAN_HEADERS[name];
  var actual = sheet.getRange(1,1,1,expected.length).getValues()[0];
  if (expected.some(function(h,i) { return actual[i] !== h; })) throw new Error('INVALID_HEADERS');
  return sheet;
}

function thuTuanRows_(sheet, name) {
  if (sheet.getLastRow() < 2) return [];
  var headers = THU_TUAN_HEADERS[name];
  return sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getValues().map(function(row,i) {
    var item = { _row: i+2 };
    headers.forEach(function(h,j) { item[h] = row[j]; });
    return item;
  }).filter(function(row) { return headers.some(function(h) { return thuTuanText_(row[h]); }); });
}

function thuTuanAdapter_(cfg) {
  if (!cfg.contentId || !cfg.privateId || cfg.contentId === cfg.privateId) throw new Error('SEPARATE_SHEETS_REQUIRED');
  var logSheet = thuTuanSheet_(cfg.privateId,'ThuTuan_NhatKyGui');
  return {
    now: function() { return Date.now(); },
    content: function() { return thuTuanRows_(thuTuanSheet_(cfg.contentId,'LoiDay_NoiDung'),'LoiDay_NoiDung'); },
    recipients: function() { return thuTuanRows_(thuTuanSheet_(cfg.privateId,'ThuTuan_NguoiNhan'),'ThuTuan_NguoiNhan'); },
    logs: function() { return thuTuanRows_(logSheet,'ThuTuan_NhatKyGui'); },
    quota: function() { return MailApp.getRemainingDailyQuota(); },
    digest: thuTuanDigest_,
    put: function(entry) {
      var values = THU_TUAN_HEADERS.ThuTuan_NhatKyGui.map(function(key) { return entry[key] || ''; });
      if (!entry._row) entry._row = logSheet.getLastRow()+1;
      logSheet.getRange(entry._row,1,1,values.length).setValues([values]);
      SpreadsheetApp.flush();
    },
    send: function(recipient,content) {
      MailApp.sendEmail({ to: recipient.Email, subject: 'Lời Bác dạy — tuần từ ' + content.Ky,
        body: thuTuanRenderText_(content),
        htmlBody: thuTuanRenderHtml_(content)
      });
    }
  };
}

/** Pure orchestration with injected I/O; tests never contact Google or recipients. */
function thuTuanRun_(io, key, dryRun) {
  var started = io.now();
  var contents = io.content().filter(function(row) { return thuTuanText_(row.Ky) === key; });
  if (contents.length !== 1) return { status: 'CONTENT_MISSING_OR_DUPLICATE', sent: 0 };
  var content = contents[0];
  var digest = io.digest(content);
  var required = ['ChuDe','MaLoiDay','NoiDungNguyenVan','NguonTrich','BoiCanh','PhanTich',
    'LienHeCAND','LienHeAnNinhDoiNgoai','HanhDongTuanNay'];
  var missing = required.some(function(field) { return !thuTuanText_(content[field]); });
  if (content.TrangThai !== 'DaDuyet' || !thuTuanText_(content.NguoiDuyet) || !content.NgayDuyet ||
      !Number.isFinite(new Date(content.NgayDuyet).getTime()) || !thuTuanText_(content.PhienBan) ||
      missing || !thuTuanNotebookUrl_(content.NotebookLM_URL) || content.DauVanBanDuyet !== digest) {
    return { status: 'CONTENT_NOT_APPROVED', sent: 0 };
  }
  var recipients = io.recipients().filter(function(row) { return row.TrangThai === 'DangNhan'; });
  var ids = {}, emails = {};
  var invalid = recipients.some(function(row) {
    row.MaCB = thuTuanText_(row.MaCB); row.Email = thuTuanText_(row.Email).toLowerCase();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(row.MaCB) || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(row.Email) || ids[row.MaCB] || emails[row.Email]) return true;
    ids[row.MaCB] = true; emails[row.Email] = true; return false;
  });
  if (invalid) return { status: 'INVALID_RECIPIENT_LIST', sent: 0 };
  var logs = io.logs().filter(function(row) { return thuTuanText_(row.Ky) === key; });
  var byKey = {};
  for (var i=0;i<logs.length;i++) {
    if (byKey[logs[i].Khoa]) return { status: 'DUPLICATE_LOG', sent: 0 };
    if (logs[i].DauVanBanDuyet !== digest) return { status: 'CONTENT_CHANGED_DURING_WEEK', sent: 0 };
    byKey[logs[i].Khoa] = logs[i];
  }
  var pending = [], unknown = 0, alreadySent = 0;
  recipients.forEach(function(recipient) {
    var entry = byKey[key+'|'+recipient.MaCB];
    if (entry && entry.TrangThai === 'SENT') { alreadySent++; return; }
    if (entry && entry.TrangThai !== 'PENDING' && entry.TrangThai !== 'FAILED') { unknown++; return; }
    pending.push({ recipient: recipient, entry: entry });
  });
  if (dryRun) return { status: 'PREVIEW', pending: pending.length, unknown: unknown, alreadySent: alreadySent, sent: 0 };
  if (io.quota() < pending.length) return { status: 'QUOTA_DEFERRED', sent: 0, pending: pending.length, unknown: unknown };
  var sent = 0;
  for (var j=0;j<pending.length;j++) {
    if (io.now()-started > 240000 || io.quota()<1) return { status: 'DEFERRED', sent: sent, unknown: unknown };
    // Recheck content and opt-out immediately before each send.
    var fresh = io.content().filter(function(row) { return thuTuanText_(row.Ky) === key; });
    if (fresh.length !== 1 || fresh[0].TrangThai !== 'DaDuyet' || !thuTuanText_(fresh[0].NguoiDuyet) || !fresh[0].NgayDuyet ||
        !Number.isFinite(new Date(fresh[0].NgayDuyet).getTime()) || io.digest(fresh[0]) !== digest || fresh[0].DauVanBanDuyet !== digest)
      return { status: 'CONTENT_CHANGED_DURING_WEEK', sent: sent, unknown: unknown };
    var recipient = pending[j].recipient;
    var current = io.recipients().filter(function(row) { return row.MaCB === recipient.MaCB; });
    if (current.length !== 1 || current[0].TrangThai !== 'DangNhan' || thuTuanText_(current[0].Email).toLowerCase() !== recipient.Email) continue;
    var entry = pending[j].entry || { Khoa:key+'|'+recipient.MaCB, Ky:key, MaCB:recipient.MaCB,
      MaLoiDay:content.MaLoiDay, PhienBan:content.PhienBan, DauVanBanDuyet:digest };
    entry.TrangThai='SENDING'; entry.CapNhatLuc=new Date(io.now()); entry.MaLoi='';
    io.put(entry); // A failed write MUST prevent sending.
    try {
      io.send(recipient,content);
      entry.TrangThai='SENT'; entry.CapNhatLuc=new Date(io.now()); io.put(entry); sent++;
    } catch (_) {
      entry.TrangThai='UNKNOWN'; entry.MaLoi='SEND_OR_LOG_UNCERTAIN'; entry.CapNhatLuc=new Date(io.now());
      try { io.put(entry); } catch (_) { /* Persisted SENDING is also held for reconciliation. */ }
      return { status: 'RECONCILIATION_REQUIRED', sent:sent, unknown:unknown+1 };
    }
  }
  return { status: unknown ? 'RECONCILIATION_REQUIRED' : 'COMPLETE', sent:sent, alreadySent:alreadySent, unknown:unknown };
}

function thuTuanExecute_(dryRun) {
  var cfg = thuTuanConfig_();
  if (!dryRun && !cfg.enabled) return { status:'DISABLED', sent:0 };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { status:'BUSY', sent:0 };
  try {
    var result = thuTuanRun_(thuTuanAdapter_(cfg),thuTuanWeekKey_(new Date()),dryRun);
    Logger.log(JSON.stringify(result)); // Counts/status only, no recipient/content/error details.
    return result;
  } finally { lock.releaseLock(); }
}

function xemTruocThuTuan() { return thuTuanExecute_(true); }
function guiThuTuan() { return thuTuanExecute_(false); }

/** Run manually by an authorized reviewer with the actual week key, after source verification. */
function duyetNoiDungThuTuan(ky) {
  var cfg=thuTuanConfig_(), actor=Session.getActiveUser().getEmail().toLowerCase();
  if (!actor || cfg.approvers.indexOf(actor)<0) throw new Error('APPROVER_REQUIRED');
  var lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('BUSY');
  try {
    var sheet=thuTuanSheet_(cfg.contentId,'LoiDay_NoiDung');
    var rows=thuTuanRows_(sheet,'LoiDay_NoiDung').filter(function(row) { return row.Ky===ky; });
    if (rows.length!==1 || !/^\d{4}-\d{2}-\d{2}$/.test(ky) || thuTuanWeekKey_(new Date(ky+'T00:00:00+07:00'))!==ky) throw new Error('INVALID_WEEK');
    var row=rows[0];
    ['ChuDe','MaLoiDay','NoiDungNguyenVan','NguonTrich','BoiCanh','PhanTich','LienHeCAND',
      'LienHeAnNinhDoiNgoai','HanhDongTuanNay','PhienBan'].forEach(function(k) { if(!thuTuanText_(row[k]))throw new Error('INCOMPLETE_CONTENT'); });
    if (!thuTuanNotebookUrl_(row.NotebookLM_URL)) throw new Error('INVALID_NOTEBOOKLM_URL');
    var approvedAt=new Date();
    var approved=Object.assign({},row,{TrangThai:'DaDuyet',NguoiDuyet:actor,NgayDuyet:approvedAt});
    var digest=thuTuanDigest_(approved);
    sheet.getRange(row._row,6,1,5).setValues([['DaDuyet',actor,approvedAt,row.PhienBan,digest]]);
    SpreadsheetApp.flush();
    return { status:'APPROVED', key:ky };
  } finally { lock.releaseLock(); }
}

function caiLichThuTuan() {
  if (!thuTuanConfig_().enabled) throw new Error('ENABLE_AFTER_APPROVAL');
  var lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('BUSY');
  try {
    var existing=ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction()==='guiThuTuan'; });
    if (existing.length) return { status:'EXISTS', count:existing.length };
    ScriptApp.newTrigger('guiThuTuan').timeBased().inTimezone(THU_TUAN_TZ).onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).everyWeeks(1).create();
    return { status:'CREATED' };
  } finally { lock.releaseLock(); }
}
