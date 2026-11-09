import { BlkParserService } from '../../src/services/conversion/BlkParserService';
import { ProtoMechUnitHandler } from '../../src/services/units/handlers/ProtoMechUnitHandler';
import { ProtoLocation } from '../../src/types/unit/ProtoMechInterfaces';
import * as equipmentBV from '../../src/utils/construction/equipmentBVResolver';
import {
  calculateProtoMechBV,
  protoMechBVTerms,
} from '../../src/utils/construction/protomech';
import sources from '../../src/utils/construction/protomech/__tests__/fixtures/bv-residual-sources.json';
import {
  buildProto,
  mount,
} from '../../src/utils/construction/protomech/__tests__/protoMechBV.test.helpers';

jest.mock('../../src/utils/construction/equipmentBVResolver', () => {
  const actual = jest.requireActual<
    typeof import('../../src/utils/construction/equipmentBVResolver')
  >('../../src/utils/construction/equipmentBVResolver');
  return { ...actual, resolveEquipmentBV: jest.fn(actual.resolveEquipmentBV) };
});

/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
describe('ProtoMech native offensive-misc diagnostics', () => {
  const clamp = { 'equipment.native.2.ProtoMagneticClamp': 1 };
  // Actual pinned48fcb2f6 trace values. The numeric component is LOCATION.
  const pinned: Record<string, Record<string, number>> = {
    'Cecerops 5.blk': clamp,
    'Gorgon 5.blk': clamp,
    'Minotaur-P2.blk': clamp,
    'Basilisk ProtoMech (Quad) B.blk': {
      'equipment.native.2.Clan Electric Discharge ProtoMech': 32,
      'equipment.native.2.ProtoQuadMeleeSystem': 5,
    },
    'Basilisk ProtoMech (Quad).blk': {
      'equipment.native.2.Clan Electric Discharge ProtoMech': 32,
      'equipment.native.2.ProtoQuadMeleeSystem': 5,
    },
    'Centaur Z.blk': clamp,
    'Hobgoblin Ultraheavy ProtoMech 2.blk': clamp,
    'Hobgoblin Ultraheavy ProtoMech.blk': clamp,
    'Minotaur Z.blk': clamp,
    'Procyon Z.blk': clamp,
    'Roc Z.blk': clamp,
    'Sprite 3.blk': {},
  };

  test.each(sources)(
    '$path exposes only its actual native-misc values',
    (source) => {
      const document = new BlkParserService().parse(source.content);
      if (!document.success) throw new Error(document.error.errors.join('; '));
      const handler = new ProtoMechUnitHandler();
      const parsed = handler.parse(document.data.document);
      if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
      const unit = parsed.data.unit;
      const original = JSON.stringify(unit);
      const b = handler.calculateBVBreakdown(unit);
      const terms = protoMechBVTerms(b);
      const actual = Object.fromEntries(
        Object.entries(terms).filter(
          ([key, value]) => key.startsWith('equipment.native.') && value !== 0,
        ),
      );
      expect(actual).toEqual(pinned[source.path.split('/').at(-1) ?? '']);
      const facts = b.offensiveEquipmentMountBV ?? [];
      expect(facts.length).toBe(Object.keys(actual).length);
      expect(facts.reduce((sum, fact) => sum + fact.battleValue, 0)).toBe(
        b.offensiveEquipmentBV,
      );
      expect(facts.map((f) => f.equipmentIndex)).toEqual(
        facts.map((f) => f.equipmentIndex).sort((a, c) => a - c),
      );
      for (const fact of facts) {
        expect(fact.equipmentId).toBe(
          unit.equipment[fact.equipmentIndex].equipmentId,
        );
        expect(fact.location).toBe(
          unit.equipment[fact.equipmentIndex].location,
        );
        expect(fact.location).toBe(ProtoLocation.TORSO);
      }
      expect(b.final).toBe(source.javaTotal);
      expect(JSON.stringify(unit)).toBe(original);
      expect(
        Object.keys(terms).filter(
          (key) =>
            key.startsWith('ammo.') &&
            !key.startsWith('ammo.available.') &&
            !key.startsWith('ammo.cap.'),
        ),
      ).toEqual([]);
      for (const fact of b.weaponMountBV ?? []) {
        const nativeIndex = fact.nativeEquipmentIndex ?? fact.equipmentIndex;
        expect(
          Object.entries(terms).some(
            ([key, value]) =>
              key.startsWith(`weapon.${nativeIndex}.`) &&
              value === fact.battleValue,
          ),
        ).toBe(true);
      }
    },
  );

  test('retains real duplicate mounts but uses native last-put key semantics', () => {
    const unit = buildProto({
      tonnage: 5,
      equipment: [
        mount('EIInterface', ProtoLocation.TORSO),
        mount('ProtoMagneticClamp', ProtoLocation.TORSO),
        mount('ProtoMagneticClamp', ProtoLocation.TORSO),
      ],
    });
    const b = calculateProtoMechBV(unit);
    expect(b.offensiveEquipmentBV).toBe(2);
    expect(b.offensiveEquipmentMountBV?.map((f) => f.equipmentIndex)).toEqual([
      1, 2,
    ]);
    expect(protoMechBVTerms(b)).toMatchObject(clamp);
    const facts = b.offensiveEquipmentMountBV ?? [];
    const terms = protoMechBVTerms({
      ...b,
      offensiveEquipmentMountBV: facts.map((f, i) => ({
        ...f,
        battleValue: i === 0 ? 3 : 7,
      })),
    });
    expect(terms['equipment.native.2.ProtoMagneticClamp']).toBe(7);
  });

  test('retains the native owner dynamic value, independent of catalog fallback', () => {
    const b = calculateProtoMechBV(
      buildProto({
        tonnage: 11,
        equipment: [mount('ProtoQuadMeleeSystem', ProtoLocation.TORSO)],
      }),
    );
    expect(b.offensiveEquipmentBV).toBe(7.5);
    expect(protoMechBVTerms(b)['equipment.native.2.ProtoQuadMeleeSystem']).toBe(
      7.5,
    );
  });

  test.each([
    [0, 0],
    [-5, -2.5],
    [NaN, NaN],
    [Infinity, Infinity],
  ])(
    'omits nonpositive/nonfinite diagnostic facts at tonnage%s without changing arithmetic',
    (tonnage, expected) => {
      const b = calculateProtoMechBV(
        buildProto({
          tonnage,
          equipment: [mount('ProtoQuadMeleeSystem', ProtoLocation.TORSO)],
        }),
      );
      expect(b.offensiveEquipmentBV).toBe(expected);
      expect(b).not.toHaveProperty('offensiveEquipmentMountBV');
      expect(
        Object.keys(protoMechBVTerms(b)).filter((key) =>
          key.startsWith('equipment.native.'),
        ),
      ).toEqual([]);
    },
  );

  test('zero, unsupported, movement, defensive, ammo and weapon inputs invent no misc fact', () => {
    const b = calculateProtoMechBV(
      buildProto({
        tonnage: 5,
        equipment: [
          mount('EIInterface', ProtoLocation.TORSO),
          mount('ProtoMechJumpJet', ProtoLocation.TORSO),
          mount('not-a-resolvable-native-misc', ProtoLocation.TORSO),
          mount('clan-ams', ProtoLocation.TORSO),
          mount('clan-srm-2-ammo', ProtoLocation.TORSO),
          mount('clan-er-small-laser', ProtoLocation.RIGHT_ARM),
        ],
      }),
    );
    expect(b).not.toHaveProperty('offensiveEquipmentMountBV');
    expect(protoMechBVTerms(b)['weapon.5.RA.clan-er-small-laser']).toBe(31);
    expect(
      Object.keys(protoMechBVTerms(b)).filter((key) =>
        key.startsWith('equipment.native.'),
      ),
    ).toEqual([]);
  });

  test.each([
    [ProtoLocation.HEAD, 1],
    [ProtoLocation.TORSO, 2],
    [ProtoLocation.RIGHT_ARM, 3],
    [ProtoLocation.LEFT_ARM, 4],
    [ProtoLocation.LEGS, 5],
    [ProtoLocation.MAIN_GUN, 6],
  ] as const)(
    'formats supplied location%s as native location number%i',
    (location, nativeLocation) => {
      const b = calculateProtoMechBV(
        buildProto({
          tonnage: 5,
          equipment: [mount('ProtoMagneticClamp', location)],
        }),
      );
      expect(protoMechBVTerms(b)).toHaveProperty(
        [`equipment.native.${nativeLocation}.ProtoMagneticClamp`],
        1,
      );
    },
  );

  test.each([
    ProtoLocation.FRONT_LEGS,
    ProtoLocation.REAR_LEGS,
    'Body',
    'Unknown',
  ])(
    'retains unknown%s facts without inferring a native location',
    (location) => {
      const b = calculateProtoMechBV(buildProto({ tonnage: 5 }));
      const fact = {
        equipmentIndex: 37,
        equipmentId: 'ProtoMagneticClamp',
        location,
        battleValue: 1,
      };
      const terms = protoMechBVTerms({
        ...b,
        offensiveEquipmentMountBV: [fact],
      });
      expect(terms.offensiveEquipmentMountBV).toEqual([fact]);
      expect(
        Object.keys(terms).filter((key) => key.startsWith('equipment.native.')),
      ).toEqual([]);
    },
  );

  test('legacy breakdowns keep absent facts and unchanged weapon projection', () => {
    const { offensiveEquipmentMountBV: _facts, ...legacy } =
      calculateProtoMechBV(
        buildProto({
          tonnage: 5,
          equipment: [
            mount('ProtoMagneticClamp', ProtoLocation.TORSO),
            mount('clan-er-small-laser', ProtoLocation.RIGHT_ARM),
          ],
        }),
      );
    const terms = protoMechBVTerms(legacy);
    expect(terms).not.toHaveProperty('offensiveEquipmentMountBV');
    expect(terms.offensiveEquipmentBV).toBe(1);
    expect(terms['weapon.1.RA.clan-er-small-laser']).toBe(31);
    expect(
      Object.keys(terms).filter((key) => key.startsWith('equipment.native.')),
    ).toEqual([]);
  });
});

