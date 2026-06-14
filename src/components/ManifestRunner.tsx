"use client";

import { Icon } from "@/components/Icon";
import { PunchCard } from "@/components/PunchCard";
import { RestaurantApp } from "@/components/RestaurantApp";
import { isInteractiveComponent, SparkComponent } from "@/components/SparkComponents";
import { SparkCta, SparkShell } from "@/components/SparkShell";
import { WalrusProof } from "@/components/WalrusProof";
import { Pill } from "@/components/ui";
import { VerifyButton } from "@/components/VerifyButton";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { payWorld } from "@/lib/pay";
import { buildMemo, deriveAmount, initFormState, validateForm } from "@/lib/sparkForm";
import { sparkTheme } from "@/lib/sparkTheme";
import {
  addFundraiserRaised,
  addStamp,
  addSupporter,
  addTransitBalance,
  extendParkingSession,
  genCode,
  getCredential,
  getLoyaltyFor,
  getParkingSession,
  getTally,
  getVote,
  issueCredential,
  markUnlocked,
  recordActivity,
  recordVote,
  redeemReward,
  saveDeliverable,
  setParkingSession,
  type Credential,
  type LoyaltyRecord,
} from "@/lib/store";
import type { DappManifest, ManifestComponent, SparkFormState } from "@/lib/types";
import { useEffect, useMemo, useState, type ReactElement } from "react";

type Receipt = { label: string; value: string };
type TallyRow = { label: string; pct: number; count: number; you: boolean };
type DoneCredential = {
  kind: string;
  serial: string;
  code: string;
  holder: string;
  tier?: string;
  partySize?: number;
  validThru?: number;
};
type Done = {
  simulated: boolean;
  pointsEarned: number;
  punches?: number;
  total?: number;
  redeemed?: boolean;
  detail?: string;
  title?: string;
  receipt?: Receipt[];
  credential?: DoneCredential;
  tally?: TallyRow[];
  parkingExpiresAt?: number;
  deliverableId?: string;
  deliverableTitle?: string;
  returning?: boolean;
} | null;

