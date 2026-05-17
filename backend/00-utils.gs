/**
 * ============================================================
 * MODULE: SHARED UTILITIES
 * Hàm tiện ích dùng chung, tránh trùng lặp giữa các module.
 * ============================================================
 */

/**
 * Escape HTML entities để tránh XSS khi nhúng text vào HTML.
 */
function escapeHtml_(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Cắt ngắn text tới maxLen ký tự, thêm "..." nếu cắt.
 */
function truncateText_(text, maxLen) {
  if (!text || text.length <= maxLen) return text || '';
  return text.substring(0, maxLen) + '...';
}

function cleanValue_(value) {
  return value === undefined || value === null ? '' : value.toString().trim();
}

function cleanText_(text) {
  return cleanValue_(text)
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function validateEmail_(email) {
  const value = cleanValue_(email);
  if (!value || value.length > 254) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value);
}

function hashSha256_(text) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    cleanValue_(text),
    Utilities.Charset.UTF_8
  );
  return digest.map(byte => {
    const value = byte < 0 ? byte + 256 : byte;
    return value.toString(16).padStart(2, '0');
  }).join('');
}

function getRequestHeader_(e, headerName) {
  if (!e || !headerName) return '';
  const target = headerName.toLowerCase();
  const sources = [e.headers, e.httpHeaders, e.parameter && e.parameter.headers];

  for (let i = 0; i < sources.length; i++) {
    const headers = sources[i];
    if (!headers || typeof headers !== 'object') continue;
    const keys = Object.keys(headers);
    for (let j = 0; j < keys.length; j++) {
      if (keys[j].toLowerCase() === target) return cleanValue_(headers[keys[j]]);
    }
  }

  return '';
}

function constantTimeEquals_(a, b) {
  const left = cleanValue_(a);
  const right = cleanValue_(b);
  if (!left || !right || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}
