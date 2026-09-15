"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useQuickActions } from "@/lib/client/quick-actions-context";
import { useWorkspace } from "@/lib/client/workspace-context";
import { globalSearch } from "@/lib/search/search";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { FolderKanban, Bookmark as BookmarkIcon, Library, ListChecks, Link2 } from "lucide-react";

const ICONS = {
  space: FolderKanban,
  collection: BookmarkIcon,
  resource: Library,
  next: ListChecks,
  "quick-link": Link2,
};

export function GlobalSearchModal() {
  const { searchOpen, closeSearch } = useQuickActions();
  const { spaces, collections, resources, tasks, quickLinks, tags } = useWorkspace();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);

  const results = useMemo(
    () => globalSearch(debouncedQuery, { spaces, collections, resources, tasks, quickLinks, tags }),
    [debouncedQuery, spaces, collections, resources, tasks, quickLinks, tags]
  );

  function go(href: string) {
    setQuery("");
    closeSearch();
    router.push(href);
  }

  return (
    <Modal open={searchOpen} onClose={closeSearch} title="Search everything" widthClassName="max-w-xl">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search spaces, collections, resources, tags, Next items…"
        className="input"
        aria-label="Search query"
      />
      <ul className="mt-3 max-h-80 divide-y divide-[var(--border)] overflow-y-auto" role="listbox">
        {results.map((r) => {
          const Icon = ICONS[r.type];
          return (
            <li key={`${r.type}-${r.id}`}>
              <button
                onClick={() => go(r.href)}
                className="flex w-full items-center gap-3 px-2 py-2.5 text-left text-sm hover:bg-[var(--surface-hover)] rounded-md"
              >
                <Icon className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                <span className="flex-1 truncate">{r.title}</span>
                {r.subtitle && <span className="shrink-0 text-xs text-[var(--muted)]">{r.subtitle}</span>}
              </button>
            </li>
          );
        })}
        {debouncedQuery && results.length === 0 && (
          <li className="px-2 py-6 text-center text-sm text-[var(--muted)]">No results for &ldquo;{debouncedQuery}&rdquo;</li>
        )}
      </ul>
    </Modal>
  );
}
