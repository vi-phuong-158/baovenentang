#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REQUIRED = ['Ky', 'MaLoiDay', 'ChuDe', 'NoiDungNguyenVan', 'NguonTrich',
  'BoiCanhZalo', 'YNgiaVanDungZalo', 'HanhDongTuanNayZalo'];

function prepareRows(input) {
  if (!Array.isArray(input) || !input.length || input.length > 366) throw Error('INVALID_ROW_COUNT');
  const weeks = new Set();
  return input.map((source, i) => {
    if (!source || typeof source !== 'object') throw Error('INVALID_ROW:' + i);
    const row = {};
    for (const key of REQUIRED) {
      const value = source[key];
      if (typeof value !== 'string' || !value.trim() || value !== value.trim()) throw Error('INVALID_FIELD:' + i + ':' + key);
      row[key] = value;
    }
    const date = new Date(row.Ky + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.Ky) || !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== row.Ky || date.getUTCDay() !== 1 || weeks.has(row.Ky)) throw Error('INVALID_WEEK:' + i);
    weeks.add(row.Ky);
    if (!/^LD-\d{3,6}$/.test(row.MaLoiDay)) throw Error('INVALID_CODE:' + i);
    // Fail closed: the source must be explicitly reviewed and carry volume/page like the corpus audit requires.
    if (source.sourceReviewRequired !== false || !/Tập\s+\d+/.test(row.NguonTrich) || !/tr\.\s*\d+/.test(row.NguonTrich)) throw Error('SOURCE_REVIEW_REQUIRED:' + i);
    if (source.NotebookLM_URL !== undefined && source.NotebookLM_URL !== '') throw Error('NOTEBOOK_LINK_UNSUPPORTED:' + i);
    const [y, m, d] = row.Ky.split('-');
    row.caption = [
      'THƯ TUẦN – LỜI BÁC DẠY\nTuần từ ' + d + '/' + m + '/' + y + ' · ' + row.ChuDe,
      'LỜI BÁC DẠY\n' + row.NoiDungNguyenVan + '\nNguồn: ' + row.NguonTrich,
      'BỐI CẢNH\n' + row.BoiCanhZalo,
      'Ý NGHĨA VÀ VẬN DỤNG\n' + row.YNgiaVanDungZalo,
      'HÀNH ĐỘNG TUẦN NÀY\n' + row.HanhDongTuanNayZalo
    ].join('\n\n');
    if (row.caption.length > 1800) throw Error('CAPTION_TOO_LONG:' + i);
    row.status = 'DRAFT_NOT_APPROVED';
    return row;
  }).sort((a, b) => a.Ky.localeCompare(b.Ky));
}

function buildHtml(input, portraitBytes) {
  const rows = prepareRows(input);
  if (!Buffer.isBuffer(portraitBytes) || !portraitBytes.length || portraitBytes.length > 10 * 1024 * 1024) throw Error('INVALID_PORTRAIT_SIZE');
  const mime = portraitBytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' :
    portraitBytes[0] === 255 && portraitBytes[1] === 216 && portraitBytes[2] === 255 ? 'jpeg' : null;
  if (!mime) throw Error('PORTRAIT_MUST_BE_PNG_OR_JPEG');
  const data = {
    rows, longest: rows.reduce((a, b) => a.NoiDungNguyenVan.length >= b.NoiDungNguyenVan.length ? a : b),
    portrait: 'data:image/' + mime + ';base64,' + portraitBytes.toString('base64'),
    portraitSha256: crypto.createHash('sha256').update(portraitBytes).digest('hex')
  };
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  if (template.split('__CARD_DATA__').length !== 2) throw Error('INVALID_TEMPLATE');
  return template.replace('__CARD_DATA__', () => JSON.stringify(data).replace(/</g, '\\u003c'));
}

function assertOutputPath(output) {
  const parent = fs.realpathSync(path.dirname(path.resolve(output)));
  for (let cursor = parent;; cursor = path.dirname(cursor)) {
    if (fs.existsSync(path.join(cursor, '.git'))) throw Error('OUTPUT_INSIDE_GIT_REPOSITORY');
    if (path.dirname(cursor) === cursor) break;
  }
  const resolved = path.join(parent, path.basename(output));
  if (path.extname(resolved).toLowerCase() !== '.html') throw Error('OUTPUT_MUST_BE_HTML');
  return resolved;
}

function main(args) {
  const options = {};
  if (args.length !== 6) throw Error('USAGE: --input rows.json --portrait portrait.jpg --out studio.html (outside Git)');
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (!['--input', '--portrait', '--out'].includes(key) || options[key] || !args[i + 1]) throw Error('INVALID_ARGUMENTS');
    options[key] = args[i + 1];
  }
  const output = assertOutputPath(options['--out']);
  // Windows PowerShell 5.1 writes UTF-8 with a BOM by default.
  const input = fs.readFileSync(options['--input'], 'utf8').replace(/^﻿/, '');
  const html = buildHtml(JSON.parse(input), fs.readFileSync(options['--portrait']));
  fs.writeFileSync(output, html, { encoding: 'utf8', flag: 'wx' });
  console.log('Created draft studio; open locally in Chrome/Edge. Export does not approve or send.');
}

module.exports = { prepareRows, buildHtml, assertOutputPath, main };
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error instanceof SyntaxError ? 'INVALID_INPUT_JSON' : error.code || error.message); process.exitCode = 1; }
}
