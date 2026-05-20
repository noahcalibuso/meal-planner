import { cn, fmt } from '@/lib/utils';

interface Props {
  label: string;
  current: number;
  target: number;
  color: string; // tailwind bg class for bar
  unit?: string;
  compact?: boolean;
}

export function MacroBar({
  label,
  current,
  target,
  color,
  unit = 'g',
  compact = false,
}: Props) {
  const safeTarget = target > 0 ? target : 1;
  const pct = Math.min(100, (current / safeTarget) * 100);
  const over = target > 0 && current > target;
  const overPct = over ? Math.min(40, ((current - target) / safeTarget) * 100) : 0;
  return (
    <div className={cn('w-full', compact ? '' : 'space-y-1')}>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            'font-semibold',
            compact ? 'text-[10px] uppercase tracking-wider text-black/55' : 'text-xs uppercase tracking-wider text-black/55'
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'tabular-nums font-semibold',
            compact ? 'text-[11px]' : 'text-xs',
            over ? 'text-accent-rose' : 'text-canvas-ink/80'
          )}
        >
          {fmt(current, 0)}
          <span className="text-black/40 font-medium">/{fmt(target, 0)}{unit}</span>
        </span>
      </div>
      <div className={cn('relative w-full rounded-full bg-canvas-subtle overflow-hidden', compact ? 'h-1.5' : 'h-2')}>
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-300', color)}
          style={{ width: `${pct}%` }}
        />
        {over && (
          <div
            className="absolute inset-y-0 right-0 rounded-full bg-accent-rose/80 transition-all duration-300"
            style={{ width: `${overPct}%` }}
            data-testid="over-indicator"
          />
        )}
      </div>
    </div>
  );
}
