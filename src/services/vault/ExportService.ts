/**
 * Export Service
 *
 * Handles exporting units, pilots, and forces as signed bundles.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IVaultIdentity,
  IExportOptions,
  IExportResult,
  ShareableContentType,
  IExportableUnit,
  IExportablePilot,
  IExportableForce,
} from '@/types/vault';
import { createBundle, serializeBundle } from './BundleService';

export type { IExportableUnit, IExportablePilot, IExportableForce };

// =============================================================================
// Unit Export
// =============================================================================

export async function exportUnit(
  unit: IExportableUnit,
  identity: IVaultIdentity,
  options: IExportOptions = {}
): Promise<IExportResult> {
  return createBundle<IExportableUnit>('unit', [unit], identity, options);
}

/**
 * Export multiple units
 */
export async function exportUnits(
  units: IExportableUnit[],
  identity: IVaultIdentity,
  options: IExportOptions = {}
): Promise<IExportResult> {
  if (units.length === 0) {
    return {
      success: false,
      error: 'No units to export',
    };
  }

  return createBundle<IExportableUnit>('unit', units, identity, options);
}

// =============================================================================
// Pilot Export
// =============================================================================

export async function exportPilot(
  pilot: IExportablePilot,
  identity: IVaultIdentity,
  options: IExportOptions = {}
): Promise<IExportResult> {
  return createBundle<IExportablePilot>('pilot', [pilot], identity, options);
}

/**
 * Export multiple pilots
 */
export async function exportPilots(
  pilots: IExportablePilot[],
  identity: IVaultIdentity,
  options: IExportOptions = {}
): Promise<IExportResult> {
  if (pilots.length === 0) {
    return {
      success: false,
      error: 'No pilots to export',
    };
  }

  return createBundle<IExportablePilot>('pilot', pilots, identity, options);
}

// =============================================================================
// Force Export
// =============================================================================

export async function exportForce(
  force: IExportableForce,
  identity: IVaultIdentity,
  options: IExportOptions = {}
): Promise<IExportResult> {
  // If includeNested is false, strip nested data
  const exportData = options.includeNested
    ? force
    : { ...force, pilots: undefined, units: undefined };

  return createBundle<IExportableForce>('force', [exportData], identity, options);
}

/**
 * Export multiple forces
 */
export async function exportForces(
  forces: IExportableForce[],
  identity: IVaultIdentity,
  options: IExportOptions = {}
): Promise<IExportResult> {
  if (forces.length === 0) {
    return {
      success: false,
      error: 'No forces to export',
    };
  }

  const exportData = options.includeNested
    ? forces
    : forces.map((f) => ({ ...f, pilots: undefined, units: undefined }));

  return createBundle<IExportableForce>('force', exportData, identity, options);
}

// =============================================================================
// Generic Export
// =============================================================================

/**
 * Export any content type
 */
export async function exportContent<T>(
  contentType: ShareableContentType,
  items: T[],
  identity: IVaultIdentity,
  options: IExportOptions = {}
): Promise<IExportResult> {
  if (items.length === 0) {
    return {
      success: false,
      error: `No ${contentType}s to export`,
    };
  }

  return createBundle<T>(contentType, items, identity, options);
}

// =============================================================================
// File Export Helpers
// =============================================================================

/**
 * Trigger a file download in the browser
 */
export function downloadBundle(result: IExportResult): void {
  if (!result.success || !result.bundle) {
    throw new Error(result.error || 'No bundle to download');
  }

  const json = serializeBundle(result.bundle);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = result.suggestedFilename || 'export.mekbundle';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

/**
 * Copy bundle to clipboard as JSON
 */
export async function copyBundleToClipboard(
  result: IExportResult
): Promise<void> {
  if (!result.success || !result.bundle) {
    throw new Error(result.error || 'No bundle to copy');
  }

  const json = serializeBundle(result.bundle);
  await navigator.clipboard.writeText(json);
}
