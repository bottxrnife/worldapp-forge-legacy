# AGENTS.md — DappDock

**Living document for AI agents and developers working on this repo.**

When you change architecture, add screens, wire integrations, fix bugs, or alter env vars — **update this file in the same PR/session** before finishing. Append to the changelog at the bottom with date + what changed. Do not let this file drift from the codebase.

---

## 1. Project summary

**DappDock** is a mobile-first “dapp app store” superapp: users discover, run, and **create** onchain mini-apps from one place. The core loop:

1. User describes an idea → **LLM design agent** drafts a mini-dapp (UI manifest + LI.FI workflow + ENS identity + World ID access rule).
2. User reviews permissions → tests → publishes.
3. Others open and run the dapp from the store.

**Stack:** Expo SDK **54** (targets Play Store / App Store Expo Go), React Native 0.81, expo-router ~6, TypeScript, Zustand, viem, Lucide icons, Geist font. Runs in **Expo Go from the stores** (no native build required for dev).

> **SDK note:** SDK 56 is **not** on Play/App Store as of 2026-06. Do not upgrade to SDK 56 unless the user explicitly wants dev builds or sideloaded Expo Go from expo.dev/go.

**Design source of truth:** `design_handoff_dappdock/` — `README.md` (pixel spec), `BUILD_GUIDE.md` (architecture), `dapp-manifest.example.json` (manifest schema), `DappDock.dc.html` + `support.js` (interactive prototype). Home ships **Variant A** (Classic hub) only; B/C exist in the prototype but were not implemented.

**Product constraint:** Published dapps are **schema-driven manifests**, not arbitrary user code. The runtime renders `components[]`, `permissions`, and `workflow` from JSON. This is intentional (security + reviewability).

---

## 2. Build chronology (what was done, step by step)

### Phase 0 — Handoff intake
1. Read `design_handoff_dappdock/README.md` (full UI spec: tokens, 9 screens, nav map, animations, state model).
2. Read `BUILD_GUIDE.md` (7 core services, ENS/LI.FI/World integration plan, demo script).
3. Read `dapp-manifest.example.json` (canonical manifest for the hackathon team dues demo).
4. Read `DappDock.dc.html` + `support.js` (prototype logic: scripted chat timeline, runtime step timing, navigation).

### Phase 1 — Scaffold
5. Initialized Expo blank TypeScript app in repo root (`create-expo-app`).
6. Moved `design_handoff_dappdock/` aside during scaffold, restored after.
7. Set `package.json` `main` → `expo-router/entry`.
8. Installed: `expo-router`, safe-area, screens, linking, constants, status-bar, font, splash-screen, web-browser, linear-gradient, secure-store, clipboard, crypto, svg, Geist fonts.
9. Installed app deps: `viem`, `@noble/ciphers`, `zustand`, `lucide-react-native` (with `--legacy-peer-deps` due to react-dom peer conflict).
10. Configured `app.json`: name `DappDock`, scheme `dappdock`, background `#F5F6FA`, expo-router plugin.
11. Removed template `App.tsx` / `index.ts`.

### Phase 2 — Design system & shell
12. Created `src/theme.ts` — all color tokens from spec (`C.bg`, `C.blueSoft`, etc.) + `font()` helper for Geist weights.
13. Created `src/components/ui.tsx` — `Txt`, `FadeUp`, `Pulse`, `TypingDots`, `Chip`, `IconTile`, `SearchPill`, `BackButton`, `PrimaryButton`, `SectionHeader`, `ListRow`, `OpenPill`, `Screen`.
14. Created `src/components/TabBar.tsx` — Home / Store / Create FAB / Profile with spec shadows and gradient fade.
15. Created `app/_layout.tsx` — Geist font loading, splash hide, Stack with `animation: 'none'` (per-screen `FadeUp` owns transitions).
16. Created `src/polyfills.ts` — `crypto.getRandomValues` via `expo-crypto` for viem + World ID bridge on Hermes.

