/**
 * Forge design agent (server-side). An Anthropic tool-calling loop that drafts
 * schema-validated mini-app manifests. It can draft and check ENS availability;
 * it has NO spend/publish tools - a human confirms those in the UI. Falls back
 * to a deterministic template when no model credential is set.
 */
import { APP } from "./config";
import { resolveAddress } from "./ens";
import { validateManifest } from "./manifest";
import { SEED_APPS } from "./seeds";
import type { DappManifest } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const hasDirectKey = () => (process.env.ANTHROPIC_API_KEY ?? "").length > 0;
const hasProxy = () => (process.env.ANTHROPIC_PROXY_URL ?? "").length > 0;
export const hasAgentCreds = () => hasDirectKey() || hasProxy();

function messagesUrl(): string {
  if (hasDirectKey()) return "https://api.anthropic.com/v1/messages";
  const base = (process.env.ANTHROPIC_PROXY_URL ?? "").replace(/\/$/, "");
  return base.endsWith("/v1/messages") ? base : `${base}/v1/messages`;
}
function apiKey(): string {
  return hasDirectKey() ? (process.env.ANTHROPIC_API_KEY ?? "") : (process.env.ANTHROPIC_PROXY_KEY ?? "dummy");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: any }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export type ApiMessage = { role: "user" | "assistant"; content: ContentBlock[] | string };
export type AgentTurn = { history: ApiMessage[]; text: string; draft: DappManifest | null; source: string };

const TOOLS = [
  {
    name: "get_current_draft",
    description:
      "Return the Spark the user is currently editing (its manifest), or none. Call this first when the user asks to change/edit an existing Spark, then re-call draft_dapp_manifest with the full updated design.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "check_ens_subname",
    description: `Check whether a subname label is available under ${APP.ensDomain} for a new app identity.`,
    input_schema: {
      type: "object",
      properties: { label: { type: "string", description: 'lowercase label, e.g. "cafe"' } },
      required: ["label"],
    },
  },
  {
    name: "draft_dapp_manifest",
    description:
      "Create the mini-app draft the human will review and publish. Validated against the Forge schema; on success a draft card is shown. Call once the design is settled.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        ensLabel: { type: "string", description: `subname label under ${APP.ensDomain}` },
        description: { type: "string" },
        category: { type: "string", enum: ["Finance", "Community", "Agents", "Events", "Tools"] },
        outcome: { type: "string", description: 'plain English, starts with "You will …"' },
        components: {
          type: "array",
          description:
            "UI components. Types: amountInput {token, default, locked}, recipient {value: ens-or-address}, memoInput {default}, punchCard {total, reward, pointsPerDollar}, menu {currency, items:[{id,name,priceUsd,desc?}], pointsPerDollar?}, submitButton {label}. Must include submitButton.",
          items: { type: "object" },
        },
        permissions: {
          type: "object",
          properties: {
            plainEnglish: { type: "array", items: { type: "string" } },
            spendingCap: { type: "string" },
            requiresWorldId: { type: "boolean" },
            worldPolicy: { type: "string" },
          },
          required: ["plainEnglish"],
        },
        workflow: {
          type: "object",
          properties: { steps: { type: "array", items: { type: "object" } } },
          required: ["steps"],
        },
      },
      required: ["name", "ensLabel", "description", "outcome", "components", "permissions", "workflow"],
    },
  },
] as const;

const SYSTEM_PROMPT = `You are Forge's design agent, inside World App. Users describe an everyday mini-app; you design it as a schema-validated manifest that runs inside Forge. Each published app gets an ENS subname under ${APP.ensDomain}, its manifest is stored on Walrus, and only verified humans can run or claim it.

Skills (each maps to a component pattern):
- Payments / dues: amountInput + recipient + memoInput + submitButton; settles in the user's World wallet on World Chain; set requiresWorldId for one-per-human.
- Loyalty / rewards: punchCard {total, reward, pointsPerDollar} + payment components; one card per human (worldPolicy "one-card-per-human").
- Ordering: menu {currency, items} + recipient + submitButton; the cart is the amount.
- Voting / claims / RSVPs: no spend; submitButton; requiresWorldId true, spendingCap "$0.00".

Hard rules:
- Payments are in the World wallet; never mention bridges or other chains.
- State the outcome before details. Permissions are 1-5 plain-English lines, never raw addresses.
- You draft and check names only. You CANNOT spend or publish - the human confirms those.

Method: ask at most one short clarifying question only if essential; otherwise check_ens_subname for a short label, then call draft_dapp_manifest, then reply with one short sentence that the app is ready to review below. To EDIT an existing Spark, call get_current_draft first, then re-call draft_dapp_manifest with the FULL updated manifest (all fields, not just the change). Keep replies short and friendly. No markdown headers.`;

