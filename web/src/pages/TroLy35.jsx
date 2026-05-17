<<<<<<< Updated upstream
import { useState, useEffect } from 'react';
import { Lock, Key, Shield, Search, Edit3, Sparkles, Eraser, Copy, Star, TrendingUp, RefreshCw, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import DOMPurify from 'dompurify';
import { runTroLy35, rateTroLy35, getTrends, sendFeedback } from '../api.js';
=======
import { useEffect, useRef, useState } from 'react';
import { Bot, Copy, Key, Lock, RefreshCw, Send, Trash2, TrendingUp } from 'lucide-react';
import { getTrends, runTroLy35 } from '../api.js';
import logo35 from '../../logo.png';
>>>>>>> Stashed changes

const ACCESS_KEY = 'troly35_access_code';

function getBestAnswer(res) {
  const result = res?.result || {};
  const primary =
    result.phien_ban_day_du ||
    result.phien_ban_comment ||
    result.nhan_dinh_chinh ||
    result.khuyen_nghi_xu_ly ||
    result.bai_viet ||
    result.caption_mxh ||
    '';

  const fallback = Array.isArray(result.phien_ban_tom_tat)
    ? result.phien_ban_tom_tat.join('\n')
    : result.phien_ban_tom_tat || '';

  const notes = [result.ghi_chu, result.nhan_kiem_duyet].filter(Boolean).join('\n\n');
  const answer = [primary || fallback, notes].filter(Boolean).join('\n\n').trim();

  return answer || 'Tôi chưa tạo được câu trả lời phù hợp. Anh/chị vui lòng thử hỏi lại rõ hơn.';
}

<<<<<<< HEAD
const PURIFY_CONFIG = { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'li'], ALLOWED_ATTR: [] };
=======
<<<<<<< Updated upstream
const PURIFY_CONFIG = { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'div', 'span'], ALLOWED_ATTR: ['style', 'class'] };
>>>>>>> 5c84c024f65d235ed8281b993b6a05607b051336

function formatText(text) {
  const safe = escapeHTML(text || '').trim();
  if (!safe) return '<p>Không có nội dung.</p>';
  const html = safe.split(/\n{2,}/).map(b => `<p>${b.replace(/\n/g, '<br>')}</p>`).join('');
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
=======
function MessageText({ text }) {
  const blocks = (text || '').split(/\n{2,}/);

  return (
    <>
      {blocks.map((block, blockIndex) => (
        <p key={blockIndex} style={{ margin: 0, marginBottom: blockIndex === blocks.length - 1 ? 0 : 10, whiteSpace: 'pre-wrap' }}>
          {block}
        </p>
      ))}
    </>
  );
>>>>>>> Stashed changes
}

<<<<<<< HEAD
async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text || '');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
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
=======
function ChatMessage({ message, onCopy }) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      <div style={{
        maxWidth: '86%',
        padding: '11px 13px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? 'var(--red)' : 'var(--surface)',
        color: isUser ? '#fff' : 'var(--ink)',
        border: isUser ? '1px solid var(--red)' : '1px solid var(--line)',
        boxShadow: isUser ? 'var(--shadow-red)' : 'var(--shadow-card)',
        lineHeight: 1.55,
      }}>
        {!isUser && (
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div className="row" style={{ gap: 6 }}>
              <Bot size={14} color="var(--red)" />
              <span className="text-xs" style={{ color: 'var(--ink-soft)', fontWeight: 700 }}>Trợ lý 35</span>
            </div>
            {!message.pending && !message.error && (
              <button
                type="button"
                onClick={() => onCopy(message.text)}
                aria-label="Copy câu trả lời"
                style={{ display: 'flex', color: 'var(--ink-mute)', padding: 2 }}
              >
                <Copy size={14} />
              </button>
            )}
          </div>
        )}
        <div className="text-sm" style={{ color: isUser ? '#fff' : (message.error ? 'var(--red)' : 'var(--ink-soft)') }}>
          {message.pending ? (
            <span className="row" style={{ gap: 7 }}><RefreshCw size={14} className="spinner" /> Đang trả lời...</span>
          ) : (
            <MessageText text={message.text} />
          )}
        </div>
      </div>
    </div>
  );
