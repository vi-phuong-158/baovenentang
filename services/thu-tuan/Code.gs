/** Standalone project. Never deploy as a public Web App or copy into backend/. */
var THU_TUAN_TZ = 'Asia/Ho_Chi_Minh';
var THU_TUAN_TEST_RECIPIENT_ID_ = 'THU_TUAN_TEST_OVERRIDE';
var THU_TUAN_NOTEBOOK_NOTE = 'NotebookLM chỉ là công cụ tra cứu thêm, không phải nguồn chính thức. Hãy đối chiếu nội dung với nguồn gốc trích dẫn.';
// Sheet schema retains legacy columns for backward-compatible imports.
var THU_TUAN_HEADERS = {
  LoiDay_NoiDung: ['Ky','MaLoiDay','NoiDungNguyenVan','NguonTrich','GoiYLienHe','TrangThai','NguoiDuyet','NgayDuyet','PhienBan','DauVanBanDuyet',
    'ChuDe','BoiCanh','PhanTich','LienHeCAND','LienHeAnNinhDoiNgoai','HanhDongTuanNay','NotebookLM_URL',
    'BoiCanhZalo','YNgiaVanDungZalo','HanhDongTuanNayZalo'],
  ThuTuan_NguoiNhan: ['MaCB','Email','TrangThai','NgayDangKy'],
  ThuTuan_NhatKyGui: ['Khoa','Ky','MaCB','MaLoiDay','PhienBan','DauVanBanDuyet','TrangThai','CapNhatLuc','MaLoi'],
  ThuTuan_Zalo_NhatKyGui: ['Khoa','Ky','MaCB','MaLoiDay','PhienBan','DauVanBanDuyet','TrangThai','CapNhatLuc','MaLoi',
    'Transport','Environment','TargetHash','Part','PartCount','PlanHash','MessageId']
};

function thuTuanWeekKey_(date) {
  var local = Utilities.formatDate(date, THU_TUAN_TZ, 'yyyy-MM-dd');
  var day = new Date(local + 'T00:00:00Z');
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0,10);
}

function thuTuanText_(value) { return value == null ? '' : String(value).trim(); }
function thuTuanIsDate_(value) { return Object.prototype.toString.call(value) === '[object Date]'; }
// LEGACY INPUT ONLY — DO NOT RENDER. Never add these fields to the canonical payload.
var THU_TUAN_LEGACY_INPUT_FIELDS_ = ['GoiYLienHe','LienHeAnNinhDoiNgoai'];
var THU_TUAN_CANONICAL_VERSION_ = 2;
var THU_TUAN_ZALO_FIELDS_ = ['BoiCanhZalo','YNgiaVanDungZalo','HanhDongTuanNayZalo'];
var THU_TUAN_CANONICAL_FIELDS_ = ['Ky','ChuDe','MaLoiDay','NoiDungNguyenVan','NguonTrich','BoiCanh','PhanTich',
  'LienHeCAND','HanhDongTuanNay','NotebookLM_URL','TrangThai','NguoiDuyet','NgayDuyet','PhienBan'];
