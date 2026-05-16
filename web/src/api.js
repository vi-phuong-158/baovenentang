const API_URL =
  'https://script.google.com/macros/s/AKfycbzJ41UZaeQjWFPwk-v6IJYdOZoxMxPSrM7XWK9W-psMEph173IUo9Jq2NWAhU2NQriFzg/exec';

// Unwrap { success, data } envelope returned by all GAS doGet endpoints
const getJson = (url) =>
  fetch(url).then(r => r.json()).then(res => {
    if (res.success === false) throw new Error(res.error || 'API error');
    return res.data ?? res;
  });

// GET helpers — return unwrapped data directly
export const getToday = () =>
  getJson(`${API_URL}?action=today`);

export const getArticles = (days = 1) =>
  getJson(`${API_URL}?action=articles&days=${days}`);

export const getStats = () =>
  getJson(`${API_URL}?action=stats`);

export const getQuiz = (count = 10) =>
  getJson(`${API_URL}?action=quiz&count=${count}`);

export const getRebuttals = (keyword) =>
  getJson(`${API_URL}?action=rebuttals&keyword=${encodeURIComponent(keyword)}`);

// POST helper — Content-Type: text/plain is required to bypass GAS CORS preflight
export const postApi = (action, payload) =>
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  }).then(r => r.json());

// Named POST wrappers
export const subscribe = (data) => postApi('subscribe', data);
export const submitQuiz = (data) => postApi('submit_quiz', data);
export const runTroLy35 = (data) => postApi('troly35_run', data);
export const rateTroLy35 = (data) => postApi('troly35_rate', data);
export const getTrends = (data) => postApi('troly35_trends', data);
