/**
 * Custom fonts example.
 *
 *   ts-node examples/custom-fonts.ts
 *
 * Shows two ways to register a font:
 *   1. By file path  (most common — point at .ttf files on disk)
 *   2. By Buffer     (load from S3, a CDN, a database, etc.)
 *
 * This example uses pdfmake's bundled Roboto under the hood for the Buffer
 * variant so it runs without external font files. To use your own .ttf,
 * uncomment the `fontPathExample` block and point at real paths.
 */

import { mkdir } from 'fs/promises';
import { join } from 'path';
import { htmlToPdf, type FontDefinition } from '../src';

const OUTPUT_DIR = join(__dirname, 'output');
const OUTPUT_PATH = join(OUTPUT_DIR, 'custom-fonts.pdf');

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Variant 1: Buffer-backed font (works without external assets — loads
  // bundled Roboto from pdfmake's vfs).
  const robotoBuffers = await loadBundledRobotoBuffers();
  const bufferFont: FontDefinition = {
    normal: robotoBuffers.normal,
    bold: robotoBuffers.bold,
    italics: robotoBuffers.italics,
    bolditalics: robotoBuffers.bolditalics,
  };

  const result = await htmlToPdf(
    `<h1>Custom font example</h1>
     <p>This document is rendered with a Buffer-backed font registration.</p>
     <p><strong>Bold</strong>, <em>italic</em>, and <strong><em>combined</em></strong> all wired up.</p>`,
    {
      fonts: { CustomRoboto: bufferFont },
      defaultFont: 'CustomRoboto',
      metadata: { title: 'Custom Fonts Example' },
    },
  );

  await result.saveToFile(OUTPUT_PATH);
  console.log(`Wrote ${OUTPUT_PATH}`);

  // Variant 2 (uncomment to try with your own fonts):
  //
  // const fontPathExample: FontDefinition = {
  //   normal:      'fonts/Inter-Regular.ttf',
  //   bold:        'fonts/Inter-Bold.ttf',
  //   italics:     'fonts/Inter-Italic.ttf',
  //   bolditalics: 'fonts/Inter-BoldItalic.ttf',
  // };
  //
  // const fromPath = await htmlToPdf('<h1>Inter via paths</h1>', {
  //   fonts: { Inter: fontPathExample },
  //   defaultFont: 'Inter',
  // });
  // await fromPath.saveToFile(join(OUTPUT_DIR, 'fonts-from-path.pdf'));
}

async function loadBundledRobotoBuffers(): Promise<{
  normal: Buffer;
  bold: Buffer;
  italics: Buffer;
  bolditalics: Buffer;
}> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vfs = require('pdfmake/build/vfs_fonts.js') as Record<string, string>;
  const decode = (key: string): Buffer => Buffer.from(vfs[key], 'base64');
  return {
    normal: decode('Roboto-Regular.ttf'),
    bold: decode('Roboto-Medium.ttf'),
    italics: decode('Roboto-Italic.ttf'),
    bolditalics: decode('Roboto-MediumItalic.ttf'),
  };
}

main().catch((err) => {
  console.error('Example failed:', err);
  process.exit(1);
});
