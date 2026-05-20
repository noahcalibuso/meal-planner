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
  IconPlus,
  IconSearch,
  IconToday,
} from '@/components/Icons';
import { MealThumb } from '@/components/MealThumb';
import { MacroBar } from '@/components/MacroBar';
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
    if (!settings) {
      return { cal: 2000, p: 150, c: 200, f: 70 };
    }
    const over = settings.per_day.find((d) => d.day_of_week === day);
    return {
      cal: over?.calories ?? settings.defaults.default_calories,
      p: over?.protein_g ?? settings.defaults.default_protein_g,
      c: over?.carbs_g ?? settings.defaults.default_carbs_g,
      f: over?.fat_g ?? settings.defaults.default_fat_g,
    };
  }

  function jumpWeek(delta: number) {
    const cur = fromISODate(weekStartISO);
    const next = addDays(cur, delta * 7);
    setWeekStartISO(toISODate(next));
  }

  function jumpToToday() {
    setWeekStartISO(toISODate(startOfWeek(new Date())));
  }

  function plannedForDay(day: number): (PlannedMeal & { _idx: number })[] {
    return planned
      .map((p, idx) => ({ ...p, _idx: idx }))
      .filter((p) => p.day_of_week === day);
  }

  function nextPlannedId() {
    return `pm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function addMealToDay(meal: Meal, day: number, atPosition?: number) {
    const dayItems = planned.filter((p) => p.day_of_week === day);
    const pos = atPosition ?? dayItems.length;
    const newItem: PlannedMeal = {
      meal_id: meal.id,
      day_of_week: day,
      position_in_day: pos,
    };
    const rest = planned.filter((p) => !(p.day_of_week === day));
    const updatedDay = [...dayItems];
    updatedDay.splice(pos, 0, newItem);
    const next = [...rest, ...updatedDay.map((p, i) => ({ ...p, position_in_day: i }))];
    setPlannedMeals(next);
  }

  function removePlannedAt(idx: number) {
    const next = planned.filter((_, i) => i !== idx);
    setPlannedMeals(next);
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
    setDragging({
      meal: data.meal,
      source: data.type,
      id: String(e.active.id),
    });
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
      if (data.type === 'day') {
        removePlannedAt(data.index);
      }
      return;
    }
    if (overId.startsWith('day-')) {
      const day = Number(overId.slice(4));
      if (data.type === 'sidebar') {
        addMealToDay(data.meal, day);
      } else {
        movePlannedToDay(data.index, day);
      }
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-black/45">
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

        <div className="grid grid-cols-[320px_1fr] gap-4 items-start">
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
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, day) => {
              const totals = dayTotals(day);
              const target = targetFor(day);
              return (
                <DayColumn
                  key={day}
                  day={day}
                  isToday={isTodayDate(weekStartISO, day)}
                  plannedItems={plannedForDay(day)}
                  totals={totals}
                  target={target}
                  mealLookup={mealById}
                  onRemove={(idx) => removePlannedAt(idx)}
                  dragging={!!dragging}
                />
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging?.meal ? <DragGhost meal={dragging.meal} /> : null}
      </DragOverlay>

      {loadingWeekPlan && (
        <div className="fixed bottom-6 left-6 text-xs text-black/40 no-print">
          Syncing…
        </div>
      )}
    </DndContext>
  );

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
        isDropTarget && 'ring-2 ring-accent-rose/50 ring-offset-2 ring-offset-canvas',
        isOver && 'ring-2 ring-accent-rose ring-offset-2 ring-offset-canvas'
      )}
    >
      <div className="px-4 pt-4 pb-3 border-b border-black/[0.06] space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold tracking-tight text-sm">Meal Library</h2>
          <span className="text-[11px] text-black/45 tabular-nums">{meals.length} of {allMeals.length}</span>
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
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveTag(null)}
              className={cn(
                'chip text-[10px] px-2 py-0.5',
                !activeTag ? 'bg-canvas-ink text-white' : 'hover:bg-black/5'
              )}
            >
              All
            </button>
            {tagOptions.map((t) => (
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
          <p className="text-[11px] text-accent-rose font-medium flex items-center gap-1">
            <IconClose size={11} /> Drop here to remove from plan
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto scroll-area p-3 space-y-2">
        {allMeals.length === 0 && (
          <div className="text-center text-sm text-black/45 px-3 py-6">
            <IconBowl />
            <p className="mt-2">Your library is empty.</p>
            <p className="text-xs text-black/35">Create meals from the Library tab to plan them here.</p>
          </div>
        )}
        {allMeals.length > 0 && meals.length === 0 && (
          <p className="text-center text-sm text-black/45 px-3 py-6">No meals match.</p>
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
        'group relative card border border-black/[0.06] p-2.5 hover:shadow-cardHover hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing select-none',
        isDragging && 'opacity-40'
      )}
    >
      <div className="flex items-start gap-2.5">
        <MealThumb meal={meal} size="sm" />
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold leading-tight truncate"
            title={meal.name}
          >
            {meal.name}
          </p>
          <p className="text-[11px] text-black/50 mt-0.5 tabular-nums">
            {fmt(meal.per_serving_calories, 0)} kcal · P{fmt(meal.per_serving_protein_g, 0)} / C
            {fmt(meal.per_serving_carbs_g, 0)} / F{fmt(meal.per_serving_fat_g, 0)}
          </p>
        </div>
        <BatchBadge placed={placed} servingCount={meal.serving_count} badge={badge} />
      </div>
    </div>
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
        className="chip text-[10px] tabular-nums shrink-0"
        title={`${servingCount} servings per batch`}
      >
        {servingCount}×
      </span>
    );
  }
  const filled = servingCount - badge.remaining;
  return (
    <div
      className="shrink-0 flex flex-col items-end gap-0.5"
      title={`${placed} placed · ${badge.remaining} servings left in current batch · ${badge.batchesStarted} ${
        badge.batchesStarted === 1 ? 'batch' : 'batches'
      } needed`}
      data-testid="batch-badge"
    >
      <span className="chip text-[10px] tabular-nums bg-brand-100 text-brand-800 font-bold">
        {badge.remaining}/{servingCount}
      </span>
      {badge.batchesStarted > 1 && (
        <span className="text-[9px] text-brand-700 font-semibold uppercase tracking-wider">
          ×{badge.batchesStarted} batches
        </span>
      )}
      <BatchPips total={servingCount} filled={filled} />
    </div>
  );
}

function BatchPips({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-1 w-1.5 rounded-sm',
            i < filled ? 'bg-brand-500' : 'bg-black/15'
          )}
        />
      ))}
    </div>
  );
}

function DragGhost({ meal }: { meal: Meal }) {
  return (
    <div className="card p-2.5 shadow-cardHover border border-black/10 rotate-[-2deg] w-[260px] pointer-events-none">
      <div className="flex items-center gap-2.5">
        <MealThumb meal={meal} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{meal.name}</p>
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
  isToday,
  plannedItems,
  totals,
  target,
  mealLookup,
  onRemove,
  dragging,
}: {
  day: number;
  isToday: boolean;
  plannedItems: (PlannedMeal & { _idx: number })[];
  totals: { cal: number; p: number; c: number; f: number };
  target: { cal: number; p: number; c: number; f: number };
  mealLookup: (id: number) => Meal | null;
  onRemove: (idx: number) => void;
  dragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` });
  const calOver = totals.cal > target.cal && target.cal > 0;
  const anyOver =
    calOver ||
    totals.p > target.p ||
    totals.c > target.c ||
    totals.f > target.f;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'card flex flex-col min-h-[440px] transition-all',
        isOver && 'ring-2 ring-brand-400 -translate-y-0.5 shadow-cardHover',
        dragging && !isOver && 'ring-1 ring-dashed ring-black/15'
      )}
    >
      <div className="px-3 pt-3 pb-2 border-b border-black/[0.05]">
        <div className="flex items-baseline justify-between">
          <p
            className={cn(
              'text-xs uppercase tracking-wider font-bold',
              isToday ? 'text-brand-700' : 'text-black/60'
            )}
          >
            {DAY_LABELS[day]}
            {isToday && (
              <span className="ml-1 text-[9px] text-brand-700 bg-brand-100 px-1 py-0.5 rounded">
                today
              </span>
            )}
          </p>
          <span
            className={cn(
              'text-[11px] tabular-nums font-bold',
              anyOver ? 'text-accent-rose' : 'text-canvas-ink/65'
            )}
          >
            {fmt(totals.cal, 0)}
            <span className="text-black/40 font-medium">/{fmt(target.cal, 0)}</span>
          </span>
        </div>
        <div className="mt-2 space-y-1">
          <MacroBar
            label="Cal"
            current={totals.cal}
            target={target.cal}
            color="bg-canvas-ink"
            unit=""
            compact
          />
          <MacroBar
            label="Protein"
            current={totals.p}
            target={target.p}
            color="bg-accent-coral"
            compact
          />
          <MacroBar
            label="Carbs"
            current={totals.c}
            target={target.c}
            color="bg-accent-amber"
            compact
          />
          <MacroBar
            label="Fat"
            current={totals.f}
            target={target.f}
            color="bg-accent-plum"
            compact
          />
        </div>
      </div>
      <div className="flex-1 p-2 space-y-1.5 scroll-area overflow-y-auto">
        {plannedItems.length === 0 && (
          <div
            className={cn(
              'rounded-xl border border-dashed border-black/15 text-[11px] text-black/35 text-center py-6 px-2',
              dragging && 'border-brand-400 text-brand-700 bg-brand-50'
            )}
          >
            {dragging ? `Drop in ${DAY_LABELS_LONG[day]}` : 'Drag meals here'}
          </div>
        )}
        {plannedItems.map((pl) => {
          const meal = mealLookup(pl.meal_id);
          if (!meal) return null;
          return (
            <PlannedCard
              key={`${pl._idx}-${pl.meal_id}`}
              index={pl._idx}
              meal={meal}
              onRemove={() => onRemove(pl._idx)}
            />
          );
        })}
      </div>
    </div>
  );
}

