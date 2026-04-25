"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const STORAGE_KEY = "cgi-dashboard-sidebar-collapsed";

const SIDEBAR_STORAGE_EVENT = "cgi-dashboard-sidebar-storage";

function readSidebarCollapsedFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeSidebarStorage(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onStoreChange();
  };
  const onLocal = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(SIDEBAR_STORAGE_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SIDEBAR_STORAGE_EVENT, onLocal);
  };
}

function dispatchSidebarStorageChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SIDEBAR_STORAGE_EVENT));
  }
}

export type DashboardLayoutContextValue = {
  /** Desktop (sm+): narrow icon rail vs full labels */
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
};

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(
  null
);

export function useDashboardLayout(): DashboardLayoutContextValue {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) {
    throw new Error("useDashboardLayout must be used within DashboardLayoutProvider");
  }
  return ctx;
}

export function DashboardLayoutProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebarStorage,
    readSidebarCollapsedFromStorage,
    () => false
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toggleSidebarCollapsed = useCallback(() => {
    const next = !readSidebarCollapsedFromStorage();
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    dispatchSidebarStorageChange();
  }, []);

  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen((o) => !o);
  }, []);

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebarCollapsed,
      mobileNavOpen,
      setMobileNavOpen,
      toggleMobileNav,
    }),
    [sidebarCollapsed, mobileNavOpen, toggleMobileNav, toggleSidebarCollapsed]
  );

  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}
