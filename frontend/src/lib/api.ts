import type {
  FullSettings,
  GroceryListResponse,
  Meal,
  MealInput,
  PortioningSheetResponse,
  PrepSheetResponse,
  WeekPlan,
  PlannedMeal,
} from './types';

const BASE = '/api';

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Meals
  listMeals: () => request<Meal[]>('/meals'),
  getMeal: (id: number) => request<Meal>(`/meals/${id}`),
  createMeal: (data: MealInput) =>
    request<Meal>('/meals', { method: 'POST', body: JSON.stringify(data) }),
  updateMeal: (id: number, data: MealInput) =>
    request<Meal>(`/meals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMeal: (id: number) =>
    request<void>(`/meals/${id}`, { method: 'DELETE' }),
  uploadMealImage: async (id: number, file: File): Promise<Meal> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE}/meals/${id}/image`, {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  },
  deleteMealImage: (id: number) =>
    request<Meal>(`/meals/${id}/image`, { method: 'DELETE' }),

  // Settings
  getSettings: () => request<FullSettings>('/settings'),
  updateSettings: (data: FullSettings) =>
    request<FullSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Week plans
  getWeekPlan: (weekStart: string) =>
    request<WeekPlan>(`/week-plans/${weekStart}`),
  saveWeekPlan: (weekStart: string, plannedMeals: PlannedMeal[]) =>
    request<WeekPlan>(`/week-plans/${weekStart}`, {
      method: 'PUT',
      body: JSON.stringify({
        week_start_date: weekStart,
        planned_meals: plannedMeals.map((p) => ({
          meal_id: p.meal_id,
          day_of_week: p.day_of_week,
          position_in_day: p.position_in_day,
        })),
      }),
    }),
  groceryList: (weekStart: string) =>
    request<GroceryListResponse>(`/week-plans/${weekStart}/grocery-list`),
  prepSheet: (weekStart: string) =>
    request<PrepSheetResponse>(`/week-plans/${weekStart}/prep-sheet`),
  portioningSheet: (weekStart: string) =>
    request<PortioningSheetResponse>(`/week-plans/${weekStart}/portioning-sheet`),
};
