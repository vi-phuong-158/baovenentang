const DEFAULT_CACHE_TTL = 5 * 60 * 1000;
const CACHE_PREFIX = 'bvnt_';
const CACHE_MAX_BYTES = 5 * 1024 * 1024;
const inFlight = new Map();

function cacheGet(key, ttl = DEFAULT_CACHE_TTL) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts < ttl) return { data: entry.data, fresh: true };
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

export const cached = (key, fetcher, options = {}) => {
  const ttl = options.ttl || DEFAULT_CACHE_TTL;
  const hit = cacheGet(key, ttl);
  if (hit && hit.fresh) return Promise.resolve(hit.data);
  if (inFlight.has(key)) {
    const promise = inFlight.get(key);
    if (hit) return Promise.resolve(hit.data);
    return promise;
  }
  const promise = fetcher()
    .then(data => { cacheSet(key, data); return data; })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
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
