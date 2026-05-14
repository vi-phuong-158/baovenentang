// Dashboard admin — 4-5 variations (mobile-first nhưng có 1 wide)

function AdminStats() {
  return (
    <>
      <PhoneTop title="Admin · Tổng quan" right="🔒" />
      <div className="stack" style={{ flex: 1, overflowY: "auto" }}>
        <div className="row-stack" style={{ gap: 6 }}>
          <div className="card red" style={{ flex: 1, textAlign: "center", padding: 10 }}>
            <div className="hand" style={{ fontSize: 18, fontWeight: 700 }}>523</div>
            <div className="hand2" style={{ fontSize: 10, opacity: .9 }}>Thuê bao</div>
          </div>
          <div className="card warn" style={{ flex: 1, textAlign: "center", padding: 10 }}>
            <div className="hand" style={{ fontSize: 18, fontWeight: 700 }}>42</div>
            <div className="hand2" style={{ fontSize: 10 }}>Tin hôm nay</div>
          </div>
          <div className="card" style={{ flex: 1, textAlign: "center", padding: 10 }}>
            <div className="hand" style={{ fontSize: 18, fontWeight: 700, color: "var(--red)" }}>87%</div>
            <div className="hand2" style={{ fontSize: 10 }}>Tỷ lệ mở</div>
          </div>
        </div>
        <div className="card">
          <div className="row-stack" style={{ justifyContent: "space-between" }}>
            <div className="hand" style={{ fontWeight: 700, fontSize: 12 }}>📈 Đăng ký 7 ngày</div>
            <span className="pill yellow">+18%</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 50, marginTop: 8 }}>
            {[30, 45, 25, 60, 50, 80, 95].map((h, i) => (
              <div key={i} style={{
                flex: 1, height: `${h}%`,
                background: i === 6 ? "var(--red)" : "var(--ink)",
                borderRadius: "3px 3px 0 0",
              }}></div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="hand" style={{ fontWeight: 700, fontSize: 12 }}>🕘 Hoạt động gần đây</div>
          <div className="hand2" style={{ fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
            • 6h30 — Đã gửi 523 email ✓<br />
            • 6h30 — Đã đăng Telegram ✓<br />
            • 5h58 — AI tóm tắt 12 bài
          </div>
        </div>
      </div>
      <BottomNav active={4} />
    </>
  );
}

function AdminNewsTable() {
  return (
    <>
      <PhoneTop title="Quản lý tin" right="42 bài" />
      <div className="stack" style={{ flex: 1 }}>
        <div className="row-stack" style={{ gap: 6 }}>
          <div className="sk-input" style={{ flex: 1, padding: "5px 8px", fontSize: 12 }}>🔍 tiêu đề...</div>
          <div className="sk-btn warn" style={{ padding: "5px 10px", fontSize: 11 }}>+ Tin</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <span className="pill red">Tất cả</span>
          <span className="pill">Chính trị</span>
          <span className="pill">An ninh</span>
        </div>
        {[
          { t: "Nghị quyết mới về chuyển đổi số", p: "Quan trọng", s: "Đã gửi" },
          { t: "Phòng chống thông tin xấu độc", p: "Bình thường", s: "Đã gửi" },
          { t: "Đại hội Đảng bộ tỉnh", p: "Quan trọng", s: "Nháp" },
        ].map((it, i) => (
          <div key={i} className="card" style={{ padding: 8 }}>
            <div className="hand" style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3 }}>
              {it.t}
            </div>
            <div className="row-stack" style={{ justifyContent: "space-between", marginTop: 6 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <span className={`pill ${it.p === "Quan trọng" ? "red" : "yellow"}`}>{it.p}</span>
                <span className="pill">{it.s}</span>
              </div>
              <span className="hand2" style={{ fontSize: 10, color: "var(--red)" }}>⋯</span>
            </div>
          </div>
        ))}
      </div>
      <BottomNav active={4} />
    </>
  );
}

function AdminUsers() {
  return (
    <>
      <PhoneTop title="Người đăng ký" right="523" />
      <div className="stack" style={{ flex: 1 }}>
        <div className="row-stack" style={{ gap: 4, flexWrap: "wrap" }}>
          <span className="pill red">Tất cả 523</span>
          <span className="pill">Telegram 312</span>
          <span className="pill">Email 287</span>
        </div>
        {[
          { n: "Nguyễn Văn A", e: "vana@cand.vn", u: "PA01", c: ["💬", "📨"] },
          { n: "Trần Thị B", e: "tthib@cand.vn", u: "PA08", c: ["💬"] },
          { n: "Lê Văn C", e: "levanc@phutho.gov.vn", u: "Đoàn TN", c: ["📨"] },
          { n: "Phạm Thị D", e: "ptd@gmail.com", u: "Dân", c: ["📨"] },
        ].map((u, i) => (
          <div key={i} className="card" style={{ display: "flex", gap: 8, alignItems: "center", padding: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 99,
              background: "var(--paper-2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Kalam', cursive", fontWeight: 700, fontSize: 13,
              border: "1.5px solid var(--line)",
            }}>{u.n[0]}</div>
            <div style={{ flex: 1 }}>
              <div className="hand" style={{ fontWeight: 700, fontSize: 12 }}>{u.n}</div>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-soft)" }}>{u.e}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="hand2" style={{ fontSize: 10 }}>{u.u}</div>
              <div style={{ fontSize: 11 }}>{u.c.join(" ")}</div>
            </div>
          </div>
        ))}
      </div>
      <BottomNav active={4} />
    </>
  );
}

function AdminCompose() {
  return (
    <>
      <PhoneTop title="← Soạn bản tin" right="Lưu" />
      <div className="stack" style={{ flex: 1 }}>
        <div>
          <div className="hand2" style={{ fontSize: 11, color: "var(--ink-soft)" }}>Tiêu đề</div>
          <div className="sk-input" style={{ marginTop: 2, fontSize: 13 }}>
            Bản tin sáng 14/05/2026
          </div>
        </div>
        <div className="row-stack" style={{ gap: 6 }}>
          <span className="pill red">🔴 Quan trọng</span>
          <span className="pill">Chính trị</span>
          <span className="pill">+ Thêm</span>
        </div>
        <div>
          <div className="hand2" style={{ fontSize: 11, color: "var(--ink-soft)" }}>Tóm tắt (AI hỗ trợ)</div>
          <div className="sk-input" style={{ marginTop: 2, height: 70, fontSize: 12, color: "var(--ink-soft)" }}>
            <Bars rows={3} />
          </div>
          <div className="hand2" style={{ fontSize: 10, color: "var(--red)", textAlign: "right", marginTop: 2 }}>
            ✨ Tóm tắt lại bằng AI
          </div>
        </div>
        <div className="card warn">
          <div className="hand" style={{ fontWeight: 700, fontSize: 12 }}>📤 Sẽ gửi tới</div>
          <div className="hand2" style={{ fontSize: 11 }}>523 người · Telegram + Email · 6h30 mai</div>
        </div>
        <div className="row-stack" style={{ gap: 6, marginTop: "auto" }}>
          <div className="sk-btn" style={{ flex: 1, fontSize: 11 }}>👁 Xem trước</div>
          <div className="sk-btn primary" style={{ flex: 1, fontSize: 11 }}>🚀 Gửi</div>
        </div>
      </div>
    </>
  );
}

// Wide / desktop variation rendered as a wider frame
function AdminDesktop() {
  return (
    <div style={{
      width: 520,
      height: 320,
      background: "#fff",
      border: "2.5px solid var(--line)",
      borderRadius: 10,
      boxShadow: "4px 4px 0 var(--ink), 0 0 0 1px var(--line)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      transform: "rotate(-.4deg)",
    }}>
      {/* Window chrome */}
      <div style={{
        height: 22, background: "var(--paper-2)",
        borderBottom: "1.5px solid var(--line)",
        display: "flex", alignItems: "center", padding: "0 8px", gap: 4,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: 99, background: "#e74c3c" }}></div>
        <div style={{ width: 8, height: 8, borderRadius: 99, background: "#f39c12" }}></div>
        <div style={{ width: 8, height: 8, borderRadius: 99, background: "#27ae60" }}></div>
        <div className="mono" style={{ fontSize: 10, marginLeft: 14, color: "var(--ink-soft)" }}>admin.trandiadso.vn</div>
      </div>
      <div style={{ flex: 1, display: "flex" }}>
        {/* Sidebar */}
        <div style={{
          width: 110, background: "var(--red)", color: "#fff",
          padding: "10px 8px", display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div className="hand" style={{ fontWeight: 700, fontSize: 13 }}>🛡️ Admin</div>
          <div className="hand2" style={{ fontSize: 9, opacity: .8, marginBottom: 4 }}>v.ngocphuong</div>
          {["📊 Tổng quan", "📰 Tin", "👥 Người dùng", "🎯 Quiz", "🛡️ Phản bác", "⚙️ Cài đặt"].map((it, i) => (
            <div key={i} className="hand2" style={{
              fontSize: 11, padding: "4px 6px",
              background: i === 0 ? "rgba(0,0,0,.2)" : "transparent",
              borderRadius: 4,
            }}>{it}</div>
          ))}
        </div>
        {/* Content */}
        <div style={{ flex: 1, padding: 12, overflow: "hidden", background: "#fff" }}>
          <div className="hand" style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
            📊 Tổng quan — Hôm nay
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
            {[
              ["523", "Thuê bao", "var(--red)", "#fff"],
              ["42", "Tin", "var(--yellow)", "var(--ink)"],
              ["87%", "Mở email", "#fff", "var(--ink)"],
              ["12", "Quiz/h", "#fff", "var(--ink)"],
            ].map(([n, l, bg, fg], i) => (
              <div key={i} className="card" style={{ background: bg, color: fg, padding: 6, textAlign: "center" }}>
                <div className="hand" style={{ fontWeight: 700, fontSize: 16 }}>{n}</div>
                <div className="hand2" style={{ fontSize: 9 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6 }}>
            <div className="card" style={{ padding: 8 }}>
              <div className="hand" style={{ fontWeight: 700, fontSize: 11, marginBottom: 6 }}>📈 7 ngày</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
                {[30, 45, 25, 60, 50, 80, 95].map((h, i) => (
                  <div key={i} style={{
                    flex: 1, height: `${h}%`,
                    background: i === 6 ? "var(--red)" : "var(--ink)",
                  }}></div>
                ))}
              </div>
            </div>
            <div className="card" style={{ padding: 8 }}>
              <div className="hand" style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>🏆 BXH</div>
              <div className="hand2" style={{ fontSize: 10, lineHeight: 1.6 }}>
                🥇 PA01 — 45<br />
                🥈 PA08 — 38<br />
                🥉 Đoàn TN — 27
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminScreens() {
  return (
    <div className="row">
      <Phone label="Tổng quan + KPI" tag="A" rot={-.5}
        note="3 số liệu chính + biểu đồ 7 ngày + log hoạt động. Mở app là thấy.">
        <AdminStats />
      </Phone>
      <Phone label="Quản lý tin" tag="B" rot={.5}
        note="List tin với pill trạng thái + tìm kiếm + nút soạn nhanh.">
        <AdminNewsTable />
      </Phone>
      <Phone label="Danh sách user" tag="C" rot={-.4}
        note="Filter theo kênh, hiện đơn vị + icon kênh đăng ký.">
        <AdminUsers />
      </Phone>
      <Phone label="Soạn bản tin" tag="D" rot={.6}
        note="Có nút 'tóm tắt lại bằng AI' + xem trước trước khi gửi.">
        <AdminCompose />
      </Phone>
      <div className="variant" style={{ width: 520 }}>
        <div className="label">
          <span className="tag">E</span>
          <span>Web admin (desktop)</span>
        </div>
        <div className="note">
          Khi cán bộ vào bằng PC. Sidebar đỏ + KPI grid + biểu đồ cạnh BXH.
        </div>
        <AdminDesktop />
      </div>
    </div>
  );
}

Object.assign(window, { AdminScreens });
