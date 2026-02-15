import type { AerospaceState } from '@/stores/aerospaceState';
import type { BattleArmorState } from '@/stores/battleArmorState';
import type { InfantryState } from '@/stores/infantryState';
import type { ProtoMechState } from '@/stores/protoMechState';
import type { VehicleState } from '@/stores/vehicleState';

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';

import { IBlkExportResult } from './BlkExportServiceCore';
import {
  formatMotionType,
  formatBAMotionType,
  formatBAChassisType,
  formatBAWeightClass,
  formatInfantryMotionType,
  formatTechType,
  formatEngineTypeCode,
  formatArmorTypeCode,
  formatArmorTechCode,
  formatVehicleArmor,
  formatAerospaceArmor,
  formatProtoMechArmor,
} from './BlkExportServiceCore.formatters';
import {
  tag,
  writeLicenseHeader,
  writeVehicleEquipment,
  writeAerospaceEquipment,
  writeBattleArmorEquipment,
  writeProtoMechEquipment,
} from './BlkExportServiceCore.writers';

function getVehicleUnitTypeString(unit: VehicleState): string {
  if (unit.unitType === UnitType.VTOL) return 'VTOL';
  if (unit.unitType === UnitType.SUPPORT_VEHICLE) return 'SupportTank';
  return 'Tank';
}

