import { useEffect, useMemo, useState } from 'react';
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
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconCopy,
  IconPlus,
  IconSearch,
  IconToday,
  IconTrash,
} from '@/components/Icons';
import { MealThumb } from '@/components/MealThumb';
import { MealEditor } from '@/components/MealEditor';
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

const MACRO_COLORS = {
  cal: 'var(--ink)',
  protein: 'var(--terracotta)',
  carbs: 'var(--mustard)',
  fat: 'var(--plum)',
};

export function PlannerPage() {
  const {
    meals,
    weekPlan,
    weekStartISO,
    setWeekStartISO,
    setPlannedMeals,
    settings,
    createMeal,
    updateMeal,
  } = useStore();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dragging, setDragging] = useState<{
    meal: Meal;
    source: 'sidebar' | 'day';
  } | null>(null);
  const [copyMode, setCopyMode] = useState<{ sourceDay: number } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const planned = weekPlan?.planned_meals ?? [];

  const placedCounts = useMemo(() => {
    const c = new Map<number, number>();
    planned.forEach((p) => c.set(p.meal_id, (c.get(p.meal_id) ?? 0) + 1));
    return c;
  }, [planned]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    meals.forEach((m) => m.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [meals]);

  const filteredMeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meals.filter((m) => {
      if (activeTag && !m.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q)) ||
        m.ingredients.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [meals, query, activeTag]);

  const mealById = (id: number) => meals.find((m) => m.id === id) ?? null;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planned, settings, meals]);

  function jumpWeek(delta: number) {
    setWeekStartISO(
      toISODate(addDays(fromISODate(weekStartISO), delta * 7))
    );
  }
  function jumpToToday() {
    setWeekStartISO(toISODate(startOfWeek(new Date())));
  }

  function plannedForDay(day: number): (PlannedMeal & { _idx: number })[] {
    return planned
      .map((p, idx) => ({ ...p, _idx: idx }))
      .filter((p) => p.day_of_week === day)
      .sort((a, b) => (a.position_in_day ?? 0) - (b.position_in_day ?? 0));
  }

  function addMealToDay(meal: Meal, day: number) {
    const dayItems = planned.filter((p) => p.day_of_week === day);
    const newItem: PlannedMeal = {
      meal_id: meal.id,
      day_of_week: day,
      position_in_day: dayItems.length,
    };
    const rest = planned.filter((p) => p.day_of_week !== day);
    const updatedDay = [...dayItems, newItem].map((p, i) => ({
      ...p,
      position_in_day: i,
    }));
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
    const moved: PlannedMeal = {
      ...item,
      day_of_week: day,
      position_in_day: dayItems.length,
    };
    const updatedDay = [...dayItems, moved].map((p, i) => ({
      ...p,
      position_in_day: i,
    }));
    setPlannedMeals([...restItems, ...updatedDay]);
  }

  function clearDay(day: number) {
    setPlannedMeals(planned.filter((p) => p.day_of_week !== day));
  }

  function copyDayToDay(source: number, target: number) {
    if (source === target) return;
    const sourceItems = planned.filter((p) => p.day_of_week === source);
    const targetExisting = planned.filter((p) => p.day_of_week === target);
    const rest = planned.filter(
      (p) => p.day_of_week !== source && p.day_of_week !== target
    );
    const newSource = sourceItems.map((p, i) => ({
      ...p,
      position_in_day: i,
    }));
    const copied = sourceItems.map<PlannedMeal>((p) => ({
      meal_id: p.meal_id,
      day_of_week: target,
      position_in_day: 0,
    }));
    const newTarget = [...targetExisting, ...copied].map((p, i) => ({
      ...p,
      position_in_day: i,
    }));
    setPlannedMeals([...rest, ...newSource, ...newTarget]);
  }

  useEffect(() => {
    if (!copyMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCopyMode(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copyMode]);

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as
      | { type: 'sidebar'; meal: Meal }
      | { type: 'day'; meal: Meal; index: number }
      | undefined;
    if (!data) return;
    setDragging({ meal: data.meal, source: data.type });
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

  // Today detection
  const todayDow = useMemo(() => {
    const today = new Date();
    const liveStart = startOfWeek(today);
    const weekStart = fromISODate(weekStartISO);
    if (liveStart.getTime() !== weekStart.getTime()) return -1;
    const diff = Math.floor(
      (today.setHours(0, 0, 0, 0) - liveStart.getTime()) / 86400000
    );
    return diff >= 0 && diff <= 6 ? diff : -1;
  }, [weekStartISO]);
  const isLiveWeek = todayDow >= 0;

  function isPastDay(day: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = addDays(fromISODate(weekStartISO), day);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate.getTime() < today.getTime();
  }
  function dateFor(day: number) {
    return addDays(fromISODate(weekStartISO), day);
  }

  function startCopy(day: number) {
    setCopyMode({ sourceDay: day });
  }
  function cancelCopy() {
    setCopyMode(null);
  }
  function completeCopy(target: number) {
    if (copyMode && copyMode.sourceDay !== target) {
      copyDayToDay(copyMode.sourceDay, target);
    }
    setCopyMode(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {copyMode && (
        <div className="copy-banner" role="status">
          <span className="label">Copy mode</span>
          <span className="name">
            Copying{' '}
            <span
              style={{
                fontStyle: 'normal',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: 'Geist',
                fontSize: 12,
                marginLeft: 4,
              }}
            >
              {DAY_LABELS_LONG[copyMode.sourceDay]}
            </span>
          </span>
          <span className="hint">
            Click a day to copy meals into it · Esc to cancel
          </span>
          <button type="button" onClick={cancelCopy}>
            Cancel
          </button>
        </div>
      )}

      <div className="page-head">
        <div className="page-head-row">
          <div className="eyebrow">The Week of</div>
          <WeekNav onPrev={() => jumpWeek(-1)} onToday={jumpToToday} onNext={() => jumpWeek(1)} isLive={isLiveWeek} />
        </div>
        <div className="title-block">
          <h1>
            {formatWeekRange(weekStartISO)} <span className="italic">·</span>
          </h1>
          <p className="sub">
            Plan your days. Drag from the cookbook on the right onto any day.
            The header tracks your balance for the week.
          </p>
        </div>
      </div>

      <WeekBalance t={weekTotals} />

      <div className="planner-grid">
        <div>
          {isLiveWeek && (
            <TodayHero
              day={todayDow}
              date={dateFor(todayDow)}
              totals={dayTotals(todayDow)}
              target={targetFor(todayDow)}
              plannedItems={plannedForDay(todayDow)}
              mealLookup={mealById}
              onRemove={removePlannedAt}
              dragging={!!dragging}
              copyMode={copyMode}
              onStartCopy={startCopy}
              onCompleteCopy={completeCopy}
              onClear={() => clearDay(todayDow)}
            />
          )}
          <div className="timeline">
            {Array.from({ length: 7 })
              .map((_, d) => d)
              .filter((d) => !isLiveWeek || d !== todayDow)
              .map((d) => (
                <DayRow
                  key={d}
                  day={d}
                  date={dateFor(d)}
                  isToday={d === todayDow}
                  isPast={isPastDay(d)}
                  plannedItems={plannedForDay(d)}
                  totals={dayTotals(d)}
                  target={targetFor(d)}
                  mealLookup={mealById}
                  onRemove={removePlannedAt}
                  dragging={!!dragging}
                  copyMode={copyMode}
                  onStartCopy={startCopy}
                  onCompleteCopy={completeCopy}
                  onCancelCopy={cancelCopy}
                  onClear={() => clearDay(d)}
                />
              ))}
          </div>
        </div>

        <LibraryRail
          meals={filteredMeals}
          totalMeals={meals.length}
          placedCounts={placedCounts}
          query={query}
          setQuery={setQuery}
          tagOptions={tagOptions}
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
          isRemoveTarget={dragging?.source === 'day'}
          onNewMeal={() => setEditorOpen(true)}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging?.meal ? <DragGhost meal={dragging.meal} /> : null}
      </DragOverlay>

      <MealEditor
        open={editorOpen}
        meal={null}
        onClose={() => setEditorOpen(false)}
        onSubmit={async (data, image) => {
          await createMeal(data, image);
        }}
      />
      {/* (updateMeal kept for type compatibility w/ editor reuse) */}
      <span hidden aria-hidden>
        {String(updateMeal !== undefined)}
      </span>
    </DndContext>
  );
}

function WeekNav({
  onPrev,
  onToday,
  onNext,
  isLive,
}: {
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  isLive: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button className="icon-btn" onClick={onPrev} aria-label="Previous week">
        <IconChevronLeft size={16} />
      </button>
      <button
        className="btn btn-outline btn-sm"
        onClick={onToday}
        disabled={isLive}
      >
        <IconToday size={14} /> This week
      </button>
      <button className="icon-btn" onClick={onNext} aria-label="Next week">
        <IconChevronRight size={16} />
      </button>
    </div>
  );
}

function WeekBalance({
  t,
}: {
  t: {
    cal: number;
    p: number;
    c: number;
    f: number;
    tcal: number;
    tp: number;
    tc: number;
    tf: number;
  };
}) {
  const dayCount = 7;
  const items = [
    { label: 'Calories', cur: t.cal, tgt: t.tcal, color: MACRO_COLORS.cal },
    { label: 'Protein', cur: t.p, tgt: t.tp, color: MACRO_COLORS.protein },
    { label: 'Carbs', cur: t.c, tgt: t.tc, color: MACRO_COLORS.carbs },
    { label: 'Fat', cur: t.f, tgt: t.tf, color: MACRO_COLORS.fat },
  ];

  const score = useMemo(() => {
    if (t.tcal === 0) return 0;
    const calPct = t.cal / t.tcal;
    const pPct = t.tp ? t.p / t.tp : 0;
    const cPct = t.tc ? t.c / t.tc : 0;
    const fPct = t.tf ? t.f / t.tf : 0;
    const dev =
      (Math.abs(1 - calPct) +
        Math.abs(1 - pPct) * 0.7 +
        Math.abs(1 - cPct) * 0.7 +
        Math.abs(1 - fPct) * 0.7) /
      3.1;
    return Math.max(0, Math.min(1, 1 - dev));
  }, [t]);

  const targetKcal = t.tcal || 1;
  const delta = t.cal - t.tcal;
  const pctDelta = delta / targetKcal;
  const onPlan = Math.abs(pctDelta) <= 0.1;
  const significantlyOver = pctDelta > 0.1;
  const tone: 'good' | 'over' | 'under' = onPlan
    ? 'good'
    : significantlyOver
      ? 'over'
      : 'under';
  const toneLabel = onPlan ? 'on plan' : significantlyOver ? 'over' : 'deficit';

  return (
    <div className="balance">
      <div className="b-head">
        <div className="eyebrow">Week at a glance</div>
        <h2>
          <span className="italic">Plate</span> the week
        </h2>
        <p>
          <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>
            {fmt(t.cal, 0)}
          </span>{' '}
          kcal planned · avg{' '}
          <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>
            {fmt(t.cal / dayCount, 0)}
          </span>{' '}
          per day · target {fmt(t.tcal / dayCount, 0)}
        </p>
      </div>
      {items.map((m) => {
        const pct = m.tgt > 0 ? Math.min(100, (m.cur / m.tgt) * 100) : 0;
        const over = m.cur > m.tgt && m.tgt > 0;
        return (
          <div className="balance-cell" key={m.label}>
            <div className="label">
              <span className="dot" style={{ background: m.color }} />
              {m.label}
            </div>
            <div className="num-line">
              <span
                className="v"
                style={over ? { color: 'var(--terracotta)' } : undefined}
              >
                {fmt(m.cur, 0)}
              </span>
              <span className="of">
                / {fmt(m.tgt, 0)}
                {m.label === 'Calories' ? '' : 'g'}
              </span>
            </div>
            <div className="bar">
              <div
                style={{
                  width: `${pct}%`,
                  background: over ? 'var(--terracotta)' : m.color,
                }}
              />
            </div>
          </div>
        );
      })}
      <div className="b-right">
        <div className="eyebrow">Balance</div>
        <div className="score">
          <b className={`score-num tone-${tone}`}>{Math.round(score * 100)}</b>%
        </div>
        <div
          className={`eyebrow tone-${tone}`}
          style={{ letterSpacing: '0.22em' }}
        >
          {toneLabel}
        </div>
        <div
          className={`deficit-pill ${tone}`}
          title="Net energy balance vs. target"
        >
          <div className="row">
            <span className="v">
              {t.cal > t.tcal ? '+' : '−'}
              {fmt(Math.abs(t.tcal - t.cal), 0)}
            </span>
            <span className="u">/ week</span>
          </div>
          <div className="row sub">
            <span className="v">
              {t.cal > t.tcal ? '+' : '−'}
              {fmt(Math.abs(t.tcal - t.cal) / 7, 0)}
            </span>
            <span className="u">/ day avg</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ring({
  size = 50,
  stroke = 6,
  cur,
  tgt,
  color,
  over,
}: {
  size?: number;
  stroke?: number;
  cur: number;
  tgt: number;
  color: string;
  over: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = tgt > 0 ? Math.min(1, cur / tgt) : 0;
  const dash = c * pct;
  const finalColor = over ? 'var(--terracotta)' : color;
  return (
    <svg width={size} height={size} className="ring">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(26,20,13,0.08)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={finalColor}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 300ms ease, stroke 200ms ease' }}
      />
    </svg>
  );
}

function GaugeCell({
  label,
  v,
  t,
  color,
  unit,
}: {
  label: string;
  v: number;
  t: number;
  color: string;
  unit: string;
}) {
  const over = t > 0 && v > t;
  return (
    <div className="gauge">
      <Ring size={50} stroke={6} cur={v} tgt={t} color={color} over={over} />
      <div className="text">
        <span className="label" style={{ color }}>
          {label}
        </span>
        <span
          className="val"
          style={over ? { color: 'var(--terracotta)' } : undefined}
        >
          {fmt(v, 0)}
          <span
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              marginLeft: 3,
              fontWeight: 500,
              fontFamily: 'Geist',
            }}
          >
            {unit}
          </span>
        </span>
        <span className="of">
          of {fmt(t, 0)}
          {unit}
        </span>
      </div>
    </div>
  );
}

function TodayHero({
  day,
  date,
  totals,
  target,
  plannedItems,
  mealLookup,
  onRemove,
  dragging,
  copyMode,
  onStartCopy,
  onCompleteCopy,
  onClear,
}: {
  day: number;
  date: Date;
  totals: { cal: number; p: number; c: number; f: number };
  target: { cal: number; p: number; c: number; f: number };
  plannedItems: (PlannedMeal & { _idx: number })[];
  mealLookup: (id: number) => Meal | null;
  onRemove: (idx: number) => void;
  dragging: boolean;
  copyMode: { sourceDay: number } | null;
  onStartCopy: (day: number) => void;
  onCompleteCopy: (day: number) => void;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` });
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const calOver = totals.cal > target.cal && target.cal > 0;
  const isCopySource = copyMode?.sourceDay === day;
  const isCopyTarget = copyMode && copyMode.sourceDay !== day;

  return (
    <div
      className={cn(
        'today-hero',
        isCopySource && 'copy-source',
        isCopyTarget && 'copy-target'
      )}
      onClick={isCopyTarget ? () => onCompleteCopy(day) : undefined}
      role={isCopyTarget ? 'button' : undefined}
    >
      <div className="today-hero-head">
        <div className="today-date">
          <span className="eyebrow-warm">Today · Focus</span>
          <div className="dateline">
            <span className="italic">{dateStr.split(',')[0]}</span>
            {dateStr.includes(',')
              ? `, ${dateStr.split(',').slice(1).join(',').trim()}`
              : ''}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--ink-3)',
              marginTop: 4,
            }}
          >
            {plannedItems.length} meal
            {plannedItems.length === 1 ? '' : 's'} planned ·{' '}
            <span
              style={
                calOver
                  ? { color: 'var(--terracotta-2)', fontWeight: 600 }
                  : { color: 'var(--ink-2)', fontWeight: 600 }
              }
            >
              {fmt(Math.abs(target.cal - totals.cal), 0)} kcal{' '}
              {calOver ? 'over' : 'to goal'}
            </span>
          </div>
          {plannedItems.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              <button
                type="button"
                className={cn('icon-btn', isCopySource && 'active')}
                title={isCopySource ? 'Cancel copy' : 'Copy day to…'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCopySource) onCompleteCopy(day);
                  else onStartCopy(day);
                }}
                style={{ width: 26, height: 26 }}
              >
                <IconCopy size={12} />
              </button>
              <button
                type="button"
                className="icon-btn danger"
                title="Clear day"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                style={{ width: 26, height: 26 }}
              >
                <IconTrash size={12} />
              </button>
            </div>
          )}
        </div>
        <div className="today-gauges-inline">
          <GaugeCell
            label="Calories"
            v={totals.cal}
            t={target.cal}
            color={MACRO_COLORS.cal}
            unit=""
          />
          <GaugeCell
            label="Protein"
            v={totals.p}
            t={target.p}
            color={MACRO_COLORS.protein}
            unit="g"
          />
          <GaugeCell
            label="Carbs"
            v={totals.c}
            t={target.c}
            color={MACRO_COLORS.carbs}
            unit="g"
          />
          <GaugeCell
            label="Fat"
            v={totals.f}
            t={target.f}
            color={MACRO_COLORS.fat}
            unit="g"
          />
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'today-meals',
          plannedItems.length === 0 && 'empty',
          isOver && 'drag-over'
        )}
      >
        {plannedItems.length === 0
          ? dragging
            ? 'Drop a meal here'
            : 'No meals yet — drag from the library to begin today.'
          : plannedItems.map((p) => {
              const meal = mealLookup(p.meal_id);
              if (!meal) return null;
              return (
                <PlannedMealChip
                  key={`${p._idx}_${p.meal_id}`}
                  meal={meal}
                  index={p._idx}
                  large
                  onRemove={() => onRemove(p._idx)}
                />
              );
            })}
      </div>
    </div>
  );
}

function DayRow({
  day,
  date,
  isToday,
  isPast,
  plannedItems,
  totals,
  target,
  mealLookup,
  onRemove,
  dragging,
  copyMode,
  onStartCopy,
  onCompleteCopy,
  onCancelCopy,
  onClear,
}: {
  day: number;
  date: Date;
  isToday: boolean;
  isPast: boolean;
  plannedItems: (PlannedMeal & { _idx: number })[];
  totals: { cal: number; p: number; c: number; f: number };
  target: { cal: number; p: number; c: number; f: number };
  mealLookup: (id: number) => Meal | null;
  onRemove: (idx: number) => void;
  dragging: boolean;
  copyMode: { sourceDay: number } | null;
  onStartCopy: (day: number) => void;
  onCompleteCopy: (day: number) => void;
  onCancelCopy: () => void;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` });
  const calPct = target.cal > 0 ? Math.min(100, (totals.cal / target.cal) * 100) : 0;
  const calOver = totals.cal > target.cal && target.cal > 0;
  const isCopySource = copyMode?.sourceDay === day;
  const isCopyTarget = copyMode && copyMode.sourceDay !== day;

  return (
    <div
      className={cn(
        'day-row',
        isToday && 'is-today',
        isPast && 'is-past',
        isCopySource && 'copy-source',
        isCopyTarget && 'copy-target'
      )}
      onClick={isCopyTarget ? () => onCompleteCopy(day) : undefined}
      role={isCopyTarget ? 'button' : undefined}
      title={
        isCopyTarget && copyMode
          ? `Copy ${DAY_LABELS[copyMode.sourceDay]} → ${DAY_LABELS[day]}`
          : undefined
      }
    >
      <div className="day-rail">
        <div className={cn('dow', isToday && 'today')}>{DAY_LABELS[day]}</div>
        <div className="date">{date.getDate()}</div>
        <div className="month">
          {date.toLocaleDateString(undefined, { month: 'short' })}
        </div>
        {isToday && !isCopySource && <div className="today-tag">Today</div>}
        {isCopySource && <div className="copy-source-tag">Copying</div>}
        {isCopyTarget && <div className="copy-target-hint">Paste here</div>}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'day-meals',
          plannedItems.length === 0 && 'empty',
          isOver && 'drag-over'
        )}
      >
        {plannedItems.length === 0 ? (
          <span>
            {dragging ? 'Drop here' : 'Nothing planned — drag a meal in'}
          </span>
        ) : (
          plannedItems.map((p) => {
            const meal = mealLookup(p.meal_id);
            if (!meal) return null;
            return (
              <PlannedMealChip
                key={`${p._idx}_${p.meal_id}`}
                meal={meal}
                index={p._idx}
                onRemove={() => onRemove(p._idx)}
              />
            );
          })
        )}
      </div>

      <div className="day-summary">
        <div className="kcal-row">
          <span className={cn('kcal', calOver && 'over')}>
            {fmt(totals.cal, 0)}
          </span>
          <span className="kcal-target">/ {fmt(target.cal, 0)} kcal</span>
        </div>
        <div className={cn('kcal-bar', calOver && 'over')}>
          <div style={{ width: `${calPct}%` }} />
        </div>
        <div className="macros">
          <MiniBar
            label="P"
            cur={totals.p}
            tgt={target.p}
            color={MACRO_COLORS.protein}
          />
          <MiniBar
            label="C"
            cur={totals.c}
            tgt={target.c}
            color={MACRO_COLORS.carbs}
          />
          <MiniBar
            label="F"
            cur={totals.f}
            tgt={target.f}
            color={MACRO_COLORS.fat}
          />
        </div>
        {plannedItems.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button
              type="button"
              className={cn('icon-btn', isCopySource && 'active')}
              title={isCopySource ? 'Cancel copy' : 'Copy day to…'}
              onClick={(e) => {
                e.stopPropagation();
                if (isCopySource) onCancelCopy();
                else onStartCopy(day);
              }}
              style={{ width: 26, height: 26 }}
            >
              <IconCopy size={12} />
            </button>
            <button
              type="button"
              className="icon-btn danger"
              title="Clear day"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              style={{ width: 26, height: 26 }}
            >
              <IconTrash size={12} />
            </button>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 11,
                color: 'var(--ink-3)',
              }}
            >
              {plannedItems.length} meal
              {plannedItems.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniBar({
  label,
  cur,
  tgt,
  color,
}: {
  label: string;
  cur: number;
  tgt: number;
  color: string;
}) {
  const pct = tgt > 0 ? Math.min(100, (cur / tgt) * 100) : 0;
  const over = tgt > 0 && cur > tgt;
  return (
    <div className="macro-mini">
      <div className="row">
        <span className="lbl" style={{ color }}>
          {label}
        </span>
        <span className={cn('v', over && 'over')}>
          {fmt(cur, 0)}
          <span style={{ color: 'var(--muted)' }}>/{fmt(tgt, 0)}</span>
        </span>
      </div>
      <div className="bar">
        <div
          style={{
            width: `${pct}%`,
            background: over ? 'var(--terracotta)' : color,
          }}
        />
      </div>
    </div>
  );
}

function PlannedMealChip({
  meal,
  index,
  large,
  onRemove,
}: {
  meal: Meal;
  index: number;
  large?: boolean;
  onRemove?: () => void;
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
      className={cn('meal-chip', large && 'large', isDragging && 'dragging')}
    >
      <div className="thumb">
        <MealThumb meal={meal} size="xl" />
      </div>
      <div className="body">
        <div className="name" title={meal.name}>
          {meal.name}
        </div>
        <div className="macros">
          <span className="kcal">{fmt(meal.per_serving_calories, 0)}</span>
          <span className="p">P{fmt(meal.per_serving_protein_g, 0)}</span>
          <span className="c">C{fmt(meal.per_serving_carbs_g, 0)}</span>
          <span className="f">F{fmt(meal.per_serving_fat_g, 0)}</span>
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          className="remove"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove"
        >
          <IconClose size={11} />
        </button>
      )}
    </div>
  );
}

