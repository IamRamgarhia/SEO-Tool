"use server";

import { revalidatePath } from "next/cache";
import { setSetting, deleteSetting } from "@/lib/settings-store";

export type SaveCapState =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function saveCap(
  _prev: SaveCapState | null,
  formData: FormData,
): Promise<SaveCapState> {
  const raw = String(formData.get("cap") ?? "").trim();
  if (raw === "") {
    await deleteSetting("ai.monthly_cap_usd");
    revalidatePath("/settings/ai-usage");
    return { ok: true, message: "Cap removed." };
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: "Cap must be a non-negative number." };
  }
  await setSetting("ai.monthly_cap_usd", n);
  revalidatePath("/settings/ai-usage");
  return { ok: true, message: `Cap set to $${n.toFixed(2)}/mo.` };
}
