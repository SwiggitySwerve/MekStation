/**
 * Custom Unit API Service
 * 
 * Client-side service for interacting with the custom units REST API.
 * Provides CRUD operations, version management, and canonical unit protection.
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import {
  ICustomUnitIndexEntry,
  IVersionMetadata,
  ISerializedUnitEnvelope,
  ICloneNameSuggestion,
  IUnitOperationResult,
} from '@/types/persistence/UnitPersistence';
import { IFullUnit } from './CanonicalUnitService';
import { canonicalUnitService } from './CanonicalUnitService';

/**
 * Unit with version info
 */
export interface IUnitWithVersion extends IFullUnit {
  readonly currentVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * API Response types
 */
interface IUnitListResponse {
  readonly units: readonly ICustomUnitIndexEntry[];
}

interface IUnitDetailsResponse {
  readonly success: boolean;
  readonly data?: IUnitWithVersion;
  readonly error?: string;
}

interface IUnitCreateResponse {
  readonly id: string;
  readonly version: number;
  readonly error?: string;
  readonly errorCode?: string;
}


/**
 * Save result
 */
export interface ISaveResult {
  readonly success: boolean;
  readonly id?: string;
  readonly version?: number;
  readonly error?: string;
  readonly requiresRename?: boolean;
  readonly suggestedName?: ICloneNameSuggestion;
}

/**
 * Version history entry with full data
 */
export interface IVersionWithData {
  readonly version: number;
  readonly savedAt: string;
  readonly notes: string | null;
  readonly revertSource: number | null;
  readonly data: IFullUnit;
}

/**
 * Custom Unit API Service interface
 */
export interface ICustomUnitApiService {
  // CRUD
  list(): Promise<readonly ICustomUnitIndexEntry[]>;
  getById(id: string): Promise<IUnitWithVersion | null>;
  create(unit: IFullUnit, chassis: string, variant: string, notes?: string): Promise<ISaveResult>;
  save(id: string, unit: IFullUnit, notes?: string): Promise<ISaveResult>;
  delete(id: string): Promise<IUnitOperationResult>;
  
  // Canonical protection
  isCanonical(chassis: string, variant: string): Promise<boolean>;
  suggestCloneName(chassis: string, variant: string): Promise<ICloneNameSuggestion>;
  checkSaveAllowed(unit: IFullUnit, originalId?: string): Promise<ISaveResult>;
  
  // Version management
  getVersionHistory(id: string): Promise<readonly IVersionMetadata[]>;
  getVersion(id: string, version: number): Promise<IVersionWithData | null>;
  revert(id: string, targetVersion: number, notes?: string): Promise<IUnitOperationResult>;
  
  // Export/Import
  exportUnit(id: string): Promise<ISerializedUnitEnvelope | null>;
  importUnit(data: ISerializedUnitEnvelope | Record<string, unknown>): Promise<ISaveResult>;
}

/**
 * API base URL
 */
const API_BASE = '/api/units';

/**
 * Custom Unit API Service implementation
 */
export class CustomUnitApiService implements ICustomUnitApiService {
  /**
   * List all custom units
   */
  async list(): Promise<readonly ICustomUnitIndexEntry[]> {
    const response = await fetch(`${API_BASE}/custom`);

    if (!response.ok) {
      throw new Error(`Failed to list units: ${response.statusText}`);
    }

    const data = await response.json() as IUnitListResponse;
    return data.units;
  }

  /**
   * Get a custom unit by ID
   */
  async getById(id: string): Promise<IUnitWithVersion | null> {
    const response = await fetch(`${API_BASE}/custom/${encodeURIComponent(id)}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get unit: ${response.statusText}`);
    }
    
    const data = await response.json() as IUnitDetailsResponse;

    if (!data.success || !data.data) {
      throw new Error(`Failed to get unit: ${data.error || 'Unknown error'}`);
    }

    // Convert API response to IFullUnit format
    return {
      ...(data.data.parsedData as IFullUnit),
      id: data.data.id,
      chassis: data.data.chassis,
      variant: data.data.variant,
      currentVersion: data.data.currentVersion,
      createdAt: data.data.createdAt,
      updatedAt: data.data.updatedAt,
    } as IUnitWithVersion;
  }