function thuTuanCanonicalContent_(content) {
  var canonical = {};
  THU_TUAN_CANONICAL_FIELDS_.concat(THU_TUAN_ZALO_FIELDS_).forEach(function(key) { canonical[key] = content && content[key] != null ? content[key] : ''; });
  canonical.DauVanBanDuyet = content && content.DauVanBanDuyet != null ? content.DauVanBanDuyet : '';
  return canonical;
}
/** Versioned approval stamp over canonical fields only; the key lives only in Script Properties. */
function thuTuanDigest_(content, secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('MISSING_APPROVAL_SECRET');
  var canonical = thuTuanCanonicalContent_(content);
  var version = thuTuanApprovalVersion_(canonical);
  var fields = version === 3 ? THU_TUAN_CANONICAL_FIELDS_.concat(THU_TUAN_ZALO_FIELDS_) : THU_TUAN_CANONICAL_FIELDS_;
  var value = [version].concat(fields.map(function(key) {
    var raw = canonical[key];
    if (key === 'NgayDuyet') {
      if (raw == null || raw === '') return '';
      var date = new Date(raw);
      // Second precision: Sheets may not round-trip milliseconds.
      return Number.isFinite(date.getTime()) ? new Date(Math.floor(date.getTime() / 1000) * 1000).toISOString() : 'INVALID:' + String(raw);
    }
    return raw == null ? '' : String(raw);
  }));
  return (version === 3 ? 'v3:' : '') + Utilities.computeHmacSha256Signature(JSON.stringify(value), secret, Utilities.Charset.UTF_8)
    .map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

/** Existing v2 stamps remain byte-identical; any new Zalo field participates in v3. */
function thuTuanApprovalVersion_(content) {
  return /^v3:/.test(String(content.DauVanBanDuyet || '')) ||
    THU_TUAN_ZALO_FIELDS_.some(function(key) { return content[key] != null && String(content[key]) !== ''; }) ? 3 : 2;
}

function thuTuanNotebookUrl_(value) {
  var url = thuTuanText_(value);
  return /^https:\/\/notebooklm\.google\.com\/notebook\/[A-Za-z0-9_-]+\/?(?:[?#][^\s<>"']*)?$/i.test(url) ? url : '';
}
/** NotebookLM is optional; a non-empty value must be a valid NotebookLM notebook link. */
function thuTuanNotebookOk_(value) { return !thuTuanText_(value) || !!thuTuanNotebookUrl_(value); }

var THU_TUAN_REQUIRED = ['ChuDe','MaLoiDay','NoiDungNguyenVan','NguonTrich','BoiCanh','PhanTich',
  'LienHeCAND','HanhDongTuanNay','PhienBan'];

/** '' when approved, complete, reviewer allow-listed and stamp matches; otherwise a reason code. */
function thuTuanApprovalProblem_(row, digest, approvers) {
  if (!row || row.TrangThai !== 'DaDuyet') return 'NOT_APPROVED';
  var reviewer = thuTuanText_(row.NguoiDuyet).toLowerCase();
  if (!reviewer) return 'MISSING_REVIEWER';
  if (!approvers || approvers.indexOf(reviewer) < 0) return 'REVIEWER_NOT_ALLOWED';
  if (!row.NgayDuyet || !Number.isFinite(new Date(row.NgayDuyet).getTime())) return 'INVALID_APPROVAL_DATE';
  if (THU_TUAN_REQUIRED.some(function(field) { return !thuTuanText_(row[field]); })) return 'INCOMPLETE_CONTENT';
  if (!thuTuanNotebookOk_(row.NotebookLM_URL)) return 'INVALID_NOTEBOOKLM_URL';
  if (typeof digest !== 'string' || !digest || row.DauVanBanDuyet !== digest) return 'STAMP_MISMATCH';
  return '';
}

function thuTuanEscapeHtml_(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
  });
}

function thuTuanHtmlText_(value) {
  return thuTuanEscapeHtml_(value).replace(/\r\n|\r|\n/g, '<br>');
}

function thuTuanEmailText_(value) { return value == null ? '' : String(value); }

function thuTuanEmailSections_(content) {
  content = thuTuanCanonicalContent_(content);
  return [
    ['Bối cảnh', content.BoiCanh, 'context'],
    ['Phân tích / ý nghĩa', content.PhanTich, 'standard'],
    ['Liên hệ với Công an nhân dân', content.LienHeCAND, 'standard'],
    ['Hành động tuần này', content.HanhDongTuanNay, 'action']
  ];
}

function thuTuanRenderText_(content) {
  content = thuTuanCanonicalContent_(content);
  var sections = [
    'THƯ TUẦN – LỜI BÁC DẠY',
    'Học tập – Liên hệ – Hành động',
    'Tuần: ' + thuTuanEmailText_(content.Ky),
    'Chủ đề: ' + thuTuanEmailText_(content.ChuDe),
    'Mã lời dạy: ' + thuTuanEmailText_(content.MaLoiDay),
    'LỜI BÁC DẠY\n' + thuTuanEmailText_(content.NoiDungNguyenVan),
    'Nguồn trích dẫn:\n' + thuTuanEmailText_(content.NguonTrich)
  ];
  thuTuanEmailSections_(content).forEach(function(section) {
    sections.push(section[0].toUpperCase() + '\n' + thuTuanEmailText_(section[1]));
  });

  var url = thuTuanNotebookUrl_(content.NotebookLM_URL);
  if (url) {
    sections.push('Tra cứu thêm trên NotebookLM\n' + url);
    sections.push(THU_TUAN_NOTEBOOK_NOTE);
  }
  sections.push('Thư tuần “Lời Bác dạy” – nội dung đã được kiểm duyệt trước khi gửi.');
  sections.push('Muốn dừng nhận thư, vui lòng báo người phụ trách.');
  return sections.join('\n\n');
}

function thuTuanRenderHeader_() {
  return '<tr><td style="padding:22px 22px 19px;background:#702732;border-bottom:4px solid #d4b76a">' +
    '<h1 style="margin:0 0 5px;font:700 21px/1.35 Arial,Helvetica,sans-serif;color:#ffffff">THƯ TUẦN – LỜI BÁC DẠY</h1>' +
    '<p style="margin:0;font:14px/1.5 Arial,Helvetica,sans-serif;color:#f4e8c8">Học tập – Liên hệ – Hành động</p>' +
    '</td></tr>';
}

function thuTuanRenderHero_(available) {
  if (available !== true) return '';
  return '<tr><td style="padding:0;background:#f7f0e2">' +
    '<img src="cid:' + THU_TUAN_HERO_IMAGE_CID_ + '" alt="Minh họa chân dung Chủ tịch Hồ Chí Minh" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;outline:none;text-decoration:none">' +
    '</td></tr>';
}

function thuTuanRenderMetadata_(content) {
  return '<tr><td style="padding:14px 22px 15px;background:#fffdf8;border-bottom:1px solid #e8dfd1">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;table-layout:fixed">' +
    '<tr>' +
    '<td width="28%" valign="top" style="padding:0 10px 9px 0;font:11px/1.35 Arial,Helvetica,sans-serif;color:#8a7158;text-transform:uppercase;letter-spacing:.5px">Tuần<br><strong style="display:inline-block;padding-top:3px;font:600 14px/1.45 Arial,Helvetica,sans-serif;color:#332923;text-transform:none;letter-spacing:0">' + thuTuanHtmlText_(content.Ky) + '</strong></td>' +
    '<td width="72%" valign="top" style="padding:0 0 9px;font:11px/1.35 Arial,Helvetica,sans-serif;color:#8a7158;text-transform:uppercase;letter-spacing:.5px">Chủ đề<br><strong style="display:inline-block;padding-top:3px;font:600 14px/1.45 Arial,Helvetica,sans-serif;color:#332923;text-transform:none;letter-spacing:0;overflow-wrap:anywhere;word-wrap:break-word;word-break:break-word">' + thuTuanHtmlText_(content.ChuDe) + '</strong></td>' +
    '</tr><tr>' +
    '<td colspan="2" style="padding:0;font:11px/1.35 Arial,Helvetica,sans-serif;color:#8a7158;text-transform:uppercase;letter-spacing:.5px">Mã lời dạy<br><strong style="display:inline-block;padding-top:3px;font:600 14px/1.45 Arial,Helvetica,sans-serif;color:#332923;text-transform:none;letter-spacing:0;overflow-wrap:anywhere;word-wrap:break-word;word-break:break-word">' + thuTuanHtmlText_(content.MaLoiDay) + '</strong></td>' +
    '</tr></table></td></tr>';
}

function thuTuanRenderQuote_(content) {
  return '<tr><td style="padding:16px 18px 17px;background:#faf5e8;border-left:4px solid #c6a35d">' +
    '<h2 style="margin:0 0 9px;font:700 16px/1.4 Arial,Helvetica,sans-serif;color:#702732">Lời Bác dạy</h2>' +
    '<div style="font:600 17px/1.65 Arial,Helvetica,sans-serif;color:#302923;white-space:pre-wrap;overflow-wrap:anywhere;word-wrap:break-word;word-break:break-word">' + thuTuanHtmlText_(content.NoiDungNguyenVan) + '</div>' +
    '<p style="margin:12px 0 0;font:13px/1.6 Arial,Helvetica,sans-serif;color:#665745"><strong>Nguồn trích dẫn:</strong><br>' + thuTuanHtmlText_(content.NguonTrich) + '</p>' +
    '</td></tr>';
}

function thuTuanRenderHtmlSection_(title, value, kind) {
  var cellStyle = kind === 'action'
    ? 'padding:14px 14px;background:#fbf4df;border-left:3px solid #c6a35d'
    : 'padding:14px 0;background:#fffdf8;border-bottom:1px solid #e8dfd1';
  var headingColor = '#702732';
  return '<tr><td style="padding:0 18px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;table-layout:fixed"><tr><td style="' + cellStyle + '">' +
    '<h2 style="margin:0 0 6px;font:600 16px/1.4 Arial,Helvetica,sans-serif;color:' + headingColor + '">' + thuTuanEscapeHtml_(title) + '</h2>' +
    '<div style="font:15px/1.65 Arial,Helvetica,sans-serif;color:#332c25;white-space:pre-wrap;overflow-wrap:anywhere;word-wrap:break-word;word-break:break-word">' + thuTuanHtmlText_(value) + '</div>' +
    '</td></tr></table></td></tr>';
}

function thuTuanRenderNotebook_(content) {
  var url = thuTuanNotebookUrl_(content.NotebookLM_URL);
  if (!url) return '';
  return '<tr><td style="padding:13px 18px 16px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f7f3ea;border-top:1px solid #e5dccd"><tr><td style="padding:14px">' +
    '<p style="margin:0 0 10px"><a href="' + thuTuanEscapeHtml_(url) + '" target="_blank" style="display:inline-block;background:#702732;color:#ffffff;text-decoration:none;padding:11px 15px;border-radius:3px;font:600 14px/1.3 Arial,Helvetica,sans-serif">Tra cứu thêm trên NotebookLM</a></p>' +
    '<p style="margin:0;font:13px/1.6 Arial,Helvetica,sans-serif;color:#665745">' + thuTuanEscapeHtml_(THU_TUAN_NOTEBOOK_NOTE) + '</p>' +
    '</td></tr></table></td></tr>';
}

function thuTuanRenderFooter_() {
  return '<tr><td style="padding:15px 20px 17px;border-top:1px solid #e8dfd1;font:13px/1.6 Arial,Helvetica,sans-serif;color:#665f56">' +
    '<p style="margin:0 0 7px">Thư tuần “Lời Bác dạy” – nội dung đã được kiểm duyệt trước khi gửi.</p>' +
    '<p style="margin:0">Muốn dừng nhận thư, vui lòng báo người phụ trách.</p>' +
    '</td></tr>';
}

function thuTuanRenderHtml_(content, includeHero) {
  content = thuTuanCanonicalContent_(content);
  var sections = thuTuanEmailSections_(content).map(function(section) {
    return thuTuanRenderHtmlSection_(section[0], section[1], section[2]);
  }).join('');
  return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:12px;background:#f2ece2;font-family:Arial,Helvetica,sans-serif">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse"><tr><td align="center" style="padding:0">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;border-collapse:collapse;table-layout:fixed;background:#fffdf8;border:1px solid #e4dacb">' +
    thuTuanRenderHeader_() + thuTuanRenderHero_(includeHero) + thuTuanRenderMetadata_(content) + thuTuanRenderQuote_(content) +
    sections + thuTuanRenderNotebook_(content) + thuTuanRenderFooter_() +
    '</table></td></tr></table></body></html>';
}
function thuTuanConfig_() {
  var p = PropertiesService.getScriptProperties().getProperties();
  var transport = p.THU_TUAN_TRANSPORT === undefined || p.THU_TUAN_TRANSPORT === '' ? 'GMAIL' : p.THU_TUAN_TRANSPORT;
  var zaloProperties = {};
  if (transport === 'ZALO') {
    zaloProperties.THU_TUAN_ZALO_ENV = p.THU_TUAN_ZALO_ENV;
    ['TEST','PROD'].forEach(function(env) {
      var prefix = 'THU_TUAN_ZALO_' + env + '_';
      var keys = ['SCRIPT_ID','CONTENT_SHEET_ID','PRIVATE_SHEET_ID','BOT_ID','CHAT_SHA256'];
      if (p.THU_TUAN_ZALO_ENV === env) keys = keys.concat(['BOT_TOKEN','CHAT_ID','GROUP_CONFIRMED']);
      keys.forEach(function(key) { if (p[prefix+key] !== undefined) zaloProperties[prefix+key] = p[prefix+key]; });
    });
  }
  return {
    transport: transport,
    zaloProperties: zaloProperties,
    enabled: p.THU_TUAN_ENABLED === 'true',
    enabledValue: p.THU_TUAN_ENABLED,
    weeklyPhoto: p.THU_TUAN_ZALO_WEEKLY_PHOTO === 'true',
    startWeek: p.THU_TUAN_START_WEEK || '',
    testMode: p.THU_TUAN_TEST_MODE === 'true',
    testModeValue: p.THU_TUAN_TEST_MODE,
    testRecipientEmail: thuTuanText_(p.THU_TUAN_TEST_RECIPIENT_EMAIL).toLowerCase(),
    contentId: thuTuanText_(p.THU_TUAN_CONTENT_SHEET_ID),
    privateId: thuTuanText_(p.THU_TUAN_PRIVATE_SHEET_ID),
    approvers: thuTuanText_(p.THU_TUAN_APPROVER_EMAILS).toLowerCase().split(',').map(thuTuanText_).filter(Boolean),
    secret: p.THU_TUAN_APPROVAL_SECRET || ''
  };
}

function thuTuanSheet_(id, name) {
  if (!id) throw new Error('MISSING_SHEET_CONFIG');
  var sheet = SpreadsheetApp.openById(id).getSheetByName(name);
  if (!sheet) throw new Error('MISSING_SHEET');
  var expected = THU_TUAN_HEADERS[name];
  var width = sheet.getLastColumn();
  var legacy = name === 'LoiDay_NoiDung' && width === expected.length - THU_TUAN_ZALO_FIELDS_.length;
  if (width !== expected.length && !legacy) throw new Error('INVALID_HEADERS');
  var actual = sheet.getRange(1,1,1,width).getValues()[0];
  if (actual.length !== width || expected.slice(0,width).some(function(h,i) { return actual[i] !== h; })) throw new Error('INVALID_HEADERS');
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

/** Manual append-only schema upgrade while sending is disabled; existing cells/stamps stay intact. */
function nangCapCotNoiDungZaloThuTuan() {
  var cfg = thuTuanConfig_(), actor = thuTuanText_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!actor || cfg.approvers.indexOf(actor) < 0) throw new Error('APPROVER_REQUIRED');
  if (cfg.enabledValue !== 'false') throw new Error('DISABLE_BEFORE_SCHEMA_UPGRADE');
  if (!cfg.contentId || !cfg.privateId || cfg.contentId === cfg.privateId) throw new Error('SEPARATE_SHEETS_REQUIRED');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('BUSY');
  try {
    var current = thuTuanConfig_();
    if (current.enabledValue !== 'false' || current.contentId !== cfg.contentId || current.privateId !== cfg.privateId ||
        JSON.stringify(current.approvers) !== JSON.stringify(cfg.approvers)) throw new Error('SCHEMA_CONFIG_CHANGED');
    var sheet = thuTuanSheet_(cfg.contentId,'LoiDay_NoiDung'), width = sheet.getLastColumn();
    if (width === THU_TUAN_HEADERS.LoiDay_NoiDung.length) return {status:'SCHEMA_ALREADY_CURRENT'};
    var max = sheet.getMaxColumns(), needed = THU_TUAN_HEADERS.LoiDay_NoiDung.length;
    if (max < needed) sheet.insertColumnsAfter(max,needed-max);
    sheet.getRange(1,width+1,1,THU_TUAN_ZALO_FIELDS_.length).setValues([THU_TUAN_ZALO_FIELDS_]);
    SpreadsheetApp.flush();
    thuTuanSheet_(cfg.contentId,'LoiDay_NoiDung');
    return {status:'ZALO_COLUMNS_ADDED',columns:THU_TUAN_ZALO_FIELDS_.slice()};
  } finally { lock.releaseLock(); }
}

function thuTuanStorage_(cfg, logName) {
  if (!cfg.contentId || !cfg.privateId || cfg.contentId === cfg.privateId) throw new Error('SEPARATE_SHEETS_REQUIRED');
  if (cfg.testModeValue && cfg.testModeValue !== 'true' && cfg.testModeValue !== 'false') throw new Error('INVALID_TEST_MODE');
  thuTuanDigest_({}, cfg.secret); // Fail before any read when the approval key is missing.
  var logSheet = thuTuanSheet_(cfg.privateId,logName);
  return {
    now: function() { return Date.now(); },
    approvers: cfg.approvers || [],
    content: function() { return thuTuanRows_(thuTuanSheet_(cfg.contentId,'LoiDay_NoiDung'),'LoiDay_NoiDung'); },
    testMode: cfg.testMode === true,
    logs: function() {
      var other = logName === 'ThuTuan_NhatKyGui' ? 'ThuTuan_Zalo_NhatKyGui' : 'ThuTuan_NhatKyGui';
      var rows = thuTuanRows_(logSheet,logName);
      // Optional for old Gmail installations; if present, its schema must be valid.
      if (SpreadsheetApp.openById(cfg.privateId).getSheetByName(other))
        rows = rows.concat(thuTuanRows_(thuTuanSheet_(cfg.privateId,other),other));
      return rows;
    },
    digest: function(content) { return thuTuanDigest_(content, cfg.secret); },
    put: function(entry) {
      var values = THU_TUAN_HEADERS[logName].map(function(key) { return entry[key] || ''; });
      if (!entry._row) entry._row = logSheet.getLastRow()+1;
      // Khoa..TrangThai stay plain text: Sheets would otherwise turn '2026-09-21' into a date.
      logSheet.getRange(entry._row,1,1,logName === 'ThuTuan_NhatKyGui' ? 7 : values.length).setNumberFormat('@');
      logSheet.getRange(entry._row,1,1,values.length).setValues([values]);
      SpreadsheetApp.flush();
    }
  };
}

function thuTuanAdapter_(cfg) {
  var transport = cfg.transport || 'GMAIL';
  if (transport === 'ZALO') return thuTuanZaloAdapter_(cfg);
  if (transport !== 'GMAIL') throw new Error('INVALID_TRANSPORT');
  var testMode = cfg.testMode === true;
  var testRecipientEmail = thuTuanText_(cfg.testRecipientEmail).toLowerCase();
  if (!testMode && testRecipientEmail) throw new Error('TEST_RECIPIENT_WITHOUT_TEST_MODE');
  if (testMode && !thuTuanValidEmail_(testRecipientEmail)) throw new Error('INVALID_TEST_RECIPIENT');
  return Object.assign(thuTuanStorage_(cfg,'ThuTuan_NhatKyGui'), {
    transport: 'GMAIL',
    recipients: function() {
      if (testMode) return [{ MaCB:THU_TUAN_TEST_RECIPIENT_ID_, Email:testRecipientEmail, TrangThai:'DangNhan' }];
      return thuTuanRows_(thuTuanSheet_(cfg.privateId,'ThuTuan_NguoiNhan'),'ThuTuan_NguoiNhan');
    },
    quota: function() { return MailApp.getRemainingDailyQuota(); },
    send: function(recipient,content) {
      // One message per recipient; no cc/bcc, so no address is disclosed to others.
      var heroImage = thuTuanHeroBlob_();
      var message = {
        to: recipient.Email,
        subject: 'Lời Bác dạy — tuần từ ' + content.Ky,
        body: thuTuanRenderText_(content),
        htmlBody: thuTuanRenderHtml_(content, !!heroImage)
      };
      if (heroImage) {
        message.inlineImages = {};
        message.inlineImages[THU_TUAN_HERO_IMAGE_CID_] = heroImage;
      }
      MailApp.sendEmail(message);
    }
  });
}

function thuTuanForKey_(rows, key) { return rows.filter(function(row) { return thuTuanText_(row.Ky) === key; }); }

/** Basic mailbox syntax validation; does not attempt to verify that the address exists. */
function thuTuanValidEmail_(value) {
  var email = thuTuanText_(value);
  if (email.length > 254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)) return false;
  var at = email.indexOf('@'), local = email.substring(0, at), domain = email.substring(at + 1);
  if (local.length > 64 || !/^[A-Za-z0-9.!#$%&'*+/=?^_{}|~-]+$/.test(local) ||
      local.charAt(0) === '.' || local.charAt(local.length - 1) === '.' || local.indexOf('..') >= 0) return false;
  var labels = domain.split('.');
  return labels.length >= 2 && labels.every(function(label) {
    return label.length > 0 && label.length <= 63 && /^[A-Za-z0-9-]+$/.test(label) &&
      label.charAt(0) !== '-' && label.charAt(label.length - 1) !== '-';
  });
}

function thuTuanAuditRecipients_(rows, testMode) {
  var invalidRows = Object.create(null), duplicateRows = Object.create(null);
  var firstIdRow = Object.create(null), firstActiveEmailRow = Object.create(null);
  rows = Array.isArray(rows) ? rows : [];
  function markInvalid(index) { invalidRows[index] = true; }
  function markDuplicate(first, index) { duplicateRows[first] = true; duplicateRows[index] = true; markInvalid(first); markInvalid(index); }
  rows.forEach(function(row, index) {
    if (!row || typeof row !== 'object') { markInvalid(index); return; }
    var id = thuTuanText_(row.MaCB), email = thuTuanText_(row.Email).toLowerCase();
    var status = row.TrangThai;
    var validEmail = thuTuanValidEmail_(email);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || (id === THU_TUAN_TEST_RECIPIENT_ID_ && testMode !== true)) markInvalid(index);
    if (status !== 'DangNhan' && status !== 'TamDung') markInvalid(index);
    if (!validEmail) markInvalid(index);
    if (id) {
      if (Object.prototype.hasOwnProperty.call(firstIdRow, id)) markDuplicate(firstIdRow[id], index);
      else firstIdRow[id] = index;
    }
    if (status === 'DangNhan' && validEmail) {
      if (Object.prototype.hasOwnProperty.call(firstActiveEmailRow, email)) markDuplicate(firstActiveEmailRow[email], index);
      else firstActiveEmailRow[email] = index;
    }
  });
  var testModeValid = testMode !== true ||
    (rows.length === 1 && rows[0] && thuTuanText_(rows[0].MaCB) === THU_TUAN_TEST_RECIPIENT_ID_);
  if (testMode === true && !testModeValid) rows.forEach(function(_, index) { markInvalid(index); });
  var invalid = Object.keys(invalidRows).length;
  if (testMode === true && !testModeValid && rows.length === 0) invalid = 1;
  var recipients = rows.filter(function(row, index) {
    return !invalidRows[index] && row.TrangThai === 'DangNhan';
  }).map(function(row) {
    return { MaCB:thuTuanText_(row.MaCB), Email:thuTuanText_(row.Email).toLowerCase(), TrangThai:row.TrangThai };
  });
  return {
    ok: invalid === 0 && testModeValid,
    recipients: recipients,
    counts: { total:rows.length, valid:Math.max(0, rows.length - invalid), invalid:invalid,
      duplicate:Object.keys(duplicateRows).length }
  };
}

