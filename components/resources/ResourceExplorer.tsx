"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { Resource } from "@/types";
import { useWorkspace } from "@/lib/client/workspace-context";
import { ResourceRow } from "./ResourceRow";
import { BulkActionBar, type BulkAction } from "./BulkActionBar";
import { BulkTagModal } from "./BulkTagModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";

export type SortOption = "recent-added" | "recent-opened" | "recent-updated" | "alphabetical" | "domain";

function sortResources(resources: Resource[], sort: SortOption): Resource[] {
  const copy = [...resources];
  switch (sort) {
    case "alphabetical":
      return copy.sort((a, b) => (a.title || a.url).localeCompare(b.title || b.url));
    case "domain":
      return copy.sort((a, b) => (a.domain ?? "").localeCompare(b.domain ?? ""));
    case "recent-opened":
      return copy.sort((a, b) => new Date(b.lastOpenedAt ?? 0).getTime() - new Date(a.lastOpenedAt ?? 0).getTime());
    case "recent-updated":
      return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    case "recent-added":
    default:
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

interface ResourceExplorerProps {
  resources: Resource[];
  bulkActions: BulkAction[];
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  highlightId?: string;
}

export function ResourceExplorer({
  resources,
  bulkActions,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  highlightId,
}: ResourceExplorerProps) {
  const { collections, setResources } = useWorkspace();
  const { addToast } = useToast();
  const [sort, setSort] = useState<SortOption>("recent-added");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagModalOpen, setTagModalOpen] = useState(false);

  const sorted = useMemo(() => sortResources(resources, sort), [resources, sort]);
  const collectionsById = useMemo(() => new Map(collections.map((c) => [c.id, c.name])), [collections]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(sorted.map((r) => r.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleBulkAction(action: BulkAction) {
    if (action === "tag") {
      setTagModalOpen(true);
      return;
    }
    const ids = Array.from(selected);
    try {
      await api.resources.bulk(action, ids);
      applyLocalBulkPatch(action, ids);
      addToast("success", `${action.replace("-", " ")} applied to ${ids.length} item(s)`);
      clearSelection();
    } catch {
      addToast("error", "That bulk action failed. Nothing was changed permanently — try again.");
    }
  }

  async function applyTag(tagId: string) {
    const ids = Array.from(selected);
    try {
      await api.resources.bulk("add-tag", ids, { tagId });
      setResources((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, tags: Array.from(new Set([...r.tags, tagId])) } : r)));
      addToast("success", `Tag added to ${ids.length} item(s)`);
      clearSelection();
    } catch {
      addToast("error", "Could not add the tag to selection");
    }
  }

  function applyLocalBulkPatch(action: BulkAction, ids: string[]) {
    const idSet = new Set(ids);
    if (action === "delete-permanent") {
      setResources((prev) => prev.filter((r) => !idSet.has(r.id)));
      return;
    }
    const patchByAction: Partial<Record<BulkAction, Partial<Resource>>> = {
      favorite: { favorite: true },
      unfavorite: { favorite: false },
      pin: { pinned: true },
      unpin: { pinned: false },
      archive: { archived: true },
      unarchive: { archived: false },
      trash: { deletedAt: new Date().toISOString() },
      restore: { deletedAt: null },
    };
    const patch = patchByAction[action];
    if (patch) {
      setResources((prev) => prev.map((r) => (idSet.has(r.id) ? { ...r, ...patch } : r)));
    }
  }

  if (resources.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <input
            type="checkbox"
            checked={selected.size > 0 && selected.size === sorted.length}
            onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
            aria-label="Select all"
          />
          Select all ({sorted.length})
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="input w-auto py-1 text-xs"
          aria-label="Sort resources"
        >
          <option value="recent-added">Recently added</option>
          <option value="recent-opened">Recently opened</option>
          <option value="recent-updated">Recently updated</option>
          <option value="alphabetical">Alphabetical</option>
          <option value="domain">Domain</option>
        </select>
      </div>

      <BulkActionBar count={selected.size} actions={bulkActions} onAction={handleBulkAction} onClear={clearSelection} />

      <div className="space-y-1">
        {sorted.map((resource) => (
          <ResourceRow
            key={resource.id}
            resource={resource}
            selected={selected.has(resource.id)}
            onToggleSelect={toggleSelect}
            collectionName={collectionsById.get(resource.collectionId)}
            highlight={resource.id === highlightId}
          />
        ))}
      </div>

      <BulkTagModal open={tagModalOpen} onClose={() => setTagModalOpen(false)} onApply={applyTag} />
    </div>
  );
}