function PlannedCard({
  index,
  meal,
  onRemove,
}: {
  index: number;
  meal: Meal;
  onRemove: () => void;
}) {
  const id = `day-card-${index}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { type: 'day', meal, index },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'group relative rounded-xl bg-canvas-subtle border border-black/[0.04] p-2 hover:bg-white hover:shadow-card transition-all cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30'
      )}
    >
      <div className="flex items-center gap-2">
        <MealThumb meal={meal} size="sm" className="!h-9 !w-9" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold leading-tight truncate" title={meal.name}>
            {meal.name}
          </p>
          <p className="text-[10px] text-black/50 tabular-nums mt-0.5">
            {fmt(meal.per_serving_calories, 0)} kcal · P{fmt(meal.per_serving_protein_g, 0)} /
            C{fmt(meal.per_serving_carbs_g, 0)} / F{fmt(meal.per_serving_fat_g, 0)}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded-md p-1 text-black/35 hover:text-accent-rose hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Remove from day"
        >
          <IconClose size={12} />
        </button>
      </div>
      {meal.prep_time_minutes != null && (
        <div className="absolute bottom-1 right-2 text-[9px] text-black/35 flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <IconClock size={10} />
          {meal.prep_time_minutes}m
        </div>
      )}
    </div>
  );
}
