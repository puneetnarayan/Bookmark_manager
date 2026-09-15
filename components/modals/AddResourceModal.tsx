"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useQuickActions } from "@/lib/client/quick-actions-context";
import { useWorkspace } from "@/lib/client/workspace-context";
import { api, ApiError } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import { resolveTagIds } from "@/lib/client/tag-utils";
import { Star, Pin } from "lucide-react";

export function AddResourceModal() {
  const { addResourceOpen, addResourceDefaults, closeAddResource } = useQuickActions();
  const { spaces, collections, tags, settings, setResources, setTags } = useWorkspace();
  const { addToast } = useToast();

  const activeSpaces = useMemo(() => spaces.filter((s) => !s.deletedAt && !s.archived), [spaces]);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!addResourceOpen) return;
    const defaultSpace = addResourceDefaults?.spaceId ?? settings?.defaultSpaceId ?? activeSpaces[0]?.id ?? "";
    setUrl("");
    setTitle("");
    setDescription("");
    setNotes("");
    setSpaceId(defaultSpace);
    setCollectionId(addResourceDefaults?.collectionId ?? "");
    setTagsInput("");
    setFavorite(false);
    setPinned(false);
    setError(null);
  }, [addResourceOpen, addResourceDefaults, settings, activeSpaces]);

  const collectionsForSpace = useMemo(
    () => collections.filter((c) => c.spaceId === spaceId && !c.deletedAt && !c.archived),
    [collections, spaceId]
  );

  function handleSpaceChange(nextSpaceId: string) {
    setSpaceId(nextSpaceId);
    const optionsForSpace = collections.filter((c) => c.spaceId === nextSpaceId && !c.deletedAt && !c.archived);
    const preferred =
      settings?.defaultCollectionId && optionsForSpace.some((c) => c.id === settings.defaultCollectionId)
        ? settings.defaultCollectionId
        : optionsForSpace[0]?.id ?? "";
    setCollectionId(preferred);
  }

  async function handleUrlBlur() {
    if (!url.trim() || title.trim()) return;
    setFetchingMeta(true);
    try {
      const { metadata, url: normalized } = await api.resources.previewMetadata(url);
      setUrl(normalized);
      if (metadata.title) setTitle(metadata.title);
      if (metadata.description && !description) setDescription(metadata.description);
    } catch {
      // Metadata retrieval is best-effort — saving must never depend on it.
    } finally {
      setFetchingMeta(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("A URL is required");
      return;
    }
    if (!spaceId || !collectionId) {
      setError("Choose a Space and Collection");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tagIds = await resolveTagIds(tagsInput, tags, setTags);
      const { resource } = await api.resources.create({
        url,
        title,
        description,
        notes,
        spaceId,
        collectionId,
        favorite,
        pinned,
        tags: tagIds,
      });
      setResources((prev) => [...prev, resource]);
      addToast("success", "Resource saved");
      closeAddResource();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the resource. It has not been lost — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={addResourceOpen} onClose={closeAddResource} title="Add Resource" widthClassName="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="URL" required>
          <input
            autoFocus
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="https://example.com"
            className="input"
          />
          {fetchingMeta && <p className="mt-1 text-xs text-[var(--muted)]">Fetching page details…</p>}
        </Field>

        <Field label="Title">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Space" required>
            <select value={spaceId} onChange={(e) => handleSpaceChange(e.target.value)} className="input">
              <option value="" disabled>
                Choose a space
              </option>
              {activeSpaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Collection" required>
            <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="input">
              <option value="" disabled>
                Choose a collection
              </option>
              {collectionsForSpace.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Tags (comma-separated)">
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="research, tool"
            className="input"
          />
        </Field>

        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input resize-none" />
        </Field>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} />
            <Star className="h-3.5 w-3.5" /> Favorite
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            <Pin className="h-3.5 w-3.5" /> Pin
          </label>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={closeAddResource}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving || activeSpaces.length === 0}>
            {saving ? "Saving…" : "Save Resource"}
          </Button>
        </div>
        {activeSpaces.length === 0 && (
          <p className="text-xs text-[var(--muted)]">Create a Space first before adding resources.</p>
        )}
      </form>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
