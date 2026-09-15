"use client";

import { createContext, useContext, useState } from "react";

interface AddResourceDefaults {
  spaceId?: string;
  collectionId?: string;
}

interface NewCollectionDefaults {
  spaceId?: string;
}

interface QuickActionsState {
  addResourceOpen: boolean;
  addResourceDefaults: AddResourceDefaults | null;
  newSpaceOpen: boolean;
  newCollectionOpen: boolean;
  newCollectionDefaults: NewCollectionDefaults | null;
  saveSessionOpen: boolean;
  searchOpen: boolean;
}

interface QuickActionsContextValue extends QuickActionsState {
  openAddResource: (defaults?: AddResourceDefaults) => void;
  closeAddResource: () => void;
  openNewSpace: () => void;
  closeNewSpace: () => void;
  openNewCollection: (defaults?: NewCollectionDefaults) => void;
  closeNewCollection: () => void;
  openSaveSession: () => void;
  closeSaveSession: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  closeAll: () => void;
}

const QuickActionsContext = createContext<QuickActionsContextValue | null>(null);

const initialState: QuickActionsState = {
  addResourceOpen: false,
  addResourceDefaults: null,
  newSpaceOpen: false,
  newCollectionOpen: false,
  newCollectionDefaults: null,
  saveSessionOpen: false,
  searchOpen: false,
};

export function QuickActionsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<QuickActionsState>(initialState);

  const value: QuickActionsContextValue = {
    ...state,
    openAddResource: (defaults) =>
      setState(() => ({ ...initialState, addResourceOpen: true, addResourceDefaults: defaults ?? null })),
    closeAddResource: () => setState((s) => ({ ...s, addResourceOpen: false })),
    openNewSpace: () => setState(() => ({ ...initialState, newSpaceOpen: true })),
    closeNewSpace: () => setState((s) => ({ ...s, newSpaceOpen: false })),
    openNewCollection: (defaults) =>
      setState(() => ({ ...initialState, newCollectionOpen: true, newCollectionDefaults: defaults ?? null })),
    closeNewCollection: () => setState((s) => ({ ...s, newCollectionOpen: false })),
    openSaveSession: () => setState(() => ({ ...initialState, saveSessionOpen: true })),
    closeSaveSession: () => setState((s) => ({ ...s, saveSessionOpen: false })),
    openSearch: () => setState(() => ({ ...initialState, searchOpen: true })),
    closeSearch: () => setState((s) => ({ ...s, searchOpen: false })),
    closeAll: () => setState(initialState),
  };

  return <QuickActionsContext.Provider value={value}>{children}</QuickActionsContext.Provider>;
}

export function useQuickActions(): QuickActionsContextValue {
  const ctx = useContext(QuickActionsContext);
  if (!ctx) throw new Error("useQuickActions must be used within QuickActionsProvider");
  return ctx;
}
