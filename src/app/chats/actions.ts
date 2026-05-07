"use server";

import { revalidatePath } from "next/cache";
import {
  clearUnpinnedConversations,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  toggleConversationPin,
  type ChatKind,
} from "@/lib/chat-store";
import type { ChatConversation, ChatMessage } from "@/db/schema";

export async function fetchChats(opts: {
  kind?: ChatKind;
  clientId?: number | null;
  limit?: number;
}): Promise<ChatConversation[]> {
  return listConversations(opts);
}

export async function fetchChat(
  id: number,
): Promise<{ conversation: ChatConversation; messages: ChatMessage[] } | null> {
  return getConversation(id);
}

export async function deleteChat(id: number) {
  await deleteConversation(id);
  revalidatePath("/chats");
  revalidatePath("/seo-chat");
  revalidatePath("/ask");
}

export async function pinChat(id: number) {
  await toggleConversationPin(id);
  revalidatePath("/chats");
}

export async function renameChat(id: number, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await renameConversation(id, title);
  revalidatePath("/chats");
}

export async function clearChats(kind?: ChatKind) {
  const n = await clearUnpinnedConversations({ kind });
  revalidatePath("/chats");
  return n;
}
