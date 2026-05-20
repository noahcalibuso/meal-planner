import { useEffect, useMemo, useRef, useState } from 'react';
import type { Ingredient, Meal, MealInput } from '@/lib/types';
import { Modal } from './Modal';
import { IconClose, IconImage, IconPlus, IconTrash } from './Icons';
import { fileUrl, fmt } from '@/lib/utils';

interface Props {
  open: boolean;
  meal: Meal | null;
  onClose: () => void;
  onSubmit: (
    data: MealInput,
    image?: File | null,
    removeImage?: boolean
  ) => Promise<void>;
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
      setImagePreview(
        meal.photo_path ? fileUrl(meal.photo_path) || null : null
      );
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
      eyebrow={meal ? 'Edit meal card' : 'New meal card'}
      title={
        meal ? (
          <>
            <span className="italic">{meal.name}</span>
          </>
        ) : (
          <>
            A <span className="italic">new</span> meal
          </>
        )
      }
      footer={
        <>
          <span
            style={{ fontSize: 12, color: 'var(--ink-3)' }}
          >
            Per-serving macros update as you add ingredients.
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-accent"
              onClick={submit}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Saving…' : meal ? 'Save changes' : 'Create meal'}
            </button>
          </div>
        </>
      }
    >
      <div className="editor-grid">
        <div className="editor-left">
          <div
            className="photo-drop"
            onClick={() => fileRef.current?.click()}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt={name || 'meal'} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearImage();
                  }}
                  className="icon-btn"
                  aria-label="Remove image"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(26,20,13,0.7)',
                    color: '#faf2dc',
                  }}
                >
                  <IconClose size={14} />
                </button>
              </>
            ) : (
              <div className="placeholder">
                <IconImage size={28} />
                <p className="it">Click to add a photo</p>
                <p className="sub">PNG, JPG, WEBP</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleImage}
              className="hidden"
              style={{ display: 'none' }}
            />
          </div>

          <div>
            <label className="field-label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Honey-Garlic Chicken Bowl"
            />
          </div>

          <div className="basics-row">
            <div>
              <label className="field-label">Servings per batch</label>
              <input
                className="input numeric"
                type="number"
                min={1}
                value={servingCount}
                onChange={(e) => setServingCount(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="field-label">Prep (min)</label>
              <input
                className="input numeric"
                type="number"
                min={0}
                value={prepTime}
                onChange={(e) =>
                  setPrepTime(
                    e.target.value === '' ? '' : Number(e.target.value)
                  )
                }
                placeholder="30"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Tags</label>
            <div className="tags-input">
              {tags.map((t) => (
                <span key={t} className="chip">
                  {t}
                  <button type="button" onClick={() => removeTag(t)}>
                    <IconClose size={10} />
                  </button>
                </span>
              ))}
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagsInput);
                    setTagsInput('');
                  } else if (
                    e.key === 'Backspace' &&
                    !tagsInput &&
                    tags.length
                  ) {
                    setTags(tags.slice(0, -1));
                  }
                }}
                onBlur={() => {
                  if (tagsInput.trim()) {
                    addTag(tagsInput);
                    setTagsInput('');
                  }
                }}
                placeholder={tags.length ? '' : 'oven, chicken, …'}
              />
            </div>
            <p
              style={{
                fontSize: 11,
                color: 'var(--ink-3)',
                marginTop: 6,
              }}
            >
              Press Enter or comma to add. Use cooking-method tags like oven,
              stovetop, no-cook for smart prep grouping.
            </p>
          </div>

          <div>
            <label className="field-label">Notes</label>
            <textarea
              className="textarea"
              style={{ minHeight: 72 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember (substitutions, sauces, etc.)"
            />
          </div>
        </div>

        <div className="editor-right">
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <h3
              style={{
                fontFamily: 'Newsreader, serif',
                fontWeight: 600,
                fontSize: 22,
              }}
            >
              Ingredients
            </h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={addIng}
            >
              <IconPlus size={12} /> Add ingredient
            </button>
          </div>

          <div className="ing-list">
            {ingredients.length === 0 && (
              <div className="empty-state" style={{ padding: 40 }}>
                <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                  No ingredients yet. Click "Add ingredient" to begin.
                </p>
              </div>
            )}
            {ingredients.map((ing, idx) => (
              <div className="ing-row" key={idx}>
                <input
                  className="input sm"
                  value={ing.name}
                  onChange={(e) => updateIng(idx, { name: e.target.value })}
                  placeholder="Chicken thigh"
                />
                <input
                  className="input sm"
                  value={ing.quantity_description}
                  onChange={(e) =>
                    updateIng(idx, { quantity_description: e.target.value })
                  }
                  placeholder="1 lb"
                />
                <select
                  className="select sm"
                  value={ing.category}
                  onChange={(e) =>
                    updateIng(idx, { category: e.target.value })
                  }
                  style={{
                    textTransform: 'capitalize',
                    padding: '7px 10px',
                    fontSize: 12.5,
                  }}
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
                  placeholder="Cal"
                />
                <NumberCell
                  value={ing.protein_g}
                  onChange={(v) => updateIng(idx, { protein_g: v })}
                  placeholder="P"
                />
                <NumberCell
                  value={ing.carbs_g}
                  onChange={(v) => updateIng(idx, { carbs_g: v })}
                  placeholder="C"
                />
                <NumberCell
                  value={ing.fat_g}
                  onChange={(v) => updateIng(idx, { fat_g: v })}
                  placeholder="F"
                />
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => removeIng(idx)}
                  aria-label="Remove"
                  style={{ width: 28, height: 28 }}
                >
                  <IconTrash size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="totals-block">
            <div className="tile batch">
              <h4>Whole batch</h4>
              <p className="h-sub">
                {servingCount || 1} serving{servingCount === 1 ? '' : 's'}
              </p>
              <div className="stat-row">
                <span>Calories</span>
                <span className="v">{fmt(totals.cal, 0)} kcal</span>
              </div>
              <div className="stat-row">
                <span>Protein</span>
                <span className="v">{fmt(totals.p, 1)} g</span>
              </div>
              <div className="stat-row">
                <span>Carbs</span>
                <span className="v">{fmt(totals.c, 1)} g</span>
              </div>
              <div className="stat-row">
                <span>Fat</span>
                <span className="v">{fmt(totals.f, 1)} g</span>
              </div>
            </div>
            <div className="tile serving">
              <h4>Per serving</h4>
              <p className="h-sub">What lands on the plate</p>
              <div className="stat-row">
                <span>Calories</span>
                <span className="v">{fmt(totals.perCal, 0)} kcal</span>
              </div>
              <div className="stat-row">
                <span>Protein</span>
                <span className="v">{fmt(totals.perP, 1)} g</span>
              </div>
              <div className="stat-row">
                <span>Carbs</span>
                <span className="v">{fmt(totals.perC, 1)} g</span>
              </div>
              <div className="stat-row">
                <span>Fat</span>
                <span className="v">{fmt(totals.perF, 1)} g</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function NumberCell({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min={0}
      step="0.1"
      value={value === 0 ? '' : value}
      onChange={(e) =>
        onChange(e.target.value === '' ? 0 : Number(e.target.value))
      }
      className="macro-mini-input"
      placeholder={placeholder ?? '0'}
    />
  );
}
