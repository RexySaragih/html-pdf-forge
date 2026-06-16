/**
 * Font loading.
 *
 * pdfmake's Node printer takes a font definition map where each variant is
 * either a file path or a Buffer. We accept both; the user-facing API is
 * unchanged regardless of which one they pass.
 *
 * If no fonts are provided, we fall back to pdfmake's bundled Roboto via the
 * VFS that ships with the package.
 *
 * Built-in web fonts (e.g. Inter) are fetched from bunny.net CDN on first use
 * and cached in memory for the lifetime of the process — no download cost for
 * callers who don't use them.
 */

import { promises as fs } from 'fs';
import { isAbsolute, resolve } from 'path';
import type { TFontDictionary } from 'pdfmake/interfaces';
import { FontLoadError } from '../utils/errors';
import type { FontDefinition } from '../types';

const DEFAULT_ROBOTO_FONT_NAME = 'Roboto';

const ROBOTO_VFS_KEYS: Record<keyof FontDefinition, string> = {
  normal: 'Roboto-Regular.ttf',
  bold: 'Roboto-Medium.ttf',
  italics: 'Roboto-Italic.ttf',
  bolditalics: 'Roboto-MediumItalic.ttf',
};

// ─── Built-in web font registry ───────────────────────────────────────────────
// TTF variants from bunny.net — open CDN, no tracking, proper TTF (not woff2).
// Add entries here to support additional named fonts without user configuration.

const WEB_FONT_TTF_URLS: Record<string, Record<keyof FontDefinition, string>> = {
  Inter: {
    normal: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf',
    bold: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf',
    italics: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-italic.ttf',
    bolditalics: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-italic.ttf',
  },
  // Arimo is metrically identical to Helvetica/Arial — same glyph widths, correct
  // for documents that specify Helvetica as the intended font.
  Helvetica: {
    normal: 'https://cdn.jsdelivr.net/fontsource/fonts/arimo@latest/latin-400-normal.ttf',
    bold: 'https://cdn.jsdelivr.net/fontsource/fonts/arimo@latest/latin-700-normal.ttf',
    italics: 'https://cdn.jsdelivr.net/fontsource/fonts/arimo@latest/latin-400-italic.ttf',
    bolditalics: 'https://cdn.jsdelivr.net/fontsource/fonts/arimo@latest/latin-700-italic.ttf',
  },
};

// In-memory cache: fontName → resolved TFontDictionary entry
const webFontCache = new Map<string, Promise<TFontDictionary[string]>>();

async function fetchFontVariant(url: string, fontName: string, variant: string): Promise<Buffer> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new FontLoadError(
        `Failed to fetch font '${fontName}' (${variant}) from ${url}: ${res.status} ${res.statusText}`,
      );
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (err instanceof FontLoadError) throw err;
    throw new FontLoadError(`Network error fetching font '${fontName}' (${variant})`, err);
  }
}

async function loadWebFont(name: string): Promise<TFontDictionary[string]> {
  const urls = WEB_FONT_TTF_URLS[name];
  if (!urls) {
    throw new FontLoadError(
      `Built-in font '${name}' is not registered. Provide it via the 'fonts' option instead.`,
    );
  }
  const [normal, bold, italics, bolditalics] = await Promise.all([
    fetchFontVariant(urls.normal, name, 'normal'),
    fetchFontVariant(urls.bold, name, 'bold'),
    fetchFontVariant(urls.italics, name, 'italics'),
    fetchFontVariant(urls.bolditalics, name, 'bolditalics'),
  ]);
  return {
    normal: normal as unknown as string,
    bold: bold as unknown as string,
    italics: italics as unknown as string,
    bolditalics: bolditalics as unknown as string,
  };
}

function getWebFont(name: string): Promise<TFontDictionary[string]> {
  if (!webFontCache.has(name)) {
    webFontCache.set(name, loadWebFont(name));
  }
  return webFontCache.get(name)!;
}

export function isBuiltInWebFont(name: string): boolean {
  return name in WEB_FONT_TTF_URLS;
}

// ─── Custom font resolution ───────────────────────────────────────────────────

interface ResolvedFonts {
  fonts: TFontDictionary;
  defaultFont: string;
}

async function resolveFontVariant(value: string | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  const fullPath = isAbsolute(value) ? value : resolve(process.cwd(), value);
  try {
    return await fs.readFile(fullPath);
  } catch (err) {
    throw new FontLoadError(`Failed to read font file '${fullPath}'`, err);
  }
}