### Phase 3 — Data model & state
17. Created `src/types.ts` — `DappManifest`, `DappListing`, `WorkflowStep`, `ChatMessage`.
18. Created `src/data/seeds.ts` — `HACKDUES_MANIFEST` + 5 seed listings (Split USDC, DAO Vote, Agent Market, Ticket Claim, Run Club).
19. Created `src/state/store.ts` (Zustand) — session, wallet snapshot, listings, agent conversation (`apiHistory` + `UiMessage[]`), draft manifest, simulation result, builder credits.

### Phase 4 — Core services (BUILD_GUIDE’s 7 services)
20. **`src/services/env.ts`** — reads `EXPO_PUBLIC_*` vars; `hasWorldCreds()`, `hasEnsCreds()`.
21. **`src/services/manifest.ts`** — `validateManifest()` gates agent output; enforces component types, plain-English permissions, 2–6 workflow steps, no raw addresses in permissions.
22. **`src/services/identity.ts`** — ENS resolve via viem mainnet; `publishSubname()` via NameStone REST API when keyed, else simulated delay.
23. **`src/services/verification.ts`** — World ID Wallet Bridge (encrypt request → deep link World App → poll bridge → verify on Developer Portal). Simulated when no `WORLD_APP_ID`.
24. **`src/services/execution.ts`** — LI.FI quote/simulate; **real execution** when wallet funded (approve + send + poll `li.quest/v1/status`); unfunded = validated quote + spec timeline timing.
25. **`src/services/wallet.ts`** — burner key in `expo-secure-store`; balances on Base/Arbitrum/Optimism/Polygon USDC + native gas.
26. **`src/services/assistant.ts`** — deterministic template fallback (`generateManifest`) when no Anthropic key.
27. **`src/services/agent.ts`** — **real LLM agent**: Anthropic Messages API + tool loop. Tools: `get_wallet_overview`, `list_store_dapps`, `resolve_ens_name`, `check_ens_subname`, `simulate_lifi_route`, `draft_dapp_manifest`. **No spend/publish tools** (human confirms those).

### Phase 5 — Screens (expo-router)
28. `app/index.tsx` — Onboarding; World ID CTA → `verifyHuman()` → `/home`; Explore → `/store`.
29. `app/home.tsx` — Variant A hub: header with live wallet balance, hero card, 8 quick tiles, recommended rows. Tab bar.
30. `app/store.tsx` — Category pills, featured horizontal scroll, sections (Verified by humans / Built with agents / Recently published). Tab bar.
31. `app/detail/[ens].tsx` — Trust chips, permissions card (1.5px blue border), workflow preview, Run CTA. Resolves listing by ENS param.
32. `app/runtime/[ens].tsx` — Form → processing timeline (pulse on active step) → done. `ens=draft` uses `draft` from store. World ID gate before pay. Real or simulated execution.
33. `app/assistant.tsx` — Chat/Flow segmented control; real agent via `runAgentTurn()`; prompt chips; generated dapp card; typing dots; activity lines for tool calls.
34. `app/preview.tsx` — Live preview frame, summary rows, Edit/Test/Publish actions.
35. `app/publish.tsx` — 5-item checklist; `publishSubname()` + `addListing()`.
36. `app/success.tsx` — Published confirmation; links to store/profile.
37. `app/profile.tsx` — Stats, embedded wallet (copy address), created/saved dapps, agent fleet cards. Tab bar.

### Phase 6 — User pivot: “real app”, not demo
38. User requested real working app with LLM agent + tool calls (not scripted demo only).
39. Replaced scripted `playChat()` timeline with `agent.ts` tool-calling loop.
40. Added wallet service + real LI.FI execution path.
41. Home balance reads live `wallet.totalUsdc` instead of hardcoded `$128.40`.

