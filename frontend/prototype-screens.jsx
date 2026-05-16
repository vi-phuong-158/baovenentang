// Mobile screens for Trợ lý 35 prototype
// Router state managed in parent. Each screen receives (go) function.

// ─── Brand strip used on most screens ─────────────────────────
function BrandStrip({ subtitle, right }) {
  return (
    <div className="brand-strip">
      <div className="mark"><Icon name="shield-check" size={20} stroke={2} /></div>
      <div className="grow">
        <div className="name">TRỢ LÝ 35</div>
        <div className="tag">{subtitle || "Thông tin đúng · Tư tưởng vững"}</div>
      </div>
      {right}
    </div>
  );
}

// ─── Page header for sub-screens ──────────────────────────────
function PageHeader({ title, onBack, right }) {
  return (
    <div className="row" style={{ marginBottom: 14, gap: 10 }}>
      {onBack && (
        <button onClick={onBack} className="clickable" style={{
          width: 38, height: 38, borderRadius: 12,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "var(--ink)",
        }}><Icon name="arrowLeft" size={20} /></button>
      )}
      <div className="grow">
        <div className="display" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

// ─── Bottom tab bar ───────────────────────────────────────────
function TabBar({ active, go }) {
  const tabs = [
    { id: "home", ico: "home", label: "Trang chủ" },
    { id: "feed", ico: "news", label: "Bản tin" },
    { id: "library", ico: "shield-check", label: "Phản bác" },
    { id: "quiz-intro", ico: "target", label: "Quiz" },
    { id: "leaderboard", ico: "trophy", label: "BXH" },
  ];
  const activeRoot = active.split("-")[0];
  const activeKey = activeRoot === "quiz" ? "quiz-intro" :
                    activeRoot === "signup" || activeRoot === "home" ? "home" :
                    activeRoot === "feed" || activeRoot === "article" ? "feed" :
                    activeRoot === "library" || activeRoot === "category" || activeRoot === "rebuttal" ? "library" :
                    activeRoot === "leaderboard" ? "leaderboard" : "home";
  return (
    <div className="tabbar">
      {tabs.map(t => (
        <div key={t.id}
          onClick={() => go(t.id)}
          className={`t ${activeKey === t.id ? "on" : ""}`}>
          <div className="ico"><Icon name={t.ico} size={20} stroke={activeKey === t.id ? 2 : 1.75} /></div>
          <div>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── HOME — Variant E: Grid 2×3 ───────────────────────────────
function HomeGrid({ go }) {
  const tiles = [
    { id: "signup",      ico: "mail",         t: "Đăng ký",      s: "Email & Telegram", style: "red" },
    { id: "feed",        ico: "news",         t: "Bản tin",      s: "Hôm nay · 8 tin",  style: "yellow" },
    { id: "library",     ico: "shield-check", t: "Phản bác",     s: "84 luận điểm" },
    { id: "quiz-intro",  ico: "target",       t: "Quiz",         s: "Nhận thức" },
    { id: "leaderboard", ico: "trophy",       t: "Bảng xếp hạng",s: "Đơn vị tích cực" },
    { id: "about",       ico: "info",         t: "Giới thiệu",   s: "Về dự án" },
  ];
  return (
    <div className="screen-pad with-tabbar page-fade pa">
      <BrandStrip subtitle="Bản tin tư tưởng hàng ngày" />
      <div className="strut-lg"></div>
      <div className="section-label">Thứ Hai · 13 / 05 / 2026</div>
      <div className="display" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, marginBottom: 14 }}>
        Chào buổi sáng,<br />
        <span style={{ color: "var(--red)" }}>chọn việc cần làm</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {tiles.map(t => {
          const isRed = t.style === "red";
          const isYellow = t.style === "yellow";
          return (
            <div key={t.id}
              onClick={() => go(t.id)}
              className="clickable"
              style={{
                background: isRed ? "var(--red)" : isYellow ? "var(--yellow)" : "var(--surface)",
                color: isRed ? "#fff" : "var(--ink)",
                border: `1px solid ${isRed ? "var(--red)" : isYellow ? "var(--yellow)" : "var(--line)"}`,
                borderRadius: 18,
                padding: "16px 14px",
                aspectRatio: "1 / .9",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                boxShadow: isRed ? "0 10px 22px -6px rgba(184,50,39,.32)" : "0 4px 12px -4px rgba(26,20,16,.06)",
              }}>
              <div className="hero-icon" style={{
                background: isRed ? "rgba(255,255,255,.18)" : isYellow ? "rgba(255,255,255,.5)" : "var(--surface-2)",
                border: isRed ? "1px solid rgba(255,255,255,.25)" : isYellow ? "1px solid rgba(255,255,255,.6)" : "1px solid var(--line)",
                color: isRed ? "#fff" : "var(--ink)",
              }}>
                <Icon name={t.ico} size={22} stroke={1.75} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.15 }}>{t.t}</div>
                <div style={{ fontSize: 11, opacity: .8, marginTop: 2 }}>{t.s}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="strut-lg"></div>
      <div className="card tinted" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="icon-chip"><Icon name="message" size={20} /></div>
        <div className="grow">
          <div style={{ fontWeight: 600, fontSize: 13 }}>Tham gia kênh Telegram</div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>523 thành viên · cập nhật 6h30 mỗi sáng</div>
        </div>
        <Icon name="chevronRight" size={18} color="var(--red)" />
      </div>
      <TabBar active="home" go={go} />
    </div>
  );
}

// ─── SIGNUP — Variant B: 3-step wizard ────────────────────────
function SignupWizard({ go }) {
  const [step, setStep] = React.useState(1);
  const [channels, setChannels] = React.useState({ tg: true, email: false });
  const [topics, setTopics] = React.useState(new Set(["all"]));

  function next() {
    if (step < 3) setStep(step + 1);
    else go("signup-done");
  }
  function back() {
    if (step > 1) setStep(step - 1);
    else go("home");
  }

  const progress = (
    <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
      {[1, 2, 3].map(n => (
        <div key={n} style={{
          flex: 1, height: 6, borderRadius: 99,
          background: n <= step ? "var(--red)" : "var(--line)",
          transition: "background .25s",
        }}></div>
      ))}
    </div>
  );

  return (
    <div className="screen-pad page-fade pa">
      <PageHeader title="Đăng ký bản tin" onBack={back}
        right={<span className="pill">{step}/3</span>} />
      {progress}

      {step === 1 && (
        <>
          <div className="display" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}>
            Bạn muốn nhận tin qua đâu?
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 18 }}>
            Có thể chọn cả hai — chúng tôi sẽ không spam.
          </div>
          <ChannelOption
            ico="message" title="Telegram"
            desc="Tin nhanh mỗi sáng 6h30 · top 5 tin"
            checked={channels.tg}
            highlight
            onToggle={() => setChannels(c => ({ ...c, tg: !c.tg }))} />
          <div className="strut"></div>
          <ChannelOption
            ico="mail" title="Email"
            desc="Bản tin hàng ngày + tổng hợp tuần"
            checked={channels.email}
            onToggle={() => setChannels(c => ({ ...c, email: !c.email }))} />
          <div className="strut"></div>
          <ChannelOption
            ico="bell" title="Push web"
            desc="Sắp ra mắt"
            disabled
            onToggle={() => {}} />
        </>
      )}

      {step === 2 && (
        <>
          <div className="display" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 18 }}>
            Cho chúng tôi biết về bạn
          </div>
          <div className="col" style={{ gap: 14 }}>
            <div>
              <div className="field-label">Họ và tên</div>
              <input className="field" defaultValue="Nguyễn Văn A" />
            </div>
            <div>
              <div className="field-label">Email <span style={{ color: "var(--red)" }}>*</span></div>
              <input className="field" defaultValue="vana@phutho.gov.vn" />
            </div>
            <div>
              <div className="field-label">Đơn vị công tác</div>
              <input className="field" placeholder="VD: Phòng PA01" />
            </div>
            <div>
              <div className="field-label">Vai trò</div>
              <select className="field">
                <option>Cán bộ Công an</option>
                <option>Đoàn viên thanh niên</option>
                <option>Cán bộ tỉnh / huyện</option>
                <option>Người dân</option>
              </select>
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="display" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}>
            Chủ đề bạn quan tâm
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 18 }}>
            Chúng tôi sẽ lọc tin phù hợp với bạn.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["all",     "Tất cả",      "globe"],
              ["politic", "Chính trị",   "landmark"],
              ["security","An ninh",     "shield"],
              ["law",     "Pháp luật",   "scale"],
              ["econ",    "Kinh tế",     "briefcase"],
              ["foreign", "Đối ngoại",   "globe"],
            ].map(([id, lbl, ico]) => {
              const on = topics.has(id);
              return (
                <div key={id}
                  onClick={() => setTopics(s => {
                    const ns = new Set(s);
                    if (ns.has(id)) ns.delete(id); else ns.add(id);
                    return ns;
                  })}
                  className="clickable"
                  style={{
                    padding: "14px 12px",
                    borderRadius: 14,
                    border: `2px solid ${on ? "var(--red)" : "var(--line)"}`,
                    background: on ? "var(--red-soft)" : "var(--surface)",
                    color: on ? "var(--red-dark)" : "var(--ink)",
                  }}>
                  <div className="hero-icon" style={{
                    width: 38, height: 38, marginBottom: 8,
                    background: on ? "#fff" : "var(--surface-2)",
                    border: on ? "1px solid var(--red)" : "1px solid var(--line)",
                    color: on ? "var(--red)" : "var(--ink)",
                  }}>
                    <Icon name={ico} size={20} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{lbl}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="bottom-bar">
        <button className="btn ghost" style={{ width: "auto", padding: "14px 18px", background: "rgba(255,255,255,.6)" }} onClick={back}>
          <Icon name="arrowLeft" size={18} />
        </button>
        <button className="btn primary" onClick={next}>
          {step === 3 ? <><Icon name="check" size={18} stroke={2.25} /> Hoàn tất</> : <>Tiếp tục <Icon name="arrowRight" size={18} /></>}
        </button>
      </div>
    </div>
  );
}

function ChannelOption({ ico, title, desc, checked, onToggle, highlight, disabled }) {
  return (
    <div onClick={disabled ? undefined : onToggle}
      className={disabled ? "" : "clickable"}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: 14,
        borderRadius: 16,
        border: `2px solid ${checked ? "var(--red)" : "var(--line)"}`,
        background: checked ? "var(--red-soft)" : highlight ? "var(--yellow-soft)" : "var(--surface)",
        opacity: disabled ? .5 : 1,
      }}>
      <div className="icon-chip lg" style={{
        background: checked ? "var(--red)" : highlight ? "#fff" : "var(--surface-2)",
        color: checked ? "#fff" : "var(--ink)",
        border: checked ? "1px solid var(--red)" : "1px solid var(--line)",
      }}>
        <Icon name={ico} size={22} />
      </div>
      <div className="grow">
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{desc}</div>
      </div>
      <div className={`check ${checked ? "on" : ""}`}>
        {checked && <Icon name="check" size={14} stroke={2.5} />}
      </div>
    </div>
  );
}

function SignupDone({ go }) {
  return (
    <div className="screen-pad page-fade pa" style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      textAlign: "center",
    }}>
      <div className="strut-lg"></div>
      <div style={{
        width: 96, height: 96, borderRadius: 99,
        background: "var(--ok-soft)", color: "var(--ok)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 18,
        boxShadow: "0 12px 32px -8px rgba(31,138,91,.35), inset 0 1px 0 rgba(255,255,255,.6)",
      }}><Icon name="check" size={48} stroke={2.25} /></div>
      <div className="display" style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
        Đã đăng ký thành công!
      </div>
      <div style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 22, lineHeight: 1.5 }}>
        Bản tin đầu tiên sẽ đến lúc<br />
        <b style={{ color: "var(--ink)" }}>6h30 sáng mai</b> qua Telegram & Email.
      </div>
      <div className="card yellow" style={{ textAlign: "left", width: "100%", marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <div className="icon-chip" style={{ background: "#fff", color: "var(--red)", border: "1px solid rgba(0,0,0,.06)" }}>
          <Icon name="gift" size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Tặng bạn</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            5 câu Quiz nhận thức để kiểm tra kiến thức ngay.
          </div>
        </div>
      </div>
      <button className="btn primary" onClick={() => go("quiz-intro")}>
        <Icon name="target" size={18} stroke={2} /> Làm Quiz ngay
      </button>
      <div className="strut"></div>
      <button className="btn ghost" onClick={() => go("home")}>
        Về trang chủ
      </button>
    </div>
  );
}

