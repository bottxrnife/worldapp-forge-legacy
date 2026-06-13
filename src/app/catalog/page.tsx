"use client";

import { BottomNav } from "@/components/BottomNav";
import { appAccent, appEmoji, tint } from "@/lib/appStyle";
import type { AppRecord } from "@/lib/catalog";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CatalogPage() {
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => setApps(d.apps ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <main className="mx-auto w-full max-w-md px-5 pb-28 pt-6">
        <h1 className="text-[28px] font-extrabold tracking-tight">Apps</h1>
        <p className="mt-1.5 text-[15px] text-muted">Human-built mini-apps, made with the agent</p>

        {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}

        <div className="mt-4 flex flex-col gap-2.5">
          {apps.map((a) => {
            const accent = appAccent(a.ensName);
            return (
              <Link
                key={a.ensName}
                href={`/app/${encodeURIComponent(a.ensName)}`}
                className="flex items-center gap-3.5 rounded-2xl bg-wash p-3.5"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]"
                  style={{ backgroundColor: tint(accent, 0.14), border: `1px solid ${tint(accent, 0.32)}` }}
                >
                  <span className="text-xl">{appEmoji(a.ensName, a.category)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{a.name}</p>
                  <p className="truncate text-[13px] text-muted">{a.description}</p>
                </div>
                {a.requiresWorldId && (
                  <span className="shrink-0 rounded-full bg-success-bg px-2 py-1 text-[10px] font-bold text-success">Human</span>
                )}
              </Link>
            );
          })}
        </div>

        {!loading && apps.length === 0 && (
          <div className="mt-8 rounded-2xl bg-wash p-5 text-center">
            <p className="text-sm text-muted">No apps yet. Create the first one.</p>
            <Link href="/create" className="mt-3 inline-flex rounded-full bg-cta px-5 py-2.5 text-sm font-bold text-cta-text">
              Create an app →
            </Link>
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
