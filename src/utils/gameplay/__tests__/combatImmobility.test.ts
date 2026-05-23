import type { IUnitGameState } from '@/types/gameplay';

import { isRepresentedTargetImmobile } from '../combatImmobility';

function makeUnit(overrides: Partial<IUnitGameState>): IUnitGameState {
  return overrides as IUnitGameState;
}

describe('isRepresentedTargetImmobile', () => {
  it('treats shutdown units and unconscious pilots as immobile targets', () => {
    expect(isRepresentedTargetImmobile(makeUnit({ shutdown: true }))).toBe(
      true,
    );
    expect(
      isRepresentedTargetImmobile(makeUnit({ pilotConscious: false })),
    ).toBe(true);
  });

  it('does not treat operational or missing unit state as immobile', () => {
    expect(
      isRepresentedTargetImmobile(
        makeUnit({ shutdown: false, pilotConscious: true }),
      ),
    ).toBe(false);
    expect(isRepresentedTargetImmobile(undefined)).toBe(false);
  });
});
