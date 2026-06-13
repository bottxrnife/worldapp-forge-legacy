/**
 * identity_service — ENS via viem (sponsor track: ENS).
 *
 * Pure ENS, no third-party subname service. All resolution starts from L1
 * (mainnet, chainId 1) and flows through the ENS **Universal Resolver**
 * (`0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe`, the canonical entry point per
 * the ENS docs) — viem ≥2 targets it automatically, which also makes us ENSv2-
 * and CCIP-Read-ready (offchain/L2 subnames resolve transparently). We use:
 *   - forward resolution (name → address)            getEnsAddress
 *   - reverse / primary name (address → name)         getEnsName
 *   - text records (ENSIP-5)                           getEnsText
 *   - avatars (ENSIP-12)                               getEnsAvatar
 *   - agent identity (ENSIP-25 registry + ENSIP-26 `agent-context` /
 *     `agent-endpoint[<protocol>]` records) for the in-app design agent.
 * Reads need no API key; every call degrades to null on miss/failure.
 */
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { DappManifest } from '../types';
import { ENV } from './env';

// ENS resolution is always L1 — the Universal Resolver on mainnet (chainId 1).
const client = createPublicClient({ chain: mainnet, transport: http(ENV.rpcUrl) });

/** Forward resolution: ENS name → address. Null on miss/failure. */
export async function resolveAddress(name: string): Promise<string | null> {
  try {
    return await client.getEnsAddress({ name: normalize(name) });
  } catch {
    return null;
  }
}

/** Reverse resolution: address → its primary ENS name (the identity layer). */
export async function lookupAddress(address: string): Promise<string | null> {
  try {
    return await client.getEnsName({ address: address as `0x${string}` });
  } catch {
    return null;
  }
}

/** Read an ENS text record (ENSIP-5; agent records ENSIP-26). */
export async function getTextRecord(name: string, key: string): Promise<string | null> {
  try {
    return await client.getEnsText({ name: normalize(name), key });
  } catch {
    return null;
  }
}

/** Resolve an ENS avatar URI for a name. */
export async function getAvatar(name: string): Promise<string | null> {
  try {
    return await client.getEnsAvatar({ name: normalize(name) });
  } catch {
    return null;
  }
}

/** Compact ENS identity for an address: primary name + avatar. */
export async function getEnsProfile(
  address: string
): Promise<{ name: string | null; avatar: string | null }> {
  const name = await lookupAddress(address);
  const avatar = name ? await getAvatar(name) : null;
  return { name, avatar };
}

// ---------------------------------------------------------------------------
// ENSIP-26: Agent Text Records  (https://docs.ens.domains/ensip/26)
//
// An ENS name is a single, multichain identity for an AI agent. `agent-context`
// is the entry point describing the agent and how to reach it; it may reference
// an ENSIP-25 agent registry or `agent-endpoint[<protocol>]` records (MCP, A2A,
// …). DappDock's design agent has the identity `assistant.agent.<ENS_DOMAIN>`,
// so these helpers read its identity straight from real text records — no
// hard-coded values, resolved through the mainnet Universal Resolver.
// ---------------------------------------------------------------------------

/** ENSIP-26 entry-point record key. */
export const AGENT_CONTEXT_KEY = 'agent-context';

/** ENSIP-26 endpoint record key for a protocol, e.g. `agent-endpoint[mcp]`. */
export const agentEndpointKey = (protocol: string) => `agent-endpoint[${protocol.toLowerCase()}]`;

/** Read an agent's ENSIP-26 `agent-context` record (its self-description). */
export async function getAgentContext(name: string): Promise<string | null> {
  return getTextRecord(name, AGENT_CONTEXT_KEY);
}

/** Read an agent's ENSIP-26 `agent-endpoint[<protocol>]` record. */
export async function getAgentEndpoint(name: string, protocol: string): Promise<string | null> {
  return getTextRecord(name, agentEndpointKey(protocol));
}

export type AgentProfile = {
  name: string;
  address: string | null;
  context: string | null;
  endpoints: { mcp: string | null; a2a: string | null };
  /** True when the name resolves on mainnet (a real, registered agent identity). */
  verified: boolean;
};

/**
 * ENSIP-26 discovery for an agent name: resolve its address, `agent-context`,
 * and its advertised protocol endpoints in one shot. Used to surface the
 * design agent's verifiable on-chain identity (vs. a cosmetic label).
 */
export async function getAgentProfile(name: string): Promise<AgentProfile> {
  const [address, context, mcp, a2a] = await Promise.all([
    resolveAddress(name),
    getAgentContext(name),
    getAgentEndpoint(name, 'mcp'),
    getAgentEndpoint(name, 'a2a'),
  ]);
  return { name, address, context, endpoints: { mcp, a2a }, verified: !!address };
}

export type PublishResult = {
  ensName: string;
  live: boolean; // true when the ENS name already resolves on-chain (registered)
  textRecords: Record<string, string>;
};

/** The ENS text records that describe a published dapp (read by Detail/Store). */
export function manifestTextRecords(manifest: DappManifest): Record<string, string> {
  return {
    'dapp.manifest': JSON.stringify(manifest),
    'dapp.category': manifest.category,
    'dapp.version': manifest.version,
    'world.policy': manifest.permissions.worldPolicy ?? '',
    'lifi.flow': manifest.workflow.flowId,
    description: manifest.description,
  };
}

/**
 * Assign the dapp its ENS identity (`label.<ensDomain>`) and the text records
 * that describe it. Real subname registration is an on-chain action via an ENS
 * registrar / L2 subname registry (out of scope for the in-app burner wallet),
 * so we don't write through any third-party service. `live` is true only when
 * the name already resolves on mainnet (i.e. it has been registered for real).
 */
export async function publishSubname(manifest: DappManifest): Promise<PublishResult> {
  const label = manifest.ensName.split('.')[0];
  const ensName = `${label}.${ENV.ensDomain}`;
  const textRecords = manifestTextRecords(manifest);
  const existing = await resolveAddress(ensName);
  return { ensName, live: !!existing, textRecords };
}
