import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid grid-cols-[auto_1fr] items-start gap-3 [&>svg]:size-5 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground border-border",
        warning:
          "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800/60",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 font-medium leading-tight tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 text-sm leading-relaxed text-current/85",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertDescription, AlertTitle }
