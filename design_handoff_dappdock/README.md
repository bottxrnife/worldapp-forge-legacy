# Handoff: DappDock — dapp app-store superapp

## Overview

DappDock is a mobile-first "dapp app store" superapp: users discover, use, and create onchain mini-apps from one place — Alipay-style utility hub, but for dapps. The core loop: a user describes an idea → an AI design assistant generates a mini-dapp (UI + LI.FI workflow + ENS identity + World ID access rule) → the user reviews permissions and publishes → other users open and run it with one tap.

Three sponsor integrations are load-bearing:
1. **ENS** — identity/discovery layer. Every dapp, creator, and agent gets a human-readable ENS subname; app metadata lives in ENS text records.
2. **LI.FI Composer** — execution layer. A "dapp" is a saved workflow with a UI wrapper; the assistant compiles plain English into Composer flows.
3. **World (World ID + AgentKit)** — verified-human creation, one-per-human limits, anti-spam, human-backed agents.

## About the Design Files

The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, **not production code to copy directly**. Your task is to **recreate these designs in the target codebase's environment**. No codebase exists yet; the recommended stack (see `BUILD_GUIDE.md`) is a **Next.js PWA with React, Tailwind, and shadcn-style components**, plus a schema-driven mini-dapp renderer. Implement the screens with that stack's idioms (Tailwind classes, shared components), not by porting the prototype's inline styles literally.

- `DappDock.dc.html` + `support.js` — the interactive prototype. Open `DappDock.dc.html` in a browser (if your browser blocks local scripts, serve the folder: `npx serve .`). Left panel = design notes, jump-to-screen links, Home variant switcher (A/B/C), and the judge demo script. Right = the phone prototype. All styles are inline in the file, so every measurement/color in this README can be cross-checked against the source.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, copy, and interaction states are final intent. Recreate pixel-perfectly using your component library. The left-hand design-notes panel is NOT part of the product — only the phone contents are. Two exceptions:
- Icons in the prototype are placeholder glyphs (`$`, `⇄`, `✓`, `✦`, `▣`, `◎`, `···`, `↑`). Replace with a real icon set (e.g. Lucide, 1.5–2px stroke, geometric).
- The phone bezel/status bar is presentation chrome, not product UI.

## Design Tokens

### Colors
| Token | Value | Use |
|---|---|---|
| `bg` | `#F5F6FA` | App background |
| `surface` | `#FFFFFF` | Cards, rows, search bars, tab bar |
| `blue-soft` | `#DCE7FF` | Hero cards, featured cards, icon tiles, ENS chips, info banners |
| `blue-soft-deep` | `#C7D8FF` | Decorative circle on hero card |
| `blue-ink` | `#16204A` | Headings on soft-blue surfaces; dark panel inside blue card |
| `blue-body` | `#22305C` | Body text on soft-blue surfaces |
| `blue-meta` | `#3D4F8F` | Metadata on soft-blue surfaces |
| `blue-link` | `#3450A1` | ENS names, links, chip text on `blue-soft` |
| `accent` | `#86A4F4` | Pulse/glow effects only (rgba 0.45) |
| `text` | `#0B1020` | Primary text |
| `text-2` | `#667085` | Secondary text |
| `text-3` | `#9AA1B2` | Muted labels, placeholders, inactive nav |
| `text-body` | `#22283C` | Long-form body in cards |
| `text-note` | `#3D4663` | Notes-panel body, ghost-button labels |
| `divider` | `#E5E7EB` | Card dividers, timeline connectors |
| `divider-soft` | `#F1F2F6` | Row dividers inside white cards; neutral chips |
| `cta` | `#000000` | Primary buttons, active filter pill, send button, FAB |
| `success-bg` / `success` | `#DFF5E7` / `#1B7A45` | World chips, success checks, "Live" badges |
| `success-strong` | `#2DA866` | Completed timeline dots |
| `warn-bg` / `warn` | `#FFF4D6` / `#8A6A12` | "Simulated", "One per human" chips |
| `danger-bg` / `danger` | `#FBE9E7` / `#A14034` | Agent boundary chips ("Cannot spend") |
| `seg-bg` | `#EAECF2` | Segmented-control track; empty-state icon tile |
| `step-idle` | `#EDEFF4` / `#B9BFCC` | Pending timeline dot bg / number |

