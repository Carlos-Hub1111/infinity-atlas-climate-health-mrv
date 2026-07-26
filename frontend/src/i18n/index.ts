import { en } from "./en";
import { es } from "./es";

export const translations = {
  en,
  es,
} as const;

export type Locale = keyof typeof translations;
export type Translation = typeof en;

export const defaultLocale: Locale = "en";

export function replaceParams(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (current, [key, value]) => current.replace(`{${key}}`, String(value)),
    template,
  );
}

export function translateValue(labels: Readonly<Record<string, string>>, value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return labels[value] ?? value;
}
