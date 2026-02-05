/**
 * BLK Export Service
 *
 * Serializes unit state back to BLK (Building Block) format for round-trip validation
 * and file export. Supports vehicles, aerospace, battle armor, infantry, and protomechs.
 *
 * @spec openspec/changes/add-unit-export-integration/tasks.md
 * @see BlkParserService for the corresponding import/parser
 */

import { AerospaceState } from '@/stores/aerospaceState';
import { BattleArmorState } from '@/stores/battleArmorState';
import { InfantryState } from '@/stores/infantryState';
import { ProtoMechState } from '@/stores/protoMechState';
import { VehicleState } from '@/stores/vehicleState';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { EngineType } from '@/types/construction/EngineType';
import {
  VehicleLocation,
  VTOLLocation,
  AerospaceLocation,
  ProtoMechLocation,
} from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import {
  GroundMotionType,
  SquadMotionType,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
  InfantryArmorKit,
} from '@/types/unit/PersonnelInterfaces';

/**
 * Result of exporting to BLK format
 */
export interface IBlkExportResult {
  readonly success: boolean;
  readonly content?: string;
  readonly errors: string[];
}

/**
 * Union type for all exportable unit states
 */
export type ExportableUnitState =
  | VehicleState
  | AerospaceState
  | BattleArmorState
  | InfantryState
  | ProtoMechState;

/**
 * BLK Export Service
 */
export class BlkExportService {
  private static instance: BlkExportService | null = null;

  private constructor() {}

  static getInstance(): BlkExportService {
    if (!BlkExportService.instance) {
      BlkExportService.instance = new BlkExportService();
    }
    return BlkExportService.instance;
  }

  /**
   * Export unit state to BLK format string
   */
  export(unit: ExportableUnitState): IBlkExportResult {
    const errors: string[] = [];

    try {
      const unitType = unit.unitType;

      // Vehicle types
      if (
        unitType === UnitType.VEHICLE ||
        unitType === UnitType.VTOL ||
        unitType === UnitType.SUPPORT_VEHICLE
      ) {
        return this.exportVehicle(unit as VehicleState);
      }

      // Aerospace types
      if (
        unitType === UnitType.AEROSPACE ||
        unitType === UnitType.CONVENTIONAL_FIGHTER
      ) {
        return this.exportAerospace(unit as AerospaceState);
      }

      // Battle Armor
      if (unitType === UnitType.BATTLE_ARMOR) {
        return this.exportBattleArmor(unit as BattleArmorState);
      }

      // Infantry
      if (unitType === UnitType.INFANTRY) {
        return this.exportInfantry(unit as InfantryState);
      }

      // ProtoMech
      if (unitType === UnitType.PROTOMECH) {
        return this.exportProtoMech(unit as ProtoMechState);
      }

      // Unsupported type
      errors.push(`Unsupported unit type for BLK export: ${unitType}`);
      return { success: false, errors };
    } catch (e) {
      errors.push(`Export error: ${e}`);
      return { success: false, errors };
    }
  }

