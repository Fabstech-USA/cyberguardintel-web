"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizePolicyMarkdown } from "@/lib/normalize-policy-markdown";
import { cn } from "@/lib/utils";

type Props = {
  markdown: string;
  className?: string;
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
        "policy-markdown prose prose-sm dark:prose-invert max-w-none",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalized}</ReactMarkdown>
    </div>
  );
}
