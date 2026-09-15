"use client";

import { useEffect } from "react";
import { useQuickActions } from "@/lib/client/quick-actions-context";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function useGlobalShortcuts() {
  const { openSearch, openAddResource, openNewCollection, closeAll } = useQuickActions();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
        return;
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openNewCollection();
        return;
      }
      if (meta && e.key.toLowerCase() === "n") {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        openAddResource();
        return;
      }
      if (e.key === "Escape") {
        closeAll();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openSearch, openAddResource, openNewCollection, closeAll]);
}
