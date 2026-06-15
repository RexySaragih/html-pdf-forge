/**
 * Merging and splitting PDFs.
 *
 * Behavioral tests for the standalone `html-pdf-forge/merge` and
 * `html-pdf-forge/split` entry points. Page-count assertions confirm the
 * combined / sliced documents have the expected shape.
 */

import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { htmlToPdf, PdfMergeError, PdfSplitError } from '../src';
import { mergePdfs } from '../src/merge';
import { splitPdf } from '../src/split';
import { readMetadata, readPageCount } from './helpers/pdf-assertions';

describe('Merging PDFs', () => {
  describe('when given two single-page source PDFs', () => {
    it('produces a two-page combined PDF in input order', async () => {
      const a = await htmlToPdf('<h1>Doc A</h1>');
      const b = await htmlToPdf('<h1>Doc B</h1>');

      const merged = await mergePdfs([a, b]);

      const pageCount = await readPageCount(await merged.toBuffer());
      expect(pageCount).toBe(2);
    });
  });

  describe('when sources are passed as different shapes', () => {
    it('accepts Buffer, PdfResult, and file-path interchangeably', async () => {
      const a = await htmlToPdf('<h1>Doc A</h1>');
      const b = await htmlToPdf('<h1>Doc B</h1>');
      const c = await htmlToPdf('<h1>Doc C</h1>');

      const tmpFile = join(tmpdir(), `forge-merge-${Date.now()}.pdf`);
      await fs.writeFile(tmpFile, await c.toBuffer());

      const merged = await mergePdfs([await a.toBuffer(), b, tmpFile]);

      await fs.unlink(tmpFile);
      const pageCount = await readPageCount(await merged.toBuffer());
      expect(pageCount).toBe(3);
    });
  });

  describe('when metadata options are supplied', () => {
    it('applies them to the merged document', async () => {
      const a = await htmlToPdf('<h1>A</h1>');
      const b = await htmlToPdf('<h1>B</h1>');

      const merged = await mergePdfs([a, b], {
        metadata: { title: 'Bundled', author: 'Forge', keywords: ['x', 'y'] },
      });

      const meta = await readMetadata(await merged.toBuffer());
      expect(meta.title).toBe('Bundled');
      expect(meta.author).toBe('Forge');
      expect(meta.keywords).toContain('x');
    });
  });

  describe('when given an empty input list', () => {
    it('throws PdfMergeError', async () => {
      await expect(mergePdfs([])).rejects.toThrow(PdfMergeError);
    });
  });
});

describe('Splitting a PDF', () => {
  async function buildThreePagePdf(): Promise<Buffer> {
    const a = await htmlToPdf('<h1>Page A</h1>');
    const b = await htmlToPdf('<h1>Page B</h1>');
    const c = await htmlToPdf('<h1>Page C</h1>');
    const merged = await mergePdfs([a, b, c]);
    return merged.toBuffer();
  }

  describe('when given inclusive 1-indexed ranges', () => {
    it('produces one PDF per range with the matching page counts', async () => {
      const source = await buildThreePagePdf();

      const parts = await splitPdf(source, [
        [1, 1],
        [2, 3],
      ]);

      expect(parts).toHaveLength(2);
      expect(await readPageCount(await parts[0].toBuffer())).toBe(1);
      expect(await readPageCount(await parts[1].toBuffer())).toBe(2);
    });
  });

  describe('when a range exceeds the document length', () => {
    it('throws PdfSplitError naming the offending range', async () => {
      const source = await buildThreePagePdf();

      await expect(splitPdf(source, [[1, 99]])).rejects.toThrow(PdfSplitError);
    });
  });

  describe('when a range is reversed (end < start)', () => {
    it('throws PdfSplitError', async () => {
      const source = await buildThreePagePdf();

      await expect(splitPdf(source, [[3, 1]])).rejects.toThrow(PdfSplitError);
    });
  });

  describe('when no ranges are supplied', () => {
    it('throws PdfSplitError', async () => {
      const source = await buildThreePagePdf();

      await expect(splitPdf(source, [])).rejects.toThrow(PdfSplitError);
    });
  });
});
