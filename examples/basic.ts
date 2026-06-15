/**
 * Basic example — minimum viable usage.
 *
 *   ts-node examples/basic.ts
 *
 * Generates a small PDF, writes it to `examples/output/basic.pdf`, and logs
 * the byte size so you know it worked.
 */

import { mkdir } from 'fs/promises';
import { join } from 'path';
import { htmlToPdf } from '../src';

const OUTPUT_DIR = join(__dirname, 'output');
const OUTPUT_PATH = join(OUTPUT_DIR, 'basic.pdf');

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const result = await htmlToPdf(
    `<h1>Hello from html-pdf-forge</h1>
      <p>This document was generated without a headless browser.</p>
      <ul>
        <li>Single function call</li>
        <li>Sensible defaults</li>
        <li>Multiple output formats</li>
      </ul>`,
    {
      page: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
      },
      metadata: {
        title: 'html-pdf-forge basic example',
        author: 'html-pdf-forge',
        keywords: ['example', 'pdf', 'forge'],
      },
    },
  );

  await result.saveToFile(OUTPUT_PATH);
  const buffer = await result.toBuffer();
  console.log(`Wrote ${OUTPUT_PATH} (${buffer.length} bytes)`);
}

main().catch((err) => {
  console.error('Example failed:', err);
  process.exit(1);
});
