import { getDb } from "../../../db";
import { observations } from "../../../db/schema";

export async function GET() {
  try {
    const rows = await getDb().select({ id: observations.id }).from(observations);
    return Response.json({
      status: "ok",
      app: "InfinityAtlas Climate & Health MRV Toolkit",
      environment: "public-controlled-demo",
      database: "d1",
      controlled_records: rows.length,
      checked_at: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      { status: "degraded", database: "unavailable" },
      { status: 503 },
    );
  }
}
