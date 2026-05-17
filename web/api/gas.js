const GAS_URL = process.env.GAS_DEPLOYMENT_URL;

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 30;
const ipHits = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    ipHits.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

export default async function handler(req, res) {
  if (!GAS_URL) {
    return res.status(500).json({ success: false, error: 'Backend not configured' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ success: false, error: 'Quá nhiều request, vui lòng thử lại sau.' });
  }

  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const url = new URL(GAS_URL);

    if (req.method === 'GET') {
      Object.entries(req.query || {}).forEach(([k, v]) => url.searchParams.set(k, v));
      const upstream = await fetch(url.toString());
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    if (req.method === 'POST') {
      const upstream = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(502).json({ success: false, error: 'Backend không phản hồi.' });
  }
}
