"use server";

import { revalidatePath } from "next/cache";
import {
  createAnnotation,
  deleteAnnotation,
  listAllAnnotations,
  type AnnotationKind,
} from "@/lib/annotations-store";
import type { Annotation } from "@/db/schema";

export type CreateState =
  | { ok: true; id: number }
  | { ok: false; error: string }
  | null;

export async function addAnnotation(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventDateRaw = String(formData.get("eventDate") ?? "").trim();
  const kind = String(formData.get("kind") ?? "custom") as AnnotationKind;
  const scopeRaw = String(formData.get("scope") ?? "global");
  const clientIdRaw = String(formData.get("clientId") ?? "").trim();
  const keywordIdRaw = String(formData.get("keywordId") ?? "").trim();
  const pageUrl = String(formData.get("pageUrl") ?? "").trim();

  if (!label) return { ok: false, error: "Label is required." };
  const eventDate = eventDateRaw ? new Date(eventDateRaw) : null;
  if (!eventDate || Number.isNaN(eventDate.getTime()))
    return { ok: false, error: "Event date is required." };

  const scope = (
    ["global", "client", "keyword", "page"].includes(scopeRaw)
      ? scopeRaw
      : "global"
  ) as "global" | "client" | "keyword" | "page";

  if (scope === "client" && !clientIdRaw)
    return { ok: false, error: "Client scope needs a client." };
  if (scope === "keyword" && !keywordIdRaw)
    return { ok: false, error: "Keyword scope needs a keyword id." };
  if (scope === "page" && !pageUrl)
    return { ok: false, error: "Page scope needs a URL." };

  try {
    const id = await createAnnotation({
      scope,
      eventDate,
      label: label.slice(0, 200),
      description: description.slice(0, 1000) || null,
      kind,
      source: "manual",
      clientId: clientIdRaw ? Number(clientIdRaw) : null,
      keywordId: keywordIdRaw ? Number(keywordIdRaw) : null,
      pageUrl: pageUrl || null,
    });
    revalidatePath("/annotations");
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save annotation.",
    };
  }
}

export async function removeAnnotation(id: number) {
  await deleteAnnotation(id);
  revalidatePath("/annotations");
}

export async function fetchAnnotations(
  clientId?: number | null,
): Promise<Annotation[]> {
  return listAllAnnotations({ clientId, limit: 300 });
}
