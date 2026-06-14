"use client";

import { Icon } from "@/components/Icon";
import { uploadImageToWalrus } from "@/lib/walrusClient";
import { useState, type ChangeEvent, type ReactNode } from "react";

/** Tap-to-upload tile — stores bytes on Walrus via /api/upload. */
export function ImageUploadSlot({
  blobId,
  alt,
  size = 48,
  rounded = "rounded-2xl",
  onUploaded,
  className = "",
  children,
}: {
  blobId?: string;
  alt: string;
  size?: number;
  rounded?: string;
  onUploaded: (blobId: string) => void;
  className?: string;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      onUploaded(await uploadImageToWalrus(file));
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <label
      className={`relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden bg-wash ring-1 ring-divider-soft ${rounded} ${className}`}
      style={{ width: size, height: size }}
      title={blobId ? "Replace image" : "Add image"}
    >
      {blobId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/blob/${blobId}`} alt={alt} className="h-full w-full object-cover" />
      ) : (
        children ?? (
          <span className="flex flex-col items-center gap-0.5 text-faint">
            <Icon name="plus" size={18} />
            <span className="text-[9px] font-bold">{busy ? "…" : "Add"}</span>
          </span>
        )
      )}
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-bold text-white">
          …
        </span>
      )}
      <input type="file" accept="image/*" className="hidden" onChange={onPick} disabled={busy} />
      {err && <span className="sr-only">{err}</span>}
    </label>
  );
}
