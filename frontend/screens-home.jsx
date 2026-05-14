// Trang chủ — 5 variations

function HomeClassic() {
  return (
    <>
      <BrandBanner />
      <div className="stack" style={{ flex: 1 }}>
        <div style={{ textAlign: "center", padding: "6px 0" }}>
          <div className="hand" style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.3 }}>
            Bản tin tư tưởng <br />
            <span className="underline-sk">hàng ngày qua Telegram & Email</span>
          </div>
          <div className="hand2" style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6 }}>
            Tự động — Chính thống — Súc tích
          </div>
        </div>
        <div className="sk-btn primary">📨 Đăng ký nhận bản tin</div>
        <div className="sk-btn">💬 Vào Telegram Channel</div>
        <div className="row-stack" style={{ justifyContent: "space-around", padding: "10px 0", borderTop: "1.5px dashed var(--line)" }}>
          <div style={{ textAlign: "center" }}>
            <div className="hand" style={{ fontSize: 18, color: "var(--red)", fontWeight: 700 }}>500+</div>
            <div className="hand2" style={{ fontSize: 11 }}>thành viên</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="hand" style={{ fontSize: 18, color: "var(--red)", fontWeight: 700 }}>180</div>
            <div className="hand2" style={{ fontSize: 11 }}>bài/tuần</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="hand" style={{ fontSize: 18, color: "var(--red)", fontWeight: 700 }}>6h</div>
            <div className="hand2" style={{ fontSize: 11 }}>gửi đều</div>
          </div>
        </div>
      </div>
      <BottomNav active={0} />
    </>
  );
}

function HomeNewsFirst() {
  return (
    <>
      <PhoneTop title="TRẬN ĐỊA SỐ" right="13/05" sub="Thứ Hai · Bản tin sáng" />
      <div className="stack" style={{ flex: 1, overflowY: "auto" }}>
        <div className="hand" style={{ fontSize: 13, fontWeight: 700 }}>
          🔴 Tin quan trọng hôm nay
        </div>
        <NewsCard priority="Quan trọng" title="Nghị quyết mới về chuyển đổi số cấp cơ sở" category="Chính trị" src="Nhân Dân" />
        <NewsCard priority="Hôm nay" title="Phòng chống thông tin xấu, độc trên KGM" category="An ninh" src="CAND" />
        <div className="card warn" style={{ textAlign: "center" }}>
          <div className="hand2" style={{ fontSize: 12 }}>Nhận đầy đủ qua</div>
          <div className="row-stack" style={{ justifyContent: "center", gap: 6, marginTop: 6 }}>
            <span className="sk-btn primary" style={{ padding: "4px 10px", fontSize: 12 }}>📨 Email</span>
            <span className="sk-btn" style={{ padding: "4px 10px", fontSize: 12 }}>💬 Telegram</span>
          </div>
        </div>
      </div>
      <BottomNav active={0} />
    </>
  );
}

function HomeMission() {
  return (
    <>
      <BrandBanner />
      <div className="stack" style={{ flex: 1 }}>
        <div className="card red" style={{ textAlign: "center" }}>
          <div className="hand2" style={{ fontSize: 11, letterSpacing: 1 }}>SỨ MỆNH</div>
          <div className="hand" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginTop: 4 }}>
            Bảo vệ nền tảng <br />tư tưởng của Đảng <br />từ cơ sở số
          </div>
        </div>
        <div className="hand2" style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.4, textAlign: "center", padding: "0 4px" }}>
          Hệ thống tự động tổng hợp tin chính thống, AI tóm tắt, gửi đến cán bộ — đoàn viên — người dân Phú Thọ.
        </div>
        <div className="sk-btn primary">⚡ Bắt đầu nhận tin</div>
        <div className="sk-btn warn">🎯 Thử Quiz nhận thức</div>
      </div>
      <BottomNav active={0} />
    </>
  );
}

