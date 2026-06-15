/**
 * html-pdf-forge — public API barrel.
 *
 * Importing from `'html-pdf-forge'` gives you the HTML → PDF pipeline,
 * templates, and the stateful `HtmlPdfForge` class. Heavy optional features
 * live behind subpath imports so they don't add to your bundle / runtime
 * memory unless you actually use them:
 *
 *   import { mergePdfs } from 'html-pdf-forge/merge';
 *   import { splitPdf } from 'html-pdf-forge/split';
 *
 * QR code (`<pdf-qr>`) and barcode (`<pdf-barcode>`) support is built into
 * the main pipeline but lazy-loaded — the `qrcode` and `bwip-js` packages
 * are only required when the input HTML actually contains those custom
 * elements. Plain HTML never pays for them.
 */

export { htmlToPdf } from './core/pipeline';
export { HtmlPdfForge } from './forge';
export { createTemplate } from './features/template';

export type { Template, TemplateOptions } from './features/template';

export type {
  PdfResult,
  HtmlPdfOptions,
  PageOptions,
  PageSize,
  Orientation,
  OutputType,
  Margins,
  FontDefinition,
  HeaderFooterFn,
  HeaderFooterInput,
  PdfMetadata,
  StyleMap,
  PageNumberOptions,
  PageNumberPlacement,
  WatermarkInput,
  WatermarkOptions,
  ProtectOptions,
  PdfPermissions,
} from './types';

// Error classes are pure JS (no heavy deps), so re-exporting them here is
// free. Importing them from `'html-pdf-forge'` does NOT pull in pdf-lib,
// qrcode, or bwip-js.
export {
  HtmlPdfForgeError,
  HtmlConversionError,
  PdfGenerationError,
  FontLoadError,
  ImageProcessingError,
  TemplateRenderError,
  PdfMergeError,
  PdfSplitError,
  BarcodeRenderError,
  QrCodeRenderError,
} from './utils/errors';
