import type { Meal } from '@/lib/types';
import { cn, fileUrl } from '@/lib/utils';
import { IconBowl } from './Icons';

interface Props {
  meal: Meal;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-10 w-10 text-base',
  md: 'h-14 w-14 text-xl',
  lg: 'h-20 w-20 text-2xl',
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

function colorFor(name: string) {
  const palette = [
    'bg-brand-200 text-brand-800',
    'bg-amber-100 text-amber-800',
    'bg-rose-100 text-rose-800',
    'bg-violet-100 text-violet-800',
    'bg-sky-100 text-sky-800',
    'bg-emerald-100 text-emerald-800',
    'bg-orange-100 text-orange-800',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function MealThumb({ meal, size = 'md', className }: Props) {
  const url = fileUrl(meal.photo_path);
  if (url) {
    return (
      <img
        src={url}
        alt={meal.name}
        className={cn(
          'object-cover rounded-xl shrink-0',
          SIZES[size],
          className
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        'rounded-xl shrink-0 grid place-items-center font-bold',
        SIZES[size],
        colorFor(meal.name),
        className
      )}
      aria-label={meal.name}
    >
      {meal.name.match(/[a-z]/i) ? (
        initials(meal.name)
      ) : (
        <IconBowl />
      )}
    </div>
  );
}