function thuTuanMerge_() {
  var out = {};
  for (var i=0;i<arguments.length;i++) for (var k in arguments[i]) if (!(k in out)) out[k] = arguments[i][k];
  return out;
}

function thuTuanContentUnchanged_(io, key, digest) {
  var fresh = thuTuanForKey_(io.content(), key);
  return fresh.length === 1 && io.digest(fresh[0]) === digest && !thuTuanApprovalProblem_(fresh[0], digest, io.approvers);
}

/** Pure orchestration with injected I/O; tests never contact Google or recipients. */
function thuTuanRun_(io, key, dryRun) {
  var progress = {sent:0,attempted:0,confirmed:0,inFlight:false};
  var result;
  try { result = thuTuanRunWithProgress_(io,key,dryRun,progress); }
  catch (error) {
    if (io.transport !== 'ZALO') throw error;
    result = {status:progress.inFlight ? 'RECONCILIATION_REQUIRED' : 'ZALO_RUN_BLOCKED',
      reason:thuTuanZaloSafeReason_(error),sent:progress.sent,unknown:progress.inFlight ? 1 : 0};
  }
  if (io.transport === 'ZALO') {
    result.attempted = progress.attempted;
    result.confirmed = progress.confirmed;
  }
  return result;
}

/** A durable FAILED here proves this execution has not invoked the send API. */
function thuTuanNotSent_(io,entry) {
  try {
    entry.TrangThai='FAILED'; entry.MaLoi='PRE_SEND_BLOCKED'; entry.CapNhatLuc=new Date(io.now());
    io.put(entry);
    return true;
  } catch (_) { return false; } // Any persisted SENDING remains held, without claiming delivery.
}

