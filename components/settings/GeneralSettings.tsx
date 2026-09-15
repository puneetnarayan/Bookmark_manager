"use client";

import { useWorkspace } from "@/lib/client/workspace-context";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";

export function GeneralSettings() {
  const { settings, spaces, collections, setSettings } = useWorkspace();
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
      <Field label="Default Space">
        <select
          value={settings.defaultSpaceId ?? ""}
          onChange={(e) => update({ defaultSpaceId: e.target.value || null })}
          className="input"
        >
          <option value="">None</option>
          {spaces.filter((s) => !s.deletedAt).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Default Collection">
        <select
          value={settings.defaultCollectionId ?? ""}
          onChange={(e) => update({ defaultCollectionId: e.target.value || null })}
          className="input"
        >
          <option value="">None</option>
          {collections.filter((c) => !c.deletedAt).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Startup View">
        <select value={settings.startupView} onChange={(e) => update({ startupView: e.target.value })} className="input">
          <option value="dashboard">Dashboard</option>
          <option value="spaces">Spaces</option>
          <option value="next">Next</option>
        </select>
      </Field>
      <Field label="Date Format">
        <select value={settings.dateFormat} onChange={(e) => update({ dateFormat: e.target.value })} className="input">
          <option value="MMM d, yyyy">Jan 5, 2026</option>
          <option value="yyyy-MM-dd">2026-01-05</option>
          <option value="dd/MM/yyyy">05/01/2026</option>
        </select>
      </Field>
      <Field label="Time Format">
        <select value={settings.timeFormat} onChange={(e) => update({ timeFormat: e.target.value as "12h" | "24h" })} className="input">
          <option value="12h">12-hour</option>
          <option value="24h">24-hour</option>
        </select>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}
