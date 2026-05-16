// Shared phone frame + sketchy UI atoms

function Phone({ rot = -.5, children, label, tag, note }) {
  return (
    <div className="variant">
      <div className="label">
        {tag && <span className="tag">{tag}</span>}
        <span>{label}</span>
      </div>
      <div className="note">{note}</div>
      <div className="phone" style={{ "--rot": `${rot}deg` }}>
        <div className="notch"></div>
        <div className="statusbar">
          <span>9:41</span>
          <span>● ● ●</span>
          <span>📶 100%</span>
        </div>
        <div className="screen">
          {children}
        </div>
      </div>
    </div>
  );
}

// Top bar inside phone
function PhoneTop({ title, right, sub }) {
  return (
    <div style={{
      padding: "12px 14px 10px",
      borderBottom: "1.5px solid var(--line)",
      background: "var(--paper)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="hand" style={{ fontWeight: 700, fontSize: 16, color: "var(--red)" }}>
          🛡️ {title}
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>{right}</div>
      </div>
      {sub && <div className="hand2" style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Bottom tab nav
function BottomNav({ active = 0 }) {
  const items = ["🏠", "📰", "🔍", "🎯", "👤"];
  const labels = ["Trang chủ", "Bản tin", "Tra cứu", "Quiz", "Tôi"];
  return (
    <div style={{
      display: "flex", justifyContent: "space-around",
      borderTop: "1.5px solid var(--line)",
      padding: "6px 0 8px",
      background: "var(--paper)",
      marginTop: "auto",
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          textAlign: "center",
          opacity: i === active ? 1 : .45,
          fontFamily: "'Patrick Hand', cursive",
          fontSize: 10,
        }}>
          <div style={{ fontSize: 16, color: i === active ? "var(--red)" : "var(--ink)" }}>{it}</div>
          <div>{labels[i]}</div>
        </div>
      ))}
    </div>
  );
}

// A sketchy banner with the brand mark
function BrandBanner({ small }) {
  return (
    <div style={{
      background: "var(--red)",
      color: "#fff",
      padding: small ? "10px 12px" : "16px 14px",
      borderBottom: "2px solid var(--line)",
      textAlign: "center",
    }}>
      <div className="hand" style={{ fontWeight: 700, fontSize: small ? 16 : 20, letterSpacing: ".5px" }}>
        🛡️ TRỢ LÝ 35
      </div>
      <div className="hand2" style={{ fontSize: small ? 11 : 13, marginTop: 2, opacity: .92 }}>
        Thông tin đúng — Tư tưởng vững
      </div>
    </div>
  );
}

// Skeleton bars
function Bars({ rows = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="sk-line" style={{ width: `${100 - i * 12}%` }}></div>
      ))}
    </div>
  );
}

// News card preview
function NewsCard({ priority, title, category, src, dim }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="row-stack" style={{ justifyContent: "space-between" }}>
        <span className={`pill ${priority === "Quan trọng" ? "red" : "yellow"}`}>
          {priority === "Quan trọng" ? "🔴 Quan trọng" : "🟡 Hôm nay"}
        </span>
        <span className="mono" style={{ fontSize: 9, color: "var(--muted)" }}>{src}</span>
      </div>
      <div className="hand" style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.25 }}>
        {title}
      </div>
      {!dim && <Bars rows={2} />}
      <div className="row-stack" style={{ justifyContent: "space-between" }}>
        <span className="pill">{category}</span>
        <span className="hand2" style={{ fontSize: 11, color: "var(--red)" }}>Đọc thêm →</span>
      </div>
    </div>
  );
}

Object.assign(window, { Phone, PhoneTop, BottomNav, BrandBanner, Bars, NewsCard });