function thuTuanRunWithProgress_(io, key, dryRun, progress) {
  var started = io.now();
  var allContent = io.content();
  if (allContent.some(function(row) { return thuTuanIsDate_(row.Ky); })) return { status: 'KY_NOT_PLAIN_TEXT', sent: 0 };
  var contents = thuTuanForKey_(allContent, key);
  if (contents.length !== 1) return { status: 'CONTENT_MISSING_OR_DUPLICATE', key: key, found: contents.length, sent: 0 };
  var content = thuTuanCanonicalContent_(contents[0]);
  var digest = io.digest(content);
  var problem = thuTuanApprovalProblem_(content, digest, io.approvers);
  if (problem) return { status: 'CONTENT_NOT_APPROVED', reason: problem, key: key, sent: 0 };
  var summary = { key: key, maLoiDay: thuTuanText_(content.MaLoiDay), phienBan: thuTuanText_(content.PhienBan) };
  if (io.summary) summary = thuTuanMerge_(summary,io.summary);
  var audit = io.audit || thuTuanAuditRecipients_;
  var recipientAudit = audit(io.recipients(content), io.testMode === true);
  if (!recipientAudit.ok) return thuTuanMerge_({ status:'INVALID_RECIPIENT_LIST', sent:0 }, recipientAudit.counts);
  var recipients = recipientAudit.recipients;
  var activeIds = Object.create(null);
  recipients.forEach(function(recipient) { activeIds[recipient.MaCB] = true; });
  // Match by Khoa as well as Ky, so a Ky cell coerced to a date can never hide an earlier send.
  var logs = io.logs().filter(function(row) {
    return thuTuanText_(row.Ky) === key || thuTuanText_(row.Khoa).indexOf(key + '|') === 0;
  });
  var byKey = {};
  for (var i=0;i<logs.length;i++) {
    if ((logs[i].Transport || 'GMAIL') !== (io.transport || 'GMAIL'))
      return { status:'TRANSPORT_CHANGED_DURING_WEEK', sent:0 };
    var khoa = thuTuanText_(logs[i].Khoa);
    if (khoa.indexOf(key + '|') !== 0 || byKey[khoa]) return { status: 'DUPLICATE_OR_INVALID_LOG', sent: 0 };
    var logId = khoa.substring((key + '|').length);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(logId) || thuTuanText_(logs[i].MaCB) !== logId ||
        (!thuTuanIsDate_(logs[i].Ky) && thuTuanText_(logs[i].Ky) !== key)) {
      return { status: 'DUPLICATE_OR_INVALID_LOG', sent: 0 };
    }
    if (logs[i].DauVanBanDuyet !== digest) return { status: 'CONTENT_CHANGED_DURING_WEEK', sent: 0 };
    if (io.validateLog && !io.validateLog(logs[i],content)) return { status:'DUPLICATE_OR_INVALID_LOG', sent:0 };
    byKey[khoa] = logs[i];
  }
  if (io.validateLogs && !io.validateLogs(logs)) return { status:'DUPLICATE_OR_INVALID_LOG', sent:0 };
  var pending = [], unknown = 0, alreadySent = 0;
  recipients.forEach(function(recipient) {
    var entry = byKey[key+'|'+recipient.MaCB];
    if (entry && entry.TrangThai === 'SENT') { alreadySent++; return; }
    // PENDING/FAILED = operator confirmed not sent. Anything else (SENDING, UNKNOWN, typos) is held.
    if (entry && entry.TrangThai !== 'PENDING' && entry.TrangThai !== 'FAILED') { unknown++; return; }
    pending.push({ recipient: recipient, entry: entry });
  });
  // An unresolved row still needs reconciliation if its recipient was paused or removed.
  Object.keys(byKey).forEach(function(khoa) {
    var recipientId = khoa.substring((key + '|').length);
    if (activeIds[recipientId]) return;
    var state = byKey[khoa].TrangThai;
    if (state !== 'SENT' && state !== 'PENDING' && state !== 'FAILED') unknown++;
  });
  var counts = thuTuanMerge_({ pending:pending.length, unknown:unknown, alreadySent:alreadySent },
    recipientAudit.counts);
  if (dryRun) return thuTuanMerge_({ status: 'PREVIEW', sent: 0, quota: io.quota(),
    notebookLM: !!thuTuanNotebookUrl_(content.NotebookLM_URL) }, summary, counts);
  if (unknown) return thuTuanMerge_({ status:'RECONCILIATION_REQUIRED', sent:0 }, summary, counts);
  if (pending.length && io.preflight) {
    var preflight = io.preflight();
    if (preflight !== 'OK') return thuTuanMerge_({ status:preflight, sent:0 }, summary, counts);
  }
  var quota = io.quota();
  if (quota !== null && quota < pending.length) return thuTuanMerge_({ status: 'QUOTA_DEFERRED', sent: 0 }, summary, counts);
  var sent = 0;
  for (var j=0;j<pending.length;j++) {
    quota = io.quota();
    if (io.now()-started > 240000 || (quota !== null && quota<1))
      return thuTuanMerge_({ status: 'DEFERRED', sent: sent, remaining: pending.length - j }, summary, counts);
    // Recheck content and opt-out immediately before each send.
    if (!thuTuanContentUnchanged_(io,key,digest))
      return thuTuanMerge_({ status: 'CONTENT_CHANGED_DURING_WEEK', sent: sent }, summary, counts);
    var recipient = pending[j].recipient;
    var currentAudit = audit(io.recipients(content), io.testMode === true);
    if (!currentAudit.ok) return thuTuanMerge_({ status:'INVALID_RECIPIENT_LIST', sent:sent }, currentAudit.counts, summary, counts);
    var current = currentAudit.recipients.filter(function(row) { return row.MaCB === recipient.MaCB; });
    if (current.length !== 1 || current[0].Email !== recipient.Email) continue;
    if (io.beforeSend) {
      try { io.beforeSend(); }
      catch (_) { return thuTuanMerge_({ status:'ZALO_CONFIG_CHANGED', sent:sent }, summary, counts); }
    }
    var entry = pending[j].entry || { Khoa:key+'|'+recipient.MaCB, Ky:key, MaCB:recipient.MaCB,
      MaLoiDay:content.MaLoiDay, PhienBan:content.PhienBan, DauVanBanDuyet:digest };
    if (io.decorateEntry) io.decorateEntry(entry,recipient,content);
    entry.TrangThai='SENDING'; entry.CapNhatLuc=new Date(io.now()); entry.MaLoi='';
    try { io.put(entry); } // A failed write MUST prevent sending.
    catch (error) {
      if (io.transport !== 'ZALO') throw error;
      var recovered = thuTuanNotSent_(io,entry);
      return thuTuanMerge_({status:recovered ? 'ZALO_PRE_SEND_BLOCKED' : 'RECONCILIATION_REQUIRED',
        reason:recovered ? 'PRE_SEND_BLOCKED' : 'PRE_SEND_LOG_UNCONFIRMED',sent:sent,unknown:recovered ? 0 : 1},summary,counts);
    }
    // These guards run before invoking send, so their failure cannot imply uncertain delivery.
    if (io.transport === 'ZALO') {
      try {
        if (io.beforeSend) io.beforeSend();
        if (!thuTuanContentUnchanged_(io,key,digest)) throw new Error('CONTENT_CHANGED_DURING_WEEK');
      } catch (_) {
        var notSent = thuTuanNotSent_(io,entry);
        return thuTuanMerge_({status:notSent ? 'ZALO_PRE_SEND_BLOCKED' : 'RECONCILIATION_REQUIRED',
          reason:notSent ? 'PRE_SEND_BLOCKED' : 'PRE_SEND_LOG_UNCONFIRMED',sent:sent,unknown:notSent ? 0 : 1},summary,counts);
      }
    }
    try {
      if (io.transport !== 'ZALO' && io.beforeSend) {
        io.beforeSend();
        if (!thuTuanContentUnchanged_(io,key,digest)) throw new Error('CONTENT_CHANGED_DURING_WEEK');
      }
      progress.attempted++;
      progress.inFlight=true;
      var receipt = io.send(recipient,content);
      if (io.confirmReceipt) io.confirmReceipt(entry,receipt);
      progress.confirmed++;
      entry.TrangThai='SENT'; entry.CapNhatLuc=new Date(io.now()); io.put(entry); sent++; progress.sent=sent; progress.inFlight=false;
    } catch (_) {
      entry.TrangThai='UNKNOWN'; entry.MaLoi='SEND_OR_LOG_UNCERTAIN'; entry.CapNhatLuc=new Date(io.now());
      try { io.put(entry); } catch (_) { /* Persisted SENDING is also held for reconciliation. */ }
      return thuTuanMerge_({ status: 'RECONCILIATION_REQUIRED', sent: sent, unknown: unknown+1 }, summary, counts);
    }
  }
  return thuTuanMerge_({ status: unknown ? 'RECONCILIATION_REQUIRED' : 'COMPLETE', sent: sent }, summary, counts);
}

