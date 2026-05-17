import { useEffect, useState, useMemo } from 'react';
import { Bell, CheckCircle, ExternalLink, Newspaper, RefreshCw, Search, Send, Users, BookOpen, X } from 'lucide-react';
import { getArticles, getStats, invalidateCache, searchArticles, subscribe } from '../api.js';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

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
const PAGE_LIMIT = 20;

const SIGNUP_TOPICS = [
  'Bảo vệ nền tảng tư tưởng',
  'An ninh mạng',
  'Chính sách pháp luật',
  'Phòng chống tham nhũng',
  'Đối ngoại - Chủ quyền',
];

const TELEGRAM_CHANNEL_URL = 'https://t.me/baovenentang';

function normalizePagedResponse(res) {
  if (Array.isArray(res)) return { items: res, total: res.length, page: 1, hasMore: false };
  return {
    items: Array.isArray(res?.data) ? res.data : [],
    total: Number(res?.total) || 0,
    page: Number(res?.page) || 1,
    hasMore: !!res?.hasMore,
  };
}

export default function TinTuc() {
  const [news, setNews] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);

  const [days, setDays] = useState(7);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [onlyImportant, setOnlyImportant] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signupForm, setSignupForm] = useState({ name: '', email: '', organization: '', topics: '', channel: 'Email' });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupError, setSignupError] = useState('');

  const debouncedSearch = useDebounce(search, 400);
  const isSearchMode = debouncedSearch.trim().length > 0;

  const load = async (d = days, forceRefresh = false) => {
    if (forceRefresh) {
      invalidateCache();
      invalidateCache('stats');
    }
    setLoading(true);
    setError('');
    try {
      const [newsRes, statsRes] = await Promise.all([getArticles(d, 1, PAGE_LIMIT), getStats()]);
      const paged = normalizePagedResponse(newsRes);
      setNews(paged.items);
      setPage(paged.page);
      setHasMore(paged.hasMore);
      setTotal(paged.total);
      setStats(statsRes);
    } catch {
      setError('Không tải được dữ liệu. Thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(days); }, [days]);

  useEffect(() => {
    const q = debouncedSearch.trim();
    if (!q) {
      setSearchResults([]);
      setSearchPage(1);
      setSearchHasMore(false);
      setSearchTotal(0);
      return;
    }
    setSearchLoading(true);
    searchArticles(q, 1, PAGE_LIMIT)
      .then(res => {
        const paged = normalizePagedResponse(res);
        setSearchResults(paged.items);
        setSearchPage(paged.page);
        setSearchHasMore(paged.hasMore);
        setSearchTotal(paged.total);
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, [debouncedSearch]);

  useEffect(() => { setCategory(''); }, [isSearchMode]);

  const baseList = isSearchMode ? searchResults : news;

  const categories = useMemo(() => {
    const cats = baseList.map(a => a.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [baseList]);

  const filtered = useMemo(() => {
    return baseList.filter(a => {
      if (onlyImportant && a.priority !== 'Quan trọng' && a.priority !== 1) return false;
      if (category && a.category !== category) return false;
      return true;
    });
  }, [baseList, category, onlyImportant]);

  const isLoading = isSearchMode ? searchLoading : loading;
  const canLoadMore = isSearchMode ? searchHasMore : hasMore;
  const hasFilter = category || onlyImportant;
  const clearFilters = () => { setCategory(''); setOnlyImportant(false); };

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      if (isSearchMode) {
        const paged = normalizePagedResponse(await searchArticles(debouncedSearch.trim(), searchPage + 1, PAGE_LIMIT));
        setSearchResults(prev => prev.concat(paged.items));
        setSearchPage(paged.page);
        setSearchHasMore(paged.hasMore);
        setSearchTotal(paged.total);
      } else {
        const paged = normalizePagedResponse(await getArticles(days, page + 1, PAGE_LIMIT));
        setNews(prev => prev.concat(paged.items));
        setPage(paged.page);
        setHasMore(paged.hasMore);
        setTotal(paged.total);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const setSignupField = (key, value) => setSignupForm(f => ({ ...f, [key]: value }));

  const selectSignupChannel = (channel) => {
    setSignupField('channel', channel);
    if (channel === 'Telegram') {
      window.open(TELEGRAM_CHANNEL_URL, '_blank', 'noopener,noreferrer');
    }
  };

  const resetSignup = () => {
    setSignupForm({ name: '', email: '', organization: '', topics: '', channel: 'Email' });
    setSignupError('');
    setSignupSuccess(false);
  };

  const submitSignup = async (e) => {
    e.preventDefault();
    if (!signupForm.name.trim() || !signupForm.email.trim() || !signupForm.topics) {
      setSignupError('Vui lòng điền đầy đủ họ tên, email và chủ đề.');
      return;
    }
    setSignupLoading(true);
    setSignupError('');
    try {
      const res = await subscribe(signupForm);
      if (res.success === false) throw new Error(res.error || 'Có lỗi xảy ra.');
      setSignupSuccess(true);
      invalidateCache('stats');
      load(days, true);
    } catch (err) {
      setSignupError(err.message || 'Không đăng ký được. Thử lại sau.');
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="page page-fade">
      {/* Header */}
      <div className="page-header">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Bản tin</h1>
            <p>Tổng hợp từ nguồn chính thống</p>
          </div>
          <button
            onClick={() => load(days, true)}
            disabled={loading || isSearchMode}
            style={{
              background: 'rgba(255,255,255,.15)',
              border: '1px solid rgba(255,255,255,.3)',
              borderRadius: 10,
              padding: '8px 10px',
              color: '#fff',
              cursor: isSearchMode ? 'default' : 'pointer',
              opacity: isSearchMode ? .4 : 1,
            }}
          >
            <RefreshCw size={16} className={loading ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && !isSearchMode && (
        <div className="card tinted" style={{ marginBottom: 14 }}>
          <div className="section-label">Thống kê</div>
          <div className="row" style={{ justifyContent: 'space-around' }}>
            <StatItem icon={Newspaper} value={stats.totalArticles || 0} label="Bài viết" />
            <StatItem icon={Users} value={stats.totalSubscribers || 0} label="Đăng ký" />
            <StatItem icon={BookOpen} value={stats.totalQuizAttempts || 0} label="Lượt quiz" />
          </div>
        </div>
      )}

      {/* Inline signup block */}
      {!isSearchMode && (
        <div className={`card ${showSignup ? 'elevated' : 'tinted'}`} style={{ marginBottom: 14 }}>
          {/* Collapsed state */}
          {!showSignup && (
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div className="row" style={{ gap: 10 }}>
                <div className="chip red"><Bell size={16} /></div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>Theo dõi bản tin</div>
                  <div className="text-sm text-soft">Nhận tin chọn lọc qua Email hoặc Telegram.</div>
                </div>
              </div>
              <button className="btn primary sm" onClick={() => setShowSignup(true)} style={{ flexShrink: 0 }}>
                Đăng ký
              </button>
            </div>
          )}

          {/* Success state */}
          {showSignup && signupSuccess && (
            <div style={{ textAlign: 'center', padding: '12px 4px' }}>
              <CheckCircle size={36} color="var(--ok)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Đăng ký thành công!</div>
              <div className="text-sm text-soft" style={{ marginBottom: 14 }}>
                Bạn sẽ nhận bản tin qua <strong>{signupForm.channel}</strong>.
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn ghost full" onClick={resetSignup}>Đăng ký thêm</button>
                <button className="btn primary full" onClick={() => setShowSignup(false)}>Xong</button>
              </div>
            </div>
          )}

          {/* Form expanded */}
          {showSignup && !signupSuccess && (
            <form onSubmit={submitSignup}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="row" style={{ gap: 8 }}>
                  <div className="chip red"><Bell size={15} /></div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>Đăng ký bản tin</span>
                </div>
                <button type="button" onClick={() => setShowSignup(false)} style={{ color: 'var(--ink-mute)', display: 'flex' }} aria-label="Đóng">
                  <X size={18} />
                </button>
              </div>

              <div className="field-group">
                <label className="field-label">Họ và tên *</label>
                <input className="field" value={signupForm.name} onChange={e => setSignupField('name', e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className="field-group">
                <label className="field-label">Email *</label>
                <input className="field" type="email" value={signupForm.email} onChange={e => setSignupField('email', e.target.value)} placeholder="email@domain.vn" />
              </div>
              <div className="field-group">
                <label className="field-label">Đơn vị công tác</label>
                <input className="field" value={signupForm.organization} onChange={e => setSignupField('organization', e.target.value)} placeholder="PA01 - Công an tỉnh Phú Thọ" />
              </div>

              <div className="section-label" style={{ marginTop: 4 }}>Chủ đề quan tâm *</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {SIGNUP_TOPICS.map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setSignupField('topics', topic)}
                    className="pill"
                    style={{
                      cursor: 'pointer',
                      background: signupForm.topics === topic ? 'var(--red-soft)' : 'var(--surface)',
                      color: signupForm.topics === topic ? 'var(--red)' : 'var(--ink-soft)',
                      border: `1.5px solid ${signupForm.topics === topic ? 'var(--red)' : 'var(--line)'}`,
                      fontWeight: signupForm.topics === topic ? 700 : 500,
                    }}
                  >
                    {topic}
                  </button>
                ))}
              </div>

              <div className="row" style={{ gap: 8, marginBottom: 12 }}>
                {['Email', 'Telegram'].map(channel => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => selectSignupChannel(channel)}
                    className={`btn ${signupForm.channel === channel ? 'primary' : 'ghost'} sm`}
                    style={{ flex: 1 }}
                  >
                    {channel === 'Email' ? '📧' : '💬'} {channel}
                  </button>
                ))}
              </div>

              {signupError && <div className="msg error" style={{ marginBottom: 12 }}>{signupError}</div>}

              <button type="submit" className="btn primary full" disabled={signupLoading}>
                {signupLoading ? 'Đang đăng ký...' : <><Send size={15} /> Đăng ký nhận bản tin</>}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Khoảng thời gian */}
      {!isSearchMode && (
        <div className="row" style={{ gap: 6, marginBottom: 12 }}>
          {DAY_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setDays(opt.value)}
              className={`btn ${days === opt.value ? 'primary' : 'ghost'} sm`}
              style={{ flex: 1 }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Tìm kiếm */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-mute)', pointerEvents: 'none' }} />
        <input
          className="field"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm trong toàn bộ bản tin..."
          style={{ paddingLeft: 36, paddingRight: search ? 36 : 12 }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex' }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Search mode label */}
      {isSearchMode && (
        <div className="text-xs text-mute" style={{ marginBottom: 10, paddingLeft: 2 }}>
          🔍 Đang tìm kiếm toàn bộ dữ liệu
        </div>
      )}

      {/* Category filters */}
      {(categories.length > 0 || !isLoading) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          <button onClick={() => setCategory('')} className="pill"
            style={{ cursor: 'pointer', background: !category ? 'var(--ink)' : 'var(--surface)', color: !category ? '#fff' : 'var(--ink-soft)', border: `1.5px solid ${!category ? 'var(--ink)' : 'var(--line)'}`, transition: 'all .15s' }}>
            Tất cả
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(c => c === cat ? '' : cat)} className="pill"
              style={{ cursor: 'pointer', background: category === cat ? 'var(--red)' : 'var(--surface)', color: category === cat ? '#fff' : 'var(--ink-soft)', border: `1.5px solid ${category === cat ? 'var(--red)' : 'var(--line)'}`, transition: 'all .15s' }}>
              {cat}
            </button>
          ))}
          <button onClick={() => setOnlyImportant(v => !v)} className="pill"
            style={{ cursor: 'pointer', background: onlyImportant ? 'var(--red-soft)' : 'var(--surface)', color: onlyImportant ? 'var(--red)' : 'var(--ink-soft)', border: `1.5px solid ${onlyImportant ? 'var(--red)' : 'var(--line)'}`, transition: 'all .15s', fontWeight: onlyImportant ? 600 : 500 }}>
            🔴 Quan trọng
          </button>
        </div>
      )}

      {/* Count + clear */}
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>
          {isLoading
            ? (isSearchMode ? 'Đang tìm...' : 'Đang tải...')
            : `${filtered.length} bài${baseList.length !== filtered.length ? ` / ${baseList.length}` : ''}${(isSearchMode ? searchTotal : total) ? ` / ${isSearchMode ? searchTotal : total} tổng` : ''}`
          }
        </div>
        {hasFilter && (
          <button onClick={clearFilters}
            className="text-xs row" style={{ color: 'var(--red)', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <X size={12} /> Xóa bộ lọc
          </button>
        )}
      </div>

      {isLoading && (
        <div className="empty"><RefreshCw size={24} className="spinner" style={{ marginBottom: 8 }} /><br />{isSearchMode ? 'Đang tìm...' : 'Đang tải...'}</div>
      )}
      {error && !isSearchMode && <div className="msg error">{error}</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="empty">
          {isSearchMode
            ? `Không tìm thấy bài nào khớp "${debouncedSearch}".`
            : (hasFilter ? 'Không có bài nào khớp bộ lọc.' : 'Chưa có bản tin trong khoảng thời gian này.')
          }
        </div>
      )}
      {filtered.map((a, i) => <NewsCard key={i} article={a} />)}
      {!isLoading && canLoadMore && !hasFilter && (
        <button className="btn ghost full" onClick={loadMore} disabled={loadingMore} style={{ marginTop: 8 }}>
          {loadingMore ? <><RefreshCw size={16} className="spinner" /> Đang tải...</> : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}
