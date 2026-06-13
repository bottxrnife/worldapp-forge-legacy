"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Icon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5",
  apps: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  create: "M12 3v18M3 12h18",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21a7 7 0 0 1 14 0",
};

const TABS = [
  { href: "/", label: "Home", icon: ICONS.home, match: (p: string) => p === "/" },
  { href: "/catalog", label: "Apps", icon: ICONS.apps, match: (p: string) => p.startsWith("/catalog") || p.startsWith("/app") },
  { href: "/create", label: "Create", icon: ICONS.create, match: (p: string) => p.startsWith("/create") },
  { href: "/profile", label: "Profile", icon: ICONS.profile, match: (p: string) => p.startsWith("/profile") },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-stretch justify-around border-t border-wash bg-bg/95 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 backdrop-blur">
      {TABS.map((t) => {
        const on = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-1 flex-col items-center gap-1 py-1 ${on ? "text-ink" : "text-faint"}`}
          >
            <Icon d={t.icon} active={on} />
            <span className={`text-[11px] ${on ? "font-bold" : "font-medium"}`}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
