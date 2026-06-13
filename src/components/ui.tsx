import Link from "next/link";

/** Solid primary button / link. */
export function Button({
  children,
  onClick,
  href,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: "primary" | "soft";
}) {
  const cls =
    variant === "primary"
      ? "bg-cta text-cta-text"
      : "bg-blue-soft text-blue-link";
  const base = `inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-50 ${cls}`;
  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} className={base}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-surface p-5 shadow-[0_6px_20px_rgba(11,16,32,0.06)] ${className}`}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "warn" }) {
  const tones = {
    blue: "bg-blue-soft text-blue-link",
    green: "bg-success-bg text-success",
    warn: "bg-warn-bg text-warn",
  } as const;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>
  );
}
