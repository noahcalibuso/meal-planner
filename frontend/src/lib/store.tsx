import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  FullSettings,
  Meal,
  MealInput,
  PlannedMeal,
  WeekPlan,
} from './types';
import { api } from './api';
import { startOfWeek, toISODate } from './utils';

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface StoreValue {
  meals: Meal[];
  settings: FullSettings | null;
  weekStartISO: string;
  setWeekStartISO: (s: string) => void;
  weekPlan: WeekPlan | null;
  loadingMeals: boolean;
  loadingWeekPlan: boolean;
  refreshMeals: () => Promise<void>;
  createMeal: (data: MealInput, image?: File | null) => Promise<Meal>;
  updateMeal: (id: number, data: MealInput, image?: File | null, removeImage?: boolean) => Promise<Meal>;
  deleteMeal: (id: number) => Promise<void>;
  updateSettings: (data: FullSettings) => Promise<void>;
  setPlannedMeals: (next: PlannedMeal[]) => void;
  toasts: Toast[];
  toast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [settings, setSettings] = useState<FullSettings | null>(null);
  const [weekStartISO, setWeekStartISOState] = useState<string>(() =>
    toISODate(startOfWeek(new Date()))
  );
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [loadingWeekPlan, setLoadingWeekPlan] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }, []);
  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const refreshMeals = useCallback(async () => {
    setLoadingMeals(true);
    try {
      const list = await api.listMeals();
      setMeals(list);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoadingMeals(false);
    }
  }, [toast]);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }, [toast]);

  const refreshWeekPlan = useCallback(
    async (iso: string) => {
      setLoadingWeekPlan(true);
      try {
        const wp = await api.getWeekPlan(iso);
        setWeekPlan(wp);
      } catch (e) {
        toast((e as Error).message, 'error');
      } finally {
        setLoadingWeekPlan(false);
      }
    },
    [toast]
  );

  // Initial load
  useEffect(() => {
    refreshMeals();
    refreshSettings();
  }, [refreshMeals, refreshSettings]);

  useEffect(() => {
    refreshWeekPlan(weekStartISO);
  }, [weekStartISO, refreshWeekPlan]);

  // Optimistic plan sync
  const planSaveTimer = useRef<number | null>(null);
  const setPlannedMeals = useCallback(
    (next: PlannedMeal[]) => {
      setWeekPlan((wp) =>
        wp
          ? {
              ...wp,
              planned_meals: next.map((p, i) => ({ ...p, position_in_day: p.position_in_day ?? i })),
            }
          : wp
      );
      if (planSaveTimer.current) window.clearTimeout(planSaveTimer.current);
      planSaveTimer.current = window.setTimeout(async () => {
        try {
          const saved = await api.saveWeekPlan(weekStartISO, next);
          setWeekPlan(saved);
        } catch (e) {
          toast((e as Error).message, 'error');
        }
      }, 200);
    },
    [weekStartISO, toast]
  );

  const setWeekStartISO = useCallback((s: string) => {
    setWeekStartISOState(s);
  }, []);

  const createMeal = useCallback(
    async (data: MealInput, image?: File | null) => {
      const created = await api.createMeal(data);
      let finalMeal = created;
      if (image) {
        try {
          finalMeal = await api.uploadMealImage(created.id, image);
        } catch (e) {
          toast(`Image upload failed: ${(e as Error).message}`, 'error');
        }
      }
      setMeals((ms) => [...ms, finalMeal].sort((a, b) => a.name.localeCompare(b.name)));
      toast(`Created "${finalMeal.name}"`, 'success');
      return finalMeal;
    },
    [toast]
  );

  const updateMeal = useCallback(
    async (id: number, data: MealInput, image?: File | null, removeImage?: boolean) => {
      let updated = await api.updateMeal(id, data);
      if (removeImage && updated.photo_path) {
        updated = await api.deleteMealImage(id);
      }
      if (image) {
        try {
          updated = await api.uploadMealImage(id, image);
        } catch (e) {
          toast(`Image upload failed: ${(e as Error).message}`, 'error');
        }
      }
      const finalMeal = updated;
      setMeals((ms) =>
        ms.map((m) => (m.id === id ? finalMeal : m)).sort((a, b) => a.name.localeCompare(b.name))
      );
      toast(`Updated "${finalMeal.name}"`, 'success');
      return finalMeal;
    },
    [toast]
  );

  const deleteMeal = useCallback(
    async (id: number) => {
      await api.deleteMeal(id);
      setMeals((ms) => ms.filter((m) => m.id !== id));
      // Remove from current plan locally if present
      setWeekPlan((wp) =>
        wp ? { ...wp, planned_meals: wp.planned_meals.filter((p) => p.meal_id !== id) } : wp
      );
      toast('Meal deleted', 'success');
    },
    [toast]
  );

  const updateSettings = useCallback(
    async (data: FullSettings) => {
      const s = await api.updateSettings(data);
      setSettings(s);
      toast('Settings saved', 'success');
    },
    [toast]
  );

  const value = useMemo<StoreValue>(
    () => ({
      meals,
      settings,
      weekStartISO,
      setWeekStartISO,
      weekPlan,
      loadingMeals,
      loadingWeekPlan,
      refreshMeals,
      createMeal,
      updateMeal,
      deleteMeal,
      updateSettings,
      setPlannedMeals,
      toasts,
      toast,
      dismissToast,
    }),
    [
      meals,
      settings,
      weekStartISO,
      setWeekStartISO,
      weekPlan,
      loadingMeals,
      loadingWeekPlan,
      refreshMeals,
      createMeal,
      updateMeal,
      deleteMeal,
      updateSettings,
      setPlannedMeals,
      toasts,
      toast,
      dismissToast,
    ]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}
