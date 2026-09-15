import { notFound } from "next/navigation";
import { Boxes, ExternalLink } from "lucide-react";
import { getGitHubConfig } from "@/lib/github/client";
import { listEntities } from "@/lib/data/entity-crud";
import type { Collection, Resource, Space } from "@/types";

export const dynamic = "force-dynamic";

async function getSharedCollection(shareId: string) {
  try {
    getGitHubConfig();

    const collections = (await listEntities("collections")) as unknown as Collection[];
    const collection = collections.find((c) => c.shareId === shareId && c.shareMode === "link");
    if (!collection || collection.deletedAt || collection.archived) return null;

    const space = ((await listEntities("spaces")) as unknown as Space[]).find((s) => s.id === collection.spaceId);
    const resources = ((await listEntities("resources")) as unknown as Resource[]).filter(
      (r) => r.collectionId === collection.id && !r.deletedAt && !r.archived
    );

    return { collection, spaceName: space?.name ?? null, resources };
  } catch (err) {
    // The data store being unreachable or misconfigured must never crash this public,
    // unauthenticated page — surface it as "not available" rather than a raw 500.
    console.error("[share-page-error]", err instanceof Error ? err.stack || err.message : err);
    return null;
  }
}

export default async function SharedCollectionPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const data = await getSharedCollection(shareId);

  if (!data) notFound();

  const { collection, spaceName, resources } = data;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Boxes className="h-5 w-5 text-[var(--accent)]" />
          <span className="text-sm font-semibold">Shared Collection</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{spaceName}</p>
        <h1 className="mt-1 text-2xl font-semibold">{collection.name}</h1>
        {collection.description && <p className="mt-2 text-sm text-[var(--muted)]">{collection.description}</p>}

        <div className="mt-6 space-y-1">
          {resources.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">This collection has no resources yet.</p>
          ) : (
            resources.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 hover:border-[var(--border)] hover:bg-[var(--surface-hover)]"
              >
                {r.favicon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.favicon} alt="" className="h-5 w-5 shrink-0 rounded" />
                ) : (
                  <div className="h-5 w-5 shrink-0 rounded bg-[var(--surface-hover)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title || r.url}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{r.domain}</p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              </a>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
