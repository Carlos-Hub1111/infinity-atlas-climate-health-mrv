import {
  filteredPublicRows,
  PublicFilterError,
} from "../../../lib/public-filters";
import {
  localizedRecordTitle,
  publicRecordNumber,
} from "../../../lib/public-content";

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
    "public_record_number",
    "record_title_en",
    "record_title_es",
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
        publicRecordNumber(row.id),
        localizedRecordTitle(row.id, row.recordTitle, "en"),
        localizedRecordTitle(row.id, row.recordTitle, "es"),
      ].map(cell).join(","),
    ),
  ];
  return new Response(`\uFEFF${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="infinityatlas-public-technical.csv"',
      "Cache-Control": "no-store",
      "X-InfinityAtlas-CSV-Schema": "public-v1",
      "Link": '</data/infinityatlas-public-data-dictionary.csv>; rel="describedby"',
    },
  });
}
