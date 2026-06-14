"use client";

import { walrusBlobUrl } from "@/lib/walrusClient";
import { useState } from "react";

/** On-chain proof link — shows the public Walrus blob URL for a stored manifest or image. */
export function WalrusProof({
  blobId,
  label = "Walrus manifest",
  compact,
}: {
  blobId?: string | null;
  label?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!blobId) return null;
  const url = walrusBlobUrl(blobId);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  if (compact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="break-all text-[11px] font-semibold text-blue-link underline"
      >
        {label} · {blobId.slice(0, 10)}…
      </a>
    );
  }

  return (
    <div className="rounded-2xl border border-divider-soft bg-wash px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[10px] font-bold text-ink"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="mt-1.5 block break-all text-[12px] font-semibold text-blue-link underline">
        {url}
      </a>
      <p className="mt-1 text-[11px] text-faint">Blob id: {blobId}</p>
    </div>
  );
}
