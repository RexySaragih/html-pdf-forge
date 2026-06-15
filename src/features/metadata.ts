/**
 * PDF metadata.
 *
 * Maps the user-friendly `metadata` option onto pdfmake's `info` object,
 * which is what gets embedded in the resulting PDF's document properties.
 */

import type { TDocumentInformation } from 'pdfmake/interfaces';
import type { PdfMetadata } from '../types';

const KEYWORDS_SEPARATOR = ' ';

function normalizeKeywords(keywords: PdfMetadata['keywords']): string | undefined {
  if (keywords === undefined) return undefined;
  if (typeof keywords === 'string') return keywords;
  return keywords.join(KEYWORDS_SEPARATOR);
}

/**
 * Builds pdfmake's `info` block from the high-level `metadata` input.
 * Always includes a `creationDate` (defaulted to now) so the PDF's metadata
 * panel has consistent fields.
 */
export function buildPdfInfo(metadata: PdfMetadata | undefined): TDocumentInformation {
  const info: TDocumentInformation = {};

  if (metadata?.title !== undefined) info.title = metadata.title;
  if (metadata?.author !== undefined) info.author = metadata.author;
  if (metadata?.subject !== undefined) info.subject = metadata.subject;
  if (metadata?.creator !== undefined) info.creator = metadata.creator;
  if (metadata?.producer !== undefined) info.producer = metadata.producer;

  const keywords = normalizeKeywords(metadata?.keywords);
  if (keywords !== undefined) info.keywords = keywords;

  info.creationDate = metadata?.creationDate ?? new Date();
  return info;
}
