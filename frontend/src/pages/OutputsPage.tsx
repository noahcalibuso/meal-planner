import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import type {
  GroceryListResponse,
  Meal,
  PortioningSheetResponse,
  PrepSheetResponse,
} from '@/lib/types';
import {
  IconBowl,
  IconBox,
  IconCart,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconDrop,
  IconFire,
  IconLeaf,
  IconMilk,
  IconPrinter,
  IconShrimp,
  IconSnowflake,
  IconToday,
  IconWheat,
} from '@/components/Icons';
import {
  addDays,
  cn,
  fmt,
  formatWeekRange,
  fromISODate,
  startOfWeek,
  toISODate,
} from '@/lib/utils';
import { MealThumb } from '@/components/MealThumb';

type Tab = 'grocery' | 'prep' | 'portioning';

export function OutputsPage() {
  const { weekStartISO, setWeekStartISO, meals } = useStore();
  const [tab, setTab] = useState<Tab>('grocery');
  const [grocery, setGrocery] = useState<GroceryListResponse | null>(null);
  const [prep, setPrep] = useState<PrepSheetResponse | null>(null);
  const [portion, setPortion] = useState<PortioningSheetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [g, p, port] = await Promise.all([
          api.groceryList(weekStartISO),
          api.prepSheet(weekStartISO),
          api.portioningSheet(weekStartISO),
        ]);
        if (cancelled) return;
        setGrocery(g);
        setPrep(p);
        setPortion(port);
        setChecked(new Set());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [weekStartISO]);

  function toggleChecked(key: string) {
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function jumpWeek(delta: number) {
    setWeekStartISO(toISODate(addDays(fromISODate(weekStartISO), delta * 7)));
  }

  const mealById = (id: number) => meals.find((m) => m.id === id) ?? null;

  return (
    <div className="space-y-5 print-page">
      <header className="flex flex-wrap items-end justify-between gap-3 no-print">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] font-bold text-black/40">
            Outputs
          </p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">
            {formatWeekRange(weekStartISO)}
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn-ghost" onClick={() => jumpWeek(-1)}>
            <IconChevronLeft size={16} /> Prev
          </button>
          <button
            className="btn-secondary"
            onClick={() => setWeekStartISO(toISODate(startOfWeek(new Date())))}
          >
            <IconToday size={14} /> This week
          </button>
          <button className="btn-ghost" onClick={() => jumpWeek(1)}>
            Next <IconChevronRight size={16} />
          </button>
          <span className="w-px h-6 bg-black/10 mx-1" />
          <button className="btn-primary" onClick={() => window.print()}>
            <IconPrinter size={14} /> Print / PDF
          </button>
        </div>
      </header>

      <div className="flex items-center gap-1 no-print">
        <TabButton
          active={tab === 'grocery'}
          onClick={() => setTab('grocery')}
          icon={<IconCart size={14} />}
          label="Grocery list"
          count={grocery ? Object.values(grocery.groups).flat().length : 0}
        />
        <TabButton
          active={tab === 'prep'}
          onClick={() => setTab('prep')}
          icon={<IconFire size={14} />}
          label="Prep sheet"
          count={prep ? prep.groups.reduce((s, g) => s + g.items.length, 0) : 0}
        />
        <TabButton
          active={tab === 'portioning'}
          onClick={() => setTab('portioning')}
          icon={<IconBowl size={14} />}
          label="Portioning"
          count={portion?.items.length ?? 0}
        />
      </div>

      {loading && <div className="text-sm text-black/45">Loading…</div>}

      {!loading && tab === 'grocery' && grocery && (
        <GrocerySection
          data={grocery}
          checked={checked}
          onToggle={toggleChecked}
        />
      )}
      {!loading && tab === 'prep' && prep && <PrepSection data={prep} />}
      {!loading && tab === 'portioning' && portion && (
        <PortioningSection data={portion} mealById={mealById} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
        active
          ? 'bg-canvas-ink text-white shadow-card'
          : 'text-black/65 hover:text-canvas-ink hover:bg-black/[0.04]'
      )}
    >
      {icon}
      {label}
      <span
        className={cn(
          'tabular-nums text-[11px] rounded-full px-1.5 py-0.5 font-bold',
          active ? 'bg-white/15 text-white' : 'bg-black/[0.06] text-black/55'
        )}
      >
        {count}
      </span>
    </button>
  );
}

const CATEGORY_META: Record<
  string,
  { icon: React.ComponentType<{ size?: number }>; tone: string; bg: string }
