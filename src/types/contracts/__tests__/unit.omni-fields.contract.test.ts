/**
 * unit.omni-fields.contract.test.ts
 *
 * The optional OmniMek source facts `baseChassisHeatSinks` and `clanName` are declared in the unit
 * contract (isOmni already was). Absent fields must still validate, a non-omni unit may carry a
 * clan name, and the default a saved custom mech writes (-1) must stay valid.
 *
 * MegaMek 48fcb2f64 MtfFile.java:358-359 (omni), :371 and :1717-1718 (base chassis heat sinks),
 * :326 and :1745-1746 (clanname).
 */

import fs from 'node:fs';
import path from 'node:path';

import { createDefaultUnitState } from '@/stores/unitState';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

const UNIT = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      'public',
      'data',
      'units',
      'battlemechs',
      '3-succession-wars',
      'advanced',
      'Annihilator ANH-1G.json',
    ),
    'utf-8',
  ),
) as Record<string, unknown>;

const parses = (extra: Record<string, unknown>) =>
  UnitContract.safeParse({ ...UNIT, ...extra }).success;

describe('unit contract: OmniMek source facts', () => {
  it('still validates a unit that carries none of the three fields', () => {
    expect(UNIT).not.toHaveProperty('baseChassisHeatSinks');
    expect(UNIT).not.toHaveProperty('clanName');
    expect(parses({})).toBe(true);
  });

  it.each([0, 8, 12, -1])('accepts baseChassisHeatSinks %p', (value) => {
    expect(parses({ isOmni: true, baseChassisHeatSinks: value })).toBe(true);
  });

  it.each([1.5, -2, '10', null])('rejects baseChassisHeatSinks %p', (value) => {
    expect(parses({ baseChassisHeatSinks: value })).toBe(false);
  });

  it('accepts a clan name on a non-omni unit and rejects a non-string', () => {
    expect(parses({ clanName: 'Howler' })).toBe(true);
    expect(parses({ isOmni: false, clanName: 'Howler' })).toBe(true);
    expect(parses({ clanName: 5 })).toBe(false);
  });

  it('keeps the parsed values', () => {
    const parsed = UnitContract.parse({
      ...UNIT,
      isOmni: true,
      baseChassisHeatSinks: 9,
      clanName: 'Nova',
    }) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      isOmni: true,
      baseChassisHeatSinks: 9,
      clanName: 'Nova',
    });
  });

  it('validates what a saved custom mech writes: the default -1 and no clan name', () => {
    // serializeCustomUnitState writes baseChassisHeatSinks for every mech and -1 means unspecified;
    // a minimum of 0 would reject every saved custom mech at the contract.
    const state = createDefaultUnitState({
      name: 'Test Mech',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    });
    const saved = serializeCustomUnitState(state, {
      id: state.id,
      chassis: state.chassis,
      variant: state.model,
      era: Era.LATE_SUCCESSION_WARS,
    });
    expect(saved.baseChassisHeatSinks).toBe(-1);
    expect(saved.clanName).toBeUndefined();
    expect(UnitContract.safeParse(saved).success).toBe(true);
  });
});
