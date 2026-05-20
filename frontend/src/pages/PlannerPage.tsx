import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useStore } from '@/lib/store';
import type { Meal, PlannedMeal } from '@/lib/types';
import {
  IconBowl,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconClose,
  IconMinus,
  IconPlus,
  IconSearch,
  IconToday,
} from '@/components/Icons';
import { MealThumb } from '@/components/MealThumb';
import {
  DAY_LABELS,
  DAY_LABELS_LONG,
  addDays,
  cn,
  computeBatchBadge,
  fmt,
  formatWeekRange,
  fromISODate,
  startOfWeek,
  toISODate,
} from '@/lib/utils';

const SIDEBAR_ID = 'sidebar-drop';

export function PlannerPage() {
  const { meals, weekPlan, weekStartISO, setWeekStartISO, setPlannedMeals, settings, loadingWeekPlan } =
    useStore();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ meal: Meal; source: 'sidebar' | 'day'; id?: string } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const planned = weekPlan?.planned_meals ?? [];

  const placedCounts = useMemo(() => {
    const c = new Map<number, number>();
    planned.forEach((p) => c.set(p.meal_id, (c.get(p.meal_id) ?? 0) + 1));
    return c;
  }, [planned]);

  const filteredMeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meals.filter((m) => {
      if (activeTag && !m.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [meals, query, activeTag]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    meals.forEach((m) => m.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [meals]);

  function mealById(id: number) {
    return meals.find((m) => m.id === id) ?? null;
  }

  function dayTotals(day: number) {
    const dayPlanned = planned.filter((p) => p.day_of_week === day);
    let cal = 0,
      p = 0,
      c = 0,
      f = 0;
    dayPlanned.forEach((pl) => {
      const meal = mealById(pl.meal_id);
      if (!meal) return;
      cal += meal.per_serving_calories;
      p += meal.per_serving_protein_g;
      c += meal.per_serving_carbs_g;
      f += meal.per_serving_fat_g;
    });
    return { cal, p, c, f };
  }

  function targetFor(day: number) {
    if (!settings) return { cal: 2000, p: 150, c: 200, f: 70 };
    const over = settings.per_day.find((d) => d.day_of_week === day);
    return {
      cal: over?.calories ?? settings.defaults.default_calories,
      p: over?.protein_g ?? settings.defaults.default_protein_g,
      c: over?.carbs_g ?? settings.defaults.default_carbs_g,
      f: over?.fat_g ?? settings.defaults.default_fat_g,
    };
  }

  // Week totals for header strip
  const weekTotals = useMemo(() => {
    let cal = 0,
      p = 0,
      c = 0,
      f = 0,
      tcal = 0,
      tp = 0,
      tc = 0,
      tf = 0;
    for (let d = 0; d < 7; d++) {
      const t = dayTotals(d);
      const tgt = targetFor(d);
      cal += t.cal;
      p += t.p;
      c += t.c;
      f += t.f;
      tcal += tgt.cal;
      tp += tgt.p;
      tc += tgt.c;
      tf += tgt.f;
    }
    return { cal, p, c, f, tcal, tp, tc, tf };
  }, [planned, settings, meals]);

  function jumpWeek(delta: number) {
    setWeekStartISO(toISODate(addDays(fromISODate(weekStartISO), delta * 7)));
  }
  function jumpToToday() {
    setWeekStartISO(toISODate(startOfWeek(new Date())));
  }

  function plannedForDay(day: number): (PlannedMeal & { _idx: number })[] {
    return planned
      .map((p, idx) => ({ ...p, _idx: idx }))
      .filter((p) => p.day_of_week === day);
  }

  function addMealToDay(meal: Meal, day: number) {
    const dayItems = planned.filter((p) => p.day_of_week === day);
    const newItem: PlannedMeal = {
      meal_id: meal.id,
      day_of_week: day,
      position_in_day: dayItems.length,
    };
    const rest = planned.filter((p) => p.day_of_week !== day);
    const updatedDay = [...dayItems, newItem].map((p, i) => ({ ...p, position_in_day: i }));
    setPlannedMeals([...rest, ...updatedDay]);
  }

  function removePlannedAt(idx: number) {
    setPlannedMeals(planned.filter((_, i) => i !== idx));
  }

  function movePlannedToDay(srcIdx: number, day: number) {
    const item = planned[srcIdx];
    if (!item) return;
    const withoutSrc = planned.filter((_, i) => i !== srcIdx);
    const dayItems = withoutSrc.filter((p) => p.day_of_week === day);
    const restItems = withoutSrc.filter((p) => p.day_of_week !== day);
    const moved: PlannedMeal = { ...item, day_of_week: day, position_in_day: dayItems.length };
    const updatedDay = [...dayItems, moved].map((p, i) => ({ ...p, position_in_day: i }));
    setPlannedMeals([...restItems, ...updatedDay]);
  }

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as
      | { type: 'sidebar'; meal: Meal }
      | { type: 'day'; meal: Meal; index: number }
      | undefined;
    if (!data) return;
    setDragging({ meal: data.meal, source: data.type, id: String(e.active.id) });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setDragging(null);
    if (!over) return;
    const overId = String(over.id);
    const data = active.data.current as
      | { type: 'sidebar'; meal: Meal }
      | { type: 'day'; meal: Meal; index: number };

    if (overId === SIDEBAR_ID) {
      if (data.type === 'day') removePlannedAt(data.index);
      return;
    }
    if (overId.startsWith('day-')) {
      const day = Number(overId.slice(4));
      if (data.type === 'sidebar') addMealToDay(data.meal, day);
      else movePlannedToDay(data.index, day);
    }
  }

  function isTodayDate(startISO: string, day: number) {
    const start = fromISODate(startISO);
    const d = addDays(start, day);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }

  function dateFor(day: number) {
    return addDays(fromISODate(weekStartISO), day);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-black/40">
              Week plan
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              {formatWeekRange(weekStartISO)}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="btn-ghost" onClick={() => jumpWeek(-1)} aria-label="Previous week">
              <IconChevronLeft size={16} /> Prev
            </button>
            <button className="btn-secondary" onClick={jumpToToday}>
              <IconToday size={14} /> This week
            </button>
            <button className="btn-ghost" onClick={() => jumpWeek(1)} aria-label="Next week">
              Next <IconChevronRight size={16} />
            </button>
          </div>
        </header>

        <WeekSummary t={weekTotals} />

        <div className="grid grid-cols-[280px_1fr] gap-3 items-start">
          <Sidebar
            meals={filteredMeals}
            allMeals={meals}
            placedCounts={placedCounts}
            query={query}
            setQuery={setQuery}
            tagOptions={tagOptions}
            activeTag={activeTag}
            setActiveTag={setActiveTag}
            isDropTarget={dragging?.source === 'day'}
          />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, day) => (
              <DayColumn
                key={day}
                day={day}
                date={dateFor(day)}
                isToday={isTodayDate(weekStartISO, day)}
                plannedItems={plannedForDay(day)}
                totals={dayTotals(day)}
                target={targetFor(day)}
                mealLookup={mealById}
                onRemove={(idx) => removePlannedAt(idx)}
                onAddCopy={(meal) => addMealToDay(meal, day)}
                dragging={!!dragging}
              />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging?.meal ? <DragGhost meal={dragging.meal} /> : null}
      </DragOverlay>

      {loadingWeekPlan && (
        <div className="fixed bottom-6 left-6 text-xs text-black/40 no-print">Syncing…</div>
      )}
    </DndContext>
  );
}

