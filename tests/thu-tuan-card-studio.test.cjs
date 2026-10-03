'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { prepareRows, buildHtml, assertOutputPath, main } = require('../services/thu-tuan/tools/card-studio/build.cjs');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==', 'base64');
const fixture = () => ({ Ky: '2026-10-12', MaLoiDay: 'LD-999', ChuDe: 'Chủ đề thử',
  NoiDungNguyenVan: 'Đây là câu thử bố cục, không phải lời trích thực tế.', NguonTrich: 'Nguồn giả lập, Tập 1, tr. 1.', sourceReviewRequired: false,
  BoiCanhZalo: 'Bối cảnh thử.', YNgiaVanDungZalo: 'Ý nghĩa thử.', HanhDongTuanNayZalo: 'Hành động thử.' });

test('Caption preserves exact quote/source/editorial text; exports remain draft and fields are allowlisted', () => {
  const source = { ...fixture(), token: 'SYNTHETIC_SECRET', TrangThai: 'DaDuyet', NguoiDuyet: 'private', caption: 'injected' };
  source.NoiDungNguyenVan += '\nDòng thứ hai có tiếng Việt.';
  const row = prepareRows([source])[0];
  for (const key of ['NoiDungNguyenVan','NguonTrich','BoiCanhZalo','YNgiaVanDungZalo','HanhDongTuanNayZalo']) assert.ok(row.caption.includes(source[key]));
  assert.equal(row.status, 'DRAFT_NOT_APPROVED');
  assert.ok(!JSON.stringify(row).includes('SYNTHETIC_SECRET'));
  assert.ok(!JSON.stringify(row).includes('DaDuyet'));
  assert.equal(source.caption, 'injected');
});

test('Rows are sorted; invalid dates, non-Mondays and duplicate weeks are blocked', () => {
  assert.equal(prepareRows([{ ...fixture(), Ky: '2026-10-19' }, fixture()])[0].Ky, '2026-10-12');
  for (const Ky of ['2026-02-30', '2026-10-13', '12/10/2026']) assert.throws(() => prepareRows([{ ...fixture(), Ky }]), /INVALID_WEEK/);
  assert.throws(() => prepareRows([fixture(), fixture()]), /INVALID_WEEK/);
});

test('Missing fields, unsafe filenames, source-review flags and unsupported notebook links fail closed', () => {
  assert.throws(() => prepareRows([{ ...fixture(), ChuDe: ' ' }]), /INVALID_FIELD/);
  assert.throws(() => prepareRows([{ ...fixture(), MaLoiDay: '../secret' }]), /INVALID_CODE/);
  for (const sourceReviewRequired of [true, 'false', null, undefined]) assert.throws(() => prepareRows([{ ...fixture(), sourceReviewRequired }]), /SOURCE_REVIEW_REQUIRED/);
  const missing = fixture(); delete missing.sourceReviewRequired;
  assert.throws(() => prepareRows([missing]), /SOURCE_REVIEW_REQUIRED/);
  for (const NguonTrich of ['Nguồn thiếu tập, tr. 5.', 'Nguồn thiếu trang, Tập 5.']) assert.throws(() => prepareRows([{ ...fixture(), NguonTrich }]), /SOURCE_REVIEW_REQUIRED/);
  assert.throws(() => prepareRows([{ ...fixture(), NotebookLM_URL: 'https://example.org' }]), /NOTEBOOK_LINK_UNSUPPORTED/);
});

test('Caption cap counts UTF-16 including emoji at the exact 1800 boundary', () => {
  const source = fixture(), used = prepareRows([source])[0].caption.length;
  source.BoiCanhZalo += '😀' + 'x'.repeat(1800 - used - 2);
  assert.equal(prepareRows([source])[0].caption.length, 1800);
  source.BoiCanhZalo += 'x';
  assert.throws(() => prepareRows([source]), /CAPTION_TOO_LONG/);
});

