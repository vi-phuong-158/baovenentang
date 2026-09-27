#!/usr/bin/env node
/*
 * Chuyển bộ Markdown "52 Thư tuần" sang CSV nháp cho sheet LoiDay_NoiDung.
 *
 * - Chỉ đọc/ghi file cục bộ; không gọi mạng, không gọi AI, không sửa nội dung.
 * - Mọi dòng xuất ra ở trạng thái Nhap; KHÔNG điền người duyệt, ngày duyệt, dấu duyệt.
 * - Không ghi file xuất vào bên trong repository (repo công khai).
 *
 * Dùng: node services/thu-tuan/tools/corpus-to-sheet.cjs --input <file.md> --start <YYYY-MM-DD thứ Hai>
 *        --out <file.csv ngoài repo> [--expect 52] [--phien-ban <giá trị>]
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const LABELS = {
  'Nguồn': 'NguonTrich',
  'Bối cảnh': 'BoiCanh',
  'Phân tích': 'PhanTich',
  'Liên hệ CAND': 'LienHeCAND',
  'Liên hệ An ninh đối ngoại': 'LienHeAnNinhDoiNgoai',
  'Liên hệ An ninh đối ngoại — phản gián': 'LienHeAnNinhDoiNgoai',
  'Hành động tuần này': 'HanhDongTuanNay'
};
const REQUIRED = ['ChuDe', 'MaLoiDay', 'NoiDungNguyenVan', 'NguonTrich', 'BoiCanh', 'PhanTich',
  'LienHeCAND', 'LienHeAnNinhDoiNgoai', 'HanhDongTuanNay'];

function loadHeaders() {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), ctx);
  return Array.from(ctx.THU_TUAN_HEADERS.LoiDay_NoiDung);
}

function parseCorpus(markdown) {
  const weeks = [], errors = [];
  const text = String(markdown).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const blocks = text.split(/^## /m).slice(1);
  for (const block of blocks) {
    const lines = block.split('\n');
    const head = /^Tuần\s+(\d{1,3})\s*[—–-]\s*(.+?)\s*$/.exec(lines[0]);
    if (!head) { errors.push({ code: 'UNRECOGNIZED_HEADING', heading: lines[0].slice(0, 80) }); continue; }
    const week = { tuan: Number(head[1]), ChuDe: head[2].trim() };
    const quote = [];
    for (const raw of lines.slice(1)) {
      const line = raw.trimEnd();
      const code = /^\*\*(LD-\d+)\b[^*]*\*\*$/.exec(line.trim());
      if (code) { if (week.MaLoiDay) errors.push({ code: 'MULTIPLE_CODES', tuan: week.tuan }); week.MaLoiDay = code[1]; continue; }
      if (/^>\s?/.test(line)) { quote.push(line.replace(/^>\s?/, '')); continue; }
      const field = /^\*\*(.+?):\*\*\s*(.*)$/.exec(line.trim());
      if (field) {
        const key = LABELS[field[1].trim()];
        if (!key) { errors.push({ code: 'UNKNOWN_LABEL', tuan: week.tuan, label: field[1].slice(0, 60) }); continue; }
        if (week[key]) errors.push({ code: 'DUPLICATE_FIELD', tuan: week.tuan, field: key });
        week[key] = field[2].trim();
      }
    }
    week.NoiDungNguyenVan = quote.join('\n').trim();
    weeks.push(week);
  }
  return { weeks, errors };
}

function auditWeeks(weeks, expect) {
  const issues = [], seenWeek = new Map(), seenCode = new Map();
  for (const w of weeks) {
    for (const f of REQUIRED) if (!w[f]) issues.push({ code: 'MISSING_FIELD', tuan: w.tuan, field: f });
    if (seenWeek.has(w.tuan)) issues.push({ code: 'DUPLICATE_WEEK', tuan: w.tuan });
    seenWeek.set(w.tuan, true);
    if (w.MaLoiDay) {
      if (seenCode.has(w.MaLoiDay)) issues.push({ code: 'DUPLICATE_CODE', tuan: w.tuan, other: seenCode.get(w.MaLoiDay), maLoiDay: w.MaLoiDay });
      else seenCode.set(w.MaLoiDay, w.tuan);
    }
    if (w.NguonTrich && !/Tập\s+\d+/.test(w.NguonTrich)) issues.push({ code: 'SOURCE_WITHOUT_VOLUME', tuan: w.tuan });
    if (w.NguonTrich && !/tr\.\s*\d+/.test(w.NguonTrich)) issues.push({ code: 'SOURCE_WITHOUT_PAGE', tuan: w.tuan });
  }
  const max = expect || Math.max(0, ...weeks.map(w => w.tuan));
  for (let i = 1; i <= max; i++) if (!seenWeek.has(i)) issues.push({ code: 'MISSING_WEEK', tuan: i });
  if (expect && weeks.length !== expect) issues.push({ code: 'COUNT_MISMATCH', expected: expect, actual: weeks.length });
  return issues;
}

function mondayKeys(start, count) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error('START_MUST_BE_YYYY-MM-DD');
  const base = new Date(start + 'T00:00:00Z');
  if (!Number.isFinite(base.getTime()) || base.toISOString().slice(0, 10) !== start) throw new Error('INVALID_START_DATE');
  if (base.getUTCDay() !== 1) throw new Error('START_MUST_BE_MONDAY');
  return Array.from({ length: count }, (_, i) => new Date(base.getTime() + i * 7 * 86400000).toISOString().slice(0, 10));
}

function buildRows(weeks, start, options = {}) {
  const headers = options.headers || loadHeaders();
  const sorted = weeks.slice().sort((a, b) => a.tuan - b.tuan);
  const keys = mondayKeys(start, Math.max(0, ...sorted.map(w => w.tuan)));
  return sorted.map(w => {
    const row = Object.assign({}, w, {
      Ky: keys[w.tuan - 1], GoiYLienHe: '', TrangThai: 'Nhap', NguoiDuyet: '', NgayDuyet: '',
      PhienBan: options.phienBan || '', DauVanBanDuyet: '', NotebookLM_URL: ''
    });
    return headers.map(h => row[h] == null ? '' : String(row[h]));
  });
}

function csvCell(value) {
  const text = String(value);
  // Chặn công thức khi mở bằng bảng tính (CSV injection); dữ liệu gốc không bắt đầu bằng các ký tự này.
  if (/^[=+\-@]/.test(text)) throw new Error('CELL_STARTS_WITH_FORMULA_CHAR');
  return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function toCsv(headers, rows) {
  return '﻿' + [headers].concat(rows).map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[String(argv[i]).replace(/^--/, '')] = argv[i + 1];
  if (!args.input || !args.start || !args.out) {
    console.error('Thiếu tham số. Dùng: --input <md> --start <YYYY-MM-DD thứ Hai> --out <csv ngoài repo> [--expect 52] [--phien-ban X]');
    return 2;
  }
  const out = path.resolve(args.out);
  if (isInside(out, REPO_ROOT)) { console.error('Từ chối ghi vào trong repository công khai: chọn thư mục khác.'); return 2; }
  const expect = args.expect ? Number(args.expect) : 52;
  const { weeks, errors } = parseCorpus(fs.readFileSync(path.resolve(args.input), 'utf8'));
  const issues = errors.concat(auditWeeks(weeks, expect));
  const summary = { weeks: weeks.length, expected: expect, issues: issues.length, byCode: {} };
  issues.forEach(i => { summary.byCode[i.code] = (summary.byCode[i.code] || 0) + 1; });
  console.log(JSON.stringify(summary));
  if (issues.length) { console.error(JSON.stringify(issues, null, 1)); return 1; }
  const headers = loadHeaders();
  const rows = buildRows(weeks, args.start, { headers, phienBan: args['phien-ban'] });
  fs.writeFileSync(out, toCsv(headers, rows), 'utf8');
  console.log(JSON.stringify({ written: rows.length, firstKy: rows[0][0], lastKy: rows[rows.length - 1][0], status: 'Nhap' }));
  return 0;
}

module.exports = { parseCorpus, auditWeeks, mondayKeys, buildRows, toCsv, loadHeaders, isInside, REQUIRED };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
