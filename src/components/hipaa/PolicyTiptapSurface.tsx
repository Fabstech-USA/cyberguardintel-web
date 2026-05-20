"use client";

import { Markdown } from "@tiptap/markdown";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { normalizePolicyMarkdown } from "@/lib/normalize-policy-markdown";
import { cn } from "@/lib/utils";

type Props = {
  markdown: string;
  editable: boolean;
  className?: string;
  onMarkdownChange?: (markdown: string) => void;
};

export function PolicyTiptapSurface({
  markdown,
  editable,
  className,
  onMarkdownChange,
}: Props): React.JSX.Element | null {
  const normalized = useMemo(() => normalizePolicyMarkdown(markdown), [markdown]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        markedOptions: {
          gfm: true,
          breaks: true,
        },
      }),
    ],
    content: normalized,
    contentType: "markdown",
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "policy-editor-surface focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onMarkdownChange?.(normalizePolicyMarkdown(ed.getMarkdown()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const current = normalizePolicyMarkdown(editor.getMarkdown());
    if (current === normalized) return;
    editor.commands.setContent(normalized, { contentType: "markdown" });
  }, [editor, normalized]);

  if (!editor) {
    return (
      <div
        className={cn(
          "border-input bg-muted/20 min-h-[280px] rounded-lg border",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "border-input policy-markdown overflow-hidden rounded-lg border",
        className
      )}
    >
      {editable ? <PolicyEditorToolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}

function PolicyEditorToolbar({ editor }: { editor: Editor }): React.JSX.Element {
  return (
    <div className="border-border bg-muted/40 flex flex-wrap gap-1 border-b p-2">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="h-8 px-2 text-xs font-medium"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