function thuTuanExecute_(dryRun) {
  var cfg = thuTuanConfig_();
  if (!dryRun && !cfg.enabled) return { status:'DISABLED', sent:0 };
  if (cfg.startWeek) {
    // A malformed cutoff must surface as a failed trigger, never as a quiet skip that stops delivery forever.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cfg.startWeek) ||
        thuTuanWeekKey_(new Date(cfg.startWeek + 'T00:00:00+07:00')) !== cfg.startWeek) return {status:'INVALID_START_WEEK',sent:0};
    if (thuTuanWeekKey_(new Date()) < cfg.startWeek) return {status:'BEFORE_START_WEEK',sent:0};
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { status:'BUSY', sent:0 };
  var result;
  try {
    result = thuTuanRun_(thuTuanAdapter_(cfg),thuTuanWeekKey_(new Date()),dryRun);
    result.enabled = cfg.enabled;
    Logger.log(JSON.stringify(result)); // Counts/status/codes only, no recipient/content/error details.
    return result;
  } catch (error) {
    if (cfg.transport !== 'ZALO') throw error;
    var blocked = result ? Object.assign({},result,{status:'ZALO_REPORT_BLOCKED',operationStatus:result.status}) :
      { status:'ZALO_GATE_BLOCKED', reason:thuTuanZaloSafeReason_(error),sent:0,attempted:0,confirmed:0 };
    Logger.log(JSON.stringify(blocked));
    return blocked;
  } finally { lock.releaseLock(); }
}

