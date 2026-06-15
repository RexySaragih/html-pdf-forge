/**
 * Custom error classes for html-pdf-forge.
 *
 * All errors extend `HtmlPdfForgeError` so callers can reliably distinguish
 * package errors from generic `Error` instances.
 */

export class HtmlPdfForgeError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'HtmlPdfForgeError';
  }
}

export class HtmlConversionError extends HtmlPdfForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'HtmlConversionError';
  }
}

export class PdfGenerationError extends HtmlPdfForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'PdfGenerationError';
  }
}

export class FontLoadError extends HtmlPdfForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'FontLoadError';
  }
}

export class ImageProcessingError extends HtmlPdfForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ImageProcessingError';
  }
}

export class TemplateRenderError extends HtmlPdfForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'TemplateRenderError';
  }
}

export class PdfMergeError extends HtmlPdfForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'PdfMergeError';
  }
}

export class PdfSplitError extends HtmlPdfForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'PdfSplitError';
  }
}

export class BarcodeRenderError extends HtmlPdfForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'BarcodeRenderError';
  }
}

export class QrCodeRenderError extends HtmlPdfForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'QrCodeRenderError';
  }
}
