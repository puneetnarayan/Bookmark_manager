"use client";

import { useMemo, useState } from "react";
import { Link2Off, RefreshCw } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";
import clsx from "clsx";
import { CATEGORY_COLORS } from "@/lib/client/category-colors";

const STATUS_COLORS: Record<string, string> = {
  healthy: CATEGORY_COLORS.emerald.chip,
  redirected: CATEGORY_COLORS.sky.chip,
  warning: CATEGORY_COLORS.amber.chip,
  dead: CATEGORY_COLORS.rose.chip,
  unknown: CATEGORY_COLORS.stone.chip,
};

const MAX_BATCH = 25;

export default function LinkCheckPage() {
  const { loading, resources, collections, setResources } = useWorkspace();
  const { addToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const activeResources = useMemo(() => resources.filter((r) => !r.deletedAt), [resources]);
  const filtered = useMemo(
    () => (filter === "all" ? activeResources : activeResources.filter((r) => r.linkStatus === filter)),
    [activeResources, filter]
  );
  const collectionsById = useMemo(() => new Map(collections.map((c) => [c.id, c.name])), [collections]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_BATCH) next.add(id);
      else addToast("info", `You can check up to ${MAX_BATCH} links at once`);
      return next;
    });
  }

  async function checkSelected() {
    if (selected.size === 0) return;
    setChecking(true);
    try {
      const { checked } = await api.links.checkBatch(Array.from(selected));
      setResources((prev) =>
        prev.map((r) => {
          const result = checked.find((c) => c.id === r.id);
          return result ? { ...r, httpStatus: result.httpStatus, linkStatus: result.linkStatus as typeof r.linkStatus, lastCheckedAt: new Date().toISOString() } : r;
        })
      );
      addToast("success", `Checked ${checked.length} link(s)`);
      setSelected(new Set());
    } catch {
      addToast("error", "Could not check selected links");
    } finally {
      setChecking(false);
    }
  }

  async function checkOne(id: string) {
    try {
      const { resource } = await api.links.check(id);
      setResources((prev) => prev.map((r) => (r.id === id ? resource : r)));
    } catch {
      addToast("error", "Could not check this link");
    }
  }

  if (loading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Link Checker</h1>
          <p className="text-sm text-[var(--muted)]">Check resources for dead links, redirects, and timeouts.</p>
        </div>
        <Button variant="primary" onClick={checkSelected} disabled={selected.size === 0 || checking}>
          <RefreshCw className={checking ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Check Selected ({selected.size})
        </Button>
      </div>

      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-auto">
        <option value="all">All statuses</option>
        <option value="healthy">Healthy</option>
        <option value="redirected">Redirected</option>
        <option value="warning">Warning</option>
        <option value="dead">Dead</option>
        <option value="unknown">Unknown</option>
      </select>

      {filtered.length === 0 ? (
        <EmptyState icon={Link2Off} title="No resources match this filter" />
      ) : (
        <div className="space-y-1">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.title}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.title || r.url}</p>
                <p className="truncate text-xs text-[var(--muted)]">{collectionsById.get(r.collectionId)} · {r.url}</p>
              </div>
              <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[r.linkStatus])}>
                {r.linkStatus}
                {r.httpStatus ? ` (${r.httpStatus})` : ""}
              </span>
              <Button size="sm" variant="ghost" onClick={() => checkOne(r.id)}>
                Check
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
