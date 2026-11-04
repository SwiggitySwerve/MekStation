/**
 * Vehicle armor intro years against MegaMek 48fcb2f6
 * TestEntity.hasIncorrectIntroYear (:1512-1552, margin 5) and the ArmorType
 * dates cited in ArmorType.ts. Java flags exactly one pinned vehicle this way:
 * Fury CX-17 (year 3052, IS Level 4, armor_type 2 / armor_tech_level 7),
 * "Reactive armor has intro date of 3063".
 */
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import vehicleSources from '@/services/units/unitLoaderService/__tests__/fixtures/vehicles.pinned.json';

import {
  vehicleArmorIntroYearErrors,
  vehicleEngineIntroYearErrors,
} from '../introYear';

const IS = { clan: false, mixed: false };

it.each([
  // Fury CX-17's facts: IS Reactive (:813) introduced 3063 > 3052 + 5.
  [
    { year: 3052, armorCode: 2, armorTechLevel: 7, ...IS },
    ['Reactive armor has intro date of 3063'],
  ],
  // Inside the margin (3063 <= 3058 + 5).
  [{ year: 3058, armorCode: 2, armorTechLevel: 7, ...IS }, []],
  // Clan Reactive (:845) is 3065 on a Clan unit.
  [
    { year: 3055, armorCode: 2, armorTechLevel: 2, clan: true, mixed: false },
    ['Reactive armor has intro date of 3065'],
  ],
  // Clan Ferro-Fibrous (:445, approximate) is 2815; IS Ferro-Fibrous is 2557.
  [
    { year: 2800, armorCode: 1, armorTechLevel: 2, clan: true, mixed: false },
    ['Ferro-Fibrous armor has intro date of 2815'],
  ],
  [{ year: 2600, armorCode: 1, armorTechLevel: 1, ...IS }, []],
  // A Clan-only armor on an IS unit has no IS date: never flagged.
  [{ year: 3000, armorCode: 16, armorTechLevel: 1, ...IS }, []],
  // Mixed tech takes the earliest side: Hardened IS 3047 / Clan 3061.
  [
    { year: 3040, armorCode: 4, clan: true, mixed: true },
    ['Hardened armor has intro date of 3047'],
  ],
  // Vehicular stealth is 3067 (production; no prototype, :1008).
  [
    { year: 3060, armorCode: 22, armorTechLevel: 7, ...IS },
    ['Vehicular Stealth armor has intro date of 3067'],
  ],
  // Java skips armor names no armor registers: "IS Standard" (Standard
  // registers "Standard Armor", ArmorType.java:358-362) and Clan-tech Light
  // Ferro-Fibrous ("Clan Light Ferro-Fibrous"), so neither is ever flagged.
  [{ year: 2100, armorCode: 0, armorTechLevel: 1, ...IS }, []],
  [
    { year: 3000, armorCode: 5, armorTechLevel: 2, clan: true, mixed: false },
    [],
  ],
  // Patchwork and codes without a ported date are not checked.
  [{ year: 2000, armorCode: 7, ...IS }, []],
  [{ year: 2000, armorCode: 43, ...IS }, []],
] as const)('%j', (source, expected) => {
  expect(vehicleArmorIntroYearErrors(source)).toEqual(expected);
});

describe('combat vehicle handler', () => {
  const handler = new VehicleUnitHandler();
  const source = vehicleSources.rows.find(
    (row) => row.path === '3075/Tamerlane Strike Sled (Flamer).blk',
  );
  const validate = (content: string) => {
    const parsed = new BlkParserService().parse(content);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const unit = handler.parse(parsed.data.document);
    if (!unit.success) throw new Error(JSON.stringify(unit.error));
    return handler.validate(unit.data.unit).errors;
  };
  const tag = (content: string, name: string, value: string) =>
    content.replace(
      new RegExp(`<${name}>\\n[^\\n]*\\n</${name}>`),
      `<${name}>\n${value}\n</${name}>`,
    );

  it('reports no armor intro year for the pinned source', () => {
    if (!source) throw new Error('fixture');
    expect(validate(source.content).join('\n')).not.toMatch(
      /armor has intro date/,
    );
  });

  it("reports Java's message for Fury's armor facts", () => {
    if (!source) throw new Error('fixture');
    let content = tag(source.content, 'year', '3052');
    content = tag(content, 'type', 'IS Level 4');
    content = tag(content, 'armor_type', '2');
    content = tag(content, 'armor_tech_level', '7');
    expect(validate(content)).toContain(
      'Reactive armor has intro date of 3063',
    );
  });
});

// Engine part (:1594-1607). BLK engine_type is BLKFile's code (0 FUSION, 1 ICE,
// blk-engine-codes.json), not the Java Engine constant. Java flags exactly two
// pinned vehicles this way: Ground Car (1950, FUSION, rating 10) and Jeep
// (1950, ICE, rating 15), both "has intro date of 2100" (DATE_ES).
const ENGINE_IS = { clanEngine: false, clan: false, mixed: false };
it.each([
  [
    { year: 1950, engineCode: 0, engineRating: 10, ...ENGINE_IS },
    ['10 Fusion has intro date of 2100'],
  ],
  [
    { year: 1950, engineCode: 1, engineRating: 15, ...ENGINE_IS },
    ['15 ICE has intro date of 2100'],
  ],
  // Inside the margin (2100 <= 2095 + 5).
  [{ year: 2095, engineCode: 0, engineRating: 10, ...ENGINE_IS }, []],
  // Clan XL (Engine.java:876, 2824 approximate) on a Clan unit.
  [
    {
      year: 2800,
      engineCode: 2,
      engineRating: 200,
      clanEngine: true,
      clan: true,
      mixed: false,
    },
    ['200 XL has intro date of 2819'],
  ],
  // A rating above 400 is Large (Engine.java:259): Large Fusion 2630 (:815).
  [
    { year: 2600, engineCode: 0, engineRating: 420, ...ENGINE_IS },
    ['420 Fusion has intro date of 2630'],
  ],
  // No engine (NONE, code 8) is never checked; an unknown code is a parse error.
  [{ year: 1000, engineCode: 8, engineRating: 0, ...ENGINE_IS }, []],
  [{ year: 1000, engineCode: 99, engineRating: 10, ...ENGINE_IS }, []],
] as const)('engine %j', (source, expected) => {
  expect(vehicleEngineIntroYearErrors(source)).toEqual(expected);
});
