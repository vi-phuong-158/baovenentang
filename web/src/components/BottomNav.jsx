import { Newspaper, Bot, Target, BookOpen, Bell } from 'lucide-react';

const TABS = [
  { id: 'tin-tuc',  label: 'Tin tức',   Icon: Newspaper },
  { id: 'troly35',  label: 'Trợ lý 35', Icon: Bot },
  { id: 'quiz',     label: 'Quiz',       Icon: Target },
  { id: 'thu-vien', label: 'Thư viện',  Icon: BookOpen },
  { id: 'dang-ky',  label: 'Đăng ký',   Icon: Bell },
];

export default function BottomNav({ active, onSelect }) {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 14,
      borderRadius: 28,
      padding: 9,
      display: 'flex',
      gap: 2,
      background: 'linear-gradient(180deg, rgba(255,255,255,.88) 0%, rgba(255,255,255,.66) 100%)',
      backdropFilter: 'blur(36px) saturate(200%)',
      WebkitBackdropFilter: 'blur(36px) saturate(200%)',
      border: '1.5px solid rgba(255,255,255,.85)',
      boxShadow: [
        '0 1.5px 0 rgba(255,255,255,.98) inset',
        '0 -1px 0 rgba(26,20,16,.06) inset',
        '0 0 0 1px rgba(26,20,16,.04)',
        '0 2px 6px rgba(26,20,16,.05)',
        '0 14px 28px -8px rgba(26,20,16,.22)',
        '0 36px 64px -16px rgba(26,20,16,.4)',
      ].join(', '),
      zIndex: 100,
      maxWidth: 480,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(min(100%, 480px) - 24px)',
    }}>
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '9px 0 7px',
              borderRadius: 18,
              fontSize: 10,
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              color: isActive ? '#fff' : 'var(--ink-soft)',
              background: isActive
                ? 'var(--ink)'
                : 'transparent',
              boxShadow: isActive
                ? '0 6px 14px rgba(26,20,16,.3), inset 0 1px 0 rgba(255,255,255,.12)'
                : 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'background .18s, color .18s, transform .12s',
              lineHeight: 1,
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(.94)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Icon size={18} strokeWidth={isActive ? 2.2 : 1.75} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
