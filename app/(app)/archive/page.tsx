"use client";

import { useMemo } from "react";
import { Archive } from "lucide-react";
import { useWorkspace } from "@/lib/client/workspace-context";
import { ResourceExplorer } from "@/components/resources/ResourceExplorer";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast-context";

export default function ArchivePage() {
  const { loading, resources, collections, spaces, setCollections, setSpaces } = useWorkspace();
  const { addToast } = useToast();

  const archivedResources = useMemo(() => resources.filter((r) => r.archived && !r.deletedAt), [resources]);
  const archivedCollections = useMemo(() => collections.filter((c) => c.archived && !c.deletedAt), [collections]);
  const archivedSpaces = useMemo(() => spaces.filter((s) => s.archived && !s.deletedAt), [spaces]);

  async function unarchiveCollection(id: string) {
    try {
      const { collection } = await api.collections.update(id, { archived: false });
      setCollections((prev) => prev.map((c) => (c.id === collection.id ? collection : c)));
      addToast("success", "Collection restored from Archive");
    } catch {
      addToast("error", "Could not restore collection");
    }
  }

  async function unarchiveSpace(id: string) {
    try {
      const { space } = await api.spaces.update(id, { archived: false });
      setSpaces((prev) => prev.map((s) => (s.id === space.id ? space : s)));
      addToast("success", "Space restored from Archive");
    } catch {
      addToast("error", "Could not restore space");
    }
  }

  if (loading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Archive</h1>
        <p className="text-sm text-[var(--muted)]">Archived items are hidden from normal views but easy to restore.</p>
      </div>

      {archivedSpaces.length > 0 && (
        <ArchiveSection title="Archived Spaces">
          {archivedSpaces.map((s) => (
            <ArchiveRow key={s.id} name={s.name} onRestore={() => unarchiveSpace(s.id)} />
          ))}
        </ArchiveSection>
      )}

      {archivedCollections.length > 0 && (
        <ArchiveSection title="Archived Collections">
          {archivedCollections.map((c) => (
            <ArchiveRow key={c.id} name={c.name} onRestore={() => unarchiveCollection(c.id)} />
          ))}
        </ArchiveSection>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold">Archived Resources</h2>
        <ResourceExplorer
          resources={archivedResources}
          bulkActions={["unarchive", "favorite", "unfavorite", "trash"]}
          emptyIcon={Archive}
          emptyTitle="Nothing archived"
          emptyDescription="Archived resources will appear here."
        />
      </div>
    </div>
  );
}

function ArchiveSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ArchiveRow({ name, onRestore }: { name: string; onRestore: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
      <span>{name}</span>
      <button onClick={onRestore} className="text-[var(--accent)] hover:underline">
        Restore
      </button>
    </div>
  );
}
