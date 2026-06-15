/**
 * HTML → pdfmake content conversion.
 *
 * Thin wrapper around `html-to-pdfmake`. Owns the JSDOM window injection and
 * provides a single entry point used by the pipeline, the header/footer
 * renderer, and any future feature that needs to convert an HTML fragment.
 */

import htmlToPdfmake from 'html-to-pdfmake';
import { getJsdomWindow } from '../utils/jsdom';
import { HtmlConversionError } from '../utils/errors';

export interface ConverterOptions {
  /** User-defined style overrides keyed by HTML tag. */
  defaultStyles?: Record<string, unknown>;
  /** When true, drops html-to-pdfmake's bundled defaults. */
  removeExtraBlanks?: boolean;
  /** Anything else passed straight through to html-to-pdfmake. */
  [key: string]: unknown;
}

/**
 * Converts an HTML string into a pdfmake content array. Returns `unknown`
 * because pdfmake's `Content` type is a union that's noisy to thread through
 * the entire pipeline; consumers cast at the doc-definition boundary.
 */
export function convertHtmlToPdfmake(html: string, options: ConverterOptions = {}): unknown {
  try {
    const window = getJsdomWindow();
    return htmlToPdfmake(html, {
      window: window as unknown as Window,
      ...options,
    });
  } catch (err) {
    throw new HtmlConversionError('Failed to convert HTML to pdfmake content', err);
  }
}
