"use client";

import { FloatingNav } from "@/components/FloatingNav";
import { SparkArt } from "@/components/SparkArt";
import { useAuth } from "@/lib/auth";
import type { AppRecord } from "@/lib/catalog";
import { APP } from "@/lib/config";
import { getShortcuts, saveShortcuts } from "@/lib/homeShortcuts";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function ensLabel(ens: string) {
  return ens.split(".")[0];
}

function SortableSpark({
  ens,
  category,
  name,
  onRemove,
}: {
  ens: string;
  category?: string;
  name: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ens });
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, touchAction: "none" }}
        {...attributes}
        {...listeners}
        className={`relative h-[60px] w-[60px] touch-none cursor-grab active:cursor-grabbing ${
          isDragging ? "z-10 scale-105 opacity-60" : ""
        }`}
      >
        <SparkArt ens={ens} category={category} size={60} className="ring-2 ring-brand/30" />
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${name}`}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-ink text-[11px] leading-none text-white shadow-card"
        >
          ✕
        </button>
      </div>
      <span className="w-full truncate text-center text-[11px] font-medium">{name}</span>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => {
        const list: AppRecord[] = d.apps ?? [];
        setApps(list);
        const valid = new Set(list.map((a) => a.ensName));
        const initial = getShortcuts() ?? list.slice(0, 6).map((a) => a.ensName);
        setOrder(initial.filter((e) => valid.has(e)));
      })
      .catch(() => {});
  }, []);

  const byEns = useMemo(() => {
    const m = new Map<string, AppRecord>();
    for (const a of apps) m.set(a.ensName, a);
    return m;
  }, [apps]);

  const featured = apps.slice(0, 5);
  const available = apps.filter((a) => !order.includes(a.ensName));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  );

  function persist(next: string[]) {
    setOrder(next);
    saveShortcuts(next);
  }
  function removeAt(i: number) {
    persist(order.filter((_, idx) => idx !== i));
  }
  function onDragEnd(e: DragEndEvent) {
    if (e.over && e.active.id !== e.over.id) {
      const next = arrayMove(order, order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id)));
      persist(next);
    }
  }
  function add(ens: string) {
    if (order.includes(ens)) return;
    persist([...order, ens]);
  }

  return (
    <>
      <main className="mx-auto w-full max-w-md px-5 pb-28 pt-5">
        {/* header */}
        <div className="flex items-center justify-between">
          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "linear-gradient(135deg,#00b4ff,#0066ff)" }}
          >
            <span className="text-sm font-extrabold text-white">{(user?.username ?? "0x")[0]?.toUpperCase()}</span>
          </Link>
          <span className="rounded-full bg-success-bg px-3 py-1.5 text-xs font-bold text-success">
            @{user?.username ?? "human"}
          </span>
        </div>

        <h1 className="display mt-4 text-[38px] font-extrabold leading-none">{APP.name}</h1>
        <p className="mt-2 text-[15px] text-muted">Build a Spark — an app an agent makes for you</p>

        {/* hero — the design agent */}
        <Link
          href="/create"
          className="relative mt-4 block overflow-hidden rounded-[28px] p-6 shadow-pop"
          style={{ background: "linear-gradient(135deg,#00b4ff 0%,#0066ff 100%)" }}
        >
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/25 blur-2xl" />
          <div className="pointer-events-none absolute right-5 top-5 text-3xl">✨</div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/75">Design agent</p>
          <h2 className="display mt-1.5 text-[26px] font-extrabold leading-tight text-white">Create a Spark</h2>
          <p className="mt-2 max-w-[17rem] text-sm leading-relaxed text-white/90">
            Describe it — an agent builds it, names it on ENS, stores it on Walrus.
          </p>
          <span className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-brand-strong">
            Start building →
          </span>
        </Link>

        {/* Sparks grid */}
        <div className="mt-8 flex items-center justify-between">
          <h3 className="display text-xl font-extrabold">Sparks</h3>
          <button
            onClick={() => setEditing((e) => !e)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              editing ? "bg-brand text-white" : "bg-wash text-ink"
            }`}
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
        {editing && <p className="mt-1.5 text-[12px] text-muted">Drag to reorder · tap ✕ to remove</p>}

        {editing ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order} strategy={rectSortingStrategy}>
              <div className="mt-3 grid grid-cols-4 gap-x-3 gap-y-4">
                {/* Create — always first, never editable */}
                <Link href="/create" className="flex flex-col items-center gap-1.5">
                  <div
                    className="flex h-[60px] w-[60px] items-center justify-center rounded-[22px] text-white shadow-pop"
                    style={{ background: "linear-gradient(135deg,#00b4ff,#0089e6)" }}
                  >
                    <span className="text-2xl">✨</span>
                  </div>
                  <span className="w-full truncate text-center text-[11px] font-medium">Create</span>
                </Link>

                {order.map((ens, i) => {
                  const rec = byEns.get(ens);
                  return (
                    <SortableSpark
                      key={ens}
                      ens={ens}
                      category={rec?.category}
                      name={rec?.name ?? ensLabel(ens)}
                      onRemove={() => removeAt(i)}
                    />
                  );
                })}

                {/* trailing tile: Add */}
                <button onClick={() => setShowAdd(true)} className="flex flex-col items-center gap-1.5">
                  <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[22px] border-2 border-dashed border-brand/40 text-brand">
                    <span className="text-2xl">＋</span>
                  </div>
                  <span className="w-full truncate text-center text-[11px] font-medium text-brand">Add</span>
                </button>
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="mt-3 grid grid-cols-4 gap-x-3 gap-y-4">
            {/* Create — always first, never editable */}
            <Link href="/create" className="flex flex-col items-center gap-1.5">
              <div
                className="flex h-[60px] w-[60px] items-center justify-center rounded-[22px] text-white shadow-pop"
                style={{ background: "linear-gradient(135deg,#00b4ff,#0089e6)" }}
              >
                <span className="text-2xl">✨</span>
              </div>
              <span className="w-full truncate text-center text-[11px] font-medium">Create</span>
            </Link>

            {order.map((ens) => {
              const rec = byEns.get(ens);
              return (
                <Link key={ens} href={`/app/${encodeURIComponent(ens)}`} className="flex flex-col items-center gap-1.5">
                  <SparkArt ens={ens} category={rec?.category} size={60} />
                  <span className="w-full truncate text-center text-[11px] font-medium">{rec?.name ?? ensLabel(ens)}</span>
                </Link>
              );
            })}

            {/* trailing tile: See all */}
            <Link href="/catalog" className="flex flex-col items-center gap-1.5">
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[22px] bg-wash">
                <span className="text-2xl">⋯</span>
              </div>
              <span className="w-full truncate text-center text-[11px] font-medium text-muted">See all</span>
            </Link>
          </div>
        )}

        {/* Featured */}
        {featured.length > 0 && (
          <>
            <div className="mt-8 flex items-center justify-between">
              <h3 className="display text-xl font-extrabold">Featured</h3>
              <Link href="/catalog" className="text-sm font-semibold text-brand-strong">See all ›</Link>
            </div>
            <div className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: "none" }}>
              {featured.map((a) => (
                <Link key={a.ensName} href={`/app/${encodeURIComponent(a.ensName)}`} className="w-[230px] shrink-0 rounded-3xl bg-wash p-4">
                  <div className="flex items-center justify-between">
                    <SparkArt ens={a.ensName} category={a.category} size={48} />
                    {a.requiresWorldId && (
                      <span className="rounded-full bg-success-bg px-2 py-1 text-[10px] font-bold text-success">Human-only</span>
                    )}
                  </div>
                  <p className="mt-3 text-[15px] font-bold">{a.name}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted">{a.description}</p>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* How it works */}
        <h3 className="display mt-8 text-xl font-extrabold">How it works</h3>
        <div className="mt-3 flex flex-col gap-2.5">
          {[
            ["🧑", "Verified humans", "World ID gates who can create, run, and claim — one per human."],
            ["🏷️", "Named on ENS", `Every Spark gets a ${APP.ensDomain} name and an on-chain identity.`],
            ["🗄️", "Stored on Walrus", "Each Spark's manifest lives on decentralized storage."],
          ].map(([emoji, title, body]) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl bg-wash p-3.5">
              <span className="text-xl">{emoji}</span>
              <div>
                <p className="text-[14px] font-bold">{title}</p>
                <p className="mt-0.5 text-[13px] text-muted">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
      <FloatingNav />

      {/* Add a Spark sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setShowAdd(false)} />
          <div className="relative mx-auto max-h-[78vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface px-5 pb-8 pt-3 shadow-pop">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-wash" />
            <div className="flex items-center justify-between">
              <h3 className="display text-xl font-extrabold">Add a Spark</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="rounded-full bg-wash px-3 py-1.5 text-sm font-semibold text-ink"
              >
                Done
              </button>
            </div>
            {available.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">Every Spark is already on your Home.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-1.5">
                {available.map((a) => (
                  <div key={a.ensName} className="flex items-center gap-3 rounded-2xl bg-wash p-2.5">
                    <SparkArt ens={a.ensName} category={a.category} size={40} />
                    <span className="flex-1 truncate text-[15px] font-semibold">{a.name}</span>
                    <button
                      onClick={() => add(a.ensName)}
                      className="rounded-full bg-brand px-3.5 py-1.5 text-sm font-bold text-white"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
