"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "cgi-dashboard-sidebar-collapsed";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setSidebarCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
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
