import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { NOW } from "@/lib/mock/clock";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export function avatarFor(seed: string | number) {
  return `https://i.pravatar.cc/200?u=${encodeURIComponent(String(seed))}`;
}

/**
 * Local-timezone `YYYY-MM-DD` key. Use this — never `Date#toISOString()` —
 * to compare calendar days: `toISOString()` is UTC and shifts the day in
 * any non-UTC timezone (e.g. a local-midnight Date renders as the previous
 * day in UTC+7), which silently misplaces calendar entries.
 */
export function localDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function relativeDay(date: Date) {
  const today = new Date(NOW);
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  return target.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
