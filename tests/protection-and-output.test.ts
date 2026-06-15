/**
 * PDF protection and output verification.
 *
 * Behavioral tests for password protection (F-12). We verify the output is
 * actually encrypted by inspecting for the `/Encrypt` trailer object and by
 * confirming pdf-lib refuses to load it without `ignoreEncryption`.
 */

import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { htmlToPdf } from '../src';
import { isEncryptedPdf, isPdfBuffer } from './helpers/pdf-assertions';

describe('Password-protecting a PDF', () => {
  describe('when only an owner password is set', () => {
    it('produces an encrypted PDF', async () => {
      const result = await htmlToPdf('<h1>Owner-locked</h1>', {
        protect: { ownerPassword: 'admin456' },
      });

      const buffer = await result.toBuffer();

      expect(isPdfBuffer(buffer)).toBe(true);
      expect(isEncryptedPdf(buffer)).toBe(true);
    });
  });

  describe('when both passwords and permissions are set', () => {
    it('produces a PDF whose permissions trip pdf-lib without ignoreEncryption', async () => {
      const result = await htmlToPdf('<h1>Locked</h1>', {
        protect: {
          userPassword: 'open123',
          ownerPassword: 'admin456',
          permissions: { printing: 'highResolution', copying: false, modifying: false },
        },
      });

      const buffer = await result.toBuffer();

      // Without ignoreEncryption pdf-lib refuses encrypted documents.
      await expect(PDFDocument.load(buffer)).rejects.toThrow();
      // With the bypass we can still inspect structural metadata.
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('when no protection options are passed', () => {
    it('produces an unencrypted PDF', async () => {
      const result = await htmlToPdf('<h1>Open doc</h1>');

      const buffer = await result.toBuffer();

      expect(isPdfBuffer(buffer)).toBe(true);
      expect(isEncryptedPdf(buffer)).toBe(false);
    });
  });
});
