// Thư viện phản bác — 4 variations

function LibSearch() {
  return (
    <>
      <PhoneTop title="Thư viện phản bác" />
      <div className="stack" style={{ flex: 1 }}>
        <div className="sk-input" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>🔍</span>
          <span className="hand2" style={{ color: "var(--muted)" }}>luận điểm cần phản bác...</span>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <span className="pill yellow">phổ biến</span>
          <span className="pill">đa nguyên</span>
          <span className="pill">tự do báo chí</span>
          <span className="pill">nhân quyền</span>
        </div>
        <div className="hand2" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
          12 kết quả
        </div>
        {[
          ["Luận điệu phủ nhận vai trò lãnh đạo của Đảng", "Chính trị"],
          ["Xuyên tạc về tự do tôn giáo ở VN", "Đối ngoại"],
          ["Sai lệch về kinh tế thị trường định hướng XHCN", "Kinh tế"],
        ].map(([t, c], i) => (
          <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="hand" style={{ fontWeight: 700, fontSize: 12 }}>📌 {t}</div>
            <div className="row-stack" style={{ justifyContent: "space-between" }}>
              <span className="pill">{c}</span>
              <span className="hand2" style={{ fontSize: 10, color: "var(--red)" }}>Xem phản bác →</span>
            </div>
          </div>
        ))}
      </div>
      <BottomNav active={2} />
    </>
  );
}

function LibCategoryTiles() {
  const cats = [
    { ico: "🏛️", t: "Chính trị", n: 24, c: "var(--red)", fg: "#fff" },
    { ico: "🛡️", t: "An ninh", n: 18, c: "var(--yellow)" },
    { ico: "💼", t: "Kinh tế", n: 12, c: "#fff" },
    { ico: "⚖️", t: "Pháp luật", n: 9, c: "#fff" },
    { ico: "🌐", t: "Đối ngoại", n: 7, c: "#fff" },
    { ico: "📜", t: "Lịch sử", n: 14, c: "#fff" },
  ];
  return (
    <>
      <PhoneTop title="Phản bác" sub="Theo chủ đề" />
      <div className="stack" style={{ flex: 1 }}>
        <div className="hand2" style={{ fontSize: 12, color: "var(--ink-soft)", textAlign: "center" }}>
          Chọn lĩnh vực để xem các luận điểm đúng đắn
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {cats.map((c, i) => (
            <div key={i} className="card" style={{
              background: c.c, color: c.fg || "var(--ink)",
              textAlign: "center", padding: "10px 6px",
            }}>
              <div style={{ fontSize: 20 }}>{c.ico}</div>
              <div className="hand" style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{c.t}</div>
              <div className="hand2" style={{ fontSize: 10, opacity: .8 }}>{c.n} luận điểm</div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav active={2} />
    </>
  );
}

function LibTopicTabs() {
  return (
    <>
      <PhoneTop title="Phản bác" />
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1.5px solid var(--line)",
        padding: "0 8px",
      }}>
        {["Phổ biến", "Mới", "Yêu cầu", "Tất cả"].map((t, i) => (
          <div key={i} className="hand" style={{
            padding: "8px 10px",
            fontSize: 12, fontWeight: 700,
            borderBottom: i === 0 ? "2px solid var(--red)" : "2px solid transparent",
            color: i === 0 ? "var(--red)" : "var(--ink-soft)",
          }}>{t}</div>
        ))}
      </div>
      <div className="stack" style={{ flex: 1, overflowY: "auto" }}>
        {[
          { t: "Cách phản biện luận điệu 'VN không có dân chủ'", k: ["dân chủ", "đa đảng"], v: 1240 },
          { t: "Xuyên tạc về Cách mạng tháng 8", k: ["lịch sử"], v: 890 },
          { t: "Sai lệch về biển đảo VN", k: ["chủ quyền"], v: 2100 },
        ].map((it, i) => (
          <div key={i} className="card">
            <div className="hand" style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3 }}>{it.t}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
              {it.k.map((k, j) => <span key={j} className="pill">{k}</span>)}
            </div>
            <div className="hand2" style={{ fontSize: 10, color: "var(--ink-soft)", marginTop: 6 }}>
              👁 {it.v} lượt · 🔖 Lưu
            </div>
          </div>
        ))}
      </div>
      <BottomNav active={2} />
    </>
  );
}

