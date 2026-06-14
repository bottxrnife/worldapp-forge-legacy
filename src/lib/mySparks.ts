/**
 * Device-persisted Sparks the user published — survives catalog cold starts and
 * powers the "Your Sparks" rail on Home + Catalog.
 */
import type { AppRecord } from "./catalog";
import type { DappManifest } from "./types";

const KEY = "forge.mySparks";
const MAX = 40;

export type MySparkEntry = {
  ensName: string;
  name: string;
  description: string;
  tagline?: string;
  category: string;
  requiresWorldId: boolean;
  creator: string;
  manifestBlobId?: string;
  imageBlobId?: string;
  ts: number;
  manifest: DappManifest;
};

function read(): MySparkEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as MySparkEntry[]) : [];
  } catch {
    return [];
  }
}

function write(list: MySparkEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore quota */
  }
}

function fromManifest(manifest: DappManifest, blobId?: string): MySparkEntry {
  return {
    ensName: manifest.ensName,
    name: manifest.name,
    description: manifest.description,
    tagline: manifest.tagline,
    category: manifest.category,
    requiresWorldId: manifest.permissions.requiresWorldId,
    creator: manifest.creator,
    manifestBlobId: blobId ?? manifest.storage?.manifestBlobId,
    imageBlobId: manifest.storage?.imageBlobId,
    ts: Date.now(),
    manifest,
  };
}

function toRecord(entry: MySparkEntry): AppRecord {
  return {
    ensName: entry.ensName,
    name: entry.name,
    description: entry.description,
    tagline: entry.tagline,
    category: entry.category,
    requiresWorldId: entry.requiresWorldId,
    creator: entry.creator,
    manifestBlobId: entry.manifestBlobId,
    imageBlobId: entry.imageBlobId,
    ts: entry.ts,
  };
}

export function getMySparks(): MySparkEntry[] {
  return read();
}

export function getMySparkManifest(ensName: string): DappManifest | undefined {
  return read().find((s) => s.ensName === ensName)?.manifest;
}

export function addMySpark(manifest: DappManifest, blobId?: string): void {
  const entry = fromManifest(manifest, blobId);
  const rest = read().filter((s) => s.ensName !== entry.ensName);
  write([entry, ...rest]);
}

/** ENS names the user published on this device. */
export function mySparkEnsNames(): Set<string> {
  return new Set(read().map((s) => s.ensName));
}

/** Merge local publishes with the live catalog for display rails. */
export function resolveMySparkApps(catalog: AppRecord[]): AppRecord[] {
  const sparks = read();
  if (sparks.length === 0) return [];
  const byEns = new Map(catalog.map((a) => [a.ensName, a]));
  return sparks.map((s) => byEns.get(s.ensName) ?? toRecord(s));
}
