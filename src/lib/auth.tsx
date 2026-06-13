"use client";

import { MiniKit } from "@worldcoin/minikit-js";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type SessionUser = { address: string; username?: string; guest?: boolean };
type Status = "idle" | "signing" | "error";

type AuthCtx = {
  user: SessionUser | null;
  status: Status;
  error: string | null;
  ready: boolean;
  inWorldApp: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}

function inWorld(): boolean {
  return typeof window !== "undefined" && !!(window as unknown as { WorldApp?: unknown }).WorldApp;
}

/**
 * Shared World sign-in session. On open inside World App it auto-prompts
 * walletAuth (SIWE, verified server-side); cancelling drops the user on the
 * landing page to retry. In a plain browser there's no World App, so sign-in
 * falls back to a labeled "preview" guest so the app is still browsable.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const signIn = useCallback(async () => {
    setError(null);
    if (!inWorld()) {
      setStatus("signing");
      await new Promise((r) => setTimeout(r, 300));
      const guest: SessionUser = { address: "0x0000000000000000000000000000000000000000", username: "guest", guest: true };
      try { sessionStorage.setItem("forge.user", JSON.stringify(guest)); } catch {}
      setUser(guest);
      setStatus("idle");
      return;
    }
    setStatus("signing");
    try {
      const { nonce } = await (await fetch("/api/nonce")).json();
      const result = await MiniKit.walletAuth({ nonce, statement: "Sign in to Forge" });
      if (result.executedWith === "fallback") {
        setStatus("error");
        setError("Couldn't open World sign-in.");
        return;
      }
      const v = await (
        await fetch("/api/complete-siwe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ payload: result.data, nonce }),
        })
      ).json();
      if (!v.isValid) {
        setStatus("error");
        setError(v.error ?? "Verification failed");
        return;
      }
      const u: SessionUser = { address: result.data.address, username: MiniKit.user?.username };
      try { sessionStorage.setItem("forge.user", JSON.stringify(u)); } catch {}
      setUser(u);
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Sign-in cancelled.");
    }
  }, []);

  const signOut = useCallback(() => {
    try { sessionStorage.removeItem("forge.user"); } catch {}
    setUser(null);
    setStatus("idle");
  }, []);

  useEffect(() => {
    let saved: SessionUser | null = null;
    try {
      const raw = sessionStorage.getItem("forge.user");
      if (raw) saved = JSON.parse(raw);
    } catch {}
    if (saved) {
      setUser(saved);
      setReady(true);
      return;
    }
    if (inWorld()) {
      // let MiniKit finish installing, then auto-prompt
      const t = setTimeout(() => signIn().finally(() => setReady(true)), 400);
      return () => clearTimeout(t);
    }
    setReady(true);
  }, [signIn]);

  return (
    <Ctx.Provider value={{ user, status, error, ready, inWorldApp: inWorld(), signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}