/** Không gửi, không ghi: báo kỳ, mã lời dạy, lý do chặn (nếu có) và số người sẽ nhận. */
function xemTruocThuTuan() { return thuTuanExecute_(true); }
// A trigger run stays quiet only for a finished week (including alreadySent dedupe) or the deliberate kill switch.
var THU_TUAN_TRIGGER_QUIET_STATUSES_ = ['COMPLETE','DISABLED','BEFORE_START_WEEK'];

/** Manual runs return as before. A trigger run surfaces every other status as a failed execution. */
function thuTuanTriggerResult_(event, result) {
  var status = result && result.status;
  if (!event || THU_TUAN_TRIGGER_QUIET_STATUSES_.indexOf(status) >= 0) return result;
  var code = typeof status === 'string' && /^[A-Z0-9_]{1,64}$/.test(status) ? status : 'UNRECOGNIZED';
  // Runner has already logged its safe counts and released the lock; the error carries only a fixed code.
  Logger.log(JSON.stringify({ status:'THU_TUAN_TRIGGER_ATTENTION', operationStatus:code }));
  throw new Error('THU_TUAN_TRIGGER_ATTENTION:' + code);
}

/** Chỉ gửi khi THU_TUAN_ENABLED=true và nội dung kỳ này đã được duyệt hợp lệ. */
function guiThuTuan(event) {
  if (event && thuTuanConfig_().testMode) return thuTuanTriggerResult_(event, { status:'TEST_MODE_MANUAL_ONLY', sent:0 });
  return thuTuanTriggerResult_(event, thuTuanExecute_(false));
}

