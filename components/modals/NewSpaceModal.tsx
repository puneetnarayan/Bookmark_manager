"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useQuickActions } from "@/lib/client/quick-actions-context";
import { useWorkspace } from "@/lib/client/workspace-context";
import { api, ApiError } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import { PASTEL_SWATCHES } from "@/lib/client/color-utils";

const ICONS = ["folder", "briefcase", "book", "star", "flask-conical", "rocket", "compass"];
const COLORS = PASTEL_SWATCHES;

export function NewSpaceModal() {
  const { newSpaceOpen, closeNewSpace } = useQuickActions();
  const { setSpaces, spaces } = useWorkspace();
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("A name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { space } = await api.spaces.create({ name: name.trim(), icon, color, order: spaces.length });
      setSpaces((prev) => [...prev, space]);
      addToast("success", `Space "${space.name}" created`);
      setName("");
      closeNewSpace();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the space. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={newSpaceOpen} onClose={closeNewSpace} title="Create Space" widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Name</span>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. KDP, Astrology, Web Development"
            className="input"
          />
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
                className="h-6 w-6 rounded-full ring-offset-2"
                style={{
                  backgroundColor: c,
                  outline: color === c ? "2px solid var(--accent)" : undefined,
                  outlineOffset: color === c ? "2px" : undefined,
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium">Icon</span>
          <select value={icon} onChange={(e) => setIcon(e.target.value)} className="input">
            {ICONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={closeNewSpace}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Creating…" : "Create Space"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