function LibFAQ() {
  return (
    <>
      <PhoneTop title="Hỏi - Đáp tư tưởng" />
      <div className="stack" style={{ flex: 1 }}>
        <div className="sk-input" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>🔍</span>
          <span className="hand2" style={{ color: "var(--muted)" }}>tìm câu hỏi...</span>
        </div>
        {[
          { q: "Vì sao VN không cần đa đảng?", open: true },
          { q: "Trả lời thế nào về 'tự do báo chí'?" },
          { q: "Phản bác luận điệu 'kinh tế tư nhân bị chèn ép'?" },
          { q: "Nói gì khi gặp 'nhân quyền VN bị vi phạm'?" },
        ].map((it, i) => (
          <div key={i} className="card" style={{ background: it.open ? "var(--yellow-soft)" : "#fff" }}>
            <div className="row-stack" style={{ justifyContent: "space-between" }}>
              <div className="hand" style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3, flex: 1 }}>
                ❓ {it.q}
              </div>
              <div className="hand" style={{ fontSize: 14, marginLeft: 6 }}>{it.open ? "−" : "+"}</div>
            </div>
            {it.open && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--line)" }}>
                <Bars rows={3} />
                <div className="row-stack" style={{ marginTop: 8, gap: 6 }}>
                  <span className="pill red">3 luận cứ</span>
                  <span className="pill">📎 nguồn</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <BottomNav active={2} />
    </>
  );
}

function LibDetail() {
  return (
    <>
      <PhoneTop title="← Chi tiết phản bác" />
      <div className="stack" style={{ flex: 1, overflowY: "auto" }}>
        <span className="pill red" style={{ alignSelf: "flex-start" }}>🏛️ Chính trị</span>
        <div className="hand" style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
          📌 Luận điệu: "VN không có dân chủ vì chỉ có 1 đảng"
        </div>
        <div className="card warn">
          <div className="hand" style={{ fontWeight: 700, fontSize: 12, color: "var(--red)" }}>⚠️ Sai lệch ở đâu?</div>
          <Bars rows={2} />
        </div>
        <div className="hand" style={{ fontWeight: 700, fontSize: 13 }}>✅ 3 luận cứ phản bác</div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="card" style={{ display: "flex", gap: 8 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 99,
              background: "var(--red)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Kalam', cursive", fontWeight: 700, fontSize: 12,
              flexShrink: 0,
            }}>{n}</div>
            <Bars rows={2} />
          </div>
        ))}
        <div className="row-stack" style={{ gap: 6 }}>
          <div className="sk-btn" style={{ flex: 1, fontSize: 11 }}>🔖 Lưu</div>
          <div className="sk-btn" style={{ flex: 1, fontSize: 11 }}>📤 Chia sẻ</div>
        </div>
      </div>
    </>
  );
}

function LibraryScreens() {
  return (
    <div className="row">
      <Phone label="Tìm kiếm + list" tag="A" rot={-.5}
        note="Search trên cùng + gợi ý từ khóa nóng + list kết quả gọn.">
        <LibSearch />
      </Phone>
      <Phone label="Lưới chủ đề" tag="B" rot={.6}
        note="Người dùng chọn lĩnh vực trước rồi mới drill vào. Trực quan.">
        <LibCategoryTiles />
      </Phone>
      <Phone label="Tab phổ biến/mới" tag="C" rot={-.3}
        note="Lọc theo Phổ biến / Mới / Yêu cầu. Hiển thị lượt xem để uy tín.">
        <LibTopicTabs />
      </Phone>
      <Phone label="FAQ accordion" tag="D" rot={.4}
        note="Câu hỏi mở rộng tại chỗ. Hợp với người mới, không cần điều hướng.">
        <LibFAQ />
      </Phone>
      <Phone label="Trang chi tiết" tag="E" rot={-.6}
        note="Khi đã chọn 1 luận điệu: cảnh báo + 3 luận cứ phản bác + lưu/chia sẻ.">
        <LibDetail />
      </Phone>
    </div>
  );
}

Object.assign(window, { LibraryScreens });
