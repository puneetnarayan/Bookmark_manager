"use client";

import Link from "next/link";
import { useWorkspace } from "@/lib/client/workspace-context";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import { Button } from "@/components/ui/Button";

export function LinkCheckingSettings() {
  const { settings, setSettings } = useWorkspace();
  const { addToast } = useToast();

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

  return (
    <div className="max-w-md space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Timeout (ms)</span>
        <input
          type="number"
          min={1000}
          max={30000}
          step={500}
          value={settings.linkCheckTimeoutMs}
          onChange={(e) => update({ linkCheckTimeoutMs: Number(e.target.value) })}
          className="input"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.linkCheckFollowRedirects}
          onChange={(e) => update({ linkCheckFollowRedirects: e.target.checked })}
        />
        Follow redirects when checking links
      </label>
      <Link href="/link-check">
        <Button variant="secondary">Open Link Checker</Button>
      </Link>
      <Link href="/duplicates">
        <Button variant="secondary">Open Duplicate Detector</Button>
      </Link>
    </div>
  );
}
