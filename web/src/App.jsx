import { useState } from 'react';
import BottomNav from './components/BottomNav.jsx';
import TinTuc from './pages/TinTuc.jsx';
import TroLy35 from './pages/TroLy35.jsx';
import Quiz from './pages/Quiz.jsx';
import ThuVien from './pages/ThuVien.jsx';
import DangKy from './pages/DangKy.jsx';

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
  // Track which tabs have been visited so we lazy-mount on first visit
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
      {TAB_IDS.map(id => {
        if (!mounted.has(id)) return null;
        const Page = PAGES[id];
        return (
          <div key={id} style={{ display: id === tab ? 'block' : 'none' }}>
            <Page />
          </div>
        );
      })}
      <BottomNav active={tab} onSelect={handleSelect} />
    </>
  );
}