test('HTML escapes closing script tags and literal replacement syntax without serializing extra fields', () => {
  const source = { ...fixture(), BoiCanhZalo: '</script><script>alert(1)</script> $& $$', token: 'SYNTHETIC_SECRET' };
  const html = buildHtml([source], png);
  const data = JSON.parse(html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data.rows[0].BoiCanhZalo, source.BoiCanhZalo);
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!html.includes('SYNTHETIC_SECRET'));
  assert.equal(data.portraitSha256.length, 64);
  assert.throws(() => buildHtml([source], Buffer.from('not an image')), /PORTRAIT_MUST_BE/);
});

test('CLI keeps generated private HTML outside Git, does not overwrite output or inputs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'card-studio-test-'));
  try {
    const input = path.join(dir, 'rows.json'), portrait = path.join(dir, 'portrait.png'), out = path.join(dir, 'studio.html');
    fs.writeFileSync(input, JSON.stringify([fixture()])); fs.writeFileSync(portrait, png);
    const args = ['--input', input, '--portrait', portrait, '--out', out];
    main(args); const original = fs.readFileSync(out, 'utf8');
    assert.throws(() => main(args), /EEXIST/); assert.equal(fs.readFileSync(out, 'utf8'), original);
    assert.throws(() => assertOutputPath(input), /OUTPUT_MUST_BE_HTML/);
    assert.throws(() => assertOutputPath(path.join(__dirname, 'studio.html')), /OUTPUT_INSIDE_GIT_REPOSITORY/);
    fs.mkdirSync(path.join(dir, '.git')); fs.mkdirSync(path.join(dir, 'sub'));
    assert.throws(() => assertOutputPath(path.join(dir, 'sub', 'studio.html')), /OUTPUT_INSIDE_GIT_REPOSITORY/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('CLI resolves a symlinked/junction output folder into Git and accepts BOM-prefixed JSON', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'card-studio-repo-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'card-studio-out-'));
  try {
    fs.mkdirSync(path.join(repo, '.git')); fs.mkdirSync(path.join(repo, 'sub'));
    const link = path.join(outside, 'link');
    fs.symlinkSync(path.join(repo, 'sub'), link, 'junction');
    assert.throws(() => assertOutputPath(path.join(link, 'studio.html')), /OUTPUT_INSIDE_GIT_REPOSITORY/);
    const input = path.join(outside, 'rows.json'), portrait = path.join(outside, 'portrait.png'), out = path.join(outside, 'studio.html');
    fs.writeFileSync(input, '﻿' + JSON.stringify([fixture()])); fs.writeFileSync(portrait, png);
    main(['--input', input, '--portrait', portrait, '--out', out]);
    assert.ok(fs.readFileSync(out, 'utf8').includes('LD-999'));
    assert.equal(fs.readdirSync(path.join(repo, 'sub')).length, 0);
  } finally { fs.rmSync(repo, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); }
});

function renderer({ rows = [fixture()], portraitSize = [600, 800] } = {}) {
  const template = fs.readFileSync(path.join(__dirname, '../services/thu-tuan/tools/card-studio/template.html'), 'utf8');
  const source = template.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const draws = [];
  const ctx = { font: '', measureText(text) {
    const size = Number(/(\d+)px/.exec(this.font)[1]), width = text.length * size * .46;
    return { width, actualBoundingBoxLeft: 1, actualBoundingBoxRight: width - 1,
      actualBoundingBoxAscent: size * .7, actualBoundingBoxDescent: size * .2 };
  }, fillText() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, save() {}, restore() {},
    clip() {}, arc() {}, ellipse() {}, closePath() {}, drawImage(img, x, y, w, h) { draws.push({ x, y, w, h }); } };
  const prepared = prepareRows(rows);
  const longest = prepared.reduce((a, b) => a.NoiDungNguyenVan.length >= b.NoiDungNguyenVan.length ? a : b);
  const data = JSON.stringify({ rows: prepared, portrait: 'data:image/png;base64,', longest, portraitSha256: '0'.repeat(64) });
  const elements = new Map(), anchors = [], blobs = new Map(), revoked = [];
  const element = () => ({ textContent: '', style: {}, append() {}, after(a) { anchors.unshift(a); }, remove() { this.removed = true; } });
  const document = { getElementById(id) {
    if (!elements.has(id)) elements.set(id, { ...element(), textContent: id === 'data' ? data : '' });
    return elements.get(id);
  }, querySelectorAll: () => [], createElement: tag => tag === 'canvas'
    ? { getContext: () => ctx, toBlob(cb) { cb(new Blob([png])); } }
    : element() };
  const URL = { createObjectURL(blob) { const url = 'blob:' + blobs.size; blobs.set(url, blob); return url; }, revokeObjectURL(url) { revoked.push(url); } };
  const sandbox = vm.createContext({ document, TextEncoder, Blob, URL, crypto: globalThis.crypto, setTimeout,
    Image: class { constructor() { [this.naturalWidth, this.naturalHeight] = portraitSize; } } });
  new vm.Script(source).runInContext(sandbox);
  return Object.assign(sandbox, { draws, anchors, blobs, revoked });
}

// Minimal independent reader for the stored (uncompressed) ZIP the page builds.
function readZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.equal(eocd + 22, buf.length);
  const entries = [];
  for (let p = buf.readUInt32LE(eocd + 16), i = 0; i < buf.readUInt16LE(eocd + 10); i++) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50);
    const nameLength = buf.readUInt16LE(p + 28), offset = buf.readUInt32LE(p + 42), size = buf.readUInt32LE(p + 20);
    const name = buf.subarray(p + 46, p + 46 + nameLength).toString('utf8');
    assert.equal(buf.readUInt32LE(offset), 0x04034b50);
    const bytes = buf.subarray(offset + 30 + buf.readUInt16LE(offset + 26), offset + 30 + buf.readUInt16LE(offset + 26) + size);
    assert.equal(zlib.crc32(bytes), buf.readUInt32LE(p + 16), name);
    assert.equal(buf.readUInt16LE(p + 14), 0x21); assert.equal(buf.readUInt16LE(offset + 12), 0x21);
    entries.push({ name, bytes });
    p += 46 + nameLength;
  }
  return entries;
}
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

