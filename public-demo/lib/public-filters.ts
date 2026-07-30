import { getDb } from "../db";
import { observations } from "../db/schema";
import { searchableRecordTitles } from "./public-content";

export const filterOptions = {
  category: ["water", "waste", "heat", "environmental_pollution"],
  status: ["pending", "validated", "observed", "rejected"],
  provenance: ["public_real", "controlled_test", "synthetic_demo"],
  risk_level: ["low", "moderate", "high", "critical"],
} as const;

export type PublicFilters = {
  category: string;
  status: string;
  provenance: string;
  risk_level: string;
  date_from: string;
  date_to: string;
  search: string;
  ids: string;
};

export class PublicFilterError extends Error {}

function validDate(value: string) {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function filteredPublicRows(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .slice(0, 80);
  const rawIds = (url.searchParams.get("ids") ?? "").trim();
  if (
    rawIds.length > 240 ||
    (rawIds && !/^\d+(,\d+)*$/.test(rawIds))
  ) {
    throw new PublicFilterError("Invalid ids");
  }
  const selectedIds = [...new Set(
    rawIds
      .split(",")
      .filter(Boolean)
      .map((value) => Number.parseInt(value, 10)),
  )];
  if (selectedIds.length > 50) {
    throw new PublicFilterError("Too many ids");
  }
  const filters: PublicFilters = {
    category: url.searchParams.get("category") ?? "",
    status: url.searchParams.get("status") ?? "",
    provenance: url.searchParams.get("provenance") ?? "",
    risk_level: url.searchParams.get("risk_level") ?? "",
    date_from: url.searchParams.get("date_from") ?? "",
    date_to: url.searchParams.get("date_to") ?? "",
    search,
    ids: selectedIds.join(","),
  };

  for (const key of ["category", "status", "provenance", "risk_level"] as const) {
    if (
      filters[key] &&
      !(filterOptions[key] as readonly string[]).includes(filters[key])
    ) {
      throw new PublicFilterError(`Invalid ${key}`);
    }
  }
  if (!validDate(filters.date_from) || !validDate(filters.date_to)) {
    throw new PublicFilterError("Invalid date format");
  }
  if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
    throw new PublicFilterError("Invalid date range");
  }

  const rows = await getDb().select().from(observations);
  const filtered = rows.filter((row) => {
    if (selectedIds.length && !selectedIds.includes(row.id)) return false;
    if (filters.category && row.category !== filters.category) return false;
    if (filters.status && row.reviewStatus !== filters.status) return false;
    if (filters.provenance && row.dataProvenance !== filters.provenance) return false;
    if (filters.risk_level && row.riskLevel !== filters.risk_level) return false;
    const day = row.observedAt.slice(0, 10);
    if (filters.date_from && day < filters.date_from) return false;
    if (filters.date_to && day > filters.date_to) return false;
    if (
      search &&
      String(row.id) !== search &&
      !searchableRecordTitles(row.id, row.recordTitle).some((title) =>
        title.toLowerCase().includes(search)
      )
    ) return false;
    return true;
  });
  return { filters, rows: filtered, totalRows: rows.length };
}
