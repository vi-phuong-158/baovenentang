/* ============================================================
   TRỢ LÝ 35 - Frontend
   ============================================================ */

const API_URL = 'https://script.google.com/macros/s/AKfycbzJ41UZaeQjWFPwk-v6IJYdOZoxMxPSrM7XWK9W-psMEph173IUo9Jq2NWAhU2NQriFzg/exec';
const TROLY35_ACCESS_KEY = 'troly35_access_code';

const troly35State = {
  mode: 'rebuttal',
  requestId: '',
  rating: 0,
  trendWindow: 7
};

function icon(name, size = 18, stroke = 1.75) {
  return window.TDSIcon ? window.TDSIcon(name, { size, stroke }) : '';
}

document.addEventListener('DOMContentLoaded', () => {
  initMotion();
  initMobileMenu();
  initAccessPanel();
  // initModeTabs();
  // initResultTabs();
  initChatForm();
  initCopyButtons();
  // initRating();
  initTrends();
});

function initMobileMenu() {
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('navMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    menu.classList.toggle('show');
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => menu.classList.remove('show'));
  });
}

let motionObserver;

function initMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.body.classList.add('motion-ready');
  prepareMotionItems(document.querySelectorAll([
    '.troly35-heading',
    '.troly35-side .tool-card',
    '.troly35-main > form'
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

function initAccessPanel() {
  const input = document.getElementById('accessCode');
  const button = document.getElementById('saveAccessBtn');
  const saved = sessionStorage.getItem(TROLY35_ACCESS_KEY);

  if (saved) {
    input.value = saved;
    setInlineMessage('accessMessage', 'Đã tải mã truy cập trong phiên này.', 'success');
    loadTrends();
  }

  button.addEventListener('click', () => {
    const value = input.value.trim();
    if (!value) {
      sessionStorage.removeItem(TROLY35_ACCESS_KEY);
      setInlineMessage('accessMessage', 'Đã xóa mã truy cập khỏi phiên.', 'neutral');
      return;
    }

    sessionStorage.setItem(TROLY35_ACCESS_KEY, value);
    setInlineMessage('accessMessage', 'Đã lưu mã truy cập cho phiên hiện tại.', 'success');
    loadTrends();
  });
}

function initChatForm() {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const clearBtn = document.getElementById('clearChatBtn');
  const chatMessages = document.getElementById('chatMessages');

  if (!form) return;

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = (input.scrollHeight) + 'px';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    
    await runTroLy35Chat(text);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      // Keep only the first welcome message
      const welcomeMsg = chatMessages.firstElementChild.cloneNode(true);
      chatMessages.innerHTML = '';
      chatMessages.appendChild(welcomeMsg);
    });
  }
}

