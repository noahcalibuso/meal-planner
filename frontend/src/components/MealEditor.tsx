import { useEffect, useMemo, useRef, useState } from 'react';
import type { Ingredient, Meal, MealInput } from '@/lib/types';
import { Modal } from './Modal';
import { IconClose, IconImage, IconPlus, IconTrash } from './Icons';
import { fileUrl, fmt } from '@/lib/utils';

interface Props {
  open: boolean;
  meal: Meal | null;
  onClose: () => void;
  onSubmit: (data: MealInput, image?: File | null, removeImage?: boolean) => Promise<void>;
}

const CATEGORIES = [
  'protein',
  'produce',
  'dairy',
  'grains',
  'pantry',
  'frozen',
  'condiments',
  'beverages',
];

const blankIng = (): Omit<Ingredient, 'id'> => ({
  name: '',
  quantity_description: '',
  category: 'pantry',
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
});

export function MealEditor({ open, meal, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [servingCount, setServingCount] = useState(4);
  const [prepTime, setPrepTime] = useState<number | ''>('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState<Omit<Ingredient, 'id'>[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removedImage, setRemovedImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (meal) {
      setName(meal.name);
      setServingCount(meal.serving_count);
      setPrepTime(meal.prep_time_minutes ?? '');
      setTags(meal.tags);
      setNotes(meal.notes ?? '');
      setIngredients(meal.ingredients.map((i) => ({ ...i })));
      setImagePreview(meal.photo_path ? fileUrl(meal.photo_path) || null : null);
    } else {
      setName('');
      setServingCount(4);
      setPrepTime('');
      setTags([]);
      setNotes('');
      setIngredients([blankIng()]);
      setImagePreview(null);
    }
    setImageFile(null);
    setRemovedImage(false);
    setTagsInput('');
  }, [open, meal]);

  const totals = useMemo(() => {
    const t = ingredients.reduce(
      (acc, i) => {
        acc.cal += Number(i.calories) || 0;
        acc.p += Number(i.protein_g) || 0;
        acc.c += Number(i.carbs_g) || 0;
        acc.f += Number(i.fat_g) || 0;
        return acc;
      },
      { cal: 0, p: 0, c: 0, f: 0 }
    );
    const sc = Math.max(1, servingCount || 1);
    return {
      ...t,
      perCal: t.cal / sc,
      perP: t.p / sc,
      perC: t.c / sc,
      perF: t.f / sc,
    };
  }, [ingredients, servingCount]);

  function addTag(raw: string) {
    const v = raw.trim().toLowerCase();
    if (!v) return;
    if (tags.includes(v)) return;
    setTags([...tags, v]);
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function updateIng(idx: number, patch: Partial<Omit<Ingredient, 'id'>>) {
    setIngredients((prev) =>
      prev.map((i, n) => (n === idx ? { ...i, ...patch } : i))
    );
  }

  function removeIng(idx: number) {
    setIngredients((prev) => prev.filter((_, n) => n !== idx));
  }

  function addIng() {
    setIngredients((prev) => [...prev, blankIng()]);
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setImageFile(f);
    setRemovedImage(false);
    if (f) {
      const url = URL.createObjectURL(f);
      setImagePreview(url);
    }
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setRemovedImage(true);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload: MealInput = {
        name: name.trim(),
        serving_count: Math.max(1, Number(servingCount) || 1),
        prep_time_minutes: prepTime === '' ? null : Number(prepTime),
        tags,
        notes: notes.trim() || null,
        ingredients: ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            ...i,
            calories: Number(i.calories) || 0,
            protein_g: Number(i.protein_g) || 0,
            carbs_g: Number(i.carbs_g) || 0,
            fat_g: Number(i.fat_g) || 0,
          })),
      };
      await onSubmit(payload, imageFile, removedImage);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={meal ? `Edit ${meal.name}` : 'New meal'}
      size="xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : meal ? 'Save changes' : 'Create meal'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT: photo + basics */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div
            className="relative aspect-square w-full rounded-2xl border border-dashed border-black/15 overflow-hidden bg-canvas-subtle group cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            {imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt={name || 'meal'}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearImage();
                  }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <IconClose size={14} />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-black/40 gap-2">
                <IconImage size={28} />
                <p className="text-sm font-medium">Click to upload photo</p>
                <p className="text-xs text-black/35">PNG, JPG, WEBP</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleImage}
              className="hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Honey-Garlic Chicken Bowl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label">Servings / batch</label>
              <input
                className="input"
                type="number"
                min={1}
                value={servingCount}
                onChange={(e) => setServingCount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className="label">Prep (min)</label>
              <input
                className="input"
                type="number"
                min={0}
                value={prepTime}
                onChange={(e) =>
                  setPrepTime(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="30"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="label">Tags</label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-black/10 bg-white px-2 py-1.5 min-h-[42px]">
              {tags.map((t) => (
                <span
                  key={t}
                  className="chip bg-brand-100 text-brand-800 pl-2 pr-1 py-1"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="ml-0.5 rounded-full hover:bg-brand-200 p-0.5"
                  >
                    <IconClose size={10} />
                  </button>
                </span>
              ))}
              <input
                className="flex-1 min-w-[100px] bg-transparent px-1 py-1 text-sm focus:outline-none"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagsInput);
                    setTagsInput('');
                  } else if (e.key === 'Backspace' && !tagsInput && tags.length) {
                    setTags(tags.slice(0, -1));
                  }
                }}
                onBlur={() => {
                  if (tagsInput.trim()) {
                    addTag(tagsInput);
                    setTagsInput('');
                  }
                }}
                placeholder={tags.length ? '' : 'oven, high-protein, chicken…'}
              />
            </div>
            <p className="text-[11px] text-black/45">Press Enter or comma to add. Use cooking-method tags like oven, stovetop, no-cook for smart prep grouping.</p>
          </div>

          <div className="space-y-1">
            <label className="label">Notes</label>
            <textarea
              className="input min-h-[72px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember (substitutions, sauces, etc.)"
            />
          </div>
        </div>

        {/* RIGHT: ingredients + totals */}
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold tracking-tight">Ingredients</h3>
            <button onClick={addIng} className="btn-ghost text-sm">
              <IconPlus size={14} /> Add ingredient
            </button>
          </div>

          <div className="rounded-xl border border-black/[0.06] overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_120px_72px_72px_72px_72px_40px] gap-2 px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-black/55 bg-canvas-subtle">
              <div>Name</div>
              <div>Quantity</div>
              <div>Category</div>
              <div className="text-right">Cal</div>
              <div className="text-right">P</div>
              <div className="text-right">C</div>
              <div className="text-right">F</div>
              <div />
            </div>
            <div className="divide-y divide-black/[0.05]">
              {ingredients.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-black/40">
                  No ingredients yet. Click "Add ingredient" to begin.
                </div>
              )}
              {ingredients.map((ing, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_120px_120px_72px_72px_72px_72px_40px] gap-2 px-3 py-1.5 items-center"
                >
                  <input
                    className="input !py-1.5 !text-sm"
                    value={ing.name}
                    onChange={(e) => updateIng(idx, { name: e.target.value })}
                    placeholder="Chicken thigh"
                  />
                  <input
                    className="input !py-1.5 !text-sm"
                    value={ing.quantity_description}
                    onChange={(e) =>
                      updateIng(idx, { quantity_description: e.target.value })
                    }
                    placeholder="1 lb"
                  />
                  <select
                    className="input !py-1.5 !text-sm capitalize"
                    value={ing.category}
                    onChange={(e) => updateIng(idx, { category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <NumberCell
                    value={ing.calories}
                    onChange={(v) => updateIng(idx, { calories: v })}
                  />
                  <NumberCell
                    value={ing.protein_g}
                    onChange={(v) => updateIng(idx, { protein_g: v })}
                  />
                  <NumberCell
                    value={ing.carbs_g}
                    onChange={(v) => updateIng(idx, { carbs_g: v })}
                  />
                  <NumberCell
                    value={ing.fat_g}
                    onChange={(v) => updateIng(idx, { fat_g: v })}
                  />
                  <button
                    onClick={() => removeIng(idx)}
                    className="rounded-lg p-1.5 text-black/40 hover:text-accent-rose hover:bg-rose-50"
                    aria-label="Remove"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SummaryTile label="Totals" sub={`Whole batch · ${servingCount || 1} servings`}>
              <SummaryRow label="Calories" v={`${fmt(totals.cal, 0)} kcal`} />
              <SummaryRow label="Protein" v={`${fmt(totals.p, 1)} g`} />
              <SummaryRow label="Carbs" v={`${fmt(totals.c, 1)} g`} />
              <SummaryRow label="Fat" v={`${fmt(totals.f, 1)} g`} />
            </SummaryTile>
            <SummaryTile label="Per serving" sub="What lands on the plate" highlight>
              <SummaryRow label="Calories" v={`${fmt(totals.perCal, 0)} kcal`} />
              <SummaryRow label="Protein" v={`${fmt(totals.perP, 1)} g`} />
              <SummaryRow label="Carbs" v={`${fmt(totals.perC, 1)} g`} />
              <SummaryRow label="Fat" v={`${fmt(totals.perF, 1)} g`} />
            </SummaryTile>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function NumberCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      step="0.1"
      value={value === 0 ? '' : value}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      className="input !py-1.5 !text-sm text-right tabular-nums"
      placeholder="0"
    />
  );
}

function SummaryTile({
  label,
  sub,
  children,
  highlight = false,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? 'bg-canvas-ink text-white border-canvas-ink' : 'bg-white border-black/[0.06]'
      }`}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
        {sub && <p className={`text-[10px] ${highlight ? 'text-white/60' : 'text-black/40'}`}>{sub}</p>}
      </div>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function SummaryRow({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="opacity-70">{label}</span>
      <span className="tabular-nums font-semibold">{v}</span>
    </div>
  );
}
