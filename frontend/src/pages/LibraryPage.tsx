import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { Meal } from '@/lib/types';
import { MealEditor } from '@/components/MealEditor';
import { MealThumb } from '@/components/MealThumb';
import { IconClock, IconEdit, IconPlus, IconSearch, IconTrash } from '@/components/Icons';
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
          <h1 className="text-3xl font-bold tracking-tight">Meal Library</h1>
          <p className="text-sm text-black/55 mt-1">
            Your reusable cards. Build once, plan many.
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
              !activeTag
                ? 'bg-canvas-ink text-white'
                : 'hover:bg-black/5'
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
                activeTag === t
                  ? 'bg-canvas-ink text-white'
                  : 'hover:bg-black/5'
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
                if (confirm(`Delete "${m.name}"? It will be removed from any current plans.`))
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
    <div className="card group overflow-hidden hover:shadow-cardHover transition-shadow">
      <div className="relative aspect-[4/3] bg-canvas-subtle">
        <MealThumb
          meal={meal}
          size="lg"
          className="!h-full !w-full !rounded-none"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          <button
            onClick={onEdit}
            className="rounded-full bg-white/95 backdrop-blur p-2 shadow-card hover:bg-white"
            aria-label="Edit"
          >
            <IconEdit size={14} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-full bg-white/95 backdrop-blur p-2 shadow-card text-accent-rose hover:bg-white"
            aria-label="Delete"
          >
            <IconTrash size={14} />
          </button>
        </div>
        {meal.prep_time_minutes != null && (
          <div className="absolute bottom-2 left-2 chip bg-black/65 text-white backdrop-blur">
            <IconClock size={12} />
            {meal.prep_time_minutes} min
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold tracking-tight leading-tight line-clamp-2">
            {meal.name}
          </h3>
          <p className="text-xs text-black/50 mt-0.5">
            {meal.serving_count} servings / batch
            {meal.ingredients.length > 0 && ` · ${meal.ingredients.length} ingredients`}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-1 text-center">
          <MacroPill label="Cal" value={fmt(meal.per_serving_calories, 0)} />
          <MacroPill
            label="P"
            value={fmt(meal.per_serving_protein_g, 0) + 'g'}
            tone="protein"
          />
          <MacroPill
            label="C"
            value={fmt(meal.per_serving_carbs_g, 0) + 'g'}
            tone="carbs"
          />
          <MacroPill
            label="F"
            value={fmt(meal.per_serving_fat_g, 0) + 'g'}
            tone="fat"
          />
        </div>

        {meal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {meal.tags.slice(0, 4).map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
            {meal.tags.length > 4 && (
              <span className="chip">+{meal.tags.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MacroPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'protein' | 'carbs' | 'fat';
}) {
  const tones = {
    protein: 'text-accent-coral',
    carbs: 'text-accent-amber',
    fat: 'text-accent-plum',
  };
  return (
    <div className="rounded-xl bg-canvas-subtle py-1.5">
      <div
        className={cn(
          'text-[10px] uppercase tracking-wider font-bold',
          tone ? tones[tone] : 'text-canvas-ink/55'
        )}
      >
        {label}
      </div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
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
      <h3 className="font-bold text-xl tracking-tight">Build your first meal card</h3>
      <p className="text-sm text-black/55 mt-2 max-w-md mx-auto">
        Add a meal with its ingredients and macros. You'll be able to drag it onto
        any day of the week and the planner will track your daily totals.
      </p>
      <button className="btn-primary mt-5" onClick={onCreate}>
        <IconPlus size={16} /> Create meal
      </button>
    </div>
  );
}