  /**
   * Export vehicle state to BLK format
   */
  private exportVehicle(unit: VehicleState): IBlkExportResult {
    const errors: string[] = [];
    const lines: string[] = [];

    try {
      // License header
      this.writeLicenseHeader(lines);

      // Core tags
      lines.push(this.tag('BlockVersion', '1'));
      lines.push(this.tag('Version', 'MAM0'));
      lines.push(this.tag('UnitType', this.getVehicleUnitTypeString(unit)));
      lines.push(this.tag('Name', unit.chassis));
      lines.push(this.tag('Model', unit.model));
      if (unit.mulId !== '-1') {
        lines.push(this.tag('mul id:', unit.mulId));
      }
      lines.push('');

      // Year and tech
      lines.push(this.tag('year', unit.year.toString()));
      lines.push(
        this.tag('type', this.formatTechType(unit.techBase, unit.rulesLevel)),
      );
      lines.push(this.tag('role', 'Undefined')); // TODO: Add role to VehicleState
      lines.push('');

      // Motion type
      lines.push(
        this.tag('motion_type', this.formatMotionType(unit.motionType)),
      );
      lines.push('');

      // Tonnage and movement
      lines.push(this.tag('Tonnage', unit.tonnage.toString()));
      lines.push(this.tag('cruiseMP', unit.cruiseMP.toString()));
      lines.push('');

      // Engine
      lines.push(
        this.tag('engine_type', this.formatEngineTypeCode(unit.engineType)),
      );
      lines.push('');

      // Armor
      lines.push(
        this.tag('armor_type', this.formatArmorTypeCode(unit.armorType)),
      );
      lines.push(
        this.tag('armor_tech', this.formatArmorTechCode(unit.techBase)),
      );
      lines.push('');

      // Armor values
      const isVTOL = unit.unitType === UnitType.VTOL;
      lines.push(
        this.tag(
          'armor',
          this.formatVehicleArmor(unit.armorAllocation, isVTOL),
        ),
      );
      lines.push('');

      // Equipment by location
      this.writeVehicleEquipment(lines, unit);

      return {
        success: true,
        content: lines.join('\n'),
        errors,
      };
    } catch (e) {
      errors.push(`Vehicle export error: ${e}`);
      return { success: false, errors };
    }
  }

  /**
   * Export aerospace state to BLK format
   */
  private exportAerospace(unit: AerospaceState): IBlkExportResult {
    const errors: string[] = [];
    const lines: string[] = [];

    try {
      // License header
      this.writeLicenseHeader(lines);

      // Core tags
      lines.push(this.tag('BlockVersion', '1'));
      lines.push(this.tag('Version', 'MAM0'));
      lines.push(
        this.tag(
          'UnitType',
          unit.unitType === UnitType.CONVENTIONAL_FIGHTER
            ? 'ConvFighter'
            : 'Aero',
        ),
      );
      lines.push(this.tag('Name', unit.chassis));
      lines.push(this.tag('Model', unit.model));
      if (unit.mulId !== '-1') {
        lines.push(this.tag('mul id:', unit.mulId));
      }
      lines.push('');

      // Year and tech
      lines.push(this.tag('year', unit.year.toString()));
      lines.push(
        this.tag('type', this.formatTechType(unit.techBase, unit.rulesLevel)),
      );
      lines.push(this.tag('role', 'Undefined')); // TODO: Add role to AerospaceState
      lines.push('');

      // Tonnage and movement
      lines.push(this.tag('Tonnage', unit.tonnage.toString()));
      lines.push(this.tag('SafeThrust', unit.safeThrust.toString()));
      lines.push('');

      // Engine
      lines.push(
        this.tag('engine_type', this.formatEngineTypeCode(unit.engineType)),
      );
      lines.push('');

      // Heat sinks
      lines.push(this.tag('heatsinks', unit.heatSinks.toString()));
      lines.push(this.tag('sink_type', unit.doubleHeatSinks ? '1' : '0'));
      lines.push('');

      // Fuel and SI
      lines.push(this.tag('fuel', unit.fuel.toString()));
      lines.push(
        this.tag('structural_integrity', unit.structuralIntegrity.toString()),
      );
      lines.push('');

      // Armor
      lines.push(
        this.tag('armor_type', this.formatArmorTypeCode(unit.armorType)),
      );
      lines.push(
        this.tag('armor_tech', this.formatArmorTechCode(unit.techBase)),
      );
      lines.push('');

      // Armor values (Nose, Left Wing, Right Wing, Aft)
      lines.push(
        this.tag('armor', this.formatAerospaceArmor(unit.armorAllocation)),
      );
      lines.push('');

      // Equipment by arc
      this.writeAerospaceEquipment(lines, unit);

      return {
        success: true,
        content: lines.join('\n'),
        errors,
      };
    } catch (e) {
      errors.push(`Aerospace export error: ${e}`);
      return { success: false, errors };
    }
  }

