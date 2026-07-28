import {
  filteredPublicRows,
  PublicFilterError,
} from "../../../lib/public-filters";

function cell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  let filtered;
  try {
    ({ rows: filtered } = await filteredPublicRows(request));
  } catch (error) {
    if (error instanceof PublicFilterError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
  const header = [
    "observation_id",
    "record_title",
    "category",
    "review_status",
    "risk_score",
    "risk_level",
    "data_provenance",
    "observed_at_utc",
    "public_latitude",
    "public_longitude",
    "public_location_mode",
    "methodology_version",
  ];
  const lines = [
    header.map(cell).join(","),
    ...filtered.map((row) =>
      [
        row.id,
        row.recordTitle,
        row.category,
        row.reviewStatus,
        row.riskScore,
        row.riskLevel,
        row.dataProvenance,
        row.observedAt,
        row.latitude,
        row.longitude,
        row.publicLocationMode,
        "climate-health-risk-v0.1",
      ].map(cell).join(","),
    ),
  ];
  return new Response(`\uFEFF${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="infinityatlas-public-demo.csv"',
      "Cache-Control": "no-store",
    },
  });
}
