/* ============================================================
   TRỢ LÝ 35 - Main JavaScript
   ============================================================ */

// ===== CẤU HÌNH API =====
const API_URL = 'https://script.google.com/macros/s/AKfycbzJ41UZaeQjWFPwk-v6IJYdOZoxMxPSrM7XWK9W-psMEph173IUo9Jq2NWAhU2NQriFzg/exec';
// ⚠️ Thay YOUR_DEPLOYMENT_ID bằng ID Web App đã deploy từ Google Apps Script

function icon(name, size = 18, stroke = 1.75) {
  return window.TDSIcon ? window.TDSIcon(name, { size, stroke }) : '';
}

// ===== STATE QUẢN LÝ QUIZ =====
const quizState = {
  questions: [],
  currentIndex: 0,
  answers: [],
  score: 0
};

// ===== KHỞI TẠO =====
document.addEventListener('DOMContentLoaded', () => {
  initMotion();
  initMobileMenu();
  initSmoothScroll();
  initActiveNav();
  loadTodayNews();
  loadStats();
  initSubscribeForm();
  initRebuttalSearch();
});

// ===== MOBILE MENU =====
function initMobileMenu() {
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('navMenu');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('show');
    });

    // Đóng menu khi click vào item
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => menu.classList.remove('show'));
    });
  }
}

// ===== SMOOTH SCROLL =====
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80;
        const pos = target.offsetTop - offset;
        window.scrollTo({ top: pos, behavior: 'smooth' });
      }
    });
  });
}

// ===== ACTIVE NAV =====
function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPos = window.scrollY + 150;

    sections.forEach(section => {
      if (scrollPos >= section.offsetTop &&
        scrollPos < section.offsetTop + section.offsetHeight) {
        current = section.id;
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });
}

// ===== TẢI TIN HÔM NAY =====
// ===== MOTION =====
let motionObserver;

function initMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.body.classList.add('motion-ready');
  prepareMotionItems(document.querySelectorAll([
    '.section-header',
    '.feature-card',
    '.quiz-container',
    '.rebuttal-search',
    '.subscribe-card'
  ].join(',')));
}

function prepareMotionItems(items) {
  if (!items || !items.length) return;

  const observer = getMotionObserver();
  Array.from(items).forEach((item, index) => {
    item.classList.add('reveal-on-scroll');
    item.style.setProperty('--reveal-delay', `${Math.min(index * 70, 280)}ms`);

    if (observer) {
      observer.observe(item);
    } else {
      item.classList.add('is-visible');
    }
  });
}

function getMotionObserver() {
  if (!('IntersectionObserver' in window)) return null;
  if (motionObserver) return motionObserver;

  motionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      motionObserver.unobserve(entry.target);
    });
  }, {
    threshold: 0.16,
    rootMargin: '0px 0px -8% 0px'
  });

  return motionObserver;
}

async function loadTodayNews() {
  const container = document.getElementById('newsGrid');

  try {
    const response = await fetch(`${API_URL}?action=today`);
    const result = await response.json();

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">${icon('news', 58)}</span>
          <p>Chưa có tin nào cho hôm nay. Bản tin tự động cập nhật lúc 6h sáng mỗi ngày.</p>
        </div>`;
      return;
    }

    container.innerHTML = result.data.map(article => createNewsCard(article)).join('');
    prepareMotionItems(container.querySelectorAll('.news-card'));

  } catch (error) {
    console.error('Lỗi tải tin:', error);
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${icon('alert', 58)}</span>
        <p>Không tải được tin. Vui lòng thử lại sau.</p>
      </div>`;
  }
}

function createNewsCard(article) {
  const isImportant = article.priority === 'Quan trọng';
  const date = new Date(article.date).toLocaleDateString('vi-VN');

  return `
    <div class="news-card ${isImportant ? 'important' : ''}">
      <div class="news-meta">
        <span class="news-category ${isImportant ? 'news-priority-important' : 'news-priority-normal'}">
          ${article.category}
        </span>
        <span class="news-source">${article.source}</span>
      </div>
      <h3 class="news-title">${escapeHTML(article.title)}</h3>
      <p class="news-summary">${escapeHTML(article.summary)}</p>
      <a href="${article.link}" target="_blank" class="news-link">
        Đọc đầy đủ ${icon('arrow-right', 16, 2)}
      </a>
    </div>`;
}

