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
