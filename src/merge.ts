/**
 * PDF merge entry point.
 *
 * Combines multiple PDFs into one using `pdf-lib`. Sources can be:
 *   - Buffer / Uint8Array
 *   - PdfResult (from htmlToPdf, templates, or earlier merge/split calls)
 *   - File path string (resolved relative to cwd if not absolute)
 *
 * Sub-path import: `import { mergePdfs } from 'html-pdf-forge/merge';`
 */

import { promises as fs } from 'fs';
import { isAbsolute, resolve } from 'path';
import { PDFDocument } from 'pdf-lib';
import type { PdfResult } from './types';
import { PdfMergeError } from './utils/errors';
import { bufferToPdfResult } from './utils/pdf-result';

export type MergeInput = Buffer | Uint8Array | string | PdfResult;

export interface MergeOptions {
  /**
   * Optional metadata applied to the merged PDF. When omitted, the merged
   * output inherits whatever `pdf-lib` produces by default.
   */
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  };
}

function isPdfResult(value: unknown): value is PdfResult {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as PdfResult).toBuffer === 'function',
  );
}

async function readSource(input: MergeInput): Promise<Uint8Array> {
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
  throw new PdfMergeError('Unsupported merge source. Use Buffer, Uint8Array, PdfResult, or a file path.');
}

function applyMetadata(doc: PDFDocument, meta: MergeOptions['metadata']): void {
  if (!meta) return;
  if (meta.title !== undefined) doc.setTitle(meta.title);
  if (meta.author !== undefined) doc.setAuthor(meta.author);
  if (meta.subject !== undefined) doc.setSubject(meta.subject);
  if (meta.keywords !== undefined) doc.setKeywords(meta.keywords);
}

/**
 * Merges the given PDFs in order and returns a `PdfResult` for the combined
 * document. Page order is preserved — pages from the first input come first,
 * then the second, and so on.
 */
export async function mergePdfs(inputs: MergeInput[], options: MergeOptions = {}): Promise<PdfResult> {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new PdfMergeError('mergePdfs requires at least one input PDF.');
  }

  try {
    const merged = await PDFDocument.create();
    applyMetadata(merged, options.metadata);

    for (const input of inputs) {
      const bytes = await readSource(input);
      const source = await PDFDocument.load(bytes);
      const pageIndices = source.getPageIndices();
      const copied = await merged.copyPages(source, pageIndices);
      for (const page of copied) {
        merged.addPage(page);
      }
    }

    const out = await merged.save();
    return bufferToPdfResult(out);
  } catch (err) {
    if (err instanceof PdfMergeError) throw err;
    throw new PdfMergeError('Failed to merge PDFs', err);
  }
}
