import React from "react";
import ReactDOM from "react-dom/client";
import { Activity, Database, GitBranch, Languages, MapPinned, ShieldCheck } from "lucide-react";
import { defaultLocale, Locale, replaceParams, translateValue, translations } from "./i18n";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type Health = {
  status: string;
  app: string;
  environment: string;
  database: string;
};

type Summary = {
  projects: number;
  territories: number;
  observations: number;
  synthetic_observations: number;
  latest_risk_level: string | null;
  latest_climate_source: string | null;
};

type Entity = {
  name: string;
  purpose: string;
};

type Territory = {
  id: number;
  name: string;
  country: string;
  province: string | null;
  latitude: number;
  longitude: number;
  is_synthetic: boolean;
};

type Observation = {
  id: number;
  category: string;
  description: string;
  hazard: number;
  exposure: number;
  vulnerability: number;
  status: string;
  is_synthetic: boolean;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function useApiData() {
  const [health, setHealth] = React.useState<Health | null>(null);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [entities, setEntities] = React.useState<Entity[]>([]);
  const [territories, setTerritories] = React.useState<Territory[]>([]);
  const [observations, setObservations] = React.useState<Observation[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    Promise.all([
      getJson<Health>("/health"),
      getJson<Summary>("/api/v1/dashboard/summary"),
      getJson<Entity[]>("/api/v1/metadata/entities"),
      getJson<Territory[]>("/api/v1/territories"),
      getJson<Observation[]>("/api/v1/observations"),
    ])
      .then(([nextHealth, nextSummary, nextEntities, nextTerritories, nextObservations]) => {
        if (!mounted) return;
        setHealth(nextHealth);
        setSummary(nextSummary);
        setEntities(nextEntities);
        setTerritories(nextTerritories);
        setObservations(nextObservations);
      })
      .catch((nextError: Error) => {
        if (mounted) setError(nextError.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { health, summary, entities, territories, observations, error };
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function App() {
  const [locale, setLocale] = React.useState<Locale>(defaultLocale);
  const t = translations[locale];
  const { health, summary, entities, territories, observations, error } = useApiData();
  const territory = territories[0];
  const observation = observations[0];

  React.useEffect(() => {
    document.title = t.documentTitle;
  }, [t.documentTitle]);

  const formattedCheckpointDate = new Intl.DateTimeFormat(t.dateLocale, { dateStyle: "medium" }).format(new Date());
  const translatedRisk = translateValue(t.riskLevels, summary?.latest_risk_level, t.emptyValue);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{t.sprintLabel}</p>
          <h1>{t.headline}</h1>
        </div>
        <div className="topbarActions">
          <label className="languagePicker">
            <Languages size={18} />
            <span>{t.languageLabel}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              {(Object.keys(translations) as Locale[]).map((option) => (
                <option key={option} value={option}>
                  {translations[option].languageName}
                </option>
              ))}
            </select>
          </label>
          <div className={health?.status === "ok" ? "status statusOk" : "status"}>
            <Activity size={18} />
            <span>{health ? replaceParams(t.apiStatus, { status: health.status }) : t.connecting}</span>
          </div>
        </div>
      </header>

      {error ? (
        <section className="notice">
          <strong>{t.backendPendingTitle}</strong>
          <span>{error}</span>
        </section>
      ) : null}

      <section className="overview">
        <div className="summaryText">
          <p className="eyebrow">{t.overviewEyebrow}</p>
          <h2>{t.overviewTitle}</h2>
          <p>{t.overviewBody}</p>
          <p className="checkpointDate">
            {t.checkpointDate}: {formattedCheckpointDate}
          </p>
        </div>
        <div className="metricsGrid">
          <Metric label={t.metrics.projects} value={summary?.projects ?? t.emptyValue} />
          <Metric label={t.metrics.territories} value={summary?.territories ?? t.emptyValue} />
          <Metric label={t.metrics.observations} value={summary?.observations ?? t.emptyValue} />
          <Metric label={t.metrics.syntheticRecords} value={summary?.synthetic_observations ?? t.emptyValue} />
          <Metric label={t.metrics.latestRisk} value={translatedRisk} />
        </div>
      </section>

      <section className="contentGrid">
        <article className="panel mapPanel">
          <div className="panelHeader">
            <MapPinned size={20} />
            <h3>{territory?.name ?? t.panels.demoTerritory}</h3>
          </div>
          <div className="mapCanvas">
            <span className="mapPoint" />
          </div>
          <p>
            {territory
              ? `${territory.country} / ${territory.province ?? t.noProvince} (${territory.latitude}, ${territory.longitude})`
              : t.territoryFallback}
          </p>
        </article>

        <article className="panel">
          <div className="panelHeader">
            <ShieldCheck size={20} />
            <h3>{t.panels.minimumObservation}</h3>
          </div>
          {observation ? (
            <dl className="definitionList">
              <dt>{t.fields.category}</dt>
              <dd>{translateValue(t.categories, observation.category, t.emptyValue)}</dd>
              <dt>{t.fields.status}</dt>
              <dd>{translateValue(t.statuses, observation.status, t.emptyValue)}</dd>
              <dt>{t.fields.riskInputs}</dt>
              <dd>
                {replaceParams(t.riskInputPattern, {
                  hazard: observation.hazard,
                  exposure: observation.exposure,
                  vulnerability: observation.vulnerability,
                })}
              </dd>
              <dt>{t.fields.dataType}</dt>
              <dd>{observation.is_synthetic ? t.syntheticDemoData : t.realData}</dd>
            </dl>
          ) : (
            <p>{t.observationFallback}</p>
          )}
        </article>

        <article className="panel">
          <div className="panelHeader">
            <Database size={20} />
            <h3>{t.panels.entities}</h3>
          </div>
          <ul className="entityList">
            {entities.map((entity) => (
              <li key={entity.name}>{entity.name}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panelHeader">
            <GitBranch size={20} />
            <h3>{t.panels.sprintBoundary}</h3>
          </div>
          <ul className="boundaryList">
            {t.boundaries.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
