/**
 * Capital arc topology: BLK source order -> handler arcs, held to pinned MegaMek.
 *
 * The pinned corpus is almost fully left/right symmetric, so these fixtures are
 * distinct-value splices (every arc a different armor value, weapon type and mount
 * count) whose per-location answers were read from the pinned BLK*File loaders
 * (MegaMek 48fcb2f64). See fixtures/capitalArcTopology.json `provenance`.
 *
 * Java order being matched:
 * - WarShip/JumpShip/SpaceStation armor (exactly 6): Nose, Left Front Side, Right Front Side,
 *   Aft, Aft Left Side, Aft Right Side (BLKWarshipFile.java:258-263, Jumpship.java:101-102).
 *   Hull and the two broadsides are never armored.
 * - DropShip armor (exactly 4): Nose, Right Side, Left Side, Aft
 *   (BLKDropshipFile.java:192-199, BLKAeroSpaceFighterFile.java:63-66).
 *
 * @spec establish-all-unit-data-parity: faithful source-unit semantics
 */

import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  CapitalArc,
  DropShipDesignType,
} from '@/types/unit/CapitalShipInterfaces';

import { createDropShipHandler } from '../DropShipUnitHandler';
import { createJumpShipHandler } from '../JumpShipUnitHandler';
import { createSpaceStationHandler } from '../SpaceStationUnitHandler';
import { createWarShipHandler } from '../WarShipUnitHandler';
import fixture from './fixtures/capitalArcTopology.json';

interface IJavaLocation {
  readonly index: number;
  readonly armor: number | null;
  readonly weapons: Readonly<Record<string, number>>;
}
interface IFixtureCase {
  readonly blk: string;
  readonly javaLocations: Readonly<Record<string, IJavaLocation>>;
}
interface IParsedCapital {
  readonly armorByArc: Readonly<Record<string, number | undefined>>;
  readonly designType?: DropShipDesignType;
  readonly equipment: readonly {
    readonly arc: CapitalArc;
    readonly name: string;
  }[];
}

const CASES = fixture.cases as Readonly<Record<string, IFixtureCase>>;

const HANDLERS = {
  W: createWarShipHandler,
  J: createJumpShipHandler,
  S: createSpaceStationHandler,
  D: createDropShipHandler,
} as const;

const CAPITAL_ARMOR_KEY: Readonly<Record<string, string>> = {
  Nose: 'nose',
  'Left Front Side': 'frontLeftSide',
  'Right Front Side': 'frontRightSide',
  Aft: 'aft',
  'Aft Left Side': 'aftLeftSide',
  'Aft Right Side': 'aftRightSide',
};
const DROPSHIP_ARMOR_KEY: Readonly<Record<string, string>> = {
  Nose: 'nose',
  'Left Side': 'leftSide',
  'Right Side': 'rightSide',
  Aft: 'aft',
};
/** DropShip side equipment is the front-left/right BV arc (DropShipBVCalculator.java:78-90). */
const JAVA_LOCATION_ARC: Readonly<Record<string, CapitalArc>> = {
  Nose: CapitalArc.NOSE,
  'Left Front Side': CapitalArc.FRONT_LEFT,
  'Right Front Side': CapitalArc.FRONT_RIGHT,
  Aft: CapitalArc.AFT,
  'Aft Left Side': CapitalArc.AFT_LEFT,
  'Aft Right Side': CapitalArc.AFT_RIGHT,
  'Left Broadsides': CapitalArc.LEFT_BROADSIDE,
  'Right Broadsides': CapitalArc.RIGHT_BROADSIDE,
  'Left Side': CapitalArc.FRONT_LEFT,
  'Right Side': CapitalArc.FRONT_RIGHT,
  Hull: CapitalArc.HULL,
};

function load(caseId: string, blk: string = CASES[caseId].blk) {
  const parsed = new BlkParserService().parse(blk);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const handler = HANDLERS[caseId[0] as keyof typeof HANDLERS]();
  return handler.parse(parsed.data.document);
}