test('Both layouts center theme ink on both axes and reject removed layout A', () => {
  const sandbox = renderer(), row = prepareRows([fixture()])[0];
  for (const layout of ['B', 'C']) {
    const report = sandbox.card(row, layout).report;
    const ink = report.blocks.theme.inkBounds;
    assert.ok(Math.abs(ink.x + ink.w / 2 - 800) < .001);
    assert.ok(Math.abs(ink.y + ink.h / 2 - 468) < .001);
    assert.equal(report.blocks.model.lines.length, 1); assert.equal(report.blocks.motto.lines.length, 1);
    assert.equal(report.blocks.motto.original, report.blocks.motto.original.toLocaleUpperCase('vi'));
  }
  assert.throws(() => sandbox.card(row, 'A'), /Mẫu không hợp lệ/);
});

test('Long quote fallback preserves words, fits bounds and avoids a one-word last line', () => {
  const sandbox = renderer();
  const row = prepareRows([{ ...fixture(), NoiDungNguyenVan: 'Nội dung giả lập có dấu tiếng Việt để kiểm tra bố cục. '.repeat(5).trim() }])[0];
  const result = sandbox.choose(row, 0).report;
  assert.equal(result.template, 'C');
  const block = result.blocks.quote;
  assert.equal(block.lines.join(' ').replace(/\s+/g, ' '), row.NoiDungNguyenVan.replace(/\s+/g, ' '));
  assert.ok(block.usedHeight <= block.box.h); assert.ok(block.maxLineWidth <= block.box.w);
  assert.ok(block.lines.at(-1).split(' ').length > 1);
});

