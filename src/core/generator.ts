/**
 * pdfmake doc-definition → PdfResult.
 *
 * Wraps pdfmake's Node printer so all output formats (Buffer, stream, base64,
 * blob, file) are exposed through a single result object. The underlying
 * pdfkit document is created lazily on first request and reused thereafter.
 */

import { promises as fs } from 'fs';
import type {
  TDocumentDefinitions,
  TFontDictionary,
} from 'pdfmake/interfaces';
// Use eslint-disable to silence the require import; pdfmake is CommonJS
// without proper ESM types.
import { PdfGenerationError } from '../utils/errors';
import type { PdfResult } from '../types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake') as new (fonts: TFontDictionary) => {
  createPdfKitDocument(docDef: TDocumentDefinitions): NodeJS.ReadableStream & {
    end(): void;
  };
};

interface GeneratorInput {
  docDefinition: TDocumentDefinitions;
  fonts: TFontDictionary;
}

/**
 * Builds a `PdfResult` from a doc definition + font dictionary. The PDF bytes
 * are computed at most once per request method — `toBuffer` and `toBase64`
 * each generate independently, so callers should pick one.
 */
export function buildPdfResult({ docDefinition, fonts }: GeneratorInput): PdfResult {
  let cachedBufferPromise: Promise<Buffer> | null = null;

  const generateBuffer = (): Promise<Buffer> => {
    if (cachedBufferPromise) return cachedBufferPromise;
    cachedBufferPromise = collectStreamToBuffer(createDocumentStream({ docDefinition, fonts }));
    return cachedBufferPromise;
  };

  return {
    async toBuffer(): Promise<Buffer> {
      return generateBuffer();
    },
    toStream(): NodeJS.ReadableStream {
      return createDocumentStream({ docDefinition, fonts });
    },
    async toBase64(): Promise<string> {
      const buffer = await generateBuffer();
      return buffer.toString('base64');
    },
    async toBlob(): Promise<Blob> {
      const buffer = await generateBuffer();
      // The runtime `Blob` may come from globals (Node 18+) or from a polyfill;
      // we cast to satisfy older typings without forcing a hard dependency.
      const BlobCtor = (globalThis as { Blob?: new (parts: unknown[], options?: { type?: string }) => Blob }).Blob;
      if (!BlobCtor) {
        throw new PdfGenerationError('Blob is not available in this runtime.');
      }
      // Convert Buffer to Uint8Array so it conforms to BlobPart across runtimes.
      const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      return new BlobCtor([bytes], { type: 'application/pdf' });
    },
    async saveToFile(filePath: string): Promise<void> {
      const buffer = await generateBuffer();
      await fs.writeFile(filePath, buffer);
    },
  };
}

function createDocumentStream({ docDefinition, fonts }: GeneratorInput): NodeJS.ReadableStream {
  try {
    const printer = new PdfPrinter(fonts);
    const doc = printer.createPdfKitDocument(docDefinition);
    doc.end();
    return doc;
  } catch (err) {
    throw new PdfGenerationError('Failed to create pdfmake document', err);
  }
}

function collectStreamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolvePromise(Buffer.concat(chunks)));
    stream.on('error', (err) => rejectPromise(new PdfGenerationError('PDF stream error', err)));
  });
}
