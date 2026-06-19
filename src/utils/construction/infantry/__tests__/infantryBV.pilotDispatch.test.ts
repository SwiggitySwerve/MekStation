import { InfantryMotive } from '@/types/unit/InfantryInterfaces';

import { calculateInfantryBV, getInfantryPilotMultiplier } from '../infantryBV';
import { baseInput } from './infantryBV.test.helpers';

describe('Infantry BV Dispatch (spec.md Infantry BV Dispatch)', () => {
  it('calculateInfantryBV returns IInfantryBVBreakdown shape', () => {
    const result = calculateInfantryBV(baseInput());
    expect(result).toHaveProperty('perTrooper');
    expect(result).toHaveProperty('motiveMultiplier');
    expect(result).toHaveProperty('antiMechMultiplier');
    expect(result).toHaveProperty('fieldGunBV');
    expect(result).toHaveProperty('platoonBV');
    expect(result).toHaveProperty('pilotMultiplier');
    expect(result).toHaveProperty('final');
  });
});

describe('Infantry Pilot Multiplier', () => {
  it('defaults to 4/5 gunnery/piloting (= 1.0 baseline)', () => {
    expect(getInfantryPilotMultiplier(undefined, undefined)).toBe(1.0);
  });

  it('uses shared 9x9 matrix - 3/4 gunnery/piloting > 1.0', () => {
    const multiplier = getInfantryPilotMultiplier(3, 4);
    expect(multiplier).toBeGreaterThan(1.0);
  });

  it('final BV = round(platoonBV * pilotMultiplier)', () => {
    const input = baseInput({
      motive: InfantryMotive.FOOT,
      totalTroopers: 28,
      primaryWeapon: {
        id: 'inf-laser-rifle',
        bvOverride: 15,
        damageDivisor: 1,
      },
      gunnery: 3,
      piloting: 4,
    });
    const result = calculateInfantryBV(input);
    const expected = Math.round(result.platoonBV * result.pilotMultiplier);
    expect(result.final).toBe(expected);
  });
});
