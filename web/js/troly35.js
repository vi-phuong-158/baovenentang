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
  initModeTabs();
  initResultTabs();
  initForm();
  initCopyButtons();
  initRating();
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

function initModeTabs() {
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mode-tab').forEach(item => item.classList.remove('active'));
      tab.classList.add('active');
      troly35State.mode = tab.dataset.mode;
      document.getElementById('troly35Mode').value = troly35State.mode;
      updateModeCopy(troly35State.mode);
    });
  });
}

function updateModeCopy(mode) {
  const label = document.getElementById('contentLabel');
  const input = document.getElementById('contentInput');
  const topic = document.getElementById('topicInput');

  const config = {
    rebuttal: {
      label: 'Nội dung bài viết/bình luận',
      placeholder: 'Dán nội dung cần phân tích. Nếu có link MXH, hãy dán nội dung kèm theo vì bản đầu không tự scrape nền tảng.',
      topic: 'VD: Tự do ngôn luận, Nhân quyền, Chủ quyền biển đảo'
    },
    fact_check: {
      label: 'Nội dung cần thẩm định',
      placeholder: 'Dán tin tức, nhận định hoặc đoạn trích cần thẩm định nhanh.',
      topic: 'VD: Nguồn tin, lĩnh vực hoặc chủ đề cần kiểm chứng'
    },
    article_writer: {
      label: 'Chủ đề và thông điệp chính',
      placeholder: 'Nhập chủ đề, thông điệp chính, đối tượng độc giả và yêu cầu độ dài mong muốn.',
      topic: 'VD: Bảo vệ nền tảng tư tưởng, chuyển đổi số, đoàn kết dân tộc'
    }
  }[mode];

  label.textContent = config.label;
  input.placeholder = config.placeholder;
  topic.placeholder = config.topic;
}

function initResultTabs() {
  document.querySelectorAll('.result-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.result-tab').forEach(item => item.classList.remove('active'));
      document.querySelectorAll('.result-panel').forEach(panel => panel.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.panel).classList.add('active');
    });
  });
}

function initForm() {
  const form = document.getElementById('troly35Form');
  const clearBtn = document.getElementById('clearBtn');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    await runTroLy35();
  });

  clearBtn.addEventListener('click', () => {
    document.getElementById('contentInput').value = '';
    document.getElementById('sourceUrl').value = '';
    document.getElementById('topicInput').value = '';
    setInlineMessage('runMessage', '', 'neutral');
    document.getElementById('resultCard').classList.add('is-hidden');
  });
}

async function runTroLy35() {
  const accessCode = getAccessCode();
  const mode = document.getElementById('troly35Mode').value;
  const content = document.getElementById('contentInput').value.trim();
  const sourceUrl = document.getElementById('sourceUrl').value.trim();
  const topic = document.getElementById('topicInput').value.trim();
  const runBtn = document.getElementById('runBtn');

  if (!accessCode) {
    setInlineMessage('runMessage', 'Vui lòng nhập mã truy cập nội bộ.', 'error');
    return;
  }

  if (content.length < 20) {
    setInlineMessage('runMessage', 'Nội dung cần tối thiểu 20 ký tự.', 'error');
    return;
  }

  if (/^https?:\/\/\S+$/i.test(content)) {
    setInlineMessage('runMessage', 'Bản đầu chưa tự lấy nội dung từ link. Vui lòng dán nội dung kèm theo.', 'error');
    return;
  }

  setLoading(runBtn, true);
  setInlineMessage('runMessage', 'Đang phân tích, tìm dẫn chứng và soạn bản nháp...', 'neutral');

  try {
    const result = await postApi('troly35_run', {
      accessCode,
      mode,
      content,
      sourceUrl,
      topic
    });

    if (!result.success) {
      throw new Error(result.error || 'Không xử lý được yêu cầu.');
    }

    renderResult(result, mode);
    setInlineMessage('runMessage', 'Đã tạo bản nháp. Vui lòng rà soát trước khi sử dụng.', 'success');
    loadTrends();
  } catch (error) {
    setInlineMessage('runMessage', error.message || 'Có lỗi xảy ra.', 'error');
  } finally {
    setLoading(runBtn, false);
  }
}

