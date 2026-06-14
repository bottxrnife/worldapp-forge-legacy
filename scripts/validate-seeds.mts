/**
 * One-off validation check: all SEED_APPS + invalid manifest cases.
 * Run: npx tsx scripts/validate-seeds.mts
 */
import { validateManifest } from "../src/lib/manifest.ts";
import { SEED_APPS } from "../src/lib/seeds.ts";

function seedInput(m: (typeof SEED_APPS)[number]) {
  const label = m.ensName.split(".")[0];
  return {
    ...m,
    ensLabel: label,
    permissions: m.permissions,
    workflow: m.workflow,
  };
}

console.log("=== SEED_APPS validation ===\n");
const failures: { name: string; ens: string; errors: string[] }[] = [];

for (const seed of SEED_APPS) {
  const result = validateManifest(seedInput(seed), seed.creator);
  if (!result.ok) {
    failures.push({ name: seed.name, ens: seed.ensName, errors: result.errors });
    console.log(`FAIL  ${seed.name} (${seed.ensName})`);
    for (const e of result.errors) console.log(`      - ${e}`);
  } else {
    const w = result.warnings.length ? ` [warnings: ${result.warnings.join("; ")}]` : "";
    console.log(`PASS  ${seed.name} (${seed.ensName})${w}`);
  }
}

console.log(`\nTotal: ${SEED_APPS.length} seeds, ${failures.length} failures\n`);

console.log("=== Invalid manifest rejection tests ===\n");

type Case = { label: string; input: unknown; expectError: RegExp | string };
const base = seedInput(SEED_APPS[0]);

const invalidCases: Case[] = [
  { label: "null input", input: null, expectError: "manifest must be an object" },
  { label: "missing name", input: { ...base, name: "" }, expectError: "name" },
  { label: "missing description", input: { ...base, description: "" }, expectError: "description" },
  { label: "missing outcome", input: { ...base, outcome: "" }, expectError: "outcome" },
  { label: "missing ensLabel", input: { ...base, ensLabel: "", ensName: "" }, expectError: "ensLabel" },
  { label: "unknown component", input: { ...base, components: [{ type: "evilWidget" }, { type: "submitButton", label: "Go" }] }, expectError: "unknown component" },
  { label: "no submitButton", input: { ...base, components: [{ type: "amountInput", token: "USDC", default: "1" }] }, expectError: "submitButton" },
  { label: "bad punchCard", input: { ...base, components: [{ type: "punchCard", total: 0, reward: "", pointsPerDollar: -1 }, { type: "submitButton", label: "Go" }] }, expectError: "punchCard" },
  { label: "empty menu", input: { ...base, components: [{ type: "menu", currency: "USDC", items: [] }, { type: "submitButton", label: "Go" }] }, expectError: "menu must list" },
  { label: "menu bad item", input: { ...base, components: [{ type: "menu", currency: "USDC", items: [{ id: "a", name: "", priceUsd: -1 }] }, { type: "submitButton", label: "Go" }] }, expectError: "menu item" },
  { label: "duplicate menu ids", input: { ...base, components: [{ type: "menu", currency: "USDC", items: [{ id: "x", name: "A", priceUsd: 1 }, { id: "x", name: "B", priceUsd: 2 }] }, { type: "submitButton", label: "Go" }] }, expectError: "unique" },
  { label: "no permissions", input: { ...base, permissions: { plainEnglish: [] } }, expectError: "permissions" },
  { label: "raw address in perms", input: { ...base, permissions: { ...base.permissions, plainEnglish: ["Send to 0x1234567890abcdef"] } }, expectError: "raw addresses" },
  { label: "too few workflow steps", input: { ...base, workflow: { ...base.workflow, steps: [{ id: "s0", label: "One", detail: "Only" }] } }, expectError: "workflow.steps" },
  { label: "step missing detail", input: { ...base, workflow: { ...base.workflow, steps: [{ id: "s0", label: "A", detail: "x" }, { id: "s1", label: "B", detail: "" }] } }, expectError: "label and a detail" },
];

let invalidPass = 0;
let invalidFail = 0;

for (const c of invalidCases) {
  const result = validateManifest(c.input);
  if (result.ok) {
    console.log(`UNEXPECTED PASS  ${c.label}`);
    invalidFail++;
  } else {
    const joined = result.errors.join("; ");
    const match =
      typeof c.expectError === "string"
        ? joined.toLowerCase().includes(c.expectError.toLowerCase())
        : c.expectError.test(joined);
    if (match) {
      console.log(`REJECT OK  ${c.label}`);
      console.log(`           → ${joined}`);
      invalidPass++;
    } else {
      console.log(`REJECT WEAK  ${c.label} (expected ~${c.expectError})`);
      console.log(`           → ${joined}`);
      invalidFail++;
    }
  }
}

console.log(`\nInvalid cases: ${invalidPass}/${invalidCases.length} rejected with expected errors\n`);

// imageBlobId gap probe
console.log("=== imageBlobId schema gap probe ===\n");
const menuSeed = SEED_APPS.find((s) => s.components.some((c) => c.type === "menu"))!;
const withBlob = {
  ...seedInput(menuSeed),
  components: menuSeed.components.map((c) =>
    c.type === "menu"
      ? { ...c, items: c.items.map((it, i) => (i === 0 ? { ...it, imageBlobId: "not-a-valid-blob!!!" } : it)) }
      : c,
  ),
};
const blobResult = validateManifest(withBlob);
console.log(
  blobResult.ok
    ? "GAP: invalid imageBlobId on menu item PASSES validation (no format check)"
    : `imageBlobId invalid rejected: ${(blobResult as { errors: string[] }).errors.join("; ")}`,
);

const garbageStorage = { ...seedInput(SEED_APPS[0]), storage: { imageBlobId: 12345, manifestBlobId: null } };
const storageResult = validateManifest(garbageStorage);
console.log(
  storageResult.ok
    ? "GAP: garbage storage.imageBlobId PASSES validation (no shape check)"
    : `storage rejected: ${(storageResult as { errors: string[] }).errors.join("; ")}`,
);

process.exit(failures.length + invalidFail > 0 ? 1 : 0);
