import Link from "next/link";

import { LogoMark } from "@/components/brand/LogoMark";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Larger brand treatment for the hero */
  size?: "nav" | "hero";
};

export function BrandMark({
  className,
  size = "nav",
}: Props): React.JSX.Element {
  const isHero = size === "hero";

  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md",
        isHero ? "gap-3.5" : "gap-2.5",
        className
      )}
    >
      <LogoMark
        size={isHero ? 44 : 28}
        className={cn(isHero ? "shadow-sm" : "shadow-xs")}
      />
      <span
        className={cn(
          "font-semibold tracking-tight",
          isHero ? "text-2xl sm:text-3xl" : "text-[15px]"
        )}
      >
        CyberGuardIntel AI
      </span>
    </Link>
  );
}
