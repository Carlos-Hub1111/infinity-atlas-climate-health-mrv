"use client";

import React from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CloudSun,
  Download,
  Droplets,
  Eraser,
  Filter,
  Gauge,
  Languages,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Thermometer,
} from "lucide-react";

type Locale = "en" | "es";
type Filters = {
  date_from: string;
  date_to: string;
  category: string;
  status: string;
  provenance: string;
  risk_level: string;
  search: string;
};
type RecordItem = {
  id: number;
  record_title: string;
  category: string;
  status: string;
  data_provenance: string;
  risk_score: number;
  risk_level: string;
  observed_at: string;
  latitude: number | null;
  longitude: number | null;
  public_location_mode: string;
};
type DashboardData = {
  generated_at: string;
  territory: { name: string; province: string; country: string; timezone: string };
  period: { start: string | null; end: string | null };
  active_filter_count: number;
  total: number;
  status: Record<string, number>;
  provenance: Record<string, number>;
  risk: Record<string, number>;
  categories: Record<string, number>;
  trends: Array<{ date: string; value: number }>;
  observations: RecordItem[];
  methodology_version: string;
  prototype_notice: string;
};
type Climate = {
  source_name: string;
  source_url: string;
  observed_at: string;
  retrieved_at: string;
  temperature_c: number;
  relative_humidity_percent: number;
  apparent_temperature_c: number;
  precipitation_mm: number;
  weather_code: number;
  is_stale: boolean;
  license: string;
};

const emptyFilters: Filters = {
  date_from: "",
  date_to: "",
  category: "",
  status: "",
  provenance: "",
  risk_level: "",
  search: "",
};

