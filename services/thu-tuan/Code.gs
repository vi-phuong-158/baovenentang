/** Standalone project. Never deploy as a public Web App or copy into backend/. */
var THU_TUAN_TZ = 'Asia/Ho_Chi_Minh';
var THU_TUAN_TEST_RECIPIENT_ID_ = 'THU_TUAN_TEST_OVERRIDE';
var THU_TUAN_NOTEBOOK_NOTE = 'NotebookLM chỉ là công cụ tra cứu thêm, không phải nguồn chính thức. Hãy đối chiếu nội dung với nguồn gốc trích dẫn.';
// Sheet schema retains legacy columns for backward-compatible imports.
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
function thuTuanIsDate_(value) { return Object.prototype.toString.call(value) === '[object Date]'; }
// LEGACY INPUT ONLY — DO NOT RENDER. Never add these fields to the canonical payload.
var THU_TUAN_LEGACY_INPUT_FIELDS_ = ['GoiYLienHe','LienHeAnNinhDoiNgoai'];
var THU_TUAN_CANONICAL_VERSION_ = 2;
var THU_TUAN_CANONICAL_FIELDS_ = ['Ky','ChuDe','MaLoiDay','NoiDungNguyenVan','NguonTrich','BoiCanh','PhanTich',
  'LienHeCAND','HanhDongTuanNay','NotebookLM_URL','TrangThai','NguoiDuyet','NgayDuyet','PhienBan'];
function thuTuanCanonicalContent_(content) {
  var canonical = {};
  THU_TUAN_CANONICAL_FIELDS_.forEach(function(key) { canonical[key] = content && content[key] != null ? content[key] : ''; });
  canonical.DauVanBanDuyet = content && content.DauVanBanDuyet != null ? content.DauVanBanDuyet : '';
  return canonical;
}
/** Versioned approval stamp over canonical fields only; the key lives only in Script Properties. */
function thuTuanDigest_(content, secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('MISSING_APPROVAL_SECRET');
  var canonical = thuTuanCanonicalContent_(content);
  var value = [THU_TUAN_CANONICAL_VERSION_].concat(THU_TUAN_CANONICAL_FIELDS_.map(function(key) {
    var raw = canonical[key];
    if (key === 'NgayDuyet') {
      if (raw == null || raw === '') return '';
      var date = new Date(raw);
      // Second precision: Sheets may not round-trip milliseconds.
      return Number.isFinite(date.getTime()) ? new Date(Math.floor(date.getTime() / 1000) * 1000).toISOString() : 'INVALID:' + String(raw);
    }
    return raw == null ? '' : String(raw);
  }));
  return Utilities.computeHmacSha256Signature(JSON.stringify(value), secret, Utilities.Charset.UTF_8)
    .map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
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
  return {
    enabled: p.THU_TUAN_ENABLED === 'true',
    testMode: p.THU_TUAN_TEST_MODE === 'true',
    testModeValue: thuTuanText_(p.THU_TUAN_TEST_MODE),
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
  if (sheet.getLastColumn() !== expected.length) throw new Error('INVALID_HEADERS');
  var actual = sheet.getRange(1,1,1,expected.length).getValues()[0];
  if (actual.length !== expected.length || expected.some(function(h,i) { return actual[i] !== h; })) throw new Error('INVALID_HEADERS');
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
  if (cfg.testModeValue && cfg.testModeValue !== 'true' && cfg.testModeValue !== 'false') throw new Error('INVALID_TEST_MODE');
  var testMode = cfg.testMode === true;
  var testRecipientEmail = thuTuanText_(cfg.testRecipientEmail).toLowerCase();
  if (!testMode && testRecipientEmail) throw new Error('TEST_RECIPIENT_WITHOUT_TEST_MODE');
  if (testMode && !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(testRecipientEmail))
    throw new Error('INVALID_TEST_RECIPIENT');
  thuTuanDigest_({}, cfg.secret); // Fail before any read when the approval key is missing.
  var logSheet = thuTuanSheet_(cfg.privateId,'ThuTuan_NhatKyGui');
  return {
    now: function() { return Date.now(); },
    approvers: cfg.approvers || [],
    content: function() { return thuTuanRows_(thuTuanSheet_(cfg.contentId,'LoiDay_NoiDung'),'LoiDay_NoiDung'); },
    testMode: testMode,
    recipients: function() {
      if (testMode) return [{ MaCB:THU_TUAN_TEST_RECIPIENT_ID_, Email:testRecipientEmail, TrangThai:'DangNhan' }];
      return thuTuanRows_(thuTuanSheet_(cfg.privateId,'ThuTuan_NguoiNhan'),'ThuTuan_NguoiNhan');
    },
    logs: function() { return thuTuanRows_(logSheet,'ThuTuan_NhatKyGui'); },
    quota: function() { return MailApp.getRemainingDailyQuota(); },
    digest: function(content) { return thuTuanDigest_(content, cfg.secret); },
    put: function(entry) {
      var values = THU_TUAN_HEADERS.ThuTuan_NhatKyGui.map(function(key) { return entry[key] || ''; });
      if (!entry._row) entry._row = logSheet.getLastRow()+1;
      // Khoa..TrangThai stay plain text: Sheets would otherwise turn '2026-09-21' into a date.
      logSheet.getRange(entry._row,1,1,7).setNumberFormat('@');
      logSheet.getRange(entry._row,1,1,values.length).setValues([values]);
      SpreadsheetApp.flush();
    },
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
  };
}

function thuTuanForKey_(rows, key) { return rows.filter(function(row) { return thuTuanText_(row.Ky) === key; }); }

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
    var validEmail = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email);
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

