import type { IUnitGameState } from '@/types/gameplay';

import {
  isRepresentedUnitImmobile,
  representedUnitImmobileReason,
} from '../unitImmobility';

function makeUnit(overrides: Partial<IUnitGameState>): IUnitGameState {
  return overrides as IUnitGameState;
}

describe('represented unit immobility', () => {
  it('reports shutdown and unconscious pilots as immobile', () => {
    expect(representedUnitImmobileReason(makeUnit({ shutdown: true }))).toBe(
      'Unit is shut down and cannot move',
    );
    expect(
      representedUnitImmobileReason(makeUnit({ pilotConscious: false })),
    ).toBe('Pilot is unconscious and unit cannot move');
    expect(isRepresentedUnitImmobile(makeUnit({ shutdown: true }))).toBe(true);
  });

  it('leaves active units mobile', () => {
    const unit = makeUnit({ shutdown: false, pilotConscious: true });

    expect(representedUnitImmobileReason(unit)).toBeNull();
    expect(isRepresentedUnitImmobile(unit)).toBe(false);
  });
});
