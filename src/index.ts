/**
 * html-pdf-forge — public API barrel.
 *
 * The main entry point for the package. Anything that's not exported from
 * here is considered an internal implementation detail and may change without
 * a major version bump.
 */

export { htmlToPdf } from './core/pipeline';
export { HtmlPdfForge } from './forge';
export { createTemplate } from './features/template';

// Phase 2 surface — also re-exported here for convenience. Subpath imports
// (`html-pdf-forge/merge`, `html-pdf-forge/split`) are the canonical entry
// points for tree-shaking-sensitive consumers.
export { mergePdfs } from './merge';
export type { MergeInput, MergeOptions } from './merge';
export { splitPdf } from './split';
export type { SplitInput, PageRange } from './split';

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