  /**
   * Create a new custom unit
   */
  async create(unit: IFullUnit, chassis: string, variant: string, notes?: string): Promise<ISaveResult> {
    // Check if name is already taken
    const existingCustom = await this.findByName(chassis, variant);
    if (existingCustom) {
      const suggestion = await this.suggestCloneName(chassis, variant);
      return {
        success: false,
        error: `Unit "${chassis} ${variant}" already exists`,
        requiresRename: true,
        suggestedName: suggestion,
      };
    }

    const response = await fetch(`${API_BASE}/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chassis,
        variant,
        data: { ...unit, chassis, variant },
        notes,
      }),
    });
    
    const result = await response.json() as IUnitCreateResponse;

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to create unit',
        requiresRename: result.errorCode === 'DUPLICATE_NAME',
      };
    }

    return {
      success: true,
      id: result.id,
      version: result.version,
    };
  }

  /**
   * Save (update) an existing custom unit
   */
  async save(id: string, unit: IFullUnit, notes?: string): Promise<ISaveResult> {
    const response = await fetch(`${API_BASE}/custom/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: unit,
        notes,
      }),
    });
    
    const result = await response.json() as IUnitCreateResponse;

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to save unit',
      };
    }

    return {
      success: true,
      id: result.id,
      version: result.version,
    };
  }

  /**
   * Delete a custom unit
   */
  async delete(id: string): Promise<IUnitOperationResult> {
    const response = await fetch(`${API_BASE}/custom/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    
    const result = await response.json() as { id?: string; error?: string };
    
    return {
      success: response.ok,
      id: result.id,
      error: result.error,
    };
  }

  /**
   * Check if a chassis/variant combination is a canonical unit
   */
  async isCanonical(chassis: string, variant: string): Promise<boolean> {
    const index = await canonicalUnitService.getIndex();
    const normalizedName = `${chassis} ${variant}`.toLowerCase();
    
    return index.some(entry => 
      `${entry.chassis} ${entry.variant}`.toLowerCase() === normalizedName
    );
  }

  /**
   * Get a suggested clone name
   */
  async suggestCloneName(chassis: string, variant: string): Promise<ICloneNameSuggestion> {
    const response = await fetch(`${API_BASE}/custom/suggest-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chassis, variant }),
    });
    
    if (!response.ok) {
      // Fallback to client-side suggestion
      return {
        chassis,
        variant,
        suggestedVariant: `${variant}-Custom-1`,
      };
    }
    
    return response.json();
  }

  /**
   * Check if saving is allowed and get rename suggestion if needed
   */
  async checkSaveAllowed(unit: IFullUnit, originalId?: string): Promise<ISaveResult> {
    const chassis = unit.chassis;
    const variant = unit.variant;
    
    // If this is an existing custom unit, saving is always allowed
    if (originalId?.startsWith('custom-')) {
      return { success: true };
    }
    
    // Check if it's a canonical unit
    const isCanon = await this.isCanonical(chassis, variant);
    if (isCanon) {
      const suggestion = await this.suggestCloneName(chassis, variant);
      return {
        success: false,
        error: 'Cannot overwrite canonical unit',
        requiresRename: true,
        suggestedName: suggestion,
      };
    }
    
    return { success: true };
  }

  /**
   * Get version history for a unit
   */
  async getVersionHistory(id: string): Promise<readonly IVersionMetadata[]> {
    const response = await fetch(`${API_BASE}/custom/${encodeURIComponent(id)}/versions`);
    
    if (!response.ok) {
      throw new Error(`Failed to get version history: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.versions as IVersionMetadata[];
  }

  /**
   * Get a specific version of a unit
   */
  async getVersion(id: string, version: number): Promise<IVersionWithData | null> {
    const response = await fetch(
      `${API_BASE}/custom/${encodeURIComponent(id)}/versions/${version}`
    );
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get version: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      version: data.version,
      savedAt: data.savedAt,
      notes: data.notes,
      revertSource: data.revertSource,
      data: data.parsedData as IFullUnit,
    };
  }

  /**
   * Revert a unit to a previous version
   */
  async revert(id: string, targetVersion: number, notes?: string): Promise<IUnitOperationResult> {
    const response = await fetch(
      `${API_BASE}/custom/${encodeURIComponent(id)}/revert/${targetVersion}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      }
    );
    
    const result = await response.json();
    
    return {
      success: response.ok,
      id: result.id,
      version: result.version,
      error: result.error,
    };
  }

  /**
   * Export a unit as JSON envelope
   */
  async exportUnit(id: string): Promise<ISerializedUnitEnvelope | null> {
    const response = await fetch(
      `${API_BASE}/custom/${encodeURIComponent(id)}/export`
    );
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to export unit: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Import a unit from JSON
   */
  async importUnit(data: ISerializedUnitEnvelope | Record<string, unknown>): Promise<ISaveResult> {
    const response = await fetch(`${API_BASE}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error,
        requiresRename: response.status === 409,
        suggestedName: result.suggestedName ? {
          chassis: '',
          variant: '',
          suggestedVariant: result.suggestedName,
        } : undefined,
      };
    }
    
    return {
      success: true,
      id: result.unitId,
      version: 1,
    };
  }

  /**
   * Find a custom unit by name
   */
  private async findByName(chassis: string, variant: string): Promise<ICustomUnitIndexEntry | null> {
    const units = await this.list();
    const normalizedName = `${chassis} ${variant}`.toLowerCase();
    
    return units.find(unit =>
      `${unit.chassis} ${unit.variant}`.toLowerCase() === normalizedName
    ) || null;
  }

  /**
   * Download a unit as a file
   */
  async downloadUnit(id: string): Promise<void> {
    const envelope = await this.exportUnit(id);
    if (!envelope) {
      throw new Error('Unit not found');
    }
    
    const unit = envelope.unit as IFullUnit;
    const filename = `${unit.chassis || 'unit'}-${unit.variant || 'export'}.json`
      .replace(/[^a-zA-Z0-9\-_.]/g, '-');
    
    const blob = new Blob([JSON.stringify(envelope, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
export const customUnitApiService = new CustomUnitApiService();