function DragGhost({ meal }: { meal: Meal }) {
  return (
    <div
      className="meal-chip large"
      style={{
        width: 260,
        transform: 'rotate(-2deg)',
        filter: 'drop-shadow(0 18px 28px rgba(20,15,10,0.18))',
        pointerEvents: 'none',
        opacity: 0.97,
      }}
    >
      <div className="thumb">
        <MealThumb meal={meal} size="xl" />
      </div>
      <div className="body">
        <div className="name">{meal.name}</div>
        <div className="macros">
          <span className="kcal">{fmt(meal.per_serving_calories, 0)}</span>
          <span style={{ color: 'var(--muted)' }}>kcal</span>
        </div>
      </div>
    </div>
  );
}

function LibraryRail({
  meals,
  totalMeals,
  placedCounts,
  query,
  setQuery,
  tagOptions,
  activeTag,
  setActiveTag,
  filtersOpen,
  setFiltersOpen,
  isRemoveTarget,
  onNewMeal,
}: {
  meals: Meal[];
  totalMeals: number;
  placedCounts: Map<number, number>;
  query: string;
  setQuery: (s: string) => void;
  tagOptions: string[];
  activeTag: string | null;
  setActiveTag: (t: string | null) => void;
  filtersOpen: boolean;
  setFiltersOpen: (b: boolean) => void;
  isRemoveTarget: boolean;
  onNewMeal: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: SIDEBAR_ID });
  const activeCount = activeTag ? 1 : 0;

  return (
    <aside
      ref={setNodeRef}
      className={cn(
        'library-rail',
        (isRemoveTarget || isOver) && 'drop-target'
      )}
    >
      <div className="lr-head">
        <div className="title-row">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <h3>Cookbook</h3>
            <span className="count">
              {meals.length} of {totalMeals}
            </span>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={onNewMeal}
            style={{ padding: '4px 10px' }}
          >
            <IconPlus size={12} /> New
          </button>
        </div>
        <div className="search-wrap">
          <IconSearch size={14} className="ic" />
          <input
            className="input sm"
            placeholder="Search meals or ingredients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {tagOptions.length > 0 && (
          <div className="facet-wrap">
            <div className="facet-toggle-row">
              <button
                type="button"
                className={cn('facet-toggle', filtersOpen && 'open')}
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                Tags
                {activeCount > 0 && (
                  <span className="facet-count">{activeCount}</span>
                )}
              </button>
              {activeCount > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveTag(null)}
                  style={{ padding: '4px 8px', fontSize: 11 }}
                >
                  Clear
                </button>
              )}
            </div>
            {activeTag && (
              <div className="active-chip-row">
                <span
                  className="chip active-chip"
                  onClick={() => setActiveTag(null)}
                >
                  <span>{activeTag}</span>
                  <span className="x">
                    <IconClose size={9} />
                  </span>
                </span>
              </div>
            )}
            {filtersOpen && (
              <div className="facet-panel">
                <div className="facet-group">
                  <div className="facet-label">All tags</div>
                  <div className="facet-chips">
                    {tagOptions.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={cn('chip', activeTag === t && 'active')}
                        onClick={() =>
                          setActiveTag(activeTag === t ? null : t)
                        }
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {isRemoveTarget && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--terracotta-2)',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            <IconClose
              size={10}
              style={{ verticalAlign: -2, marginRight: 4 }}
            />
            Drop to remove from plan
          </div>
        )}
      </div>
      <div className="library-list scroll">
        {totalMeals === 0 && (
          <div className="library-empty">
            <p style={{ margin: 0 }}>Your cookbook is empty.</p>
            <p
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginTop: 4,
              }}
            >
              Create meals from the Cookbook page to plan them.
            </p>
          </div>
        )}
        {totalMeals > 0 && meals.length === 0 && (
          <div className="library-empty">No meals match.</div>
        )}
        {meals.map((m) => (
          <LibraryRailCard
            key={m.id}
            meal={m}
            placed={placedCounts.get(m.id) ?? 0}
          />
        ))}
      </div>
    </aside>
  );
}

