import { useState, lazy, Suspense } from 'react';
import BottomNav from './components/BottomNav.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Skeleton from './components/Skeleton.jsx';

const TinTuc = lazy(() => import('./pages/TinTuc.jsx'));
const TroLy35 = lazy(() => import('./pages/TroLy35.jsx'));
const Quiz    = lazy(() => import('./pages/Quiz.jsx'));

const PAGES = {
  'tin-tuc': TinTuc,
  'troly35': TroLy35,
  'quiz':    Quiz,
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
  };

  return (
    <>
      <a href="#main-content" className="skip-link">Bỏ qua điều hướng</a>
      <div className="app-shell" id="main-content">
        {TAB_IDS.map(id => {
          if (!mounted.has(id)) return null;
          const Page = PAGES[id];
          const isActive = id === tab;
          return (
            <div
              key={id}
              className={`tab-panel${isActive ? ' active' : ''}`}
              aria-hidden={!isActive}
            >
              <ErrorBoundary>
                <Suspense fallback={<><div className="top-progress" /><div className="page"><Skeleton lines={6} /></div></>}>
                  <Page />
                </Suspense>
              </ErrorBoundary>
            </div>
          );
        })}
      </div>
      <BottomNav active={tab} onSelect={handleSelect} />
    </>
  );
}