async function resolveFontDefinition(
  name: string,
  def: FontDefinition,
): Promise<TFontDictionary[string]> {
  const normal = await resolveFontVariant(def.normal);
  const resolved: TFontDictionary[string] = {
    normal: normal as unknown as string,
  };
  if (def.bold !== undefined) {
    resolved.bold = (await resolveFontVariant(def.bold)) as unknown as string;
  }
  if (def.italics !== undefined) {
    resolved.italics = (await resolveFontVariant(def.italics)) as unknown as string;
  }
  if (def.bolditalics !== undefined) {
    resolved.bolditalics = (await resolveFontVariant(def.bolditalics)) as unknown as string;
  }
  if (!def.bold) resolved.bold = resolved.normal;
  if (!def.italics) resolved.italics = resolved.normal;
  if (!def.bolditalics) resolved.bolditalics = resolved.bold ?? resolved.normal;
  void name;
  return resolved;
}

/**
 * Lazily loads bundled Roboto from pdfmake's VFS. This is deferred via
 * dynamic import() so that the ~3MB base64 font data is only loaded when
 * the user doesn't supply custom fonts or a built-in web font name.
 */
async function loadBundledRoboto(): Promise<TFontDictionary[string]> {
  let vfsModule: unknown;
  try {
    vfsModule = await import('pdfmake/build/vfs_fonts.js');
  } catch (err) {
    throw new FontLoadError(
      'Bundled Roboto font is unavailable. Install pdfmake or provide `fonts`/`defaultFont` in options.',
      err,
    );
  }
  const vfs = extractVfs(vfsModule);
  if (!vfs) {
    throw new FontLoadError('pdfmake/build/vfs_fonts.js did not expose the expected vfs object.');
  }
  const decode = (key: string): Buffer => {
    const base64 = vfs[key];
    if (!base64) {
      throw new FontLoadError(`Bundled Roboto variant '${key}' missing from VFS.`);
    }
    return Buffer.from(base64, 'base64');
  };
  return {
    normal: decode(ROBOTO_VFS_KEYS.normal) as unknown as string,
    bold: decode(ROBOTO_VFS_KEYS.bold) as unknown as string,
    italics: decode(ROBOTO_VFS_KEYS.italics) as unknown as string,
    bolditalics: decode(ROBOTO_VFS_KEYS.bolditalics) as unknown as string,
  };
}

function extractVfs(mod: unknown): Record<string, string> | null {
  if (!mod || typeof mod !== 'object') return null;
  const asRecord = mod as Record<string, unknown>;
  // Modern pdfmake (0.2.x): vfs object exported directly.
  if (typeof asRecord[ROBOTO_VFS_KEYS.normal] === 'string') {
    return asRecord as Record<string, string>;
  }
  // Legacy shape: { pdfMake: { vfs: {...} } }.
  const pdfMake = asRecord.pdfMake as { vfs?: Record<string, string> } | undefined;
  if (pdfMake?.vfs) return pdfMake.vfs;
  // Some bundlers expose default export.
  const def = asRecord.default as { vfs?: Record<string, string> } | undefined;
  if (def?.vfs) return def.vfs;
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds the pdfmake font dictionary plus the default font name to use in the
 * generated document. Resolution order:
 *
 * 1. User-supplied `fonts` map (file paths or Buffers)
 * 2. Built-in web font auto-fetch when `defaultFont` names one (e.g. 'Inter')
 * 3. Bundled Roboto fallback
 */
export async function buildFontDictionary(
  fonts: Record<string, FontDefinition> | undefined,
  defaultFont: string | undefined,
): Promise<ResolvedFonts> {
  const resolved: TFontDictionary = {};

  if (fonts && Object.keys(fonts).length > 0) {
    await Promise.all(
      Object.entries(fonts).map(async ([name, def]) => {
        resolved[name] = await resolveFontDefinition(name, def);
      }),
    );
    const chosen = defaultFont && resolved[defaultFont] ? defaultFont : Object.keys(resolved)[0];
    return { fonts: resolved, defaultFont: chosen };
  }

  // Auto-load a built-in web font when requested and no custom fonts supplied.
  if (defaultFont && isBuiltInWebFont(defaultFont)) {
    resolved[defaultFont] = await getWebFont(defaultFont);
    return { fonts: resolved, defaultFont };
  }

  resolved[DEFAULT_ROBOTO_FONT_NAME] = await loadBundledRoboto();
  return { fonts: resolved, defaultFont: DEFAULT_ROBOTO_FONT_NAME };
}
