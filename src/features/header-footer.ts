/**
 * Header and footer rendering.
 *
 * pdfmake expects `header`/`footer` document keys to be functions returning a
 * pdfmake content node. The user-facing API accepts an HTML string or a
 * function returning HTML; this module bridges the two by running each
 * snippet through `html-to-pdfmake` at page-render time.
 */

import type { Content } from 'pdfmake/interfaces';
import type { HeaderFooterFn, HeaderFooterInput } from '../types';
import { convertHtmlToPdfmake } from '../core/converter';

type PdfmakeHeaderFooter = (currentPage: number, pageCount: number) => Content;

function asFunction(input: HeaderFooterInput): HeaderFooterFn {
  if (typeof input === 'function') {
    return input;
  }
  return () => input;
}

/**
 * Wraps a user-provided header/footer (string or function) into the function
 * shape pdfmake expects. The returned function is safe to call once per page;
 * it never returns null/undefined — empty content collapses to an empty
 * pdfmake text node so pdfmake doesn't choke.
 */
export function buildHeaderFooter(
  primary: HeaderFooterInput | undefined,
  fallback: HeaderFooterFn | null,
): PdfmakeHeaderFooter | undefined {
  if (primary === undefined && !fallback) {
    return undefined;
  }

  const primaryFn = primary !== undefined ? asFunction(primary) : null;

  return (currentPage: number, pageCount: number): Content => {
    const html = primaryFn?.(currentPage, pageCount) ?? fallback?.(currentPage, pageCount);
    if (!html) {
      return { text: '' };
    }
    return convertHtmlToPdfmake(html) as Content;
  };
}
