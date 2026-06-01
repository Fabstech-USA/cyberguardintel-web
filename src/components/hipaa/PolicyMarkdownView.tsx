"use client";

import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizePolicyMarkdown } from "@/lib/normalize-policy-markdown";
import { cn } from "@/lib/utils";

type Props = {
  markdown: string;
  className?: string;
};

function headingText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return children.map((child) => headingText(child as ReactNode)).join("");
  }
  return "";
}

const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1 className="policy-doc-title" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => {
    const isMetadata = headingText(children).trim() === "Policy metadata";
    return (
      <h2
        className={cn("policy-section-heading", isMetadata && "policy-meta-heading")}
        {...props}
      >
        {children}
      </h2>
    );
  },
  h3: ({ children, ...props }) => (
    <h3 className="policy-subheading" {...props}>
      {children}
    </h3>
  ),
  hr: () => <hr className="policy-divider" />,
  p: ({ children, ...props }) => (
    <p className="policy-paragraph" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="policy-list" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="policy-list policy-list-ordered" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="policy-list-item" {...props}>
      {children}
    </li>
  ),
};

/** Read-only policy body with GFM markdown rendering (headings, lists, emphasis). */
export function PolicyMarkdownView({
  markdown,
  className,
}: Props): React.JSX.Element {
  const normalized = normalizePolicyMarkdown(markdown);

  return (
    <div
      className={cn(
        "policy-markdown max-w-none text-[0.9rem] leading-relaxed text-foreground/90",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
