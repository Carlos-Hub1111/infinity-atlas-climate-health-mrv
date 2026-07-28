import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const observations = sqliteTable("demo_observations", {
  id: integer("id").primaryKey(),
  recordTitle: text("record_title").notNull(),
  category: text("category").notNull(),
  reviewStatus: text("review_status").notNull(),
  dataProvenance: text("data_provenance").notNull(),
  hazard: integer("hazard").notNull(),
  exposure: integer("exposure").notNull(),
  vulnerability: integer("vulnerability").notNull(),
  riskScore: integer("risk_score").notNull(),
  riskLevel: text("risk_level").notNull(),
  observedAt: text("observed_at").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  publicLocationMode: text("public_location_mode").notNull(),
});

export const climateSnapshots = sqliteTable("climate_snapshots", {
  id: integer("id").primaryKey(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  observedAt: text("observed_at").notNull(),
  retrievedAt: text("retrieved_at").notNull(),
  temperatureC: real("temperature_c").notNull(),
  relativeHumidityPercent: real("relative_humidity_percent").notNull(),
  apparentTemperatureC: real("apparent_temperature_c").notNull(),
  precipitationMm: real("precipitation_mm").notNull(),
  weatherCode: integer("weather_code").notNull(),
  isSynthetic: integer("is_synthetic", { mode: "boolean" }).notNull(),
});
