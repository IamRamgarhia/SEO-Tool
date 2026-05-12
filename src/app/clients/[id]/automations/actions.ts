"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { dailySchedules, type NewDailySchedule } from "@/db/schema";

export type CreateScheduleState =
  | { ok: true; id: number }
  | { ok: false; error: string }
  | null;

export async function createSchedule(
  _prev: CreateScheduleState,
  formData: FormData,
): Promise<CreateScheduleState> {
  const clientId = Number(formData.get("clientId"));
  const kind = String(formData.get("kind") ?? "");
  const cadenceDays = Math.max(1, Math.min(90, Number(formData.get("cadenceDays") ?? 1)));
  const timeUtc = Math.max(0, Math.min(2359, Number(formData.get("timeUtc") ?? 900)));
  const autoPublishRaw = formData.get("autoPublish") === "on";
  const topicSeed = String(formData.get("topicSeed") ?? "").slice(0, 200);
  const tone = String(formData.get("tone") ?? "").slice(0, 200);
  const gbpLocationName = String(formData.get("gbpLocationName") ?? "").slice(0, 200);
  const postType = String(formData.get("postType") ?? "STANDARD");
  // Where the approved item ultimately goes:
  //   "local"     — save in the tool's queue; copy/paste yourself (no integration needed)
  //   "wordpress" — publish via WP bridge plugin
  //   "gbp"       — publish via Google Business Profile API
  const destinationRaw = String(formData.get("destination") ?? "local");
  const destination =
    destinationRaw === "wordpress" || destinationRaw === "gbp"
      ? destinationRaw
      : "local";
  // Local mode is never auto-publish (there's nothing to publish to);
  // suppress the flag if the user toggled it on by mistake.
  const autoPublish = destination === "local" ? false : autoPublishRaw;

  if (!Number.isFinite(clientId) || clientId <= 0) {
    return { ok: false, error: "Bad client." };
  }
  if (
    !["blog_draft", "gbp_post", "social_post", "internal_checklist"].includes(
      kind,
    )
  ) {
    return { ok: false, error: "Pick a kind." };
  }

  const config: Record<string, unknown> = { destination };
  if (topicSeed) config.topic_seed = topicSeed;
  if (tone) config.tone = tone;
  if (kind === "gbp_post") {
    if (gbpLocationName) config.gbp_location_name = gbpLocationName;
    config.post_type = postType;
  }

  const insert: NewDailySchedule = {
    clientId,
    kind: kind as NewDailySchedule["kind"],
    cadenceDays,
    timeUtc,
    autoPublish,
    enabled: true,
    configJson: config,
    // Run on the next tick so the user can see it work today
    nextRunAt: new Date(),
  };
  const [row] = await db
    .insert(dailySchedules)
    .values(insert)
    .returning({ id: dailySchedules.id });
  revalidatePath(`/clients/${clientId}/automations`);
  return { ok: true, id: row.id };
}

export async function toggleScheduleEnabled(
  scheduleId: number,
  clientId: number,
): Promise<void> {
  const [s] = await db
    .select()
    .from(dailySchedules)
    .where(
      and(
        eq(dailySchedules.id, scheduleId),
        eq(dailySchedules.clientId, clientId),
      ),
    )
    .limit(1);
  if (!s) return;
  await db
    .update(dailySchedules)
    .set({ enabled: !s.enabled, updatedAt: new Date() })
    .where(eq(dailySchedules.id, scheduleId));
  revalidatePath(`/clients/${clientId}/automations`);
}

export async function deleteSchedule(
  scheduleId: number,
  clientId: number,
): Promise<void> {
  await db
    .delete(dailySchedules)
    .where(
      and(
        eq(dailySchedules.id, scheduleId),
        eq(dailySchedules.clientId, clientId),
      ),
    );
  revalidatePath(`/clients/${clientId}/automations`);
}

/**
 * Generate immediately, bypassing the schedule. Useful when the user
 * wants to test a schedule's prompt before letting it run daily.
 */
export async function runScheduleNow(
  scheduleId: number,
  clientId: number,
): Promise<{ ok: boolean; message: string }> {
  const [s] = await db
    .select()
    .from(dailySchedules)
    .where(
      and(
        eq(dailySchedules.id, scheduleId),
        eq(dailySchedules.clientId, clientId),
      ),
    )
    .limit(1);
  if (!s) return { ok: false, message: "Schedule not found." };

  // Forcing nextRunAt to now and ticking — keeps a single code path.
  await db
    .update(dailySchedules)
    .set({ nextRunAt: new Date(), updatedAt: new Date() })
    .where(eq(dailySchedules.id, s.id));
  const { tickScheduleGeneration } = await import("@/lib/daily-automations");
  const r = await tickScheduleGeneration();
  revalidatePath(`/clients/${clientId}/automations`);
  revalidatePath(`/clients/${clientId}/queue`);
  return {
    ok: r.generated > 0,
    message:
      r.generated > 0
        ? `Generated ${r.generated} item${r.generated === 1 ? "" : "s"}. Check the review queue.`
        : "Nothing was generated. Check the activity log for the reason.",
  };
}
