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
} from './types';

export {
  HtmlPdfForgeError,
  HtmlConversionError,
  PdfGenerationError,
  FontLoadError,
  ImageProcessingError,
  TemplateRenderError,
} from './utils/errors';
