/**
 * Built-in sample Sparks. These are the showcase apps that ship with Forge so
 * the catalog, runtime, loyalty, and ordering are populated out of the box.
 */
import { APP } from "./config";
import type { DappManifest, ManifestComponent } from "./types";

const d = APP.ensDomain;
const ens = (label: string) => `${label}.${d}`;

type Stats = { rating: number; runs: number; reviews: number };

type Base = {
  label: string;
  name: string;
  tagline: string;
  description: string;
  category: "Finance" | "Community" | "Agents" | "Events" | "Tools";
  secondary?: Base["category"];
  outcome: string;
  perms: string[];
  cap?: string;
  worldId?: boolean;
  policy?: string;
  submit: string;
  steps: [string, string][];
  featured?: boolean;
  creator?: string;
  stats: Stats;
};

function compose(b: Base, components: ManifestComponent[], cap: string): DappManifest {
  return {
    name: b.name,
    ensName: ens(b.label),
    creator: b.creator ?? `${b.label}.creator.${d}`,
    description: b.description,
    category: b.category,
    secondaryCategory: b.secondary,
    components,
    outcome: b.outcome,
    permissions: {
      plainEnglish: b.perms,
      spendingCap: b.cap ?? cap,
      requiresConfirmation: true,
      requiresWorldId: !!b.worldId,
      worldPolicy: b.policy,
    },
    workflow: {
      provider: "World Chain",
      flowId: `flow_${b.label}`,
      steps: b.steps.map(([label, detail], i) => ({ id: `s${i}`, label, detail })),
    },
    tagline: b.tagline,
    featured: b.featured,
    stats: b.stats,
    version: "1.0.0",
  };
}

function pay(
  b: Base,
  o: { amount: string; recipient: string; memo?: string; locked?: boolean },
  extras: ManifestComponent[] = [],
): DappManifest {
  const c: ManifestComponent[] = [
    ...extras,
    { type: "amountInput", token: "USDC", default: o.amount, locked: o.locked },
    { type: "recipient", value: o.recipient },
  ];
  if (o.memo !== undefined) c.push({ type: "memoInput", default: o.memo });
  c.push({ type: "submitButton", label: b.submit });
  return compose(b, c, `${o.amount} USDC`);
}

function claim(b: Base, extras: ManifestComponent[] = []): DappManifest {
  return compose(b, [...extras, { type: "submitButton", label: b.submit }], b.cap ?? "$0.00");
}

function punchApp(
  b: Base,
  o: { amount: string; recipient: string; total: number; reward: string; ppd: number; memo?: string },
  extras: ManifestComponent[] = [],
): DappManifest {
  const c: ManifestComponent[] = [
    ...extras,
    { type: "punchCard", total: o.total, reward: o.reward, pointsPerDollar: o.ppd },
    { type: "amountInput", token: "USDC", default: o.amount, locked: true },
    { type: "recipient", value: o.recipient },
  ];
  if (o.memo) c.push({ type: "memoInput", default: o.memo });
  c.push({ type: "submitButton", label: b.submit });
  return compose(b, c, `${o.amount} USDC`);
}

function menuApp(
  b: Base,
  o: { recipient: string; ppd: number; items: { id: string; name: string; priceUsd: number; desc?: string; tag?: string }[] },
): DappManifest {
  const c: ManifestComponent[] = [
    { type: "menu", currency: "USDC", pointsPerDollar: o.ppd, items: o.items },
    { type: "recipient", value: o.recipient },
    { type: "submitButton", label: b.submit },
  ];
  return compose(b, c, b.cap ?? "80 USDC");
}