### Phase 7 — QA & fixes
42. Typecheck: `npx tsc --noEmit` — clean.
43. Bundle: `npx expo export --platform ios` — clean.
44. **Expo Go “failed to download remote update”** — LAN IP unreachable from phone. Fix: `npx expo start --tunnel`; URL pattern `exp://<urlRandomness>-anonymous-8081.exp.direct` (see `.expo/settings.json` → `urlRandomness`).
45. **Hermes compat in `verification.ts`** — replaced `atob`/`TextDecoder` with manual base64 + UTF-8 decode (World ID bridge would crash otherwise).
46. **Navigation anti-pattern** — `preview.tsx` / `publish.tsx` used `router.replace()` during render; fixed with `<Redirect href="/assistant" />`.
47. Added `.env` to `.gitignore`.
48. Created `.env.example` and root `README.md`.
49. Installed `@expo/ngrok` (devDependency) for tunnel mode.

---

## 3. Repository map

```
dapp-dock/
├── app/                          # expo-router screens (file-based routes)
│   ├── _layout.tsx               # Root: fonts, splash, Stack
│   ├── index.tsx                 # Onboarding (/)
│   ├── home.tsx                  # Home tab
│   ├── store.tsx                 # Store tab (?category= param)
│   ├── profile.tsx               # Profile tab
│   ├── scan.tsx                  # QR scanner (center tab action)
│   ├── assistant.tsx             # Create tab → assistant (no tab bar)
│   ├── preview.tsx               # Generated dapp preview
│   ├── publish.tsx               # Publish checklist
│   ├── success.tsx               # Post-publish success
│   ├── detail/[ens].tsx          # Dapp detail (dynamic ENS slug)
│   └── runtime/[ens].tsx         # Dapp runtime; ens=draft for draft test
├── src/
│   ├── theme.ts                  # Design tokens
│   ├── types.ts                  # DappManifest, DappListing, etc.
│   ├── polyfills.ts              # crypto.getRandomValues for Hermes
│   ├── data/seeds.ts             # Seed store listings + HACKDUES_MANIFEST
│   ├── state/store.ts            # Zustand global state
│   ├── components/
│   │   ├── ui.tsx                # Shared UI primitives
│   │   ├── PunchCard.tsx         # Loyalty punch-card pass (renders `punchCard` component)
│   │   └── TabBar.tsx            # Bottom tab bar: Home/Store/Scan FAB/Create/Profile
│   └── services/
│       ├── env.ts                # Environment / credential helpers
│       ├── agent.ts              # LLM agent + toolbelt (PRIMARY)
│       ├── assistant.ts          # Template fallback manifest generator
│       ├── manifest.ts           # Schema validation
│       ├── identity.ts           # ENS resolve + NameStone publish
│       ├── verification.ts       # World ID bridge + verify
│       ├── execution.ts          # LI.FI simulate + execute
│       └── wallet.ts             # Embedded burner wallet
├── design_handoff_dappdock/      # Original design spec (DO NOT DELETE)
├── .env.example                  # Credential template
├── app.json                      # Expo config
├── package.json
├── README.md                     # User-facing run instructions
└── AGENTS.md                     # This file
```

---

## 4. Navigation map (implemented)

```
Onboarding (/) ── World ID ──→ /home        ── Explore ──→ /store
/home: search/hero → /assistant; tiles: Pay/Swap/Vote/Fundraise/Members → /detail/<ens>,
       Agents/Events → /store?category=..., More → /store; avatar → /profile
/store: rows/featured → /detail/[ens]; accepts ?category= deep link
/detail/[ens]: Run → /runtime/[ens]
/runtime/[ens]: Ask assistant → /assistant; done → /home
/scan: QR (dappdock://detail|runtime/<ens> or any ENS string) → /detail|/runtime; manual paste + demo chips
/assistant: card → /preview
/preview: Edit → /assistant; Test → /runtime/draft; Publish → /publish
/publish: → /success
/success: store → /store; profile → /profile
Tab bar (home, store, profile): center FAB → /scan; Create → /assistant
```

---

## 5. State model (`useApp` / Zustand)

