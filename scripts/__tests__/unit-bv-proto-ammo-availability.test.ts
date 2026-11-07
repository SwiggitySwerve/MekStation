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
import { resolveProtoAmmoBV } from '../../src/utils/construction/protomech/protoMechAmmo';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
describe('ProtoMech ammo worklist preservation', () => {
  test.each(sources)(
    '$path retains public results and physical source order',
    (source) => {
      const document = new BlkParserService().parse(source.content);
      if (!document.success) throw new Error(document.error.errors.join('; '));
      const handler = new ProtoMechUnitHandler();
      const parsed = handler.parse(document.data.document);
      if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
      const original = JSON.stringify(parsed.data.unit);
      const b = handler.calculateBVBreakdown(parsed.data.unit);
      const terms = protoMechBVTerms(b);
      expect(b.final).toBe(source.javaTotal);
      expect(terms.ammoBV).toBe(b.ammoBV);
      expect(terms.weaponBV).toBe(b.weaponBV);
      expect(terms.offensiveEquipmentBV).toBe(b.offensiveEquipmentBV);
      expect(JSON.stringify(parsed.data.unit)).toBe(original);
    },
  );

  test('ammo before and after a weapon retains quantities and exact-key cap arithmetic', () => {
    const unit = buildProto({
      tonnage: 5,
      runMP: 5,
      equipment: [
        mount('Clan Ammo SRM-2 (10)', ProtoLocation.LEFT_ARM),
        mount('CLSRM2', ProtoLocation.TORSO),
        mount('ProtoMagneticClamp', ProtoLocation.TORSO),
        mount('Clan Ammo SRM-2 (1000)', ProtoLocation.RIGHT_ARM),
      ],
    });
    const original = JSON.stringify(unit);
    const b = calculateProtoMechBV(unit);
    expect(b).toMatchObject({
      weaponBV: 21,
      ammoBV: 21,
      offensiveEquipmentBV: 1,
      offensiveBV: 43,
      final: 43,
    });
    expect(b.weaponMountBV?.map((f) => f.equipmentIndex)).toEqual([1]);
    expect(b.offensiveEquipmentMountBV?.map((f) => f.equipmentIndex)).toEqual([
      2,
    ]);
    expect(JSON.stringify(unit)).toBe(original);
  });

  test('the unchanged native ammo owner supplies physical per-shot values', () => {
    expect(resolveProtoAmmoBV('Clan Ammo SRM-2 (10)', ['CLSRM2'])).toEqual({
      battleValue: 0.6000000000000001,
      weaponType: 'clan-srm-2',
      nativeGroup: 'SRM:2',
    });
    expect(
      resolveProtoAmmoBV('Clan Ammo SRM-2 (1000)', ['CLSRM2'])?.battleValue,
    ).toBe(60);
    expect(
      resolveProtoAmmoBV('No Native Ammo (10)', ['CLSRM2']),
    ).toBeUndefined();
  });
});

