import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import {
  authenticateRequest,
  jsonError,
  jsonOk,
  requireScope,
} from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const key = await authenticateRequest(req);
  if (!key) return jsonError(401, "Unauthorized — Bearer token required.");
  if (!requireScope(key, "read"))
    return jsonError(403, "Read scope required.");

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      url: clients.url,
      niche: clients.niche,
      city: clients.city,
      country: clients.country,
      techStack: clients.techStack,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .orderBy(desc(clients.createdAt))
    .limit(limit);

  return jsonOk({ clients: rows, count: rows.length });
}
