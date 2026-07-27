import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudSun,
  Crosshair,
  Droplets,
  ExternalLink,
  FileCheck2,
  Languages,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Save,
  Thermometer,
  X,
} from "lucide-react";
import {
  ClimateCurrent,
  DataProvenance,
  getJson,
  Health,
  Observation,
  ObservationPayload,
  postJson,
  Project,
  Territory,
} from "./api";
import { defaultLocale, Locale, replaceParams, translations } from "./i18n";

type FormState = {
  projectId: string;
  territoryId: string;
  category: Observation["category"];
  description: string;
  hazard: string;
  exposure: string;
  vulnerability: string;
  latitude: string;
  longitude: string;
  observedAt: string;
  provenance: DataProvenance;
  sourceName: string;
  responsibleRole: string;
  evidenceType: "url" | "photo_reference" | "document_reference";
  evidenceUrl: string;
  evidenceDescription: string;
  evidenceSource: string;
  evidenceDate: string;
  syntheticConfirmation: boolean;
};

export function galapagosInputValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Galapagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function sanCristobalIso(value: string): string {
  return `${value}:00-06:00`;
}

function emptyForm(): FormState {
  const now = galapagosInputValue();
  return {
    projectId: "",
    territoryId: "",
    category: "water",
    description: "",
    hazard: "1",
    exposure: "1",
    vulnerability: "1",
    latitude: "",
    longitude: "",
    observedAt: now,
    provenance: "controlled_test",
    sourceName: "",
    responsibleRole: "",
    evidenceType: "url",
    evidenceUrl: "",
    evidenceDescription: "",
    evidenceSource: "",
    evidenceDate: now,
    syntheticConfirmation: false,
  };
}

function weatherKey(code: number): keyof (typeof translations)["en"]["weather"] {
  if (code === 0) return "clear";
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 86) return "showers";
  if (code >= 95) return "thunderstorm";
  return "unknown";
}

function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(translations[locale].dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Galapagos",
  }).format(new Date(value));
}

function provenanceClass(provenance: DataProvenance): string {
  if (provenance === "public_real") return "tag tagReal";
  if (provenance === "synthetic_demo") return "tag tagSynthetic";
  return "tag tagControlled";
}

function evidenceDomain(uri: string): string | null {
  try {
    const url = new URL(uri);
    return url.protocol === "http:" || url.protocol === "https:" ? url.hostname : null;
  } catch {
    return null;
  }
}

