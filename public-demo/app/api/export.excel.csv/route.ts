import {
  filteredPublicRows,
  PublicFilterError,
} from "../../../lib/public-filters";
import {
  localizedRecordTitle,
  publicLocationModeLabels,
  publicRecordNumber,
} from "../../../lib/public-content";

const labels = {
  category: {
    water: "Agua",
    waste: "Residuos",
    heat: "Calor",
    environmental_pollution: "Contaminación ambiental",
  },
  status: {
    pending: "Pendiente",
    validated: "Validado",
    observed: "Observado",
    rejected: "Rechazado",
  },
  risk: {
    low: "Bajo",
    moderate: "Moderado",
    high: "Alto",
    critical: "Crítico",
  },
  provenance: {
    public_real: "Dato público real",
    controlled_test: "Prueba controlada",
    synthetic_demo: "Demo sintética",
  },
} as const;

function cell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function translated(
  values: Readonly<Record<string, string>>,
  key: string,
) {
  return values[key] ?? key;
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
    "N.º público",
    "ID técnico",
    "Nombre corto del registro",
    "Categoría",
    "Estado de revisión",
    "Puntaje de riesgo",
    "Nivel de riesgo",
    "Procedencia del dato",
    "Fecha observada UTC",
    "Latitud pública",
    "Longitud pública",
    "Modo de ubicación pública",
    "Versión metodológica",
  ];
  const lines = [
    header.map(cell).join(";"),
    ...filtered.map((row) =>
      [
        publicRecordNumber(row.id),
        row.id,
        localizedRecordTitle(row.id, row.recordTitle, "es"),
        translated(labels.category, row.category),
        translated(labels.status, row.reviewStatus),
        row.riskScore,
        translated(labels.risk, row.riskLevel),
        translated(labels.provenance, row.dataProvenance),
        row.observedAt,
        row.latitude,
        row.longitude,
        translated(publicLocationModeLabels.es, row.publicLocationMode),
        "climate-health-risk-v0.1",
      ].map(cell).join(";"),
    ),
  ];

  return new Response(`\uFEFF${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="infinityatlas-datos-publicos-excel-es.csv"',
      "Cache-Control": "no-store",
      "X-InfinityAtlas-CSV-Schema": "public-excel-es-v1",
      "X-InfinityAtlas-CSV-Delimiter": "semicolon",
      "Link":
        '</data/infinityatlas-public-data-dictionary.csv>; rel="describedby"',
    },
  });
}
