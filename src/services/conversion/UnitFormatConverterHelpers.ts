import { v4 as uuidv4 } from 'uuid';

import { TechBase } from '@/types/enums/TechBase';
import { ISerializedFluff } from '@/types/unit/UnitSerialization';

import { equipmentNameResolver } from './EquipmentNameResolver';
import {
  parseLocation,
  convertArmorLocations,
  parseCriticalSlots,
  SourceArmorLocation,
  SourceCriticalEntry,
} from './LocationMappings';
import {
  ConversionWarning,
  MegaMekLabEquipmentItem,
  MegaMekLabUnit,
} from './UnitFormatConverterTypes';
import { mapArmorType } from './ValueMappings';

export function generateUnitId(source: MegaMekLabUnit): string {
  if (source.mul_id) {
    return `mul-${source.mul_id}`;
  }

  const sanitized = `${source.chassis}-${source.model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return sanitized || uuidv4();
}

export function convertArmorData(
  source: {
    type: string;
    manufacturer?: string;
    locations: SourceArmorLocation[];
    total_armor_points?: number;
  },
  techBase: TechBase,
): {
  type: string;
  allocation: Record<string, number | { front: number; rear: number }>;
} {
  const armorType = mapArmorType(source.type, techBase);
  const allocation = convertArmorLocations(source.locations);

  const serializedAllocation: Record<
    string,
    number | { front: number; rear: number }
  > = {
    head: allocation.head,
    centerTorso: {
      front: allocation.centerTorso,
      rear: allocation.centerTorsoRear,
    },
    leftTorso: {
      front: allocation.leftTorso,
      rear: allocation.leftTorsoRear,
    },
    rightTorso: {
      front: allocation.rightTorso,
      rear: allocation.rightTorsoRear,
    },
    leftArm: allocation.leftArm,
    rightArm: allocation.rightArm,
    leftLeg: allocation.leftLeg,
    rightLeg: allocation.rightLeg,
  };

  return {
    type: armorType,
    allocation: serializedAllocation,
  };
}

export function convertMovementData(source: MegaMekLabUnit): {
  walk: number;
  jump: number;
  jumpJetType?: string;
  enhancements?: string[];
} {
  const walkMP =
    typeof source.walk_mp === 'string'
      ? parseInt(source.walk_mp, 10)
      : source.walk_mp;

  const jumpMP =
    typeof source.jump_mp === 'string'
      ? parseInt(source.jump_mp, 10)
      : source.jump_mp;

  const enhancements: string[] = [];
  for (const item of source.weapons_and_equipment) {
    const lowerType = item.item_type.toLowerCase();
    if (lowerType.includes('masc')) {
      enhancements.push('MASC');
    }
    if (lowerType.includes('tsm') || lowerType.includes('triplestrength')) {
      enhancements.push('TSM');
    }
    if (lowerType.includes('supercharger')) {
      enhancements.push('Supercharger');
    }
  }

  let jumpJetType: string | undefined;
  for (const item of source.weapons_and_equipment) {
    const lowerType = item.item_type.toLowerCase();
    if (lowerType.includes('improved') && lowerType.includes('jump')) {
      jumpJetType = 'Improved';
      break;
    } else if (lowerType.includes('jump')) {
      jumpJetType = 'Standard';
    }
  }

  return {
    walk: walkMP || 0,
    jump: jumpMP || 0,
    jumpJetType: jumpMP > 0 ? jumpJetType : undefined,
    enhancements: enhancements.length > 0 ? enhancements : undefined,
  };
}

function generateEquipmentId(itemType: string): string {
  return `unknown-${itemType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function convertEquipmentItems(
  items: MegaMekLabEquipmentItem[],
  unitTechBase: TechBase,
  pushWarning: (warning: ConversionWarning) => void,
): Array<{
  id: string;
  location: string;
  slots?: number[];
  isRearMounted?: boolean;
  linkedAmmo?: string;
}> {
  const result: Array<{
    id: string;
    location: string;
    slots?: number[];
    isRearMounted?: boolean;
    linkedAmmo?: string;
  }> = [];

  for (const item of items) {
    if (equipmentNameResolver.isSystemComponent(item.item_type)) {
      continue;
    }

    const itemTechBase =
      item.tech_base === 'Clan'
        ? TechBase.CLAN
        : item.tech_base === 'IS'
          ? TechBase.INNER_SPHERE
          : unitTechBase;

    const resolution = equipmentNameResolver.resolve(
      item.item_type,
      item.item_name,
      itemTechBase,
    );

    const parsedLocation = parseLocation(item.location);
    const locationStr = parsedLocation?.location || item.location;

    if (!resolution.found) {
      pushWarning({
        field: 'equipment',
        message: `Unknown equipment: ${item.item_name} (type: ${item.item_type})`,
        sourceValue: item,
      });

      result.push({
        id: generateEquipmentId(item.item_type),
        location: locationStr,
        isRearMounted: item.rear_facing || parsedLocation?.isRear,
      });
    } else {
      result.push({
        id: resolution.equipmentId!,
        location: locationStr,
        isRearMounted: item.rear_facing || parsedLocation?.isRear,
      });
    }
  }

  return result;
}

export function convertCriticalEntries(entries: SourceCriticalEntry[]): {
  [location: string]: (string | null)[];
} {
  const parsed = parseCriticalSlots(entries);
  const result: { [location: string]: (string | null)[] } = {};

  for (const entry of parsed) {
    const slots = entry.slots.map((slot) => {
      if (slot === '-Empty-' || slot === 'Empty' || slot === '') {
        return null;
      }
      return slot;
    });

    result[entry.location] = slots;
  }

  return result;
}

export function convertFluffData(
  source: MegaMekLabUnit,
): ISerializedFluff | undefined {
  if (
    !source.fluff_text &&
    !source.manufacturers &&
    !source.system_manufacturers
  ) {
    return undefined;
  }

  const fluff: Partial<{
    overview?: string;
    capabilities?: string;
    history?: string;
    deployment?: string;
    variants?: string;
    notableUnits?: string;
    manufacturer?: string;
    primaryFactory?: string;
    systemManufacturer?: Record<string, string>;
  }> = {};

  if (source.fluff_text) {
    if (source.fluff_text.overview) fluff.overview = source.fluff_text.overview;
    if (source.fluff_text.capabilities)
      fluff.capabilities = source.fluff_text.capabilities;
    if (source.fluff_text.history) fluff.history = source.fluff_text.history;
    if (source.fluff_text.deployment)
      fluff.deployment = source.fluff_text.deployment;
  }

  if (source.manufacturers && source.manufacturers.length > 0) {
    fluff.manufacturer = source.manufacturers[0].name;
    if (source.manufacturers[0].location) {
      fluff.primaryFactory = source.manufacturers[0].location;
    }
  }

  if (source.system_manufacturers && source.system_manufacturers.length > 0) {
    const systemMfrs: Record<string, string> = {};
    for (const sm of source.system_manufacturers) {
      systemMfrs[sm.type.toLowerCase()] = sm.name;
    }
    fluff.systemManufacturer = systemMfrs;
  }

  return Object.keys(fluff).length > 0
    ? (fluff as ISerializedFluff)
    : undefined;
}
