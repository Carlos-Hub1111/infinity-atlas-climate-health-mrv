import { Locale } from "./i18n";

export function normalizeSanCristobal(value: string): string {
  return value.replace(/San Cristobal/g, "San Cristóbal");
}

export function localizedUserName(
  fullName: string,
  username: string,
  locale: Locale,
): string {
  if (username === "demo-admin") {
    return locale === "es" ? "Demo Administrador" : "Demo Administrator";
  }
  return normalizeSanCristobal(fullName);
}
