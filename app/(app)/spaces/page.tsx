"use client";

import { useMemo, useRef, useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { useQuickActions } from "@/lib/client/quick-actions-context";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/client/api";

export default function SpacesPage() {
  const { loading, spaces, collections, resources, setSpaces } = useWorkspace();
  const { openNewSpace } = useQuickActions();
  const [query, setQuery] = useState("");
  const dragIndex = useRef<number | null>(null);

  const activeSpaces = useMemo(() => {
    const filtered = spaces.filter(
      (s) => !s.deletedAt && !s.archived && s.name.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.order - b.order;
    });
  }, [spaces, query]);

  function countsFor(spaceId: string) {
    const spaceCollections = collections.filter((c) => c.spaceId === spaceId && !c.deletedAt);
    const collectionIds = new Set(spaceCollections.map((c) => c.id));
    const resourceCount = resources.filter((r) => collectionIds.has(r.collectionId) && !r.deletedAt).length;
    return { collectionCount: spaceCollections.length, resourceCount };
  }

  async function handleDrop(targetIndex: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;

    const reordered = [...activeSpaces];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(targetIndex, 0, moved);
    const withOrder = reordered.map((s, i) => ({ ...s, order: i }));

    setSpaces((prev) => prev.map((s) => withOrder.find((w) => w.id === s.id) ?? s));
    await Promise.all(withOrder.map((s) => api.spaces.update(s.id, { order: s.order }))).catch(() => undefined);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Spaces</h1>
          <p className="text-sm text-[var(--muted)]">Your highest-level organizational containers.</p>
        </div>
        <Button variant="primary" onClick={openNewSpace}>
          <Plus className="h-4 w-4" /> New Space
        </Button>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search spaces…"
        className="input max-w-sm"
        aria-label="Search spaces"
      />

      {activeSpaces.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No spaces yet"
          description="Create your first Space to start organizing collections and resources."
          action={
            <Button variant="primary" onClick={openNewSpace}>
              <Plus className="h-4 w-4" /> New Space
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {activeSpaces.map((space, i) => {
            const { collectionCount, resourceCount } = countsFor(space.id);
            return (
              <SpaceCard
                key={space.id}
                space={space}
                collectionCount={collectionCount}
                resourceCount={resourceCount}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={() => undefined}
                onDrop={() => handleDrop(i)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
