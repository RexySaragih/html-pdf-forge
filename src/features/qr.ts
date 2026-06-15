/**
 * QR code preprocessing.
 *
 * Scans the input HTML for `<pdf-qr value="..." size="...">` tags, generates
 * a PNG via the `qrcode` package, and rewrites each tag as a standard
 * `<img>` with a `data:` URI. Runs concurrently across all tags.
 *
 * Custom HTML element shape:
 *   <pdf-qr value="https://example.com" size="100" />
 *   <pdf-qr value="..." size="120" margin="2" ec="M" />
 *
 * Supported attributes:
 *   - value      (required) — text/URL encoded into the QR
 *   - size       (optional) — pixel size, default 120
 *   - margin     (optional) — quiet-zone modules, default 1
 *   - ec         (optional) — error correction: L | M | Q | H, default M
 */

import QRCode, { type QRCodeErrorCorrectionLevel } from 'qrcode';
import { getJsdomWindow } from '../utils/jsdom';
import { QrCodeRenderError } from '../utils/errors';

const DEFAULT_SIZE = 120;
const DEFAULT_MARGIN = 1;
const DEFAULT_EC: QRCodeErrorCorrectionLevel = 'M';
const PDF_QR_SELECTOR = 'pdf-qr';

interface QrAttrs {
  value: string;
  size: number;
  margin: number;
  ec: QRCodeErrorCorrectionLevel;
}

function parseEcLevel(raw: string | null): QRCodeErrorCorrectionLevel {
  const normalized = (raw ?? '').toUpperCase();
  if (normalized === 'L' || normalized === 'M' || normalized === 'Q' || normalized === 'H') {
    return normalized;
  }
  return DEFAULT_EC;
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function readAttrs(el: Element): QrAttrs | null {
  const value = el.getAttribute('value');
  if (!value) return null;
  return {
    value,
    size: parsePositiveInt(el.getAttribute('size'), DEFAULT_SIZE),
    margin: parsePositiveInt(el.getAttribute('margin'), DEFAULT_MARGIN),
    ec: parseEcLevel(el.getAttribute('ec')),
  };
}

async function renderQrDataUri(attrs: QrAttrs): Promise<string> {
  try {
    return await QRCode.toDataURL(attrs.value, {
      errorCorrectionLevel: attrs.ec,
      margin: attrs.margin,
      width: attrs.size,
    });
  } catch (err) {
    throw new QrCodeRenderError(`Failed to render QR for value '${attrs.value}'`, err);
  }
}

/**
 * Walks every `<pdf-qr>` element in `html`, generates the QR PNG, and
 * replaces the tag with an `<img>` carrying the data URI. Returns the
 * rewritten HTML. If no `<pdf-qr>` tags exist, the input is returned
 * unchanged.
 */
export async function inlineQrCodes(html: string): Promise<string> {
  const window = getJsdomWindow();
  const doc = window.document.implementation.createHTMLDocument('');
  doc.body.innerHTML = html;

  const tags = Array.from(doc.querySelectorAll(PDF_QR_SELECTOR));
  if (tags.length === 0) return html;

  await Promise.all(
    tags.map(async (el) => {
      const attrs = readAttrs(el);
      if (!attrs) {
        el.remove();
        return;
      }
      const dataUri = await renderQrDataUri(attrs);
      const img = doc.createElement('img');
      img.setAttribute('src', dataUri);
      img.setAttribute('width', String(attrs.size));
      img.setAttribute('height', String(attrs.size));
      el.replaceWith(img);
    }),
  );

  return doc.body.innerHTML;
}
