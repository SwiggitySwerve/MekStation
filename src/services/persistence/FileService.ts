/**
 * File Service
 *
 * Export and import JSON files for unit data.
 *
 * @spec openspec/specs/persistence-services/spec.md
 */

import { FileError } from '../common/errors';
import {
  IImportResult,
  IValidationResult,
  validResult,
  invalidResult,
  ValidationSeverity,
} from '../common/types';

/**
 * File service interface
 */
export interface IFileService {
  exportUnit(unit: unknown, filename?: string): void;
  exportBatch(units: unknown[], filename?: string): Promise<void>;
  importUnit(file: File): Promise<IImportResult>;
  importBatch(files: File[]): Promise<IImportResult[]>;
  validateFile(file: File): Promise<IValidationResult>;
}

/**
 * File Service implementation
 */
export class FileService implements IFileService {
  /**
   * Export a single unit as JSON file download
   */
  exportUnit(unit: unknown, filename?: string): void {
    const unitObj = unit as {
      chassis?: string;
      variant?: string;
      model?: string;
    };
    const defaultName = this.generateFilename(unitObj);
    const finalFilename = filename || defaultName;

    const json = JSON.stringify(unit, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, finalFilename);
  }

  /**
   * Export multiple units as individual JSON files
   * Note: For ZIP support, jszip library would be needed
   */
  async exportBatch(units: unknown[], filename?: string): Promise<void> {
    // Without jszip, export as a single JSON array file
    const finalFilename = filename || 'units-export.json';
    const json = JSON.stringify(units, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, finalFilename);
  }

  /**
   * Import a unit from a JSON file
   */
  async importUnit(file: File): Promise<IImportResult> {
    try {
      const text = await this.readFileAsText(file);
      const parsed = this.parseJSON(text, file.name);

      if (!parsed.success) {
        return {
          success: false,
          filename: file.name,
          errors: [parsed.error],
        };
      }

      const validation = this.validateUnitStructure(parsed.data);
      if (!validation.isValid) {
        return {
          success: false,
          filename: file.name,
          errors: validation.errors.map((e) => e.message),
        };
      }

      return {
        success: true,
        filename: file.name,
        unit: parsed.data,
      };
    } catch (error) {
      return {
        success: false,
        filename: file.name,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Import multiple units from multiple files
   */
  async importBatch(files: File[]): Promise<IImportResult[]> {
    return Promise.all(files.map((file) => this.importUnit(file)));
  }

  /**
   * Validate a file without importing
   */
  async validateFile(file: File): Promise<IValidationResult> {
    try {
      // Check file extension
      if (!file.name.endsWith('.json')) {
        return invalidResult([
          {
            code: 'INVALID_EXTENSION',
            message: 'File must have .json extension',
            severity: ValidationSeverity.ERROR,
          },
        ]);
      }

      // Check file size (max 10MB)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return invalidResult([
          {
            code: 'FILE_TOO_LARGE',
            message: 'File exceeds maximum size of 10MB',
            severity: ValidationSeverity.ERROR,
          },
        ]);
      }

      const text = await this.readFileAsText(file);
      const parsed = this.parseJSON(text, file.name);

      if (!parsed.success) {
        return invalidResult([
          {
            code: 'INVALID_JSON',
            message: parsed.error,
            severity: ValidationSeverity.ERROR,
          },
        ]);
      }

      return this.validateUnitStructure(parsed.data);
    } catch (error) {
      return invalidResult([
        {
          code: 'READ_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to read file',
          severity: ValidationSeverity.ERROR,
        },
      ]);
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private generateFilename(unit: {
    chassis?: string;
    variant?: string;
    model?: string;
  }): string {
    const chassis = unit.chassis || 'unknown';
    const variant = unit.variant || unit.model || 'variant';
    const safeChassis = chassis.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const safeVariant = variant.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${safeChassis}-${safeVariant}.json`;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () =>
        reject(new FileError('Failed to read file', file.name));
      reader.readAsText(file);
    });
  }

  private parseJSON(
    text: string,
    filename: string,
  ): { success: true; data: unknown } | { success: false; error: string } {
    try {
      // JSON.parse returns any, but we treat it as unknown for type safety
      const data: unknown = JSON.parse(text);
      return { success: true, data };
    } catch {
      return { success: false, error: `Invalid JSON in ${filename}` };
    }
  }

  private validateUnitStructure(data: unknown): IValidationResult {
    const errors: {
      code: string;
      message: string;
      severity: ValidationSeverity;
    }[] = [];

    if (typeof data !== 'object' || data === null) {
      errors.push({
        code: 'INVALID_STRUCTURE',
        message: 'File must contain a JSON object',
        severity: ValidationSeverity.ERROR,
      });
      return invalidResult(errors);
    }

    const unit = data as Record<string, unknown>;

    // Check required fields
    if (!unit.id && !unit.chassis) {
      errors.push({
        code: 'MISSING_IDENTIFIER',
        message: 'Unit must have an id or chassis field',
        severity: ValidationSeverity.ERROR,
      });
    }

    if (unit.tonnage !== undefined && typeof unit.tonnage !== 'number') {
      errors.push({
        code: 'INVALID_TONNAGE',
        message: 'Tonnage must be a number',
        severity: ValidationSeverity.ERROR,
      });
    }

    if (errors.length > 0) {
      return invalidResult(errors);
    }

    return validResult();
  }
}

// Singleton instance with lazy initialization
let _instance: FileService | null = null;

/**
 * Get the singleton FileService instance
 * Provides lazy initialization for better testability and DI support
 */
export function getFileService(): FileService {
  if (!_instance) {
    _instance = new FileService();
  }
  return _instance;
}

/**
 * Reset the singleton instance (for testing)
 * @internal
 */
export function _resetFileService(): void {
  _instance = null;
}

// Legacy export for backward compatibility
// @deprecated Use getFileService() instead
export const fileService = getFileService();
