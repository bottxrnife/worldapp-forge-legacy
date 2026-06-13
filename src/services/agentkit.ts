/**
 * agentkit_service — the app's client view of the World AgentKit backend
 * (sponsor: World — Track A).
 *
 * The real AgentKit SDK + the x402 resource server live in `server/agentkit`
 * (Node). The RN app talks to that server over plain HTTP — the SDK is never
 * bundled into Hermes. We read the free-trial status and let the user trigger a
 * human-backed agent call (which burns a free-trial use when the agent address
 * is registered in AgentBook, else returns x402 payment-required).
 *
 * Everything degrades to a clearly-labeled simulated status when the server
 * isn't running, so the screen never dead-ends.
 */
import { ENV } from './env';

export type AgentKitStatus = {
  reachable: boolean;
  mode: string;
  freeUses: number;
  networks: string[];
  price: string;
  simulated?: boolean;
};

const FALLBACK: AgentKitStatus = {
  reachable: false,
  mode: 'free-trial',
  freeUses: 3,
  networks: ['World Chain', 'Base'],
  price: '$0.01',
  simulated: true,
};

async function withTimeout(path: string, ms = 5000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(`${ENV.agentkitUrl}${path}`, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Read the AgentKit free-trial config from the resource server's public /status. */
export async function getAgentKitStatus(): Promise<AgentKitStatus> {
  try {
    const res = await withTimeout('/status');
    if (!res.ok) return FALLBACK;
    const body = (await res.json()) as Partial<AgentKitStatus>;
    return {
      reachable: true,
      mode: body.mode ?? 'free-trial',
      freeUses: body.freeUses ?? 3,
      networks: body.networks ?? ['World Chain', 'Base'],
      price: body.price ?? '$0.01',
    };
  } catch {
    return FALLBACK;
  }
}

export type AgentRunResult = {
  ok: boolean;
  status: number;
  /** 'unlocked' (free-trial / paid), 'payment' (402 — register the agent), or 'offline'. */
  outcome: 'unlocked' | 'payment' | 'offline';
  detail: string;
};

/**
 * Trigger the human-backed agent capability (the x402-protected endpoint). A
 * 200 means a free-trial use (or payment) succeeded; a 402 means the agent
 * isn't registered as human-backed yet (register via the AgentKit CLI).
 */
export async function runHumanBackedTask(): Promise<AgentRunResult> {
  try {
    const res = await withTimeout('/agent/premium', 9000);
    if (res.ok) {
      return { ok: true, status: res.status, outcome: 'unlocked', detail: 'Premium agent capability unlocked.' };
    }
    if (res.status === 402) {
      return {
        ok: false,
        status: 402,
        outcome: 'payment',
        detail: 'Agent not registered as human-backed yet — register it in AgentBook to unlock the free trial.',
      };
    }
    return { ok: false, status: res.status, outcome: 'payment', detail: `Request failed (${res.status}).` };
  } catch {
    return { ok: false, status: 0, outcome: 'offline', detail: 'AgentKit server not reachable.' };
  }
}
