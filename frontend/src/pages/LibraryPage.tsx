import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { Meal } from '@/lib/types';
import { MealEditor } from '@/components/MealEditor';
import { MealThumb } from '@/components/MealThumb';
import {
  IconClock,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@/components/Icons';
import { cn, fmt } from '@/lib/utils';

export function LibraryPage() {
  const { meals, createMeal, updateMeal, deleteMeal, loadingMeals } = useStore();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Meal | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    meals.forEach((m) => m.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [meals]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meals.filter((m) => {
      if (activeTag && !m.tags.includes(activeTag)) return false;
      if (!q) return true;
      if (m.name.toLowerCase().includes(q)) return true;
      if (m.tags.some((t) => t.toLowerCase().includes(q))) return true;
      if (m.ingredients.some((i) => i.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [meals, query, activeTag]);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(m: Meal) {
    setEditing(m);
    setEditorOpen(true);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] font-bold text-black/40">
            Meal library
          </p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">
            {meals.length} {meals.length === 1 ? 'card' : 'cards'} ready to plan
          </h1>
          <p className="text-sm text-black/55 mt-1">
            Build once, plan many. Each card stores macros, photo, ingredients, and batch size.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
            />
            <input
              className="input pl-9 w-72"
              placeholder="Search name, tag, or ingredient…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={openNew}>
            <IconPlus size={16} /> New meal
          </button>
        </div>
      </header>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTag(null)}
            className={cn(
              'chip px-3 py-1',
              !activeTag ? 'bg-canvas-ink text-white' : 'hover:bg-black/5'
            )}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
              className={cn(
                'chip px-3 py-1',
                activeTag === t ? 'bg-canvas-ink text-white' : 'hover:bg-black/5'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {loadingMeals ? (
        <div className="text-sm text-black/45">Loading meals…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          onCreate={openNew}
          hasMeals={meals.length > 0}
          query={query}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <MealCard
              key={m.id}
              meal={m}
              onEdit={() => openEdit(m)}
              onDelete={() => {
                if (
                  confirm(
                    `Delete "${m.name}"? It will be removed from any current plans.`
                  )
                )
                  deleteMeal(m.id);
              }}
            />
          ))}
        </div>
      )}

      <MealEditor
        open={editorOpen}
        meal={editing}
        onClose={() => setEditorOpen(false)}
        onSubmit={async (data, image, remove) => {
          if (editing) {
            await updateMeal(editing.id, data, image, remove);
          } else {
            await createMeal(data, image);
          }
        }}
      />
    </div>
  );
}

function MealCard({
  meal,
  onEdit,
  onDelete,
}: {
  meal: Meal;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-2xl bg-white border border-black/[0.05] shadow-card overflow-hidden hover:shadow-cardHover hover:-translate-y-0.5 transition-all">
      <div className="relative aspect-[5/4] overflow-hidden">
        <MealThumb meal={meal} size="xl" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/40 via-black/0 to-transparent pointer-events-none" />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {meal.prep_time_minutes != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 text-white backdrop-blur-sm px-2 py-1 text-[10px] font-bold">
              <IconClock size={11} />
              {meal.prep_time_minutes} min
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 text-canvas-ink backdrop-blur-sm px-2 py-1 text-[10px] font-bold tabular-nums">
            {meal.serving_count}× batch
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="rounded-full bg-white/95 backdrop-blur p-2 shadow-card hover:bg-white"
            aria-label="Edit"
          >
            <IconEdit size={13} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-full bg-white/95 backdrop-blur p-2 shadow-card text-accent-rose hover:bg-white"
            aria-label="Delete"
          >
            <IconTrash size={13} />
          </button>
        </div>
        <div className="absolute bottom-2.5 left-2.5 right-2.5">
          <h3 className="font-bold tracking-tight text-white text-[15px] leading-tight line-clamp-2 drop-shadow-sm">
            {meal.name}
          </h3>
        </div>
      </div>
      <div className="p-3 space-y-2.5">
        <div className="flex items-stretch gap-1.5">
          <CalorieTile cal={meal.per_serving_calories} />
          <MacroTile
            letter="P"
            value={meal.per_serving_protein_g}
            tone="protein"
          />
          <MacroTile
            letter="C"
            value={meal.per_serving_carbs_g}
            tone="carbs"
          />
          <MacroTile letter="F" value={meal.per_serving_fat_g} tone="fat" />
        </div>
        <div className="flex items-center justify-between text-[11px] text-black/45">
          <span className="tabular-nums">
            {meal.ingredients.length} ingredient
            {meal.ingredients.length === 1 ? '' : 's'}
          </span>
          {meal.tags.length > 0 && (
            <div className="flex items-center gap-1 overflow-hidden">
              {meal.tags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-md bg-canvas-subtle px-1.5 py-0.5 text-[10px] font-semibold text-black/65"
                >
                  {t}
                </span>
              ))}
              {meal.tags.length > 2 && (
                <span className="text-[10px] font-semibold text-black/45">
                  +{meal.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CalorieTile({ cal }: { cal: number }) {
  return (
    <div className="flex-[1.4] rounded-xl bg-canvas-ink text-white px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider font-bold text-white/55">
        Per serv
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-base font-bold tabular-nums leading-none mt-0.5">
          {fmt(cal, 0)}
        </span>
        <span className="text-[10px] text-white/55 font-semibold">kcal</span>
      </div>
    </div>
  );
}

function MacroTile({
  letter,
  value,
  tone,
}: {
  letter: string;
  value: number;
  tone: 'protein' | 'carbs' | 'fat';
}) {
  const tones = {
    protein: { dot: 'bg-accent-coral', text: 'text-accent-coral' },
    carbs: { dot: 'bg-accent-amber', text: 'text-accent-amber' },
    fat: { dot: 'bg-accent-plum', text: 'text-accent-plum' },
  };
  const t = tones[tone];
  return (
    <div className="flex-1 rounded-xl bg-canvas-subtle px-2 py-1.5">
      <div className="flex items-center gap-1">
        <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />
        <span className={cn('text-[9px] uppercase tracking-wider font-bold', t.text)}>
          {letter}
        </span>
      </div>
      <div className="text-base font-bold tabular-nums leading-none mt-0.5">
        {fmt(value, 0)}
        <span className="text-[10px] text-black/40 font-semibold ml-0.5">g</span>
      </div>
    </div>
  );
}

function EmptyState({
  onCreate,
  hasMeals,
  query,
}: {
  onCreate: () => void;
  hasMeals: boolean;
  query: string;
}) {
  if (hasMeals) {
    return (
      <div className="card p-10 text-center">
        <h3 className="font-bold text-lg">No matches</h3>
        <p className="text-sm text-black/55 mt-1">
          Nothing in your library matches "{query}". Try clearing filters or
          search terms.
        </p>
      </div>
    );
  }
  return (
    <div className="card p-12 text-center">
      <h3 className="font-bold text-xl tracking-tight">
        Build your first meal card
      </h3>
      <p className="text-sm text-black/55 mt-2 max-w-md mx-auto">
        Add a meal with its ingredients and macros. You'll be able to drag it
        onto any day of the week and the planner will track your daily totals.
      </p>
      <button className="btn-primary mt-5" onClick={onCreate}>
        <IconPlus size={16} /> Create meal
      </button>
    </div>
  );
}