// ─── FEED (today's newsletter) ────────────────────────────────
const NEWS = [
  {
    id: "n1",
    priority: "Quan trọng",
    cat: "Chính trị",
    title: "Bộ Chính trị ban hành Nghị quyết mới về chuyển đổi số cấp cơ sở",
    summary: "Nghị quyết xác định 5 nhóm nhiệm vụ trọng tâm giai đoạn 2026-2030, trong đó đẩy mạnh ứng dụng AI và dữ liệu lớn trong quản lý nhà nước.",
    src: "Báo Nhân Dân", time: "5h45",
  },
  {
    id: "n2",
    priority: "Quan trọng",
    cat: "An ninh",
    title: "Tăng cường phòng chống thông tin xấu, độc trên không gian mạng",
    summary: "Bộ Công an phối hợp các bộ ngành triển khai 3 nhóm giải pháp, đặc biệt nhấn mạnh vai trò của lực lượng nòng cốt tại cơ sở.",
    src: "CAND", time: "5h32",
  },
  {
    id: "n3",
    priority: "Bình thường",
    cat: "Kinh tế",
    title: "Phú Thọ vượt mục tiêu thu ngân sách quý I/2026",
    summary: "Tổng thu đạt 112% kế hoạch, đặc biệt khu vực doanh nghiệp ngoài quốc doanh tăng 18% so cùng kỳ.",
    src: "Báo Phú Thọ", time: "4h18",
  },
  {
    id: "n4",
    priority: "Bình thường",
    cat: "Pháp luật",
    title: "Luật Bảo vệ dữ liệu cá nhân: 5 điểm mới có hiệu lực 01/07",
    summary: "Doanh nghiệp xử lý dữ liệu cá nhân phải đăng ký với Bộ Công an. Mức phạt cao nhất 5% doanh thu năm.",
    src: "Chính phủ", time: "4h02",
  },
];

