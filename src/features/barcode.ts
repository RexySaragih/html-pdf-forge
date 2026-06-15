/**
 * Barcode preprocessing.
 *
 * Scans the input HTML for `<pdf-barcode>` tags, renders each barcode via
 * `bwip-js` to a PNG buffer, and rewrites the tag as an `<img>` carrying a
 * `data:` URI. Runs concurrently across all tags.
 *
 * Custom HTML element shape:
 *   <pdf-barcode type="code128" value="ABC-123" width="200" height="60" />
 *
 * Supported attributes:
 *   - type / bcid   (required) — barcode symbology recognized by bwip-js
 *                                 (e.g. code128, qrcode, ean13, code39)
 *   - value / text  (required) — payload encoded into the barcode
 *   - width         (optional) — output width in pixels, default 200
 *   - height        (optional) — output height in pixels, default 60
 *   - scale         (optional) — bwip-js scale factor, default 3
 *   - includetext   (optional) — 'true' | 'false', default 'true'
 */

import bwipjs from 'bwip-js';
import { getJsdomWindow } from '../utils/jsdom';
import { BarcodeRenderError } from '../utils/errors';

const DEFAULT_WIDTH_PX = 200;
const DEFAULT_HEIGHT_PX = 60;
const DEFAULT_SCALE = 3;
const PDF_BARCODE_SELECTOR = 'pdf-barcode';

interface BarcodeAttrs {
  bcid: string;
  text: string;
  widthPx: number;
  heightPx: number;
  scale: number;
  includetext: boolean;
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function parseBool(raw: string | null, fallback: boolean): boolean {
  if (raw === null) return fallback;
  const lower = raw.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return true;
  if (lower === 'false' || lower === '0' || lower === 'no') return false;
  return fallback;
}

function readAttrs(el: Element): BarcodeAttrs | null {
  const bcid = el.getAttribute('type') ?? el.getAttribute('bcid');
  const text = el.getAttribute('value') ?? el.getAttribute('text');
  if (!bcid || !text) return null;
  return {
    bcid,
    text,
    widthPx: parsePositiveInt(el.getAttribute('width'), DEFAULT_WIDTH_PX),
    heightPx: parsePositiveInt(el.getAttribute('height'), DEFAULT_HEIGHT_PX),
    scale: parsePositiveInt(el.getAttribute('scale'), DEFAULT_SCALE),
    includetext: parseBool(el.getAttribute('includetext'), true),
  };
}

async function renderBarcodeDataUri(attrs: BarcodeAttrs): Promise<string> {
  try {
    // bwip-js's `height` uses millimeters under the hood; `scale` controls
    // pixel-density. We feed scale + a derived mm height so the output
    // approximates the requested pixel size.
    const heightMm = Math.max(1, Math.round(attrs.heightPx / attrs.scale / 2.83));
    const buffer = await bwipjs.toBuffer({
      bcid: attrs.bcid,
      text: attrs.text,
      scale: attrs.scale,
      height: heightMm,
      includetext: attrs.includetext,
      textxalign: 'center',
    });
    return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
  } catch (err) {
    throw new BarcodeRenderError(
      `Failed to render '${attrs.bcid}' barcode for value '${attrs.text}'`,
      err,
    );
  }
}

/**
 * Walks every `<pdf-barcode>` element in `html`, generates the PNG, and
 * replaces the tag with an `<img>` carrying the data URI. Returns the
 * rewritten HTML. If no `<pdf-barcode>` tags exist, the input is returned
 * unchanged.
 */
export async function inlineBarcodes(html: string): Promise<string> {
  const window = getJsdomWindow();
  const doc = window.document.implementation.createHTMLDocument('');
  doc.body.innerHTML = html;

  const tags = Array.from(doc.querySelectorAll(PDF_BARCODE_SELECTOR));
  if (tags.length === 0) return html;

  await Promise.all(
    tags.map(async (el) => {
      const attrs = readAttrs(el);
      if (!attrs) {
        el.remove();
        return;
      }
      const dataUri = await renderBarcodeDataUri(attrs);
      const img = doc.createElement('img');
      img.setAttribute('src', dataUri);
      img.setAttribute('width', String(attrs.widthPx));
      img.setAttribute('height', String(attrs.heightPx));
      el.replaceWith(img);
    }),
  );

  return doc.body.innerHTML;
}
