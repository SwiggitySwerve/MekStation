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
import type { IUnitContract } from '@/types/contracts';
import type { UnitFamily } from '@/types/unit/UnitIndex';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { createDefaultInfantryState } from '@/stores/infantryState';
import {
  createEditorLibrarySaveReceipt,
  type UnitSaveEditor,
} from '@/stores/unitSaveStateAdapters';
import { mapInfantryDefinition } from '@/utils/construction/infantry/libraryMapping';

import type { IUnitDefinitionReference } from './definitionTypes';

import { mapAerospaceDefinitionToState } from './aerospaceDefinitionMapper';
import { mapCapitalDefinitionToView } from './capitalShipView';
import { mapTechBase, mapTechBaseMode } from './componentMappers';
import { createUnitSession } from './createUnitSession';
import {
  isDefinitionForFamily,
  UNIT_DEFINITION_FAMILIES,
} from './definitionTypes';
import { mapEquipmentWithDiagnostics } from './equipmentMapping';
import { loadUnitDefinition } from './loadUnitDefinition';
import { UnsupportedUnitConfigurationError } from './movementConfiguration';
import { normalizeUnitConfiguration } from './normalizeUnitConfiguration';
import {
  mapProtoMechDefinitionToState,
  mapBattleArmorDefinitionToState,
} from './smallUnitDefinitionMapper';
import {
  FamilyEditorState,
  IRawSerializedUnit,
  UnitSource,
  ILoadUnitResult,
} from './types';
import { mapToVehicleState } from './vehicleMapping';

function unitLoadErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Route a validated non-mech definition to its store mapper or read-only view. */
function mapFamilyState(
  store: FamilyEditorState['store'],
  definition: IUnitContract,
  reference: IUnitDefinitionReference,
): FamilyEditorState {
  if (store === 'infantry') {
    const config = mapInfantryDefinition(definition);
    return {
      store,
      state: { ...createDefaultInfantryState(config), ...config },
    };
  }
  if (store === 'protomech')
    return { store, state: mapProtoMechDefinitionToState(definition) };
  if (store === 'battlearmor')
    return { store, state: mapBattleArmorDefinitionToState(definition) };
  if (store === 'capital') {
    return {
      store,
      state: mapCapitalDefinitionToView(definition, uuidv4(), reference),
    };
  }
  if (store === 'vehicle') {
    return { store, state: mapToVehicleState(definition) };
  }
  if (!isDefinitionForFamily('aerospace', definition)) {
    throw new UnsupportedUnitConfigurationError(
      `The aerospace editor cannot load ${definition.unitType} definitions`,
    );
  }
  return {
    store,
    state: mapAerospaceDefinitionToState(definition, {
      id: uuidv4(),
      createdAt: Date.now(),
    }),
  };
}

/** Attach confirmed metadata after mapping; admission and loading remain unchanged. */
function withLoadedLibrarySave<TEditor extends UnitSaveEditor>(
  editor: TEditor,
  source: UnitSource,
  reference: IUnitDefinitionReference,
): TEditor {
  const version = reference.version;
  if (
    source !== 'custom' ||
    typeof version !== 'number' ||
    !Number.isSafeInteger(version) ||
    version < 1
  )
    return editor;
  return {
    ...editor,
    state: {
      ...editor.state,
      librarySave: createEditorLibrarySaveReceipt(editor, {
        id: reference.id,
        version,
      }),
    },
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
      return { success: false, error: loaded.error, errorCode: loaded.code };
    }

    const store = UNIT_DEFINITION_FAMILIES[loaded.family].store;
    if (store === null) {
      return {
        success: false,
        error: `The BattleMech editor cannot load ${loaded.definition.unitType} definitions`,
        errorCode: 'unsupported-store-family',
      };
    }

    try {
      if (
        store === 'battlemech' ||
        store === 'vehicle' ||
        store === 'aerospace'
      ) {
        await this.ensureEquipmentInitialized();
      }
      if (store !== 'battlemech') {
        const editor = mapFamilyState(
          store,
          loaded.definition,
          loaded.reference,
        );
        return {
          success: true,
          familyState:
            editor.store === 'capital'
              ? editor
              : withLoadedLibrarySave(editor, source, loaded.reference),
          sourceDefinition: loaded.reference,
        };
      }
      const state = this.mapToUnitState(
        loaded.definition as IRawSerializedUnit,
        source === 'canonical',
        loaded.definition.sourceDefinition ?? loaded.reference,
      );
      return {
        success: true,
        state: withLoadedLibrarySave(
          { store: 'battlemech', state },
          source,
          loaded.reference,
        ).state,
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
    const configuration = normalizeUnitConfiguration(serialized, []);
    const { equipment, unrecoveredCriticalSlots } = mapEquipmentWithDiagnostics(
      serialized.equipment,
      mapTechBase(serialized.techBase),
      mapTechBaseMode(serialized.techBase),
      serialized.criticalSlots,
      serialized.tonnage,
      serialized.isOmni === true,
      configuration,
    );
    return {
      ...createUnitSession(
        {
          ...configuration,
          equipment,
          bvContext: configuration.bvContext
            ? { ...configuration.bvContext, equipment }
            : undefined,
        },
        { id: uuidv4(), createdAt: Date.now() },
        sourceDefinition ?? serialized.sourceDefinition,
      ),
      unrecoveredCriticalSlots,
    };
  }
}

// Singleton instance
export const unitLoaderService = new UnitLoaderService();
