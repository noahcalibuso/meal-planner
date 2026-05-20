import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import type {
  GroceryItem,
  GroceryListResponse,
  Meal,
  PortioningSheetResponse,
  PrepGroup,
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

const CATEGORY_META: Record<
  string,
  {
    icon: React.ComponentType<{ size?: number }>;
    tone: string;
    bg: string;
  }
> = {
  protein: {
    icon: IconShrimp,
    tone: 'var(--terracotta-2)',
    bg: 'rgba(194,90,60,0.10)',
  },
  produce: {
    icon: IconLeaf,
    tone: 'var(--sage-2)',
    bg: 'rgba(111,125,74,0.14)',
  },
  grains: {
    icon: IconWheat,
    tone: 'var(--mustard-2)',
    bg: 'rgba(201,138,31,0.13)',
  },
  dairy: {
    icon: IconMilk,
    tone: 'var(--plum-2)',
    bg: 'rgba(124,74,100,0.13)',
  },
  pantry: { icon: IconBox, tone: 'var(--ink-2)', bg: 'var(--paper-2)' },
  frozen: {
    icon: IconSnowflake,
    tone: '#3a5a6e',
    bg: 'rgba(58,90,110,0.12)',
  },
  condiments: {
    icon: IconDrop,
    tone: 'var(--plum-2)',
    bg: 'rgba(124,74,100,0.13)',
  },
  beverages: {
    icon: IconDrop,
    tone: '#3a5a6e',
    bg: 'rgba(58,90,110,0.12)',
  },
};

function categoryMeta(cat: string) {
  return (
    CATEGORY_META[cat] ?? {
      icon: IconBox,
      tone: 'var(--ink-2)',
      bg: 'var(--paper-2)',
    }
  );
}

export function OutputsPage() {
  const { weekStartISO, setWeekStartISO, meals } = useStore();
  const [tab, setTab] = useState<Tab>('grocery');
  const [grocery, setGrocery] = useState<GroceryListResponse | null>(null);
  const [prep, setPrep] = useState<PrepSheetResponse | null>(null);
  const [portion, setPortion] = useState<PortioningSheetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

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

  useEffect(() => {
    if (!printing) return;
    document.body.classList.add('printing');
    const onAfter = () => {
      setPrinting(false);
      document.body.classList.remove('printing');
    };
    window.addEventListener('afterprint', onAfter);
    const t = window.setTimeout(() => {
      window.print();
    }, 60);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', onAfter);
      document.body.classList.remove('printing');
    };
  }, [printing]);

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

  if (printing && grocery && prep && portion) {
    return (
      <PrintSheets
        weekStartISO={weekStartISO}
        grocery={grocery}
        prep={prep}
        portion={portion}
        onClose={() => {
          document.body.classList.remove('printing');
          window.dispatchEvent(new Event('afterprint'));
        }}
      />
    );
  }

  const groceryGroups = grocery ? Object.entries(grocery.groups) : [];
  const groceryCount = groceryGroups.reduce(
    (s, [, items]) => s + items.length,
    0
  );
  const prepCount = prep
    ? prep.groups.reduce((s, g) => s + g.items.length, 0)
    : 0;
  const portionCount = portion?.items.length ?? 0;

  return (
    <div>
      <div className="page-head">
        <div className="page-head-row">
          <div className="eyebrow">Kitchen · {formatWeekRange(weekStartISO)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="icon-btn"
              onClick={() => jumpWeek(-1)}
              aria-label="Previous week"
            >
              <IconChevronLeft size={16} />
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() =>
                setWeekStartISO(toISODate(startOfWeek(new Date())))
              }
            >
              <IconToday size={14} /> This week
            </button>
            <button
              className="icon-btn"
              onClick={() => jumpWeek(1)}
              aria-label="Next week"
            >
              <IconChevronRight size={16} />
            </button>
            <span
              style={{ width: 1, height: 24, background: 'var(--rule)' }}
              aria-hidden
            />
            <button
              className="btn btn-primary"
              onClick={() => setPrinting(true)}
            >
              <IconPrinter size={14} /> Print
            </button>
          </div>
        </div>
        <div className="title-block">
          <h1>
            <span className="italic">Three</span> sheets for the kitchen
          </h1>
          <p className="sub">
            Everything you need to shop, cook, and portion the week — generated
            from your plan and ready to print.
          </p>
        </div>
      </div>

      <div className="outputs-tabs">
        <button
          className={tab === 'grocery' ? 'active' : ''}
          onClick={() => setTab('grocery')}
        >
          <IconCart size={14} /> Grocery list{' '}
          <span className="count">{groceryCount}</span>
        </button>
        <button
          className={tab === 'prep' ? 'active' : ''}
          onClick={() => setTab('prep')}
        >
          <IconFire size={14} /> Prep sheet{' '}
          <span className="count">{prepCount}</span>
        </button>
        <button
          className={tab === 'portioning' ? 'active' : ''}
          onClick={() => setTab('portioning')}
        >
          <IconBowl size={14} /> Portioning{' '}
          <span className="count">{portionCount}</span>
        </button>
      </div>

      {loading && (
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Loading…</div>
      )}
      {!loading && tab === 'grocery' && grocery && (
        <GrocerySection
          groups={groceryGroups}
          checked={checked}
          onToggle={toggleChecked}
        />
      )}
      {!loading && tab === 'prep' && prep && <PrepSection groups={prep.groups} />}
      {!loading && tab === 'portioning' && portion && (
        <PortioningSection
          items={portion.items}
          mealById={mealById}
        />
      )}
    </div>
  );
}

