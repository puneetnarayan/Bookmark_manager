"use client";

import { useState } from "react";
import {
  Star,
  Pin,
  Archive,
  ArchiveRestore,
  Trash2,
  RotateCcw,
  ListPlus,
  ListX,
  Tags,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export type BulkAction =
  | "favorite"
  | "unfavorite"
  | "pin"
  | "unpin"
  | "archive"
  | "unarchive"
  | "trash"
  | "restore"
  | "delete-permanent"
  | "add-to-next"
  | "remove-from-next"
  | "tag";

interface BulkActionBarProps {
  count: number;
  actions: BulkAction[];
  onAction: (action: BulkAction) => Promise<void> | void;
  onClear: () => void;
}

const ACTION_META: Record<BulkAction, { label: string; icon: typeof Star; destructive?: boolean }> = {
  favorite: { label: "Favorite", icon: Star },
  unfavorite: { label: "Unfavorite", icon: Star },
  pin: { label: "Pin", icon: Pin },
  unpin: { label: "Unpin", icon: Pin },
  archive: { label: "Archive", icon: Archive },
  unarchive: { label: "Unarchive", icon: ArchiveRestore },
  trash: { label: "Move to Trash", icon: Trash2, destructive: true },
  restore: { label: "Restore", icon: RotateCcw },
  "delete-permanent": { label: "Delete Permanently", icon: Trash2, destructive: true },
  "add-to-next": { label: "Add to Next", icon: ListPlus },
  "remove-from-next": { label: "Remove from Next", icon: ListX },
  tag: { label: "Add Tag…", icon: Tags },
};

export function BulkActionBar({ count, actions, onAction, onClear }: BulkActionBarProps) {
  const [confirming, setConfirming] = useState<BulkAction | null>(null);
  const [working, setWorking] = useState(false);

  if (count === 0) return null;

  async function run(action: BulkAction) {
    if (action === "trash" || action === "delete-permanent") {
      setConfirming(action);
      return;
    }
    await onAction(action);
  }

  async function confirmRun() {
    if (!confirming) return;
    setWorking(true);
    try {
      await onAction(confirming);
    } finally {
      setWorking(false);
      setConfirming(null);
    }
  }

  return (
    <>
      <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--surface)] px-3 py-2 shadow-sm">
        <span className="text-sm font-medium">{count} selected</span>
        <div className="ml-2 flex flex-wrap gap-1.5">
          {actions.map((action) => {
            const meta = ACTION_META[action];
            return (
              <Button key={action} size="sm" variant={meta.destructive ? "danger" : "secondary"} onClick={() => run(action)}>
                <meta.icon className="h-3.5 w-3.5" />
                {meta.label}
              </Button>
            );
          })}
        </div>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onClear}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      </div>
      <ConfirmDialog
        open={confirming !== null}
        title={confirming === "delete-permanent" ? "Delete permanently?" : "Move to Trash?"}
        description={
          confirming === "delete-permanent"
            ? `This will permanently delete ${count} item(s). A backup will be created first, but this cannot be undone from the app.`
            : `Move ${count} item(s) to Trash? You can restore them later.`
        }
        confirmLabel={confirming === "delete-permanent" ? "Delete Permanently" : "Move to Trash"}
        destructive
        loading={working}
        onConfirm={confirmRun}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}
