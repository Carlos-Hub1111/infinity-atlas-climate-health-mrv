import React from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CloudSun,
  Droplets,
  Eraser,
  Filter,
  Gauge,
  Info,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Thermometer,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ClimateCurrent,
  DashboardResponse,
  DataProvenance,
  getJson,
  Observation,
  RiskScore,
  User,
} from "./api";
import {
  Locale,
  replaceParams,
  translations,
  translateValue,
} from "./i18n";
import "./dashboard.css";

type Filters = {
  date_from: string;
  date_to: string;
  category: string;
  status: string;
  provenance: string;
  risk_level: string;
  territory_id: string;
  search: string;
};

const emptyFilters: Filters = {
  date_from: "",
  date_to: "",
  category: "",
  status: "",
  provenance: "",
  risk_level: "",
  territory_id: "",
  search: "",
};

const statusColors: Record<string, string> = {
  pending: "#6b7980",
  validated: "#2f7d56",
  observed: "#b07a13",
  rejected: "#b3473f",
};
const riskColors: Record<string, string> = {
  low: "#438f69",
  moderate: "#d19a28",
  high: "#d46b35",
  critical: "#a9363c",
};
const provenanceColors: Record<string, string> = {
  public_real: "#277b71",
  controlled_test: "#3979a4",
  synthetic_demo: "#a55e20",
};
const categoryColors = ["#006d77", "#4f6d7a", "#ba7b29", "#9a4b5a"];

function fromUrl(): Filters {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(
    Object.keys(emptyFilters).map((key) => [key, params.get(key) ?? ""]),
  ) as Filters;
}