function GrocerySection({
  groups,
  checked,
  onToggle,
}: {
  groups: [string, GroceryItem[]][];
  checked: Set<string>;
  onToggle: (k: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <EmptyOutput
        title="Nothing to shop for"
        message="Add meals to your week plan to generate a grocery list."
      />
    );
  }
  const total = groups.reduce((s, [, items]) => s + items.length, 0);
  const pct = total > 0 ? (checked.size / total) * 100 : 0;

  return (
    <div>
      <div
        className="card"
        style={{
          padding: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'rgba(194,90,60,0.13)',
              color: 'var(--terracotta-2)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <IconCart size={20} />
          </div>
          <div>
            <div className="eyebrow">Shopping list</div>
            <div
              style={{
                fontFamily: 'Newsreader, serif',
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              <span className="num">{total}</span> unique items
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--ink-3)',
                marginTop: 2,
              }}
            >
              Across {groups.length} categor
              {groups.length === 1 ? 'y' : 'ies'}
            </div>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 220,
            maxWidth: 400,
            marginLeft: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'var(--ink-3)',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            <span>Progress</span>
            <span className="num">
              {checked.size} / {total}
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              height: 6,
              background: 'var(--paper-2)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: 'var(--sage)',
                transition: 'width 250ms ease',
              }}
            />
          </div>
        </div>
      </div>

      <div className="grocery-grid">
        {groups.map(([cat, items]) => {
          const meta = categoryMeta(cat);
          const Icon = meta.icon;
          return (
            <div className="card cat-card" key={cat}>
              <div className="head">
                <div
                  className="icon-bubble"
                  style={{ background: meta.bg, color: meta.tone }}
                >
                  <Icon size={17} />
                </div>
                <div>
                  <h3>{cat}</h3>
                  <div className="sub">
                    {items.length} item{items.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              <ul className="items">
                {items.map((it) => {
                  const key = `${cat}::${it.name}`;
                  const isChecked = checked.has(key);
                  return (
                    <li
                      key={key}
                      className={cn(isChecked && 'checked')}
                      onClick={() => onToggle(key)}
                    >
                      <div className="checkbox">
                        <IconCheck size={11} />
                      </div>
                      <div>
                        <div className="name">{it.name}</div>
                        {it.quantity_description && (
                          <div className="qty">
                            {it.quantity_description}
                            {it.occurrences > 1 ? ` (×${it.occurrences})` : ''}
                          </div>
                        )}
                      </div>
                      {it.occurrences > 1 && (
                        <span className="x-pill">×{it.occurrences}</span>
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

function PrepSection({ groups }: { groups: PrepGroup[] }) {
  if (groups.length === 0) {
    return (
      <EmptyOutput
        title="No prep needed"
        message="Add meals to your week plan to see batch prep instructions."
      />
    );
  }
  return (
    <div>
      {groups.map((g) => {
        const totalMin = g.items.reduce(
          (s, i) => s + (i.prep_time_minutes ?? 0) * i.batches,
          0
        );
        return (
          <div className="card prep-group" key={g.method}>
            <div className="group-head">
              <div className="ic">
                <IconFire size={20} />
              </div>
              <div>
                <h3>{g.method}</h3>
                <div className="meta">
                  {g.items.length} dish{g.items.length === 1 ? '' : 'es'} — cook
                  these together to save time
                </div>
              </div>
              {totalMin > 0 && (
                <div className="total-time">
                  <span className="lbl">Total</span>~{totalMin} min
                </div>
              )}
            </div>
            {g.items.map((it) => (
              <div className="prep-item" key={it.meal_id}>
                <div className="top">
                  <div>
                    <h4>{it.meal_name}</h4>
                    <div className="sub">
                      {it.batches} batch{it.batches === 1 ? '' : 'es'} · yields{' '}
                      {it.total_yield} servings
                      {it.prep_time_minutes
                        ? ` · ~${it.prep_time_minutes * it.batches} min`
                        : ''}
                    </div>
                  </div>
                  <span className="batch-pill">×{it.batches}</span>
                </div>
                <ul>
                  {it.ingredients.map((ing, i) => (
                    <li key={i}>
                      <span className="ing-name">{ing.name}</span>
                      <span className="ing-qty">{ing.quantity_total}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function PortioningSection({
  items,
  mealById,
}: {
  items: PortioningSheetResponse['items'];
  mealById: (id: number) => Meal | null;
}) {
  if (items.length === 0) {
    return (
      <EmptyOutput
        title="Nothing to portion"
        message="Add meals to your week plan to see portioning amounts."
      />
    );
  }
  return (
    <div className="portion-grid">
      {items.map((it) => {
        const meal = mealById(it.meal_id);
        const excess = it.total_yield - it.total_servings_needed;
        return (
          <div className="card portion-card" key={it.meal_id}>
            <div className="top">
              <div className="thumb">
                {meal && <MealThumb meal={meal} size="xl" />}
              </div>
              <div>
                <div className="name">{it.meal_name}</div>
                <div className="sub">
                  {it.batches} batch{it.batches === 1 ? '' : 'es'} ·{' '}
                  {it.servings_per_batch} per batch
                </div>
              </div>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="l">Yield</div>
                <div className="v">{it.total_yield}</div>
              </div>
              <div className="stat">
                <div className="l">Needed</div>
                <div className="v">{it.total_servings_needed}</div>
              </div>
              <div className={cn('stat', excess > 0 && 'good')}>
                <div className="l">Extra</div>
                <div className="v">{excess}</div>
              </div>
            </div>
            <div className="divide">
              <div className="l">Divide each batch into</div>
              <div className="v">
                {it.servings_per_batch}
                <span className="u">containers</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyOutput({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

function PrintSheets({
  weekStartISO,
  grocery,
  prep,
  portion,
  onClose,
}: {
  weekStartISO: string;
  grocery: GroceryListResponse;
  prep: PrepSheetResponse;
  portion: PortioningSheetResponse;
  onClose: () => void;
}) {
  const range = formatWeekRange(weekStartISO);
  const printedOn = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const groceryGroups = Object.entries(grocery.groups);
  const totalItems = groceryGroups.reduce(
    (s, [, items]) => s + items.length,
    0
  );
  const totalBatches = prep.groups.reduce(
    (s, g) => s + g.items.reduce((a, i) => a + i.batches, 0),
    0
  );

  return (
    <div className="print-sheets">
      <div className="print-toolbar no-print">
        <div className="pt-meta">
          <span className="eyebrow">Print preview</span>
          <span className="sep">·</span>
          <span>3 sheets, ready to print</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            Print again
          </button>
        </div>
      </div>

      {/* SHEET 1 — GROCERY */}
      <section className="print-sheet">
        <header className="print-head">
          <div className="brand">Mise</div>
          <div className="sheet-meta">
            <div className="lbl">Sheet 1 of 3</div>
            <div className="title">Grocery list</div>
            <div className="sub">
              {range} · Printed {printedOn}
            </div>
          </div>
          <div className="totals">
            <div>
              <b>{totalItems}</b>
              <span>items</span>
            </div>
            <div>
              <b>{groceryGroups.length}</b>
              <span>categories</span>
            </div>
          </div>
        </header>

        {groceryGroups.length === 0 ? (
          <div className="print-empty">Nothing to shop for.</div>
        ) : (
          <div className="print-grocery">
            {groceryGroups.map(([cat, items]) => (
              <div className="pg-cat" key={cat}>
                <h3>{cat}</h3>
                <ul>
                  {items.map((it) => (
                    <li key={it.name}>
                      <span className="box" />
                      <span className="nm">{it.name}</span>
                      {it.quantity_description && (
                        <span className="qt">
                          {it.quantity_description}
                          {it.occurrences > 1
                            ? ` (×${it.occurrences})`
                            : ''}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <footer className="print-foot">Mise · Grocery · {range}</footer>
      </section>

      {/* SHEET 2 — PREP */}
      <section className="print-sheet">
        <header className="print-head">
          <div className="brand">Mise</div>
          <div className="sheet-meta">
            <div className="lbl">Sheet 2 of 3</div>
            <div className="title">Prep sheet</div>
            <div className="sub">
              {range} · {totalBatches} batch
              {totalBatches === 1 ? '' : 'es'} total
            </div>
          </div>
          <div className="totals">
            <div>
              <b>{prep.groups.length}</b>
              <span>methods</span>
            </div>
            <div>
              <b>
                {prep.groups.reduce((s, g) => s + g.items.length, 0)}
              </b>
              <span>dishes</span>
            </div>
          </div>
        </header>

        {prep.groups.length === 0 ? (
          <div className="print-empty">No prep planned.</div>
        ) : (
          <div className="print-prep">
            {prep.groups.map((g) => {
              const totalMin = g.items.reduce(
                (s, i) => s + (i.prep_time_minutes ?? 0) * i.batches,
                0
              );
              return (
                <div className="pp-group" key={g.method}>
                  <div className="pp-head">
                    <h3>{g.method}</h3>
                    <div className="pp-meta">
                      {g.items.length} dish
                      {g.items.length === 1 ? '' : 'es'}
                      {totalMin ? ` · ~${totalMin} min` : ''}
                    </div>
                  </div>
                  {g.items.map((it) => (
                    <div className="pp-item" key={it.meal_id}>
                      <div className="pp-top">
                        <h4>{it.meal_name}</h4>
                        <div className="pp-sub">
                          <span>
                            ×{it.batches} batch
                            {it.batches === 1 ? '' : 'es'}
                          </span>
                          <span>· yields {it.total_yield}</span>
                          {it.prep_time_minutes ? (
                            <span>
                              · ~{it.prep_time_minutes * it.batches} min
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <ul>
                        {it.ingredients.map((ing, i) => (
                          <li key={i}>
                            <span className="box" />
                            <span className="nm">{ing.name}</span>
                            <span className="qt">{ing.quantity_total}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        <footer className="print-foot">Mise · Prep · {range}</footer>
      </section>

      {/* SHEET 3 — PORTIONING */}
      <section className="print-sheet">
        <header className="print-head">
          <div className="brand">Mise</div>
          <div className="sheet-meta">
            <div className="lbl">Sheet 3 of 3</div>
            <div className="title">Portioning</div>
            <div className="sub">
              {range} · {portion.items.length} dish
              {portion.items.length === 1 ? '' : 'es'} to divide
            </div>
          </div>
          <div className="totals">
            <div>
              <b>
                {portion.items.reduce((s, i) => s + i.total_yield, 0)}
              </b>
              <span>servings</span>
            </div>
            <div>
              <b>
                {portion.items.reduce(
                  (s, i) =>
                    s + Math.max(0, i.total_yield - i.total_servings_needed),
                  0
                )}
              </b>
              <span>extra</span>
            </div>
          </div>
        </header>

        {portion.items.length === 0 ? (
          <div className="print-empty">Nothing to portion.</div>
        ) : (
          <table className="print-portion">
            <thead>
              <tr>
                <th>Dish</th>
                <th className="num">Batches</th>
                <th className="num">Per batch</th>
                <th className="num">Yield</th>
                <th className="num">Needed</th>
                <th className="num">Extra</th>
              </tr>
            </thead>
            <tbody>
              {portion.items.map((it) => {
                const extra = it.total_yield - it.total_servings_needed;
                return (
                  <tr key={it.meal_id}>
                    <td>{it.meal_name}</td>
                    <td className="num">×{it.batches}</td>
                    <td className="num">{it.servings_per_batch}</td>
                    <td className="num">{it.total_yield}</td>
                    <td className="num">{it.total_servings_needed}</td>
                    <td className="num">{fmt(extra)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <footer className="print-foot">Mise · Portioning · {range}</footer>
      </section>
    </div>
  );
}
