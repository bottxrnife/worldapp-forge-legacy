import { APP } from "./config";
import type { DappManifest } from "./types";

const d = APP.ensDomain;

/** A few example manifests so the catalog isn't empty before real publishes. */
export const SEED_APPS: DappManifest[] = [
  {
    name: "Team Dues",
    ensName: `dues.${d}`,
    creator: "forge",
    description: "Collect a fixed contribution from verified teammates and mark them paid.",
    category: "Finance",
    components: [
      { type: "amountInput", token: "USDC", default: "5", locked: true },
      { type: "recipient", value: `treasury.${d}` },
      { type: "memoInput", default: "June dues" },
      { type: "submitButton", label: "Pay and mark me as joined" },
    ],
    outcome: "You will pay $5 and join the team.",
    permissions: {
      plainEnglish: ["Read your wallet balance", "Send one USDC payment", "Save your proof of joining"],
      spendingCap: "5 USDC",
      requiresConfirmation: true,
      requiresWorldId: true,
      worldPolicy: "one-payment-per-human",
    },
    workflow: {
      provider: "World Chain",
      flowId: "flow_dues",
      steps: [
        { id: "s0", label: "Confirm $5 from your World wallet", detail: "You approve before anything sends" },
        { id: "s1", label: "Settle to the team treasury", detail: "A single payment on World Chain" },
        { id: "s2", label: "Mark you as paid", detail: "Saved to the member list" },
      ],
    },
    version: "1.0.0",
  },
  {
    name: "Cafe Punch Card",
    ensName: `cafe.${d}`,
    creator: "forge",
    description: "Earn a stamp on every visit. Ten stamps gets a free coffee.",
    category: "Community",
    components: [
      { type: "amountInput", token: "USDC", default: "4", locked: true },
      { type: "recipient", value: `cafe-treasury.${d}` },
      { type: "punchCard", total: 10, reward: "Free coffee", pointsPerDollar: 100 },
      { type: "submitButton", label: "Buy and stamp my card" },
    ],
    outcome: "You will pay $4 and earn a stamp.",
    permissions: {
      plainEnglish: ["Read your wallet balance", "Send one USDC payment", "Track your loyalty stamps"],
      spendingCap: "4 USDC",
      requiresConfirmation: true,
      requiresWorldId: true,
      worldPolicy: "one-card-per-human",
    },
    workflow: {
      provider: "World Chain",
      flowId: "flow_cafe",
      steps: [
        { id: "s0", label: "Pay for your coffee", detail: "From your World wallet" },
        { id: "s1", label: "Stamp your card", detail: "One stamp per visit, one card per human" },
      ],
    },
    version: "1.0.0",
  },
];
