import { v4 as uuidv4 } from 'uuid';
/**
 * Unit Loader Service - Main Service Class
 *
 * Core service for loading units from canonical or custom sources and
 * mapping them to UnitState format for the customizer.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import type { UnitState } from '@/stores/unitState';
import type { UnitFamily } from '@/types/unit/UnitIndex';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { createLibrarySaveReceipt } from '@/stores/unit/unitEditSnapshot';

import type { IUnitDefinitionReference } from './definitionTypes';

import { getCanonicalUnitService } from '../CanonicalUnitService';
import { mapTechBase, mapTechBaseMode } from './componentMappers';
import { createUnitSession } from './createUnitSession';
import { UNIT_DEFINITION_FAMILIES } from './definitionTypes';
import { mapEquipment } from './equipmentMapping';
import { loadUnitDefinition } from './loadUnitDefinition';
import { UnsupportedUnitConfigurationError } from './movementConfiguration';
import { normalizeUnitConfiguration } from './normalizeUnitConfiguration';
import { IRawSerializedUnit, UnitSource, ILoadUnitResult } from './types';

function unitLoadErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function withLoadedLibrarySave(
  state: UnitState,
  source: UnitSource,
  reference: IUnitDefinitionReference,
): UnitState {
  if (source !== 'custom') return state;
  const version = reference.version;
  if (
    typeof version !== 'number' ||
    !Number.isSafeInteger(version) ||
    version < 1
  ) {
    return state;
  }
  return {
    ...state,
    librarySave: createLibrarySaveReceipt(state, {
      id: reference.id,
      version,
    }),
  };
}

/**
 * Unit Loader Service
 */
export class UnitLoaderService {
  /**
   * Ensure equipment services are initialized for ID resolution
   */
  private async ensureEquipmentInitialized(): Promise<void> {
    // Initialize equipment lookup service (loads JSON equipment data)
    await getEquipmentLookupService().initialize();

    // Initialize equipment registry (builds name-to-ID mappings)
    const registry = getEquipmentRegistry();
    await registry.initialize();
  }

  async loadCanonicalUnit(
    id: string,
    family: UnitFamily = 'battlemechs',
  ): Promise<ILoadUnitResult> {
    return this.loadSource(id, 'canonical', family);
  }

  async loadCustomUnit(
    id: string,
    family: UnitFamily = 'battlemechs',
  ): Promise<ILoadUnitResult> {
    return this.loadSource(id, 'custom', family);
  }

  private async loadSource(
    id: string,
    source: UnitSource,
    family: UnitFamily,
  ): Promise<ILoadUnitResult> {
    const loaded = await loadUnitDefinition(family, id, source);
    if (!loaded.success) {
      if (source === 'canonical' && loaded.code === 'invalid-definition') {
        getCanonicalUnitService().invalidateUnit(id, family);
      }
      return { success: false, error: loaded.error, errorCode: loaded.code };
    }

    if (UNIT_DEFINITION_FAMILIES[loaded.family].store !== 'battlemech') {
      return {
        success: false,
        error: `The BattleMech editor cannot load ${loaded.definition.unitType} definitions`,
        errorCode: 'unsupported-store-family',
      };
    }

    try {
      await this.ensureEquipmentInitialized();
      const state = this.mapToUnitState(
        loaded.definition as IRawSerializedUnit,
        source === 'canonical',
        loaded.definition.sourceDefinition ?? loaded.reference,
      );
      return {
        success: true,
        state: withLoadedLibrarySave(state, source, loaded.reference),
        sourceDefinition: loaded.reference,
      };
    } catch (error) {
      return {
        success: false,
        error: unitLoadErrorMessage(error, 'Failed to create unit editor'),
        errorCode:
          error instanceof UnsupportedUnitConfigurationError
            ? 'unsupported-configuration'
            : 'session-failed',
      };
    }
  }

  /**
   * Load a unit from either source
   */
  async loadUnit(
    id: string,
    source: UnitSource,
    family: UnitFamily = 'battlemechs',
  ): Promise<ILoadUnitResult> {
    if (source === 'canonical') {
      return this.loadCanonicalUnit(id, family);
    } else {
      return this.loadCustomUnit(id, family);
    }
  }

  /**
   * Map serialized unit JSON to UnitState
   */
  mapToUnitState(
    serialized: IRawSerializedUnit,
    _isCanonical: boolean,
    sourceDefinition?: IUnitDefinitionReference,
  ): UnitState {
    const equipment = mapEquipment(
      serialized.equipment,
      mapTechBase(serialized.techBase),
      mapTechBaseMode(serialized.techBase),
      serialized.criticalSlots,
    );
    return createUnitSession(
      normalizeUnitConfiguration(serialized, equipment),
      { id: uuidv4(), createdAt: Date.now() },
      sourceDefinition ?? serialized.sourceDefinition,
    );
  }
}

// Singleton instance
export const unitLoaderService = new UnitLoaderService();
