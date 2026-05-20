import { Markdown, MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";

let manager: MarkdownManager | null = null;

function getMarkdownManager(): MarkdownManager {
  if (!manager) {
    manager = new MarkdownManager({
      extensions: [StarterKit, Markdown],
    });
  }
  return manager;
}

/** Parse markdown to TipTap JSON and serialize back (for tests and validation). */
export function markdownRoundTrip(markdown: string): string {
  const md = getMarkdownManager();
  const json = md.parse(markdown);
  return md.serialize(json);
}