describe('ProtoMech positive native ammo availability', () => {
  // Pinned48fcb2f6 values; only tests consume reference observations.
  const pinned: Record<string, Record<string, number>> = {
    'Cecerops 5.blk': { 'ammo.available.APGAUSS:0': 0.8999999999999999 },
    'Gorgon 5.blk': { 'ammo.available.LRM_STREAK:5': 5.95595 },
    'Minotaur-P2.blk': { 'ammo.available.SRM:4': 1.6 },
    'Basilisk ProtoMech (Quad) B.blk': {},
    'Basilisk ProtoMech (Quad).blk': { 'ammo.available.SRM:4': 2 },
    'Centaur Z.blk': { 'ammo.available.LRM:4': 1.9992 },
    'Hobgoblin Ultraheavy ProtoMech 2.blk': { 'ammo.available.APGAUSS:0': 1.5 },
    'Hobgoblin Ultraheavy ProtoMech.blk': { 'ammo.available.APGAUSS:0': 3 },
    'Minotaur Z.blk': {},
    'Procyon Z.blk': { 'ammo.available.SRM:1': 0.2 },
    'Roc Z.blk': { 'ammo.available.CHEMICAL_LASER:5': 3.3329999999999993 },
    'Sprite 3.blk': { 'ammo.available.CHEMICAL_LASER:5': 4.9995 },
  };

  test.each(sources)(
    '$path retains its actual bin values and native groups',
    (source) => {
      const document = new BlkParserService().parse(source.content);
      if (!document.success) throw new Error(document.error.errors.join('; '));
      const handler = new ProtoMechUnitHandler();
      const parsed = handler.parse(document.data.document);
      if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
      const original = JSON.stringify(parsed.data.unit);
      const b = handler.calculateBVBreakdown(parsed.data.unit);
      const terms = protoMechBVTerms(b);
      const actual = Object.fromEntries(
        Object.entries(terms).filter(([key]) =>
          key.startsWith('ammo.available.'),
        ),
      );
      const expected = pinned[source.path.split('/').at(-1) ?? ''];
      expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
      for (const [key, value] of Object.entries(expected)) {
        expect(actual[key]).toBeCloseTo(value, 12);
        expect(Number.isFinite(actual[key])).toBe(true);
      }
      const facts = b.ammoAvailableMountBV ?? [];
      expect(facts.map((f) => f.equipmentIndex)).toEqual(
        facts.map((f) => f.equipmentIndex).sort((a, c) => a - c),
      );
      for (const fact of facts) {
        const mount = parsed.data.unit.equipment[fact.equipmentIndex];
        expect(fact.equipmentId).toBe(mount.equipmentId);
        expect(fact.location).toBe(mount.location);
        expect(fact.battleValue).toBeGreaterThan(0);
        expect(actual[`ammo.available.${fact.nativeGroup}`]).toBeDefined();
      }
      expect(
        Object.keys(terms).filter((key) => key.startsWith('ammo.cap.')),
      ).toEqual([]);
      expect(b.final).toBe(source.javaTotal);
      expect(JSON.stringify(parsed.data.unit)).toBe(original);
    },
  );

  test('mixed and repeated bins aggregate in physical order without changing capped arithmetic', () => {
    const unit = buildProto({
      tonnage: 5,
      runMP: 5,
      equipment: [
        mount('Clan Ammo SRM-2 (7)', ProtoLocation.LEFT_ARM),
        mount('CLSRM2', ProtoLocation.TORSO),
        mount('Clan Ammo SRM-1 (4)', ProtoLocation.RIGHT_ARM),
        mount('CLSRM1', ProtoLocation.TORSO),
        mount('Clan Ammo SRM-2 (3)', ProtoLocation.TORSO),
      ],
    });
    const original = JSON.stringify(unit);
    const b = calculateProtoMechBV(unit);
    const facts = b.ammoAvailableMountBV ?? [];
    expect(facts.map((f) => f.equipmentIndex)).toEqual([0, 2, 4]);
    expect(facts.map((f) => f.nativeGroup)).toEqual([
      'SRM:2',
      'SRM:1',
      'SRM:2',
    ]);
    const terms = protoMechBVTerms(b);
    expect(terms['ammo.available.SRM:2']).toBeCloseTo(0.6, 12);
    expect(terms['ammo.available.SRM:1']).toBe(0.08);
    expect(b.ammoBV).toBeCloseTo(0.68, 12);
    expect(b.weaponBV).toBe(36);
    expect(JSON.stringify(unit)).toBe(original);
  });

  test('an unmatched native bin exposes its registry group and availability without an invented cap', () => {
    const resolved = resolveProtoAmmoBV('Clan Ammo SRM-2 (10)', []);
    expect(resolved).toMatchObject({
      battleValue: 0.6000000000000001,
      weaponType: 'SRM:2',
    });
    const b = calculateProtoMechBV(
      buildProto({
        tonnage: 5,
        equipment: [mount('Clan Ammo SRM-2 (10)', ProtoLocation.TORSO)],
      }),
    );
    expect(b.ammoBV).toBe(0);
    const terms = protoMechBVTerms(b);
    expect(terms['ammo.available.SRM:2']).toBe(0.6000000000000001);
    expect(resolved?.nativeGroup).toBe('SRM:2');
    expect(b.ammoAvailableMountBV).toEqual([
      {
        equipmentIndex: 0,
        equipmentId: 'Clan Ammo SRM-2 (10)',
        location: ProtoLocation.TORSO,
        battleValue: 0.6000000000000001,
        nativeGroup: 'SRM:2',
      },
    ]);
    expect(
      Object.keys(terms).filter((key) => key.startsWith('ammo.cap.')),
    ).toEqual([]);
    expect(b.weaponBV).toBe(0);
    expect(b.offensiveBV).toBe(0);
  });

  test.each([
    'Clan Ammo SRM-2 (0)',
    'No Native Ammo (10)',
    'clan-srm-2-ammo',
    `Clan Ammo SRM-2 (${'9'.repeat(400)})`,
  ])(
    'does not invent positive native facts for excluded source %s',
    (equipmentId) => {
      const b = calculateProtoMechBV(
        buildProto({
          tonnage: 5,
          equipment: [
            mount('CLSRM2', ProtoLocation.TORSO),
            mount(equipmentId, ProtoLocation.TORSO),
          ],
        }),
      );
      expect(b).not.toHaveProperty('ammoAvailableMountBV');
      expect(
        Object.keys(protoMechBVTerms(b)).filter((key) =>
          key.startsWith('ammo.available.'),
        ),
      ).toEqual([]);
    },
  );

  test('launcher-only and legacy breakdowns retain absent ammo facts and all old projections', () => {
    const launcher = calculateProtoMechBV(
      buildProto({
        tonnage: 5,
        equipment: [mount('CLSRM2', ProtoLocation.TORSO)],
      }),
    );
    expect(launcher).not.toHaveProperty('ammoAvailableMountBV');
    const { ammoAvailableMountBV: _facts, ...legacy } = calculateProtoMechBV(
      buildProto({
        tonnage: 5,
        equipment: [
          mount('ProtoMagneticClamp', ProtoLocation.TORSO),
          mount('CLSRM2', ProtoLocation.TORSO),
          mount('Clan Ammo SRM-2 (10)', ProtoLocation.TORSO),
        ],
      }),
    );
    const terms = protoMechBVTerms(legacy);
    expect(terms).not.toHaveProperty('ammoAvailableMountBV');
    expect(terms['equipment.native.2.ProtoMagneticClamp']).toBe(1);
    expect(terms['weapon.1.T.CLSRM2']).toBe(21);
    expect(terms.ammoBV).toBe(0.6000000000000001);
    expect(
      Object.keys(terms).filter((key) => key.startsWith('ammo.available.')),
    ).toEqual([]);
  });
});
