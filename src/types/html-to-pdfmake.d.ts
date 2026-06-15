/**
 * Ambient module declaration for `html-to-pdfmake`.
 *
 * The upstream package ships untyped, so we describe just enough of its
 * surface to satisfy strict TypeScript without forcing consumers of
 * html-pdf-forge to install `@types` packages they don't need.
 */

declare module 'html-to-pdfmake' {
  export interface HtmlToPdfmakeOptions {
    window?: Window;
    defaultStyles?: Record<string, unknown>;
    removeExtraBlanks?: boolean;
    showHidden?: boolean;
    imagesByReference?: boolean;
    tableAutoSize?: boolean;
    [key: string]: unknown;
  }

  function htmlToPdfmake(html: string, options?: HtmlToPdfmakeOptions): unknown;

  export default htmlToPdfmake;
}
