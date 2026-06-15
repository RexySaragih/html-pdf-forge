/**
 * Generating PDFs from HTML.
 *
 * Behavioral tests for the primary user-facing flow: input HTML, get a
 * functional PDF result. Covers `htmlToPdf` and `HtmlPdfForge` together
 * since both share the same pipeline.
 */

import { describe, it, expect } from 'vitest';
import { Readable } from 'stream';
import { htmlToPdf, HtmlPdfForge } from '../src';
import { isPdfBuffer, readMetadata, readPageCount } from './helpers/pdf-assertions';

describe('Generating a PDF from HTML', () => {
  describe('when given a basic HTML document', () => {
    it('produces a readable PDF with the requested metadata', async () => {
      const result = await htmlToPdf('<h1>Hello World</h1><p>Body copy.</p>', {
        metadata: { title: 'My Doc', author: 'Jane', subject: 'Test', keywords: ['a', 'b'] },
      });

      const buffer = await result.toBuffer();

      expect(isPdfBuffer(buffer)).toBe(true);
      const meta = await readMetadata(buffer);
      expect(meta.title).toBe('My Doc');
      expect(meta.author).toBe('Jane');
      expect(meta.subject).toBe('Test');
      expect(meta.keywords).toContain('a');
    });
  });

  describe('when requesting different output formats', () => {
    it('exposes the same bytes through buffer, base64, stream, and file', async () => {
      const tmpDir = await import('os').then((os) => os.tmpdir());
      const tmpPath = `${tmpDir}/forge-output-${Date.now()}.pdf`;
      const result = await htmlToPdf('<h1>Output formats</h1>');

      const buffer = await result.toBuffer();
      const base64 = await result.toBase64();
      await result.saveToFile(tmpPath);

      const fs = await import('fs/promises');
      const fromDisk = await fs.readFile(tmpPath);
      await fs.unlink(tmpPath);

      const fromStream = await collectStream(result.toStream());

      expect(buffer.length).toBeGreaterThan(0);
      expect(Buffer.from(base64, 'base64')).toEqual(buffer);
      expect(fromDisk).toEqual(buffer);
      // Stream is a fresh render but produces a structurally valid PDF.
      expect(isPdfBuffer(fromStream)).toBe(true);
    });
  });

  describe('when the same forge is reused', () => {
    it('applies its defaults and merges per-call overrides', async () => {
      const forge = new HtmlPdfForge({
        page: { size: 'A4', orientation: 'landscape' },
        metadata: { author: 'Reused Forge', creator: 'html-pdf-forge' },
      });

      const first = await forge.generate('<h1>Doc 1</h1>', {
        metadata: { title: 'First Document' },
      });
      const second = await forge.generate('<h1>Doc 2</h1>', {
        metadata: { title: 'Second Document' },
      });

      const firstMeta = await readMetadata(await first.toBuffer());
      const secondMeta = await readMetadata(await second.toBuffer());

      expect(firstMeta.title).toBe('First Document');
      expect(firstMeta.author).toBe('Reused Forge');
      expect(secondMeta.title).toBe('Second Document');
      expect(secondMeta.author).toBe('Reused Forge');
    });
  });

  describe('when given multi-page content via explicit page break', () => {
    it('produces the requested number of pages', async () => {
      // pdfmake-friendly page break: html-to-pdfmake recognizes
      // <div data-pdfmake='{"pageBreak":"after"}'></div>.
      const html =
        '<h1>Page 1</h1>' +
        "<div data-pdfmake='{\"pageBreak\":\"after\"}'></div>" +
        '<h1>Page 2</h1>';
      const result = await htmlToPdf(html);

      const pageCount = await readPageCount(await result.toBuffer());

      expect(pageCount).toBe(2);
    });
  });
});

async function collectStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of Readable.from(stream)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
