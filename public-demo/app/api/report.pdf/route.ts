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

function dominantEntry(
  values: Record<string, number>,
  labels: Record<string, string>,
) {
  const [key, value] = Object.entries(values).sort(
    (left, right) => right[1] - left[1],
  )[0] ?? ["", 0];
  return {
    key,
    value,
    label: value > 0 ? labels[key] ?? key.replaceAll("_", " ") : "—",
  };
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

function drawJustifiedParagraph(
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
    const words = line.split(/\s+/).filter(Boolean);
    const isLastLine = index === lines.length - 1;
    const wordsWidth = words.reduce(
      (total, word) => total + font.widthOfTextAtSize(word, size),
      0,
    );
    const gap = words.length > 1
      ? (maxWidth - wordsWidth) / (words.length - 1)
      : 0;
    if (isLastLine || words.length < 3 || gap > size * 0.75) {
      page.drawText(line, {
        x,
        y: y - index * lineHeight,
        font,
        size,
        color,
      });
      return;
    }
    let wordX = x;
    words.forEach((word, wordIndex) => {
      page.drawText(word, {
        x: wordX,
        y: y - index * lineHeight,
        font,
        size,
        color,
      });
      wordX += font.widthOfTextAtSize(word, size);
      if (wordIndex < words.length - 1) wordX += gap;
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
  mapBase: PDFImage | null,
  layout: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  } = {},
) {
  const x = layout.x ?? MARGIN;
  const y = layout.y ?? 70;
  const width = layout.width ?? CONTENT_WIDTH;
  const height = layout.height ?? 140;
  const visible = rows.filter(
    (row) => row.latitude !== null && row.longitude !== null,
  );
  page.drawText(title, {
    x,
    y: y + height + 35,
    font: bold,
    size: 9,
    color: teal,
  });
  drawParagraph(
    page,
    subtitle,
    x,
    y + height + 22,
    regular,
    6.4,
    width,
    8.5,
    muted,
  );
  let mapX = x;
  let mapY = y;
  let mapWidth = width;
  let mapHeight = height;
  if (mapBase) {
    const scale = Math.min(width / mapBase.width, height / mapBase.height);
    mapWidth = mapBase.width * scale;
    mapHeight = mapBase.height * scale;
    mapX = x + (width - mapWidth) / 2;
    mapY = y + (height - mapHeight) / 2;
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: rgb(0.87, 0.93, 0.95),
      borderColor: rgb(0.5, 0.64, 0.68),
      borderWidth: 0.8,
    });
    page.drawImage(mapBase, {
      x: mapX,
      y: mapY,
      width: mapWidth,
      height: mapHeight,
    });
  } else {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: rgb(0.87, 0.93, 0.95),
      borderColor: rgb(0.5, 0.64, 0.68),
      borderWidth: 0.8,
    });
  }
  page.drawRectangle({
    x: mapX + 8,
    y: mapY + mapHeight - 29,
    width: 132,
    height: 20,
    color: rgb(1, 1, 1),
    opacity: 0.88,
  });
  page.drawText("San Cristóbal · Galápagos", {
    x: mapX + 14,
    y: mapY + mapHeight - 22,
    font: bold,
    size: 8,
    color: teal,
  });
  if (!visible.length) {
    page.drawRectangle({
      x: mapX + 20,
      y: mapY + mapHeight / 2 - 18,
      width: mapWidth - 40,
      height: 36,
      color: rgb(1, 1, 1),
      opacity: 0.9,
    });
    page.drawText(hiddenText, {
      x: mapX + 30,
      y: mapY + mapHeight / 2 - 3,
      font: regular,
      size: 8,
      color: muted,
    });
    return;
  }
  page.drawText("N", {
    x: mapX + mapWidth - 28,
    y: mapY + mapHeight - 21,
    font: bold,
    size: 8,
    color: teal,
  });
  page.drawLine({
    start: { x: mapX + mapWidth - 24, y: mapY + mapHeight - 31 },
    end: { x: mapX + mapWidth - 24, y: mapY + mapHeight - 46 },
    thickness: 1.2,
    color: teal,
  });
  const mapBounds = {
    west: -89.9642625,
    east: -89.2611375,
    north: -0.636552067584237,
    south: -1.163828871399395,
  };
  const projected: Array<{ x: number; y: number }> = [];
  visible.forEach((row) => {
    const rawX =
      mapX +
      (((row.longitude as number) - mapBounds.west) /
        (mapBounds.east - mapBounds.west)) *
        mapWidth;
    const rawY =
      mapY +
      (((row.latitude as number) - mapBounds.south) /
        (mapBounds.north - mapBounds.south)) *
        mapHeight;
    const nearby = projected.filter(
      (point) => Math.hypot(point.x - rawX, point.y - rawY) < 25,
    ).length;
    const angle = nearby * (Math.PI * 2 / 6);
    const radius = nearby ? 22 + Math.floor((nearby - 1) / 6) * 12 : 0;
    const px = rawX + Math.cos(angle) * radius;
    const py = rawY + Math.sin(angle) * radius;
    if (radius) {
      page.drawLine({
        start: { x: rawX, y: rawY },
        end: { x: px, y: py },
        thickness: 0.8,
        color: teal,
        opacity: 0.75,
      });
    }
    projected.push({ x: rawX, y: rawY });
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

async function embedTerritorialMapBase(pdf: PDFDocument, request: Request) {
  try {
    const response = await env.ASSETS.fetch(
      new Request(
        new URL("/maps/san-cristobal-osm-z11.png", request.url),
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
        issued: "Fecha de emisión UTC",
        included: "Registros incluidos",
        id: "Identificador del reporte",
        source: "Fuente pública controlada: Cloudflare D1",
        contents: "Índice",
        prologue: "Prólogo",
        prologuePurpose: "Finalidad del informe",
        summary: "Resumen ejecutivo",
        summaryText: `Esta ${isFilteredReport ? "selección filtrada" : "lectura agregada"} contiene ${recordCountText} ${rows.length === 1 ? "controlado autorizado" : "controlados autorizados"} para la superficie pública de InfinityAtlas. Resume revisión metodológica, procedencia y prioridad demostrativa sin exponer evidencia, actores, comentarios ni coordenadas restringidas.`,
        selectionReading: "Lectura ejecutiva de la selección",
        predominantCategory: "Categoría predominante",
        predominantRisk: "Nivel de riesgo predominante",
        predominantProvenance: "Procedencia predominante",
        interpretationNote: "Nota interpretativa",
        interpretationNoteText: "La predominancia indica el grupo con mayor cantidad de registros dentro de esta selección controlada. No demuestra causalidad, gravedad clínica ni representatividad territorial.",
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
        recordSection: "Sección por registro",
        territorialInterpretation: "Interpretación territorial del registro",
        publicTraceability: "Trazabilidad pública",
        components: "Componentes metodológicos",
        hazard: "Peligro",
        exposure: "Exposición",
        vulnerability: "Vulnerabilidad",
        locationMode: "Modo de ubicación pública",
        publicNumber: "N.º",
        record: "ID técnico",
        title: "Nombre corto",
        score: "Puntaje / nivel",
        date: "Fecha",
        distributions: "Distribuciones de la selección",
        territoryView: "Representación territorial con geoprivacidad",
        territorialMap: "Mapa territorial de ubicaciones públicas permitidas",
        territoryViewHelp: "Representación pública no navegacional. Solo utiliza coordenadas autorizadas; omite las ubicaciones ocultas. Los símbolos cercanos pueden desplazarse ligeramente y conservan una línea guía hacia la ubicación autorizada.",
        noLocations: "La selección no contiene ubicaciones públicas visibles.",
        method: "Metodología y trazabilidad",
        methodText: "Puntaje de riesgo = Peligro + Exposición + Vulnerabilidad. Cada componente utiliza una escala de 1 a 4. Versión climate-health-risk-v0.1. El resultado es metodológico, no clínico.",
        geo: "Geoprivacidad",
        geoText: "Cada registro aplica un modo de ubicación pública: exacta, aproximada, agregada u oculta. El reporte no reconstruye coordenadas restringidas.",
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
        issued: "Issue date UTC",
        included: "Records included",
        id: "Report identifier",
        source: "Controlled public source: Cloudflare D1",
        contents: "Contents",
        prologue: "Prologue",
        prologuePurpose: "Report purpose",
        summary: "Executive summary",
        summaryText: `This ${isFilteredReport ? "filtered selection" : "aggregate reading"} contains ${recordCountText} authorized for the InfinityAtlas public surface. It summarizes methodological review, provenance and demonstration priority without exposing evidence, actors, comments or restricted coordinates.`,
        selectionReading: "Executive reading of the selection",
        predominantCategory: "Predominant category",
        predominantRisk: "Predominant risk level",
        predominantProvenance: "Predominant data provenance",
        interpretationNote: "Interpretive note",
        interpretationNoteText: "Predominance means the group with the largest record count inside this controlled selection. It does not demonstrate causality, clinical severity or territorial representativeness.",
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
        recordSection: "Record section",
        territorialInterpretation: "Territorial interpretation of the record",
        publicTraceability: "Public traceability",
        components: "Methodological components",
        hazard: "Hazard",
        exposure: "Exposure",
        vulnerability: "Vulnerability",
        locationMode: "Public location mode",
        publicNumber: "No.",
        record: "Technical ID",
        title: "Record title",
        score: "Score / level",
        date: "Date",
        distributions: "Selection distributions",
        territoryView: "Territorial representation with geoprivacy",
        territorialMap: "Territorial map of permitted public locations",
        territoryViewHelp: "Non-navigational public representation. It uses only authorized coordinates and omits hidden locations. Nearby symbols may be displaced slightly and retain a leader line to the authorized location.",
        noLocations: "The selection has no visible public locations.",
        method: "Methodology and traceability",
        methodText: "Risk Score = Hazard + Exposure + Vulnerability. Each component uses a 1 to 4 scale. Version climate-health-risk-v0.1. The result is methodological, not clinical.",
        geo: "Geographic privacy",
        geoText: "Each record applies a public location mode: exact, approximate, aggregate or hidden. The report does not reconstruct restricted coordinates.",
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
  const territorialMapBase = await embedTerritorialMapBase(pdf, request);

  if (rows.length > 1) {
    const categoryDominant = dominantEntry(categories, copy.categoryLabels);
    const riskDominant = dominantEntry(risks, copy.riskLabels);
    const provenanceDominant = dominantEntry(
      provenance,
      copy.provenanceLabels,
    );
    const multiPageCount = rows.length + 5;
    const mapPageNumber = rows.length + 4;
    const methodPageNumber = rows.length + 5;
    const locationLabels = locale === "es"
      ? {
          exact_public: "Exacta pública",
          approximate: "Aproximada",
          aggregate: "Agregada",
          hidden: "Oculta",
        }
      : {
          exact_public: "Exact public",
          approximate: "Approximate",
          aggregate: "Aggregate",
          hidden: "Hidden",
        };
    const prologueText = locale === "es"
      ? `Este informe contiene ${recordCountText}, observados entre ${periodStart} y ${periodEnd}. Su finalidad es presentar una lectura pública, reproducible y metodológicamente trazable de datos controlados de InfinityAtlas para San Cristóbal. Es una demostración pública controlada: no constituye un diagnóstico clínico, no verifica por sí sola un evento territorial y no presenta los puntajes como emergencias reales.`
      : `This report contains ${recordCountText}, observed from ${periodStart} to ${periodEnd}. Its purpose is to provide a public, reproducible and methodologically traceable reading of controlled InfinityAtlas data for San Cristobal. It is a controlled public demonstration: it is not a clinical diagnosis, does not independently verify a territorial event and does not present scores as real emergencies.`;
    const purposeText = locale === "es"
      ? "Organizar cada registro autorizado, su trazabilidad pública, sus componentes metodológicos y su ubicación permitida para revisión y demostración del prototipo."
      : "Organize each authorized record, its public traceability, methodological components and permitted location for prototype review and demonstration.";
    const recordInterpretation = (row: DemoRow) => {
      const statusReading = locale === "es"
        ? {
            pending: "El registro permanece pendiente de revisión metodológica por una persona autorizada.",
            validated: "El registro fue considerado metodológicamente completo; esta condición no confirma por sí sola que el evento ocurrió.",
            observed: "El registro requiere aclaraciones, correcciones o evidencia adicional antes de una decisión metodológica posterior.",
            rejected: "El registro no cumplió los requisitos mínimos de calidad o evidencia para ser validado.",
          }[row.reviewStatus] ?? "El estado conserva el resultado de la revisión metodológica registrada."
        : {
            pending: "The record remains pending methodological review by an authorized person.",
            validated: "The record was considered methodologically complete; this status does not independently confirm that the event occurred.",
            observed: "The record requires clarification, correction or additional evidence before a later methodological decision.",
            rejected: "The record did not meet the minimum quality or evidence requirements for validation.",
          }[row.reviewStatus] ?? "The status preserves the recorded methodological review outcome.";
      const locationReading = row.publicLocationMode === "hidden"
        ? locale === "es"
          ? "La ubicación pública está oculta y el informe no reconstruye sus coordenadas."
          : "The public location is hidden and the report does not reconstruct its coordinates."
        : locale === "es"
          ? `El modo de ubicación pública es ${locationLabels[row.publicLocationMode as keyof typeof locationLabels] ?? row.publicLocationMode} y solo representa la precisión autorizada.`
          : `The public location mode is ${locationLabels[row.publicLocationMode as keyof typeof locationLabels] ?? row.publicLocationMode} and represents only the authorized precision.`;
      return locale === "es"
        ? `Este registro documenta una observación demostrativa de ${copy.categoryLabels[row.category] ?? row.category} en ${copy.territory}, con fecha ${row.observedAt.slice(0, 10)}. El puntaje ${row.riskScore} (${copy.riskLabels[row.riskLevel] ?? row.riskLevel}) se obtiene de Peligro ${row.hazard} + Exposición ${row.exposure} + Vulnerabilidad ${row.vulnerability}. Su procedencia es ${copy.provenanceLabels[row.dataProvenance] ?? row.dataProvenance}. ${statusReading} ${locationReading} Esta lectura orienta la revisión del registro y no expresa causalidad, diagnóstico ni emergencia territorial.`
        : `This record documents a demonstrative ${copy.categoryLabels[row.category] ?? row.category} observation in ${copy.territory}, dated ${row.observedAt.slice(0, 10)}. The score of ${row.riskScore} (${copy.riskLabels[row.riskLevel] ?? row.riskLevel}) is obtained from Hazard ${row.hazard} + Exposure ${row.exposure} + Vulnerability ${row.vulnerability}. Its provenance is ${copy.provenanceLabels[row.dataProvenance] ?? row.dataProvenance}. ${statusReading} ${locationReading} This reading supports record review and does not express causality, diagnosis or territorial emergency.`;
    };

    const multiCover = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    multiCover.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: rgb(0.97, 0.98, 0.98),
    });
    multiCover.drawRectangle({
      x: 0,
      y: 0,
      width: 18,
      height: PAGE_HEIGHT,
      color: teal,
    });
    drawCoverLogo(multiCover, logo, bold, regular);
    drawParagraph(
      multiCover,
      copy.report,
      MARGIN,
      570,
      bold,
      20,
      CONTENT_WIDTH,
      24,
      teal,
    );
    multiCover.drawText(copy.territory, {
      x: MARGIN,
      y: 516,
      font: bold,
      size: 13,
      color: ink,
    });
    multiCover.drawText(copy.scope, {
      x: MARGIN,
      y: 494,
      font: bold,
      size: 8.5,
      color: green,
    });
    drawMetric(
      multiCover,
      MARGIN,
      414,
      158,
      copy.issued,
      generatedAt.slice(0, 16).replace("T", " "),
      regular,
      bold,
    );
    drawMetric(
      multiCover,
      MARGIN + 172,
      414,
      158,
      copy.included,
      String(rows.length),
      regular,
      bold,
    );
    drawMetric(
      multiCover,
      MARGIN + 344,
      414,
      167,
      copy.id,
      reportId,
      regular,
      bold,
    );
    multiCover.drawText(copy.source, {
      x: MARGIN,
      y: 380,
      font: bold,
      size: 8,
      color: green,
    });
    drawParagraph(
      multiCover,
      `${copy.period}: ${periodStart} / ${periodEnd}`,
      MARGIN,
      350,
      regular,
      10,
      CONTENT_WIDTH,
      14,
    );
    multiCover.drawRectangle({
      x: MARGIN,
      y: 145,
      width: CONTENT_WIDTH,
      height: 82,
      color: rgb(1, 0.97, 0.88),
      borderColor: rgb(0.84, 0.7, 0.31),
      borderWidth: 0.8,
    });
    drawParagraph(
      multiCover,
      copy.notice,
      MARGIN + 16,
      194,
      bold,
      11,
      CONTENT_WIDTH - 32,
      14,
      amber,
    );
    drawJustifiedParagraph(
      multiCover,
      copy.signalsText,
      MARGIN + 16,
      170,
      regular,
      8,
      CONTENT_WIDTH - 32,
      11,
      amber,
    );
    multiCover.drawText("INFINITYGAIA S.A.S. B.I.C.", {
      x: MARGIN,
      y: 72,
      font: bold,
      size: 9,
      color: teal,
    });
    multiCover.drawText(PUBLIC_URL, {
      x: MARGIN,
      y: 56,
      font: regular,
      size: 7,
      color: muted,
    });

    const contentsPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageHeader(contentsPage, copy.contents, 2, bold);
    contentsPage.drawText(copy.contents, {
      x: MARGIN,
      y: 758,
      font: bold,
      size: 15,
      color: teal,
    });
    const contentsEntries = [
      [copy.prologue, "2"],
      [copy.summary, "3"],
      ...rows.map((row, index) => [
        `${locale === "es" ? "Registro" : "Record"} ${index + 1} · #${row.id}`,
        String(index + 4),
      ]),
      [copy.territorialMap, String(mapPageNumber)],
      [copy.method, String(methodPageNumber)],
    ];
    let contentsY = 724;
    for (const [labelText, pageText] of contentsEntries) {
      contentsPage.drawText(labelText, {
        x: MARGIN,
        y: contentsY,
        font: regular,
        size: 8.5,
        color: ink,
        maxWidth: 420,
      });
      contentsPage.drawLine({
        start: { x: 390, y: contentsY + 2 },
        end: { x: 505, y: contentsY + 2 },
        thickness: 0.4,
        color: rgb(0.75, 0.8, 0.81),
      });
      contentsPage.drawText(pageText, {
        x: 515,
        y: contentsY,
        font: bold,
        size: 8.5,
        color: teal,
      });
      contentsY -= 22;
    }
    const prologueY = Math.min(470, contentsY - 12);
    contentsPage.drawText(copy.prologue, {
      x: MARGIN,
      y: prologueY,
      font: bold,
      size: 13,
      color: teal,
    });
    let prologueBottom = drawJustifiedParagraph(
      contentsPage,
      prologueText,
      MARGIN,
      prologueY - 24,
      regular,
      9,
      CONTENT_WIDTH,
      13,
    ) - 20;
    contentsPage.drawText(copy.prologuePurpose, {
      x: MARGIN,
      y: prologueBottom,
      font: bold,
      size: 10,
      color: teal,
    });
    prologueBottom = drawJustifiedParagraph(
      contentsPage,
      purposeText,
      MARGIN,
      prologueBottom - 19,
      regular,
      8.5,
      CONTENT_WIDTH,
      12,
    );
    drawFooter(contentsPage, reportId, copy.notice, regular, bold);

    const summaryPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageHeader(summaryPage, copy.summary, 3, bold);
    summaryPage.drawText(copy.summary, {
      x: MARGIN,
      y: 758,
      font: bold,
      size: 15,
      color: teal,
    });
    drawJustifiedParagraph(
      summaryPage,
      copy.summaryText,
      MARGIN,
      730,
      regular,
      9,
      CONTENT_WIDTH,
      13,
    );
    drawMetric(
      summaryPage,
      MARGIN,
      625,
      115,
      copy.included,
      String(rows.length),
      regular,
      bold,
    );
    drawMetric(
      summaryPage,
      MARGIN + 127,
      625,
      120,
      copy.predominantCategory,
      categoryDominant.label,
      regular,
      bold,
    );
    drawMetric(
      summaryPage,
      MARGIN + 259,
      625,
      120,
      copy.predominantRisk,
      riskDominant.label,
      regular,
      bold,
    );
    drawMetric(
      summaryPage,
      MARGIN + 391,
      625,
      120,
      copy.predominantProvenance,
      provenanceDominant.label,
      regular,
      bold,
    );
    summaryPage.drawText(copy.interpretationNote, {
      x: MARGIN,
      y: 590,
      font: bold,
      size: 10,
      color: teal,
    });
    drawJustifiedParagraph(
      summaryPage,
      copy.interpretationNoteText,
      MARGIN,
      572,
      regular,
      8,
      CONTENT_WIDTH,
      11,
    );
    summaryPage.drawText(copy.distributions, {
      x: MARGIN,
      y: 520,
      font: bold,
      size: 11,
      color: teal,
    });
    drawBars(
      summaryPage,
      MARGIN,
      494,
      238,
      copy.status,
      status,
      copy.statusLabels,
      rows.length,
      regular,
      bold,
    );
    drawBars(
      summaryPage,
      MARGIN + 273,
      494,
      238,
      copy.risk,
      risks,
      copy.riskLabels,
      rows.length,
      regular,
      bold,
    );
    drawBars(
      summaryPage,
      MARGIN,
      390,
      238,
      copy.category,
      categories,
      copy.categoryLabels,
      rows.length,
      regular,
      bold,
    );
    drawBars(
      summaryPage,
      MARGIN + 273,
      390,
      238,
      copy.provenance,
      provenance,
      copy.provenanceLabels,
      rows.length,
      regular,
      bold,
    );
    summaryPage.drawText(copy.climate, {
      x: MARGIN,
      y: 260,
      font: bold,
      size: 11,
      color: teal,
    });
    drawJustifiedParagraph(
      summaryPage,
      copy.climateText,
      MARGIN,
      242,
      regular,
      7.5,
      CONTENT_WIDTH,
      10,
      muted,
    );
    if (climate) {
      drawMetric(summaryPage, MARGIN, 150, 118, copy.temperature, `${climate.temperature_2m} °C`, regular, bold);
      drawMetric(summaryPage, MARGIN + 130, 150, 118, copy.humidity, `${climate.relative_humidity_2m}%`, regular, bold);
      drawMetric(summaryPage, MARGIN + 260, 150, 118, copy.apparent, `${climate.apparent_temperature} °C`, regular, bold);
      drawMetric(summaryPage, MARGIN + 390, 150, 121, copy.precipitation, `${climate.precipitation} mm`, regular, bold);
      drawParagraph(
        summaryPage,
        `${copy.observed}: ${climate.time}${climate.is_stale ? ` · ${copy.fallback}` : ""}`,
        MARGIN,
        132,
        regular,
        7.2,
        CONTENT_WIDTH,
        10,
        climate.is_stale ? amber : muted,
      );
    } else {
      drawParagraph(
        summaryPage,
        copy.unavailable,
        MARGIN,
        200,
        regular,
        8,
        CONTENT_WIDTH,
        11,
        amber,
      );
    }
    drawFooter(summaryPage, reportId, copy.notice, regular, bold);

    rows.forEach((row, index) => {
      const pageNumber = index + 4;
      const recordPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const recordLabel = locale === "es"
        ? `Registro ${index + 1}`
        : `Record ${index + 1}`;
      drawPageHeader(recordPage, `${recordLabel} · #${row.id}`, pageNumber, bold);
      recordPage.drawText(recordLabel, {
        x: MARGIN,
        y: 758,
        font: bold,
        size: 15,
        color: teal,
      });
      const recordTitle = localizedRecordTitle(
        row.id,
        row.recordTitle,
        locale,
      );
      drawParagraph(
        recordPage,
        recordTitle,
        MARGIN,
        730,
        bold,
        13,
        CONTENT_WIDTH,
        17,
        ink,
      );
      drawParagraph(
        recordPage,
        locale === "es"
          ? `${copy.publicTraceability}: ID #${row.id} · N.º público InfinityAtlas ${publicRecordNumber(row.id)}`
          : `${copy.publicTraceability}: ID #${row.id} · InfinityAtlas public No. ${publicRecordNumber(row.id)}`,
        MARGIN,
        694,
        regular,
        8,
        CONTENT_WIDTH,
        11,
        muted,
      );
      drawMetric(
        recordPage,
        MARGIN,
        610,
        118,
        copy.category,
        copy.categoryLabels[row.category] ?? row.category,
        regular,
        bold,
      );
      drawMetric(
        recordPage,
        MARGIN + 130,
        610,
        118,
        copy.status,
        copy.statusLabels[row.reviewStatus] ?? row.reviewStatus,
        regular,
        bold,
      );
      drawMetric(
        recordPage,
        MARGIN + 260,
        610,
        118,
        copy.score,
        `${row.riskScore} · ${copy.riskLabels[row.riskLevel] ?? row.riskLevel}`,
        regular,
        bold,
      );
      drawMetric(
        recordPage,
        MARGIN + 390,
        610,
        121,
        copy.provenance,
        copy.provenanceLabels[row.dataProvenance] ?? row.dataProvenance,
        regular,
        bold,
      );
      recordPage.drawText(copy.components, {
        x: MARGIN,
        y: 576,
        font: bold,
        size: 11,
        color: teal,
      });
      drawMetric(recordPage, MARGIN, 494, 158, copy.hazard, String(row.hazard), regular, bold);
      drawMetric(recordPage, MARGIN + 172, 494, 158, copy.exposure, String(row.exposure), regular, bold);
      drawMetric(recordPage, MARGIN + 344, 494, 167, copy.vulnerability, String(row.vulnerability), regular, bold);
      drawParagraph(
        recordPage,
        `${copy.date}: ${row.observedAt.slice(0, 10)} · ${copy.locationMode}: ${locationLabels[row.publicLocationMode as keyof typeof locationLabels] ?? row.publicLocationMode}`,
        MARGIN,
        468,
        regular,
        8,
        CONTENT_WIDTH,
        11,
        muted,
      );
      recordPage.drawRectangle({
        x: MARGIN,
        y: 230,
        width: CONTENT_WIDTH,
        height: 190,
        color: pale,
        borderColor: rgb(0.55, 0.68, 0.7),
        borderWidth: 0.8,
      });
      recordPage.drawText(copy.territorialInterpretation, {
        x: MARGIN + 16,
        y: 390,
        font: bold,
        size: 12,
        color: teal,
      });
      drawJustifiedParagraph(
        recordPage,
        recordInterpretation(row),
        MARGIN + 16,
        365,
        regular,
        9,
        CONTENT_WIDTH - 32,
        13,
      );
      recordPage.drawRectangle({
        x: MARGIN,
        y: 112,
        width: CONTENT_WIDTH,
        height: 82,
        color: rgb(1, 0.97, 0.88),
        borderColor: rgb(0.84, 0.7, 0.31),
        borderWidth: 0.8,
      });
      drawJustifiedParagraph(
        recordPage,
        copy.signalsText,
        MARGIN + 16,
        165,
        bold,
        8.5,
        CONTENT_WIDTH - 32,
        12,
        amber,
      );
      drawFooter(recordPage, reportId, copy.notice, regular, bold);
    });

    const mapPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageHeader(mapPage, copy.territorialMap, mapPageNumber, bold);
    mapPage.drawText(copy.territorialMap, {
      x: MARGIN,
      y: 758,
      font: bold,
      size: 15,
      color: teal,
    });
    drawJustifiedParagraph(
      mapPage,
      copy.territoryViewHelp,
      MARGIN,
      730,
      regular,
      8.5,
      CONTENT_WIDTH,
      12,
      muted,
    );
    drawTerritorialRepresentation(
      mapPage,
      rows,
      copy.territoryView,
      copy.territoryViewHelp,
      copy.noLocations,
      regular,
      bold,
      territorialMapBase,
      { y: 250, height: 383 },
    );
    drawFooter(mapPage, reportId, copy.notice, regular, bold);

    const multiMethodology = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageHeader(
      multiMethodology,
      copy.method,
      methodPageNumber,
      bold,
    );
    let multiSectionY = 758;
    for (const section of [
      [copy.method, copy.methodText],
      [copy.geo, copy.geoText],
      [copy.nextSteps, copy.nextStepsText],
      [copy.licenses, copy.licenseText],
      [copy.limitations, copy.limitText],
      [copy.publicLink, PUBLIC_URL],
    ]) {
      multiMethodology.drawText(section[0], {
        x: MARGIN,
        y: multiSectionY,
        font: bold,
        size: 12,
        color: teal,
      });
      const drawSection = section[0] === copy.publicLink
        ? drawParagraph
        : drawJustifiedParagraph;
      multiSectionY = drawSection(
        multiMethodology,
        section[1],
        MARGIN,
        multiSectionY - 22,
        regular,
        9,
        CONTENT_WIDTH,
        13,
      ) - 30;
    }
    multiMethodology.drawRectangle({
      x: MARGIN,
      y: 118,
      width: CONTENT_WIDTH,
      height: 90,
      color: rgb(1, 0.97, 0.88),
      borderColor: rgb(0.84, 0.7, 0.31),
      borderWidth: 0.8,
    });
    drawParagraph(
      multiMethodology,
      copy.notice,
      MARGIN + 16,
      172,
      bold,
      10,
      CONTENT_WIDTH - 32,
      13,
      amber,
    );
    drawJustifiedParagraph(
      multiMethodology,
      copy.signalsText,
      MARGIN + 16,
      146,
      regular,
      8,
      CONTENT_WIDTH - 32,
      11,
      amber,
    );
    drawFooter(
      multiMethodology,
      reportId,
      copy.notice,
      regular,
      bold,
    );

    const multiBytes = await pdf.save();
    return new Response(multiBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="infinityatlas-territorial-intelligence-${locale}.pdf"`,
        "Cache-Control": "no-store",
        "X-InfinityAtlas-Report-Id": reportId,
        "X-InfinityAtlas-Report-Pages": String(multiPageCount),
      },
    });
  }

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
  drawJustifiedParagraph(cover, copy.summaryText, MARGIN, 344, regular, 10, CONTENT_WIDTH, 14);
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
  drawJustifiedParagraph(cover, copy.signalsText, MARGIN + 16, 170, regular, 8, CONTENT_WIDTH - 32, 11, amber);
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
  y = drawJustifiedParagraph(overview, copy.summaryText, MARGIN, y - 24, regular, 9, CONTENT_WIDTH, 13) - 16;
  overview.drawText(copy.selectionReading, {
    x: MARGIN,
    y,
    font: bold,
    size: 11,
    color: teal,
  });
  y = drawJustifiedParagraph(
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
  drawJustifiedParagraph(overview, copy.climateText, MARGIN, y - 17, regular, 7.5, CONTENT_WIDTH, 10, muted);
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
  drawJustifiedParagraph(overview, copy.signalsText, MARGIN, y - 18, regular, 7.5, CONTENT_WIDTH, 10, muted);
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
    territorialMapBase,
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
    const drawSection = section[0] === copy.publicLink
      ? drawParagraph
      : drawJustifiedParagraph;
    sectionY = drawSection(
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
  drawJustifiedParagraph(methodology, copy.signalsText, MARGIN + 16, 146, regular, 8, CONTENT_WIDTH - 32, 11, amber);
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
