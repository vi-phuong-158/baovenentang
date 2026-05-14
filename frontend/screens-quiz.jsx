// Quiz nhận thức — 5 variations (with light interactivity)

function QuizIntro() {
  return (
    <>
      <PhoneTop title="Quiz nhận thức" />
      <div className="stack" style={{ flex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginTop: 12 }}>🎯</div>
        <div className="hand" style={{ fontWeight: 700, fontSize: 18 }}>
          Kiểm tra hiểu biết
        </div>
        <div className="hand2" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          10 câu · ~3 phút · điểm đóng góp BXH đơn vị
        </div>
        <div className="card warn" style={{ textAlign: "left" }}>
          <div className="hand" style={{ fontWeight: 700, fontSize: 13 }}>📚 Chủ đề hôm nay</div>
          <div className="hand2" style={{ fontSize: 12 }}>Nghị quyết 35-NQ/TW · An ninh mạng</div>
        </div>
        <div className="row-stack" style={{ gap: 6, justifyContent: "center" }}>
          <span className="pill">🟢 Dễ</span>
          <span className="pill yellow">🟡 Vừa</span>
          <span className="pill">🔴 Khó</span>
        </div>
        <div className="sk-btn primary" style={{ marginTop: "auto" }}>▶ Bắt đầu</div>
        <div className="hand2" style={{ fontSize: 10, color: "var(--muted)" }}>
          Kỷ lục đơn vị: <b>PA01 — 92đ</b>
        </div>
      </div>
    </>
  );
}

function QuizQuestion() {
  const [picked, setPicked] = React.useState(null);
  const correct = 1;
  const options = [
    "Bảo vệ chế độ độc đảng",
    "Bảo vệ nền tảng tư tưởng của Đảng",
    "Phổ biến chính sách kinh tế",
    "Tuyên truyền các vụ án lớn",
  ];
  return (
    <>
      <PhoneTop title="Câu 3 / 10" right="⏱ 0:42" />
      <div style={{ padding: "8px 14px 0" }}>
        <div style={{ display: "flex", gap: 3 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
            <div key={i} style={{
              flex: 1, height: 4,
              background: i <= 3 ? "var(--red)" : "#e0d8c5",
              borderRadius: 2,
            }}></div>
          ))}
        </div>
      </div>
      <div className="stack" style={{ flex: 1 }}>
        <div className="card">
          <div className="hand2" style={{ fontSize: 11, color: "var(--ink-soft)" }}>Câu hỏi</div>
          <div className="hand" style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3, marginTop: 4 }}>
            Nghị quyết 35-NQ/TW (2018) tập trung vào nhiệm vụ nào?
          </div>
        </div>
        {options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = picked !== null && i === correct;
          const isWrong = isPicked && i !== correct;
          return (
            <div key={i} onClick={() => setPicked(i)} className="card" style={{
              cursor: "pointer",
              display: "flex", gap: 8, alignItems: "center",
              background: isCorrect ? "#d4edda" : isWrong ? "#f8d7da" : (isPicked ? "var(--yellow-soft)" : "#fff"),
              borderColor: isCorrect ? "#2e7d32" : isWrong ? "var(--red)" : "var(--line)",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 99,
                border: "2px solid var(--line)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Kalam', cursive", fontWeight: 700, fontSize: 12,
                flexShrink: 0,
                background: isPicked ? "var(--ink)" : "#fff",
                color: isPicked ? "#fff" : "var(--ink)",
              }}>{String.fromCharCode(65 + i)}</div>
              <div className="hand2" style={{ fontSize: 12, lineHeight: 1.2 }}>{opt}</div>
              {isCorrect && <span style={{ marginLeft: "auto", color: "#2e7d32" }}>✓</span>}
              {isWrong && <span style={{ marginLeft: "auto", color: "var(--red)" }}>✗</span>}
            </div>
          );
        })}
        <div className="sk-btn primary" style={{ marginTop: "auto", opacity: picked === null ? .4 : 1 }}>
          {picked === null ? "Chọn 1 đáp án" : "Câu tiếp theo →"}
        </div>
      </div>
    </>
  );
}

