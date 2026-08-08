import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { climateSnapshots } from "../../../db/schema";

const OPEN_METEO =
  "https://api.open-meteo.com/v1/forecast?latitude=-0.9002&longitude=-89.6127&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&timezone=auto";

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(OPEN_METEO, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Provider response unavailable");
    const payload = (await response.json()) as {
      current?: Record<string, string | number>;
      current_units?: Record<string, string>;
    };
    if (!payload.current || typeof payload.current.temperature_2m !== "number") {
      throw new Error("Invalid provider response");
    }
    return Response.json(
      {
        source_name: "Open-Meteo Weather Forecast API",
        source_url: OPEN_METEO,
        observed_at: payload.current.time,
        retrieved_at: new Date().toISOString(),
        temperature_c: payload.current.temperature_2m,
        relative_humidity_percent: payload.current.relative_humidity_2m,
        apparent_temperature_c: payload.current.apparent_temperature,
        precipitation_mm: payload.current.precipitation,
        weather_code: payload.current.weather_code,
        is_synthetic: false,
        is_stale: false,
        license: "CC BY 4.0",
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
        },
      },
    );
  } catch (error) {
    console.error(
      "Open-Meteo request failed",
      error instanceof Error ? error.message : "unknown error",
    );
    const [fallback] = await getDb()
      .select()
      .from(climateSnapshots)
      .orderBy(desc(climateSnapshots.observedAt))
      .limit(1);
    if (fallback) {
      return Response.json(
        {
          source_name: fallback.sourceName,
          source_url: fallback.sourceUrl,
          observed_at: fallback.observedAt,
          retrieved_at: new Date().toISOString(),
          stored_retrieved_at: fallback.retrievedAt,
          temperature_c: fallback.temperatureC,
          relative_humidity_percent: fallback.relativeHumidityPercent,
          apparent_temperature_c: fallback.apparentTemperatureC,
          precipitation_mm: fallback.precipitationMm,
          weather_code: fallback.weatherCode,
          is_synthetic: fallback.isSynthetic,
          is_stale: true,
          license: "CC BY 4.0",
        },
        {
          headers: {
            "Cache-Control": "public, max-age=60, stale-while-revalidate=900",
          },
        },
      );
    }
    return Response.json(
      {
        error: "Climate source temporarily unavailable.",
        source_name: "Open-Meteo Weather Forecast API",
        source_url: OPEN_METEO,
        is_stale: true,
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