function FeedScreen({ go }) {
  return (
    <div className="screen-pad with-tabbar page-fade pa">
      <div className="row" style={{ marginBottom: 4 }}>
        <div className="grow">
          <div className="section-label">Thứ Hai · 13/05/2026</div>
          <div className="display" style={{ fontSize: 24, fontWeight: 800 }}>Bản tin sáng</div>
        </div>
        <span className="pill ok"><Icon name="check" size={12} stroke={2.5} /> Đã gửi</span>
      </div>
      <div style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 16 }}>
        AI đã chọn lọc 8 tin từ 142 bài. Đọc 2 phút.
      </div>

      <div className="section-label" style={{ color: "var(--red)", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--red)" }}></span>
        Quan trọng
      </div>
      {NEWS.filter(n => n.priority === "Quan trọng").map(n => (
        <ArticleCard key={n.id} n={n} go={go} />
      ))}

      <div className="strut"></div>
      <div className="section-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--yellow)" }}></span>
        Hôm nay cần biết
      </div>
      {NEWS.filter(n => n.priority === "Bình thường").map(n => (
        <ArticleCard key={n.id} n={n} go={go} />
      ))}

      <div className="strut"></div>
      <div className="card yellow" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div className="icon-chip" style={{ background: "#fff" }}>
          <Icon name="message" size={20} color="var(--red)" />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>Thông điệp ngày</div>
          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>
            "Bảo vệ nền tảng tư tưởng là trách nhiệm chung — từ mỗi cán bộ, đảng viên, đoàn viên."
          </div>
        </div>
      </div>

      <TabBar active="feed" go={go} />
    </div>
  );
}

