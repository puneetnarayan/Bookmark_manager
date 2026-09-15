"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useQuickActions } from "@/lib/client/quick-actions-context";
import { useWorkspace } from "@/lib/client/workspace-context";
import { api, ApiError } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";

export function NewCollectionModal() {
  const { newCollectionOpen, newCollectionDefaults, closeNewCollection } = useQuickActions();
  const { spaces, collections, setCollections, settings } = useWorkspace();
  const { addToast } = useToast();
  const activeSpaces = useMemo(() => spaces.filter((s) => !s.deletedAt && !s.archived), [spaces]);

  const [name, setName] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (newCollectionOpen) {
      setName("");
      setSpaceId(newCollectionDefaults?.spaceId ?? settings?.defaultSpaceId ?? activeSpaces[0]?.id ?? "");
      setError(null);
    }
  }, [newCollectionOpen, newCollectionDefaults, settings, activeSpaces]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("A name is required");
      return;
    }
    if (!spaceId) {
      setError("Choose a Space first");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const order = collections.filter((c) => c.spaceId === spaceId).length;
      const { collection } = await api.collections.create({ name: name.trim(), spaceId, order });
      setCollections((prev) => [...prev, collection]);
      addToast("success", `Collection "${collection.name}" created`);
      closeNewCollection();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the collection. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={newCollectionOpen} onClose={closeNewCollection} title="Create Collection" widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
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
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Name</span>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Keyword Research"
            className="input"
          />
        </label>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={closeNewCollection}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving || activeSpaces.length === 0}>
            {saving ? "Creating…" : "Create Collection"}
          </Button>
        </div>
        {activeSpaces.length === 0 && (
          <p className="text-xs text-[var(--muted)]">Create a Space first before adding collections.</p>
        )}
      </form>
    </Modal>
  );
}
