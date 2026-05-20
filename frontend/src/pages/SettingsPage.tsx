import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { DayTarget, FullSettings } from '@/lib/types';
import { DAY_LABELS_LONG, cn, fmt } from '@/lib/utils';
import { IconSparkle } from '@/components/Icons';

export function SettingsPage() {
  const { settings, updateSettings } = useStore();
  const [draft, setDraft] = useState<FullSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setDraft(structuredClone(settings));
  }, [settings]);

  // Macro split (% of calories) from default values
  const split = useMemo(() => {
    if (!draft) return { p: 0, c: 0, f: 0, totalKcal: 0 };
    const p = draft.defaults.default_protein_g * 4;
    const c = draft.defaults.default_carbs_g * 4;
    const f = draft.defaults.default_fat_g * 9;
    const total = p + c + f || 1;
    return {
      p: (p / total) * 100,
      c: (c / total) * 100,
      f: (f / total) * 100,
      totalKcal: p + c + f,
    };
  }, [draft]);

  if (!draft) return <div className="text-sm text-black/45">Loading settings…</div>;

  function setDefault(key: keyof FullSettings['defaults'], val: number) {
    setDraft((d) => (d ? { ...d, defaults: { ...d.defaults, [key]: val } } : d));
  }

  function getDayTarget(day: number): DayTarget {
    const found = draft!.per_day.find((d) => d.day_of_week === day);
    return (
      found ?? {
        day_of_week: day,
        calories: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
      }
    );
  }

  function setDayTarget(
    day: number,
    key: keyof Omit<DayTarget, 'day_of_week'>,
    val: number | null
  ) {
    setDraft((d) => {
      if (!d) return d;
      const list = [...d.per_day];
      const idx = list.findIndex((x) => x.day_of_week === day);
      const next: DayTarget = {
        ...(idx >= 0
          ? list[idx]
          : {
              day_of_week: day,
              calories: null,
              protein_g: null,
              carbs_g: null,
              fat_g: null,
            }),
        [key]: val,
      };
      if (idx >= 0) list[idx] = next;
      else list.push(next);
      return { ...d, per_day: list };
    });
  }

  function clearDayOverride(day: number) {
    setDraft((d) =>
      d ? { ...d, per_day: d.per_day.filter((x) => x.day_of_week !== day) } : d
    );
  }

  function copyDefaultsTo(day: number) {
    setDayTarget(day, 'calories', draft!.defaults.default_calories);
    setDayTarget(day, 'protein_g', draft!.defaults.default_protein_g);
    setDayTarget(day, 'carbs_g', draft!.defaults.default_carbs_g);
    setDayTarget(day, 'fat_g', draft!.defaults.default_fat_g);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await updateSettings(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl pb-20">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] font-bold text-black/40">
          Settings
        </p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Daily targets</h1>
        <p className="text-sm text-black/55 mt-1">
          Set your defaults, then override individual days for training vs. rest.
        </p>
      </header>

      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 card p-6 space-y-5">
          <div>
            <h2 className="font-bold tracking-tight">Default daily targets</h2>
            <p className="text-xs text-black/55 mt-0.5">
              Applied to every day unless overridden below.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field
              label="Calories"
              unit="kcal"
              value={draft.defaults.default_calories}
              onChange={(v) => setDefault('default_calories', v)}
              color="bg-canvas-ink"
            />
            <Field
              label="Protein"
              unit="g"
              value={draft.defaults.default_protein_g}
              onChange={(v) => setDefault('default_protein_g', v)}
              color="bg-accent-coral"
            />
            <Field
              label="Carbs"
              unit="g"
              value={draft.defaults.default_carbs_g}
              onChange={(v) => setDefault('default_carbs_g', v)}
              color="bg-accent-amber"
            />
            <Field
              label="Fat"
              unit="g"
              value={draft.defaults.default_fat_g}
              onChange={(v) => setDefault('default_fat_g', v)}
              color="bg-accent-plum"
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 card p-6">
          <h3 className="font-bold tracking-tight text-sm">Macro split</h3>
          <p className="text-xs text-black/55 mt-0.5">
            Based on your default macros ({fmt(split.totalKcal, 0)} kcal)
          </p>
          <div className="mt-4 h-3 rounded-full overflow-hidden flex">
            <div className="bg-accent-coral h-full" style={{ width: `${split.p}%` }} />
            <div className="bg-accent-amber h-full" style={{ width: `${split.c}%` }} />
            <div className="bg-accent-plum h-full" style={{ width: `${split.f}%` }} />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <SplitRow color="bg-accent-coral" label="Protein" pct={split.p} grams={draft.defaults.default_protein_g} />
            <SplitRow color="bg-accent-amber" label="Carbs" pct={split.c} grams={draft.defaults.default_carbs_g} />
            <SplitRow color="bg-accent-plum" label="Fat" pct={split.f} grams={draft.defaults.default_fat_g} />
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.05] flex items-baseline justify-between">
          <div>
            <h2 className="font-bold tracking-tight">Per-day overrides</h2>
            <p className="text-xs text-black/55 mt-0.5">
              Leave fields blank to inherit the default.
            </p>
          </div>
        </div>
        <div className="divide-y divide-black/[0.05]">
          <div className="grid grid-cols-[180px_repeat(4,1fr)_72px] gap-3 px-6 py-2 text-[10px] uppercase tracking-wider font-bold text-black/55 bg-canvas-subtle/40">
            <div>Day</div>
            <div>Calories</div>
            <div>Protein g</div>
            <div>Carbs g</div>
            <div>Fat g</div>
            <div />
          </div>
          {Array.from({ length: 7 }).map((_, day) => {
            const t = getDayTarget(day);
            const hasOverride =
              t.calories != null ||
              t.protein_g != null ||
              t.carbs_g != null ||
              t.fat_g != null;
            return (
              <div
                key={day}
                className={cn(
                  'grid grid-cols-[180px_repeat(4,1fr)_72px] gap-3 px-6 py-3 items-center transition-colors',
                  hasOverride && 'bg-brand-50/30'
                )}
              >
                <div className="text-sm font-semibold flex items-center gap-2">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      hasOverride ? 'bg-brand-500' : 'bg-black/15'
                    )}
                  />
                  {DAY_LABELS_LONG[day]}
                  {hasOverride && (
                    <span className="text-[9px] uppercase tracking-wider font-bold text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded">
                      Override
                    </span>
                  )}
                </div>
                <OverrideField
                  value={t.calories}
                  placeholder={fmt(draft.defaults.default_calories, 0)}
                  onChange={(v) => setDayTarget(day, 'calories', v)}
                />
                <OverrideField
                  value={t.protein_g}
                  placeholder={fmt(draft.defaults.default_protein_g, 0)}
                  onChange={(v) => setDayTarget(day, 'protein_g', v)}
                />
                <OverrideField
                  value={t.carbs_g}
                  placeholder={fmt(draft.defaults.default_carbs_g, 0)}
                  onChange={(v) => setDayTarget(day, 'carbs_g', v)}
                />
                <OverrideField
                  value={t.fat_g}
                  placeholder={fmt(draft.defaults.default_fat_g, 0)}
                  onChange={(v) => setDayTarget(day, 'fat_g', v)}
                />
                {hasOverride ? (
                  <button
                    onClick={() => clearDayOverride(day)}
                    className="text-[11px] font-semibold rounded-lg px-2 py-1 text-black/55 hover:text-canvas-ink hover:bg-black/[0.05] justify-self-end"
                  >
                    Clear
                  </button>
                ) : (
                  <button
                    onClick={() => copyDefaultsTo(day)}
                    className="text-[11px] font-semibold rounded-lg px-2 py-1 text-brand-700 hover:bg-brand-50 justify-self-end"
                  >
                    Override
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 sticky bottom-4 z-20">
        <p className="text-xs text-black/55 flex items-center gap-1.5 bg-white/80 backdrop-blur px-3 py-2 rounded-xl border border-black/[0.06] shadow-card">
          <IconSparkle size={12} className="text-brand-600" />
          Tip: higher-carb days fuel training; rest days can lean slightly lower-cal.
        </p>
        <button className="btn-primary shadow-card" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  unit,
  value,
  onChange,
  color,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] p-4 hover:border-black/15 transition-colors focus-within:border-canvas-ink focus-within:shadow-card">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-black/55">
        <span className={cn('h-2 w-2 rounded-full', color)} />
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-24 text-2xl font-bold tabular-nums bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
        />
        <span className="text-xs text-black/45 font-semibold">{unit}</span>
      </div>
    </div>
  );
}

function OverrideField({
  value,
  placeholder,
  onChange,
}: {
  value: number | null;
  placeholder: string;
  onChange: (v: number | null) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      className="input !py-1.5 !text-sm tabular-nums"
      value={value == null ? '' : value}
      placeholder={placeholder}
      onChange={(e) =>
        onChange(e.target.value === '' ? null : Number(e.target.value))
      }
    />
  );
}

function SplitRow({
  color,
  label,
  pct,
  grams,
}: {
  color: string;
  label: string;
  pct: number;
  grams: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        <span className={cn('h-1.5 w-1.5 rounded-full', color)} />
        <span className="font-semibold">{label}</span>
      </div>
      <div className="tabular-nums text-black/65">
        <span className="font-bold text-canvas-ink">{fmt(pct, 0)}%</span>
        <span className="text-black/40 mx-1">·</span>
        <span>{fmt(grams, 0)} g</span>
      </div>
    </div>
  );
}
