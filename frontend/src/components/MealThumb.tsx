import type { Meal } from '@/lib/types';
import { cn, fileUrl } from '@/lib/utils';
import { IconBowl } from './Icons';

interface Props {
  meal: Meal;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
}

const SIZES = {
  sm: 'h-10 w-10 text-sm rounded-[10px]',
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

// Editorial palette — paper / terracotta / sage / mustard / plum
const PALETTES: { from: string; to: string; ink: string; accent: string }[] = [
  { from: '#fbeadc', to: '#f3c4a3', ink: '#a64a30', accent: '#c25a3c' }, // terracotta
  { from: '#e8eed1', to: '#c5d199', ink: '#586438', accent: '#6f7d4a' }, // sage
  { from: '#fae9c4', to: '#f0cd83', ink: '#a87013', accent: '#c98a1f' }, // mustard
  { from: '#ecdce6', to: '#cfa9c0', ink: '#5e3349', accent: '#7c4a64' }, // plum
  { from: '#f5efe2', to: '#e3d9bf', ink: '#3b3022', accent: '#6b5d47' }, // paper
  { from: '#ede4d1', to: '#cdb98a', ink: '#3b3022', accent: '#8a6c34' }, // tan
];

function paletteFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

export function MealThumb({ meal, size = 'md', className, style }: Props) {
  const url = fileUrl(meal.photo_path);
  if (url) {
    return (
      <img
        src={url}
        alt={meal.name}
        className={cn('object-cover shrink-0', SIZES[size], className)}
        style={style}
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
        fontFamily: 'Newsreader, Georgia, serif',
        ...style,
      }}
      aria-label={meal.name}
    >
      <span
        className="absolute -right-3 -bottom-3 rounded-full opacity-30 pointer-events-none"
        style={{
          width: '70%',
          height: '70%',
          background: `radial-gradient(circle at center, ${p.accent} 0%, transparent 70%)`,
        }}
      />
      {init ? (
        <span className="relative z-10 italic">{init}</span>
      ) : (
        <IconBowl />
      )}
    </div>
  );
}
