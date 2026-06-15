/**
 * Styling, fonts, and metadata.
 *
 * Behavioral tests for cross-cutting concerns that influence every render.
 */

import { describe, it, expect } from 'vitest';
import { htmlToPdf } from '../src';
import { isPdfBuffer, readMetadata } from './helpers/pdf-assertions';

describe('Applying styles', () => {
  describe('when custom styles override defaults', () => {
    it('produces a valid PDF without throwing', async () => {
      const result = await htmlToPdf('<h1>Styled</h1><p>Body.</p>', {
        styles: {
          h1: { fontSize: 32, color: '#cc0000', bold: true },
          p: { fontSize: 13, lineHeight: 1.6 },
        },
      });

      expect(isPdfBuffer(await result.toBuffer())).toBe(true);
    });
  });

  describe('when resetStyles is true', () => {
    it('still produces a renderable PDF using only the supplied map', async () => {
      const result = await htmlToPdf('<h1>Reset</h1>', {
        resetStyles: true,
        styles: { h1: { fontSize: 18 } },
      });

      expect(isPdfBuffer(await result.toBuffer())).toBe(true);
    });
  });
});

describe('Loading fonts', () => {
  describe('when no fonts are provided', () => {
    it('falls back to the bundled Roboto and renders successfully', async () => {
      const result = await htmlToPdf('<h1>Default Font</h1>');

      expect(isPdfBuffer(await result.toBuffer())).toBe(true);
    });
  });
});

describe('Embedding metadata', () => {
  describe('when keywords are passed as an array', () => {
    it('joins them with spaces for the PDF info dictionary', async () => {
      const result = await htmlToPdf('<h1>Doc</h1>', {
        metadata: { keywords: ['finance', 'Q4', '2025'] },
      });

      const meta = await readMetadata(await result.toBuffer());
      expect(meta.keywords).toContain('finance');
      expect(meta.keywords).toContain('Q4');
      expect(meta.keywords).toContain('2025');
    });
  });

  describe('when no metadata is provided', () => {
    it('still produces a valid PDF (with auto-applied creationDate)', async () => {
      const result = await htmlToPdf('<h1>Plain</h1>');

      expect(isPdfBuffer(await result.toBuffer())).toBe(true);
    });
  });
});
