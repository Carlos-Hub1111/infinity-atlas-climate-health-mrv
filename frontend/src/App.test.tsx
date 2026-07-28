import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App, galapagosInputValue } from "./App";

const roles = {
  admin: { id: 1, name: "admin", description: "Administrator" },
  monitor: { id: 2, name: "monitor", description: "Monitor" },
  validator: { id: 3, name: "validator", description: "Validator" },
  public: { id: 4, name: "public", description: "Public" },
} as const;

const users = Object.fromEntries(
  Object.entries(roles).map(([name, role], index) => [
    name,
    {
      id: index + 1,
      username: `demo-${name}`,
      full_name: `Demo ${name}`,
      email: `demo.${name}@example.local`,
      role,
      is_active: true,
      is_synthetic: true,
    },
  ]),
) as Record<keyof typeof roles, {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: (typeof roles)[keyof typeof roles];
  is_active: boolean;
  is_synthetic: boolean;
}>;

const project = {
  id: 1,
  name: "InfinityAtlas Climate & Health MRV Prototype",
  description: "Prototype / controlled test - Not a validated field pilot",
  status: "prototype_reference",
  is_synthetic: false,
};

const territory = {
  id: 1,
  project_id: 1,
  name: "San Cristobal",
  country: "Ecuador",
  province: "Galapagos",
  latitude: -0.9002,
  longitude: -89.6127,
  timezone: "Pacific/Galapagos",
  is_synthetic: false,
};

const climate = {
  territory,
  source_name: "Open-Meteo Weather Forecast API",
  source_url: "https://api.open-meteo.com/v1/forecast?mock=true",
  observed_at: "2026-07-26T20:00:00Z",
  retrieved_at: "2026-07-26T20:05:00Z",
  temperature_c: 26.6,
  relative_humidity_percent: 81,
  apparent_temperature_c: 31.1,
  precipitation_mm: 0.3,
  weather_code: 55,
  data_provenance: "public_real",
  is_synthetic: false,
  is_stale: false,
};

const observation = {
  id: 4,
  project_id: 1,
  territory_id: 1,
  created_by_id: users.monitor.id,
  record_title: "Controlled water observation",
  category: "water",
  description: "Controlled observation created in the interface.",
  hazard: 2,
  exposure: 3,
  vulnerability: 2,
  latitude: -0.9002,
  longitude: -89.6127,
  observed_at: "2026-07-26T20:00:00Z",
  created_at: "2026-07-26T20:05:00Z",
  source_name: "Controlled territorial exercise",
  responsible_role: "Territorial monitor",
  data_provenance: "controlled_test",
  synthetic_confirmed: false,
  status: "pending",
  is_synthetic: false,
  evidence_items: [
    {
      id: 4,
      evidence_type: "url",
      uri: "https://github.com/Carlos-Hub1111/infinity-atlas-climate-health-mrv",
      description: "Public repository reference",
      source_name: "InfinityAtlas public repository",
      observed_at: "2026-07-26T20:00:00Z",
      data_provenance: "controlled_test",
      is_synthetic: false,
    },
  ],
};

const heatObservation = {
  ...observation,
  id: 6,
  record_title: "Heat risk controlled test",
  category: "heat" as const,
  description: "Controlled heat observation used for Product Owner acceptance.",
  observed_at: "2026-07-26T21:00:00Z",
  created_at: "2026-07-26T21:01:00Z",
  status: "validated" as const,
};

const risk = {
  id: 1,
  observation_id: 4,
  hazard: 2,
  exposure: 3,
  vulnerability: 2,
  risk_score: 7,
  risk_level: "moderate",
  data_provenance: "controlled_test",
  formula_version: "climate-health-risk-v0.1",
  calculated_by_id: users.monitor.id,
  is_clinical_diagnosis: false,
  calculated_at: "2026-07-26T20:05:00Z",
  explanation: "2 hazard + 3 exposure + 2 vulnerability = 7.",
};

