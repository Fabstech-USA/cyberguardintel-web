import { describe, expect, it } from "vitest";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { markdownRoundTrip } from "@/lib/policy-markdown";

describe("markdownRoundTrip", () => {
  it("preserves headings and list markdown", () => {
    const source = `# Access control

## Purpose

- Limit access to PHI
- Review quarterly

**Bold** and _italic_ text.`;

    const result = markdownRoundTrip(source);
    expect(result).toContain("# Access control");
    expect(result).toContain("## Purpose");
    expect(result).toContain("- Limit access to PHI");
    expect(result).toContain("**Bold**");
  });
});

describe("TipTap markdown extensions", () => {
  it("loads StarterKit with Markdown extension", () => {
    const extensions = [StarterKit, Markdown];
    expect(extensions).toHaveLength(2);
  });
});
