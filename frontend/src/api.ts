export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "infinityatlas.prototype.session";

export type DataProvenance = "public_real" | "controlled_test" | "synthetic_demo";
export type RoleName = "admin" | "monitor" | "validator" | "public";

export type Health = {
  status: string;
  app: string;
  environment: string;
  database: string;
};

export type Role = {
  id: number;
  name: RoleName;
  description: string | null;
};

export type User = {
  id: number;
  username: string;
  full_name: string;
  email: string | null;
  role: Role;
  is_active: boolean;
  is_synthetic: boolean;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
  user: User;
};

export type Project = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  is_synthetic: boolean;
};

export type Territory = {
  id: number;
  project_id: number;
  name: string;
  country: string;
  province: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  is_synthetic: boolean;
};

export type ClimateCurrent = {
  territory: Territory;
  source_name: string;
  source_url: string;
  observed_at: string;
  retrieved_at: string;
  temperature_c: number;
  relative_humidity_percent: number;
  apparent_temperature_c: number;
  precipitation_mm: number;
  weather_code: number;
  data_provenance: DataProvenance;
  is_synthetic: boolean;
  is_stale: boolean;
};

export type Evidence = {
  id: number;
  evidence_type: string;
  uri: string;
  description: string | null;
  source_name: string;
  observed_at: string;
  data_provenance: DataProvenance;
  is_synthetic: boolean;
};

export type Observation = {
  id: number;
  project_id: number;
  territory_id: number;
  created_by_id: number | null;
  record_title: string;
  category: "water" | "waste" | "heat" | "environmental_pollution";
  description: string;
  hazard: number;
  exposure: number;
  vulnerability: number;
  latitude: number;
  longitude: number;
  observed_at: string;
  created_at: string;
  source_name: string;
  responsible_role: string;
  data_provenance: DataProvenance;
  synthetic_confirmed: boolean;
  status: "pending" | "validated" | "observed" | "rejected";
  is_synthetic: boolean;
  evidence_items: Evidence[];
};

export type RiskScore = {
  id: number;
  observation_id: number;
  hazard: number;
  exposure: number;
  vulnerability: number;
  risk_score: number;
  risk_level: "low" | "moderate" | "high" | "critical";
  data_provenance: DataProvenance;
  formula_version: string;
  calculated_by_id: number | null;
  is_clinical_diagnosis: boolean;
  calculated_at: string;
  explanation: string;
};

export type AuditEvent = {
  id: number;
  actor_id: number | null;
  actor_role: string | null;
  occurred_at: string;
  event_type: string;
  entity_type: string;
  entity_id: number | null;
  previous_state: string | null;
  new_state: string | null;
  comment: string | null;
  methodology_version: string | null;
};

export type PublicSummary = {
  territory_name: string;
  timezone: string;
  total_observations: number;
  pending: number;
  validated: number;
  observed: number;
  rejected: number;
  public_real: number;
  controlled_test: number;
  synthetic_demo: number;
  risk_levels: Record<string, number>;
};

export type DashboardTerritory = {
  id: number;
  name: string;
  timezone: string;
};

export type DashboardResponse = {
  scope: RoleName;
  generated_at: string;
  territory: DashboardTerritory | null;
  period: {
    start: string | null;
    end: string | null;
  };
  filters: Record<string, string | number | null>;
  active_filter_count: number;
  total_observations: number;
  status_counts: Record<Observation["status"], number>;
  provenance_counts: Record<DataProvenance, number>;
  risk_counts: Record<RiskScore["risk_level"], number>;
  category_counts: Record<Observation["category"], number>;
  trends: Array<{ date: string; count: number }>;
  methodology_version: string;
  methodological_notice: string;
  role_metrics: Record<string, number>;
  available_territories: DashboardTerritory[];
};

export type ObservationPayload = {
  project_id: number;
  territory_id: number;
  record_title: string;
  category: Observation["category"];
  description: string;
  hazard: number;
  exposure: number;
  vulnerability: number;
  latitude: number;
  longitude: number;
  observed_at: string;
  source_name: string;
  responsible_role: string;
  data_provenance: DataProvenance;
  synthetic_confirmation: boolean;
  evidence: {
    evidence_type: "url" | "photo_reference" | "document_reference";
    uri: string;
    description: string;
    source_name: string;
    observed_at: string;
  };
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function setAccessToken(token: string | null): void {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function hasStoredToken(): boolean {
  return Boolean(sessionStorage.getItem(TOKEN_KEY));
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (authenticated && token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    if (authenticated && response.status === 401 && token) {
      setAccessToken(null);
      window.dispatchEvent(new Event("infinityatlas:session-expired"));
    }
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) message = payload.detail;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export function getJson<T>(path: string, authenticated = true): Promise<T> {
  return requestJson<T>(path, {}, authenticated);
}

export function postJson<T>(
  path: string,
  payload?: unknown,
  authenticated = true,
): Promise<T> {
  return requestJson<T>(
    path,
    {
      method: "POST",
      body: payload === undefined ? undefined : JSON.stringify(payload),
    },
    authenticated,
  );
}

export function patchJson<T>(path: string, payload: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
