import { describe, expect, it } from "vitest";

import { extractPdfPolicyText } from "@/lib/policy-pdf-extract";

const MINIMAL_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj 4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj 5 0 obj<</Length 44>>stream\nBT /F1 12 Tf 20 100 Td (Hello policy upload) Tj ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000262 00000 n \n0000000330 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n420\n%%EOF"
);

describe("policy-pdf-extract", () => {
  it("extracts text from a minimal PDF buffer", async () => {
    const text = await extractPdfPolicyText(MINIMAL_PDF);
    expect(text).toContain("Hello policy upload");
  });
});
