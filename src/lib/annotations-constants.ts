/**
 * Client-safe constants for annotations. No DB / no server imports.
 */

export type AnnotationKind = "algo" | "content" | "technical" | "outreach" | "custom";

export const KIND_COLOR: Record<AnnotationKind, string> = {
  algo: "rose",
  content: "violet",
  technical: "cyan",
  outreach: "amber",
  custom: "emerald",
};

export const KIND_LABEL: Record<AnnotationKind, string> = {
  algo: "Algorithm update",
  content: "Content event",
  technical: "Technical change",
  outreach: "Outreach milestone",
  custom: "Custom",
};
