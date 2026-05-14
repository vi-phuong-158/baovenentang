// Form đăng ký nhận bản tin — 4 variations

function SignupSingle() {
  return (
    <>
      <PhoneTop title="Đăng ký bản tin" right="1/1" />
      <div className="stack" style={{ flex: 1 }}>
        <div className="hand" style={{ fontSize: 14, fontWeight: 700 }}>Thông tin của bạn</div>
        <div>
          <div className="hand2" style={{ fontSize: 12, color: "var(--ink-soft)" }}>Họ và tên <span className="star">*</span></div>
          <div className="sk-input" style={{ marginTop: 2 }}>Nguyễn Văn A</div>
        </div>
        <div>
          <div className="hand2" style={{ fontSize: 12, color: "var(--ink-soft)" }}>Email <span className="star">*</span></div>
          <div className="sk-input" style={{ marginTop: 2 }}>vd@email.vn</div>
        </div>
        <div>
          <div className="hand2" style={{ fontSize: 12, color: "var(--ink-soft)" }}>Đơn vị công tác</div>
          <div className="sk-input" style={{ marginTop: 2, color: "var(--muted)" }}>Phòng PA01...</div>
        </div>
        <div>
          <div className="hand2" style={{ fontSize: 12, color: "var(--ink-soft)" }}>Chủ đề quan tâm</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            <span className="pill red">Tất cả</span>
            <span className="pill">Chính trị</span>
            <span className="pill">An ninh</span>
            <span className="pill">Pháp luật</span>
          </div>
        </div>
        <div className="sk-btn primary" style={{ marginTop: "auto" }}>✓ Đăng ký nhận tin</div>
      </div>
    </>
  );
}

