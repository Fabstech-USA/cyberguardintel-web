import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  drawSignatureFormSection,
  embedPdfFonts,
  splitMarkdownBodyAndSignatures,
  type SignatureLayoutContext,
} from "@/lib/baa-pdf-signature-fields";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 56;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

type Block =
  | { kind: "heading"; text: string; level: 1 | 2 | 3 }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; text: string };

/** Strip markdown emphasis markers for PDF plain text. */
export function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export function markdownToBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push({
      kind: "paragraph",
      text: stripMarkdownInline(paragraphLines.join(" ")),
    });
    paragraphLines = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    const h3 = /^###\s+(.+)$/.exec(trimmed);
    if (h3) {
      flushParagraph();
      blocks.push({ kind: "heading", text: stripMarkdownInline(h3[1]), level: 3 });
      continue;
    }
    const h2 = /^##\s+(.+)$/.exec(trimmed);
    if (h2) {
      flushParagraph();
      blocks.push({ kind: "heading", text: stripMarkdownInline(h2[1]), level: 2 });
      continue;
    }
    const h1 = /^#\s+(.+)$/.exec(trimmed);
    if (h1) {
      flushParagraph();
      blocks.push({ kind: "heading", text: stripMarkdownInline(h1[1]), level: 1 });
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
    if (bullet) {
      flushParagraph();
      blocks.push({ kind: "bullet", text: stripMarkdownInline(bullet[1]) });
      continue;
    }
    paragraphLines.push(trimmed);
  }
  flushParagraph();
  return blocks;
}

function wrapText(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function generateBaaMarkdownPdf(input: {
  title: string;
  markdown: string;
  footer?: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const { font, fontBold } = await embedPdfFonts(pdf);
  const { body, signatures } = splitMarkdownBodyAndSignatures(input.markdown);
  const blocksAll = markdownToBlocks(body);
  // Avoid duplicate titles when markdown already starts with an H1.
  const first = blocksAll[0];
  const markdownTitle =
    first?.kind === "heading" && first.level === 1 ? first.text : null;
  const pdfTitle = markdownTitle || input.title;
  const blocks = markdownTitle ? blocksAll.slice(1) : blocksAll;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN_TOP;
    layoutCtx.page = page;
    layoutCtx.y = y;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN_BOTTOM) newPage();
  };

  const layoutCtx: SignatureLayoutContext = {
    pdf,
    page,
    y,
    pageTopY: PAGE_HEIGHT - MARGIN_TOP,
    pageBottomY: MARGIN_BOTTOM,
    font,
    fontBold,
    contentWidth: CONTENT_WIDTH,
    newPage,
  };

  const drawLines = (
    lines: string[],
    size: number,
    bold: boolean,
    lineHeight: number,
    indent = 0
  ) => {
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, {
        x: MARGIN_X + indent,
        y,
        size,
        font: bold ? fontBold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineHeight;
    }
    layoutCtx.page = page;
    layoutCtx.y = y;
  };

  drawLines(wrapText(pdfTitle, fontBold, 16, CONTENT_WIDTH), 16, true, 20);
  y -= 6;
  layoutCtx.y = y;

  for (const block of blocks) {
    if (block.kind === "heading") {
      const size = block.level === 1 ? 14 : block.level === 2 ? 12 : 11;
      y -= 4;
      drawLines(
        wrapText(block.text, fontBold, size, CONTENT_WIDTH),
        size,
        true,
        size + 6
      );
      continue;
    }
    if (block.kind === "bullet") {
      const lines = wrapText(block.text, font, 10, CONTENT_WIDTH - 14);
      ensureSpace((lines.length + 1) * 14);
      page.drawText("•", {
        x: MARGIN_X,
        y,
        size: 10,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      drawLines(lines, 10, false, 14, 14);
      continue;
    }
    drawLines(wrapText(block.text, font, 10, CONTENT_WIDTH), 10, false, 14);
    y -= 4;
    layoutCtx.y = y;
  }

  if (signatures?.length) {
    // Signatures should be easy to review/sign. Always render them on a clean page.
    newPage();
    layoutCtx.page = page;
    layoutCtx.y = y;
    y = drawSignatureFormSection(layoutCtx, signatures);
    page = layoutCtx.page;
  }

  const footer =
    input.footer ??
    "Draft for review and electronic signature — generated by CyberGuardIntel";
  const footerLines = wrapText(footer, font, 8, CONTENT_WIDTH);
  ensureSpace(footerLines.length * 10 + 8);
  for (const line of footerLines) {
    page.drawText(line, {
      x: MARGIN_X,
      y: MARGIN_BOTTOM - 4,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return pdf.save();
}

export function baaDraftPdfS3Key(organizationId: string, baaRecordId: string): string {
  return `hipaa/baa/${organizationId}/${baaRecordId}-draft.pdf`;
}
