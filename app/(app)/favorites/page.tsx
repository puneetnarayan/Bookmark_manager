"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { ResourceExplorer } from "@/components/resources/ResourceExplorer";
import { Skeleton } from "@/components/ui/Skeleton";

export default function FavoritesPage() {
  const { loading, resources, collections } = useWorkspace();
  const favoriteResources = useMemo(
    () => resources.filter((r) => r.favorite && !r.deletedAt),
    [resources]
  );
  const favoriteCollections = useMemo(
    () => collections.filter((c) => c.favorite && !c.deletedAt),
    [collections]
  );

  if (loading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Favorites</h1>
        <p className="text-sm text-[var(--muted)]">Resources and collections you&apos;ve marked as favorites.</p>
      </div>

      {favoriteCollections.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Favorite Collections</h2>
          <div className="flex flex-wrap gap-2">
            {favoriteCollections.map((c) => (
              <a
                key={c.id}
                href={`/collections/${c.id}`}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-sm hover:border-[var(--accent)]"
              >
                {c.name}
              </a>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold">Favorite Resources</h2>
        <ResourceExplorer
          resources={favoriteResources}
          bulkActions={["unfavorite", "pin", "unpin", "add-to-next", "tag", "archive", "trash"]}
          emptyIcon={Star}
          emptyTitle="No favorites yet"
          emptyDescription="Star a resource anywhere in the app to see it here."
        />
      </div>
    </div>
  );
}
