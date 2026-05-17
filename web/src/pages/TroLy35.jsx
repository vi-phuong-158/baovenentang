import { useEffect, useRef, useState } from 'react';
import { Bot, Copy, Key, Lock, RefreshCw, Send, Trash2, TrendingUp } from 'lucide-react';
import { getTrends, runTroLy35 } from '../api.js';
import logo35 from '../../logo.png';

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
}

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
}

export default function TroLy35() {
  const [accessCode, setAccessCode] = useState(localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY) || '');
  const [remember, setRemember] = useState(!!localStorage.getItem(ACCESS_KEY));
  const [accessMsg, setAccessMsg] = useState((localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY)) ? 'Đã tải mã truy cập.' : '');
  const [accessMsgType, setAccessMsgType] = useState('success');

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runMsg, setRunMsg] = useState('');
  const [runMsgType, setRunMsgType] = useState('neutral');

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
    if (!v) {
      sessionStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(ACCESS_KEY);
      setAccessMsg('Đã xóa mã.');
      setAccessMsgType('neutral');
      setTrends(null);
      return;
    }
    if (remember) {
      localStorage.setItem(ACCESS_KEY, v);
      sessionStorage.removeItem(ACCESS_KEY);
    } else {
      sessionStorage.setItem(ACCESS_KEY, v);
      localStorage.removeItem(ACCESS_KEY);
    }
    setAccessMsg('Đã lưu mã truy cập.');
    setAccessMsgType('success');
    loadTrends(v, trendWindow);
  };

  const loadTrends = async (code, windowDays) => {
    if (!code) return;
    setTrendsLoading(true);
    try {
      const res = await getTrends({ accessCode: code, windowDays });
      if (res.success !== false) setTrends(res.data || res);
    } catch {
      setTrends(null);
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
    }
  };

  return (
    <div className="page page-fade">
      {/* Header */}
      <div className="page-header">
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <div className="pill" style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontSize: 11 }}>
            <Lock size={11} /> Nội bộ
          </div>
        </div>
        <h1>Trợ lý 35</h1>
        <p>Hỏi đáp nhanh, hỗ trợ xử lý thông tin</p>
      </div>

      {/* Access code */}
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

      {/* Chat window */}
      <div className="card elevated" style={{ padding: 12, marginBottom: 12 }}>
        <div style={{ minHeight: 260, maxHeight: 420, overflowY: 'auto', padding: '2px 2px 10px' }}>
          {messages.length === 0 ? (
            <div className="empty" style={{ padding: '34px 12px 38px' }}>
              <img
                src={logo35}
                alt="Trợ lý 35"
                style={{
                  width: 72, height: 72, borderRadius: '50%', objectFit: 'contain',
                  opacity: 0.78, filter: 'drop-shadow(0 8px 18px rgba(183,28,28,.18))',
                  display: 'block', margin: '0 auto 12px',
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

      {/* Trends */}
      <div className="card tinted" style={{ marginTop: 4 }}>
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
