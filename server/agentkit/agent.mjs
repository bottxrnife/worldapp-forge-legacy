/**
 * Human-backed agent client (sponsor: World — Track A / AgentKit).
 *
 * Wraps the agent's HTTP calls with `createAgentkitClient` so requests to the
 * x402-protected endpoint present the agent's AgentBook registration first —
 * a registered, human-backed agent burns its free-trial uses before any payment
 * is attempted. This is the agent side of the Track A loop (the design agent
 * "operating" against a paid capability).
 *
 * Usage:
 *   AGENT_PRIVATE_KEY=0x... AGENTKIT_URL=http://localhost:4021 node server/agentkit/agent.mjs
 * If AGENT_PRIVATE_KEY is unset a throwaway key is generated (its address won't
 * be registered in AgentBook, so you'll see the x402 payment-required fallback —
 * register it with `npx @worldcoin/agentkit-cli register <address>` to unlock
 * the free trial).
 */
import { createAgentkitClient } from '@worldcoin/agentkit';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const URL = process.env.AGENTKIT_URL ?? 'http://localhost:4021';
const pk = process.env.AGENT_PRIVATE_KEY ?? generatePrivateKey();
const account = privateKeyToAccount(pk);

console.log(`Agent address: ${account.address}`);
console.log(`Calling ${URL}/agent/premium via AgentKit…`);

const agentkit = createAgentkitClient({
  signer: {
    address: account.address,
    chainId: 'eip155:8453',
    type: 'eip191',
    signMessage: (message) => account.signMessage({ message }),
  },
});

try {
  const res = await agentkit.fetch(`${URL}/agent/premium`);
  const body = await res.text();
  console.log(`→ ${res.status} ${res.statusText}`);
  console.log(body);
  if (res.status === 402) {
    console.log(
      '\n402 = payment required: this agent address is not registered as human-backed yet.\n' +
        'Register it to unlock the free trial:\n' +
        `  npx @worldcoin/agentkit-cli register ${account.address}`
    );
  }
} catch (e) {
  console.error('AgentKit call failed:', e);
  process.exit(1);
}
