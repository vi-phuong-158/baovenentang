import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  PlayCircle,
  Search,
  Target,
  X,
} from 'lucide-react';
import Quiz from './Quiz.jsx';
import videos from '../data/videos.json';
import infographic1 from '../assets/infographic/1.png';
import infographic2 from '../assets/infographic/2.png';
import infographic3 from '../assets/infographic/3.png';
import infographic4 from '../assets/infographic/4.png';
import infographicThumb1 from '../assets/infographic/thumbs/1.jpg';
import infographicThumb2 from '../assets/infographic/thumbs/2.jpg';
import infographicThumb3 from '../assets/infographic/thumbs/3.jpg';
import infographicThumb4 from '../assets/infographic/thumbs/4.jpg';

const NOTEBOOK_URL = 'https://notebooklm.google.com/notebook/94347c0d-1ead-4341-b0e8-284e4a06d2fc';

const SECTIONS = [
  { id: 'video', label: 'Video', Icon: PlayCircle },
  { id: 'infographic', label: 'Infographic', Icon: ImageIcon },
  { id: 'notebook', label: 'Sổ tay AI', Icon: Bot },
  { id: 'quiz', label: 'Kiểm tra', Icon: Target },
];

const INFOGRAPHICS = [
  { id: 1, title: 'Infographic 1', src: infographic1, thumb: infographicThumb1 },
  { id: 2, title: 'Infographic 2', src: infographic2, thumb: infographicThumb2 },
  { id: 3, title: 'Infographic 3', src: infographic3, thumb: infographicThumb3 },
  { id: 4, title: 'Infographic 4', src: infographic4, thumb: infographicThumb4 },
];

