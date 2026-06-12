import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  ExternalLink,
  FileText,
  Headphones,
  Images,
  Info,
  Network,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { getBookById, getBooks } from '../api.js';

const BOOK_COVERS = {
  'cam-nang-phong-chong-tin-gia': '/tusach-covers/cam-nang-phong-chong-tin-gia.jpg',
  'bao-ve-nen-tang-tu-tuong-cua-dang-trong-tinh-hinh-moi': '/tusach-covers/bao-ve-nen-tang-tu-tuong-cua-dang-trong-tinh-hinh-moi.jpg',
  'tang-cuong-xay-dung-dang-trong-cong-an-nhan-dan': '/tusach-covers/tang-cuong-xay-dung-dang-trong-cong-an-nhan-dan.jpg',
  'phat-huy-suc-manh-toan-dan-toc-bao-ve-an-ninh-quoc-gia': '/tusach-covers/phat-huy-suc-manh-toan-dan-toc-bao-ve-an-ninh-quoc-gia.jpg',
  'phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc': '/tusach-covers/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc.jpg',
};

const BOOK_MEDIA = {
  'phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc': [
    {
      type: 'mindmap',
      title: 'Sơ đồ tư duy: Phát huy truyền thống đại đoàn kết toàn dân tộc',
      thumb: '/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/thumbs/mind-map.webp',
      src: '/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/mind-map.webp',
      driveUrl: 'https://drive.google.com/file/d/1k72x3VdROr8F_6byrh_7W5dLOjqPuhdB/view?usp=drivesdk',
    },
    {
      type: 'illustration',
      title: 'Minh họa: Sức mạnh đại đoàn kết toàn dân tộc',
      thumb: '/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/thumbs/suc-manh-dai-doan-ket.webp',
      src: '/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/suc-manh-dai-doan-ket.webp',
      driveUrl: 'https://drive.google.com/file/d/1stAPFHJ-UTRGjKJtqXjoHYr3kZLUYVeK/view?usp=drivesdk',
    },
    {
      type: 'illustration',
      title: 'Minh họa: Đại đoàn kết và khát vọng Việt Nam 2045',
      thumb: '/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/thumbs/dai-doan-ket-2045.webp',
      src: '/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/dai-doan-ket-2045.webp',
      driveUrl: 'https://drive.google.com/file/d/1llSXEBEFZNRWeuDg-w0KCmzbz4Rfm9RY/view?usp=drivesdk',
    },
  ],
};

const BOOK_AUDIOS = {
  'phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc': '/tusach-media/phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc/podcast.m4a',
};

const FEATURED_BOOK_ID = 'phat-huy-truyen-thong-dai-doan-ket-toan-dan-toc';

function getBookCover(book) {
  return book && BOOK_COVERS[book.id] ? BOOK_COVERS[book.id] : '';
}

function getBookMedia(book) {
  return book && BOOK_MEDIA[book.id] ? BOOK_MEDIA[book.id] : [];
}

function getBookAudio(book) {
  return book && BOOK_AUDIOS[book.id] ? BOOK_AUDIOS[book.id] : '';
}

function splitMindMap(text) {
  const nodes = (text || '')
    .split('|')
    .flatMap(item => item.split('->'))
    .map(item => item.trim())
    .filter(Boolean);
  return [...new Set(nodes)];
}

function getMindMapParts(book) {
  const nodes = splitMindMap(book && book.mindMap);
  return {
    root: nodes[0] || (book && book.topic) || 'Trọng tâm',
    branches: nodes.length > 1 ? nodes.slice(1) : nodes,
  };
}

function sortFeaturedBookFirst(list) {
  return [...list].sort((a, b) => {
    if (a.id === FEATURED_BOOK_ID) return -1;
    if (b.id === FEATURED_BOOK_ID) return 1;
    return 0;
  });
}

