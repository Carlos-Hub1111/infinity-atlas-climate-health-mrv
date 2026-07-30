import { env } from "cloudflare:workers";
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";
import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { climateSnapshots } from "../../../db/schema";
import {
  filteredPublicRows,
  filterOptions,
  PublicFilterError,
} from "../../../lib/public-filters";
import {
  localizedRecordTitle,
  publicRecordNumber,
  type PublicLocale,
} from "../../../lib/public-content";

type DemoRow = Awaited<ReturnType<typeof filteredPublicRows>>["rows"][number];
type ClimateResult = Record<string, number | string | boolean> | null;

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PUBLIC_URL =
  "https://infinityatlas-public-demo.infinitygaia.workers.dev";
const teal = rgb(0, 0.23, 0.29);
const green = rgb(0, 0.45, 0.42);
const ink = rgb(0.09, 0.14, 0.16);
const muted = rgb(0.35, 0.42, 0.44);
const pale = rgb(0.94, 0.97, 0.97);
const amber = rgb(0.62, 0.43, 0.07);

function counts(rows: DemoRow[], field: keyof DemoRow, values: readonly string[]) {
  return Object.fromEntries(
    values.map((value) => [
      value,
      rows.filter((row) => row[field] === value).length,
    ]),
  );
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawParagraph(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size = 9,
  maxWidth = CONTENT_WIDTH,
  lineHeight = size * 1.35,
  color = ink,
) {
  const lines = wrapText(text, font, size, maxWidth);
  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      font,
      size,
      color,
    });
  });
  return y - lines.length * lineHeight;
}

function drawPageHeader(
  page: PDFPage,
  title: string,
  pageNumber: number,
  bold: PDFFont,
) {
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 54,
    width: PAGE_WIDTH,
    height: 54,
    color: teal,
  });
  page.drawText("InfinityAtlas", {
    x: MARGIN,
    y: PAGE_HEIGHT - 34,
    font: bold,
    size: 15,
    color: rgb(1, 1, 1),
  });
  page.drawText(title, {
    x: 180,
    y: PAGE_HEIGHT - 31,
    font: bold,
    size: 9,
    color: rgb(1, 1, 1),
    maxWidth: 330,
  });
  page.drawText(String(pageNumber), {
    x: PAGE_WIDTH - MARGIN - 8,
    y: PAGE_HEIGHT - 34,
    font: bold,
    size: 9,
    color: rgb(1, 1, 1),
  });
}

function drawFooter(
  page: PDFPage,
  reportId: string,
  notice: string,
  regular: PDFFont,
  bold: PDFFont,
) {
  page.drawLine({
    start: { x: MARGIN, y: 42 },
    end: { x: PAGE_WIDTH - MARGIN, y: 42 },
    thickness: 0.6,
    color: rgb(0.73, 0.79, 0.8),
  });
  page.drawText(reportId, {
    x: MARGIN,
    y: 26,
    font: regular,
    size: 6.8,
    color: muted,
  });
  page.drawText(notice, {
    x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(notice, 6.3),
    y: 26,
    font: bold,
    size: 6.3,
    color: amber,
  });
}

function drawMetric(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  regular: PDFFont,
  bold: PDFFont,
) {
  const availableWidth = width - 18;
  const naturalWidth = bold.widthOfTextAtSize(value, 13);
  const valueSize = Math.max(
    8,
    Math.min(13, naturalWidth > 0 ? (13 * availableWidth) / naturalWidth : 13),
  );
  page.drawRectangle({ x, y, width, height: 52, color: pale });
  page.drawRectangle({ x, y: y + 49, width, height: 3, color: green });
  page.drawText(label, {
    x: x + 9,
    y: y + 31,
    font: regular,
    size: 7,
    color: muted,
    maxWidth: width - 18,
  });
  page.drawText(value, {
    x: x + 9,
    y: y + 12,
    font: bold,
    size: valueSize,
    color: teal,
  });
}

