export type HabitType = 'YES_NO' | 'MEASURABLE';

export interface Habit {
  id: string;
  name: string;
  question: string;
  color: string;
  createdAt: string;
  targetDaysPerWeek: number;
  type: HabitType;
  unit?: string; // e.g. "km", "pages"
}

export interface CompletionRecord {
  [date: string]: boolean | number; // boolean for YES_NO, number for MEASURABLE
}

// Map habitId -> CompletionRecord
export interface AppData {
  habits: Habit[];
  completions: Record<string, CompletionRecord>;
}

export type ViewState = 'LIST' | 'STATS';

export interface AIHabitSuggestion {
  name: string;
  question: string;
  reasoning: string;
}
