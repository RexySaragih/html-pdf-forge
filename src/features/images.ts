/**
 * Image preprocessing.
 *
 * `html-to-pdfmake` wants images embedded as `data:` URIs. This module scans
 * the input HTML for `<img>` tags, fetches/reads each `src`, base64-encodes
 * the bytes, and rewrites the HTML in place. All fetches run concurrently.
 */

import { promises as fs } from 'fs';
import { extname } from 'path';
import { getJsdomWindow } from '../utils/jsdom';
import { ImageProcessingError } from '../utils/errors';

const DATA_URI_PREFIX = 'data:';
const HTTP_PROTOCOL_REGEX = /^https?:\/\//i;

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
};

function inferMimeFromSrc(src: string): string {
  const ext = extname(src.split('?')[0]).toLowerCase();
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

function inferMimeFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const trimmed = contentType.split(';')[0].trim();
  return trimmed || null;
}

async function fetchRemoteAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ImageProcessingError(
      `Failed to fetch image '${url}': ${response.status} ${response.statusText}`,
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mime = inferMimeFromContentType(response.headers.get('content-type')) ?? inferMimeFromSrc(url);
  return `${DATA_URI_PREFIX}${mime};base64,${buffer.toString('base64')}`;
}

async function readLocalAsBase64(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    const mime = inferMimeFromSrc(filePath);
    return `${DATA_URI_PREFIX}${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    throw new ImageProcessingError(`Failed to read image '${filePath}'`, err);
  }
}

/**
 * Resolves a single `src` value to a `data:` URI. Already-encoded data URIs
 * are passed through untouched.
 */
export async function resolveImageSrc(src: string): Promise<string> {
  if (src.startsWith(DATA_URI_PREFIX)) {
    return src;
  }
  if (HTTP_PROTOCOL_REGEX.test(src)) {
    return fetchRemoteAsBase64(src);
  }
  return readLocalAsBase64(src);
}

/**
 * Walks every `<img>` in `html`, replaces `src` with a base64 data URI, and
 * returns the rewritten HTML. Failed images become an `ImageProcessingError`
 * — we don't silently drop them because that would surprise the caller.
 */
export async function inlineImages(html: string): Promise<string> {
  const window = getJsdomWindow();
  const doc = window.document.implementation.createHTMLDocument('');
  doc.body.innerHTML = html;

  const imgs = Array.from(doc.querySelectorAll('img'));
  if (imgs.length === 0) {
    return html;
  }

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src');
      if (!src) return;
      const resolved = await resolveImageSrc(src);
      img.setAttribute('src', resolved);
    }),
  );

  return doc.body.innerHTML;
}
