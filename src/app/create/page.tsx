"use client";

import { ManifestRunner } from "@/components/ManifestRunner";
import { Button, Card, Pill } from "@/components/ui";
import type { ApiMessage } from "@/lib/agent";
import type { DappManifest } from "@/lib/types";
import { MiniKit } from "@worldcoin/minikit-js";
import Link from "next/link";
import { useRef, useState } from "react";

type UiMsg = { role: "user" | "assistant"; text: string };

const CHIPS = [
  "A $5 team dues collector that pays to treasury.eth",
  "A coffee punch card — 10 stamps for a free coffee",
  "A one-vote-per-human poll for my DAO",
  "An RSVP where each human can claim one ticket",
];

export default function CreatePage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMsg[]>([]);
  const [history, setHistory] = useState<ApiMessage[]>([]);
  const [draft, setDraft] = useState<DappManifest | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history, message: prompt, creator: MiniKit.user?.username ?? "a human" }),
      });
      const turn = await res.json();
      if (turn.error) {
        setMessages((m) => [...m, { role: "assistant", text: `Something went wrong: ${turn.error}` }]);
      } else {
        if (turn.text) setMessages((m) => [...m, { role: "assistant", text: turn.text }]);
        if (turn.history) setHistory(turn.history);
        if (turn.draft) {
          setDraft(turn.draft);
          setPreview(false);
        }
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: `Network error: ${String(e)}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pb-28 pt-6">
      <header className="flex items-center gap-3">
        <Button href="/" variant="soft">
          ← Back
        </Button>
        <h1 className="text-xl font-extrabold">Create</h1>
      </header>

      {messages.length === 0 && (
        <Card className="!bg-blue-soft">
          <p className="text-sm font-semibold text-blue-body">What do you want to build?</p>
          <div className="mt-3 flex flex-col gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => send(c)}
                className="rounded-xl bg-surface px-3 py-2.5 text-left text-sm font-medium text-ink"
              >
                {c}
              </button>
            ))}
          </div>
        </Card>
      )}

      {messages.map((m, i) => (
        <div key={i} className={m.role === "user" ? "self-end" : "self-start"}>
          <div
            className={`max-w-[18rem] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "user" ? "bg-cta text-cta-text" : "bg-surface text-ink"
            }`}
          >
            {m.text}
          </div>
        </div>
      ))}

      {busy && <p className="self-start text-sm text-muted">Designing…</p>}

      {draft && (
        <Card className="border-2 border-blue-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-extrabold">{draft.name}</p>
              <p className="text-xs text-blue-link">{draft.ensName}</p>
            </div>
            {draft.permissions.requiresWorldId ? <Pill tone="green">Human-only</Pill> : <Pill>Open</Pill>}
          </div>
          <p className="mt-2 text-sm text-muted">{draft.description}</p>
          <ul className="mt-3 flex flex-col gap-1">
            {draft.permissions.plainEnglish.map((p) => (
              <li key={p} className="text-xs text-ink/70">
                • {p}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setPreview((v) => !v)}
              className="flex-1 rounded-xl bg-cta px-4 py-2.5 text-sm font-bold text-cta-text"
            >
              {preview ? "Hide preview" : "Preview"}
            </button>
            <Link
              href="/publish"
              onClick={() => sessionStorage.setItem("forge.draft", JSON.stringify(draft))}
              className="flex-1 rounded-xl bg-blue-soft px-4 py-2.5 text-center text-sm font-bold text-blue-link"
            >
              Publish →
            </Link>
          </div>
          {preview && (
            <div className="mt-4 border-t border-divider pt-4">
              <ManifestRunner manifest={draft} />
            </div>
          )}
        </Card>
      )}

      <div ref={endRef} />

      {/* composer */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-bg/95 px-5 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Describe your app…"
            className="flex-1 rounded-full bg-surface px-4 py-3 text-sm outline-none"
          />
          <button
            onClick={() => send(input)}
            disabled={busy}
            className="h-11 w-11 rounded-full bg-cta text-lg text-cta-text disabled:opacity-50"
          >
            ↑
          </button>
        </div>
      </div>
    </main>
  );
}