function HomeStats() {
  return (
    <>
      <PhoneTop title="TRẬN ĐỊA SỐ" right="LIVE" />
      <div className="stack" style={{ flex: 1 }}>
        <div style={{
          background: "var(--red)", color: "#fff",
          borderRadius: 10, padding: "14px",
          textAlign: "center",
          border: "2px solid var(--line)",
          boxShadow: "2px 2px 0 var(--line)",
        }}>
          <div className="hand" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>523</div>
          <div className="hand2" style={{ fontSize: 12, opacity: .9 }}>người đang nhận tin</div>
        </div>
        <div className="row-stack" style={{ gap: 8 }}>
          <div className="card" style={{ flex: 1, textAlign: "center" }}>
            <div className="hand" style={{ fontSize: 20, color: "var(--red)", fontWeight: 700 }}>1.2k</div>
            <div className="hand2" style={{ fontSize: 10 }}>tin/tháng</div>
          </div>
          <div className="card warn" style={{ flex: 1, textAlign: "center" }}>
            <div className="hand" style={{ fontSize: 20, fontWeight: 700 }}>42</div>
            <div className="hand2" style={{ fontSize: 10 }}>đơn vị</div>
          </div>
          <div className="card" style={{ flex: 1, textAlign: "center" }}>
            <div className="hand" style={{ fontSize: 20, color: "var(--red)", fontWeight: 700 }}>98%</div>
            <div className="hand2" style={{ fontSize: 10 }}>đúng giờ</div>
          </div>
        </div>
        <div className="sk-btn primary">📨 Tham gia ngay</div>
        <div className="card" style={{ background: "var(--paper)" }}>
          <div className="hand2" style={{ fontSize: 11, color: "var(--ink-soft)" }}>📊 Đơn vị dẫn đầu tuần này</div>
          <div className="hand" style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>🥇 Đoàn TN PA01 · 45 ng.</div>
        </div>
      </div>
      <BottomNav active={0} />
    </>
  );
}

function HomeGrid() {
  const items = [
    { ico: "📨", t: "Đăng ký", s: "Email & Telegram", c: "var(--red)", fg: "#fff" },
    { ico: "📰", t: "Bản tin", s: "Hôm nay", c: "var(--yellow)" },
    { ico: "🛡️", t: "Phản bác", s: "Thư viện", c: "#fff" },
    { ico: "🎯", t: "Quiz", s: "Nhận thức", c: "#fff" },
    { ico: "🏆", t: "BXH", s: "Đơn vị", c: "#fff" },
    { ico: "ℹ️", t: "Giới thiệu", s: "Về dự án", c: "#fff" },
  ];
  return (
    <>
      <BrandBanner small />
      <div className="stack" style={{ flex: 1 }}>
        <div className="hand2" style={{ fontSize: 13, color: "var(--ink-soft)", textAlign: "center" }}>
          Chọn một chức năng để bắt đầu
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {items.map((it, i) => (
            <div key={i} className="card" style={{
              background: it.c, color: it.fg || "var(--ink)",
              textAlign: "center", padding: 12,
            }}>
              <div style={{ fontSize: 22 }}>{it.ico}</div>
              <div className="hand" style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{it.t}</div>
              <div className="hand2" style={{ fontSize: 10, opacity: .8 }}>{it.s}</div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav active={0} />
    </>
  );
}

function HomeScreens() {
  return (
    <div className="row">
      <Phone label="Hero cổ điển" tag="A" rot={-1}
        note="Slogan + 2 CTA chính + dải số liệu nhỏ. An toàn, rõ phân cấp.">
        <HomeClassic />
      </Phone>
      <Phone label="Tin lên trước" tag="B" rot={.5}
        note="Hiển thị tin nóng ngay khi mở app. Đăng ký nằm trong card vàng.">
        <HomeNewsFirst />
      </Phone>
      <Phone label="Sứ mệnh dẫn dắt" tag="C" rot={-.5}
        note="Tuyên ngôn đỏ ở giữa, 2 CTA bên dưới. Trang nghiêm nhất.">
        <HomeMission />
      </Phone>
      <Phone label="Số liệu nổi bật" tag="D" rot={.8}
        note="Card đếm thành viên + grid 3 KPI. Tạo cảm giác cộng đồng đông.">
        <HomeStats />
      </Phone>
      <Phone label="Grid chức năng" tag="E" rot={-.3}
        note="Lưới 2×3 các tính năng. Phù hợp khi cần truy cập nhanh nhiều khu vực.">
        <HomeGrid />
      </Phone>
    </div>
  );
}

Object.assign(window, { HomeScreens });
