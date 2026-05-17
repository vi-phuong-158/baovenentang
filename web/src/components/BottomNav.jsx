<<<<<<< HEAD
import { Newspaper, Target, BookOpen, Bell } from 'lucide-react';
=======
import { Newspaper, Target } from 'lucide-react';
import logo35 from '../../logo.png';
>>>>>>> 5c84c024f65d235ed8281b993b6a05607b051336

const TABS = [
  { id: 'tin-tuc',  label: 'Tin tức',   Icon: Newspaper },
  { id: 'troly35',  label: 'Trợ lý 35', center: true },
  { id: 'quiz',     label: 'Quiz',       Icon: Target },
<<<<<<< HEAD
  { id: 'troly35',  label: 'Trợ lý 35', Icon: null,     center: true },
  { id: 'thu-vien', label: 'Thư viện',  Icon: BookOpen },
  { id: 'dang-ky',  label: 'Đăng ký',   Icon: Bell },
=======
>>>>>>> 5c84c024f65d235ed8281b993b6a05607b051336
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
<<<<<<< HEAD
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div style={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                background: isActive
                  ? 'radial-gradient(circle at 35% 25%, #fffdf4 0%, #fff6dc 45%, #f3c95f 100%)'
                  : 'radial-gradient(circle at 35% 25%, #ffffff 0%, #fff6e2 52%, #f0cf86 100%)',
=======
                width: 52,
                height: 52,
>>>>>>> 5c84c024f65d235ed8281b993b6a05607b051336
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
<<<<<<< HEAD
                color: '#c62f27',
                boxShadow: isActive
                  ? '0 0 0 5px rgba(184,50,39,.12), 0 8px 22px rgba(184,50,39,.38), inset 0 1px 0 rgba(255,255,255,.75)'
                  : '0 6px 18px rgba(184,50,39,.3), inset 0 1px 0 rgba(255,255,255,.8)',
                transform: isActive ? 'translateY(-14px) scale(1.05)' : 'translateY(-12px)',
                transition: 'all .2s cubic-bezier(.34,1.56,.64,1)',
                border: '3px solid #c62f27',
                outline: '2px solid #fff',
                position: 'relative',
              }}>
                <span style={{
                  position: 'absolute',
                  inset: 5,
                  borderRadius: '50%',
                  border: '1px solid rgba(198,47,39,.38)',
                  pointerEvents: 'none',
                }} />
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 21,
                  fontWeight: 900,
                  lineHeight: .95,
                  letterSpacing: 0,
                }}>
                  35
                </span>
                <span style={{
                  fontSize: 6.5,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: .3,
                  marginTop: 1,
                }}>
                  TRỢ LÝ
                </span>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 600,
                fontFamily: 'var(--font-body)',
                color: isActive ? '#c62828' : 'var(--ink-soft)',
                lineHeight: 1,
                marginTop: -2,
                paddingBottom: 2,
                transition: 'color .18s',
              }}>
                {label}
              </span>
=======
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
>>>>>>> 5c84c024f65d235ed8281b993b6a05607b051336
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