function ArticleCard({ n, go }) {
  return (
    <div onClick={() => go(`article-${n.id}`)} className="card clickable" style={{ marginBottom: 10 }}>
      <div className="row" style={{ marginBottom: 8, gap: 6 }}>
        <span className="pill" style={{
          background: n.priority === "Quan trọng" ? "var(--red)" : "var(--yellow)",
          color: n.priority === "Quan trọng" ? "#fff" : "var(--ink)",
          borderColor: "transparent",
        }}>{n.cat}</span>
        <span style={{ flex: 1 }}></span>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-mute)" }}>{n.src} · {n.time}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, marginBottom: 6 }}>
        {n.title}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.45 }}>
        {n.summary}
      </div>
      <div className="row" style={{ marginTop: 10, gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 600 }}>Đọc chi tiết</span>
        <Icon name="arrowRight" size={14} color="var(--red)" stroke={2} />
      </div>
    </div>
  );
}

function ArticleDetail({ go, id }) {
  const n = NEWS.find(x => x.id === id) || NEWS[0];
  return (
    <div className="screen-pad page-fade pa">
      <PageHeader title="Tin chi tiết" onBack={() => go("feed")} />
      <div className="row" style={{ gap: 6, marginBottom: 10 }}>
        <span className="pill" style={{
          background: n.priority === "Quan trọng" ? "var(--red)" : "var(--yellow)",
          color: n.priority === "Quan trọng" ? "#fff" : "var(--ink)",
          borderColor: "transparent",
        }}>{n.cat}</span>
        <span className="pill" style={{ display: "inline-flex", gap: 4 }}>
          <Icon name="sparkles" size={11} stroke={2} /> AI tóm tắt
        </span>
      </div>
      <div className="display" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 10 }}>
        {n.title}
      </div>
      <div className="mono" style={{ fontSize: 11, color: "var(--ink-mute)", marginBottom: 14 }}>
        {n.src} · {n.time} · 13/05/2026
      </div>

      <div className="card tinted" style={{ marginBottom: 14 }}>
        <div className="section-label">Tóm tắt AI</div>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>
          {n.summary}
        </div>
      </div>

      <div className="section-label">Thông điệp cốt lõi</div>
      <div className="card red" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, lineHeight: 1.4, fontWeight: 500 }}>
          Chuyển đổi số là động lực then chốt để nâng cao hiệu quả công tác Đảng và quản lý nhà nước.
        </div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost sm" style={{ flex: 1 }}><Icon name="bookmark" size={15} /> Lưu</button>
        <button className="btn ghost sm" style={{ flex: 1 }}><Icon name="share" size={15} /> Chia sẻ</button>
        <button className="btn primary sm" style={{ flex: 1 }}>Bản gốc <Icon name="link" size={14} /></button>
      </div>
    </div>
  );
}

// ─── LIBRARY — Variant B: Tiles → list → detail ──────────────
const CATEGORIES = [
  { id: "politic",  ico: "🏛", t: "Chính trị",  n: 24, style: "red" },
  { id: "security", ico: "🛡", t: "An ninh",    n: 18, style: "yellow" },
  { id: "econ",     ico: "💼", t: "Kinh tế",    n: 12 },
  { id: "law",      ico: "⚖️", t: "Pháp luật",  n: 9 },
  { id: "foreign",  ico: "🌐", t: "Đối ngoại",  n: 7 },
  { id: "history",  ico: "📜", t: "Lịch sử",    n: 14 },
];

