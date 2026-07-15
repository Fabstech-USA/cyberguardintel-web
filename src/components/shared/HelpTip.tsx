"use client";

import { CircleHelp } from "lucide-react";
import type { ComponentProps } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type HelpTipProps = {
  content: React.ReactNode;
  /** Accessible name for the help button. Defaults to "Help". */
  label?: string;
  side?: ComponentProps<typeof PopoverContent>["side"];
  align?: ComponentProps<typeof PopoverContent>["align"];
  className?: string;
};

export function HelpTip({
  content,
  label = "Help",
  side = "top",
  align = "start",
  className,
}: HelpTipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <CircleHelp className="size-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-auto max-w-xs p-3 text-xs leading-relaxed text-popover-foreground"
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