  /**
   * Export battle armor state to BLK format
   */
  private exportBattleArmor(unit: BattleArmorState): IBlkExportResult {
    const errors: string[] = [];
    const lines: string[] = [];

    try {
      // License header
      this.writeLicenseHeader(lines);

      // Core tags
      lines.push(this.tag('BlockVersion', '1'));
      lines.push(this.tag('Version', 'MAM0'));
      lines.push(this.tag('UnitType', 'BattleArmor'));
      lines.push(this.tag('Name', unit.chassis));
      lines.push(this.tag('Model', unit.model));
      if (unit.mulId !== '-1') {
        lines.push(this.tag('mul id:', unit.mulId));
      }
      lines.push('');

      // Year and tech
      lines.push(this.tag('year', unit.year.toString()));
      lines.push(
        this.tag('type', this.formatTechType(unit.techBase, unit.rulesLevel)),
      );
      lines.push(this.tag('role', 'Undefined'));
      lines.push('');

      // BA-specific
      lines.push(
        this.tag('chassis', this.formatBAChassisType(unit.chassisType)),
      );
      lines.push(this.tag('Trooper Count', unit.squadSize.toString()));
      lines.push(
        this.tag('weightclass', this.formatBAWeightClass(unit.weightClass)),
      );
      lines.push('');

      // Movement
      lines.push(
        this.tag('motion_type', this.formatBAMotionType(unit.motionType)),
      );
      lines.push(this.tag('cruiseMP', unit.groundMP.toString()));
      if (unit.jumpMP > 0) {
        lines.push(this.tag('jumpingMP', unit.jumpMP.toString()));
      }
      lines.push('');

      // Armor
      lines.push(this.tag('armor_type', unit.armorType.toString()));
      lines.push(this.tag('armor', unit.armorPerTrooper.toString()));
      lines.push('');

      // Equipment
      this.writeBattleArmorEquipment(lines, unit);

      return {
        success: true,
        content: lines.join('\n'),
        errors,
      };
    } catch (e) {
      errors.push(`Battle Armor export error: ${e}`);
      return { success: false, errors };
    }
  }

  /**
   * Export infantry state to BLK format
   */
  private exportInfantry(unit: InfantryState): IBlkExportResult {
    const errors: string[] = [];
    const lines: string[] = [];

    try {
      // License header
      this.writeLicenseHeader(lines);

      // Core tags
      lines.push(this.tag('BlockVersion', '1'));
      lines.push(this.tag('Version', 'MAM0'));
      lines.push(this.tag('UnitType', 'Infantry'));
      lines.push(this.tag('Name', unit.chassis));
      lines.push(this.tag('Model', unit.model));
      if (unit.mulId !== '-1') {
        lines.push(this.tag('mul id:', unit.mulId));
      }
      lines.push('');

      // Year and tech
      lines.push(this.tag('year', unit.year.toString()));
      lines.push(
        this.tag('type', this.formatTechType(unit.techBase, unit.rulesLevel)),
      );
      lines.push('');

      // Infantry-specific
      lines.push(this.tag('squad_size', unit.squadSize.toString()));
      lines.push(this.tag('squadn', unit.numberOfSquads.toString()));
      lines.push(
        this.tag('motion_type', this.formatInfantryMotionType(unit.motionType)),
      );
      lines.push('');

      // Weapons
      if (unit.primaryWeapon) {
        lines.push(this.tag('Primary', unit.primaryWeapon));
      }
      if (unit.secondaryWeapon) {
        lines.push(this.tag('Secondary', unit.secondaryWeapon));
        lines.push(this.tag('secondn', unit.secondaryWeaponCount.toString()));
      }
      lines.push('');

      // Armor
      if (unit.armorKit && unit.armorKit !== InfantryArmorKit.NONE) {
        lines.push(this.tag('armorKit', unit.armorKit));
      }
      lines.push('');

      return {
        success: true,
        content: lines.join('\n'),
        errors,
      };
    } catch (e) {
      errors.push(`Infantry export error: ${e}`);
      return { success: false, errors };
    }
  }

