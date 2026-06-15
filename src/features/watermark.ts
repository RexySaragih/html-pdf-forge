/**
 * Watermark feature.
 *
 * pdfmake supports a native `watermark` doc-definition key for diagonal text
 * watermarks. We accept either a plain string (rendered with sensible
 * defaults) or a structured options object for fine control.
 */

import type { Watermark } from 'pdfmake/interfaces';
import type { WatermarkInput, WatermarkOptions } from '../types';

const DEFAULT_COLOR = 'gray';
const DEFAULT_OPACITY = 0.2;
const DEFAULT_FONT_SIZE = 60;
const DEFAULT_ANGLE = -45;

function fromString(text: string): WatermarkOptions {
  return { text };
}

/**
 * Maps the user-friendly `WatermarkInput` to pdfmake's `Watermark` shape.
 * Returns `undefined` when no watermark is configured so the caller can skip
 * setting the doc key.
 */
export function buildWatermark(input: WatermarkInput | undefined): Watermark | undefined {
  if (input === undefined) return undefined;
  const opts = typeof input === 'string' ? fromString(input) : input;
  if (!opts.text) return undefined;

  return {
    text: opts.text,
    color: opts.color ?? DEFAULT_COLOR,
    opacity: opts.opacity ?? DEFAULT_OPACITY,
    bold: opts.bold ?? true,
    italics: opts.italics ?? false,
    fontSize: opts.fontSize ?? DEFAULT_FONT_SIZE,
    angle: opts.angle ?? DEFAULT_ANGLE,
  };
}
