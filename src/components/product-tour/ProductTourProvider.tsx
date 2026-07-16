"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

import {
  PRODUCT_TOUR_STEPS,
  productTourSelector,
} from "@/components/product-tour/tour-steps";

const MOBILE_MAX_WIDTH_PX = 639;
const ELEMENT_WAIT_MS = 8000;
const ELEMENT_POLL_MS = 100;

type ProductTourContextValue = {
  startTour: () => void;
  isTourActive: boolean;
  isDesktop: boolean;
};

const ProductTourContext = createContext<ProductTourContextValue | null>(null);

export function useProductTour(): ProductTourContextValue {
  const ctx = useContext(ProductTourContext);
  if (!ctx) {
    throw new Error("useProductTour must be used within ProductTourProvider");
  }
  return ctx;
}

function isDesktopViewport(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia(`(min-width: ${MOBILE_MAX_WIDTH_PX + 1}px)`).matches;
}

function waitForElement(
  selector: string,
  timeoutMs = ELEMENT_WAIT_MS
): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const started = Date.now();
    const interval = window.setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        window.clearInterval(interval);
        resolve(el);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(interval);
        resolve(null);
      }
    }, ELEMENT_POLL_MS);
  });
}

async function markTourComplete(): Promise<void> {
  try {
    await fetch("/api/product-tour/complete", { method: "POST" });
  } catch {
    /* best-effort persistence */
  }
}

type Props = {
  children: ReactNode;
  /** Server-known completion state for the current OrgMember */
  initialCompleted: boolean;
  /** Organization finished the setup wizard */
  orgOnboardingComplete: boolean;
};

export function ProductTourProvider({
  children,
  initialCompleted,
  orgOnboardingComplete,
}: Props): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);
  const pathnameRef = useRef(pathname);
  const completedRef = useRef(initialCompleted);
  const persistingRef = useRef(false);
  const suppressPersistOnDestroyRef = useRef(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    completedRef.current = initialCompleted;
  }, [initialCompleted]);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MOBILE_MAX_WIDTH_PX + 1}px)`);
    const sync = (): void => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const persistComplete = useCallback(async () => {
    if (completedRef.current || persistingRef.current) return;
    persistingRef.current = true;
    completedRef.current = true;
    await markTourComplete();
    persistingRef.current = false;
  }, []);

  const ensureRoute = useCallback(
    async (route: string | undefined): Promise<void> => {
      if (!route) return;
      if (pathnameRef.current === route) return;
      router.push(route);
      const started = Date.now();
      while (pathnameRef.current !== route) {
        if (Date.now() - started >= ELEMENT_WAIT_MS) break;
        await new Promise((r) => window.setTimeout(r, ELEMENT_POLL_MS));
      }
    },
    [router]
  );

  const resolveStepIndex = useCallback(
    async (fromIndex: number, direction: 1 | -1): Promise<number | null> => {
      let index = fromIndex;
      while (index >= 0 && index < PRODUCT_TOUR_STEPS.length) {
        const step = PRODUCT_TOUR_STEPS[index];
        await ensureRoute(step.route);
        const el = await waitForElement(productTourSelector(step.target));
        if (el) return index;
        index += direction;
      }
      return null;
    },
    [ensureRoute]
  );

  const startTour = useCallback(() => {
    if (!isDesktopViewport()) {
      return;
    }

    if (driverRef.current?.isActive()) {
      suppressPersistOnDestroyRef.current = true;
      driverRef.current.destroy();
    }
    driverRef.current = null;

    const d = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.55,
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: "cgi-product-tour-popover",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      progressText: "{{current}} of {{total}}",
      steps: PRODUCT_TOUR_STEPS.map((step) => ({
        element: productTourSelector(step.target),
        popover: {
          title: step.title,
          description: step.description,
          side: "bottom",
          align: "start",
        },
      })),
      onNextClick: async () => {
        const active = d.getActiveIndex() ?? 0;
        if (active >= PRODUCT_TOUR_STEPS.length - 1) {
          await persistComplete();
          d.destroy();
          return;
        }
        const next = await resolveStepIndex(active + 1, 1);
        if (next === null) {
          await persistComplete();
          d.destroy();
          return;
        }
        d.moveTo(next);
      },
      onPrevClick: async () => {
        const active = d.getActiveIndex() ?? 0;
        if (active <= 0) return;
        const prev = await resolveStepIndex(active - 1, -1);
        if (prev === null) return;
        d.moveTo(prev);
      },
      onCloseClick: async () => {
        await persistComplete();
        d.destroy();
      },
      onDestroyed: () => {
        // Escape / Done / Close: mark complete unless we are tearing down to restart
        if (!suppressPersistOnDestroyRef.current) {
          void persistComplete();
        }
        suppressPersistOnDestroyRef.current = false;
        setIsTourActive(false);
        driverRef.current = null;
      },
    });

    driverRef.current = d;
    setIsTourActive(true);

    void (async () => {
      const first = await resolveStepIndex(0, 1);
      if (first === null) {
        await persistComplete();
        setIsTourActive(false);
        driverRef.current = null;
        return;
      }
      d.drive(first);
    })();
  }, [persistComplete, resolveStepIndex]);

  // Auto-start once after org onboarding for members who have not finished the tour
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (initialCompleted) return;
    if (!orgOnboardingComplete) return;
    if (pathname.startsWith("/onboarding")) return;
    if (!isDesktop) return;

    autoStartedRef.current = true;
    const timer = window.setTimeout(() => {
      startTour();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    initialCompleted,
    orgOnboardingComplete,
    pathname,
    isDesktop,
    startTour,
  ]);

  useEffect(() => {
    return () => {
      if (driverRef.current?.isActive()) {
        suppressPersistOnDestroyRef.current = true;
        driverRef.current.destroy();
      }
      driverRef.current = null;
    };
  }, []);

  const value = useMemo(
    () => ({
      startTour,
      isTourActive,
      isDesktop,
    }),
    [startTour, isTourActive, isDesktop]
  );

  return (
    <ProductTourContext.Provider value={value}>
      {children}
    </ProductTourContext.Provider>
  );
}
