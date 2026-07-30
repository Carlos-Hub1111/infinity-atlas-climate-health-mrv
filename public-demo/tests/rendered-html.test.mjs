import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const file = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("keeps the public surface branded, read-only and responsive", async () => {
  const [page, layout, dashboard, css, packageJson, schema, brand] =
    await Promise.all([
      file("../app/page.tsx"),
      file("../app/layout.tsx"),
      file("../app/PublicDashboard.tsx"),
      file("../app/globals.css"),
      file("../package.json"),
      file("../db/schema.ts"),
      file("../../BRAND.md"),
    ]);

  assert.match(page, /<PublicDashboard \/>/);
  assert.match(layout, /InfinityAtlas Climate & Health MRV Toolkit/);
  assert.match(dashboard, /alt="InfinityAtlas"/);
  assert.match(dashboard, /\/brand\/infinityatlas-logo-official\.png/);
  assert.match(dashboard, /await import\("leaflet"\)/);
  assert.doesNotMatch(dashboard, /import L from "leaflet"/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /\.language > span, \.language select \{ overflow-wrap: normal; white-space: nowrap; \}/);
  assert.match(packageJson, /"leaflet": "1\.9\.4"/);
  assert.deepEqual(
    [...schema.matchAll(/sqliteTable\("([^"]+)"/g)].map((match) => match[1]),
    ["demo_observations", "climate_snapshots"],
  );
  assert.match(brand, /INFINITYGAIA S\.A\.S\. B\.I\.C\./);
  assert.match(brand, /does not grant permission/i);
  assert.doesNotMatch(dashboard, /UNICEF/);
});

test("localizes D1, controlled record titles and safe location modes", async () => {
  const [dashboard, content, filters] = await Promise.all([
    file("../app/PublicDashboard.tsx"),
    file("../lib/public-content.ts"),
    file("../lib/public-filters.ts"),
  ]);

  assert.match(dashboard, /dataSource: "Fuente de datos"/);
  assert.match(
    dashboard,
    /dataSourceValue: "Base demostrativa controlada en Cloudflare D1"/,
  );
  assert.match(dashboard, /d1HelpLabel/);
  assert.match(dashboard, /<InfoTooltip labelText=\{t\.d1HelpLabel\}/);
  assert.match(content, /Observación controlada de ruta de agua/);
  assert.match(content, /Seguimiento controlado de ruta de calor/);
  assert.match(content, /Ubicación pública aproximada/);
  assert.match(dashboard, /localizedRecordTitle\(item\.id/);
  assert.match(dashboard, /publicLocationModeLabels\[locale\]/);
  assert.match(filters, /searchableRecordTitles/);
});

test("provides reproducible filters, safe results and filtered downloads", async () => {
  const [dashboard, dashboardRoute, css, publicFilters] = await Promise.all([
    file("../app/PublicDashboard.tsx"),
    file("../app/api/dashboard/route.ts"),
    file("../app/globals.css"),
    file("../lib/public-filters.ts"),
  ]);

  assert.match(dashboard, /window\.history\.replaceState/);
  assert.match(dashboard, /function pageQuery\(filters: Filters, locale: Locale\)/);
  assert.match(dashboard, /params\.set\("lang", "es"\)/);
  assert.match(dashboard, /setLocale\(params\.get\("lang"\) === "es"/);
  assert.match(dashboard, /activeFilterChips/);
  assert.match(dashboard, /className="activeFilterSummary"/);
  assert.match(dashboard, /className="resultsSection"/);
  assert.match(dashboard, /showingRecords/);
  assert.match(dashboard, /localizedRecordTitle/);
  assert.match(dashboard, /viewOnMap\(item\)/);
  assert.match(dashboard, /\/api\/report\.pdf\$\{pdfQuery\}/);
  assert.match(dashboard, /\/api\/export\.csv\$\{downloadQuery\}/);
  assert.match(dashboard, /\/api\/export\.excel\.csv\$\{downloadQuery\}/);
  assert.match(dashboard, /infinityatlas-public-data-dictionary\.csv/);
  assert.match(dashboardRoute, /total_available: totalRows/);
  assert.match(dashboardRoute, /public_number: publicRecordNumber\(row\.id\)/);
  assert.match(dashboard, /publicRecordReference\(item\.id, locale\)/);
  assert.match(dashboard, /requestSequence/);
  assert.match(dashboard, /selectedIds/);
  assert.match(dashboard, /toggleRecordSelection/);
  assert.match(dashboard, /toggleAllVisible/);
  assert.match(dashboard, /downloadParams\.set\("ids", selectedIdsValue\)/);
  assert.match(dashboard, /ref=\{selectAllRef\}/);
  assert.match(dashboard, /className=\{selectedIds\.has\(item\.id\) \? "selectedRow"/);
  assert.match(publicFilters, /Invalid ids/);
  assert.match(publicFilters, /selectedIds\.length > 50/);
  assert.match(publicFilters, /!selectedIds\.includes\(row\.id\)/);
  assert.doesNotMatch(dashboard, /function clear\(\)[\s\S]{0,180}setLoading\(true\)/);
  assert.match(css, /\.resultsSection td::before/);
  assert.match(css, /\.resultsTableWrap/);
});

test("separates provider observation time from the latest InfinityAtlas query", async () => {
  const [dashboard, climateRoute] = await Promise.all([
    file("../app/PublicDashboard.tsx"),
    file("../app/api/climate/route.ts"),
  ]);

  assert.match(dashboard, /providerObserved: "Observed by provider"/);
  assert.match(dashboard, /atlasQueried: "Last InfinityAtlas query"/);
  assert.match(dashboard, /climateNoChange/);
  assert.match(dashboard, /previousObservedAt === nextClimate\.observed_at/);
  assert.match(dashboard, /aria-busy=\{climateLoading\}/);
  assert.match(dashboard, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(dashboard, /disabled=\{climateLoading\}/);
  assert.match(climateRoute, /retrieved_at: new Date\(\)\.toISOString\(\)/);
  assert.match(climateRoute, /stored_retrieved_at: fallback\.retrievedAt/);
  assert.match(climateRoute, /is_stale: true/);
  assert.match(dashboard, /Learn about the Open-Meteo source/);
  assert.match(dashboard, /Conocer la fuente Open-Meteo/);
  assert.match(dashboard, /View technical JSON response/);
  assert.match(dashboard, /Ver respuesta técnica JSON/);
  assert.match(dashboard, /climate\.source_url/);
  assert.match(dashboard, /jsonHelp/);
});

test("keeps each chart dimension separate and keyboard accessible", async () => {
  const [dashboard, dashboardRoute] = await Promise.all([
    file("../app/PublicDashboard.tsx"),
    file("../app/api/dashboard/route.ts"),
  ]);

  assert.match(dashboard, /type DonutDimension/);
  assert.match(dashboard, /function DonutChart/);
  assert.match(dashboard, /onDimensionChange/);
  assert.match(dashboard, /strokeDasharray/);
  assert.match(dashboard, /role="tooltip"/);
  assert.match(dashboard, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(dashboard, /function useDismissibleSelection/);
  assert.match(dashboard, /document\.addEventListener\("pointerdown"/);
  assert.match(dashboard, /onMouseLeave=\{\(\) => setActiveKey\(""\)\}/);
  assert.match(dashboard, /event\.key === "Escape"/);
  assert.match(dashboard, /function TrendChart/);
  assert.match(dashboard, /Registros observados por fecha/);
  assert.match(dashboard, /La muestra contiene un registro por fecha/);
  assert.match(dashboard, /Lectura de la selección/);
  assert.match(dashboard, /selectionInterpretation/);
  assert.match(dashboard, /no representa evolución clínica ni intensidad del riesgo/i);
  assert.match(dashboardRoute, /categories: \[\.\.\.item\.categories\]/);
  assert.match(dashboardRoute, /risk_levels: \[\.\.\.item\.riskLevels\]/);
  assert.match(dashboard, /no representan una emergencia territorial real/);
  assert.match(dashboard, /Complementary territorial reading/);
  assert.match(dashboard, /Lectura territorial complementaria/);
  assert.match(dashboard, /dominantLabel\(data\.categories/);
  assert.match(dashboard, /dominantLabel\(data\.risk/);
  assert.match(dashboard, /dominantLabel\(data\.provenance/);
  assert.match(dashboard, /className="chart territorialReading"/);
});

test("keeps the map mounted and applies geoprivacy-aware selection behavior", async () => {
  const dashboard = await file("../app/PublicDashboard.tsx");

  assert.match(dashboard, /visiblePoints\.length === 1/);
  assert.match(dashboard, /onlyMarker\?\.openPopup/);
  assert.match(dashboard, /map\.current\.fitBounds/);
  assert.match(dashboard, /setMapAnnouncement\(t\.mapFocused\)/);
  assert.match(dashboard, /map\.current\.setView\(\[-0\.9002, -89\.6127\], 12\)/);
  assert.match(dashboard, /public_location_mode === "hidden"/);
  assert.match(dashboard, /hiddenExplanation/);
  assert.match(dashboard, /loading && !data/);
  assert.match(dashboard, /aria-busy=\{loading\}/);
});

test("generates bilingual single-record and structured multi-record reports", async () => {
  const report = await file("../app/api/report.pdf/route.ts");

  assert.match(report, /\/brand\/infinityatlas-logo-official\.png/);
  assert.match(report, /\/maps\/san-cristobal-osm-z11\.png/);
  assert.match(report, /Interpretive territorial climate and health report/);
  assert.match(report, /Informe territorial interpretativo de clima y salud/);
  assert.match(report, /FILTERED REPORT/);
  assert.match(report, /REPORTE FILTRADO/);
  assert.match(report, /Executive reading of the selection/);
  assert.match(report, /Lectura ejecutiva de la selección/);
  assert.match(report, /Complementary climate context/);
  assert.match(report, /Contexto climático complementario/);
  assert.match(report, /Suggested methodological next steps/);
  assert.match(report, /Próximos pasos metodológicos sugeridos/);
  assert.match(report, /rows\.length === 1 \? "registro" : "registros"/);
  assert.match(report, /Señales metodológicas de prioridad/);
  assert.match(report, /Registros públicos controlados/);
  assert.match(report, /Representación territorial con geoprivacidad/);
  assert.match(report, /Metodología y trazabilidad/);
  assert.match(report, /copy\.statusLabels/);
  assert.match(report, /localizedRecordTitle\(row\.id/);
  assert.match(report, /publicRecordNumber\(row\.id\)/);
  assert.match(report, /pdf\.addPage/g);
  assert.match(report, /"X-InfinityAtlas-Report-Pages": "4"/);
  assert.match(report, /if \(rows\.length > 1\)/);
  assert.match(report, /const multiPageCount = rows\.length \+ 5/);
  assert.match(report, /Índice/);
  assert.match(report, /Prólogo/);
  assert.match(report, /Interpretación territorial del registro/);
  assert.match(report, /Territorial interpretation of the record/);
  assert.match(report, /Mapa territorial de ubicaciones públicas permitidas/);
  assert.match(report, /rows\.forEach\(\(row, index\) =>/);
  assert.match(report, /ID #\$\{row\.id\}/);
  assert.match(report, /recordInterpretation\(row\)/);
  assert.match(report, /function drawJustifiedParagraph/);
  assert.match(report, /Cada registro aplica un modo de ubicación pública: exacta, aproximada, agregada u oculta\./);
  assert.match(report, /west: -89\.9642625/);
  assert.match(report, /territorialMapBase/);
  assert.match(report, /"X-InfinityAtlas-Report-Pages": String\(multiPageCount\)/);
  assert.match(report, /no constituyen emergencias reales/i);
  assert.match(report, /no demuestra selección, financiamiento, asociación ni respaldo de UNICEF/);
});

test("keeps the technical CSV stable, UTF-8 and free of internal fields", async () => {
  const [csvRoute, excelRoute, dictionary] = await Promise.all([
    file("../app/api/export.csv/route.ts"),
    file("../app/api/export.excel.csv/route.ts"),
    file("../public/data/infinityatlas-public-data-dictionary.csv"),
  ]);

  const expectedColumns = [
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
  expectedColumns.forEach((column) => {
    assert.match(csvRoute, new RegExp(`"${column}"`));
    assert.match(dictionary, new RegExp(`^"${column}",`, "m"));
  });
  assert.match(csvRoute, /\\uFEFF/);
  assert.match(csvRoute, /public-v1/);
  assert.match(csvRoute, /rel="describedby"/);
  assert.doesNotMatch(csvRoute, /password|token|actor|comment|evidence|audit/i);
  assert.match(excelRoute, /join\(";"\)/);
  assert.match(excelRoute, /\\uFEFF/);
  assert.match(excelRoute, /N\.º público/);
  assert.match(excelRoute, /public-excel-es-v1/);
  assert.match(excelRoute, /localizedRecordTitle\(row\.id, row\.recordTitle, "es"\)/);
  assert.doesNotMatch(excelRoute, /password|token|actor|comment|evidence|audit/i);
});

test("applies a restrained cool visual treatment without changing the official logo", async () => {
  const [css, dashboard] = await Promise.all([
    file("../app/globals.css"),
    file("../app/PublicDashboard.tsx"),
  ]);

  assert.match(css, /linear-gradient\(rgba\(0, 59, 73, \.035\) 1px/);
  assert.match(css, /background-size: 32px 32px/);
  assert.match(css, /background-attachment: fixed/);
  assert.match(css, /box-shadow: 0 5px 16px/);
  assert.match(css, /@media print/);
  assert.match(css, /\.selectionReading/);
  assert.match(css, /\.mapAnnouncement/);
  assert.match(css, /\.territorialReading/);
  assert.match(css, /\.manualSelectionNotice/);
  assert.match(css, /\.selectedRow/);
  assert.match(dashboard, /src="\/brand\/infinityatlas-logo-official\.png"/);
});
