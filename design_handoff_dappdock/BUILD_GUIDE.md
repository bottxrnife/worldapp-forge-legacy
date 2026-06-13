# DappDock — Build Guide (architecture & integrations)

Companion to `README.md` (design spec). This file covers how to build the working app. Hackathon target: the 3 sponsor tracks below.

## Stack

- **Next.js PWA** (App Router), mobile-first. React + Tailwind + shadcn-style components.
- **Schema-driven mini-dapp renderer**: published dapps are JSON manifests (see `dapp-manifest.example.json`) rendered by a single runtime component — not arbitrary user code.
- Wallet: embedded/abstracted (e.g. Privy or similar) — users should never configure networks.

## Core services

| Service | Responsibility |
|---|---|
| `app_store_service` | dapp listings, categories, usage counts, reviews |
| `manifest_service` | validate + serve dapp manifests |
| `assistant_service` | natural language → dapp manifest + workflow (LLM-backed) |
| `execution_service` | execute or simulate LI.FI Composer flows |
| `identity_service` | resolve ENS names + text records |
| `verification_service` | verify World ID proofs |
| `agent_service` | manage human-backed app agents (AgentKit) |

## The dapp manifest

Every generated dapp compiles to a manifest (`dapp-manifest.example.json`). The runtime renderer maps `components[]` to form controls, `permissions` to the permission card, and `workflow` to the execution timeline. The store, detail screen, and runtime are all views over the same manifest — keep it the single source of truth.

## ENS integration (identity & discovery)

Tracks: Best ENS Integration for AI Agents / Most Creative Use of ENS / Integrate ENS.

Namespace under `dappdock.eth`:
- dapps: `hackdues.dappdock.eth`
- agents: `assistant.agent.dappdock.eth`, `design.agent.dappdock.eth`
- creators keep their own names: `william.eth`, `coffeeclub.creator.eth`

On publish:
1. Reserve/create the subname under `dappdock.eth` (L2 subname registrar keeps it cheap).
2. Write text records: `dapp.manifest` (URL), `dapp.category`, `dapp.version`, `agent.endpoint`, `agent.capabilities`, `world.policy`, `lifi.flow`.
3. **Resolve store entries by ENS name, not DB id** — the store is a view over the subname registry; the DB is a cache/index.
4. Show the ENS name prominently on every dapp/agent surface (the design does this everywhere).

## LI.FI integration (execution & composition)

Tracks: Best User Experience / Best Composer Tooling / Agentic Workflows.

Assistant flow: user describes app → `assistant_service` maps it onto a Composer-compatible workflow template → render the readable step preview (Flow tab) → **simulate/validate** → store flow reference in manifest → runtime renders one-tap execution with the 4-step timeline UI.

MVP: support 2–3 workflow templates only:
1. Cross-chain payment collection (the demo: $5 USDC any chain → treasury → mark paid)
2. Swap/bridge into a target asset
3. Fundraise / team treasury deposit

Execution status from LI.FI maps 1:1 to the runtime timeline states (done / in-progress+pulse / queued).

## World integration (verified humans & bounded agents)

Tracks: AgentKit (Track A) / World ID (Track B).

World ID gates (the product breaks without proof-of-human):
- 3 free dapp deployments per verified human ("builder credits", shown on Profile: 2/3)
- Only verified humans publish public dapps
- One review / one vote / one claim / one trial per human where the manifest requires it
- "✓ World verified creator" badge on detail pages

AgentKit:
- The design assistant and app agents are **human-backed**, surfaced as "Human-backed by William" (no extra personal data).
- Delegation boundaries are explicit and visible (Profile agent cards + assistant Flow tab banner): agent **can draft**, **can simulate**; **human must approve spending and publishing**.

Demo line: "Without World ID, the app store gets spammed by fake creators, fake reviews, fake claims, and fake free deployments."

## Build order (suggested)

1. App shell: routes, tab bar, design tokens, list-row/card/chip components.
2. Manifest renderer + runtime screen with mocked execution timeline.
3. Store + detail screens reading seeded manifests.
4. LI.FI: wire template #1, simulation, then live execution status into the timeline.
5. ENS: subname + text-record write on publish; resolve store from registry.
6. World ID: session verification, publish gating, builder credits, review limits.
7. Assistant: prompt → manifest generation (constrain output to the manifest schema), Chat/Flow UI, publish checklist.
8. AgentKit: human-backed assistant identity + agent passport surfaces.

## Demo script (judge walkthrough)

1. Open DappDock → onboarding → verify with World ID, claim builder credits.
2. Ask the assistant: "Create a dapp for my hackathon team to collect $5 USDC dues from any chain and mark verified teammates as paid."
3. Assistant generates UI + LI.FI workflow + permissions + ENS name.
4. Review publish checklist → publish as `hackdues.dappdock.eth`.
5. Second user opens it from the store → reviews permissions ($5 cap, confirm-first) → runs it.
6. Confirmation: paid $5, marked as joined. All three integrations visible in one loop.
