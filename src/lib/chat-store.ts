/**
 * Chat conversation persistence helpers.
 *
 * Used by SEO chat, Ask the Tool, and the client portal chat. Keeps every
 * exchange so the user can revisit, branch, pin, or delete past
 * conversations.
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  chatConversations,
  chatMessages,
  type ChatConversation,
  type ChatMessage,
  type NewChatConversation,
  type NewChatMessage,
} from "@/db/schema";

export type ChatKind = "seo_chat" | "ask_tool" | "portal_chat";

export type SaveTurnInput = {
  conversationId?: number | null;
  kind: ChatKind;
  clientId?: number | null;
  /** First user message — only used when creating a new conversation. */
  firstUserMessage?: string;
  /** Settings snapshot to attach when creating. */
  settings?: Record<string, unknown>;
  /** The exchange to append. */
  userMessage: string;
  userImageDataUrl?: string | null;
  assistantReply: string;
};

/**
 * Single helper used after each successful chat turn:
 *   - if conversationId is null → creates a new conversation
 *   - appends the (user, assistant) pair as two messages
 *   - touches updatedAt on the conversation
 *
 * Returns the conversation id so the client can store it for the next turn.
 */
export async function saveChatTurn(
  input: SaveTurnInput,
): Promise<number> {
  let conversationId = input.conversationId ?? null;
  if (!conversationId) {
    const title =
      (input.firstUserMessage ?? input.userMessage)
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80) || "Untitled chat";
    const insert: NewChatConversation = {
      kind: input.kind,
      clientId: input.clientId ?? null,
      title,
      settings: input.settings ?? null,
    };
    const [row] = await db
      .insert(chatConversations)
      .values(insert)
      .returning({ id: chatConversations.id });
    conversationId = row.id;
  } else {
    await db
      .update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, conversationId));
  }

  const userMsg: NewChatMessage = {
    conversationId,
    role: "user",
    content: input.userMessage,
    imageDataUrl: input.userImageDataUrl ?? null,
  };
  const aiMsg: NewChatMessage = {
    conversationId,
    role: "assistant",
    content: input.assistantReply,
  };
  await db.insert(chatMessages).values([userMsg, aiMsg]);
  return conversationId;
}

export async function listConversations(opts: {
  kind?: ChatKind;
  clientId?: number | null;
  limit?: number;
}): Promise<ChatConversation[]> {
  const conditions = [];
  if (opts.kind) conditions.push(eq(chatConversations.kind, opts.kind));
  if (typeof opts.clientId === "number")
    conditions.push(eq(chatConversations.clientId, opts.clientId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = Math.max(1, Math.min(200, opts.limit ?? 30));
  return db
    .select()
    .from(chatConversations)
    .where(where)
    .orderBy(desc(chatConversations.pinned), desc(chatConversations.updatedAt))
    .limit(limit);
}

export async function getConversation(
  id: number,
): Promise<{ conversation: ChatConversation; messages: ChatMessage[] } | null> {
  const [conv] = await db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.id, id))
    .limit(1);
  if (!conv) return null;
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, id))
    .orderBy(chatMessages.createdAt);
  return { conversation: conv, messages };
}

export async function deleteConversation(id: number): Promise<void> {
  await db.delete(chatConversations).where(eq(chatConversations.id, id));
}

export async function toggleConversationPin(id: number): Promise<void> {
  const [c] = await db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.id, id))
    .limit(1);
  if (!c) return;
  await db
    .update(chatConversations)
    .set({ pinned: !c.pinned })
    .where(eq(chatConversations.id, id));
}

export async function renameConversation(
  id: number,
  title: string,
): Promise<void> {
  await db
    .update(chatConversations)
    .set({ title: title.slice(0, 200) })
    .where(eq(chatConversations.id, id));
}

export async function clearUnpinnedConversations(opts: {
  kind?: ChatKind;
}): Promise<number> {
  const conditions = [eq(chatConversations.pinned, false)];
  if (opts.kind) conditions.push(eq(chatConversations.kind, opts.kind));
  const result = await db
    .delete(chatConversations)
    .where(and(...conditions))
    .returning({ id: chatConversations.id });
  return result.length;
}
