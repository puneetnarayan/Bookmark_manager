"use client";

import { use, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, ArrowLeft } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { useQuickActions } from "@/lib/client/quick-actions-context";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { useNote } from "@/hooks/useNote";
import { api } from "@/lib/client/api";
import Link from "next/link";

export default function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { loading, spaces, collections, resources, setCollections } = useWorkspace();
  const { openNewCollection } = useQuickActions();
  const [query, setQuery] = useState("");
  const dragIndex = useRef<number | null>(null);
  const note = useNote("space", id);

  const space = spaces.find((s) => s.id === id);

  const spaceCollections = useMemo(() => {
    const filtered = collections.filter(
      (c) => c.spaceId === id && !c.deletedAt && !c.archived && c.name.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.order - b.order;
    });
  }, [collections, id, query]);

  function resourceCountFor(collectionId: string) {
    return resources.filter((r) => r.collectionId === collectionId && !r.deletedAt).length;
  }

  async function handleDrop(targetIndex: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    const reordered = [...spaceCollections];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(targetIndex, 0, moved);
    const withOrder = reordered.map((c, i) => ({ ...c, order: i }));
    setCollections((prev) => prev.map((c) => withOrder.find((w) => w.id === c.id) ?? c));
    await Promise.all(withOrder.map((c) => api.collections.update(c.id, { order: c.order }))).catch(() => undefined);
  }

  if (loading) {
    return <Skeleton className="h-40" />;
  }

  if (!space) {
    return (
      <EmptyState
        icon={FolderPlus}
        title="Space not found"
        description="It may have been deleted or moved to Trash."
        action={
          <Button onClick={() => router.push("/spaces")} variant="secondary">
            Back to Spaces
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/spaces" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-3.5 w-3.5" /> Spaces
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg text-base font-semibold text-white"
              style={{ backgroundColor: space.color }}
            >
              {space.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl font-semibold">{space.name}</h1>
              <p className="text-sm text-[var(--muted)]">
                {spaceCollections.length} collection{spaceCollections.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Button variant="primary" onClick={() => openNewCollection({ spaceId: id })}>
            <FolderPlus className="h-4 w-4" /> New Collection
          </Button>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search within ${space.name}…`}
        className="input max-w-sm"
        aria-label="Search within space"
      />

      {spaceCollections.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No collections yet"
          description="Create a collection to start saving resources into this space."
          action={
            <Button variant="primary" onClick={() => openNewCollection({ spaceId: id })}>
              <FolderPlus className="h-4 w-4" /> New Collection
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {spaceCollections.map((collection, i) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              resourceCount={resourceCountFor(collection.id)}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={() => undefined}
              onDrop={() => handleDrop(i)}
            />
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold">Notes</h2>
        <NoteEditor value={note.content} onSave={note.save} placeholder="Notes about this space…" />
      </div>
    </div>
  );
}
