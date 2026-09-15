"use client";

import { useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { ResourceExplorer } from "@/components/resources/ResourceExplorer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export default function SearchPage() {
  const { loading, resources, spaces, collections, tags } = useWorkspace();
  const [query, setQuery] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [tagId, setTagId] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [deadOnly, setDeadOnly] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 150);

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return resources.filter((r) => {
      if (!archivedOnly && r.deletedAt) return false;
      if (archivedOnly && !r.archived) return false;
      if (spaceId && r.spaceId !== spaceId) return false;
      if (collectionId && r.collectionId !== collectionId) return false;
      if (tagId && !r.tags.includes(tagId)) return false;
      if (favoriteOnly && !r.favorite) return false;
      if (pinnedOnly && !r.pinned) return false;
      if (deadOnly && r.linkStatus !== "dead") return false;
      if (!q) return Boolean(spaceId || collectionId || tagId || favoriteOnly || pinnedOnly || archivedOnly || deadOnly);
      return (
        r.title.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
      );
    });
  }, [resources, debouncedQuery, spaceId, collectionId, tagId, favoriteOnly, pinnedOnly, archivedOnly, deadOnly]);

  const hasAnyCriteria = Boolean(
    debouncedQuery || spaceId || collectionId || tagId || favoriteOnly || pinnedOnly || archivedOnly || deadOnly
  );

  if (loading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Search</h1>
        <p className="text-sm text-[var(--muted)]">Search across resources with filters.</p>
      </div>

      <input
        autoFocus
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search title, URL, description, notes…"
        className="input max-w-lg"
        aria-label="Search query"
      />

      <div className="flex flex-wrap gap-2">
        <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} className="input w-auto">
          <option value="">All Spaces</option>
          {spaces.filter((s) => !s.deletedAt).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="input w-auto">
          <option value="">All Collections</option>
          {collections.filter((c) => !c.deletedAt).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={tagId} onChange={(e) => setTagId(e.target.value)} className="input w-auto">
          <option value="">All Tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={favoriteOnly} onChange={(e) => setFavoriteOnly(e.target.checked)} /> Favorite
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={pinnedOnly} onChange={(e) => setPinnedOnly(e.target.checked)} /> Pinned
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={archivedOnly} onChange={(e) => setArchivedOnly(e.target.checked)} /> Archived
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={deadOnly} onChange={(e) => setDeadOnly(e.target.checked)} /> Dead links
        </label>
      </div>

      {!hasAnyCriteria ? (
        <EmptyState icon={SearchIcon} title="Start typing or pick a filter" description="Results will appear here." />
      ) : (
        <ResourceExplorer
          resources={results}
          bulkActions={["favorite", "unfavorite", "pin", "unpin", "add-to-next", "tag", "archive", "trash"]}
          emptyIcon={SearchIcon}
          emptyTitle="No matches"
        />
      )}
    </div>
  );
}
