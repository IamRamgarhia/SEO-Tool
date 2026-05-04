"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, localGridChecks } from "@/db/schema";
import { runLocalGrid, type GridResult } from "@/lib/local-grid";

const inputSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  query: z.string().trim().min(2).max(200),
  centerLat: z.coerce.number().min(-90).max(90),
  centerLng: z.coerce.number().min(-180).max(180),
  size: z.coerce.number().int().min(3).max(7).default(5),
  spacingM: z.coerce.number().int().min(500).max(10_000).default(1500),
});

export type GridState =
  | { ok: true; result: GridResult }
  | { ok: false; error: string };

export async function runGrid(
  _prev: GridState | null,
  formData: FormData,
): Promise<GridState> {
  const parsed = inputSchema.safeParse({
    clientId: formData.get("clientId"),
    query: formData.get("query"),
    centerLat: formData.get("centerLat"),
    centerLng: formData.get("centerLng"),
    size: formData.get("size") || undefined,
    spacingM: formData.get("spacingM") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [c] = await db
    .select({ url: clients.url, country: clients.country, language: clients.language })
    .from(clients)
    .where(eq(clients.id, parsed.data.clientId))
    .limit(1);
  if (!c) return { ok: false, error: "Client not found" };

  let result: GridResult;
  try {
    result = await runLocalGrid({
      query: parsed.data.query,
      domain: c.url,
      centerLat: parsed.data.centerLat,
      centerLng: parsed.data.centerLng,
      size: parsed.data.size,
      spacingM: parsed.data.spacingM,
      country: c.country ?? "US",
      language: c.language ?? "en",
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Grid run failed" };
  }

  await db.insert(localGridChecks).values({
    clientId: parsed.data.clientId,
    query: parsed.data.query,
    centerLat: Math.round(parsed.data.centerLat * 1_000_000),
    centerLng: Math.round(parsed.data.centerLng * 1_000_000),
    gridSize: parsed.data.size,
    spacingM: parsed.data.spacingM,
    cells: result.cells,
    avgPosition: result.avgPosition,
    inPackPct: result.inPackPct,
  });

  revalidatePath(`/local-grid/c/${parsed.data.clientId}`);
  return { ok: true, result };
}

export async function getRecentGrids(clientId: number) {
  return db
    .select()
    .from(localGridChecks)
    .where(eq(localGridChecks.clientId, clientId))
    .orderBy(desc(localGridChecks.ranAt))
    .limit(20);
}

const scheduleSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  query: z.string().trim().min(2).max(200),
  centerLat: z.coerce.number().min(-90).max(90),
  centerLng: z.coerce.number().min(-180).max(180),
  size: z.coerce.number().int().min(3).max(7).default(5),
  spacingM: z.coerce.number().int().min(500).max(10_000).default(1500),
  cadence: z.enum(["weekly", "monthly"]).default("weekly"),
});

export type CreateScheduleResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

export async function createGridSchedule(
  _prev: CreateScheduleResult | null,
  formData: FormData,
): Promise<CreateScheduleResult> {
  const { localGridSchedules } = await import("@/db/schema");
  const parsed = scheduleSchema.safeParse({
    clientId: formData.get("clientId"),
    query: formData.get("query"),
    centerLat: formData.get("centerLat"),
    centerLng: formData.get("centerLng"),
    size: formData.get("size") || undefined,
    spacingM: formData.get("spacingM") || undefined,
    cadence: formData.get("cadence") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const [row] = await db
    .insert(localGridSchedules)
    .values({
      clientId: parsed.data.clientId,
      query: parsed.data.query,
      centerLat: Math.round(parsed.data.centerLat * 1_000_000),
      centerLng: Math.round(parsed.data.centerLng * 1_000_000),
      gridSize: parsed.data.size,
      spacingM: parsed.data.spacingM,
      cadence: parsed.data.cadence,
    })
    .returning({ id: localGridSchedules.id });

  revalidatePath(`/local-grid/c/${parsed.data.clientId}`);
  return { ok: true, id: row.id };
}

export async function toggleGridSchedule(id: number): Promise<void> {
  const { localGridSchedules } = await import("@/db/schema");
  const [s] = await db
    .select({
      enabled: localGridSchedules.enabled,
      clientId: localGridSchedules.clientId,
    })
    .from(localGridSchedules)
    .where(eq(localGridSchedules.id, id))
    .limit(1);
  if (!s) return;
  await db
    .update(localGridSchedules)
    .set({ enabled: !s.enabled, updatedAt: new Date() })
    .where(eq(localGridSchedules.id, id));
  revalidatePath(`/local-grid/c/${s.clientId}`);
}

export async function deleteGridSchedule(id: number): Promise<void> {
  const { localGridSchedules } = await import("@/db/schema");
  const [s] = await db
    .select({ clientId: localGridSchedules.clientId })
    .from(localGridSchedules)
    .where(eq(localGridSchedules.id, id))
    .limit(1);
  if (!s) return;
  await db.delete(localGridSchedules).where(eq(localGridSchedules.id, id));
  revalidatePath(`/local-grid/c/${s.clientId}`);
}

export async function listGridSchedules(clientId: number) {
  const { localGridSchedules } = await import("@/db/schema");
  return db
    .select()
    .from(localGridSchedules)
    .where(eq(localGridSchedules.clientId, clientId))
    .orderBy(desc(localGridSchedules.createdAt));
}
