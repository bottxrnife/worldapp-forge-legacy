import { Button, Card } from "@/components/ui";

export default function CatalogPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pb-16 pt-6">
      <header className="flex items-center gap-3">
        <Button href="/" variant="soft">
          ← Back
        </Button>
        <h1 className="text-xl font-extrabold">Catalog</h1>
      </header>
      <Card>
        <p className="text-sm text-muted">
          The catalog of human-built mini-apps (resolved from ENS subnames, manifests fetched from
          Walrus) lands here next.
        </p>
      </Card>
    </main>
  );
}
