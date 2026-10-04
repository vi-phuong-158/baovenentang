import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

// Separate from /api/gas. Never inject the general API/AI token or send a Bot message here.
export const config = { maxDuration: 60 };
const DOMAIN = 'ZALO_SHOWCASE_V1_TEST';

function equalSecret(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(provided), b = Buffer.from(expected);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export function makeEnvelope(event, secret, timestamp = Date.now(), nonce = randomUUID()) {
  return {
    action: 'zalo_showcase_v1', version: 1, timestamp, nonce, event,
    signature: createHmac('sha256', secret).update(JSON.stringify([DOMAIN, 1, timestamp, nonce, event])).digest('hex')
  };
}

// Factory allows focused tests of HTTP/auth/forwarding; production handler uses real fetch/env.
export function createHandler({ env = process.env, fetchImpl = fetch, clock = Date.now } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ ok: false, status: 'METHOD_DENIED' });
    if (env.ZALO_SHOWCASE_ENV !== 'TEST' || !['preview','development'].includes(env.VERCEL_ENV))
      return res.status(503).json({ ok: false, status: 'TEST_ONLY' });
    const webhookSecret = env.ZALO_SHOWCASE_TEST_WEBHOOK_SECRET;
    const relaySecret = env.ZALO_SHOWCASE_TEST_RELAY_SECRET;
    const url = env.ZALO_SHOWCASE_TEST_GAS_URL || '';
    if (typeof webhookSecret !== 'string' || webhookSecret.length < 8 || webhookSecret.length > 256 ||
        typeof relaySecret !== 'string' || !/^[A-Za-z0-9_-]{32,256}$/.test(relaySecret) ||
        !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec\/zalo-showcase-v1$/.test(url))
      return res.status(503).json({ ok: false, status: 'CONFIG_BLOCKED' });
    // Official Zalo verification: exact header value, no query/body fallback.
    if (!equalSecret(req.headers?.['x-bot-api-secret-token'], webhookSecret))
      return res.status(403).json({ ok: false, status: 'AUTH_DENIED' });
    const type = req.headers?.['content-type'];
    if (typeof type !== 'string' || !/^application\/json(?:\s*;|$)/i.test(type))
      return res.status(415).json({ ok: false, status: 'CONTENT_TYPE_DENIED' });
    try {
      const event = typeof req.body === 'string' ? req.body :
        Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
      if (typeof event !== 'string' || Buffer.byteLength(event) > 16000)
        return res.status(413).json({ ok: false, status: 'BODY_TOO_LARGE' });
      const body = JSON.parse(event);
      if (!body || body.ok !== true || !body.result || typeof body.result !== 'object' ||
          Array.isArray(body.result) || typeof body.result.event_name !== 'string')
        return res.status(400).json({ ok: false, status: 'MALFORMED_EVENT' });
      const upstream = await fetchImpl(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeEnvelope(event, relaySecret, clock())),
        signal: AbortSignal.timeout(45000), redirect: 'follow'
      });
      // GAS ContentService redirects to googleusercontent for its response.
      if (!upstream.ok) return res.status(503).json({ ok: false, status: 'UPSTREAM_UNCONFIRMED' });
      const result = await upstream.json();
      const terminal = ['SENT','DUPLICATE','RATE_LIMITED','IGNORED_CHAT_TEXT','IGNORED_NO_PENDING_QUIZ',
        'IGNORED_EVENT','IGNORED_SELF','IGNORED_CHAT','MALFORMED_EVENT','HELD_NO_RETRY','BOT_UNCONFIRMED'];
      if (!result || !terminal.includes(result.status))
        return res.status(503).json({ ok: false, status: 'UPSTREAM_BLOCKED' });
      // Held deliveries are acknowledged to avoid replay after an uncertain send.
      // Operators inspect hashed GAS state; no upstream body/IDs/secrets are exposed.
      return res.status(200).json({ ok: true, status: result.status });
    } catch (_) {
      return res.status(503).json({ ok: false, status: 'REQUEST_UNCONFIRMED' });
    }
  };
}

export default createHandler();
