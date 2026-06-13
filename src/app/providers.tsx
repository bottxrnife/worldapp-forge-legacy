"use client";

import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";
import { AuthGate } from "@/components/AuthGate";
import { AuthProvider } from "@/lib/auth";
import { APP } from "@/lib/config";

/**
 * Installs MiniKit, provides the shared World sign-in session, and gates the
 * whole app behind sign-in (auto-prompts on open; Landing on cancel).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MiniKitProvider props={{ appId: APP.worldAppId }}>
      <AuthProvider>
        <AuthGate>{children}</AuthGate>
      </AuthProvider>
    </MiniKitProvider>
  );
}
