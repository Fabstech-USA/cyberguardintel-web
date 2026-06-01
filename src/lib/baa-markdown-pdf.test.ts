import { describe, expect, it } from "vitest";

import {
  generateBaaMarkdownPdf,
  markdownToBlocks,
  sanitizePdfText,
  stripMarkdownInline,
} from "@/lib/baa-markdown-pdf";

describe("baa-markdown-pdf", () => {
  it("strips bold markers", () => {
    expect(stripMarkdownInline("**California**")).toBe("California");
  });

  it("replaces emoji and smart punctuation for WinAnsi PDF fonts", () => {
    expect(sanitizePdfText("⚠ Review required — update “policy”")).toBe(
      '(!) Review required -- update "policy"'
    );
  });

  it("generates a PDF when markdown contains warning emoji", async () => {
    const bytes = await generateBaaMarkdownPdf({
      title: "Access Control",
      markdown:
        "# Access Control\n\n⚠ All workforce members must use unique credentials.",
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe(
      "%PDF"
    );
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
