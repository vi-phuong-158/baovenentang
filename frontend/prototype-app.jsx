// Main app — router, mobile device frame + admin desktop side by side

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showAdmin": true,
  "density": "comfortable"
}/*EDITMODE-END*/;

function PrototypeApp() {
  const [route, setRoute] = React.useState("home");
  const [quizScore, setQuizScore] = React.useState(0);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const go = React.useCallback((r) => {
    if (r === "quiz-intro") setQuizScore(0);
    setRoute(r);
    // Reset scroll within phone
    requestAnimationFrame(() => {
      const sc = document.getElementById("phone-scroll");
      if (sc) sc.scrollTop = 0;
    });
  }, []);

  const onAnswer = React.useCallback((isCorrect) => {
    if (isCorrect) setQuizScore(s => s + 1);
  }, []);

  // Route to screen
  let Screen;
  const root = route.split("-")[0];

  if (route === "home") Screen = <HomeGrid go={go} />;
  else if (route === "signup") Screen = <SignupWizard go={go} />;
  else if (route === "signup-done") Screen = <SignupDone go={go} />;
  else if (route === "feed") Screen = <FeedScreen go={go} />;
  else if (root === "article") {
    const id = route.replace("article-", "");
    Screen = <ArticleDetail go={go} id={id} />;
  }
  else if (route === "library") Screen = <LibraryTiles go={go} />;
  else if (root === "category") {
    const id = route.replace("category-", "");
    Screen = <CategoryList go={go} id={id} />;
  }
  else if (root === "rebuttal") {
    const id = route.replace("rebuttal-", "");
    Screen = <RebuttalDetail go={go} id={id} />;
  }
  else if (route === "quiz-intro") Screen = <QuizIntro go={go} />;
  else if (route.startsWith("quiz-q-")) {
    const idx = parseInt(route.replace("quiz-q-", ""), 10);
    Screen = <QuizQuestion go={go} idx={idx} onAnswer={onAnswer} score={quizScore} />;
  }
  else if (route === "quiz-result") Screen = <QuizResult go={go} score={quizScore} />;
  else if (route === "leaderboard") Screen = <Leaderboard go={go} />;
  else if (route === "about") Screen = <AboutScreen go={go} />;
  else Screen = <HomeGrid go={go} />;

  // Determine status bar color
  const darkHeader = route === "home" || route === "quiz-intro" || route === "about";

  return (
    <>
      {/* Mobile column */}
      <div className="device-col">
        <IOSDevice width={400} height={840} dark={false}>
          <div id="phone-scroll" style={{
            height: "100%", overflow: "auto", position: "relative",
            background: "var(--bg)",
          }}>
            {Screen}
          </div>
        </IOSDevice>
        <div className="device-caption">
          📱 <b>Người dùng cuối</b> · Telegram/Email/Web · điều hướng qua tab bar dưới hoặc nút trong từng trang.
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: 320 }}>
          <button className="btn ghost sm" style={{ width: "auto" }} onClick={() => go("home")}>🏠 Reset</button>
          <button className="btn ghost sm" style={{ width: "auto" }} onClick={() => go("signup")}>📨 Vào Đăng ký</button>
          <button className="btn ghost sm" style={{ width: "auto" }} onClick={() => go("quiz-intro")}>🎯 Vào Quiz</button>
        </div>
      </div>

      {/* Desktop admin column */}
      <div className="desktop-wrap">
        <div className="row" style={{ marginBottom: 4 }}>
          <div className="grow">
            <div className="section-label">Admin desktop</div>
            <div className="display" style={{ fontSize: 28, fontWeight: 800 }}>
              Bảng điều khiển vận hành
            </div>
          </div>
          <span className="pill yellow">PA01 · v.ngocphuong</span>
        </div>
        <div style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 12 }}>
          Cán bộ duyệt tin, theo dõi KPI, quản lý người đăng ký. Sidebar bấm được — đổi tab để xem stub các trang con.
        </div>
        {t.showAdmin ? <AdminDesktop /> : (
          <div className="card tinted" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
            <div>Admin đang được ẩn (bật trong Tweaks)</div>
          </div>
        )}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Hiển thị" />
        <TweakToggle label="Hiện Admin desktop"
          value={t.showAdmin}
          onChange={(v) => setTweak("showAdmin", v)} />
        <TweakSection label="Đi nhanh đến màn" />
        <TweakButton label="🏠 Trang chủ"      onClick={() => go("home")} />
        <TweakButton label="📨 Đăng ký (B)"    onClick={() => go("signup")} />
        <TweakButton label="📰 Bản tin hôm nay" onClick={() => go("feed")} />
        <TweakButton label="🛡 Thư viện phản bác (B)" onClick={() => go("library")} />
        <TweakButton label="🎯 Quiz (D result)" onClick={() => go("quiz-intro")} />
        <TweakButton label="🏆 BXH"             onClick={() => go("leaderboard")} />
        <TweakButton label="ℹ️ Về dự án"        onClick={() => go("about")} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PrototypeApp />);
