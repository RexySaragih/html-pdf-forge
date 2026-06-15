/**
 * Public types for html-pdf-forge.
 *
 * All consumer-facing options, results, and helper signatures live here so the
 * package surface stays small and discoverable.
 */

/** Standard paper sizes accepted by pdfmake plus a custom [width, height] tuple. */
export type PageSize =
  | 'A0'
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'LETTER'
  | 'LEGAL'
  | 'TABLOID'
  | 'EXECUTIVE'
  | [number, number];

export type Orientation = 'portrait' | 'landscape';

export type OutputType = 'buffer' | 'stream' | 'base64' | 'blob';

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PageOptions {
  size?: PageSize;
  orientation?: Orientation;
  margins?: Partial<Margins>;
}

/**
 * A font definition. Each variant accepts either a file path (string) or a
 * Buffer for in-memory fonts (e.g. from S3, an HTTP fetch, or a DB).
 */
export interface FontDefinition {
  normal: string | Buffer;
  bold?: string | Buffer;
  italics?: string | Buffer;
  bolditalics?: string | Buffer;
}

export type HeaderFooterFn = (
  currentPage: number,
  pageCount: number,
) => string | null | undefined;

export type HeaderFooterInput = string | HeaderFooterFn;

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[] | string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
}

/** Map of HTML tag names to pdfmake style objects. */
export interface StyleMap {
  [htmlTag: string]: Record<string, unknown>;
}

export type PageNumberPlacement = 'header' | 'footer' | 'none';

export interface PageNumberOptions {
  /** Where to place the page number. Default: 'none'. */
  placement?: PageNumberPlacement;
  /** Format string. Supports {current} and {total}. Default: 'Page {current} of {total}'. */
  format?: string;
  /** Inline pdfmake style overrides for the rendered page number. */
  style?: Record<string, unknown>;
}

/**
 * Options accepted by `htmlToPdf` and `HtmlPdfForge.generate`.
 * Every field is optional. Sensible defaults are applied for omitted fields.
 */
export interface HtmlPdfOptions {
  /** Default output target. Each PdfResult method ignores this; it only sets the default for ambiguous APIs. */
  output?: OutputType;
  page?: PageOptions;
  styles?: StyleMap;
  /** When true, drops the html-to-pdfmake default style map and uses only `styles`. */
  resetStyles?: boolean;
  fonts?: Record<string, FontDefinition>;
  defaultFont?: string;
  header?: HeaderFooterInput;
  footer?: HeaderFooterInput;
  pageNumber?: PageNumberOptions;
  metadata?: PdfMetadata;
  /** Extra options passed straight through to html-to-pdfmake. */
  converterOptions?: Record<string, unknown>;
}

/**
 * Final output object returned from every conversion. Lazy by design — the
 * underlying pdfmake document only flushes to bytes when one of these methods
 * is invoked.
 */
export interface PdfResult {
  toBuffer(): Promise<Buffer>;
  toStream(): NodeJS.ReadableStream;
  toBase64(): Promise<string>;
  toBlob(): Promise<Blob>;
  saveToFile(filePath: string): Promise<void>;
}
