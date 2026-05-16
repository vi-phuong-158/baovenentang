import { useState, useEffect } from 'react';
import { Lock, Key, Shield, Search, Edit3, Sparkles, Eraser, Copy, Star, TrendingUp, RefreshCw, Send } from 'lucide-react';
import { runTroLy35, rateTroLy35, getTrends } from '../api.js';

const ACCESS_KEY = 'troly35_access_code';

const MODES = [
  { id: 'rebuttal',      label: 'Phản bác',   Icon: Shield,  contentLabel: 'Nội dung bài viết/bình luận', placeholder: 'Dán nội dung cần phân tích. Nếu có link MXH, hãy dán kèm nội dung vì hệ thống không tự scrape.' },
  { id: 'fact_check',    label: 'Thẩm định',  Icon: Search,  contentLabel: 'Nội dung cần thẩm định', placeholder: 'Dán tin tức, nhận định hoặc đoạn trích cần thẩm định nhanh.' },
  { id: 'article_writer',label: 'Viết bài',   Icon: Edit3,   contentLabel: 'Chủ đề và thông điệp chính', placeholder: 'Nhập chủ đề, thông điệp chính, đối tượng độc giả và yêu cầu độ dài.' },
];

const RESULT_TABS = ['Đầy đủ', 'Comment', 'Tóm tắt', 'Dẫn chứng'];

function escapeHTML(text) {
  const d = document.createElement('div');
  d.textContent = text ?? '';
  return d.innerHTML;
}

function formatText(text) {
  const safe = escapeHTML(text || '').trim();
  if (!safe) return '<div class="empty" style="padding:16px 0">Không có nội dung.</div>';
  return safe.split(/\n{2,}/).map(b => `<p style="margin-bottom:10px;line-height:1.65">${b.replace(/\n/g, '<br>')}</p>`).join('');
}

function buildView(result, mode) {
  if (mode === 'fact_check') return {
    full: [`Mức đánh giá: ${result.muc_danh_gia || 'Chưa rõ'}`, `Độ tin cậy: ${result.do_tin_cay || 0}/100`, '', result.nhan_dinh_chinh || '', '', result.khuyen_nghi_xu_ly || '', result.ghi_chu || '', result.nhan_kiem_duyet || ''].join('\n'),
    short: result.khuyen_nghi_xu_ly || result.nhan_dinh_chinh || '',
    summary: result.diem_can_kiem_chung || [],
  };
  if (mode === 'article_writer') return {
    full: [result.tieu_de || '', '', result.mo_ta_ngan || '', '', result.bai_viet || '', result.ghi_chu || '', result.nhan_kiem_duyet || ''].join('\n'),
    short: result.caption_mxh || '',
    summary: result.dan_y || [],
  };
  return {
    full: [result.phien_ban_day_du || '', result.ghi_chu || '', result.nhan_kiem_duyet || ''].join('\n'),
    short: result.phien_ban_comment || '',
    summary: Array.isArray(result.phien_ban_tom_tat) ? result.phien_ban_tom_tat : [],
  };
}