// ===== TẢI THỐNG KÊ =====
async function loadStats() {
  try {
    const response = await fetch(`${API_URL}?action=stats`);
    const result = await response.json();

    if (result.success && result.data) {
      animateCounter('statArticles', result.data.totalArticles);
      animateCounter('statSubscribers', result.data.totalSubscribers);
      animateCounter('statQuizzes', result.data.totalQuizAttempts);
    }
  } catch (error) {
    console.error('Lỗi tải thống kê:', error);
  }
}

function animateCounter(elementId, target) {
  const element = document.getElementById(elementId);
  if (!element) return;

  let current = 0;
  const step = Math.max(1, Math.floor(target / 50));
  const duration = 1500;
  const interval = duration / (target / step || 1);

  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = current.toLocaleString('vi-VN');
  }, interval);
}

// ===== QUIZ =====
async function startQuiz() {
  const container = document.getElementById('quizContainer');
  container.innerHTML = `
    <div class="loading-spinner">
      <span class="spinner-icon">${icon('refresh', 22)}</span> Đang tải câu hỏi...
    </div>`;

  try {
    const response = await fetch(`${API_URL}?action=quiz&count=10`);
    const result = await response.json();

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Chưa có câu hỏi. Vui lòng quay lại sau.</p>
        </div>`;
      return;
    }

    quizState.questions = result.data;
    quizState.currentIndex = 0;
    quizState.answers = [];
    quizState.score = 0;

    showQuestion();

  } catch (error) {
    console.error('Lỗi tải quiz:', error);
    container.innerHTML = `<p>Không tải được câu hỏi.</p>`;
  }
}

function showQuestion() {
  const container = document.getElementById('quizContainer');
  const q = quizState.questions[quizState.currentIndex];
  const total = quizState.questions.length;
  const current = quizState.currentIndex + 1;
  const progress = (current / total) * 100;

  container.innerHTML = `
    <div class="quiz-question">
      <div class="quiz-progress">
        <span>Câu ${current}/${total}</span>
        <span>Điểm: ${quizState.score}/${current - 1}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>
      <h3 class="question-text">${escapeHTML(q.question)}</h3>
      <div class="options">
        ${['A', 'B', 'C', 'D'].map(key => `
          <button class="option" onclick="selectAnswer('${key}')">
            <strong>${key}.</strong> ${escapeHTML(q.options[key])}
          </button>
        `).join('')}
      </div>
    </div>`;
}

function selectAnswer(answer) {
  const q = quizState.questions[quizState.currentIndex];
  const isCorrect = answer === q.correct;

  if (isCorrect) quizState.score++;
  quizState.answers.push({ question: q.question, answer, correct: q.correct });

  // Hiển thị đúng/sai
  const options = document.querySelectorAll('.option');
  options.forEach(btn => {
    const key = btn.textContent.trim().charAt(0);
    btn.disabled = true;
    if (key === q.correct) btn.classList.add('correct');
    else if (key === answer) btn.classList.add('wrong');
  });

  setTimeout(() => {
    quizState.currentIndex++;
    if (quizState.currentIndex < quizState.questions.length) {
      showQuestion();
    } else {
      showQuizResult();
    }
  }, 1500);
}

function showQuizResult() {
  const container = document.getElementById('quizContainer');
  const total = quizState.questions.length;
  const score = quizState.score;
  const percentage = Math.round((score / total) * 100);

  let message, resultIcon;
  if (percentage >= 80) {
    message = 'Xuất sắc! Nhận thức rất tốt!';
    resultIcon = 'trophy';
  } else if (percentage >= 60) {
    message = 'Tốt! Bạn đã đạt yêu cầu.';
    resultIcon = 'award';
  } else {
    message = 'Cần ôn tập thêm. Cố gắng nhé!';
    resultIcon = 'book';
  }

  container.innerHTML = `
    <div class="quiz-result">
      <div class="quiz-result-icon icon-chip yellow xl">${icon(resultIcon, 38, 1.8)}</div>
      <div class="result-score">${score}/${total}</div>
      <div class="result-message">${message}</div>
      <p style="color:#666;margin-bottom:30px;">Tỷ lệ: ${percentage}%</p>
      <button class="btn btn-primary" onclick="startQuiz()">
        ${icon('refresh', 18)} Làm lại
      </button>
    </div>`;

  // Lưu kết quả
  saveQuizResult({ score, total, percentage });
}

async function saveQuizResult(data) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'submit_quiz',
        user: 'Khách',
        organization: '',
        ...data
      })
    });

    const result = await response.json();
    if (!result.success) {
      console.error('Lỗi từ server:', result.error);
    }
  } catch (e) {
    console.error('Không lưu được kết quả:', e);
  }
}

// ===== THƯ VIỆN PHẢN BÁC =====
function initRebuttalSearch() {
  const input = document.getElementById('rebuttalSearch');
  if (input) {
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') searchRebuttals();
    });
  }
}

async function searchRebuttals() {
  const keyword = document.getElementById('rebuttalSearch').value.trim();
  const list = document.getElementById('rebuttalList');

  list.innerHTML = `
    <div class="loading-spinner">
      <span class="spinner-icon">${icon('refresh', 22)}</span> Đang tìm kiếm...
    </div>`;

  try {
    const response = await fetch(`${API_URL}?action=rebuttals&keyword=${encodeURIComponent(keyword)}`);
    const result = await response.json();

    if (!result.success || !result.data || result.data.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">${icon('search', 58)}</span>
          <p>Không tìm thấy luận điểm phù hợp${keyword ? ` cho "${keyword}"` : ''}.</p>
        </div>`;
      return;
    }

    list.innerHTML = result.data.map(r => createRebuttalCard(r)).join('');
    prepareMotionItems(list.querySelectorAll('.rebuttal-card'));

  } catch (error) {
    console.error('Lỗi tìm phản bác:', error);
    list.innerHTML = `<p>Không tải được dữ liệu.</p>`;
  }
}

