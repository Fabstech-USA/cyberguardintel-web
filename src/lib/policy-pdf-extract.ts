import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PolicyUploadError } from "@/lib/policy-upload-shared";

const PDF_WORKER_RELATIVE_PATHS = [
  "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs",
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
] as const;

let pdfWorkerReady: Promise<void> | null = null;

type PdfWorkerGlobal = {
  WorkerMessageHandler: unknown;
};

/**
 * pdfjs fake-worker mode dynamically imports `GlobalWorkerOptions.workerSrc`.
 * Under Next.js that URL becomes a non-existent `[externals]/pdf-parse...` path.
 * Preload WorkerMessageHandler from disk so pdf.js skips that import entirely.
 */
async function ensurePdfParseWorker(): Promise<void> {
  if (pdfWorkerReady) {
    await pdfWorkerReady;
    return;
  }

  pdfWorkerReady = (async () => {
    const root = process.cwd();

    for (const relativePath of PDF_WORKER_RELATIVE_PATHS) {
      const absolutePath = path.join(root, relativePath);
      if (!fs.existsSync(absolutePath)) continue;

      const workerUrl = pathToFileURL(absolutePath).href;
      const workerModule = (await import(
        /* webpackIgnore: true */
        workerUrl
      )) as PdfWorkerGlobal;

      if (workerModule.WorkerMessageHandler) {
        (
          globalThis as typeof globalThis & {
            pdfjsWorker?: PdfWorkerGlobal;
          }
        ).pdfjsWorker = {
          WorkerMessageHandler: workerModule.WorkerMessageHandler,
        };
      }

      const { PDFParse } = await import("pdf-parse");
      PDFParse.setWorker(workerUrl);
      return;
    }

    throw new PolicyUploadError(
      "EXTRACTION_FAILED",
      "PDF extraction is unavailable in this environment."
    );
  })();

  await pdfWorkerReady;
}

export async function extractPdfPolicyText(bytes: Uint8Array): Promise<string> {
  await ensurePdfParseWorker();

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(bytes) });
  try {
    const parsed = await parser.getText();
    return parsed.text.trim();
  } finally {
    await parser.destroy();
  }
}
