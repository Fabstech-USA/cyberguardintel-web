import Image from "next/image";

import type { IntegrationIconTarget } from "@/lib/integration-icons";
import { getIntegrationIconPath } from "@/lib/integration-icons";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "size-6 rounded",
  md: "size-8 rounded-md",
  lg: "size-11 rounded-lg",
} as const;

const IMAGE_SIZES = {
  sm: 24,
  md: 32,
  lg: 44,
} as const;

type IntegrationIconProps = {
  target: IntegrationIconTarget;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
};

export function IntegrationIcon({
  target,
  size = "md",
  className,
}: IntegrationIconProps) {
  const iconPath = getIntegrationIconPath(target.id);
  const dimension = IMAGE_SIZES[size];

  if (iconPath) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden bg-white p-0.5 ring-1 ring-border/40",
          SIZE_CLASSES[size],
          className
        )}
      >
        <Image
          src={iconPath}
          alt=""
          width={dimension}
          height={dimension}
          className="size-full object-contain"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-medium",
        size === "sm" && "text-[11px]",
        size === "md" && "text-xs",
        size === "lg" && "text-lg",
        SIZE_CLASSES[size],
        className
      )}
      style={{ backgroundColor: target.bg, color: target.color }}
      aria-hidden
    >
      {target.letter}
    </div>
  );
}
