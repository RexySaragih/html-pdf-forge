/**
 * Test helpers for inspecting generated PDF bytes.
 *
 * Tests focus on observable behavior: can we read this back? Does it have the
 * expected pages, metadata, and structure? These helpers wrap pdf-lib so test
 * files stay readable.
 */

import { PDFDocument } from 'pdf-lib';

const PDF_MAGIC = '%PDF';

export function isPdfBuffer(buffer: Buffer): boolean {
  if (!Buffer.isBuffer(buffer) || buffer.length < 100) return false;
  return buffer.subarray(0, 4).toString('ascii') === PDF_MAGIC;
}

export function isEncryptedPdf(buffer: Buffer): boolean {
  // Encrypted PDFs include a top-level /Encrypt entry in the trailer dict.
  return isPdfBuffer(buffer) && buffer.toString('latin1').includes('/Encrypt');
}

export async function readPageCount(buffer: Buffer): Promise<number> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return doc.getPageCount();
}

export interface ReadMetadataResult {
  title: string | undefined;
  author: string | undefined;
  subject: string | undefined;
  keywords: string | undefined;
  creator: string | undefined;
}

export async function readMetadata(buffer: Buffer): Promise<ReadMetadataResult> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return {
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    keywords: doc.getKeywords(),
    creator: doc.getCreator(),
  };
}
