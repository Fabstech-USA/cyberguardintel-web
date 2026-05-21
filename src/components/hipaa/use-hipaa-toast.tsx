"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type HipaaToastPayload = {
  kind: "success" | "error";
  title: string;
  message: string;
};

type ToastState = HipaaToastPayload & { id: number };

export function useHipaaToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeoutMs = toast.kind === "error" ? 6000 : 4500;
    const timer = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(kind: HipaaToastPayload["kind"], title: string, message: string) {
    setToast({ id: Date.now(), kind, title, message });
  }

  function HipaaToast() {
    if (!toast) return null;
    return (
      <div
        className="fixed top-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))]"
        role="status"
        aria-live="polite"
      >
        <Alert
          variant={toast.kind === "error" ? "destructive" : "default"}
          className={cn(
            "border shadow-lg backdrop-blur-sm",
            toast.kind === "success" &&
              "border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/90 dark:text-emerald-100"
          )}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 aria-hidden />
          ) : (
            <AlertTriangle aria-hidden />
          )}
          <AlertTitle>{toast.title}</AlertTitle>
          <AlertDescription>{toast.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return { showToast, HipaaToast };
}