const heatRisk = {
  ...risk,
  id: 2,
  observation_id: 6,
};

const audit = [
  {
    id: 1,
    actor_id: users.monitor.id,
    actor_role: "monitor",
    occurred_at: "2026-07-26T20:05:00Z",
    event_type: "observation_created",
    entity_type: "observation",
    entity_id: 4,
    previous_state: null,
    new_state: "pending",
    comment: "provenance=controlled_test",
    methodology_version: null,
  },
];

const adminAudit = [
  audit[0],
  {
    ...audit[0],
    id: 2,
    entity_id: 6,
    occurred_at: "2026-07-26T21:01:00Z",
  },
  {
    ...audit[0],
    id: 3,
    entity_id: 6,
    occurred_at: "2026-07-26T21:02:00Z",
    event_type: "risk_score_calculated",
    previous_state: null,
    new_state: "7:moderate",
    comment: null,
    methodology_version: "climate-health-risk-v0.1",
  },
  {
    ...audit[0],
    id: 4,
    actor_id: users.validator.id,
    actor_role: "validator",
    entity_id: 6,
    occurred_at: "2026-07-26T21:10:00Z",
    event_type: "status_changed",
    previous_state: "pending",
    new_state: "observed",
    comment: "Clarification requested.",
  },
  {
    ...audit[0],
    id: 5,
    actor_id: users.validator.id,
    actor_role: "validator",
    entity_id: 6,
    occurred_at: "2026-07-26T21:20:00Z",
    event_type: "status_changed",
    previous_state: "observed",
    new_state: "validated",
    comment: "Clarification completed.",
  },
];

const publicSummary = {
  territory_name: "San Cristobal",
  timezone: "Pacific/Galapagos",
  total_observations: 1,
  pending: 1,
  validated: 0,
  observed: 0,
  rejected: 0,
  public_real: 0,
  controlled_test: 1,
  synthetic_demo: 0,
  risk_levels: { low: 0, moderate: 1, high: 0, critical: 0 },
};

const dashboard = {
  scope: "public",
  generated_at: "2026-07-26T20:05:00Z",
  territory: {
    id: 1,
    name: "San Cristobal",
    timezone: "Pacific/Galapagos",
  },
  period: {
    start: "2026-07-26",
    end: "2026-07-26",
  },
  filters: {
    date_from: null,
    date_to: null,
    category: null,
    status: null,
    provenance: null,
    risk_level: null,
    territory_id: null,
    search: null,
  },
  active_filter_count: 0,
  total_observations: 1,
  status_counts: { pending: 1, validated: 0, observed: 0, rejected: 0 },
  provenance_counts: { public_real: 0, controlled_test: 1, synthetic_demo: 0 },
  risk_counts: { low: 0, moderate: 1, high: 0, critical: 0 },
  category_counts: { water: 1, waste: 0, heat: 0, environmental_pollution: 0 },
  trends: [{ date: "2026-07-26", count: 1 }],
  methodology_version: "climate-health-risk-v0.1",
  methodological_notice: "Methodological and non-clinical.",
  role_metrics: {},
  available_territories: [
    { id: 1, name: "San Cristobal", timezone: "Pacific/Galapagos" },
  ],
};

