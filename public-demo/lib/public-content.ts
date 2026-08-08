export type PublicLocale = "en" | "es";

export const controlledObservationIds = [101, 102, 103, 104, 105, 106] as const;

const publicRecordNumbers = new Map(
  controlledObservationIds.map((id, index) => [id, index + 1]),
);

export const controlledRecordTitles: Record<
  PublicLocale,
  Readonly<Record<number, string>>
> = {
  en: {
    101: "Controlled water route observation",
    102: "Controlled heat exposure review",
    103: "Controlled waste handling observation",
    104: "Synthetic environmental marker",
    105: "Public climate context reference",
    106: "Controlled heat route follow-up",
  },
  es: {
    101: "Observación controlada de ruta de agua",
    102: "Revisión controlada de exposición al calor",
    103: "Observación controlada de manejo de residuos",
    104: "Marcador ambiental sintético",
    105: "Referencia pública de contexto climático",
    106: "Seguimiento controlado de ruta de calor",
  },
};

export const publicLocationModeLabels: Record<
  PublicLocale,
  Readonly<Record<string, string>>
> = {
  en: {
    exact: "Exact public location",
    approximate: "Approximate public location",
    aggregate: "Aggregated public location",
    hidden: "Public location hidden",
  },
  es: {
    exact: "Ubicación pública exacta",
    approximate: "Ubicación pública aproximada",
    aggregate: "Ubicación pública agregada",
    hidden: "Ubicación pública oculta",
  },
};

export function localizedRecordTitle(
  id: number,
  fallback: string,
  locale: PublicLocale,
) {
  return controlledRecordTitles[locale][id] ?? fallback;
}

export function publicRecordNumber(id: number) {
  return publicRecordNumbers.get(id) ?? id;
}

export function publicRecordReference(
  id: number,
  locale: PublicLocale,
) {
  const number = publicRecordNumber(id);
  return locale === "es"
    ? `Registro ${number} — ID técnico ${id}`
    : `Record ${number} — Technical ID ${id}`;
}

export function searchableRecordTitles(id: number, fallback: string) {
  return [
    fallback,
    controlledRecordTitles.en[id],
    controlledRecordTitles.es[id],
  ].filter((value): value is string => Boolean(value));
}
