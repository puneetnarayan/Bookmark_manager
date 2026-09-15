"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useQuickActions } from "@/lib/client/quick-actions-context";
import { useWorkspace } from "@/lib/client/workspace-context";
import { api, ApiError } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";

export function SaveSessionModal() {
  const { saveSessionOpen, closeSaveSession } = useQuickActions();
  const { spaces, collections, setCollections, setResources, settings } = useWorkspace();
  const { addToast } = useToast();
  const activeSpaces = useMemo(() => spaces.filter((s) => !s.deletedAt && !s.archived), [spaces]);

  const [urlsText, setUrlsText] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collectionsForSpace = useMemo(
    () => collections.filter((c) => c.spaceId === spaceId && !c.deletedAt && !c.archived),
    [collections, spaceId]
  );

  useEffect(() => {
    if (saveSessionOpen) {
      setUrlsText("");
      setSpaceId(settings?.defaultSpaceId ?? activeSpaces[0]?.id ?? "");
      setMode("new");
      setNewCollectionName("");
      setError(null);
    }
  }, [saveSessionOpen, settings, activeSpaces]);

  const urlCount = useMemo(
    () => urlsText.split("\n").map((l) => l.trim()).filter(Boolean).length,
    [urlsText]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const urls = urlsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (urls.length === 0) {
      setError("Paste at least one URL");
      return;
    }
    if (!spaceId) {
      setError("Choose a Space");
      return;
    }
    if (mode === "new" && !newCollectionName.trim()) {
      setError("Name the new collection");
      return;
    }
    if (mode === "existing" && !collectionId) {
      setError("Choose an existing collection");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await api.sessions.save({
        spaceId,
        collectionId: mode === "existing" ? collectionId : undefined,
        newCollectionName: mode === "new" ? newCollectionName.trim() : undefined,
        urls,
      });
      if (mode === "new") {
        // The collection was created server-side; refetch is unnecessary — construct it locally is complex,
        // so just append the new resources and let the next full read pick up the new collection.
        addToast("info", "Refreshing to show the new collection…");
        window.location.reload();
        return;
      }
      setResources((prev) => [...prev, ...result.resources]);
      addToast("success", `Saved ${result.savedCount} tab(s)`);
      closeSaveSession();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the session. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={saveSessionOpen} onClose={closeSaveSession} title="Save Session" widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Paste URLs (one per line)</span>
          <textarea
            autoFocus
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            rows={6}
            placeholder={"https://example.com/one\nhttps://example.com/two"}
            className="input resize-none font-mono text-xs"
          />
          <span className="mt-1 block text-xs text-[var(--muted)]">{urlCount} tab(s) detected — order is preserved</span>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Space</span>
          <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} className="input">
            <option value="" disabled>
              Choose a space
            </option>
            {activeSpaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={mode === "new"} onChange={() => setMode("new")} /> New Collection
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={mode === "existing"} onChange={() => setMode("existing")} /> Existing Collection
          </label>
        </div>

        {mode === "new" ? (
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="Collection name"
            className="input"
          />
        ) : (
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
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={closeSaveSession}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save Session"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