  /**
   * Export protomech state to BLK format
   */
  private exportProtoMech(unit: ProtoMechState): IBlkExportResult {
    const errors: string[] = [];
    const lines: string[] = [];

    try {
      // License header
      this.writeLicenseHeader(lines);

      // Core tags
      lines.push(this.tag('BlockVersion', '1'));
      lines.push(this.tag('Version', 'MAM0'));
      lines.push(this.tag('UnitType', 'ProtoMech'));
      lines.push(this.tag('Name', unit.chassis));
      lines.push(this.tag('Model', unit.model));
      if (unit.mulId !== '-1') {
        lines.push(this.tag('mul id:', unit.mulId));
      }
      lines.push('');

      // Year and tech
      lines.push(this.tag('year', unit.year.toString()));
      lines.push(
        this.tag('type', this.formatTechType(unit.techBase, unit.rulesLevel)),
      );
      lines.push('');

      // ProtoMech-specific
      lines.push(this.tag('Tonnage', unit.tonnage.toString()));
      lines.push(this.tag('cruiseMP', unit.cruiseMP.toString()));
      if (unit.jumpMP > 0) {
        lines.push(this.tag('jumpingMP', unit.jumpMP.toString()));
      }
      lines.push('');

      // Armor (protomechs have location-based armor)
      lines.push(this.tag('armor', this.formatProtoMechArmor(unit)));
      lines.push('');

      // Equipment
      this.writeProtoMechEquipment(lines, unit);

      return {
        success: true,
        content: lines.join('\n'),
        errors,
      };
    } catch (e) {
      errors.push(`ProtoMech export error: ${e}`);
      return { success: false, errors };
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Write standard license header
   */
  private writeLicenseHeader(lines: string[]): void {
    lines.push(
      '#MegaMek Data (C) 2025 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.',
    );
    lines.push(
      '#To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/',
    );
    lines.push('#');
    lines.push('#Generated by MekStation');
    lines.push('');
  }

  /**
   * Format a BLK tag
   */
  private tag(name: string, value: string): string {
    return `<${name}>\n${value}\n</${name}>`;
  }

  /**
   * Get vehicle unit type string for BLK
   */
  private getVehicleUnitTypeString(unit: VehicleState): string {
    if (unit.unitType === UnitType.VTOL) return 'VTOL';
    if (unit.unitType === UnitType.SUPPORT_VEHICLE) return 'SupportTank';
    return 'Tank';
  }

  /**
   * Format motion type for vehicles
   */
  private formatMotionType(motionType: GroundMotionType): string {
    const map: Record<GroundMotionType, string> = {
      [GroundMotionType.TRACKED]: 'Tracked',
      [GroundMotionType.WHEELED]: 'Wheeled',
      [GroundMotionType.HOVER]: 'Hover',
      [GroundMotionType.VTOL]: 'VTOL',
      [GroundMotionType.WIGE]: 'WiGE',
      [GroundMotionType.NAVAL]: 'Naval',
      [GroundMotionType.HYDROFOIL]: 'Hydrofoil',
      [GroundMotionType.SUBMARINE]: 'Submarine',
      [GroundMotionType.RAIL]: 'Rail',
      [GroundMotionType.MAGLEV]: 'Maglev',
    };
    return map[motionType] || 'Tracked';
  }

  /**
   * Format motion type for battle armor
   */
  private formatBAMotionType(motionType: SquadMotionType): string {
    // SquadMotionType enum values are already in BLK format
    // e.g., SquadMotionType.FOOT = 'Foot', SquadMotionType.JUMP = 'Jump'
    return motionType || SquadMotionType.FOOT;
  }

  /**
   * Format chassis type for battle armor
   */
  private formatBAChassisType(chassisType: BattleArmorChassisType): string {
    // BattleArmorChassisType enum values match BLK format
    return chassisType || BattleArmorChassisType.BIPED;
  }

  /**
   * Format battle armor weight class
   */
  private formatBAWeightClass(weightClass: BattleArmorWeightClass): string {
    // Map BattleArmorWeightClass enum to BLK numeric codes
    const map: Record<BattleArmorWeightClass, string> = {
      [BattleArmorWeightClass.PA_L]: '0',
      [BattleArmorWeightClass.LIGHT]: '1',
      [BattleArmorWeightClass.MEDIUM]: '2',
      [BattleArmorWeightClass.HEAVY]: '3',
      [BattleArmorWeightClass.ASSAULT]: '4',
    };
    return map[weightClass] || '2'; // Default to medium
  }

  /**
   * Format motion type for infantry
   */
  private formatInfantryMotionType(motionType: SquadMotionType): string {
    // SquadMotionType enum values are already in BLK format
    return motionType || SquadMotionType.FOOT;
  }

  /**
   * Format tech type string (IS Level 2, Clan Level 3, etc.)
   */
  private formatTechType(techBase: TechBase, rulesLevel: RulesLevel): string {
    const base = techBase === TechBase.CLAN ? 'Clan' : 'IS';
    const levelMap: Record<RulesLevel, string> = {
      [RulesLevel.INTRODUCTORY]: 'Level 1',
      [RulesLevel.STANDARD]: 'Level 2',
      [RulesLevel.ADVANCED]: 'Level 3',
      [RulesLevel.EXPERIMENTAL]: 'Level 4',
    };
    return `${base} ${levelMap[rulesLevel] || 'Level 2'}`;
  }

  /**
   * Format engine type code
   */
  private formatEngineTypeCode(engineType: EngineType): string {
    const codes: Record<string, string> = {
      [EngineType.STANDARD]: '0',
      [EngineType.XL_IS]: '1',
      [EngineType.XL_CLAN]: '2',
      [EngineType.LIGHT]: '3',
      [EngineType.COMPACT]: '4',
      [EngineType.XXL]: '5',
      [EngineType.ICE]: '6',
      [EngineType.FUEL_CELL]: '7',
      [EngineType.FISSION]: '8',
    };
    return codes[engineType] || '0';
  }

  /**
   * Format armor type code
   */
  private formatArmorTypeCode(armorType: ArmorTypeEnum): string {
    const codes: Record<string, string> = {
      [ArmorTypeEnum.STANDARD]: '0',
      [ArmorTypeEnum.FERRO_FIBROUS_IS]: '1',
      [ArmorTypeEnum.FERRO_FIBROUS_CLAN]: '2',
      [ArmorTypeEnum.LIGHT_FERRO]: '3',
      [ArmorTypeEnum.HEAVY_FERRO]: '4',
      [ArmorTypeEnum.STEALTH]: '5',
      [ArmorTypeEnum.REACTIVE]: '6',
      [ArmorTypeEnum.REFLECTIVE]: '7',
      [ArmorTypeEnum.HARDENED]: '8',
    };
    return codes[armorType] || '0';
  }

  /**
   * Format armor tech code
   */
  private formatArmorTechCode(techBase: TechBase): string {
    return techBase === TechBase.CLAN ? '2' : '1';
  }

  /**
   * Format vehicle armor array
   */
  private formatVehicleArmor(
    allocation: Record<string, number>,
    isVTOL: boolean,
  ): string {
    const values: number[] = [
      allocation[VehicleLocation.FRONT] || 0,
      allocation[VehicleLocation.LEFT] || 0,
      allocation[VehicleLocation.RIGHT] || 0,
      allocation[VehicleLocation.REAR] || 0,
      allocation[VehicleLocation.TURRET] || 0,
    ];

    if (isVTOL) {
      values.push(allocation[VTOLLocation.ROTOR] || 0);
    }

    return values.join('\n');
  }

  /**
   * Format aerospace armor array
   */
  private formatAerospaceArmor(allocation: Record<string, number>): string {
    const values: number[] = [
      allocation[AerospaceLocation.NOSE] || 0,
      allocation[AerospaceLocation.LEFT_WING] || 0,
      allocation[AerospaceLocation.RIGHT_WING] || 0,
      allocation[AerospaceLocation.AFT] || 0,
    ];
    return values.join('\n');
  }

  /**
   * Format protomech armor array
   */
  private formatProtoMechArmor(unit: ProtoMechState): string {
    // ProtoMechs have Head, Torso, Left/Right Arm, Legs, Main Gun
    const armor = unit.armorByLocation;
    const values: number[] = [
      armor[ProtoMechLocation.HEAD] || 0,
      armor[ProtoMechLocation.TORSO] || 0,
      armor[ProtoMechLocation.LEFT_ARM] || 0,
      armor[ProtoMechLocation.RIGHT_ARM] || 0,
      armor[ProtoMechLocation.LEGS] || 0,
      armor[ProtoMechLocation.MAIN_GUN] || 0,
    ];
    return values.join('\n');
  }

  /**
   * Write vehicle equipment blocks
   */
  private writeVehicleEquipment(lines: string[], unit: VehicleState): void {
    const locationMap: Record<string, string[]> = {};

    // Group equipment by location
    for (const eq of unit.equipment) {
      const loc = eq.isTurretMounted ? 'Turret' : eq.location;
      if (!locationMap[loc]) {
        locationMap[loc] = [];
      }
      locationMap[loc].push(eq.name);
    }

    // Write each location block
    const locationOrder = ['Front', 'Left', 'Right', 'Rear', 'Turret', 'Body'];
    for (const loc of locationOrder) {
      const items = locationMap[loc];
      if (items && items.length > 0) {
        lines.push(this.tag(`${loc} Equipment`, items.join('\n')));
        lines.push('');
      }
    }
  }

  /**
   * Write aerospace equipment blocks
   */
  private writeAerospaceEquipment(lines: string[], unit: AerospaceState): void {
    const locationMap: Record<string, string[]> = {};

    // Group equipment by arc
    for (const eq of unit.equipment) {
      const loc = this.aerospaceLocationToBlockName(eq.location);
      if (!locationMap[loc]) {
        locationMap[loc] = [];
      }
      locationMap[loc].push(eq.name);
    }

    // Write each arc block
    const arcOrder = ['Nose', 'Left Wing', 'Right Wing', 'Aft'];
    for (const arc of arcOrder) {
      const items = locationMap[arc];
      if (items && items.length > 0) {
        lines.push(this.tag(`${arc} Equipment`, items.join('\n')));
        lines.push('');
      }
    }
  }

  /**
   * Convert aerospace location enum to BLK block name
   */
  private aerospaceLocationToBlockName(location: AerospaceLocation): string {
    const map: Record<AerospaceLocation, string> = {
      [AerospaceLocation.NOSE]: 'Nose',
      [AerospaceLocation.LEFT_WING]: 'Left Wing',
      [AerospaceLocation.RIGHT_WING]: 'Right Wing',
      [AerospaceLocation.AFT]: 'Aft',
      [AerospaceLocation.FUSELAGE]: 'Fuselage',
    };
    return map[location] || 'Nose';
  }

  /**
   * Write battle armor equipment blocks
   */
  private writeBattleArmorEquipment(
    lines: string[],
    unit: BattleArmorState,
  ): void {
    // BA equipment is typically per-squad or per-trooper
    if (unit.equipment && unit.equipment.length > 0) {
      const items = unit.equipment.map((eq) => eq.name);
      lines.push(this.tag('Squad Equipment', items.join('\n')));
      lines.push('');
    }
  }

  /**
   * Write protomech equipment blocks
   */
  private writeProtoMechEquipment(lines: string[], unit: ProtoMechState): void {
    const locationMap: Record<string, string[]> = {};

    // Group equipment by location
    for (const eq of unit.equipment) {
      const loc = eq.location || 'Torso';
      if (!locationMap[loc]) {
        locationMap[loc] = [];
      }
      locationMap[loc].push(eq.name);
    }

    // Write each location block
    const locationOrder = [
      'Head',
      'Torso',
      'Main Gun',
      'Left Arm',
      'Right Arm',
      'Legs',
    ];
    for (const loc of locationOrder) {
      const items = locationMap[loc];
      if (items && items.length > 0) {
        lines.push(this.tag(`${loc} Equipment`, items.join('\n')));
        lines.push('');
      }
    }
  }
}

/**
 * Get singleton instance
 */
export function getBlkExportService(): BlkExportService {
  return BlkExportService.getInstance();
}
