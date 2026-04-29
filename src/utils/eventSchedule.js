/**
 * Schedule helpers for Approved events.
 * - Upcoming: now < start
 * - Live: start <= now <= end (inclusive bounds)
 * - Completed: now > end
 *
 * If endDate is missing, defaults to start + 24h so single-slot events still get a Live window.
 */

function parseDate(d) {
  if (!d) return null;
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
}

function effectiveEnd(startDate, endDate) {
  const start = parseDate(startDate);
  if (!start) return null;
  const end = parseDate(endDate);
  if (end) return end;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

function computeFeedType(startDate, endDate, now = new Date()) {
  const start = parseDate(startDate);
  if (!start) return 'Upcoming';

  const end = effectiveEnd(startDate, endDate);
  const t = now.getTime();

  if (t < start.getTime()) return 'Upcoming';
  if (t <= end.getTime()) return 'Live';
  return 'Completed';
}

function formatDateTimeDisplay(iso) {
  const d = parseDate(iso);
  if (!d) return '';
  try {
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
}

module.exports = {
  computeFeedType,
  effectiveEnd,
  formatDateTimeDisplay,
  parseDate,
};