>>>>>>> 5c84c024f65d235ed8281b993b6a05607b051336
}

export default function TroLy35() {
  const [remember, setRemember] = useState(!!localStorage.getItem(ACCESS_KEY));
  const [accessCode, setAccessCode] = useState(localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY) || '');
  const [accessMsg, setAccessMsg] = useState((localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY)) ? 'Đã tải mã truy cập.' : '');
  const [accessMsgType, setAccessMsgType] = useState('success');

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runMsg, setRunMsg] = useState('');
  const [runMsgType, setRunMsgType] = useState('neutral');

<<<<<<< Updated upstream
  const [result, setResult] = useState(null);
  const [resultTab, setResultTab] = useState(0);
  const [requestId, setRequestId] = useState('');

  const [rating, setRating] = useState(0);
  const [ratingNote, setRatingNote] = useState('');

  const [feedback, setFeedback] = useState(null); // 'good' | 'bad' | null
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

=======
>>>>>>> Stashed changes
  const [trends, setTrends] = useState(null);
  const [trendWindow, setTrendWindow] = useState(7);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (accessCode) loadTrends(accessCode, trendWindow);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const saveAccess = () => {
    const v = accessCode.trim();
<<<<<<< Updated upstream
    if (!v) { sessionStorage.removeItem(ACCESS_KEY); localStorage.removeItem(ACCESS_KEY); setAccessMsg('Đã xóa mã.'); setAccessMsgType('neutral'); return; }
    if (remember) { localStorage.setItem(ACCESS_KEY, v); sessionStorage.removeItem(ACCESS_KEY); }
    else { sessionStorage.setItem(ACCESS_KEY, v); localStorage.removeItem(ACCESS_KEY); }
    setAccessMsg('Đã lưu mã truy cập.'); setAccessMsgType('success');
=======
    if (!v) {
      sessionStorage.removeItem(ACCESS_KEY);
      setAccessMsg('Đã xóa mã.');
      setAccessMsgType('neutral');
      setTrends(null);
      return;
    }
    sessionStorage.setItem(ACCESS_KEY, v);
    setAccessMsg('Đã lưu mã truy cập.');
    setAccessMsgType('success');
>>>>>>> Stashed changes
    loadTrends(v, trendWindow);
  };

  const loadTrends = async (code, windowDays) => {
    if (!code) return;
    setTrendsLoading(true);
    try {
      const res = await getTrends({ accessCode: code, windowDays });
      if (res.success !== false) setTrends(res.data || res);
<<<<<<< Updated upstream
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
      setFeedback(null);
      setFeedbackSent(false);
      setFeedbackReason('');
      setShowFeedbackModal(false);
      setResult({ result: res.result || {}, analysis: res.analysis || {}, knowledge: res.knowledge || [] });
      setRunMsg('Đã tạo bản nháp. Vui lòng rà soát trước khi sử dụng.'); setRunMsgType('success');
      loadTrends(code, trendWindow);
    } catch (err) {
      setRunMsg(err.message || 'Có lỗi xảy ra.'); setRunMsgType('error');
=======
    } catch {
      setTrends(null);
>>>>>>> Stashed changes
    } finally {
      setTrendsLoading(false);
    }
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setRunMsg('Đã copy câu trả lời.');
      setRunMsgType('success');
    } catch {
      setRunMsg('Không copy được.');
      setRunMsgType('error');
    }
  };

