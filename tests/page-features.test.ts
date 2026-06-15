/**
 * Page-level features.
 *
 * Behavioral tests for header, footer, page numbering, and watermark — all
 * of which decorate every rendered page.
 */

import { describe, it, expect } from 'vitest';
import { htmlToPdf } from '../src';
import { isPdfBuffer, readPageCount } from './helpers/pdf-assertions';

const MULTI_PAGE_HTML =
  '<h1>Page 1</h1>' +
  "<div data-pdfmake='{\"pageBreak\":\"after\"}'></div>" +
  '<h1>Page 2</h1>' +
  "<div data-pdfmake='{\"pageBreak\":\"after\"}'></div>" +
  '<h1>Page 3</h1>';

describe('Decorating pages with header, footer, and page numbers', () => {
  describe('when a static HTML header is provided', () => {
    it('renders a multi-page document with the header on each page', async () => {
      const result = await htmlToPdf(MULTI_PAGE_HTML, {
        header: '<div style="text-align:right">My Header</div>',
      });

      const buffer = await result.toBuffer();

      expect(isPdfBuffer(buffer)).toBe(true);
      expect(await readPageCount(buffer)).toBe(3);
    });
  });

  describe('when a dynamic footer function is provided', () => {
    it('passes (currentPage, pageCount) to the function for each page', async () => {
      const seenCalls: Array<[number, number]> = [];
      const result = await htmlToPdf(MULTI_PAGE_HTML, {
        footer: (current, total) => {
          seenCalls.push([current, total]);
          return `<div>${current} / ${total}</div>`;
        },
      });

      await result.toBuffer();

      // pdfmake invokes the footer once per page during rendering.
      expect(seenCalls.length).toBeGreaterThanOrEqual(3);
      // Every call sees the same total page count.
      const totals = new Set(seenCalls.map(([, total]) => total));
      expect(totals.size).toBe(1);
      expect(seenCalls[0][1]).toBe(3);
    });
  });

  describe('when page numbering is configured', () => {
    it('produces a valid multi-page PDF with the configured placement', async () => {
      const withPageNumber = await htmlToPdf(MULTI_PAGE_HTML, {
        pageNumber: { placement: 'footer', format: 'Page {current} of {total}' },
      });
      const withoutPageNumber = await htmlToPdf(MULTI_PAGE_HTML);

      const withBuf = await withPageNumber.toBuffer();
      const withoutBuf = await withoutPageNumber.toBuffer();

      expect(isPdfBuffer(withBuf)).toBe(true);
      expect(await readPageCount(withBuf)).toBe(3);
      // Page numbers add to every content stream, so the bytes are larger.
      expect(withBuf.length).toBeGreaterThan(withoutBuf.length);
    });
  });
});

describe('Watermarking pages', () => {
  describe('when given a watermark string', () => {
    it('produces a valid PDF (watermark embedded in compressed content stream)', async () => {
      const result = await htmlToPdf('<h1>Confidential</h1>', { watermark: 'DRAFT' });

      expect(isPdfBuffer(await result.toBuffer())).toBe(true);
    });

    it('produces structurally different bytes than the same input without a watermark', async () => {
      const html = '<h1>Confidential</h1>';
      const plain = await htmlToPdf(html);
      const stamped = await htmlToPdf(html, { watermark: 'DRAFT' });

      const plainBuf = await plain.toBuffer();
      const stampedBuf = await stamped.toBuffer();

      // The watermark is rendered into the document's content streams, so
      // the stamped output is meaningfully larger than the plain version.
      expect(stampedBuf.length).toBeGreaterThan(plainBuf.length);
    });
  });

  describe('when given watermark options with custom angle and color', () => {
    it('produces a valid PDF without throwing', async () => {
      const result = await htmlToPdf('<h1>Doc</h1>', {
        watermark: { text: 'CONFIDENTIAL', color: 'red', opacity: 0.15, angle: -30 },
      });

      expect(isPdfBuffer(await result.toBuffer())).toBe(true);
    });
  });
});
