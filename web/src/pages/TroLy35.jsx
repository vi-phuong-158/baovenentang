import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Clock3,
  Copy,
  Key,
  Lock,
  MessageSquareText,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { getTrends, getTroLy35History, runTroLy35, sendFeedback } from '../api.js';
import { markdownToHtml } from '../lib/markdown.js';
import logo35 from '../../logo.png';

const ACCESS_KEY = 'troly35_access_code';
const STYLE_KEY = 'troly35_style';
const HISTORY_LIMIT = 20;
const CHAT_HISTORY_TURNS = 8;

const STYLES = [
  { value: 'chinhluan', label: 'Chính luận', hint: 'Trang trọng, lập luận chặt' },
  { value: 'tretrung', label: 'Trẻ trung', hint: 'Gần gũi, hợp mạng xã hội' },
  { value: 'ngangon', label: 'Ngắn gọn', hint: 'Súc tích, phản hồi nhanh' },
];

const MODES = [
  {
    value: 'rebuttal',
    label: 'Phản bác',
    shortLabel: 'Phản bác',
    placeholder: 'Dán luận điểm, bình luận hoặc nội dung cần phản bác...',
  },
  {
    value: 'fact_check',
    label: 'Kiểm chứng',
    shortLabel: 'Kiểm chứng',
    placeholder: 'Dán thông tin cần thẩm định nguồn, độ tin cậy hoặc điểm cần kiểm chứng...',
  },
  {
    value: 'article_writer',
    label: 'Viết bài',
    shortLabel: 'Viết bài',
    placeholder: 'Nhập chủ đề, thông điệp hoặc dàn ý cần viết thành bài tuyên truyền...',
  },
];

function getMode(mode) {
  return MODES.find(item => item.value === mode) || MODES[0];
}

function listBlock(title, items, mapper = item => item) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `${title}:\n${items.map(item => `- ${mapper(item)}`).join('\n')}`;
}

function formatEvidence(items) {
  return listBlock('Dẫn chứng sử dụng', items, item => {
    if (!item || typeof item !== 'object') return item;
    return [item.noi_dung, item.nguon ? `Nguồn: ${item.nguon}` : ''].filter(Boolean).join(' | ');
  });
}

function formatAnswer(mode, res) {
  const result = res?.result || res || {};
  let parts = [];

  if (mode === 'fact_check') {
    parts = [
      result.muc_danh_gia ? `Mức đánh giá: ${result.muc_danh_gia}` : '',
      result.do_tin_cay ? `Độ tin cậy: ${result.do_tin_cay}/5` : '',
      result.nhan_dinh_chinh,
      listBlock('Điểm cần kiểm chứng', result.diem_can_kiem_chung),
      formatEvidence(result.bang_chung_doi_chieu),
      result.khuyen_nghi_xu_ly ? `Khuyến nghị xử lý:\n${result.khuyen_nghi_xu_ly}` : '',
    ];
  } else if (mode === 'article_writer') {
    parts = [
      result.tieu_de ? `Tiêu đề: ${result.tieu_de}` : '',
      result.mo_ta_ngan,
      listBlock('Dàn ý', result.dan_y),
      result.bai_viet,
      result.caption_mxh ? `Caption MXH:\n${result.caption_mxh}` : '',
      Array.isArray(result.hashtag_de_xuat) && result.hashtag_de_xuat.length
        ? `Hashtag: ${result.hashtag_de_xuat.join(' ')}`
        : '',
    ];
  } else {
    parts = [
      result.phien_ban_day_du,
      result.phien_ban_comment ? `Comment ngắn:\n${result.phien_ban_comment}` : '',
      listBlock('Tóm tắt nhanh', result.phien_ban_tom_tat),
      formatEvidence(result.dan_chung_su_dung),
      Array.isArray(result.hashtag_de_xuat) && result.hashtag_de_xuat.length
        ? `Hashtag: ${result.hashtag_de_xuat.join(' ')}`
        : '',
    ];
  }

  const notes = [result.ghi_chu, result.nhan_kiem_duyet].filter(Boolean).join('\n\n');
  const answer = [...parts, notes].filter(Boolean).join('\n\n').trim();
  return answer || 'Tôi chưa tạo được câu trả lời phù hợp. Anh/chị vui lòng thử hỏi lại rõ hơn.';
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PENDING_STEPS = [
  'Đang phân tích nội dung...',
  'Đang tra cứu dẫn chứng...',
  'Đang soạn nội dung trả lời...',
];

function PendingIndicator() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setStep(prev => Math.min(prev + 1, PENDING_STEPS.length - 1));
    }, 2200);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="row" style={{ gap: 7 }}>
      <RefreshCw size={14} className="spinner" /> {PENDING_STEPS[step]}
    </span>
  );
}