const mapData = {
  scope: "public",
  generated_at: "2026-07-26T20:05:00Z",
  territory: { id: 1, name: "San Cristobal", timezone: "Pacific/Galapagos" },
  active_filter_count: 0,
  observations: [
    {
      id: 4,
      record_title: "Controlled water observation",
      category: "water",
      status: "pending",
      risk_score: 7,
      risk_level: "moderate",
      data_provenance: "controlled_test",
      observed_at: "2026-07-26T20:00:00Z",
      latitude: -0.9,
      longitude: -89.613,
      location_mode: "approximate",
      is_publicly_mappable: true,
      public_notice: "Controlled prototype record - not a verified territorial event.",
    },
  ],
  attribution: "Map data (c) OpenStreetMap contributors",
  privacy_notice: "Public locations follow the configured geoprivacy mode.",
};

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installFetchMock(options?: {
  invalidLogin?: boolean;
  expiredMe?: boolean;
  climateHandler?: () => Promise<Response> | Response;
  monitorObservationStatus?: "pending" | "validated" | "observed" | "rejected";
}) {
  let validationRecorded = false;
  let activeRole: keyof typeof users = "monitor";
  let currentObservation = {
    ...observation,
    status: options?.monitorObservationStatus ?? observation.status,
  };
  let currentHeatObservation = { ...heatObservation };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/health")) {
        return response({
          status: "ok",
          app: "InfinityAtlas Climate & Health MRV Toolkit",
          environment: "test",
          database: "sqlite",
        });
      }
      if (url.endsWith("/api/v1/public/summary")) return response(publicSummary);
      if (url.includes("/api/v1/dashboard/public")) {
        const parsed = new URL(url);
        const activeFilterCount = Array.from(parsed.searchParams.values()).filter(Boolean).length;
        const empty = parsed.searchParams.get("date_from") === "2027-01-01";
        return response({
          ...dashboard,
          active_filter_count: activeFilterCount,
          total_observations: empty ? 0 : dashboard.total_observations,
          status_counts: empty
            ? { pending: 0, validated: 0, observed: 0, rejected: 0 }
            : dashboard.status_counts,
          provenance_counts: empty
            ? { public_real: 0, controlled_test: 0, synthetic_demo: 0 }
            : dashboard.provenance_counts,
          risk_counts: empty
            ? { low: 0, moderate: 0, high: 0, critical: 0 }
            : dashboard.risk_counts,
          category_counts: empty
            ? { water: 0, waste: 0, heat: 0, environmental_pollution: 0 }
            : dashboard.category_counts,
          trends: empty ? [] : dashboard.trends,
        });
      }
      if (url.includes("/api/v1/dashboard/internal")) {
        const roleMetrics = activeRole === "monitor"
          ? { my_records: 1, pending: 1, observed_requiring_response: 0 }
          : activeRole === "validator"
            ? { pending_queue: 1, observed: 0, high_priority: 0, oldest_pending_hours: 2 }
            : { total_users: 4, active_users: 4, recent_activity: 5, records: 2 };
        return response({ ...dashboard, scope: activeRole, role_metrics: roleMetrics });
      }
      if (url.includes("/api/v1/map/observations")) return response(mapData);
      if (url.includes("/api/v1/map/internal")) {
        return response({ ...mapData, scope: activeRole });
      }
      if (url.endsWith("/api/v1/auth/me")) {
        return options?.expiredMe
          ? response({ detail: "Session expired." }, 401)
          : response(users.monitor);
      }
      if (url.endsWith("/api/v1/auth/login") && method === "POST") {
        if (options?.invalidLogin) return response({ detail: "Invalid" }, 401);
        const body = JSON.parse(String(init?.body)) as { identifier: string };
        const roleName =
          (Object.keys(users) as Array<keyof typeof users>).find((name) =>
            body.identifier.includes(name),
          ) ?? "monitor";
        activeRole = roleName;
        return response({
          access_token: `token-${roleName}`,
          token_type: "bearer",
          expires_at: "2026-07-26T22:00:00Z",
          user: users[roleName],
        });
      }
      if (url.endsWith("/api/v1/auth/logout") && method === "POST") {
        return response({ message: "Session closed." });
      }
      if (url.endsWith("/api/v1/projects")) return response([project]);
      if (url.endsWith("/api/v1/territories")) return response([territory]);
      if (url.includes("/api/v1/climate/current")) {
        return options?.climateHandler ? options.climateHandler() : response(climate);
      }
      if (url.endsWith("/api/v1/observations") && method === "POST") {
        const body = JSON.parse(String(init?.body)) as { record_title: string };
        currentObservation = { ...currentObservation, record_title: body.record_title };
        return response(currentObservation, 201);
      }
      if (url.endsWith("/api/v1/observations")) {
        return response(
          activeRole === "admin"
            ? [currentObservation, currentHeatObservation]
            : [currentObservation],
        );
      }
      if (url.includes("/api/v1/observations/") && method === "PATCH") {
        const body = JSON.parse(String(init?.body)) as { record_title?: string };
        if (url.includes("/observations/6")) {
          currentHeatObservation = {
            ...currentHeatObservation,
            record_title: body.record_title ?? currentHeatObservation.record_title,
          };
          return response(currentHeatObservation);
        }
        currentObservation = {
          ...currentObservation,
          record_title: body.record_title ?? currentObservation.record_title,
        };
        return response(currentObservation);
      }
      if (url.endsWith("/risk-score")) {
        return response(url.includes("/observations/6/") ? heatRisk : risk);
      }
      if (url.includes("/api/v1/observations/") && url.endsWith("/audit")) {
        return response(
          validationRecorded
            ? [
                ...audit,
                {
                  ...audit[0],
                  id: 2,
                  actor_id: users.validator.id,
                  actor_role: "validator",
                  event_type: "validation_created",
                  previous_state: "pending",
                  new_state: "observed",
                  comment: "Clarify capture time.",
                },
              ]
            : audit,
        );
      }
      if (url.endsWith("/validation") && method === "POST") {
        validationRecorded = true;
        return response({
          id: 1,
          observation_id: 4,
          previous_status: "pending",
          status: "observed",
          comment: "Clarify capture time.",
          validated_by_id: users.validator.id,
          validated_at: "2026-07-26T21:00:00Z",
          methodological_notice:
            "Validation confirms record completeness and methodological review.",
        }, 201);
      }
      if (url.endsWith("/api/v1/admin/users")) return response(Object.values(users).slice(0, 3));
      if (url.includes("/api/v1/admin/users/") && method === "PATCH") {
        const body = JSON.parse(String(init?.body)) as { is_active: boolean };
        return response({ ...users.monitor, is_active: body.is_active });
      }
      if (url.endsWith("/api/v1/admin/audit")) return response(adminAudit);
      return response({ detail: "Not found" }, 404);
    }),
  );
}