export function exportVehicle(unit: VehicleState): IBlkExportResult {
  const errors: string[] = [];
  const lines: string[] = [];

  try {
    writeLicenseHeader(lines);

    lines.push(tag('BlockVersion', '1'));
    lines.push(tag('Version', 'MAM0'));
    lines.push(tag('UnitType', getVehicleUnitTypeString(unit)));
    lines.push(tag('Name', unit.chassis));
    lines.push(tag('Model', unit.model));
    if (unit.mulId !== '-1') {
      lines.push(tag('mul id:', unit.mulId));
    }
    lines.push('');

    lines.push(tag('year', unit.year.toString()));
    lines.push(tag('type', formatTechType(unit.techBase, unit.rulesLevel)));
    lines.push(tag('role', 'Undefined'));
    lines.push('');

    lines.push(tag('motion_type', formatMotionType(unit.motionType)));
    lines.push('');

    lines.push(tag('Tonnage', unit.tonnage.toString()));
    lines.push(tag('cruiseMP', unit.cruiseMP.toString()));
    lines.push('');

    lines.push(tag('engine_type', formatEngineTypeCode(unit.engineType)));
    lines.push('');

    lines.push(tag('armor_type', formatArmorTypeCode(unit.armorType)));
    lines.push(tag('armor_tech', formatArmorTechCode(unit.techBase)));
    lines.push('');

    const isVTOL = unit.unitType === UnitType.VTOL;
    lines.push(tag('armor', formatVehicleArmor(unit.armorAllocation, isVTOL)));
    lines.push('');

    writeVehicleEquipment(lines, unit);

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

export function exportAerospace(unit: AerospaceState): IBlkExportResult {
  const errors: string[] = [];
  const lines: string[] = [];

  try {
    writeLicenseHeader(lines);

    lines.push(tag('BlockVersion', '1'));
    lines.push(tag('Version', 'MAM0'));
    lines.push(
      tag(
        'UnitType',
        unit.unitType === UnitType.CONVENTIONAL_FIGHTER
          ? 'ConvFighter'
          : 'Aero',
      ),
    );
    lines.push(tag('Name', unit.chassis));
    lines.push(tag('Model', unit.model));
    if (unit.mulId !== '-1') {
      lines.push(tag('mul id:', unit.mulId));
    }
    lines.push('');

    lines.push(tag('year', unit.year.toString()));
    lines.push(tag('type', formatTechType(unit.techBase, unit.rulesLevel)));
    lines.push(tag('role', 'Undefined'));
    lines.push('');

    lines.push(tag('Tonnage', unit.tonnage.toString()));
    lines.push(tag('SafeThrust', unit.safeThrust.toString()));
    lines.push('');

    lines.push(tag('engine_type', formatEngineTypeCode(unit.engineType)));
    lines.push('');

    lines.push(tag('heatsinks', unit.heatSinks.toString()));
    lines.push(tag('sink_type', unit.doubleHeatSinks ? '1' : '0'));
    lines.push('');

    lines.push(tag('fuel', unit.fuel.toString()));
    lines.push(
      tag('structural_integrity', unit.structuralIntegrity.toString()),
    );
    lines.push('');

    lines.push(tag('armor_type', formatArmorTypeCode(unit.armorType)));
    lines.push(tag('armor_tech', formatArmorTechCode(unit.techBase)));
    lines.push('');

    lines.push(tag('armor', formatAerospaceArmor(unit.armorAllocation)));
    lines.push('');

    writeAerospaceEquipment(lines, unit);

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

export function exportBattleArmor(unit: BattleArmorState): IBlkExportResult {
  const errors: string[] = [];
  const lines: string[] = [];

  try {
    writeLicenseHeader(lines);

    lines.push(tag('BlockVersion', '1'));
    lines.push(tag('Version', 'MAM0'));
    lines.push(tag('UnitType', 'BattleArmor'));
    lines.push(tag('Name', unit.chassis));
    lines.push(tag('Model', unit.model));
    if (unit.mulId !== '-1') {
      lines.push(tag('mul id:', unit.mulId));
    }
    lines.push('');

    lines.push(tag('year', unit.year.toString()));
    lines.push(tag('type', formatTechType(unit.techBase, unit.rulesLevel)));
    lines.push(tag('role', 'Undefined'));
    lines.push('');

    lines.push(tag('chassis', formatBAChassisType(unit.chassisType)));
    lines.push(tag('Trooper Count', unit.squadSize.toString()));
    lines.push(tag('weightclass', formatBAWeightClass(unit.weightClass)));
    lines.push('');

    lines.push(tag('motion_type', formatBAMotionType(unit.motionType)));
    lines.push(tag('cruiseMP', unit.groundMP.toString()));
    if (unit.jumpMP > 0) {
      lines.push(tag('jumpingMP', unit.jumpMP.toString()));
    }
    lines.push('');

    lines.push(tag('armor_type', unit.armorType.toString()));
    lines.push(tag('armor', unit.armorPerTrooper.toString()));
    lines.push('');

    writeBattleArmorEquipment(lines, unit);

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

export function exportInfantry(unit: InfantryState): IBlkExportResult {
  const errors: string[] = [];
  const lines: string[] = [];

  try {
    writeLicenseHeader(lines);

    lines.push(tag('BlockVersion', '1'));
    lines.push(tag('Version', 'MAM0'));
    lines.push(tag('UnitType', 'Infantry'));
    lines.push(tag('Name', unit.chassis));
    lines.push(tag('Model', unit.model));
    if (unit.mulId !== '-1') {
      lines.push(tag('mul id:', unit.mulId));
    }
    lines.push('');

    lines.push(tag('year', unit.year.toString()));
    lines.push(tag('type', formatTechType(unit.techBase, unit.rulesLevel)));
    lines.push('');

    lines.push(tag('squad_size', unit.squadSize.toString()));
    lines.push(tag('squadn', unit.numberOfSquads.toString()));
    lines.push(tag('motion_type', formatInfantryMotionType(unit.motionType)));
    lines.push('');

    if (unit.primaryWeapon) {
      lines.push(tag('Primary', unit.primaryWeapon));
    }
    if (unit.secondaryWeapon) {
      lines.push(tag('Secondary', unit.secondaryWeapon));
      lines.push(tag('secondn', unit.secondaryWeaponCount.toString()));
    }
    lines.push('');

    if (unit.armorKit && unit.armorKit !== InfantryArmorKit.NONE) {
      lines.push(tag('armorKit', unit.armorKit));
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

export function exportProtoMech(unit: ProtoMechState): IBlkExportResult {
  const errors: string[] = [];
  const lines: string[] = [];

  try {
    writeLicenseHeader(lines);

    lines.push(tag('BlockVersion', '1'));
    lines.push(tag('Version', 'MAM0'));
    lines.push(tag('UnitType', 'ProtoMech'));
    lines.push(tag('Name', unit.chassis));
    lines.push(tag('Model', unit.model));
    if (unit.mulId !== '-1') {
      lines.push(tag('mul id:', unit.mulId));
    }
    lines.push('');

    lines.push(tag('year', unit.year.toString()));
    lines.push(tag('type', formatTechType(unit.techBase, unit.rulesLevel)));
    lines.push('');

    lines.push(tag('Tonnage', unit.tonnage.toString()));
    lines.push(tag('cruiseMP', unit.cruiseMP.toString()));
    if (unit.jumpMP > 0) {
      lines.push(tag('jumpingMP', unit.jumpMP.toString()));
    }
    lines.push('');

    lines.push(tag('armor', formatProtoMechArmor(unit)));
    lines.push('');

    writeProtoMechEquipment(lines, unit);

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