const copy = {
  en: {
    language: "Language",
    eyebrow: "Controlled public demonstration · San Cristobal",
    title: "InfinityAtlas",
    product: "Climate & Health MRV Toolkit",
    identity: "Territorial intelligence, traceability and trusted impact data.",
    notice: "Prototype / controlled test — Not a validated field pilot",
    api: "Public API available",
    apiDown: "Public API unavailable",
    updated: "Updated",
    period: "Consulted period",
    timezone: "Territory timezone",
    territory: "Territory",
    filters: "Global filters",
    from: "From date",
    to: "To date",
    category: "Category",
    status: "Review status",
    provenance: "Data provenance",
    risk: "Risk level",
    search: "Record number or title",
    all: "All",
    apply: "Apply filters",
    clear: "Clear filters",
    active: "active filters",
    indicators: "Main indicators",
    total: "Total records",
    climate: "Current climate context",
    refresh: "Refresh climate",
    refreshing: "Updating climate…",
    climateError: "Climate source is temporarily unavailable.",
    climateCurrent: "Current provider response",
    climateStale: "Stored real observation · Provider temporarily unavailable",
    temperature: "Temperature",
    humidity: "Humidity",
    feels: "Feels like",
    rain: "Precipitation",
    weather: "Weather code",
    charts: {
      status: "Distribution by review status",
      risk: "Distribution by risk level",
      category: "Records by category",
      provenance: "Data provenance",
      trend: "Records over time",
    },
    chartHelp: "Values are calculated by the public API and reflect the active filters.",
    map: "Territorial map",
    mapHelp: "Only safe controlled, approximate or aggregate locations are shown.",
    visible: "visible locations",
    hidden: "Location hidden",
    noData: "No data matches the active filters.",
    downloads: "Filtered public downloads",
    pdf: "Download PDF",
    csv: "Download CSV",
    method: "Risk Score = Hazard + Exposure + Vulnerability. Methodological, not clinical.",
    source: "Weather data by Open-Meteo.com · CC BY 4.0",
    mapSource: "Map data © OpenStreetMap contributors",
    owner: "Owned by INFINITYGAIA S.A.S. B.I.C.",
    categories: {
      water: "Water",
      waste: "Waste",
      heat: "Heat",
      environmental_pollution: "Environmental pollution",
    },
    statuses: {
      pending: "Pending",
      validated: "Validated",
      observed: "Observed",
      rejected: "Rejected",
    },
    provenances: {
      public_real: "Public real data",
      controlled_test: "Controlled test",
      synthetic_demo: "Synthetic demo",
    },
    risks: { low: "Low", moderate: "Moderate", high: "High", critical: "Critical" },
  },
  es: {
    language: "Idioma",
    eyebrow: "Demostración pública controlada · San Cristóbal",
    title: "InfinityAtlas",
    product: "Climate & Health MRV Toolkit",
    identity: "Inteligencia territorial, trazabilidad y datos de impacto confiables.",
    notice: "Prototipo / prueba controlada — No constituye un piloto territorial validado",
    api: "API pública disponible",
    apiDown: "API pública no disponible",
    updated: "Actualizado",
    period: "Periodo consultado",
    timezone: "Zona horaria territorial",
    territory: "Territorio",
    filters: "Filtros globales",
    from: "Fecha desde",
    to: "Fecha hasta",
    category: "Categoría",
    status: "Estado de revisión",
    provenance: "Procedencia del dato",
    risk: "Nivel de riesgo",
    search: "Número o nombre del registro",
    all: "Todos",
    apply: "Aplicar filtros",
    clear: "Limpiar filtros",
    active: "filtros activos",
    indicators: "Indicadores principales",
    total: "Registros totales",
    climate: "Contexto climático actual",
    refresh: "Actualizar clima",
    refreshing: "Actualizando clima…",
    climateError: "La fuente climática no está disponible temporalmente.",
    climateCurrent: "Respuesta actual del proveedor",
    climateStale: "Observación real almacenada · Proveedor temporalmente no disponible",
    temperature: "Temperatura",
    humidity: "Humedad",
    feels: "Sensación térmica",
    rain: "Precipitación",
    weather: "Código meteorológico",
    charts: {
      status: "Distribución por estado de revisión",
      risk: "Distribución por nivel de riesgo",
      category: "Registros por categoría",
      provenance: "Procedencia de los datos",
      trend: "Registros a través del tiempo",
    },
    chartHelp: "Los valores son calculados por la API pública y reflejan los filtros activos.",
    map: "Mapa territorial",
    mapHelp: "Solo se muestran ubicaciones seguras controladas, aproximadas o agregadas.",
    visible: "ubicaciones visibles",
    hidden: "Ubicación oculta",
    noData: "Ningún dato coincide con los filtros activos.",
    downloads: "Descargas públicas filtradas",
    pdf: "Descargar PDF",
    csv: "Descargar CSV",
    method: "Puntaje de riesgo = Peligro + Exposición + Vulnerabilidad. Metodológico, no clínico.",
    source: "Datos meteorológicos de Open-Meteo.com · CC BY 4.0",
    mapSource: "Datos del mapa © colaboradores de OpenStreetMap",
    owner: "Propiedad de INFINITYGAIA S.A.S. B.I.C.",
    categories: {
      water: "Agua",
      waste: "Residuos",
      heat: "Calor",
      environmental_pollution: "Contaminación ambiental",
    },
    statuses: {
      pending: "Pendiente",
      validated: "Validado",
      observed: "Observado",
      rejected: "Rechazado",
    },
    provenances: {
      public_real: "Dato público real",
      controlled_test: "Prueba controlada",
      synthetic_demo: "Demo sintética",
    },
    risks: { low: "Bajo", moderate: "Moderado", high: "Alto", critical: "Crítico" },
  },
} as const;

const colors: Record<string, string> = {
  pending: "#64747a",
  validated: "#2f7d56",
  observed: "#ad7712",
  rejected: "#ac433d",
  low: "#2f7d56",
  moderate: "#c18a1c",
  high: "#ce6533",
  critical: "#9e3038",
  public_real: "#277b71",
  controlled_test: "#3979a4",
  synthetic_demo: "#9b5b25",
  water: "#006d77",
  waste: "#62747a",
  heat: "#c45e36",
  environmental_pollution: "#934b62",
};

function query(filters: Filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
  return params.toString();
}

function label(labels: Record<string, string>, key: string) {
  return labels[key] ?? key.replaceAll("_", " ");
}

function formatDate(value: string, locale: Locale, withTime = false) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Pacific/Galapagos",
  }).format(new Date(value));
}

function Metric({ value, labelText, tone }: { value: number; labelText: string; tone: string }) {
  return (
    <div className="metric" style={{ borderTopColor: colors[tone] ?? "#003b49" }}>
      <strong>{value}</strong>
      <span>{labelText}</span>
    </div>
  );
}

