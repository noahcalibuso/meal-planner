import { cn, fmt } from '@/lib/utils';

interface Props {
  label: string;
  current: number;
  target: number;
  color: string; // CSS color value
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
  return (
    <div className="macro-mini" style={{ width: '100%' }}>
      <div className="row">
        <span className="lbl" style={{ color }}>
          {label}
        </span>
        <span className={cn('v', over && 'over')}>
          {fmt(current, 0)}
          <span style={{ color: 'var(--muted)' }}>/{fmt(target, 0)}{unit}</span>
        </span>
      </div>
      <div className="bar" style={{ height: compact ? 3 : 4 }}>
        <div
          style={{
            width: `${pct}%`,
            background: over ? 'var(--terracotta)' : color,
          }}
          data-testid={over ? 'over-indicator' : undefined}
        />
      </div>
    </div>
  );
}
