"use client";

import { Search, Plus, FolderPlus, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useQuickActions } from "@/lib/client/quick-actions-context";

export function TopBar() {
  const { openAddResource, openNewCollection, openSaveSession, openSearch } = useQuickActions();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur sm:px-6">
      <button
        onClick={openSearch}
        className="flex flex-1 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--muted)] hover:border-[var(--accent)]"
        aria-label="Open global search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search everything…</span>
        <span className="ml-auto hidden rounded border border-[var(--border)] px-1.5 py-0.5 text-xs sm:inline">
          ⌘K
        </span>
      </button>

      <Button variant="ghost" size="sm" onClick={openSaveSession} className="hidden sm:inline-flex">
        <Layers className="h-4 w-4" />
        Save Session
      </Button>
      <Button variant="secondary" size="sm" onClick={() => openNewCollection()} className="hidden sm:inline-flex">
        <FolderPlus className="h-4 w-4" />
        New Collection
      </Button>
      <Button variant="primary" size="sm" onClick={() => openAddResource()}>
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add Resource</span>
      </Button>
    </header>
  );
}
