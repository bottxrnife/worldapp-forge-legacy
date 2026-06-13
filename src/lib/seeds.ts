import { APP } from "./config";
import type { DappManifest, ManifestComponent } from "./types";

const d = APP.ensDomain;

type Seed = {
  label: string;
  name: string;
  description: string;
  category: string;
  amount?: string;
  recipient?: string;
  memo?: string;
  punch?: { total: number; reward: string; pointsPerDollar: number };
  menu?: { currency: string; items: { id: string; name: string; priceUsd: number; desc?: string }[]; pointsPerDollar?: number };
  worldId?: boolean;
  policy?: string;
  cap?: string;
  perms: string[];
  outcome: string;
  submit: string;
  steps: [string, string][];
};

function build(s: Seed): DappManifest {
  const components: ManifestComponent[] = [];
  if (s.menu) components.push({ type: "menu", currency: s.menu.currency, items: s.menu.items, pointsPerDollar: s.menu.pointsPerDollar });
  if (s.amount) components.push({ type: "amountInput", token: "USDC", default: s.amount, locked: true });
  if (s.recipient) components.push({ type: "recipient", value: s.recipient });
  if (s.memo) components.push({ type: "memoInput", default: s.memo });
  if (s.punch) components.push({ type: "punchCard", total: s.punch.total, reward: s.punch.reward, pointsPerDollar: s.punch.pointsPerDollar });
  components.push({ type: "submitButton", label: s.submit });
  return {
    name: s.name,
    ensName: `${s.label}.${d}`,
    creator: "forge",
    description: s.description,
    category: s.category,
    components,
    outcome: s.outcome,
    permissions: {
      plainEnglish: s.perms,
      spendingCap: s.cap ?? (s.amount ? `${s.amount} USDC` : "$0.00"),
      requiresConfirmation: true,
      requiresWorldId: !!s.worldId,
      worldPolicy: s.policy,
    },
    workflow: {
      provider: "World Chain",
      flowId: `flow_${s.label}`,
      steps: s.steps.map(([label, detail], i) => ({ id: `s${i}`, label, detail })),
    },
    version: "1.0.0",
  };
}

export const SEED_APPS: DappManifest[] = [
  build({
    label: "dues",
    name: "Team Dues",
    description: "Collect a fixed contribution from verified teammates and mark them paid.",
    category: "Finance",
    amount: "5",
    recipient: `treasury.${d}`,
    memo: "June dues",
    worldId: true,
    policy: "one-payment-per-human",
    perms: ["Read your wallet balance", "Send one USDC payment", "Save your proof of joining"],
    outcome: "You will pay $5 and join the team.",
    submit: "Pay and join",
    steps: [
      ["Confirm $5 from your World wallet", "You approve before anything sends"],
      ["Settle to the team treasury", "A single payment on World Chain"],
      ["Mark you as paid", "Saved to the member list"],
    ],
  }),
  build({
    label: "cafe",
    name: "Cafe Punch Card",
    description: "Earn a stamp on every visit. Ten stamps gets a free coffee.",
    category: "Community",
    amount: "4",
    recipient: `cafe-treasury.${d}`,
    punch: { total: 10, reward: "Free coffee", pointsPerDollar: 100 },
    worldId: true,
    policy: "one-card-per-human",
    perms: ["Read your wallet balance", "Send one USDC payment", "Track your loyalty stamps"],
    outcome: "You will pay $4 and earn a stamp.",
    submit: "Buy and stamp",
    steps: [
      ["Pay for your coffee", "From your World wallet"],
      ["Stamp your card", "One stamp per visit, one card per human"],
    ],
  }),
  build({
    label: "split",
    name: "Split the Bill",
    description: "Everyone pays their equal share into one pot.",
    category: "Finance",
    amount: "12",
    recipient: `group.${d}`,
    memo: "Dinner",
    perms: ["Read your wallet balance", "Send one USDC payment"],
    outcome: "You will pay $12 toward the group bill.",
    submit: "Pay my share",
    steps: [
      ["Confirm your share", "From your World wallet"],
      ["Settle to the group pot", "A single payment"],
    ],
  }),
  build({
    label: "vote",
    name: "DAO Vote",
    description: "One verified human, one vote. No tokens, no sybils.",
    category: "Community",
    worldId: true,
    policy: "one-vote-per-human",
    perms: ["Check you are a unique human", "Record your single vote"],
    outcome: "You will cast one vote.",
    submit: "Cast my vote",
    steps: [
      ["Verify you are human", "World ID, nothing else shared"],
      ["Record your vote", "One per human"],
    ],
  }),
  build({
    label: "raffle",
    name: "Community Raffle",
    description: "Enter a fair raffle. One entry per human.",
    category: "Events",
    worldId: true,
    policy: "one-entry-per-human",
    perms: ["Check you are a unique human", "Record your entry"],
    outcome: "You will enter the raffle once.",
    submit: "Enter raffle",
    steps: [
      ["Verify you are human", "Keeps the draw fair"],
      ["Add your entry", "One per human"],
    ],
  }),
  build({
    label: "tipjar",
    name: "Tip Jar",
    description: "Leave a tip for a creator or barista.",
    category: "Finance",
    amount: "2",
    recipient: `creator.${d}`,
    perms: ["Read your wallet balance", "Send one USDC tip"],
    outcome: "You will tip $2.",
    submit: "Leave a tip",
    steps: [
      ["Confirm the tip", "From your World wallet"],
      ["Send to the creator", "A single payment"],
    ],
  }),
  build({
    label: "bistro",
    name: "Corner Bistro",
    description: "Order ahead, pay in-app, and earn points on every order.",
    category: "Community",
    recipient: `bistro-treasury.${d}`,
    menu: {
      currency: "USDC",
      pointsPerDollar: 100,
      items: [
        { id: "burger", name: "Smash Burger", priceUsd: 9, desc: "Double patty, house sauce" },
        { id: "fries", name: "Fries", priceUsd: 4 },
        { id: "shake", name: "Milkshake", priceUsd: 6, desc: "Vanilla or chocolate" },
        { id: "salad", name: "Garden Salad", priceUsd: 7 },
      ],
    },
    perms: ["Read your wallet balance", "Pay your order total", "Earn loyalty points"],
    outcome: "You will pay your order total and earn points.",
    submit: "Pay order",
    steps: [
      ["Build your cart", "Pick items and quantities"],
      ["Pay the total", "From your World wallet"],
      ["Earn points", "100 points per $1"],
    ],
  }),
  build({
    label: "rsvp",
    name: "Event RSVP",
    description: "Claim one ticket per human for an event.",
    category: "Events",
    worldId: true,
    policy: "one-claim-per-human",
    perms: ["Check you are a unique human", "Issue your ticket"],
    outcome: "You will claim one ticket.",
    submit: "Claim my ticket",
    steps: [
      ["Verify you are human", "One ticket per person"],
      ["Issue your ticket", "Show it at the door"],
    ],
  }),
];
