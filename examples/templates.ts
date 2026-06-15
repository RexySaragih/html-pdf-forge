/**
 * Template example — render an invoice from data.
 *
 *   ts-node examples/templates.ts
 *
 * Demonstrates Mustache-backed templating with field substitution and
 * iteration over a list of line items.
 */

import { mkdir } from 'fs/promises';
import { join } from 'path';
import { createTemplate } from '../src';

const OUTPUT_DIR = join(__dirname, 'output');
const OUTPUT_PATH = join(OUTPUT_DIR, 'invoice.pdf');

const INVOICE_TEMPLATE = `
  <h1>Invoice #{{invoiceNumber}}</h1>
  <p>Issued: {{issueDate}}</p>
  <p>Bill to: <strong>{{customerName}}</strong></p>

  <h3>Line items</h3>
  <table>
    <thead>
      <tr><th>Description</th><th>Qty</th><th>Amount</th></tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{amount}}</td>
      </tr>
      {{/items}}
    </tbody>
  </table>

  <p><strong>Total: {{total}}</strong></p>
`;

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const invoice = createTemplate(INVOICE_TEMPLATE, {
    metadata: { title: 'Invoice', author: 'html-pdf-forge' },
    page: { size: 'A4', margins: { top: 50, right: 50, bottom: 50, left: 50 } },
  });

  const result = await invoice.render({
    invoiceNumber: 'INV-0042',
    issueDate: '2026-06-15',
    customerName: 'Acme Corp',
    items: [
      { description: 'Consulting', quantity: 10, amount: '$1,000' },
      { description: 'Design review', quantity: 1, amount: '$500' },
      { description: 'Implementation', quantity: 1, amount: '$2,500' },
    ],
    total: '$4,000',
  });

  await result.saveToFile(OUTPUT_PATH);
  const buffer = await result.toBuffer();
  console.log(`Wrote ${OUTPUT_PATH} (${buffer.length} bytes)`);
}

main().catch((err) => {
  console.error('Example failed:', err);
  process.exit(1);
});
