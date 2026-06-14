#!/usr/bin/env node
/**
 * Parallel sponsor-track smoke tests for Forge (World + ENS + Walrus).
 * Usage: node scripts/smoke-sponsors.mjs [--track=ens|walrus|world|integration|all] [--base=http://localhost:3000]
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");

// Load .env without exposing values in output
for (const line of readFileSync(resolve(ROOT, ".env"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 1) continue;
  const k = t.slice(0, i);
  const v = t.slice(i + 1);
  if (!process.env[k]) process.env[k] = v;
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const BASE = args.base ?? "http://localhost:3000";
const TRACK = args.track ?? "all";
const CONCURRENCY = Number(args.concurrency ?? 40);
const DOMAIN = process.env.NEXT_PUBLIC_ENS_DOMAIN ?? "forgedapp.eth";
const WALRUS_PUB = process.env.WALRUS_PUBLISHER_URL ?? "https://publisher.walrus-testnet.walrus.space";
const WALRUS_AGG = process.env.WALRUS_AGGREGATOR_URL ?? "https://aggregator.walrus-testnet.walrus.space";
const APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "";

const SEED_LABELS = [
  "dues", "split", "tipjar", "burgerblock", "unlock", "bistro", "beancounter",
  "daovote", "savings", "fundraise", "members", "roundup", "agentmarket",
  "tripagent", "raffle", "tickets", "rsvp", "parking", "transit",
];

const results = [];

async function run(track, name, fn) {
  const t0 = performance.now();
  try {
    await fn();
    results.push({ track, name, ok: true, ms: Math.round(performance.now() - t0) });
  } catch (e) {
    results.push({ track, name, ok: false, ms: Math.round(performance.now() - t0), detail: String(e?.message ?? e) });
  }
}

async function pool(cases) {
  const q = [...cases];
  const workers = Array.from({ length: Math.min(CONCURRENCY, q.length) }, async () => {
    while (q.length) {
      const job = q.shift();
      if (job) await job();
    }
  });
  await Promise.all(workers);
}

async function getJson(path, opts) {
  const res = await fetch(`${BASE}${path}`, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}

function minimalManifest(label) {
  return {
    name: `Smoke ${label}`,
    ensLabel: label,
    description: "Automated smoke test manifest",
    category: "Tools",
    outcome: "Smoke test completes",
    permissions: { plainEnglish: ["Read-only smoke test"], spendingCap: "$0", requiresConfirmation: true },
    workflow: {
      provider: "World Chain",
      flowId: `smoke_${label}`,
      steps: [
        { id: "s0", label: "Start", detail: "Begin smoke test" },
        { id: "s1", label: "Done", detail: "Finish smoke test" },
      ],
    },
    components: [
      { type: "memoInput", default: "smoke" },
      { type: "submitButton", label: "Run smoke" },
    ],
    version: "1.0.0",
  };
}

// ── ENS track ──────────────────────────────────────────────────────────────
async function ensTests() {
  const cases = [];

  for (const label of SEED_LABELS) {
    for (let r = 0; r < 3; r++) {
      cases.push(() =>
        run("ENS", `profile seed ${label} r${r}`, async () => {
          const d = await getJson(`/api/ens/profile?name=${encodeURIComponent(`${label}.${DOMAIN}`)}`);
          if (!d.profile?.name) throw new Error("no profile.name");
        }),
      );
    }
  }

  const known = ["vitalik.eth", `assistant.agent.${DOMAIN}`, DOMAIN];
  for (const name of known) {
    for (let r = 0; r < 5; r++) {
      cases.push(() =>
        run("ENS", `profile known ${name} r${r}`, async () => {
          const d = await getJson(`/api/ens/profile?name=${encodeURIComponent(name)}`);
          if (!d.profile) throw new Error("missing profile");
        }),
      );
    }
  }

  for (let i = 0; i < 40; i++) {
    cases.push(() =>
      run("ENS", `calldata setText ${i}`, async () => {
        const d = await getJson("/api/ens/calldata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "setText",
            name: `smoke${i}.${DOMAIN}`,
            key: "url",
            value: `https://forge.test/smoke/${i}`,
          }),
        });
        if (!d.to || !d.data) throw new Error("missing calldata");
      }),
    );
  }

  for (let i = 0; i < 20; i++) {
    cases.push(() =>
      run("ENS", `calldata agent-records ${i}`, async () => {
        const d = await getJson("/api/ens/calldata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "agent-records",
            name: `agent${i}.agent.${DOMAIN}`,
            context: `Smoke agent ${i}`,
            endpoints: { web: `https://forge.test/agent/${i}` },
          }),
        });
        if (!d.to || !d.data) throw new Error("missing calldata");
      }),
    );
  }

  for (let i = 0; i < 10; i++) {
    cases.push(() =>
      run("ENS", `calldata subname ${i}`, async () => {
        const d = await getJson("/api/ens/calldata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "subname",
            parent: DOMAIN,
            label: `smokesub${i}`,
            owner: "0x174B386574af3C93c6B9404fB97D6d3dDE5e0675",
          }),
        });
        if (!d.to || !d.data) throw new Error("missing calldata");
      }),
    );
  }

  cases.push(() =>
    run("ENS", "profile invalid name 400", async () => {
      const res = await fetch(`${BASE}/api/ens/profile?name=not-a-name`);
      if (res.status !== 400) throw new Error(`expected 400 got ${res.status}`);
    }),
  );

  await pool(cases);
}

// ── Walrus track ───────────────────────────────────────────────────────────
async function walrusTests() {
  const cases = [];
  const blobIds = [];

  for (let i = 0; i < 15; i++) {
    cases.push(() =>
      run("WALRUS", `direct publisher store ${i}`, async () => {
        const payload = JSON.stringify({ smoke: i, ts: Date.now() });
        const res = await fetch(`${WALRUS_PUB}/v1/blobs?epochs=1`, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: payload,
        });
        const d = await res.json();
        if (!res.ok || !d?.newlyCreated?.blobObject?.blobId) throw new Error(JSON.stringify(d).slice(0, 200));
        blobIds.push(d.newlyCreated.blobObject.blobId);
      }),
    );
  }

  for (let i = 0; i < 10; i++) {
    cases.push(() =>
      run("WALRUS", `api upload bytes ${i}`, async () => {
        const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, i]); // PNG header stub
        const res = await fetch(`${BASE}/api/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: bytes,
        });
        const d = await res.json();
        if (!res.ok || !d.blobId) throw new Error(JSON.stringify(d).slice(0, 200));
        blobIds.push(d.blobId);
      }),
    );
  }

  await pool(cases);

  const readCases = blobIds.map((id, i) => () =>
    run("WALRUS", `aggregator read ${i}`, async () => {
      const res = await fetch(`${WALRUS_AGG}/v1/blobs/${id}`);
      if (!res.ok) throw new Error(`aggregator ${res.status}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 1) throw new Error("empty blob");
    }),
  );

  const proxyCases = blobIds.slice(0, 10).map((id, i) => () =>
    run("WALRUS", `blob proxy ${i}`, async () => {
      const res = await fetch(`${BASE}/api/blob/${id}`);
      if (!res.ok) throw new Error(`proxy ${res.status}`);
    }),
  );

  const publishCases = [];
  for (let i = 0; i < 12; i++) {
    const label = `smoke${Date.now().toString(36)}${i}`;
    publishCases.push(() =>
      run("WALRUS", `publish manifest ${i}`, async () => {
        const d = await getJson("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manifest: minimalManifest(label), creator: "smoke@test" }),
        });
        if (!d.ensName) throw new Error("no ensName");
        if (!d.blobId) throw new Error(`no blobId: ${d.storageError ?? "unknown"}`);
        blobIds.push(d.blobId);
      }),
    );
  }

  await pool([...readCases, ...proxyCases, ...publishCases]);
}

// ── World track ────────────────────────────────────────────────────────────
async function worldTests() {
  const cases = [];

  for (let i = 0; i < 40; i++) {
    cases.push(() =>
      run("WORLD", `nonce ${i}`, async () => {
        const d = await getJson("/api/nonce");
        if (!d.nonce || d.nonce.length < 8) throw new Error("bad nonce");
      }),
    );
  }

  for (let i = 0; i < 25; i++) {
    cases.push(() =>
      run("WORLD", `rp-signature ${i}`, async () => {
        const res = await fetch(`${BASE}/api/rp-signature`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify-human" }),
        });
        const d = await res.json();
        if (res.status === 501) throw new Error("RP not configured");
        if (!res.ok || !d.sig || !d.nonce) throw new Error(JSON.stringify(d).slice(0, 200));
      }),
    );
  }

  for (let i = 0; i < 15; i++) {
    cases.push(() =>
      run("WORLD", `pay-nonce ${i}`, async () => {
        const d = await getJson("/api/pay-nonce", { method: "POST" });
        if (!d.reference) throw new Error("no reference");
      }),
    );
  }

  for (let i = 0; i < 10; i++) {
    cases.push(() =>
      run("WORLD", `verify-proof rejects bad ${i}`, async () => {
        const res = await fetch(`${BASE}/api/verify-proof`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof: "invalid", merkle_root: "0x0", nullifier_hash: "0x0", verification_level: "orb" }),
        });
        if (res.status < 400) throw new Error(`expected 4xx got ${res.status}`);
      }),
    );
  }

  for (let i = 0; i < 10; i++) {
    cases.push(() =>
      run("WORLD", `complete-siwe rejects bad ${i}`, async () => {
        const res = await fetch(`${BASE}/api/complete-siwe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "bad", signature: "0x00" }),
        });
        if (res.status < 400) throw new Error(`expected 4xx got ${res.status}`);
      }),
    );
  }

  cases.push(() =>
    run("WORLD", "app id configured", async () => {
      if (!APP_ID.startsWith("app_")) throw new Error("NEXT_PUBLIC_WORLD_APP_ID missing");
    }),
  );

  await pool(cases);
}

// ── Integration track ────────────────────────────────────────────────────────
async function integrationTests() {
  const cases = [];

  for (let i = 0; i < 15; i++) {
    cases.push(() =>
      run("INTEGRATION", `catalog ${i}`, async () => {
        const d = await getJson("/api/catalog");
        if (!Array.isArray(d.apps) || d.apps.length < 5) throw new Error(`thin catalog: ${d.apps?.length}`);
      }),
    );
  }

  for (const label of SEED_LABELS) {
    for (let r = 0; r < 2; r++) {
      cases.push(() =>
        run("INTEGRATION", `app fetch ${label} r${r}`, async () => {
          const ens = `${label}.${DOMAIN}`;
          const d = await getJson(`/api/app/${encodeURIComponent(ens)}`);
          if (!d.manifest?.name) throw new Error("no manifest");
        }),
      );
    }
  }

  for (let i = 0; i < 8; i++) {
    cases.push(() =>
      run("INTEGRATION", `agent draft ${i}`, async () => {
        const res = await fetch(`${BASE}/api/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: `Smoke test ${i}: a simple tip jar app` }],
          }),
        });
        const d = await res.json();
        if (!res.ok && !d.error) throw new Error(`agent ${res.status}`);
        if (res.ok && !d.draft && !d.drafts) throw new Error("no draft returned");
      }),
    );
  }

  for (let i = 0; i < 6; i++) {
    const label = `e2e${Date.now().toString(36)}${i}`;
    cases.push(() =>
      run("INTEGRATION", `publish→catalog→run ${i}`, async () => {
        const pub = await getJson("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manifest: minimalManifest(label), creator: "e2e@test" }),
        });
        const cat = await getJson("/api/catalog");
        const found = cat.apps?.some((a) => a.ensName === pub.ensName);
        if (!found) throw new Error("not in catalog after publish");
        const run = await getJson(`/api/app/${encodeURIComponent(pub.ensName)}`);
        if (!run.manifest) throw new Error("manifest missing on run");
        if (pub.blobId) {
          const blob = await fetch(`${BASE}/api/blob/${pub.blobId}`);
          if (!blob.ok) throw new Error("blob proxy failed");
        }
      }),
    );
  }

  await pool(cases);
}

// ── Report ───────────────────────────────────────────────────────────────────
function report(trackFilter) {
  const filtered = trackFilter === "all" ? results : results.filter((r) => r.track === trackFilter.toUpperCase());
  const byTrack = {};
  for (const r of filtered) {
    byTrack[r.track] ??= { pass: 0, fail: 0, fails: [] };
    if (r.ok) byTrack[r.track].pass++;
    else {
      byTrack[r.track].fail++;
      if (byTrack[r.track].fails.length < 8) byTrack[r.track].fails.push({ name: r.name, detail: r.detail });
    }
  }
  const total = filtered.length;
  const passed = filtered.filter((r) => r.ok).length;
  const failed = total - passed;
  const avgMs = total ? Math.round(filtered.reduce((s, r) => s + r.ms, 0) / total) : 0;

  console.log(`\n═══ Forge sponsor smoke: ${trackFilter.toUpperCase()} ═══`);
  console.log(`Base: ${BASE} | Cases: ${total} | Pass: ${passed} | Fail: ${failed} | Avg: ${avgMs}ms`);
  for (const [t, s] of Object.entries(byTrack)) {
    console.log(`  ${t}: ${s.pass} pass / ${s.fail} fail`);
    for (const f of s.fails) console.log(`    ✗ ${f.name}: ${f.detail}`);
  }
  return failed === 0 ? 0 : 1;
}

const t0 = Date.now();
const tracks = TRACK === "all" ? ["ens", "walrus", "world", "integration"] : [TRACK];

await Promise.all(
  tracks.map(async (t) => {
    if (t === "ens") return ensTests();
    if (t === "walrus") return walrusTests();
    if (t === "world") return worldTests();
    if (t === "integration") return integrationTests();
    throw new Error(`unknown track ${t}`);
  }),
);

console.log(`\nTotal wall time: ${Date.now() - t0}ms`);
const code = report(TRACK);
process.exit(code);
