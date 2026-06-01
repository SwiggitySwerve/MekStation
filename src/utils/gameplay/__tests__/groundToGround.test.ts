import type { IUnitGameState, IUnitToken } from '@/types/gameplay';

import { TokenUnitType } from '@/types/gameplay';

import {
  isAirborneCombatToken,
  isAirborneGameUnit,
  isGroundToGroundGameAttack,
  isGroundToGroundTokenAttack,
} from '../groundToGround';

function token(
  overrides: Partial<IUnitToken> & Pick<IUnitToken, 'unitType'>,
): IUnitToken {
  return {
    unitId: 'unit',
    name: 'Unit',
    side: 'player',
    position: { q: 0, r: 0 },
    facing: 0,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'UNIT',
    altitude: 0,
    ...overrides,
  } as IUnitToken;
}

function unit(overrides: Partial<IUnitGameState>): IUnitGameState {
  return overrides as IUnitGameState;
}

describe('ground-to-ground attack gates', () => {
  it('treats airborne aerospace UI tokens as non-ground combatants', () => {
    expect(
      isAirborneCombatToken(
        token({ unitType: TokenUnitType.Aerospace, altitude: 3 }),
      ),
    ).toBe(true);
    expect(
      isAirborneCombatToken(
        token({ unitType: TokenUnitType.Aerospace, altitude: 0 }),
      ),
    ).toBe(false);
    expect(isAirborneCombatToken(token({ unitType: TokenUnitType.Mech }))).toBe(
      false,
    );
  });

  it('treats airborne aerospace game units as non-ground combatants', () => {
    expect(
      isAirborneGameUnit(
        unit({
          combatState: {
            kind: 'aero',
            state: { altitude: 5 },
          } as IUnitGameState['combatState'],
        }),
      ),
    ).toBe(true);
    expect(
      isAirborneGameUnit(
        unit({
          combatState: {
            kind: 'aero',
            state: { altitude: 0 },
          } as IUnitGameState['combatState'],
        }),
      ),
    ).toBe(false);
    expect(isAirborneGameUnit(unit({ combatState: undefined }))).toBe(false);
  });

  it('requires both sides to be grounded for ground-to-ground token attacks', () => {
    const mech = token({ unitType: TokenUnitType.Mech });
    const landedAero = token({
      unitType: TokenUnitType.Aerospace,
      altitude: 0,
    });
    const flyingAero = token({
      unitType: TokenUnitType.Aerospace,
      altitude: 4,
    });

    expect(isGroundToGroundTokenAttack(mech, landedAero)).toBe(true);
    expect(isGroundToGroundTokenAttack(mech, flyingAero)).toBe(false);
    expect(isGroundToGroundTokenAttack(flyingAero, mech)).toBe(false);
  });

  it('requires both sides to be grounded for ground-to-ground game attacks', () => {
    const mech = unit({ combatState: undefined });
    const landedAero = unit({
      combatState: {
        kind: 'aero',
        state: { altitude: 0 },
      } as IUnitGameState['combatState'],
    });
    const flyingAero = unit({
      combatState: {
        kind: 'aero',
        state: { altitude: 4 },
      } as IUnitGameState['combatState'],
    });

    expect(isGroundToGroundGameAttack(mech, landedAero)).toBe(true);
    expect(isGroundToGroundGameAttack(mech, flyingAero)).toBe(false);
    expect(isGroundToGroundGameAttack(flyingAero, mech)).toBe(false);
  });
});
