export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_LABELS_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function fmt(n: number, digits = 0): string {
  if (!isFinite(n)) return '0';
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  // Convert to Monday-based: Mon=0
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatWeekRange(startISO: string): string {
  const start = fromISODate(startISO);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  const fmtMonthDay = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (sameMonth) {
    return `${fmtMonthDay(start)}–${end.getDate()}, ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${fmtMonthDay(start)} – ${fmtMonthDay(end)}, ${end.getFullYear()}`;
  }
  return `${fmtMonthDay(start)}, ${start.getFullYear()} – ${fmtMonthDay(end)}, ${end.getFullYear()}`;
}

export function fileUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return path; // server is proxied at /uploads/*
}

// Batch counter computation per PRD
// times_placed in current week / serving_count = batches started (ceil)
// badge = (batches_started * serving_count) - times_placed
// when placed exactly equals batch boundary, show 0 (consumed) -> next placement rolls a new batch.
export function computeBatchBadge(timesPlaced: number, servingCount: number) {
  const sc = Math.max(1, servingCount || 1);
  if (timesPlaced <= 0) {
    return { remaining: 0, batchesStarted: 0 };
  }
  const batchesStarted = Math.ceil(timesPlaced / sc);
  const remaining = batchesStarted * sc - timesPlaced;
  return { remaining, batchesStarted };
}