/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
describe('ProtoMech resolved-zero misc diagnostics', () => {
  const sourceMount = (equipmentId: string, blockKey = 'Body') => ({
    ...mount(equipmentId, ProtoLocation.TORSO),
    blkSource: {
      rawEntry: equipmentId,
      lookupName: equipmentId,
      blockKey,
      errors: [],
    },
  });

  afterEach(() => jest.mocked(equipmentBV.resolveEquipmentBV).mockReset());
  beforeEach(() => {
    const actual = jest.requireActual<
      typeof import('../../src/utils/construction/equipmentBVResolver')
    >('../../src/utils/construction/equipmentBVResolver');
    jest
      .mocked(equipmentBV.resolveEquipmentBV)
      .mockImplementation(actual.resolveEquipmentBV);
  });

  test.each([
    ['EIInterface', 'Body', 0],
    ['CLMyomerBooster', 'Body', 0],
    ['ProtoMechJumpJet', 'Body', 0],
    ['ExtendedJumpJetSystem', 'Body', 0],
    ['ProtoMechPartialWing', 'Torso', 2],
  ])(
    'projects resolved %s at its native location',
    (id, block, nativeLocation) => {
      const unit = buildProto({
        tonnage: 5,
        equipment: [sourceMount(String(id), String(block))],
      });
      const original = JSON.stringify(unit);
      const breakdown = calculateProtoMechBV(unit);
      const terms = protoMechBVTerms(breakdown);
      expect(terms).toHaveProperty(
        [`equipment.native.${nativeLocation}.${id}`],
        0,
      );
      expect(breakdown).toHaveProperty('resolvedZeroEquipmentMountBV');
      expect(breakdown.offensiveEquipmentBV).toBe(0);
      expect(breakdown).not.toHaveProperty('offensiveEquipmentMountBV');
      expect(JSON.stringify(unit)).toBe(original);
    },
  );

  test('requires resolved:true even for a recognized zero-valued identity', () => {
    jest
      .mocked(equipmentBV.resolveEquipmentBV)
      .mockReturnValue({ resolved: false, battleValue: 0, heat: 0 });
    const b = calculateProtoMechBV(
      buildProto({ tonnage: 5, equipment: [sourceMount('EIInterface')] }),
    );
    expect(b).not.toHaveProperty('resolvedZeroEquipmentMountBV');
    expect(protoMechBVTerms(b)).not.toHaveProperty([
      'equipment.native.0.EIInterface',
    ]);
  });

  test.each([1, -1, NaN, Infinity])(
    'rejects a resolved nonzero/nonfinite value %s',
    (battleValue) => {
      jest
        .mocked(equipmentBV.resolveEquipmentBV)
        .mockReturnValue({ resolved: true, battleValue, heat: 0 });
      const b = calculateProtoMechBV(
        buildProto({ tonnage: 5, equipment: [sourceMount('EIInterface')] }),
      );
      expect(b).not.toHaveProperty('resolvedZeroEquipmentMountBV');
    },
  );

  test('retains repeated source mounts while projecting one native key', () => {
    const b = calculateProtoMechBV(
      buildProto({
        tonnage: 5,
        equipment: [
          sourceMount('ProtoMechJumpJet'),
          sourceMount('ProtoMechJumpJet'),
        ],
      }),
    );
    expect(b).toHaveProperty('resolvedZeroEquipmentMountBV', [
      {
        equipmentIndex: 0,
        equipmentId: 'ProtoMechJumpJet',
        location: 'Torso',
        nativeLocation: 0,
        battleValue: 0,
      },
      {
        equipmentIndex: 1,
        equipmentId: 'ProtoMechJumpJet',
        location: 'Torso',
        nativeLocation: 0,
        battleValue: 0,
      },
    ]);
    expect(
      Object.keys(protoMechBVTerms(b)).filter((k) =>
        k.startsWith('equipment.native.'),
      ),
    ).toEqual(['equipment.native.0.ProtoMechJumpJet']);
  });

  test('absent, unknown, malformed and legacy source facts invent no zero', () => {
    const b = calculateProtoMechBV(
      buildProto({
        tonnage: 5,
        equipment: [
          mount('EIInterface', ProtoLocation.TORSO),
          sourceMount('unknown-zero-fallback'),
          sourceMount('EIInterface', 'Not a location'),
          {
            ...sourceMount('EIInterface'),
            blkSource: {
              ...sourceMount('EIInterface').blkSource,
              errors: ['invalid entry'],
            },
          },
        ],
      }),
    );
    expect(b).not.toHaveProperty('resolvedZeroEquipmentMountBV');
    expect(
      Object.keys(protoMechBVTerms(b)).filter((k) =>
        k.startsWith('equipment.native.'),
      ),
    ).toEqual([]);
  });
});