function QuizSwipe() {
  return (
    <>
      <PhoneTop title="Quiz nhanh" right="3/10" />
      <div className="stack" style={{ flex: 1, justifyContent: "center", position: "relative" }}>
        <div style={{
          position: "absolute", inset: "30px 16px 100px",
          background: "var(--yellow-soft)",
          border: "2px solid var(--line)",
          borderRadius: 14,
          padding: 14,
          transform: "rotate(-3deg) translateX(-6px)",
          boxShadow: "3px 3px 0 var(--line)",
          opacity: .5,
        }}></div>
        <div style={{
          position: "absolute", inset: "20px 14px 90px",
          background: "#fff",
          border: "2px solid var(--line)",
          borderRadius: 14,
          padding: 14,
          boxShadow: "3px 3px 0 var(--line)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div className="hand2" style={{ fontSize: 11, color: "var(--ink-soft)" }}>Câu hỏi nhanh</div>
          <div className="hand" style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>
            "Bảo vệ nền tảng tư tưởng" là nhiệm vụ của ai?
          </div>
          <div style={{ flex: 1 }}></div>
          <div className="row-stack" style={{ justifyContent: "space-between" }}>
            <div className="hand2" style={{ fontSize: 11 }}>← Sai</div>
            <div className="hand2" style={{ fontSize: 11 }}>Đúng →</div>
          </div>
          <div className="hand" style={{ fontSize: 13, textAlign: "center" }}>
            "Toàn Đảng, toàn dân, toàn quân"
          </div>
          <div className="row-stack" style={{ gap: 8, justifyContent: "center" }}>
            <div style={{
              width: 38, height: 38, borderRadius: 99,
              background: "#fff", border: "2px solid var(--red)",
              color: "var(--red)", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✗</div>
            <div style={{
              width: 38, height: 38, borderRadius: 99,
              background: "#2e7d32", color: "#fff", fontSize: 16,
              border: "2px solid var(--line)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✓</div>
          </div>
        </div>
        <div className="hand2" style={{
          position: "absolute", bottom: 10, left: 0, right: 0,
          textAlign: "center", fontSize: 11, color: "var(--muted)",
        }}>Vuốt thẻ — Tinder-style</div>
      </div>
    </>
  );
}

function QuizResult() {
  return (
    <>
      <PhoneTop title="Kết quả" />
      <div className="stack" style={{ flex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 38, marginTop: 6 }}>🏆</div>
        <div className="hand" style={{ fontWeight: 700, fontSize: 16 }}>Xuất sắc!</div>
        <div style={{
          width: 110, height: 110, margin: "0 auto",
          borderRadius: 99,
          background: `conic-gradient(var(--red) 0 80%, #eee 80% 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
          border: "2px solid var(--line)",
        }}>
          <div style={{
            position: "absolute", inset: 8,
            background: "#fff", borderRadius: 99,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <div className="hand" style={{ fontWeight: 700, fontSize: 22, color: "var(--red)" }}>8/10</div>
            <div className="hand2" style={{ fontSize: 10 }}>80đ</div>
          </div>
        </div>
        <div className="card warn" style={{ textAlign: "left" }}>
          <div className="hand2" style={{ fontSize: 11, color: "var(--ink-soft)" }}>📊 Đánh giá</div>
          <div className="hand" style={{ fontSize: 12, fontWeight: 700 }}>Top 15% người chơi hôm nay</div>
        </div>
        <div className="row-stack" style={{ gap: 6 }}>
          <div className="sk-btn" style={{ flex: 1, fontSize: 11 }}>🔁 Thử lại</div>
          <div className="sk-btn primary" style={{ flex: 1, fontSize: 11 }}>📤 Khoe</div>
        </div>
        <div className="sk-btn warn">🏅 Xem huy hiệu nhận được</div>
      </div>
    </>
  );
}

function QuizDailyCard() {
  return (
    <>
      <PhoneTop title="Hôm nay" right="13/05" />
      <div className="stack" style={{ flex: 1 }}>
        <div className="hand2" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
          🔥 Quiz hằng ngày — 1 câu/ngày
        </div>
        <div className="card red" style={{ padding: 14 }}>
          <div className="hand2" style={{ fontSize: 10, opacity: .85 }}>NGÀY 47 · STREAK 🔥</div>
          <div className="hand" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginTop: 6 }}>
            "Diễn biến hòa bình" được Đảng ta xác định là gì?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            {["A. Chiến lược của các thế lực thù địch", "B. Một xu thế quốc tế", "C. Một hiện tượng kinh tế"].map((o, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,.9)",
                color: "var(--ink)",
                border: "1.5px solid var(--line)",
                borderRadius: 6,
                padding: "6px 8px",
                fontFamily: "'Patrick Hand', cursive", fontSize: 12,
              }}>{o}</div>
            ))}
          </div>
        </div>
        <div className="row-stack" style={{ justifyContent: "space-between" }}>
          <div className="hand2" style={{ fontSize: 11 }}>⏱ Còn 14h 22m</div>
          <div className="hand2" style={{ fontSize: 11, color: "var(--red)" }}>+10đ nếu đúng</div>
        </div>
        <div className="card" style={{ background: "var(--paper)" }}>
          <div className="hand" style={{ fontSize: 12, fontWeight: 700 }}>🏆 BXH cá nhân tuần</div>
          <div className="hand2" style={{ fontSize: 11, marginTop: 4 }}>
            #14 · 320đ · cách top 3: 60đ
          </div>
        </div>
      </div>
      <BottomNav active={3} />
    </>
  );
}

function QuizScreens() {
  return (
    <div className="row">
      <Phone label="Màn intro" tag="A" rot={-.5}
        note="Tổng quan trước khi bắt đầu: số câu, độ khó, kỷ lục đơn vị.">
        <QuizIntro />
      </Phone>
      <Phone label="Câu hỏi cổ điển" tag="B" rot={.6}
        note="Multi-choice + feedback đúng/sai ngay (bấm vào đáp án để thử).">
        <QuizQuestion />
      </Phone>
      <Phone label="Vuốt thẻ" tag="C" rot={-.4}
        note="Đúng/Sai - giống Tinder. Vui, hợp đoàn viên trẻ.">
        <QuizSwipe />
      </Phone>
      <Phone label="Màn kết quả" tag="D" rot={.4}
        note="Vòng tròn % + so sánh với cộng đồng + nút chia sẻ.">
        <QuizResult />
      </Phone>
      <Phone label="Câu/ngày + streak" tag="E" rot={-.7}
        note="1 câu/ngày + streak + BXH — tạo thói quen mở app mỗi sáng.">
        <QuizDailyCard />
      </Phone>
    </div>
  );
}

Object.assign(window, { QuizScreens });
