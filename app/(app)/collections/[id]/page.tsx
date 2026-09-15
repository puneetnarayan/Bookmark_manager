"use client";

import { use, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Library, Plus, Share2, Copy, Check } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { useQuickActions } from "@/lib/client/quick-actions-context";
import { ResourceExplorer } from "@/components/resources/ResourceExplorer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { useNote } from "@/hooks/useNote";
import { api, ApiError } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight") ?? undefined;
  const { loading, collections, resources, spaces, setCollections } = useWorkspace();
  const { openAddResource } = useQuickActions();
  const { addToast } = useToast();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const note = useNote("collection", id);

  const collection = collections.find((c) => c.id === id);
  const space = spaces.find((s) => s.id === collection?.spaceId);

  const filteredResources = useMemo(() => {
    if (!collection) return [];
    return resources.filter(
      (r) =>
        r.collectionId === collection.id &&
        !r.deletedAt &&
        !r.archived &&
        (r.title.toLowerCase().includes(query.toLowerCase()) || r.url.toLowerCase().includes(query.toLowerCase()))
    );
  }, [resources, collection, query]);

  async function toggleSharing() {
    if (!collection) return;
    const nextMode = collection.shareMode === "link" ? "private" : "link";
    try {
      const { collection: updated } = await api.collections.setSharing(collection.id, nextMode);
      setCollections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      addToast("success", nextMode === "link" ? "Sharing enabled" : "Sharing disabled");
    } catch (err) {
      addToast("error", err instanceof ApiError ? err.message : "Could not update sharing");
    }
  }

  function copyShareLink() {
    if (!collection?.shareId) return;
    const url = `${window.location.origin}/share/${collection.shareId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return <Skeleton className="h-40" />;

  if (!collection) {
    return (
      <EmptyState
        icon={Library}
        title="Collection not found"
        description="It may have been deleted or moved to Trash."
        action={
          <Button variant="secondary" onClick={() => router.push("/spaces")}>
            Back to Spaces
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        {space && (
          <Link href={`/spaces/${space.id}`} className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            <ArrowLeft className="h-3.5 w-3.5" /> {space.name}
          </Link>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg text-base font-semibold text-white"
              style={{ backgroundColor: collection.color }}
            >
              {collection.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl font-semibold">{collection.name}</h1>
              <p className="text-sm text-[var(--muted)]">
                {filteredResources.length} resource{filteredResources.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={toggleSharing}>
              <Share2 className="h-4 w-4" />
              {collection.shareMode === "link" ? "Sharing on" : "Share"}
            </Button>
            <Button variant="primary" onClick={() => openAddResource({ spaceId: collection.spaceId, collectionId: collection.id })}>
              <Plus className="h-4 w-4" /> Add Resource
            </Button>
          </div>
        </div>

        {collection.shareMode === "link" && collection.shareId && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-xs">
            <span className="truncate text-[var(--muted)]">{`${typeof window !== "undefined" ? window.location.origin : ""}/share/${collection.shareId}`}</span>
            <button onClick={copyShareLink} className="ml-auto flex items-center gap-1 rounded px-2 py-1 hover:bg-[var(--surface)]">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search within ${collection.name}…`}
        className="input max-w-sm"
        aria-label="Search within collection"
      />

      <ResourceExplorer
        resources={filteredResources}
        highlightId={highlightId}
        bulkActions={["favorite", "unfavorite", "pin", "unpin", "add-to-next", "tag", "archive", "trash"]}
        emptyIcon={Library}
        emptyTitle="No resources yet"
        emptyDescription="Add your first resource to this collection."
        emptyAction={
          <Button variant="primary" onClick={() => openAddResource({ spaceId: collection.spaceId, collectionId: collection.id })}>
            <Plus className="h-4 w-4" /> Add Resource
          </Button>
        }
      />

      <div>
        <h2 className="mb-2 text-sm font-semibold">Notes</h2>
        <NoteEditor value={note.content} onSave={note.save} placeholder="Notes about this collection…" />
      </div>
    </div>
  );
}
