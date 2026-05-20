import type { Meal } from '@/lib/types';
import { cn, fileUrl } from '@/lib/utils';
import { IconBowl } from './Icons';

interface Props {
  meal: Meal;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'h-10 w-10 text-sm rounded-xl',
  md: 'h-14 w-14 text-base rounded-xl',
  lg: 'h-20 w-20 text-xl rounded-2xl',
  xl: 'h-full w-full text-3xl rounded-none',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Hash-based deterministic gradient and accent so meals look distinct + cohesive
const PALETTES: { from: string; to: string; ink: string; accent: string }[] = [
  { from: '#e7f1d6', to: '#c9dfa5', ink: '#3f5e29', accent: '#85ad57' }, // brand
  { from: '#fde6db', to: '#fac3a8', ink: '#9a3a1f', accent: '#ef6f5b' }, // coral
  { from: '#fdecc7', to: '#f7d27c', ink: '#7a4d10', accent: '#f5a623' }, // amber
  { from: '#ede4fc', to: '#d3c0f5', ink: '#4c2c8e', accent: '#7c3aed' }, // plum
  { from: '#dceefd', to: '#a8d3f3', ink: '#11476c', accent: '#0ea5e9' }, // sky
  { from: '#dff3ea', to: '#a8dec1', ink: '#1c5a3b', accent: '#16a370' }, // emerald
  { from: '#fde4ec', to: '#f6b7c8', ink: '#8a1f3b', accent: '#e11d48' }, // rose
  { from: '#fdebd6', to: '#f7c891', ink: '#7c3d0d', accent: '#ea7820' }, // orange
];

function paletteFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

export function MealThumb({ meal, size = 'md', className }: Props) {
  const url = fileUrl(meal.photo_path);
  if (url) {
    return (
      <img
        src={url}
        alt={meal.name}
        className={cn('object-cover shrink-0', SIZES[size], className)}
      />
    );
  }
  const p = paletteFor(meal.name);
  const init = meal.name.match(/[a-z]/i) ? initials(meal.name) : null;
  return (
    <div
      className={cn(
        'relative shrink-0 grid place-items-center font-bold overflow-hidden',
        SIZES[size],
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)`,
        color: p.ink,
      }}
      aria-label={meal.name}
    >
      {/* Soft decorative arc */}
      <span
        className="absolute -right-3 -bottom-3 rounded-full opacity-25 pointer-events-none"
        style={{
          width: '70%',
          height: '70%',
          background: `radial-gradient(circle at center, ${p.accent} 0%, transparent 70%)`,
        }}
      />
      {init ? (
        <span className="relative z-10 font-extrabold tracking-tight">
          {init}
        </span>
      ) : (
        <IconBowl />
      )}
    </div>
  );
}
