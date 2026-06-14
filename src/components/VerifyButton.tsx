"use client";

import { APP, hasWorldApp } from "@/lib/config";
import { IDKitRequestWidget, proofOfHuman, type IDKitResult, type RpContext } from "@worldcoin/idkit";
import { useRef, useState } from "react";

/** Friendly copy for the common IDKit / World App bridge error codes so the
 *  user sees something actionable instead of a generic "something went wrong". */
const VERIFY_ERRORS: Record<string, string> = {
  user_rejected: "Verification cancelled — tap to try again.",
  verification_rejected: "Verification cancelled — tap to try again.",
  cancelled: "Verification cancelled — tap to try again.",
  timeout: "That timed out — tap to try again.",
  connection_failed: "Connection issue — check your network and retry.",
  credential_unavailable: "Finish your World ID in World App first, then retry.",
  world_id_4_not_available: "Your World ID isn't ready for this yet — open World App to finish setup.",
  world_id_3_not_available: "Your World ID isn't ready for this yet — open World App to finish setup.",
  invalid_network: "World ID environment mismatch — reopen the app and retry.",
  rp_signature_expired: "That took too long — tap to try again.",
  duplicate_nonce: "Tap verify again to get a fresh request.",
  nullifier_replayed: "You've already verified for this once.",
  max_verifications_reached: "You've already done this the maximum number of times.",
  failed_by_host_app: "Verification failed on our end — tap to try again.",
};

/**
 * Proof-of-human gate. Inside World App, IDKit uses the native World App
 * transport (no QR). We request the `proofOfHuman` credential (World ID 4.0 with
 * a legacy Orb fallback) — `orbLegacy` only returns 3.0 proofs and fails for
 * 4.0-only users. The RP request is signed by our backend and the proof +
 * nullifier are verified server-side. With no creds it falls back to a
 * clearly-labeled simulated verify so the flow still works in a browser.
 */
export function VerifyButton({
  action = APP.worldAction,
  signal,
  label = "Verify you're human",
  onVerified,
}: {
  action?: string;
  signal?: string;
  label?: string;
  onVerified: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hostErr = useRef<string | null>(null);

  const start = async () => {
    setErr(null);
    if (!hasWorldApp()) {
      setBusy(true);
      await new Promise((r) => setTimeout(r, 800));
      setBusy(false);
      onVerified();
      return;
    }
    setBusy(true);
    try {
      const sig = await (
        await fetch("/api/rp-signature", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        })
      ).json();
      if (sig.error) throw new Error(sig.error);
      setRpContext({
        rp_id: sig.rp_id,
        nonce: sig.nonce,
        created_at: sig.created_at,
        expires_at: sig.expires_at,
        signature: sig.sig,
      });
      setOpen(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={start}
        disabled={busy}
        className="rounded-2xl bg-success px-5 py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
      >
        {busy ? "Verifying…" : label}
      </button>
      {err && <p className="mt-2 text-xs font-semibold text-warn">{err}</p>}
      {rpContext && (
        <IDKitRequestWidget
          key={rpContext.nonce}
          open={open}
          onOpenChange={setOpen}
          app_id={APP.worldAppId as `app_${string}`}
          action={action}
          rp_context={rpContext}
          allow_legacy_proofs
          environment={APP.worldEnv}
          preset={proofOfHuman({ signal })}
          handleVerify={async (result: IDKitResult) => {
            hostErr.current = null;
            const res = await fetch("/api/verify-proof", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ rp_id: rpContext.rp_id, idkitResponse: result, action }),
            });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              hostErr.current =
                j.code === "duplicate_nullifier"
                  ? "You've already verified for this once."
                  : "Verification failed — tap to try again.";
              throw new Error(hostErr.current);
            }
          }}
          onSuccess={() => onVerified()}
          onError={(code) => {
            setOpen(false);
            const key = String(code);
            if (key === "failed_by_host_app" && hostErr.current) setErr(hostErr.current);
            else setErr(VERIFY_ERRORS[key] ?? `Couldn't verify (${key}) — tap to try again.`);
          }}
        />
      )}
    </>
  );
}
