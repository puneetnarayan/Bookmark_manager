"use client";

import { useMemo, useState } from "react";
import { Tag as TagIcon, Plus, Pencil, Trash2 } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { ResourceExplorer } from "@/components/resources/ResourceExplorer";
import { api, ApiError } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";

export default function TagsPage() {
  const { loading, tags, resources, setTags, setResources } = useWorkspace();
  const { addToast } = useToast();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of resources) {
      if (r.deletedAt) continue;
      for (const tagId of r.tags) {
        map.set(tagId, (map.get(tagId) ?? 0) + 1);
      }
    }
    return map;
  }, [resources]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      const { tag } = await api.tags.create(newTagName.trim());
      setTags((prev) => [...prev, tag]);
      setNewTagName("");
    } catch (err) {
      addToast("error", err instanceof ApiError ? err.message : "Could not create tag");
    }
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      const { tag } = await api.tags.update(id, { name: renameValue.trim() });
      setTags((prev) => prev.map((t) => (t.id === id ? tag : t)));
    } catch {
      addToast("error", "Could not rename tag");
    } finally {
      setRenamingId(null);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await api.tags.remove(deletingId);
      setTags((prev) => prev.filter((t) => t.id !== deletingId));
      setResources((prev) => prev.map((r) => ({ ...r, tags: r.tags.filter((t) => t !== deletingId) })));
      if (selectedTagId === deletingId) setSelectedTagId(null);
      addToast("success", "Tag deleted");
    } catch {
      addToast("error", "Could not delete tag");
    } finally {
      setDeletingId(null);
    }
  }

  const selectedTag = tags.find((t) => t.id === selectedTagId);
  const taggedResources = useMemo(
    () => (selectedTagId ? resources.filter((r) => r.tags.includes(selectedTagId) && !r.deletedAt) : []),
    [resources, selectedTagId]
  );

  if (loading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tags</h1>
        <p className="text-sm text-[var(--muted)]">Reusable labels you can attach to any resource.</p>
      </div>

      <form onSubmit={handleCreate} className="flex max-w-sm gap-2">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="New tag name"
          className="input"
        />
        <Button type="submit" variant="primary">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>

      {tags.length === 0 ? (
        <EmptyState icon={TagIcon} title="No tags yet" description="Create a tag or add one while saving a resource." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className={`group flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                selectedTagId === tag.id ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)]"
              }`}
            >
              {renamingId === tag.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(tag.id)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename(tag.id)}
                  className="w-24 bg-transparent outline-none"
                />
              ) : (
                <button onClick={() => setSelectedTagId(tag.id === selectedTagId ? null : tag.id)}>
                  {tag.name} <span className="text-[var(--muted)]">({counts.get(tag.id) ?? 0})</span>
                </button>
              )}
              <button
                onClick={() => {
                  setRenamingId(tag.id);
                  setRenameValue(tag.name);
                }}
                aria-label={`Rename ${tag.name}`}
                className="opacity-0 group-hover:opacity-100"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button onClick={() => setDeletingId(tag.id)} aria-label={`Delete ${tag.name}`} className="opacity-0 group-hover:opacity-100">
                <Trash2 className="h-3 w-3 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedTag && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Resources tagged &ldquo;{selectedTag.name}&rdquo;</h2>
          <ResourceExplorer
            resources={taggedResources}
            bulkActions={["favorite", "unfavorite", "pin", "unpin", "archive", "trash"]}
            emptyIcon={TagIcon}
            emptyTitle="No resources with this tag"
          />
        </div>
      )}

      <ConfirmDialog
        open={deletingId !== null}
        title="Delete tag?"
        description="This removes the tag from every resource it's attached to. This cannot be undone."
        confirmLabel="Delete Tag"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
