/**
 * World AgentKit resource server (sponsor: World — Track A / AgentKit).
 *
 * A paid x402 API endpoint (`GET /agent/premium`) protected by AgentKit's
 * **free-trial** mode: an agent that is registered in AgentBook as *human-backed*
 * (via World ID) gets N free calls before the normal x402 payment flow resumes.
 * This is the Track A pattern — "unlock free trials for agents and free access
 * to initial usage", letting Human-Backed Agents operate.
 *
 * In DappDock the design agent (assistant.agent.<domain>) is the human-backed
 * agent; this endpoint is a "premium agent capability" (e.g. a richer template /
 * market lookup) it can call for free on its trial, then pay-per-use after.
 *
 * Run:
 *   AGENT_PAYTO=0xYourTreasury node server/agentkit/resource-server.mjs
 * Register the agent first (one-time, prompts World App):
 *   npx @worldcoin/agentkit-cli register <agent-address>
 */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { HTTPFacilitatorClient } from '@x402/core/http';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import {
  paymentMiddlewareFromHTTPServer,
  x402HTTPResourceServer,
  x402ResourceServer,
} from '@x402/hono';
import {
  agentkitResourceServerExtension,
  createAgentBookVerifier,
  createAgentkitHooks,
  declareAgentkitExtension,
  InMemoryAgentKitStorage,
} from '@worldcoin/agentkit';

const WORLD_CHAIN = 'eip155:480';
const BASE = 'eip155:8453';
const WORLD_USDC = '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1';

const PORT = Number(process.env.AGENTKIT_PORT ?? 4021);
const FREE_USES = Number(process.env.AGENTKIT_FREE_USES ?? 3);
const payTo = process.env.AGENT_PAYTO ?? '0x000000000000000000000000000000000000dEaD';

const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.X402_FACILITATOR ?? 'https://x402-worldchain.vercel.app/facilitator',
});

// Accept USDC on World Chain (+ Base via the default scheme).
const evmScheme = new ExactEvmScheme().registerMoneyParser(async (amount, network) => {
  if (network !== WORLD_CHAIN) return null;
  return {
    amount: String(Math.round(amount * 1e6)),
    asset: WORLD_USDC,
    extra: { name: 'USD Coin', version: '2' },
  };
});

const agentBook = createAgentBookVerifier();
const storage = new InMemoryAgentKitStorage();
const hooks = createAgentkitHooks({
  agentBook,
  storage,
  mode: { type: 'free-trial', uses: FREE_USES },
});

const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(WORLD_CHAIN, evmScheme)
  .register(BASE, new ExactEvmScheme())
  .registerExtension(agentkitResourceServerExtension);

const routes = {
  'GET /agent/premium': {
    accepts: [
      { scheme: 'exact', price: '$0.01', network: WORLD_CHAIN, payTo },
      { scheme: 'exact', price: '$0.01', network: BASE, payTo },
    ],
    extensions: declareAgentkitExtension({
      statement: 'Verify your agent is backed by a real human',
      mode: { type: 'free-trial', uses: FREE_USES },
    }),
  },
};

const httpServer = new x402HTTPResourceServer(resourceServer, routes).onProtectedRequest(
  hooks.requestHook
);

const app = new Hono();

// CORS so the Expo app can read the public status.
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Headers', '*');
  if (c.req.method === 'OPTIONS') return c.body(null, 204);
  await next();
});

// Public, unprotected endpoints for the mobile app (no x402).
app.get('/health', (c) => c.json({ ok: true }));
app.get('/status', (c) =>
  c.json({
    service: 'dappdock-agentkit',
    mode: 'free-trial',
    freeUses: FREE_USES,
    networks: ['World Chain', 'Base'],
    price: '$0.01',
    payTo,
  })
);

// Protected by AgentKit free-trial + x402 payment.
app.use(paymentMiddlewareFromHTTPServer(httpServer));
app.get('/agent/premium', (c) =>
  c.json({ message: 'Premium agent capability unlocked.', ts: Date.now() })
);

serve({ fetch: app.fetch, port: PORT });
console.log(
  `AgentKit resource server on :${PORT}  (free-trial ${FREE_USES} uses · payTo=${payTo})`
);
console.log(`  public:    GET http://localhost:${PORT}/status`);
console.log(`  protected: GET http://localhost:${PORT}/agent/premium  (AgentKit free-trial → x402)`);
