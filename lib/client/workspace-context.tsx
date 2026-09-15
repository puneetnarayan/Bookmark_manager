"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  Space,
  Collection,
  Resource,
  Tag,
  NextItem,
  Note,
  QuickLink,
  Settings,
  Workspace,
} from "@/types";
import { api, ApiError, type WorkspaceReadResponse } from "./api";

interface WorkspaceState {
  loading: boolean;
  error: string | null;
  workspace: Workspace | null;
  spaces: Space[];
  collections: Collection[];
  resources: Resource[];
  tags: Tag[];
  tasks: NextItem[];
  notes: Note[];
  quickLinks: QuickLink[];
  settings: Settings | null;
}

interface WorkspaceContextValue extends WorkspaceState {
  refresh: () => Promise<void>;
  setSpaces: React.Dispatch<React.SetStateAction<Space[]>>;
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>;
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setTasks: React.Dispatch<React.SetStateAction<NextItem[]>>;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setQuickLinks: React.Dispatch<React.SetStateAction<QuickLink[]>>;
  setSettings: React.Dispatch<React.SetStateAction<Settings | null>>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState>({
    loading: true,
    error: null,
    workspace: null,
    spaces: [],
    collections: [],
    resources: [],
    tags: [],
    tasks: [],
    notes: [],
    quickLinks: [],
    settings: null,
  });
  const loadedOnce = useRef(false);

  const applyData = useCallback((data: WorkspaceReadResponse) => {
    setState({
      loading: false,
      error: null,
      workspace: data.workspace,
      spaces: data.spaces,
      collections: data.collections,
      resources: data.resources,
      tags: data.tags,
      tasks: data.tasks,
      notes: data.notes,
      quickLinks: data.quickLinks,
      settings: data.settings,
    });
  }, []);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: !loadedOnce.current, error: null }));
    try {
      const data = await api.readAll();
      loadedOnce.current = true;
      applyData(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not reach the GitHub-backed data store. Check your connection and try again.";
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, [applyData]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ...state,
      refresh,
      setSpaces: (updater) => setState((s) => ({ ...s, spaces: applyUpdater(s.spaces, updater) })),
      setCollections: (updater) =>
        setState((s) => ({ ...s, collections: applyUpdater(s.collections, updater) })),
      setResources: (updater) =>
        setState((s) => ({ ...s, resources: applyUpdater(s.resources, updater) })),
      setTags: (updater) => setState((s) => ({ ...s, tags: applyUpdater(s.tags, updater) })),
      setTasks: (updater) => setState((s) => ({ ...s, tasks: applyUpdater(s.tasks, updater) })),
      setNotes: (updater) => setState((s) => ({ ...s, notes: applyUpdater(s.notes, updater) })),
      setQuickLinks: (updater) =>
        setState((s) => ({ ...s, quickLinks: applyUpdater(s.quickLinks, updater) })),
      setSettings: (updater) =>
        setState((s) => ({
          ...s,
          settings: typeof updater === "function" ? (updater as (p: Settings | null) => Settings | null)(s.settings) : updater,
        })),
    }),
    [state, refresh]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

function applyUpdater<T>(current: T[], updater: React.SetStateAction<T[]>): T[] {
  return typeof updater === "function" ? (updater as (p: T[]) => T[])(current) : updater;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