function queryString(filters: Filters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

function formatDateTime(value: string, locale: Locale, timeZone: string): string {
  return new Intl.DateTimeFormat(translations[locale].dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function Help({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  return (
    <span className="dashboardHelp" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <Info size={15} />
      </button>
      {open && (
        <span id={id} role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="dashboardEmpty">{text}</div>;
}

function AccessibleSummary({
  title,
  data,
}: {
  title: string;
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="srOnly">
      <p>{title}</p>
      <ul>
        {data.map((item) => (
          <li key={item.name}>
            {item.name}: {item.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartFrame({
  title,
  description,
  help,
  helpLabel,
  children,
}: {
  title: string;
  description: string;
  help: string;
  helpLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="chartFrame">
      <header>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <Help label={helpLabel ?? `${title}: ${help}`} text={help} />
      </header>
      {children}
    </section>
  );
}

function CountChart({
  data,
  colors,
  empty,
  ariaTitle,
}: {
  data: Array<{ name: string; value: number; key: string }>;
  colors: Record<string, string>;
  empty: string;
  ariaTitle: string;
}) {
  if (!data.some((item) => item.value > 0)) return <EmptyChart text={empty} />;
  return (
    <>
      <AccessibleSummary title={ariaTitle} data={data} />
      <div className="chartCanvas" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 10, left: -22, bottom: 2 }}>
            <CartesianGrid stroke="#dbe3e4" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {data.map((item) => (
                <Cell key={item.key} fill={colors[item.key] ?? "#006d77"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  tone,
  help,
}: {
  label: string;
  value: number;
  tone?: string;
  help?: { label: string; text: string };
}) {
  return (
    <div className={`dashboardMetric ${tone ?? ""}`}>
      <strong>{value}</strong>
      <span>
        {label}
        {help && <Help label={help.label} text={help.text} />}
      </span>
    </div>
  );
}

function ClimateStrip({
  climate,
  loading,
  locale,
  onRefresh,
}: {
  climate: ClimateCurrent | null;
  loading: boolean;
  locale: Locale;
  onRefresh: () => void;
}) {
  const t = translations[locale];
  if (!climate) {
    return (
      <section className="dashboardClimate" aria-live="polite">
        <div className="dashboardSectionTitle">
          <CloudSun size={20} />
          <h2>{t.dashboard.climateTitle}</h2>
        </div>
        <p>{loading ? t.dashboard.climateLoading : t.dashboard.climateUnavailable}</p>
      </section>
    );
  }
  const timeZone = climate.territory.timezone;
  const items = [
    [Thermometer, t.climate.temperature, `${climate.temperature_c.toFixed(1)} °C`],
    [Droplets, t.climate.humidity, `${climate.relative_humidity_percent}%`],
    [Gauge, t.climate.apparent, `${climate.apparent_temperature_c.toFixed(1)} °C`],
    [CloudSun, t.climate.precipitation, `${climate.precipitation_mm.toFixed(1)} mm`],
  ] as const;
  return (
    <section className="dashboardClimate" aria-busy={loading} aria-live="polite">
      <div className="dashboardSectionTitle split">
        <div>
          <CloudSun size={20} />
          <div>
            <h2>{t.dashboard.climateTitle}</h2>
            <p>
              {climate.source_name} · {formatDateTime(climate.observed_at, locale, timeZone)}
            </p>
          </div>
        </div>
        <button className="secondaryButton" type="button" disabled={loading} onClick={onRefresh}>
          <RefreshCw className={loading ? "spin" : ""} size={16} />
          {loading ? t.climate.updating : t.climate.refresh}
        </button>
      </div>
      <div className="dashboardClimateGrid">
        {items.map(([Icon, label, value]) => (
          <div key={label}>
            <Icon size={18} />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
        <div className="climateCondition">
          <Activity size={18} />
          <span>{t.dashboard.condition}</span>
          <strong>{replaceParams(t.climate.wmoCode, { code: climate.weather_code })}</strong>
        </div>
      </div>
      <footer>
        <span className={climate.is_stale ? "stale" : "current"}>
          {climate.is_stale ? t.climate.stale : t.climate.current}
        </span>
        <a href={climate.source_url} target="_blank" rel="noreferrer">
          {t.climate.attribution}
        </a>
      </footer>
    </section>
  );
}

export function Dashboard({
  locale,
  user,
  apiConnected,
  onNavigate,
}: {
  locale: Locale;
  user: User | null;
  apiConnected: boolean;
  onNavigate?: (view: "observations" | "review" | "users" | "audit") => void;
}) {
  const t = translations[locale];
  const [draft, setDraft] = React.useState<Filters>(fromUrl);
  const [applied, setApplied] = React.useState<Filters>(fromUrl);
  const [dashboard, setDashboard] = React.useState<DashboardResponse | null>(null);
  const [climate, setClimate] = React.useState<ClimateCurrent | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [climateLoading, setClimateLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const isInternal = Boolean(user && user.role.name !== "public");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const endpoint = isInternal ? "/api/v1/dashboard/internal" : "/api/v1/dashboard/public";
      const result = await getJson<DashboardResponse>(
        `${endpoint}${queryString(applied)}`,
        isInternal,
      );
      setDashboard(result);
      if (result.territory) {
        setClimateLoading(true);
        try {
          setClimate(
            await getJson<ClimateCurrent>(
              `/api/v1/climate/current?territory_id=${result.territory.id}`,
              false,
            ),
          );
        } finally {
          setClimateLoading(false);
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [applied, isInternal]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function refreshClimate() {
    if (!dashboard?.territory) return;
    setClimateLoading(true);
    try {
      setClimate(
        await getJson<ClimateCurrent>(
          `/api/v1/climate/current?territory_id=${dashboard.territory.id}`,
          false,
        ),
      );
    } finally {
      setClimateLoading(false);
    }
  }

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    const nextUrl = `${window.location.pathname}${queryString(draft)}`;
    window.history.replaceState({}, "", nextUrl);
    setApplied({ ...draft });
  }

  function clearFilters() {
    window.history.replaceState({}, "", window.location.pathname);
    setDraft(emptyFilters);
    setApplied(emptyFilters);
  }

  const territoryTimezone = dashboard?.territory?.timezone ?? "Pacific/Galapagos";
  const statusData = dashboard
    ? (Object.keys(dashboard.status_counts) as Observation["status"][]).map((key) => ({
        key,
        name: translateValue(t.statuses, key, key),
        value: dashboard.status_counts[key],
      }))
    : [];
  const riskData = dashboard
    ? (Object.keys(dashboard.risk_counts) as RiskScore["risk_level"][]).map((key) => ({
        key,
        name: translateValue(t.riskLevels, key, key),
        value: dashboard.risk_counts[key],
      }))
    : [];
  const categoryData = dashboard
    ? (Object.keys(dashboard.category_counts) as Observation["category"][]).map((key) => ({
        key,
        name: translateValue(t.categories, key, key),
        value: dashboard.category_counts[key],
      }))
    : [];
  const provenanceData = dashboard
    ? (Object.keys(dashboard.provenance_counts) as DataProvenance[]).map((key) => ({
        key,
        name: translateValue(t.provenance, key, key),
        value: dashboard.provenance_counts[key],
      }))
    : [];

  return (
    <div className="dashboardRoot">
      <section className="dashboardHeader">
        <div>
          <p>{t.dashboard.eyebrow}</p>
          <h2>{t.dashboard.title}</h2>
          <span>{t.dashboard.identity}</span>
        </div>
        <div className="dashboardHeaderMeta">
          <span className={apiConnected ? "apiOk" : "apiDown"}>
            {apiConnected ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {apiConnected ? t.apiStatus : t.apiError}
          </span>
          <span>
            {t.dashboard.updated}:{" "}
            {dashboard
              ? formatDateTime(dashboard.generated_at, locale, territoryTimezone)
              : t.dashboard.notAvailable}
          </span>
        </div>
      </section>

      <section className="dashboardTerritoryBand">
        <div>
          <span>{t.dashboard.territory}</span>
          <strong>{dashboard?.territory?.name ?? t.dashboard.notAvailable}</strong>
        </div>
        <div>
          <span>{t.dashboard.period}</span>
          <strong>
            {dashboard?.period.start ?? t.dashboard.allDates} –{" "}
            {dashboard?.period.end ?? t.dashboard.allDates}
          </strong>
        </div>
        <div>
          <span>{t.dashboard.timezone}</span>
          <strong>{territoryTimezone}</strong>
        </div>
        <div className="controlledNotice">
          <ShieldCheck size={17} />
          <strong>{t.prototypeNotice}</strong>
        </div>
      </section>

      <form className="dashboardFilters" onSubmit={applyFilters}>
        <div className="dashboardSectionTitle">
          <Filter size={18} />
          <h2>{t.dashboard.filters}</h2>
          {dashboard && dashboard.active_filter_count > 0 && (
            <span className="activeFilterCount">
              {replaceParams(t.dashboard.activeFilters, {
                count: dashboard.active_filter_count,
              })}
            </span>
          )}
        </div>
        <div className="filterGrid">
          <label>
            <span>{t.dashboard.dateFrom}</span>
            <input
              type="date"
              value={draft.date_from}
              onChange={(event) => setDraft({ ...draft, date_from: event.target.value })}
            />
          </label>
          <label>
            <span>{t.dashboard.dateTo}</span>
            <input
              type="date"
              value={draft.date_to}
              onChange={(event) => setDraft({ ...draft, date_to: event.target.value })}
            />
          </label>
          <label>
            <span>{t.observationForm.category}</span>
            <select
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
            >
              <option value="">{t.dashboard.all}</option>
              {Object.entries(t.categories).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.dashboard.status}</span>
            <select
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
            >
              <option value="">{t.dashboard.all}</option>
              {Object.entries(t.statuses).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.dashboard.provenance}</span>
            <select
              value={draft.provenance}
              onChange={(event) => setDraft({ ...draft, provenance: event.target.value })}
            >
              <option value="">{t.dashboard.all}</option>
              {Object.entries(t.provenance).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.dashboard.risk}</span>
            <select
              value={draft.risk_level}
              onChange={(event) => setDraft({ ...draft, risk_level: event.target.value })}
            >
              <option value="">{t.dashboard.all}</option>
              {Object.entries(t.riskLevels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.dashboard.territory}</span>
            <select
              value={draft.territory_id}
              onChange={(event) => setDraft({ ...draft, territory_id: event.target.value })}
            >
              <option value="">{t.dashboard.defaultTerritory}</option>
              {dashboard?.available_territories.map((territory) => (
                <option key={territory.id} value={territory.id}>{territory.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.dashboard.search}</span>
            <div className="searchInput">
              <Search size={16} />
              <input
                value={draft.search}
                maxLength={80}
                placeholder={t.observations.searchPlaceholder}
                onChange={(event) => setDraft({ ...draft, search: event.target.value })}
              />
            </div>
          </label>
        </div>
        <div className="filterActions">
          <button className="primaryButton" type="submit">
            <Filter size={16} /> {t.dashboard.apply}
          </button>
          <button className="secondaryButton" type="button" onClick={clearFilters}>
            <Eraser size={16} /> {t.dashboard.clear}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="dashboardLoading">
          <LoaderCircle className="spin" size={20} /> {t.dashboard.loading}
        </div>
      ) : error || !dashboard ? (
        <div className="dashboardError" role="alert">
          <AlertTriangle size={18} /> {t.dashboard.unavailable}
        </div>
      ) : (
        <>
          {isInternal && Object.keys(dashboard.role_metrics).length > 0 && (
            <section className="roleOverview">
              <div className="dashboardSectionTitle">
                <Gauge size={18} />
                <h2>{t.dashboard.roleOverview}</h2>
              </div>
              <div className="roleMetrics">
                {Object.entries(dashboard.role_metrics).map(([key, value]) => (
                  <div key={key}>
                    <span>{translateValue(t.dashboard.roleMetrics, key, key.replace(/_/g, " "))}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              {onNavigate && (
                <div className="quickActions">
                  {user?.role.name === "monitor" && (
                    <button className="secondaryButton" type="button" onClick={() => onNavigate("observations")}>
                      {t.dashboard.openObservations}
                    </button>
                  )}
                  {user?.role.name === "validator" && (
                    <button className="secondaryButton" type="button" onClick={() => onNavigate("review")}>
                      {t.dashboard.openValidation}
                    </button>
                  )}
                  {user?.role.name === "admin" && (
                    <button className="secondaryButton" type="button" onClick={() => onNavigate("audit")}>
                      {t.dashboard.openAudit}
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="dashboardMetrics" aria-label={t.dashboard.indicators}>
            <MetricCard label={t.public.total} value={dashboard.total_observations} tone="total" />
            {statusData.map((item) => (
              <MetricCard
                key={item.key}
                label={item.name}
                value={item.value}
                tone={`metric-${item.key}`}
                help={{
                  label: replaceParams(t.public.statusHelpLabel, { status: item.name }),
                  text: t.public.statusHelp[item.key],
                }}
              />
            ))}
            {provenanceData.map((item) => (
              <MetricCard
                key={item.key}
                label={item.name}
                value={item.value}
                tone={`metric-${item.key}`}
                help={{
                  label: replaceParams(t.public.provenanceHelpLabel, { provenance: item.name }),
                  text: t.public.provenanceHelp[item.key],
                }}
              />
            ))}
            {riskData.map((item) => (
              <MetricCard
                key={item.key}
                label={item.name}
                value={item.value}
                tone={`metric-${item.key}`}
                help={{
                  label: replaceParams(t.public.riskHelpLabel, { level: item.name }),
                  text: t.public.riskHelp[item.key],
                }}
              />
            ))}
          </section>

          <ClimateStrip
            climate={climate}
            loading={climateLoading}
            locale={locale}
            onRefresh={refreshClimate}
          />

          <section className="chartGrid" aria-label={t.dashboard.visualizations}>
            <ChartFrame
              title={t.dashboard.statusChart}
              description={t.dashboard.statusDescription}
              help={t.dashboard.chartHelp}
            >
              <CountChart data={statusData} colors={statusColors} empty={t.dashboard.empty} ariaTitle={t.dashboard.statusChart} />
            </ChartFrame>
            <ChartFrame
              title={t.dashboard.riskChart}
              description={t.dashboard.riskDescription}
              help={t.public.riskFormulaHelp}
              helpLabel={t.public.riskFormulaHelpLabel}
            >
              {riskData.some((item) => item.value > 0) ? (
                <>
                  <AccessibleSummary title={t.dashboard.riskChart} data={riskData} />
                  <div className="chartCanvas" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2}>
                          {riskData.map((item) => <Cell key={item.key} fill={riskColors[item.key]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : <EmptyChart text={t.dashboard.empty} />}
            </ChartFrame>
            <ChartFrame title={t.dashboard.categoryChart} description={t.dashboard.categoryDescription} help={t.dashboard.chartHelp}>
              <CountChart data={categoryData} colors={Object.fromEntries(categoryData.map((item, index) => [item.key, categoryColors[index]]))} empty={t.dashboard.empty} ariaTitle={t.dashboard.categoryChart} />
            </ChartFrame>
            <ChartFrame title={t.dashboard.trendChart} description={t.dashboard.trendDescription} help={t.dashboard.chartHelp}>
              {dashboard.trends.length ? (
                <>
                  <AccessibleSummary title={t.dashboard.trendChart} data={dashboard.trends.map((item) => ({ name: item.date, value: item.count }))} />
                  <div className="chartCanvas" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboard.trends} margin={{ top: 10, right: 15, left: -20, bottom: 2 }}>
                        <CartesianGrid stroke="#dbe3e4" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#006d77" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : <EmptyChart text={t.dashboard.empty} />}
            </ChartFrame>
            <ChartFrame title={t.dashboard.provenanceChart} description={t.dashboard.provenanceDescription} help={t.dashboard.provenanceHelp}>
              <CountChart data={provenanceData} colors={provenanceColors} empty={t.dashboard.empty} ariaTitle={t.dashboard.provenanceChart} />
            </ChartFrame>
          </section>
          <p className="dashboardMethodology">
            <Info size={16} />
            {t.dashboard.methodology}: {dashboard.methodology_version}. {t.public.riskFormulaHelp}
          </p>
        </>
      )}
    </div>
  );
}
