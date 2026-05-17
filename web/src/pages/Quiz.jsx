import { useState } from 'react';
import { Target, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { getQuiz, submitQuiz } from '../api.js';

const TOTAL = 10;
const QUIZ_TITLE = 'Kiểm tra nhận thức về Nghị quyết Đại hội Đảng toàn quốc lần thứ XIV';

export default function Quiz() {
  const [screen, setScreen] = useState('start'); // start | question | result
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [picked, setPicked] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const score = answers.filter(a => a.correct).length;

  const start = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getQuiz(TOTAL);
      const qs = Array.isArray(res) ? res : [];
      if (qs.length === 0) throw new Error('Không có câu hỏi.');
      setQuestions(qs);
      setIndex(0);
      setAnswers([]);
      setPicked(null);
      setScreen('question');
    } catch (e) {
      setError(e.message || 'Không tải được quiz.');
    } finally {
      setLoading(false);
    }
  };

  const select = (opt) => {
    if (picked !== null) return;
    const q = questions[index];
    const correct = opt === q.correct;
    setPicked(opt);
    const newAnswers = [...answers, { question: q.question, answer: opt, correct }];

    setTimeout(() => {
      if (index + 1 < questions.length) {
        setAnswers(newAnswers);
        setIndex(i => i + 1);
        setPicked(null);
      } else {
        setAnswers(newAnswers);
        setScreen('result');
        submitQuiz({ user: 'Khách', score: newAnswers.filter(a => a.correct).length, total: TOTAL, percentage: Math.round(newAnswers.filter(a => a.correct).length / TOTAL * 100) }).catch(() => {});
      }
    }, 900);
  };

  const q = questions[index];

  if (screen === 'start') return (
    <div className="page page-fade">
      <div className="page-header">
        <h1>{QUIZ_TITLE}</h1>
        <p>{TOTAL} câu hỏi ôn tập trọng tâm</p>
      </div>
      <div className="card elevated" style={{ textAlign: 'center', padding: '28px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, marginBottom: 6 }}>Nghị quyết Đại hội XIV</div>
        <div className="text-sm text-soft" style={{ marginBottom: 20 }}>{TOTAL} câu · ~3 phút · kết quả lưu tự động</div>
        <button className="btn primary full" onClick={start} disabled={loading}>
          {loading ? <><RefreshCw size={16} className="spinner" /> Đang tải...</> : '▶ Bắt đầu'}
        </button>
      </div>
      {error && <div className="msg error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );

  if (screen === 'result') {
    const pct = Math.round(score / TOTAL * 100);
    const msg = pct >= 80 ? '🎉 Xuất sắc!' : pct >= 60 ? '👍 Tốt!' : '📚 Cần ôn thêm';
    return (
      <div className="page page-fade">
        <div className="page-header">
          <h1>Kết quả</h1>
        </div>
        <div className="card elevated" style={{ textAlign: 'center', padding: '28px 20px', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 800, color: 'var(--red)', letterSpacing: '-1px' }}>{pct}%</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{msg}</div>
          <div className="text-sm text-soft" style={{ marginBottom: 20 }}>Đúng {score}/{TOTAL} câu</div>
          <button className="btn primary full" onClick={start}>Làm lại</button>
        </div>
        <div className="section-label">Chi tiết</div>
        {answers.map((a, i) => (
          <div key={i} className="card" style={{ marginBottom: 8 }}>
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              {a.correct
                ? <CheckCircle size={18} color="var(--ok)" style={{ flexShrink: 0, marginTop: 2 }} />
                : <XCircle size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />}
              <div>
                <div className="text-sm" style={{ fontWeight: 600, marginBottom: 2 }}>{a.question}</div>
                <div className="text-xs text-soft">Bạn chọn: {a.answer}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Question screen
  const opts = Object.entries(q.options || {});
  return (
    <div className="page page-fade">
      <div className="page-header" style={{ paddingBottom: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,.8)' }}>Câu {index + 1} / {TOTAL}</span>
          <span className="text-xs mono" style={{ color: 'rgba(255,255,255,.8)' }}>{score} đúng</span>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i < index ? 'rgba(255,255,255,.9)' : i === index ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.2)',
              transition: 'background .3s',
            }} />
          ))}
        </div>
      </div>

      <div className="card elevated" style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, lineHeight: 1.4 }}>
          {q.question}
        </div>
      </div>

      <div className="col" style={{ gap: 8 }}>
        {opts.map(([key, text]) => {
          let bg = 'var(--surface)';
          let border = '1.5px solid var(--line)';
          let color = 'var(--ink)';
          if (picked !== null) {
            if (key === q.correct) { bg = 'var(--ok-soft)'; border = '1.5px solid var(--ok)'; color = 'var(--ok)'; }
            else if (key === picked) { bg = 'var(--red-soft)'; border = '1.5px solid var(--red)'; color = 'var(--red)'; }
          }
          return (
            <button key={key} onClick={() => select(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 14, border, background: bg, color, fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, cursor: picked ? 'default' : 'pointer', transition: 'all .2s', textAlign: 'left', width: '100%' }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{key}</span>
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