### Typography
Font: **Geist** (Google Fonts), weights 400/500/600/700/800. Fallback Helvetica/Arial. Letter-spacing −0.01 to −0.02em on bold headings ≥16px; +0.05–0.08em on uppercase micro-labels.

| Role | Size / weight |
|---|---|
| Hero (onboarding) | 34px / 800, line-height 1.12 |
| Page title | 28px / 800 |
| Success headline | 31px / 800 |
| Greeting / detail title | 21–25px / 800 |
| Card headline (hero card) | 20–21px / 800 |
| Section header | 17–18px / 800 |
| Row title | 15.5px / 700 |
| Screen-header title | 16px / 800 |
| Body | 14–15.5px / 400–600, line-height 1.45–1.6 |
| Chat bubble | 14px, line-height 1.5 |
| Metadata / row sub | 12.5–13px / `text-2` |
| Chips | 10.5–13px / 600–700 |
| Micro-label (uppercase) | 10.5–11px / 700, letter-spacing 0.05–0.08em |
| Tab labels | 10.5px / 700 |

### Shape & elevation
- App/featured cards: **24–28px** radius · list rows & permission cards: **20–22px** · buttons: **13–16px** · app icons: 11–21px (scales with size) · chips/pills/search/tab bar: **999px**
- Bottom-sheet/modals (if added): 28px top radius
- Shadows (sparing): tab bar `0 8px 26px rgba(11,16,32,0.10)`; FAB `0 8px 20px rgba(11,16,32,0.30)`; chat bubbles `0 1px 2px rgba(11,16,32,0.05)`; generated card `0 6px 20px rgba(52,80,161,0.08)` + 1.5px `#DCE7FF` border
- Screen padding: 20px horizontal. Card padding 16–22px. List gap 8px. Section header margin-top 24px, margin-bottom 10px.

## Screens / Views

Mobile viewport is 392×846 (design at 390-wide). Bottom tab bar shows ONLY on Home, Store, Profile. All other screens have a back arrow (38px white circle, `←`) top-left.

### 1. Onboarding (`01 Onboarding`)
- Purpose: explain the product in one sentence; route to World ID verification or browsing.
- Layout: column, 28px top pad. 52px black rounded (17px) "D" logo → hero "One app for every dapp." → sub "Use, create, and publish onchain apps with an AI design assistant. No wallets, chains, or contracts to think about." (15.5px, `text-2`, max-width 300px) → 3-col grid of white cards (radius 20, 34px soft-blue circle glyph + 13px/700 label): Use dapps / Create dapps / Publish to the store → spacer → black CTA **"Start with World ID"** (radius 16, 17px pad, with 18px ring-check glyph) → text-link secondary **"Explore first"**.
- Nav: CTA → Home; Explore first → Store.

### 2. Home (`02 Home`) — 3 variants, shared header
Shared header: "Good evening, William" (24px/800); chip row: white Balance pill ("Balance $128.40"), green "✓ World" chip, soft-blue "william.eth" chip (→ Profile); 44px "W" avatar circle top-right (→ Profile).

**Variant A — Classic hub (recommended default):**
1. Search pill: white, radius 999, 14px pad, placeholder "Search dapps or ask for one…" (→ Assistant).
2. Hero card "Create a dapp": `blue-soft`, radius 28, 22px pad, decorative 130px `#C7D8FF` circle clipped top-right; headline 20px/800 `blue-ink`; sub "Describe an idea — the assistant designs, wires, and publishes it." (13.5px `blue-meta`); inline black button "Open assistant" (radius 12). Whole card → Assistant.
3. Quick-actions grid: 4 columns, 10px gap. White tiles radius 20; 38px soft-blue circle glyph + 12px/600 label. Pay, Swap, Vote, Fundraise, Members, Agents, Events, More (More → Store; Pay → Detail).
4. "Recommended dapps" + "See all" link (13px `blue-link`). Schedule-style rows (white, radius 20, 16px pad): left rail 58px uppercase 10.5px/700 `text-3` category; center bold title + 13px `text-2` sub; right chip or black "Open" pill.
   - Finance / **Split USDC Payment** / "Collect from any chain" / black `Open` (→ Detail)
   - Community / **DAO Vote Starter** / "One vote per verified human" / green `World ID gated`
   - Agents / **Research Agent Market** / "Human-backed agent tools" / blue `ENS verified`
   - Events / **Ticket Claim** / "Claim your event pass" / yellow `One per human`

