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

  it("fixes legacy metadata fences that render as bold headings", () => {
    const legacy = `---
POLICY ID: POL-001
CFR REFERENCE: 45 CFR 164.308(a)(1)
SAFEGUARD CATEGORY: Administrative
---

# Security Management Process Policy

## Purpose

Body text.`;

    const out = normalizePolicyMarkdown(legacy);
    expect(out.indexOf("# Security Management Process Policy")).toBeLessThan(
      out.indexOf("## Policy metadata")
    );
    expect(out).toContain("**Policy Id:** POL-001");
    expect(out).toContain("Body text.");
  });

  it("reorders metadata after title when stored in legacy order", () => {
    const legacy = `## Policy metadata

- **Policy ID:** POL-002

# Assigned Security Responsibility Policy

## Purpose

Body text.`;

    const out = normalizePolicyMarkdown(legacy);
    expect(out.indexOf("# Assigned Security Responsibility Policy")).toBeLessThan(
      out.indexOf("## Policy metadata")
    );
  });
});