const REBUTTALS = {
  politic: [
    { id: "r1", t: "VN không có dân chủ vì chỉ có 1 đảng", v: 1240, hot: true },
    { id: "r2", t: "Hệ thống chính trị VN lạc hậu, cần đa nguyên đa đảng", v: 980 },
    { id: "r3", t: "Phủ nhận vai trò lãnh đạo của Đảng trong sự nghiệp đổi mới", v: 670 },
    { id: "r4", t: "Xuyên tạc Cương lĩnh xây dựng đất nước thời kỳ quá độ", v: 410 },
  ],
  security: [
    { id: "r5", t: "Vu cáo lực lượng Công an vi phạm nhân quyền", v: 1820, hot: true },
    { id: "r6", t: "Xuyên tạc về Luật An ninh mạng", v: 1320 },
  ],
  econ: [{ id: "r7", t: "Sai lệch về kinh tế thị trường định hướng XHCN", v: 540 }],
  law: [{ id: "r8", t: "Bóp méo Luật Đất đai 2024", v: 280 }],
  foreign: [{ id: "r9", t: "Xuyên tạc chính sách đối ngoại 'cây tre'", v: 620 }],
  history: [{ id: "r10", t: "Phủ nhận thành quả Cách mạng tháng Tám", v: 1100, hot: true }],
};

function LibraryTiles({ go }) {
  return (
    <div className="screen-pad with-tabbar page-fade pa">
      <div className="row">
        <div className="grow">
          <div className="section-label">Thư viện</div>
          <div className="display" style={{ fontSize: 24, fontWeight: 800 }}>Phản bác</div>
        </div>
        <button className="btn ghost sm" style={{ width: "auto", padding: "8px 12px" }}>🔍</button>
      </div>
      <div style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 18 }}>
        Chọn lĩnh vực để xem các luận điểm đúng đắn dùng khi phản biện.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {CATEGORIES.map(c => {
          const isRed = c.style === "red";
          const isYellow = c.style === "yellow";
          return (
            <div key={c.id}
              onClick={() => go(`category-${c.id}`)}
              className="clickable"
              style={{
                background: isRed ? "var(--red)" : isYellow ? "var(--yellow)" : "var(--surface)",
                color: isRed ? "#fff" : "var(--ink)",
                border: `1px solid ${isRed ? "var(--red)" : isYellow ? "var(--yellow)" : "var(--line)"}`,
                borderRadius: 18,
                padding: "14px 14px 12px",
                aspectRatio: "1 / .85",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}>
              <div style={{ fontSize: 26 }}>{c.ico}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.t}</div>
                <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>{c.n} luận điểm</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="strut-lg"></div>
      <div className="card tinted">
        <div className="row" style={{ gap: 10 }}>
          <div style={{ fontSize: 22 }}>📈</div>
          <div className="grow">
            <div style={{ fontWeight: 600, fontSize: 13 }}>Xu hướng tuần này</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              "An ninh mạng" được tra cứu nhiều nhất (+42%)
            </div>
          </div>
        </div>
      </div>

      <TabBar active="library" go={go} />
    </div>
  );
}

function CategoryList({ go, id }) {
  const cat = CATEGORIES.find(c => c.id === id) || CATEGORIES[0];
  const list = REBUTTALS[id] || [];
  return (
    <div className="screen-pad page-fade pa">
      <PageHeader title={cat.t} onBack={() => go("library")} />
      <div className="row" style={{ marginBottom: 16, gap: 8 }}>
        <span className="pill red">{cat.ico} {cat.t}</span>
        <span className="pill">{cat.n} luận điểm</span>
      </div>

      <div className="row" style={{ gap: 6, marginBottom: 14, overflowX: "auto" }}>
        {["Phổ biến", "Mới", "Hot 🔥", "Đã lưu"].map((t, i) => (
          <span key={t} className="pill" style={{
            background: i === 0 ? "var(--ink)" : "var(--surface)",
            color: i === 0 ? "#fff" : "var(--ink-soft)",
            borderColor: i === 0 ? "var(--ink)" : "var(--line)",
            whiteSpace: "nowrap",
          }}>{t}</span>
        ))}
      </div>

      {list.map(r => (
        <div key={r.id}
          onClick={() => go(`rebuttal-${r.id}`)}
          className="card clickable"
          style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 8, marginBottom: 6 }}>
            {r.hot && <span className="pill" style={{
              background: "var(--red)", color: "#fff", borderColor: "var(--red)", fontSize: 10,
            }}>🔥 HOT</span>}
            <span style={{ flex: 1 }}></span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-mute)" }}>👁 {r.v.toLocaleString()}</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, marginBottom: 8 }}>
            "{r.t}"
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span className="pill ok" style={{ fontSize: 11 }}>✓ 3 luận cứ</span>
            <span style={{ flex: 1 }}></span>
            <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 600 }}>Xem →</span>
          </div>
        </div>
      ))}

      {list.length === 0 && (
        <div className="card tinted" style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
          <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>Sắp có thêm luận điểm</div>
        </div>
      )}
    </div>
  );
}

