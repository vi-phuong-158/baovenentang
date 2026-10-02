#!/usr/bin/env node
'use strict';
// Local-only validation/export of editorial drafts. Never generates an approval or calls Google/AI.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { toCsv, isInside } = require('./corpus-to-sheet.cjs');
const ROOT = path.resolve(__dirname, '../../..');

function runtime() {
  const ctx = vm.createContext({ Intl });
  for (const file of ['Code.gs','ZaloTransport.gs']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
  return ctx;
}

function parseCsv(input) {
  const text = String(input).replace(/^\uFEFF/,''), rows = [];
  let row = [], cell = '', quoted = false;
  for (let i=0;i<text.length;i++) {
    const ch=text[i];
    if (quoted) {
      if (ch==='"' && text[i+1]==='"') { cell+='"';i++; }
      else if (ch==='"') quoted=false;
      else cell+=ch;
    } else if (ch==='"') {
      if (cell) throw Error('INVALID_CSV');
      quoted=true;
    } else if (ch===',') { row.push(cell);cell=''; }
    else if (ch==='\r' || ch==='\n') {
      if (ch==='\r' && text[i+1]==='\n') i++;
      row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';
    } else cell+=ch;
  }
  if (quoted) throw Error('INVALID_CSV');
  if (cell || row.length) { row.push(cell);rows.push(row); }
  if (!rows.length || new Set(rows[0]).size!==rows[0].length) throw Error('INVALID_CSV_HEADERS');
  const headers=rows.shift();
  return {headers,rows:rows.map(values=>{
    if(values.length!==headers.length)throw Error('INVALID_CSV_WIDTH');
    return Object.fromEntries(headers.map((key,i)=>[key,values[i]]));
  })};
}

function auditDrafts(drafts,ctx=runtime()) {
  if(!Array.isArray(drafts)||!drafts.length)throw Error('DRAFTS_REQUIRED');
  const seen=new Set();
  return drafts.map(draft=>{
    if(!/^LD-\d{3}$/.test(draft.MaLoiDay)||seen.has(draft.MaLoiDay))throw Error('INVALID_OR_DUPLICATE_CODE');
    seen.add(draft.MaLoiDay);
    const content={...draft,Ky:draft.Ky||'2026-10-12',DauVanBanDuyet:'v3:'};
    for(const key of ctx.THU_TUAN_REQUIRED.concat(ctx.THU_TUAN_ZALO_FIELDS_)) {
      if(key!=='PhienBan' && !String(content[key]??'').trim())throw Error('INCOMPLETE_CONTENT:'+draft.MaLoiDay+':'+key);
    }
    if(!ctx.thuTuanNotebookOk_(content.NotebookLM_URL))throw Error('INVALID_NOTEBOOKLM_URL');
    const text=ctx.thuTuanZaloOneMessage_(content);
    return {maLoiDay:draft.MaLoiDay,utf16Length:text.length,partCount:1,
      withinEditorialTarget:text.length>=1200&&text.length<=1500,
      sourceReviewRequired:draft.sourceReviewRequired===true};
  });
}

function scheduleRows(schedule,drafts,from,ctx=runtime()) {
  const current=Array.from(ctx.THU_TUAN_HEADERS.LoiDay_NoiDung),legacy=current.slice(0,17);
  if(![current.length,legacy.length].includes(schedule.headers.length) ||
    schedule.headers.some((key,i)=>key!==current[i]))throw Error('INVALID_SCHEDULE_HEADERS');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!Number.isFinite(Date.parse(from))||new Date(from+'T00:00:00Z').toISOString().slice(0,10)!==from)throw Error('INVALID_FROM_DATE');
  const byCode=new Map(drafts.map(d=>[d.MaLoiDay,d])),seen=new Set();
  return schedule.rows.filter(row=>row.Ky>=from).map(row=>{
    const date=new Date(row.Ky+'T00:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(row.Ky)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==row.Ky||date.getUTCDay()!==1||seen.has(row.Ky))throw Error('INVALID_OR_DUPLICATE_WEEK');
    seen.add(row.Ky);
    const d=byCode.get(row.MaLoiDay);
    if(!d)throw Error('MISSING_EDITORIAL_DRAFT:'+row.MaLoiDay);
    if(d.sourceReviewRequired)throw Error('NEEDS_SOURCE_REVIEW:'+row.MaLoiDay);
    // Preserve full original schedule/email fields, quote, source and week; only add editorial drafts.
    const out={...row,TrangThai:'Nhap',NguoiDuyet:'',NgayDuyet:'',DauVanBanDuyet:'',PhienBan:'zalo-v3-draft-20261002'};
    for(const key of ctx.THU_TUAN_ZALO_FIELDS_)out[key]=d[key];
    ctx.thuTuanZaloOneMessage_({...out,DauVanBanDuyet:'v3:'});
    return out;
  });
}

function privateTarget(filename) {
  const target=path.resolve(filename);
  // Also protect the primary checkout when this tool is running in an ignored worktree.
  for(let parent=ROOT;;parent=path.dirname(parent)) {
    if(fs.existsSync(path.join(parent,'.git'))&&isInside(target,parent))throw Error('OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
    if(path.dirname(parent)===parent)break;
  }
  return target;
}

function writePrivate(filename,content) { fs.writeFileSync(privateTarget(filename),content,'utf8'); }

function main(argv) {
  const args={};
  if(argv.length%2)throw Error('INVALID_ARGUMENTS');
  for(let i=0;i<argv.length;i+=2)args[argv[i].replace(/^--/,'')]=argv[i+1];
  if(!args.input||!args.report)throw Error('USE_INPUT_AND_REPORT');
  if(args['schedule-preview']&&!args.schedule)throw Error('SCHEDULE_PREVIEW_REQUIRES_SCHEDULE');
  if(args.schedule&&(!args.from||!args.out))throw Error('SCHEDULE_REQUIRES_FROM_AND_OUT');
  const outputs=[args.report,args.preview,args.out,args['schedule-preview']].filter(Boolean).map(privateTarget);
  if(new Set(outputs).size!==outputs.length||outputs.includes(path.resolve(args.input))||args.schedule&&outputs.includes(path.resolve(args.schedule)))throw Error('OUTPUT_COLLISION');
  const ctx=runtime(),drafts=JSON.parse(fs.readFileSync(args.input,'utf8').replace(/^\uFEFF/,''));
  const report={drafts:auditDrafts(drafts,ctx),schedule:[]};
  let scheduled;
  if(args.schedule) {
    if(!args.from||!args.out)throw Error('SCHEDULE_REQUIRES_FROM_AND_OUT');
    scheduled=scheduleRows(parseCsv(fs.readFileSync(args.schedule,'utf8')),drafts,args.from,ctx);
    report.schedule=scheduled.map(row=>({ky:row.Ky,maLoiDay:row.MaLoiDay,utf16Length:ctx.thuTuanZaloOneMessage_({...row,DauVanBanDuyet:'v3:'}).length,partCount:1,status:'Nhap'}));
  }
  if(scheduled)writePrivate(args.out,toCsv(Array.from(ctx.THU_TUAN_HEADERS.LoiDay_NoiDung),scheduled.map(row=>ctx.THU_TUAN_HEADERS.LoiDay_NoiDung.map(key=>row[key]??''))));
  if(args.preview)writePrivate(args.preview,'# Bản nháp Zalo — 100 bài\n\nNgày 12/10/2026 dưới đây chỉ dùng để minh họa và đo độ dài, không phải lịch gửi. Mọi bài chờ người duyệt.\n\n'+drafts.map(d=>{
    const item=report.drafts.find(r=>r.maLoiDay===d.MaLoiDay);
    return '## '+d.MaLoiDay+' — '+item.utf16Length+' ký tự — '+(item.sourceReviewRequired?'CHỜ KIỂM TRA NGUỒN':'BẢN NHÁP CHỜ DUYỆT')+'\n\n'+ctx.thuTuanRenderZaloText_({...d,Ky:'2026-10-12',DauVanBanDuyet:'v3:'});
  }).join('\n\n---\n\n'));
  if(args['schedule-preview']) {
    if(!scheduled)throw Error('SCHEDULE_PREVIEW_REQUIRES_SCHEDULE');
    writePrivate(args['schedule-preview'],'# Bản nháp Zalo theo lịch — chưa duyệt\n\n'+scheduled.map(row=>
      '## '+row.Ky+' — '+row.MaLoiDay+' — '+ctx.thuTuanZaloOneMessage_({...row,DauVanBanDuyet:'v3:'}).length+' ký tự\n\n'+
      ctx.thuTuanRenderZaloText_({...row,DauVanBanDuyet:'v3:'})).join('\n\n---\n\n'));
  }
  writePrivate(args.report,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({drafts:report.drafts.length,sourceReviewRequired:report.drafts.filter(d=>d.sourceReviewRequired).length,schedule:report.schedule.length,max:Math.max(...report.drafts.map(d=>d.utf16Length)),status:'DRAFT_ONLY'}));
}

module.exports={runtime,parseCsv,auditDrafts,scheduleRows,main};
if(require.main===module){try{main(process.argv.slice(2));}catch(error){console.error(error.message);process.exitCode=1;}}
