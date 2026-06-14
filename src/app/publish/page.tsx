"use client";

import { ImageUploadSlot } from "@/components/ImageUploadSlot";
import { WalrusProof } from "@/components/WalrusProof";
import { Button, Card, Pill } from "@/components/ui";
import { APP } from "@/lib/config";
import { addMySpark } from "@/lib/mySparks";
import type { DappManifest, ManifestComponent } from "@/lib/types";
import { useEffect, useState } from "react";

type EnsProvision = {
  chain: "mainnet" | "sepolia";
  chainLabel: string;
  mode: "on-chain" | "catalog-only";
  ensName: string;
  txHashes?: string[];
  message: string;
};

type PublishResult = {
  ensName: string;
  blobId: string | null;
  walrusUrl: string | null;
  storageError?: string;
  ens?: EnsProvision;
};

export default function PublishPage() {
  const [draft, setDraft] = useState<DappManifest | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("forge.draft");
    if (raw) {
      try {
        setDraft(JSON.parse(raw));
      } catch {}
    }
  }, []);

  function persist(next: DappManifest) {
    setDraft(next);
    try {
      sessionStorage.setItem("forge.draft", JSON.stringify(next));
    } catch {}
  }

  const publish = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ manifest: draft, creator: draft.creator }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Publish failed");
      else {
        setResult(data);
        addMySpark(
          { ...draft, storage: { ...draft.storage, manifestBlobId: data.blobId ?? draft.storage?.manifestBlobId } },
          data.blobId ?? undefined,
        );
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

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

  const menuComp = draft.components.find((c) => c.type === "menu") as
    | Extract<ManifestComponent, { type: "menu" }>
    | undefined;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pb-16 pt-6">
      <header className="flex items-center gap-3">
        <Button href="/create" variant="soft">
          ← Back
        </Button>
        <h1 className="display text-2xl font-extrabold">Publish</h1>
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

      {!result && (
        <Card>
          <p className="text-sm font-bold">Add a cover image (optional)</p>
          <p className="mt-0.5 text-xs text-muted">Tap to upload — stored on Walrus and shown on your Spark.</p>
          <div className="mt-3 flex items-center gap-3">
            <ImageUploadSlot
              blobId={draft.storage?.imageBlobId}
              alt={`${draft.name} cover`}
              size={64}
              rounded="rounded-2xl"
              onUploaded={(blobId) =>
                persist({ ...draft, storage: { ...draft.storage, imageBlobId: blobId } })
              }
            />
            <p className="text-xs text-muted">PNG or JPG, up to 5 MB</p>
          </div>
          {draft.storage?.imageBlobId && (
            <div className="mt-3">
              <WalrusProof blobId={draft.storage.imageBlobId} label="Cover on Walrus" />
            </div>
          )}
        </Card>
      )}

      {!result && menuComp && (
        <Card>
          <p className="text-sm font-bold">Menu photos (optional)</p>
          <p className="mt-0.5 text-xs text-muted">Tap each tile to upload — stored on Walrus.</p>
          <div className="mt-3 flex flex-col gap-2">
            {menuComp.items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 rounded-2xl bg-wash px-3 py-2">
                <ImageUploadSlot
                  blobId={it.imageBlobId}
                  alt={it.name}
                  size={48}
                  rounded="rounded-xl"
                  onUploaded={(blobId) =>
                    persist({
                      ...draft,
                      components: draft.components.map((c) =>
                        c.type === "menu"
                          ? {
                              ...c,
                              items: c.items.map((item) =>
                                item.id === it.id ? { ...item, imageBlobId: blobId } : item,
                              ),
                            }
                          : c,
                      ),
                    })
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{it.name}</p>
                  <p className="text-xs text-muted">${it.priceUsd.toFixed(2)}</p>
                  {it.imageBlobId && (
                    <WalrusProof blobId={it.imageBlobId} label="Photo" compact />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {result ? (
        <Card className="!bg-success-bg">
          <p className="text-center text-lg font-extrabold text-success">Published</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li className="flex justify-between gap-2">
              <span className="text-success/70">ENS name</span>
              <span className="font-semibold text-success">{result.ensName}</span>
            </li>
            {result.ens && (
              <>
                <li className="flex justify-between gap-2">
                  <span className="text-success/70">ENS chain</span>
                  <span className="font-semibold text-success">{result.ens.chainLabel}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span className="text-success/70">On-chain</span>
                  <span className="font-semibold text-success">
                    {result.ens.mode === "on-chain" ? "Minted" : "Catalog only"}
                  </span>
                </li>
              </>
            )}
          </ul>
          {result.ens?.message && (
            <p className="mt-2 text-center text-xs text-success/80">{result.ens.message}</p>
          )}
          {result.ens?.txHashes?.map((hash) => (
            <a
              key={hash}
              href={
                result.ens!.chain === "mainnet"
                  ? `https://etherscan.io/tx/${hash}`
                  : `https://sepolia.etherscan.io/tx/${hash}`
              }
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-center text-xs text-success/80 underline"
            >
              View ENS tx {hash.slice(0, 10)}…
            </a>
          ))}
          {result.blobId && (
            <div className="mt-3">
              <WalrusProof blobId={result.blobId} label="Walrus manifest" />
            </div>
          )}
          {result.storageError && (
            <p className="mt-2 text-center text-xs text-warn">Walrus unavailable — recorded locally.</p>
          )}
          <div className="mt-3 flex justify-center gap-2">
            <Button href="/catalog" variant="soft">
              Your Sparks
            </Button>
            <Button href={`/app/${encodeURIComponent(result.ensName)}`}>Open Spark</Button>
          </div>
        </Card>
      ) : (
        <button
          onClick={publish}
          disabled={busy}
          className="rounded-2xl bg-cta px-5 py-3.5 text-[15px] font-bold text-cta-text disabled:opacity-50"
        >
          {busy ? "Publishing…" : "Confirm publish"}
        </button>
      )}
      {error && <p className="text-center text-xs font-semibold text-warn">{error}</p>}
      <p className="text-center text-xs text-faint">
        {APP.ensChain === "sepolia"
          ? "Publishing stores the manifest on Walrus and auto-mints an ENS subname on Sepolia testnet — free, no ETH from you."
          : "Publishing stores the manifest on Walrus and records the ENS name. Mainnet mints cost real ETH — use Sepolia for free testnet names."}
      </p>
    </main>
  );
}
