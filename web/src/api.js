import { cached, invalidateCache } from './cache.js';

const API_URL = import.meta.env.PROD
  ? '/api/gas'
  : (import.meta.env.VITE_GAS_URL || '/api/gas');

export { invalidateCache };

async function parseApiResponse(response) {
  const raw = await response.text();
  let parsed = null;

  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (!parsed) {
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 140);
    throw new Error(
      snippet
        ? `API khong tra JSON hop le. Kiem tra proxy/dev server. Response mau: ${snippet}`
        : 'API khong tra JSON hop le. Kiem tra proxy/dev server.'
    );
  }

  if (!response.ok || parsed.success === false) {
    throw new Error(parsed.error || `API error (${response.status})`);
  }

  return parsed.data ?? parsed;
}

const getJson = (url) =>
  fetch(url).then(parseApiResponse);

// GET helpers
export const getToday = () =>
  getJson(`${API_URL}?action=today`);

export const getArticles = (days = 1, page = 1, limit = 20) =>
  cached(`articles-${days}-${page}-${limit}`, () => getJson(`${API_URL}?action=articles&days=${days}&page=${page}&limit=${limit}`));

export const getStats = () =>
  cached('stats-v2', () => getJson(`${API_URL}?action=stats`));

export const getQuiz = (count = 10) =>
  getJson(`${API_URL}?action=quiz&count=${count}`);

function assertArrayResponse(data, featureName) {
  if (!Array.isArray(data)) {
    throw new Error(`${featureName} chưa sẵn sàng trên Apps Script. Cần deploy backend mới và chạy setupSystem().`);
  }
  return data;
}

export const getBooks = () =>
  cached(
    'books-v3',
    () => getJson(`${API_URL}?action=books`).then(data => assertArrayResponse(data, 'Tủ sách số')),
    { ttl: 60 * 60 * 1000 }
  );

export const getBookById = (id) =>
  getJson(`${API_URL}?action=book&id=${encodeURIComponent(id)}`);

export const searchArticles = (q, page = 1, limit = 20) =>
  getJson(`${API_URL}?action=search&q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`);

// POST helper
export const postApi = (action, payload = {}) =>
  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ action, ...payload }),
  }).then(parseApiResponse);

// Named POST wrappers
export const subscribe = (data) => postApi('subscribe', data);
export const submitQuiz = (data) => postApi('submit_quiz', data);
export const runTroLy35 = (data) => postApi('troly35_run', data);
export const rateTroLy35 = (data) => postApi('troly35_rate', data);
export const getTroLy35History = (data) => postApi('troly35_history', data);
export const getTrends = (data) => postApi('troly35_trends', data);
export const sendFeedback = (data) => postApi('troly35_feedback', data);
export const askBookAI = (data) => postApi('ask_book', data);
