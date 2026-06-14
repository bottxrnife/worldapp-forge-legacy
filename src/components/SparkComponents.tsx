"use client";

import { Icon } from "@/components/Icon";
import type { SparkTheme } from "@/lib/sparkTheme";
import type { ManifestComponent, SparkFormState } from "@/lib/types";
import {
  addTransitRide,
  getCredential,
  getFundraiserRaised,
  getSupporters,
  getTransitBalance,
  getTransitRides,
  isUnlocked,
  type Ride,
  type Supporter,
} from "@/lib/store";
import { useEffect, useState } from "react";

type Props = {
  component: ManifestComponent;
  ens: string;
  form: SparkFormState;
  theme: SparkTheme;
  setField: (key: string, value: string | number) => void;
  onAmountChange: (amount: number) => void;
  selectedTip?: number;
  onTipSelect?: (amount: number) => void;
  hourlyRate?: number;
};

const INTERACTIVE = new Set([
  "choiceGroup",
  "durationPicker",
  "stepper",
  "tipPresets",
  "splitBill",
  "progressGoal",
  "roundUp",
  "infoCard",
  "textArea",
  "transitPass",
  "membershipCard",
  "savingsRound",
  "supporterWall",
  "capacityBar",
  "countdown",
]);

export function isInteractiveComponent(type: string): boolean {
  return INTERACTIVE.has(type);
}

function Panel({
  theme,
  children,
  className = "",
  dark,
}: {
  theme: SparkTheme;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      data-spark-panel
      className={`p-4 ${className}`}
      style={{
        borderRadius: theme.radius,
        background: dark ? theme.ink : theme.soft,
        color: dark ? "#fff" : theme.ink,
        ["--spark-ink" as string]: theme.ink,
      }}
    >
      {children}
    </div>
  );
}

