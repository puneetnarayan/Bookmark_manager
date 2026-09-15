"use client";

import { useMemo } from "react";
import {
  FolderKanban,
  Library,
  Star,
  Pin,
  ListChecks,
  AlertTriangle,
  Archive,
  Trash2,
  Link2Off,
  Clock,
} from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { StatCard } from "@/components/dashboard/StatCard";
import { ResourceRow } from "@/components/resources/ResourceRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { isOverdue, sortByRecent, sortByRecentlyOpened } from "@/lib/client/derived";
import Link from "next/link";

export default function DashboardPage() {
  const { loading, spaces, collections, resources, tasks } = useWorkspace();

  const stats = useMemo(() => {
    const activeSpacesList = spaces.filter((s) => !s.deletedAt);
    const activeCollectionsList = collections.filter((c) => !c.deletedAt);
    const activeResourcesList = resources.filter((r) => !r.deletedAt);
    return {
      spaces: activeSpacesList.length,
      collections: activeCollectionsList.length,
      resources: activeResourcesList.filter((r) => !r.archived).length,
      favorites: activeResourcesList.filter((r) => r.favorite).length,
      pinned: activeResourcesList.filter((r) => r.pinned).length,
      nextItems: tasks.filter((t) => !t.completed && !t.archived).length,
      overdue: tasks.filter(isOverdue).length,
      archived: resources.filter((r) => r.archived && !r.deletedAt).length,
      trash: resources.filter((r) => r.deletedAt).length,
      deadLinks: activeResourcesList.filter((r) => r.linkStatus === "dead").length,
    };
  }, [spaces, collections, resources, tasks]);

  const recentlyAdded = useMemo(
    () => sortByRecent(resources.filter((r) => !r.deletedAt)).slice(0, 6),
    [resources]
  );
  const recentlyOpened = useMemo(() => sortByRecentlyOpened(resources.filter((r) => !r.deletedAt)).slice(0, 6), [resources]);
  const dueSoon = useMemo(() => {
    const now = Date.now();
    const in3Days = now + 3 * 24 * 60 * 60 * 1000;
    return tasks
      .filter((t) => !t.completed && t.dueDate && new Date(t.dueDate).getTime() <= in3Days)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5);
  }, [tasks]);
  const needsAttention = useMemo(
    () => resources.filter((r) => !r.deletedAt && (r.linkStatus === "dead" || r.linkStatus === "warning")).slice(0, 5),
    [resources]
  );

  const collectionsById = useMemo(() => new Map(collections.map((c) => [c.id, c.name])), [collections]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-[var(--muted)]">An overview of your personal internet workspace.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Spaces" value={stats.spaces} icon={FolderKanban} href="/spaces" family="violet" />
        <StatCard label="Collections" value={stats.collections} icon={FolderKanban} href="/spaces" family="violet" />
        <StatCard label="Resources" value={stats.resources} icon={Library} href="/resources" family="sky" />
        <StatCard label="Favorites" value={stats.favorites} icon={Star} href="/favorites" family="amber" />
        <StatCard label="Pinned" value={stats.pinned} icon={Pin} href="/resources?pinned=true" family="indigo" />
        <StatCard label="Next Items" value={stats.nextItems} icon={ListChecks} href="/next" family="teal" />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} href="/next?view=overdue" family="rose" />
        <StatCard label="Archived" value={stats.archived} icon={Archive} href="/archive" family="stone" />
        <StatCard label="Trash" value={stats.trash} icon={Trash2} href="/trash" family="slate" />
        <StatCard label="Dead Links" value={stats.deadLinks} icon={Link2Off} href="/resources?linkStatus=dead" family="orange" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardSection title="Recently Added">
          {recentlyAdded.length === 0 ? (
            <EmptyState icon={Library} title="No resources yet" description="Add your first resource to get started." />
          ) : (
            recentlyAdded.map((r) => (
              <ResourceRow key={r.id} resource={r} collectionName={collectionsById.get(r.collectionId)} />
            ))
          )}
        </DashboardSection>

        <DashboardSection title="Recently Opened">
          {recentlyOpened.length === 0 ? (
            <EmptyState icon={Clock} title="Nothing opened yet" description="Resources you open will show up here." />
          ) : (
            recentlyOpened.map((r) => (
              <ResourceRow key={r.id} resource={r} collectionName={collectionsById.get(r.collectionId)} />
            ))
          )}
        </DashboardSection>

        <DashboardSection title="Due Soon">
          {dueSoon.length === 0 ? (
            <EmptyState icon={ListChecks} title="Nothing due soon" />
          ) : (
            <ul className="space-y-1">
              {dueSoon.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-hover)]">
                  <Link href="/next" className="truncate">
                    {t.title}
                  </Link>
                  <span className={isOverdue(t) ? "text-red-500" : "text-[var(--muted)]"}>
                    {new Date(t.dueDate!).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>

        <DashboardSection title="Needs Attention">
          {needsAttention.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Nothing needs attention" description="Dead or warning links will appear here." />
          ) : (
            needsAttention.map((r) => (
              <ResourceRow key={r.id} resource={r} collectionName={collectionsById.get(r.collectionId)} />
            ))
          )}
        </DashboardSection>
      </div>
    </div>
  );
}

function DashboardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
