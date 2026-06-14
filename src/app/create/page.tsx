"use client";

import { FloatingNav, NAV_CLEARANCE } from "@/components/FloatingNav";
import { Icon } from "@/components/Icon";
import { ImageUploadSlot } from "@/components/ImageUploadSlot";
import { ManifestRunner } from "@/components/ManifestRunner";
import { SparkArt } from "@/components/SparkArt";
import { Card, Pill } from "@/components/ui";
import { createConversation, deleteConversation, listConversations, saveConversation, type Conversation } from "@/lib/conversations";
import { useBackHandler } from "@/lib/backStack";
import type { DappManifest, ManifestComponent } from "@/lib/types";
import { MiniKit } from "@worldcoin/minikit-js";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

const CHIPS = [
  "A $5 team dues collector that pays treasury.eth",
  "A coffee punch card — 10 stamps for a free coffee",
  "A one-vote-per-human poll for my DAO",
  "An RSVP where each human can claim one ticket",
];

/** Quick-action tweaks shown under a draft — each sends a canned revise prompt to the agent. */
const VARIATIONS: Array<{ label: string; prompt: string }> = [
  { label: "Make it cheaper", prompt: "Make it cheaper — lower the price." },
  { label: "Pay-what-you-want", prompt: "Make the amount pay-what-you-want — an editable, unlocked amount the runner chooses." },
  { label: "Add loyalty stamps", prompt: "Add a loyalty punch card with stamps and points per dollar." },
  { label: "Require World ID", prompt: "Require World ID — one action per human." },
  { label: "Turn it into a menu", prompt: "Turn it into a menu with a few orderable items and prices." },
  { label: "Add a memo field", prompt: "Add a memo field so people can leave a short note." },
  { label: "Rename it", prompt: "Give it a fresh, catchier name (and matching ENS label)." },
  { label: "Make it free", prompt: "Make it free — remove the payment so it just claims." },
  { label: "Give me 3 variations", prompt: "Give me 3 different variations of this Spark to choose from." },
];

