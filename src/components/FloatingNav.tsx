"use client";

import { Icon as Glyph } from "@/components/Icon";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Space the floating bar occupies — use as bottom padding so content clears it. */
export const NAV_CLEARANCE = 104;

function Icon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const HOME = "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5";
const APPS = "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z";
const ACTIVITY = "M22 12h-4l-3 9L9 3l-3 9H2";
const PROFILE = "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21a7 7 0 0 1 14 0";

const SIDE = [
  { href: "/", label: "Home", d: HOME, match: (p: string) => p === "/" },
  { href: "/catalog", label: "Sparks", d: APPS, match: (p: string) => p.startsWith("/catalog") || p.startsWith("/app") },
];
const SIDE2 = [
  { href: "/activity", label: "Activity", d: ACTIVITY, match: (p: string) => p.startsWith("/activity") },
  { href: "/profile", label: "Profile", d: PROFILE, match: (p: string) => p.startsWith("/profile") },
];

/**
 * Floating oval tab bar (ported from the original app): a white pill that floats
 * over a soft fade, with Home / Apps / a center Create FAB / Rewards / Profile.
 * Stays visible on every tab — including Create.
 */
export function FloatingNav() {
  const pathname = usePathname();
  const router = useRouter();
  const createActive = pathname.startsWith("/create");
  const [mounted, setMounted] = useState(false);
  /** Pin to the visual viewport bottom so iOS rubber-band scroll doesn't drag the bar. */
  const [viewportOffset, setViewportOffset] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      setViewportOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  const Tab = ({ href, label, d, on }: { href: string; label: string; d: string; on: boolean }) => (
    <Link href={href} className={`flex w-[56px] flex-col items-center gap-1 transition-colors ${on ? "text-brand" : "text-faint"}`}>
      <Icon d={d} active={on} />
      <span className={`text-[10.5px] ${on ? "font-bold" : "font-medium"}`}>{label}</span>
    </Link>
  );

  const bar = (
    <div
      className="pointer-events-none fixed inset-x-0 z-[9999] mx-auto max-w-md"
      style={{
        position: "fixed",
        bottom: viewportOffset,
        left: 0,
        right: 0,
        transform: "translateZ(0)",
        willChange: "transform",
      }}
    >
      <div
        className="pointer-events-none bg-gradient-to-t from-bg via-bg/95 to-transparent px-5 pt-7"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <div className="pointer-events-auto flex items-center justify-between rounded-full bg-surface px-4 py-2.5 shadow-[0_8px_30px_rgba(11,16,32,0.14)]">
          {SIDE.map((t) => (
            <Tab key={t.href} href={t.href} label={t.label} d={t.d} on={t.match(pathname)} />
          ))}

          {/* center Create FAB — stays inside the pill (no negative margin overlap) */}
          <button
            onClick={() => router.push("/create")}
            className="flex w-[56px] flex-col items-center"
            aria-label="Create"
          >
            <span
              className={`flex h-[46px] w-[46px] items-center justify-center rounded-full text-white shadow-pop ${
                createActive ? "ring-2 ring-brand/40" : ""
              }`}
              style={{ background: "linear-gradient(135deg,#00b4ff,#0089e6)" }}
            >
              <Glyph name="spark" size={24} className="text-white" />
            </span>
            <span className={`mt-1 text-[10.5px] ${createActive ? "font-bold text-brand" : "font-medium text-faint"}`}>
              Create
            </span>
          </button>

          {SIDE2.map((t) => (
            <Tab key={t.href} href={t.href} label={t.label} d={t.d} on={t.match(pathname)} />
          ))}
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(bar, document.body);
}
