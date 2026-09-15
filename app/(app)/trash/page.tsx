"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { ResourceExplorer } from "@/components/resources/ResourceExplorer";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";

export default function TrashPage() {
  const { loading, resources, collections, spaces, setCollections, setSpaces, refresh } = useWorkspace();
  const { addToast } = useToast();
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false);
  const [emptying, setEmptying] = useState(false);

  const trashedResources = useMemo(() => resources.filter((r) => r.deletedAt), [resources]);
  const trashedCollections = useMemo(() => collections.filter((c) => c.deletedAt), [collections]);
  const trashedSpaces = useMemo(() => spaces.filter((s) => s.deletedAt), [spaces]);

  async function restoreCollection(id: string) {
    try {
      const { collection } = await api.collections.update(id, { deletedAt: null });
      setCollections((prev) => prev.map((c) => (c.id === collection.id ? collection : c)));
      addToast("success", "Collection restored");
    } catch {
      addToast("error", "Could not restore collection");
    }
  }

  async function restoreSpace(id: string) {
    try {
      const { space } = await api.spaces.update(id, { deletedAt: null });
      setSpaces((prev) => prev.map((s) => (s.id === space.id ? space : s)));
      addToast("success", "Space restored");
    } catch {
      addToast("error", "Could not restore space");
    }
  }

  async function handleEmptyTrash() {
    setEmptying(true);
    try {
      const result = await api.trash.empty();
      addToast(
        "success",
        `Emptied Trash: ${result.resourcesRemoved} resource(s), ${result.collectionsRemoved} collection(s), ${result.spacesRemoved} space(s)`
      );
      await refresh();
    } catch {
      addToast("error", "Could not empty Trash");
    } finally {
      setEmptying(false);
      setEmptyConfirmOpen(false);
    }
  }

  const totalCount = trashedResources.length + trashedCollections.length + trashedSpaces.length;

  if (loading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trash</h1>
          <p className="text-sm text-[var(--muted)]">Items here can be restored or permanently deleted.</p>
        </div>
        {totalCount > 0 && (
          <Button variant="danger" onClick={() => setEmptyConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" /> Empty Trash
          </Button>
        )}
      </div>

      {trashedSpaces.length > 0 && (
        <TrashSection title="Spaces">
          {trashedSpaces.map((s) => (
            <TrashRow key={s.id} name={s.name} onRestore={() => restoreSpace(s.id)} />
          ))}
        </TrashSection>
      )}

      {trashedCollections.length > 0 && (
        <TrashSection title="Collections">
          {trashedCollections.map((c) => (
            <TrashRow key={c.id} name={c.name} onRestore={() => restoreCollection(c.id)} />
          ))}
        </TrashSection>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold">Resources</h2>
        <ResourceExplorer
          resources={trashedResources}
          bulkActions={["restore", "delete-permanent"]}
          emptyIcon={Trash2}
          emptyTitle="Trash is empty"
        />
      </div>

      <ConfirmDialog
        open={emptyConfirmOpen}
        title="Empty Trash?"
        description="This permanently deletes every item currently in Trash. A backup will be created first, but this cannot be undone from the app."
        confirmLabel="Empty Trash"
        destructive
        loading={emptying}
        onConfirm={handleEmptyTrash}
        onCancel={() => setEmptyConfirmOpen(false)}
      />
    </div>
  );
}

function TrashSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function TrashRow({ name, onRestore }: { name: string; onRestore: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
      <span>{name}</span>
      <button onClick={onRestore} className="text-[var(--accent)] hover:underline">
        Restore
      </button>
    </div>
  );
}
