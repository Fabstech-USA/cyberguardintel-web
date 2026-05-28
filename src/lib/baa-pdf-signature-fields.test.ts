import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";

import { splitMarkdownBodyAndSignatures } from "@/lib/baa-pdf-signature-fields";
import { generateBaaMarkdownPdf } from "@/lib/baa-markdown-pdf";

// Re-export parse for test — parseSignatureSection is private; test via split
function sampleMarkdown() {
  return `# BAA

## 1. Definitions

Body text.

## Signatures

### Covered Entity
- Name: **Jane Doe**
- Title: **Privacy Officer**
- Signature: ______________________________
- Date: **2026-05-24**

### Business Associate
- Name: **______________________________**
- Title: **______________________________**
- Signature: ______________________________
- Date: **______________________________**
`;
}

describe("baa-pdf-signature-fields", () => {
  it("splits body from signatures section", () => {
    const { body, signatures } = splitMarkdownBodyAndSignatures(sampleMarkdown());
    expect(body).not.toContain("## Signatures");
    expect(signatures).toHaveLength(2);
    expect(signatures?.[0].signerName).toBe("Jane Doe");
    expect(signatures?.[1].key).toBe("business_associate");
  });

  it("generates PDF with AcroForm fields when signatures present", async () => {
    const bytes = await generateBaaMarkdownPdf({
      title: "Business Associate Agreement",
      markdown: sampleMarkdown(),
    });
    const pdf = await PDFDocument.load(bytes);
    const form = pdf.getForm();
    const names = form.getFields().map((f) => f.getName());
    expect(names).toContain("baa.covered_entity.signer_name");
    expect(names).toContain("baa.covered_entity.signature");
    expect(names).toContain("baa.business_associate.signature");
    const nameField = form.getTextField("baa.covered_entity.signer_name");
    expect(nameField.getText()).toBe("Jane Doe");
  });
});
