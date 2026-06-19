/**
 * Unit Loader Service - Main Service Class
 *
 * Core service for loading units from canonical or custom sources and
 * mapping them to UnitState format for the customizer.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { v4 as uuidv4 } from 'uuid';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { UnitState, createEmptySelectionMemory } from '@/stores/unitState';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  LAMMode,
  QuadVeeMode,
} from '@/types/construction/MechConfigurationSystem';
import { createDefaultComponentTechBases } from '@/types/construction/TechBaseConfiguration';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';
import { JumpJetType } from '@/utils/construction/movementCalculations';

import { getCanonicalUnitService } from '../CanonicalUnitService';
import { customUnitApiService } from '../CustomUnitApiService';
import { calculateArmorTonnage } from './armorCalculations';
import {
  mapEngineType,
  mapGyroType,
  mapStructureType,
  mapCockpitType,
  mapHeatSinkType,
  mapArmorType,
  mapTechBase,
  mapTechBaseMode,
  mapRulesLevel,
  mapArmorAllocation,
} from './componentMappers';
import { mapEquipment } from './equipmentMapping';
import { hasSerializedUnitStructure } from './typeGuards';
import { IRawSerializedUnit, UnitSource, ILoadUnitResult } from './types';
import { resolveRawUnit, safeParseUnit } from './unitContractAdapter';

interface IUnitTechBaseContext {
  readonly techBaseMode: UnitState['techBaseMode'];
  readonly techBase: TechBase;
}

type UnitIdentityState = Pick<
  UnitState,
  | 'id'
  | 'name'
  | 'chassis'
  | 'clanName'
  | 'model'
  | 'mulId'
  | 'year'
  | 'rulesLevel'
  | 'tonnage'
  | 'techBase'
>;

type UnitConfigurationState = Pick<
  UnitState,
  | 'unitType'
  | 'configuration'
  | 'lamMode'
  | 'quadVeeMode'
  | 'isOmni'
  | 'baseChassisHeatSinks'
  | 'techBaseMode'
  | 'componentTechBases'
  | 'selectionMemory'
>;

type EngineState = Pick<UnitState, 'engineType' | 'engineRating'>;
type HeatSinkState = Pick<UnitState, 'heatSinkType' | 'heatSinkCount'>;
type ArmorState = Pick<
  UnitState,
  'armorType' | 'armorTonnage' | 'armorAllocation'
>;

function deriveTechBaseContext(
  serialized: IRawSerializedUnit,
): IUnitTechBaseContext {
  return {
    techBaseMode: mapTechBaseMode(serialized.techBase),
    techBase: mapTechBase(serialized.techBase),
  };
}

function deriveEngineState(
  serialized: IRawSerializedUnit,
  techBase: TechBase,
): EngineState {
  const engineType = serialized.engine?.type
    ? mapEngineType(serialized.engine.type, techBase)
    : EngineType.STANDARD;
  const engineRating =
    serialized.engine?.rating ??
    (serialized.movement?.walk ?? 4) * serialized.tonnage;

  return { engineType, engineRating };
}

function deriveGyroType(serialized: IRawSerializedUnit): GyroType {
  return serialized.gyro?.type
    ? mapGyroType(serialized.gyro.type)
    : GyroType.STANDARD;
}

function deriveStructureType(
  serialized: IRawSerializedUnit,
  techBase: TechBase,
): InternalStructureType {
  return serialized.structure?.type
    ? mapStructureType(serialized.structure.type, techBase)
    : InternalStructureType.STANDARD;
}

function deriveCockpitType(serialized: IRawSerializedUnit): CockpitType {
  return serialized.cockpit
    ? mapCockpitType(serialized.cockpit)
    : CockpitType.STANDARD;
}

function deriveHeatSinkState(serialized: IRawSerializedUnit): HeatSinkState {
  return {
    heatSinkType: serialized.heatSinks?.type
      ? mapHeatSinkType(serialized.heatSinks.type)
      : HeatSinkType.SINGLE,
    heatSinkCount: serialized.heatSinks?.count ?? 10,
  };
}

function deriveArmorState(
  serialized: IRawSerializedUnit,
  techBase: TechBase,
): ArmorState {
  const armorType = serialized.armor?.type
    ? mapArmorType(serialized.armor.type, techBase)
    : ArmorTypeEnum.STANDARD;
  const armorAllocation = mapArmorAllocation(serialized.armor?.allocation);

  return {
    armorType,
    armorAllocation,
    armorTonnage: calculateArmorTonnage(armorAllocation, armorType),
  };
}

function deriveRulesLevel(serialized: IRawSerializedUnit): RulesLevel {
  return serialized.rulesLevel
    ? mapRulesLevel(serialized.rulesLevel)
    : RulesLevel.STANDARD;
}

function deriveModel(serialized: IRawSerializedUnit): string {
  return serialized.model ?? serialized.variant ?? '';
}

function deriveIdentityState(
  serialized: IRawSerializedUnit,
  model: string,
  rulesLevel: RulesLevel,
  techBase: TechBase,
): UnitIdentityState {
  return {
    id: uuidv4(),
    name: `${serialized.chassis}${model ? ' ' + model : ''}`,
    chassis: serialized.chassis,
    clanName: '',
    model,
    mulId: String(serialized.mulId ?? -1),
    year: serialized.year ?? 3025,
    rulesLevel,
    tonnage: serialized.tonnage,
    techBase,
  };
}

function deriveConfigurationState(
  serialized: IRawSerializedUnit,
  techBase: TechBase,
  techBaseMode: UnitState['techBaseMode'],
): UnitConfigurationState {
  return {
    unitType: (serialized.unitType as UnitType) || 'BattleMech',
    configuration: (serialized.configuration as MechConfiguration) || 'Biped',
    lamMode: LAMMode.MECH,
    quadVeeMode: QuadVeeMode.MECH,
    isOmni: serialized.isOmni ?? false,
    baseChassisHeatSinks: serialized.baseChassisHeatSinks ?? -1,
    techBaseMode,
    componentTechBases: createDefaultComponentTechBases(techBase),
    selectionMemory: createEmptySelectionMemory(),
  };
}

function unitLoadErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
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

  /**
   * Load a canonical unit by ID
   */
  async loadCanonicalUnit(id: string): Promise<ILoadUnitResult> {
    try {
      // Ensure equipment is loaded before mapping
      await this.ensureEquipmentInitialized();

      const fullUnit = await getCanonicalUnitService().getById(id);

      if (!fullUnit) {
        return { success: false, error: `Canonical unit "${id}" not found` };
      }

      // Schema-bridge boundary: surface drift between on-disk shape and
      // `UnitContract` as a dev-mode warning. We use `safeParseUnit` (not
      // `parseUnit`) so test fixtures and partial mock data don't throw —
      // the corpus-wide strict gate runs in `unit.contract.test.ts` and CI.
      const parseResult = safeParseUnit(fullUnit);
      if (!parseResult.success && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(
          `[unitLoader] UnitContract drift on canonical:${id} — ${parseResult.error?.message ?? 'unknown'}`,
        );
      }
      const state = this.mapToUnitState(
        resolveRawUnit(parseResult, fullUnit),
        true,
      );
      return { success: true, state };
    } catch (error) {
      return {
        success: false,
        error: unitLoadErrorMessage(error, 'Failed to load canonical unit'),
      };
    }
  }

  /**
   * Load a custom unit by ID
   */
  async loadCustomUnit(id: string): Promise<ILoadUnitResult> {
    try {
      // Ensure equipment is loaded before mapping
      await this.ensureEquipmentInitialized();

      const fullUnit = await customUnitApiService.getById(id);

      if (!fullUnit) {
        return { success: false, error: `Custom unit "${id}" not found` };
      }

      // Custom units may already be in UnitState format (saved from customizer)
      // or in serialized format (imported). The structural pre-check stays
      // because UnitState has a different shape (no top-level `tonnage`/
      // `techBase` etc.) and `parseUnit` would reject it — that's the wrong
      // failure mode for already-customizer-saved units which the loader
      // currently silently passes through. Once UnitState gets its own
      // contract this branch can collapse into a single parse.
      if (!hasSerializedUnitStructure(fullUnit)) {
        return {
          success: false,
          error: 'Custom unit data is not in serialized format',
        };
      }
      // Schema-bridge boundary for serialized-format custom units. Same
      // dev-only-warn pattern as canonical — strict drift detection is
      // owned by the corpus contract test, not the runtime loader.
      const parseResult = safeParseUnit(fullUnit);
      if (!parseResult.success && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(
          `[unitLoader] UnitContract drift on custom:${id} — ${parseResult.error?.message ?? 'unknown'}`,
        );
      }
      const state = this.mapToUnitState(
        resolveRawUnit(parseResult, fullUnit),
        false,
      );
      return { success: true, state };
    } catch (error) {
      return {
        success: false,
        error: unitLoadErrorMessage(error, 'Failed to load custom unit'),
      };
    }
  }

  /**
   * Load a unit from either source
   */
  async loadUnit(id: string, source: UnitSource): Promise<ILoadUnitResult> {
    if (source === 'canonical') {
      return this.loadCanonicalUnit(id);
    } else {
      return this.loadCustomUnit(id);
    }
  }

  /**
   * Map serialized unit JSON to UnitState
   */
  mapToUnitState(
    serialized: IRawSerializedUnit,
    _isCanonical: boolean,
  ): UnitState {
    const { techBaseMode, techBase } = deriveTechBaseContext(serialized);
    const model = deriveModel(serialized);
    const rulesLevel = deriveRulesLevel(serialized);
    const equipment = mapEquipment(
      serialized.equipment,
      techBase,
      techBaseMode,
      serialized.criticalSlots,
    );

    return {
      ...deriveIdentityState(serialized, model, rulesLevel, techBase),
      ...deriveConfigurationState(serialized, techBase, techBaseMode),
      ...deriveEngineState(serialized, techBase),
      gyroType: deriveGyroType(serialized),
      internalStructureType: deriveStructureType(serialized, techBase),
      cockpitType: deriveCockpitType(serialized),
      ...deriveHeatSinkState(serialized),
      ...deriveArmorState(serialized, techBase),
      enhancement: null,
      jumpMP: serialized.movement?.jump ?? 0,
      jumpJetType: JumpJetType.STANDARD,
      equipment,
      isModified: false,
      createdAt: Date.now(),
      lastModifiedAt: Date.now(),
    };
  }
}

// Singleton instance
export const unitLoaderService = new UnitLoaderService();
