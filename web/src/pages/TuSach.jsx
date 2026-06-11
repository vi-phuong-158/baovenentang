import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  ExternalLink,
  Headphones,
  Info,
  Network,
  Search,
  X,
} from 'lucide-react';
import { getBookById, getBooks } from '../api.js';

function splitMindMap(text) {
  return (text || '')
    .split('|')
    .map(item => item.trim())
    .filter(Boolean);
}

export default function TuSach({ embedded = false }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeBookId, setActiveBookId] = useState('');
  const [detailBook, setDetailBook] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    getBooks()
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setBooks(list);
        setActiveBookId(prev => prev || (list[0] && list[0].id) || '');
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Không tải được tủ sách.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const filteredBooks = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return books;
    return books.filter(book => [
      book.title,
      book.author,
      book.topic,
      book.summary,
    ].some(value => (value || '').toLowerCase().includes(text)));
  }, [books, query]);

  const activeBook = useMemo(
    () => books.find(book => book.id === activeBookId) || filteredBooks[0] || books[0] || null,
    [activeBookId, books, filteredBooks]
  );

  const openBook = async (book) => {
    setDetailLoading(true);
    setDetailBook(book);
    setActiveBookId(book.id);
    try {
      const fresh = await getBookById(book.id);
      setDetailBook(fresh);
    } catch {
      setDetailBook(book);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!detailBook) return undefined;
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [detailBook]);

  return (
    <section className={`${embedded ? 'tusach-embedded' : 'page page-fade'} tusach-page`}>
      {!embedded && (
        <header className="tusach-hero">
          <div>
            <p className="eyebrow">Học tập</p>
            <h1>Tủ sách số</h1>
            <p>Kho tài liệu nền tảng, nguồn chính thống và hỏi đáp AI theo từng cuốn.</p>
          </div>
          <div className="tusach-hero-mark" aria-hidden="true">
            <BookOpen size={30} />
          </div>
        </header>
      )}

      <section className="tusach-search" aria-label="Tìm kiếm sách">
        <Search size={18} />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Tìm theo tên, chủ đề, tác giả"
        />
      </section>

      {error && <div className="msg error">{error}</div>}

      <section className="tusach-grid" aria-label="Danh mục sách">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="tusach-book-card loading">
              <span />
              <strong />
              <p />
            </div>
          ))
        ) : filteredBooks.length === 0 ? (
          <div className="tusach-empty">
            <Info size={20} />
            <span>Không có tài liệu phù hợp.</span>
          </div>
        ) : (
          filteredBooks.map(book => {
            const selected = activeBook && activeBook.id === book.id;
            return (
              <button
                key={book.id}
                type="button"
                className={`tusach-book-card${selected ? ' selected' : ''}`}
                onClick={() => openBook(book)}
              >
                <span className="tusach-topic">{book.topic}</span>
                <strong>{book.title}</strong>
                <small>{book.author} · {book.year}</small>
                <p>{book.summary}</p>
              </button>
            );
          })
        )}
      </section>

      {detailBook && createPortal((
        <div className="tusach-modal-backdrop" role="presentation" onClick={() => setDetailBook(null)}>
          <article
            className="tusach-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tusach-detail-title"
            onClick={event => event.stopPropagation()}
          >
            <button className="tusach-close" type="button" onClick={() => setDetailBook(null)} aria-label="Đóng">
              <X size={20} />
            </button>

            <span className="tusach-topic">{detailBook.topic}</span>
            <h2 id="tusach-detail-title">{detailBook.title}</h2>
            <p className="tusach-meta">{detailBook.author} · {detailBook.year}</p>

            {detailLoading && <div className="tusach-detail-loading">Đang cập nhật dữ liệu...</div>}

            <div className="tusach-detail-block">
              <h3>Tóm tắt</h3>
              <p>{detailBook.summary}</p>
            </div>

            <div className="tusach-detail-block">
              <h3><Headphones size={17} /> Podcast</h3>
              <p>{detailBook.podcast}</p>
            </div>

            <div className="tusach-detail-block">
              <h3><Network size={17} /> Sơ đồ tư duy</h3>
              <div className="tusach-mindmap">
                {splitMindMap(detailBook.mindMap).map(node => <span key={node}>{node}</span>)}
              </div>
            </div>

            <div className="tusach-links">
              {detailBook.notebookUrl && (
                <a className="btn sm" href={detailBook.notebookUrl} target="_blank" rel="noreferrer">
                  <BookOpen size={16} />
                  <span>NotebookLM</span>
                </a>
              )}
              {detailBook.sourceUrl && (
                <a className="btn sm ghost" href={detailBook.sourceUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  <span>{detailBook.source || 'Nguồn'}</span>
                </a>
              )}
            </div>
          </article>
        </div>
      ), document.body)}
    </section>
  );
}
