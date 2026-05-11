"use server";

import { buildCluster, type ClusterPlan } from "@/lib/cluster-builder";
import { saveToolRun } from "@/lib/tool-runs";

export type ClusterState =
  | { ok: true; plan: ClusterPlan }
  | { ok: false; error: string };

export async function runCluster(
  _prev: ClusterState | null,
  formData: FormData,
): Promise<ClusterState> {
  const topic = String(formData.get("topic") ?? "").trim();
  const country = String(formData.get("country") ?? "US").trim() || "US";
  if (!topic) return { ok: false, error: "Head topic required." };
  const plan = await buildCluster({ topic, country });
  if (!plan.ok && plan.error) return { ok: false, error: plan.error };
  await saveToolRun({
    toolId: "cluster",
    label: `${topic} (${country})`,
    input: { topic, country },
    result: { ok: true, plan },
  }).catch(() => undefined);
  return { ok: true, plan };
}
