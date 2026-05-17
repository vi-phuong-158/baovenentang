import { createHash } from 'crypto';

const GAS_URL = process.env.GAS_DEPLOYMENT_URL;
const GAS_API_TOKEN = process.env.GAS_API_TOKEN || process.env.API_ACCESS_TOKEN || '';
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || GAS_API_TOKEN;

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 30;
const ipHits = new Map();
const TOKEN_INJECT_ACTIONS = new Set(['subscribe', 'submit_quiz', 'contact']);
const ADMIN_ACTIONS = new Set(['bantin35_generate', 'feedback_stats']);

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

function clientToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return (req.headers['x-api-token'] || req.query?.api_token || '').toString().trim();
}

function hashIp(ip) {
  const salt = process.env.IP_HASH_SALT || GAS_API_TOKEN || 'bvnt';
  return createHash('sha256').update(`${salt}:${ip || 'unknown'}`).digest('hex');
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'object') return { ...body };
  try { return JSON.parse(body); } catch { return body; }
}

function shouldInjectToken(action) {
  return TOKEN_INJECT_ACTIONS.has(action) || ADMIN_ACTIONS.has(action);
}

function authorizeAction(req, action, res) {
  if (!ADMIN_ACTIONS.has(action)) return true;
  if (!ADMIN_API_TOKEN || clientToken(req) !== ADMIN_API_TOKEN) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return false;
  }
  return true;
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Token, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const url = new URL(GAS_URL);

    if (req.method === 'GET') {
      Object.entries(req.query || {}).forEach(([k, v]) => url.searchParams.set(k, v));
      const action = (req.query?.action || '').toString();
      if (!authorizeAction(req, action, res)) return;
      if (shouldInjectToken(action)) {
        if (!GAS_API_TOKEN) return res.status(500).json({ success: false, error: 'API token not configured' });
        url.searchParams.set('api_token', GAS_API_TOKEN);
      }
      const upstream = await fetch(url.toString());
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    if (req.method === 'POST') {
      const parsedBody = parseBody(req.body);
      const action = typeof parsedBody === 'object' ? (parsedBody.action || req.query?.action || '') : (req.query?.action || '');
      if (!authorizeAction(req, action, res)) return;
      let upstreamBody = parsedBody;
      if (typeof parsedBody === 'object') {
        upstreamBody = {
          ...parsedBody,
          clientIpHash: hashIp(ip),
        };
        if (shouldInjectToken(action)) {
          if (!GAS_API_TOKEN) return res.status(500).json({ success: false, error: 'API token not configured' });
          upstreamBody.api_token = GAS_API_TOKEN;
        }
      }

      const upstream = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          ...(GAS_API_TOKEN ? { 'X-Api-Token': GAS_API_TOKEN } : {}),
        },
        body: typeof upstreamBody === 'string' ? upstreamBody : JSON.stringify(upstreamBody),
      });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(502).json({ success: false, error: 'Backend không phản hồi.' });
  }
}
