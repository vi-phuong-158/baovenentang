'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { prepareRows, buildHtml, assertOutputPath, main } = require('../services/thu-tuan/tools/card-studio/build.cjs');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==', 'base64');
const fixture = () => ({ Ky: '2026-10-12', MaLoiDay: 'LD-999', ChuDe: 'Chủ đề thử',
  NoiDungNguyenVan: 'Đây là câu thử bố cục, không phải lời trích thực tế.', NguonTrich: 'Nguồn giả lập để kiểm thử.',
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
  for (const sourceReviewRequired of [true, 'false', null]) assert.throws(() => prepareRows([{ ...fixture(), sourceReviewRequired }]), /SOURCE_REVIEW_REQUIRED/);
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

function renderer() {
  const template = fs.readFileSync(path.join(__dirname, '../services/thu-tuan/tools/card-studio/template.html'), 'utf8');
  const source = template.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const ctx = { font: '', measureText(text) {
    const size = Number(/(\d+)px/.exec(this.font)[1]), width = text.length * size * .46;
    return { width, actualBoundingBoxLeft: 1, actualBoundingBoxRight: width - 1,
      actualBoundingBoxAscent: size * .7, actualBoundingBoxDescent: size * .2 };
  }, fillText() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, save() {}, restore() {},
    clip() {}, arc() {}, ellipse() {}, closePath() {}, drawImage() {} };
  const elements = new Map();
  const document = { getElementById(id) {
    if (!elements.has(id)) elements.set(id, { textContent: id === 'data' ? JSON.stringify({ rows: [prepareRows([fixture()])[0]], portrait: 'data:image/png;base64,', longest: fixture() }) : '' });
    return elements.get(id);
  }, querySelectorAll: () => [], createElement: () => ({ getContext: () => ctx }) };
  const sandbox = vm.createContext({ document, TextEncoder, Image: class { constructor() { this.naturalWidth = 600; this.naturalHeight = 800; } } });
  new vm.Script(source).runInContext(sandbox);
  return sandbox;
}

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
