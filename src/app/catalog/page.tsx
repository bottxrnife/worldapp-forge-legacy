"use client";

import { FloatingNav } from "@/components/FloatingNav";
import { Icon } from "@/components/Icon";
import { SparkArt } from "@/components/SparkArt";
import type { AppRecord } from "@/lib/catalog";
import { readShortcuts, toggleShortcut } from "@/lib/homeShortcuts";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

/** Canonical category order — mirrors the agent + appStyle category set. */
const CATEGORIES = ["Finance", "Community", "Agents", "Events", "Tools"] as const;
type Category = (typeof CATEGORIES)[number];
const CHIPS = ["All", ...CATEGORIES] as const;
type Chip = (typeof CHIPS)[number];

/** Cover art for a Spark: its Walrus image if present, else a SparkArt tile. */
function SparkCover({ a, className, artSize }: { a: AppRecord; className: string; artSize: number }) {
  if (a.imageBlobId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/blob/${a.imageBlobId}`} alt={`${a.name} cover`} className={`object-cover ${className}`} />
    );
  }
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <SparkArt ens={a.ensName} category={a.category} size={artSize} />
    </div>
  );
}

function SparkCard({
  a,
  featured = false,
  pinned,
  onTogglePin,
}: {
  a: AppRecord;
  featured?: boolean;
  pinned: string[];
  onTogglePin: (ens: string) => void;
}) {
  const isPinned = pinned.includes(a.ensName);
  return (
    <Link
      href={`/app/${encodeURIComponent(a.ensName)}`}
      className={`flex shrink-0 flex-col bg-wash transition active:scale-[0.98] ${
        featured ? "w-[240px] rounded-[28px] p-3.5" : "w-[166px] rounded-3xl p-3"
      }`}
    >
      <div className="relative">
        <SparkCover
          a={a}
          className={`w-full ${featured ? "h-[140px] rounded-[22px]" : "h-[108px] rounded-2xl"}`}
          artSize={featured ? 112 : 80}
        />
        {a.requiresWorldId && (
          <span className="absolute left-2 top-2 rounded-full bg-cta/85 px-2 py-0.5 text-[9.5px] font-bold text-cta-text">
            Human
          </span>
        )}
        <button
          type="button"
          aria-label={isPinned ? "Unpin from Home" : "Pin to Home"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePin(a.ensName);
          }}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 shadow-soft backdrop-blur-sm transition active:scale-90"
        >
          <Icon name="heart" size={15} solid={isPinned} className={isPinned ? "text-brand" : "text-faint"} />
        </button>
      </div>
      <p className={`mt-3 truncate font-bold ${featured ? "text-[16px]" : "text-[14px]"}`}>{a.name}</p>
      <p className={`mt-1 line-clamp-2 text-muted ${featured ? "text-[13px]" : "text-[12px] leading-snug"}`}>
        {a.tagline ?? a.description}
      </p>
      {a.stats && (
        <p className="mt-2 flex items-center gap-1 text-[11.5px] font-semibold text-faint">
          <Icon name="star" solid size={11} className="text-brand" />
          <span className="text-ink">{a.stats.rating.toFixed(1)}</span>
          <span>· {a.stats.runs.toLocaleString()} runs</span>
        </p>
      )}
    </Link>
  );
}

/** Edge-to-edge horizontal scroller used by every rail. */
function Rail({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: "none" }}>
      {children}
    </div>
  );
}

export default function CatalogPage() {
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [chip, setChip] = useState<Chip>("All");
  const [pinned, setPinned] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => {
        const list: AppRecord[] = d.apps ?? [];
        setApps(list);
        setPinned(readShortcuts(list.slice(0, 6).map((a) => a.ensName)));
      })
      .finally(() => setLoading(false));
  }, []);

  const pinBase = useMemo(() => apps.slice(0, 6).map((a) => a.ensName), [apps]);
  const togglePin = (ens: string) => setPinned(toggleShortcut(ens, pinBase));

  const featured = useMemo(() => {
    const f = apps.filter((a) => a.featured);
    return f.length > 0 ? f : apps.slice(0, 5);
  }, [apps]);

  const sections = useMemo(
    () =>
      CATEGORIES.map((cat) => ({ cat, items: apps.filter((a) => a.category === cat) })).filter(
        (s) => s.items.length > 0,
      ),
    [apps],
  );

  const visible = sections.filter((s) => chip === "All" || s.cat === (chip as Category));

  return (
    <>
      <main className="mx-auto w-full max-w-md px-5 pb-28 pt-6">
        <h1 className="display text-[32px] font-extrabold">Sparks</h1>
        <p className="mt-2 text-[15px] text-muted">Browse human-built Sparks, made with the agent</p>

        {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}

        {!loading && apps.length === 0 && (
          <div className="mt-8 rounded-3xl bg-wash p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface shadow-[0_4px_16px_rgba(11,16,32,0.08)]">
              <Icon name="spark" size={26} className="text-faint" />
            </div>
            <p className="mt-3 text-[15px] font-bold">No Sparks yet</p>
            <p className="mt-1 text-[13px] text-muted">Describe an everyday app and the agent builds it for you.</p>
            <Link
              href="/create"
              className="mt-4 inline-flex rounded-full bg-cta px-5 py-2.5 text-sm font-bold text-cta-text"
            >
              Create a Spark →
            </Link>
          </div>
        )}

        {!loading && apps.length > 0 && (
          <>
            {/* Featured rail */}
            {featured.length > 0 && (
              <section className="mt-6">
                <h3 className="display text-2xl font-extrabold">Featured</h3>
                <Rail>
                  {featured.map((a) => (
                    <SparkCard key={a.ensName} a={a} featured pinned={pinned} onTogglePin={togglePin} />
                  ))}
                </Rail>
              </section>
            )}

            {/* Category chips (sticky to the top while you scroll) */}
            <div className="sticky top-0 z-20 -mx-5 mt-7 bg-bg px-5 py-3">
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setChip(c)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                      chip === c ? "bg-brand text-white" : "bg-wash text-ink"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* One horizontal rail per category */}
            {visible.map((s) => (
              <section key={s.cat} className="mt-8">
                <div className="flex items-baseline justify-between">
                  <h3 className="display text-2xl font-extrabold">{s.cat}</h3>
                  <span className="text-[13px] font-semibold text-muted">
                    {s.items.length} {s.items.length === 1 ? "Spark" : "Sparks"}
                  </span>
                </div>
                <Rail>
                  {s.items.map((a) => (
                    <SparkCard key={a.ensName} a={a} pinned={pinned} onTogglePin={togglePin} />
                  ))}
                </Rail>
              </section>
            ))}

            {visible.length === 0 && (
              <p className="mt-8 text-center text-sm text-muted">No Sparks in {chip} yet.</p>
            )}
          </>
        )}
      </main>
      <FloatingNav />
    </>
  );
}
