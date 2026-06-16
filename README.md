# html-pdf-forge

Generate PDFs from HTML with a clean TypeScript API. No headless browser, no native bindings, deterministic output.

📖 **Documentation & Playground**: [html-pdf-forge.rexy-jms.dev](https://html-pdf-forge.rexy-jms.dev/)

A thin wrapper over [`html-to-pdfmake`](https://github.com/Aymkdn/html-to-pdfmake) and [`pdfmake`](https://github.com/bpampuch/pdfmake) that collapses the two-step pipeline into a single, ergonomic call. Adds first-class support for templates, headers/footers, page numbering, watermarks, merge/split, password protection, QR codes, and barcodes.

```ts
import { htmlToPdf } from 'html-pdf-forge';

const pdf = await htmlToPdf('<h1>Hello</h1><p>From html-pdf-forge.</p>');
await pdf.saveToFile('./hello.pdf');
```

## Why

|                    | html-pdf-forge  | Raw pdfmake       | Puppeteer                 |
| ------------------ | --------------- | ----------------- | ------------------------- |
| Headless browser   | No              | No                | Yes (Chromium)            |
| Native build deps  | No              | No                | No                        |
| Install footprint  | ~106 MB         | ~80 MB            | ~300 MB                   |
| API surface        | Single function | Multi-step wiring | Browser context           |
| Output determinism | Yes             | Yes               | Browser-version dependent |

Use html-pdf-forge when you need fast, reproducible PDFs from straightforward HTML and want to avoid Chromium's footprint. Use Puppeteer/Playwright when you need pixel-perfect rendering of complex CSS (flexbox, grid, web fonts via `@font-face` URL, etc.).

## Install

```sh
npm install html-pdf-forge
```

Requires Node.js 18 or newer.

### Optional dependencies

QR code and barcode features require additional packages. Install them only if you need them:

```sh
# For <pdf-qr> elements
npm install qrcode

# For <pdf-barcode> elements
npm install bwip-js
```

## Quickstart

```ts
import { htmlToPdf } from 'html-pdf-forge';

const pdf = await htmlToPdf('<h1>Q4 Report</h1>', {
  page: {
    size: 'A4',
    orientation: 'portrait',
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
  },
  metadata: {
    title: 'Q4 Report',
    author: 'Jane Doe',
    keywords: ['finance', 'Q4'],
  },
  header: '<div style="text-align:right">Q4 Report</div>',
  pageNumber: { placement: 'footer', format: 'Page {current} of {total}' },
});

await pdf.saveToFile('./q4-report.pdf');
```

The `PdfResult` returned from `htmlToPdf` exposes:

```ts
await result.toBuffer(); // Node.js Buffer
result.toStream(); // ReadableStream (for piping)
await result.toBase64(); // base64 string
await result.toBlob(); // Blob (browser / Node 18+)
await result.saveToFile(path); // write to disk
```

## Core API

### `htmlToPdf(html, options?)`

The primary entry point. All options are optional.

| Option              | Type                                                           | Notes                                |
| ------------------- | -------------------------------------------------------------- | ------------------------------------ |
| `page.size`         | `'A4'` \| `'LETTER'` \| `'LEGAL'` \| `[width, height]` \| etc. | Default: `'A4'`                      |
| `page.orientation`  | `'portrait'` \| `'landscape'`                                  | Default: `'portrait'`                |
| `page.margins`      | `{ top, right, bottom, left }`                                 | All optional, default 40pt each      |
| `styles`            | `Record<tag, pdfmake style>`                                   | Merged with sensible defaults        |
| `resetStyles`       | `boolean`                                                      | Drops defaults entirely              |
| `fonts`             | `Record<name, FontDefinition>`                                 | Paths or Buffers                     |
| `defaultFont`       | `string`                                                       | Defaults to bundled Roboto           |
| `header` / `footer` | `string \| (page, total) => string`                            | Either static or per-page            |
| `pageNumber`        | `{ placement, format, style }`                                 | `'header'` \| `'footer'` \| `'none'` |
| `metadata`          | `{ title, author, subject, keywords, creator, ... }`           | Embedded in PDF info                 |
| `watermark`         | `string \| WatermarkOptions`                                   | Diagonal text watermark              |
| `protect`           | `{ userPassword, ownerPassword, permissions }`                 | Password protection                  |
| `converterOptions`  | `Record<string, unknown>`                                      | Pass-through to `html-to-pdfmake`    |

### `HtmlPdfForge`

Stateful variant for batch generation with shared defaults:

```ts
import { HtmlPdfForge } from 'html-pdf-forge';

const forge = new HtmlPdfForge({
  page: { size: 'A4' },
  metadata: { author: 'Reporting Service' },
  fonts: {
    Inter: {
      normal: './fonts/Inter-Regular.ttf',
      bold: './fonts/Inter-Bold.ttf',
    },
  },
  defaultFont: 'Inter',
});

const a = await forge.generate('<h1>Doc 1</h1>');
const b = await forge.generate('<h1>Doc 2</h1>', {
  metadata: { title: 'Custom Title' },
});
```

Per-call overrides win on conflicts; nested objects are deep-merged.

### `createTemplate(html, options?)`

Mustache-backed template:

```ts
import { createTemplate } from 'html-pdf-forge';

const invoice = createTemplate(`
  <h1>Invoice #{{number}}</h1>
  <p>Bill to: <strong>{{customer}}</strong></p>
  <table>
    {{#items}}
    <tr><td>{{description}}</td><td>{{amount}}</td></tr>
    {{/items}}
  </table>
`);

const pdf = await invoice.render({
  number: 'INV-0042',
  customer: 'Acme Corp',
  items: [
    { description: 'Consulting', amount: '$500' },
    { description: 'Design', amount: '$300' },
  ],
});
```

`render()` accepts a `Promise<data>` too — useful when data comes from an async source.

## More features

### Watermarks

```ts
await htmlToPdf(html, { watermark: 'CONFIDENTIAL' });

await htmlToPdf(html, {
  watermark: { text: 'DRAFT', color: 'red', opacity: 0.15, angle: -30 },
});
```

### Page-level passwords and permissions

```ts
await htmlToPdf(html, {
  protect: {
    userPassword: 'open123',
    ownerPassword: 'admin456',
    permissions: {
      printing: 'highResolution',
      copying: false,
      modifying: false,
    },
  },
});
```

Encryption is delegated to PDFKit (which `pdfmake` uses underneath), so no extra dependency is required.

### Merge

```ts
import { mergePdfs } from 'html-pdf-forge/merge';

const merged = await mergePdfs([pdf1, await pdf2.toBuffer(), './third.pdf'], {
  metadata: { title: 'Combined Bundle' },
});
await merged.saveToFile('./bundle.pdf');
```

Accepts `Buffer`, `Uint8Array`, file paths, or any `PdfResult` interchangeably.

### Split

```ts
import { splitPdf } from 'html-pdf-forge/split';

const parts = await splitPdf(buffer, [
  [1, 3],
  [4, 6],
]);
await parts[0].saveToFile('./first.pdf');
await parts[1].saveToFile('./second.pdf');
```

Ranges are 1-indexed and inclusive. Out-of-range or reversed ranges throw `PdfSplitError`.

### QR codes

> **Requires**: `npm install qrcode`

Drop a `<pdf-qr>` element into your HTML — the pipeline auto-renders it to an embedded image.

```html
<pdf-qr value="https://example.com/abc-123" size="120" margin="1" ec="M" />
```

| Attribute | Default  | Notes                                      |
| --------- | -------- | ------------------------------------------ |
| `value`   | required | Text or URL to encode                      |
| `size`    | `120`    | Pixel size                                 |
| `margin`  | `1`      | Quiet-zone modules                         |
| `ec`      | `M`      | Error correction: `L` \| `M` \| `Q` \| `H` |

### Barcodes

> **Requires**: `npm install bwip-js`

```html
<pdf-barcode type="code128" value="ABC-12345" width="220" height="70" />
```

| Attribute           | Default  | Notes                                                                                                   |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `type` (or `bcid`)  | required | Any [bwip-js symbology](http://bwipp.terryburton.co.uk/) (`code128`, `ean13`, `code39`, `qrcode`, etc.) |
| `value` (or `text`) | required | Payload                                                                                                 |
| `width`             | `200`    | Output width in pixels                                                                                  |
| `height`            | `60`     | Output height in pixels                                                                                 |
| `scale`             | `3`      | bwip-js scale factor                                                                                    |
| `includetext`       | `true`   | Render human-readable text below the barcode                                                            |

## Subpath imports

Heavy features are available as separate entry points so you can import only what you need:

```ts
import { htmlToPdf } from 'html-pdf-forge'; // Core PDF generation
import { mergePdfs } from 'html-pdf-forge/merge'; // PDF merging
import { splitPdf } from 'html-pdf-forge/split'; // PDF splitting
import { inlineQrCodes } from 'html-pdf-forge/qr'; // QR preprocessing
import { inlineBarcodes } from 'html-pdf-forge/barcode'; // Barcode preprocessing
```

## Font loading

By default, the library uses pdfmake's bundled Roboto font. To avoid loading the ~3MB VFS font data, specify a built-in web font:

```ts
const pdf = await htmlToPdf(html, { defaultFont: 'Helvetica' });
```

Built-in web fonts (fetched from CDN on first use, cached in memory):

- `Helvetica` — uses Arimo (metrically identical to Helvetica/Arial)
- `Inter` — modern sans-serif

The bundled Roboto VFS is only loaded as a fallback when no `defaultFont` or custom `fonts` are provided.

## Migration from raw `html-to-pdfmake` + `pdfmake`

### Before

```ts
import htmlToPdfmake from 'html-to-pdfmake';
import PdfPrinter from 'pdfmake';
import { JSDOM } from 'jsdom';

const fonts = {
  Roboto: { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf' },
};
const printer = new PdfPrinter(fonts);
const window = new JSDOM('').window;

const content = htmlToPdfmake('<h1>Hello</h1>', { window });
const doc = printer.createPdfKitDocument({
  content,
  pageSize: 'A4',
  info: { title: 'Hello' },
});

const chunks = [];
doc.on('data', (c) => chunks.push(c));
doc.on('end', () => {
  const buffer = Buffer.concat(chunks);
  // ... write to disk ...
});
doc.end();
```

### After

```ts
import { htmlToPdf } from 'html-pdf-forge';

const pdf = await htmlToPdf('<h1>Hello</h1>', { metadata: { title: 'Hello' } });
await pdf.saveToFile('./hello.pdf');
```

The wrapper preserves access to `html-to-pdfmake`'s lower-level options via `converterOptions`, so anything you can do with the raw library you can still do here.

## Examples

Runnable examples live in [`examples/`](./examples/):

- [`basic.ts`](./examples/basic.ts) — minimum viable usage
- [`templates.ts`](./examples/templates.ts) — invoice rendering with iteration
- [`custom-fonts.ts`](./examples/custom-fonts.ts) — Buffer-backed and file-path fonts

## Development

```sh
npm install
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run lint:fix     # eslint . --fix
npm run format       # prettier --write .
npm run format:check # prettier --check .
npm test             # vitest run
npm run build        # tsc -p tsconfig.build.json
```

Releases are managed with [Changesets](https://github.com/changesets/changesets):

```sh
npm run changeset            # record an intended bump
npm run changeset:version    # apply queued changesets, bump version, write CHANGELOG
npm run changeset:publish    # build + publish to npm
```

CI runs lint, format check, typecheck, tests, and build on every push and PR (Node 18 / 20 / 22).

## CSS support

`html-to-pdfmake` supports a curated subset of CSS. Use this library when:

- Your HTML is mostly text, headings, lists, tables, and images
- You want deterministic output across machines and Node versions
- You need fast cold starts (Lambda, containers)

Reach for Puppeteer or Playwright when:

- You need flexbox, grid, or absolute positioning
- You rely on web fonts loaded via `@font-face`
- You need full CSS specificity (transforms, gradients, complex pseudo-elements)

## Errors

All errors thrown by html-pdf-forge extend `HtmlPdfForgeError`. Specific subclasses:

| Error                                      | Thrown when                                   |
| ------------------------------------------ | --------------------------------------------- |
| `HtmlConversionError`                      | The HTML can't be parsed by `html-to-pdfmake` |
| `PdfGenerationError`                       | The pdfmake printer fails to emit bytes       |
| `FontLoadError`                            | A font file can't be read or decoded          |
| `ImageProcessingError`                     | An image fetch or read fails                  |
| `TemplateRenderError`                      | A Mustache template is malformed              |
| `PdfMergeError` / `PdfSplitError`          | Invalid input for merge/split                 |
| `QrCodeRenderError` / `BarcodeRenderError` | Custom-element rendering fails                |

## Project status

| Area                     | Status                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Version                  | 1.4.2                                                                                     |
| Core API and feature set | Stable                                                                                    |
| Test suite               | 41 behavioral tests, vitest                                                               |
| Code quality             | ESLint (flat config) + Prettier, enforced in CI                                           |
| Documentation            | [html-pdf-forge.rexy-jms.dev](https://html-pdf-forge.rexy-jms.dev/) + this README + JSDoc |

## License

MIT
