import { BookOpen, Newspaper } from 'lucide-react';
import logo35 from '../../logo.png';

const TABS = [
  { id: 'tin-tuc', label: 'Tin tức', Icon: Newspaper },
  { id: 'troly35', label: 'Trợ lý 35', center: true },
  { id: 'hoc-tap', label: 'Học tập', Icon: BookOpen },
];

export default function BottomNav({ active, onSelect }) {
  return (
    <nav role="tablist" aria-label="Điều hướng chính" className="bottom-nav">
      {TABS.map(({ id, label, Icon, center }) => {
        const isActive = active === id;

        if (center) {
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              onClick={() => onSelect(id)}
              className={`bottom-nav-center${isActive ? ' active' : ''}`}
            >
              <img src={logo35} alt="Trợ lý 35" />
            </button>
          );
        }

        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            onClick={() => onSelect(id)}
            className={`bottom-nav-tab${isActive ? ' active' : ''}`}
          >
            <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