/** Run manually by an authorized reviewer with the actual week key, after source verification. */
function duyetNoiDungThuTuan(ky) {
  return thuTuanApproveContent_(ky);
}

/** Any Gmail/Zalo log row of this week, in any state. Re-stamping it would block reconciliation of the remaining parts. */
function thuTuanWeekHasHistory_(privateId, ky) {
  if (!privateId) throw new Error('MISSING_SHEET_CONFIG');
  var book = SpreadsheetApp.openById(privateId);
  var present = ['ThuTuan_NhatKyGui','ThuTuan_Zalo_NhatKyGui'].filter(function(name) { return !!book.getSheetByName(name); });
  if (!present.length) throw new Error('MISSING_SHEET');
  return present.some(function(name) {
    return thuTuanRows_(thuTuanSheet_(privateId,name),name).some(function(row) {
      return thuTuanText_(row.Ky) === ky || thuTuanText_(row.Khoa).indexOf(ky + '|') === 0;
    });
  });
}

/** Shared approval implementation; an internal verifier can bind TEST acceptance inside this same lock. */
function thuTuanApproveContent_(ky, verifyBeforeWrite) {
  var cfg=thuTuanConfig_(), actor=thuTuanText_(Session.getActiveUser().getEmail()).toLowerCase();
  if (!actor || cfg.approvers.indexOf(actor)<0) throw new Error('APPROVER_REQUIRED');
  if (typeof ky !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ky) || thuTuanWeekKey_(new Date(ky+'T00:00:00+07:00'))!==ky) throw new Error('INVALID_WEEK');
  thuTuanDigest_({}, cfg.secret);
  var lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('BUSY');
  try {
    var sheet=thuTuanSheet_(cfg.contentId,'LoiDay_NoiDung');
    var rows=thuTuanForKey_(thuTuanRows_(sheet,'LoiDay_NoiDung'), ky);
    if (rows.length!==1) throw new Error('INVALID_WEEK');
    if (thuTuanWeekHasHistory_(cfg.privateId, ky)) throw new Error('WEEK_HAS_DELIVERY_HISTORY');
    var row=rows[0];
    THU_TUAN_REQUIRED.forEach(function(k) { if(!thuTuanText_(row[k]))throw new Error('INCOMPLETE_CONTENT'); });
    if (!thuTuanNotebookOk_(row.NotebookLM_URL)) throw new Error('INVALID_NOTEBOOKLM_URL');
    var approvedAt=new Date(Math.floor(Date.now()/1000)*1000);
    var approved=Object.assign({},row,{TrangThai:'DaDuyet',NguoiDuyet:actor,NgayDuyet:approvedAt});
    if (cfg.transport === 'ZALO' && (cfg.weeklyPhoto || thuTuanApprovalVersion_(approved) === 3)) {
      approved.DauVanBanDuyet = 'v3:';
      thuTuanZaloOneMessage_(approved);
    }
    var digest=thuTuanDigest_(approved, cfg.secret);
    if (verifyBeforeWrite) verifyBeforeWrite(cfg,row,approved,digest);
    sheet.getRange(row._row,10).setNumberFormat('@');
    sheet.getRange(row._row,6,1,5).setValues([['DaDuyet',actor,approvedAt,row.PhienBan,digest]]);
    SpreadsheetApp.flush();
    // Read back: a stamp that does not survive the Sheets round-trip would silently block Monday's send.
    var saved=thuTuanForKey_(thuTuanRows_(sheet,'LoiDay_NoiDung'), ky);
    var problem=saved.length!==1 ? 'ROW_CHANGED' : thuTuanApprovalProblem_(saved[0], thuTuanDigest_(saved[0], cfg.secret), cfg.approvers);
    if (problem) throw new Error('APPROVAL_NOT_VERIFIED:' + problem);
    var result={ status:'APPROVED', key:ky, maLoiDay:thuTuanText_(row.MaLoiDay), phienBan:thuTuanText_(row.PhienBan) };
    Logger.log(JSON.stringify(result));
    return result;
  } finally { lock.releaseLock(); }
}

