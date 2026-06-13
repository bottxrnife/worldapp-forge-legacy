"use client";

import { Button, Card, Pill } from "@/components/ui";
import type { DappManifest } from "@/lib/types";
import { useEffect, useState } from "react";

export default function PublishPage() {
  const [draft, setDraft] = useState<DappManifest | null>(null);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("forge.draft");
    if (raw) {
      try {
        setDraft(JSON.parse(raw));
      } catch {}
    }
  }, []);

  if (!draft) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pb-16 pt-6">
        <Button href="/create" variant="soft">
          ← Back
        </Button>
        <Card>
          <p className="text-sm text-muted">No draft to publish. Create one first.</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pb-16 pt-6">
      <header className="flex items-center gap-3">
        <Button href="/create" variant="soft">
          ← Back
        </Button>
        <h1 className="text-xl font-extrabold">Publish</h1>
      </header>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-base font-extrabold">{draft.name}</p>
          {draft.permissions.requiresWorldId ? <Pill tone="green">Human-only</Pill> : <Pill>Open</Pill>}
        </div>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          <li className="flex justify-between">
            <span className="text-muted">ENS name</span>
            <span className="font-semibold text-blue-link">{draft.ensName}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted">Manifest storage</span>
            <span className="font-semibold">Walrus</span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted">Access</span>
            <span className="font-semibold">{draft.permissions.worldPolicy ?? "open"}</span>
          </li>
        </ul>
      </Card>

      {published ? (
        <Card className="!bg-success-bg text-center">
          <p className="text-lg font-extrabold text-success">Published</p>
          <p className="mt-1 text-sm text-success/80">
            Next phase wires the real ENS subname mint + Walrus blob write.
          </p>
          <div className="mt-3">
            <Button href="/catalog" variant="soft">
              View catalog
            </Button>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setPublished(true)}
          className="rounded-2xl bg-cta px-5 py-3.5 text-[15px] font-bold text-cta-text"
        >
          Confirm publish
        </button>
      )}
      <p className="text-center text-xs text-faint">
        Publishing mints {draft.ensName} and stores the manifest on Walrus (wired next).
      </p>
    </main>
  );
}
