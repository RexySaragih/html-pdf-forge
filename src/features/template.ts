/**
 * HTML template rendering.
 *
 * Wraps Mustache to give callers a handlebars-like API for substituting data
 * into HTML before generation. Returns a `Template` object whose `render`
 * method produces a `PdfResult` — the same shape returned by `htmlToPdf`.
 */

import Mustache from 'mustache';
import type { HtmlPdfOptions, PdfResult } from '../types';
import { TemplateRenderError } from '../utils/errors';
import { htmlToPdf } from '../core/pipeline';

export interface Template {
  /** Render the template with the given data, returning a PdfResult. */
  render(data: Record<string, unknown> | Promise<Record<string, unknown>>): Promise<PdfResult>;
  /** Run substitution only and return the rendered HTML string. */
  toHtml(data: Record<string, unknown>): string;
}

export interface TemplateOptions extends HtmlPdfOptions {
  /** Mustache delimiters. Default: `['{{', '}}']`. */
  delimiters?: [string, string];
}

/**
 * Creates a reusable HTML template. The compiled template is parsed once
 * (Mustache caches internally) and can be rendered multiple times with
 * different data payloads.
 */
export function createTemplate(html: string, options?: TemplateOptions): Template {
  // Trigger early parsing so syntax errors surface during construction
  // rather than at render time.
  try {
    Mustache.parse(html, options?.delimiters);
  } catch (err) {
    throw new TemplateRenderError('Invalid template syntax', err);
  }

  const { delimiters: _delimiters, ...pdfOptions } = options ?? {};

  return {
    toHtml(data: Record<string, unknown>): string {
      try {
        return Mustache.render(html, data);
      } catch (err) {
        throw new TemplateRenderError('Failed to render template', err);
      }
    },
    async render(data): Promise<PdfResult> {
      const resolved = await Promise.resolve(data);
      const renderedHtml = this.toHtml(resolved);
      return htmlToPdf(renderedHtml, pdfOptions);
    },
  };
}
