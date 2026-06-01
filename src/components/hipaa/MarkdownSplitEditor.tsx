"use client";

import { useDeferredValue } from "react";

import { PolicyMarkdownView } from "@/components/hipaa/PolicyMarkdownView";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  markdown: string;
  onMarkdownChange: (value: string) => void;
  className?: string;
  sourceLabel?: string;
  previewLabel?: string;
  sourceId?: string;
  previewId?: string;
  emptyPreviewText?: string;
};

/** Side-by-side markdown source and live preview. */
export function MarkdownSplitEditor({
  markdown,
  onMarkdownChange,
  className,
  sourceLabel = "Source (markdown)",
  previewLabel = "Preview",
  sourceId = "markdown-split-source",
  previewId = "markdown-split-preview",
  emptyPreviewText = "Preview appears here as you edit.",
}: Props): React.JSX.Element {
  const previewMarkdown = useDeferredValue(markdown);

  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 gap-0 overflow-hidden rounded-xl border lg:grid-cols-2",
        className
      )}
    >
      <div className="flex min-h-[min(70vh,720px)] flex-col border-b lg:min-h-0 lg:border-b-0 lg:border-r">
        <div className="border-b bg-muted/40 px-3 py-2">
          <Label htmlFor={sourceId} className="text-xs font-medium">
            {sourceLabel}
          </Label>
        </div>
        <textarea
          id={sourceId}
          value={markdown}
          onChange={(event) => onMarkdownChange(event.target.value)}
          spellCheck
          className="min-h-0 flex-1 resize-none border-0 bg-transparent px-3 py-3 font-mono text-xs leading-relaxed shadow-none outline-none focus-visible:ring-0"
          aria-describedby={previewId}
        />
      </div>
      <div className="flex min-h-[min(70vh,720px)] flex-col bg-muted/15 lg:min-h-0">
        <div
          id={previewId}
          className="border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground"
        >
          {previewLabel}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {previewMarkdown.trim() ? (
            <PolicyMarkdownView markdown={previewMarkdown} />
          ) : (
            <p className="text-sm text-muted-foreground">{emptyPreviewText}</p>
          )}
        </div>
      </div>
    </div>
  );
}
