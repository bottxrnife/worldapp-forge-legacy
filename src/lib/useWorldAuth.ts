"use client";

import { MiniKit } from "@worldcoin/minikit-js";
import { useMiniKit } from "@worldcoin/minikit-js/minikit-provider";
import { useCallback, useState } from "react";

export type WorldUser = { address: string; username?: string; profilePictureUrl?: string };
type Status = "idle" | "signing" | "error";

/**
 * World sign-in via MiniKit walletAuth (SIWE), verified on the backend.
 * Outside World App, `isInstalled` is false and signIn surfaces a hint.
 */
export function useWorldAuth() {
  const { isInstalled } = useMiniKit();
  const [user, setUser] = useState<WorldUser | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    setError(null);
    if (!isInstalled) {
      setError("Open Forge inside World App to sign in.");
      return;
    }
    setStatus("signing");
    try {
      const { nonce } = await (await fetch("/api/nonce")).json();
      const result = await MiniKit.walletAuth({ nonce, statement: "Sign in to Forge" });
      if (result.executedWith === "fallback") {
        setError("Wallet auth isn't available here.");
        setStatus("error");
        return;
      }
      const verify = await fetch("/api/complete-siwe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload: result.data, nonce }),
      });
      const v = await verify.json();
      if (!v.isValid) {
        setError(v.error ?? "Verification failed");
        setStatus("error");
        return;
      }
      setUser({
        address: result.data.address,
        username: MiniKit.user?.username,
        profilePictureUrl: MiniKit.user?.profilePictureUrl,
      });
      setStatus("idle");
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }, [isInstalled]);

  return { isInstalled, user, status, error, signIn };
}