function createRebuttalCard(r) {
  return `
    <div class="rebuttal-card">
      <h3 class="rebuttal-topic"><span class="title-icon">${icon('flag', 18, 2)}</span> ${escapeHTML(r.topic)}</h3>
      <div class="rebuttal-section-block">
        <div class="rebuttal-label label-wrong">
          ${icon('x-circle', 16, 2)} Luận điệu sai trái
        </div>
        <div class="rebuttal-content">${escapeHTML(r.wrongClaim)}</div>
      </div>
      <div class="rebuttal-section-block">
        <div class="rebuttal-label label-correct">
          ${icon('check-circle', 16, 2)} Luận điểm phản bác
        </div>
        <div class="rebuttal-content">${escapeHTML(r.rebuttal)}</div>
      </div>
      ${r.evidence ? `
      <div class="rebuttal-section-block">
        <div class="rebuttal-label">${icon('clipboard', 16, 2)} Bằng chứng</div>
        <div class="rebuttal-content">${escapeHTML(r.evidence).replace(/\n/g, '<br>')}</div>
      </div>` : ''}
    </div>`;
}

// ===== FORM ĐĂNG KÝ =====
function initSubscribeForm() {
  const form = document.getElementById('subscribeForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageEl = document.getElementById('subscribeMessage');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Lấy dữ liệu
    const formData = new FormData(form);
    const data = {
      action: 'subscribe',
      name: formData.get('name'),
      email: formData.get('email'),
      organization: formData.get('organization'),
      topics: formData.get('topics'),
      channel: 'Email'
    };

    // Disable nút
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-icon">${icon('refresh', 18)}</span> Đang gửi...`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        messageEl.className = 'form-message success';
        messageEl.textContent = 'Đăng ký thành công. Kiểm tra email của bạn nhé.';
        form.reset();
      } else {
        messageEl.className = 'form-message error';
        messageEl.textContent = result.error || 'Có lỗi xảy ra. Vui lòng thử lại.';
      }

    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      messageEl.className = 'form-message error';
      messageEl.textContent = 'Không thể kết nối tới máy chủ. Vui lòng thử lại sau.';
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = `${icon('send', 18)} Đăng ký ngay`;
  });
}

// ===== UTILITIES =====
function escapeHTML(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