function LibraryRailCard({ meal, placed }: { meal: Meal; placed: number }) {
  const id = `sidebar-${meal.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { type: 'sidebar', meal },
  });
  const badge = computeBatchBadge(placed, meal.serving_count);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn('library-card', isDragging && 'dragging')}
    >
      <div className="thumb">
        <MealThumb meal={meal} size="xl" />
      </div>
      <div className="meta">
        <div className="name">{meal.name}</div>
        <div className="info">
          <span className="kcal">{fmt(meal.per_serving_calories, 0)}</span>
          <span style={{ color: 'var(--ink-3)' }}>kcal</span>
          <span className="dot">·</span>
          <span style={{ color: 'var(--terracotta-2)', fontWeight: 700 }}>
            P{fmt(meal.per_serving_protein_g, 0)}
          </span>
          <span style={{ color: 'var(--mustard-2)', fontWeight: 700 }}>
            C{fmt(meal.per_serving_carbs_g, 0)}
          </span>
          <span style={{ color: 'var(--plum-2)', fontWeight: 700 }}>
            F{fmt(meal.per_serving_fat_g, 0)}
          </span>
        </div>
      </div>
      <div className="badge">
        {placed > 0 ? (
          <>
            <span className="pill active" data-testid="batch-badge">
              {badge.remaining}/{meal.serving_count}
            </span>
            {badge.batchesStarted > 1 && (
              <span className="batches">×{badge.batchesStarted}</span>
            )}
          </>
        ) : (
          <span className="pill">{meal.serving_count}×</span>
        )}
      </div>
    </div>
  );
}
