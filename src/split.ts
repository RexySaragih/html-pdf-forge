/**
 * PDF split entry point.
 *
 * Splits a single PDF into multiple PDFs based on inclusive 1-indexed page
 * ranges. Each range becomes its own `PdfResult`.
 *
 * Sub-path import: `import { splitPdf } from 'html-pdf-forge/split';`
 *
 * Example:
 *   const parts = await splitPdf(buffer, [[1, 3], [4, 6]]);
 *   await parts[0].saveToFile('./first.pdf');
 */

import { promises as fs } from 'fs';
import { isAbsolute, resolve } from 'path';
import { PDFDocument } from 'pdf-lib';
import type { PdfResult } from './types';
import { PdfSplitError } from './utils/errors';
import { bufferToPdfResult } from './utils/pdf-result';

export type SplitInput = Buffer | Uint8Array | string | PdfResult;

/** Inclusive 1-indexed page range: `[startPage, endPage]`. */
export type PageRange = [number, number];

function isPdfResult(value: unknown): value is PdfResult {
  return Boolean(
    value && typeof value === 'object' && typeof (value as PdfResult).toBuffer === 'function',
  );
}

async function readSource(input: SplitInput): Promise<Uint8Array> {
  if (Buffer.isBuffer(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof Uint8Array) {
    return input;
  }
  if (isPdfResult(input)) {
    const buf = await input.toBuffer();
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  if (typeof input === 'string') {
    const fullPath = isAbsolute(input) ? input : resolve(process.cwd(), input);
    const data = await fs.readFile(fullPath);
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  throw new PdfSplitError(
    'Unsupported split source. Use Buffer, Uint8Array, PdfResult, or a file path.',
  );
}

function validateRange(range: PageRange, totalPages: number): void {
  const [start, end] = range;
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    throw new PdfSplitError(`Range [${start}, ${end}] must contain integer page numbers.`);
  }
  if (start < 1 || end < 1) {
    throw new PdfSplitError(`Range [${start}, ${end}] uses pages below 1. Pages are 1-indexed.`);
  }
  if (start > end) {
    throw new PdfSplitError(`Range [${start}, ${end}] is reversed. Start must be <= end.`);
  }
  if (end > totalPages) {
    throw new PdfSplitError(
      `Range [${start}, ${end}] exceeds document length of ${totalPages} pages.`,
    );
  }
}

/**
 * Splits `input` into one PDF per provided range. Ranges are 1-indexed and
 * inclusive. Returns an array of `PdfResult` in the same order as `ranges`.
 */
export async function splitPdf(input: SplitInput, ranges: PageRange[]): Promise<PdfResult[]> {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    throw new PdfSplitError('splitPdf requires at least one page range.');
  }

  try {
    const bytes = await readSource(input);
    const source = await PDFDocument.load(bytes);
    const totalPages = source.getPageCount();

    const results: PdfResult[] = [];
    for (const range of ranges) {
      validateRange(range, totalPages);
      const [start, end] = range;
      const indices: number[] = [];
      for (let i = start - 1; i < end; i += 1) {
        indices.push(i);
      }

      const slice = await PDFDocument.create();
      const copied = await slice.copyPages(source, indices);
      for (const page of copied) {
        slice.addPage(page);
      }
      const out = await slice.save();
      results.push(bufferToPdfResult(out));
    }

    return results;
  } catch (err) {
    if (err instanceof PdfSplitError) throw err;
    throw new PdfSplitError('Failed to split PDF', err);
  }
}
