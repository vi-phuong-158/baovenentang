import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { getQuiz, getQuizTopics } from '../api.js';

export default function Quiz({ embedded = false }) {
  const [topics, setTopics] = useState([]);
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [screen, setScreen] = useState('start');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getQuizTopics().then(data => {
      if (cancelled) return;
      if (!Array.isArray(data)) throw new Error('Chưa tải được danh sách chuyên đề.');
      setTopics(data);
      setTopic(data[0] || '');
    }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const start = async () => {
    if (!topic || loading) return;
    setLoading(true); setError('');
    try {
      const data = await getQuiz(10, topic);
      if (!Array.isArray(data) || !data.length) throw new Error('Chuyên đề chưa có câu hỏi đã duyệt.');
      if (data.some(q => q.category !== topic)) throw new Error('Bộ câu hỏi không khớp chuyên đề.');
      setQuestions(data); setAnswers([]); setIndex(0); setPicked(null); setScreen('question');
    } catch (e) { setError(e.message || 'Không tải được câu hỏi.'); }
    finally { setLoading(false); }
  };

  const next = () => {
    if (picked === null) return;
    const question = questions[index];
    setAnswers(previous => [...previous, { ...question, picked, isCorrect: picked === question.correct }]);
    if (index + 1 === questions.length) setScreen('result');
    else setIndex(previous => previous + 1);
    setPicked(null);
  };
  const current = questions[index];
  const score = answers.filter(a => a.isCorrect).length;
  return (
    <div className={embedded ? 'quiz-embedded' : 'page page-fade'}>
      <div className={embedded ? 'quiz-embedded-header' : 'page-header'}>
        <h1>Tự học theo chuyên đề</h1>
        <p>Kết quả tham khảo trên thiết bị, không lưu và không dùng đánh giá cán bộ.</p>
      </div>
      {error && <div role="alert" className="msg error">{error}</div>}
      {screen === 'start' && <div className="card elevated">
        <label htmlFor="quiz-topic">Chuyên đề đã duyệt</label>
        <select id="quiz-topic" className="field" value={topic} onChange={e => setTopic(e.target.value)} disabled={loading}>
          {!topics.length && <option value="">Chưa có chuyên đề đã duyệt</option>}
          {topics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <p>Tối đa 10 câu. Xem đáp án, giải thích và nguồn sau mỗi câu.</p>
        <button className="btn primary full" onClick={start} disabled={!topic || loading}>
          {loading ? <><RefreshCw size={16} className="spinner" /> Đang tải</> : 'Bắt đầu tự học'}
        </button>
      </div>}
      {screen === 'question' && current && <>
        <div className="card elevated"><p>{topic} · Câu {index + 1}/{questions.length}</p><h2>{current.question}</h2></div>
        <div className="col">
          {Object.entries(current.options).map(([key, text]) => <button key={key} className={`btn full ${picked === key ? 'primary' : 'ghost'}`} disabled={picked !== null} onClick={() => setPicked(key)}>{key}. {text}</button>)}
        </div>
        {picked !== null && <div className="card" aria-live="polite">
          <p>{picked === current.correct ? 'Đúng.' : 'Chưa đúng.'} Đáp án: {current.correct}.</p>
          <p>{current.explanation}</p><p className="text-sm">Nguồn: {current.source}</p>
          <button className="btn primary full" onClick={next}>{index + 1 === questions.length ? 'Xem kết quả' : 'Câu tiếp theo'}</button>
        </div>}
      </>}
      {screen === 'result' && <>
        <div className="card elevated"><h2>Đúng {score}/{questions.length} câu ({Math.round(score / questions.length * 100)}%)</h2>
          <p>Kết quả chỉ phục vụ tự học, không xác nhận danh tính hoặc kết quả chính thức.</p>
          <button className="btn primary full" onClick={() => { setScreen('start'); setQuestions([]); setAnswers([]); }}>Chọn chuyên đề</button>
        </div>
        {answers.map((a, i) => <div key={`${a.id}-${i}`} className="card">
          <div className="row">{a.isCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}<strong>{a.question}</strong></div>
          <p>Bạn chọn {a.picked}; đáp án {a.correct}.</p><p>{a.explanation}</p><p className="text-sm">Nguồn: {a.source}</p>
        </div>)}
      </>}
    </div>
  );
}
