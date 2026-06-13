"use client";

import { FloatingNav, NAV_CLEARANCE } from "@/components/FloatingNav";
import { ManifestRunner } from "@/components/ManifestRunner";
import { Card, Pill } from "@/components/ui";
import type { ApiMessage } from "@/lib/agent";
import type { DappManifest } from "@/lib/types";
import { MiniKit } from "@worldcoin/minikit-js";
import Link from "next/link";
import { useRef, useState } from "react";

type UiMsg = { role: "user" | "assistant"; text: string };

const CHIPS = [
  "A $5 team dues collector that pays treasury.eth",
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
  const taRef = useRef<HTMLTextAreaElement>(null);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history, message: prompt, creator: MiniKit.user?.username ?? "a human" }),
      });
      const turn = await res.json();
      if (turn.error) setMessages((m) => [...m, { role: "assistant", text: `Something went wrong: ${turn.error}` }]);
      else {
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
    <>
      <main className="mx-auto w-full max-w-md px-5 pt-6" style={{ paddingBottom: NAV_CLEARANCE + 84 }}>
        <h1 className="text-[28px] font-extrabold tracking-tight">Create a Spark</h1>
        <p className="mt-1.5 text-[15px] text-muted">Describe it — the agent builds it.</p>

        {messages.length === 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => send(c)} className="rounded-2xl bg-wash px-4 py-3 text-left text-sm font-medium">
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "self-end" : "self-start"}>
              <div className={`max-w-[18rem] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-cta text-cta-text" : "bg-wash text-ink"}`}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && <p className="self-start text-sm text-muted">Designing…</p>}

          {draft && (
            <Card className="border-2 border-blue-soft">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold">{draft.name}</p>
                  <p className="truncate text-xs text-blue-link">{draft.ensName}</p>
                </div>
                {draft.permissions.requiresWorldId ? <Pill tone="green">Human-only</Pill> : <Pill>Open</Pill>}
              </div>
              <p className="mt-2 text-sm text-muted">{draft.description}</p>
              <ul className="mt-3 flex flex-col gap-1">
                {draft.permissions.plainEnglish.map((p) => (
                  <li key={p} className="text-xs text-ink/70">• {p}</li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setPreview((v) => !v)} className="flex-1 rounded-xl bg-cta px-4 py-2.5 text-sm font-bold text-cta-text">
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
        </div>
        <div ref={endRef} />
      </main>

      {/* composer — floats just above the oval bar (not fullscreen) */}
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
              // Enter inserts a newline; Cmd/Ctrl+Enter sends.
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Describe your Spark…"
            className="max-h-[120px] flex-1 resize-none bg-transparent px-4 py-2.5 text-sm leading-relaxed outline-none"
          />
          <button
            onClick={() => send(input)}
            disabled={busy}
            className="h-10 w-10 shrink-0 rounded-full bg-cta text-lg text-cta-text disabled:opacity-50"
          >
            ↑
          </button>
        </div>
      </div>

      <FloatingNav />
    </>
  );
}
