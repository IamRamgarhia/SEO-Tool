"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, isNotNull, lte, or } from "drizzle-orm";
import { db } from "@/db/client";
import { contentBriefs, type ContentBrief } from "@/db/schema";

export async function setScheduledDate(id: number, formData: FormData) {
  const raw = String(formData.get("scheduledFor") ?? "").trim();
  const date = raw ? new Date(raw) : null;
  await db
    .update(contentBriefs)
    .set({ scheduledFor: date, updatedAt: new Date() })
    .where(eq(contentBriefs.id, id));
  revalidatePath("/content/calendar");
}

export async function clearScheduledDate(id: number) {
  await db
    .update(contentBriefs)
    .set({ scheduledFor: null, updatedAt: new Date() })
    .where(eq(contentBriefs.id, id));
  revalidatePath("/content/calendar");
}

/**
 * Fetch all briefs that should appear on a calendar grid for [from, to].
 * A brief appears on a date based on (in priority order):
 *   1. scheduledFor (if set)
 *   2. updatedAt (when last touched)
 * Published briefs use scheduledFor || publishedUrl-set-date proxy.
 */
export async function fetchCalendarBriefs(opts: {
  clientId?: number | null;
  from: Date;
  to: Date;
}): Promise<ContentBrief[]> {
  const conditions = [];
  if (typeof opts.clientId === "number") {
    conditions.push(eq(contentBriefs.clientId, opts.clientId));
  }
  // Either has a scheduled date in window OR was updated in window
  conditions.push(
    or(
      and(
        isNotNull(contentBriefs.scheduledFor),
        gte(contentBriefs.scheduledFor, opts.from),
        lte(contentBriefs.scheduledFor, opts.to),
      ),
      and(
        gte(contentBriefs.updatedAt, opts.from),
        lte(contentBriefs.updatedAt, opts.to),
      ),
    ),
  );
  return db
    .select()
    .from(contentBriefs)
    .where(and(...conditions));
}