function RebuttalDetail({ go, id }) {
  // Find rebuttal across all categories
  let r, catId;
  for (const [k, list] of Object.entries(REBUTTALS)) {
    const found = list.find(x => x.id === id);
    if (found) { r = found; catId = k; break; }
  }
  if (!r) r = REBUTTALS.politic[0];

  return (
    <div className="screen-pad page-fade pa">
      <PageHeader title="Chi tiết" onBack={() => go(`category-${catId}`)}
        right={<button className="btn ghost sm" style={{ width: "auto", padding: "8px 10px" }}>🔖</button>} />

      <div className="row" style={{ gap: 6, marginBottom: 10 }}>
        <span className="pill red">🏛 Chính trị</span>
        <span className="pill">👁 {(r.v || 0).toLocaleString()}</span>
      </div>

      <div className="card" style={{ borderColor: "var(--red)", borderWidth: 2, marginBottom: 14 }}>
        <div className="section-label" style={{ color: "var(--red)" }}>⚠️ Luận điệu sai trái</div>
        <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.4 }}>
          "{r.t}"
        </div>
      </div>

      <div className="display" style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
        ✅ 3 luận cứ phản bác
      </div>

      {[
        { n: 1, t: "Khẳng định dựa trên thực tiễn lịch sử", c: "Việt Nam đã trải qua thời kỳ đa đảng (1946) và đã được chứng minh là không phù hợp với điều kiện đặc thù." },
        { n: 2, t: "Lý luận khoa học và pháp lý", c: "Điều 4 Hiến pháp 2013 khẳng định vai trò lãnh đạo của Đảng Cộng sản — được nhân dân thừa nhận qua thực tiễn." },
        { n: 3, t: "So sánh với mô hình quốc tế", c: "Nhiều quốc gia có hệ thống chính trị một đảng vẫn đạt thành tựu phát triển vượt bậc, trong đó có Việt Nam." },
      ].map(item => (
        <div key={item.n} className="card" style={{ marginBottom: 10, display: "flex", gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 99,
            background: "var(--red)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}>{item.n}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{item.t}</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>{item.c}</div>
          </div>
        </div>
      ))}

      <div className="card tinted" style={{ marginTop: 6 }}>
        <div className="section-label">📎 Nguồn tham khảo</div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.6 }}>
          • Hiến pháp 2013 (Điều 4)<br />
          • Nghị quyết 35-NQ/TW (2018)<br />
          • Tạp chí Cộng sản, số 998/2023
        </div>
      </div>

      <div className="strut"></div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost sm" style={{ flex: 1 }}>📤 Chia sẻ</button>
        <button className="btn primary sm" style={{ flex: 1 }}>📋 Sao chép phản bác</button>
      </div>
    </div>
  );
}

// ─── QUIZ — full flow ending in result D ─────────────────────
const QUIZ = [
  {
    q: "Nghị quyết 35-NQ/TW (2018) của Bộ Chính trị tập trung vào nhiệm vụ nào?",
    a: [
      "Phát triển kinh tế tư nhân",
      "Bảo vệ nền tảng tư tưởng của Đảng",
      "Cải cách hành chính",
      "Phòng chống tham nhũng",
    ],
    correct: 1,
    explain: "Nghị quyết 35-NQ/TW (22/10/2018) về 'Tăng cường bảo vệ nền tảng tư tưởng của Đảng, đấu tranh phản bác các quan điểm sai trái, thù địch trong tình hình mới'.",
  },
  {
    q: "Theo Hiến pháp 2013, vai trò lãnh đạo của Đảng Cộng sản Việt Nam được quy định ở điều nào?",
    a: ["Điều 1", "Điều 2", "Điều 3", "Điều 4"],
    correct: 3,
    explain: "Điều 4 Hiến pháp 2013 khẳng định Đảng Cộng sản Việt Nam là lực lượng lãnh đạo Nhà nước và xã hội.",
  },
  {
    q: '"Diễn biến hòa bình" được Đảng ta xác định là gì?',
    a: [
      "Một xu thế toàn cầu hóa",
      "Chiến lược của các thế lực thù địch",
      "Một hiện tượng kinh tế",
      "Quan điểm văn hóa",
    ],
    correct: 1,
    explain: "Đảng xác định 'Diễn biến hòa bình' là chiến lược tổng hợp của các thế lực thù địch nhằm xóa bỏ chế độ XHCN.",
  },
];

