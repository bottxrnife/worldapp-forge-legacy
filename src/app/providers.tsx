"use client";

import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";
import { APP } from "@/lib/config";

/**
 * Installs MiniKit for the whole app. Inside World App this wires up the native
 * command transport (walletAuth, pay, sendTransaction, share, …); outside World
 * App it no-ops and `useMiniKit().isInstalled` stays false.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MiniKitProvider props={{ appId: APP.worldAppId }}>{children}</MiniKitProvider>;
}
