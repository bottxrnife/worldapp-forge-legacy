"use client";

import { Button, Card, Pill } from "@/components/ui";
import { APP } from "@/lib/config";
import { useWorldAuth } from "@/lib/useWorldAuth";

export default function Home() {
  const { isInstalled, user, status, error, signIn } = useWorldAuth();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-16 pt-6">
      {/* brand */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{APP.name}</h1>
          <p className="mt-0.5 text-sm text-muted">{APP.tagline}</p>
        </div>
        {user ? (
          <Pill tone="green">@{user.username ?? "human"}</Pill>
        ) : (
          <Pill>World Mini App</Pill>
        )}
      </header>

      {!isInstalled && (
        <Card className="border border-warn-bg !bg-warn-bg/40">
          <p className="text-sm text-warn">
            Open Forge inside <strong>World App</strong> for the full experience (sign-in, pay,
            proof-of-human). You can still browse here.
          </p>
        </Card>
      )}

      {/* hero */}
      <Card className="!bg-blue-soft">
        <h2 className="text-xl font-extrabold text-blue-ink">Create a mini-app</h2>
        <p className="mt-1.5 max-w-[18rem] text-sm leading-relaxed text-blue-body">
          Describe an idea — an AI agent designs it, gives it an ENS name, stores it on Walrus, and
          only verified humans can run it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {user ? (
            <Button href="/create">Start building →</Button>
          ) : (
            <Button onClick={signIn} disabled={status === "signing"}>
              {status === "signing" ? "Signing in…" : "Sign in with World"}
            </Button>
          )}
          <Button href="/catalog" variant="soft">
            Browse apps
          </Button>
        </div>
        {error && <p className="mt-3 text-xs font-semibold text-warn">{error}</p>}
      </Card>

      {/* the three layers */}
      <section className="grid grid-cols-1 gap-3">
        <h3 className="mt-1 text-base font-extrabold">How it works</h3>
        {[
          ["1", "Verified humans", "World ID gates who can create, run, and claim — one per human."],
          ["2", "Named on ENS", `Every app gets a ${APP.ensDomain} subname and an on-chain identity.`],
          ["3", "Stored on Walrus", "Each app's manifest and media live on decentralized storage."],
        ].map(([n, title, body]) => (
          <Card key={n} className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-soft text-sm font-extrabold text-blue-link">
              {n}
            </span>
            <div>
              <p className="text-[15px] font-bold">{title}</p>
              <p className="mt-0.5 text-sm text-muted">{body}</p>
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}
