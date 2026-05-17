import { Newspaper, Target, BookOpen, Bell } from 'lucide-react';

const TABS = [
  { id: 'tin-tuc',  label: 'Tin tức',   Icon: Newspaper },
  { id: 'quiz',     label: 'Quiz',       Icon: Target },
  { id: 'troly35',  label: 'Trợ lý 35', Icon: null,     center: true },
  { id: 'thu-vien', label: 'Thư viện',  Icon: BookOpen },
  { id: 'dang-ky',  label: 'Đăng ký',   Icon: Bell },
];

export default function BottomNav({ active, onSelect }) {
  return (
    <nav role="tablist" aria-label="Điều hướng chính" style={{
      position: 'fixed',
      bottom: 14,
      borderRadius: 28,
      padding: '9px 9px 9px',
      display: 'flex',
      gap: 2,
      alignItems: 'flex-end',
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
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
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
              background: isActive ? 'var(--ink)' : 'transparent',
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
