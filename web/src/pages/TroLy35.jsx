import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  ExternalLink,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { getTrends, getTroLy35History, runTroLy35, sendFeedback } from '../api.js';
import { markdownToHtml } from '../lib/markdown.js';
import '../css/troly35.css';
import logo35 from '../../logo.png';

const STYLE_KEY = 'troly35_style';
const CHAT_SESSION_KEY = 'troly35_chat_session';
const HISTORY_LIMIT = 20;
const CHAT_HISTORY_TURNS = 8;

// Truy cập tự do: không bắt nhập mã. Trong production, proxy /api/gas tự gắn
// mã chung từ env TROLY35_ACCESS_CODE. Biến VITE_ dưới đây chỉ dùng khi dev gọi
// trực tiếp GAS (không qua proxy); để trống ở production để không lộ trong bundle.
const ACCESS_CODE = (import.meta.env.VITE_TROLY35_ACCESS_CODE || '').trim();

function loadChatSession() {
  try {
    const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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

  // nhan_kiem_duyet được hiển thị riêng dưới dạng badge, không nhúng vào nội dung.
  const answer = [...parts, result.ghi_chu].filter(Boolean).join('\n\n').trim();
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
    <span className="t35-pending">
      <RefreshCw size={14} className="spinner" /> {PENDING_STEPS[step]}
    </span>
  );
}

function MessageText({ text, plain }) {
  if (plain) {
    const blocks = (text || '').split(/\n{2,}/);
    return (
      <div className="chat-plain">
        {blocks.map((block, blockIndex) => (
          <p key={blockIndex}>{block}</p>
        ))}
      </div>
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

const DANGER_LABELS = ['', 'Thấp', 'Nhẹ', 'Trung bình', 'Cao', 'Rất cao'];

function dangerClass(level) {
  if (level >= 4) return 'high';
  if (level >= 3) return 'mid';
  return 'low';
}

function isUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value || '').trim());
}

