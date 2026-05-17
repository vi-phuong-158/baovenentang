import { useState, lazy, Suspense } from 'react';
import BottomNav from './components/BottomNav.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Skeleton from './components/Skeleton.jsx';

const TinTuc = lazy(() => import('./pages/TinTuc.jsx'));
const TroLy35 = lazy(() => import('./pages/TroLy35.jsx'));
const Quiz = lazy(() => import('./pages/Quiz.jsx'));
const ThuVien = lazy(() => import('./pages/ThuVien.jsx'));
const DangKy = lazy(() => import('./pages/DangKy.jsx'));

const PAGES = {
  'tin-tuc':  TinTuc,
  'troly35':  TroLy35,
  'quiz':     Quiz,
  'thu-vien': ThuVien,
  'dang-ky':  DangKy,
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
      <main id="main-content" tabIndex={-1}>
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
      <BottomNav active={tab} onSelect={handleSelect} />
    </>
  );
}
