/**
 * One-off validation report: all seed manifests + sparkForm interactive logic.
 * Run: npx tsx scripts/test-manifest-sparkform.mts
 */
import { validateManifest } from "../src/lib/manifest.ts";
import {
  initFormState,
  deriveAmount,
  validateForm,
  buildMemo,
} from "../src/lib/sparkForm.ts";
import { SEED_APPS } from "../src/lib/seeds.ts";
import type { DappManifest, ManifestComponent } from "../src/lib/types.ts";

type CaseResult = { name: string; pass: boolean; detail: string };

function assert(name: string, cond: boolean, detail: string): CaseResult {
  return { name, pass: cond, detail };
}

function findSeed(labelPrefix: string): DappManifest {
  const m = SEED_APPS.find((s) => s.ensName.startsWith(`${labelPrefix}.`));
  if (!m) throw new Error(`seed not found: ${labelPrefix}`);
  return m;
}

function comp<T extends ManifestComponent["type"]>(
  manifest: DappManifest,
  type: T,
): Extract<ManifestComponent, { type: T }> {
  const c = manifest.components.find((x) => x.type === type);
  if (!c) throw new Error(`component ${type} missing on ${manifest.ensName}`);
  return c as Extract<ManifestComponent, { type: T }>;
}

// ── 1. validateManifest on all seeds ───────────────────────────────────────
const seedResults: CaseResult[] = [];

for (const seed of SEED_APPS) {
  const label = seed.ensName.split(".")[0];
  const result = validateManifest(
    {
      name: seed.name,
      description: seed.description,
      outcome: seed.outcome,
      ensName: seed.ensName,
      category: seed.category,
      secondaryCategory: seed.secondaryCategory,
      components: seed.components,
      permissions: seed.permissions,
      workflow: seed.workflow,
      storage: seed.storage,
    },
    seed.creator,
  );

  if (result.ok) {
    const warn =
      result.warnings.length > 0 ? ` (warnings: ${result.warnings.join("; ")})` : "";
    seedResults.push(assert(label, true, `PASS${warn}`));
  } else {
    seedResults.push(assert(label, false, result.errors.join(" | ")));
  }
}

// ── 2. sparkForm: parking (choiceGroup + durationPicker) ───────────────────
const parking = findSeed("parking");
const parkingCases: CaseResult[] = [];

const parkingInit = initFormState(parking.components);
parkingCases.push(
  assert(
    "parking initFormState zone empty",
    parkingInit.zone === "",
    `zone=${JSON.stringify(parkingInit.zone)}`,
  ),
);
parkingCases.push(
  assert(
    "parking initFormState duration default",
    parkingInit.duration === 60,
    `duration=${parkingInit.duration} (expected 60)`,
  ),
);

const formZone101_1h = { zone: "101", duration: 60 };
parkingCases.push(
  assert(
    "parking derive zone 101 · 60m",
    deriveAmount(parking, formZone101_1h, 0.5) === 2,
    `got ${deriveAmount(parking, formZone101_1h, 0.5)} (expected 2.00)`,
  ),
);

const formZone204_2h = { zone: "204", duration: 120 };
parkingCases.push(
  assert(
    "parking derive zone 204 · 120m",
    deriveAmount(parking, formZone204_2h, 0.5) === 6,
    `got ${deriveAmount(parking, formZone204_2h, 0.5)} (expected 6.00)`,
  ),
);

parkingCases.push(
  assert(
    "parking validateForm requires zone",
    validateForm(parking, { duration: 60 }) === "Pick parking zone",
    `got ${JSON.stringify(validateForm(parking, { duration: 60 }))}`,
  ),
);
parkingCases.push(
  assert(
    "parking validateForm ok when zone picked",
    validateForm(parking, formZone101_1h) === null,
    `got ${JSON.stringify(validateForm(parking, formZone101_1h))}`,
  ),
);

const parkingMemo = buildMemo(parking, formZone101_1h, "Meter");
parkingCases.push(
  assert(
    "parking buildMemo includes zone + duration",
    parkingMemo.includes("Parking zone") && parkingMemo.includes("1h"),
    parkingMemo,
  ),
);

// Edge: 15 min minimum at $3/hr zone
parkingCases.push(
  assert(
    "parking derive 15m zone 204",
    deriveAmount(parking, { zone: "204", duration: 15 }, 0.5) === 0.75,
    `got ${deriveAmount(parking, { zone: "204", duration: 15 }, 0.5)} (expected 0.75)`,
  ),
);

// ── 3. sparkForm: splitBill ──────────────────────────────────────────────────
const split = findSeed("split");
const splitCases: CaseResult[] = [];

const splitInit = initFormState(split.components);
splitCases.push(
  assert(
    "splitBill initFormState defaultPeople",
    splitInit.people === 6,
    `people=${splitInit.people} (expected 6)`,
  ),
);

splitCases.push(
  assert(
    "splitBill derive default 6 people",
    deriveAmount(split, splitInit, 12) === 12,
    `got ${deriveAmount(split, splitInit, 12)} (72/6=12)`,
  ),
);

