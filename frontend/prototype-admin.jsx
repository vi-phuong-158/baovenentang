// Admin desktop dashboard — Variant A (KPI tổng quan, mid-fi)

function AdminDesktop() {
  const [active, setActive] = React.useState("dash");
  return (
    <div className="win">
      <div className="win-chrome">
        <div className="dot" style={{ background: "#E76F51" }}></div>
        <div className="dot" style={{ background: "#F4C20D" }}></div>
        <div className="dot" style={{ background: "#2A9D8F" }}></div>
        <div className="url">🔒 admin.trandiadso.vn</div>
        <div style={{ width: 60 }}></div>
      </div>
      <div className="win-body">
        <aside className="win-side">
          <div className="brand">🛡 Trận Địa Số</div>
          <div className="user">PA01 · v.ngocphuong</div>
          <div className="col" style={{ gap: 2 }}>
            <AdminNavItem id="dash" ico="📊" label="Tổng quan" active={active} onClick={setActive} />
            <AdminNavItem id="news" ico="📰" label="Quản lý tin" active={active} onClick={setActive} />
            <AdminNavItem id="users" ico="👥" label="Người dùng" active={active} onClick={setActive} />
            <AdminNavItem id="quiz" ico="🎯" label="Quiz" active={active} onClick={setActive} />
            <AdminNavItem id="reb" ico="🛡" label="Phản bác" active={active} onClick={setActive} />
            <AdminNavItem id="settings" ico="⚙️" label="Cài đặt" active={active} onClick={setActive} />
          </div>
          <div style={{ marginTop: 32, padding: "12px 12px", background: "rgba(0,0,0,.18)", borderRadius: 12 }}>
            <div style={{ fontSize: 11, opacity: .8 }}>Trạng thái hệ thống</div>
            <div className="row" style={{ marginTop: 4, gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: "#7CFC8A" }}></div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Đang chạy</div>
            </div>
            <div style={{ fontSize: 10, opacity: .7, marginTop: 4 }}>Gửi tin lúc 6h30 mai</div>
          </div>
        </aside>
        <main className="main">
          {active === "dash" && <AdminDashboard />}
          {active === "news" && <AdminPanelStub label="Quản lý tin" ico="📰" desc="Phương án mid-fi tiếp theo" />}
          {active === "users" && <AdminPanelStub label="Người dùng" ico="👥" desc="523 người đăng ký" />}
          {active === "quiz" && <AdminPanelStub label="Quiz" ico="🎯" desc="Ngân hàng 124 câu hỏi" />}
          {active === "reb" && <AdminPanelStub label="Thư viện phản bác" ico="🛡" desc="84 luận điểm đã biên soạn" />}
          {active === "settings" && <AdminPanelStub label="Cài đặt" ico="⚙️" desc="API · Telegram · Brevo" />}
        </main>
      </div>
    </div>
  );
}

function AdminNavItem({ id, ico, label, active, onClick }) {
  return (
    <div onClick={() => onClick(id)} className={`nav-i ${active === id ? "on" : ""}`}>
      <span className="ico">{ico}</span>
      <span>{label}</span>
    </div>
  );
}