export function SparkComponent({
  component: c,
  ens,
  form,
  theme,
  setField,
  onAmountChange,
  selectedTip,
  onTipSelect,
  hourlyRate,
}: Props) {
  const accent = theme.accent;

  if (c.type === "infoCard") {
    const receipt = theme.layout === "receipt";
    return (
      <Panel theme={theme} className={receipt ? "border-t-2 border-dashed border-ink/20 font-mono" : ""}>
        {c.badge && (
          <span
            className="mb-2 inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
            style={{ background: accent, borderRadius: theme.radius }}
          >
            {c.badge}
          </span>
        )}
        <p className="text-[15px] font-bold" style={{ color: theme.ink }}>
          {c.title}
        </p>
        <ul className={`mt-2 flex flex-col gap-1.5 ${receipt ? "text-[12px]" : "text-[13px]"}`}>
          {c.lines.map((line) => (
            <li key={line} className="leading-snug text-muted">
              {receipt ? `› ${line}` : line}
            </li>
          ))}
        </ul>
        {c.body && c.body.length > 0 && (
          isUnlocked(ens) ? (
            <div className="mt-3 border-t border-ink/10 pt-3">
              {c.body.map((p, i) => (
                <p key={i} className="mb-2 text-[13.5px] leading-relaxed" style={{ color: theme.ink }}>
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <div
              className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold"
              style={{ background: "var(--color-surface)", color: accent }}
            >
              <Icon name="unlock" size={14} />
              Pay to unlock the full article
            </div>
          )
        )}
      </Panel>
    );
  }

  if (c.type === "choiceGroup") {
    const selected = String(form[c.key] ?? "");
    const ballot = theme.layout === "ballot";
    const ticket = theme.layout === "ticket";
    const horizontal = theme.layout === "meter";
    const agent = theme.layout === "agent";

    if (horizontal) {
      return (
        <Panel theme={theme}>
          <p className="mb-3 text-[13px] font-bold uppercase tracking-wide" style={{ color: theme.ink }}>
            {c.label}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {c.options.map((opt) => {
              const active = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField(c.key, opt.value)}
                  className="shrink-0 px-4 py-2.5 text-[13px] font-bold transition active:scale-[0.98]"
                  style={{
                    borderRadius: theme.radius,
                    background: active ? accent : "var(--color-surface)",
                    color: active ? "#fff" : theme.ink,
                    boxShadow: active ? `0 8px 20px ${accent}44` : undefined,
                  }}
                >
                  {opt.label.split("·")[0].trim()}
                </button>
              );
            })}
          </div>
        </Panel>
      );
    }

    return (
      <Panel theme={theme}>
        <p className="mb-3 text-[13px] font-bold" style={{ color: theme.ink }}>
          {ballot ? "Official ballot" : c.label}
        </p>
        <div className={`flex flex-col ${ticket ? "gap-0" : "gap-2"}`}>
          {c.options.map((opt) => {
            const active = selected === opt.value;
            const locked = !!opt.locked;
            const right = opt.priceUsd != null ? `$${opt.priceUsd}` : opt.hint;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={locked}
                onClick={() => !locked && setField(c.key, opt.value)}
                className={`flex items-center gap-3 text-left transition active:scale-[0.99] ${
                  ticket ? "border-b border-dashed border-ink/15 px-1 py-3 last:border-0" : "px-4 py-3"
                } ${locked ? "cursor-not-allowed opacity-55" : ""}`}
                style={{
                  borderRadius: ticket ? 0 : theme.radius,
                  background: active ? accent : "var(--color-surface)",
                  color: active ? "#fff" : theme.ink,
                }}
              >
                {ballot && (
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                    style={{ borderColor: active ? "#fff" : accent }}
                  >
                    {active && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold">{opt.label}</span>
                  {agent && (opt.ens || opt.rating != null) && (
                    <span className={`mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] ${active ? "text-white/75" : "text-muted"}`}>
                      {opt.ens && <span className="font-mono">{opt.ens}</span>}
                      {opt.rating != null && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="star" solid size={10} />
                          {opt.rating}
                          {opt.runs != null ? ` · ${opt.runs} runs` : ""}
                        </span>
                      )}
                    </span>
                  )}
                </span>
                {right && (
                  <span className={`shrink-0 text-[12.5px] font-bold ${active ? "text-white/85" : locked ? "text-faint" : "text-muted"}`}>
                    {right}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Panel>
    );
  }

  if (c.type === "durationPicker") {
    const mins = Number(form[c.key] ?? c.defaultMinutes ?? c.minMinutes);
    const rate = hourlyRate ?? c.pricePerHourUsd;
    const price = Math.round((mins / 60) * rate * 100) / 100;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const label = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? "s" : ""}`) : `${m} min`;
    const meter = theme.layout === "meter";

    return (
      <Panel theme={theme} dark={meter} className={meter ? "border-2 border-[#EAB308]/40" : ""}>
        <div className="mb-3 flex items-center justify-between">
          <p className={`text-[13px] font-bold uppercase tracking-wide ${meter ? "text-[#EAB308]" : ""}`} style={meter ? undefined : { color: theme.ink }}>
            {c.label}
          </p>
          <p className="display text-[24px] font-extrabold" style={{ color: meter ? "#EAB308" : accent }}>
            ${price.toFixed(2)}
          </p>
        </div>
        {meter ? (
          <div className="mb-4 rounded-lg bg-black/50 py-4 text-center font-mono">
            <p className="text-[32px] font-bold leading-none tracking-wider text-[#4ADE80]">{label.replace(" ", ":")}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/50">Time remaining</p>
          </div>
        ) : (
          <p className="mb-3 text-center text-[15px] font-bold">{label}</p>
        )}
        <input
          type="range"
          min={c.minMinutes}
          max={c.maxMinutes}
          step={c.stepMinutes}
          value={mins}
          onChange={(e) => {
            const next = Number(e.target.value);
            setField(c.key, next);
            onAmountChange(Math.round((next / 60) * rate * 100) / 100);
          }}
          className="w-full"
          style={{ accentColor: meter ? "#EAB308" : accent }}
        />
        <div className={`mt-1 flex justify-between text-[11px] font-semibold ${meter ? "text-white/50" : "text-faint"}`}>
          <span>{c.minMinutes}m</span>
          <span>${rate}/hr</span>
          <span>{c.maxMinutes >= 60 ? `${c.maxMinutes / 60}h` : `${c.maxMinutes}m`}</span>
        </div>
      </Panel>
    );
  }

  if (c.type === "stepper") {
    const val = Number(form[c.key] ?? c.default);
    return (
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: theme.soft, borderRadius: theme.radius }}
      >
        <span className="text-[13px] font-semibold" style={{ color: theme.ink }}>
          {c.label}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={val <= c.min}
            onClick={() => setField(c.key, Math.max(c.min, val - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-lg font-bold disabled:opacity-40"
            style={{ color: theme.ink }}
          >
            −
          </button>
          <span className="display min-w-[2ch] text-center text-[18px] font-extrabold" style={{ color: accent }}>
            {val}
            {c.unit ? <span className="ml-1 text-[12px] font-semibold text-muted">{c.unit}</span> : null}
          </span>
          <button
            type="button"
            disabled={val >= c.max}
            onClick={() => setField(c.key, Math.min(c.max, val + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-lg font-bold disabled:opacity-40"
            style={{ color: theme.ink }}
          >
            +
          </button>
        </div>
      </div>
    );
  }

  if (c.type === "tipPresets") {
    const jar = theme.layout === "jar";
    return (
      <Panel theme={theme} className={jar ? "text-center" : ""}>
        <p className="mb-1 text-[13px] font-bold" style={{ color: theme.ink }}>
          {c.label ?? "Tip amount"}
        </p>
        {jar && <p className="mb-4 text-[12px] text-muted">Drop something in the jar</p>}
        <div className={`grid gap-2 ${jar ? "grid-cols-2" : "grid-cols-4"}`}>
          {c.presets.map((p) => {
            const active = selectedTip === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onTipSelect?.(p)}
                className={`font-bold transition active:scale-[0.98] ${jar ? "py-4 text-[18px]" : "py-3 text-[14px]"}`}
                style={{
                  borderRadius: jar ? "9999px" : theme.radius,
                  background: active ? accent : "var(--color-surface)",
                  color: active ? "#fff" : theme.ink,
                  boxShadow: active ? `0 10px 24px ${accent}55` : undefined,
                }}
              >
                ${p}
              </button>
            );
          })}
        </div>
      </Panel>
    );
  }

  if (c.type === "splitBill") {
    const key = c.key ?? "people";
    const people = Number(form[key] ?? c.defaultPeople ?? 2);
    const share = Math.round((c.totalUsd / Math.max(1, people)) * 100) / 100;
    return (
      <Panel theme={theme} className="font-mono">
        <div className="mb-3 flex items-center justify-between text-[12px] uppercase tracking-wide text-muted">
          <span>{c.label ?? "Split the bill"}</span>
          <span>Total ${c.totalUsd.toFixed(2)}</span>
        </div>
        <div className="mb-4 flex justify-center gap-1">
          {Array.from({ length: Math.min(people, 8) }).map((_, i) => (
            <div
              key={i}
              className="flex h-10 w-8 items-end justify-center rounded-t-full pb-1"
              style={{ background: `${accent}${i === 0 ? "FF" : "55"}` }}
            >
              <Icon name="person" size={14} className="text-white" />
            </div>
          ))}
          {people > 8 && <span className="self-center text-[12px] text-muted">+{people - 8}</span>}
        </div>
        <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
          <span className="text-[13px] font-semibold text-muted">Splitting with</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={people <= 1}
              onClick={() => {
                const next = Math.max(1, people - 1);
                setField(key, next);
                onAmountChange(Math.round((c.totalUsd / next) * 100) / 100);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full font-bold disabled:opacity-40"
              style={{ background: theme.soft, color: theme.ink }}
            >
              −
            </button>
            <span className="display text-[18px] font-extrabold" style={{ color: accent }}>
              {people}
            </span>
            <button
              type="button"
              disabled={people >= 12}
              onClick={() => {
                const next = Math.min(12, people + 1);
                setField(key, next);
                onAmountChange(Math.round((c.totalUsd / next) * 100) / 100);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full font-bold disabled:opacity-40"
              style={{ background: theme.soft, color: theme.ink }}
            >
              +
            </button>
          </div>
        </div>
        <p className="mt-4 text-center text-[13px] text-muted">
          Your share{" "}
          <span className="display text-[26px] font-extrabold" style={{ color: accent }}>
            ${share.toFixed(2)}
          </span>
        </p>
      </Panel>
    );
  }

  if (c.type === "progressGoal") {
    const raised = getFundraiserRaised(ens) || c.raisedUsd || 0;
    const pct = Math.min(100, Math.round((raised / c.goalUsd) * 100));
    return (
      <Panel theme={theme}>
        <div className="mb-2 flex items-end justify-between">
          <p className="text-[13px] font-bold" style={{ color: theme.ink }}>
            {c.label ?? "Fundraising goal"}
          </p>
          <p className="display text-[22px] font-extrabold" style={{ color: accent }}>
            {pct}%
          </p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: accent }} />
        </div>
        <p className="mt-2 text-[13px] text-muted">
          ${raised.toLocaleString()} of ${c.goalUsd.toLocaleString()}
          {c.supporters != null ? ` · ${c.supporters} humans chipped in` : ""}
        </p>
      </Panel>
    );
  }

  if (c.type === "roundUp") {
    const target = Number(form.roundTo ?? Math.ceil(c.purchaseUsd));
    const donation = Math.max(0, target - c.purchaseUsd);
    const options = [
      Math.ceil(c.purchaseUsd),
      Math.ceil(c.purchaseUsd / 5) * 5,
      Math.ceil(c.purchaseUsd / 10) * 10,
    ].filter((v, i, a) => a.indexOf(v) === i && v > c.purchaseUsd);

    return (
      <Panel theme={theme}>
        <p className="mb-2 text-[13px] font-bold" style={{ color: theme.ink }}>
          {c.label ?? "Round up your purchase"}
        </p>
        <div className="rounded-xl bg-surface px-4 py-3">
          <p className="text-[12px] uppercase tracking-wide text-muted">Your purchase</p>
          <p className="display text-[28px] font-extrabold" style={{ color: theme.ink }}>
            ${c.purchaseUsd.toFixed(2)}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((v) => {
            const active = target === v;
            const d = v - c.purchaseUsd;
            return (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setField("roundTo", v);
                  onAmountChange(Math.round(d * 100) / 100);
                }}
                className="px-4 py-2.5 text-[13px] font-bold transition"
                style={{
                  borderRadius: theme.radius,
                  background: active ? accent : "var(--color-surface)",
                  color: active ? "#fff" : theme.ink,
                }}
              >
                → ${v} (+${d.toFixed(2)})
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[13px] text-muted">
          Giving <span className="font-bold" style={{ color: accent }}>${donation.toFixed(2)}</span>
        </p>
      </Panel>
    );
  }

  if (c.type === "textArea") {
    const terminal = theme.layout === "agent";
    return (
      <Panel theme={theme} dark={terminal}>
        <label className={`mb-2 block text-[13px] font-bold ${terminal ? "font-mono text-brand" : ""}`} style={terminal ? undefined : { color: theme.ink }}>
          {terminal ? "> " : ""}
          {c.label}
        </label>
        <textarea
          value={String(form[c.key] ?? "")}
          onChange={(e) => setField(c.key, e.target.value)}
          placeholder={c.placeholder}
          rows={3}
          className={`w-full resize-none px-3 py-2.5 text-[14px] outline-none placeholder:text-faint ${
            terminal ? "rounded-md border border-white/10 bg-black/40 font-mono text-green-300" : "rounded-2xl bg-surface"
          }`}
        />
      </Panel>
    );
  }

  if (c.type === "transitPass") {
    return <TransitPassView c={c} ens={ens} theme={theme} form={form} setField={setField} onAmountChange={onAmountChange} />;
  }

  if (c.type === "supporterWall") {
    const supporters = getSupporters(ens);
    const count = (c.baseSupporters ?? 0) + supporters.length;
    return (
      <Panel theme={theme}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-bold" style={{ color: theme.ink }}>
            {c.label ?? "Supporter wall"}
          </p>
          <span className="inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: accent }}>
            <Icon name="people" size={14} />
            {count.toLocaleString()}
          </span>
        </div>
        {supporters.length === 0 ? (
          <p className="text-[13px] text-muted">Be the first verified human to chip in.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {supporters.slice(0, 5).map((s, i) => (
              <div key={`${s.handle}-${i}`} className="flex items-center gap-2.5">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: accent }}
                >
                  {s.handle.replace(/\.eth$/, "").slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold" style={{ color: theme.ink }}>
                  {s.handle}
                </span>
                <span className="shrink-0 text-[12px] font-bold text-muted">${s.amountUsd.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    );
  }

  if (c.type === "capacityBar") {
    const cred = getCredential(ens);
    const mine = cred && (cred.kind === "rsvp" || cred.kind === "pass") ? cred.partySize ?? 1 : 0;
    const filled = Math.min(c.capacity, (c.baseFilled ?? 0) + mine);
    const pct = Math.round((filled / c.capacity) * 100);
    const unit = c.unit ?? "spots";
    const nearlyFull = pct >= 85;
    return (
      <Panel theme={theme}>
        <div className="mb-2 flex items-end justify-between">
          <p className="text-[13px] font-bold" style={{ color: theme.ink }}>
            {c.label ?? "Capacity"}
          </p>
          <p className="text-[13px] font-bold" style={{ color: nearlyFull ? "var(--color-warn)" : accent }}>
            {filled}/{c.capacity} {unit}
          </p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: nearlyFull ? "var(--color-warn)" : accent }} />
        </div>
        <p className="mt-2 text-[12px] text-muted">
          {nearlyFull ? "Almost full — claim now" : `${c.capacity - filled} ${unit} left`}
        </p>
      </Panel>
    );
  }

  if (c.type === "countdown") {
    return <CountdownView theme={theme} label={c.label} toIso={c.toIso} />;
  }

  if (c.type === "membershipCard") {
    return (
      <div
        className="relative overflow-hidden p-5 text-white"
        style={{ background: theme.gradient, borderRadius: theme.radius }}
      >
        <div className="absolute inset-x-0 top-8 h-8 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">Member pass</p>
            <p className="display mt-1 text-[22px] font-extrabold">{c.tier}</p>
          </div>
          <p className="display text-[20px] font-extrabold">${c.priceUsd}/mo</p>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {c.benefits.map((b) => (
            <li key={b} className="flex items-center gap-2 text-[13px] text-white/90">
              <Icon name="check" className="h-4 w-4 shrink-0 text-white" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (c.type === "savingsRound") {
    const pct = c.members ? Math.round((c.roundNumber / (c.members || 8)) * 100) : 38;
    return (
      <Panel theme={theme}>
        <div className="flex items-center gap-4">
          <div
            className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(${accent} ${pct}%, var(--color-surface) 0)` }}
          >
            <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-surface">
              <span className="text-[10px] font-bold uppercase text-muted">Round</span>
              <span className="display text-[18px] font-extrabold" style={{ color: accent }}>
                {c.roundNumber}
              </span>
            </div>
          </div>
          <div className="flex-1 text-[13px]">
            <p className="font-bold" style={{ color: theme.ink }}>
              Payout this round
            </p>
            <p className="mt-0.5 font-semibold text-ink">{c.payoutTo}</p>
            <p className="mt-2 text-muted">
              You pay <span className="font-bold" style={{ color: accent }}>${c.contributionUsd.toFixed(2)}</span>
              {c.members != null ? ` · ${c.members} members` : ""}
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  return null;
}

/** Live countdown to an ISO timestamp (draw time, doors, ballot close). */
function CountdownView({ theme, label, toIso }: { theme: SparkTheme; label?: string; toIso: string }) {
  const target = Date.parse(toIso);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, target - now);
  const day = Math.floor(ms / 86_400_000);
  const hr = Math.floor((ms % 86_400_000) / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  const parts: [number, string][] = day > 0 ? [[day, "d"], [hr, "h"], [min, "m"]] : [[hr, "h"], [min, "m"], [sec, "s"]];
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ background: theme.soft, borderRadius: theme.radius }}>
      <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: theme.ink }}>
        <Icon name="bell" size={15} />
        {label ?? "Closes in"}
      </span>
      {ms <= 0 ? (
        <span className="text-[13px] font-bold text-muted">Closed</span>
      ) : (
        <span className="flex items-center gap-1.5">
          {parts.map(([v, u], i) => (
            <span key={i} className="flex flex-col items-center">
              <span className="display text-[18px] font-extrabold leading-none" style={{ color: theme.accent }}>
                {String(v).padStart(2, "0")}
              </span>
              <span className="text-[9px] font-bold uppercase text-faint">{u}</span>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/** Transit pass card: live balance, tap-to-ride history, low-balance nudge, top-up presets. */
function TransitPassView({
  c,
  ens,
  theme,
  form,
  setField,
  onAmountChange,
}: {
  c: Extract<ManifestComponent, { type: "transitPass" }>;
  ens: string;
  theme: SparkTheme;
  form: SparkFormState;
  setField: (key: string, value: string | number) => void;
  onAmountChange: (amount: number) => void;
}) {
  const accent = theme.accent;
  const fare = c.fareUsd ?? 2.9;
  const [balance, setBalance] = useState<number>(() => getTransitBalance(ens) || c.balanceUsd || 0);
  const [rides, setRides] = useState<Ride[]>([]);
  const topUp = Number(form.topUp ?? 0);
  useEffect(() => {
    setBalance(getTransitBalance(ens) || c.balanceUsd || 0);
    setRides(getTransitRides(ens));
  }, [ens, c.balanceUsd]);
  const low = balance < fare;
  const ridesLeft = Math.floor(balance / fare);
  const ref = Math.max(20, ...c.presets);
  const pct = Math.min(100, Math.round((balance / ref) * 100));
  function ride() {
    if (balance < fare) return;
    const r = addTransitRide(ens, fare);
    setBalance(r.balance);
    setRides(r.rides);
  }
  return (
    <div
      className="relative overflow-hidden p-5 text-white"
      style={{ background: `linear-gradient(135deg, ${theme.ink} 0%, ${accent} 100%)`, borderRadius: theme.radius }}
    >
      <div className="absolute -right-6 top-1/2 h-24 w-24 -translate-y-1/2 rotate-12 rounded-xl bg-white/10" />
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">{c.label ?? "Transit pass"}</p>
      <p className="display mt-1 font-mono text-[40px] font-extrabold leading-none">${balance.toFixed(2)}</p>
      <p className="mt-1 text-[12px] font-semibold text-white/60">
        ≈ {ridesLeft} ride{ridesLeft === 1 ? "" : "s"} left · ${fare.toFixed(2)}/ride
      </p>
      <div className="mt-3 h-1 w-full rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white/70 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <button
        type="button"
        onClick={ride}
        disabled={low}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[14px] font-extrabold transition active:scale-[0.98] disabled:opacity-40"
        style={{ color: theme.ink }}
      >
        <Icon name="train" size={16} /> Tap to ride · ${fare.toFixed(2)}
      </button>
      {low && <p className="mt-2 text-center text-[12px] font-semibold text-white/85">Low balance — top up to keep riding</p>}
      {rides.length > 0 && (
        <div className="mt-3 border-t border-white/15 pt-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-white/45">Recent rides</p>
          {rides.slice(0, 3).map((r, i) => (
            <div key={i} className="flex items-center justify-between py-0.5 text-[12px] text-white/70">
              <span>{new Date(r.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              <span className="font-semibold">−${r.fareUsd.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="mb-2 mt-4 text-[13px] font-semibold text-white/70">Quick top-up</p>
      <div className="grid grid-cols-3 gap-2">
        {c.presets.map((p) => {
          const active = topUp === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                setField("topUp", p);
                onAmountChange(p);
              }}
              className="py-2.5 text-[14px] font-bold transition"
              style={{ borderRadius: theme.radius, background: active ? "#fff" : "rgba(255,255,255,0.12)", color: active ? theme.ink : "#fff" }}
            >
              +${p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
