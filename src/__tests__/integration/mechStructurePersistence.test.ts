import { mapStructureType } from '@/services/units/unitLoaderService/componentMappers';
import {
  InternalStructureType,
  mapSerializedStructureType,
} from '@/types/construction/InternalStructureType';
import { TechBase } from '@/types/enums/TechBase';

describe('serialized global structure identity compatibility', () => {
  const cases: readonly [
    string,
    InternalStructureType,
    InternalStructureType,
  ][] = [
    [
      'STANDARD',
      InternalStructureType.STANDARD,
      InternalStructureType.STANDARD,
    ],
    [
      'endo steel',
      InternalStructureType.ENDO_STEEL_IS,
      InternalStructureType.ENDO_STEEL_CLAN,
    ],
    [
      'ENDO',
      InternalStructureType.ENDO_STEEL_IS,
      InternalStructureType.ENDO_STEEL_CLAN,
    ],
    [
      'ENDO_STEEL_IS',
      InternalStructureType.ENDO_STEEL_IS,
      InternalStructureType.ENDO_STEEL_IS,
    ],
    [
      'Endo-Steel-Clan',
      InternalStructureType.ENDO_STEEL_CLAN,
      InternalStructureType.ENDO_STEEL_CLAN,
    ],
    [
      'ENDO_COMPOSITE',
      InternalStructureType.ENDO_COMPOSITE,
      InternalStructureType.ENDO_COMPOSITE,
    ],
    [
      'REINFORCED',
      InternalStructureType.REINFORCED,
      InternalStructureType.REINFORCED,
    ],
    [
      'COMPOSITE',
      InternalStructureType.COMPOSITE,
      InternalStructureType.COMPOSITE,
    ],
    [
      'INDUSTRIAL',
      InternalStructureType.INDUSTRIAL,
      InternalStructureType.INDUSTRIAL,
    ],
    [
      'ENDO_COMPOSITE_CLAN',
      InternalStructureType.STANDARD,
      InternalStructureType.STANDARD,
    ],
    ['unknown', InternalStructureType.STANDARD, InternalStructureType.STANDARD],
  ];

  it.each(cases)(
    'retains the existing global meaning of %s',
    (source, innerSphere, clan) => {
      for (const [techBase, expected] of [
        [TechBase.INNER_SPHERE, innerSphere],
        [TechBase.CLAN, clan],
      ] as const) {
        expect(mapStructureType(source, techBase)).toBe(expected);
        expect(mapSerializedStructureType(source, techBase)).toBe(expected);
      }
    },
  );
});
