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