test('Content that cannot fit is rejected without truncation; short C quote stays one line', () => {
  const sandbox = renderer();
  const row = prepareRows([{ ...fixture(), NoiDungNguyenVan: 'Câu thử ngắn để xem mẫu.' }])[0];
  assert.equal(sandbox.card(row, 'C').report.blocks.quote.lines.length, 1);
  row.ChuDe = 'W'.repeat(1000);
  assert.throws(() => sandbox.choose(row, 0), /theme/);
});

test('Portrait always covers its arch/circle clip box for tall, square and landscape images', () => {
  const row = prepareRows([fixture()])[0];
  for (const portraitSize of [[600, 800], [800, 800], [1000, 700], [400, 2000]]) {
    for (const layout of ['B', 'C']) {
      const sandbox = renderer({ portraitSize });
      sandbox.card(row, layout);
      const box = layout === 'B' ? { y: 545, h: 590 } : { y: 551, h: 220 };
      const draw = sandbox.draws.at(-1);
      assert.ok(draw.y <= box.y + 1e-9 && draw.y + draw.h >= box.y + box.h - 1e-9, `${layout} ${portraitSize}`);
    }
  }
});

test('Layout preference follows the week, not the position of the row in the batch', () => {
  const weeks = ['2026-10-12', '2026-10-19', '2026-10-26'];
  const rows = weeks.map((Ky, i) => ({ ...fixture(), Ky, MaLoiDay: 'LD-99' + i }));
  const all = renderer({ rows }), withoutFirst = renderer({ rows: rows.slice(1) });
  const layouts = sandbox => JSON.parse(sandbox.document.getElementById('data').textContent)
    .rows.map(row => [row.Ky, sandbox.choose(row).report.template]);
  assert.deepEqual(layouts(all).map(x => x[1]), ['B', 'C', 'B']);
  assert.deepEqual(layouts(withoutFirst), layouts(all).slice(1));
});

test('Batch ZIP is complete, CRC-valid and hashes the exact caption bytes it ships', async () => {
  const rows = ['2026-10-12', '2026-10-19'].map((Ky, i) => ({ ...fixture(), Ky, MaLoiDay: 'LD-90' + i, BoiCanhZalo: '</script> $& 😀' }));
  const sandbox = renderer({ rows });
  await sandbox.exportBatch('batch');
  const entries = readZip(Buffer.from(await sandbox.blobs.get(sandbox.anchors[0].href).arrayBuffer()));
  assert.equal(entries.length, rows.length * 3 + 1);
  assert.equal(new Set(entries.map(e => e.name)).size, entries.length);
  const top = JSON.parse(entries.find(e => e.name === 'manifest.json').bytes);
  assert.equal(top.count, 2); assert.equal(top.status, 'DRAFT_NOT_APPROVED');
  for (const card of top.cards) {
    const base = card.image.replace(/\.png$/, '');
    const caption = entries.find(e => e.name === base + '-caption.txt').bytes;
    assert.equal(card.captionFileSha256, sha256(caption));
    assert.equal(caption.toString('utf8'), prepareRows(rows).find(r => r.Ky === card.week).caption + '\n');
    assert.equal(card.imageSha256, sha256(entries.find(e => e.name === card.image).bytes));
  }
});

test('Samples export never duplicates a card and a re-export replaces its link and revokes the old URL', async () => {
  const sandbox = renderer();
  await sandbox.exportBatch('samples');
  const first = sandbox.anchors[0];
  const entries = readZip(Buffer.from(await sandbox.blobs.get(first.href).arrayBuffer()));
  assert.equal(new Set(entries.map(e => e.name)).size, entries.length);
  assert.equal(JSON.parse(entries.find(e => e.name === 'manifest.json').bytes).count, 2);
  await sandbox.exportBatch('samples');
  assert.ok(first.removed); assert.deepEqual(sandbox.revoked, [first.href]);
});
