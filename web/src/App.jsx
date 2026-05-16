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

export default function App() {
  const [tab, setTab] = useState('tin-tuc');
  const Page = PAGES[tab] ?? TinTuc;

  return (
    <>
      <Page key={tab} />
      <BottomNav active={tab} onSelect={setTab} />
    </>
  );
}
