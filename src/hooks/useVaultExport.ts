/**
 * Vault Export Hook
 *
 * Provides export functionality for units, pilots, and forces.
 * All signing happens server-side via the /api/vault/sign endpoint.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { useState, useCallback } from 'react';

import type {
  IExportResult,
  IShareableBundle,
  ShareableContentType,
  IExportableUnit,
  IExportablePilot,
  IExportableForce,
} from '@/types/vault';

import { serializeBundle } from '@/services/vault/BundleService';
import { useIdentityStore } from '@/stores/useIdentityStore';

// =============================================================================
// API Response Types
// =============================================================================

interface SignBundleResponse {
  success: boolean;
  bundle?: IShareableBundle;
  suggestedFilename?: string;
  error?: string;
}

// =============================================================================
// Types
// =============================================================================

export interface ExportOptions {
  /** Description for the bundle */
  description?: string;

  /** Tags for categorization */
  tags?: string[];

  /** Password for signing (required) */
  password: string;
}

export interface UseVaultExportState {
  /** Whether an export is in progress */
  exporting: boolean;

  /** Last export result */
  result: IExportResult | null;

  /** Error message */
  error: string | null;
}

export interface UseVaultExportActions {
  /** Export units */
  exportUnits: (
    units: IExportableUnit[],
    options: ExportOptions,
  ) => Promise<IExportResult>;

  /** Export pilots */
  exportPilots: (
    pilots: IExportablePilot[],
    options: ExportOptions,
  ) => Promise<IExportResult>;

  /** Export forces */
  exportForces: (
    forces: IExportableForce[],
    options: ExportOptions,
  ) => Promise<IExportResult>;

  /** Download the last export result as a file */
  downloadResult: () => void;

  /** Copy the last export result to clipboard */
  copyToClipboard: () => Promise<void>;

  /** Clear the result and error */
  clear: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useVaultExport(): UseVaultExportState & UseVaultExportActions {
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<IExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isUnlocked } = useIdentityStore();

  /**
   * Export content via server-side signing
   */
  const exportContent = useCallback(
    async <T extends { id: string; name: string }>(
      contentType: ShareableContentType,
      items: T[],
      options: ExportOptions,
    ): Promise<IExportResult> => {
      if (!isUnlocked) {
        const err: IExportResult = {
          success: false,
          error: {
            message: 'Identity not unlocked. Please unlock your vault first.',
          },
        };
        setError(err.error.message);
        return err;
      }

      if (items.length === 0) {
        const err: IExportResult = {
          success: false,
          error: { message: `No ${contentType}s to export` },
        };
        setError(err.error.message);
        return err;
      }

      setExporting(true);
      setError(null);

      try {
        const response = await fetch('/api/vault/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: options.password,
            contentType,
            items,
            description: options.description,
            tags: options.tags,
          }),
        });

        const data = (await response.json()) as SignBundleResponse;

        if (response.ok && data.success && data.bundle) {
          const exportResult: IExportResult = {
            success: true,
            data: {
              bundle: data.bundle,
              suggestedFilename: data.suggestedFilename,
            },
          };
          setResult(exportResult);
          return exportResult;
        } else {
          const errorMessage = data.error ?? 'Export failed';
          const exportResult: IExportResult = {
            success: false,
            error: { message: errorMessage },
          };
          setError(errorMessage);
          setResult(exportResult);
          return exportResult;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Export failed';
        const exportResult: IExportResult = {
          success: false,
          error: { message },
        };
        setError(message);
        setResult(exportResult);
        return exportResult;
      } finally {
        setExporting(false);
      }
    },
    [isUnlocked],
  );

  const handleExportUnits = useCallback(
    (units: IExportableUnit[], options: ExportOptions) =>
      exportContent('unit', units, options),
    [exportContent],
  );

  const handleExportPilots = useCallback(
    (pilots: IExportablePilot[], options: ExportOptions) =>
      exportContent('pilot', pilots, options),
    [exportContent],
  );

  const handleExportForces = useCallback(
    (forces: IExportableForce[], options: ExportOptions) =>
      exportContent('force', forces, options),
    [exportContent],
  );

  const handleDownload = useCallback(() => {
    if (!result?.success) {
      return;
    }

    const json = serializeBundle(result.data.bundle);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = result.data.suggestedFilename || 'export.mekbundle';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }, [result]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!result?.success) {
      return;
    }

    const json = serializeBundle(result.data.bundle);
    await navigator.clipboard.writeText(json);
  }, [result]);

  const handleClear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    exporting,
    result,
    error,
    exportUnits: handleExportUnits,
    exportPilots: handleExportPilots,
    exportForces: handleExportForces,
    downloadResult: handleDownload,
    copyToClipboard: handleCopyToClipboard,
    clear: handleClear,
  };
}
