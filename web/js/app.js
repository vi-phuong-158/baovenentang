/* ============================================================
   TRẬN ĐỊA SỐ - Main JavaScript
   ============================================================ */

// ===== CẤU HÌNH API =====
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
// ⚠️ Thay YOUR_DEPLOYMENT_ID bằng ID Web App đã deploy từ Google Apps Script

// ===== STATE QUẢN LÝ QUIZ =====
const quizState = {
  questions: [],
  currentIndex: 0,
  answers: [],
  score: 0
};

// ===== KHỞI TẠO =====
document.addEventListener('DOMContentLoaded', () => {
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
async function loadTodayNews() {
  const container = document.getElementById('newsGrid');
  
  try {
    const response = await fetch(`${API_URL}?action=today`);
    const result = await response.json();
    
    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-newspaper"></i>
          <p>Chưa có tin nào cho hôm nay. Bản tin tự động cập nhật lúc 6h sáng mỗi ngày.</p>
        </div>`;
      return;
    }
    
    container.innerHTML = result.data.map(article => createNewsCard(article)).join('');
    
  } catch(error) {
    console.error('Lỗi tải tin:', error);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
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
        Đọc đầy đủ <i class="fas fa-arrow-right"></i>
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
  } catch(error) {
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
      <i class="fas fa-spinner fa-spin"></i> Đang tải câu hỏi...
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
    
  } catch(error) {
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
  
  let message, emoji;
  if (percentage >= 80) {
    message = 'Xuất sắc! Nhận thức rất tốt!';
    emoji = '🏆';
  } else if (percentage >= 60) {
    message = 'Tốt! Bạn đã đạt yêu cầu.';
    emoji = '🎉';
  } else {
    message = 'Cần ôn tập thêm. Cố gắng nhé!';
    emoji = '📚';
  }
  
  container.innerHTML = `
    <div class="quiz-result">
      <div style="font-size:80px;">${emoji}</div>
      <div class="result-score">${score}/${total}</div>
      <div class="result-message">${message}</div>
      <p style="color:#666;margin-bottom:30px;">Tỷ lệ: ${percentage}%</p>
      <button class="btn btn-primary" onclick="startQuiz()">
        <i class="fas fa-redo"></i> Làm lại
      </button>
    </div>`;
  
  // Lưu kết quả
  saveQuizResult({ score, total, percentage });
}

async function saveQuizResult(data) {
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        action: 'submit_quiz',
        user: 'Khách',
        organization: '',
        ...data
      })
    });
  } catch(e) {
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
      <i class="fas fa-spinner fa-spin"></i> Đang tìm kiếm...
    </div>`;
  
  try {
    const response = await fetch(`${API_URL}?action=rebuttals&keyword=${encodeURIComponent(keyword)}`);
    const result = await response.json();
    
    if (!result.success || !result.data || result.data.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <p>Không tìm thấy luận điểm phù hợp${keyword ? ` cho "${keyword}"` : ''}.</p>
        </div>`;
      return;
    }
    
    list.innerHTML = result.data.map(r => createRebuttalCard(r)).join('');
    
  } catch(error) {
    console.error('Lỗi tìm phản bác:', error);
    list.innerHTML = `<p>Không tải được dữ liệu.</p>`;
  }
}

function createRebuttalCard(r) {
  return `
    <div class="rebuttal-card">
      <h3 class="rebuttal-topic">📌 ${escapeHTML(r.topic)}</h3>
      <div class="rebuttal-section-block">
        <div class="rebuttal-label label-wrong">
          <i class="fas fa-times-circle"></i> Luận điệu sai trái
        </div>
        <div class="rebuttal-content">${escapeHTML(r.wrongClaim)}</div>
      </div>
      <div class="rebuttal-section-block">
        <div class="rebuttal-label label-correct">
          <i class="fas fa-check-circle"></i> Luận điểm phản bác
        </div>
        <div class="rebuttal-content">${escapeHTML(r.rebuttal)}</div>
      </div>
      ${r.evidence ? `
      <div class="rebuttal-section-block">
        <div class="rebuttal-label">📋 Bằng chứng</div>
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
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
    
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(data)
      });
      
      messageEl.className = 'form-message success';
      messageEl.textContent = '✅ Đăng ký thành công! Kiểm tra email của bạn nhé.';
      form.reset();
      
    } catch(error) {
      messageEl.className = 'form-message error';
      messageEl.textContent = '❌ Có lỗi xảy ra. Vui lòng thử lại.';
    }
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Đăng ký ngay';
  });
}

// ===== UTILITIES =====
function escapeHTML(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
