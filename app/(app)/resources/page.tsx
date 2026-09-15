"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Library, Plus } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { useQuickActions } from "@/lib/client/quick-actions-context";
import { ResourceExplorer } from "@/components/resources/ResourceExplorer";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AllResourcesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40" />}>
      <AllResourcesPageInner />
    </Suspense>
  );
}

function AllResourcesPageInner() {
  const { loading, resources, spaces, collections, tags } = useWorkspace();
  const { openAddResource } = useQuickActions();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [spaceId, setSpaceId] = useState(searchParams.get("spaceId") ?? "");
  const [collectionId, setCollectionId] = useState(searchParams.get("collectionId") ?? "");
  const [tagId, setTagId] = useState(searchParams.get("tagId") ?? "");
  const [resourceType, setResourceType] = useState(searchParams.get("type") ?? "");
  const [pinnedOnly, setPinnedOnly] = useState(searchParams.get("pinned") === "true");
  const [linkStatus, setLinkStatus] = useState(searchParams.get("linkStatus") ?? "");

  const collectionsForSpace = useMemo(
    () => (spaceId ? collections.filter((c) => c.spaceId === spaceId) : collections),
    [collections, spaceId]
  );

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (r.deletedAt || r.archived) return false;
      if (spaceId && r.spaceId !== spaceId) return false;
      if (collectionId && r.collectionId !== collectionId) return false;
      if (tagId && !r.tags.includes(tagId)) return false;
      if (resourceType && r.resourceType !== resourceType) return false;
      if (pinnedOnly && !r.pinned) return false;
      if (linkStatus && r.linkStatus !== linkStatus) return false;
      if (query && !r.title.toLowerCase().includes(query.toLowerCase()) && !r.url.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [resources, spaceId, collectionId, tagId, resourceType, pinnedOnly, linkStatus, query]);

  if (loading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">All Resources</h1>
          <p className="text-sm text-[var(--muted)]">{filtered.length} resource(s)</p>
        </div>
        <Button variant="primary" onClick={() => openAddResource()}>
          <Plus className="h-4 w-4" /> Add Resource
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search resources…"
          className="input max-w-xs"
        />
        <select value={spaceId} onChange={(e) => { setSpaceId(e.target.value); setCollectionId(""); }} className="input w-auto">
          <option value="">All Spaces</option>
          {spaces.filter((s) => !s.deletedAt).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="input w-auto">
          <option value="">All Collections</option>
          {collectionsForSpace.filter((c) => !c.deletedAt).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={tagId} onChange={(e) => setTagId(e.target.value)} className="input w-auto">
          <option value="">All Tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="input w-auto">
          <option value="">All Types</option>
          {["website", "article", "tool", "document", "video", "repository", "other"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={linkStatus} onChange={(e) => setLinkStatus(e.target.value)} className="input w-auto">
          <option value="">Any Link Status</option>
          {["healthy", "redirected", "warning", "dead", "unknown"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={pinnedOnly} onChange={(e) => setPinnedOnly(e.target.checked)} /> Pinned only
        </label>
      </div>

      <ResourceExplorer
        resources={filtered}
        bulkActions={["favorite", "unfavorite", "pin", "unpin", "add-to-next", "tag", "archive", "trash"]}
        emptyIcon={Library}
        emptyTitle="No resources match these filters"
        emptyAction={
          <Button variant="primary" onClick={() => openAddResource()}>
            <Plus className="h-4 w-4" /> Add Resource
          </Button>
        }
      />
    </div>
  );
}
