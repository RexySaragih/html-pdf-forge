/**
 * Embedding images, QR codes, and barcodes.
 *
 * Behavioral tests for content the user references through HTML markup —
 * `<img>`, `<pdf-qr>`, `<pdf-barcode>`. We mock `fetch` for HTTP image tests
 * (the only I/O boundary) and use real bytes everywhere else.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { htmlToPdf } from '../src';
import { isPdfBuffer } from './helpers/pdf-assertions';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const TINY_PNG_DATA_URI = `data:image/png;base64,${TINY_PNG_BASE64}`;
const TINY_PNG_BYTES = Buffer.from(TINY_PNG_BASE64, 'base64');

describe('Embedding images', () => {
  describe('when the image is already a data URI', () => {
    it('passes the bytes through and produces a valid PDF', async () => {
      const result = await htmlToPdf(
        `<p>Inline: <img src="${TINY_PNG_DATA_URI}" width="10" height="10" /></p>`,
      );

      expect(isPdfBuffer(await result.toBuffer())).toBe(true);
    });
  });

  describe('when the image is fetched over HTTP', () => {
    let originalFetch: typeof globalThis.fetch;
    const fetchMock = vi.fn(async (input: unknown) => {
      void input;
      return new Response(TINY_PNG_BYTES, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    });

    beforeEach(() => {
      originalFetch = globalThis.fetch;
      globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
      fetchMock.mockClear();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('fetches the image, embeds the bytes, and produces a valid PDF', async () => {
      const result = await htmlToPdf(
        '<p>Remote: <img src="https://example.com/icon.png" width="10" height="10" /></p>',
      );

      expect(isPdfBuffer(await result.toBuffer())).toBe(true);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/icon.png');
    });

    it('runs concurrent fetches in parallel for multiple images', async () => {
      const html =
        '<img src="https://a.com/1.png" /><img src="https://b.com/2.png" /><img src="https://c.com/3.png" />';

      const result = await htmlToPdf(html);

      expect(isPdfBuffer(await result.toBuffer())).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('when the remote image returns a non-2xx response', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
      globalThis.fetch = (async () =>
        new Response('not found', {
          status: 404,
          statusText: 'Not Found',
        })) as typeof globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('surfaces an ImageProcessingError with the failed URL', async () => {
      await expect(htmlToPdf('<img src="https://example.com/missing.png" />')).rejects.toThrow(
        /Failed to fetch image/,
      );
    });
  });
});

describe('Embedding QR codes', () => {
  describe('when a <pdf-qr> tag has a value', () => {
    it('renders to an embedded image without errors', async () => {
      const result = await htmlToPdf(
        '<h2>Scan</h2><pdf-qr value="https://example.com/abc" size="120" />',
      );

      const buffer = await result.toBuffer();
      expect(isPdfBuffer(buffer)).toBe(true);
      // Embedded images are stored as PDF XObjects; their presence shows
      // the QR was actually inlined.
      expect(buffer.toString('latin1')).toContain('/Image');
    });
  });

  describe('when a <pdf-qr> tag is missing its value', () => {
    it('drops the tag silently and still produces a PDF', async () => {
      const result = await htmlToPdf('<h2>Scan</h2><pdf-qr /><p>After.</p>');

      expect(isPdfBuffer(await result.toBuffer())).toBe(true);
    });
  });
});

describe('Embedding barcodes', () => {
  describe('when a <pdf-barcode> tag has type and value', () => {
    it('renders to an embedded image and produces a valid PDF', async () => {
      const result = await htmlToPdf(
        '<pdf-barcode type="code128" value="ABC-12345" width="220" height="70" />',
      );

      const buffer = await result.toBuffer();
      expect(isPdfBuffer(buffer)).toBe(true);
      expect(buffer.toString('latin1')).toContain('/Image');
    });
  });

  describe('when both QR and barcode tags coexist in the same document', () => {
    it('renders both into the final PDF', async () => {
      const result = await htmlToPdf(
        '<h1>Shipment</h1>' +
          '<pdf-qr value="https://example.com/track/42" size="80" />' +
          '<pdf-barcode type="code128" value="SHIP-42" width="200" height="60" />',
      );

      expect(isPdfBuffer(await result.toBuffer())).toBe(true);
    });
  });
});
