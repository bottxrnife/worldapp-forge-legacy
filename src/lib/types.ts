/** The schema-driven contract the runtime renders. No arbitrary user code. */
export type WorkflowStep = { id: string; label: string; detail: string };

export type ManifestComponent =
  | { type: "amountInput"; token: string; default: string; locked?: boolean }
  | { type: "recipient"; value: string }
  | { type: "memoInput"; default: string }
  | { type: "punchCard"; total: number; reward: string; pointsPerDollar: number }
  | {
      type: "menu";
      currency: string;
      items: Array<{ id: string; name: string; priceUsd: number; desc?: string; tag?: string }>;
      pointsPerDollar?: number;
    }
  | { type: "submitButton"; label: string };

export type DappManifest = {
  name: string;
  ensName: string;
  creator: string;
  description: string;
  category: string;
  secondaryCategory?: string;
  components: ManifestComponent[];
  outcome: string;
  permissions: {
    plainEnglish: string[];
    spendingCap: string;
    requiresConfirmation: boolean;
    requiresWorldId: boolean;
    worldPolicy?: string;
  };
  workflow: { provider: string; flowId: string; steps: WorkflowStep[] };
  /** Where the canonical copy of this manifest + media lives (Walrus blob ids). */
  storage?: { manifestBlobId?: string; imageBlobId?: string };
  version: string;
};

export type ChatMessage = { role: "user" | "assistant"; text: string; card?: boolean };