async function runTool(name: string, input: Record<string, unknown>, currentDraft: DappManifest | null): Promise<string> {
  if (name === "get_current_draft") {
    return JSON.stringify(currentDraft ? { draft: currentDraft } : { draft: null, note: "No Spark drafted yet." });
  }
  if (name === "check_ens_subname") {
    const label = String(input.label ?? "").toLowerCase();
    const taken =
      SEED_APPS.some((a) => a.ensName.startsWith(label + ".")) ||
      !!(await resolveAddress(`${label}.${APP.ensDomain}`));
    return JSON.stringify({ label, ensName: `${label}.${APP.ensDomain}`, available: !taken });
  }
  if (name === "draft_dapp_manifest") {
    const v = validateManifest(input);
    if (!v.ok) return JSON.stringify({ ok: false, errors: v.errors });
    return JSON.stringify({ ok: true, ensName: v.manifest.ensName, warnings: v.warnings });
  }
  return JSON.stringify({ error: `unknown tool ${name}` });
}

async function callAnthropic(messages: ApiMessage[]): Promise<{ content: ContentBlock[]; stop_reason: string }> {
  const res = await fetch(messagesUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 2048, system: SYSTEM_PROMPT, tools: TOOLS, messages }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as { content: ContentBlock[]; stop_reason: string };
}

/** Run one user turn. Returns the updated history, the assistant text, and any draft. */
export async function runAgentTurn(
  history: ApiMessage[],
  userText: string,
  creator: string,
  currentDraft: DappManifest | null = null
): Promise<AgentTurn> {
  if (!hasAgentCreds()) {
    const draft = templateManifest(userText, creator) ?? currentDraft;
    return {
      history,
      text: "Drafted with the built-in template engine (add a Claude API key or Claude Code to unlock the full agent). Review the app below.",
      draft,
      source: "template",
    };
  }

  const convo: ApiMessage[] = [...history, { role: "user", content: userText }];
  let draft: DappManifest | null = currentDraft;
  let text = "";

  for (let turn = 0; turn < 8; turn++) {
    const reply = await callAnthropic(convo);
    convo.push({ role: "assistant", content: reply.content });

    text = reply.content
      .filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const toolUses = reply.content.filter(
      (b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use"
    );
    if (reply.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const results: ContentBlock[] = [];
    for (const use of toolUses) {
      const output = await runTool(use.name, use.input, currentDraft).catch((e) => JSON.stringify({ error: String(e) }));
      results.push({ type: "tool_result", tool_use_id: use.id, content: output });
      if (use.name === "draft_dapp_manifest") {
        const v = validateManifest(use.input, creator);
        if (v.ok) draft = v.manifest;
      }
    }
    convo.push({ role: "user", content: results });
  }

  return { history: convo, text, draft, source: hasDirectKey() ? "Claude API" : "Claude Code" };
}

/** Deterministic fallback so the loop works with no model credential. */
function templateManifest(prompt: string, creator: string): DappManifest | null {
  const amount = prompt.match(/\$\s*(\d+(?:\.\d+)?)/)?.[1] ?? "5";
  const recipient = prompt.match(/\b([a-z0-9-]+\.eth)\b/i)?.[1]?.toLowerCase() ?? `treasury.${APP.ensDomain}`;
  const loyalty = /loyal|stamp|punch|reward|coffee|cafe|caf\u00e9/i.test(prompt);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: any[] = [
    { type: "amountInput", token: "USDC", default: amount, locked: true },
    { type: "recipient", value: recipient },
  ];
  if (loyalty) components.push({ type: "punchCard", total: 10, reward: "Free item", pointsPerDollar: 100 });
  components.push({ type: "submitButton", label: "Pay" });
  const v = validateManifest(
    {
      name: loyalty ? "Loyalty Card" : "Collect Payment",
      ensLabel: loyalty ? "loyalty" : "collect",
      description: prompt.slice(0, 120),
      category: loyalty ? "Community" : "Finance",
      outcome: `You will pay $${amount}.`,
      components,
      permissions: {
        plainEnglish: ["Read your wallet balance", "Send one USDC payment"],
        spendingCap: `${amount} USDC`,
        requiresWorldId: true,
        worldPolicy: loyalty ? "one-card-per-human" : "one-payment-per-human",
      },
      workflow: {
        steps: [
          { label: "Confirm the payment", detail: "From your World wallet" },
          { label: "Settle on World Chain", detail: "A single payment" },
        ],
      },
    },
    creator
  );
  return v.ok ? v.manifest : null;
}
