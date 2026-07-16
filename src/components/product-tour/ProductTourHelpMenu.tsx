"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";

import { useProductTour } from "@/components/product-tour/ProductTourProvider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ProductTourHelpMenu(): React.JSX.Element {
  const { startTour, isDesktop, isTourActive } = useProductTour();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          data-tour="header-help"
          className="h-9 w-9 shrink-0"
          aria-label="Help"
        >
          <CircleHelp className="h-4 w-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="flex flex-col gap-1">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Help
          </p>
          <button
            type="button"
            className="rounded-md px-2 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isTourActive || !isDesktop}
            onClick={() => {
              setOpen(false);
              // Let the popover unmount before spotlighting the help button
              window.setTimeout(() => startTour(), 50);
            }}
          >
            Take product tour
            {!isDesktop ? (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Available on larger screens
              </span>
            ) : null}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
