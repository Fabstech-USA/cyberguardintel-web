import { describe, expect, it } from "vitest";

import {
  generateBaaMarkdownPdf,
  markdownToBlocks,
  stripMarkdownInline,
} from "@/lib/baa-markdown-pdf";

describe("baa-markdown-pdf", () => {
  it("strips bold markers", () => {
    expect(stripMarkdownInline("**California**")).toBe("California");
  });

  it("parses headings and bullets", () => {
    const blocks = markdownToBlocks(
      "# Title\n\n## Section\n\n- Item one\n\nParagraph text."
    );
    expect(blocks[0]).toEqual({ kind: "heading", text: "Title", level: 1 });
    expect(blocks.some((b) => b.kind === "bullet" && b.text === "Item one")).toBe(
      true
    );
  });

  it("generates a non-empty PDF", async () => {
    const bytes = await generateBaaMarkdownPdf({
      title: "Business Associate Agreement",
      markdown: "# BAA\n\n## 1. Definitions\n\nSample clause text.",
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe(
      "%PDF"
    );
  });
});
