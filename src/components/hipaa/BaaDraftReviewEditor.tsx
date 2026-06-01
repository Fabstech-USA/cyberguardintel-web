"use client";

import { MarkdownSplitEditor } from "@/components/hipaa/MarkdownSplitEditor";

type Props = {
  markdown: string;
  onMarkdownChange: (value: string) => void;
  className?: string;
};

/** Side-by-side markdown source and live preview for BAA draft review. */
export function BaaDraftReviewEditor({
  markdown,
  onMarkdownChange,
  className,
}: Props): React.JSX.Element {
  return (
    <MarkdownSplitEditor
      markdown={markdown}
      onMarkdownChange={onMarkdownChange}
      className={className}
      sourceId="baa-draft-source"
      previewId="baa-draft-preview-label"
      emptyPreviewText="Preview appears here as you edit the agreement text."
    />
  );
}
