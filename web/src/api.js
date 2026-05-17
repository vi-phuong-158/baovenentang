const API_URL = import.meta.env.PROD
  ? '/api/gas'
  : 'https://script.google.com/macros/s/AKfycbzJ41UZaeQjWFPwk-v6IJYdOZoxMxPSrM7XWK9W-psMEph173IUo9Jq2NWAhU2NQriFzg/exec';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

const getJson = (url) =>
  fetch(url).then(r => r.json()).then(res => {
    if (res.success === false) throw new Error(res.error || 'API error');
    return res.data ?? res;
  });

// Persistent cache with localStorage + stale-while-revalidate
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_PREFIX = 'bvnt_';
const CACHE_MAX_BYTES = 5 * 1024 * 1024;

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts < CACHE_TTL) return { data: entry.data, fresh: true };
    return { data: entry.data, fresh: false };
  } catch { return null; }
}

function cacheSet(key, data) {
  try {
    const value = JSON.stringify({ data, ts: Date.now() });
    if (value.length > CACHE_MAX_BYTES) return;
    cacheTrim(value.length);
    localStorage.setItem(CACHE_PREFIX + key, value);
  } catch {
    cacheTrim();
    try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() })); } catch {}
  }
}

function cacheTrim(extraBytes = 0) {
  const keys = [];
  let totalBytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_PREFIX)) {
      try {
        const raw = localStorage.getItem(k) || '';
        const entry = JSON.parse(raw);
        totalBytes += raw.length;
        keys.push({ key: k, ts: entry.ts || 0, bytes: raw.length });
      } catch { localStorage.removeItem(k); }
    }
  }
  keys.sort((a, b) => a.ts - b.ts);
  while (totalBytes + extraBytes > CACHE_MAX_BYTES && keys.length) {
    const oldest = keys.shift();
    localStorage.removeItem(oldest.key);
    totalBytes -= oldest.bytes;
  }
  if (extraBytes === 0) {
    const half = Math.ceil(keys.length / 2);
    keys.slice(0, half).forEach(k => localStorage.removeItem(k.key));
  }
}

const cached = (key, fetcher) => {
  const hit = cacheGet(key);
  if (hit && hit.fresh) return Promise.resolve(hit.data);
  const promise = fetcher().then(data => { cacheSet(key, data); return data; });
  if (hit) {
    promise.catch(() => {});
    return Promise.resolve(hit.data);
  }
  return promise;
};

export const invalidateCache = (key) => {
  if (key) { localStorage.removeItem(CACHE_PREFIX + key); }
  else {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
    }
  }
};

// GET helpers
export const getToday = () =>
  getJson(`${API_URL}?action=today`);

export const getArticles = (days = 1, page = 1, limit = 20) =>
  cached(`articles-${days}-${page}-${limit}`, () => getJson(`${API_URL}?action=articles&days=${days}&page=${page}&limit=${limit}`));

export const getStats = () =>
  cached('stats', () => getJson(`${API_URL}?action=stats`));

export const getQuiz = (count = 10) =>
  getJson(`${API_URL}?action=quiz&count=${count}`);

export const searchArticles = (q, page = 1, limit = 20) =>
  getJson(`${API_URL}?action=search&q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`);

// POST helper
export const postApi = (action, payload = {}) =>
  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
      ...(API_TOKEN && API_URL.startsWith('/') ? { 'X-Api-Token': API_TOKEN } : {}),
    },
    body: JSON.stringify({ action, ...payload, ...(API_TOKEN ? { api_token: API_TOKEN } : {}) }),
  }).then(r => r.json());

// Named POST wrappers
export const subscribe = (data) => postApi('subscribe', data);
export const submitQuiz = (data) => postApi('submit_quiz', data);
export const runTroLy35 = (data) => postApi('troly35_run', data);
export const rateTroLy35 = (data) => postApi('troly35_rate', data);
export const getTroLy35History = (data) => postApi('troly35_history', data);
export const getTrends = (data) => postApi('troly35_trends', data);
export const sendFeedback = (data) => postApi('troly35_feedback', data);
