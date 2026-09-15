"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import type { Resource } from "@/types";

interface DuplicateGroup {
  normalizedUrl: string;
  resources: Resource[];
}

export default function DuplicatesPage() {
  const { setResources } = useWorkspace();
  const { addToast } = useToast();
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const { groups: fetched } = await api.resources.duplicates();
      setGroups(fetched);
    } catch {
      addToast("error", "Could not load duplicates");
    } finally {
      setLoadingGroups(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(action: "ignore" | "delete" | "merge", keepId: string, duplicateId: string) {
    const key = `${keepId}-${duplicateId}`;
    setBusyKey(key);
    try {
      await api.resources.resolveDuplicate(action, keepId, duplicateId);
      if (action === "delete" || action === "merge") {
        setResources((prev) => prev.map((r) => (r.id === duplicateId ? { ...r, deletedAt: new Date().toISOString() } : r)));
      }
      addToast("success", `Duplicate ${action === "ignore" ? "marked as not a duplicate" : action === "delete" ? "moved to Trash" : "merged"}`);
      await load();
    } catch {
      addToast("error", "Could not resolve this duplicate");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Duplicate URLs</h1>
          <p className="text-sm text-[var(--muted)]">Resources that appear to point at the same page.</p>
        </div>
        <Button variant="secondary" onClick={load} disabled={loadingGroups}>
          <RefreshCw className={loadingGroups ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Rescan
        </Button>
      </div>

      {loadingGroups ? (
        <Skeleton className="h-40" />
      ) : !groups || groups.length === 0 ? (
        <EmptyState icon={Copy} title="No duplicates found" description="Your resources all point to distinct URLs." />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const [original, ...duplicates] = group.resources;
            return (
              <div key={group.normalizedUrl} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Possible duplicate</p>
                <ResourceLine label="Original" resource={original} />
                {duplicates.map((dup) => (
                  <div key={dup.id} className="mt-3 border-t border-[var(--border)] pt-3">
                    <ResourceLine label="Duplicate" resource={dup} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => resolve("ignore", original.id, dup.id)}
                        disabled={busyKey === `${original.id}-${dup.id}`}
                      >
                        Keep Both
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => resolve("merge", original.id, dup.id)}
                        disabled={busyKey === `${original.id}-${dup.id}`}
                      >
                        Merge Metadata
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => resolve("delete", original.id, dup.id)}
                        disabled={busyKey === `${original.id}-${dup.id}`}
                      >
                        Delete Duplicate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResourceLine({ label, resource }: { label: string; resource: Resource }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-xs font-medium">{label}</span>
      <span className="truncate font-medium">{resource.title || resource.url}</span>
      <span className="truncate text-xs text-[var(--muted)]">{resource.url}</span>
    </div>
  );
}
