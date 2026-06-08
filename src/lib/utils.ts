import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { NOW } from "@/lib/mock/clock";
import { isMockMode } from "@/lib/api-client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format a Vietnamese Dong amount: e.g. 1.500.000 ₫ */
export function formatCurrencyVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Compact VND formatter for chart axes only.
 * 1.500.000 → "1,5 tr" | 500.000 → "500 k" | 999 → "999"
 */
export function formatCurrencyVndCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const tr = amount / 1_000_000;
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(tr)} tr`;
  }
  if (amount >= 1_000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount / 1_000)} k`;
  }
  return new Intl.NumberFormat("vi-VN").format(amount);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
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
  const today = isMockMode() ? new Date(NOW) : new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  if (diff === -1) return "Hôm qua";
  if (diff > 1 && diff < 7) return `${diff} ngày nữa`;
  if (diff < -1 && diff > -7) return `${Math.abs(diff)} ngày trước`;
  return target.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}