**Variant B — Services first:** search → soft-blue panel (radius 28, 16px pad) containing a 4×2 grid of compact white tiles + a dark `#16204A` banner "Don't see what you need? / Ask the assistant to build it →" (→ Assistant) → "Featured" horizontal scroll of 230px white cards (radius 24: 42px icon tile, title, creator ENS, trust chips) → "Recommended" rows.

**Variant C — Assistant-led:** large soft-blue assistant card (radius 28: 34px dark "✦" avatar + "assistant.agent.dappdock.eth · human-backed" 12px; "What do you want to do today?" 21px/800; white faux-input "Describe a task or an app idea…" with 28px black ↑ circle; white prompt chips Collect payments / Start a vote / Event check-in — all → Assistant) → 4 quick tiles → "Picked for you" rows.

### 3. Store (`03 Store`)
- "Store" 28px/800 → search pill → horizontally scrolling category pills (active = black bg/white text; rest white/`text-2`): All, Finance, Community, Agents, Events, Tools.
- Featured: horizontal scroll, 250px `blue-soft` cards radius 26 — 44px white icon tile + white "Featured" chip; title 17px/800 `blue-ink`; ENS name 12.5px `blue-meta`; one-liner 13px `blue-body`; white trust chips (ENS / ✓ World / Simulated). First card (Hackathon Team Dues) → Detail.
- Sections of schedule rows: **Verified by humans** (Split USDC Payment → Detail; Ticket Claim), **Built with agents** (Research Agent Market), **Recently published** (left rail shows recency "Just now" / "2h ago"; Hackathon Team Dues → Detail; Run Club Dues + Routes).
- Rule: **never show contract addresses on cards** — raw details live behind "View technical details" on the detail screen.

### 4. Dapp detail (`04 Dapp detail`) — the trust & conversion screen
- Header: back (→ Store) + right text-link "View technical details" (13px `text-2`).
- Identity block: 64px icon tile (radius 21, "HD"), name 21px/800, "hackdues.dappdock.eth · by william.eth" in `blue-link`.
- Trust chip row: `ENS verified` (blue) · `✓ World verified creator` (green) · `Flow simulated` (yellow) · `Open source` (neutral).
- **"What this dapp does"** card: plain-English outcome, key facts bolded ("You pay **$5 USDC from any chain**, it lands in the team treasury at **team.eth**, and you're marked as paid…").
- **Permissions card** (most important element): white, radius 22, **1.5px `#DCE7FF` border**; uppercase blue micro-label "Permissions requested"; numbered list (20px numbered circles, `divider-soft` bg): 1 Read your wallet balance · 2 Route one USDC payment via LI.FI · 3 Save your proof of completion; divider; "Spending cap — **$5.00**" (15px/800); "Before execution — **You confirm first**" (green 700).
- **Workflow preview** card: pill chain with `→` separators: `USDC, any chain` → `LI.FI route` → `team.eth` → `Marked paid` (last pill green).
- Social proof line: "★ 4.9 · 128 runs · 42 verified reviews · one review per human".
- Black CTA **"Run dapp"** → Runtime.