function renderResult(payload, mode) {
  troly35State.requestId = payload.requestId || '';
  troly35State.rating = 0;
  updateStars();

  const result = payload.result || {};
  const analysis = payload.analysis || {};
  const knowledge = payload.knowledge || [];

  const resultCard = document.getElementById('resultCard');
  resultCard.classList.remove('is-hidden');
  resultCard.classList.remove('result-enter');
  void resultCard.offsetWidth;
  resultCard.classList.add('result-enter');
  document.getElementById('requestIdLabel').textContent = troly35State.requestId;
  document.getElementById('resultModeLabel').textContent = modeLabel(mode);
  document.getElementById('resultTitle').textContent = result.tieu_de || 'Bản nháp Trợ lý 35';
  document.getElementById('analysisStrip').innerHTML = renderAnalysis(analysis);

  const view = buildResultView(result, mode);
  document.getElementById('fullContent').innerHTML = formatText(view.full);
  document.getElementById('shortContent').innerHTML = formatText(view.short);
  document.getElementById('summaryContent').innerHTML = renderList(view.summary);
  document.getElementById('referencesContent').innerHTML = renderReferences(result, knowledge);

  document.querySelectorAll('.result-tab').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.result-panel').forEach(item => item.classList.remove('active'));
  document.querySelector('.result-tab[data-panel="fullPanel"]').classList.add('active');
  document.getElementById('fullPanel').classList.add('active');
}

function buildResultView(result, mode) {
  if (mode === 'fact_check') {
    return {
      full: [
        `Mức đánh giá: ${result.muc_danh_gia || 'Chưa rõ'}`,
        `Độ tin cậy: ${result.do_tin_cay || 0}/100`,
        '',
        result.nhan_dinh_chinh || '',
        '',
        result.khuyen_nghi_xu_ly || '',
        '',
        result.ghi_chu || '',
        result.nhan_kiem_duyet || ''
      ].join('\n'),
      short: result.khuyen_nghi_xu_ly || result.nhan_dinh_chinh || '',
      summary: result.diem_can_kiem_chung || []
    };
  }

  if (mode === 'article_writer') {
    return {
      full: [
        result.tieu_de || '',
        '',
        result.mo_ta_ngan || '',
        '',
        result.bai_viet || '',
        '',
        result.ghi_chu || '',
        result.nhan_kiem_duyet || ''
      ].join('\n'),
      short: result.caption_mxh || '',
      summary: result.dan_y || []
    };
  }

  return {
    full: [
      result.phien_ban_day_du || '',
      '',
      result.ghi_chu || '',
      result.nhan_kiem_duyet || ''
    ].join('\n'),
    short: result.phien_ban_comment || '',
    summary: result.phien_ban_tom_tat || []
  };
}

function renderAnalysis(analysis) {
  const danger = Number(analysis.do_nguy_hiem) || 0;
  const claims = Array.isArray(analysis.luan_diem_sai) ? analysis.luan_diem_sai.length : 0;
  const warnings = Array.isArray(analysis.canh_bao_an_toan) ? analysis.canh_bao_an_toan.length : 0;

  return `
    <span><strong>Chủ đề:</strong> ${escapeHTML(analysis.chu_de || 'Chưa phân loại')}</span>
    <span><strong>Độ nguy hiểm:</strong> ${danger}/5</span>
    <span><strong>Luận điểm:</strong> ${claims}</span>
    <span><strong>Cảnh báo:</strong> ${warnings}</span>
  `;
}

function renderReferences(result, knowledge) {
  const resultEvidence = result.dan_chung_su_dung || result.bang_chung_doi_chieu || [];
  const evidenceHtml = Array.isArray(resultEvidence) && resultEvidence.length
    ? `<h3>Dẫn chứng đã dùng</h3>${resultEvidence.map(item => `
        <div class="reference-item">
          <strong>${escapeHTML(item.loai || item.nguon || 'Nguồn')}</strong>
          <p>${escapeHTML(item.noi_dung || '')}</p>
          ${item.nguon ? `<small>${escapeHTML(item.nguon)}</small>` : ''}
        </div>`).join('')}`
    : '<div class="mini-empty">Không có dẫn chứng riêng trong kết quả.</div>';

  const knowledgeHtml = Array.isArray(knowledge) && knowledge.length
    ? `<h3>Tư liệu RAG</h3>${knowledge.map(item => `
        <div class="reference-item">
          <strong>${escapeHTML(item.chuDe || item.id || 'Tư liệu')}</strong>
          <p>${escapeHTML(item.phanBacChinh || item.luanDiemSaiTrai || '')}</p>
          <small>${escapeHTML(item.nguon || '')}${item.score ? ` · score ${Number(item.score).toFixed(3)}` : ''}</small>
        </div>`).join('')}`
    : '<div class="mini-empty">Pinecone không trả về tư liệu phù hợp.</div>';

  return evidenceHtml + knowledgeHtml;
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
