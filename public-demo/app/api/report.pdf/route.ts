import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import {
  filteredPublicRows,
  filterOptions,
  PublicFilterError,
} from "../../../lib/public-filters";

type DemoRow = Awaited<ReturnType<typeof filteredPublicRows>>["rows"][number];

function counts(rows: DemoRow[], field: keyof DemoRow, values: readonly string[]) {
  return Object.fromEntries(
    values.map((value) => [
      value,
      rows.filter((row) => row[field] === value).length,
    ]),
  );
}

function drawLine(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size = 10,
  color = rgb(0.12, 0.17, 0.19),
) {
  page.drawText(text, { x: 44, y, font, size, color, maxWidth: 507 });
}

function drawDistribution(
  page: PDFPage,
  title: string,
  values: Record<string, number>,
  y: number,
  regular: PDFFont,
  bold: PDFFont,
) {
  drawLine(page, title, y, bold, 11, rgb(0, 0.32, 0.35));
  let rowY = y - 19;
  for (const [label, value] of Object.entries(values)) {
    drawLine(page, `${label.replaceAll("_", " ")}: ${value}`, rowY, regular, 9);
    rowY -= 15;
  }
  return rowY - 8;
}

async function currentClimate() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-0.9002&longitude=-89.6127&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&timezone=auto",
      { signal: controller.signal },
    );
    if (!response.ok) return null;
    const body = await response.json() as {
      current?: Record<string, number | string>;
    };
    return body.current ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "es" ? "es" : "en";
  let rows;
  let filters;
  try {
    ({ rows, filters } = await filteredPublicRows(request));
  } catch (error) {
    if (error instanceof PublicFilterError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
  const climate = await currentClimate();
  const generatedAt = new Date().toISOString();
  const reportId = `IA-PUBLIC-${generatedAt.replace(/\D/g, "").slice(0, 14)}`;
  const dates = rows.map((row) => row.observedAt.slice(0, 10)).sort();
  const periodStart = filters.date_from || dates[0] || "No data";
  const periodEnd = filters.date_to || dates.at(-1) || "No data";
  const status = counts(rows, "reviewStatus", filterOptions.status);
  const provenance = counts(rows, "dataProvenance", filterOptions.provenance);
  const risks = counts(rows, "riskLevel", filterOptions.risk_level);
  const categories = counts(rows, "category", filterOptions.category);

  const copy = locale === "es"
    ? {
        report: "Reporte público de inteligencia territorial",
        territory: "San Cristóbal, Galápagos, Ecuador",
        period: "Periodo consultado",
        generated: "Generado en UTC",
        id: "Identificador del reporte",
        summary: "Resumen ejecutivo",
        summaryText: `La selección contiene ${rows.length} registros controlados y autorizados para la vista pública.`,
        climate: "Condiciones climáticas públicas",
        unavailable: "La fuente climática no estuvo disponible durante la generación.",
        indicators: "Indicadores agregados",
        status: "Estados de revisión",
        provenance: "Procedencia del dato",
        risk: "Niveles de riesgo",
        category: "Categorías",
        method: "Metodología",
        methodText: "Puntaje de riesgo = Peligro + Exposición + Vulnerabilidad. Cada componente usa una escala de 1 a 4. Versión climate-health-risk-v0.1.",
        sources: "Fuentes, licencias y atribuciones",
        limits: "Limitaciones",
        limitText: "Este reporte no constituye diagnóstico clínico ni verifica por sí solo un evento territorial. Las ubicaciones públicas usan reglas de privacidad geográfica.",
        notice: "PROTOTIPO / PRUEBA CONTROLADA - NO CONSTITUYE UN PILOTO TERRITORIAL VALIDADO",
        map: "El mapa territorial interactivo y sus ubicaciones seguras están disponibles en la URL pública de InfinityAtlas.",
      }
    : {
        report: "Public territorial intelligence report",
        territory: "San Cristobal, Galapagos, Ecuador",
        period: "Consulted period",
        generated: "Generated at UTC",
        id: "Report identifier",
        summary: "Executive summary",
        summaryText: `The selection contains ${rows.length} controlled records authorized for the public view.`,
        climate: "Public climate conditions",
        unavailable: "The climate source was unavailable during report generation.",
        indicators: "Aggregated indicators",
        status: "Review status",
        provenance: "Data provenance",
        risk: "Risk levels",
        category: "Categories",
        method: "Methodology",
        methodText: "Risk Score = Hazard + Exposure + Vulnerability. Each component uses a 1 to 4 scale. Version climate-health-risk-v0.1.",
        sources: "Sources, licenses and attribution",
        limits: "Limitations",
        limitText: "This report is not a clinical diagnosis and does not independently verify a territorial event. Public locations follow geographic privacy rules.",
        notice: "PROTOTYPE / CONTROLLED TEST - NOT A VALIDATED FIELD PILOT",
        map: "The interactive territorial map and its safe public locations are available at the InfinityAtlas public URL.",
      };

  const pdf = await PDFDocument.create();
  pdf.setTitle("InfinityAtlas Climate & Health MRV Toolkit");
  pdf.setAuthor("INFINITYGAIA S.A.S. B.I.C.");
  pdf.setSubject(copy.report);
  pdf.setKeywords(["InfinityAtlas", "MRV", "climate", "health", "controlled prototype"]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const teal = rgb(0, 0.23, 0.29);

  const cover = pdf.addPage([595, 842]);
  cover.drawRectangle({ x: 0, y: 750, width: 595, height: 92, color: teal });
  cover.drawText("InfinityAtlas", {
    x: 44, y: 794, size: 25, font: bold, color: rgb(1, 1, 1),
  });
  cover.drawText("Climate & Health MRV Toolkit", {
    x: 44, y: 774, size: 10, font: regular, color: rgb(1, 1, 1),
  });
  drawLine(cover, copy.report, 706, bold, 18, teal);
  drawLine(cover, copy.territory, 676, bold, 11);
  drawLine(cover, `${copy.period}: ${periodStart} / ${periodEnd}`, 648, regular, 10);
  drawLine(cover, `${copy.generated}: ${generatedAt}`, 630, regular, 9);
  drawLine(cover, `${copy.id}: ${reportId}`, 612, regular, 9);
  drawLine(cover, copy.summary, 566, bold, 12, teal);
  drawLine(cover, copy.summaryText, 542, regular, 10);
  drawLine(cover, copy.climate, 494, bold, 12, teal);
  if (climate) {
    drawLine(
      cover,
      `Temperature ${climate.temperature_2m} C | Humidity ${climate.relative_humidity_2m}% | Apparent ${climate.apparent_temperature} C`,
      469,
      regular,
      9,
    );
    drawLine(
      cover,
      `Precipitation ${climate.precipitation} mm | Weather code ${climate.weather_code} | Observed ${climate.time}`,
      451,
      regular,
      9,
    );
  } else {
    drawLine(cover, copy.unavailable, 469, regular, 9, rgb(0.55, 0.25, 0.08));
  }
  drawLine(cover, copy.indicators, 400, bold, 12, teal);
  drawLine(cover, `Total records: ${rows.length}`, 374, bold, 11);
  drawLine(cover, copy.notice, 122, bold, 9, rgb(0.55, 0.25, 0.08));
  drawLine(cover, "INFINITYGAIA S.A.S. B.I.C.", 74, bold, 9, teal);

  const details = pdf.addPage([595, 842]);
  details.drawRectangle({ x: 0, y: 800, width: 595, height: 42, color: teal });
  details.drawText("InfinityAtlas - Aggregated public results", {
    x: 44, y: 817, size: 12, font: bold, color: rgb(1, 1, 1),
  });
  let y = 770;
  y = drawDistribution(details, copy.status, status, y, regular, bold);
  y = drawDistribution(details, copy.provenance, provenance, y, regular, bold);
  y = drawDistribution(details, copy.risk, risks, y, regular, bold);
  y = drawDistribution(details, copy.category, categories, y, regular, bold);
  drawLine(details, copy.method, y, bold, 11, teal);
  drawLine(details, copy.methodText, y - 20, regular, 8.5);
  drawLine(details, copy.sources, y - 60, bold, 11, teal);
  drawLine(details, "Weather: Open-Meteo.com, CC BY 4.0.", y - 80, regular, 8.5);
  drawLine(details, "Map data: (c) OpenStreetMap contributors, ODbL.", y - 95, regular, 8.5);
  drawLine(details, copy.map, y - 110, regular, 8.5);
  drawLine(details, copy.limits, y - 150, bold, 11, teal);
  drawLine(details, copy.limitText, y - 170, regular, 8.5);
  drawLine(details, reportId, 42, regular, 8, rgb(0.35, 0.42, 0.44));

  const bytes = await pdf.save();
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="infinityatlas-public-${locale}.pdf"`,
      "Cache-Control": "no-store",
      "X-InfinityAtlas-Report-Id": reportId,
    },
  });
}
