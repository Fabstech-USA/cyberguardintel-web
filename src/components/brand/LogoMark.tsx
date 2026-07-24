import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Pixel size for width/height. Defaults to 28. */
  size?: number;
  title?: string;
};

/** Shield mark with a health-pulse stroke. */
export function LogoMark({
  className,
  size = 28,
  title,
}: Props): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M16 2.5L26.5 7.2V15.4C26.5 22.1 21.9 27.8 16 29.5C10.1 27.8 5.5 22.1 5.5 15.4V7.2L16 2.5Z"
        className="fill-brand"
      />
      <path
        d="M8.5 16.2H12.2L14.1 12.8L17.2 20.2L19.4 15.1H23.5"
        stroke="white"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
