/**
 * Password protection feature.
 *
 * pdfmake delegates to PDFKit, which natively supports user/owner passwords
 * and permission flags. We expose the same flags through `ProtectOptions`
 * and pass them through the doc definition. pdfmake's TS types don't include
 * these keys, so the pipeline applies them via an `unknown` cast.
 */

import type { PdfPermissions, ProtectOptions } from '../types';

interface ProtectionDocFields {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: PdfPermissions;
}

/**
 * Builds the protection-related fields that get spread onto the pdfmake doc
 * definition. Returns `undefined` when no protection is configured.
 */
export function buildProtection(
  options: ProtectOptions | undefined,
): ProtectionDocFields | undefined {
  if (!options) return undefined;
  if (!options.userPassword && !options.ownerPassword && !options.permissions) {
    return undefined;
  }

  const fields: ProtectionDocFields = {};
  if (options.userPassword !== undefined) fields.userPassword = options.userPassword;
  if (options.ownerPassword !== undefined) fields.ownerPassword = options.ownerPassword;
  if (options.permissions !== undefined) fields.permissions = options.permissions;
  return fields;
}