| Field | Purpose |
|---|---|
| `verified`, `verifiedSimulated` | World ID session |
| `wallet` | `WalletSnapshot` from `getWalletSnapshot()` |
| `listings` | Store catalogue (`DappListing[]`) |
| `builderCredits`, `publishedCount` | Profile stats |
| `apiHistory` | Anthropic multi-turn message history (for agent) |
| `messages` | UI chat: `chat` \| `activity` \| `card` messages |
| `agentBusy` | Disables input while agent runs |
| `draft` | Current generated `DappManifest` |
| `draftPublishedLive` | Whether last publish hit real NameStone |
| `simulation` | Last `SimulationResult` from LI.FI |
| `loyalty` | Per-dapp `LoyaltyRecord` (`punches`, `points`, `redeemed`), persisted via SecureStore/localStorage (`dappdock.loyalty`); `addStamp(ens, points)` / `redeemReward(ens, cardSize)`; restored by `loadLoyaltyState()` from `_layout` |

**Helpers:** `findListing(ens)`, `listingFromManifest(manifest)`.

---

## 6. Integrations & credential matrix

| Env var | Service | Real behavior | No-key fallback |
|---|---|---|---|
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | `agent.ts` | Claude tool-calling agent | `assistant.ts` template generator; UI shows “template mode” |
| `EXPO_PUBLIC_WORLD_APP_ID` + `WORLD_ACTION` | `verification.ts` | Wallet Bridge → World App → verify API | Simulated verify (~1.4s) |
| `EXPO_PUBLIC_LIFI_API_KEY` | `execution.ts` | Higher rate limits on quotes/status | Quotes still work, rate-limited |
| `EXPO_PUBLIC_NAMESTONE_API_KEY` + `ENS_DOMAIN` | `identity.ts` | Gasless subname + text records on publish | Simulated publish (~900ms) |
| `EXPO_PUBLIC_ETH_RPC_URL` | `identity.ts` | Mainnet ENS resolution | Defaults to publicnode |

**Wallet (no env):** Auto-generated on device. Fund with USDC + gas on Base/Arbitrum/Optimism/Polygon for real LI.FI execution.

---

## 7. Agent toolbelt (`src/services/agent.ts`)

The agent **must not** get tools for spending or publishing. Boundaries are product rules.

| Tool | What it does |
|---|---|
| `get_wallet_overview` | Address + per-chain USDC/gas |
| `list_store_dapps` | Current store listings |
| `resolve_ens_name` | Mainnet ENS → address |
| `check_ens_subname` | Availability under `ENS_DOMAIN` |
| `simulate_lifi_route` | LI.FI quote Arbitrum→Base for amount |
| `draft_dapp_manifest` | Validates + stores draft; triggers UI card |

**Flow per user message:** push user text → up to 8 Anthropic turns → on `tool_use`, run tools → push `tool_result` → repeat until `end_turn` → surface assistant text + optional draft card.

**Model default:** `claude-sonnet-4-5` (override via `EXPO_PUBLIC_ANTHROPIC_MODEL`).

---

## 8. Manifest schema (runtime contract)

Canonical example: `design_handoff_dappdock/dapp-manifest.example.json`.

**Component types:** `amountInput`, `sourceChain`, `recipient`, `memoInput`, `punchCard`, `submitButton`.

**`punchCard` (loyalty/rewards):** `{ total, reward, pointsPerDollar }`. Runtime renders the pass (stamp grid + points) above the payment form; each successful run calls `addStamp()` (+1 stamp, `amount × pointsPerDollar` points). When the card is full the primary CTA flips to a free local redeem flow (4 generic voucher steps, no payment) that calls `redeemReward()` and resets the stamps. Pair with `requiresWorldId` + `worldPolicy: "one-card-per-human"` so stamps can't be farmed.

**Validation** (`manifest.ts`): name, description, outcome, ensLabel, 1–5 plain-English permissions (no `0x` addresses), 2–6 workflow steps, submitButton required, `requiresConfirmation: true` always forced.

**Views over one manifest:** Store card → Detail (permissions + trust) → Runtime (components + workflow timeline).

---

## 9. Animations & timings (from spec)

| Interaction | Timing |
|---|---|
| Screen enter | `FadeUp` 300ms, translateY 10→0 |
| Chat bubbles | `FadeUp` 300ms each |
| Typing dots | 1.2s blink, 0.2s stagger |
| Pulse (chip / active step) | 1.4–2.4s box-shadow loop |
| Runtime steps (simulated path) | 700/1400/2100/2800ms per step; done at 3600ms |
| Runtime steps (live path) | Driven by `runFlow()` callbacks as txs complete |