export default function TroLy35() {
  const [accessCode, setAccessCode] = useState(sessionStorage.getItem(ACCESS_KEY) || '');
  const [accessMsg, setAccessMsg] = useState(sessionStorage.getItem(ACCESS_KEY) ? 'Đã tải mã truy cập trong phiên này.' : '');
  const [accessMsgType, setAccessMsgType] = useState('success');

  const [mode, setMode] = useState('rebuttal');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [runMsg, setRunMsg] = useState('');
  const [runMsgType, setRunMsgType] = useState('neutral');

  const [result, setResult] = useState(null);
  const [resultTab, setResultTab] = useState(0);
  const [requestId, setRequestId] = useState('');

  const [rating, setRating] = useState(0);
  const [ratingNote, setRatingNote] = useState('');

  const [trends, setTrends] = useState(null);
  const [trendWindow, setTrendWindow] = useState(7);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const currentMode = MODES.find(m => m.id === mode);

  useEffect(() => {
    if (accessCode) loadTrends(accessCode, trendWindow);
  }, []);

  const saveAccess = () => {
    const v = accessCode.trim();
    if (!v) { sessionStorage.removeItem(ACCESS_KEY); setAccessMsg('Đã xóa mã.'); setAccessMsgType('neutral'); return; }
    sessionStorage.setItem(ACCESS_KEY, v);
    setAccessMsg('Đã lưu mã truy cập.'); setAccessMsgType('success');
    loadTrends(v, trendWindow);
  };

  const loadTrends = async (code, window) => {
    if (!code) return;
    setTrendsLoading(true);
    try {
      const res = await getTrends({ accessCode: code, windowDays: window });
      if (res.success !== false) setTrends(res.data || res);
    } catch {}
    finally { setTrendsLoading(false); }
  };

  const run = async (e) => {
    e.preventDefault();
    const code = accessCode.trim() || sessionStorage.getItem(ACCESS_KEY) || '';
    if (!code) { setRunMsg('Vui lòng nhập mã truy cập nội bộ.'); setRunMsgType('error'); return; }
    if (content.trim().length < 20) { setRunMsg('Nội dung cần tối thiểu 20 ký tự.'); setRunMsgType('error'); return; }
    if (/^https?:\/\/\S+$/i.test(content.trim())) { setRunMsg('Vui lòng dán nội dung, không chỉ link.'); setRunMsgType('error'); return; }

    setLoading(true);
    setRunMsg('Đang phân tích, tìm dẫn chứng và soạn bản nháp...'); setRunMsgType('neutral');
    setResult(null);

    try {
      const res = await runTroLy35({ accessCode: code, mode, content: content.trim(), sourceUrl: sourceUrl.trim(), topic: topic.trim() });
      if (!res.success) throw new Error(res.error || 'Không xử lý được yêu cầu.');
      setRequestId(res.requestId || '');
      setRating(0);
      setResultTab(0);
      setResult({ result: res.result || {}, analysis: res.analysis || {}, knowledge: res.knowledge || [] });
      setRunMsg('Đã tạo bản nháp. Vui lòng rà soát trước khi sử dụng.'); setRunMsgType('success');
      loadTrends(code, trendWindow);
    } catch (err) {
      setRunMsg(err.message || 'Có lỗi xảy ra.'); setRunMsgType('error');
    } finally {
      setLoading(false);
    }
  };

  const sendRating = async () => {
    const code = accessCode.trim() || sessionStorage.getItem(ACCESS_KEY) || '';
    if (!requestId) { setRunMsg('Chưa có kết quả để đánh giá.'); setRunMsgType('error'); return; }
    if (!rating) { setRunMsg('Vui lòng chọn số sao.'); setRunMsgType('error'); return; }
    try {
      const res = await rateTroLy35({ accessCode: code, requestId, rating, note: ratingNote });
      if (!res.success) throw new Error(res.error);
      setRunMsg('Đã lưu đánh giá.'); setRunMsgType('success');
    } catch (err) {
      setRunMsg(err.message || 'Không lưu được đánh giá.'); setRunMsgType('error');
    }
  };

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); setRunMsg('Đã copy.'); setRunMsgType('success'); }
    catch { setRunMsg('Không copy được.'); setRunMsgType('error'); }
  };

  const view = result ? buildView(result.result, mode) : null;
  const analysis = result?.analysis || {};

  return (
    <div className="page page-fade">
      <div className="page-header">
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <div className="pill" style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontSize: 11 }}>
            <Lock size={11} /> Nội bộ
          </div>
        </div>
        <h1>Trợ lý 35</h1>
        <p>Phân tích, tìm dẫn chứng và soạn bản nháp phản hồi</p>
      </div>

      {/* Access card */}
      <div className="card tinted" style={{ marginBottom: 12 }}>
        <div className="row" style={{ marginBottom: 8 }}>
          <div className="chip red"><Lock size={14} /></div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Truy cập</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input className="field" type="password" value={accessCode}
            onChange={e => setAccessCode(e.target.value)}
            placeholder="Nhập mã truy cập nội bộ"
            style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && saveAccess()} />
          <button className="btn sm" onClick={saveAccess} style={{ flexShrink: 0 }}>
            <Key size={14} /> Lưu
          </button>
        </div>
        {accessMsg && <div className={`msg ${accessMsgType}`}>{accessMsg}</div>}
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: 'var(--surface-2)', padding: 5, borderRadius: 16, border: '1px solid var(--line)' }}>
        {MODES.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setMode(id)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 6px', borderRadius: 12, border: 'none', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
              background: mode === id ? 'var(--surface)' : 'transparent',
              color: mode === id ? 'var(--red)' : 'var(--ink-soft)',
              boxShadow: mode === id ? '0 1px 4px rgba(26,20,16,.08)' : 'none',
            }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={run}>
        <div className="card elevated" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">Chủ đề gợi ý</label>
              <input className="field" value={topic} onChange={e => setTopic(e.target.value)} placeholder="VD: Tự do ngôn luận, Nhân quyền..." />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Nguồn URL</label>
              <input className="field" type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div>
            <label className="field-label">{currentMode?.contentLabel}</label>
            <textarea className="field" rows={8} value={content} onChange={e => setContent(e.target.value)} placeholder={currentMode?.placeholder} style={{ minHeight: 160 }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={loading}>
            {loading ? <><RefreshCw size={15} className="spinner" /> Đang chạy...</> : <><Sparkles size={15} /> Chạy Trợ lý 35</>}
          </button>
          <button type="button" className="btn ghost sm" onClick={() => { setContent(''); setSourceUrl(''); setTopic(''); setRunMsg(''); setResult(null); }}>
            <Eraser size={15} />
          </button>
        </div>

        {runMsg && <div className={`msg ${runMsgType}`}>{runMsg}</div>}
      </form>

      {/* Result card */}
      {result && (
        <div className="card elevated" style={{ marginTop: 16, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
          {/* Analysis strip */}
          {Object.keys(analysis).length > 0 && (
            <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 13 }}>
              <span><strong>Chủ đề:</strong> {analysis.chu_de || 'Chưa rõ'}</span>
              <span><strong>Nguy hiểm:</strong> {analysis.do_nguy_hiem || 0}/5</span>
              <span><strong>Luận điểm:</strong> {Array.isArray(analysis.luan_diem_sai) ? analysis.luan_diem_sai.length : 0}</span>
              <span><strong>Cảnh báo:</strong> {Array.isArray(analysis.canh_bao_an_toan) ? analysis.canh_bao_an_toan.length : 0}</span>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
            {RESULT_TABS.map((t, i) => (
              <button key={t} onClick={() => setResultTab(i)}
                style={{ flex: 1, padding: '11px 4px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', border: 'none', cursor: 'pointer', background: 'transparent',
                  color: resultTab === i ? 'var(--red)' : 'var(--ink-mute)',
                  borderBottom: resultTab === i ? '2px solid var(--red)' : '2px solid transparent',
                  transition: 'color .15s',
                }}>
                {t}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ padding: 14 }}>
            {resultTab === 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button className="btn ghost sm" onClick={() => copyText(view.full)} style={{ padding: '6px 10px' }}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <div className="text-sm" dangerouslySetInnerHTML={{ __html: formatText(view.full) }} />
              </>
            )}
            {resultTab === 1 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button className="btn ghost sm" onClick={() => copyText(view.short)} style={{ padding: '6px 10px' }}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <div className="text-sm" dangerouslySetInnerHTML={{ __html: formatText(view.short) }} />
              </>
            )}
            {resultTab === 2 && (
              <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Array.isArray(view.summary) && view.summary.length > 0
                  ? view.summary.map((s, i) => <li key={i} className="text-sm">{s}</li>)
                  : <div className="empty" style={{ padding: '16px 0' }}>Không có tóm tắt.</div>}
              </ul>
            )}
            {resultTab === 3 && (
              <div>
                {[...(result.result.dan_chung_su_dung || []), ...(result.result.bang_chung_doi_chieu || [])].map((item, i) => (
                  <div key={i} style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--line-soft)' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{item.loai || item.nguon || 'Nguồn'}</div>
                    <div className="text-sm text-soft">{item.noi_dung || ''}</div>
                    {item.nguon && <div className="text-xs text-mute" style={{ marginTop: 4 }}>{item.nguon}</div>}
                  </div>
                ))}
                {result.knowledge.length > 0 && (
                  <>
                    <div className="section-label" style={{ marginTop: 12 }}>Tư liệu RAG</div>
                    {result.knowledge.map((item, i) => (
                      <div key={i} style={{ marginBottom: 8, padding: '10px 12px', background: 'var(--ok-soft)', borderRadius: 12, border: '1px solid rgba(31,138,91,.15)' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ok)', marginBottom: 3 }}>{item.chuDe || item.id || 'Tư liệu'}</div>
                        <div className="text-sm text-soft">{item.phanBacChinh || item.luanDiemSaiTrai || ''}</div>
                        <div className="text-xs text-mute" style={{ marginTop: 4 }}>{item.nguon || ''}{item.score ? ` · score ${Number(item.score).toFixed(3)}` : ''}</div>
                      </div>
                    ))}
                  </>
                )}
                {(!result.result.dan_chung_su_dung?.length && !result.result.bang_chung_doi_chieu?.length && !result.knowledge.length) && (
                  <div className="empty" style={{ padding: '16px 0' }}>Không có dẫn chứng.</div>
                )}
              </div>
            )}

            {/* Rating */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                <span className="text-sm text-soft">Đánh giá chất lượng:</span>
                <div className="row" style={{ gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRating(n)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: n <= rating ? 'var(--yellow)' : 'var(--line)' }}>
                      <Star size={18} fill={n <= rating ? 'var(--yellow)' : 'none'} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
                <input className="field" value={ratingNote} onChange={e => setRatingNote(e.target.value)} placeholder="Ghi chú ngắn" style={{ flex: 1, minWidth: 120, padding: '6px 10px', fontSize: 13 }} />
                <button className="btn sm ghost" onClick={sendRating}>
                  <Send size={13} /> Gửi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends */}
      <div className="card tinted" style={{ marginTop: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <div className="chip"><TrendingUp size={14} /></div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Xu hướng</span>
          </div>
          <div className="row" style={{ gap: 4 }}>
            {[7, 30].map(w => (
              <button key={w} onClick={() => { setTrendWindow(w); loadTrends(accessCode || sessionStorage.getItem(ACCESS_KEY), w); }}
                className={`btn sm ${trendWindow === w ? 'primary' : 'ghost'}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                {w} ngày
              </button>
            ))}
          </div>
        </div>

        {trendsLoading && <div className="empty" style={{ padding: 12 }}><RefreshCw size={16} className="spinner" /></div>}
        {!trendsLoading && !trends && <div className="empty" style={{ padding: 12 }}>Nhập mã để tải thống kê.</div>}
        {trends && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Lượt', value: Number(trends.totalRequests || 0).toLocaleString('vi-VN') },
                { label: 'Nguy hiểm TB', value: trends.averageDangerLevel || 0 },
                { label: 'Tốt', value: `${trends.goodRatingRate || 0}%` },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--line)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--red)' }}>{s.value}</div>
                  <div className="text-xs text-mute">{s.label}</div>
                </div>
              ))}
            </div>
            {Array.isArray(trends.topTopics) && trends.topTopics.map((t, i) => (
              <div key={i} className="row" style={{ justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <span className="text-sm">{t.topic}</span>
                <span className="pill">{t.count}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