splitCases.push(
  assert(
    "splitBill derive 4 people",
    deriveAmount(split, { people: 4 }, 12) === 18,
    `got ${deriveAmount(split, { people: 4 }, 12)} (72/4=18)`,
  ),
);

splitCases.push(
  assert(
    "splitBill derive floors at 1 person",
    deriveAmount(split, { people: 0 }, 12) === 72,
    `got ${deriveAmount(split, { people: 0 }, 12)} (72/1=72)`,
  ),
);

splitCases.push(
  assert(
    "splitBill buildMemo",
    buildMemo(split, { people: 6 }, "Dinner").includes("6 people"),
    buildMemo(split, { people: 6 }, "Dinner"),
  ),
);

// ── 4. sparkForm: tipPresets ─────────────────────────────────────────────────
const tipjar = findSeed("tipjar");
const tipCases: CaseResult[] = [];

const tipComp = comp(tipjar, "tipPresets");
tipCases.push(
  assert(
    "tipPresets presets present",
    tipComp.presets.length >= 1 && tipComp.presets.every((p) => p > 0),
    `presets=${JSON.stringify(tipComp.presets)}`,
  ),
);

const tipInit = initFormState(tipjar.components);
tipCases.push(
  assert(
    "tipPresets initFormState does not set amount key",
    tipInit.tip === undefined && tipInit.amount === undefined,
    `keys=${Object.keys(tipInit).join(",") || "(empty)"}`,
  ),
);

// deriveAmount ignores tipPresets — uses amountInput fallback
tipCases.push(
  assert(
    "tipPresets deriveAmount uses fallback (not preset)",
    deriveAmount(tipjar, tipInit, 2) === 2,
    `got ${deriveAmount(tipjar, tipInit, 2)} — tipPresets not wired in deriveAmount`,
  ),
);

tipCases.push(
  assert(
    "tipPresets validateForm no error",
    validateForm(tipjar, tipInit) === null,
    `got ${JSON.stringify(validateForm(tipjar, tipInit))}`,
  ),
);

// ── 5. sparkForm: roundUp ────────────────────────────────────────────────────
const roundup = findSeed("roundup");
const roundCases: CaseResult[] = [];

const roundInit = initFormState(roundup.components);
roundCases.push(
  assert(
    "roundUp initFormState roundTo ceil purchase",
    roundInit.roundTo === 8,
    `roundTo=${roundInit.roundTo} (expected ceil(7.43)=8)`,
  ),
);

roundCases.push(
  assert(
    "roundUp derive default roundTo",
    deriveAmount(roundup, roundInit, 0.57) === 0.57,
    `got ${deriveAmount(roundup, roundInit, 0.57)} (8-7.43=0.57)`,
  ),
);

roundCases.push(
  assert(
    "roundUp derive roundTo=10",
    deriveAmount(roundup, { roundTo: 10 }, 0.57) === 2.57,
    `got ${deriveAmount(roundup, { roundTo: 10 }, 0.57)} (10-7.43=2.57)`,
  ),
);

roundCases.push(
  assert(
    "roundUp derive roundTo below purchase → 0",
    deriveAmount(roundup, { roundTo: 7 }, 0.57) === 0,
    `got ${deriveAmount(roundup, { roundTo: 7 }, 0.57)} (max(0,7-7.43)=0)`,
  ),
);

roundCases.push(
  assert(
    "roundUp validateForm no error",
    validateForm(roundup, roundInit) === null,
    `got ${JSON.stringify(validateForm(roundup, roundInit))}`,
  ),
);

// ── Report ───────────────────────────────────────────────────────────────────
function printSection(title: string, cases: CaseResult[]) {
  const passed = cases.filter((c) => c.pass).length;
  const failed = cases.filter((c) => !c.pass);
  console.log(`\n## ${title}`);
  console.log(`Summary: ${passed}/${cases.length} PASS`);
  for (const c of cases) {
    console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name}`);
    if (!c.pass || c.detail.includes("warning")) {
      console.log(`         ${c.detail}`);
    }
  }
  if (failed.length) {
    console.log("Failures:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  }
  return failed.length;
}

console.log("=".repeat(72));
console.log("Forge manifest + sparkForm validation report");
console.log("=".repeat(72));

let totalFail = 0;
totalFail += printSection("Seed manifest validation (validateManifest)", seedResults);
totalFail += printSection("sparkForm — parking (durationPicker + zone choiceGroup)", parkingCases);
totalFail += printSection("sparkForm — splitBill", splitCases);
totalFail += printSection("sparkForm — tipPresets (edge: no deriveAmount hook)", tipCases);
totalFail += printSection("sparkForm — roundUp", roundCases);

console.log("\n" + "=".repeat(72));
console.log(totalFail === 0 ? "OVERALL: PASS" : `OVERALL: FAIL (${totalFail} failing cases)`);
console.log("=".repeat(72));

process.exit(totalFail === 0 ? 0 : 1);
