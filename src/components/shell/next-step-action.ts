"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Persist the user's choice to hide a NextStep suggestion. The cookie
 * lasts a year — long enough that an occasional setup hint isn't a
 * persistent nag, short enough that it'll re-appear if the workspace
 * is migrated/restored from backup and the priorities shift.
 */
export async function dismissNextStep(stepId: string): Promise<void> {
  const safe = stepId.replace(/[^a-z0-9-_]/gi, "").slice(0, 64);
  if (!safe) return;
  const store = await cookies();
  store.set(`next-step-dismissed-${safe}`, "1", {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
}
