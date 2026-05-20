import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { DayTarget, FullSettings } from '@/lib/types';
import { DAY_LABELS_LONG, cn, fmt } from '@/lib/utils';

export function SettingsPage() {
  const { settings, updateSettings } = useStore();
  const [draft, setDraft] = useState<FullSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setDraft(structuredClone(settings));
  }, [settings]);

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

  if (!draft)
    return (
      <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
        Loading settings…
      </div>
    );

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
      d
        ? { ...d, per_day: d.per_day.filter((x) => x.day_of_week !== day) }
        : d
    );
  }

  function copyDefaultsTo(day: number) {
    if (!draft) return;
    setDayTarget(day, 'calories', draft.defaults.default_calories);
    setDayTarget(day, 'protein_g', draft.defaults.default_protein_g);
    setDayTarget(day, 'carbs_g', draft.defaults.default_carbs_g);
    setDayTarget(day, 'fat_g', draft.defaults.default_fat_g);
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
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 80 }}>
      <div className="page-head">
        <div className="page-head-row">
          <div className="eyebrow">Settings</div>
        </div>
        <div className="title-block">
          <h1>
            <span className="italic">Daily</span> targets
          </h1>
          <p className="sub">
            Set your defaults, then override individual days for training vs.
            rest.
          </p>
        </div>
      </div>

      <section className="settings-grid">
        <div className="card" style={{ padding: 22 }}>
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 600,
              fontSize: 20,
            }}
          >
            Default daily targets
          </h2>
          <p
            style={{
              fontSize: 12,
              color: 'var(--ink-3)',
              marginTop: 4,
              marginBottom: 18,
            }}
          >
            Applied to every day unless overridden below.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
            }}
          >
            <TargetField
              label="Calories"
              unit="kcal"
              value={draft.defaults.default_calories}
              onChange={(v) => setDefault('default_calories', v)}
              color="var(--ink)"
            />
            <TargetField
              label="Protein"
              unit="g"
              value={draft.defaults.default_protein_g}
              onChange={(v) => setDefault('default_protein_g', v)}
              color="var(--terracotta)"
            />
            <TargetField
              label="Carbs"
              unit="g"
              value={draft.defaults.default_carbs_g}
              onChange={(v) => setDefault('default_carbs_g', v)}
              color="var(--mustard)"
            />
            <TargetField
              label="Fat"
              unit="g"
              value={draft.defaults.default_fat_g}
              onChange={(v) => setDefault('default_fat_g', v)}
              color="var(--plum)"
            />
          </div>
        </div>

        <div className="card split-card">
          <h3
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 600,
              fontSize: 17,
            }}
          >
            Macro split
          </h3>
          <p
            style={{
              fontSize: 12,
              color: 'var(--ink-3)',
              marginTop: 4,
            }}
          >
            Based on your default macros ({fmt(split.totalKcal, 0)} kcal)
          </p>
          <div className="bar-stack">
            <div
              style={{
                background: 'var(--terracotta)',
                width: `${split.p}%`,
                height: '100%',
              }}
            />
            <div
              style={{
                background: 'var(--mustard)',
                width: `${split.c}%`,
                height: '100%',
              }}
            />
            <div
              style={{
                background: 'var(--plum)',
                width: `${split.f}%`,
                height: '100%',
              }}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <SplitRow
              color="var(--terracotta)"
              label="Protein"
              pct={split.p}
              grams={draft.defaults.default_protein_g}
            />
            <SplitRow
              color="var(--mustard)"
              label="Carbs"
              pct={split.c}
              grams={draft.defaults.default_carbs_g}
            />
            <SplitRow
              color="var(--plum)"
              label="Fat"
              pct={split.f}
              grams={draft.defaults.default_fat_g}
            />
          </div>
        </div>
      </section>

      <section className="overrides">
        <div className="o-head">
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 600,
              fontSize: 20,
            }}
          >
            Per-day overrides
          </h2>
          <p
            style={{
              fontSize: 12,
              color: 'var(--ink-3)',
              marginTop: 4,
            }}
          >
            Leave fields blank to inherit the default.
          </p>
        </div>
        <div className="o-row header">
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
              className={cn('o-row', hasOverride && 'has-override')}
            >
              <div
                className={cn('day-cell', hasOverride && 'has-override')}
              >
                <span className="dot" />
                {DAY_LABELS_LONG[day]}
                {hasOverride && <span className="tag">Override</span>}
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
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => clearDayOverride(day)}
                  style={{ padding: '4px 8px', fontSize: 11 }}
                >
                  Clear
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => copyDefaultsTo(day)}
                  style={{ padding: '4px 8px', fontSize: 11 }}
                >
                  Override
                </button>
              )}
            </div>
          );
        })}
      </section>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
          position: 'sticky',
          bottom: 16,
          marginTop: 22,
          zIndex: 20,
        }}
      >
        <button
          type="button"
          className="btn btn-primary"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}

function TargetField({
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
    <div className="target-field">
      <div className="lbl">
        <span className="dot" style={{ background: color }} />
        {label}
      </div>
      <div className="val-row">
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
        <span className="u">{unit}</span>
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
      className="input sm numeric"
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
    <div className="row-line">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
          }}
        />
        <span style={{ fontWeight: 600 }}>{label}</span>
      </div>
      <div className="num" style={{ color: 'var(--ink-3)' }}>
        <span style={{ color: 'var(--ink)', fontWeight: 700 }}>
          {fmt(pct, 0)}%
        </span>
        <span style={{ color: 'var(--muted-2)', margin: '0 6px' }}>·</span>
        <span>{fmt(grams, 0)} g</span>
      </div>
    </div>
  );
}
