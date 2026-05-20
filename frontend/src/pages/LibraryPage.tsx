import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { Meal } from '@/lib/types';
import { MealEditor } from '@/components/MealEditor';
import { MealThumb } from '@/components/MealThumb';
import {
  IconClock,
  IconClose,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@/components/Icons';
import { cn, fmt } from '@/lib/utils';

export function LibraryPage() {
  const { meals, createMeal, updateMeal, deleteMeal, loadingMeals } =
    useStore();
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(true);
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
      if (activeTags.size > 0) {
        const hit = m.tags.some((t) => activeTags.has(t));
        if (!hit) return false;
      }
      if (!q) return true;
      if (m.name.toLowerCase().includes(q)) return true;
      if (m.tags.some((t) => t.toLowerCase().includes(q))) return true;
      if (m.ingredients.some((i) => i.name.toLowerCase().includes(q)))
        return true;
      return false;
    });
  }, [meals, query, activeTags]);

  function toggleTag(t: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(m: Meal) {
    setEditing(m);
    setEditorOpen(true);
  }

  return (
    <div>
      <div className="page-head">
        <div className="page-head-row">
          <div className="eyebrow">The Cookbook</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="search-wrap" style={{ width: 300 }}>
              <IconSearch size={15} className="ic" />
              <input
                className="input"
                placeholder="Search name, tag, or ingredient…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-accent" onClick={openNew}>
              <IconPlus size={15} /> New meal
            </button>
          </div>
        </div>
        <div className="title-block">
          <h1>
            <span className="italic">{meals.length}</span> meal card
            {meals.length === 1 ? '' : 's'} ready to plan
          </h1>
          <p className="sub">
            Build once, plan many. Each card stores its ingredients, macros and
            serving count — drag any of them onto the planner.
          </p>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="facet-wrap" style={{ marginBottom: 22 }}>
          <div className="facet-toggle-row">
            <button
              type="button"
              className={cn('facet-toggle', filtersOpen && 'open')}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              Filter by tag
              {activeTags.size > 0 && (
                <span className="facet-count">{activeTags.size}</span>
              )}
            </button>
            {activeTags.size > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveTags(new Set())}
                style={{ padding: '4px 8px', fontSize: 11 }}
              >
                Clear all
              </button>
            )}
          </div>
          {activeTags.size > 0 && (
            <div className="active-chip-row">
              {Array.from(activeTags).map((t) => (
                <span
                  key={t}
                  className="chip active-chip"
                  onClick={() => toggleTag(t)}
                >
                  <span>{t}</span>
                  <span className="x">
                    <IconClose size={9} />
                  </span>
                </span>
              ))}
            </div>
          )}
          {filtersOpen && (
            <div className="facet-panel">
              <div className="facet-group">
                <div className="facet-label">Tags</div>
                <div className="facet-chips">
                  {allTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={cn('chip', activeTags.has(t) && 'active')}
                      onClick={() => toggleTag(t)}
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

      {loadingMeals ? (
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          Loading meals…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          onCreate={openNew}
          hasMeals={meals.length > 0}
          query={query}
        />
      ) : (
        <div className="lib-grid">
          {filtered.map((m, idx) => (
            <MealCard
              key={m.id}
              meal={m}
              idx={idx}
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
  idx,
  onEdit,
  onDelete,
}: {
  meal: Meal;
  idx: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="meal-card">
      <div className="photo">
        <MealThumb meal={meal} size="xl" className="illus" />
        <span className="recipe-num">№ {String(idx + 1).padStart(2, '0')}</span>
        <div className="photo-badges">
          <div className="lefts">
            {meal.prep_time_minutes != null && (
              <span className="pill">
                <IconClock size={11} />
                {meal.prep_time_minutes} min
              </span>
            )}
            <span className="pill">{meal.serving_count}× batch</span>
          </div>
          <div className="actions">
            <button
              type="button"
              className="pill"
              onClick={onEdit}
              aria-label="Edit"
            >
              <IconEdit size={12} />
            </button>
            <button
              type="button"
              className="pill"
              onClick={onDelete}
              aria-label="Delete"
              style={{ color: 'var(--rose)' }}
            >
              <IconTrash size={12} />
            </button>
          </div>
        </div>
        <div className="photo-overlay">
          <h3>{meal.name}</h3>
        </div>
      </div>
      <div className="body">
        <div className="macros">
          <div className="macro-tile cal">
            <div className="lbl">Per serv</div>
            <div className="val">
              {fmt(meal.per_serving_calories, 0)}
              <span className="u">kcal</span>
            </div>
          </div>
          <MacroTile
            letter="P"
            v={meal.per_serving_protein_g}
            color="var(--terracotta)"
          />
          <MacroTile
            letter="C"
            v={meal.per_serving_carbs_g}
            color="var(--mustard)"
          />
          <MacroTile
            letter="F"
            v={meal.per_serving_fat_g}
            color="var(--plum)"
          />
        </div>
        <div className="footer">
          <span>
            {meal.ingredients.length} ingredient
            {meal.ingredients.length === 1 ? '' : 's'}
          </span>
          {meal.tags.length > 0 && (
            <div className="tags">
              {meal.tags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="chip"
                  style={{ padding: '2px 7px', fontSize: 10 }}
                >
                  {t}
                </span>
              ))}
              {meal.tags.length > 2 && (
                <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                  +{meal.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function MacroTile({
  letter,
  v,
  color,
}: {
  letter: string;
  v: number;
  color: string;
}) {
  return (
    <div className="macro-tile macro">
      <div className="lbl">
        <span className="dot" style={{ background: color }} />
        <span style={{ color }}>{letter}</span>
      </div>
      <div className="val">
        {fmt(v, 0)}
        <span className="u">g</span>
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
      <div className="empty-state">
        <h3>No matches</h3>
        <p>
          Nothing in your library matches "{query}". Try clearing filters or
          different search terms.
        </p>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <h3>Build your first meal card</h3>
      <p>
        Add a meal with its ingredients and macros. Drag it onto any day of the
        week and the planner will track your daily totals.
      </p>
      <button
        className="btn btn-accent"
        style={{ marginTop: 18 }}
        onClick={onCreate}
      >
        <IconPlus size={14} /> Create meal
      </button>
    </div>
  );
}