export function App() {
  const [locale, setLocale] = React.useState<Locale>(defaultLocale);
  const [health, setHealth] = React.useState<Health | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [territories, setTerritories] = React.useState<Territory[]>([]);
  const [observations, setObservations] = React.useState<Observation[]>([]);
  const [climate, setClimate] = React.useState<ClimateCurrent | null>(null);
  const [climateLoading, setClimateLoading] = React.useState(false);
  const [climateError, setClimateError] = React.useState(false);
  const [climateFeedback, setClimateFeedback] = React.useState<
    "idle" | "updating" | "success" | "error"
  >("idle");
  const [lastClimateQueryAt, setLastClimateQueryAt] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [submitState, setSubmitState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedObservationId, setSavedObservationId] = React.useState<number | null>(null);
  const t = translations[locale];

  const selectedProject = projects.find((project) => project.id === Number(form.projectId));
  const selectedTerritory = territories.find((territory) => territory.id === Number(form.territoryId));
  const projectTerritories = territories.filter(
    (territory) => territory.project_id === Number(form.projectId),
  );

  const loadObservations = React.useCallback(async () => {
    const next = await getJson<Observation[]>("/api/v1/observations");
    setObservations(next);
  }, []);

  React.useEffect(() => {
    document.title = t.documentTitle;
  }, [t.documentTitle]);

  React.useEffect(() => {
    if (submitState !== "saved") return;
    const timer = window.setTimeout(() => {
      setSubmitState("idle");
      setSavedObservationId(null);
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [submitState, savedObservationId]);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      getJson<Health>("/health"),
      getJson<Project[]>("/api/v1/projects"),
      getJson<Territory[]>("/api/v1/territories"),
      getJson<Observation[]>("/api/v1/observations"),
    ])
      .then(([nextHealth, nextProjects, nextTerritories, nextObservations]) => {
        if (!active) return;
        setHealth(nextHealth);
        setProjects(nextProjects);
        setTerritories(nextTerritories);
        setObservations(nextObservations);

        const preferredTerritory =
          nextTerritories.find((territory) => territory.name === "San Cristobal" && !territory.is_synthetic) ??
          nextTerritories[0];
        if (preferredTerritory) {
          setForm((current) => ({
            ...current,
            projectId: String(preferredTerritory.project_id),
            territoryId: String(preferredTerritory.id),
            latitude: String(preferredTerritory.latitude),
            longitude: String(preferredTerritory.longitude),
          }));
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadClimate = React.useCallback(async (territoryId: string) => {
    if (!territoryId) return;
    setClimateLoading(true);
    setClimateError(false);
    setClimateFeedback("updating");
    try {
      const nextClimate = await getJson<ClimateCurrent>(
        `/api/v1/climate/current?territory_id=${territoryId}`,
      );
      setClimate(nextClimate);
      setClimateFeedback("success");
    } catch {
      setClimateError(true);
      setClimateFeedback("error");
    } finally {
      setLastClimateQueryAt(new Date().toISOString());
      setClimateLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadClimate(form.territoryId);
  }, [form.territoryId, loadClimate]);

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (submitState === "error") setSubmitState("idle");
  }

  function selectProject(projectId: string) {
    const nextTerritory = territories.find((territory) => territory.project_id === Number(projectId));
    setForm((current) => ({
      ...current,
      projectId,
      territoryId: nextTerritory ? String(nextTerritory.id) : "",
      latitude: nextTerritory ? String(nextTerritory.latitude) : "",
      longitude: nextTerritory ? String(nextTerritory.longitude) : "",
    }));
  }

  function selectTerritory(territoryId: string) {
    const nextTerritory = territories.find((territory) => territory.id === Number(territoryId));
    setForm((current) => ({
      ...current,
      territoryId,
      latitude: nextTerritory ? String(nextTerritory.latitude) : current.latitude,
      longitude: nextTerritory ? String(nextTerritory.longitude) : current.longitude,
    }));
  }

  function useTerritoryCoordinates() {
    if (!selectedTerritory) return;
    setForm((current) => ({
      ...current,
      latitude: String(selectedTerritory.latitude),
      longitude: String(selectedTerritory.longitude),
    }));
  }

  async function submitObservation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("saving");

    const payload: ObservationPayload = {
      project_id: Number(form.projectId),
      territory_id: Number(form.territoryId),
      category: form.category,
      description: form.description,
      hazard: Number(form.hazard),
      exposure: Number(form.exposure),
      vulnerability: Number(form.vulnerability),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      observed_at: sanCristobalIso(form.observedAt),
      source_name: form.sourceName,
      responsible_role: form.responsibleRole,
      data_provenance: form.provenance,
      synthetic_confirmation: form.syntheticConfirmation,
      evidence: {
        evidence_type: form.evidenceType,
        uri: form.evidenceUrl,
        description: form.evidenceDescription,
        source_name: form.evidenceSource,
        observed_at: sanCristobalIso(form.evidenceDate),
      },
    };

    try {
      const created = await postJson<Observation>("/api/v1/observations", payload);
      await loadObservations();
      setForm((current) => ({
        ...emptyForm(),
        projectId: current.projectId,
        territoryId: current.territoryId,
        latitude: current.latitude,
        longitude: current.longitude,
      }));
      setSavedObservationId(created.id);
      setSubmitState("saved");
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <main className="appShell">
      <header className="appHeader">
        <div className="brandBlock">
          <div className="brandMark">InfinityAtlas</div>
          <div>
            <p className="eyebrow">{t.sprintLabel}</p>
            <h1>{t.headline}</h1>
            <p className="subtitle">{t.subtitle}</p>
          </div>
        </div>
        <div className="headerControls">
          <label className="languageControl">
            <Languages size={17} aria-hidden="true" />
            <span>{t.languageLabel}</span>
            <select
              aria-label={t.languageLabel}
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              {(Object.keys(translations) as Locale[]).map((option) => (
                <option key={option} value={option}>
                  {translations[option].languageName}
                </option>
              ))}
            </select>
          </label>
          <div className={`connectionStatus ${health ? "connected" : loadError ? "disconnected" : ""}`}>
            {health ? <CheckCircle2 size={17} /> : loadError ? <AlertTriangle size={17} /> : <LoaderCircle size={17} />}
            <span>{health ? t.apiStatus : loadError ? t.apiError : t.apiPending}</span>
          </div>
        </div>
      </header>

      {submitState === "saved" && savedObservationId !== null ? (
        <div className="saveNotification" role="status" aria-live="polite">
          <CheckCircle2 size={22} />
          <strong>
            {replaceParams(t.observationForm.saved, { id: savedObservationId })}
          </strong>
          <button
            type="button"
            onClick={() => {
              setSubmitState("idle");
              setSavedObservationId(null);
            }}
            aria-label={t.close}
            title={t.close}
          >
            <X size={18} />
          </button>
        </div>
      ) : null}

      <section className="territoryBar" aria-label={t.territoryLabel}>
        <div>
          <span className="sectionLabel">{t.territoryLabel}</span>
          <strong>{selectedTerritory?.name ?? "—"}</strong>
          <span>
            {selectedTerritory
              ? `${selectedTerritory.province ?? selectedTerritory.country}, ${selectedTerritory.country}`
              : "—"}
          </span>
        </div>
        {selectedTerritory ? (
          <span className={selectedTerritory.is_synthetic ? "tag tagSynthetic" : "tag tagReal"}>
            {selectedTerritory.is_synthetic ? t.syntheticTerritory : t.realReferenceTerritory}
          </span>
        ) : null}
      </section>

      {selectedProject?.status === "prototype_reference" ? (
        <div className="prototypeNotice" role="note">
          <AlertTriangle size={18} />
          <span>{t.prototypeNotice}</span>
        </div>
      ) : null}

      <section className="climateSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">{t.climate.source}</p>
            <h2>{t.climate.title}</h2>
          </div>
          <button
            className="iconTextButton"
            type="button"
            onClick={() => void loadClimate(form.territoryId)}
            disabled={climateLoading || !form.territoryId}
          >
            <RefreshCw size={17} className={climateLoading ? "spin" : ""} />
            {climateLoading ? t.climate.updating : t.climate.refresh}
          </button>
        </div>

        {climateFeedback !== "idle" ? (
          <div
            className={`climateQueryFeedback ${climateFeedback === "error" ? "errorFeedback" : ""}`}
            role="status"
            aria-live="polite"
          >
            {climateFeedback === "updating" ? (
              <LoaderCircle size={17} className="spin" />
            ) : climateFeedback === "error" ? (
              <AlertTriangle size={17} />
            ) : (
              <CheckCircle2 size={17} />
            )}
            <span>
              {climateFeedback === "updating"
                ? t.climate.updating
                : climateFeedback === "error"
                  ? t.climate.refreshError
                  : t.climate.refreshSuccess}
              {lastClimateQueryAt
                ? ` ${replaceParams(t.climate.lastQuery, {
                    time: formatDate(lastClimateQueryAt, locale),
                  })}`
                : ""}
            </span>
          </div>
        ) : null}

        {climateLoading && !climate ? (
          <div className="stateMessage">
            <LoaderCircle size={20} className="spin" />
            <span>{t.climate.loading}</span>
          </div>
        ) : climateError && !climate ? (
          <div className="stateMessage warningState">
            <AlertTriangle size={20} />
            <div>
              <strong>{t.climate.unavailableTitle}</strong>
              <span>{t.climate.unavailableBody}</span>
            </div>
          </div>
        ) : climate ? (
          <>
            <div className="climateMetrics">
              <div className="climateMetric temperatureMetric">
                <Thermometer size={22} />
                <span>{t.climate.temperature}</span>
                <strong>{climate.temperature_c.toFixed(1)} °C</strong>
              </div>
              <div className="climateMetric">
                <Droplets size={22} />
                <span>{t.climate.humidity}</span>
                <strong>{climate.relative_humidity_percent.toFixed(0)}%</strong>
              </div>
              <div className="climateMetric">
                <Thermometer size={22} />
                <span>{t.climate.apparent}</span>
                <strong>{climate.apparent_temperature_c.toFixed(1)} °C</strong>
              </div>
              <div className="climateMetric precipitationMetric">
                <CloudSun size={22} />
                <span>{t.climate.precipitation}</span>
                <strong>{climate.precipitation_mm.toFixed(1)} mm</strong>
              </div>
            </div>
            <div className="climateMeta">
              <div>
                <span className={climate.is_stale ? "tag tagStale" : "tag tagReal"}>
                  {climate.is_stale ? t.climate.stale : t.climate.current}
                </span>
                <span className={provenanceClass(climate.data_provenance)}>
                  {t.provenance[climate.data_provenance]}
                </span>
              </div>
              <dl>
                <dt>{t.climate.observed}</dt>
                <dd>{formatDate(climate.observed_at, locale)}</dd>
                <dt>{t.climate.retrieved}</dt>
                <dd>{formatDate(climate.retrieved_at, locale)}</dd>
                <dt>{t.climate.source}</dt>
                <dd>
                  <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                    {t.climate.attribution} <ExternalLink size={13} />
                  </a>
                </dd>
                <dt>{t.weather[weatherKey(climate.weather_code)]}</dt>
                <dd>{replaceParams(t.climate.wmoCode, { code: climate.weather_code })}</dd>
              </dl>
            </div>
          </>
        ) : null}
      </section>

      <section className="workspaceGrid">
        <form className="observationForm" onSubmit={submitObservation}>
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">{t.sprintLabel}</p>
              <h2>{t.observationForm.title}</h2>
            </div>
            <FileCheck2 size={22} />
          </div>

          <div className="formGrid">
            <label className="projectField">
              <span>{t.observationForm.project}</span>
              <select
                required
                value={form.projectId}
                onChange={(event) => selectProject(event.target.value)}
              >
                <option value="" disabled />
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t.observationForm.territory}</span>
              <select
                required
                value={form.territoryId}
                onChange={(event) => selectTerritory(event.target.value)}
              >
                <option value="" disabled />
                {projectTerritories.map((territory) => (
                  <option key={territory.id} value={territory.id}>
                    {territory.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t.observationForm.category}</span>
              <select
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value as Observation["category"])}
              >
                {Object.entries(t.categories).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t.observationForm.provenance}</span>
              <select
                value={form.provenance}
                onChange={(event) => updateForm("provenance", event.target.value as DataProvenance)}
              >
                {Object.entries(t.provenance).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="wideField">
              <span>{t.observationForm.description}</span>
              <textarea
                required
                minLength={5}
                maxLength={2000}
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
              />
            </label>
            {(["hazard", "exposure", "vulnerability"] as const).map((field) => (
              <label key={field}>
                <span>{t.observationForm[field]}</span>
                <select value={form[field]} onChange={(event) => updateForm(field, event.target.value)}>
                  {[1, 2, 3, 4].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              <span>{t.observationForm.observedAt}</span>
              <input
                required
                type="datetime-local"
                value={form.observedAt}
                onChange={(event) => updateForm("observedAt", event.target.value)}
              />
            </label>
            <label>
              <span>{t.observationForm.latitude}</span>
              <input
                required
                type="number"
                min="-90"
                max="90"
                step="any"
                value={form.latitude}
                onChange={(event) => updateForm("latitude", event.target.value)}
              />
            </label>
            <label>
              <span>{t.observationForm.longitude}</span>
              <input
                required
                type="number"
                min="-180"
                max="180"
                step="any"
                value={form.longitude}
                onChange={(event) => updateForm("longitude", event.target.value)}
              />
            </label>
            <button className="coordinateButton" type="button" onClick={useTerritoryCoordinates}>
              <Crosshair size={17} />
              {t.observationForm.useTerritoryLocation}
            </button>
            <label>
              <span>{t.observationForm.sourceName}</span>
              <input
                required
                value={form.sourceName}
                placeholder={t.observationForm.sourcePlaceholder}
                onChange={(event) => updateForm("sourceName", event.target.value)}
              />
            </label>
            <label>
              <span>{t.observationForm.responsibleRole}</span>
              <input
                required
                value={form.responsibleRole}
                placeholder={t.observationForm.responsiblePlaceholder}
                onChange={(event) => updateForm("responsibleRole", event.target.value)}
              />
            </label>
          </div>

          <fieldset>
            <legend>{t.observationForm.evidenceTitle}</legend>
            <div className="formGrid">
              <label>
                <span>{t.observationForm.evidenceType}</span>
                <select
                  value={form.evidenceType}
                  onChange={(event) =>
                    updateForm("evidenceType", event.target.value as FormState["evidenceType"])
                  }
                >
                  {Object.entries(t.evidenceTypes).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t.observationForm.evidenceDate}</span>
                <input
                  required
                  type="datetime-local"
                  value={form.evidenceDate}
                  onChange={(event) => updateForm("evidenceDate", event.target.value)}
                />
              </label>
              <label className="wideField">
                <span>{t.observationForm.evidenceUrl}</span>
                <input
                  required
                  type="url"
                  value={form.evidenceUrl}
                  onChange={(event) => updateForm("evidenceUrl", event.target.value)}
                />
              </label>
              <label>
                <span>{t.observationForm.evidenceSource}</span>
                <input
                  required
                  value={form.evidenceSource}
                  onChange={(event) => updateForm("evidenceSource", event.target.value)}
                />
              </label>
              <label>
                <span>{t.observationForm.evidenceDescription}</span>
                <input
                  required
                  minLength={3}
                  value={form.evidenceDescription}
                  onChange={(event) => updateForm("evidenceDescription", event.target.value)}
                />
              </label>
            </div>
          </fieldset>

          {form.provenance === "synthetic_demo" ? (
            <label className="confirmationRow">
              <input
                required
                type="checkbox"
                checked={form.syntheticConfirmation}
                onChange={(event) => updateForm("syntheticConfirmation", event.target.checked)}
              />
              <span>{t.observationForm.syntheticConfirmation}</span>
            </label>
          ) : null}

          <div className="privacyNotice">
            <AlertTriangle size={18} />
            <span>{t.observationForm.privacyNotice}</span>
          </div>

          <div className="formActions">
            <button className="primaryButton" type="submit" disabled={submitState === "saving"}>
              {submitState === "saving" ? <LoaderCircle size={18} className="spin" /> : <Save size={18} />}
              {submitState === "saving" ? t.observationForm.saving : t.observationForm.submit}
            </button>
            {submitState === "error" ? (
              <span className="formFeedback errorFeedback">
                <AlertTriangle size={18} /> {t.observationForm.error}
              </span>
            ) : null}
          </div>
        </form>

        <section className="observationListSection">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">{replaceParams(t.observations.count, { count: observations.length })}</p>
              <h2>{t.observations.title}</h2>
            </div>
          </div>
          {observations.length === 0 ? (
            <div className="emptyState">{t.observations.empty}</div>
          ) : (
            <div className="observationList">
              {observations.map((observation) => (
                <article className="observationItem" key={observation.id}>
                  <div className="observationItemHeader">
                    <div>
                      <span className="categoryLabel">{t.categories[observation.category]}</span>
                      <strong>#{observation.id}</strong>
                    </div>
                    <div className="tagRow">
                      <span className="tag tagPending">
                        {t.statuses[observation.status as keyof typeof t.statuses] ?? observation.status}
                      </span>
                      <span className={provenanceClass(observation.data_provenance)}>
                        {t.observationProvenance[observation.data_provenance]}
                      </span>
                    </div>
                  </div>
                  <p>{observation.description}</p>
                  {observation.data_provenance === "synthetic_demo" &&
                  observation.source_name.startsWith("Legacy synthetic demo record") ? (
                    <div className="legacySyntheticNotice">
                      <AlertTriangle size={16} />
                      <span>{t.observations.legacySyntheticNotice}</span>
                    </div>
                  ) : null}
                  <dl>
                    <dt>
                      <MapPin size={14} /> {t.observations.location}
                    </dt>
                    <dd>
                      {observation.latitude.toFixed(4)}, {observation.longitude.toFixed(4)}
                    </dd>
                    <dt>{t.observations.observed}</dt>
                    <dd>{formatDate(observation.observed_at, locale)}</dd>
                    <dt>{t.observations.source}</dt>
                    <dd>{observation.source_name}</dd>
                    <dt>{t.observations.responsible}</dt>
                    <dd>{observation.responsible_role}</dd>
                    <dt>{t.observations.evidence}</dt>
                    <dd>
                      {observation.evidence_items.map((evidence) => {
                        const domain = evidenceDomain(evidence.uri);
                        const isSyntheticMarker =
                          observation.data_provenance === "synthetic_demo" ||
                          evidence.data_provenance === "synthetic_demo" ||
                          domain === null;
                        const isOpenMeteoTechnical = domain === "api.open-meteo.com";

                        return (
                          <span className="evidenceReference" key={evidence.id}>
                            {isSyntheticMarker ? (
                              <span>{t.observations.noExternalSyntheticEvidence}</span>
                            ) : (
                              <>
                                <a href={evidence.uri} target="_blank" rel="noreferrer">
                                  {isOpenMeteoTechnical
                                    ? t.observations.openMeteoTechnical
                                    : evidence.description ?? evidence.source_name}
                                  <ExternalLink size={12} />
                                </a>
                                <small>
                                  {domain}
                                  {isOpenMeteoTechnical
                                    ? ` · ${t.observations.technicalDataWarning}`
                                    : ""}
                                </small>
                              </>
                            )}
                          </span>
                        );
                      })}
                    </dd>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