export function ManifestRunner({
  manifest,
  compact,
  editable,
  onManifestChange,
}: {
  manifest: DappManifest;
  compact?: boolean;
  editable?: boolean;
  onManifestChange?: (m: DappManifest) => void;
}) {
  const ens = manifest.ensName;
  const theme = sparkTheme(manifest);
  const { user } = useAuth();
  const holder =
    user && !user.guest
      ? user.username || `${user.address.slice(0, 6)}…${user.address.slice(-4)}`
      : "you";
  const menu = manifest.components.find((c) => c.type === "menu") as Extract<ManifestComponent, { type: "menu" }> | undefined;
  const amountComp = manifest.components.find((c) => c.type === "amountInput") as Extract<ManifestComponent, { type: "amountInput" }> | undefined;
  const recipientComp = manifest.components.find((c) => c.type === "recipient") as Extract<ManifestComponent, { type: "recipient" }> | undefined;
  const punch = manifest.components.find((c) => c.type === "punchCard") as Extract<ManifestComponent, { type: "punchCard" }> | undefined;
  const memoComp = manifest.components.find((c) => c.type === "memoInput") as Extract<ManifestComponent, { type: "memoInput" }> | undefined;
  const submitLabel = (manifest.components.find((c) => c.type === "submitButton") as { label: string } | undefined)?.label ?? "Run";
  const hasDerivedAmount = manifest.components.some(
    (c) =>
      ["durationPicker", "splitBill", "roundUp", "transitPass"].includes(c.type) ||
      (c.type === "choiceGroup" && c.pricesAmount),
  );

  const [loyalty, setLoyalty] = useState<LoyaltyRecord>({ punches: 0, points: 0, redeemed: 0 });
  const [form, setForm] = useState<SparkFormState>(() => initFormState(manifest.components));
  const [memo, setMemo] = useState(memoComp?.default ?? "");
  const [amount, setAmount] = useState(amountComp?.default ?? "");
  const [selectedTip, setSelectedTip] = useState<number | undefined>(undefined);
  const [verified, setVerified] = useState(!manifest.permissions.requiresWorldId);
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState<Done>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setLoyalty(getLoyaltyFor(ens));
    setForm(initFormState(manifest.components));
    setAmount(amountComp?.default ?? "");
    setMemo(memoComp?.default ?? "");
    setSelectedTip(undefined);
    setFormError(null);

    // Returning user: surface the already-issued outcome instead of re-running.
    const stepsCount = manifest.workflow.steps.length;
    const cred = getCredential(ens);
    const vote = getVote(ens);
    const session = getParkingSession(ens);
    const ballotComp = manifest.components.find(
      (c): c is Extract<ManifestComponent, { type: "choiceGroup" }> => c.type === "choiceGroup" && isBallot(c),
    );
    if (cred) {
      setDone(credentialDone(cred, holder, true));
      setStep(stepsCount);
    } else if (vote && ballotComp) {
      setDone({
        simulated: true,
        pointsEarned: 0,
        returning: true,
        title: "You've voted",
        detail: `You voted: ${optLabel(ballotComp, vote.choice)}`,
        tally: buildTally(ballotComp, getTally(ens) ?? {}, vote.choice),
      });
      setStep(stepsCount);
    } else if (session && session.expiresAt > Date.now()) {
      setDone({
        simulated: true,
        pointsEarned: 0,
        returning: true,
        title: "Parking active",
        parkingExpiresAt: session.expiresAt,
        receipt: [
          { label: "Zone", value: session.zone },
          ...(session.plate ? [{ label: "Plate", value: session.plate }] : []),
          { label: "Expires", value: new Date(session.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) },
        ],
      });
      setStep(stepsCount);
    } else {
      setDone(null);
      setStep(-1);
    }
  }, [ens, manifest.components, manifest.workflow.steps.length, amountComp?.default, memoComp?.default, holder]);

  const cardFull = !!punch && loyalty.punches >= punch.total;
  const editableAmount = !!amountComp && !amountComp.locked && !hasDerivedAmount;
  const baseAmount = parseFloat(amount || amountComp?.default || "0") || 0;
  const total = useMemo(() => deriveAmount(manifest, form, baseAmount), [manifest, form, baseAmount]);
  const stepsN = manifest.workflow.steps.length;

  const parkingHourlyRate = useMemo(() => {
    const dur = manifest.components.find((c) => c.type === "durationPicker");
    const zone = manifest.components.find((c) => c.type === "choiceGroup" && c.key === "zone");
    if (!dur || dur.type !== "durationPicker") return undefined;
    let rate = dur.pricePerHourUsd;
    if (zone && zone.type === "choiceGroup") {
      const opt = zone.options.find((o) => o.value === String(form[zone.key]));
      if (opt?.pricePerHourUsd) rate = opt.pricePerHourUsd;
    }
    return rate;
  }, [manifest.components, form]);

  useEffect(() => {
    if (hasDerivedAmount) {
      setAmount(String(deriveAmount(manifest, form, baseAmount)));
    }
  }, [form, manifest, hasDerivedAmount, baseAmount]);

  const validationErr = validateForm(manifest, form);
  const isClaim = !amountComp && !hasDerivedAmount;
  const canSubmit = verified && !validationErr && (total > 0 || isClaim);

  const setField = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
  };

  if (menu) {
    return <RestaurantApp manifest={manifest} />;
  }

  async function run() {
    const err = validateForm(manifest, form);
    if (err) {
      setFormError(err);
      return;
    }

    const note = buildMemo(manifest, form, memo);
    const pay = await payWorld({ to: recipientComp?.value, amountUsd: total, description: manifest.name });
    for (let i = 0; i < stepsN; i++) {
      setStep(i);
      await new Promise((r) => setTimeout(r, 550));
    }

    let pointsEarned = 0;
    let rec: LoyaltyRecord | undefined;
    if (punch) {
      pointsEarned = Math.round(total * punch.pointsPerDollar);
      rec = addStamp(ens, pointsEarned, punch.total);
      setLoyalty(rec);
    }

    // ── Build the persisted outcome + receipt for this Spark ──
    const receipt: Receipt[] = [];
    let detail: string | undefined;
    let title: string | undefined;
    let credential: DoneCredential | undefined;
    let tally: TallyRow[] | undefined;
    let parkingExpiresAt: number | undefined;
    let deliverableId: string | undefined;
    let deliverableTitle: string | undefined;
    const label = ens.split(".")[0];
    const pickedOption = (key: string) => {
      const c = manifest.components.find((x) => x.type === "choiceGroup" && x.key === key);
      return c && c.type === "choiceGroup" ? c.options.find((o) => o.value === String(form[key])) : undefined;
    };

    for (const c of manifest.components) {
      if (c.type === "durationPicker") {
        const mins = Number(form[c.key] ?? c.minMinutes);
        const zone = manifest.components.find((x) => x.type === "choiceGroup");
        const zoneLabel =
          zone && zone.type === "choiceGroup" ? zone.options.find((o) => o.value === String(form[zone.key]))?.label : undefined;
        const plate = String(form.plate ?? "").trim().toUpperCase();
        const expires = new Date(Date.now() + mins * 60_000);
        setParkingSession(ens, { zone: zoneLabel ?? "Zone", minutes: mins, expiresAt: expires.getTime(), plate: plate || undefined });
        parkingExpiresAt = expires.getTime();
        title = "Parking active";
        receipt.push({ label: "Zone", value: zoneLabel ?? "Zone" });
        if (plate) receipt.push({ label: "Plate", value: plate });
        receipt.push({ label: "Until", value: expires.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) });
      }
      if (c.type === "transitPass") {
        const bal = addTransitBalance(ens, total);
        title = "Topped up";
        receipt.push({ label: "Top-up", value: `$${total.toFixed(2)}` }, { label: "New balance", value: `$${bal.toFixed(2)}` });
      }
      if ((c.type === "progressGoal" || c.type === "supporterWall") && total > 0) {
        const raised = addFundraiserRaised(ens, total);
        addSupporter(ens, { handle: holder, amountUsd: total });
        title = "Thank you";
        detail = `$${raised.toLocaleString()} raised so far`;
        receipt.push({ label: "Your gift", value: `$${total.toFixed(2)}` });
      }
      if (c.type === "membershipCard") {
        const cred = issueCredential(ens, {
          kind: "membership",
          serial: `M-${genCode(5)}`,
          code: genCode(6),
          tier: c.tier,
          validThru: Date.now() + 30 * 86_400_000,
        });
        credential = { ...cred, holder };
        title = "Membership active";
        receipt.push({ label: "Tier", value: c.tier }, { label: "Member", value: cred.serial });
      }
    }

    // Ballot vote (claim, one-per-human) — record + local tally
    const ballotComp = manifest.components.find(
      (c): c is Extract<ManifestComponent, { type: "choiceGroup" }> => c.type === "choiceGroup" && isBallot(c),
    );
    if (ballotComp && isClaim) {
      const myChoice = String(form[ballotComp.key] ?? "");
      const { tally: t } = recordVote(ens, myChoice, baseTally(ens, ballotComp));
      tally = buildTally(ballotComp, t, myChoice);
      title = "Vote counted";
      detail = `You voted: ${optLabel(ballotComp, myChoice)}`;
    }

    // Agent deliverable (Agents Spark with a task brief) — produce a structured artifact
    const taskComp = manifest.components.find(
      (c): c is Extract<ManifestComponent, { type: "textArea" }> => c.type === "textArea",
    );
    if (manifest.category === "Agents" && taskComp) {
      const agentPick = manifest.components.find(
        (c): c is Extract<ManifestComponent, { type: "choiceGroup" }> => c.type === "choiceGroup" && c.options.some((o) => o.ens),
      );
      const opt: { label: string; ens?: string } = agentPick
        ? agentPick.options.find((o) => o.value === String(form[agentPick.key])) ?? agentPick.options[0]
        : { label: manifest.name };
      const brief = String(form[taskComp.key] ?? "").trim();
      const saved = saveDeliverable(buildDeliverable(manifest, opt, brief, pay.simulated, form));
      deliverableId = saved.id;
      deliverableTitle = saved.title;
      title = "Delivered";
      receipt.push({ label: "Agent", value: opt.ens ?? opt.label });
    }

    // Event claim credential (raffle / tickets / rsvp)
    const credKind = credKindFor(label, manifest.category);
    if (!credential && isClaim && credKind) {
      const tierOpt = pickedOption("tier");
      const guests = Number(form.guests ?? 0);
      const partySize = credKind === "rsvp" ? 1 + guests : credKind === "pass" ? 1 : undefined;
      const cred = issueCredential(ens, {
        kind: credKind,
        serial: credSerial(credKind),
        code: genCode(6),
        tier: tierOpt?.label,
        partySize,
      });
      credential = { ...cred, holder };
      title = credTitle(credKind);
      if (partySize && credKind === "rsvp") receipt.push({ label: "Party", value: `${partySize}` });
    }

    // Dues / paid membership proof (pay + one-per-human "join")
    if (
      !credential &&
      total > 0 &&
      manifest.permissions.requiresWorldId &&
      /join|due|member/i.test(`${label} ${manifest.permissions.worldPolicy ?? ""}`)
    ) {
      const cred = issueCredential(ens, { kind: "member", serial: `MBR-${genCode(4)}`, code: genCode(6) });
      credential = { ...cred, holder };
      title = title ?? "You're in";
    }

    // Article unlock — pay once, stay unlocked
    if (manifest.components.some((c) => c.type === "infoCard" && c.body)) {
      markUnlocked(ens);
      title = "Unlocked";
      detail = "Enjoy the read — scroll up.";
    }

    // Split-bill summary
    const split = manifest.components.find((c) => c.type === "splitBill");
    if (split && split.type === "splitBill") {
      const people = Number(form[split.key ?? "people"] ?? split.defaultPeople ?? 2);
      receipt.push({ label: "Split", value: `${people} ways · $${split.totalUsd.toFixed(2)} total` });
    }

    // Generic payment line
    if (total > 0 && !receipt.some((r) => /paid|gift|top-up/i.test(r.label))) {
      receipt.unshift({ label: "Paid", value: `$${total.toFixed(2)} USDC` });
    }

    recordActivity({
      ens,
      title: manifest.name,
      kind: punch ? "purchase" : total > 0 ? "purchase" : "claim",
      amountUsd: total || undefined,
      points: pointsEarned || undefined,
      note: note || detail,
      simulated: pay.simulated,
    });

    setStep(stepsN);
    setDone({
      simulated: pay.simulated,
      pointsEarned,
      punches: rec?.punches,
      total: punch?.total,
      detail,
      title,
      receipt: receipt.length ? receipt : undefined,
      credential,
      tally,
      parkingExpiresAt,
      deliverableId,
      deliverableTitle,
    });
  }

  async function redeem() {
    setStep(0);
    await new Promise((r) => setTimeout(r, 700));
    const rec = redeemReward(ens);
    setLoyalty(rec);
    recordActivity({ ens, title: `Redeemed · ${punch?.reward}`, kind: "redeem" });
    setStep(stepsN);
    setDone({ simulated: true, pointsEarned: 0, redeemed: true });
  }

  function extendParking(min: number) {
    const s = extendParkingSession(ens, min);
    if (!s) return;
    recordActivity({ ens, title: `${manifest.name} · +${min}m`, kind: "purchase" });
    setDone((d) =>
      d
        ? {
            ...d,
            parkingExpiresAt: s.expiresAt,
            receipt: d.receipt?.map((r) =>
              r.label === "Until" || r.label === "Expires"
                ? { ...r, value: new Date(s.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }
                : r,
            ),
          }
        : d,
    );
  }

  return (
    <SparkShell
      manifest={manifest}
      compact={compact}
      editable={editable}
      onCoverImage={
        editable && onManifestChange
          ? (blobId) =>
              onManifestChange({
                ...manifest,
                storage: { ...manifest.storage, imageBlobId: blobId },
              })
          : undefined
      }
    >
      <p className="rounded-2xl px-4 py-3 text-[14px] font-medium leading-snug" style={{ background: theme.soft, color: theme.ink }}>
        {manifest.outcome}
      </p>
      {manifest.permissions.requiresWorldId && (
        <Pill tone="green">World ID · {manifest.permissions.worldPolicy ?? "one per human"}</Pill>
      )}

      {manifest.components.map((c, i) => {
        if (isInteractiveComponent(c.type)) {
          return (
            <SparkComponent
              key={`${c.type}-${i}`}
              component={c}
              ens={ens}
              theme={theme}
              form={form}
              setField={setField}
              selectedTip={selectedTip}
              onTipSelect={(p) => {
                setSelectedTip(p);
                setAmount(String(p));
                setFormError(null);
              }}
              onAmountChange={(a) => {
                setAmount(String(a));
                setFormError(null);
              }}
              hourlyRate={c.type === "durationPicker" ? parkingHourlyRate : undefined}
            />
          );
        }
        return null;
      })}

      {punch && (
        <PunchCard
          brand={manifest.name}
          ens={ens}
          category={manifest.category}
          total={punch.total}
          reward={punch.reward}
          record={loyalty}
        />
      )}

      {amountComp && !hasDerivedAmount && (
        <Row theme={theme} label="Amount">
          {amountComp.locked ? (
            <span>
              <span className="font-bold">${amountComp.default}</span> <span className="text-muted">{amountComp.token}</span>
            </span>
          ) : (
            <span className="flex items-center justify-end gap-1">
              $
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                className="w-16 bg-transparent text-right font-bold outline-none"
              />
              <span className="text-muted">{amountComp.token}</span>
            </span>
          )}
        </Row>
      )}

      {hasDerivedAmount && total > 0 && (
        <Row theme={theme} label="Total">
          <span className="display font-extrabold" style={{ color: theme.accent }}>
            ${total.toFixed(2)} USDC
          </span>
        </Row>
      )}

      {recipientComp && (
        <Row theme={theme} label="To">
          <span className="font-mono text-[12px]">{recipientComp.value}</span>
        </Row>
      )}
      {memoComp && (
        <Row theme={theme} label="Memo">
          <input value={memo} onChange={(e) => setMemo(e.target.value)} className="w-full bg-transparent text-right outline-none" />
        </Row>
      )}

      {step === -1 && !done && (
        <>
          {!verified ? (
            <VerifyButton signal={ens} onVerified={() => setVerified(true)} />
          ) : cardFull ? (
            <button
              onClick={redeem}
              className="rounded-3xl bg-success px-5 py-4 text-[15px] font-bold text-white transition active:scale-[0.98]"
            >
              Redeem {punch?.reward} (free)
            </button>
          ) : (
            <>
              {formError && <p className="text-center text-xs font-semibold text-warn">{formError}</p>}
              <SparkCta theme={theme} disabled={!canSubmit} onClick={run}>
                {submitLabel}
                {total > 0 ? ` · $${total.toFixed(2)}` : ""}
              </SparkCta>
            </>
          )}
        </>
      )}

      {step >= 0 && !done && (
        <div className="flex flex-col gap-2 p-4" style={{ background: theme.soft, borderRadius: theme.radius }}>
          {manifest.workflow.steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <span className={i <= step ? "text-success" : "text-faint"}>
                {i < step ? <Icon name="check" className="inline h-3.5 w-3.5" /> : i === step ? "○" : "·"}
              </span>
              <span className={i <= step ? "font-semibold" : "text-faint"}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {done && (
        <div className="flex flex-col gap-3">
          <div className="p-6 text-center" style={{ background: theme.soft, borderRadius: theme.radius }}>
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white"
              style={{ background: theme.accent }}
            >
              <Icon name="check" />
            </div>
            <p className="display mt-3 text-[22px] font-extrabold" style={{ color: theme.ink }}>
              {done.title ?? (done.redeemed ? "Reward redeemed" : "All done")}
            </p>
            {done.detail && (
              <p className="mt-1.5 text-[14px] font-semibold" style={{ color: theme.accent }}>
                {done.detail}
              </p>
            )}
            {done.pointsEarned > 0 && (
              <p className="display mt-2 text-[40px] font-extrabold leading-none" style={{ color: theme.accent }}>
                +{done.pointsEarned}
                <span className="ml-1.5 text-[16px] font-bold opacity-70">pts</span>
              </p>
            )}
            {done.punches != null && done.total != null && (
              <p className="mt-2 text-[13px] font-semibold text-muted">
                {done.punches}/{done.total} stamps
                {done.total > done.punches ? ` · ${done.total - done.punches} to your reward` : " · reward unlocked!"}
              </p>
            )}
          </div>

          {done.credential && (
            <div className="relative overflow-hidden p-5 text-white" style={{ background: theme.gradient, borderRadius: theme.radius }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
                    {done.credential.kind === "membership"
                      ? "Member pass"
                      : done.credential.kind === "rsvp"
                        ? "Reservation"
                        : done.credential.kind === "entry"
                          ? "Raffle entry"
                          : "Event pass"}
                  </p>
                  <p className="display mt-1 text-[24px] font-extrabold leading-none">{done.credential.serial}</p>
                  <p className="mt-1 truncate text-[12.5px] text-white/70">{done.credential.holder}</p>
                  {done.credential.tier && <p className="mt-0.5 text-[12px] text-white/70">{done.credential.tier}</p>}
                  {done.credential.partySize ? (
                    <p className="mt-0.5 text-[12px] text-white/70">Party of {done.credential.partySize}</p>
                  ) : null}
                  {done.credential.validThru ? (
                    <p className="mt-0.5 text-[12px] text-white/70">
                      Valid thru {new Date(done.credential.validThru).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 rounded-xl bg-white p-1.5">
                  <CodeMatrix seed={done.credential.code} color={theme.ink} />
                </div>
              </div>
              <p className="mt-3 border-t border-white/15 pt-2 font-mono text-[12px] tracking-[0.2em] text-white/80">
                {done.credential.code}
              </p>
            </div>
          )}

          {done.tally && (
            <div className="p-4" style={{ background: theme.soft, borderRadius: theme.radius }}>
              <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">Live results</p>
              <div className="flex flex-col gap-2.5">
                {done.tally.map((r) => (
                  <div key={r.label}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span className="font-semibold" style={{ color: theme.ink }}>
                        {r.label}
                        {r.you ? " · you" : ""}
                      </span>
                      <span className="font-bold" style={{ color: theme.accent }}>{r.pct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.you ? theme.accent : `${theme.accent}88` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done.receipt && done.receipt.length > 0 && (
            <div className="p-4" style={{ background: theme.soft, borderRadius: theme.radius }}>
              <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-muted">Receipt</p>
              <div className="flex flex-col gap-1.5">
                {done.receipt.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[13.5px]">
                    <span className="text-muted">{r.label}</span>
                    <span className="font-semibold" style={{ color: theme.ink }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done.parkingExpiresAt && (
            <div className="flex gap-2">
              {[15, 30, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => extendParking(m)}
                  className="flex-1 rounded-2xl py-3 text-[13px] font-bold transition active:scale-[0.97]"
                  style={{ background: theme.soft, color: theme.accent }}
                >
                  +{m}m
                </button>
              ))}
            </div>
          )}

          {done.deliverableId && (
            <Link
              href={`/deliverable/${done.deliverableId}`}
              className="flex items-center justify-between gap-3 p-4 transition active:scale-[0.99]"
              style={{ background: theme.soft, borderRadius: theme.radius }}
            >
              <span className="flex min-w-0 items-center gap-2.5" style={{ color: theme.ink }}>
                <span style={{ color: theme.accent }}>
                  <Icon name="receipt" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-muted">Deliverable</span>
                  <span className="block truncate text-[14px] font-bold">{done.deliverableTitle}</span>
                </span>
              </span>
              <span style={{ color: theme.accent }}>
                <Icon name="arrow-right" size={18} />
              </span>
            </Link>
          )}

          {!done.returning && (
            <p className="text-center text-xs text-muted">
              {done.simulated
                ? "Simulated settle (open in World App + fund your wallet to pay for real)."
                : "Settled in your World wallet."}
            </p>
          )}
        </div>
      )}

      {manifest.storage?.manifestBlobId && (
        <WalrusProof blobId={manifest.storage.manifestBlobId} label="Walrus manifest" />
      )}
    </SparkShell>
  );
}

function Row({ theme, label, children }: { theme: ReturnType<typeof sparkTheme>; label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
      style={{ background: theme.soft, borderRadius: theme.radius }}
    >
      <span className="font-semibold text-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right">{children}</span>
    </div>
  );
}

// ── Outcome helpers (module scope) ──
function isBallot(c: Extract<ManifestComponent, { type: "choiceGroup" }>): boolean {
  return c.key === "vote" || /ballot|vote/i.test(c.label);
}
function optLabel(c: Extract<ManifestComponent, { type: "choiceGroup" }>, value: string): string {
  return c.options.find((o) => o.value === value)?.label ?? value;
}
function hashNum(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
/** Deterministic, plausible pre-existing counts so a ballot reads as live. */
function baseTally(ens: string, c: Extract<ManifestComponent, { type: "choiceGroup" }>): Record<string, number> {
  const t: Record<string, number> = {};
  c.options.forEach((o, i) => {
    const v = 80 + (hashNum(ens + o.value) % 800) - i * 30;
    t[o.value] = v < 12 ? 12 + (hashNum(o.value) % 40) : v;
  });
  return t;
}
function buildTally(c: Extract<ManifestComponent, { type: "choiceGroup" }>, tally: Record<string, number>, mine: string): TallyRow[] {
  const total = Math.max(1, c.options.reduce((s, o) => s + (tally[o.value] ?? 0), 0));
  return c.options.map((o) => {
    const count = tally[o.value] ?? 0;
    return { label: o.label, count, pct: Math.round((count / total) * 100), you: o.value === mine };
  });
}
function credKindFor(label: string, category: string): Credential["kind"] | null {
  if (/raffle|lotter/.test(label)) return "entry";
  if (/ticket/.test(label)) return "pass";
  if (/rsvp/.test(label)) return "rsvp";
  return category === "Events" ? "pass" : null;
}
function credSerial(kind: Credential["kind"]): string {
  if (kind === "entry") return `#${1000 + Math.floor(Math.random() * 9000)}`;
  if (kind === "pass") return `GA-${genCode(4)}`;
  if (kind === "rsvp") return `RSVP-${genCode(4)}`;
  if (kind === "membership") return `M-${genCode(5)}`;
  return `MBR-${genCode(4)}`;
}
function credTitle(kind: string): string {
  return kind === "entry"
    ? "You're entered"
    : kind === "pass"
      ? "Pass issued"
      : kind === "rsvp"
        ? "You're on the list"
        : kind === "membership"
          ? "Membership active"
          : "You're in";
}
function credentialDone(cred: Credential, holder: string, returning: boolean): Done {
  return { simulated: true, pointsEarned: 0, returning, title: credTitle(cred.kind), credential: { ...cred, holder } };
}
function buildDeliverable(
  manifest: DappManifest,
  opt: { label: string; ens?: string },
  brief: string,
  simulated: boolean,
  form: SparkFormState,
): Parameters<typeof saveDeliverable>[0] {
  const itinerary = /trip|travel|wander|itinerary/i.test(`${manifest.ensName} ${manifest.name}`);
  const title = brief ? (brief.length > 58 ? `${brief.slice(0, 57)}…` : brief) : `${opt.label} ${itinerary ? "itinerary" : "brief"}`;
  const sections = itinerary
    ? (() => {
        const nights = Math.max(1, Number(form.nights ?? 3));
        const days = ["Morning: a hand-picked highlight near your stay.", "Afternoon: a local experience matched to your vibe.", "Evening: a dinner pick with a backup option."];
        return [
          { heading: "Trip overview", body: `${opt.label} drafted a ${nights}-night plan${brief ? ` for: ${brief}` : ""}. Nothing is booked — you approve every step.` },
          ...Array.from({ length: Math.min(nights, 5) }, (_, i) => ({ heading: `Day ${i + 1}`, body: days[i % 3] })),
          { heading: "What's booked", body: "Nothing yet — confirm to let the agent hold reservations." },
        ];
      })()
    : [
        { heading: "Summary", body: `${opt.label} reviewed your request${brief ? `: ${brief}` : ""} and prepared the findings below.` },
        { heading: "Key findings", body: "Three concrete takeaways with the trade-offs that matter for your decision, drawn from current sources." },
        { heading: "Sources", body: "Primary references the agent consulted, each with an ENS-verified provenance trail." },
        { heading: "Recommendation", body: "A clear next step you can act on, with the main risk called out." },
      ];
  return { ens: manifest.ensName, sparkName: manifest.name, agentName: opt.label, agentEns: opt.ens, kind: itinerary ? "itinerary" : "research", title, sections, brief, simulated };
}
/** Decorative deterministic "scan code" matrix for issued passes. */
function CodeMatrix({ seed, color }: { seed: string; color: string }) {
  const n = 11;
  let h = hashNum(seed) || 1;
  const cells: ReactElement[] = [];
  for (let i = 0; i < n * n; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    if ((h >> 6) % 2 === 0) {
      cells.push(<rect key={i} x={i % n} y={Math.floor(i / n)} width="0.92" height="0.92" rx="0.2" fill={color} />);
    }
  }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width="88" height="88" shapeRendering="crispEdges" aria-hidden="true">
      {cells}
    </svg>
  );
}