### 5. Dapp runtime (`05 Dapp runtime`) — three states
- Header: back (→ Detail), title "Team Dues Splitter" + ENS sub, right soft-blue pill "✦ Ask assistant" (→ Assistant).
- **Form state:** white card of label/value rows separated by `divider-soft` — Amount **$5 USDC** · Pay from **Any chain** · Destination **team.eth** (blue) · Memo **June hackathon dinner**. Below: soft-blue outcome banner "**Outcome:** you will pay $5 and join Team Dinner. One payment per verified human. You confirm before anything moves." CTA pinned to bottom: **"Pay and mark me as joined"** → processing.
- **Processing state:** "Running your flow…" 18px/800; sub "LI.FI Composer · 4 steps · simulated before execution"; white card timeline (18px gap). Steps: Source $5 USDC from your wallet / Route funds via LI.FI / Settle to team.eth treasury / Mark William as paid (each with one-line sub). 26px dots: done = `#2DA866` white ✓; active = `blue-soft` with number + pulse animation; pending = `#EDEFF4` grey number. Right-aligned status 11.5px/700: Done / In progress / Queued. Pending titles use `text-3`.
- **Done state:** centered — 74px green check circle, "Done." 25px/800, "You paid **$5 USDC** and joined **Team Dinner**.", link "View flow details" (blue), black "Back to home".

### 6. Create assistant (`06 Create assistant`)
- Header: back (→ Home), "Create assistant" + "assistant.agent.dappdock.eth · human-backed" sub. Segmented control (track `#EAECF2`, radius 999; active segment white w/ shadow): **Chat | Flow**.
- **Chat tab:** opening assistant bubble "What dapp do you want to create?"; prompt chips (hide once conversation starts): **Collect payments** (soft-blue, pulsing — the demo trigger), Create a voting app, Token-gate a community, Event check-in, Build an agent tool, Start from scratch. Bubbles: user = black bg/white text, radius `18 18 6 18`; assistant = white, radius `18 18 18 6`, max-width 82–86%. Typing indicator = 3 blinking 7px dots. Bottom: floating input pill "Describe your dapp…" + 46px black ↑ send over a bottom fade.
- **Generated dapp card** (final assistant message): white, radius 24, blue border + glow; 46px "HD" tile + name + one-liner; three `bg` mini-rows (radius 13, label/value): IDENTITY `hackdues.dappdock.eth` · WORKFLOW `USDC any chain → team.eth` · ACCESS `World ID required` (green); black "Open preview →" → Preview.
- **Flow tab:** empty state ("No flow yet — describe a dapp in the chat…") until generated; then "LI.FI Composer flow · **simulation passed**" + vertical numbered timeline (26px blue circles, 2px `divider` connectors): Source funds / Route / Settle / ✓ Mark paid, each with sub-copy. Below, soft-blue boundary banner: "**Boundary:** the agent drafted and simulated this flow. Spending and publishing always require your confirmation."

### 7. Generated dapp preview (`07 Generated dapp preview`)
- Back (→ Assistant), "Generated dapp" title; name 22px/800 + description.
- **Live preview frame:** soft-blue wrapper radius 28, micro-label row "LIVE PREVIEW / interactive"; inside, a white mini-mock of the dues dapp (icon+title, Amount/Destination rows, black "Pay dues" button).
- Three white summary rows (radius 18): IDENTITY / WORKFLOW / ACCESS (same values as the chat card).
- Actions: ghost white buttons "Edit with assistant" (→ Assistant) and "Test dapp" (→ Runtime) side-by-side; full-width black **"Publish"** → Publish checklist.

### 8. Publish checklist (`08 Publish checklist`) + success (`08b`)
- Back (→ Preview), "Publish". Intro: "Everything below was checked automatically. Publishing requires your confirmation — the assistant can't do it alone."
- Five rows (white radius 20, 24px green ✓ circle, bold title + 12.5px sub):
  1. ENS name reserved — hackdues.dappdock.eth · metadata in text records
  2. World ID rule set — One verified human per payment
  3. LI.FI flow simulated — 4 steps · simulation passed
  4. Permissions reviewed — $5 spending cap · confirmation required
  5. Store listing ready — Finance / Community · 1 of 3 builder credits
- Bottom black CTA **"Publish to DappDock"** → Success.
- **Success:** minimal, centered — green check, "Published." 31px/800, "Your dapp is live at **hackdues.dappdock.eth**", black "Open in store" (→ Store), text-link "View profile" (→ Profile).

