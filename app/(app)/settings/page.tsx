"use client";

import { useState } from "react";
import clsx from "clsx";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { DataBackupSettings } from "@/components/settings/DataBackupSettings";
import { LinkCheckingSettings } from "@/components/settings/LinkCheckingSettings";
import { SharingSettings } from "@/components/settings/SharingSettings";

const TABS = [
  { key: "general", label: "General", Component: GeneralSettings },
  { key: "appearance", label: "Appearance", Component: AppearanceSettings },
  { key: "data", label: "Data & Backup", Component: DataBackupSettings },
  { key: "link-checking", label: "Link Checking", Component: LinkCheckingSettings },
  { key: "sharing", label: "Sharing", Component: SharingSettings },
] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("general");
  const Active = TABS.find((t) => t.key === tab)!.Component;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium",
              tab === t.key ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Active />
    </div>
  );
}