function drawBars(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  title: string,
  values: Record<string, number>,
  labels: Record<string, string>,
  total: number,
  regular: PDFFont,
  bold: PDFFont,
) {
  page.drawText(title, { x, y, font: bold, size: 9, color: teal });
  const max = Math.max(1, ...Object.values(values));
  let rowY = y - 20;
  for (const [key, value] of Object.entries(values)) {
    const percent = total ? Math.round((value / total) * 100) : 0;
    page.drawText(labels[key] ?? key.replaceAll("_", " "), {
      x,
      y: rowY,
      font: regular,
      size: 6.8,
      color: ink,
      maxWidth: width * 0.42,
    });
    page.drawRectangle({
      x: x + width * 0.44,
      y: rowY - 1,
      width: width * 0.4,
      height: 7,
      color: rgb(0.9, 0.93, 0.93),
    });
    page.drawRectangle({
      x: x + width * 0.44,
      y: rowY - 1,
      width: (width * 0.4 * value) / max,
      height: 7,
      color: green,
    });
    page.drawText(`${value} · ${percent}%`, {
      x: x + width * 0.86,
      y: rowY,
      font: bold,
      size: 6.8,
      color: ink,
    });
    rowY -= 16;
  }
}

function drawTerritorialRepresentation(
  page: PDFPage,
  rows: DemoRow[],
  title: string,
  subtitle: string,
  hiddenText: string,
  regular: PDFFont,
  bold: PDFFont,
) {
  const x = MARGIN;
  const y = 70;
  const width = CONTENT_WIDTH;
  const height = 140;
  const visible = rows.filter(
    (row) => row.latitude !== null && row.longitude !== null,
  );
  page.drawText(title, { x, y: y + height + 17, font: bold, size: 9, color: teal });
  page.drawText(subtitle, {
    x,
    y: y + height + 5,
    font: regular,
    size: 6.8,
    color: muted,
  });
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: rgb(0.93, 0.96, 0.96),
    borderColor: rgb(0.65, 0.73, 0.75),
    borderWidth: 0.7,
  });
  page.drawText("San Cristóbal · Galápagos", {
    x: x + 12,
    y: y + height - 20,
    font: bold,
    size: 8,
    color: teal,
  });
  if (!visible.length) {
    page.drawText(hiddenText, {
      x: x + 12,
      y: y + height / 2,
      font: regular,
      size: 8,
      color: muted,
    });
    return;
  }
  const latitudes = visible.map((row) => row.latitude as number);
  const longitudes = visible.map((row) => row.longitude as number);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  visible.forEach((row) => {
    const px =
      x +
      48 +
      (((row.longitude as number) - minLon) / Math.max(0.001, maxLon - minLon)) *
        (width - 96);
    const py =
      y +
      30 +
      (((row.latitude as number) - minLat) / Math.max(0.001, maxLat - minLat)) *
        (height - 62);
    page.drawCircle({
      x: px,
      y: py,
      size: 10,
      color: row.riskLevel === "critical"
        ? rgb(0.68, 0.16, 0.14)
        : row.riskLevel === "high"
          ? rgb(0.83, 0.45, 0.08)
          : row.riskLevel === "moderate"
            ? rgb(0.72, 0.62, 0.12)
            : green,
      borderColor: rgb(1, 1, 1),
      borderWidth: 1.5,
    });
    const id = String(publicRecordNumber(row.id));
    page.drawText(id, {
      x: px - bold.widthOfTextAtSize(id, 5.6) / 2,
      y: py - 2,
      font: bold,
      size: 5.6,
      color: rgb(1, 1, 1),
    });
  });
}

async function currentClimate(): Promise<ClimateResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=-0.9002&longitude=-89.6127&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&timezone=auto",
      { signal: controller.signal },
    );
    if (!response.ok) throw new Error(`Provider response ${response.status}`);
    const body = (await response.json()) as {
      current?: Record<string, number | string>;
    };
    return body.current ?? null;
  } catch {
    const [fallback] = await getDb()
      .select()
      .from(climateSnapshots)
      .orderBy(desc(climateSnapshots.observedAt))
      .limit(1);
    return fallback
      ? {
          time: fallback.observedAt,
          temperature_2m: fallback.temperatureC,
          relative_humidity_2m: fallback.relativeHumidityPercent,
          apparent_temperature: fallback.apparentTemperatureC,
          precipitation: fallback.precipitationMm,
          weather_code: fallback.weatherCode,
          is_stale: true,
        }
      : null;
  } finally {
    clearTimeout(timeout);
  }
}

