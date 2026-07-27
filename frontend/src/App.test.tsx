import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App, galapagosInputValue } from "./App";

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

const createdObservation = {
  id: 4,
  project_id: 1,
  territory_id: 1,
  category: "water",
  description: "Controlled observation created in the interface.",
  hazard: 1,
  exposure: 1,
  vulnerability: 1,
  latitude: -0.9002,
  longitude: -89.6127,
  observed_at: "2026-07-26T20:00:00Z",
  created_at: "2026-07-26T20:05:00Z",
  source_name: "Controlled territorial exercise",
  responsible_role: "Monitoring team",
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

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installFetchMock(options?: {
  failObservationPost?: boolean;
  observations?: unknown[];
  climateHandler?: () => Promise<Response> | Response;
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return response({ status: "ok", app: "InfinityAtlas Climate & Health MRV Toolkit", environment: "test", database: "sqlite" });
      }
      if (url.endsWith("/api/v1/projects")) return response([project]);
      if (url.endsWith("/api/v1/territories")) return response([territory]);
      if (url.includes("/api/v1/climate/current")) {
        return options?.climateHandler ? options.climateHandler() : response(climate);
      }
      if (url.endsWith("/api/v1/observations") && init?.method === "POST") {
        return options?.failObservationPost
          ? response({ detail: "Invalid" }, 422)
          : response(createdObservation, 201);
      }
      if (url.endsWith("/api/v1/observations")) return response(options?.observations ?? []);
      return response({ detail: "Not found" }, 404);
    }),
  );
}

