"use client";

import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui";
import { APP } from "@/lib/config";
import { useWorldAuth } from "@/lib/useWorldAuth";

export default function ProfilePage() {
  const { user, status, error, signIn } = useWorldAuth();

  return (
    <>
      <main className="mx-auto w-full max-w-md px-5 pb-28 pt-6">
        <h1 className="text-[28px] font-extrabold tracking-tight">Profile</h1>

        <div className="mt-4 flex items-center gap-3 rounded-3xl bg-wash p-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: user ? "linear-gradient(135deg,#3450A1,#6D28D9)" : "var(--color-faint)" }}
          >
            <span className="text-lg font-extrabold text-white">{(user?.username ?? "0")[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            {user ? (
              <>
                <p className="truncate text-[15px] font-bold">@{user.username ?? "human"}</p>
                <p className="truncate text-xs text-muted">{user.address}</p>
              </>
            ) : (
              <p className="text-sm text-muted">Sign in with World to see your profile.</p>
            )}
          </div>
          {!user && (
            <button
              onClick={signIn}
              disabled={status === "signing"}
              className="rounded-full bg-cta px-4 py-2 text-xs font-bold text-cta-text disabled:opacity-50"
            >
              {status === "signing" ? "…" : "Sign in"}
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs font-semibold text-warn">{error}</p>}

        <div className="mt-4 flex flex-col gap-2.5">
          <div className="rounded-2xl bg-wash p-3.5">
            <p className="text-[14px] font-bold">World ID</p>
            <p className="mt-0.5 text-[13px] text-muted">
              {user ? "Signed in. Proof-of-human is requested per app that needs it." : "Not signed in."}
            </p>
          </div>
          <div className="rounded-2xl bg-wash p-3.5">
            <p className="text-[14px] font-bold">Design agent</p>
            <p className="mt-0.5 text-[13px] text-muted">assistant.agent.{APP.ensDomain}</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button href="/create">Create an app</Button>
          <Button href="/catalog" variant="soft">
            Browse apps
          </Button>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
