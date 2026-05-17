import { Newspaper, Target } from 'lucide-react';
import logo35 from '../../logo.png';

const TABS = [
  { id: 'tin-tuc',  label: 'Tin tức',   Icon: Newspaper },
  { id: 'troly35',  label: 'Trợ lý 35', center: true },
  { id: 'quiz',     label: 'Quiz',       Icon: Target },
];

export default function BottomNav({ active, onSelect }) {
  return (
    <nav role="tablist" aria-label="Điều hướng chính" style={{
      position: 'fixed',
      bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      borderRadius: 999,
      padding: '6px 12px',
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(180deg, rgba(255,255,255,.92) 0%, rgba(255,255,255,.78) 100%)',
      backdropFilter: 'blur(28px) saturate(190%)',
      WebkitBackdropFilter: 'blur(28px) saturate(190%)',
      border: '1px solid rgba(255,255,255,.9)',
      boxShadow: [
        '0 1px 0 rgba(255,255,255,.98) inset',
        '0 -1px 0 rgba(26,20,16,.06) inset',
        '0 0 0 1px rgba(26,20,16,.04)',
        '0 8px 22px -10px rgba(26,20,16,.22)',
        '0 20px 38px -18px rgba(26,20,16,.38)',
      ].join(', '),
      zIndex: 100,
      maxWidth: 336,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 88px)',
      minWidth: 260,
    }}>
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
              style={{
                width: 52,
                height: 52,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                background: 'transparent',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background .22s ease, transform .18s ease',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(.96)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <img
                src={logo35}
                alt="Trợ lý 35"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  objectFit: 'contain',
                  display: 'block',
                  opacity: isActive ? 1 : .9,
                  transition: 'opacity .2s ease',
                }}
              />
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
            style={{
              flex: 1,
              height: 44,
              minWidth: 72,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '6px 8px',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: isActive ? 700 : 600,
              fontFamily: 'var(--font-body)',
              color: isActive ? 'var(--red)' : 'var(--ink-soft)',
              background: isActive ? 'var(--red-soft)' : 'transparent',
              boxShadow: isActive
                ? '0 1px 0 rgba(255,255,255,.8) inset, 0 6px 12px -8px rgba(184,50,39,.28)'
                : 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'background .22s ease, color .22s ease, transform .14s ease, box-shadow .22s ease',
              lineHeight: 1,
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(.94)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
