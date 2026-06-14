"use client";

import { FloatingNav } from "@/components/FloatingNav";
import { Icon } from "@/components/Icon";
import { getDeliverable, type Deliverable } from "@/lib/store";
import Link from "next/link";
import { use, useEffect, useState } from "react";

/** Re-openable view of a structured artifact an Agents Spark produced. */
export default function DeliverablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Deliverable | null | undefined>(undefined);

  useEffect(() => {
    setD(getDeliverable(id));
  }, [id]);

  return (
    <>
      <main className="mx-auto w-full max-w-md px-5 pb-28 pt-6">
        <Link href="/activity" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted">
          <Icon name="chevron-left" size={16} />
          Activity
        </Link>

        {d === undefined ? (
          <div className="mt-6 animate-pulse space-y-3">
            <div className="h-6 w-3/4 rounded-full bg-wash" />
            <div className="h-3 w-1/2 rounded-full bg-wash" />
            <div className="h-24 rounded-3xl bg-wash" />
          </div>
        ) : d === null ? (
          <div className="mt-10 rounded-3xl bg-wash p-6 text-center">
            <Icon name="agent" size={28} className="mx-auto text-faint" />
            <p className="mt-3 text-sm text-muted">This deliverable isn’t on this device.</p>
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-[28px] bg-hero p-6 text-hero-fg shadow-card">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-[11px] font-bold text-brand">
                <Icon name="agent" size={12} />
                {d.kind === "itinerary" ? "Itinerary" : "Research brief"}
              </span>
              <h1 className="display mt-3 text-[24px] font-extrabold leading-tight">{d.title}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[13px] text-hero-muted">
                <span>by {d.agentName}</span>
                {d.agentEns && <span className="font-mono">{d.agentEns}</span>}
                {d.simulated && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">simulated</span>
                )}
              </p>
            </div>

            {d.brief && (
              <div className="mt-4 rounded-2xl bg-wash px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-faint">Your brief</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{d.brief}</p>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3">
              {d.sections.map((s, i) => (
                <div key={i} className="rounded-3xl bg-surface p-5 shadow-soft">
                  <p className="display text-[16px] font-extrabold text-ink">{s.heading}</p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </div>

            <Link
              href={`/app/${encodeURIComponent(d.ens)}`}
              className="mt-5 flex items-center justify-center gap-2 rounded-full bg-cta py-3.5 text-[15px] font-bold text-cta-text"
            >
              Commission another
              <Icon name="arrow-right" size={16} />
            </Link>
          </>
        )}
      </main>
      <FloatingNav />
    </>
  );
}