async function loginAs(role: keyof typeof users) {
  fireEvent.change(screen.getByLabelText("Username or email"), {
    target: { value: `demo-${role}` },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "local-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByText(users[role].full_name);
}

describe("Sprint 1B application", () => {
  beforeEach(() => {
    sessionStorage.clear();
    installFetchMock();
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("uses Galapagos local time for territorial date inputs", () => {
    expect(galapagosInputValue(new Date("2026-07-26T20:35:00Z"))).toBe(
      "2026-07-26T14:35",
    );
  });

  it("shows secure login and an aggregate-only public view before authentication", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Secure prototype access" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "San Cristobal climate and health dashboard" })).toBeInTheDocument();
    expect((await screen.findAllByText("San Cristobal")).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Territorial intelligence, traceability and trusted impact data.").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "New territorial observation" })).not.toBeInTheDocument();
  });

  it("explains every public review status with accessible bilingual tooltips", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "San Cristobal climate and health dashboard" });

    const pendingHelp = await screen.findByRole("button", {
      name: "More information about Pending",
    });
    expect(pendingHelp).toHaveAttribute("aria-expanded", "false");
    fireEvent.focus(pendingHelp);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Record received and not yet reviewed by an authorized person.",
    );
    expect(pendingHelp).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(pendingHelp, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Language"), {
      target: { value: "es" },
    });
    const validatedHelp = screen.getByRole("button", {
      name: "Más información sobre Validado",
    });
    fireEvent.click(validatedHelp);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Registro revisado metodológicamente y considerado completo. No confirma por sí solo que el evento ocurrió.",
    );

    fireEvent.click(validatedHelp);
    const provenanceHelp = screen.getByRole("button", {
      name: "Más información sobre Prueba controlada",
    });
    fireEvent.click(provenanceHelp);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "No representa un evento territorial validado.",
    );
    fireEvent.click(provenanceHelp);

    const formulaHelp = screen.getByRole("button", {
      name: "Cómo se calcula el puntaje metodológico de riesgo",
    });
    fireEvent.focus(formulaHelp);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Puntaje de riesgo = Peligro + Exposición + Vulnerabilidad.",
    );
    fireEvent.keyDown(formulaHelp, { key: "Escape" });

    const moderateHelp = screen.getByRole("button", {
      name: "Más información sobre riesgo Moderado",
    });
    fireEvent.click(moderateHelp);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Puntaje metodológico de 6 a 8.",
    );
  });

  it("renders login errors without exposing credential details", async () => {
    vi.unstubAllGlobals();
    installFetchMock({ invalidLogin: true });
    render(<App />);
    await screen.findByRole("heading", { name: "Secure prototype access" });
    fireEvent.change(screen.getByLabelText("Username or email"), { target: { value: "demo-monitor" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("credentials are invalid");
  });

  it("recovers from an expired stored session", async () => {
    vi.unstubAllGlobals();
    sessionStorage.setItem("infinityatlas.prototype.session", "expired-token");
    installFetchMock({ expiredMe: true });
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your session ended. Sign in again.",
    );
    expect(
      screen.getByRole("heading", { name: "San Cristobal climate and health dashboard" }),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem("infinityatlas.prototype.session")).toBeNull();
  });

  it("gives a monitor climate, observation creation, visible risk and bilingual feedback", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Secure prototype access" });
    await loginAs("monitor");

    expect(await screen.findByRole("heading", { name: "New territorial observation" })).toBeInTheDocument();
    expect(await screen.findByText("26.6 °C")).toBeInTheDocument();
    expect(screen.getByText("Monitor / Technician")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Validate" })).not.toBeInTheDocument();
    expect(screen.getByText("climate-health-risk-v0.1")).toBeInTheDocument();

    const recordTitle = screen.getByLabelText("Record title");
    expect(recordTitle).toHaveValue("Water observation — San Cristobal");
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "heat" },
    });
    expect(recordTitle).toHaveValue("Heat observation — San Cristobal");
    fireEvent.change(recordTitle, {
      target: { value: "Heat risk near the controlled route" },
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "waste" },
    });
    expect(recordTitle).toHaveValue("Heat risk near the controlled route");

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Controlled observation created in the interface." },
    });
    fireEvent.change(screen.getByLabelText("Observation source"), {
      target: { value: "Controlled territorial exercise" },
    });
    fireEvent.change(screen.getByLabelText("Evidence URL"), {
      target: { value: "https://github.com/Carlos-Hub1111/infinity-atlas-climate-health-mrv" },
    });
    fireEvent.change(screen.getByLabelText("Evidence source"), {
      target: { value: "InfinityAtlas repository" },
    });
    fireEvent.change(screen.getByLabelText("Evidence description"), {
      target: { value: "Public repository reference" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Save observation" }).closest("form")!);
    expect(await screen.findByText("Observation #4 saved successfully with Pending status.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es" } });
    expect(screen.getByRole("heading", { name: "Nueva observación territorial" })).toBeInTheDocument();
    expect(screen.getByText("Monitor / Técnico")).toBeInTheDocument();
    expect(screen.getByText("Procedencia del dato")).toBeInTheDocument();
  });

  it("searches observations by number and title and lets a monitor rename an allowed record", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Secure prototype access" });
    await loginAs("monitor");
    await screen.findByRole("heading", { name: "My observations" });

    const search = screen.getByLabelText("Search observations");
    fireEvent.change(search, { target: { value: "controlled water" } });
    expect(
      screen.getByText("#4 — Controlled water observation — San Cristobal"),
    ).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "#4" } });
    expect(
      screen.getByText("#4 — Controlled water observation — San Cristobal"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Edit record #4 title" }),
    );
    const titleInput = screen.getByLabelText("Record title for observation #4");
    fireEvent.change(titleInput, {
      target: { value: "Controlled water evidence review" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save title" }));
    expect(
      await screen.findByText(
        "#4 — Controlled water evidence review — San Cristobal",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Record #4 title updated.")).toBeInTheDocument();
  });

  it("hides title editing from a monitor after validation", async () => {
    vi.unstubAllGlobals();
    installFetchMock({ monitorObservationStatus: "validated" });
    render(<App />);
    await screen.findByRole("heading", { name: "Secure prototype access" });
    await loginAs("monitor");
    expect(
      await screen.findByText(
        "#4 — Controlled water observation — San Cristobal",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit record #4 title" }),
    ).not.toBeInTheDocument();
  });

  it("shows climate refresh feedback and the last query time", async () => {
    vi.unstubAllGlobals();
    let climateCalls = 0;
    let resolveRefresh: ((value: Response) => void) | undefined;
    installFetchMock({
      climateHandler: () => {
        climateCalls += 1;
        if (climateCalls <= 2) return response(climate);
        return new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        });
      },
    });
    render(<App />);
    await screen.findByRole("heading", { name: "Secure prototype access" });
    await screen.findByText("26.6 °C");
    await loginAs("monitor");
    await screen.findByText("26.6 °C");
    fireEvent.click(screen.getByRole("button", { name: "Refresh climate" }));
    const updatingButton = screen.getByRole("button", {
      name: "Updating climate…",
    });
    expect(updatingButton).toBeDisabled();
    expect(updatingButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("climate-refresh-icon")).toHaveClass("spin");
    resolveRefresh?.(response(climate));
    expect(await screen.findByText("Climate updated successfully.")).toBeInTheDocument();
    expect(screen.getByText(/Last query:/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh climate" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Refresh climate" })).toHaveAttribute(
      "aria-busy",
      "false",
    );
  });

  it("restores climate refresh controls and announces the stored-data fallback after an error", async () => {
    vi.unstubAllGlobals();
    let climateCalls = 0;
    let resolveRefresh: ((value: Response) => void) | undefined;
    installFetchMock({
      climateHandler: () => {
        climateCalls += 1;
        if (climateCalls <= 2) return response(climate);
        return new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        });
      },
    });
    render(<App />);
    await screen.findByRole("heading", { name: "Secure prototype access" });
    await screen.findByText("26.6 °C");
    await loginAs("monitor");
    await screen.findByText("26.6 °C");

    fireEvent.click(screen.getByRole("button", { name: "Refresh climate" }));
    expect(screen.getByRole("button", { name: "Updating climate…" })).toBeDisabled();
    resolveRefresh?.(response({ detail: "Climate source unavailable." }, 503));

    expect(
      await screen.findByText(
        "Climate could not be updated. The latest available data is shown.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh climate" })).toBeEnabled();
    expect(screen.getByText(/Last query:/)).toBeInTheDocument();
  });

  it("gives validators decisions, evidence, transparent risk and append-only history", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Secure prototype access" });
    await loginAs("validator");

    expect(await screen.findByRole("heading", { name: "Methodological validation" })).toBeInTheDocument();
    expect(screen.getByText("Hazard 2 + Exposure 3 + Vulnerability 2 = 7")).toBeInTheDocument();
    expect(screen.getByText("Observation created")).toBeInTheDocument();
    expect(screen.getByText(/does not constitute a medical diagnosis/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "New territorial observation" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Observe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("required comment");
    fireEvent.change(screen.getByLabelText("Review comment"), {
      target: { value: "Clarify capture time." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Observe" }));
    expect(await screen.findByText("Record #4 changed to Observed.")).toBeInTheDocument();
    expect(await screen.findByText("Validation decision recorded")).toBeInTheDocument();
  });

  it("keeps a public-role session read-only", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Secure prototype access" });
    await loginAs("public");
    expect(screen.getByText("Public user")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "San Cristobal climate and health dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "New territorial observation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Validate" })).not.toBeInTheDocument();
  });

  it("applies reproducible dashboard filters and renders a clear empty state", async () => {
    render(<App />);
    await screen.findByRole("button", { name: "More information about Pending" });
    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2027-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(await screen.findByText("1 active filters")).toBeInTheDocument();
    expect(window.location.search).toContain("date_from=2027-01-01");
    expect(
      (await screen.findAllByText("No data matches the active filters.")).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("renders a filter-consistent map with safe popup content and attribution", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Territorial map" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("#4 · Controlled water observation"),
    ).toBeInTheDocument();
    expect(screen.getByText("Map data (c) OpenStreetMap contributors")).toBeInTheDocument();
    expect(screen.getAllByText("Controlled test").length).toBeGreaterThan(0);
    expect(screen.queryByText("Territorial monitor")).not.toBeInTheDocument();
    expect(screen.queryByText("Clarification requested.")).not.toBeInTheDocument();
  });

  it("shows a backend-calculated role overview without replacing role workflows", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Secure prototype access" });
    await loginAs("monitor");
    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(await screen.findByRole("heading", { name: "Role overview" })).toBeInTheDocument();
    expect(screen.getByText("My records")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open my records" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Validate" })).not.toBeInTheDocument();
  });

  it("lets an administrator rename a validated record", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Secure prototype access" });
    await loginAs("admin");
    fireEvent.click(await screen.findByRole("button", { name: "Observations" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit record #6 title" }),
    );
    fireEvent.change(
      screen.getByLabelText("Record title for observation #6"),
      { target: { value: "Validated heat risk review" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save title" }));
    expect(
      await screen.findByText(
        "#6 — Validated heat risk review — San Cristobal",
      ),
    ).toBeInTheDocument();
  });

  it("lets administrators search, filter and open an observation audit, then return globally", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Secure prototype access" });
    await loginAs("admin");

    fireEvent.click(await screen.findByRole("button", { name: "Demo users" }));
    expect(await screen.findByRole("heading", { name: "Local demonstration users" })).toBeInTheDocument();
    const toggles = screen.getAllByRole("checkbox");
    expect(toggles.length).toBe(3);
    fireEvent.click(toggles[1]);
    await waitFor(() => expect(toggles[1]).not.toBeChecked());

    fireEvent.click(screen.getByRole("button", { name: "Audit" }));
    expect(
      await screen.findByRole("heading", { name: "Navigable audit" }),
    ).toBeInTheDocument();

    const observationSearch = screen.getByLabelText(
      "Observation number or record title",
    );
    fireEvent.change(observationSearch, { target: { value: "6" } });
    expect(
      screen.getByText("#6 — Heat risk controlled test — San Cristobal"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("#4 — Controlled water observation — San Cristobal"),
    ).not.toBeInTheDocument();

    fireEvent.change(observationSearch, { target: { value: "heat risk" } });
    expect(
      screen.getByText("#6 — Heat risk controlled test — San Cristobal"),
    ).toBeInTheDocument();

    fireEvent.change(observationSearch, { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "heat" },
    });
    expect(
      screen.getByText("#6 — Heat risk controlled test — San Cristobal"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("#4 — Controlled water observation — San Cristobal"),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Event"), {
      target: { value: "risk_score_calculated" },
    });
    const globalTimeline = screen.getByRole("list");
    expect(within(globalTimeline).getByText("Risk score calculated")).toBeInTheDocument();
    expect(within(globalTimeline).queryByText("Status changed")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Event"), { target: { value: "" } });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open audit for observation #6",
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: "#6 — Heat risk controlled test — San Cristobal",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Clarification requested.")).toBeInTheDocument();
    expect(screen.getByText("Clarification completed.")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Back to global activity" }),
    );
    expect(
      screen.getByRole("heading", { name: "Global activity" }),
    ).toBeInTheDocument();
  });
});
