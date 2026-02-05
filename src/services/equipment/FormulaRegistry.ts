/**
 * Formula Registry
 *
 * Layered registry for variable equipment formulas.
 * Layer 1: Standard formulas (variableEquipmentFormulas.ts, read-only)
 * Layer 2: Custom formulas (IndexedDB, read-write, overrides standard)
 *
 * @spec openspec/specs/equipment-services/spec.md
 */

import {
  IVariableFormulas,
  IStoredFormula,
  validateVariableFormulas,
} from '@/types/equipment/VariableEquipment';

import { ValidationError, StorageError } from '../common/errors';
import { indexedDBService, STORES } from '../persistence/IndexedDBService';
import { VARIABLE_EQUIPMENT_FORMULAS } from './variableEquipmentFormulas';

/**
 * Formula registry interface
 */
export interface IFormulaRegistry {
  initialize(): Promise<void>;
  getFormulas(equipmentId: string): IVariableFormulas | undefined;
  isVariable(equipmentId: string): boolean;
  getRequiredContext(equipmentId: string): readonly string[];
  getAllVariableEquipmentIds(): string[];

  // Custom formula management
  registerCustomFormulas(
    equipmentId: string,
    formulas: IVariableFormulas,
  ): Promise<void>;
  unregisterCustomFormulas(equipmentId: string): Promise<void>;
  getCustomFormulaIds(): string[];
}

/**
 * Formula Registry implementation
 */
export class FormulaRegistry implements IFormulaRegistry {
  private customFormulas: Map<string, IVariableFormulas> = new Map();
  private initialized = false;

  /**
   * Initialize the registry and load custom formulas from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await indexedDBService.initialize();
      await this.loadCustomFormulas();
      this.initialized = true;
    } catch (error) {
      // If storage fails, continue with standard formulas only
      console.warn('Failed to load custom formulas:', error);
      this.initialized = true;
    }
  }

  /**
   * Get formulas for an equipment ID
   * Custom formulas override builtin
   */
  getFormulas(equipmentId: string): IVariableFormulas | undefined {
    // Check custom first (overrides builtin)
    const custom = this.customFormulas.get(equipmentId);
    if (custom) {
      return custom;
    }

    // Fall back to standard variable equipment formulas
    return VARIABLE_EQUIPMENT_FORMULAS[equipmentId];
  }

  /**
   * Check if equipment is variable (has formulas in registry)
   */
  isVariable(equipmentId: string): boolean {
    return this.getFormulas(equipmentId) !== undefined;
  }

  /**
   * Get required context fields for equipment
   */
  getRequiredContext(equipmentId: string): readonly string[] {
    const formulas = this.getFormulas(equipmentId);
    return formulas?.requiredContext ?? [];
  }

  /**
   * Get all variable equipment IDs (standard + custom)
   */
  getAllVariableEquipmentIds(): string[] {
    const standardIds = Object.keys(VARIABLE_EQUIPMENT_FORMULAS);
    const customIds = Array.from(this.customFormulas.keys());

    // Combine and deduplicate
    return Array.from(new Set(standardIds.concat(customIds)));
  }

  /**
   * Register custom formulas for an equipment ID
   */
  async registerCustomFormulas(
    equipmentId: string,
    formulas: IVariableFormulas,
  ): Promise<void> {
    // Validate formulas
    const errors = validateVariableFormulas(formulas);
    if (errors.length > 0) {
      throw new ValidationError(`Invalid formulas for ${equipmentId}`, errors);
    }

    // Store in memory
    this.customFormulas.set(equipmentId, formulas);

    // Persist to IndexedDB
    try {
      await this.saveCustomFormula(equipmentId, formulas);
    } catch (error) {
      // Roll back memory change on storage failure
      this.customFormulas.delete(equipmentId);
      throw new StorageError(`Failed to persist formulas for ${equipmentId}`, {
        error: String(error),
      });
    }
  }

  /**
   * Unregister custom formulas for an equipment ID
   */
  async unregisterCustomFormulas(equipmentId: string): Promise<void> {
    // Remove from memory
    const existed = this.customFormulas.delete(equipmentId);

    if (!existed) {
      return; // Nothing to unregister
    }

    // Remove from IndexedDB
    try {
      await this.deleteCustomFormula(equipmentId);
    } catch (error) {
      console.warn(
        `Failed to delete persisted formulas for ${equipmentId}:`,
        error,
      );
    }
  }

  /**
   * Get all custom formula equipment IDs
   */
  getCustomFormulaIds(): string[] {
    return Array.from(this.customFormulas.keys());
  }

  // ============================================================================
  // PERSISTENCE HELPERS
  // ============================================================================

  private async loadCustomFormulas(): Promise<void> {
    try {
      // Note: This requires the custom-formulas store to exist
      // For now, we'll try to load and silently fail if store doesn't exist
      const stored = await this.getAllStoredFormulas();

      for (const record of stored) {
        this.customFormulas.set(record.equipmentId, record.formulas);
      }
    } catch {
      // Store might not exist yet - that's OK
      this.customFormulas.clear();
    }
  }

  private async getAllStoredFormulas(): Promise<IStoredFormula[]> {
    try {
      return await indexedDBService.getAll<IStoredFormula>(
        STORES.CUSTOM_FORMULAS,
      );
    } catch {
      return [];
    }
  }

  private async saveCustomFormula(
    equipmentId: string,
    formulas: IVariableFormulas,
  ): Promise<void> {
    const record: IStoredFormula = {
      equipmentId,
      formulas,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    await indexedDBService.put(STORES.CUSTOM_FORMULAS, equipmentId, record);
  }

  private async deleteCustomFormula(equipmentId: string): Promise<void> {
    await indexedDBService.delete(STORES.CUSTOM_FORMULAS, equipmentId);
  }
}

// Singleton instance
export const formulaRegistry = new FormulaRegistry();
