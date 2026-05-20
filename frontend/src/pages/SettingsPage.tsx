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

  const totalsCal = useMemo(() => {
    if (!draft) return 0;
    const per = draft.per_day.reduce((s, d) => s + (d.calories ?? 0), 0);
    return per;
  }, [draft]);

  if (!draft) return <div className="text-sm text-black/45">Loading settings…</div>;

  function setDefault(key: keyof FullSettings['defaults'], val: number) {
    setDraft((d) =>
      d ? { ...d, defaults: { ...d.defaults, [key]: val } } : d
    );
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

  function setDayTarget(day: number, key: keyof Omit<DayTarget, 'day_of_week'>, val: number | null) {
    setDraft((d) => {
      if (!d) return d;
      const list = [...d.per_day];
      const idx = list.findIndex((x) => x.day_of_week === day);
      const next: DayTarget = {
        ...(idx >= 0 ? list[idx] : { day_of_week: day, calories: null, protein_g: null, carbs_g: null, fat_g: null }),
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
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-black/55 mt-1">
          Set your daily targets. Use per-day overrides for training vs. rest days.
        </p>
      </header>

      <section className="card p-6 space-y-4">
        <div>
          <h2 className="font-bold tracking-tight">Default daily targets</h2>
          <p className="text-xs text-black/55 mt-0.5">
            Applied to every day unless overridden below.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      </section>

      <section className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.05] flex items-baseline justify-between">
          <div>
            <h2 className="font-bold tracking-tight">Per-day overrides</h2>
            <p className="text-xs text-black/55 mt-0.5">
              Leave fields blank to inherit the default.
            </p>
          </div>
          <p className="text-xs text-black/55 tabular-nums">
            Weekly override total: {fmt(totalsCal, 0)} kcal
          </p>
        </div>
        <div className="divide-y divide-black/[0.05]">
          <div className="grid grid-cols-[160px_repeat(4,1fr)_auto] gap-3 px-6 py-2 text-[10px] uppercase tracking-wider font-bold text-black/55 bg-canvas-subtle/40">
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
              t.calories != null || t.protein_g != null || t.carbs_g != null || t.fat_g != null;
            return (
              <div
                key={day}
                className="grid grid-cols-[160px_repeat(4,1fr)_auto] gap-3 px-6 py-3 items-center"
              >
                <div className="text-sm font-semibold flex items-center gap-2">
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
                <button
                  onClick={() => clearDayOverride(day)}
                  disabled={!hasOverride}
                  className={cn(
                    'text-xs font-semibold rounded-lg px-2 py-1 transition-colors',
                    hasOverride
                      ? 'text-black/55 hover:text-canvas-ink hover:bg-black/[0.05]'
                      : 'text-black/20'
                  )}
                >
                  Clear
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-black/45 flex items-center gap-1">
          <IconSparkle size={12} /> Tip: most lifters benefit from higher protein on training days.
        </p>
        <button
          className="btn-primary"
          onClick={save}
          disabled={saving}
        >
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
    <div className="rounded-2xl border border-black/[0.06] p-4">
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
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  );
}
