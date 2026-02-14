/**
 * Vault Import/Export Types
 *
 * Bundle, export, import, exportable content, and handler type definitions.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { ResultType } from '@/services/core/types/BaseTypes';

import type { IPublicIdentity, ShareableContentType } from './VaultCoreTypes';

// =============================================================================
// Bundle Types
// =============================================================================

export interface IBundleMetadata {
  version: string;
  contentType: ShareableContentType;
  itemCount: number;
  author: IPublicIdentity;
  createdAt: string;
  description?: string;
  tags?: string[];
  appVersion: string;
}

export interface IShareableBundle {
  metadata: IBundleMetadata;
  payload: string;
  signature: string;
}

export interface IParsedBundle<T = unknown> {
  metadata: IBundleMetadata;
  items: T[];
  signatureValid: boolean;
  signer: IPublicIdentity;
}

// =============================================================================
// Import/Export Types
// =============================================================================

export interface IExportOptions {
  description?: string;
  tags?: string[];
  includeNested?: boolean;
}

export interface IExportData {
  bundle: IShareableBundle;
  suggestedFilename?: string;
}

export interface IExportError {
  message: string;
}

export type IExportResult = ResultType<IExportData, IExportError>;

export interface IImportConflict {
  contentType: ShareableContentType;
  bundleItemId: string;
  bundleItemName: string;
  existingItemId: string;
  existingItemName: string;
  resolution: 'skip' | 'replace' | 'rename' | 'keep_both';
}

export interface IImportOptions {
  conflictResolution: 'skip' | 'replace' | 'rename' | 'ask';
  resolvedConflicts?: IImportConflict[];
  verifySignature?: boolean;
  trackSource?: boolean;
}

export interface IImportData {
  importedCount: number;
  skippedCount: number;
  replacedCount: number;
  conflicts?: IImportConflict[];
  importedIds?: Record<string, string>;
  signatureValid?: boolean;
}

export interface IImportError {
  message: string;
}

export type IImportResult = ResultType<IImportData, IImportError>;

export interface IImportSource {
  author: IPublicIdentity;
  importedAt: string;
  originalId: string;
  bundleDescription?: string;
}

// =============================================================================
// Exportable Content Types
// =============================================================================

export interface IExportableUnit {
  id: string;
  name: string;
  chassis: string;
  model: string;
  data: unknown;
  source?: string;
}

export interface IExportablePilot {
  id: string;
  name: string;
  callsign?: string;
  data: unknown;
}

export interface IExportableForce {
  id: string;
  name: string;
  description?: string;
  data: unknown;
  pilots?: IExportablePilot[];
  units?: IExportableUnit[];
}

// =============================================================================
// Import Handler Types
// =============================================================================

export type ExistsChecker = (id: string) => Promise<boolean>;

export type NameChecker = (
  name: string,
) => Promise<{ id: string; name: string } | null>;

export type ItemSaver<T> = (item: T, source: IImportSource) => Promise<string>;

export interface IImportHandlers<T> {
  checkExists: ExistsChecker;
  checkNameConflict: NameChecker;
  save: ItemSaver<T>;
}
