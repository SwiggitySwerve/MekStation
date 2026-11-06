import { BlkParserService } from '../../src/services/conversion/BlkParserService';
import { ProtoMechUnitHandler } from '../../src/services/units/handlers/ProtoMechUnitHandler';
import { ProtoLocation } from '../../src/types/unit/ProtoMechInterfaces';
import {
  calculateProtoMechBV,
  protoMechBVTerms,
} from '../../src/utils/construction/protomech';
import sources from '../../src/utils/construction/protomech/__tests__/fixtures/bv-residual-sources.json';
import {
  buildProto,
  mount,
} from '../../src/utils/construction/protomech/__tests__/protoMechBV.test.helpers';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
describe('ProtoMech weapon diagnostic projection', () => {
  // Pinned MegaMek 48fcb2f6 per-mount output, grouped by native location.
  // Local mount indices/ids deliberately do not claim native equipment identity.
  const pinned: Record<string, Record<string, number[]>> = {
    'Cecerops 5.blk': { T: [21] },
    'Gorgon 5.blk': { MG: [86] },
    'Minotaur-P2.blk': { RA: [19], LA: [19], MG: [39] },
    'Basilisk ProtoMech (Quad) B.blk': {},
    'Basilisk ProtoMech (Quad).blk': { T: [39] },
    'Centaur Z.blk': { T: [46], MG: [7] },
    'Hobgoblin Ultraheavy ProtoMech 2.blk': { T: [21, 21], RA: [21], LA: [21] },
    'Hobgoblin Ultraheavy ProtoMech.blk': { RA: [21], MG: [11] },
    'Minotaur Z.blk': { T: [93] },
    'Procyon Z.blk': { RA: [31], LA: [15] },
    'Roc Z.blk': { MG: [37] },
    'Sprite 3.blk': { T: [11, 11], RA: [37], LA: [37] },
  };

  test.each(sources)(
    '$path retains source order and pinned mount values',
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
      const groups: Record<string, number[]> = {};
      for (const [key, value] of Object.entries(terms)) {
        const match = key.match(/^weapon\.\d+\.([^.]+)\./);
        if (match && typeof value === 'number')
          (groups[match[1]] ??= []).push(value);
      }
      expect(groups).toEqual(pinned[source.path.split('/').at(-1) ?? '']);
      expect(
        (b.weaponMountBV ?? []).reduce(
          (sum, fact) => sum + fact.battleValue,
          0,
        ),
      ).toBe(b.weaponBV);
      const indices = (b.weaponMountBV ?? []).map(
        (fact) => fact.equipmentIndex,
      );
      expect(indices).toEqual([...indices].sort((a, c) => a - c));
      for (const fact of b.weaponMountBV ?? []) {
        expect(fact.equipmentId).toBe(
          unit.equipment[fact.equipmentIndex].equipmentId,
        );
        expect(fact.location).toBe(
          unit.equipment[fact.equipmentIndex].location,
        );
      }
      expect(JSON.stringify(unit)).toBe(original);
      expect(b.final).toBe(source.javaTotal);
      expect(
        Object.keys(terms).filter(
          (key) =>
            key.startsWith('ammo.') && !key.startsWith('ammo.available.'),
        ),
      ).toEqual([]);
    },
  );

  test('snapshots duplicates at full main-gun BV, excluding other equipment', () => {
    const unit = buildProto({
      tonnage: 5,
      runMP: 5,
      equipment: [
        mount('clan-srm-2-ammo', ProtoLocation.TORSO),
        mount('clan-er-small-laser', ProtoLocation.MAIN_GUN, true),
        mount('clan-ams', ProtoLocation.TORSO),
        mount('not-a-resolvable-proto-weapon', ProtoLocation.TORSO),
        mount('ProtoQuadMeleeSystem', ProtoLocation.TORSO),
        mount('EIInterface', ProtoLocation.TORSO),
        mount('targeting-computer', ProtoLocation.TORSO),
        mount('clan-er-small-laser', ProtoLocation.MAIN_GUN, true),
      ],
    });
    const original = JSON.stringify(unit);
    const b = calculateProtoMechBV(unit);
    expect(b.weaponMountBV).toEqual(
      [1, 7].map((equipmentIndex) => ({
        equipmentIndex,
        equipmentId: 'clan-er-small-laser',
        location: ProtoLocation.MAIN_GUN,
        battleValue: 31,
      })),
    );
    expect(b.weaponBV).toBe(62);
    expect(protoMechBVTerms(b)).toMatchObject({
      'weapon.1.MG.clan-er-small-laser': 31,
      'weapon.7.MG.clan-er-small-laser': 31,
    });
    expect(JSON.stringify(unit)).toBe(original);
  });

  test.each([
    [ProtoLocation.HEAD, 'HD'],
    [ProtoLocation.TORSO, 'T'],
    [ProtoLocation.RIGHT_ARM, 'RA'],
    [ProtoLocation.LEFT_ARM, 'LA'],
    [ProtoLocation.LEGS, 'L'],
    [ProtoLocation.MAIN_GUN, 'MG'],
  ] as const)(
    'formats only the actual %s location as %s',
    (location, abbreviation) => {
      const b = calculateProtoMechBV(
        buildProto({
          tonnage: 5,
          equipment: [mount('clan-er-small-laser', location)],
        }),
      );
      expect(protoMechBVTerms(b)).toHaveProperty(
        [`weapon.0.${abbreviation}.clan-er-small-laser`],
        31,
      );
    },
  );

  test.each([
    ProtoLocation.FRONT_LEGS,
    ProtoLocation.REAR_LEGS,
    'Unknown',
    'Body',
  ])('does not invent a native location for %s', (location) => {
    const b = calculateProtoMechBV(buildProto({ tonnage: 5 }));
    const fact = {
      equipmentIndex: 0,
      equipmentId: 'clan-er-small-laser',
      location,
      battleValue: 31,
    };
    const terms = protoMechBVTerms({ ...b, weaponMountBV: [fact] });
    expect(terms.weaponMountBV).toEqual([fact]);
    expect(
      Object.keys(terms).filter((key) => key.startsWith('weapon.')),
    ).toEqual([]);
  });

  test('unarmed and legacy breakdowns retain absent facts and all existing terms', () => {
    const b = calculateProtoMechBV(buildProto({ tonnage: 5 }));
    expect(b).not.toHaveProperty('weaponMountBV');
    expect(protoMechBVTerms(b)).toEqual({
      ...b,
      typeModifier: 1,
      offensiveTypeModifier: 1,
      summaryModifier: b.chassisMultiplier,
      weightBV: b.physicalWeaponBV,
      adjustment: b.final - b.baseBV,
    });
    const { weaponMountBV: _facts, ...legacy } = calculateProtoMechBV(
      buildProto({
        tonnage: 5,
        equipment: [mount('clan-er-small-laser', ProtoLocation.TORSO)],
      }),
    );
    const terms = protoMechBVTerms(legacy);
    expect(terms.weaponBV).toBe(31);
    expect(terms).not.toHaveProperty('weaponMountBV');
    expect(
      Object.keys(terms).filter((key) => key.startsWith('weapon.')),
    ).toEqual([]);
  });
});