function QuizIntro({ go }) {
  return (
    <div className="screen-pad with-tabbar page-fade pa" style={{ display: "flex", flexDirection: "column" }}>
      <BrandStrip subtitle="Quiz nhận thức · kiểm tra hàng tuần" />
      <div className="strut-lg"></div>

      <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
        <div style={{
          width: 88, height: 88, margin: "0 auto 14px",
          borderRadius: 99,
          background: "linear-gradient(135deg, var(--red), var(--yellow))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40, boxShadow: "0 12px 24px rgba(184,50,39,.25)",
        }}>🎯</div>
        <div className="display" style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
          Quiz nhận thức tuần 19
        </div>
        <div style={{ color: "var(--ink-soft)", fontSize: 14 }}>
          {QUIZ.length} câu · khoảng 2 phút
        </div>
      </div>

      <div className="card yellow" style={{ marginBottom: 12 }}>
        <div className="section-label">Chủ đề tuần này</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          Bảo vệ nền tảng tư tưởng của Đảng
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
          Nghị quyết 35-NQ/TW · Hiến pháp 2013 · Cương lĩnh
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <div className="card grow" style={{ textAlign: "center", padding: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: "var(--red)" }}>92đ</div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Kỷ lục đơn vị (PA01)</div>
        </div>
        <div className="card grow" style={{ textAlign: "center", padding: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: "var(--red)" }}>78đ</div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Trung bình tuần</div>
        </div>
        <div className="card grow" style={{ textAlign: "center", padding: 12, background: "var(--ok-soft)", borderColor: "transparent" }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: "var(--ok)" }}>14</div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Streak của bạn 🔥</div>
        </div>
      </div>

      <button className="btn primary" onClick={() => go("quiz-q-0")}>
        ▶ Bắt đầu
      </button>

      <TabBar active="quiz" go={go} />
    </div>
  );
}

function QuizQuestion({ go, idx, onAnswer, score }) {
  const q = QUIZ[idx];
  const [picked, setPicked] = React.useState(null);
  const [showFb, setShowFb] = React.useState(false);

  function choose(i) {
    if (picked !== null) return;
    setPicked(i);
    setShowFb(true);
  }
  function nextQ() {
    onAnswer(picked === q.correct);
    if (idx + 1 < QUIZ.length) go(`quiz-q-${idx + 1}`);
    else go("quiz-result");
  }

  return (
    <div className="screen-pad page-fade pa">
      <PageHeader title={`Câu ${idx + 1} / ${QUIZ.length}`} onBack={() => go("quiz-intro")}
        right={<span className="pill">⏱ {30 + idx * 7}s</span>} />

      <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
        {QUIZ.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 5, borderRadius: 99,
            background: i <= idx ? "var(--red)" : "var(--line)",
          }}></div>
        ))}
      </div>

      <div className="card tinted" style={{ marginBottom: 16 }}>
        <div className="section-label">Câu hỏi</div>
        <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.4 }}>
          {q.q}
        </div>
      </div>

      <div className="col" style={{ gap: 8 }}>
        {q.a.map((opt, i) => {
          const isCorrect = showFb && i === q.correct;
          const isWrong = showFb && i === picked && i !== q.correct;
          const isPicked = i === picked;
          return (
            <div key={i}
              onClick={() => choose(i)}
              className={picked === null ? "clickable" : ""}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px",
                borderRadius: 14,
                border: `2px solid ${
                  isCorrect ? "var(--ok)" :
                  isWrong ? "var(--red)" :
                  isPicked ? "var(--ink)" : "var(--line)"
                }`,
                background:
                  isCorrect ? "var(--ok-soft)" :
                  isWrong ? "var(--red-soft)" :
                  isPicked ? "var(--surface-2)" : "var(--surface)",
                transition: "all .2s",
              }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: isCorrect ? "var(--ok)" : isWrong ? "var(--red)" : isPicked ? "var(--ink)" : "var(--surface-2)",
                color: (isCorrect || isWrong || isPicked) ? "#fff" : "var(--ink-soft)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 13, flexShrink: 0,
                border: (isCorrect || isWrong || isPicked) ? "none" : "1px solid var(--line)",
              }}>{String.fromCharCode(65 + i)}</div>
              <div style={{ fontSize: 14, lineHeight: 1.35, flex: 1 }}>{opt}</div>
              {isCorrect && <span style={{ color: "var(--ok)", fontSize: 18 }}>✓</span>}
              {isWrong && <span style={{ color: "var(--red)", fontSize: 18 }}>✗</span>}
            </div>
          );
        })}
      </div>

      {showFb && (
        <div className="card" style={{
          marginTop: 16,
          background: picked === q.correct ? "var(--ok-soft)" : "var(--red-soft)",
          borderColor: picked === q.correct ? "var(--ok)" : "var(--red)",
        }}>
          <div className="section-label" style={{
            color: picked === q.correct ? "var(--ok)" : "var(--red)",
          }}>
            {picked === q.correct ? "✓ Chính xác!" : "✗ Chưa đúng"}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>
            {q.explain}
          </div>
        </div>
      )}

      <div style={{ position: "absolute", left: 18, right: 18, bottom: 24 }}>
        <button className="btn primary" onClick={nextQ}
          style={{ opacity: showFb ? 1 : .35 }}
          disabled={!showFb}>
          {idx + 1 === QUIZ.length ? "🏁 Xem kết quả" : "Câu tiếp →"}
        </button>
      </div>
    </div>
  );
}