<<<<<<< HEAD
  const view = result ? buildView(result.result, mode) : null;
  const analysis = result?.analysis || {};
  const feedbackKey = requestId ? `troly35_feedback_${requestId}` : '';

  useEffect(() => {
    if (!feedbackKey) return;
    const saved = localStorage.getItem(feedbackKey);
    if (saved) {
      setFeedback(saved);
      setFeedbackSent(true);
    }
  }, [feedbackKey]);

  const submitFeedback = async (ratingValue, reason = '') => {
    if (!requestId || !view) return;
    const code = accessCode.trim() || localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY) || '';
    try {
      await sendFeedback({
        accessCode: code,
        responseId: requestId,
        rating: ratingValue,
        reason,
        queryHash: await sha256Hex(content.trim()),
        queryPreview: content.substring(0, 200),
        responsePreview: (view.full || view.short || '').substring(0, 200),
      });
      if (feedbackKey) localStorage.setItem(feedbackKey, ratingValue);
      setFeedback(ratingValue);
      setFeedbackSent(true);
      setShowFeedbackModal(false);
    } catch (err) {
      setRunMsg(err.message || 'Không gửi được góp ý.');
      setRunMsgType('error');
=======
  const clearChat = () => {
    setMessages([]);
    setQuestion('');
    setRunMsg('');
  };

  const sendQuestion = async (e) => {
    e.preventDefault();

    const code = accessCode.trim() || sessionStorage.getItem(ACCESS_KEY) || '';
    const content = question.trim();

    if (!code) {
      setRunMsg('Vui lòng nhập mã truy cập nội bộ.');
      setRunMsgType('error');
      return;
    }
    if (content.length < 20) {
      setRunMsg('Câu hỏi cần tối thiểu 20 ký tự để hệ thống có đủ ngữ cảnh.');
      setRunMsgType('error');
      return;
    }
    if (/^https?:\/\/\S+$/i.test(content)) {
      setRunMsg('Vui lòng nhập câu hỏi hoặc dán nội dung cần hỏi, không chỉ gửi một đường link.');
      setRunMsgType('error');
      return;
    }

    const id = Date.now();
    const userMessage = { id: `user-${id}`, role: 'user', text: content };
    const assistantMessage = { id: `assistant-${id}`, role: 'assistant', text: '', pending: true };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setQuestion('');
    setRunMsg('');
    setLoading(true);

    try {
      const res = await runTroLy35({ accessCode: code, mode: 'rebuttal', content });
      if (!res.success) throw new Error(res.error || 'Không xử lý được yêu cầu.');

      const answer = getBestAnswer(res);
      setMessages(prev => prev.map(item =>
        item.id === assistantMessage.id
          ? { ...item, text: answer, pending: false }
          : item
      ));
      loadTrends(code, trendWindow);
    } catch (err) {
      setMessages(prev => prev.map(item =>
        item.id === assistantMessage.id
          ? { ...item, text: err.message || 'Có lỗi xảy ra. Vui lòng thử lại.', pending: false, error: true }
          : item
      ));
      setRunMsg(err.message || 'Có lỗi xảy ra.');
      setRunMsgType('error');
    } finally {
      setLoading(false);
>>>>>>> 5c84c024f65d235ed8281b993b6a05607b051336
    }
  };

  return (
    <div className="page page-fade">
      <div className="page-header">
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <div className="pill" style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontSize: 11 }}>
            <Lock size={11} /> Nội bộ
          </div>
        </div>
        <h1>Trợ lý 35</h1>
        <p>Hỏi đáp nhanh, trả lời ngắn gọn để hỗ trợ xử lý thông tin</p>
      </div>

      <div className="card tinted" style={{ marginBottom: 12 }}>
        <div className="row" style={{ marginBottom: 8 }}>
          <div className="chip red"><Lock size={14} /></div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Truy cập</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            className="field"
            type="password"
            value={accessCode}
            onChange={e => setAccessCode(e.target.value)}
            placeholder="Nhập mã truy cập nội bộ"
            style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && saveAccess()}
          />
          <button className="btn sm" onClick={saveAccess} style={{ flexShrink: 0 }}>
            <Key size={14} /> Lưu
          </button>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          Ghi nhớ mã <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>(chỉ dùng trên thiết bị cá nhân)</span>
        </label>
        {accessMsg && <div className={`msg ${accessMsgType}`}>{accessMsg}</div>}
      </div>

      <div className="card elevated" style={{ padding: 12, marginBottom: 12 }}>
        <div style={{
          minHeight: 260,
          maxHeight: 420,
          overflowY: 'auto',
          padding: '2px 2px 10px',
        }}>
          {messages.length === 0 ? (
            <div className="empty" style={{ padding: '34px 12px 38px' }}>
              <img
                src={logo35}
                alt="Trợ lý 35"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  objectFit: 'contain',
                  opacity: 0.78,
                  filter: 'drop-shadow(0 8px 18px rgba(183,28,28,.18))',
                  display: 'block',
                  margin: '0 auto 12px',
                }}
              />
              Nhập câu hỏi để bắt đầu hội thoại.
            </div>
          ) : (
            messages.map(message => (
              <ChatMessage key={message.id} message={message} onCopy={copyText} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendQuestion} style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 10 }}>
          <textarea
            className="field"
            rows={3}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Nhập câu hỏi hoặc dán nội dung cần hỗ trợ..."
            disabled={loading}
            style={{ minHeight: 82, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? <><RefreshCw size={15} className="spinner" /> Đang trả lời...</> : <><Send size={15} /> Gửi câu hỏi</>}
            </button>
            <button type="button" className="btn ghost sm" onClick={clearChat} disabled={loading && messages.length === 0} aria-label="Xóa hội thoại">
              <Trash2 size={15} />
            </button>
          </div>
          {runMsg && <div className={`msg ${runMsgType}`}>{runMsg}</div>}
        </form>
      </div>

<<<<<<< Updated upstream
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
        <div className="card elevated" aria-live="polite" style={{ marginTop: 16, borderRadius: 20, overflow: 'hidden', padding: 0 }}>
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

            {/* Feedback thumbs */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
              {!feedbackSent ? (
                <div>
                  <div className="row" style={{ gap: 8, marginBottom: showFeedbackModal ? 10 : 0 }}>
                    <span className="text-sm text-soft">Phản hồi hữu ích không?</span>
                    <button
                      onClick={() => submitFeedback('good')}
                      disabled={feedbackSent}
                      style={{ background: feedback === 'good' ? 'var(--ok-soft)' : 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
                    >
                      <ThumbsUp size={14} /> Hữu ích
                    </button>
                    <button
                      onClick={() => { setFeedback('bad'); setShowFeedbackModal(true); }}
                      disabled={feedbackSent}
                      style={{ background: feedback === 'bad' ? '#fef2f2' : 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
                    >
                      <ThumbsDown size={14} /> Chưa tốt
                    </button>
                  </div>
                  {showFeedbackModal && (
                    <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 12, border: '1px solid var(--line)' }}>
                      <div className="text-sm" style={{ fontWeight: 600, marginBottom: 8 }}>Lý do chưa tốt?</div>
                      {['Không chính xác', 'Không đầy đủ', 'Khó hiểu', 'Thiếu dẫn chứng', 'Khác'].map(r => (
                        <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4, cursor: 'pointer' }}>
                          <input type="radio" name="fb_reason" value={r} checked={feedbackReason === r} onChange={() => setFeedbackReason(r)} />
                          {r}
                        </label>
                      ))}
                      <button
                        className="btn sm primary"
                        style={{ marginTop: 8 }}
                        onClick={() => submitFeedback('bad', feedbackReason || 'Khác')}
                      >
                        Gửi
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-soft" style={{ textAlign: 'center', padding: 4 }}>
                  Cảm ơn góp ý!
                </div>
              )}
            </div>

            {/* Rating */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                <span className="text-sm text-soft">Chấm sao:</span>
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
=======
>>>>>>> Stashed changes
      <div className="card tinted" style={{ marginTop: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <div className="chip"><TrendingUp size={14} /></div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Xu hướng</span>
          </div>
          <div className="row" style={{ gap: 4 }}>
            {[7, 30].map(w => (
              <button
                key={w}
                onClick={() => { setTrendWindow(w); loadTrends(accessCode || sessionStorage.getItem(ACCESS_KEY), w); }}
                className={`btn sm ${trendWindow === w ? 'primary' : 'ghost'}`}
                style={{ padding: '5px 10px', fontSize: 12 }}
              >
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
