/**
 * JSDOM bootstrap helper.
 *
 * `html-to-pdfmake` requires a `window` object. In Node we lazily build a
 * single shared JSDOM window — building one per call would be wasteful since
 * JSDOM construction is the most expensive part of conversion.
 */

import { JSDOM } from 'jsdom';

let cachedWindow: JSDOM['window'] | null = null;

/**
 * Returns a shared JSDOM window suitable for `html-to-pdfmake`. Lazily
 * initialized on first call.
 */
export function getJsdomWindow(): JSDOM['window'] {
  if (cachedWindow) {
    return cachedWindow;
  }
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  cachedWindow = dom.window;
  return cachedWindow;
}

/**
 * Disposes the cached JSDOM window. Mainly useful in long-running test suites
 * that want a clean slate between cases.
 */
export function resetJsdomWindow(): void {
  cachedWindow = null;
}
