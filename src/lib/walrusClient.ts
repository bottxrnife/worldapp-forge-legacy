/** Client-safe Walrus URLs (public aggregator — no secrets). */
export const WALRUS_AGGREGATOR =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ?? "https://aggregator.walrus-testnet.walrus.space";

export function walrusBlobUrl(blobId: string): string {
  return `${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`;
}

export async function uploadImageToWalrus(file: File): Promise<string> {
  const res = await fetch("/api/upload", { method: "POST", body: file });
  const data = (await res.json()) as { blobId?: string; error?: string };
  if (!res.ok || !data.blobId) throw new Error(data.error ?? "Upload failed");
  return data.blobId;
}