function loaded(caseId: string, blk?: string): IParsedCapital {
  const result = load(caseId, blk);
  if (!result.success) throw new Error(result.error.errors.join('; '));
  return result.data.unit as unknown as IParsedCapital;
}

function withArmor(blk: string, values: readonly number[]): string {
  return blk.replace(
    /<armor>[\s\S]*?<\/armor>/,
    `<armor>\n${values.join('\n')}\n</armor>`,
  );
}

describe('capital BLK source order matches pinned MegaMek', () => {
  describe.each(Object.keys(CASES))('%s', (caseId) => {
    const { javaLocations } = CASES[caseId];
    const dropship = caseId.startsWith('D');

    it('puts each source armor value on the arc Java loads it into', () => {
      const armorKeys = dropship ? DROPSHIP_ARMOR_KEY : CAPITAL_ARMOR_KEY;
      const expected = Object.fromEntries(
        Object.entries(javaLocations)
          .filter(
            ([name, location]) => name in armorKeys && location.armor !== null,
          )
          .map(([name, location]) => [armorKeys[name], location.armor]),
      );
      expect(loaded(caseId).armorByArc).toStrictEqual(expected);
    });

    it('puts each equipment block on the arc Java loads it into', () => {
      const expected: Record<string, Record<string, number>> = {};
      for (const [name, location] of Object.entries(javaLocations)) {
        if (Object.keys(location.weapons).length > 0) {
          expected[JAVA_LOCATION_ARC[name]] = location.weapons;
        }
      }
      const actual: Record<string, Record<string, number>> = {};
      for (const mount of loaded(caseId).equipment) {
        actual[mount.arc] ??= {};
        actual[mount.arc][mount.name] =
          (actual[mount.arc][mount.name] ?? 0) + 1;
      }
      expect(actual).toStrictEqual(expected);
    });
  });

  it('keeps Hull equipment on the hull instead of defaulting it to the nose', () => {
    // Pinned Java (first splice round): a Small Laser in <Hull Equipment> loads at Hull (index 6).
    const base = CASES['W1-warship'].blk;
    const blk = base.replace(
      /<Hull Equipment>[\s\S]*?<\/Hull Equipment>/,
      '<Hull Equipment>\nSmall Laser\n</Hull Equipment>',
    );
    const hull = loaded('W1-warship', blk).equipment.filter(
      (mount) => mount.name === 'Small Laser',
    );
    expect(hull.map((mount) => mount.arc)).toStrictEqual([CapitalArc.HULL]);
  });

  describe('armor array length is a diagnostic, not a default', () => {
    it.each([
      ['W1-warship', [1, 2, 3, 4, 5, 6, 7, 8]],
      ['J1-jumpship', [1, 2, 3, 4]],
      ['S1-spacestation', [1, 2, 3, 4, 5]],
      ['D1-dropship', [1, 2, 3, 4, 5, 6]],
    ])('%s rejects %j', (caseId, values) => {
      // BLKWarshipFile/Jumpship/SpaceStation require exactly 6; BLKDropshipFile exactly 4.
      const result = load(caseId, withArmor(CASES[caseId].blk, values));
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.errors.join('\n')).toMatch(/armor/i);
    });
  });

  describe('DropShip design type', () => {
    const setDesign = (code: number | null) =>
      code === null
        ? CASES['D1-dropship'].blk.replace(
            /<designtype>[\s\S]*?<\/designtype>\s*/,
            '',
          )
        : CASES['D1-dropship'].blk.replace(
            /<designtype>[\s\S]*?<\/designtype>/,
            `<designtype>\n${code}\n</designtype>`,
          );

    // Aero.java:437-439 CIVILIAN = 0, MILITARY = 1 (default); BLKDropshipFile.java:180-184.
    it.each([
      [0, DropShipDesignType.CIVILIAN],
      [1, DropShipDesignType.MILITARY],
      [null, DropShipDesignType.MILITARY],
    ])('designtype %s loads as %s', (code, expected) => {
      expect(loaded('D1-dropship', setDesign(code)).designType).toBe(expected);
    });
  });
});