function BarGroup({
  title,
  values,
  labels,
  help,
}: {
  title: string;
  values: Record<string, number>;
  labels: Record<string, string>;
  help: string;
}) {
  const max = Math.max(1, ...Object.values(values));
  return (
    <section className="chart">
      <h3>{title}</h3>
      <p>{help}</p>
      <div>
        {Object.entries(values).map(([key, value]) => (
          <div className="barRow" key={key}>
            <span>{label(labels, key)}</span>
            <div aria-hidden="true">
              <i style={{ width: `${(value / max) * 100}%`, background: colors[key] }} />
            </div>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PublicDashboard() {
  const [locale, setLocale] = React.useState<Locale>("en");
  const [draft, setDraft] = React.useState<Filters>(emptyFilters);
  const [filters, setFilters] = React.useState<Filters>(emptyFilters);
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [climate, setClimate] = React.useState<Climate | null>(null);
  const [apiOk, setApiOk] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [climateLoading, setClimateLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const mapHost = React.useRef<HTMLDivElement | null>(null);
  const map = React.useRef<LeafletMap | null>(null);
  const layer = React.useRef<LayerGroup | null>(null);
  const t = copy[locale];
  const filterQuery = query(filters);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = { ...emptyFilters };
    (Object.keys(initial) as Array<keyof Filters>).forEach((key) => {
      initial[key] = params.get(key) ?? "";
    });
    setDraft(initial);
    setFilters(initial);
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const loadClimate = React.useCallback(async () => {
    setClimateLoading(true);
    try {
      const response = await fetch("/api/climate", { cache: "no-store" });
      if (!response.ok) throw new Error("climate");
      setClimate(await response.json());
    } catch {
      setClimate(null);
    } finally {
      setClimateLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetch(`/api/dashboard${filterQuery ? `?${filterQuery}` : ""}`, {
        signal: controller.signal,
        cache: "no-store",
      }),
      fetch("/api/health", { signal: controller.signal, cache: "no-store" }),
    ])
      .then(async ([dashboardResponse, healthResponse]) => {
        if (!dashboardResponse.ok) throw new Error("dashboard");
        setData(await dashboardResponse.json());
        setApiOk(healthResponse.ok);
        setError(false);
      })
      .catch((reason) => {
        if (reason.name !== "AbortError") setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [filterQuery]);

  React.useEffect(() => {
    void loadClimate();
  }, [loadClimate]);

  React.useEffect(() => {
    if (!data || !mapHost.current) return;
    let cancelled = false;

    async function renderMap() {
      const L = await import("leaflet");
      if (cancelled || !data || !mapHost.current) return;
      if (!map.current) {
        map.current = L.map(mapHost.current, {
          center: [-0.9002, -89.6127],
          zoom: 12,
          keyboard: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map.current);
        layer.current = L.layerGroup().addTo(map.current);
      }
      layer.current?.clearLayers();
      data.observations
        .filter((item) => item.latitude !== null && item.longitude !== null)
        .forEach((item) => {
          const marker = L.divIcon({
            className: "markerHost",
            html: `<span class="mapMarker" style="--marker:${colors[item.risk_level]}">${item.risk_level.slice(0, 1).toUpperCase()}</span>`,
            iconSize: [32, 36],
            iconAnchor: [16, 36],
          });
          const popup = document.createElement("div");
          popup.className = "popup";
          const strong = document.createElement("strong");
          strong.textContent = `#${item.id} · ${item.record_title}`;
          const details = document.createElement("span");
          details.textContent = `${label(t.categories, item.category)} · ${label(t.statuses, item.status)} · ${item.risk_score} ${label(t.risks, item.risk_level)} · ${label(t.provenances, item.data_provenance)}`;
          popup.append(strong, details);
          L.marker([item.latitude!, item.longitude!], {
            icon: marker,
            keyboard: true,
            title: `#${item.id} ${item.record_title}`,
            alt: `#${item.id} ${item.record_title}`,
          }).bindPopup(popup).addTo(layer.current!);
        });
      window.setTimeout(() => map.current?.invalidateSize(), 0);
    }

    void renderMap();
    return () => {
      cancelled = true;
    };
  }, [data, locale, t]);

  React.useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
    },
    [],
  );

  function apply(event: React.FormEvent) {
    event.preventDefault();
    const value = query(draft);
    window.history.replaceState({}, "", value ? `?${value}` : window.location.pathname);
    setFilters({ ...draft });
  }

  function clear() {
    window.history.replaceState({}, "", window.location.pathname);
    setDraft(emptyFilters);
    setFilters(emptyFilters);
  }

  const downloadQuery = filterQuery ? `?${filterQuery}` : "";
  const pdfQuery = `${downloadQuery}${downloadQuery ? "&" : "?"}locale=${locale}`;
  const visibleRecords = data?.observations.filter((item) => item.latitude !== null) ?? [];

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <strong>InfinityAtlas</strong>
          <span>{t.product}</span>
        </div>
        <label className="language">
          <Languages size={17} />
          <span>{t.language}</span>
          <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
      </header>

      <section className="territoryHeader">
        <div>
          <p>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <h2>{t.product}</h2>
          <span>{t.identity}</span>
        </div>
        <div className="systemStatus">
          <span className={apiOk ? "ok" : "down"}>
            {apiOk ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {apiOk ? t.api : t.apiDown}
          </span>
          <span>
            {t.updated}: {data ? formatDate(data.generated_at, locale, true) : "—"}
          </span>
        </div>
      </section>

      <div className="prototype">
        <ShieldCheck size={18} />
        <strong>{t.notice}</strong>
      </div>

      <section className="territoryMeta">
        <div><span>{t.period}</span><strong>{data?.period.start ?? "—"} – {data?.period.end ?? "—"}</strong></div>
        <div><span>{t.timezone}</span><strong>{data?.territory.timezone ?? "Pacific/Galapagos"}</strong></div>
        <div><span>Data source</span><strong>Controlled D1 demonstration base</strong></div>
      </section>

      <form className="filters" onSubmit={apply}>
        <header>
          <Filter size={18} />
          <h2>{t.filters}</h2>
          {data && data.active_filter_count > 0 && (
            <span>{data.active_filter_count} {t.active}</span>
          )}
        </header>
        <div className="filterGrid">
          <label><span>{t.territory}</span><select value="san-cristobal" disabled aria-label={t.territory}><option value="san-cristobal">San Cristobal, Galapagos</option></select></label>
          <label><span>{t.from}</span><input type="date" value={draft.date_from} onChange={(e) => setDraft({ ...draft, date_from: e.target.value })} /></label>
          <label><span>{t.to}</span><input type="date" value={draft.date_to} onChange={(e) => setDraft({ ...draft, date_to: e.target.value })} /></label>
          <label><span>{t.category}</span><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}><option value="">{t.all}</option>{Object.entries(t.categories).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label>
          <label><span>{t.status}</span><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="">{t.all}</option>{Object.entries(t.statuses).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label>
          <label><span>{t.provenance}</span><select value={draft.provenance} onChange={(e) => setDraft({ ...draft, provenance: e.target.value })}><option value="">{t.all}</option>{Object.entries(t.provenances).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label>
          <label><span>{t.risk}</span><select value={draft.risk_level} onChange={(e) => setDraft({ ...draft, risk_level: e.target.value })}><option value="">{t.all}</option>{Object.entries(t.risks).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label>
          <label className="searchLabel"><span>{t.search}</span><div><Search size={16} /><input maxLength={80} value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} /></div></label>
        </div>
        <footer>
          <button className="primary" type="submit"><Filter size={16} />{t.apply}</button>
          <button type="button" onClick={clear}><Eraser size={16} />{t.clear}</button>
        </footer>
      </form>

      {loading ? (
        <div className="state"><RefreshCw className="spin" size={20} /> Loading</div>
      ) : error || !data ? (
        <div className="state error"><AlertTriangle size={20} /> {t.apiDown}</div>
      ) : (
        <>
          <section className="downloadBand">
            <div><Download size={19} /><div><h2>{t.downloads}</h2><p>{t.chartHelp}</p></div></div>
            <div>
              <a href={`/api/report.pdf${pdfQuery}`}><Download size={16} />{t.pdf}</a>
              <a href={`/api/export.csv${downloadQuery}`}><Download size={16} />{t.csv}</a>
            </div>
          </section>

          <section className="metrics" aria-label={t.indicators}>
            <Metric value={data.total} labelText={t.total} tone="total" />
            {Object.entries(data.status).map(([key, value]) => <Metric key={key} value={value} labelText={label(t.statuses, key)} tone={key} />)}
            {Object.entries(data.provenance).map(([key, value]) => <Metric key={key} value={value} labelText={label(t.provenances, key)} tone={key} />)}
            {Object.entries(data.risk).map(([key, value]) => <Metric key={key} value={value} labelText={label(t.risks, key)} tone={key} />)}
          </section>

          <section className="climate">
            <header>
              <div><CloudSun size={20} /><div><h2>{t.climate}</h2>{climate && <p>{climate.source_name} · {formatDate(climate.observed_at, locale, true)} <span className={climate.is_stale ? "climateStale" : "climateCurrent"}>{climate.is_stale ? t.climateStale : t.climateCurrent}</span></p>}</div></div>
              <button disabled={climateLoading} onClick={() => void loadClimate()}><RefreshCw className={climateLoading ? "spin" : ""} size={16} />{climateLoading ? t.refreshing : t.refresh}</button>
            </header>
            {climate ? (
              <div className="climateGrid">
                <div><Thermometer size={18} /><span>{t.temperature}</span><strong>{climate.temperature_c} °C</strong></div>
                <div><Droplets size={18} /><span>{t.humidity}</span><strong>{climate.relative_humidity_percent}%</strong></div>
                <div><Gauge size={18} /><span>{t.feels}</span><strong>{climate.apparent_temperature_c} °C</strong></div>
                <div><CloudSun size={18} /><span>{t.rain}</span><strong>{climate.precipitation_mm} mm</strong></div>
                <div><Activity size={18} /><span>{t.weather}</span><strong>{climate.weather_code}</strong></div>
              </div>
            ) : <p className="climateError">{t.climateError}</p>}
            <a href={climate?.source_url ?? "https://open-meteo.com/"} target="_blank" rel="noreferrer">{t.source}</a>
          </section>

          <section className="charts" aria-label={t.indicators}>
            <BarGroup title={t.charts.status} values={data.status} labels={t.statuses} help={t.chartHelp} />
            <BarGroup title={t.charts.risk} values={data.risk} labels={t.risks} help={t.method} />
            <BarGroup title={t.charts.category} values={data.categories} labels={t.categories} help={t.chartHelp} />
            <BarGroup title={t.charts.provenance} values={data.provenance} labels={t.provenances} help={t.chartHelp} />
            <section className="chart trendChart">
              <h3>{t.charts.trend}</h3><p>{t.chartHelp}</p>
              <div className="trend">
                {data.trends.map((item) => <div key={item.date}><b>{item.value}</b><i style={{ height: `${Math.max(12, item.value * 42)}px` }} /><span>{item.date.slice(5)}</span></div>)}
              </div>
            </section>
          </section>

          <section className="mapSection">
            <header><div><MapPin size={20} /><div><h2>{t.map}</h2><p>{t.mapHelp}</p></div></div><span>{visibleRecords.length} {t.visible}</span></header>
            <div className="mapLayout">
              <div ref={mapHost} className="mapCanvas" role="region" tabIndex={0} aria-label={t.map} />
              <aside>
                {Object.entries(t.risks).map(([key, value]) => <div key={key}><i style={{ background: colors[key] }}>{key.slice(0, 1).toUpperCase()}</i>{value}</div>)}
              </aside>
            </div>
            <ul>
              {data.observations.map((item) => (
                <li key={item.id}>
                  <strong>#{item.id} · {item.record_title}</strong>
                  <span>{label(t.categories, item.category)} · {label(t.statuses, item.status)} · {item.risk_score} {label(t.risks, item.risk_level)} · {label(t.provenances, item.data_provenance)}</span>
                  {item.latitude === null && <em>{t.hidden}</em>}
                </li>
              ))}
            </ul>
            <p>{t.mapSource}</p>
          </section>

          <div className="method"><BarChart3 size={17} /><span>{data.methodology_version} · {t.method}</span></div>
        </>
      )}

      <footer className="footer">
        <strong>{t.owner}</strong>
        <span>{t.notice}</span>
        <span>{t.source}</span>
        <span>{t.mapSource}</span>
      </footer>
    </main>
  );
}