### 9. Profile / agent passport (`09 Profile`)
- 62px "W" avatar + "william.eth" 21px/800 + chips `✓ World verified` (green) and `Builder` (blue).
- 3-col stat cards: Builder credits **2**/3 · Published **1** · Reputation **4.9**.
- **Created dapps:** Hackathon Team Dues row (icon tile, "hackdues.dappdock.eth · 128 runs", green `Live` chip) → Detail.
- **Saved dapps:** Split USDC Payment row → Detail.
- **Agent fleet:** white cards — 40px dark "✦" circle, agent ENS (design.agent / payments.agent .dappdock.eth), "Human-backed by William", status chip (`Active` green / `Paused` neutral), capability chips below: neutral `Can draft` / `Can simulate` / `Can prepare flows`, danger `Cannot spend` / `Spend needs approval`.

## Interactions & Behavior

### Navigation map
```
Onboarding ── Start with World ID ─→ Home        ── Explore first ─→ Store
Home: hero card / search → Assistant · tiles "Pay" → Detail · "More"/See all → Store · avatar/ens chip → Profile
Store: featured & rows → Detail
Detail: back → Store · "Run dapp" → Runtime(form)
Runtime: back → Detail · "Ask assistant" → Assistant · Pay → processing → done · done "Back to home" → Home
Assistant: back → Home · chip/input/send → scripted generation · card "Open preview" → Preview
Preview: back/Edit → Assistant · Test dapp → Runtime · Publish → Checklist
Checklist: back → Preview · Publish to DappDock → Success
Success: Open in store → Store · View profile → Profile
Tab bar (Home/Store/Profile only): Home · Store · Create FAB → Assistant · Profile
```

### Animations
- Screen enter: fadeUp — translateY(10px)→0 + fade, 0.3s ease.
- Chat: each bubble fadeUp 0.3s; typing dots blink 1.2s loop (0.2s stagger); demo chip + active timeline dot pulse: `box-shadow 0 0 0 0 rgba(134,164,244,0.45) → 0 0 0 9px transparent`, 1.4–2.4s loop.
- Scripted chat timeline (ms after trigger): 350 user prompt → 1000 typing → 2500 assistant clarifying Q → 3900 user answer → 4600 typing → 6600 assistant "Done…" + generated card. Trigger: "Collect payments" chip, input pill, or send button (first time only; chips hide after).
- Runtime execution: steps complete at 700/1400/2100/2800ms; done state at 3600ms. Entering Runtime always resets to form state.

### UX principles (enforce in implementation)
- Hide chains until needed ("Pay from any chain", never "bridge Arbitrum→Base" up front).
- Always show the outcome before routing details.
- Permissions in plain English; raw method calls only behind "View technical details".
- Every dapp shows a trust card: ENS identity, World verification, simulation status, creator reputation.
- Creation is reversible: Edit / Test / Publish are always separate steps.
- Agents are bounded: can draft & simulate; humans confirm spend & publish.

## State Management

Prototype state (maps to real app state/routing):
- `screen`: onboarding | home | store | detail | runtime | assistant | preview | publish | success | profile → real app: routes.
- `variant`: A | B | C — Home explorations; **ship one** (A recommended).
- `runState`: form | processing | done; `runStep`: 0–4 → real app: LI.FI execution status (poll/subscribe).
- `assistantTab`: chat | flow; `messages[]`, `typing`, `chatPlayed` → real app: assistant_service conversation + streaming.
- Real data fetching: store listings & dapp metadata resolved via ENS (see BUILD_GUIDE), World ID proof on session, wallet balance for the pill.

## Assets
- No image assets. All visuals are CSS shapes + text glyphs. Replace glyphs with a real icon library; app "icons" are two-letter monograms on `blue-soft` tiles (works as the default for user-generated dapps; allow uploads later).
- Font: Geist via Google Fonts (`wght@400..800`).

## Files
- `DappDock.dc.html` — the interactive prototype (all 9 screens, scripted demo, inline styles). Open in a browser with `support.js` next to it; serve the folder (`npx serve .`) if opening from disk fails.
- `support.js` — prototype runtime (renders the template + logic). Reference only — not part of the product.
- `BUILD_GUIDE.md` — architecture, services, ENS/LI.FI/World integration plan, MVP scope, demo script.
- `dapp-manifest.example.json` — canonical manifest a generated dapp compiles into.
