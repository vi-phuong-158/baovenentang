import { useState, lazy, Suspense } from 'react';
import BottomNav from './components/BottomNav.jsx';
<<<<<<< Updated upstream
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Skeleton from './components/Skeleton.jsx';

const TinTuc = lazy(() => import('./pages/TinTuc.jsx'));
const TroLy35 = lazy(() => import('./pages/TroLy35.jsx'));
const Quiz = lazy(() => import('./pages/Quiz.jsx'));
const ThuVien = lazy(() => import('./pages/ThuVien.jsx'));
const DangKy = lazy(() => import('./pages/DangKy.jsx'));
=======
import TinTuc from './pages/TinTuc.jsx';
import TroLy35 from './pages/TroLy35.jsx';
import Quiz from './pages/Quiz.jsx';
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

const PAGES = {
  'tin-tuc':  TinTuc,
  'troly35':  TroLy35,
  'quiz':     Quiz,
};

const TAB_IDS = Object.keys(PAGES);

export default function App() {
  const [tab, setTab] = useState('tin-tuc');
  const [mounted, setMounted] = useState(() => new Set(['tin-tuc']));

  const handleSelect = (id) => {
    setTab(id);
    setMounted(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    requestAnimationFrame(() => document.getElementById('main-content')?.focus());
  };

  return (
    <>
<<<<<<< Updated upstream
<<<<<<< HEAD
      <main id="main-content" tabIndex={-1}>
=======
<<<<<<< Updated upstream
      <a href="#main-content" className="skip-link" style={{
        position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden',
        zIndex: 999,
      }}>Bỏ qua điều hướng</a>
      <main id="main-content">
>>>>>>> 5c84c024f65d235ed8281b993b6a05607b051336
        {TAB_IDS.map(id => {
          if (!mounted.has(id)) return null;
          const Page = PAGES[id];
          return (
            <div key={id} style={{ display: id === tab ? 'block' : 'none' }}>
              <ErrorBoundary>
                <Suspense fallback={<><div className="top-progress" /><div className="page"><Skeleton lines={6} /></div></>}>
                  <Page onNavigate={handleSelect} />
                </Suspense>
              </ErrorBoundary>
            </div>
          );
        })}
      </main>
=======
=======
>>>>>>> Stashed changes
      <div className="app-shell">
        {TAB_IDS.map(id => {
          if (!mounted.has(id)) return null;
          const Page = PAGES[id];
          const isActive = id === tab;
          return (
            <div
              key={id}
              className={`tab-panel ${isActive ? 'active' : ''}`}
              aria-hidden={!isActive}
            >
              <Page />
            </div>
          );
        })}
      </div>
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
      <BottomNav active={tab} onSelect={handleSelect} />
    </>
  );
}
