/**
 * Unit Loader Service - Main Service Class
 *
 * Core service for loading units from canonical or custom sources and
 * mapping them to UnitState format for the customizer.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { v4 as uuidv4 } from 'uuid';

import { equipmentLookupService } from '@/services/equipment/EquipmentLookupService';
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
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';
import { JumpJetType } from '@/utils/construction/movementCalculations';

import { canonicalUnitService } from '../CanonicalUnitService';
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
import { parseUnit, UnitContractParseError } from './unitContractAdapter';

/**
 * Unit Loader Service
 */
export class UnitLoaderService {
  /**
   * Ensure equipment services are initialized for ID resolution
   */
  private async ensureEquipmentInitialized(): Promise<void> {
    // Initialize equipment lookup service (loads JSON equipment data)
    await equipmentLookupService.initialize();

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

      const fullUnit = await canonicalUnitService.getById(id);

      if (!fullUnit) {
        return { success: false, error: `Canonical unit "${id}" not found` };
      }

      // Schema-bridge boundary: route the fetched JSON through `parseUnit`
      // so any drift between the on-disk shape and `UnitContract` surfaces
      // here with a Zod issue path instead of silently producing a
      // malformed `UnitState` deep inside the mapper. The full BattleMech
      // corpus is verified by `unit.contract.test.ts` so this should be
      // a no-op for canonical data; if a hand-edited unit JSON regresses
      // we want to know loudly.
      const validated = parseUnit(fullUnit, `canonical:${id}`);
      const state = this.mapToUnitState(validated, true);
      return { success: true, state };
    } catch (error) {
      if (error instanceof UnitContractParseError) {
        return { success: false, error: error.message };
      }
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load canonical unit';
      return { success: false, error: message };
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
      // Schema-bridge boundary for serialized-format custom units (the
      // shape we just structurally narrowed to). Same drift-catch guarantee
      // as the canonical path: any field that doesn't conform to
      // `UnitContract` fails here with a Zod issue path.
      const validated = parseUnit(fullUnit, `custom:${id}`);
      const state = this.mapToUnitState(validated, false);
      return { success: true, state };
    } catch (error) {
      if (error instanceof UnitContractParseError) {
        return { success: false, error: error.message };
      }
      const message =
        error instanceof Error ? error.message : 'Failed to load custom unit';
      return { success: false, error: message };
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
    // Determine unit tech base mode first (mixed tech applies at unit level)
    const techBaseMode = mapTechBaseMode(serialized.techBase);
    // Determine binary tech base for component mappings (per spec, components are binary)
    const techBase = mapTechBase(serialized.techBase);

    // Map engine
    const engineType = serialized.engine?.type
      ? mapEngineType(serialized.engine.type, techBase)
      : EngineType.STANDARD;
    const engineRating =
      serialized.engine?.rating ??
      (serialized.movement?.walk ?? 4) * serialized.tonnage;

    // Map gyro
    const gyroType = serialized.gyro?.type
      ? mapGyroType(serialized.gyro.type)
      : GyroType.STANDARD;

    // Map structure
    const internalStructureType = serialized.structure?.type
      ? mapStructureType(serialized.structure.type, techBase)
      : InternalStructureType.STANDARD;

    // Map cockpit
    const cockpitType = serialized.cockpit
      ? mapCockpitType(serialized.cockpit)
      : CockpitType.STANDARD;

    // Map heat sinks
    const heatSinkType = serialized.heatSinks?.type
      ? mapHeatSinkType(serialized.heatSinks.type)
      : HeatSinkType.SINGLE;
    const heatSinkCount = serialized.heatSinks?.count ?? 10;

    // Map armor
    const armorType = serialized.armor?.type
      ? mapArmorType(serialized.armor.type, techBase)
      : ArmorTypeEnum.STANDARD;
    const armorAllocation = mapArmorAllocation(serialized.armor?.allocation);
    const armorTonnage = calculateArmorTonnage(armorAllocation, armorType);

    // Map equipment (uses tech base mode + criticalSlots hints for mixed-tech variants)
    const equipment = mapEquipment(
      serialized.equipment,
      techBase,
      techBaseMode,
      serialized.criticalSlots,
    );

    // Determine rules level
    const rulesLevel = serialized.rulesLevel
      ? mapRulesLevel(serialized.rulesLevel)
      : RulesLevel.STANDARD;

    // Get model/variant - canonical uses 'model', custom may use 'variant'
    const model = serialized.model ?? serialized.variant ?? '';

    // Create the full UnitState
    const state: UnitState = {
      // Identity - use a NEW ID for loaded units (they're copies in the customizer)
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

      // Configuration
      unitType: (serialized.unitType as UnitType) || 'BattleMech',
      configuration: (serialized.configuration as MechConfiguration) || 'Biped',
      lamMode: LAMMode.MECH, // Default to Mech mode
      quadVeeMode: QuadVeeMode.MECH, // Default to Mech mode
      isOmni: serialized.isOmni ?? false,
      baseChassisHeatSinks: serialized.baseChassisHeatSinks ?? -1, // -1 = not set, use engine integral heat sinks
      techBaseMode,
      componentTechBases: createDefaultComponentTechBases(techBase),
      selectionMemory: createEmptySelectionMemory(),

      // Components
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      heatSinkType,
      heatSinkCount,
      armorType,
      armorTonnage,
      armorAllocation,
      enhancement: null,
      jumpMP: serialized.movement?.jump ?? 0,
      jumpJetType: JumpJetType.STANDARD,

      // Equipment
      equipment,

      // Metadata
      isModified: false,
      createdAt: Date.now(),
      lastModifiedAt: Date.now(),
    };

    return state;
  }
}

// Singleton instance
export const unitLoaderService = new UnitLoaderService();
