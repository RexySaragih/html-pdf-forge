/**
 * The full HTML → PDF pipeline.
 *
 * Orchestrates every feature module: image inlining, font loading, header /
 * footer wiring, page numbering, styling, metadata, conversion, generation.
 * The flow mirrors the diagram in the project plan.
 */

import type {
  Content,
  PageOrientation,
  PageSize as PdfmakePageSize,
  TDocumentDefinitions,
  TFontDictionary,
} from 'pdfmake/interfaces';
import type { HtmlPdfOptions, Margins, PageOptions, PdfResult } from '../types';
import { convertHtmlToPdfmake } from './converter';
import { buildPdfResult } from './generator';
import { inlineImages } from '../features/images';
import { buildFontDictionary } from '../features/fonts';
import { resolveStyles } from '../features/styling';
import { buildPdfInfo } from '../features/metadata';
import { buildHeaderFooter } from '../features/header-footer';
import { pageNumberRenderer } from '../features/pagination';
import { buildWatermark } from '../features/watermark';
import { buildProtection } from '../features/protect';
import { inlineQrCodes } from '../features/qr';
import { inlineBarcodes } from '../features/barcode';

const DEFAULT_MARGINS: Margins = { top: 40, right: 40, bottom: 40, left: 40 };
const DEFAULT_PAGE_SIZE = 'A4';
const DEFAULT_ORIENTATION: PageOrientation = 'portrait';

/**
 * Runs an HTML document through the full pipeline and returns a `PdfResult`.
 * This is the primary public entry point — `htmlToPdf` and the
 * `HtmlPdfForge.generate` method both delegate here.
 */
export async function htmlToPdf(html: string, options: HtmlPdfOptions = {}): Promise<PdfResult> {
  const docDefinition = await buildDocDefinition(html, options);
  const { fonts } = await resolveFonts(options);
  return buildPdfResult({ docDefinition, fonts });
}

/**
 * Exposed so `HtmlPdfForge` (and future batch APIs) can build doc definitions
 * without paying for a full PdfResult round-trip up front.
 */
export async function buildDocDefinition(
  html: string,
  options: HtmlPdfOptions,
): Promise<TDocumentDefinitions> {
  // Custom HTML elements (QR, barcode) run first — they emit standard <img>
  // tags that the image inliner then handles uniformly.
  const withQr = await inlineQrCodes(html);
  const withBarcodes = await inlineBarcodes(withQr);
  const inlined = await inlineImages(withBarcodes);
  const styles = resolveStyles(options.styles, options.resetStyles ?? false);

  const content = convertHtmlToPdfmake(inlined, {
    defaultStyles: styles,
    ...(options.converterOptions ?? {}),
  }) as Content;

  const { defaultFont } = await resolveFonts(options);
  const page = options.page ?? {};
  const pageNumberFn = pageNumberRenderer(options.pageNumber);

  const docDefinition: TDocumentDefinitions = {
    content,
    pageSize: mapPageSize(page),
    pageOrientation: page.orientation ?? DEFAULT_ORIENTATION,
    pageMargins: mapMargins(page.margins),
    info: buildPdfInfo(options.metadata),
    defaultStyle: { font: defaultFont },
  };

  const watermark = buildWatermark(options.watermark);
  if (watermark) docDefinition.watermark = watermark;

  // Password protection passes through pdfmake into PDFKit. The pdfmake
  // typings don't include these keys so we attach them via a typed view.
  const protection = buildProtection(options.protect);
  if (protection) {
    Object.assign(docDefinition as unknown as Record<string, unknown>, protection);
  }

  const headerFn = buildHeaderFooter(
    options.header,
    options.pageNumber?.placement === 'header' ? pageNumberFn : null,
  );
  if (headerFn) docDefinition.header = headerFn;

  const footerFn = buildHeaderFooter(
    options.footer,
    options.pageNumber?.placement === 'footer' ? pageNumberFn : null,
  );
  if (footerFn) docDefinition.footer = footerFn;

  return docDefinition;
}

interface ResolvedFontResult {
  fonts: TFontDictionary;
  defaultFont: string;
}

let cachedDefaultFonts: Promise<ResolvedFontResult> | null = null;

async function resolveFonts(options: HtmlPdfOptions): Promise<ResolvedFontResult> {
  // The default Roboto VFS load is expensive; cache when no custom fonts.
  if (!options.fonts) {
    if (!cachedDefaultFonts) {
      cachedDefaultFonts = buildFontDictionary(undefined, options.defaultFont);
    }
    return cachedDefaultFonts;
  }
  return buildFontDictionary(options.fonts, options.defaultFont);
}

function mapPageSize(page: PageOptions): PdfmakePageSize {
  const size = page.size ?? DEFAULT_PAGE_SIZE;
  if (Array.isArray(size)) {
    const [width, height] = size;
    return { width, height };
  }
  return size as PdfmakePageSize;
}

function mapMargins(margins: Partial<Margins> | undefined): [number, number, number, number] {
  const merged = { ...DEFAULT_MARGINS, ...(margins ?? {}) };
  return [merged.left, merged.top, merged.right, merged.bottom];
}