export const SEED_APPS: DappManifest[] = [
  // ── Finance ────────────────────────────────────────────────────────────
  pay(
    {
      label: "dues",
      name: "Team Dues",
      tagline: "Collect dues from verified teammates",
      description:
        "Collect a fixed contribution from verified teammates, settle it to a shared treasury, and mark each member as paid.",
      category: "Finance",
      secondary: "Community",
      outcome: "You will pay $5 and join the team.",
      perms: ["Read your wallet balance", "Send one USDC payment", "Save your proof of joining"],
      worldId: true,
      policy: "one-payment-per-human",
      submit: "Pay & join",
      featured: true,
      creator: "william.eth",
      stats: { rating: 4.9, runs: 128, reviews: 42 },
      steps: [
        ["Confirm $5 from your World wallet", "You approve before anything sends"],
        ["Settle to the team treasury", "A single payment on World Chain"],
        ["Mark you as paid", "Saved to the member list"],
      ],
    },
    { amount: "5", recipient: ens("treasury"), memo: "June team dinner", locked: true },
    [
      {
        type: "infoCard",
        title: "Design Guild · June round",
        badge: "Team",
        lines: ["12 / 15 members paid", "Treasury: design-guild.treasury.eth", "Due by Jun 30"],
      },
    ],
  ),
  pay(
    {
      label: "split",
      name: "Split the Bill",
      tagline: "Everyone pays their share into one pot",
      description: "Split a shared bill in USDC — everyone pays their equal share into one group pot.",
      category: "Finance",
      outcome: "You will pay your share toward the group bill.",
      perms: ["Read your wallet balance", "Send one USDC payment"],
      submit: "Pay my share",
      stats: { rating: 4.8, runs: 412, reviews: 96 },
      steps: [
        ["Confirm your share", "From your World wallet"],
        ["Settle to the group pot", "A single payment on World Chain"],
      ],
    },
    { amount: "12", recipient: ens("group"), memo: "Dinner", locked: true },
    [
      {
        type: "infoCard",
        title: "Friday dinner · Ramen House",
        lines: ["Table 7 · 6:30 PM", "Bill total split evenly"],
      },
      { type: "splitBill", totalUsd: 72, defaultPeople: 6, label: "Split evenly" },
    ],
  ),
  pay(
    {
      label: "tipjar",
      name: "Coffee Tip Jar",
      tagline: "One-tap tips for your barista",
      description: "Leave a tip that lands straight in the barista's World wallet — pick an amount and tap.",
      category: "Finance",
      outcome: "You will leave a tip for the barista.",
      perms: ["Read your wallet balance", "Send one USDC tip"],
      submit: "Leave a tip",
      stats: { rating: 4.9, runs: 980, reviews: 144 },
      steps: [
        ["Pick a tip amount", "Any amount up to the cap"],
        ["Send to the barista", "A single payment on World Chain"],
      ],
    },
    { amount: "2", recipient: ens("barista"), memo: "Thanks!", locked: false },
    [{ type: "tipPresets", presets: [1, 2, 3, 5], label: "Quick tip" }],
  ),
  punchApp(
    {
      label: "burgerblock",
      name: "Burger Block Rewards",
      tagline: "Eat, stamp, earn — 10 = free burger",
      description:
        "Scan the counter, pay for your meal, and stamp your loyalty card. Ten stamps earns a free Classic Smash Burger, and every dollar earns points.",
      category: "Finance",
      secondary: "Community",
      outcome: "You will pay for your meal and collect one stamp.",
      perms: ["Read your wallet balance", "Send one USDC payment", "Stamp your card and add points"],
      worldId: true,
      policy: "one-card-per-human",
      submit: "Pay & stamp",
      featured: true,
      creator: "burgerblock.creator.eth",
      stats: { rating: 4.9, runs: 3120, reviews: 486 },
      steps: [
        ["Confirm $8 from your World wallet", "The kitchen gets your order"],
        ["Settle to Burger Block", "A single payment on World Chain"],
        ["Stamp your loyalty card", "+1 stamp and +800 points"],
      ],
    },
    { amount: "8", recipient: ens("burgerblock"), total: 10, reward: "Classic Smash Burger", ppd: 100, memo: "Combo #1" },
    [
      {
        type: "choiceGroup",
        key: "combo",
        label: "Pick your combo",
        pricesAmount: true,
        default: "classic",
        options: [
          { value: "classic", label: "Classic Smash combo", priceUsd: 8 },
          { value: "double", label: "Double Smash combo", priceUsd: 10 },
          { value: "veggie", label: "Veggie Block combo", priceUsd: 7 },
        ],
      },
    ],
  ),
  pay(
    {
      label: "unlock",
      name: "Article Unlock",
      tagline: "Micropay per article, no account",
      description: "Pay $0.50 to unlock a single article — no subscription, no account, settled instantly.",
      category: "Tools",
      outcome: "You will unlock the article instantly.",
      perms: ["Read your wallet balance", "Send one USDC micropayment"],
      submit: "Unlock for $0.50",
      stats: { rating: 4.4, runs: 4120, reviews: 520 },
      steps: [
        ["Confirm the article", "Title and price up front"],
        ["Settle to the newsroom", "A single payment on World Chain"],
        ["Unlock the article", "Read immediately"],
      ],
    },
    { amount: "0.5", recipient: ens("newsroom"), locked: true },
    [
      {
        type: "infoCard",
        title: "The Future of Human-Verified Apps",
        badge: "Premium",
        lines: [
          "8 min read · Tech",
          "World ID, ENS names, and schema-driven mini-apps are changing how humans interact with on-chain services…",
          "$0.50 to unlock the full article",
        ],
      },
    ],
  ),

  // ── Community ──────────────────────────────────────────────────────────
  menuApp(
    {
      label: "bistro",
      name: "Corner Bistro — Order & Pay",
      tagline: "Order in-app, pay, earn points",
      description:
        "Open the menu, build your order, and pay the total in your World wallet — the kitchen is notified instantly and you earn 100 points per $1 to redeem for rewards.",
      category: "Community",
      secondary: "Finance",
      outcome: "You will pay your order total and the kitchen starts preparing it.",
      perms: ["Read your wallet balance", "Pay your order total", "Send your order to the kitchen and add points"],
      cap: "80 USDC",
      submit: "Place order & pay",
      featured: true,
      creator: "cornerbistro.creator.eth",
      stats: { rating: 4.8, runs: 1740, reviews: 263 },
      steps: [
        ["Confirm your order", "Your cart and total, up front"],
        ["Pay the total", "A single payment on World Chain"],
        ["Notify the kitchen & add points", "Order in, 100 pts per $1 saved"],
      ],
    },
    {
      recipient: ens("bistro"),
      ppd: 100,
      items: [
        { id: "smash", name: "Signature Smash Burger", priceUsd: 11, desc: "Double patty, house sauce", tag: "Mains" },
        { id: "chicken", name: "Crispy Chicken Sandwich", priceUsd: 10, desc: "Buttermilk-fried, pickles", tag: "Mains" },
        { id: "veg", name: "Garden Halloumi Wrap", priceUsd: 9, desc: "Grilled halloumi, slaw", tag: "Mains" },
        { id: "fries", name: "Truffle Fries", priceUsd: 5, desc: "Parmesan, herbs", tag: "Sides" },
        { id: "rings", name: "Onion Rings", priceUsd: 4.5, tag: "Sides" },
        { id: "shake", name: "Salted Caramel Shake", priceUsd: 6, tag: "Drinks" },
        { id: "lemonade", name: "House Lemonade", priceUsd: 3.5, tag: "Drinks" },
        { id: "coffee", name: "Cold Brew", priceUsd: 4, tag: "Drinks" },
      ],
    },
  ),
  punchApp(
    {
      label: "beancounter",
      name: "Bean Counter Café",
      tagline: "Coffee loyalty — 8 cups = free latte",
      description:
        "Buy your coffee in USDC and stamp your card — 8 cups earns a free latte, and every dollar earns points toward rewards.",
      category: "Community",
      secondary: "Finance",
      outcome: "You will pay for your coffee and collect one stamp.",
      perms: ["Read your wallet balance", "Send one USDC payment", "Stamp your card and add points"],
      worldId: true,
      policy: "one-card-per-human",
      submit: "Pay & stamp",
      creator: "beancounter.creator.eth",
      stats: { rating: 4.8, runs: 920, reviews: 140 },
      steps: [
        ["Confirm $5 from your World wallet", "The barista is notified"],
        ["Settle to Bean Counter", "A single payment on World Chain"],
        ["Stamp your card", "+1 stamp and +500 points"],
      ],
    },
    { amount: "5", recipient: ens("beancounter"), total: 8, reward: "Latte", ppd: 100, memo: "Oat flat white" },
    [
      {
        type: "choiceGroup",
        key: "drink",
        label: "Your order",
        pricesAmount: true,
        default: "flat",
        options: [
          { value: "flat", label: "Oat flat white", priceUsd: 5 },
          { value: "cold", label: "Cold brew", priceUsd: 4 },
          { value: "matcha", label: "Iced matcha", priceUsd: 5.5 },
        ],
      },
    ],
  ),
  claim(
    {
      label: "daovote",
      name: "DAO Vote",
      tagline: "One verified human, one vote",
      description: "Launch a one-per-human vote in minutes. No tokens, no sybils — just verified humans.",
      category: "Community",
      outcome: "You will cast one vote. One vote per verified human.",
      perms: ["Check you are a unique human", "Record your single vote"],
      worldId: true,
      policy: "one-vote-per-human",
      submit: "Cast my vote",
      featured: true,
      creator: "govworks.creator.eth",
      stats: { rating: 4.7, runs: 980, reviews: 210 },
      steps: [
        ["Verify you are human", "World ID proof, nothing else shared"],
        ["Open the ballot", "Proposal loaded from ENS records"],
        ["Record your vote", "One vote per verified human"],
      ],
    },
    [
      {
        type: "infoCard",
        title: "Prop #12 · Fund the community garden",
        badge: "Active ballot",
        lines: ["Allocate $2,000 USDC from treasury", "Closes in 3 days · 847 votes cast"],
      },
      {
        type: "choiceGroup",
        key: "vote",
        label: "Your vote",
        options: [
          { value: "yes", label: "Yes — fund the garden" },
          { value: "no", label: "No — keep funds" },
          { value: "abstain", label: "Abstain" },
        ],
      },
    ],
  ),
  pay(
    {
      label: "savings",
      name: "Savings Circle",
      tagline: "Rotating savings, transparent payouts",
      description: "Contribute to a rotating savings circle; the pot pays out to one member each round.",
      category: "Community",
      outcome: "You will contribute this round's amount to the circle.",
      perms: ["Read your wallet balance", "Send one USDC contribution", "Record your contribution"],
      worldId: true,
      policy: "one-per-human-per-round",
      submit: "Contribute",
      creator: "rosca.creator.eth",
      stats: { rating: 4.7, runs: 215, reviews: 44 },
      steps: [
        ["Confirm this round", "Your share and the payout member"],
        ["Send your contribution", "A single payment on World Chain"],
        ["Record your contribution", "One per verified human"],
      ],
    },
    { amount: "20", recipient: ens("circle"), memo: "Round 3", locked: true },
    [{ type: "savingsRound", roundNumber: 3, payoutTo: "alex.eth", contributionUsd: 20, members: 8 }],
  ),
  pay(
    {
      label: "fundraise",
      name: "Community Fundraiser",
      tagline: "Transparent on-chain fundraising",
      description: "Raise funds for a shared goal; every contribution is tracked on-chain and added to the supporter wall.",
      category: "Community",
      outcome: "You will contribute to the goal and join the supporter wall.",
      perms: ["Read your wallet balance", "Send one USDC contribution", "Add you to the supporter wall"],
      worldId: true,
      policy: "one-per-human",
      submit: "Contribute",
      featured: true,
      creator: "mutualaid.creator.eth",
      stats: { rating: 4.6, runs: 530, reviews: 88 },
      steps: [
        ["Choose your contribution", "Any amount up to the cap"],
        ["Settle to the fund treasury", "A single payment on World Chain"],
        ["Join the supporter wall", "One entry per verified human"],
      ],
    },
    { amount: "10", recipient: ens("fund"), memo: "Mutual aid", locked: false },
    [
      {
        type: "infoCard",
        title: "Neighborhood mutual aid fund",
        lines: ["Emergency groceries & transit for verified neighbors"],
      },
      { type: "progressGoal", goalUsd: 5000, raisedUsd: 2840, supporters: 142, label: "Goal progress" },
      { type: "supporterWall", label: "Recent supporters", baseSupporters: 142 },
      {
        type: "tipPresets",
        presets: [5, 10, 25, 50],
        label: "Suggested contribution",
      },
    ],
  ),
  pay(
    {
      label: "members",
      name: "Club Membership Pass",
      tagline: "One membership per human, monthly",
      description: "Join the club: one verified membership per human, renewed monthly, unlocking member spaces.",
      category: "Community",
      outcome: "You will join the club and hold one membership pass.",
      perms: ["Check you are a unique human", "Send one USDC payment", "Issue your membership pass"],
      worldId: true,
      policy: "one-membership-per-human",
      submit: "Join the club",
      creator: "clubhouse.creator.eth",
      stats: { rating: 4.7, runs: 342, reviews: 67 },
      steps: [
        ["Verify you are human", "World ID proof, nothing else shared"],
        ["Pay the monthly dues", "A single payment on World Chain"],
        ["Issue your pass", "One membership per verified human"],
      ],
    },
    { amount: "15", recipient: ens("clubhouse"), locked: true },
    [
      {
        type: "membershipCard",
        tier: "Forge Creators Club",
        priceUsd: 15,
        benefits: ["Weekly coworking hours", "Member-only Spark demos", "Priority event RSVP", "Shared treasury voting"],
      },
    ],
  ),
  pay(
    {
      label: "roundup",
      name: "Charity Round-Up",
      tagline: "Round up, give the change",
      description: "Round up to a clean number and donate the difference to a verified cause.",
      category: "Community",
      outcome: "You will donate your chosen amount to the cause.",
      perms: ["Read your wallet balance", "Send one USDC donation", "Add you to the supporter wall"],
      worldId: true,
      policy: "one-per-human",
      submit: "Donate",
      creator: "givewell.creator.eth",
      stats: { rating: 4.7, runs: 410, reviews: 73 },
      steps: [
        ["Choose your donation", "Any amount up to the cap"],
        ["Settle to the cause", "A single payment on World Chain"],
        ["Join the supporter wall", "One entry per verified human"],
      ],
    },
    { amount: "0.57", recipient: ens("cause"), memo: "Spare-change round-up", locked: true },
    [
      {
        type: "infoCard",
        title: "Clean water initiative",
        lines: ["Your spare change funds verified wells in rural communities"],
      },
      { type: "roundUp", purchaseUsd: 7.43, label: "Round up from your $7.43 purchase" },
      { type: "progressGoal", goalUsd: 5000, raisedUsd: 1840, supporters: 90, label: "Wells funded" },
    ],
  ),

  // ── Agents ─────────────────────────────────────────────────────────────
  pay(
    {
      label: "agentmarket",
      name: "Research Agent Market",
      tagline: "Human-backed agent tools",
      description: "Hire a human-backed agent for one research task. Agents draft and simulate — you approve before anything settles.",
      category: "Agents",
      outcome: "You will hire a human-backed agent for one research task.",
      perms: ["Read your wallet balance", "Send one USDC payment", "Receive the agent's result"],
      submit: "Hire agent",
      featured: true,
      creator: "labs.creator.eth",
      stats: { rating: 4.6, runs: 233, reviews: 61 },
      steps: [
        ["Pick an agent", "Every agent has an ENS passport"],
        ["Fund the task", "A single payment on World Chain"],
        ["Approve the result", "You confirm before anything settles"],
      ],
    },
    { amount: "10", recipient: ens("agentmarket"), locked: false },
    [
      {
        type: "choiceGroup",
        key: "agent",
        label: "Choose an agent",
        pricesAmount: true,
        default: "atlas",
        options: [
          { value: "atlas", label: "Atlas Research", priceUsd: 10, ens: "atlas.agent.eth", rating: 4.8, runs: 1290 },
          { value: "scribe", label: "Scribe Digest", priceUsd: 8, ens: "scribe.agent.eth", rating: 4.6, runs: 880 },
          { value: "lens", label: "Lens Analyst", priceUsd: 12, ens: "lens.agent.eth", rating: 4.9, runs: 2110 },
        ],
      },
      {
        type: "textArea",
        key: "task",
        label: "What should the agent research?",
        placeholder: "e.g. Compare Walrus vs IPFS for mini-app manifests…",
        required: true,
      },
    ],
  ),
  pay(
    {
      label: "tripagent",
      name: "Trip Planner Agent",
      tagline: "Plan a trip with a human-backed agent",
      description: "Tell an agent where you're going; it drafts an itinerary and books nothing without your confirmation.",
      category: "Agents",
      outcome: "You will commission a trip itinerary from a human-backed agent.",
      perms: ["Read your wallet balance", "Send one USDC payment", "Receive your itinerary"],
      submit: "Plan my trip",
      creator: "wander.creator.eth",
      stats: { rating: 4.5, runs: 112, reviews: 29 },
      steps: [
        ["Describe your trip", "Dates, budget, vibe"],
        ["Fund the task", "A single payment on World Chain"],
        ["Review the itinerary", "You approve before anything books"],
      ],
    },
    { amount: "6", recipient: ens("wander"), locked: false },
    [
      {
        type: "choiceGroup",
        key: "vibe",
        label: "Trip style",
        pricesAmount: true,
        default: "food",
        options: [
          { value: "budget", label: "Budget explorer", priceUsd: 6 },
          { value: "food", label: "Food & culture", priceUsd: 8 },
          { value: "luxury", label: "Comfort first", priceUsd: 12 },
        ],
      },
      { type: "stepper", key: "nights", label: "Nights", min: 1, max: 14, default: 5, unit: "nights" },
      {
        type: "textArea",
        key: "brief",
        label: "Trip brief",
        placeholder: "Tokyo · 5 nights in May · love ramen and museums · $150/day budget",
        required: true,
      },
    ],
  ),

  // ── Events ─────────────────────────────────────────────────────────────
  claim(
    {
      label: "raffle",
      name: "Community Raffle",
      tagline: "One entry per verified human",
      description: "Enter a transparent raffle — one entry per verified human, winners picked fairly.",
      category: "Events",
      outcome: "You will enter the raffle once.",
      perms: ["Check you are a unique human", "Record your single entry"],
      worldId: true,
      policy: "one-entry-per-human",
      submit: "Enter raffle",
      creator: "fairdraw.creator.eth",
      stats: { rating: 4.6, runs: 1280, reviews: 190 },
      steps: [
        ["Verify you are human", "Keeps the draw fair"],
        ["Add your entry", "One per verified human"],
      ],
    },
    [
      {
        type: "infoCard",
        title: "Forge Launch Party raffle",
        badge: "Prize pool",
        lines: ["Grand prize: $500 USDC", "5 runner-up $50 gift cards", "2,340 verified entries"],
      },
      { type: "countdown", label: "Draw in", toIso: "2026-06-20T22:00:00Z" },
    ],
  ),
  claim(
    {
      label: "tickets",
      name: "Ticket Claim",
      tagline: "Claim your event pass",
      description: "Claim your event pass. One pass per verified human — show it at the door.",
      category: "Events",
      outcome: "You will claim one event pass. One per verified human.",
      perms: ["Check you are a unique human", "Mint your event pass"],
      worldId: true,
      policy: "one-claim-per-human",
      submit: "Claim my pass",
      creator: "eventworks.creator.eth",
      stats: { rating: 4.8, runs: 1502, reviews: 388 },
      steps: [
        ["Verify you are human", "One pass per person"],
        ["Issue your pass", "Show it at the door"],
      ],
    },
    [
      {
        type: "infoCard",
        title: "Forge Demo Day",
        badge: "Jun 14",
        lines: ["Brooklyn Navy Yard · Doors 6 PM", "Show your pass at check-in"],
      },
      {
        type: "choiceGroup",
        key: "tier",
        label: "Pass type",
        default: "ga",
        options: [
          { value: "ga", label: "General admission", hint: "Free" },
          { value: "vip", label: "VIP lounge", hint: "Invite only", locked: true },
          { value: "speaker", label: "Speaker badge", hint: "Verified", locked: true },
        ],
      },
      { type: "capacityBar", label: "Tickets claimed", capacity: 500, baseFilled: 437, unit: "claimed" },
      { type: "countdown", label: "Doors in", toIso: "2026-06-14T23:00:00Z" },
    ],
  ),
  claim(
    {
      label: "rsvp",
      name: "Event RSVP",
      tagline: "RSVP once, save your spot",
      description: "RSVP to an event — one spot per verified human, no double-booking.",
      category: "Events",
      outcome: "You will RSVP once and save your spot.",
      perms: ["Check you are a unique human", "Record your RSVP"],
      worldId: true,
      policy: "one-rsvp-per-human",
      submit: "RSVP",
      creator: "meetups.creator.eth",
      stats: { rating: 4.7, runs: 640, reviews: 121 },
      steps: [
        ["Verify you are human", "One spot per person"],
        ["Save your RSVP", "We'll hold your place"],
      ],
    },
    [
      {
        type: "infoCard",
        title: "World Mini-Apps Meetup",
        lines: ["Thu Jun 19 · 7 PM · SoHo"],
      },
      { type: "capacityBar", label: "Spots filled", capacity: 60, baseFilled: 48 },
      { type: "countdown", label: "Event in", toIso: "2026-06-19T23:00:00Z" },
      {
        type: "choiceGroup",
        key: "meal",
        label: "Dietary preference",
        options: [
          { value: "none", label: "No preference" },
          { value: "veg", label: "Vegetarian" },
          { value: "vegan", label: "Vegan" },
          { value: "gf", label: "Gluten-free" },
        ],
        default: "none",
      },
      { type: "stepper", key: "guests", label: "Plus-ones", min: 0, max: 2, default: 0, unit: "guests" },
    ],
  ),

  // ── Tools ──────────────────────────────────────────────────────────────
  pay(
    {
      label: "parking",
      name: "Parking Meter",
      tagline: "Pay by the hour",
      description: "Pay for parking by the hour — pick your zone and duration, pay from your World wallet.",
      category: "Tools",
      outcome: "You will pay for your parking session.",
      perms: ["Read your wallet balance", "Send one USDC payment"],
      submit: "Pay for parking",
      creator: "cityservices.creator.eth",
      stats: { rating: 4.5, runs: 760, reviews: 102 },
      steps: [
        ["Confirm zone and duration", "Price updates as you adjust time"],
        ["Pay the meter", "A single payment on World Chain"],
        ["Start your session", "Saved to your activity"],
      ],
    },
    { amount: "0.50", recipient: ens("cityparking"), locked: true },
    [
      {
        type: "choiceGroup",
        key: "zone",
        label: "Parking zone",
        options: [
          { value: "101", label: "Zone 101 · Main St", hint: "$2/hr", pricePerHourUsd: 2 },
          { value: "102", label: "Zone 102 · Market Sq", hint: "$2.50/hr", pricePerHourUsd: 2.5 },
          { value: "27", label: "Bay 27 · Lot C", hint: "$2/hr", pricePerHourUsd: 2 },
          { value: "204", label: "Zone 204 · Waterfront", hint: "$3/hr", pricePerHourUsd: 3 },
        ],
      },
      {
        type: "durationPicker",
        key: "duration",
        label: "Parking duration",
        minMinutes: 15,
        maxMinutes: 240,
        stepMinutes: 15,
        pricePerHourUsd: 2,
        defaultMinutes: 60,
      },
      { type: "textArea", key: "plate", label: "License plate", placeholder: "ABC 1234" },
    ],
  ),
  pay(
    {
      label: "transit",
      name: "Transit Top-Up",
      tagline: "Tap-to-ride top-ups",
      description: "Top up your transit pass in seconds — pay from your World wallet, tap to ride.",
      category: "Tools",
      outcome: "You will top up your transit balance.",
      perms: ["Read your wallet balance", "Send one USDC top-up", "Add credit to your pass"],
      submit: "Top up",
      creator: "metro.creator.eth",
      stats: { rating: 4.6, runs: 1340, reviews: 205 },
      steps: [
        ["Choose your top-up", "Pick an amount below"],
        ["Pay the transit authority", "A single payment on World Chain"],
        ["Add credit to your pass", "Tap to ride"],
      ],
    },
    { amount: "10", recipient: ens("metro"), locked: true },
    [{ type: "transitPass", balanceUsd: 4.5, presets: [5, 10, 20], label: "MetroCard", fareUsd: 2.9 }],
  ),
];

export type PointsReward = { ens: string; label: string; cost: number };

export const POINTS_REWARDS: PointsReward[] = [
  { ens: ens("bistro"), label: "Free truffle fries", cost: 1000 },
  { ens: ens("bistro"), label: "Free cold brew", cost: 900 },
  { ens: ens("bistro"), label: "Free salted caramel shake", cost: 1400 },
  { ens: ens("bistro"), label: "Free Signature Smash Burger", cost: 3500 },
  { ens: ens("burgerblock"), label: "$2 off your order", cost: 800 },
  { ens: ens("burgerblock"), label: "Free fries", cost: 1200 },
  { ens: ens("burgerblock"), label: "Free milkshake", cost: 2000 },
  { ens: ens("beancounter"), label: "Free latte", cost: 800 },
  { ens: ens("beancounter"), label: "Free pastry", cost: 1100 },
];
