import { describe, expect, it } from 'vitest';
import { computeBatchBadge, formatWeekRange, startOfWeek, toISODate } from '@/lib/utils';

describe('computeBatchBadge', () => {
  it('shows full batch remaining when nothing placed', () => {
    expect(computeBatchBadge(0, 4)).toEqual({ remaining: 0, batchesStarted: 0 });
  });
  it('decrements within current batch', () => {
    expect(computeBatchBadge(1, 4)).toEqual({ remaining: 3, batchesStarted: 1 });
    expect(computeBatchBadge(3, 4)).toEqual({ remaining: 1, batchesStarted: 1 });
  });
  it('rolls over silently into next batch', () => {
    // 4 placed = full batch consumed -> 0 remaining
    expect(computeBatchBadge(4, 4)).toEqual({ remaining: 0, batchesStarted: 1 });
    // 5 placed -> 2 batches needed, 3 remaining in current
    expect(computeBatchBadge(5, 4)).toEqual({ remaining: 3, batchesStarted: 2 });
    // 9 placed -> 3 batches, 3 remaining
    expect(computeBatchBadge(9, 4)).toEqual({ remaining: 3, batchesStarted: 3 });
  });
});

describe('startOfWeek / toISODate', () => {
  it('snaps to Monday', () => {
    // Sat May 23 2026
    const d = new Date(2026, 4, 23);
    const monday = startOfWeek(d);
    expect(toISODate(monday)).toBe('2026-05-18');
  });
  it('keeps Monday unchanged', () => {
    const d = new Date(2026, 4, 18);
    const monday = startOfWeek(d);
    expect(toISODate(monday)).toBe('2026-05-18');
  });
});

describe('formatWeekRange', () => {
  it('formats same-month range compactly', () => {
    expect(formatWeekRange('2026-05-18')).toMatch(/May 18–24, 2026/);
  });
});
