import { useEffect, useState, useMemo } from 'react';
import { RefreshCw, ExternalLink, Newspaper, Users, BookOpen, Search, X } from 'lucide-react';
import { getArticles, getStats, invalidateCache } from '../api.js';

function useAnimatedCounter(target, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

function StatItem({ icon: Icon, value, label }) {
  const animated = useAnimatedCounter(value);
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
        <div className="chip red"><Icon size={16} /></div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--red)', letterSpacing: '-.5px' }}>
        {animated.toLocaleString('vi-VN')}
      </div>
      <div className="text-xs text-mute">{label}</div>
    </div>
  );
}

function NewsCard({ article }) {
  const isImportant = article.priority === 'Quan trọng' || article.priority === 1;
  const date = article.date
    ? new Date(article.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="row" style={{ marginBottom: 8, justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <span className={`pill ${isImportant ? 'red' : 'yellow'}`}>
          {isImportant ? '🔴 Quan trọng' : '📰 Bản tin'}
        </span>
        <span className="text-xs mono text-mute">{article.source || ''} · {date}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, lineHeight: 1.3, marginBottom: 6 }}>
        {article.title}
      </div>
      {article.summary && (
        <p className="text-sm text-soft" style={{ lineHeight: 1.5, marginBottom: 8 }}>
          {article.summary}
        </p>
      )}
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="pill">{article.category || 'Tin tức'}</span>
        {article.link && (
          <a href={article.link} target="_blank" rel="noreferrer"
            className="row text-xs" style={{ color: 'var(--red)', gap: 3 }}>
            Đọc thêm <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

const DAY_OPTIONS = [
  { label: 'Hôm nay', value: 1 },
  { label: '7 ngày', value: 7 },
  { label: '30 ngày', value: 30 },
];

export default function TinTuc() {
  const [news, setNews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [days, setDays] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [onlyImportant, setOnlyImportant] = useState(false);

  const load = async (d = days, forceRefresh = false) => {
    if (forceRefresh) {
      invalidateCache(`articles-${d}`);
      invalidateCache('stats');
    }
    setLoading(true);
    setError('');
    try {
      const [newsRes, statsRes] = await Promise.all([getArticles(d), getStats()]);
      setNews(Array.isArray(newsRes) ? newsRes : []);
      setStats(statsRes);
    } catch {
      setError('Không tải được dữ liệu. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(days); }, [days]);

  const categories = useMemo(() => {
    const cats = news.map(a => a.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [news]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return news.filter(a => {
      if (onlyImportant && a.priority !== 'Quan trọng' && a.priority !== 1) return false;
      if (category && a.category !== category) return false;
      if (q && !(
        (a.title || '').toLowerCase().includes(q) ||
        (a.summary || '').toLowerCase().includes(q) ||
        (a.source || '').toLowerCase().includes(q) ||
        (a.keywords || '').toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [news, search, category, onlyImportant]);

  const hasFilter = search || category || onlyImportant;

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setOnlyImportant(false);
  };

  return (
    <div className="page page-fade">
      <div className="page-header">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="pill" style={{ background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', marginBottom: 8, fontSize: 11 }}>
              🛡️ TRỢ LÝ 35
            </div>
            <h1>Bản tin</h1>
            <p>Tổng hợp từ nguồn chính thống</p>
          </div>
          <button onClick={() => load(days, true)} disabled={loading}
            style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 10, padding: '8px 10px', color: '#fff', cursor: 'pointer' }}>
            <RefreshCw size={16} className={loading ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      {stats && (
        <div className="card tinted" style={{ marginBottom: 14 }}>
          <div className="section-label">Thống kê</div>
          <div className="row" style={{ justifyContent: 'space-around' }}>
            <StatItem icon={Newspaper} value={stats.totalArticles || 0} label="Bài viết" />
            <StatItem icon={Users} value={stats.totalSubscribers || 0} label="Đăng ký" />
            <StatItem icon={BookOpen} value={stats.totalQuizAttempts || 0} label="Lượt quiz" />
          </div>
        </div>
      )}

      {/* Khoảng thời gian */}
      <div className="row" style={{ gap: 6, marginBottom: 12 }}>
        {DAY_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setDays(opt.value)}
            className={`btn ${days === opt.value ? 'primary' : 'ghost'} sm`}
            style={{ flex: 1 }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Tìm kiếm */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-mute)', pointerEvents: 'none' }} />
        <input
          className="field"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm tiêu đề, tóm tắt, nguồn..."
          style={{ paddingLeft: 36, paddingRight: search ? 36 : 12 }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex' }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Lọc chuyên mục + ưu tiên */}
      {(categories.length > 0 || !loading) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          <button
            onClick={() => setCategory('')}
            className="pill"
            style={{ cursor: 'pointer', background: !category ? 'var(--ink)' : 'var(--surface)', color: !category ? '#fff' : 'var(--ink-soft)', border: `1.5px solid ${!category ? 'var(--ink)' : 'var(--line)'}`, transition: 'all .15s' }}>
            Tất cả
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(c => c === cat ? '' : cat)}
              className="pill"
              style={{ cursor: 'pointer', background: category === cat ? 'var(--red)' : 'var(--surface)', color: category === cat ? '#fff' : 'var(--ink-soft)', border: `1.5px solid ${category === cat ? 'var(--red)' : 'var(--line)'}`, transition: 'all .15s' }}>
              {cat}
            </button>
          ))}
          <button
            onClick={() => setOnlyImportant(v => !v)}
            className="pill"
            style={{ cursor: 'pointer', background: onlyImportant ? 'var(--red-soft)' : 'var(--surface)', color: onlyImportant ? 'var(--red)' : 'var(--ink-soft)', border: `1.5px solid ${onlyImportant ? 'var(--red)' : 'var(--line)'}`, transition: 'all .15s', fontWeight: onlyImportant ? 600 : 500 }}>
            🔴 Quan trọng
          </button>
        </div>
      )}

      {/* Đếm kết quả + clear */}
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>
          {loading ? 'Đang tải...' : `${filtered.length} bài${news.length !== filtered.length ? ` / ${news.length}` : ''}`}
        </div>
        {hasFilter && (
          <button onClick={clearFilters}
            className="text-xs row" style={{ color: 'var(--red)', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <X size={12} /> Xóa bộ lọc
          </button>
        )}
      </div>

      {loading && (
        <div className="empty"><RefreshCw size={24} className="spinner" style={{ marginBottom: 8 }} /><br />Đang tải...</div>
      )}
      {error && <div className="msg error">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="empty">
          {hasFilter ? 'Không có bài nào khớp bộ lọc.' : 'Chưa có bản tin trong khoảng thời gian này.'}
        </div>
      )}
      {filtered.map((a, i) => <NewsCard key={i} article={a} />)}
    </div>
  );
}
