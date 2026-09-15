"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Star, Archive, Trash2, MoreHorizontal, Pencil, Copy, Pin, GripVertical } from "lucide-react";
import type { Collection } from "@/types";
import { useWorkspace } from "@/lib/client/workspace-context";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import { getReadableTextColor } from "@/lib/client/color-utils";

interface CollectionCardProps {
  collection: Collection;
  resourceCount: number;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
}

export function CollectionCard({ collection, resourceCount, draggable, onDragStart, onDragOver, onDrop }: CollectionCardProps) {
  const { setCollections, setResources, resources } = useWorkspace();
  const { addToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(collection.name);

  function patchLocal(patch: Partial<Collection>) {
    setCollections((prev) => prev.map((c) => (c.id === collection.id ? { ...c, ...patch } : c)));
  }

  async function toggle(field: "favorite" | "pinned") {
    const next = !collection[field];
    patchLocal({ [field]: next } as Partial<Collection>);
    try {
      await api.collections.update(collection.id, { [field]: next });
    } catch {
      patchLocal({ [field]: !next } as Partial<Collection>);
      addToast("error", "Could not update");
    }
  }

  async function archive() {
    setMenuOpen(false);
    try {
      const { collection: updated } = await api.collections.update(collection.id, { archived: true });
      patchLocal(updated);
      addToast("success", "Collection archived");
    } catch {
      addToast("error", "Could not archive collection");
    }
  }

  async function trash() {
    setMenuOpen(false);
    try {
      const { collection: updated } = await api.collections.trash(collection.id);
      patchLocal(updated);
      addToast("success", "Collection moved to Trash");
    } catch {
      addToast("error", "Could not move collection to Trash");
    }
  }

  async function saveRename() {
    setRenaming(false);
    if (!name.trim() || name === collection.name) {
      setName(collection.name);
      return;
    }
    patchLocal({ name: name.trim() });
    try {
      await api.collections.update(collection.id, { name: name.trim() });
    } catch {
      patchLocal({ name: collection.name });
      addToast("error", "Could not rename collection");
    }
  }

  async function duplicate() {
    setMenuOpen(false);
    try {
      const { collection: newCollection } = await api.collections.create({
        name: `${collection.name} (copy)`,
        spaceId: collection.spaceId,
        icon: collection.icon,
        color: collection.color,
        description: collection.description,
      });
      setCollections((prev) => [...prev, newCollection]);
      const collectionResources = resources.filter((r) => r.collectionId === collection.id && !r.deletedAt);
      for (const r of collectionResources) {
        const { resource } = await api.resources.create({
          url: r.url,
          title: r.title,
          description: r.description,
          collectionId: newCollection.id,
          spaceId: newCollection.spaceId,
          fetchMetadata: false,
        });
        setResources((prev) => [...prev, resource]);
      }
      addToast("success", `Duplicated as "${newCollection.name}"`);
    } catch {
      addToast("error", "Could not duplicate collection");
    }
  }

  return (
    <div className="group relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]">
      {draggable && (
        <button
          draggable
          onDragStart={onDragStart}
          onDragOver={(e) => {
            e.preventDefault();
            onDragOver?.();
          }}
          onDrop={onDrop}
          aria-label="Drag to reorder"
          className="absolute left-1 top-1 cursor-grab p-1 text-[var(--muted)] opacity-0 group-hover:opacity-100"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-start justify-between">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold"
          style={{ backgroundColor: collection.color, color: getReadableTextColor(collection.color) }}
        >
          {collection.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => toggle("pinned")} aria-pressed={collection.pinned} aria-label="Toggle pin" className="rounded p-1 hover:bg-[var(--surface-hover)]">
            <Pin className={clsx("h-4 w-4", collection.pinned ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--muted)]")} />
          </button>
          <button onClick={() => toggle("favorite")} aria-pressed={collection.favorite} aria-label="Toggle favorite" className="rounded p-1 hover:bg-[var(--surface-hover)]">
            <Star className={clsx("h-4 w-4", collection.favorite ? "fill-amber-400 text-amber-400" : "text-[var(--muted)]")} />
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="More actions" className="rounded p-1 hover:bg-[var(--surface-hover)]">
              <MoreHorizontal className="h-4 w-4 text-[var(--muted)]" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-8 z-10 w-40 rounded-md border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button onClick={() => { setRenaming(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-hover)]">
                  <Pencil className="h-3.5 w-3.5" /> Rename
                </button>
                <button onClick={duplicate} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-hover)]">
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </button>
                <button onClick={archive} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-hover)]">
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
                <button onClick={trash} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-[var(--surface-hover)] dark:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" /> Move to Trash
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Link href={`/collections/${collection.id}`} className="mt-3 block">
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => e.key === "Enter" && saveRename()}
            onClick={(e) => e.preventDefault()}
            className="input"
          />
        ) : (
          <h3 className="truncate text-sm font-semibold">{collection.name}</h3>
        )}
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {resourceCount} resource{resourceCount === 1 ? "" : "s"}
        </p>
      </Link>
    </div>
  );
}
