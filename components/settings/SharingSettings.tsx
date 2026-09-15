"use client";

import { useMemo } from "react";
import { Copy } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import { Button } from "@/components/ui/Button";

export function SharingSettings() {
  const { settings, setSettings, collections, setCollections } = useWorkspace();
  const { addToast } = useToast();

  const sharedCollections = useMemo(() => collections.filter((c) => c.shareMode === "link" && c.shareId), [collections]);

  if (!settings) return null;

  async function update(patch: Parameters<typeof api.settings.update>[0]) {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    try {
      const { settings: saved } = await api.settings.update(patch);
      setSettings(saved);
    } catch {
      addToast("error", "Could not save settings");
    }
  }

  async function revoke(id: string) {
    try {
      const { collection } = await api.collections.setSharing(id, "private");
      setCollections((prev) => prev.map((c) => (c.id === collection.id ? collection : c)));
      addToast("success", "Sharing revoked");
    } catch {
      addToast("error", "Could not revoke sharing");
    }
  }

  function copyLink(shareId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/share/${shareId}`);
    addToast("info", "Link copied");
  }

  return (
    <div className="max-w-md space-y-6">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Default sharing mode for new collections</span>
        <select
          value={settings.sharingDefaultMode}
          onChange={(e) => update({ sharingDefaultMode: e.target.value as "private" | "link" })}
          className="input"
        >
          <option value="private">Private</option>
          <option value="link">Anyone with the link can view</option>
        </select>
      </label>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Public Links</h3>
        {sharedCollections.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No collections are currently shared.</p>
        ) : (
          <ul className="space-y-2">
            {sharedCollections.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 text-sm">
                <span className="truncate">{c.name}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => copyLink(c.shareId!)}>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => revoke(c.id)}>
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
