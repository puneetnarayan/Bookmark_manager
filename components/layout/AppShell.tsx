"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { QuickActionsProvider } from "@/lib/client/quick-actions-context";
import { AddResourceModal } from "@/components/modals/AddResourceModal";
import { NewSpaceModal } from "@/components/modals/NewSpaceModal";
import { NewCollectionModal } from "@/components/modals/NewCollectionModal";
import { SaveSessionModal } from "@/components/modals/SaveSessionModal";
import { GlobalSearchModal } from "@/components/modals/GlobalSearchModal";
import { useWorkspace } from "@/lib/client/workspace-context";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

function ShellInner({ children }: { children: React.ReactNode }) {
  useGlobalShortcuts();
  const { error, refresh } = useWorkspace();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar />
        {error && (
          <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <Button size="sm" variant="secondary" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        )}
        <main className="flex-1 px-4 pb-20 pt-4 sm:px-6 sm:pb-6">{children}</main>
      </div>
      <MobileNav />
      <AddResourceModal />
      <NewSpaceModal />
      <NewCollectionModal />
      <SaveSessionModal />
      <GlobalSearchModal />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <QuickActionsProvider>
      <ShellInner>{children}</ShellInner>
    </QuickActionsProvider>
  );
}
