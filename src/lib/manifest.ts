/**
 * Validate raw agent output into a renderable DappManifest. The runtime only
 * ever renders manifests that pass this gate (no arbitrary user code) - this is
 * also what keeps an AI generator policy-compliant inside World App.
 */
import { APP } from "./config";
import type { DappManifest } from "./types";

export type ValidationResult =
  | { ok: true; manifest: DappManifest; warnings: string[] }
  | { ok: false; errors: string[] };

const COMPONENT_TYPES = [
  "amountInput",
  "recipient",
  "memoInput",
  "punchCard",
  "menu",
  "submitButton",
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
];
const CATEGORIES = ["Finance", "Community", "Agents", "Events", "Tools"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateManifest(input: any, creator = "a human"): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || typeof input !== "object") return { ok: false, errors: ["manifest must be an object"] };
  if (!input.name || typeof input.name !== "string") errors.push("name (string) is required");
  if (!input.description) errors.push("description is required");
  if (!input.outcome) errors.push('outcome (plain-English, starts with "You will") is required');

  const label: string = String(input.ensLabel ?? input.ensName ?? "")
    .split(".")[0]
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  if (!label) errors.push("ensLabel is required (lowercase letters, digits, hyphens)");

  const category = CATEGORIES.includes(input.category) ? input.category : null;
  if (!category) warnings.push(`category defaulted to Finance (got ${JSON.stringify(input.category)})`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: any[] = Array.isArray(input.components) ? input.components : [];
  const bad = components.filter((c) => !COMPONENT_TYPES.includes(c?.type));
  if (bad.length) errors.push(`unknown component types: ${bad.map((c) => c?.type).join(", ")}`);
  if (!components.some((c) => c?.type === "submitButton")) errors.push("components must include a submitButton");

  for (const c of components) {
    if (c?.type === "punchCard") {
      if (
        typeof c.total !== "number" ||
        c.total <= 0 ||
        !c.reward ||
        typeof c.pointsPerDollar !== "number" ||
        !Number.isFinite(c.pointsPerDollar) ||
        c.pointsPerDollar < 0
      ) {
        errors.push("punchCard needs a positive total, a reward, and a non-negative pointsPerDollar");
      }
    }
    if (c?.type === "menu") {
      const items = Array.isArray(c.items) ? c.items : [];
      if (items.length === 0) errors.push("menu must list at least one item");
      else if (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items.some((it: any) => !it?.id || !it?.name || typeof it?.priceUsd !== "number" || !Number.isFinite(it.priceUsd) || it.priceUsd < 0)
      ) {
        errors.push("every menu item needs an id, a name, and a finite non-negative priceUsd");
      } else if (new Set(items.map((it: { id: string }) => it.id)).size !== items.length) {
        errors.push("menu item ids must be unique");
      }
    }
    if (c?.type === "choiceGroup") {
      const opts = Array.isArray(c.options) ? c.options : [];
      if (!c.key || !c.label || opts.length < 2) errors.push("choiceGroup needs key, label, and at least 2 options");
    }
    if (c?.type === "durationPicker") {
      if (
        !c.key ||
        typeof c.minMinutes !== "number" ||
        typeof c.maxMinutes !== "number" ||
        typeof c.stepMinutes !== "number" ||
        typeof c.pricePerHourUsd !== "number" ||
        c.minMinutes >= c.maxMinutes
      ) {
        errors.push("durationPicker needs key, minMinutes < maxMinutes, stepMinutes, pricePerHourUsd");
      }
    }
    if (c?.type === "stepper") {
      if (!c.key || typeof c.min !== "number" || typeof c.max !== "number" || c.min >= c.max) {
        errors.push("stepper needs key, min < max, and default");
      }
    }
    if (c?.type === "splitBill" && (typeof c.totalUsd !== "number" || c.totalUsd <= 0)) {
      errors.push("splitBill needs a positive totalUsd");
    }
    if (c?.type === "progressGoal" && (typeof c.goalUsd !== "number" || c.goalUsd <= 0)) {
      errors.push("progressGoal needs a positive goalUsd");
    }
    if (c?.type === "roundUp" && (typeof c.purchaseUsd !== "number" || c.purchaseUsd < 0)) {
      errors.push("roundUp needs a non-negative purchaseUsd");
    }
    if (c?.type === "infoCard" && (!c.title || !Array.isArray(c.lines) || c.lines.length < 1)) {
      errors.push("infoCard needs title and at least one line");
    }
    if (c?.type === "textArea" && (!c.key || !c.label)) errors.push("textArea needs key and label");
    if (c?.type === "transitPass" && (!Array.isArray(c.presets) || c.presets.length < 1)) {
      errors.push("transitPass needs at least one preset amount");
    }
    if (c?.type === "membershipCard" && (!c.tier || !Array.isArray(c.benefits) || c.benefits.length < 1)) {
      errors.push("membershipCard needs tier and benefits");
    }
    if (c?.type === "savingsRound" && (!c.payoutTo || typeof c.contributionUsd !== "number")) {
      errors.push("savingsRound needs payoutTo and contributionUsd");
    }
    if (c?.type === "tipPresets" && (!Array.isArray(c.presets) || c.presets.length < 1)) {
      errors.push("tipPresets needs at least one preset amount");
    }
    if (c?.type === "capacityBar" && (typeof c.capacity !== "number" || c.capacity <= 0)) {
      errors.push("capacityBar needs a positive capacity");
    }
    if (c?.type === "countdown" && (!c.toIso || isNaN(Date.parse(c.toIso)))) {
      errors.push("countdown needs a valid ISO timestamp (toIso)");
    }
  }

  const perms = input.permissions ?? {};
  const plainEnglish: string[] = Array.isArray(perms.plainEnglish) ? perms.plainEnglish : [];
  if (plainEnglish.length < 1 || plainEnglish.length > 5) {
    errors.push("permissions.plainEnglish must contain 1-5 plain-English entries");
  }
  if (plainEnglish.some((p) => /0x[a-fA-F0-9]{8,}/.test(p))) {
    errors.push("permissions must not contain raw addresses (plain English only)");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = Array.isArray(input.workflow?.steps) ? input.workflow.steps : [];
  if (steps.length < 2 || steps.length > 6) errors.push("workflow.steps must have 2-6 steps");
  if (steps.some((s) => !s?.label || !s?.detail)) errors.push("every workflow step needs a label and a detail line");

  if (errors.length) return { ok: false, errors };

  const manifest: DappManifest = {
    name: input.name,
    ensName: `${label}.${APP.ensDomain}`,
    creator,
    description: input.description,
    category: category ?? "Finance",
    secondaryCategory: input.secondaryCategory,
    components,
    outcome: input.outcome,
    permissions: {
      plainEnglish,
      spendingCap: perms.spendingCap ?? "$0.00",
      requiresConfirmation: true,
      requiresWorldId: Boolean(perms.requiresWorldId),
      worldPolicy: perms.worldPolicy,
    },
    workflow: {
      provider: "World Chain",
      flowId: `flow_${label}_${Date.now().toString(36)}`,
      steps: steps.map((s, i) => ({ id: s.id ?? `s${i}`, label: s.label, detail: s.detail })),
    },
    storage: input.storage,
    version: "1.0.0",
  };
  return { ok: true, manifest, warnings };
}