export default function TuSach({ embedded = false }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeBookId, setActiveBookId] = useState('');
  const [detailBook, setDetailBook] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    getBooks()
      .then(data => {
        if (cancelled) return;
        const list = sortFeaturedBookFirst(Array.isArray(data) ? data : []);
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

  const libraryStats = useMemo(() => {
    const topics = new Set(books.map(book => book.topic).filter(Boolean));
    const visualItems = books.reduce((total, book) => (
      total + getBookMedia(book).length + (splitMindMap(book.mindMap).length > 0 ? 1 : 0)
    ), 0);
    const notebookCount = books.filter(book => book.notebookUrl).length;

    return {
      books: books.length,
      topics: topics.size,
      visualItems,
      notebookCount,
    };
  }, [books]);

  const openBook = async (book) => {
    setDetailLoading(true);
    setDetailBook(book);
    setSelectedMedia(null);
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

  const closeBook = () => {
    setSelectedMedia(null);
    setDetailBook(null);
  };

  useEffect(() => {
    if (!detailBook) return undefined;
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [detailBook]);

  const detailMedia = detailBook ? getBookMedia(detailBook) : [];
  const detailMindMap = detailBook ? getMindMapParts(detailBook) : { root: '', branches: [] };

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

      <section className="tusach-library-strip" aria-label="Tổng quan tủ sách">
        <div>
          <strong>{libraryStats.books}</strong>
          <span>Tài liệu</span>
        </div>
        <div>
          <strong>{libraryStats.topics}</strong>
          <span>Chủ đề</span>
        </div>
        <div>
          <strong>{libraryStats.visualItems}</strong>
          <span>Học liệu trực quan</span>
        </div>
        <div>
          <strong>{libraryStats.notebookCount}</strong>
          <span>Nguồn NotebookLM</span>
        </div>
      </section>

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
              <i />
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
            const cover = getBookCover(book);
            const mediaCount = getBookMedia(book).length;
            const mindMapCount = splitMindMap(book.mindMap).length;
            return (
              <button
                key={book.id}
                type="button"
                className={`tusach-book-card${selected ? ' selected' : ''}`}
                onClick={() => openBook(book)}
              >
                <span className="tusach-cover" aria-hidden="true">
                  {cover ? (
                    <img src={cover} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <BookOpen size={30} />
                  )}
                  {mediaCount > 0 && (
                    <span className="tusach-cover-badge">
                      <Images size={12} /> {mediaCount}
                    </span>
                  )}
                </span>
                <span className="tusach-card-kicker">
                  <span className="tusach-topic">{book.topic}</span>
                  <span>{book.year}</span>
                </span>
                <strong>{book.title}</strong>
                <small>{book.author}</small>
                <p>{book.summary}</p>
                <span className="tusach-resource-tags" aria-label="Học liệu kèm theo">
                  {book.notebookUrl && <span>NotebookLM</span>}
                  {mindMapCount > 0 && <span>Sơ đồ</span>}
                  {mediaCount > 0 && <span>{mediaCount} ảnh</span>}
                  {book.sourceUrl && <span>Nguồn</span>}
                </span>
              </button>
            );
          })
        )}
      </section>

      {detailBook && createPortal((
        <div className="tusach-modal-backdrop" role="presentation" onClick={closeBook}>
          <article
            className="tusach-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tusach-detail-title"
            onClick={event => event.stopPropagation()}
          >
            <button className="tusach-close" type="button" onClick={closeBook} aria-label="Đóng">
              <X size={20} />
            </button>

            <div className="tusach-modal-head">
              {getBookCover(detailBook) && (
                <div className="tusach-detail-cover">
                  <img
                    src={getBookCover(detailBook)}
                    alt={`Bìa ${detailBook.title}`}
                    loading="eager"
                    decoding="async"
                  />
                </div>
              )}
              <div>
                <span className="tusach-topic">{detailBook.topic}</span>
                <h2 id="tusach-detail-title">{detailBook.title}</h2>
                <p className="tusach-meta">{detailBook.author} · {detailBook.year}</p>
              </div>
            </div>

            {detailLoading && <div className="tusach-detail-loading">Đang cập nhật dữ liệu...</div>}

            <div className="tusach-detail-actions">
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

            <div className="tusach-detail-overview">
              <span><FileText size={15} /> PDF nguồn chính thống</span>
              <span><Network size={15} /> {detailMindMap.branches.length || 1} ý chính</span>
              <span><Images size={15} /> {detailMedia.length} ảnh/sơ đồ</span>
            </div>

            {detailMedia.length > 0 && (
              <div className="tusach-detail-block tusach-visual-panel">
                <h3><Images size={17} /> Thư viện liên quan</h3>
                <div className="tusach-media-grid">
                  {detailMedia.map(item => (
                    <button
                      key={item.src}
                      type="button"
                      className="tusach-media-card"
                      onClick={() => setSelectedMedia(item)}
                    >
                      <img src={item.thumb} alt="" loading="lazy" decoding="async" />
                      <span>{item.type === 'mindmap' ? 'Sơ đồ tư duy' : 'Ảnh minh họa'}</span>
                      <strong>{item.title}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="tusach-detail-block">
              <h3><Sparkles size={17} /> Tóm tắt nhanh</h3>
              <p>{detailBook.summary}</p>
            </div>

            <div className="tusach-detail-block">
              <h3><Headphones size={17} /> Podcast</h3>
              <p>{detailBook.podcast}</p>
              {getBookAudio(detailBook) && (
                <div className="tusach-audio-player">
                  <audio
                    controls
                    src={getBookAudio(detailBook)}
                    controlsList="nodownload"
                  />
                </div>
              )}
            </div>

            <div className="tusach-detail-block">
              <h3><Network size={17} /> Sơ đồ tư duy</h3>
              <div className="tusach-mindmap-board">
                <strong>{detailMindMap.root}</strong>
                <div className="tusach-mindmap">
                  {detailMindMap.branches.map(node => <span key={node}>{node}</span>)}
                </div>
              </div>
            </div>
          </article>
        </div>
      ), document.body)}

      {selectedMedia && createPortal((
        <div className="tusach-media-viewer" role="presentation" onClick={() => setSelectedMedia(null)}>
          <div
            className="tusach-media-viewer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={selectedMedia.title}
            onClick={event => event.stopPropagation()}
          >
            <button
              className="tusach-close tusach-media-close"
              type="button"
              onClick={() => setSelectedMedia(null)}
              aria-label="Đóng ảnh"
            >
              <X size={20} />
            </button>
            <img src={selectedMedia.src} alt={selectedMedia.title} />
            <div className="tusach-media-caption">
              <strong>{selectedMedia.title}</strong>
              {selectedMedia.driveUrl && (
                <a href={selectedMedia.driveUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} />
                  <span>Mở ảnh gốc trên Drive</span>
                </a>
              )}
            </div>
          </div>
        </div>
      ), document.body)}
    </section>
  );
}