/** Pure orchestration with injected I/O; tests never contact Google or recipients. */
function thuTuanRun_(io, key, dryRun) {
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
  var recipientAudit = thuTuanAuditRecipients_(io.recipients(), io.testMode === true);
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
    var khoa = thuTuanText_(logs[i].Khoa);
    if (khoa.indexOf(key + '|') !== 0 || byKey[khoa]) return { status: 'DUPLICATE_OR_INVALID_LOG', sent: 0 };
    var logId = khoa.substring((key + '|').length);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(logId) || thuTuanText_(logs[i].MaCB) !== logId ||
        (!thuTuanIsDate_(logs[i].Ky) && thuTuanText_(logs[i].Ky) !== key)) {
      return { status: 'DUPLICATE_OR_INVALID_LOG', sent: 0 };
    }
    if (logs[i].DauVanBanDuyet !== digest) return { status: 'CONTENT_CHANGED_DURING_WEEK', sent: 0 };
    byKey[khoa] = logs[i];
  }
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
  if (io.quota() < pending.length) return thuTuanMerge_({ status: 'QUOTA_DEFERRED', sent: 0 }, summary, counts);
  var sent = 0;
  for (var j=0;j<pending.length;j++) {
    if (io.now()-started > 240000 || io.quota()<1)
      return thuTuanMerge_({ status: 'DEFERRED', sent: sent, remaining: pending.length - j }, summary, counts);
    // Recheck content and opt-out immediately before each send.
    var fresh = thuTuanForKey_(io.content(), key);
    if (fresh.length !== 1 || io.digest(fresh[0]) !== digest || thuTuanApprovalProblem_(fresh[0], digest, io.approvers))
      return thuTuanMerge_({ status: 'CONTENT_CHANGED_DURING_WEEK', sent: sent }, summary, counts);
    var recipient = pending[j].recipient;
    var currentAudit = thuTuanAuditRecipients_(io.recipients(), io.testMode === true);
    if (!currentAudit.ok) return thuTuanMerge_({ status:'INVALID_RECIPIENT_LIST', sent:sent }, currentAudit.counts, summary, counts);
    var current = currentAudit.recipients.filter(function(row) { return row.MaCB === recipient.MaCB; });
    if (current.length !== 1 || current[0].Email !== recipient.Email) continue;
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
      return thuTuanMerge_({ status: 'RECONCILIATION_REQUIRED', sent: sent, unknown: unknown+1 }, summary, counts);
    }
  }
  return thuTuanMerge_({ status: unknown ? 'RECONCILIATION_REQUIRED' : 'COMPLETE', sent: sent }, summary, counts);
}

function thuTuanExecute_(dryRun) {
  var cfg = thuTuanConfig_();
  if (!dryRun && !cfg.enabled) return { status:'DISABLED', sent:0 };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { status:'BUSY', sent:0 };
  try {
    var result = thuTuanRun_(thuTuanAdapter_(cfg),thuTuanWeekKey_(new Date()),dryRun);
    result.enabled = cfg.enabled;
    Logger.log(JSON.stringify(result)); // Counts/status/codes only, no recipient/content/error details.
    return result;
  } finally { lock.releaseLock(); }
}

/** Không gửi, không ghi: báo kỳ, mã lời dạy, lý do chặn (nếu có) và số người sẽ nhận. */
function xemTruocThuTuan() { return thuTuanExecute_(true); }
/** Chỉ gửi khi THU_TUAN_ENABLED=true và nội dung kỳ này đã được duyệt hợp lệ. */
function guiThuTuan(event) {
  if (event && thuTuanConfig_().testMode) return { status:'TEST_MODE_MANUAL_ONLY', sent:0 };
  return thuTuanExecute_(false);
}

/** Run manually by an authorized reviewer with the actual week key, after source verification. */
function duyetNoiDungThuTuan(ky) {
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
    var row=rows[0];
    THU_TUAN_REQUIRED.forEach(function(k) { if(!thuTuanText_(row[k]))throw new Error('INCOMPLETE_CONTENT'); });
    if (!thuTuanNotebookOk_(row.NotebookLM_URL)) throw new Error('INVALID_NOTEBOOKLM_URL');
    var approvedAt=new Date(Math.floor(Date.now()/1000)*1000);
    var approved=Object.assign({},row,{TrangThai:'DaDuyet',NguoiDuyet:actor,NgayDuyet:approvedAt});
    var digest=thuTuanDigest_(approved, cfg.secret);
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

/** Người duyệt: sửa ngày trong dấu nháy thành thứ Hai của kỳ đã đối chiếu nguồn, lưu, rồi chạy hàm này. */
function duyetKyThuTuan() { return duyetNoiDungThuTuan('YYYY-MM-DD'); }

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
