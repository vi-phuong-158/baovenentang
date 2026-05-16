import { useState } from 'react';
import { Search, BookOpen, RefreshCw } from 'lucide-react';
import { getRebuttals } from '../api.js';

const SUGGESTED = ['Nhân quyền', 'Tự do ngôn luận', 'Chủ quyền biển đảo', 'Kinh tế thị trường', 'Diễn biến hòa bình'];

function RebuttalCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
        {item.topic}
      </div>
      {item.wrongClaim && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(184,50,39,.15)', borderRadius: 10, padding: '8px 12px', marginBottom: 8 }}>
          <span className="text-xs" style={{ color: 'var(--red)', fontWeight: 600 }}>Luận điệu sai trái: </span>
          <span className="text-sm" style={{ color: 'var(--red)' }}>{item.wrongClaim}</span>
        </div>
      )}
      <div className="text-sm text-soft" style={{ lineHeight: 1.6 }}>
        {expanded ? item.rebuttal : (item.rebuttal || '').slice(0, 160) + (item.rebuttal?.length > 160 ? '…' : '')}
      </div>
      {item.rebuttal?.length > 160 && (
        <button onClick={() => setExpanded(e => !e)}
          className="text-xs" style={{ color: 'var(--red)', marginTop: 6, cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font-body)' }}>
          {expanded ? 'Thu gọn ↑' : 'Xem đầy đủ ↓'}
        </button>
      )}
      {item.evidence && expanded && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--line-soft)', paddingTop: 10 }}>
          <div className="text-xs text-mute" style={{ marginBottom: 4, fontWeight: 600 }}>Dẫn chứng</div>
          <div className="text-sm text-soft">{item.evidence}</div>
        </div>
      )}
    </div>
  );
}

export default function ThuVien() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const search = async (kw) => {
    const q = (kw ?? keyword).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const res = await getRebuttals(q);
      setResults(Array.isArray(res) ? res : []);
    } catch {
      setError('Không tìm được. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-fade">
      <div className="page-header">
        <h1>Thư viện phản bác</h1>
        <p>Tra cứu luận điểm đúng đắn để phản bác thông tin sai trái</p>
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-mute)', pointerEvents: 'none' }} />
        <input className="field" value={keyword} onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Tìm theo chủ đề, luận điểm..."
          style={{ paddingLeft: 38 }} />
      </div>

      <button className="btn primary full" onClick={() => search()} disabled={loading || !keyword.trim()} style={{ marginBottom: 16 }}>
        {loading ? <><RefreshCw size={16} className="spinner" /> Đang tìm...</> : <><Search size={16} /> Tra cứu</>}
      </button>

      <div className="section-label">Chủ đề phổ biến</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {SUGGESTED.map(s => (
          <button key={s} onClick={() => { setKeyword(s); search(s); }}
            className="pill" style={{ cursor: 'pointer', border: '1px solid var(--line)' }}>
            {s}
          </button>
        ))}
      </div>

      {error && <div className="msg error">{error}</div>}

      {searched && !loading && results.length === 0 && !error && (
        <div className="empty"><BookOpen size={28} style={{ marginBottom: 8 }} /><br />Không tìm thấy kết quả.</div>
      )}

      {results.map((item, i) => <RebuttalCard key={i} item={item} />)}
    </div>
  );
}
