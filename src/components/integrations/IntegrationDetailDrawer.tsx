"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { IntegrationIcon } from "@/components/integrations/IntegrationIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { IntegrationCatalogEntry } from "@/lib/integration-catalog";
import { getCategoryLabel, getConnectHref } from "@/lib/integration-catalog";
import { toIconTarget } from "@/lib/integration-icons";
import { cn } from "@/lib/utils";

type IntegrationDetailDrawerProps = {
  entry: IntegrationCatalogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IntegrationDetailDrawer({
  entry,
  open,
  onOpenChange,
}: IntegrationDetailDrawerProps) {
  if (!entry) {
    return null;
  }

  const connectHref = getConnectHref(entry);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "top-0 right-0 left-auto h-full max-h-screen w-full max-w-md translate-x-0 translate-y-0 rounded-none border-l sm:max-w-md",
          "data-open:slide-in-from-right data-closed:slide-out-to-right"
        )}
      >
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3 pr-8">
            <IntegrationIcon target={toIconTarget(entry)} size="lg" />
            <div>
              <DialogTitle>{entry.name}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {getCategoryLabel(entry.category)} · {entry.authMethod}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(100vh-12rem)] space-y-4 overflow-y-auto py-2">
          <section>
            <p className="mb-1.5 text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">
              What this connector does
            </p>
            <p className="text-sm leading-relaxed">{entry.description}</p>
          </section>

          <section>
            <p className="mb-1.5 text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">
              HIPAA controls satisfied
            </p>
            <div className="flex flex-wrap gap-1.5">
              {entry.controls.map((control) => (
                <span
                  key={control}
                  className="rounded bg-muted px-2 py-0.5 font-mono text-[10.5px]"
                >
                  {control}
                </span>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">
              What we access
            </p>
            <ul className="space-y-1.5">
              {entry.permissions.map((permission) => (
                <li
                  key={permission}
                  className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                >
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                  <span>{permission}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <DialogFooter className="border-t pt-4 sm:justify-stretch">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {entry.connectable ? (
            <Button className="flex-1" asChild>
              <Link href={connectHref} onClick={() => onOpenChange(false)}>
                Continue with {entry.authMethod} →
              </Link>
            </Button>
          ) : (
            <Button className="flex-1" disabled>
              Coming soon
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
