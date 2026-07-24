"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";

type Props = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
};

/**
 * OAuth connect URLs hit `/api/.../auth` and redirect off-site. Next.js
 * intercepts same-origin `<a>` clicks for RSC soft navigation, which fails on
 * those redirects ("Failed to fetch"). Force a full browser navigation instead.
 */
export function IntegrationConnectLink({
  href,
  children,
  onClick,
  ...props
}: Props): React.JSX.Element {
  if (href.startsWith("/api/")) {
    function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
      onClick?.(event);
      if (event.defaultPrevented) return;
      // Modifier clicks / new-tab should keep native browser behavior.
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }
      event.preventDefault();
      window.location.assign(href);
    }

    return (
      <a href={href} {...props} onClick={handleClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} {...props}>
      {children}
    </Link>
  );
}