function AdminPanelStub({ label, ico, desc }) {
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div className="section-label">Admin · 13/05/2026</div>
        <div className="display" style={{ fontSize: 28, fontWeight: 800 }}>{label}</div>
      </div>
      <div style={{
        background: "var(--surface)",
        border: "1px dashed var(--line)",
        borderRadius: 18,
        padding: 60,
        textAlign: "center",
        color: "var(--ink-soft)",
      }}>
        <div style={{ fontSize: 64, marginBottom: 12, opacity: .6 }}>{ico}</div>
        <div style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>{label}</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>{desc}</div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 18, gap: 16 }}>
        <div className="grow">
          <div className="section-label">Tổng quan · 13/05/2026</div>
          <div className="display" style={{ fontSize: 28, fontWeight: 800 }}>Chào buổi sáng, Phương 👋</div>
        </div>
        <button className="btn primary" style={{ width: "auto" }}>+ Soạn bản tin</button>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
        <Kpi label="Thuê bao" value="523" delta="+18 hôm nay" color="var(--red)" big />
        <Kpi label="Tin đã gửi" value="42" delta="hôm nay" />
        <Kpi label="Tỷ lệ mở email" value="87%" delta="▲ 4% vs tuần trước" />
        <Kpi label="Quiz hoàn thành" value="156" delta="hôm nay" />
      </div>

      {/* Chart + activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, marginBottom: 18 }}>
        <div className="card">
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="grow">
              <div style={{ fontWeight: 700, fontSize: 14 }}>📈 Đăng ký 7 ngày</div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>So với tuần trước: +18%</div>
            </div>
            <div className="row" style={{ gap: 4 }}>
              <span className="pill" style={{ background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }}>7 ngày</span>
              <span className="pill">30 ngày</span>
              <span className="pill">Tất cả</span>
            </div>
          </div>
          <Chart />
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🏆 Đơn vị top tuần</div>
          {[
            { n: "PA01", c: 45, m: "🥇" },
            { n: "PA08", c: 38, m: "🥈" },
            { n: "Đoàn TN", c: 27, m: "🥉" },
            { n: "TP Việt Trì", c: 22 },
            { n: "PC02", c: 19 },
          ].map((u, i) => (
            <div key={i} className="row" style={{
              padding: "8px 0",
              borderBottom: i < 4 ? "1px solid var(--line-soft)" : "none",
              gap: 10,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 99,
                background: "var(--surface-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 12,
                border: "1px solid var(--line)",
              }}>{u.m || (i + 1)}</div>
              <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{u.n}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)" }}>{u.c}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity log + queue */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="card">
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="grow" style={{ fontWeight: 700, fontSize: 14 }}>🕘 Hoạt động hôm nay</div>
            <span className="pill ok">Hệ thống OK</span>
          </div>
          {[
            { t: "06:30", e: "Đã gửi 523 email · 312 Telegram", ok: true },
            { t: "06:00", e: "AI tóm tắt 42 bài (Gemini)", ok: true },
            { t: "05:58", e: "Crawl 5 nguồn RSS · 142 bài thô", ok: true },
            { t: "05:55", e: "Trigger sáng 13/05 khởi chạy", ok: true },
          ].map((l, i) => (
            <div key={i} className="row" style={{
              padding: "8px 0",
              borderBottom: i < 3 ? "1px solid var(--line-soft)" : "none",
              gap: 10,
            }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-mute)", width: 40 }}>{l.t}</div>
              <div style={{ width: 6, height: 6, borderRadius: 99, background: l.ok ? "var(--ok)" : "var(--red)" }}></div>
              <div style={{ fontSize: 13, flex: 1 }}>{l.e}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="row" style={{ marginBottom: 10 }}>
            <div className="grow" style={{ fontWeight: 700, fontSize: 14 }}>📋 Hàng đợi soạn tin</div>
            <span className="pill yellow">3 chờ duyệt</span>
          </div>
          {[
            { t: "Đại hội Đảng bộ tỉnh — Khai mạc 14/05", s: "Nháp", p: "Quan trọng" },
            { t: "Cảnh báo lừa đảo deepfake mới", s: "Chờ duyệt", p: "Quan trọng" },
            { t: "Quy định mới về phòng cháy", s: "Chờ duyệt", p: "Bình thường" },
            { t: "Kết quả thi đua quý I", s: "Chờ duyệt", p: "Bình thường" },
          ].map((n, i) => (
            <div key={i} style={{
              padding: "10px 0",
              borderBottom: i < 3 ? "1px solid var(--line-soft)" : "none",
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, lineHeight: 1.3 }}>{n.t}</div>
              <div className="row" style={{ gap: 6 }}>
                <span className="pill" style={{
                  fontSize: 10,
                  background: n.p === "Quan trọng" ? "var(--red)" : "var(--yellow)",
                  color: n.p === "Quan trọng" ? "#fff" : "var(--ink)",
                  borderColor: "transparent",
                }}>{n.p}</span>
                <span className="pill" style={{ fontSize: 10 }}>{n.s}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, color, big }) {
  return (
    <div className="card" style={{
      background: big ? "var(--red)" : "var(--surface)",
      color: big ? "#fff" : "var(--ink)",
      borderColor: big ? "var(--red)" : "var(--line)",
      padding: 16,
    }}>
      <div style={{ fontSize: 11, opacity: big ? .85 : 1, color: big ? "#fff" : "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
        {label}
      </div>
      <div className="display" style={{
        fontSize: big ? 42 : 32, fontWeight: 800, lineHeight: 1.1, marginTop: 4,
        color: big ? "#fff" : (color || "var(--ink)"),
      }}>{value}</div>
      <div style={{ fontSize: 12, opacity: big ? .9 : 1, color: big ? "#fff" : "var(--ink-soft)", marginTop: 4 }}>
        {delta}
      </div>
    </div>
  );
}

function Chart() {
  const data = [62, 78, 55, 92, 88, 110, 138];
  const max = Math.max(...data);
  const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140, padding: "10px 4px 0" }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-soft)", fontWeight: 600 }}>{v}</div>
          <div style={{
            width: "100%",
            height: `${(v / max) * 100}%`,
            background: i === data.length - 1
              ? "linear-gradient(180deg, var(--red), var(--red-dark))"
              : "var(--ink)",
            borderRadius: "6px 6px 0 0",
            transition: "height .4s",
          }}></div>
          <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>{days[i]}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { AdminDesktop });
