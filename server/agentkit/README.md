# World AgentKit service (Track A)

Real **AgentKit** integration for World **Track A** — a paid x402 API endpoint with a **human-backed free-trial**: an agent registered in AgentBook (as a real human via World ID) gets `N` free calls before the normal x402 payment flow resumes. This is the Track A pattern — *"unlock free trials for agents and free access to initial usage"*, letting Human-Backed Agents operate.

The AgentKit SDK runs **only here** (Node) — it is never bundled into the Expo/React Native app. The app talks to this server over plain HTTP (`src/services/agentkit.ts` → `EXPO_PUBLIC_AGENTKIT_URL`).

- `resource-server.mjs` — Hono + `@x402/*` + `@worldcoin/agentkit` `createAgentkitHooks({ mode: { type: 'free-trial', uses: 3 } })`. Public `/status` + `/health`; protected `GET /agent/premium`.
- `agent.mjs` — a human-backed agent client using `createAgentkitClient().fetch()`.

## Install & run

```bash
cd server/agentkit
npm install
AGENT_PAYTO=0xYourTreasury npm run server     # → :4021
```

Point the app at it (in the repo-root `.env`, restart Expo with `-c`):

```bash
EXPO_PUBLIC_AGENTKIT_URL=http://<your-mac-lan-ip>:4021
```

## Register the agent (one-time, unlocks the free trial)

The free trial activates only for an agent address registered in AgentBook. Registration prompts the World App verification flow:

```bash
npx @worldcoin/agentkit-cli register <agent-address>
npx @worldcoin/agentkit-cli status   <agent-address>
```

Then run the agent demo:

```bash
AGENT_PRIVATE_KEY=0x... AGENTKIT_URL=http://localhost:4021 npm run agent
```

## Behavior

| Request | Unregistered agent | Registered human-backed agent |
|---|---|---|
| `GET /agent/premium` | `402 Payment Required` (x402) | `200` for the first 3 uses (free trial), then `402` → pay $0.01 |

`/status` (public, no payment) returns the free-trial config the app renders on Profile.

## Env

| Var | Default | Notes |
|---|---|---|
| `AGENTKIT_PORT` | `4021` | |
| `AGENT_PAYTO` | burn address | where post-trial payments settle |
| `AGENTKIT_FREE_USES` | `3` | free-trial size |
| `X402_FACILITATOR` | World Chain facilitator | x402 settlement facilitator |
