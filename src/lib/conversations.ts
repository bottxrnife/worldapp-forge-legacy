/**
 * Device-persisted Create conversations (localStorage). Each conversation keeps
 * the UI messages, the Anthropic multi-turn history, and the current Spark draft
 * so the user can return to a chat and keep editing the app they made.
 */
import type { ApiMessage } from "./agent";
import type { DappManifest } from "./types";

export type UiMsg = { role: "user" | "assistant"; text: string };

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UiMsg[];
  apiHistory: ApiMessage[];
  draft: DappManifest | null;
};

const KEY = "forge.conversations";

function readAll(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}
function writeAll(list: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    /* ignore quota */
  }
}

export function listConversations(): Conversation[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getConversation(id: string): Conversation | undefined {
  return readAll().find((c) => c.id === id);
}

export function createConversation(): Conversation {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  const now = Date.now();
  const convo: Conversation = { id, title: "New chat", createdAt: now, updatedAt: now, messages: [], apiHistory: [], draft: null };
  writeAll([convo, ...readAll()]);
  return convo;
}

/** Upsert a conversation (bumps updatedAt). */
export function saveConversation(c: Conversation): void {
  const list = readAll().filter((x) => x.id !== c.id);
  writeAll([{ ...c, updatedAt: Date.now() }, ...list]);
}

export function deleteConversation(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}
