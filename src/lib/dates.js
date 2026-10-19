export const DAY = 86400000;

export function parseDate(s) {
  if (!s) return null;
  if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** whole days from a to b (b - a) */
export function diffDays(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / DAY);
}

export function startOfWeek(d) {
  const x = parseDate(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  return addDays(x, -day);
}

export function fmtDate(s, withYear = false) {
  const d = parseDate(s);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
}

export function fmtRange(a, b) {
  if (!a && !b) return 'No dates';
  if (!a) return `Due ${fmtDate(b)}`;
  if (!b) return `From ${fmtDate(a)}`;
  const da = parseDate(a), db = parseDate(b);
  const sameYear = da.getFullYear() === db.getFullYear();
  return `${fmtDate(a, !sameYear)} – ${fmtDate(b, true)}`;
}

export function relDays(s) {
  const n = diffDays(today(), s);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export function fmtDateTime(ts) {
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(ts) {
  const s = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(ts);
}

export function isOverdue(task) {
  return task.status !== 'done' && task.due_date && parseDate(task.due_date) < today();
}
