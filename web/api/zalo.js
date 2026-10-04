import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

// Dedicated Zalo ingress. It never uses the Trợ lý 35 API token or Bot token.
export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };

export function relaySignature(secret, envelope) {
  return createHmac('sha256', secret).update([
    'THU_TUAN_ZALO_COMMAND_V1', envelope.environment, envelope.timestamp,
    envelope.nonce, envelope.eventJson,
  ].join('\n'), 'utf8').digest('hex');
}

function equalSecret(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function knownEvent(value) {
  const allowed = ['message.text.received', 'message.image.received', 'message.sticker.received',
    'message.voice.received', 'message.unsupported.received'];
  return allowed.includes(value) ? value : value == null ? 'NONE' : 'OTHER';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ status: 'METHOD_DENIED' });
  const env = process.env;
  if (env.ZALO_COMMANDS_ENABLED !== 'true') return res.status(200).json({ status: 'DISABLED' });
  const webhookSecret = env.ZALO_WEBHOOK_SECRET || '';
  const relaySecret = env.ZALO_COMMAND_RELAY_SECRET || '';
  const environment = env.ZALO_COMMAND_ENV;
  const url = env.ZALO_COMMAND_GAS_URL || '';
  if (webhookSecret.length < 32 || relaySecret.length < 32 ||
      !['TEST', 'PROD'].includes(environment) ||
      !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
    return res.status(503).json({ status: 'CONFIG_REQUIRED' });
  }
  if (!equalSecret(req.headers?.['x-bot-api-secret-token'], webhookSecret)) {
    return res.status(403).json({ status: 'AUTH_REQUIRED' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ status: 'INVALID_EVENT' });
    }
    const bodyJson = JSON.stringify(body);
    if (Buffer.byteLength(bodyJson, 'utf8') > 32768) return res.status(413).json({ status: 'EVENT_TOO_LARGE' });
    // Live Zalo callbacks use root-level event_name/message; API examples use ok/result.
    // Normalize only after header authentication and the original body size check.
    let event = body;
    if (!Object.hasOwn(body, 'result') && body.event_name === 'message.text.received' &&
        body.message && typeof body.message === 'object' && !Array.isArray(body.message)) {
      if (body.ok !== undefined && body.ok !== true) return res.status(400).json({ status: 'INVALID_EVENT' });
      event = { ok: true, result: { event_name: body.event_name, message: body.message } };
    }
    // Authenticated non-text/verification events need no GAS or Bot API call.
    if (event.result?.event_name !== 'message.text.received') {
      // Only fixed event classes and shape booleans. Never log the payload, text or identifiers.
      console.info(JSON.stringify({ status: 'ZALO_EVENT_IGNORED',
        resultEvent: knownEvent(body.result?.event_name), rootEvent: knownEvent(body.event_name),
        dataEvent: knownEvent(body.data?.event_name), hasResult: !!body.result,
        rootHasMessage: !!body.message, resultHasMessage: !!body.result?.message,
        dataHasMessage: !!body.data?.message, bodyOk: body.ok === true }));
      return res.status(200).json({ status: 'IGNORED' });
    }
    if (event.ok !== true) return res.status(400).json({ status: 'INVALID_EVENT' });
    const eventJson = JSON.stringify(event);
    const envelope = { environment, timestamp: Date.now(), nonce: randomUUID(), eventJson };
    envelope.signature = relaySignature(relaySecret, envelope);
    const upstream = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(envelope), signal: AbortSignal.timeout(20000),
    });
    const result = await upstream.json();
    // No upstream text, query, identifiers or exceptions leave the relay.
    const accepted = ['SENT', 'ALREADY_HANDLED', 'IGNORED', 'DISABLED', 'RATE_LIMITED',
      'RECONCILIATION_REQUIRED', 'REPLY_UNCONFIRMED'];
    if (!upstream.ok || !accepted.includes(result?.status)) {
      return res.status(502).json({ status: 'PROCESSOR_UNAVAILABLE' });
    }
    console.info(JSON.stringify({ status: 'ZALO_COMMAND_RESULT', result: result.status,
      inputShape: event === body ? 'RESULT' : 'ROOT' }));
    return res.status(200).json({ status: result.status });
  } catch (_) {
    return res.status(502).json({ status: 'PROCESSOR_UNAVAILABLE' });
  }
}