---

## 10. Running & debugging

```bash
npm install
cp .env.example .env   # optional
npx expo start --tunnel -c   # prefer tunnel for physical devices
```

**Expo Go URL:** After tunnel starts, read `urlRandomness` from `.expo/settings.json` →  
`exp://<urlRandomness>-anonymous-8081.exp.direct`  
Or scan QR from terminal.

**Common failures:**

| Symptom | Likely cause | Fix |
|---|---|---|
| “Failed to download remote update” | Phone can’t reach Metro on LAN | Use `--tunnel`; same Wi-Fi or tunnel URL |
| “Incompatible SDK version” | Project SDK ≠ store Expo Go SDK | Keep project on SDK 54; or install matching Expo Go from [expo.dev/go](https://expo.dev/go) (Android) |
| Agent says “template mode” | No Anthropic key | Set `EXPO_PUBLIC_ANTHROPIC_API_KEY`, restart with `-c` |
| Runtime always simulated | Wallet unfunded | Send USDC + gas to address on Profile |
| Publish says simulated ENS | No NameStone key | Set `EXPO_PUBLIC_NAMESTONE_API_KEY` |
| World ID fails on device | Missing World App / wrong app id | Install World App; check `WORLD_APP_ID` format `app_...` |
| `simctl` warning on Mac | No Xcode simulators | Ignore for Expo Go; only affects iOS simulator |
| Bottom CTAs / tab bar under Android nav buttons | SDK 54 renders edge-to-edge; fixed bottom padding ignores system inset | All bottom padding must derive from `useSafeAreaInsets().bottom` — `Screen` adds it automatically; never hardcode `paddingBottom` on screen roots |

**Verify before shipping changes:**
```bash
npx tsc --noEmit
npx expo export --platform ios --output-dir /tmp/dd-check
```

---

## 11. UX rules (enforce in code — do not regress)

1. Hide chains until needed (“Pay from any chain”, not “bridge Arbitrum→Base”).
2. Always show outcome before routing details.
3. Permissions in plain English only on cards; raw details behind “View technical details”.
4. Every dapp shows trust row: ENS, World verification, simulation status.
5. Creation is reversible: Edit / Test / Publish are separate steps.
6. Agents draft & simulate; humans confirm spend & publish.

---

## 12. What is NOT done yet (known gaps)

- Home variants B and C (prototype only).
- `assistant_service` does not stream tokens (full response per turn).
- No Privy/embedded smart-wallet — uses local burner key only.
- No backend: store is in-memory Zustand + seeds; published dapps don’t persist across app restarts except added to `listings` in session.
- No real AgentKit SDK — agent fleet on Profile is static UI per design.
- Category filter on Store doesn’t filter featured sections consistently for all edge cases.
- Android-specific World ID / deep link testing not verified.
- `EXPO_PUBLIC_ANTHROPIC_API_KEY` in client bundle (acceptable for hackathon; move to proxy for production).

---

## 13. Instructions for agents updating this repo

**Before ending a session:**
1. Run `npx tsc --noEmit`.
2. If you changed routes, services, or env vars — update sections 3–8 and the changelog below.
3. If you fixed a runtime/device issue — add to section 10 table.
4. If you completed a gap from section 12 — remove or narrow it.

**Conventions:**
- Match existing `src/theme.ts` tokens; don’t invent new colors. `C` is a **proxy over light/dark palettes** — never snapshot `C.x` into module-level constants; read it during render. Text/icons on `C.cta` backgrounds must use `C.ctaText` (never `C.white`). Dark panels use `C.inkPanel` (`C.blueInk` is text-on-blueSoft and inverts in dark mode). Every new route screen must subscribe via `useApp((s) => s.themeMode)` (or destructure the whole store) so theme toggles repaint it.
- New screens go in `app/`; shared logic in `src/services/` or `src/components/`.
- Agent tools that move money or publish **must not** be added without explicit user request and security review.
- Prefer extending `DappManifest` schema + `validateManifest()` over ad-hoc UI.
- Use `--legacy-peer-deps` if npm peer conflicts on install.

**Do not:**
- Delete or overwrite `design_handoff_dappdock/`.
- Commit `.env`.
- Use `router.replace()` / `router.push()` during render — use `<Redirect>` or `useEffect`.

---

## 14. Changelog (agents: append here)

| Date | Author | Change |
|---|---|---|
| 2026-06-12 | Initial build agent | Full Expo app from `design_handoff_dappdock/` spec: 11 routes, 7 services, LLM agent with 6 tools, wallet + real LI.FI path, World ID bridge, NameStone publish, tunnel dev fix, Hermes base64 fix, Redirect navigation fix, `.env.example`, `README.md`, this `AGENTS.md`. |
| 2026-06-12 | Build agent | **Downgraded Expo SDK 56 → 54** for Play Store Expo Go compatibility. Updated all `expo-*` packages, `react@19.1.0`, `react-native@0.81.5`, `expo-router@~6.0.24`. Removed invalid `app.json` plugins (`expo-status-bar`, `expo-font`, `expo-web-browser`). Added `start:tunnel` script. |
| 2026-06-12 | Build agent | **Safe-area fix (Android edge-to-edge):** `Screen` now adds `max(insets.bottom, 12)` to all bottom padding (scroll + non-scroll); removed hardcoded `paddingBottom` override in `app/index.tsx`; assistant chat list/input and Flow tab pad by inset; `TabBar` gradient pads `max(insets.bottom, 12) + 12`. Rule added: never hardcode bottom padding on screen roots (section 10). |
| 2026-06-12 | Build agent | **Web preview:** added `react-dom` + `react-native-web`, `app/+html.tsx`, phone-frame shell in `_layout.tsx` (web only), `localStorage` wallet fallback in `wallet.ts`, `npm run web` / `web:export` scripts. |
| 2026-06-12 | Build agent | **Theming:** higher-contrast light palette (darker text2/text3, deeper blueSoft, dimmer bg, stronger dividers) + full **dark palette**; `C` is now a Proxy over the active palette with new tokens `ctaText` + `inkPanel`; `themeMode` in store with SecureStore/localStorage persistence (`loadThemePreference()` called from `_layout`); **Light/Dark toggle in Profile → Settings**; StatusBar + web backdrop follow theme; every route screen subscribes to `themeMode`. |
| 2026-06-12 | Build agent | **Fast-food loyalty mini-app (Burger Block Rewards):** new `punchCard` manifest component `{total, reward, pointsPerDollar}` (types, validator, agent toolbelt docs + system-prompt pattern); `src/components/PunchCard.tsx` pass UI (stamp grid on `inkPanel`, points pill, pulsing next slot); persisted `loyalty` state in store (`addStamp`/`redeemReward`, `loadLoyaltyState()` in `_layout`, demo seed 7/10 stamps); runtime renders the pass, stamps on successful purchase, and runs a free 4-step redeem flow when the card is full; seed listing `burgerblock.dappdock.eth` (featured, World ID `one-card-per-human`), Home recommended row, Scan demo chip "Burger counter". |
| 2026-06-12 | Build agent | **Scan tab + functional homepage:** TabBar is now 5 slots — Home, Store, **Scan (center FAB, QR scanner)**, Create, Profile. New `app/scan.tsx` (expo-camera ~17, `dappdock://` + ENS payload parsing, manual paste, demo-code chips, web fallback panel). All 8 home tiles route somewhere real (Swap/Fundraise/Members → new dapps; Agents/Events → `/store?category=`). Store reads `?category=` param; humans-section chip is data-driven (`requiresWorldId`). Added 6 seed dapps: Swap Anything, Table 12 Order & Pay, Coffee Tip Jar, Community Fundraiser, Club Membership Pass, Article Unlock. `expo-camera` config plugin in app.json. |

---

*Last reviewed against codebase: 2026-06-12 (SDK 54).*
