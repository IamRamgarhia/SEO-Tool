/**
 * Annotations: manual markers on time-series charts (rank, traffic, CWV).
 *
 * Three lookup helpers — fetch annotations relevant for:
 *   - a client's general charts (scope = client OR global)
 *   - a specific keyword's rank chart (scope = keyword, client, global)
 *   - a specific page's traffic chart (scope = page, client, global)
 *
 * Plus the usual CRUD: create, delete, list-all (for an admin page).
 */

import { and, asc, desc, eq, gte, lte, or } from "drizzle-orm";
import { db } from "@/db/client";
import {
  annotations,
  type Annotation,
  type NewAnnotation,
} from "@/db/schema";

export type { AnnotationKind } from "./annotations-constants";
export { KIND_COLOR, KIND_LABEL } from "./annotations-constants";

export async function createAnnotation(input: NewAnnotation): Promise<number> {
  const [row] = await db
    .insert(annotations)
    .values(input)
    .returning({ id: annotations.id });
  return row.id;
}

export async function deleteAnnotation(id: number): Promise<void> {
  await db.delete(annotations).where(eq(annotations.id, id));
}

export async function listAllAnnotations(opts: {
  clientId?: number | null;
  limit?: number;
}): Promise<Annotation[]> {
  const conditions = [];
  if (typeof opts.clientId === "number") {
    conditions.push(
      or(eq(annotations.clientId, opts.clientId), eq(annotations.scope, "global")),
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db
    .select()
    .from(annotations)
    .where(where)
    .orderBy(desc(annotations.eventDate))
    .limit(opts.limit ?? 200);
}

/** Annotations relevant for charts on a client's dashboard. */
export async function annotationsForClient(
  clientId: number,
  range?: { from: Date; to: Date },
): Promise<Annotation[]> {
  const conditions = [
    or(eq(annotations.clientId, clientId), eq(annotations.scope, "global")),
  ];
  if (range) {
    conditions.push(gte(annotations.eventDate, range.from));
    conditions.push(lte(annotations.eventDate, range.to));
  }
  return db
    .select()
    .from(annotations)
    .where(and(...conditions))
    .orderBy(asc(annotations.eventDate));
}

/** Annotations relevant for a specific keyword's rank chart. */
export async function annotationsForKeyword(
  keywordId: number,
  clientId: number,
  range?: { from: Date; to: Date },
): Promise<Annotation[]> {
  const conditions = [
    or(
      eq(annotations.keywordId, keywordId),
      eq(annotations.clientId, clientId),
      eq(annotations.scope, "global"),
    ),
  ];
  if (range) {
    conditions.push(gte(annotations.eventDate, range.from));
    conditions.push(lte(annotations.eventDate, range.to));
  }
  return db
    .select()
    .from(annotations)
    .where(and(...conditions))
    .orderBy(asc(annotations.eventDate));
}

/** Annotations relevant for a specific page's traffic chart. */
export async function annotationsForPage(
  pageUrl: string,
  clientId: number,
  range?: { from: Date; to: Date },
): Promise<Annotation[]> {
  const conditions = [
    or(
      eq(annotations.pageUrl, pageUrl),
      eq(annotations.clientId, clientId),
      eq(annotations.scope, "global"),
    ),
  ];
  if (range) {
    conditions.push(gte(annotations.eventDate, range.from));
    conditions.push(lte(annotations.eventDate, range.to));
  }
  return db
    .select()
    .from(annotations)
    .where(and(...conditions))
    .orderBy(asc(annotations.eventDate));
}

