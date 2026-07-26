export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type DataProvenance = "public_real" | "controlled_test" | "synthetic_demo";

export type Health = {
  status: string;
  app: string;
  environment: string;
  database: string;
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
  status: string;
  is_synthetic: boolean;
  evidence_items: Evidence[];
};

export type ObservationPayload = {
  project_id: number;
  territory_id: number;
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

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}
