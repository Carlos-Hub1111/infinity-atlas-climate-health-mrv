import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the public surface branded and free of starter code", async () => {
  const [page, layout, dashboard, css, packageJson, dashboardRoute] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/PublicDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/dashboard/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<PublicDashboard \/>/);
  assert.match(layout, /InfinityAtlas Climate & Health MRV Toolkit/);
  assert.match(dashboard, /InfinityAtlas/);
  assert.match(dashboard, /San Cristobal/);
  assert.match(dashboard, /Controlled public demonstration/);
  assert.match(dashboard, /\/api\/dashboard/);
  assert.match(dashboard, /\/api\/climate/);
  assert.match(dashboard, /\/api\/report\.pdf/);
  assert.match(dashboard, /\/api\/export\.csv/);
  assert.match(dashboard, /OpenStreetMap/);
  assert.match(dashboard, /await import\("leaflet"\)/);
  assert.doesNotMatch(dashboard, /import L from "leaflet"/);
  assert.match(dashboard, /Stored real observation/);
  assert.match(dashboard, /Observación real almacenada/);
  assert.match(css, /@media \(max-width: 440px\)/);
  assert.match(packageJson, /"leaflet": "1\.9\.4"/);
  assert.match(dashboardRoute, /public_location_mode/);
  assert.match(dashboardRoute, /prototype_notice/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(dashboard, /Your site is taking shape/);
});

test("keeps deployment health and climate routes portable", async () => {
  const [healthAlias, climateRoute, reportRoute] = await Promise.all([
    readFile(new URL("../app/health/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/climate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/report.pdf/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(healthAlias, /api\/health\/route/);
  assert.match(climateRoute, /AbortController/);
  assert.match(climateRoute, /climateSnapshots/);
  assert.match(climateRoute, /is_stale: true/);
  assert.match(reportRoute, /climateSnapshots/);
  assert.match(reportRoute, /Stored fallback/);
  assert.match(climateRoute, /stale-while-revalidate=900/);
  assert.doesNotMatch(climateRoute, /cacheEverything|cacheTtl/);
});

test("includes bilingual accessible guidance and climate update announcements", async () => {
  const [dashboard, css] = await Promise.all([
    readFile(new URL("../app/PublicDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /function InfoTooltip/);
  assert.match(dashboard, /More information about \{status\}/);
  assert.match(dashboard, /Más información sobre \{status\}/);
  assert.match(dashboard, /Registro recibido y aún no revisado por una persona autorizada/);
  assert.match(dashboard, /Dato obtenido de una fuente pública identificada y verificable/);
  assert.match(dashboard, /Puntaje metodológico de 11 a 12/);
  assert.match(dashboard, /role="tooltip"/);
  assert.match(dashboard, /aria-expanded=\{open\}/);
  assert.match(dashboard, /event\.key === "Escape"/);
  assert.match(dashboard, /aria-busy=\{climateLoading\}/);
  assert.match(dashboard, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(dashboard, /Actualización climática iniciada/);
  assert.match(dashboard, /Clima actualizado correctamente/);
  assert.match(dashboard, /No se pudo actualizar el clima/);
  assert.match(css, /\.infoTooltipContent/);
  assert.match(css, /\.language > span, \.language select \{ overflow-wrap: normal; white-space: nowrap; \}/);
  assert.match(css, /\.language select \{ min-width: 6\.2rem; \}/);
});

test("fully localizes visible technical values in the Spanish PDF", async () => {
  const reportRoute = await readFile(
    new URL("../app/api/report.pdf/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(reportRoute, /results: "InfinityAtlas - Resultados públicos agregados"/);
  assert.match(reportRoute, /totalRecords: "Registros totales"/);
  assert.match(reportRoute, /weatherCode: "Código meteorológico"/);
  assert.match(reportRoute, /storedFallback: "Respaldo almacenado"/);
  assert.match(reportRoute, /public_real: "Dato público real"/);
  assert.match(reportRoute, /controlled_test: "Prueba controlada"/);
  assert.match(reportRoute, /environmental_pollution: "Contaminación ambiental"/);
  assert.match(reportRoute, /copy\.statusLabels/);
  assert.match(reportRoute, /copy\.provenanceLabels/);
  assert.match(reportRoute, /copy\.riskLabels/);
  assert.match(reportRoute, /copy\.categoryLabels/);
  assert.match(reportRoute, /details\.drawText\(copy\.results/);
  assert.match(reportRoute, /drawLine\(details, copy\.weatherSource/);
  assert.match(reportRoute, /drawLine\(details, copy\.mapSource/);
  assert.doesNotMatch(
    reportRoute,
    /details\.drawText\("InfinityAtlas - Aggregated public results"/,
  );
});
