/**
 * Font loading.
 *
 * pdfmake's Node printer takes a font definition map where each variant is
 * either a file path or a Buffer. We accept both; the user-facing API is
 * unchanged regardless of which one they pass.
 *
 * If no fonts are provided, we fall back to pdfmake's bundled Roboto via the
 * VFS that ships with the package.
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
  if (Object.keys(resolved).length === 1 && resolved.normal) {
    // pdfmake requires at least bold/italics/bolditalics if you reference them,
    // but it's happy with just `normal` if only normal is needed.
  }
  if (!def.bold) resolved.bold = resolved.normal;
  if (!def.italics) resolved.italics = resolved.normal;
  if (!def.bolditalics) resolved.bolditalics = resolved.bold ?? resolved.normal;
  void name;
  return resolved;
}

function loadBundledRoboto(): TFontDictionary[string] {
  // pdfmake ships its bundled Roboto via vfs_fonts.js. Older pdfmake versions
  // exported `{ pdfMake: { vfs: { 'Roboto-Regular.ttf': '<base64>', ... } } }`;
  // current versions (0.2.x) export the VFS object directly. Handle both.
  let vfsModule: unknown;
  try {
    vfsModule = require('pdfmake/build/vfs_fonts.js');
  } catch (err) {
    throw new FontLoadError(
      'Bundled Roboto font is unavailable. Provide `fonts` in options to use a custom font.',
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

/**
 * Builds the pdfmake font dictionary plus the default font name to use in the
 * generated document. If `fonts` is empty, we fall back to bundled Roboto.
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

  resolved[DEFAULT_ROBOTO_FONT_NAME] = loadBundledRoboto();
  return { fonts: resolved, defaultFont: DEFAULT_ROBOTO_FONT_NAME };
}