describe("Sprint 1A application", () => {
  beforeEach(() => {
    installFetchMock();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses Galapagos local time for territorial date inputs", () => {
    expect(galapagosInputValue(new Date("2026-07-26T20:35:00Z"))).toBe("2026-07-26T14:35");
  });

  it("renders the observation form and attributed public climate data", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "InfinityAtlas Climate & Health MRV Toolkit",
      }),
    ).toBeInTheDocument();
    expect(document.title).toBe("InfinityAtlas Climate & Health MRV Toolkit");
    expect(screen.getByText("InfinityAtlas")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "New territorial observation" })).toBeInTheDocument();
    expect(await screen.findByText("26.6 °C")).toBeInTheDocument();
    expect(screen.getAllByText("Public real data").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Weather data by Open-Meteo.com/ })).toHaveAttribute(
      "href",
      "https://open-meteo.com/",
    );
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Evidence URL")).toBeInTheDocument();
    expect(
      screen.getByText("Prototype / controlled test — Not a validated field pilot"),
    ).toBeInTheDocument();
  });

  it("makes the Spanish translations selectable", async () => {
    render(<App />);
    await screen.findByText("Public reference territory");

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es" } });

    expect(
      screen.getByRole("heading", {
        name: "InfinityAtlas Climate & Health MRV Toolkit",
      }),
    ).toBeInTheDocument();
    expect(document.title).toBe("InfinityAtlas Climate & Health MRV Toolkit");
    expect(screen.getByRole("heading", { name: "Nueva observación territorial" })).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
    expect(screen.getByLabelText("Procedencia del dato")).toBeInTheDocument();
    expect(screen.getAllByText("Dato público real").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Prototipo / prueba controlada — No constituye un piloto territorial validado"),
    ).toBeInTheDocument();
  });

  it("shows a prominent save confirmation with the created record number", async () => {
    render(<App />);
    await screen.findByText("Public reference territory");

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Controlled observation created in the interface." },
    });
    fireEvent.change(screen.getByLabelText("Observation source"), {
      target: { value: "Controlled territorial exercise" },
    });
    fireEvent.change(screen.getByLabelText("Responsible role or team"), {
      target: { value: "Monitoring team" },
    });
    fireEvent.change(screen.getByLabelText("Evidence URL"), {
      target: { value: "https://github.com/Carlos-Hub1111/infinity-atlas-climate-health-mrv" },
    });
    fireEvent.change(screen.getByLabelText("Evidence source"), {
      target: { value: "InfinityAtlas public repository" },
    });
    fireEvent.change(screen.getByLabelText("Evidence description"), {
      target: { value: "Public repository reference" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Save observation" }).closest("form")!);

    expect(
      await screen.findByText("Observation #4 saved successfully with Pending status."),
    ).toBeInTheDocument();
  });

  it("shows updating feedback, disables refresh and records the last climate query", async () => {
    vi.unstubAllGlobals();
    let climateCalls = 0;
    let resolveRefresh: ((value: Response) => void) | undefined;
    installFetchMock({
      climateHandler: () => {
        climateCalls += 1;
        if (climateCalls === 1) return response(climate);
        return new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        });
      },
    });
    render(<App />);
    await screen.findByText("26.6 °C");

    const refreshButton = screen.getByRole("button", { name: "Refresh climate" });
    fireEvent.click(refreshButton);

    expect(screen.getByRole("button", { name: "Updating…" })).toBeDisabled();
    expect(screen.getAllByText("Updating…").length).toBeGreaterThan(0);
    resolveRefresh?.(response(climate));

    expect(await screen.findByText(/Climate query completed\./)).toBeInTheDocument();
    expect(screen.getByText(/Last query:/)).toBeInTheDocument();
  });

  it("never renders a fictitious external link for synthetic evidence", async () => {
    vi.unstubAllGlobals();
    installFetchMock({
      observations: [
        {
          ...createdObservation,
          id: 1,
          status: "pending",
          data_provenance: "synthetic_demo",
          is_synthetic: true,
          source_name: "Legacy synthetic demo record - Not technically validated",
          evidence_items: [
            {
              ...createdObservation.evidence_items[0],
              id: 1,
              uri: "https://example.local/synthetic-evidence",
              data_provenance: "synthetic_demo",
              is_synthetic: true,
            },
          ],
        },
      ],
    });
    render(<App />);

    expect(await screen.findByText("No external evidence — synthetic marker")).toBeInTheDocument();
    expect(
      screen.getByText("Legacy synthetic demo record — Not technically validated"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /synthetic/i }),
    ).not.toBeInTheDocument();
  });

  it("labels raw Open-Meteo evidence as technical source data", async () => {
    vi.unstubAllGlobals();
    installFetchMock({
      observations: [
        {
          ...createdObservation,
          id: 2,
          evidence_items: [
            {
              ...createdObservation.evidence_items[0],
              id: 2,
              uri: "https://api.open-meteo.com/v1/forecast?latitude=-0.9002",
              source_name: "Open-Meteo Weather Forecast API",
            },
          ],
        },
      ],
    });
    render(<App />);

    const technicalLink = await screen.findByRole("link", {
      name: /View technical Open-Meteo response/,
    });
    expect(technicalLink).toHaveAttribute(
      "href",
      "https://api.open-meteo.com/v1/forecast?latitude=-0.9002",
    );
    expect(screen.getByText(/api\.open-meteo\.com · Opens technical data/)).toBeInTheDocument();
  });

  it("shows a localized visible error when observation saving fails", async () => {
    vi.unstubAllGlobals();
    installFetchMock({ failObservationPost: true });
    render(<App />);
    await screen.findByText("Public reference territory");

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Controlled observation for the interface error state." },
    });
    fireEvent.change(screen.getByLabelText("Observation source"), {
      target: { value: "Controlled territorial exercise" },
    });
    fireEvent.change(screen.getByLabelText("Responsible role or team"), {
      target: { value: "Monitoring team" },
    });
    fireEvent.change(screen.getByLabelText("Evidence URL"), {
      target: { value: "https://example.org/controlled-evidence" },
    });
    fireEvent.change(screen.getByLabelText("Evidence source"), {
      target: { value: "Controlled evidence repository" },
    });
    fireEvent.change(screen.getByLabelText("Evidence description"), {
      target: { value: "Non-sensitive controlled reference" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Save observation" }).closest("form")!);

    expect(await screen.findByText(/The observation could not be saved/)).toBeInTheDocument();
  });
});
