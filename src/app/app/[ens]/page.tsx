"use client";

import { Icon } from "@/components/Icon";
import { ManifestRunner } from "@/components/ManifestRunner";
import { WalrusProof } from "@/components/WalrusProof";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import type { AppRecord } from "@/lib/catalog";
import { readShortcuts, toggleShortcut } from "@/lib/homeShortcuts";
import { sparkTheme } from "@/lib/sparkTheme";
import type { DappManifest } from "@/lib/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function AppRun() {
  const params = useParams<{ ens: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const ens = decodeURIComponent(String(params.ens));
  const [manifest, setManifest] = useState<DappManifest | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound">("loading");
  const [pinned, setPinned] = useState<string[]>([]);
  const [pinBase, setPinBase] = useState<string[]>([]);
  const isPinned = pinned.includes(ens);
  const togglePin = () => setPinned(toggleShortcut(ens, pinBase));

  const theme = useMemo(() => (manifest ? sparkTheme(manifest) : null), [manifest]);
  const isCreator = useMemo(() => {
    if (!manifest || !user?.username || user.guest) return false;
    const u = user.username.toLowerCase();
    return manifest.creator.toLowerCase().includes(u) || manifest.creator.toLowerCase().includes(`@${u}`);
  }, [manifest, user]);

  useEffect(() => {
    fetch(`/api/app/${encodeURIComponent(ens)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.manifest) {
          setManifest(d.manifest);
          setStatus("ok");
        } else setStatus("notfound");
      })
      .catch(() => setStatus("notfound"));
  }, [ens]);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => {
        const base = ((d.apps ?? []) as AppRecord[]).slice(0, 6).map((a) => a.ensName);
        setPinBase(base);
        setPinned(readShortcuts(base));
      })
      .catch(() => setPinned(readShortcuts([])));
  }, []);

  function startEdit() {
    if (!manifest) return;
    sessionStorage.setItem("forge.draft", JSON.stringify(manifest));
    router.push("/create?edit=1");
  }

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pb-16 pt-6"
      style={theme ? { background: `linear-gradient(180deg, ${theme.soft} 0%, var(--color-bg) 220px)` } : undefined}
    >
      <header className="flex items-center gap-2">
        <Button href="/catalog" variant="soft">
          ← Back
        </Button>
        <h1 className="display min-w-0 flex-1 truncate text-xl font-extrabold">{manifest?.name ?? "Spark"}</h1>
        {isCreator && status === "ok" && (
          <button
            type="button"
            onClick={startEdit}
            className="shrink-0 rounded-full bg-wash px-3 py-2 text-xs font-bold text-ink"
          >
            Edit
          </button>
        )}
        <button
          type="button"
          aria-label={isPinned ? "Unpin from Home" : "Pin to Home"}
          title={isPinned ? "Unpin from Home" : "Pin to Home"}
          onClick={togglePin}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface/90 shadow-soft transition active:scale-90"
        >
          <Icon name="heart" size={20} solid={isPinned} className={isPinned ? "text-brand" : "text-faint"} />
        </button>
      </header>

      {status === "loading" && (
        <div className="rounded-3xl bg-surface p-6 shadow-soft">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      )}
      {status === "notfound" && (
        <div className="rounded-3xl bg-surface p-6 shadow-soft">
          <p className="text-sm text-muted">Spark not found. It may not be published yet.</p>
        </div>
      )}
      {status === "ok" && manifest && (
        <>
          {manifest.storage?.manifestBlobId && (
            <WalrusProof blobId={manifest.storage.manifestBlobId} label="Walrus manifest" />
          )}
          {manifest.storage?.imageBlobId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/blob/${manifest.storage.imageBlobId}`}
              alt={`${manifest.name} cover`}
              className="h-40 w-full object-cover shadow-card"
              style={{ borderRadius: theme?.radius ?? "1rem" }}
            />
          )}
          <ManifestRunner manifest={manifest} />
        </>
      )}
    </main>
  );
}
