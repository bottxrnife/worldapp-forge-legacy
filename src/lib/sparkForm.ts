/**
 * Initialise and derive payment amounts from interactive Spark components.
 */
import type { DappManifest, ManifestComponent, SparkFormState } from "./types";
import { getFundraiserRaised, getTransitBalance } from "./store";

export function initFormState(components: ManifestComponent[]): SparkFormState {
  const s: SparkFormState = {};
  for (const c of components) {
    switch (c.type) {
      case "choiceGroup":
        s[c.key] = c.default ?? "";
        break;
      case "durationPicker":
        s[c.key] = c.defaultMinutes ?? c.minMinutes;
        break;
      case "stepper":
        s[c.key] = c.default;
        break;
      case "textArea":
        s[c.key] = c.default ?? "";
        break;
      case "splitBill":
        s[c.key ?? "people"] = c.defaultPeople ?? 2;
        break;
      case "roundUp":
        s.roundTo = Math.ceil(c.purchaseUsd);
        break;
      default:
        break;
    }
  }
  return s;
}

/** Compute the USDC payment amount from interactive components (overrides amountInput when present). */
export function deriveAmount(manifest: DappManifest, form: SparkFormState, fallback: number): number {
  let amount = fallback;
  let derived = false;

  for (const c of manifest.components) {
    if (c.type === "choiceGroup" && c.pricesAmount) {
      const opt = c.options.find((o) => o.value === String(form[c.key]));
      if (opt?.priceUsd != null) {
        amount = opt.priceUsd;
        derived = true;
      }
    }
    if (c.type === "durationPicker") {
      let rate = c.pricePerHourUsd;
      const zone = manifest.components.find(
        (x) => x.type === "choiceGroup" && (x.key === "zone" || x.label.toLowerCase().includes("zone")),
      );
      if (zone && zone.type === "choiceGroup") {
        const opt = zone.options.find((o) => o.value === String(form[zone.key]));
        if (opt?.pricePerHourUsd) rate = opt.pricePerHourUsd;
      }
      const mins = Number(form[c.key] ?? c.defaultMinutes ?? c.minMinutes);
      amount = (mins / 60) * rate;
      derived = true;
    }
    if (c.type === "splitBill") {
      const key = c.key ?? "people";
      const people = Math.max(1, Number(form[key] ?? c.defaultPeople ?? 2));
      amount = c.totalUsd / people;
      derived = true;
    }
    if (c.type === "roundUp") {
      const target = Number(form.roundTo ?? Math.ceil(c.purchaseUsd));
      amount = Math.max(0, target - c.purchaseUsd);
      derived = true;
    }
    if (c.type === "transitPass") {
      const topUp = Number(form.topUp ?? 0);
      if (topUp > 0) {
        amount = topUp;
        derived = true;
      }
    }
  }

  return derived ? Math.round(amount * 100) / 100 : fallback;
}

export function buildMemo(manifest: DappManifest, form: SparkFormState, baseMemo: string): string {
  const parts: string[] = [];
  if (baseMemo) parts.push(baseMemo);

  for (const c of manifest.components) {
    if (c.type === "choiceGroup") {
      const v = String(form[c.key] ?? "");
      const opt = c.options.find((o) => o.value === v);
      if (opt) parts.push(`${c.label}: ${opt.label}`);
    }
    if (c.type === "durationPicker") {
      const mins = Number(form[c.key] ?? c.minMinutes);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const dur = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
      parts.push(`${c.label}: ${dur}`);
    }
    if (c.type === "splitBill") {
      const people = Number(form[c.key ?? "people"] ?? 2);
      parts.push(`${people} people · $${c.totalUsd} total`);
    }
    if (c.type === "stepper" && c.key !== "people") {
      parts.push(`${c.label}: ${form[c.key]}${c.unit ? ` ${c.unit}` : ""}`);
    }
    if (c.type === "textArea") {
      const t = String(form[c.key] ?? "").trim();
      if (t) parts.push(t.slice(0, 120));
    }
    if (c.type === "savingsRound") {
      parts.push(`Round ${c.roundNumber} · payout ${c.payoutTo}`);
    }
  }

  return parts.join(" · ");
}

export function validateForm(manifest: DappManifest, form: SparkFormState): string | null {
  for (const c of manifest.components) {
    if (c.type === "choiceGroup" && c.required !== false) {
      if (!String(form[c.key] ?? "").trim()) return `Pick ${c.label.toLowerCase()}`;
    }
    if (c.type === "textArea" && c.required) {
      if (!String(form[c.key] ?? "").trim()) return `Enter ${c.label.toLowerCase()}`;
    }
    if (c.type === "transitPass") {
      if (!Number(form.topUp ?? 0)) return "Choose a top-up amount";
    }
  }
  return null;
}

export function fundraiserRaised(ens: string, seedRaised = 0): number {
  const stored = getFundraiserRaised(ens);
  return stored > 0 ? stored : seedRaised;
}

export function transitBalanceFor(ens: string, seedBalance = 0): number {
  const stored = getTransitBalance(ens);
  return stored > 0 ? stored : seedBalance;
}
