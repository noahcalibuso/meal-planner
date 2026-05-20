export interface Ingredient {
  id?: number;
  name: string;
  quantity_description: string;
  category: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Meal {
  id: number;
  name: string;
  photo_path: string | null;
  serving_count: number;
  prep_time_minutes: number | null;
  tags: string[];
  notes: string | null;
  ingredients: Ingredient[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  per_serving_calories: number;
  per_serving_protein_g: number;
  per_serving_carbs_g: number;
  per_serving_fat_g: number;
}

export interface MealInput {
  name: string;
  serving_count: number;
  prep_time_minutes: number | null;
  tags: string[];
  notes: string | null;
  ingredients: Omit<Ingredient, 'id'>[];
}

export interface DayTarget {
  day_of_week: number;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

export interface DefaultSettings {
  default_calories: number;
  default_protein_g: number;
  default_carbs_g: number;
  default_fat_g: number;
}

export interface FullSettings {
  defaults: DefaultSettings;
  per_day: DayTarget[];
}

export interface PlannedMeal {
  id?: number;
  meal_id: number;
  day_of_week: number;
  position_in_day: number;
}

export interface WeekPlan {
  id: number;
  week_start_date: string;
  planned_meals: PlannedMeal[];
}

export interface GroceryItem {
  name: string;
  category: string;
  quantity_description: string;
  occurrences: number;
}

export interface GroceryListResponse {
  week_start_date: string;
  groups: Record<string, GroceryItem[]>;
}

export interface PrepGroupItem {
  meal_id: number;
  meal_name: string;
  batches: number;
  servings_per_batch: number;
  total_yield: number;
  prep_time_minutes: number | null;
  photo_path: string | null;
  ingredients: { name: string; quantity_description: string; quantity_total: string }[];
}

export interface PrepGroup {
  method: string;
  items: PrepGroupItem[];
}

export interface PrepSheetResponse {
  week_start_date: string;
  groups: PrepGroup[];
}

export interface PortioningItem {
  meal_id: number;
  meal_name: string;
  batches: number;
  servings_per_batch: number;
  total_servings_needed: number;
  total_yield: number;
  photo_path: string | null;
}

export interface PortioningSheetResponse {
  week_start_date: string;
  items: PortioningItem[];
}
