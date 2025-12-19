import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date helpers
export const formatDate = (date: Date): string => {
  // Return YYYY-MM-DD in local time to match user expectation
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getPastDays = (count: number): Date[] => {
  const dates: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  return dates;
};

export const getDayName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short' });
};

// Colors for habits
export const HABIT_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#f43f5e', // Rose
];

export const getRandomColor = () => HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)];