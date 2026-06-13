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

Install **Expo Go** from the Play Store / App Store, then scan the QR code (or use the tunnel URL if LAN fails). The app opens on the onboarding screen.

### Browser preview

```bash
npm run web
```

Opens **http://localhost:8081** in your browser. The UI is centered in a 392×846 phone frame on a grey backdrop (matches the design spec viewport). Wallet keys use `localStorage` on web; World ID deep-links require a phone with World App — onboarding simulates verification on web.

To build a static site: `npm run web:export` → output in `dist/`.

## Credentials

All keys go in `.env` (restart `npx expo start -c` after editing). Each layer falls back to a clearly-labeled simulated mode when its key is missing, so the app is usable immediately.

| Key | Where to get it | What it unlocks |
|---|---|---|
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | The real design agent: an LLM with tool calling that reads your wallet, browses the store, resolves ENS names, checks subname availability, simulates LI.FI routes, and drafts schema-validated dapp manifests. Without it: deterministic template drafting. |
| `EXPO_PUBLIC_WORLD_APP_ID` + `EXPO_PUBLIC_WORLD_ACTION` | [developer.worldcoin.org](https://developer.worldcoin.org) — create an app and an incognito action | Real proof-of-human: the app deep-links into World App via the Wallet Bridge and verifies the returned proof against the Developer Portal. Gates creation and one-per-human dapps. |
| `EXPO_PUBLIC_LIFI_API_KEY` | [portal.li.fi](https://portal.li.fi) | Higher-rate LI.FI quotes/status. Quotes work without a key too. |
| `EXPO_PUBLIC_NAMESTONE_API_KEY` + `EXPO_PUBLIC_ENS_DOMAIN` | [namestone.com](https://namestone.com) (key for a domain you control) | Publishing writes a **real gasless ENS subname** (`label.yourdomain.eth`) with the dapp manifest in its text records. |

## The wallet

A burner wallet is generated on first launch and stored in the device keychain (Profile tab → Wallet → copy address). Balances are read live from Base, Arbitrum, Optimism and Polygon.

- **Funded** (USDC + a little gas on any of those chains): running a payment dapp executes for real — ERC-20 approval, LI.FI transaction signed and sent from the device, `li.quest/v1/status` polled until funds settle at the destination, explorer link on the done screen.
- **Unfunded**: the route is still validated with a real LI.FI quote, and the timeline runs in simulated mode.

## Architecture

- `app/` — expo-router screens: onboarding, home, store, detail, runtime, assistant (Chat/Flow), preview, publish, success, profile.
- `src/services/`
  - `agent.ts` — the LLM agent loop (Anthropic Messages API + toolbelt; drafting/simulating only — spending and publishing always require human confirmation).
  - `manifest.ts` — schema validation gate; the runtime only renders validated manifests.
  - `execution.ts` — LI.FI quote/simulate/execute + status polling.
  - `identity.ts` — ENS resolution (viem) + NameStone subname publishing.
  - `verification.ts` — World ID Wallet Bridge (pure-JS AES-GCM) + proof verification.
  - `wallet.ts` — embedded burner wallet (expo-secure-store) + multichain balances.
- `src/data/seeds.ts` — seeded store listings (every listing is a manifest; store, detail, and runtime are all views over the same schema).

## Product rules enforced in code

- Chains are hidden until needed ("Pay from any chain").
- Outcome is always shown before routing details.
- Permissions are plain English; raw details live behind "View technical details".
- Every dapp shows a trust row: ENS identity, World verification, simulation status.
- Agents draft and simulate; **humans confirm spend and publish** (the publish/spend tools simply don't exist in the agent's toolbelt).