function QuizResult({ go, score }) {
  const total = QUIZ.length;
  const pct = Math.round((score / total) * 100);
  const grade = pct >= 80 ? "Xuất sắc" : pct >= 60 ? "Khá" : pct >= 40 ? "Đạt" : "Cần ôn thêm";
  const emoji = pct >= 80 ? "🏆" : pct >= 60 ? "🎉" : pct >= 40 ? "👍" : "📚";
  const color = pct >= 80 ? "var(--ok)" : pct >= 60 ? "var(--red)" : "var(--ink-soft)";

  return (
    <div className="screen-pad page-fade pa" style={{ textAlign: "center" }}>
      <PageHeader title="" onBack={() => go("home")} />

      <div style={{ fontSize: 56, marginBottom: 4 }}>{emoji}</div>
      <div className="display" style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
        {grade}!
      </div>
      <div style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 22 }}>
        Bạn vừa hoàn thành Quiz tuần 19
      </div>

      <div style={{
        width: 180, height: 180, margin: "0 auto 20px", position: "relative",
      }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--line)" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${pct * 2.76} 276`}
            style={{ transition: "stroke-dasharray .8s ease-out" }} />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <div className="display" style={{ fontSize: 44, fontWeight: 800, color, lineHeight: 1 }}>
            {score}/{total}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
            {pct * 10}đ
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <div className="card grow" style={{ padding: 10, textAlign: "left" }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Top hôm nay</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>15%</div>
        </div>
        <div className="card grow" style={{ padding: 10, textAlign: "left" }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Đơn vị +điểm</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>PA01</div>
        </div>
      </div>

      <div className="card yellow" style={{ marginBottom: 16, textAlign: "left" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>🏅 Bạn nhận được</div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Huy hiệu "Tuyên truyền viên số" · cấp 2
        </div>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost" onClick={() => go("quiz-intro")}>🔁 Thử lại</button>
        <button className="btn primary" onClick={() => go("leaderboard")}>🏆 Xem BXH →</button>
      </div>
    </div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────────
function Leaderboard({ go }) {
  const units = [
    { r: 1, n: "Phòng PA01",       u: 45, p: 1240, c: "#FFD700" },
    { r: 2, n: "Phòng PA08",       u: 38, p: 1080, c: "#C0C0C0" },
    { r: 3, n: "Đoàn TN Tỉnh CA",  u: 27, p: 920,  c: "#CD7F32" },
    { r: 4, n: "Công an TP Việt Trì", u: 22, p: 740 },
    { r: 5, n: "Phòng PC02",        u: 19, p: 680 },
    { r: 6, n: "Công an huyện Đoan Hùng", u: 14, p: 510 },
    { r: 7, n: "Phòng PA09",        u: 12, p: 470 },
  ];
  return (
    <div className="screen-pad with-tabbar page-fade pa">
      <div className="row">
        <div className="grow">
          <div className="section-label">Bảng xếp hạng tuần 19</div>
          <div className="display" style={{ fontSize: 24, fontWeight: 800 }}>🏆 BXH đơn vị</div>
        </div>
      </div>
      <div style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 16 }}>
        Tính theo số người tham gia + điểm Quiz trung bình.
      </div>

      {units.map((u, i) => (
        <div key={u.r} className="card" style={{
          marginBottom: 8,
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 14px",
          borderColor: i < 3 ? "var(--yellow)" : "var(--line)",
          background: i < 3 ? "var(--yellow-soft)" : "var(--surface)",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 99,
            background: u.c || "var(--surface-2)",
            color: u.c ? "#fff" : "var(--ink)",
            border: u.c ? "none" : "1px solid var(--line)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}>
            {u.r <= 3 ? ["🥇", "🥈", "🥉"][u.r - 1] : u.r}
          </div>
          <div className="grow">
            <div style={{ fontWeight: 700, fontSize: 14 }}>{u.n}</div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{u.u} người · {u.p}đ</div>
          </div>
          {i < 3 && <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 700 }}>▲</span>}
        </div>
      ))}

      <TabBar active="leaderboard" go={go} />
    </div>
  );
}

function AboutScreen({ go }) {
  return (
    <div className="screen-pad page-fade pa">
      <PageHeader title="Về dự án" onBack={() => go("home")} />
      <BrandStrip />
      <div className="strut"></div>
      <div className="card tinted">
        <div className="section-label">Sứ mệnh</div>
        <div style={{ fontSize: 14, lineHeight: 1.55 }}>
          Tự động tổng hợp tin chính thống, AI tóm tắt, gửi đến cán bộ — đoàn viên — người dân Phú Thọ qua Telegram và Email.
        </div>
      </div>
      <div className="strut"></div>
      <div className="card">
        <div className="section-label">Đơn vị thực hiện</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Phòng PA01 — Công an tỉnh Phú Thọ</div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
          Tác giả: Vi Ngọc Phương · v1.0 · 2026
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  HomeGrid, SignupWizard, SignupDone,
  FeedScreen, ArticleDetail,
  LibraryTiles, CategoryList, RebuttalDetail,
  QuizIntro, QuizQuestion, QuizResult,
  Leaderboard, AboutScreen, TabBar,
});
