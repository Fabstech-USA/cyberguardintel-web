"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center rounded-r-lg text-muted-foreground outline-none transition-colors",
          "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
