import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';

import {
  MTF_SLOTS_PER_LOCATION,
  formatArmorType,
  formatConfig,
  formatEngineType,
  formatEquipmentName,
  formatHeatSinkType,
  formatRulesLevel,
  formatStructureType,
  formatTechBase,
  getLocationDisplayName,
  getLocationOrder,
  writeArmorValues,
  writeFluff,
  writeLicenseHeader,
} from './MTFExportHelpers';

export interface IMTFExportResult {
  readonly success: boolean;
  readonly content?: string;
  readonly errors: string[];
}

export class MTFExportService {
  export(unit: ISerializedUnit): IMTFExportResult {
    const errors: string[] = [];

    try {
      const lines: string[] = [];

      writeLicenseHeader(lines);

      lines.push(`chassis:${unit.chassis}`);
      lines.push(`model:${unit.model}`);

      if (unit.clanName) {
        lines.push(`clanname:${unit.clanName}`);
      }

      const extendedUnit = unit as ISerializedUnit & {
        mulId?: number;
        role?: string;
        source?: string;
      };

      if (extendedUnit.mulId) {
        lines.push(`mul id:${extendedUnit.mulId}`);
      }

      lines.push(`Config:${formatConfig(unit.configuration, unit.isOmni)}`);
      lines.push(`techbase:${formatTechBase(unit.techBase)}`);
      lines.push(`era:${unit.year}`);

      if (extendedUnit.source) {
        lines.push(`source:${extendedUnit.source}`);
      }

      lines.push(`rules level:${formatRulesLevel(unit.rulesLevel)}`);

      if (extendedUnit.role) {
        lines.push(`role:${extendedUnit.role}`);
      }

      lines.push('');
      lines.push('');

      if (unit.quirks && unit.quirks.length > 0) {
        for (const quirk of unit.quirks) {
          lines.push(`quirk:${quirk}`);
        }
        lines.push('');
        lines.push('');
      }

      lines.push(`mass:${unit.tonnage}`);
      lines.push(
        `engine:${unit.engine.rating} ${formatEngineType(unit.engine.type)}`,
      );
      lines.push(`structure:${formatStructureType(unit.structure.type)}`);
      lines.push('myomer:Standard');
      lines.push('');

      lines.push(
        `heat sinks:${unit.heatSinks.count} ${formatHeatSinkType(unit.heatSinks.type)}`,
      );
      if (unit.isOmni && unit.baseChassisHeatSinks !== undefined) {
        lines.push(`Base Chassis Heat Sinks:${unit.baseChassisHeatSinks}`);
      }
      lines.push(`walk mp:${unit.movement.walk}`);
      lines.push(`jump mp:${unit.movement.jump}`);
      lines.push('');

      lines.push(`armor:${formatArmorType(unit.armor.type)}`);
      writeArmorValues(lines, unit.armor.allocation, unit.configuration);
      lines.push('');

      const weaponCount = unit.equipment.length;
      lines.push(`Weapons:${weaponCount}`);
      for (const eq of unit.equipment) {
        let name = formatEquipmentName(eq.id);
        if (eq.isOmniPodMounted) {
          name = `${name} (omnipod)`;
        }
        const location = getLocationDisplayName(eq.location);
        lines.push(`${name}, ${location}`);
      }
      lines.push('');

      const locationOrder = getLocationOrder(unit.configuration);
      for (const location of locationOrder) {
        lines.push(`${getLocationDisplayName(location)}:`);
        const slots = unit.criticalSlots[location] || [];

        for (const slot of slots) {
          if (slot === null) {
            lines.push('-Empty-');
          } else {
            lines.push(slot);
          }
        }

        for (let i = slots.length; i < MTF_SLOTS_PER_LOCATION; i++) {
          lines.push('-Empty-');
        }
        lines.push('');
      }

      if (unit.fluff) {
        writeFluff(lines, unit.fluff);
      }

      lines.push('');

      return {
        success: true,
        content: lines.join('\n'),
        errors,
      };
    } catch (e) {
      errors.push(`Export error: ${e}`);
      return { success: false, errors };
    }
  }
}

const mtfExportServiceFactory: SingletonFactory<MTFExportService> =
  createSingleton((): MTFExportService => new MTFExportService());

export function getMTFExportService(): MTFExportService {
  return mtfExportServiceFactory.get();
}

export function resetMTFExportService(): void {
  mtfExportServiceFactory.reset();
}