function SignupWizard() {
  return (
    <>
      <PhoneTop title="Đăng ký" right="Bước 2/3" />
      <div style={{ padding: "8px 14px 0" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <div style={{ flex: 1, height: 4, background: "var(--red)", borderRadius: 2 }}></div>
          <div style={{ flex: 1, height: 4, background: "var(--red)", borderRadius: 2 }}></div>
          <div style={{ flex: 1, height: 4, background: "#e0d8c5", borderRadius: 2 }}></div>
        </div>
      </div>
      <div className="stack" style={{ flex: 1 }}>
        <div className="hand" style={{ fontSize: 16, fontWeight: 700 }}>Chọn kênh nhận tin</div>
        <div className="hand2" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
          Có thể chọn cả hai — chúng tôi sẽ không spam.
        </div>
        <label className="card warn" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 18, height: 18, border: "2px solid var(--line)", borderRadius: 4, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</div>
          <div>
            <div className="hand" style={{ fontWeight: 700, fontSize: 13 }}>💬 Telegram</div>
            <div className="hand2" style={{ fontSize: 11 }}>Tin nhanh 6h30 sáng</div>
          </div>
        </label>
        <label className="card" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 18, height: 18, border: "2px solid var(--line)", borderRadius: 4, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</div>
          <div>
            <div className="hand" style={{ fontWeight: 700, fontSize: 13 }}>📨 Email tuần</div>
            <div className="hand2" style={{ fontSize: 11 }}>Tổng hợp thứ Hai</div>
          </div>
        </label>
        <label className="card" style={{ display: "flex", gap: 10, alignItems: "center", opacity: .6 }}>
          <div style={{ width: 18, height: 18, border: "2px solid var(--line)", borderRadius: 4 }}></div>
          <div>
            <div className="hand" style={{ fontWeight: 700, fontSize: 13 }}>🔔 Push web</div>
            <div className="hand2" style={{ fontSize: 11 }}>Sắp ra mắt</div>
          </div>
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
          <div className="sk-btn" style={{ flex: 1 }}>← Quay lại</div>
          <div className="sk-btn primary" style={{ flex: 2 }}>Tiếp tục →</div>
        </div>
      </div>
    </>
  );
}

function SignupBottomSheet() {
  return (
    <>
      <BrandBanner />
      <div className="stack" style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div className="hand2" style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>
          (Trang nền — bị mờ)
        </div>
        <Bars rows={4} />
        <Bars rows={3} />
        <div style={{
          position: "absolute", inset: "auto -2px -2px",
          background: "#fff",
          border: "2px solid var(--line)",
          borderRadius: "16px 16px 0 0",
          padding: "10px 12px 14px",
          boxShadow: "0 -4px 0 var(--line)",
        }}>
          <div style={{ width: 36, height: 4, background: "var(--muted)", borderRadius: 2, margin: "0 auto 8px" }}></div>
          <div className="hand" style={{ fontWeight: 700, fontSize: 14, textAlign: "center" }}>
            Nhận bản tin sáng mai? 🌅
          </div>
          <div className="hand2" style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", marginBottom: 8 }}>
            Chỉ cần email — 5 giây thôi.
          </div>
          <div className="sk-input" style={{ marginBottom: 6 }}>email@vd.vn</div>
          <div className="sk-btn primary">Nhận tin 6h30 sáng mai →</div>
          <div className="hand2" style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>
            Hoặc <u>tham gia Telegram</u>
          </div>
        </div>
      </div>
    </>
  );
}

function SignupSplit() {
  return (
    <>
      <PhoneTop title="Chọn kênh & đăng ký" />
      <div className="stack" style={{ flex: 1 }}>
        <div className="row-stack" style={{ gap: 6 }}>
          <div className="card red" style={{ flex: 1, textAlign: "center", padding: 10 }}>
            <div style={{ fontSize: 18 }}>💬</div>
            <div className="hand" style={{ fontWeight: 700, fontSize: 12 }}>Telegram</div>
            <div className="hand2" style={{ fontSize: 9, opacity: .9 }}>tin nhanh</div>
          </div>
          <div className="card" style={{ flex: 1, textAlign: "center", padding: 10 }}>
            <div style={{ fontSize: 18 }}>📨</div>
            <div className="hand" style={{ fontWeight: 700, fontSize: 12 }}>Email</div>
            <div className="hand2" style={{ fontSize: 9, color: "var(--ink-soft)" }}>tổng hợp</div>
          </div>
        </div>
        <div className="hand2" style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center" }}>
          ↑ Đã chọn Telegram — quét QR bên dưới
        </div>
        <div style={{
          width: 130, height: 130, margin: "0 auto",
          background: "repeating-linear-gradient(45deg, var(--ink) 0 4px, #fff 4px 8px)",
          border: "3px solid var(--line)",
          borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span className="hand" style={{ background: "#fff", padding: "4px 8px", fontWeight: 700, fontSize: 11 }}>QR @bot</span>
        </div>
        <div className="hand2" style={{ fontSize: 11, textAlign: "center", color: "var(--ink-soft)" }}>
          hoặc bấm
        </div>
        <div className="sk-btn primary">📱 Mở Telegram ngay</div>
        <div className="hand2" style={{ fontSize: 10, textAlign: "center", color: "var(--muted)" }}>
          Đăng ký Email? <u>Bấm vào đây</u>
        </div>
      </div>
    </>
  );
}

function SignupSuccess() {
  return (
    <>
      <PhoneTop title="Hoàn tất" right="✓" />
      <div className="stack" style={{ flex: 1, justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>🎉</div>
        <div className="hand" style={{ fontWeight: 700, fontSize: 18 }}>
          Đã đăng ký thành công!
        </div>
        <div className="hand2" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Bản tin đầu tiên sẽ đến lúc <b>6h30 sáng mai</b>.
        </div>
        <div className="card warn" style={{ textAlign: "left" }}>
          <div className="hand" style={{ fontWeight: 700, fontSize: 13 }}>🎁 Tặng bạn:</div>
          <div className="hand2" style={{ fontSize: 12 }}>10 câu hỏi Quiz nhận thức — thử ngay?</div>
        </div>
        <div className="sk-btn primary">🎯 Làm Quiz ngay</div>
        <div className="sk-btn">🏠 Về trang chủ</div>
      </div>
    </>
  );
}

function SignupScreens() {
  return (
    <div className="row">
      <Phone label="Form một trang" tag="A" rot={-.5}
        note="Mọi trường trên 1 màn. Đơn giản, ai cũng quen.">
        <SignupSingle />
      </Phone>
      <Phone label="Wizard 3 bước" tag="B" rot={.5}
        note="Tách kênh, thông tin, chủ đề thành 3 bước. Bớt choáng ngợp.">
        <SignupWizard />
      </Phone>
      <Phone label="Bottom-sheet nhanh" tag="C" rot={-.8}
        note="Trượt lên từ đáy, chỉ hỏi email. Cao tỷ lệ chuyển đổi.">
        <SignupBottomSheet />
      </Phone>
      <Phone label="Chọn kênh + QR" tag="D" rot={.3}
        note="Ưu tiên Telegram (kênh chính). Có QR cho đoàn viên quét trực tiếp.">
        <SignupSplit />
      </Phone>
      <Phone label="Màn hoàn tất" tag="E" rot={-.2}
        note="Cảm xúc + gợi ý hành động tiếp theo (làm Quiz để giữ chân).">
        <SignupSuccess />
      </Phone>
    </div>
  );
}

Object.assign(window, { SignupScreens });
