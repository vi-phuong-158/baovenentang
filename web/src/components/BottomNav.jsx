import { Newspaper, Target } from 'lucide-react';
import logo35 from '../../logo.png';

const TABS = [
  { id: 'tin-tuc', label: 'Tin tức', Icon: Newspaper },
  { id: 'troly35', label: 'Trợ lý 35', center: true },
  { id: 'quiz',    label: 'Quiz',     Icon: Target   },
];

export default function BottomNav({ active, onSelect }) {
  return (
    <nav
      role="tablist"
      aria-label="Điều hướng chính"
      style={{
        position: 'fixed',
        bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 72px)',
        maxWidth: 336,
        minWidth: 264,
        borderRadius: 999,
        padding: '5px 8px',
        display: 'flex',
        gap: 5,
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(180deg,rgba(255,255,255,.94) 0%,rgba(255,255,255,.82) 100%)',
        backdropFilter: 'blur(28px) saturate(190%)',
        WebkitBackdropFilter: 'blur(28px) saturate(190%)',
        border: '1px solid rgba(255,255,255,.92)',
        boxShadow: [
          '0 1px 0 rgba(255,255,255,.98) inset',
          '0 -1px 0 rgba(26,20,16,.05) inset',
          '0 0 0 1px rgba(26,20,16,.04)',
          '0 6px 18px -8px rgba(26,20,16,.22)',
          '0 16px 32px -16px rgba(26,20,16,.35)',
        ].join(', '),
        zIndex: 100,
      }}
    >
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
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '50%',
                transition: 'transform .18s cubic-bezier(.34,1.56,.64,1), opacity .18s ease',
                opacity: isActive ? 1 : 0.82,
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(.94)'}
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
                  boxShadow: isActive
                    ? '0 0 0 2.5px rgba(184,50,39,.35), 0 4px 10px rgba(184,50,39,.22)'
                    : 'none',
                  transition: 'box-shadow .2s ease',
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
              height: 46,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '6px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: isActive ? 700 : 600,
              fontFamily: 'var(--font-body)',
              color: isActive ? 'var(--red)' : 'var(--ink-soft)',
              background: isActive ? 'var(--red-soft)' : 'transparent',
              boxShadow: isActive
                ? '0 1px 0 rgba(255,255,255,.8) inset, 0 4px 10px -6px rgba(184,50,39,.28)'
                : 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'background .2s ease, color .2s ease, box-shadow .2s ease',
              lineHeight: 1,
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(.94)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