> = {
  protein: { icon: IconShrimp, tone: 'text-accent-coral', bg: 'bg-rose-50' },
  produce: { icon: IconLeaf, tone: 'text-brand-700', bg: 'bg-brand-50' },
  grains: { icon: IconWheat, tone: 'text-accent-amber', bg: 'bg-amber-50' },
  dairy: { icon: IconMilk, tone: 'text-sky-700', bg: 'bg-sky-50' },
  pantry: { icon: IconBox, tone: 'text-canvas-ink', bg: 'bg-canvas-subtle' },
  frozen: { icon: IconSnowflake, tone: 'text-sky-700', bg: 'bg-sky-50' },
  condiments: { icon: IconDrop, tone: 'text-accent-plum', bg: 'bg-violet-50' },
  beverages: { icon: IconDrop, tone: 'text-sky-700', bg: 'bg-sky-50' },
};

function categoryMeta(cat: string) {
  return (
    CATEGORY_META[cat] ?? {
      icon: IconBox,
      tone: 'text-canvas-ink',
      bg: 'bg-canvas-subtle',
    }
  );
}

function GrocerySection({
  data,
  checked,
  onToggle,
}: {
  data: GroceryListResponse;
  checked: Set<string>;
  onToggle: (k: string) => void;
}) {
  const groups = Object.entries(data.groups);
  if (groups.length === 0) {
    return (
      <EmptyOutput
        title="Nothing to shop for"
        message="Add meals to your week plan to generate a grocery list."
      />
    );
  }
  const totalItems = groups.reduce((s, [, items]) => s + items.length, 0);
  const totalBatchUnits = groups.reduce(
    (s, [, items]) => s + items.reduce((a, i) => a + i.occurrences, 0),
    0
  );
  const pct = totalItems > 0 ? (checked.size / totalItems) * 100 : 0;
  return (
    <div className="space-y-4">
      <div className="card p-5 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-brand-100 text-brand-700 grid place-items-center">
            <IconCart size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-black/45">
              Grocery list
            </p>
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {totalItems} unique items
            </p>
            <p className="text-xs text-black/55 mt-0.5">
              Across {groups.length} categor{groups.length === 1 ? 'y' : 'ies'} · {totalBatchUnits} batch unit{totalBatchUnits === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="flex items-baseline justify-between text-[11px] font-semibold text-black/55">
            <span>Shopping progress</span>
            <span className="tabular-nums">
              {checked.size} / {totalItems}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-canvas-subtle overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="hidden print:block print:mb-4">
        <h2 className="text-2xl font-bold">Grocery list</h2>
        <p className="text-sm text-black/60">
          Week of {formatWeekRange(data.week_start_date)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map(([cat, items]) => {
          const meta = categoryMeta(cat);
          const Icon = meta.icon;
          return (
            <div
              key={cat}
              className="card overflow-hidden break-inside-avoid"
            >
              <div className="px-4 py-3 border-b border-black/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-lg grid place-items-center',
                      meta.bg,
                      meta.tone
                    )}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold tracking-tight capitalize leading-none">
                      {cat}
                    </h3>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-black/45 mt-0.5">
                      {items.length} item{items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </div>
              <ul className="divide-y divide-black/[0.04]">
                {items.map((item) => {
                  const key = `${cat}::${item.name}`;
                  const isChecked = checked.has(key);
                  return (
                    <li
                      key={key}
                      onClick={() => onToggle(key)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-canvas-subtle/40 transition-colors',
                        isChecked && 'opacity-50'
                      )}
                    >
                      <div
                        className={cn(
                          'h-5 w-5 rounded-md border-2 grid place-items-center transition-colors shrink-0',
                          isChecked
                            ? 'bg-brand-500 border-brand-500 text-white'
                            : 'border-black/15'
                        )}
                      >
                        {isChecked && <IconCheck size={12} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm font-semibold leading-tight',
                            isChecked && 'line-through'
                          )}
                        >
                          {item.name}
                        </p>
                        {item.quantity_description && (
                          <p className="text-[11px] text-black/50 mt-0.5 truncate">
                            {item.quantity_description}
                          </p>
                        )}
                      </div>
                      {item.occurrences > 1 && (
                        <span className="shrink-0 inline-flex items-center justify-center h-6 min-w-[28px] px-1.5 rounded-md bg-brand-100 text-brand-800 text-[11px] font-bold tabular-nums">
                          ×{item.occurrences}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const METHOD_META: Record<string, { color: string; bg: string }> = {
  Oven: { color: 'text-accent-amber', bg: 'bg-amber-50' },
  Stovetop: { color: 'text-accent-coral', bg: 'bg-rose-50' },
  'Slow Cooker': { color: 'text-accent-plum', bg: 'bg-violet-50' },
  'Instant Pot': { color: 'text-accent-plum', bg: 'bg-violet-50' },
  Grill: { color: 'text-accent-coral', bg: 'bg-rose-50' },
  'Air Fryer': { color: 'text-accent-amber', bg: 'bg-amber-50' },
  'No-Cook': { color: 'text-brand-700', bg: 'bg-brand-50' },
  Other: { color: 'text-canvas-ink', bg: 'bg-canvas-subtle' },
};

function PrepSection({ data }: { data: PrepSheetResponse }) {
  if (data.groups.length === 0) {
    return (
      <EmptyOutput
        title="No prep needed"
        message="Add meals to your week plan to see batch prep instructions."
      />
    );
  }
  return (
    <div className="space-y-4">
      <div className="hidden print:block print:mb-4">
        <h2 className="text-2xl font-bold">Batch prep sheet</h2>
        <p className="text-sm text-black/60">
          Week of {formatWeekRange(data.week_start_date)}
        </p>
      </div>
      {data.groups.map((g) => {
        const meta = METHOD_META[g.method] ?? METHOD_META.Other;
        const totalMin = g.items.reduce(
          (s, i) => s + (i.prep_time_minutes ?? 0) * i.batches,
          0
        );
        return (
          <div key={g.method} className="card overflow-hidden break-inside-avoid">
            <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-11 w-11 rounded-xl grid place-items-center',
                    meta.bg,
                    meta.color
                  )}
                >
                  <IconFire size={20} />
                </div>
                <div>
                  <h3 className="font-bold tracking-tight text-lg leading-tight">
                    {g.method}
                  </h3>
                  <p className="text-[11px] text-black/55 mt-0.5">
                    Cook these together to save time
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-black/45 font-bold uppercase tracking-wider">
                  {g.items.length} dish{g.items.length === 1 ? '' : 'es'}
                </p>
                {totalMin > 0 && (
                  <p className="text-sm text-canvas-ink tabular-nums font-bold mt-0.5">
                    ~{totalMin} min total
                  </p>
                )}
              </div>
            </div>
            <div className="divide-y divide-black/[0.05]">
              {g.items.map((it) => (
                <div key={it.meal_id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-base font-bold tracking-tight">
                        {it.meal_name}
                      </p>
                      <p className="text-[12px] text-black/55 mt-0.5">
                        {it.batches} batch{it.batches === 1 ? '' : 'es'} ·
                        yields {it.total_yield} servings
                        {it.prep_time_minutes
                          ? ` · ~${it.prep_time_minutes * it.batches} min`
                          : ''}
                      </p>
                    </div>
                    <span className="chip bg-canvas-ink text-white text-[11px] font-bold">
                      ×{it.batches}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {it.ingredients.map((ing, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-lg bg-canvas-subtle/60 px-3 py-1.5"
                      >
                        <span className="font-medium">{ing.name}</span>
                        <span className="text-black/55 tabular-nums text-xs">
                          {ing.quantity_total}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PortioningSection({
  data,
  mealById,
}: {
  data: PortioningSheetResponse;
  mealById: (id: number) => Meal | null;
}) {
  if (data.items.length === 0) {
    return (
      <EmptyOutput
        title="Nothing to portion"
        message="Add meals to your week plan to see portioning amounts."
      />
    );
  }
  return (
    <div className="space-y-4">
      <div className="hidden print:block print:mb-4">
        <h2 className="text-2xl font-bold">Portioning sheet</h2>
        <p className="text-sm text-black/60">
          Week of {formatWeekRange(data.week_start_date)}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.items.map((it) => {
          const meal = mealById(it.meal_id);
          const excess = it.total_yield - it.total_servings_needed;
          return (
            <div key={it.meal_id} className="card p-4 break-inside-avoid">
              <div className="flex items-start gap-3">
                {meal ? (
                  <MealThumb meal={meal} size="md" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-canvas-subtle grid place-items-center">
                    <IconBowl />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold tracking-tight leading-tight line-clamp-2">
                    {it.meal_name}
                  </p>
                  <p className="text-[11px] text-black/55 mt-0.5">
                    {it.batches} batch{it.batches === 1 ? '' : 'es'} ·{' '}
                    {it.servings_per_batch} per batch
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Yield" value={fmt(it.total_yield)} />
                <Stat label="Needed" value={fmt(it.total_servings_needed)} />
                <Stat label="Extra" value={fmt(excess)} highlight={excess > 0} />
              </div>
              <div className="mt-3 rounded-xl bg-canvas-ink text-white p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider font-bold text-white/55">
                  Divide each batch into
                </p>
                <p className="text-2xl font-bold tabular-nums mt-1">
                  {it.servings_per_batch}
                  <span className="text-sm font-medium text-white/55 ml-1">
                    containers
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl py-2',
        highlight ? 'bg-brand-100 text-brand-800' : 'bg-canvas-subtle'
      )}
    >
      <div className="text-[10px] uppercase tracking-wider font-bold text-black/55">
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function EmptyOutput({ title, message }: { title: string; message: string }) {
  return (
    <div className="card p-12 text-center">
      <h3 className="font-bold text-xl tracking-tight">{title}</h3>
      <p className="text-sm text-black/55 mt-2 max-w-md mx-auto">{message}</p>
    </div>
  );
}
