import {
  PDFArray,
  PDFDocument,
  PDFName,
  PDFNumber,
  type PDFPage,
  PDFString,
  rgb,
  StandardFonts,
  type PDFFont,
} from "pdf-lib";

const MARGIN_X = 56;
const LABEL_SIZE = 10;
const FIELD_HEIGHT = 20;
// Keep signature widgets compact so they don't overlap neighboring fields in Preview.
const SIGNATURE_HEIGHT = 34;
const ROW_GAP = 14; // vertical gap between rows (points)
const PARTY_BLOCK_HEIGHT = 152;
const SIGNATURE_HINT_SIZE = 9;

export type BaaSignatureParty = {
  key: "covered_entity" | "business_associate";
  label: string;
  signerName: string;
  signerTitle: string;
  signatureDate: string;
};

export function splitMarkdownBodyAndSignatures(markdown: string): {
  body: string;
  signatures: BaaSignatureParty[] | null;
} {
  const match = markdown.match(/^## Signatures\s*$/m);
  if (!match || match.index === undefined) {
    return { body: markdown, signatures: null };
  }
  const body = markdown.slice(0, match.index).trimEnd();
  const signatures = parseSignatureSection(markdown.slice(match.index));
  return { body, signatures };
}

function parseSignatureSection(section: string): BaaSignatureParty[] {
  const parties: BaaSignatureParty[] = [];
  const blocks = section.split(/^###\s+/m).slice(1);
  for (const block of blocks) {
    const [headingLine, ...rest] = block.split("\n");
    const label = headingLine.trim();
    const text = rest.join("\n");
    const key =
      label.toLowerCase().includes("business associate")
        ? "business_associate"
        : "covered_entity";
    parties.push({
      key,
      label,
      signerName: extractBulletValue(text, "Name"),
      signerTitle: extractBulletValue(text, "Title"),
      signatureDate: extractBulletValue(text, "Date"),
    });
  }
  return parties;
}

function extractBulletValue(block: string, label: string): string {
  const re = new RegExp(
    `^-\\s*${label}:\\s*(?:\\*\\*)?(.+?)(?:\\*\\*)?\\s*$`,
    "im"
  );
  const m = block.match(re);
  return m?.[1]?.trim() ?? "";
}

function isBlankPlaceholder(value: string): boolean {
  const t = value.trim();
  return !t || /^_+$/.test(t.replace(/\s/g, ""));
}

function pushPageAnnot(page: PDFPage, annotRef: ReturnType<PDFDocument["context"]["register"]>) {
  const existing = page.node.Annots();
  if (existing) {
    existing.push(annotRef);
    return;
  }
  page.node.set(PDFName.of("Annots"), page.doc.context.obj([annotRef]));
}

function registerSignatureWidget(
  pdf: PDFDocument,
  page: PDFPage,
  fieldName: string,
  rect: [number, number, number, number]
) {
  const widget = pdf.context.obj({
    Type: "Annot",
    Subtype: "Widget",
    FT: "Sig",
    Rect: rect.map((n) => PDFNumber.of(n)),
    T: PDFString.of(fieldName),
    F: 4,
    P: page.ref,
    MK: pdf.context.obj({
      BC: [0.2, 0.2, 0.2],
      BG: [0.98, 0.98, 0.99],
      Border: [0, 0, 1],
    }),
  });
  const widgetRef = pdf.context.register(widget);
  pushPageAnnot(page, widgetRef);

  const acroForm = pdf.catalog.getOrCreateAcroForm();
  acroForm.addField(widgetRef);
}

function addLabeledTextField(
  pdf: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  fieldName: string,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
) {
  page.drawText(label, {
    x,
    y: y + 6,
    size: LABEL_SIZE,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  const field = pdf.getForm().createTextField(fieldName);
  if (!isBlankPlaceholder(value)) {
    field.setText(value);
  }
  field.addToPage(page, {
    x: x + 52,
    y,
    width: width - 52,
    height: FIELD_HEIGHT,
    font,
    borderWidth: 1,
    borderColor: rgb(0.45, 0.45, 0.5),
    backgroundColor: rgb(1, 1, 1),
  });
}

export type SignatureLayoutContext = {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
  pageTopY: number;
  pageBottomY: number;
  font: PDFFont;
  fontBold: PDFFont;
  contentWidth: number;
  newPage: () => void;
};

export function drawSignatureFormSection(
  ctx: SignatureLayoutContext,
  parties: BaaSignatureParty[]
): number {
  const { pdf, font, fontBold, contentWidth } = ctx;

  let page = ctx.page;
  let y = ctx.y;

  const ensureSpace = (needed: number) => {
    if (y - needed >= ctx.pageBottomY) return;
    ctx.newPage();
    page = ctx.page;
    y = ctx.y;
  };

  ensureSpace(28);
  page.drawText("Signatures", {
    x: MARGIN_X,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 22;

  for (const party of parties) {
    ensureSpace(PARTY_BLOCK_HEIGHT);

    page.drawText(party.label, {
      x: MARGIN_X,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 24;

    const prefix = `baa.${party.key}`;
    addLabeledTextField(
      pdf,
      page,
      font,
      `${prefix}.signer_name`,
      "Name:",
      party.signerName,
      MARGIN_X,
      y,
      contentWidth
    );
    y -= FIELD_HEIGHT + ROW_GAP;
    addLabeledTextField(
      pdf,
      page,
      font,
      `${prefix}.signer_title`,
      "Title:",
      party.signerTitle,
      MARGIN_X,
      y,
      contentWidth
    );
    y -= FIELD_HEIGHT + ROW_GAP;
    page.drawText("Signature:", {
      x: MARGIN_X,
      y: y + 6,
      size: LABEL_SIZE,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    const sigRect: [number, number, number, number] = [
      MARGIN_X + 52,
      y,
      MARGIN_X + contentWidth,
      y + SIGNATURE_HEIGHT,
    ];

    // Draw a visible signature box so it looks good in viewers even before signing.
    page.drawRectangle({
      x: sigRect[0],
      y: sigRect[1],
      width: sigRect[2] - sigRect[0],
      height: sigRect[3] - sigRect[1],
      borderWidth: 1,
      borderColor: rgb(0.45, 0.45, 0.5),
      color: rgb(0.98, 0.98, 0.99),
    });
    page.drawText("Click to sign", {
      x: sigRect[0] + 10,
      y: sigRect[1] + SIGNATURE_HEIGHT / 2 - 4,
      size: SIGNATURE_HINT_SIZE,
      font,
      color: rgb(0.45, 0.45, 0.5),
    });

    registerSignatureWidget(pdf, page, `${prefix}.signature`, sigRect);
    y -= SIGNATURE_HEIGHT + ROW_GAP;
    addLabeledTextField(
      pdf,
      page,
      font,
      `${prefix}.signature_date`,
      "Date:",
      party.signatureDate,
      MARGIN_X,
      y,
      contentWidth
    );
    y -= FIELD_HEIGHT + ROW_GAP + 10;
    ctx.page = page;
    ctx.y = y;
  }

  try {
    pdf.getForm().updateFieldAppearances(font);
  } catch {
    // Appearance update is best-effort for mixed widget types.
  }
  return ctx.y;
}

export async function embedPdfFonts(pdf: PDFDocument) {
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  return { font, fontBold };
}