async function embedOfficialLogo(pdf: PDFDocument, request: Request) {
  try {
    const response = await env.ASSETS.fetch(
      new Request(
        new URL("/brand/infinityatlas-logo-official.png", request.url),
      ),
    );
    if (!response.ok) return null;
    return await pdf.embedPng(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function drawCoverLogo(
  page: PDFPage,
  logo: PDFImage | null,
  bold: PDFFont,
  regular: PDFFont,
) {
  if (logo) {
    const size = logo.scale(0.23);
    page.drawImage(logo, {
      x: MARGIN,
      y: 620,
      width: size.width,
      height: size.height,
    });
  } else {
    page.drawText("InfinityAtlas", {
      x: MARGIN,
      y: 705,
      font: bold,
      size: 28,
      color: teal,
    });
  }
  page.drawText("Climate & Health MRV Toolkit", {
    x: 240,
    y: 690,
    font: bold,
    size: 16,
    color: teal,
  });
  page.drawText("Territorial intelligence, traceability and trusted impact data.", {
    x: 240,
    y: 670,
    font: regular,
    size: 8,
    color: muted,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale: PublicLocale = url.searchParams.get("locale") === "es" ? "es" : "en";
  let rows: DemoRow[];
  let filters: Awaited<ReturnType<typeof filteredPublicRows>>["filters"];
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
  const status = counts(rows, "reviewStatus", filterOptions.status);
  const provenance = counts(rows, "dataProvenance", filterOptions.provenance);
  const risks = counts(rows, "riskLevel", filterOptions.risk_level);
  const categories = counts(rows, "category", filterOptions.category);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const isFilteredReport = activeFilterCount > 0;
  const recordCountText = locale === "es"
    ? `${rows.length} ${rows.length === 1 ? "registro" : "registros"}`
    : `${rows.length} ${rows.length === 1 ? "record" : "records"}`;

  const copy = locale === "es"
    ? {
        report: "Informe territorial interpretativo de clima y salud",
        scope: isFilteredReport
          ? `REPORTE FILTRADO · ${recordCountText}`
          : `REPORTE AGREGADO · ${recordCountText}`,
        territory: "San Cristóbal · Galápagos · Ecuador",
        period: "Periodo consultado",
        generated: "Generado en UTC",
        id: "Identificador del reporte",
        source: "Fuente pública controlada: Cloudflare D1",
        summary: "Resumen ejecutivo",
        summaryText: `Esta ${isFilteredReport ? "selección filtrada" : "lectura agregada"} contiene ${recordCountText} ${rows.length === 1 ? "controlado autorizado" : "controlados autorizados"} para la superficie pública de InfinityAtlas. Resume revisión metodológica, procedencia y prioridad demostrativa sin exponer evidencia, actores, comentarios ni coordenadas restringidas.`,
        selectionReading: "Lectura ejecutiva de la selección",
        climate: "Contexto climático complementario",
        climateText: "La observación del proveedor y el momento de generación del informe se conservan por separado. Este contexto no constituye un reporte meteorológico oficial.",
        unavailable: "La fuente climática no estuvo disponible durante la generación.",
        temperature: "Temperatura",
        humidity: "Humedad",
        apparent: "Sensación térmica",
        precipitation: "Precipitación",
        observed: "Observado por Open-Meteo",
        fallback: "Dato real almacenado y desactualizado",
        signals: "Señales metodológicas de prioridad",
        signalsText: "Estas señales organizan la atención de revisión dentro de la demostración. No son alertas clínicas ni emergencias territoriales reales.",
        reviewAttention: "Pendientes u observados",
        elevatedRisk: "Riesgo alto o crítico",
        controlledOrigin: "Prueba o demo controlada",
        status: "Estado de revisión",
        provenance: "Procedencia del dato",
        risk: "Nivel de riesgo",
        category: "Categoría",
        records: "Registros públicos controlados",
        publicNumber: "N.º",
        record: "ID técnico",
        title: "Nombre corto",
        score: "Puntaje / nivel",
        date: "Fecha",
        distributions: "Distribuciones de la selección",
        territoryView: "Representación territorial con geoprivacidad",
        territoryViewHelp: "Representación pública no navegacional. Solo utiliza coordenadas autorizadas; omite las ubicaciones ocultas.",
        noLocations: "La selección no contiene ubicaciones públicas visibles.",
        method: "Metodología y trazabilidad",
        methodText: "Puntaje de riesgo = Peligro + Exposición + Vulnerabilidad. Cada componente utiliza una escala de 1 a 4. Versión climate-health-risk-v0.1. El resultado es metodológico, no clínico.",
        geo: "Geoprivacidad",
        geoText: "Cada registro aplica un modo de ubicación exacta pública, aproximada, agregada u oculta. El reporte no reconstruye coordenadas restringidas.",
        licenses: "Licencias y atribuciones",
        licenseText: "Clima: Open-Meteo, CC BY 4.0. Base pública: Cloudflare D1. Software del prototipo: repositorio público bajo MIT, con exclusión expresa de la marca y logo InfinityAtlas. InfinityAtlas y su logo pertenecen a INFINITYGAIA S.A.S. B.I.C.",
        limitations: "Limitaciones y lectura responsable",
        limitText: "Todos los registros son datos públicos reales de contexto, pruebas controladas o demos sintéticas claramente etiquetadas. Los puntajes altos o críticos no constituyen emergencias reales. Este reporte no verifica por sí solo eventos territoriales, no es un diagnóstico médico y no demuestra selección, financiamiento, asociación ni respaldo de UNICEF.",
        publicLink: "Superficie pública verificable",
        nextSteps: "Próximos pasos metodológicos sugeridos",
        nextStepsText: "Revisar la fuente declarada, la evidencia autorizada, el modo de ubicación, la fecha de observación y la clasificación metodológica antes de cualquier futura autorización de publicación.",
        notice: "PROTOTIPO CONTROLADO · NO ES UN PILOTO TERRITORIAL VALIDADO",
        statusLabels: { pending: "Pendiente", validated: "Validado", observed: "Observado", rejected: "Rechazado" },
        provenanceLabels: { public_real: "Dato público real", controlled_test: "Prueba controlada", synthetic_demo: "Demo sintética" },
        riskLabels: { low: "Bajo", moderate: "Moderado", high: "Alto", critical: "Crítico" },
        categoryLabels: { water: "Agua", waste: "Residuos", heat: "Calor", environmental_pollution: "Contaminación ambiental" },
      }
    : {
        report: "Interpretive territorial climate and health report",
        scope: isFilteredReport
          ? `FILTERED REPORT · ${recordCountText}`
          : `AGGREGATE REPORT · ${recordCountText}`,
        territory: "San Cristobal · Galapagos · Ecuador",
        period: "Consulted period",
        generated: "Generated at UTC",
        id: "Report identifier",
        source: "Controlled public source: Cloudflare D1",
        summary: "Executive summary",
        summaryText: `This ${isFilteredReport ? "filtered selection" : "aggregate reading"} contains ${recordCountText} authorized for the InfinityAtlas public surface. It summarizes methodological review, provenance and demonstration priority without exposing evidence, actors, comments or restricted coordinates.`,
        selectionReading: "Executive reading of the selection",
        climate: "Complementary climate context",
        climateText: "The provider observation time and report generation time are preserved separately. This context is not an official meteorological report.",
        unavailable: "The climate source was unavailable during report generation.",
        temperature: "Temperature",
        humidity: "Humidity",
        apparent: "Apparent temperature",
        precipitation: "Precipitation",
        observed: "Observed by Open-Meteo",
        fallback: "Stored real data shown as stale",
        signals: "Methodological priority signals",
        signalsText: "These signals organize review attention inside the demonstration. They are not clinical alerts or real territorial emergencies.",
        reviewAttention: "Pending or observed",
        elevatedRisk: "High or critical risk",
        controlledOrigin: "Controlled test or demo",
        status: "Review status",
        provenance: "Data provenance",
        risk: "Risk level",
        category: "Category",
        records: "Controlled public records",
        publicNumber: "No.",
        record: "Technical ID",
        title: "Record title",
        score: "Score / level",
        date: "Date",
        distributions: "Selection distributions",
        territoryView: "Territorial representation with geoprivacy",
        territoryViewHelp: "Non-navigational public representation. It uses only authorized coordinates and omits hidden locations.",
        noLocations: "The selection has no visible public locations.",
        method: "Methodology and traceability",
        methodText: "Risk Score = Hazard + Exposure + Vulnerability. Each component uses a 1 to 4 scale. Version climate-health-risk-v0.1. The result is methodological, not clinical.",
        geo: "Geographic privacy",
        geoText: "Each record applies an exact public, approximate, aggregate or hidden location mode. The report does not reconstruct restricted coordinates.",
        licenses: "Licenses and attribution",
        licenseText: "Climate: Open-Meteo, CC BY 4.0. Public database: Cloudflare D1. Prototype software: public repository under MIT, with an express exclusion for the InfinityAtlas brand and logo. InfinityAtlas and its logo belong to INFINITYGAIA S.A.S. B.I.C.",
        limitations: "Limitations and responsible reading",
        limitText: "All records are clearly labeled as public real context, controlled tests or synthetic demos. High or critical scores are not real emergencies. This report does not independently verify territorial events, is not a medical diagnosis and does not claim UNICEF selection, funding, partnership or endorsement.",
        publicLink: "Verifiable public surface",
        nextSteps: "Suggested methodological next steps",
        nextStepsText: "Review the declared source, authorized evidence, location mode, observation date and methodological classification before any future publication authorization.",
        notice: "CONTROLLED PROTOTYPE · NOT A VALIDATED FIELD PILOT",
        statusLabels: { pending: "Pending", validated: "Validated", observed: "Observed", rejected: "Rejected" },
        provenanceLabels: { public_real: "Public real data", controlled_test: "Controlled test", synthetic_demo: "Synthetic demo" },
        riskLabels: { low: "Low", moderate: "Moderate", high: "High", critical: "Critical" },
        categoryLabels: { water: "Water", waste: "Waste", heat: "Heat", environmental_pollution: "Environmental pollution" },
      };

  const countSummary = (
    values: Record<string, number>,
    labels: Record<string, string>,
  ) =>
    Object.entries(values)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${labels[key] ?? key}: ${value}`)
      .join(", ");
  const selectionNarrative = rows.length === 0
    ? locale === "es"
      ? "La selección no contiene registros. El informe conserva la metodología y las limitaciones para documentar el estado vacío."
      : "The selection contains no records. The report retains the methodology and limitations to document the empty state."
    : rows.length === 1
      ? (() => {
          const row = rows[0];
          const reference = locale === "es"
            ? `Registro ${publicRecordNumber(row.id)} — ID técnico ${row.id}`
            : `Record ${publicRecordNumber(row.id)} — Technical ID ${row.id}`;
          const values = [
            reference,
            copy.territory,
            copy.categoryLabels[row.category] ?? row.category,
            row.observedAt.slice(0, 10),
            copy.statusLabels[row.reviewStatus] ?? row.reviewStatus,
            `${row.riskScore} · ${copy.riskLabels[row.riskLevel] ?? row.riskLevel}`,
            copy.provenanceLabels[row.dataProvenance] ?? row.dataProvenance,
          ].join(" · ");
          return locale === "es"
            ? `${values}. Es un registro demostrativo controlado y no constituye un diagnóstico, una causalidad ni una emergencia territorial.`
            : `${values}. It is a controlled demonstration record and does not constitute a diagnosis, causality statement or territorial emergency.`;
        })()
      : locale === "es"
        ? `${recordCountText} en ${copy.territory}, entre ${dates[0]} y ${dates.at(-1)}. Categorías: ${countSummary(categories, copy.categoryLabels)}. Estados: ${countSummary(status, copy.statusLabels)}. Riesgos metodológicos: ${countSummary(risks, copy.riskLabels)}. Procedencias: ${countSummary(provenance, copy.provenanceLabels)}. La selección es demostrativa y no expresa diagnósticos, causalidades ni emergencias reales.`
        : `${recordCountText} in ${copy.territory}, from ${dates[0]} to ${dates.at(-1)}. Categories: ${countSummary(categories, copy.categoryLabels)}. Statuses: ${countSummary(status, copy.statusLabels)}. Methodological risks: ${countSummary(risks, copy.riskLabels)}. Provenance: ${countSummary(provenance, copy.provenanceLabels)}. The selection is demonstrative and does not express diagnoses, causality or real emergencies.`;

  const noData = locale === "es" ? "Sin datos" : "No data";
  const periodStart = filters.date_from || dates[0] || noData;
  const periodEnd = filters.date_to || dates.at(-1) || noData;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`InfinityAtlas · ${copy.report}`);
  pdf.setAuthor("INFINITYGAIA S.A.S. B.I.C.");
  pdf.setSubject(copy.report);
  pdf.setKeywords([
    "InfinityAtlas",
    "MRV",
    "territorial intelligence",
    "controlled prototype",
  ]);
  pdf.setCreationDate(new Date(generatedAt));
  pdf.setModificationDate(new Date(generatedAt));
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedOfficialLogo(pdf, request);

  const cover = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  cover.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: rgb(0.97, 0.98, 0.98),
  });
  cover.drawRectangle({
    x: 0,
    y: 0,
    width: 18,
    height: PAGE_HEIGHT,
    color: teal,
  });
  drawCoverLogo(cover, logo, bold, regular);
  drawParagraph(cover, copy.report, MARGIN, 570, bold, 20, CONTENT_WIDTH, 24, teal);
  cover.drawText(copy.territory, {
    x: MARGIN,
    y: 516,
    font: bold,
    size: 13,
    color: ink,
  });
  cover.drawText(copy.scope, {
    x: MARGIN,
    y: 494,
    font: bold,
    size: 8.5,
    color: green,
  });
  drawMetric(cover, MARGIN, 414, 158, copy.period, `${periodStart} / ${periodEnd}`, regular, bold);
  drawMetric(cover, MARGIN + 172, 414, 158, copy.generated, generatedAt.slice(0, 16).replace("T", " "), regular, bold);
  drawMetric(cover, MARGIN + 344, 414, 167, copy.id, reportId, regular, bold);
  cover.drawText(copy.source, { x: MARGIN, y: 380, font: bold, size: 8, color: green });
  drawParagraph(cover, copy.summaryText, MARGIN, 344, regular, 10, CONTENT_WIDTH, 14);
  cover.drawRectangle({
    x: MARGIN,
    y: 145,
    width: CONTENT_WIDTH,
    height: 82,
    color: rgb(1, 0.97, 0.88),
    borderColor: rgb(0.84, 0.7, 0.31),
    borderWidth: 0.8,
  });
  drawParagraph(cover, copy.notice, MARGIN + 16, 194, bold, 11, CONTENT_WIDTH - 32, 14, amber);
  drawParagraph(cover, copy.signalsText, MARGIN + 16, 170, regular, 8, CONTENT_WIDTH - 32, 11, amber);
  cover.drawText("INFINITYGAIA S.A.S. B.I.C.", {
    x: MARGIN,
    y: 72,
    font: bold,
    size: 9,
    color: teal,
  });
  cover.drawText(PUBLIC_URL, {
    x: MARGIN,
    y: 56,
    font: regular,
    size: 7,
    color: muted,
  });

  const overview = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageHeader(overview, copy.summary, 2, bold);
  let y = 758;
  overview.drawText(copy.summary, { x: MARGIN, y, font: bold, size: 15, color: teal });
  y = drawParagraph(overview, copy.summaryText, MARGIN, y - 24, regular, 9, CONTENT_WIDTH, 13) - 16;
  overview.drawText(copy.selectionReading, {
    x: MARGIN,
    y,
    font: bold,
    size: 11,
    color: teal,
  });
  y = drawParagraph(
    overview,
    selectionNarrative,
    MARGIN,
    y - 18,
    regular,
    7.8,
    CONTENT_WIDTH,
    10.5,
  ) - 14;
  overview.drawText(copy.climate, { x: MARGIN, y, font: bold, size: 11, color: teal });
  drawParagraph(overview, copy.climateText, MARGIN, y - 17, regular, 7.5, CONTENT_WIDTH, 10, muted);
  if (climate) {
    drawMetric(overview, MARGIN, y - 92, 118, copy.temperature, `${climate.temperature_2m} °C`, regular, bold);
    drawMetric(overview, MARGIN + 130, y - 92, 118, copy.humidity, `${climate.relative_humidity_2m}%`, regular, bold);
    drawMetric(overview, MARGIN + 260, y - 92, 118, copy.apparent, `${climate.apparent_temperature} °C`, regular, bold);
    drawMetric(overview, MARGIN + 390, y - 92, 121, copy.precipitation, `${climate.precipitation} mm`, regular, bold);
    drawParagraph(
      overview,
      `${copy.observed}: ${climate.time}${climate.is_stale ? ` · ${copy.fallback}` : ""}`,
      MARGIN,
      y - 109,
      regular,
      7.2,
      CONTENT_WIDTH,
      10,
      climate.is_stale ? amber : muted,
    );
  } else {
    drawParagraph(overview, copy.unavailable, MARGIN, y - 42, regular, 8, CONTENT_WIDTH, 11, amber);
  }
  y -= 150;
  overview.drawText(copy.signals, { x: MARGIN, y, font: bold, size: 11, color: teal });
  drawParagraph(overview, copy.signalsText, MARGIN, y - 18, regular, 7.5, CONTENT_WIDTH, 10, muted);
  const attention = (status.pending ?? 0) + (status.observed ?? 0);
  const elevated = (risks.high ?? 0) + (risks.critical ?? 0);
  const controlled =
    (provenance.controlled_test ?? 0) + (provenance.synthetic_demo ?? 0);
  drawMetric(overview, MARGIN, y - 102, 158, copy.reviewAttention, String(attention), regular, bold);
  drawMetric(overview, MARGIN + 172, y - 102, 158, copy.elevatedRisk, String(elevated), regular, bold);
  drawMetric(overview, MARGIN + 344, y - 102, 167, copy.controlledOrigin, String(controlled), regular, bold);
  y -= 145;
  overview.drawText(copy.distributions, { x: MARGIN, y, font: bold, size: 11, color: teal });
  drawBars(overview, MARGIN, y - 24, 238, copy.status, status, copy.statusLabels, rows.length, regular, bold);
  drawBars(overview, MARGIN + 273, y - 24, 238, copy.provenance, provenance, copy.provenanceLabels, rows.length, regular, bold);
  drawBars(overview, MARGIN, y - 128, 238, copy.risk, risks, copy.riskLabels, rows.length, regular, bold);
  drawBars(overview, MARGIN + 273, y - 128, 238, copy.category, categories, copy.categoryLabels, rows.length, regular, bold);
  drawFooter(overview, reportId, copy.notice, regular, bold);

  const records = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageHeader(records, copy.records, 3, bold);
  records.drawText(copy.records, { x: MARGIN, y: 758, font: bold, size: 15, color: teal });
  const columns = [
    { key: "publicNumber", label: copy.publicNumber, width: 27 },
    { key: "id", label: copy.record, width: 39 },
    { key: "title", label: copy.title, width: 124 },
    { key: "category", label: copy.category, width: 57 },
    { key: "status", label: copy.status, width: 55 },
    { key: "risk", label: copy.score, width: 61 },
    { key: "provenance", label: copy.provenance, width: 84 },
    { key: "date", label: copy.date, width: 64 },
  ] as const;
  let tableX = MARGIN;
  const tableTop = 728;
  columns.forEach((column) => {
    records.drawRectangle({
      x: tableX,
      y: tableTop - 22,
      width: column.width,
      height: 22,
      color: teal,
    });
    records.drawText(column.label, {
      x: tableX + 4,
      y: tableTop - 14,
      font: bold,
      size: 6.2,
      color: rgb(1, 1, 1),
      maxWidth: column.width - 8,
    });
    tableX += column.width;
  });
  rows.slice(0, 8).forEach((row, index) => {
    const rowY = tableTop - 22 - (index + 1) * 43;
    records.drawRectangle({
      x: MARGIN,
      y: rowY,
      width: CONTENT_WIDTH,
      height: 43,
      color: index % 2 ? rgb(0.97, 0.98, 0.98) : pale,
    });
    const values = {
      publicNumber: String(publicRecordNumber(row.id)),
      id: String(row.id),
      title: localizedRecordTitle(row.id, row.recordTitle, locale),
      category: copy.categoryLabels[row.category] ?? row.category,
      status: copy.statusLabels[row.reviewStatus] ?? row.reviewStatus,
      risk: `${row.riskScore} · ${copy.riskLabels[row.riskLevel] ?? row.riskLevel}`,
      provenance: copy.provenanceLabels[row.dataProvenance] ?? row.dataProvenance,
      date: row.observedAt.slice(0, 10),
    };
    let cellX = MARGIN;
    columns.forEach((column) => {
      const lines = wrapText(values[column.key], regular, 6.4, column.width - 8).slice(0, 3);
      lines.forEach((line, lineIndex) => {
        records.drawText(line, {
          x: cellX + 4,
          y: rowY + 28 - lineIndex * 8,
          font:
            column.key === "id" || column.key === "publicNumber"
              ? bold
              : regular,
          size: 6.4,
          color: ink,
        });
      });
      cellX += column.width;
    });
  });
  drawBars(records, MARGIN, 380, 238, copy.status, status, copy.statusLabels, rows.length, regular, bold);
  drawBars(records, MARGIN + 273, 380, 238, copy.risk, risks, copy.riskLabels, rows.length, regular, bold);
  drawTerritorialRepresentation(
    records,
    rows,
    copy.territoryView,
    copy.territoryViewHelp,
    copy.noLocations,
    regular,
    bold,
  );
  drawFooter(records, reportId, copy.notice, regular, bold);

  const methodology = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageHeader(methodology, copy.method, 4, bold);
  let sectionY = 758;
  for (const section of [
    [copy.method, copy.methodText],
    [copy.geo, copy.geoText],
    [copy.nextSteps, copy.nextStepsText],
    [copy.licenses, copy.licenseText],
    [copy.limitations, copy.limitText],
    [copy.publicLink, PUBLIC_URL],
  ]) {
    methodology.drawText(section[0], {
      x: MARGIN,
      y: sectionY,
      font: bold,
      size: 12,
      color: teal,
    });
    sectionY = drawParagraph(
      methodology,
      section[1],
      MARGIN,
      sectionY - 22,
      regular,
      9,
      CONTENT_WIDTH,
      13,
    ) - 30;
  }
  methodology.drawRectangle({
    x: MARGIN,
    y: 118,
    width: CONTENT_WIDTH,
    height: 90,
    color: rgb(1, 0.97, 0.88),
    borderColor: rgb(0.84, 0.7, 0.31),
    borderWidth: 0.8,
  });
  drawParagraph(methodology, copy.notice, MARGIN + 16, 172, bold, 10, CONTENT_WIDTH - 32, 13, amber);
  drawParagraph(methodology, copy.signalsText, MARGIN + 16, 146, regular, 8, CONTENT_WIDTH - 32, 11, amber);
  drawFooter(methodology, reportId, copy.notice, regular, bold);

  const bytes = await pdf.save();
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="infinityatlas-territorial-intelligence-${locale}.pdf"`,
      "Cache-Control": "no-store",
      "X-InfinityAtlas-Report-Id": reportId,
      "X-InfinityAtlas-Report-Pages": "4",
    },
  });
}
