import { describe, expect, it } from "vitest";
import { normalizePolicyMarkdown } from "@/lib/normalize-policy-markdown";

describe("normalizePolicyMarkdown", () => {
  it("inserts space after heading markers", () => {
    const out = normalizePolicyMarkdown("#Access Control\n##Purpose\nBody text.");
    expect(out).toContain("# Access Control");
    expect(out).toContain("## Purpose");
  });

  it("splits run-on headings and list items", () => {
    const out = normalizePolicyMarkdown(
      "Intro sentence.## Scope\nMore text.- First item\n- Second item"
    );
    expect(out).toMatch(/## Scope/);
    expect(out).toContain("- First item");
    expect(out).toContain("- Second item");
  });

  it("preserves well-formed markdown", () => {
    const source = `# Title

## Purpose

Paragraph with spaces between words.

- Bullet one
- Bullet two`;

    expect(normalizePolicyMarkdown(source)).toBe(source);
  });
});