function appendMessage(role, htmlContent) {
  const chatMessages = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-message ${role}-message`;
  
  const iconName = role === 'user' ? 'user' : 'bot';
  
  div.innerHTML = `
    <div class="message-avatar">
      ${icon(iconName, 20)}
    </div>
    <div class="message-content">
      ${htmlContent}
    </div>
  `;
  
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

async function runTroLy35Chat(text) {
  const accessCode = getAccessCode();
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  
  if (!accessCode) {
    appendMessage('assistant', '<p class="error-text">Vui lòng nhập mã truy cập nội bộ ở cột bên trái.</p>');
    return;
  }

  // Add user message
  appendMessage('user', `<p>${escapeHTML(text).replace(/\\n/g, '<br>')}</p>`);
  input.value = '';
  input.style.height = 'auto';
  
  // Disable input while loading
  input.disabled = true;
  sendBtn.disabled = true;
  sendBtn.innerHTML = `<span class="spinner-icon">${icon('refresh', 18)}</span>`;
  
  const loadingMsg = appendMessage('assistant', '<p><span class="spinner-icon" style="margin-right: 8px;">' + icon('refresh', 16) + '</span>Đang phân tích và tìm kiếm tri thức...</p>');

  try {
    const result = await postApi('troly35_run', {
      accessCode,
      mode: 'rebuttal', // Mặc định chạy rebuttal để lấy response phong phú
      content: text,
      sourceUrl: '',
      topic: ''
    });

    if (!result.success) {
      throw new Error(result.error || 'Không xử lý được yêu cầu.');
    }

    // Format response
    let responseHtml = formatText(result.result.phien_ban_day_du || result.result.nhan_dinh_chinh || 'Đã phân tích xong.');
    
    // Chỉ hiển thị cảnh báo khi mức nguy hiểm cao (>=4) — canh_bao_an_toan là tín hiệu nội bộ
    if (result.analysis && result.analysis.do_nguy_hiem >= 4 &&
        result.analysis.canh_bao_an_toan && result.analysis.canh_bao_an_toan.length > 0) {
      responseHtml += `<div style="margin-top: 12px; padding: 10px; background: rgba(244,194,13,0.1); border-left: 3px solid var(--gold); font-size: 13px;">
        <strong>Lưu ý:</strong> ${escapeHTML(result.analysis.canh_bao_an_toan.join(', '))}
      </div>`;
    }

    loadingMsg.querySelector('.message-content').innerHTML = responseHtml;
    loadTrends();
  } catch (error) {
    loadingMsg.querySelector('.message-content').innerHTML = `<p class="error-text">Lỗi: ${escapeHTML(error.message || 'Có lỗi xảy ra.')}</p>`;
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    sendBtn.innerHTML = `${icon('send', 18)}`;
    input.focus();
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}


function initCopyButtons() {
  document.querySelectorAll('[data-copy-target]').forEach(button => {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      const text = target ? target.innerText.trim() : '';
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        setInlineMessage('runMessage', 'Đã copy nội dung.', 'success');
      } catch (error) {
        setInlineMessage('runMessage', 'Không copy được nội dung trên trình duyệt này.', 'error');
      }
    });
  });
}

function initRating() {
  document.querySelectorAll('#ratingStars button').forEach(button => {
    button.addEventListener('click', () => {
      troly35State.rating = Number(button.dataset.rating);
      updateStars();
    });
  });

  document.getElementById('sendRatingBtn').addEventListener('click', async () => {
    const accessCode = getAccessCode();
    const note = document.getElementById('ratingNote').value.trim();

    if (!troly35State.requestId) {
      setInlineMessage('runMessage', 'Chưa có kết quả để đánh giá.', 'error');
      return;
    }

    if (!troly35State.rating) {
      setInlineMessage('runMessage', 'Vui lòng chọn số sao.', 'error');
      return;
    }

    try {
      const result = await postApi('troly35_rate', {
        accessCode,
        requestId: troly35State.requestId,
        rating: troly35State.rating,
        note
      });

      if (!result.success) throw new Error(result.error || 'Không lưu được đánh giá.');
      setInlineMessage('runMessage', 'Đã lưu đánh giá chất lượng.', 'success');
      loadTrends();
    } catch (error) {
      setInlineMessage('runMessage', error.message || 'Không lưu được đánh giá.', 'error');
    }
  });
}

function updateStars() {
  document.querySelectorAll('#ratingStars button').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.rating) <= troly35State.rating);
  });
}

function initTrends() {
  document.querySelectorAll('.segment').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.segment').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      troly35State.trendWindow = Number(button.dataset.window) || 7;
      loadTrends();
    });
  });
}

async function loadTrends() {
  const accessCode = getAccessCode();
  const container = document.getElementById('trendStats');

  if (!accessCode) {
    container.innerHTML = '<div class="mini-empty">Nhập mã để tải thống kê.</div>';
    return;
  }

  container.innerHTML = '<div class="mini-empty">Đang tải...</div>';

  try {
    const result = await postApi('troly35_trends', {
      accessCode,
      windowDays: troly35State.trendWindow
    });

    if (!result.success) throw new Error(result.error || 'Không tải được thống kê.');
    renderTrends(result.data);
  } catch (error) {
    container.innerHTML = `<div class="mini-empty error-text">${escapeHTML(error.message || 'Không tải được thống kê.')}</div>`;
  }
}

function renderTrends(data) {
  const container = document.getElementById('trendStats');
  const topics = data.topTopics || [];

  container.innerHTML = `
    <div class="trend-grid">
      <div><strong>${Number(data.totalRequests || 0).toLocaleString('vi-VN')}</strong><span>Lượt</span></div>
      <div><strong>${data.averageDangerLevel || 0}</strong><span>Nguy hiểm TB</span></div>
      <div><strong>${data.goodRatingRate || 0}%</strong><span>Đánh giá tốt</span></div>
    </div>
    <div class="trend-topics">
      ${topics.length ? topics.map(item => `
        <div class="trend-topic">
          <span>${escapeHTML(item.topic)}</span>
          <strong>${item.count}</strong>
        </div>`).join('') : '<div class="mini-empty">Chưa có dữ liệu.</div>'}
    </div>
  `;
  prepareMotionItems(container.querySelectorAll('.trend-grid > div, .trend-topic'));
}

async function postApi(action, payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      action,
      ...payload
    })
  });

  return response.json();
}

function getAccessCode() {
  const input = document.getElementById('accessCode');
  const value = input.value.trim() || sessionStorage.getItem(TROLY35_ACCESS_KEY) || '';
  if (value) sessionStorage.setItem(TROLY35_ACCESS_KEY, value);
  return value;
}

function setLoading(button, loading) {
  button.disabled = loading;
  button.innerHTML = loading
    ? `<span class="spinner-icon">${icon('refresh', 18)}</span> Đang chạy...`
    : `${icon('sparkles', 18)} Chạy Trợ lý 35`;
}

function setInlineMessage(id, message, type) {
  const element = document.getElementById(id);
  if (!element) return;

  element.textContent = message;
  element.className = `inline-message ${message ? type : ''}`;
}

function modeLabel(mode) {
  return {
    rebuttal: 'Phản bác',
    fact_check: 'Thẩm định nhanh',
    article_writer: 'Trợ lý viết bài'
  }[mode] || 'Kết quả';
}

function renderList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<div class="mini-empty">Không có nội dung tóm tắt.</div>';
  }

  return `<ul class="generated-list">${items.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`;
}

function formatText(text) {
  const safe = escapeHTML(text || '').trim();
  if (!safe) return '<div class="mini-empty">Không có nội dung.</div>';

  return safe
    .split(/\n{2,}/)
    .map(block => `<p>${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text === undefined || text === null ? '' : text.toString();
  return div.innerHTML;
}
