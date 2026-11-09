import { isClanBlkEngine } from '@/services/conversion/blkEngineIdentity';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { decodeBlkTechnologyHeader } from '../unitHandlerShared';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/serialization-formats/spec.md */
describe('BLK binary technology boundary: pure compatibility', () => {
  it.each([
    [UnitType.VEHICLE, RulesLevel.STANDARD, RulesLevel.EXPERIMENTAL],
    [UnitType.VTOL, RulesLevel.STANDARD, RulesLevel.EXPERIMENTAL],
    [UnitType.SUPPORT_VEHICLE, RulesLevel.STANDARD, RulesLevel.EXPERIMENTAL],
    [UnitType.AEROSPACE, RulesLevel.STANDARD, RulesLevel.EXPERIMENTAL],
    [UnitType.BATTLE_ARMOR, RulesLevel.STANDARD, RulesLevel.STANDARD],
    [UnitType.CONVENTIONAL_FIGHTER, RulesLevel.STANDARD, RulesLevel.STANDARD],
    [UnitType.SMALL_CRAFT, RulesLevel.STANDARD, RulesLevel.STANDARD],
    [UnitType.DROPSHIP, RulesLevel.STANDARD, RulesLevel.STANDARD],
    [UnitType.JUMPSHIP, RulesLevel.STANDARD, RulesLevel.STANDARD],
    [UnitType.WARSHIP, RulesLevel.STANDARD, RulesLevel.STANDARD],
    [UnitType.SPACE_STATION, RulesLevel.STANDARD, RulesLevel.STANDARD],
    [UnitType.INFANTRY, RulesLevel.INTRODUCTORY, RulesLevel.INTRODUCTORY],
    [UnitType.PROTOMECH, RulesLevel.ADVANCED, RulesLevel.EXPERIMENTAL],
  ] as const)(
    'preserves %s pure rules and fallback',
    (family, fallback, level4) => {
      for (const [prefix, techBase] of [
        ['IS', TechBase.INNER_SPHERE],
        ['Clan', TechBase.CLAN],
      ] as const) {
        for (const [suffix, rulesLevel] of [
          ['', fallback],
          [' Level 1', RulesLevel.INTRODUCTORY],
          [' Level 2', RulesLevel.STANDARD],
          [' Level 3', RulesLevel.ADVANCED],
          [' Level 4', level4],
          [' Level 5', fallback],
        ] as const) {
          expect(decodeBlkTechnologyHeader(prefix + suffix, family)).toEqual({
            techBase,
            rulesLevel,
          });
        }
      }
    },
  );

  it('keeps explicit engine technology independent of the chassis', () => {
    expect(isClanBlkEngine('Mixed (Clan Chassis) Advanced', 'false')).toBe(
      false,
    );
    expect(isClanBlkEngine('Mixed (IS Chassis) Advanced', 'true')).toBe(true);
    expect(isClanBlkEngine('Mixed (Clan Chassis) Advanced')).toBe(true);
    expect(isClanBlkEngine('Mixed (IS Chassis) Advanced')).toBe(false);
  });
});

describe('qualified Mixed BLK headers', () => {
  it.each(Object.values(UnitType))(
    'decodes both chassis and the suffix for %s',
    (family) => {
      for (const [chassis, techBase] of [
        ['IS', TechBase.INNER_SPHERE],
        ['Clan', TechBase.CLAN],
      ] as const) {
        for (const [suffix, rulesLevel] of [
          ['', RulesLevel.STANDARD],
          [' Advanced', RulesLevel.ADVANCED],
          [' Experimental', RulesLevel.EXPERIMENTAL],
        ] as const) {
          expect(
            decodeBlkTechnologyHeader(
              `Mixed (${chassis} Chassis)${suffix}`,
              family,
            ),
          ).toEqual({ techBase, rulesLevel });
        }
        expect(() =>
          decodeBlkTechnologyHeader(
            `Mixed (${chassis} Chassis) Unofficial`,
            family,
          ),
        ).toThrow(/Unofficial.*RulesLevel/);
      }
    },
  );
});
