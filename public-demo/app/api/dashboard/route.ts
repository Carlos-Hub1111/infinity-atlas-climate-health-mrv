import {
  filteredPublicRows,
  filterOptions,
  PublicFilterError,
} from "../../../lib/public-filters";
import { publicRecordNumber } from "../../../lib/public-content";

export async function GET(request: Request) {
  let result: Awaited<ReturnType<typeof filteredPublicRows>>;
  try {
    result = await filteredPublicRows(request);
  } catch (error) {
    if (error instanceof PublicFilterError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
  const { rows: filtered, filters, totalRows } = result;

  const count = (field: keyof typeof filtered[number], values: readonly string[]) =>
    Object.fromEntries(values.map((value) => [
      value,
      filtered.filter((row) => row[field] === value).length,
    ]));
  const trends = Object.values(
    filtered.reduce<Record<string, {
      date: string;
      value: number;
      categories: Set<string>;
      riskLevels: Set<string>;
    }>>((result, row) => {
      const day = row.observedAt.slice(0, 10);
      const item = result[day] ?? {
        date: day,
        value: 0,
        categories: new Set<string>(),
        riskLevels: new Set<string>(),
      };
      item.value += 1;
      item.categories.add(row.category);
      item.riskLevels.add(row.riskLevel);
      result[day] = item;
      return result;
    }, {}),
  )
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((item) => ({
      date: item.date,
      value: item.value,
      categories: [...item.categories].sort(),
      risk_levels: [...item.riskLevels].sort(),
    }));
  const dates = filtered.map((row) => row.observedAt.slice(0, 10)).sort();

  return Response.json({
    generated_at: new Date().toISOString(),
    territory: {
      name: "San Cristóbal",
      province: "Galapagos",
      country: "Ecuador",
      timezone: "Pacific/Galapagos",
    },
    active_filter_count: Object.values(filters).filter(Boolean).length,
    total_available: totalRows,
    period: {
      start: filters.date_from || dates[0] || null,
      end: filters.date_to || dates.at(-1) || null,
    },
    total: filtered.length,
    status: count("reviewStatus", filterOptions.status),
    provenance: count("dataProvenance", filterOptions.provenance),
    risk: count("riskLevel", filterOptions.risk_level),
    categories: count("category", filterOptions.category),
    trends,
    observations: filtered.map((row) => ({
      id: row.id,
      public_number: publicRecordNumber(row.id),
      record_title: row.recordTitle,
      category: row.category,
      status: row.reviewStatus,
      data_provenance: row.dataProvenance,
      risk_score: row.riskScore,
      risk_level: row.riskLevel,
      observed_at: row.observedAt,
      latitude: row.latitude,
      longitude: row.longitude,
      public_location_mode: row.publicLocationMode,
    })),
    methodology_version: "climate-health-risk-v0.1",
    prototype_notice:
      "Controlled prototype data. No record is presented as a validated territorial event.",
  });
}
