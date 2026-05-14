// Main app — tabs, density, tweaks panel

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "loose",
  "showGrid": true
}/*EDITMODE-END*/;

const SCREENS = [
  { id: "home", label: "Trang chủ", count: 5, Comp: HomeScreens,
    blurb: "Người dùng vào lần đầu — cần hiểu ngay 'đây là gì' và 'đăng ký ở đâu'." },
  { id: "signup", label: "Đăng ký", count: 5, Comp: SignupScreens,
    blurb: "Form nhận bản tin — đỉnh điểm cần chuyển đổi. Càng ít rào cản càng tốt." },
  { id: "library", label: "Phản bác", count: 5, Comp: LibraryScreens,
    blurb: "Tra cứu luận điểm đúng đắn để cán bộ/đoàn viên sử dụng khi tranh luận." },
  { id: "quiz", label: "Quiz", count: 5, Comp: QuizScreens,
    blurb: "Kiểm tra nhận thức — gamify để tạo thói quen, không thi cử nặng nề." },
  { id: "admin", label: "Admin", count: 5, Comp: AdminScreens,
    blurb: "Cán bộ vận hành: theo dõi số liệu, duyệt/soạn tin, quản người dùng." },
];

function App() {
  const [active, setActive] = React.useState("home");
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // expose density via body class
  React.useEffect(() => {
    document.body.classList.toggle("compact", t.density === "compact");
  }, [t.density]);

  // toggle grid bg
  React.useEffect(() => {
    document.body.style.setProperty("--grid", t.showGrid ? "#D7CDB7" : "transparent");
  }, [t.showGrid]);

  const screen = SCREENS.find(s => s.id === active);

  return (
    <>
      <header className="top">
        <div className="title-block">
          <h1>Wireframes — Trận Địa Số</h1>
          <div className="sub">5 màn hình · {SCREENS.reduce((a, s) => a + s.count, 0)} phương án · mobile-first · lo-fi</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div className="meta">
            <div><b>Tác giả:</b> Vi Ngọc Phương · PA01 Phú Thọ</div>
            <div><b>Phiên bản:</b> v0.1 wireframe · 13/05/2026</div>
          </div>
          <div className="stamp">LO-FI · WIP</div>
        </div>
      </header>

      <div className="tabs-wrap">
        <div className="tabs">
          {SCREENS.map((s, i) => (
            <button key={s.id} className={`tab ${active === s.id ? "active" : ""}`}
              onClick={() => setActive(s.id)}>
              <span className="num">0{i + 1}</span>{s.label}
            </button>
          ))}
          <div style={{ flex: 1 }}></div>
          <div className="controls" style={{ paddingBottom: 8, paddingTop: 4 }}>
            <span className="hand2" style={{ fontSize: 13, color: "var(--ink-soft)" }}>Mật độ:</span>
            <button className={`ctrl-btn ${t.density === "loose" ? "on" : ""}`}
              onClick={() => setTweak("density", "loose")}>Thoáng</button>
            <button className={`ctrl-btn ${t.density === "compact" ? "on" : ""}`}
              onClick={() => setTweak("density", "compact")}>Đậm</button>
          </div>
        </div>
      </div>

      <main className="canvas">
        <div className="screen-title">
          <h2>0{SCREENS.findIndex(s => s.id === active) + 1} · {screen.label}</h2>
          <span className="crumb">{screen.count} phương án</span>
          <span style={{ flexBasis: "100%" }}></span>
          <span className="blurb">{screen.blurb}</span>
        </div>

        <screen.Comp />

        <div className="design-notes">
          <b>📝 Ghi chú thiết kế</b>
          {active === "home" && (
            <ul>
              <li>Phương án <b>A</b> & <b>C</b> phù hợp cho cán bộ chính thức; <b>D</b> & <b>E</b> hợp đoàn viên trẻ.</li>
              <li>Mọi phương án đều có 2 CTA chính: <span className="pill red">Telegram</span> và <span className="pill yellow">Email</span>.</li>
              <li>Mật độ "Đậm" sẽ nén padding xuống ~40% để xem nhanh trên Telegram WebView.</li>
            </ul>
          )}
          {active === "signup" && (
            <ul>
              <li>Khuyến nghị kết hợp <b>C</b> (bottom-sheet) làm trigger nổi + <b>A</b> làm trang đầy đủ.</li>
              <li><b>D</b> (QR Telegram) nên xuất hiện ở banner trong các app sẵn có (hocnghiquyet, capphutho).</li>
              <li>Sau khi đăng ký → bắc cầu sang Quiz (<b>E</b>) để giữ chân.</li>
            </ul>
          )}
          {active === "library" && (
            <ul>
              <li><b>B</b> (lưới chủ đề) là khởi đầu trực quan nhất cho người mới.</li>
              <li><b>D</b> (FAQ) phù hợp khi đoàn viên gặp tình huống cụ thể trên mạng xã hội.</li>
              <li><b>E</b> là màn detail dùng chung — vào từ bất kỳ phương án nào.</li>
            </ul>
          )}
          {active === "quiz" && (
            <ul>
              <li><b>B</b> (multi-choice) bấm vào đáp án để xem feedback đúng/sai trực tiếp.</li>
              <li><b>E</b> (1 câu/ngày + streak) là chiến lược giữ chân chính cho dự án.</li>
              <li><b>C</b> (vuốt thẻ) chỉ nên dùng cho người dùng dưới 30 — không khuyến nghị cho cán bộ chính thức.</li>
            </ul>
          )}
          {active === "admin" && (
            <ul>
              <li><b>E</b> (desktop) là môi trường làm việc chính của cán bộ vận hành — ưu tiên build trước.</li>
              <li>Mobile admin (<b>A-D</b>) cho việc giám sát từ xa: số liệu, duyệt nhanh, gửi khẩn.</li>
              <li>Nút "Tóm tắt lại bằng AI" (<b>D</b>) gọi Gemini từ client → tiết kiệm quota GAS.</li>
            </ul>
          )}
        </div>
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Hiển thị">
          <TweakRadio label="Mật độ"
            value={t.density}
            onChange={(v) => setTweak("density", v)}
            options={["loose", "compact"]} />
          <TweakToggle label="Lưới giấy nháp"
            value={t.showGrid}
            onChange={(v) => setTweak("showGrid", v)} />
        </TweakSection>
        <TweakSection label="Đi đến màn">
          {SCREENS.map((s, i) => (
            <TweakButton key={s.id}
              label={`0${i + 1} · ${s.label}`}
              onClick={() => {
                setActive(s.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }} />
          ))}
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
