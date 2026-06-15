/**
 * Styling.
 *
 * Provides a sensible default style map and merges user overrides on top.
 * Setting `resetStyles: true` in options drops the defaults entirely so the
 * caller has full control.
 */

import type { StyleMap } from '../types';

const DEFAULT_STYLES: StyleMap = {
  h1: { fontSize: 24, bold: true, marginBottom: 8 },
  h2: { fontSize: 20, bold: true, marginBottom: 6 },
  h3: { fontSize: 16, bold: true, marginBottom: 4 },
  h4: { fontSize: 14, bold: true, marginBottom: 4 },
  h5: { fontSize: 12, bold: true, marginBottom: 4 },
  h6: { fontSize: 11, bold: true, marginBottom: 4 },
  p: { fontSize: 11, lineHeight: 1.4, marginBottom: 6 },
  a: { color: '#1a73e8', decoration: 'underline' },
  strong: { bold: true },
  b: { bold: true },
  em: { italics: true },
  i: { italics: true },
  code: { font: 'Courier', fontSize: 10 },
  blockquote: { italics: true, marginLeft: 12, marginRight: 12 },
};

/**
 * Resolves the final style map for a render. Caller styles override defaults
 * key-by-key. When `reset` is true, defaults are dropped entirely.
 */
export function resolveStyles(userStyles: StyleMap | undefined, reset: boolean): StyleMap {
  if (reset) {
    return { ...(userStyles ?? {}) };
  }
  return { ...DEFAULT_STYLES, ...(userStyles ?? {}) };
}
