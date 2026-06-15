/**
 * Page numbering helpers.
 *
 * Provides a small DSL for pagination strings — `'Page {current} of {total}'`
 * — and converts it into a `HeaderFooterFn` that the pipeline can wire into
 * pdfmake's `header` / `footer` document keys.
 */

import type { HeaderFooterFn, PageNumberOptions } from '../types';

const DEFAULT_FORMAT = 'Page {current} of {total}';
const CURRENT_TOKEN = '{current}';
const TOTAL_TOKEN = '{total}';

/**
 * Builds a function that renders a page-number HTML snippet using the given
 * format. The `style` option applies inline CSS so it survives the html → pdf
 * conversion. Returns `null` when `placement` is `'none'` so callers can skip
 * the wiring entirely.
 */
export function pageNumberRenderer(options: PageNumberOptions | undefined): HeaderFooterFn | null {
  if (!options || options.placement === undefined || options.placement === 'none') {
    return null;
  }

  const format = options.format ?? DEFAULT_FORMAT;
  const inlineStyle = buildInlineStyle(options.style);

  return (currentPage: number, pageCount: number) => {
    const text = format.replace(CURRENT_TOKEN, String(currentPage)).replace(TOTAL_TOKEN, String(pageCount));
    return `<div style="${inlineStyle}">${text}</div>`;
  };
}

function buildInlineStyle(style: Record<string, unknown> | undefined): string {
  const base = 'text-align:right;font-size:9pt;';
  if (!style) return base;

  const css = Object.entries(style)
    .map(([key, value]) => `${camelToKebab(key)}:${String(value)};`)
    .join('');
  return `${base}${css}`;
}

function camelToKebab(input: string): string {
  return input.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}