function MessageText({ text, plain }) {
  if (plain) {
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
  return <div className="chat-markdown" dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} />;
}

function copyParts(mode, raw) {
  if (!raw || typeof raw !== 'object') return [];
  const hashtags = Array.isArray(raw.hashtag_de_xuat) && raw.hashtag_de_xuat.length
    ? raw.hashtag_de_xuat.join(' ')
    : '';
  let parts = [];
  if (mode === 'article_writer') {
    parts = [
      { label: 'Bài viết', text: raw.bai_viet },
      { label: 'Caption MXH', text: raw.caption_mxh },
      { label: 'Hashtag', text: hashtags },
    ];
  } else if (mode === 'rebuttal') {
    parts = [
      { label: 'Bản đầy đủ', text: raw.phien_ban_day_du },
      { label: 'Comment ngắn', text: raw.phien_ban_comment },
      { label: 'Hashtag', text: hashtags },
    ];
  }
  return parts.filter(part => part.text && String(part.text).trim());
}

function ChatMessage({ message, onCopy, onFeedback, onFeedbackDraft }) {
  const isUser = message.role === 'user';
  const mode = getMode(message.mode);
  const parts = isUser ? [] : copyParts(mode.value, message.responseRaw);

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{
        maxWidth: '88%',
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
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <Bot size={14} color="var(--red)" />
              <span className="text-xs" style={{ color: 'var(--ink-soft)', fontWeight: 700 }}>Trợ lý 35</span>
              <span className="pill" style={{ padding: '2px 7px', fontSize: 11 }}>{mode.shortLabel}</span>
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
            <PendingIndicator />
          ) : (
            <MessageText text={message.text} plain={isUser || message.error} />
          )}
        </div>

        {!isUser && !message.pending && !message.error && parts.length > 0 && (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <span className="text-xs text-mute" style={{ fontWeight: 700 }}>Copy:</span>
            {parts.map(part => (
              <button
                key={part.label}
                type="button"
                className="btn ghost sm"
                onClick={() => onCopy(part.text, part.label)}
                style={{ padding: '5px 9px', fontSize: 12 }}
              >
                <Copy size={12} /> {part.label}
              </button>
            ))}
          </div>
        )}

        {!isUser && !message.pending && !message.error && message.requestId && (
          <div style={{ borderTop: '1px solid var(--line-soft)', marginTop: 10, paddingTop: 8 }}>
            {message.feedback ? (
              <div className="row" style={{ gap: 6, color: message.feedback === 'good' ? 'var(--ok)' : 'var(--red)', fontSize: 12, fontWeight: 700 }}>
                <Check size={13} />
                Đã đánh giá {message.feedback === 'good' ? 'tốt' : 'chưa tốt'}
              </div>
            ) : (
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => onFeedback(message, 'good')}
                  disabled={message.feedbackLoading}
                  style={{ padding: '6px 9px', fontSize: 12 }}
                >
                  <ThumbsUp size={13} /> Tốt
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => onFeedback(message, 'bad')}
                  disabled={message.feedbackLoading}
                  style={{ padding: '6px 9px', fontSize: 12 }}
                >
                  <ThumbsDown size={13} /> Xấu
                </button>
                {message.feedbackLoading && <RefreshCw size={14} className="spinner" />}
              </div>
            )}

            {message.showFeedbackNote && !message.feedback && (
              <div style={{ marginTop: 8 }}>
                <textarea
                  className="field"
                  rows={2}
                  value={message.feedbackDraft || ''}
                  onChange={e => onFeedbackDraft(message.id, e.target.value)}
                  placeholder="Ghi chú ngắn để Trợ lý 35 cải thiện..."
                  style={{ minHeight: 58, marginBottom: 6, fontSize: 13 }}
                />
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => onFeedback(message, 'bad', true)}
                  disabled={message.feedbackLoading}
                  style={{ padding: '7px 10px', fontSize: 12 }}
                >
                  Gửi góp ý
                </button>
                {message.feedbackError && <div className="msg error">{message.feedbackError}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TroLy35() {
  const savedCode = localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY) || '';
  const [accessCode, setAccessCode] = useState(savedCode);
  const [remember, setRemember] = useState(!!localStorage.getItem(ACCESS_KEY));
  const [accessMsg, setAccessMsg] = useState(savedCode ? 'Đã tải mã truy cập.' : '');
  const [accessMsgType, setAccessMsgType] = useState('success');

  const [mode, setMode] = useState('rebuttal');
  const [style, setStyle] = useState(() => {
    try { return localStorage.getItem(STYLE_KEY) || 'chinhluan'; } catch { return 'chinhluan'; }
  });
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runMsg, setRunMsg] = useState('');
  const [runMsgType, setRunMsgType] = useState('neutral');

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMsg, setHistoryMsg] = useState('');

  const [trends, setTrends] = useState(null);
  const [trendWindow, setTrendWindow] = useState(7);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const code = accessCode.trim();
    if (code) {
      loadTrends(code, trendWindow);
      loadHistory(code);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const updateAssistantMessage = (id, patch) => {
    setMessages(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const saveAccess = () => {
    const v = accessCode.trim();
    if (!v) {
      sessionStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(ACCESS_KEY);
      setAccessMsg('Đã xóa mã.');
      setAccessMsgType('neutral');
      setTrends(null);
      setHistory([]);
      setHistoryMsg('');
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
    loadHistory(v);
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

  const loadHistory = async (code) => {
    if (!code) return;
    setHistoryLoading(true);
    setHistoryMsg('');
    try {
      const res = await getTroLy35History({ accessCode: code, limit: HISTORY_LIMIT });
      if (res.success === false) throw new Error(res.error || 'Không tải được lịch sử.');
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setHistory([]);
      setHistoryMsg(err.message || 'Không tải được lịch sử.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setRunMsg(label ? `Đã copy ${label}.` : 'Đã copy câu trả lời.');
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

  const chooseStyle = (value) => {
    setStyle(value);
    try { localStorage.setItem(STYLE_KEY, value); } catch {}
  };

  const submitFeedback = async (message, rating, confirmBad = false) => {
    if (!message.requestId || message.feedback) return;
    const code = accessCode.trim() || sessionStorage.getItem(ACCESS_KEY) || '';
    if (!code) {
      updateAssistantMessage(message.id, { feedbackError: 'Vui lòng lưu mã truy cập trước.' });
      return;
    }

    const note = (message.feedbackDraft || '').trim();
    if (rating === 'bad' && !confirmBad) {
      updateAssistantMessage(message.id, { showFeedbackNote: true, feedbackError: '' });
      return;
    }
    if (rating === 'bad' && !note) {
      updateAssistantMessage(message.id, { showFeedbackNote: true, feedbackError: 'Vui lòng nhập ghi chú ngắn.' });
      return;
    }

    updateAssistantMessage(message.id, { feedbackLoading: true, feedbackError: '' });
    try {
      const res = await sendFeedback({
        accessCode: code,
        rating,
        responseId: message.requestId,
        queryPreview: message.queryText || '',
        responsePreview: message.text || '',
        comment: note,
        reason: note,
      });
      if (res.success === false) throw new Error(res.error || 'Không lưu được đánh giá.');
      updateAssistantMessage(message.id, {
        feedback: rating,
        feedbackLoading: false,
        showFeedbackNote: false,
        feedbackDraft: note,
      });
      loadTrends(code, trendWindow);
      loadHistory(code);
    } catch (err) {
      updateAssistantMessage(message.id, {
        feedbackLoading: false,
        feedbackError: err.message || 'Không lưu được đánh giá.',
      });
    }
  };

  const openHistoryItem = (item) => {
    const itemMode = getMode(item.mode).value;
    setMode(itemMode);
    setMessages([
      {
        id: `history-user-${item.requestId}`,
        role: 'user',
        mode: itemMode,
        text: item.inputPreview || 'Nội dung không còn trong lịch sử.',
      },
      {
        id: `history-assistant-${item.requestId}`,
        role: 'assistant',
        mode: itemMode,
        text: item.answerText || item.error || 'Chưa có nội dung trả lời để hiển thị.',
        requestId: item.requestId,
        queryText: item.inputPreview || '',
        feedback: item.ratingStatus || '',
        feedbackDraft: item.note || '',
        error: item.status === 'ERROR',
      },
    ]);
    setRunMsg('Đã mở lại mục lịch sử.');
    setRunMsgType('neutral');
  };

  const sendQuestion = async (e) => {
    e.preventDefault();

    const code = accessCode.trim() || sessionStorage.getItem(ACCESS_KEY) || '';
    const content = question.trim();
    const selectedMode = getMode(mode).value;
    const isFollowUp = messages.some(m => m.role === 'assistant' && !m.pending && !m.error);
    const history = messages
      .filter(m => !m.pending && !m.error && m.text)
      .slice(-CHAT_HISTORY_TURNS)
      .map(m => ({ role: m.role, text: m.text }));

    if (!code) {
      setRunMsg('Vui lòng nhập mã truy cập nội bộ.');
      setRunMsgType('error');
      return;
    }
    if (content.length < (isFollowUp ? 2 : 20)) {
      setRunMsg(isFollowUp
        ? 'Vui lòng nhập yêu cầu chỉnh sửa (vd: ngắn hơn, thêm dẫn chứng).'
        : 'Câu hỏi cần tối thiểu 20 ký tự để hệ thống có đủ ngữ cảnh.');
      setRunMsgType('error');
      return;
    }
    if (/^https?:\/\/\S+$/i.test(content)) {
      setRunMsg('Vui lòng nhập câu hỏi hoặc dán nội dung cần hỏi, không chỉ gửi một đường link.');
      setRunMsgType('error');
      return;
    }

    const id = Date.now();
    const userMessage = { id: `user-${id}`, role: 'user', mode: selectedMode, text: content };
    const assistantMessage = { id: `assistant-${id}`, role: 'assistant', mode: selectedMode, text: '', pending: true, queryText: content };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setQuestion('');
    setRunMsg('');
    setLoading(true);

    try {
      const res = await runTroLy35({ accessCode: code, mode: selectedMode, content, style, history });
      if (!res.success) throw new Error(res.error || 'Không xử lý được yêu cầu.');

      const answer = formatAnswer(selectedMode, res);
      setMessages(prev => prev.map(item =>
        item.id === assistantMessage.id
          ? { ...item, text: answer, pending: false, requestId: res.requestId, responseRaw: res.result || {} }
          : item
      ));
      loadTrends(code, trendWindow);
      loadHistory(code);
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

  const activeMode = getMode(mode);
  const hasConversation = messages.some(m => m.role === 'assistant' && !m.pending && !m.error);

  return (
    <div className="page page-fade">
      <div className="page-header">
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <div className="pill" style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontSize: 11 }}>
            <Lock size={11} /> Nội bộ
          </div>
        </div>
        <h1>Trợ lý 35</h1>
        <p>Hỏi đáp nhanh, hỗ trợ xử lý thông tin</p>
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
        <div className="row" style={{ justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <div className="chip red"><MessageSquareText size={14} /></div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{activeMode.label}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, marginBottom: 10 }}>
          {MODES.map(item => (
            <button
              key={item.value}
              type="button"
              className={`btn sm ${mode === item.value ? 'primary' : 'ghost'}`}
              onClick={() => setMode(item.value)}
              disabled={loading}
              style={{ padding: '8px 6px', fontSize: 12 }}
            >
              {item.shortLabel}
            </button>
          ))}
        </div>

        {mode === 'rebuttal' && (
          <div style={{ marginBottom: 10 }}>
            <span className="text-xs" style={{ fontWeight: 700, color: 'var(--ink-mute)', display: 'block', marginBottom: 6 }}>
              Phong cách trả lời
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
              {STYLES.map(item => (
                <button
                  key={item.value}
                  type="button"
                  className={`btn sm ${style === item.value ? 'primary' : 'ghost'}`}
                  onClick={() => chooseStyle(item.value)}
                  disabled={loading}
                  title={item.hint}
                  style={{ padding: '7px 6px', fontSize: 12 }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

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
              <ChatMessage
                key={message.id}
                message={message}
                onCopy={copyText}
                onFeedback={submitFeedback}
                onFeedbackDraft={(id, value) => updateAssistantMessage(id, { feedbackDraft: value, feedbackError: '' })}
              />
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
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !loading) {
                e.preventDefault();
                sendQuestion(e);
              }
            }}
            placeholder={hasConversation ? 'Nhập yêu cầu tinh chỉnh: ngắn hơn, thêm dẫn chứng, đổi giọng... (Ctrl+Enter để gửi)' : `${activeMode.placeholder}`}
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

      <div className="card tinted" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <div className="chip"><Clock3 size={14} /></div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Lịch sử</span>
          </div>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => loadHistory(accessCode || sessionStorage.getItem(ACCESS_KEY))}
            disabled={historyLoading}
            style={{ padding: '6px 9px', fontSize: 12 }}
          >
            {historyLoading ? <RefreshCw size={13} className="spinner" /> : <RefreshCw size={13} />}
          </button>
        </div>

        {historyLoading && <div className="empty" style={{ padding: 12 }}><RefreshCw size={16} className="spinner" /></div>}
        {!historyLoading && historyMsg && <div className="msg error">{historyMsg}</div>}
        {!historyLoading && !historyMsg && history.length === 0 && (
          <div className="empty" style={{ padding: 12 }}>Chưa có lịch sử hội thoại.</div>
        )}
        {!historyLoading && history.map(item => (
          <button
            key={item.requestId}
            type="button"
            onClick={() => openHistoryItem(item)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '9px 0',
              border: 0,
              borderBottom: '1px solid var(--line-soft)',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <div className="row" style={{ justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <span className="text-xs text-mute">{formatDate(item.timestamp)} · {getMode(item.mode).shortLabel}</span>
              {item.ratingStatus && (
                <span className={`pill ${item.ratingStatus === 'good' ? 'ok' : ''}`} style={{ fontSize: 11 }}>
                  {item.ratingStatus === 'good' ? 'Tốt' : 'Xấu'}
                </span>
              )}
            </div>
            <div className="text-sm" style={{ color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.inputPreview || item.topic || item.requestId}
            </div>
          </button>
        ))}
      </div>

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