/** A one-line summary of what a variation contains, derived from its components. */
function variationSummary(v: DappManifest): string {
  const find = <T extends ManifestComponent["type"]>(t: T) =>
    v.components.find((c) => c.type === t) as Extract<ManifestComponent, { type: T }> | undefined;
  const parts: string[] = [];
  if (find("menu")) parts.push("Menu ordering");
  if (find("punchCard")) parts.push("Loyalty punch card");
  const amt = find("amountInput");
  if (amt) parts.push(amt.locked === false ? "Pay-what-you-want" : `$${amt.default} ${amt.token}`);
  if (find("memoInput")) parts.push("Memo note");
  if (parts.length === 0) parts.push("One-tap action");
  const recipient = find("recipient");
  if (recipient) parts.push(`pays ${recipient.value}`);
  return parts.join(" · ");
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
function lastPreview(c: Conversation): string {
  const last = c.messages[c.messages.length - 1];
  if (!last) return "No messages yet";
  return (last.role === "user" ? "You: " : "") + last.text;
}

export default function CreatePage() {
  return (
    <Suspense fallback={<main className="px-5 pt-10 text-sm text-muted">Loading…</main>}>
      <CreatePageInner />
    </Suspense>
  );
}

function CreatePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "chat">("list");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const list = listConversations();
    if (list.length === 0) {
      const c = createConversation();
      setConvos([c]);
      setActiveId(c.id);
      setView("chat");
    } else {
      setConvos(list);
      setView("list");
    }
    setLoaded(true);
  }, []);

  /** Open agent chat with a draft pulled from sessionStorage (Edit flow from a published Spark). */
  useEffect(() => {
    if (!loaded || searchParams.get("edit") !== "1") return;
    const raw = sessionStorage.getItem("forge.draft");
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as DappManifest;
      const c = createConversation();
      c.draft = draft;
      c.title = `Edit · ${draft.name}`;
      saveConversation(c);
      sessionStorage.removeItem("forge.draft");
      setConvos(listConversations());
      setActiveId(c.id);
      setView("chat");
      router.replace("/create");
    } catch {
      /* ignore */
    }
  }, [loaded, searchParams, router]);

  const active = convos.find((c) => c.id === activeId) ?? null;

  function persist(updated: Conversation) {
    saveConversation(updated);
    setConvos((prev) => [updated, ...prev.filter((c) => c.id !== updated.id)].sort((a, b) => b.updatedAt - a.updatedAt));
  }
  function selectVariation(v: DappManifest) {
    if (!active) return;
    persist({ ...active, draft: v, drafts: null });
    setPreview(false);
  }
  function openChat(id: string) {
    setActiveId(id);
    setView("chat");
    setPreview(false);
    setInput("");
  }
  function newChat() {
    const c = createConversation();
    setConvos((p) => [c, ...p]);
    setActiveId(c.id);
    setView("chat");
    setPreview(false);
    setInput("");
  }
  function backToList() {
    setConvos(listConversations());
    setView("list");
  }
  function removeChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    deleteConversation(id);
    setConvos(listConversations());
  }

  function updateDraft(next: DappManifest) {
    if (!active) return;
    persist({ ...active, draft: next });
  }

  useBackHandler(
    useCallback(() => {
      if (preview) {
        setPreview(false);
        return true;
      }
      if (view === "chat" && convos.length > 0) {
        backToList();
        return true;
      }
      return false;
    }, [preview, view, convos.length]),
    preview || (view === "chat" && convos.length > 0),
  );

  const send = async (text: string) => {
    const prompt = text.trim();
    const conv = active;
    if (!prompt || busy || !conv) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    const title = conv.messages.length === 0 ? prompt.slice(0, 48) : conv.title;
    const afterUser: Conversation = { ...conv, title, messages: [...conv.messages, { role: "user", text: prompt }], updatedAt: Date.now() };
    persist(afterUser);
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history: conv.apiHistory, message: prompt, creator: MiniKit.user?.username ?? "a human", draft: conv.draft }),
      });
      const turn = await res.json();
      const msgs = [...afterUser.messages];
      if (turn.error) msgs.push({ role: "assistant" as const, text: `Something went wrong: ${turn.error}` });
      else if (turn.text) msgs.push({ role: "assistant" as const, text: turn.text });
      const newDrafts = turn.drafts ?? null;
      const newDraft = turn.draft ?? (newDrafts ? null : afterUser.draft);
      persist({
        ...afterUser,
        messages: msgs,
        apiHistory: turn.history ?? afterUser.apiHistory,
        draft: newDraft,
        drafts: newDrafts,
        updatedAt: Date.now(),
      });
      if (turn.draft) setPreview(false);
      if (newDrafts) setPreview(false);
    } catch (e) {
      persist({ ...afterUser, messages: [...afterUser.messages, { role: "assistant", text: `Network error: ${String(e)}` }], updatedAt: Date.now() });
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  if (!loaded) return <main className="px-5 pt-10 text-sm text-muted">Loading…</main>;

  // ── CHATS LIST ─────────────────────────────────────────────
  if (view === "list") {
    return (
      <>
        <main className="mx-auto w-full max-w-md px-5 pb-28 pt-6">
          <div className="flex items-center justify-between">
            <h1 className="display text-[30px] font-extrabold">Chats</h1>
            <button onClick={newChat} className="inline-flex items-center gap-1 rounded-full bg-cta px-4 py-2 text-sm font-bold text-cta-text">
              <Icon name="plus" size={14} />
              New
            </button>
          </div>
          <p className="mt-1.5 text-[15px] text-muted">Resume a Spark you were building, or start fresh.</p>

          <div className="mt-4 flex flex-col gap-2.5">
            {convos.map((c) => (
              <button key={c.id} onClick={() => openChat(c.id)} className="flex items-center gap-3.5 rounded-2xl bg-wash p-3.5 text-left">
                {c.draft ? (
                  <SparkArt ens={c.draft.ensName} category={c.draft.category} size={44} />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-blue-soft">
                    <Icon name="chat" size={20} className="text-brand-strong" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{c.title}</p>
                  <p className="truncate text-[13px] text-muted">{lastPreview(c)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-[11px] text-faint">{timeAgo(c.updatedAt)}</span>
                  <span onClick={(e) => removeChat(c.id, e)} className="text-[11px] font-semibold text-faint">
                    Delete
                  </span>
                </div>
              </button>
            ))}
            {convos.length === 0 && (
              <div className="rounded-2xl bg-wash p-6 text-center">
                <p className="text-sm text-muted">No chats yet.</p>
                <button onClick={newChat} className="mt-3 inline-flex rounded-full bg-cta px-5 py-2.5 text-sm font-bold text-cta-text">
                  Start a chat →
                </button>
              </div>
            )}
          </div>
        </main>
        <FloatingNav />
      </>
    );
  }

  // ── CHAT ───────────────────────────────────────────────────
  return (
    <>
      <main className="mx-auto w-full max-w-md px-5 pt-6" style={{ paddingBottom: NAV_CLEARANCE + 84 }}>
        <div className="flex items-center gap-2">
          <button onClick={backToList} className="inline-flex items-center gap-1 rounded-full bg-wash px-3 py-2 text-sm font-bold text-blue-link">
            <Icon name="chevron-left" size={16} />
            Chats
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-extrabold">{active?.title ?? "New chat"}</h1>
        </div>

        {active && active.messages.length === 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm font-semibold text-muted">What do you want to build?</p>
            {CHIPS.map((c) => (
              <button key={c} onClick={() => send(c)} className="rounded-2xl bg-wash px-4 py-3 text-left text-sm font-medium">
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {active?.messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "self-end" : "self-start"}>
              <div className={`max-w-[18rem] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-cta text-cta-text" : "bg-wash text-ink"}`}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && <p className="self-start text-sm text-muted">Designing…</p>}

          {active?.drafts && active.drafts.length > 1 && !active.draft && (
            <div className="flex flex-col gap-2.5">
              <p className="display px-0.5 text-lg font-extrabold">Pick a variation</p>
              {active.drafts.map((v, i) => (
                <button
                  key={`${v.ensName}-${i}`}
                  onClick={() => selectVariation(v)}
                  className="rounded-3xl bg-wash p-4 text-left shadow-soft active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5">
                    <SparkArt ens={v.ensName} category={v.category} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="display truncate text-base font-extrabold">{v.name}</p>
                      <p className="truncate text-xs font-semibold text-brand-strong">{v.ensName}</p>
                    </div>
                    {v.permissions.requiresWorldId ? <Pill tone="green">Human-only</Pill> : <Pill>Open</Pill>}
                  </div>
                  <p className="mt-2.5 text-sm text-muted">{v.description}</p>
                  <p className="mt-1.5 text-[12px] font-medium text-faint">{variationSummary(v)}</p>
                  <span className="mt-3 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-bold text-white shadow-pop">
                    Use this →
                  </span>
                </button>
              ))}
              <p className="px-0.5 text-[11px] text-faint">Pick one to preview, tweak, and publish — or keep chatting to refine.</p>
            </div>
          )}

          {active?.draft && (
            <Card className="rounded-3xl border-2 border-brand-soft">
              <div className="flex items-center gap-3.5">
                <ImageUploadSlot
                  blobId={active.draft.storage?.imageBlobId}
                  alt={active.draft.name}
                  size={44}
                  rounded="rounded-[14px]"
                  onUploaded={(blobId) =>
                    updateDraft({
                      ...active.draft!,
                      storage: { ...active.draft!.storage, imageBlobId: blobId },
                    })
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="display truncate text-lg font-extrabold">{active.draft.name}</p>
                  <p className="truncate text-xs font-semibold text-brand-strong">{active.draft.ensName}</p>
                </div>
                {active.draft.permissions.requiresWorldId ? <Pill tone="green">Human-only</Pill> : <Pill>Open</Pill>}
              </div>
              <p className="mt-2.5 text-sm text-muted">{active.draft.description}</p>
              <p className="mt-2 text-[11px] text-faint">
                Tap + Add on the cover to upload a photo · open the editor to tweak text and prices.
              </p>
              <div className="mt-3.5 flex gap-2">
                <button
                  onClick={() => setPreview(true)}
                  className="flex-1 rounded-full bg-brand px-4 py-3 text-sm font-bold text-white shadow-pop active:scale-[0.98]"
                >
                  Open editor
                </button>
                <Link
                  href="/publish"
                  onClick={() => sessionStorage.setItem("forge.draft", JSON.stringify(active.draft))}
                  className="flex-1 rounded-full bg-cta px-4 py-3 text-center text-sm font-bold text-cta-text active:scale-[0.98]"
                >
                  Publish →
                </Link>
              </div>
            </Card>
          )}

          {active?.draft && !busy && (
            <div>
              <p className="mb-2 px-0.5 text-xs font-semibold text-muted">Tweak it:</p>
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                {VARIATIONS.map((v) => (
                  <button
                    key={v.label}
                    onClick={() => send(v.prompt)}
                    className="shrink-0 whitespace-nowrap rounded-full bg-brand-soft px-3.5 py-2 text-[13px] font-semibold text-brand-strong active:scale-[0.97]"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div ref={endRef} />
      </main>

      {/* composer — floats above the oval bar (Enter = newline, ⌘/Ctrl+Enter sends) */}
      <div className="pointer-events-none fixed inset-x-0 z-30 mx-auto max-w-md px-5" style={{ bottom: NAV_CLEARANCE - 8 }}>
        <div className="pointer-events-auto flex items-end gap-2 rounded-3xl bg-surface p-1.5 shadow-[0_6px_24px_rgba(11,16,32,0.12)] ring-1 ring-wash">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Describe your Spark…"
            className="max-h-[120px] flex-1 resize-none bg-transparent px-4 py-2.5 text-sm leading-relaxed outline-none"
          />
          <button onClick={() => send(input)} disabled={busy} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cta text-cta-text disabled:opacity-50">
            <Icon name="arrow-up" size={18} className="text-cta-text" />
          </button>
        </div>
      </div>
      {!preview && <FloatingNav />}

      {/* full-screen preview — covers the nav (z-50), closes back to the chat */}
      {preview && active?.draft && (
        <div className="fixed inset-0 z-[10000] flex flex-col bg-bg">
          <div className="shrink-0 border-b border-divider-soft bg-bg px-6 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setPreview(false)} aria-label="Close editor" className="shrink-0 text-xl leading-none text-muted active:scale-90">
                ✕
              </button>
              <p className="display min-w-0 flex-1 truncate text-center text-base font-extrabold">{active.draft.name}</p>
              <Link
                href="/publish"
                onClick={() => sessionStorage.setItem("forge.draft", JSON.stringify(active.draft))}
                className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white shadow-pop active:scale-[0.97]"
              >
                Publish →
              </Link>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-24 pt-4">
            <p className="mb-3 text-center text-[11px] font-semibold text-muted">
              Tap + Add on any tile to upload photos · tap underlined text or prices to edit
            </p>
            <ManifestRunner
              manifest={active.draft}
              compact
              editable
              onManifestChange={(m) => updateDraft(m)}
            />
          </div>
        </div>
      )}
    </>
  );
}
