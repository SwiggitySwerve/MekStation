/**
 * Regression guard — consciousness check boundary.
 *
 * Bug #4 from `fix-combat-rule-accuracy`: the consciousness comparison was
 * originally `>` (strictly greater than TN) which failed the boundary case:
 * a pilot rolling EXACTLY the target number should remain conscious per
 * TechManual p.87. The fix changed this to `>=`. This suite mocks the
 * dice roll to deterministically assert the boundary behavior.
 *
 * Formula: consciousnessTarget = 3 + currentWounds (inclusive of new wound)
 *
 * @spec openspec/changes/fix-combat-rule-accuracy/specs/piloting-skill-rolls/spec.md
 */

import type { CombatLocation } from '@/types/gameplay';
import type { IUnitDamageState } from '@/utils/gameplay/damage/types';

import { applyPilotDamage } from '@/utils/gameplay/damage/pilot';

jest.mock('@/utils/gameplay/hitLocation', () => {
  const actual = jest.requireActual('@/utils/gameplay/hitLocation');
  return {
    ...actual,
    roll2d6: jest.fn(),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { roll2d6 } = require('@/utils/gameplay/hitLocation');

function stateWithWounds(pilotWounds: number): IUnitDamageState {
  const fullArmor: Readonly<Record<CombatLocation, number>> = {
    head: 9,
    center_torso: 30,
    center_torso_rear: 10,
    left_torso: 20,
    left_torso_rear: 8,
    right_torso: 20,
    right_torso_rear: 8,
    left_arm: 16,
    right_arm: 16,
    left_leg: 24,
    right_leg: 24,
  };
  return {
    armor: fullArmor,
    structure: fullArmor,
    rearArmor: { center_torso: 10, left_torso: 8, right_torso: 8 },
    destroyedLocations: [],
    pilotWounds,
    pilotConscious: true,
    destroyed: false,
  };
}

describe('applyPilotDamage — consciousness boundary regression guard', () => {
  beforeEach(() => {
    (roll2d6 as jest.Mock).mockReset();
  });

  it('computes consciousnessTarget as 3 + newPilotWounds', () => {
    // 3 prior wounds + 1 new = 4 total → target 3 + 4 = 7
    const state = stateWithWounds(3);
    (roll2d6 as jest.Mock).mockReturnValue({ d1: 3, d2: 4, total: 7 });
    const { result } = applyPilotDamage(state, 1, 'head_hit');
    expect(result.consciousnessTarget).toBe(7);
  });

  it('roll equal to target number succeeds (the >= boundary case)', () => {
    const state = stateWithWounds(3);
    // Target = 7, roll = 7 — this is the boundary that was broken by `>`
    (roll2d6 as jest.Mock).mockReturnValue({ d1: 3, d2: 4, total: 7 });
    const { result } = applyPilotDamage(state, 1, 'head_hit');
    expect(result.consciousnessTarget).toBe(7);
    expect(result.consciousnessRoll?.total).toBe(7);
    expect(result.conscious).toBe(true);
  });

  it('roll one below target number fails', () => {
    const state = stateWithWounds(3);
    // Target = 7, roll = 6
    (roll2d6 as jest.Mock).mockReturnValue({ d1: 3, d2: 3, total: 6 });
    const { result, state: newState } = applyPilotDamage(state, 1, 'head_hit');
    expect(result.consciousnessTarget).toBe(7);
    expect(result.conscious).toBe(false);
    expect(newState.pilotConscious).toBe(false);
  });

  it('roll well above target succeeds', () => {
    const state = stateWithWounds(1);
    // Target = 3 + 2 = 5, roll = 10
    (roll2d6 as jest.Mock).mockReturnValue({ d1: 5, d2: 5, total: 10 });
    const { result } = applyPilotDamage(state, 1, 'head_hit');
    expect(result.conscious).toBe(true);
  });

  it('no consciousness check needed when wounds = 0', () => {
    const state = stateWithWounds(0);
    const { result } = applyPilotDamage(state, 0, 'head_hit');
    expect(result.consciousnessCheckRequired).toBe(false);
    expect(roll2d6).not.toHaveBeenCalled();
  });

  it('pilot dies at PILOT_DEATH_WOUND_THRESHOLD (6) — no consciousness check', () => {
    const state = stateWithWounds(5);
    const { result, state: newState } = applyPilotDamage(state, 1, 'head_hit');
    expect(result.dead).toBe(true);
    expect(result.consciousnessCheckRequired).toBe(false);
    expect(newState.destroyed).toBe(true);
    expect(newState.destructionCause).toBe('pilot_death');
  });
});
