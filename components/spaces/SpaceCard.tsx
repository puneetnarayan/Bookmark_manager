"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Star, Archive, Trash2, MoreHorizontal, Pencil, Copy, GripVertical } from "lucide-react";
import type { Space } from "@/types";
import { useWorkspace } from "@/lib/client/workspace-context";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import { getReadableTextColor, cardTintStyle, HOVER_DARKEN_CLASS } from "@/lib/client/color-utils";

interface SpaceCardProps {
  space: Space;
  collectionCount: number;
  resourceCount: number;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
}

export function SpaceCard({ space, collectionCount, resourceCount, draggable, onDragStart, onDragOver, onDrop }: SpaceCardProps) {
  const { setSpaces, setCollections, collections } = useWorkspace();
  const { addToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(space.name);

  function patchLocal(patch: Partial<Space>) {
    setSpaces((prev) => prev.map((s) => (s.id === space.id ? { ...s, ...patch } : s)));
  }

  async function togglePin() {
    const next = !space.pinned;
    patchLocal({ pinned: next });
    try {
      await api.spaces.update(space.id, { pinned: next });
    } catch {
      patchLocal({ pinned: !next });
      addToast("error", "Could not update pin");
    }
  }

  async function archive() {
    setMenuOpen(false);
    try {
      const { space: updated } = await api.spaces.update(space.id, { archived: true });
      patchLocal(updated);
      addToast("success", "Space archived");
    } catch {
      addToast("error", "Could not archive space");
    }
  }

  async function trash() {
    setMenuOpen(false);
    try {
      const { space: updated } = await api.spaces.trash(space.id);
      patchLocal(updated);
      addToast("success", "Space moved to Trash");
    } catch {
      addToast("error", "Could not move space to Trash");
    }
  }

  async function saveRename() {
    setRenaming(false);
    if (!name.trim() || name === space.name) {
      setName(space.name);
      return;
    }
    patchLocal({ name: name.trim() });
    try {
      await api.spaces.update(space.id, { name: name.trim() });
    } catch {
      patchLocal({ name: space.name });
      addToast("error", "Could not rename space");
    }
  }

  async function duplicate() {
    setMenuOpen(false);
    try {
      const { space: newSpace } = await api.spaces.create({
        name: `${space.name} (copy)`,
        icon: space.icon,
        color: space.color,
      });
      setSpaces((prev) => [...prev, newSpace]);
      const spaceCollections = collections.filter((c) => c.spaceId === space.id && !c.deletedAt);
      for (const c of spaceCollections) {
        const { collection } = await api.collections.create({
          name: c.name,
          spaceId: newSpace.id,
          icon: c.icon,
          color: c.color,
          description: c.description,
        });
        setCollections((prev) => [...prev, collection]);
      }
      addToast("success", `Duplicated structure as "${newSpace.name}"`);
    } catch {
      addToast("error", "Could not duplicate space");
    }
  }

  return (
    <div
      className={clsx("group relative rounded-xl border p-4 transition-colors", HOVER_DARKEN_CLASS)}
      style={cardTintStyle(space.color)}
    >
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
        <Link href={`/spaces/${space.id}`} className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold"
            style={{ backgroundColor: space.color, color: getReadableTextColor(space.color) }}
          >
            {space.name.slice(0, 1).toUpperCase()}
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={togglePin} aria-pressed={space.pinned} aria-label="Toggle pin" className="rounded p-1 hover:bg-[var(--surface-hover)]">
            <Star className={clsx("h-4 w-4", space.pinned ? "fill-amber-400 text-amber-400" : "text-[var(--muted)]")} />
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
                  <Copy className="h-3.5 w-3.5" /> Duplicate structure
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

      <Link href={`/spaces/${space.id}`} className="mt-3 block">
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
          <h3 className="truncate text-sm font-semibold">{space.name}</h3>
        )}
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {collectionCount} collection{collectionCount === 1 ? "" : "s"} · {resourceCount} resource{resourceCount === 1 ? "" : "s"}
        </p>
      </Link>
    </div>
  );
}
