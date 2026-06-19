import type { Dispatch, SetStateAction } from 'react';

import type {
  IImportConflict,
  IImportHandlers,
  IImportOptions,
  IImportResult,
  IShareableBundle,
} from '@/types/vault';

import {
  importFromString,
  previewBundle,
  readBundleFromFile,
  validateBundleFile,
} from '@/services/vault/ImportService';

import type { BundlePreview, UseVaultImportState } from './useVaultImport';

interface PreviewBundleResult {
  readonly valid: boolean;
  readonly metadata?: IShareableBundle['metadata'];
  readonly itemCount?: number;
  readonly error?: string;
}

interface VaultImportSetters {
  readonly setConflicts: Dispatch<SetStateAction<IImportConflict[]>>;
  readonly setError: Dispatch<SetStateAction<string | null>>;
  readonly setFile: Dispatch<SetStateAction<File | null>>;
  readonly setFileContent: Dispatch<SetStateAction<string | null>>;
  readonly setImporting: Dispatch<SetStateAction<boolean>>;
  readonly setPreview: Dispatch<SetStateAction<BundlePreview | null>>;
  readonly setResult: Dispatch<SetStateAction<IImportResult | null>>;
  readonly setStep: Dispatch<SetStateAction<UseVaultImportState['step']>>;
}

interface SelectFileOptions extends VaultImportSetters {
  readonly selectedFile: File;
}

interface ImportContentOptions<T> extends Pick<
  VaultImportSetters,
  'setConflicts' | 'setError' | 'setImporting' | 'setResult' | 'setStep'
> {
  readonly data: string;
  readonly failureStep: UseVaultImportState['step'];
  readonly handlers: IImportHandlers<T>;
  readonly options: IImportOptions;
}

export async function selectVaultImportFile(
  options: SelectFileOptions,
): Promise<void> {
  options.setError(null);
  options.setResult(null);
  options.setConflicts([]);

  const validationError = validateBundleFile(options.selectedFile);
  if (validationError) {
    options.setError(validationError);
    options.setStep('idle');
    return;
  }

  options.setFile(options.selectedFile);
  options.setStep('preview');

  try {
    const content = await readBundleFromFile(options.selectedFile);
    options.setFileContent(content);
    const bundlePreview = toBundlePreview(await previewBundle(content));
    options.setPreview(bundlePreview);
    if (!bundlePreview.valid) {
      options.setError(bundlePreview.error || 'Invalid bundle');
    }
  } catch (err) {
    const message = toImportMessage(err, 'Failed to read file');
    options.setError(message);
    options.setPreview({ valid: false, error: message });
  }
}

export async function importVaultContent<T>(
  options: ImportContentOptions<T>,
): Promise<IImportResult> {
  options.setImporting(true);
  options.setError(null);
  options.setStep('importing');

  try {
    const result = await importFromString<T>(
      options.data,
      options.handlers,
      options.options,
    );
    applyImportResult(result, options);
    return result;
  } catch (err) {
    const message = toImportMessage(err, 'Import failed');
    options.setError(message);
    options.setStep(options.failureStep);
    return createImportErrorResult(message);
  } finally {
    options.setImporting(false);
  }
}

export function createMissingContentResult(
  setError: Dispatch<SetStateAction<string | null>>,
): IImportResult {
  const message = 'No file content';
  setError(message);
  return createImportErrorResult(message);
}

export function clearVaultImportFile(setters: VaultImportSetters): void {
  setters.setFile(null);
  setters.setFileContent(null);
  setters.setPreview(null);
  setters.setConflicts([]);
  setters.setResult(null);
  setters.setError(null);
  setters.setStep('idle');
}

export function resetVaultImportState(setters: VaultImportSetters): void {
  setters.setFile(null);
  setters.setFileContent(null);
  setters.setPreview(null);
  setters.setConflicts([]);
  setters.setResult(null);
  setters.setError(null);
  setters.setStep('idle');
  setters.setImporting(false);
}

function toBundlePreview(preview: PreviewBundleResult): BundlePreview {
  if (preview.valid && preview.metadata) {
    return {
      valid: true,
      contentType: preview.metadata.contentType,
      itemCount: preview.itemCount,
      authorName: preview.metadata.author.displayName,
      description: preview.metadata.description,
      createdAt: preview.metadata.createdAt,
    };
  }

  return {
    valid: false,
    error: preview.error,
  };
}

function applyImportResult(
  result: IImportResult,
  setters: Pick<
    VaultImportSetters,
    'setConflicts' | 'setError' | 'setImporting' | 'setResult' | 'setStep'
  >,
): void {
  if (hasImportConflicts(result)) {
    setters.setConflicts(result.data.conflicts);
    setters.setStep('conflicts');
    setters.setImporting(false);
    return;
  }

  setters.setResult(result);
  setters.setStep('complete');

  if (!result.success) {
    setters.setError(result.error.message || 'Import failed');
  }
}

function hasImportConflicts(result: IImportResult): result is Extract<
  IImportResult,
  { success: true }
> & {
  success: true;
  data: { conflicts: IImportConflict[] };
} {
  if (!result.success) return false;
  const conflicts = result.data.conflicts;
  return Array.isArray(conflicts) && conflicts.length > 0;
}

function createImportErrorResult(message: string): IImportResult {
  return { success: false, error: { message } };
}

function toImportMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}
