import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App, galapagosInputValue } from "./App";

const project = {
  id: 1,
  name: "Infinity Atlas Climate & Health MRV Pilot",
  description: "Sprint 1A pilot",
  status: "active",
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

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installFetchMock(options?: { failObservationPost?: boolean }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return response({ status: "ok", app: "Infinity Atlas", environment: "test", database: "sqlite" });
      }
      if (url.endsWith("/api/v1/projects")) return response([project]);
      if (url.endsWith("/api/v1/territories")) return response([territory]);
      if (url.includes("/api/v1/climate/current")) return response(climate);
      if (url.endsWith("/api/v1/observations") && init?.method === "POST") {
        return options?.failObservationPost ? response({ detail: "Invalid" }, 422) : response({}, 201);
      }
      if (url.endsWith("/api/v1/observations")) return response([]);
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

    expect(await screen.findByRole("heading", { name: "New territorial observation" })).toBeInTheDocument();
    expect(await screen.findByText("26.6 °C")).toBeInTheDocument();
    expect(screen.getAllByText("Public real data").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Weather data by Open-Meteo.com/ })).toHaveAttribute(
      "href",
      "https://open-meteo.com/",
    );
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Evidence URL")).toBeInTheDocument();
  });

  it("makes the Spanish translations selectable", async () => {
    render(<App />);
    await screen.findByText("Public reference territory");

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es" } });

    expect(screen.getByRole("heading", { name: "Nueva observación territorial" })).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
    expect(screen.getAllByText("Dato público real").length).toBeGreaterThan(0);
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
