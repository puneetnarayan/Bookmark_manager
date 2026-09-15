"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, Plus, Pin, Pencil, Trash2, GripVertical } from "lucide-react";
import clsx from "clsx";
import { useWorkspace } from "@/lib/client/workspace-context";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import type { QuickLink } from "@/types";

export default function QuickLinksPage() {
  const { loading, quickLinks, setQuickLinks } = useWorkspace();
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuickLink | null>(null);
  const dragIndex = useRef<number | null>(null);

  const sorted = useMemo(() => {
    return [...quickLinks].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.order - b.order;
    });
  }, [quickLinks]);

  async function togglePin(link: QuickLink) {
    const next = !link.pinned;
    setQuickLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, pinned: next } : l)));
    try {
      await api.quickLinks.update(link.id, { pinned: next });
    } catch {
      setQuickLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, pinned: !next } : l)));
      addToast("error", "Could not update pin");
    }
  }

  async function remove(link: QuickLink) {
    try {
      await api.quickLinks.remove(link.id);
      setQuickLinks((prev) => prev.filter((l) => l.id !== link.id));
    } catch {
      addToast("error", "Could not delete quick link");
    }
  }

  async function handleDrop(targetIndex: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(targetIndex, 0, moved);
    const withOrder = reordered.map((l, i) => ({ ...l, order: i }));
    setQuickLinks((prev) => prev.map((l) => withOrder.find((w) => w.id === l.id) ?? l));
    await Promise.all(withOrder.map((l) => api.quickLinks.update(l.id, { order: l.order }))).catch(() => undefined);
  }

  if (loading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quick Links</h1>
          <p className="text-sm text-[var(--muted)]">Frequently used resources, one click away.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New Quick Link
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Link2} title="No quick links yet" description="Add shortcuts to sites you use constantly, like GitHub or Vercel." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((link, i) => (
            <div
              key={link.id}
              className="group relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--accent)]"
            >
              <button
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                aria-label="Drag to reorder"
                className="absolute left-1 top-1 cursor-grab p-1 text-[var(--muted)] opacity-0 group-hover:opacity-100"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => togglePin(link)} aria-pressed={link.pinned} aria-label="Toggle pin" className="rounded p-1 hover:bg-[var(--surface-hover)]">
                  <Pin className={clsx("h-3.5 w-3.5", link.pinned ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--muted)]")} />
                </button>
                <button
                  onClick={() => {
                    setEditing(link);
                    setModalOpen(true);
                  }}
                  aria-label="Edit"
                  className="rounded p-1 hover:bg-[var(--surface-hover)]"
                >
                  <Pencil className="h-3.5 w-3.5 text-[var(--muted)]" />
                </button>
                <button onClick={() => remove(link)} aria-label="Delete" className="rounded p-1 hover:bg-[var(--surface-hover)]">
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="mt-1 flex flex-col items-center gap-2 pb-1 text-center">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: link.color }}
                >
                  {link.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate text-xs font-medium">{link.name}</span>
              </a>
            </div>
          ))}
        </div>
      )}

      <QuickLinkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={(link, isNew) => {
          setQuickLinks((prev) => (isNew ? [...prev, link] : prev.map((l) => (l.id === link.id ? link : l))));
          setModalOpen(false);
        }}
      />
    </div>
  );
}

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ef4444"];

function QuickLinkModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: QuickLink | null;
  onSaved: (link: QuickLink, isNew: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setUrl(editing?.url ?? "");
    setColor(editing?.color ?? COLORS[0]);
    setError(null);
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setError("Name and URL are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const { quickLink } = await api.quickLinks.update(editing.id, { name: name.trim(), url, color });
        onSaved(quickLink, false);
      } else {
        const { quickLink } = await api.quickLinks.create({ name: name.trim(), url, color, order: 0 });
        onSaved(quickLink, true);
      }
      setName("");
      setUrl("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save quick link");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Quick Link" : "New Quick Link"} widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Name</span>
          <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">URL</span>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="input" />
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium">Color</span>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Choose color ${c}`}
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : undefined }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
