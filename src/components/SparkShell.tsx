"use client";

import { SparkArt } from "@/components/SparkArt";
import { ImageUploadSlot } from "@/components/ImageUploadSlot";
import { sparkTheme, type SparkTheme } from "@/lib/sparkTheme";
import type { DappManifest } from "@/lib/types";
import type { CSSProperties, ReactNode } from "react";

export function SparkShell({
  manifest,
  children,
  compact,
  editable,
  onCoverImage,
}: {
  manifest: DappManifest;
  children: ReactNode;
  compact?: boolean;
  /** Preview / edit mode — tap the hero icon to upload a cover to Walrus. */
  editable?: boolean;
  onCoverImage?: (blobId: string) => void;
}) {
  const theme = sparkTheme(manifest);
  const vars = {
    "--spark-accent": theme.accent,
    "--spark-soft": theme.soft,
    "--spark-ink": theme.ink,
    "--spark-radius": theme.radius,
  } as CSSProperties;

  return (
    <div className="flex flex-col gap-4" style={vars}>
      {!compact && <SparkHero manifest={manifest} theme={theme} editable={editable} onCoverImage={onCoverImage} />}
      {children}
    </div>
  );
}

function SparkHero({
  manifest,
  theme,
  editable,
  onCoverImage,
}: {
  manifest: DappManifest;
  theme: SparkTheme;
  editable?: boolean;
  onCoverImage?: (blobId: string) => void;
}) {
  const layoutClass =
    theme.layout === "meter"
      ? "min-h-[148px]"
      : theme.layout === "ticket"
        ? "border-b-4 border-dashed border-white/30"
        : theme.layout === "receipt"
          ? "border-t-4 border-dashed border-white/25"
          : "";

  return (
    <div
      className={`relative overflow-hidden text-white shadow-card ${layoutClass}`}
      style={{ background: theme.gradient, borderRadius: theme.radius }}
    >
      <HeroPattern pattern={theme.pattern} accent={theme.accent} />
      {theme.layout === "ticket" && (
        <>
          <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-bg" />
          <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-bg" />
        </>
      )}
      {theme.layout === "meter" && (
        <div className="absolute right-4 top-4 rounded-md bg-black/40 px-2 py-1 font-mono text-[10px] font-bold tracking-widest text-[#EAB308]">
          METER
        </div>
      )}
      <div className="relative z-10 p-5">
        <div className="flex items-start gap-4">
          <div
            className="shrink-0 rounded-2xl p-0.5 shadow-pop"
            style={{ background: "rgba(255,255,255,0.25)" }}
          >
            {editable && onCoverImage ? (
              <ImageUploadSlot
                blobId={manifest.storage?.imageBlobId}
                alt={`${manifest.name} icon`}
                size={52}
                rounded="rounded-2xl"
                onUploaded={onCoverImage}
              />
            ) : (
              <SparkArt
                ens={manifest.ensName}
                category={manifest.category}
                size={52}
                imageBlobId={manifest.storage?.imageBlobId}
              />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">{manifest.category}</p>
            <h2 className="display mt-0.5 text-[22px] font-extrabold leading-tight">{manifest.name}</h2>
            <p className="mt-2 text-[13px] font-medium leading-snug text-white/85">{theme.vibe}</p>
          </div>
        </div>
        {manifest.tagline && (
          <p className="mt-3 text-[12px] font-semibold italic text-white/70">&ldquo;{manifest.tagline}&rdquo;</p>
        )}
      </div>
    </div>
  );
}

function HeroPattern({ pattern, accent }: { pattern: SparkTheme["pattern"]; accent: string }) {
  if (pattern === "none") return null;
  const opacity = 0.12;
  if (pattern === "dots") {
    return (
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,${opacity + 0.08}) 1px, transparent 1px)`,
          backgroundSize: "14px 14px",
        }}
      />
    );
  }
  if (pattern === "lines") {
    return (
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 9px)`,
        }}
      />
    );
  }
  if (pattern === "grid") {
    return (
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />
    );
  }
  if (pattern === "scan") {
    return (
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${accent}22 3px, ${accent}22 4px)`,
        }}
      />
    );
  }
  if (pattern === "confetti") {
    const dots = [
      { t: "12%", l: "8%", s: 6 },
      { t: "22%", l: "78%", s: 4 },
      { t: "55%", l: "15%", s: 5 },
      { t: "68%", l: "85%", s: 7 },
      { t: "80%", l: "45%", s: 4 },
    ];
    return (
      <div className="pointer-events-none absolute inset-0">
        {dots.map((d, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/30"
            style={{ top: d.t, left: d.l, width: d.s, height: d.s }}
          />
        ))}
      </div>
    );
  }
  return null;
}

export function SparkCta({
  theme,
  children,
  disabled,
  onClick,
}: {
  theme: SparkTheme;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const bg = theme.cta === "accent" ? theme.accent : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={bg ? { backgroundColor: bg, borderRadius: theme.radius } : { borderRadius: theme.radius }}
      className={`w-full px-5 py-4 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-50 ${
        theme.cta === "accent" ? "text-white shadow-pop" : "bg-cta text-cta-text"
      }`}
    >
      {children}
    </button>
  );
}