/** Chạy tay sau đối chiếu nguồn: kỳ cấu hình tường minh, hoặc tuần hiện tại khi key vắng. */
function duyetKyThuTuan() {
  var ky=PropertiesService.getScriptProperties().getProperty('THU_TUAN_APPROVAL_WEEK');
  return duyetNoiDungThuTuan(ky===null ? thuTuanWeekKey_(new Date()) : ky);
}

/** Tạo khóa ký dấu duyệt một lần; không ghi đè, không in giá trị. Đổi khóa làm mọi dấu duyệt cũ mất hiệu lực. */
function taoKhoaDuyetThuTuan() {
  var props=PropertiesService.getScriptProperties();
  if (props.getProperty('THU_TUAN_APPROVAL_SECRET')) return { status:'EXISTS' };
  props.setProperty('THU_TUAN_APPROVAL_SECRET', Utilities.getUuid() + Utilities.getUuid());
  return { status:'CREATED' };
}

function thuTuanOwnTriggers_() {
  return ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction()==='guiThuTuan'; });
}

function caiLichThuTuan() {
  var cfg = thuTuanConfig_();
  if (!cfg.enabled) throw new Error('ENABLE_AFTER_APPROVAL');
  if (cfg.testModeValue && cfg.testModeValue !== 'true' && cfg.testModeValue !== 'false') throw new Error('INVALID_TEST_MODE');
  if (cfg.testRecipientEmail && !cfg.testMode) throw new Error('TEST_RECIPIENT_WITHOUT_TEST_MODE');
  if (cfg.testMode) throw new Error('TEST_MODE_CANNOT_SCHEDULE');
  if (cfg.transport !== 'GMAIL' && cfg.transport !== 'ZALO') throw new Error('INVALID_TRANSPORT');
  if (cfg.transport === 'ZALO') thuTuanZaloConfig_(cfg);
  var lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('BUSY');
  try {
    var existing=thuTuanOwnTriggers_();
    if (existing.length) return { status:'EXISTS', count:existing.length };
    ScriptApp.newTrigger('guiThuTuan').timeBased().inTimezone(THU_TUAN_TZ).onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).everyWeeks(1).create();
    return { status:'CREATED' };
  } finally { lock.releaseLock(); }
}

/** Chỉ thấy trigger do tài khoản đang chạy tạo; trigger của tài khoản khác phải kiểm tra bằng tài khoản đó. */
function kiemTraLichThuTuan() {
  var result={ enabled: thuTuanConfig_().enabled, triggersOfThisAccount: thuTuanOwnTriggers_().length };
  Logger.log(JSON.stringify(result));
  return result;
}

/** Gỡ lịch gửi do tài khoản đang chạy tạo (tạm dừng hoặc bàn giao). */
function goLichThuTuan() {
  var lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('BUSY');
  try {
    var own=thuTuanOwnTriggers_();
    own.forEach(function(t) { ScriptApp.deleteTrigger(t); });
    var result={ status:'REMOVED', count:own.length };
    Logger.log(JSON.stringify(result));
    return result;
  } finally { lock.releaseLock(); }
}
