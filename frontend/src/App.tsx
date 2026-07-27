import React from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CloudSun,
  Crosshair,
  Droplets,
  ExternalLink,
  Eye,
  FileClock,
  FileSearch,
  Gauge,
  Languages,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MapPin,
  RefreshCw,
  Save,
  ShieldCheck,
  Thermometer,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  AuditEvent,
  AuthResponse,
  ClimateCurrent,
  DataProvenance,
  getJson,
  hasStoredToken,
  Health,
  Observation,
  ObservationPayload,
  patchJson,
  postJson,
  Project,
  PublicSummary,
  RiskScore,
  setAccessToken,
  Territory,
  User,
} from "./api";
import {
  defaultLocale,
  Locale,
  replaceParams,
  translations,
  translateValue,
} from "./i18n";

type WorkspaceView = "observations" | "review" | "users" | "audit";
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

function formatDate(value: string, locale: Locale, timeZone = "Pacific/Galapagos"): string {
  return new Intl.DateTimeFormat(translations[locale].dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function provenanceClass(provenance: DataProvenance): string {
  if (provenance === "public_real") return "tag tagReal";
  if (provenance === "synthetic_demo") return "tag tagSynthetic";
  return "tag tagControlled";
}

function statusClass(status: Observation["status"]): string {
  return `tag statusTag status-${status}`;
}

function riskClass(level: RiskScore["risk_level"]): string {
  return `riskValue risk-${level}`;
}

function evidenceDomain(uri: string): string | null {
  try {
    const url = new URL(uri);
    return ["http:", "https:"].includes(url.protocol) ? url.hostname : null;
  } catch {
    return null;
  }
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

export function App() {
  const [locale, setLocale] = React.useState<Locale>(defaultLocale);
  const [health, setHealth] = React.useState<Health | null>(null);
  const [publicSummary, setPublicSummary] = React.useState<PublicSummary | null>(null);
  const [publicError, setPublicError] = React.useState(false);
  const [sessionReady, setSessionReady] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [loginIdentifier, setLoginIdentifier] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [loginState, setLoginState] = React.useState<
    "idle" | "loading" | "error" | "expired"
  >("idle");
  const [view, setView] = React.useState<WorkspaceView>("observations");

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [territories, setTerritories] = React.useState<Territory[]>([]);
  const [observations, setObservations] = React.useState<Observation[]>([]);
  const [risks, setRisks] = React.useState<Record<number, RiskScore>>({});
  const [demoUsers, setDemoUsers] = React.useState<User[]>([]);
  const [adminAudit, setAdminAudit] = React.useState<AuditEvent[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = React.useState(false);

  const [climate, setClimate] = React.useState<ClimateCurrent | null>(null);
  const [climateFeedback, setClimateFeedback] = React.useState<
    "idle" | "updating" | "success" | "error"
  >("idle");
  const [lastClimateQueryAt, setLastClimateQueryAt] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [submitState, setSubmitState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedObservationId, setSavedObservationId] = React.useState<number | null>(null);

  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [selectedAudit, setSelectedAudit] = React.useState<AuditEvent[]>([]);
  const [reviewComment, setReviewComment] = React.useState("");
  const [reviewState, setReviewState] = React.useState<"idle" | "saving" | "success" | "error">("idle");
  const [reviewedStatus, setReviewedStatus] = React.useState<Observation["status"] | null>(null);
  const [userStatusError, setUserStatusError] = React.useState(false);
  const t = translations[locale];

  const selectedTerritory =
    territories.find((territory) => territory.id === Number(form.territoryId)) ??
    territories[0];
  const selectedObservation = observations.find((item) => item.id === selectedId) ?? null;

  React.useEffect(() => {
    document.title = t.documentTitle;
    document.documentElement.lang = locale;
  }, [locale, t.documentTitle]);

  React.useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      setProjects([]);
      setTerritories([]);
      setObservations([]);
      setRisks({});
      setSelectedId(null);
      setLoginPassword("");
      setLoginState("expired");
    };
    window.addEventListener("infinityatlas:session-expired", handleExpiredSession);
    return () =>
      window.removeEventListener("infinityatlas:session-expired", handleExpiredSession);
  }, []);

  const loadPublicSummary = React.useCallback(async () => {
    try {
      setPublicSummary(await getJson<PublicSummary>("/api/v1/public/summary", false));
      setPublicError(false);
    } catch {
      setPublicError(true);
    }
  }, []);

  const loadClimate = React.useCallback(async (territoryId: number) => {
    setClimateFeedback("updating");
    try {
      const next = await getJson<ClimateCurrent>(
        `/api/v1/climate/current?territory_id=${territoryId}`,
      );
      setClimate(next);
      setClimateFeedback("success");
    } catch {
      setClimateFeedback("error");
    } finally {
      setLastClimateQueryAt(new Date().toISOString());
    }
  }, []);

  const loadRisks = React.useCallback(async (items: Observation[]) => {
    const entries = await Promise.all(
      items.map(async (item) => {
        try {
          const risk = await getJson<RiskScore>(
            `/api/v1/observations/${item.id}/risk-score`,
          );
          return [item.id, risk] as const;
        } catch {
          return null;
        }
      }),
    );
    setRisks(
      Object.fromEntries(entries.filter((entry): entry is readonly [number, RiskScore] => entry !== null)),
    );
  }, []);

  const loadWorkspace = React.useCallback(
    async (activeUser: User) => {
      if (activeUser.role.name === "public") return;
      setWorkspaceLoading(true);
      try {
        const [nextProjects, nextTerritories, nextObservations] = await Promise.all([
          getJson<Project[]>("/api/v1/projects"),
          getJson<Territory[]>("/api/v1/territories"),
          getJson<Observation[]>("/api/v1/observations"),
        ]);
        setProjects(nextProjects);
        setTerritories(nextTerritories);
        setObservations(nextObservations);
        await loadRisks(nextObservations);

        const preferred =
          nextTerritories.find(
            (territory) => territory.name === "San Cristobal" && !territory.is_synthetic,
          ) ?? nextTerritories[0];
        if (preferred) {
          setForm((current) => ({
            ...current,
            projectId: String(preferred.project_id),
            territoryId: String(preferred.id),
            latitude: String(preferred.latitude),
            longitude: String(preferred.longitude),
            responsibleRole:
              current.responsibleRole ||
              (activeUser.role.name === "monitor" ? "Territorial monitor" : "Prototype team"),
          }));
          await loadClimate(preferred.id);
        }
        if (activeUser.role.name === "admin") {
          setDemoUsers(await getJson<User[]>("/api/v1/admin/users"));
        }
        if (activeUser.role.name !== "monitor") {
          setView("review");
          setSelectedId((current) => current ?? nextObservations[0]?.id ?? null);
        }
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [loadClimate, loadRisks],
  );

  React.useEffect(() => {
    let active = true;
    Promise.all([
      getJson<Health>("/health", false).catch(() => null),
      getJson<PublicSummary>("/api/v1/public/summary", false).catch(() => null),
      hasStoredToken()
        ? getJson<User>("/api/v1/auth/me").catch(() => null)
        : Promise.resolve(null),
    ]).then(([nextHealth, nextSummary, restoredUser]) => {
      if (!active) return;
      setHealth(nextHealth);
      setPublicSummary(nextSummary);
      if (!nextSummary) setPublicError(true);
      if (restoredUser) {
        setUser(restoredUser);
        void loadWorkspace(restoredUser);
      } else if (hasStoredToken()) {
        setAccessToken(null);
      }
      setSessionReady(true);
    });
    return () => {
      active = false;
    };
  }, [loadWorkspace]);

  React.useEffect(() => {
    if (!selectedId || !user || user.role.name === "monitor" || user.role.name === "public") {
      setSelectedAudit([]);
      return;
    }
    getJson<AuditEvent[]>(`/api/v1/observations/${selectedId}/audit`)
      .then(setSelectedAudit)
      .catch(() => setSelectedAudit([]));
  }, [selectedId, user]);

  React.useEffect(() => {
    if (submitState !== "saved") return;
    const timer = window.setTimeout(() => {
      setSubmitState("idle");
      setSavedObservationId(null);
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [submitState]);

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginState("loading");
    try {
      const result = await postJson<AuthResponse>(
        "/api/v1/auth/login",
        { identifier: loginIdentifier, password: loginPassword },
        false,
      );
      setAccessToken(result.access_token);
      setUser(result.user);
      setLoginPassword("");
      setLoginState("idle");
      setView(result.user.role.name === "monitor" ? "observations" : "review");
      await loadWorkspace(result.user);
    } catch {
      setAccessToken(null);
      setLoginState("error");
    }
  }

  async function logout() {
    try {
      await postJson("/api/v1/auth/logout");
    } catch {
      // Local state is still cleared when the server is unavailable.
    }
    setAccessToken(null);
    setUser(null);
    setLoginIdentifier("");
    setLoginPassword("");
    setLoginState("idle");
    setProjects([]);
    setTerritories([]);
    setObservations([]);
    setRisks({});
    setSelectedId(null);
    setView("observations");
    await loadPublicSummary();
  }

  async function submitObservation(event: React.FormEvent) {
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
      observed_at: form.observedAt,
      source_name: form.sourceName,
      responsible_role: form.responsibleRole,
      data_provenance: form.provenance,
      synthetic_confirmation: form.syntheticConfirmation,
      evidence: {
        evidence_type: form.evidenceType,
        uri: form.evidenceUrl,
        description: form.evidenceDescription,
        source_name: form.evidenceSource,
        observed_at: form.evidenceDate,
      },
    };
    try {
      const created = await postJson<Observation>("/api/v1/observations", payload);
      setSavedObservationId(created.id);
      setSubmitState("saved");
      setForm((current) => ({
        ...emptyForm(),
        projectId: current.projectId,
        territoryId: current.territoryId,
        latitude: current.latitude,
        longitude: current.longitude,
        responsibleRole: current.responsibleRole,
      }));
      if (user) await loadWorkspace(user);
      await loadPublicSummary();
    } catch {
      setSubmitState("error");
    }
  }

  async function submitDecision(nextStatus: "validated" | "observed" | "rejected") {
    if (!selectedObservation) return;
    if (nextStatus !== "validated" && !reviewComment.trim()) {
      setReviewState("error");
      return;
    }
    setReviewState("saving");
    try {
      await postJson(`/api/v1/observations/${selectedObservation.id}/validation`, {
        status: nextStatus,
        comment: reviewComment.trim() || null,
      });
      setReviewedStatus(nextStatus);
      setReviewState("success");
      setReviewComment("");
      if (user) await loadWorkspace(user);
      setSelectedId(selectedObservation.id);
      setSelectedAudit(
        await getJson<AuditEvent[]>(
          `/api/v1/observations/${selectedObservation.id}/audit`,
        ),
      );
      await loadPublicSummary();
    } catch {
      setReviewState("error");
    }
  }

  async function toggleUser(account: User) {
    setUserStatusError(false);
    try {
      const updated = await patchJson<User>(`/api/v1/admin/users/${account.id}`, {
        is_active: !account.is_active,
      });
      setDemoUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch {
      setUserStatusError(true);
    }
  }

  async function selectAdminView(nextView: WorkspaceView) {
    setView(nextView);
    if (nextView === "audit") {
      try {
        setAdminAudit(await getJson<AuditEvent[]>("/api/v1/admin/audit"));
      } catch {
        setAdminAudit([]);
      }
    }
  }

  if (!sessionReady) {
    return (
      <main className="centerState">
        <LoaderCircle className="spin" size={22} />
        <span>{t.loading}</span>
      </main>
    );
  }

  return (
    <div className="appShell">
      <header className="appHeader">
        <div className="brandBlock">
          <div className="brandMark">InfinityAtlas</div>
          <div>
            <p>{t.sprintLabel}</p>
            <h1>{t.headline}</h1>
            <span>{t.subtitle}</span>
          </div>
        </div>
        <div className="headerControls">
          <label className="languageControl">
            <Languages size={16} />
            <span>{t.languageLabel}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              <option value="en">{translations.en.languageName}</option>
              <option value="es">{translations.es.languageName}</option>
            </select>
          </label>
          <span className={`connectionStatus ${health ? "connected" : "disconnected"}`}>
            {health ? t.apiStatus : t.apiError}
          </span>
          {user && (
            <>
              <div className="userIdentity">
                <UserRound size={17} />
                <div>
                  <strong>{user.full_name}</strong>
                  <span>{translateValue(t.roles, user.role.name, user.role.name)}</span>
                </div>
              </div>
              <button className="iconButton" type="button" onClick={logout} title={t.actions.logout}>
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="prototypeNotice">
        <ShieldCheck size={18} />
        <span>{t.prototypeNotice}</span>
      </div>

      {!user ? (
        <main className="entryGrid">
          <section className="loginPanel">
            <div className="sectionHeading">
              <LockKeyhole size={21} />
              <h2>{t.auth.title}</h2>
            </div>
            <form onSubmit={submitLogin}>
              <label>
                <span>{t.auth.identifier}</span>
                <input
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(event) => setLoginIdentifier(event.target.value)}
                  required
                />
              </label>
              <label>
                <span>{t.auth.password}</span>
                <input
                  autoComplete="current-password"
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  required
                />
              </label>
              <button className="primaryButton" type="submit" disabled={loginState === "loading"}>
                {loginState === "loading" ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <LockKeyhole size={17} />
                )}
                {loginState === "loading" ? t.auth.signingIn : t.auth.submit}
              </button>
              {(loginState === "error" || loginState === "expired") && (
                <p className="inlineFeedback errorFeedback" role="alert">
                  <AlertTriangle size={16} />
                  {loginState === "expired" ? t.auth.expired : t.auth.error}
                </p>
              )}
            </form>
          </section>
          <PublicSummaryPanel
            summary={publicSummary}
            error={publicError}
            locale={locale}
          />
        </main>
      ) : user.role.name === "public" ? (
        <main>
          <PublicSummaryPanel
            summary={publicSummary}
            error={publicError}
            locale={locale}
          />
        </main>
      ) : workspaceLoading && projects.length === 0 ? (
        <main className="centerState">
          <LoaderCircle className="spin" size={22} />
          <span>{t.loading}</span>
        </main>
      ) : (
        <main>
          <RoleNavigation
            user={user}
            view={view}
            onChange={selectAdminView}
            locale={locale}
          />

          {(view === "observations" || user.role.name === "monitor") && (
            <>
              {selectedTerritory && (
                <ClimatePanel
                  climate={climate}
                  feedback={climateFeedback}
                  lastQueryAt={lastClimateQueryAt}
                  locale={locale}
                  onRefresh={() => loadClimate(selectedTerritory.id)}
                />
              )}
              <div className="workspaceGrid">
                <ObservationForm
                  form={form}
                  projects={projects}
                  territories={territories}
                  submitState={submitState}
                  savedObservationId={savedObservationId}
                  locale={locale}
                  onChange={setForm}
                  onSubmit={submitObservation}
                />
                <ObservationList
                  observations={observations}
                  risks={risks}
                  locale={locale}
                  title={t.observations.title}
                  timeZone={selectedTerritory?.timezone}
                />
              </div>
            </>
          )}

          {view === "review" && user.role.name !== "monitor" && (
            <ValidationWorkspace
              observations={observations}
              selected={selectedObservation}
              selectedId={selectedId}
              risk={selectedId ? risks[selectedId] : undefined}
              audit={selectedAudit}
              comment={reviewComment}
              reviewState={reviewState}
              reviewedStatus={reviewedStatus}
              locale={locale}
              timeZone={selectedTerritory?.timezone}
              onSelect={setSelectedId}
              onComment={setReviewComment}
              onDecision={submitDecision}
            />
          )}

          {view === "users" && user.role.name === "admin" && (
            <UserAdministration
              users={demoUsers}
              error={userStatusError}
              locale={locale}
              onToggle={toggleUser}
            />
          )}

          {view === "audit" && user.role.name === "admin" && (
            <AuditTimeline events={adminAudit} locale={locale} />
          )}
        </main>
      )}
    </div>
  );
}

function RoleNavigation({
  user,
  view,
  onChange,
  locale,
}: {
  user: User;
  view: WorkspaceView;
  onChange: (view: WorkspaceView) => void;
  locale: Locale;
}) {
  const t = translations[locale];
  const options: Array<[WorkspaceView, React.ReactNode, string]> =
    user.role.name === "admin"
      ? [
          ["review", <ClipboardCheck size={17} />, t.nav.review],
          ["observations", <FileSearch size={17} />, t.nav.observations],
          ["users", <Users size={17} />, t.nav.users],
          ["audit", <FileClock size={17} />, t.nav.audit],
        ]
      : user.role.name === "validator"
        ? [["review", <ClipboardCheck size={17} />, t.nav.review]]
        : [["observations", <FileSearch size={17} />, t.nav.observations]];
  return (
    <nav className="workspaceNav" aria-label={t.auth.role}>
      {options.map(([value, icon, label]) => (
        <button
          className={view === value ? "active" : ""}
          type="button"
          key={value}
          onClick={() => onChange(value)}
        >
          {icon}
          {label}
        </button>
      ))}
    </nav>
  );
}

function ClimatePanel({
  climate,
  feedback,
  lastQueryAt,
  locale,
  onRefresh,
}: {
  climate: ClimateCurrent | null;
  feedback: "idle" | "updating" | "success" | "error";
  lastQueryAt: string | null;
  locale: Locale;
  onRefresh: () => void;
}) {
  const t = translations[locale];
  const timeZone = climate?.territory.timezone ?? "Pacific/Galapagos";
  return (
    <section className="climateSection">
      <div className="sectionHeading sectionHeadingSplit">
        <div>
          <CloudSun size={21} />
          <h2>{t.climate.title}</h2>
        </div>
        <button className="secondaryButton" type="button" onClick={onRefresh} disabled={feedback === "updating"}>
          <RefreshCw className={feedback === "updating" ? "spin" : ""} size={17} />
          {feedback === "updating" ? t.climate.updating : t.climate.refresh}
        </button>
      </div>
      {feedback !== "idle" && (
        <div className={`inlineFeedback ${feedback === "error" ? "errorFeedback" : "successFeedback"}`}>
          {feedback === "updating" && <LoaderCircle className="spin" size={16} />}
          {feedback === "success" && <CheckCircle2 size={16} />}
          {feedback === "error" && <AlertTriangle size={16} />}
          <span>
            {feedback === "updating"
              ? t.climate.updating
              : feedback === "success"
                ? t.climate.refreshSuccess
                : t.climate.refreshError}
          </span>
          {lastQueryAt && (
            <small>{replaceParams(t.climate.lastQuery, { time: formatDate(lastQueryAt, locale, timeZone) })}</small>
          )}
        </div>
      )}
      {!climate ? (
        <div className="emptyState">
          <AlertTriangle size={20} />
          <div>
            <strong>{t.climate.unavailableTitle}</strong>
            <span>{t.climate.unavailableBody}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="climateMetrics">
            <Metric icon={<Thermometer />} label={t.climate.temperature} value={`${climate.temperature_c} °C`} accent="heat" />
            <Metric icon={<Droplets />} label={t.climate.humidity} value={`${climate.relative_humidity_percent}%`} />
            <Metric icon={<Thermometer />} label={t.climate.apparent} value={`${climate.apparent_temperature_c} °C`} accent="warm" />
            <Metric icon={<Droplets />} label={t.climate.precipitation} value={`${climate.precipitation_mm} mm`} accent="rain" />
          </div>
          <div className="climateMeta">
            <div className="tagRow">
              <span className={provenanceClass(climate.data_provenance)}>
                {t.provenance[climate.data_provenance]}
              </span>
              <span className={climate.is_stale ? "tag tagStale" : "tag tagReal"}>
                {climate.is_stale ? t.climate.stale : t.climate.current}
              </span>
              <span className="tag tagNeutral">
                {t.weather[weatherKey(climate.weather_code)]} · {replaceParams(t.climate.wmoCode, { code: climate.weather_code })}
              </span>
            </div>
            <dl>
              <dt>{t.climate.observed}</dt>
              <dd>{formatDate(climate.observed_at, locale, timeZone)}</dd>
              <dt>{t.climate.retrieved}</dt>
              <dd>{formatDate(climate.retrieved_at, locale, timeZone)}</dd>
              <dt>{t.climate.source}</dt>
              <dd>
                <a href={climate.source_url} target="_blank" rel="noreferrer">
                  {climate.source_name} <ExternalLink size={13} />
                </a>
              </dd>
            </dl>
          </div>
        </>
      )}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  accent = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className={`climateMetric ${accent}`}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ObservationForm({
  form,
  projects,
  territories,
  submitState,
  savedObservationId,
  locale,
  onChange,
  onSubmit,
}: {
  form: FormState;
  projects: Project[];
  territories: Territory[];
  submitState: "idle" | "saving" | "saved" | "error";
  savedObservationId: number | null;
  locale: Locale;
  onChange: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const t = translations[locale];
  const availableTerritories = territories.filter(
    (territory) => territory.project_id === Number(form.projectId),
  );
  const setField = (field: keyof FormState, value: string | boolean) =>
    onChange((current) => ({ ...current, [field]: value }));
  const chooseTerritory = (territoryId: string) => {
    const territory = territories.find((item) => item.id === Number(territoryId));
    onChange((current) => ({
      ...current,
      territoryId,
      latitude: territory ? String(territory.latitude) : current.latitude,
      longitude: territory ? String(territory.longitude) : current.longitude,
    }));
  };
  return (
    <section className="formSection">
      <div className="sectionHeading">
        <MapPin size={21} />
        <h2>{t.observationForm.title}</h2>
      </div>
      <form onSubmit={onSubmit}>
        <div className="formGrid">
          <label>
            <span>{t.observationForm.project}</span>
            <select value={form.projectId} onChange={(event) => setField("projectId", event.target.value)} required>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.observationForm.territory}</span>
            <select value={form.territoryId} onChange={(event) => chooseTerritory(event.target.value)} required>
              {availableTerritories.map((territory) => (
                <option key={territory.id} value={territory.id}>{territory.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.observationForm.category}</span>
            <select value={form.category} onChange={(event) => setField("category", event.target.value)}>
              {Object.entries(t.categories).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.observationForm.provenance}</span>
            <select value={form.provenance} onChange={(event) => setField("provenance", event.target.value)}>
              {Object.entries(t.provenance).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="wideField">
            <span>{t.observationForm.description}</span>
            <textarea value={form.description} onChange={(event) => setField("description", event.target.value)} required minLength={5} />
          </label>
          {(["hazard", "exposure", "vulnerability"] as const).map((field) => (
            <label key={field}>
              <span>{t.observationForm[field]}</span>
              <select value={form[field]} onChange={(event) => setField(field, event.target.value)}>
                {[1, 2, 3, 4].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
          ))}
          <label>
            <span>{t.observationForm.observedAt}</span>
            <input type="datetime-local" value={form.observedAt} onChange={(event) => setField("observedAt", event.target.value)} required />
          </label>
          <label>
            <span>{t.observationForm.latitude}</span>
            <input type="number" step="any" value={form.latitude} onChange={(event) => setField("latitude", event.target.value)} required />
          </label>
          <label>
            <span>{t.observationForm.longitude}</span>
            <input type="number" step="any" value={form.longitude} onChange={(event) => setField("longitude", event.target.value)} required />
          </label>
          <button
            className="secondaryButton coordinateButton"
            type="button"
            onClick={() => {
              const territory = territories.find((item) => item.id === Number(form.territoryId));
              if (territory) {
                onChange((current) => ({
                  ...current,
                  latitude: String(territory.latitude),
                  longitude: String(territory.longitude),
                }));
              }
            }}
          >
            <Crosshair size={17} /> {t.observationForm.useTerritoryLocation}
          </button>
          <label>
            <span>{t.observationForm.sourceName}</span>
            <input value={form.sourceName} onChange={(event) => setField("sourceName", event.target.value)} placeholder={t.observationForm.sourcePlaceholder} required />
          </label>
          <label>
            <span>{t.observationForm.responsibleRole}</span>
            <input value={form.responsibleRole} onChange={(event) => setField("responsibleRole", event.target.value)} placeholder={t.observationForm.responsiblePlaceholder} required />
          </label>
        </div>
        <fieldset>
          <legend>{t.observationForm.evidenceTitle}</legend>
          <div className="formGrid">
            <label>
              <span>{t.observationForm.evidenceType}</span>
              <select value={form.evidenceType} onChange={(event) => setField("evidenceType", event.target.value)}>
                {Object.entries(t.evidenceTypes).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{t.observationForm.evidenceDate}</span>
              <input type="datetime-local" value={form.evidenceDate} onChange={(event) => setField("evidenceDate", event.target.value)} required />
            </label>
            <label className="wideField">
              <span>{t.observationForm.evidenceUrl}</span>
              <input type="url" value={form.evidenceUrl} onChange={(event) => setField("evidenceUrl", event.target.value)} required />
            </label>
            <label>
              <span>{t.observationForm.evidenceSource}</span>
              <input value={form.evidenceSource} onChange={(event) => setField("evidenceSource", event.target.value)} required />
            </label>
            <label>
              <span>{t.observationForm.evidenceDescription}</span>
              <input value={form.evidenceDescription} onChange={(event) => setField("evidenceDescription", event.target.value)} required />
            </label>
          </div>
        </fieldset>
        {form.provenance === "synthetic_demo" && (
          <label className="confirmationRow">
            <input type="checkbox" checked={form.syntheticConfirmation} onChange={(event) => setField("syntheticConfirmation", event.target.checked)} required />
            <span>{t.observationForm.syntheticConfirmation}</span>
          </label>
        )}
        <p className="privacyNotice">
          <ShieldCheck size={17} /> {t.observationForm.privacyNotice}
        </p>
        <div className="formActions">
          <button className="primaryButton" type="submit" disabled={submitState === "saving"}>
            {submitState === "saving" ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
            {submitState === "saving" ? t.observationForm.saving : t.observationForm.submit}
          </button>
          {submitState === "saved" && savedObservationId && (
            <span className="inlineFeedback successFeedback" role="status">
              <CheckCircle2 size={18} />
              {replaceParams(t.observationForm.saved, { id: savedObservationId })}
            </span>
          )}
          {submitState === "error" && (
            <span className="inlineFeedback errorFeedback" role="alert">
              <AlertTriangle size={18} /> {t.observationForm.error}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function ObservationList({
  observations,
  risks,
  locale,
  title,
  timeZone = "Pacific/Galapagos",
}: {
  observations: Observation[];
  risks: Record<number, RiskScore>;
  locale: Locale;
  title: string;
  timeZone?: string;
}) {
  const t = translations[locale];
  return (
    <section className="listSection">
      <div className="sectionHeading sectionHeadingSplit">
        <div>
          <FileSearch size={21} />
          <h2>{title}</h2>
        </div>
        <span className="recordCount">{replaceParams(t.observations.count, { count: observations.length })}</span>
      </div>
      {observations.length === 0 ? (
        <div className="emptyState">{t.observations.empty}</div>
      ) : (
        <div className="observationList">
          {observations.map((observation) => (
            <ObservationRecord
              key={observation.id}
              observation={observation}
              risk={risks[observation.id]}
              locale={locale}
              timeZone={timeZone}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ObservationRecord({
  observation,
  risk,
  locale,
  timeZone,
}: {
  observation: Observation;
  risk?: RiskScore;
  locale: Locale;
  timeZone: string;
}) {
  const t = translations[locale];
  return (
    <article className="observationItem">
      <div className="recordHeader">
        <div>
          <strong>#{observation.id}</strong>
          <span>{t.categories[observation.category]}</span>
        </div>
        <div className="tagRow">
          <span className={statusClass(observation.status)}>{t.statuses[observation.status]}</span>
          <span className={provenanceClass(observation.data_provenance)}>
            {t.provenance[observation.data_provenance]}
          </span>
        </div>
      </div>
      <p>{observation.description}</p>
      {observation.is_synthetic && (
        <div className="syntheticNotice">
          <AlertTriangle size={15} /> {t.observations.legacySyntheticNotice}
        </div>
      )}
      {risk && (
        <div className="compactRisk">
          <Gauge size={17} />
          <strong className={riskClass(risk.risk_level)}>{risk.risk_score}</strong>
          <span>{t.riskLevels[risk.risk_level]}</span>
          <small>{risk.formula_version}</small>
        </div>
      )}
      <dl>
        <dt>{t.observations.location}</dt>
        <dd>{observation.latitude.toFixed(4)}, {observation.longitude.toFixed(4)}</dd>
        <dt>{t.observations.observed}</dt>
        <dd>{formatDate(observation.observed_at, locale, timeZone)}</dd>
        <dt>{t.observations.source}</dt>
        <dd>{observation.source_name}</dd>
        <dt>{t.observations.evidence}</dt>
        <dd>{observation.evidence_items.map((item) => <EvidenceLink key={item.id} evidence={item} locale={locale} />)}</dd>
      </dl>
    </article>
  );
}

function EvidenceLink({ evidence, locale }: { evidence: Observation["evidence_items"][number]; locale: Locale }) {
  const t = translations[locale];
  const domain = evidenceDomain(evidence.uri);
  if (evidence.is_synthetic || evidence.data_provenance === "synthetic_demo" || !domain) {
    return <span className="evidenceItem">{t.observations.noExternalSyntheticEvidence}</span>;
  }
  const isOpenMeteo = domain === "api.open-meteo.com";
  return (
    <span className="evidenceItem">
      <a href={evidence.uri} target="_blank" rel="noreferrer">
        {isOpenMeteo ? t.observations.openMeteoTechnical : evidence.description || evidence.source_name}
        <ExternalLink size={13} />
      </a>
      <small>{domain}{isOpenMeteo ? ` · ${t.observations.technicalDataWarning}` : ""}</small>
    </span>
  );
}

function ValidationWorkspace({
  observations,
  selected,
  selectedId,
  risk,
  audit,
  comment,
  reviewState,
  reviewedStatus,
  locale,
  timeZone = "Pacific/Galapagos",
  onSelect,
  onComment,
  onDecision,
}: {
  observations: Observation[];
  selected: Observation | null;
  selectedId: number | null;
  risk?: RiskScore;
  audit: AuditEvent[];
  comment: string;
  reviewState: "idle" | "saving" | "success" | "error";
  reviewedStatus: Observation["status"] | null;
  locale: Locale;
  timeZone?: string;
  onSelect: (id: number) => void;
  onComment: (comment: string) => void;
  onDecision: (status: "validated" | "observed" | "rejected") => void;
}) {
  const t = translations[locale];
  const actionable = selected && ["pending", "observed"].includes(selected.status);
  return (
    <section className="reviewWorkspace">
      <aside className="reviewQueue">
        <div className="sectionHeading">
          <ClipboardCheck size={21} />
          <h2>{t.review.queue}</h2>
        </div>
        <div className="queueList">
          {observations.map((observation) => (
            <button
              type="button"
              className={selectedId === observation.id ? "queueRow selected" : "queueRow"}
              key={observation.id}
              onClick={() => onSelect(observation.id)}
            >
              <span>
                <strong>#{observation.id}</strong>
                {t.categories[observation.category]}
              </span>
              <span className={statusClass(observation.status)}>{t.statuses[observation.status]}</span>
              <small>{observation.description}</small>
            </button>
          ))}
        </div>
      </aside>
      <div className="reviewDetail">
        {!selected ? (
          <div className="emptyState">{t.review.selectPrompt}</div>
        ) : (
          <>
            <div className="recordTitle">
              <div>
                <span className="recordEyebrow">#{selected.id} · {t.categories[selected.category]}</span>
                <h2>{t.review.title}</h2>
              </div>
              <div className="tagRow">
                <span className={statusClass(selected.status)}>{t.statuses[selected.status]}</span>
                <span className={provenanceClass(selected.data_provenance)}>{t.provenance[selected.data_provenance]}</span>
              </div>
            </div>
            <p className="recordDescription">{selected.description}</p>
            <div className="reviewFacts">
              <div><span>{t.observationForm.hazard}</span><strong>{selected.hazard}</strong></div>
              <div><span>{t.observationForm.exposure}</span><strong>{selected.exposure}</strong></div>
              <div><span>{t.observationForm.vulnerability}</span><strong>{selected.vulnerability}</strong></div>
              <div><span>{t.observations.observed}</span><strong>{formatDate(selected.observed_at, locale, timeZone)}</strong></div>
            </div>
            <section className="detailBand">
              <h3>{t.observations.evidence}</h3>
              {selected.evidence_items.map((evidence) => (
                <EvidenceLink key={evidence.id} evidence={evidence} locale={locale} />
              ))}
            </section>
            <RiskPanel risk={risk} locale={locale} />
            <div className="validationNotice">
              <ShieldCheck size={18} />
              <span>{t.review.notice}</span>
            </div>
            {reviewState === "success" && reviewedStatus && (
              <div className="decisionResult inlineFeedback successFeedback" role="status">
                <CheckCircle2 size={16} />
                {replaceParams(t.review.success, {
                  id: selected.id,
                  status: t.statuses[reviewedStatus],
                })}
              </div>
            )}
            {actionable && (
              <section className="decisionPanel">
                <label>
                  <span>{t.review.comment}</span>
                  <textarea value={comment} onChange={(event) => onComment(event.target.value)} placeholder={t.review.commentPlaceholder} />
                </label>
                <div className="decisionActions">
                  <button type="button" className="decisionValidate" onClick={() => onDecision("validated")} disabled={reviewState === "saving"}>
                    <Check size={17} /> {t.review.validate}
                  </button>
                  <button type="button" className="decisionObserve" onClick={() => onDecision("observed")} disabled={reviewState === "saving"}>
                    <Eye size={17} /> {t.review.observe}
                  </button>
                  <button type="button" className="decisionReject" onClick={() => onDecision("rejected")} disabled={reviewState === "saving"}>
                    <X size={17} /> {t.review.reject}
                  </button>
                </div>
                {reviewState === "saving" && <span className="inlineFeedback"><LoaderCircle className="spin" size={16} /> {t.review.saving}</span>}
                {reviewState === "error" && <span className="inlineFeedback errorFeedback" role="alert"><AlertTriangle size={16} /> {t.review.error}</span>}
              </section>
            )}
            <AuditTimeline events={audit} locale={locale} compact />
          </>
        )}
      </div>
    </section>
  );
}

function RiskPanel({ risk, locale }: { risk?: RiskScore; locale: Locale }) {
  const t = translations[locale];
  return (
    <section className="detailBand riskPanel">
      <h3><Gauge size={18} /> {t.risk.title}</h3>
      {!risk ? (
        <p>{t.risk.unavailable}</p>
      ) : (
        <div className="riskLayout">
          <div className={riskClass(risk.risk_level)}>
            <strong>{risk.risk_score}</strong>
            <span>{t.riskLevels[risk.risk_level]}</span>
          </div>
          <div>
            <p>{replaceParams(t.risk.formula, {
              hazard: risk.hazard,
              exposure: risk.exposure,
              vulnerability: risk.vulnerability,
              total: risk.risk_score,
            })}</p>
            <small>{replaceParams(t.risk.version, { version: risk.formula_version })}</small>
            <small>{t.risk.notice}</small>
          </div>
        </div>
      )}
    </section>
  );
}

function AuditTimeline({
  events,
  locale,
  compact = false,
}: {
  events: AuditEvent[];
  locale: Locale;
  compact?: boolean;
}) {
  const t = translations[locale];
  return (
    <section className={compact ? "detailBand auditTimeline" : "auditSection auditTimeline"}>
      <div className="sectionHeading">
        <FileClock size={20} />
        <h2>{t.audit.title}</h2>
      </div>
      {events.length === 0 ? (
        <div className="emptyState">{t.audit.empty}</div>
      ) : (
        <ol>
          {events.map((event) => (
            <li key={event.id}>
              <span className="timelineMarker" />
              <div>
                <strong>{translateValue(t.events, event.event_type, event.event_type)}</strong>
                <span>{formatDate(event.occurred_at, locale, "UTC")} UTC</span>
                <small>
                  {event.actor_id
                    ? replaceParams(t.audit.actor, {
                        role: translateValue(t.roles, event.actor_role, event.actor_role ?? ""),
                        id: event.actor_id,
                      })
                    : t.audit.systemActor}
                </small>
                {(event.previous_state || event.new_state) && (
                  <small>
                    {replaceParams(t.audit.transition, {
                      before: event.previous_state ?? "—",
                      after: event.new_state ?? "—",
                    })}
                  </small>
                )}
                {event.comment && <p>{event.comment}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function UserAdministration({
  users,
  error,
  locale,
  onToggle,
}: {
  users: User[];
  error: boolean;
  locale: Locale;
  onToggle: (user: User) => void;
}) {
  const t = translations[locale];
  return (
    <section className="adminSection">
      <div className="sectionHeading">
        <Users size={21} />
        <h2>{t.admin.title}</h2>
      </div>
      {error && <p className="inlineFeedback errorFeedback"><AlertTriangle size={16} /> {t.admin.statusError}</p>}
      <div className="userTable" role="table">
        {users.map((account) => (
          <div className="userRow" role="row" key={account.id}>
            <div>
              <strong>{account.full_name}</strong>
              <span>@{account.username}</span>
            </div>
            <span className="tag tagNeutral">{t.roles[account.role.name]}</span>
            <label className="toggleControl">
              <input type="checkbox" checked={account.is_active} onChange={() => onToggle(account)} />
              <span aria-hidden="true" />
              <b>{account.is_active ? t.admin.active : t.admin.inactive}</b>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

function PublicSummaryPanel({
  summary,
  error,
  locale,
}: {
  summary: PublicSummary | null;
  error: boolean;
  locale: Locale;
}) {
  const t = translations[locale];
  return (
    <section className="publicSection">
      <div className="sectionHeading">
        <Eye size={21} />
        <h2>{t.public.title}</h2>
      </div>
      {error || !summary ? (
        <div className="emptyState">{t.public.unavailable}</div>
      ) : (
        <>
          <div className="publicMeta">
            <div><span>{t.public.territory}</span><strong>{summary.territory_name}</strong></div>
            <div><span>{t.public.timezone}</span><strong>{summary.timezone}</strong></div>
            <div><span>{t.public.total}</span><strong>{summary.total_observations}</strong></div>
          </div>
          <SummaryGroup title={t.public.workflow} items={[
            [t.statuses.pending, summary.pending],
            [t.statuses.validated, summary.validated],
            [t.statuses.observed, summary.observed],
            [t.statuses.rejected, summary.rejected],
          ]} />
          <SummaryGroup title={t.public.provenance} items={[
            [t.provenance.public_real, summary.public_real],
            [t.provenance.controlled_test, summary.controlled_test],
            [t.provenance.synthetic_demo, summary.synthetic_demo],
          ]} />
          <SummaryGroup title={t.public.risk} items={Object.entries(summary.risk_levels).map(([level, count]) => [
            translateValue(t.riskLevels, level, level),
            count,
          ])} />
          <p className="privacyNotice"><ShieldCheck size={17} /> {t.public.privacy}</p>
        </>
      )}
    </section>
  );
}

function SummaryGroup({ title, items }: { title: string; items: Array<[string, number]> }) {
  return (
    <div className="summaryGroup">
      <h3>{title}</h3>
      <div>
        {items.map(([label, count]) => (
          <span key={label}><b>{count}</b>{label}</span>
        ))}
      </div>
    </div>
  );
}