function AnalysisList({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="t35-alist">
      <span className="text-xs t35-alist-title">{title}</span>
      <ul>
        {items.map((item, idx) => (
          <li key={idx} className="text-sm">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function AnalysisBlock({ analysis, knowledge }) {
  const [open, setOpen] = useState(false);
  const a = analysis || {};
  const items = Array.isArray(knowledge) ? knowledge : [];
  const danger = Number(a.do_nguy_hiem) || 0;
  const hasAnalysis = a.chu_de || danger > 0
    || (Array.isArray(a.luan_diem_sai) && a.luan_diem_sai.length)
    || (Array.isArray(a.thu_doan) && a.thu_doan.length)
    || (Array.isArray(a.canh_bao_an_toan) && a.canh_bao_an_toan.length);

  if (!hasAnalysis && items.length === 0) return null;

  return (
    <div className="t35-analysis">
      <button type="button" onClick={() => setOpen(o => !o)} className="t35-analysis-toggle">
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Phân tích &amp; dẫn chứng
        {danger > 0 && (
          <span className={`pill t35-danger ${dangerClass(danger)}`}>
            Nguy hiểm {danger}/5{DANGER_LABELS[danger] ? ` · ${DANGER_LABELS[danger]}` : ''}
          </span>
        )}
        {items.length > 0 && (
          <span className="pill t35-count-pill">{items.length} dẫn chứng</span>
        )}
      </button>

      {open && (
        <div className="t35-analysis-body">
          {a.chu_de && (
            <div className="text-sm t35-topic">
              <span className="t35-topic-label">Chủ đề: </span>{a.chu_de}
            </div>
          )}
          <AnalysisList title="Luận điểm sai" items={a.luan_diem_sai} />
          <AnalysisList title="Thủ đoạn" items={a.thu_doan} />
          <AnalysisList title="Cảnh báo an toàn" items={a.canh_bao_an_toan} />

          {items.length > 0 && (
            <div className="t35-evidence">
              <span className="text-xs t35-evidence-title">Dẫn chứng tham khảo</span>
              <div className="t35-evidence-list">
                {items.map((item, idx) => (
                  <div key={item.id || idx} className="t35-evidence-item">
                    {item.chuDe && <div className="text-xs t35-evidence-topic">{item.chuDe}</div>}
                    {item.phanBacChinh && (
                      <div className="text-sm t35-evidence-text">{item.phanBacChinh}</div>
                    )}
                    {item.nguon && (
                      <div className="text-xs t35-evidence-src">
                        {isUrl(item.nguon) ? (
                          <a href={item.nguon} target="_blank" rel="noopener noreferrer" className="t35-evidence-link">
                            <ExternalLink size={11} /> Nguồn
                          </a>
                        ) : (
                          <span className="text-mute">Nguồn: {item.nguon}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChatMessage({ message, onCopy, onFeedback, onFeedbackDraft }) {
  const isUser = message.role === 'user';
  const mode = getMode(message.mode);
  const parts = isUser ? [] : copyParts(mode.value, message.responseRaw);

  return (
    <div className={`t35-msg-row${isUser ? ' user' : ''}`}>
      <div className={`t35-bubble${isUser ? ' user' : ''}`}>
        {!isUser && (
          <div className="row t35-bubble-head">
            <div className="t35-bubble-head-left">
              <Bot size={14} color="var(--red)" />
              <span className="text-xs t35-bot-name">Trợ lý 35</span>
              <span className="pill t35-mode-pill">{mode.shortLabel}</span>
            </div>
            {!message.pending && !message.error && (
              <button
                type="button"
                onClick={() => onCopy(message.text)}
                aria-label="Copy câu trả lời"
                className="t35-copy-icon"
              >
                <Copy size={14} />
              </button>
            )}
          </div>
        )}

        <div className={`text-sm t35-msg-body${isUser ? ' user' : ''}${message.error ? ' error' : ''}`}>
          {message.pending ? (
            <PendingIndicator />
          ) : (
            <MessageText text={message.text} plain={isUser || message.error} />
          )}
        </div>

        {!isUser && !message.pending && !message.error && message.responseRaw?.nhan_kiem_duyet && (
          <div className="t35-moderation">
            <ShieldCheck size={14} />
            <span>{message.responseRaw.nhan_kiem_duyet}</span>
          </div>
        )}

        {!isUser && !message.pending && !message.error && (
          <AnalysisBlock analysis={message.analysis} knowledge={message.knowledge} />
        )}

        {!isUser && !message.pending && !message.error && parts.length > 0 && (
          <div className="t35-copy-row">
            <span className="text-xs text-mute t35-copy-label">Copy:</span>
            {parts.map(part => (
              <button
                key={part.label}
                type="button"
                className="btn ghost sm t35-copy-btn"
                onClick={() => onCopy(part.text, part.label)}
              >
                <Copy size={12} /> {part.label}
              </button>
            ))}
          </div>
        )}

        {!isUser && !message.pending && !message.error && message.requestId && (
          <div className="t35-feedback">
            {message.feedback ? (
              <div className={`t35-feedback-done ${message.feedback === 'good' ? 'good' : 'bad'}`}>
                <Check size={13} />
                Đã đánh giá {message.feedback === 'good' ? 'tốt' : 'chưa tốt'}
              </div>
            ) : (
              <div className="t35-feedback-actions">
                <button
                  type="button"
                  className="btn ghost sm t35-feedback-btn"
                  onClick={() => onFeedback(message, 'good')}
                  disabled={message.feedbackLoading}
                >
                  <ThumbsUp size={13} /> Tốt
                </button>
                <button
                  type="button"
                  className="btn ghost sm t35-feedback-btn"
                  onClick={() => onFeedback(message, 'bad')}
                  disabled={message.feedbackLoading}
                >
                  <ThumbsDown size={13} /> Xấu
                </button>
                {message.feedbackLoading && <RefreshCw size={14} className="spinner" />}
              </div>
            )}

            {message.showFeedbackNote && !message.feedback && (
              <div className="t35-feedback-note">
                <textarea
                  className="field"
                  rows={2}
                  value={message.feedbackDraft || ''}
                  onChange={e => onFeedbackDraft(message.id, e.target.value)}
                  placeholder="Ghi chú ngắn để Trợ lý 35 cải thiện..."
                />
                <button
                  type="button"
                  className="btn primary sm t35-feedback-send"
                  onClick={() => onFeedback(message, 'bad', true)}
                  disabled={message.feedbackLoading}
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
  const [mode, setMode] = useState(() => loadChatSession()?.mode || 'rebuttal');
  const [style, setStyle] = useState(() => {
    try { return localStorage.getItem(STYLE_KEY) || 'chinhluan'; } catch { return 'chinhluan'; }
  });
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState(() => {
    const saved = loadChatSession();
    return Array.isArray(saved?.messages) ? saved.messages.filter(m => !m.pending) : [];
  });
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
    loadTrends(trendWindow);
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    try {
      const toSave = messages.filter(m => !m.pending);
      if (toSave.length === 0) {
        sessionStorage.removeItem(CHAT_SESSION_KEY);
      } else {
        sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify({ messages: toSave, mode }));
      }
    } catch {}
  }, [messages, mode]);

  const updateAssistantMessage = (id, patch) => {
    setMessages(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const loadTrends = async (windowDays) => {
    setTrendsLoading(true);
    try {
      const res = await getTrends({ accessCode: ACCESS_CODE, windowDays });
      if (res.success !== false) setTrends(res.data || res);
    } catch {
      setTrends(null);
    } finally {
      setTrendsLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryMsg('');
    try {
      const res = await getTroLy35History({ accessCode: ACCESS_CODE, limit: HISTORY_LIMIT });
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
        accessCode: ACCESS_CODE,
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
      loadTrends(trendWindow);
      loadHistory();
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

    const content = question.trim();
    const selectedMode = getMode(mode).value;
    const isFollowUp = messages.some(m => m.role === 'assistant' && !m.pending && !m.error);
    const history = messages
      .filter(m => !m.pending && !m.error && m.text)
      .slice(-CHAT_HISTORY_TURNS)
      .map(m => ({ role: m.role, text: m.text }));

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
      const res = await runTroLy35({ accessCode: ACCESS_CODE, mode: selectedMode, content, style, history });
      if (!res.success) throw new Error(res.error || 'Không xử lý được yêu cầu.');

      const answer = formatAnswer(selectedMode, res);
      setMessages(prev => prev.map(item =>
        item.id === assistantMessage.id
          ? { ...item, text: answer, pending: false, requestId: res.requestId, responseRaw: res.result || {}, analysis: res.analysis || {}, knowledge: res.knowledge || [] }
          : item
      ));
      loadTrends(trendWindow);
      loadHistory();
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
        <h1>Trợ lý 35</h1>
        <p>Hỏi đáp nhanh, hỗ trợ xử lý thông tin</p>
      </div>

      <div className="card elevated t35-card t35-chat-card">
        <div className="row t35-card-head">
          <div className="row">
            <div className="chip red"><MessageSquareText size={14} /></div>
            <span className="t35-card-title">{activeMode.label}</span>
          </div>
        </div>

        <div className="t35-grid-3 t35-mode-grid">
          {MODES.map(item => (
            <button
              key={item.value}
              type="button"
              className={`btn sm t35-mode-btn ${mode === item.value ? 'primary' : 'ghost'}`}
              onClick={() => setMode(item.value)}
              disabled={loading}
            >
              {item.shortLabel}
            </button>
          ))}
        </div>

        {mode === 'rebuttal' && (
          <div className="t35-style-block">
            <span className="text-xs t35-style-label">Phong cách trả lời</span>
            <div className="t35-grid-3">
              {STYLES.map(item => (
                <button
                  key={item.value}
                  type="button"
                  className={`btn sm t35-style-btn ${style === item.value ? 'primary' : 'ghost'}`}
                  onClick={() => chooseStyle(item.value)}
                  disabled={loading}
                  title={item.hint}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-label="Hội thoại với Trợ lý 35"
          className="t35-chat-log"
        >
          {messages.length === 0 ? (
            <div className="empty t35-empty">
              <img src={logo35} alt="Trợ lý 35" className="t35-empty-logo" />
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

        <form onSubmit={sendQuestion} className="t35-compose">
          <textarea
            className="field t35-compose-input"
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
          />
          <div className="t35-compose-actions">
            <button type="submit" className="btn primary t35-compose-send" disabled={loading}>
              {loading ? <><RefreshCw size={15} className="spinner" /> Đang trả lời...</> : <><Send size={15} /> Gửi câu hỏi</>}
            </button>
            <button type="button" className="btn ghost sm" onClick={clearChat} disabled={loading && messages.length === 0} aria-label="Xóa hội thoại">
              <Trash2 size={15} />
            </button>
          </div>
          {runMsg && <div className={`msg ${runMsgType}`}>{runMsg}</div>}
        </form>
      </div>

      <div className="card tinted t35-card">
        <div className="row t35-card-head">
          <div className="row">
            <div className="chip"><Clock3 size={14} /></div>
            <span className="t35-card-title">Lịch sử</span>
          </div>
          <button
            type="button"
            className="btn ghost sm t35-icon-btn"
            aria-label="Tải lại lịch sử"
            onClick={() => loadHistory()}
            disabled={historyLoading}
          >
            {historyLoading ? <RefreshCw size={13} className="spinner" /> : <RefreshCw size={13} />}
          </button>
        </div>

        {historyLoading && <div className="empty t35-empty-pad"><RefreshCw size={16} className="spinner" /></div>}
        {!historyLoading && historyMsg && <div className="msg error">{historyMsg}</div>}
        {!historyLoading && !historyMsg && history.length === 0 && (
          <div className="empty t35-empty-pad">Chưa có lịch sử hội thoại.</div>
        )}
        {!historyLoading && history.map(item => (
          <button
            key={item.requestId}
            type="button"
            onClick={() => openHistoryItem(item)}
            className="t35-history-item"
          >
            <div className="row t35-history-meta">
              <span className="text-xs text-mute">{formatDate(item.timestamp)} · {getMode(item.mode).shortLabel}</span>
              {item.ratingStatus && (
                <span className={`pill t35-history-pill ${item.ratingStatus === 'good' ? 'ok' : ''}`}>
                  {item.ratingStatus === 'good' ? 'Tốt' : 'Xấu'}
                </span>
              )}
            </div>
            <div className="text-sm t35-history-preview">
              {item.inputPreview || item.topic || item.requestId}
            </div>
          </button>
        ))}
      </div>

      <div className="card tinted t35-card last">
        <div className="row t35-card-head">
          <div className="row">
            <div className="chip"><TrendingUp size={14} /></div>
            <span className="t35-card-title">Xu hướng</span>
          </div>
          <div className="t35-trend-btns">
            {[7, 30].map(w => (
              <button
                key={w}
                onClick={() => { setTrendWindow(w); loadTrends(w); }}
                className={`btn sm t35-trend-btn ${trendWindow === w ? 'primary' : 'ghost'}`}
              >
                {w} ngày
              </button>
            ))}
          </div>
        </div>

        {trendsLoading && <div className="empty t35-empty-pad"><RefreshCw size={16} className="spinner" /></div>}
        {!trendsLoading && !trends && <div className="empty t35-empty-pad">Chưa có dữ liệu thống kê.</div>}
        {trends && (
          <>
            <div className="t35-stat-grid">
              {[
                { label: 'Lượt', value: Number(trends.totalRequests || 0).toLocaleString('vi-VN') },
                { label: 'Nguy hiểm TB', value: trends.averageDangerLevel || 0 },
                { label: 'Tốt', value: `${trends.goodRatingRate || 0}%` },
              ].map(s => (
                <div key={s.label} className="t35-stat">
                  <div className="t35-stat-value">{s.value}</div>
                  <div className="text-xs text-mute">{s.label}</div>
                </div>
              ))}
            </div>
            {Array.isArray(trends.topTopics) && trends.topTopics.map((t, i) => (
              <div key={i} className="row t35-trend-row">
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