function WeekSummary({ t }: { t: { cal: number; p: number; c: number; f: number; tcal: number; tp: number; tc: number; tf: number } }) {
  const dayCount = 7;
  const items: { label: string; cur: number; tgt: number; color: string; dot: string }[] = [
    { label: 'Calories', cur: t.cal, tgt: t.tcal, color: 'bg-canvas-ink', dot: 'bg-canvas-ink' },
    { label: 'Protein', cur: t.p, tgt: t.tp, color: 'bg-accent-coral', dot: 'bg-accent-coral' },
    { label: 'Carbs', cur: t.c, tgt: t.tc, color: 'bg-accent-amber', dot: 'bg-accent-amber' },
    { label: 'Fat', cur: t.f, tgt: t.tf, color: 'bg-accent-plum', dot: 'bg-accent-plum' },
  ];
  return (
    <div className="card p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-black/45">Week so far</p>
        <p className="text-2xl font-bold tracking-tight mt-1 tabular-nums">
          {fmt(t.cal, 0)}
          <span className="text-sm font-medium text-black/40 ml-1">kcal planned</span>
        </p>
        <p className="text-[11px] text-black/50 mt-0.5">
          Avg {fmt(t.cal / dayCount, 0)} kcal / day · target {fmt(t.tcal / dayCount, 0)}
        </p>
      </div>
      {items.map((m) => {
        const pct = m.tgt > 0 ? Math.min(100, (m.cur / m.tgt) * 100) : 0;
        return (
          <div key={m.label}>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-bold text-black/55">
              <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
              {m.label}
            </div>
            <p className="text-lg font-bold tabular-nums mt-1">
              {fmt(m.cur, 0)}
              <span className="text-xs text-black/40 font-medium">/{fmt(m.tgt, 0)}{m.label === 'Calories' ? '' : 'g'}</span>
            </p>
            <div className="mt-1.5 h-1 w-full rounded-full bg-canvas-subtle overflow-hidden">
              <div className={cn('h-full rounded-full', m.color)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Sidebar({
  meals,
  allMeals,
  placedCounts,
  query,
  setQuery,
  tagOptions,
  activeTag,
  setActiveTag,
  isDropTarget,
}: {
  meals: Meal[];
  allMeals: Meal[];
  placedCounts: Map<number, number>;
  query: string;
  setQuery: (s: string) => void;
  tagOptions: string[];
  activeTag: string | null;
  setActiveTag: (t: string | null) => void;
  isDropTarget: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: SIDEBAR_ID });

  return (
    <aside
      ref={setNodeRef}
      className={cn(
        'card sticky top-[80px] max-h-[calc(100vh-104px)] flex flex-col overflow-hidden transition-shadow',
        isDropTarget && 'ring-2 ring-accent-rose/40 ring-offset-2 ring-offset-canvas',
        isOver && 'ring-2 ring-accent-rose ring-offset-2 ring-offset-canvas'
      )}
    >
      <div className="px-4 pt-4 pb-3 border-b border-black/[0.06] space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold tracking-tight text-sm">Library</h2>
          <span className="text-[11px] text-black/45 tabular-nums">
            {meals.length} of {allMeals.length}
          </span>
        </div>
        <div className="relative">
          <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            className="input pl-8 !text-sm"
            placeholder="Search meals…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {tagOptions.length > 0 && (
          <div className="flex flex-wrap gap-1 -mx-0.5">
            <button
              onClick={() => setActiveTag(null)}
              className={cn(
                'chip text-[10px] px-2 py-0.5',
                !activeTag ? 'bg-canvas-ink text-white' : 'hover:bg-black/5'
              )}
            >
              All
            </button>
            {tagOptions.slice(0, 8).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(activeTag === t ? null : t)}
                className={cn(
                  'chip text-[10px] px-2 py-0.5',
                  activeTag === t ? 'bg-canvas-ink text-white' : 'hover:bg-black/5'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {isDropTarget && (
          <p className="text-[11px] text-accent-rose font-semibold flex items-center gap-1">
            <IconClose size={11} /> Drop here to remove from plan
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto scroll-area p-2 space-y-1.5">
        {allMeals.length === 0 && (
          <div className="text-center text-sm text-black/45 px-3 py-10">
            <IconBowl />
            <p className="mt-2">Your library is empty.</p>
            <p className="text-xs text-black/35">
              Create meals from the Library tab to plan them here.
            </p>
          </div>
        )}
        {allMeals.length > 0 && meals.length === 0 && (
          <p className="text-center text-sm text-black/45 px-3 py-10">No meals match.</p>
        )}
        {meals.map((m) => {
          const placed = placedCounts.get(m.id) ?? 0;
          const badge = computeBatchBadge(placed, m.serving_count);
          return <SidebarCard key={m.id} meal={m} placed={placed} badge={badge} />;
        })}
      </div>
    </aside>
  );
}

function SidebarCard({
  meal,
  placed,
  badge,
}: {
  meal: Meal;
  placed: number;
  badge: { remaining: number; batchesStarted: number };
}) {
  const id = `sidebar-${meal.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { type: 'sidebar', meal },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'group relative rounded-xl border border-black/[0.05] bg-white p-2 hover:shadow-card hover:-translate-y-0.5 hover:border-black/[0.1] transition-all cursor-grab active:cursor-grabbing select-none',
        isDragging && 'opacity-40'
      )}
    >
      <div className="flex items-start gap-2.5">
        <MealThumb meal={meal} size="sm" className="!h-11 !w-11" />
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-bold leading-tight line-clamp-2"
            title={meal.name}
          >
            {meal.name}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-black/55 tabular-nums">
            <span className="font-semibold text-canvas-ink">
              {fmt(meal.per_serving_calories, 0)}
            </span>
            <span className="text-black/30">·</span>
            <MacroMicro letter="P" value={meal.per_serving_protein_g} color="text-accent-coral" />
            <MacroMicro letter="C" value={meal.per_serving_carbs_g} color="text-accent-amber" />
            <MacroMicro letter="F" value={meal.per_serving_fat_g} color="text-accent-plum" />
          </div>
        </div>
        <BatchBadge placed={placed} servingCount={meal.serving_count} badge={badge} />
      </div>
    </div>
  );
}

function MacroMicro({ letter, value, color }: { letter: string; value: number; color: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className={cn('font-bold', color)}>{letter}</span>
      <span className="text-black/65 font-semibold">{fmt(value, 0)}</span>
    </span>
  );
}

function BatchBadge({
  placed,
  servingCount,
  badge,
}: {
  placed: number;
  servingCount: number;
  badge: { remaining: number; batchesStarted: number };
}) {
  if (placed === 0) {
    return (
      <span
        className="shrink-0 inline-flex items-center justify-center h-6 min-w-[28px] px-1.5 rounded-md bg-canvas-subtle text-[10px] font-bold text-black/55 tabular-nums"
        title={`${servingCount} servings per batch`}
      >
        {servingCount}×
      </span>
    );
  }
  return (
    <div
      className="shrink-0 flex flex-col items-end gap-0.5"
      title={`${placed} placed · ${badge.remaining} servings left in current batch · ${badge.batchesStarted} ${
        badge.batchesStarted === 1 ? 'batch' : 'batches'
      } needed`}
      data-testid="batch-badge"
    >
      <span className="inline-flex items-center justify-center h-6 min-w-[36px] px-1.5 rounded-md bg-brand-100 text-brand-800 text-[10px] font-bold tabular-nums">
        {badge.remaining}/{servingCount}
      </span>
      {badge.batchesStarted > 1 && (
        <span className="text-[9px] text-brand-700 font-bold uppercase tracking-wider">
          ×{badge.batchesStarted}
        </span>
      )}
    </div>
  );
}

function DragGhost({ meal }: { meal: Meal }) {
  return (
    <div className="card p-3 shadow-cardHover border border-black/10 rotate-[-2deg] w-[260px] pointer-events-none">
      <div className="flex items-center gap-3">
        <MealThumb meal={meal} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{meal.name}</p>
          <p className="text-[11px] text-black/50 tabular-nums">
            {fmt(meal.per_serving_calories, 0)} kcal per serving
          </p>
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  date,
  isToday,
  plannedItems,
  totals,
  target,
  mealLookup,
  onRemove,
  onAddCopy,
  dragging,
}: {
  day: number;
  date: Date;
  isToday: boolean;
  plannedItems: (PlannedMeal & { _idx: number })[];
  totals: { cal: number; p: number; c: number; f: number };
  target: { cal: number; p: number; c: number; f: number };
  mealLookup: (id: number) => Meal | null;
  onRemove: (idx: number) => void;
  onAddCopy: (meal: Meal) => void;
  dragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` });
  const calPct = target.cal > 0 ? (totals.cal / target.cal) * 100 : 0;
  const calOver = totals.cal > target.cal && target.cal > 0;
  const dayNum = date.getDate();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-2xl bg-white border flex flex-col min-h-[460px] transition-all',
        isToday ? 'border-brand-300/80 shadow-card' : 'border-black/[0.06] shadow-card',
        isOver && 'ring-2 ring-brand-400 -translate-y-0.5 shadow-cardHover',
        dragging && !isOver && 'border-dashed border-black/15'
      )}
    >
      <div
        className={cn(
          'px-3 pt-3 pb-2.5 rounded-t-2xl',
          isToday && 'bg-brand-50/60'
        )}
      >
        <div className="flex items-baseline justify-between gap-1">
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-[0.16em]',
                isToday ? 'text-brand-700' : 'text-black/55'
              )}
            >
              {DAY_LABELS[day]}
            </span>
            <span
              className={cn(
                'text-base font-bold tabular-nums leading-none',
                isToday ? 'text-brand-700' : 'text-canvas-ink'
              )}
            >
              {dayNum}
            </span>
          </div>
          {isToday && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-700">
              Today
            </span>
          )}
        </div>

        <div className="mt-2.5">
          <div className="flex items-baseline justify-between">
            <span
              className={cn(
                'text-base font-bold tabular-nums leading-none',
                calOver ? 'text-accent-rose' : 'text-canvas-ink'
              )}
            >
              {fmt(totals.cal, 0)}
            </span>
            <span className="text-[10px] text-black/40 tabular-nums font-medium">
              /{fmt(target.cal, 0)}
            </span>
          </div>
          <div className="relative mt-1.5 h-[5px] rounded-full bg-canvas-subtle overflow-hidden">
            <div
              className={cn(
                'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
                calOver ? 'bg-accent-rose' : 'bg-canvas-ink'
              )}
              style={{ width: `${Math.min(100, calPct)}%` }}
            />
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1">
          <MacroChip
            letter="P"
            cur={totals.p}
            tgt={target.p}
            color="bg-accent-coral"
          />
          <MacroChip
            letter="C"
            cur={totals.c}
            tgt={target.c}
            color="bg-accent-amber"
          />
          <MacroChip
            letter="F"
            cur={totals.f}
            tgt={target.f}
            color="bg-accent-plum"
          />
        </div>
      </div>

      <div className="border-t border-black/[0.05]" />

      <div className="flex-1 p-2 space-y-1.5 scroll-area overflow-y-auto">
        {plannedItems.length === 0 && (
          <div
            className={cn(
              'rounded-xl border border-dashed text-[11px] text-center py-8 px-2 mt-1 transition-colors',
              dragging
                ? 'border-brand-400 text-brand-700 bg-brand-50/70'
                : 'border-black/10 text-black/30'
            )}
          >
            {dragging ? (
              <>
                <p className="font-semibold">Drop in</p>
                <p>{DAY_LABELS_LONG[day]}</p>
              </>
            ) : (
              'Drag meals here'
            )}
          </div>
        )}
        {groupConsecutive(plannedItems).map((group) => {
          const meal = mealLookup(group.meal_id);
          if (!meal) return null;
          return (
            <PlannedCard
              key={`${group.indices[0]}-${group.meal_id}-${group.indices.length}`}
              indices={group.indices}
              meal={meal}
              onRemoveLast={() => onRemove(group.indices[group.indices.length - 1])}
              onAddCopy={() => onAddCopy(meal)}
            />
          );
        })}
      </div>
    </div>
  );
}

function MacroChip({
  letter,
  cur,
  tgt,
  color,
}: {
  letter: string;
  cur: number;
  tgt: number;
  color: string;
}) {
  const pct = tgt > 0 ? Math.min(100, (cur / tgt) * 100) : 0;
  const over = tgt > 0 && cur > tgt;
  return (
    <div
      className="flex-1 group relative"
      title={`${letter}: ${fmt(cur, 0)} / ${fmt(tgt, 0)}g`}
    >
      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
        <span className="text-black/45">{letter}</span>
        <span className={cn('tabular-nums', over ? 'text-accent-rose' : 'text-canvas-ink/70')}>
          {fmt(cur, 0)}
        </span>
      </div>
      <div className="mt-0.5 h-[3px] rounded-full bg-canvas-subtle overflow-hidden">
        <div
          className={cn('h-full rounded-full', over ? 'bg-accent-rose' : color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function groupConsecutive(
  items: (PlannedMeal & { _idx: number })[]
): { meal_id: number; indices: number[] }[] {
  const groups: { meal_id: number; indices: number[] }[] = [];
  for (const it of items) {
    const last = groups[groups.length - 1];
    if (last && last.meal_id === it.meal_id) {
      last.indices.push(it._idx);
    } else {
      groups.push({ meal_id: it.meal_id, indices: [it._idx] });
    }
  }
  return groups;
}

function PlannedCard({
  indices,
  meal,
  onRemoveLast,
  onAddCopy,
}: {
  indices: number[];
  meal: Meal;
  onRemoveLast: () => void;
  onAddCopy: () => void;
}) {
  // Drag operates on the first index in the group (one serving at a time).
  const firstIndex = indices[0];
  const count = indices.length;
  const id = `day-card-${firstIndex}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { type: 'day', meal, index: firstIndex },
  });
  const totalCal = meal.per_serving_calories * count;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'group relative rounded-xl bg-canvas-subtle border border-transparent p-2 hover:bg-white hover:border-black/10 hover:shadow-card transition-all cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30'
      )}
    >
      {count > 1 && (
        <span
          className="absolute -top-1 -right-1 z-10 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-canvas-ink text-white text-[10px] font-bold tabular-nums shadow-card pointer-events-none"
          title={`${count} servings planned`}
        >
          ×{count}
        </span>
      )}
      <div className="flex items-start gap-2">
        <MealThumb meal={meal} size="sm" className="!h-8 !w-8 !rounded-lg" />
        <div className="flex-1 min-w-0">
          <p
            className="text-[11.5px] font-bold leading-[1.2] line-clamp-2"
            title={meal.name}
          >
            {meal.name}
          </p>
          <div className="mt-0.5 flex items-baseline gap-1 text-[10px] tabular-nums text-black/55">
            <span className="font-bold text-canvas-ink">{fmt(totalCal, 0)}</span>
            <span className="text-[9px] uppercase tracking-wider text-black/40 font-semibold">
              kcal
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[9px] font-bold tabular-nums">
            <span className="text-accent-coral">P{fmt(meal.per_serving_protein_g * count, 0)}</span>
            <span className="text-accent-amber">C{fmt(meal.per_serving_carbs_g * count, 0)}</span>
            <span className="text-accent-plum">F{fmt(meal.per_serving_fat_g * count, 0)}</span>
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {meal.prep_time_minutes != null ? (
          <div className="flex items-center gap-0.5 text-[9px] text-black/40 font-medium">
            <IconClock size={9} />
            {meal.prep_time_minutes}m
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveLast();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-md h-5 w-5 grid place-items-center text-black/45 hover:text-accent-rose hover:bg-rose-50"
            aria-label={count > 1 ? 'Remove one serving' : 'Remove from day'}
            title={count > 1 ? 'Remove one' : 'Remove'}
          >
            <IconMinus size={10} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddCopy();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-md h-5 w-5 grid place-items-center text-black/45 hover:text-brand-700 hover:bg-brand-50"
            aria-label="Add another serving"
            title="Add another"
          >
            <IconPlus size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}
