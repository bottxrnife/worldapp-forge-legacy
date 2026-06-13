# DappDock

A mobile dapp app-store superapp: discover, run, and **create** onchain mini-apps from one place. Describe an idea → the built-in LLM agent designs a mini-dapp (UI + LI.FI workflow + ENS identity + World ID access rule) → you review permissions and publish → anyone runs it in one tap.

Built with **Expo SDK 54** (React Native, expo-router), runs in **Expo Go from the Play Store / App Store**. Design spec and prototype live in `design_handoff_dappdock/`.

> **Why SDK 54?** Play Store / App Store Expo Go does **not** ship SDK 56 yet ([Expo changelog](https://expo.dev/changelog/sdk-56)). This project targets SDK 54 so it loads in the store version of Expo Go. If you need SDK 56, install Expo Go from [expo.dev/go](https://expo.dev/go) (Android direct install) or use a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

## Run it

```bash
npm install
cp .env.example .env   # fill in keys (see below) — optional but recommended
npx expo start --tunnel -c
```

Install **Expo Go** from the Play Store / App Store, then scan the QR code (or use the tunnel URL if LAN fails). The app opens on the onboarding screen. On a Mac you can also launch it with **[Expo Orbit](https://expo.dev/orbit)**.

> **Native only.** There is no web build — run on a device (Expo Go) or via Expo Orbit. The QR codes, local notifications, and biometric spend-gate use `react-native-qrcode-svg`, `expo-notifications`, and `expo-local-authentication`; install them once with `npx expo install react-native-qrcode-svg expo-notifications expo-local-authentication` (each degrades gracefully if absent).

## Credentials

All keys go in `.env` (restart `npx expo start -c` after editing). Each layer falls back to a clearly-labeled simulated mode when its key is missing, so the app is usable immediately.

| Key | Where to get it | What it unlocks |
|---|---|---|
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | The real design agent: an LLM with tool calling that reads your wallet, browses the store, resolves ENS names, checks subname availability, simulates LI.FI routes, and drafts schema-validated dapp manifests. Without it: deterministic template drafting. |
| `EXPO_PUBLIC_WORLD_APP_ID` + `EXPO_PUBLIC_WORLD_ACTION` | [developer.worldcoin.org](https://developer.worldcoin.org) — create an app and an incognito action | Real proof-of-human: the app deep-links into World App via the Wallet Bridge and verifies the returned proof against the Developer Portal. Gates creation and one-per-human dapps. |
| `EXPO_PUBLIC_LIFI_API_KEY` | [portal.li.fi](https://portal.li.fi) | Higher-rate LI.FI quotes/status + Composer. Quotes work without a key too. |
| `EXPO_PUBLIC_ENS_DOMAIN` (+ `EXPO_PUBLIC_ETH_RPC_URL`) | none — **pure ENS via viem** | The namespace for dapp / agent identities (`label.yourdomain.eth`, `assistant.agent.yourdomain.eth`). Resolution, reverse names, ENSIP-5 text records, ENSIP-12 avatars, and ENSIP-26 agent records (`agent-context`, `agent-endpoint[<protocol>]`) all resolve from L1 through the **Universal Resolver** — no API key. Loyalty punch cards are read from each user's `dappdock.loyalty` text record (set it in any ENS manager); otherwise the local device cache is authoritative. |

## The wallet

A burner wallet is generated on first launch and stored in the device keychain (Profile tab → Wallet → copy address). Balances are read live from Base, Arbitrum, Optimism and Polygon.

- **Funded** (USDC + a little gas on any of those chains): running a payment dapp executes for real — ERC-20 approval, LI.FI transaction signed and sent from the device, `li.quest/v1/status` polled until funds settle at the destination, explorer link on the done screen.
- **Unfunded**: the route is still validated with a real LI.FI quote, and the timeline runs in simulated mode.

## Sponsor tracks (three, all real-with-fallback)

The whole app is built on exactly three sponsor integrations, each with a real keyed path and a graceful simulated fallback:

- **ENS** — identity **and** storage, pure viem (no third-party subname service). ENS names resolve recipients/treasuries; the design agent has a verifiable ENSIP-25/26 identity (`assistant.agent.<domain>` with `agent-context` / `agent-endpoint` records); and the **loyalty punch card lives in an ENSIP-5 text record** (`dappdock.loyalty` on each user's primary name) — a credential stored in ENS rather than a private DB.
- **World ID** — proof-of-human / one-per-human: loyalty cards, red-packet claims, reviews, and gated dapps all break without it.
- **LI.FI** — cross-chain USDC: every payment, order total, tip, and send is routed from any chain.

## Architecture

- `app/` — expo-router screens: onboarding, home, store, search, detail, runtime, assistant (Chat/Flow), preview, publish, success, profile, **rewards, activity, wallet, pay, redpacket/new, redpacket/[id]**.
- `src/services/`
  - `agent.ts` — the LLM agent loop (Anthropic Messages API + toolbelt; drafting/simulating only — spending and publishing always require human confirmation).
  - `manifest.ts` — schema validation gate; the runtime only renders validated manifests.
  - `execution.ts` — LI.FI quote/simulate/execute + status polling (`runFlow` accepts amount/recipient overrides).
  - `identity.ts` — ENS via viem (Universal Resolver): resolution, reverse names, ENSIP-5 text records, ENSIP-12 avatars, ENSIP-26 agent records; `publishSubname` assigns the dapp its `label.<domain>` identity.
  - `onchain.ts` — **loyalty ↔ ENS text record** (`dappdock.loyalty` read via viem), with local-cache fallback.
  - `verification.ts` — World ID 4.0 proof-of-human (Wallet Bridge, pure-JS AES-GCM) + `/api/v4/verify` proof validation.
  - `wallet.ts` — embedded burner wallet (expo-secure-store) + multichain balances + `sendUsdc` + key backup.
  - `loyalty.ts` / `notify.ts` / `biometric.ts` / `links.ts` — tier helpers, optional local notifications, optional biometric spend-gate, shared deep-link parsing.
- `src/data/seeds.ts` — seeded store listings (every listing is a manifest; store, detail, and runtime are all views over the same schema).

## Product rules enforced in code

- Chains are hidden until needed ("Pay from any chain").
- Outcome is always shown before routing details.
- Permissions are plain English; raw details live behind "View technical details".
- Every dapp shows a trust row: ENS identity, World verification, simulation status.
- Agents draft and simulate; **humans confirm spend and publish** (the publish/spend tools simply don't exist in the agent's toolbelt).
