import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import armorCodes from '@/types/formats/blk-armor-codes.json';

import type { IRawSerializedUnit } from './types';

import {
  mapMechLocation,
  mapTechBase,
  resolveArmorType,
} from './componentMappers';

export interface IArmorSaveLoss {
  readonly sourceType: string;
  readonly message: string;
  readonly locations: readonly {
    readonly location: string;
    readonly type: string;
  }[];
  readonly consequence: string;
  readonly evidence?: {
    readonly unit: string;
    readonly source: string;
    readonly testFile: string;
    readonly testName: string;
  };
}

const patchworkConsequence = {
  consequence: 'BV can change after saving and reopening.',
  evidence: {
    unit: 'Zeus-X ZEU-X',
    source: 'parity-R2/phase3-patchwork/SAVE-REOPEN.md',
    testFile:
      'src/components/customizer/shared/__tests__/armorSaveLoss.test.tsx',
    testName:
      'proves Patchwork source identity and per-location types are lost on save/reopen',
  },
} as const;

/** A read-only warning about the existing mapper fallback, never a save fix. */
export function getArmorSaveLoss(
  source: IRawSerializedUnit | undefined,
  armorType: ArmorTypeEnum,
): IArmorSaveLoss | undefined {
  const armor = source?.armor;
  if (!source || !armor?.type || armorType !== ArmorTypeEnum.STANDARD)
    return undefined;
  // The mapper's own resolver owns every native/alias support decision. Do not
  // compare wire spellings or maintain another list of unsupported armor types.
  if (resolveArmorType(armor.type, mapTechBase(source.techBase)) !== undefined)
    return undefined;
  const names: Readonly<Record<string, string>> = armorCodes;
  return {
    sourceType: armor.type,
    message: `Armor type ${armor.type} is not kept; this design is shown and will be saved with ${ArmorTypeEnum.STANDARD} armor, so its displayed weight and BV may differ from the original.`,
    locations: Object.entries(armor.typeByLocation ?? {}).map(
      ([location, code]) => ({
        location: mapMechLocation(location) ?? location,
        type: names[String(code)] ?? `Armor code ${code}`,
      }),
    ),
    ...(armor.type === 'PATCHWORK'
      ? patchworkConsequence
      : { consequence: 'Effect on the unit not established.' }),
  };
}
