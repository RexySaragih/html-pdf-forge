/**
 * Stateful forge for batch PDF generation.
 *
 * Holds shared options (fonts, default styles, metadata template) so the
 * caller doesn't have to re-pass them for every document.
 */

import type { HtmlPdfOptions, PdfResult } from './types';
import { htmlToPdf } from './core/pipeline';

/** Deep-merges `overrides` onto `base`, with overrides winning per key. */
function mergeOptions(base: HtmlPdfOptions, overrides: HtmlPdfOptions = {}): HtmlPdfOptions {
  return {
    ...base,
    ...overrides,
    page: { ...(base.page ?? {}), ...(overrides.page ?? {}) },
    styles: { ...(base.styles ?? {}), ...(overrides.styles ?? {}) },
    fonts: { ...(base.fonts ?? {}), ...(overrides.fonts ?? {}) },
    metadata: { ...(base.metadata ?? {}), ...(overrides.metadata ?? {}) },
    pageNumber: { ...(base.pageNumber ?? {}), ...(overrides.pageNumber ?? {}) },
    converterOptions: { ...(base.converterOptions ?? {}), ...(overrides.converterOptions ?? {}) },
  };
}

export class HtmlPdfForge {
  constructor(private readonly defaults: HtmlPdfOptions = {}) {}

  /**
   * Generates a PDF using the forge's defaults overlaid with any per-call
   * overrides. Per-call overrides win on conflict, including nested objects
   * like `page` and `metadata`.
   */
  async generate(html: string, overrides?: HtmlPdfOptions): Promise<PdfResult> {
    const merged = mergeOptions(this.defaults, overrides);
    return htmlToPdf(html, merged);
  }
}
