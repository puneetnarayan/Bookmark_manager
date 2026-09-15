"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Star, Pin, ExternalLink, MoreHorizontal, Trash2, ListPlus, AlertTriangle } from "lucide-react";
import type { Resource } from "@/types";
import { useWorkspace } from "@/lib/client/workspace-context";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";

interface ResourceRowProps {
  resource: Resource;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  collectionName?: string;
  highlight?: boolean;
}

export function ResourceRow({ resource, selected, onToggleSelect, collectionName, highlight }: ResourceRowProps) {
  const { setResources } = useWorkspace();
  const { addToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  function patchLocal(patch: Partial<Resource>) {
    setResources((prev) => prev.map((r) => (r.id === resource.id ? { ...r, ...patch } : r)));
  }

  async function toggle(field: "favorite" | "pinned") {
    const next = !resource[field];
    patchLocal({ [field]: next } as Partial<Resource>);
    try {
      await api.resources.update(resource.id, { [field]: next });
    } catch {
      patchLocal({ [field]: !next } as Partial<Resource>);
      addToast("error", "Could not save that change. Reverted.");
    }
  }

  async function handleOpen() {
    api.resources.update(resource.id, { lastOpenedAt: new Date().toISOString() }).catch(() => undefined);
    patchLocal({ lastOpenedAt: new Date().toISOString() });
  }

  async function handleTrash() {
    setMenuOpen(false);
    try {
      const { resource: updated } = await api.resources.trash(resource.id);
      patchLocal(updated);
      addToast("success", "Moved to Trash");
    } catch {
      addToast("error", "Could not move to Trash");
    }
  }

  async function handleAddToNext() {
    setMenuOpen(false);
    try {
      await api.resources.bulk("add-to-next", [resource.id]);
      addToast("success", "Added to Next");
    } catch {
      addToast("error", "Could not add to Next");
    }
  }

  return (
    <div
      className={clsx(
        "group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        highlight ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-hover)]"
      )}
    >
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(resource.id)}
          aria-label={`Select ${resource.title}`}
        />
      )}
      {resource.favicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resource.favicon} alt="" className="h-5 w-5 shrink-0 rounded" onError={(e) => (e.currentTarget.style.display = "none")} />
      ) : (
        <div className="h-5 w-5 shrink-0 rounded bg-[var(--surface-hover)]" />
      )}

      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleOpen}
        className="min-w-0 flex-1"
      >
        <p className="truncate text-sm font-medium">{resource.title || resource.url}</p>
        <p className="truncate text-xs text-[var(--muted)]">
          {collectionName ? `${collectionName} · ` : ""}
          {resource.domain ?? resource.url}
          {resource.linkStatus === "dead" && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-red-500">
              <AlertTriangle className="h-3 w-3" /> dead link
            </span>
          )}
        </p>
      </a>

      <button
        onClick={() => toggle("favorite")}
        aria-pressed={resource.favorite}
        aria-label="Toggle favorite"
        className="shrink-0 rounded p-1 hover:bg-[var(--surface-hover)]"
      >
        <Star className={clsx("h-4 w-4", resource.favorite ? "fill-amber-400 text-amber-400" : "text-[var(--muted)]")} />
      </button>
      <button
        onClick={() => toggle("pinned")}
        aria-pressed={resource.pinned}
        aria-label="Toggle pin"
        className="shrink-0 rounded p-1 hover:bg-[var(--surface-hover)]"
      >
        <Pin className={clsx("h-4 w-4", resource.pinned ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--muted)]")} />
      </button>
      <a href={resource.url} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab" className="shrink-0 rounded p-1 hover:bg-[var(--surface-hover)]">
        <ExternalLink className="h-4 w-4 text-[var(--muted)]" />
      </a>

      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More actions"
          aria-haspopup="menu"
          className="rounded p-1 hover:bg-[var(--surface-hover)]"
        >
          <MoreHorizontal className="h-4 w-4 text-[var(--muted)]" />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-8 z-10 w-44 rounded-md border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <Link
              href={`/resources/${resource.id}`}
              role="menuitem"
              className="block px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
              onClick={() => setMenuOpen(false)}
            >
              Edit details
            </Link>
            <button role="menuitem" onClick={handleAddToNext} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-hover)]">
              <ListPlus className="h-3.5 w-3.5" /> Add to Next
            </button>
            <button
              role="menuitem"
              onClick={handleTrash}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-[var(--surface-hover)] dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> Move to Trash
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