function SectionTabs({ active, onSelect }) {
  return (
    <div className="learning-tabs" role="tablist" aria-label="Mục học tập">
      {SECTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          className={`learning-tab ${active === id ? 'active' : ''}`}
          onClick={() => onSelect(id)}
        >
          <Icon size={15} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function VideoThumbnail({ video }) {
  return (
    <img
      src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
      alt={video.title}
      loading="lazy"
      onError={(event) => {
        const img = event.currentTarget;
        if (img.dataset.fallback === '1') return;
        img.dataset.fallback = '1';
        img.src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
      }}
    />
  );
}

function VideoDetail({ video, onBack }) {
  return (
    <div className="video-detail">
      <div className="video-backbar">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> Quay lại
        </button>
        <span>{video.title}</span>
      </div>

      <div className="video-frame">
        <iframe
          src={`https://www.youtube.com/embed/${video.youtubeId}?rel=0&autoplay=1`}
          title={video.title}
          width="100%"
          height="100%"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <div className="card elevated">
        <span className="pill red">{video.category}</span>
        <h2 className="learning-title">{video.title}</h2>
        <p className="learning-description">{video.description}</p>
      </div>
    </div>
  );
}

function VideoLibrary({ onSelectVideo }) {
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [search, setSearch] = useState('');

  const categories = useMemo(() => (
    ['Tất cả', ...new Set(videos.map(video => video.category).filter(Boolean))]
  ), []);

  const filteredVideos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return videos.filter(video => {
      if (activeCategory !== 'Tất cả' && video.category !== activeCategory) return false;
      if (!query) return true;
      return `${video.title} ${video.description} ${video.category}`.toLowerCase().includes(query);
    });
  }, [activeCategory, search]);

  return (
    <>
      <div className="learning-toolbar">
        <label className="learning-search">
          <Search size={16} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Tìm chuyên đề..."
          />
        </label>
      </div>

      <div className="learning-filter" aria-label="Lọc video theo danh mục">
        {categories.map(category => (
          <button
            key={category}
            type="button"
            className={`pill-button ${activeCategory === category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="video-grid">
        {filteredVideos.map(video => (
          <div
            key={video.id}
            role="button"
            tabIndex={0}
            className="video-card"
            onPointerUp={(event) => {
              if (event.pointerType === 'mouse' && event.button !== 0) return;
              event.preventDefault();
              onSelectVideo(video);
            }}
            onClick={(event) => {
              event.preventDefault();
              onSelectVideo(video);
            }}
            onKeyUp={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectVideo(video);
              }
            }}
          >
            <span className="video-thumb">
              <VideoThumbnail video={video} />
              <span className="video-play" aria-hidden="true">
                <PlayCircle size={28} fill="currentColor" />
              </span>
            </span>
            <span className="video-card-body">
              <span className="pill">{video.category}</span>
              <span className="video-card-title">{video.title}</span>
              <span className="video-card-desc">{video.description}</span>
            </span>
          </div>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="empty">Không tìm thấy video phù hợp.</div>
      )}
    </>
  );
}

function InfographicLibrary() {
  const [selected, setSelected] = useState(null);
  const selectedIndex = selected
    ? INFOGRAPHICS.findIndex(item => item.id === selected.id)
    : -1;

  const move = (offset) => {
    if (selectedIndex < 0) return;
    const nextIndex = (selectedIndex + offset + INFOGRAPHICS.length) % INFOGRAPHICS.length;
    setSelected(INFOGRAPHICS[nextIndex]);
  };

  return (
    <>
      <div className="infographic-grid">
        {INFOGRAPHICS.map(item => (
          <button
            key={item.id}
            type="button"
            className="infographic-card"
            onClick={() => setSelected(item)}
          >
            <img src={item.thumb} alt={item.title} />
            <span>{item.title}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="learning-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={selected.title}
          onClick={() => setSelected(null)}
        >
          <div className="lightbox-content" onClick={event => event.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setSelected(null)}
              aria-label="Đóng ảnh"
              title="Đóng ảnh"
            >
              <X size={18} />
            </button>
            <img src={selected.src} alt={selected.title} />
            <div className="lightbox-controls">
              <button type="button" onClick={() => move(-1)} aria-label="Ảnh trước" title="Ảnh trước">
                <ChevronLeft size={18} />
              </button>
              <span>{selectedIndex + 1} / {INFOGRAPHICS.length}</span>
              <button type="button" onClick={() => move(1)} aria-label="Ảnh sau" title="Ảnh sau">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NotebookPanel() {
  return (
    <div className="card elevated notebook-card">
      <div className="notebook-icon">
        <Bot size={30} />
      </div>
      <h2>Sổ tay AI</h2>
      <p>
        Mở kho ghi chú NotebookLM để tra cứu, tổng hợp và hỏi đáp trên bộ tư liệu học tập.
      </p>
      <a className="btn primary full" href={NOTEBOOK_URL}>
        <ExternalLink size={16} /> Mở Sổ tay AI
      </a>
    </div>
  );
}

export default function HocTap() {
  const [section, setSection] = useState('video');
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [section, selectedVideo]);

  const handleSelectSection = (nextSection) => {
    setSelectedVideo(null);
    setSection(nextSection);
  };

  if (selectedVideo) {
    return (
      <div className="page page-fade learning-page video-view-page">
        <VideoDetail video={selectedVideo} onBack={() => setSelectedVideo(null)} />
      </div>
    );
  }

  return (
    <div className="page page-fade learning-page">
      <div className="page-header">
        <h1>Học tập Nghị quyết XIV</h1>
        <p>Video chuyên đề, infographic, Sổ tay AI và kiểm tra nhận thức.</p>
      </div>

      <SectionTabs active={section} onSelect={handleSelectSection} />

      <div className="learning-panel">
        {section === 'video' && <VideoLibrary onSelectVideo={setSelectedVideo} />}
        {section === 'infographic' && <InfographicLibrary />}
        {section === 'notebook' && <NotebookPanel />}
        {section === 'quiz' && <Quiz embedded />}
      </div>
    </div>
  );
}
