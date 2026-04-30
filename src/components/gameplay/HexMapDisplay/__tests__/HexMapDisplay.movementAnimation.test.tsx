import { act, render, screen } from '@testing-library/react';

import type { IUnitToken } from '@/types/gameplay';

import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  Facing,
  GameSide,
  MovementType,
  TokenUnitType,
} from '@/types/gameplay';

import { HexMapDisplay } from '../HexMapDisplay';

function makeToken(overrides: Partial<IUnitToken>): IUnitToken {
  return {
    unitId: 'unit',
    name: 'Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'UNT',
    unitType: TokenUnitType.Mech,
    ...overrides,
  };
}

describe('HexMapDisplay movement animation ordering', () => {
  beforeEach(() => {
    useAnimationQueue.getState().reset();
  });

  afterEach(() => {
    useAnimationQueue.getState().reset();
  });

  it('renders moving tokens after static tokens so they appear on top', () => {
    const moving = makeToken({
      unitId: 'moving',
      position: { q: 1, r: 0 },
    });
    const staticToken = makeToken({
      unitId: 'static',
      position: { q: 0, r: 0 },
    });
    useAnimationQueue.getState().enqueue({
      id: 'move-top',
      mapId: 'map-1',
      unitId: moving.unitId,
      kind: 'movement',
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      mode: MovementType.Walk,
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[moving, staticToken]}
        selectedHex={null}
      />,
    );

    const tokenOrder = screen
      .getAllByTestId(/^unit-token-/)
      .map((node) => node.getAttribute('data-testid'));
    expect(tokenOrder).toEqual(['unit-token-static', 'unit-token-moving']);

    act(() => {
      unmount();
    });
  });
});
