/**
 * ObjectiveMarkersLayer render tests.
 *
 * Covers `scenario-objectives` delta-spec scenarios for Objective
 * Marker Rendering (control-state styling, contested distinctness,
 * Capture hold-progress display).
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */

import { render } from '@testing-library/react';

import type { IUnitToken } from '@/types/gameplay';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

import { Facing, GameSide, TokenUnitType } from '@/types/gameplay';

import { HexMapDisplay } from '../HexMapDisplay';

function marker(overrides: Partial<IObjectiveMarker> = {}): IObjectiveMarker {
  return {
    id: 'objective-1',
    hexKey: '0,0',
    objectiveType: 'capture',
    owningSide: 'neutral',
    controlSide: 'neutral',
    controlRule: 'sole-occupancy',
    holdTurnsRequired: 3,
    holdProgress: 0,
    ...overrides,
  };
}

function token(overrides: Partial<IUnitToken>): IUnitToken {
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
  } as IUnitToken;
}

function renderMap(
  objectives: Record<string, IObjectiveMarker>,
  tokens: IUnitToken[] = [],
) {
  return render(
    <HexMapDisplay
      radius={5}
      tokens={tokens}
      selectedHex={null}
      objectives={objectives}
      friendlySide={GameSide.Player}
    />,
  );
}

describe('ObjectiveMarkersLayer', () => {
  it('renders the layer when objectives are present', () => {
    const { getByTestId } = renderMap({ '0,0': marker() });
    expect(getByTestId('objective-markers-layer')).toBeInTheDocument();
    expect(getByTestId('objective-marker-objective-1')).toBeInTheDocument();
  });

  it('does not render the layer for a markerless map', () => {
    const { queryByTestId } = renderMap({});
    expect(queryByTestId('objective-markers-layer')).not.toBeInTheDocument();
  });

  it('styles a player-controlled marker with the friendly style', () => {
    const { getByTestId } = renderMap({
      '0,0': marker({ controlSide: 'player' }),
    });
    expect(
      getByTestId('objective-marker-objective-1').getAttribute(
        'data-control-state',
      ),
    ).toBe('friendly');
  });

  it('styles an opponent-controlled marker with the enemy style', () => {
    const { getByTestId } = renderMap({
      '0,0': marker({ controlSide: 'opponent' }),
    });
    expect(
      getByTestId('objective-marker-objective-1').getAttribute(
        'data-control-state',
      ),
    ).toBe('enemy');
  });

  it('styles a neutral marker with the neutral style', () => {
    const { getByTestId } = renderMap({ '0,0': marker() });
    expect(
      getByTestId('objective-marker-objective-1').getAttribute(
        'data-control-state',
      ),
    ).toBe('neutral');
  });

  it('draws a contested marker with the distinct contested style', () => {
    const { getByTestId } = renderMap(
      { '0,0': marker({ controlSide: 'player' }) },
      [
        token({
          unitId: 'p1',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
        }),
        token({
          unitId: 'o1',
          side: GameSide.Opponent,
          position: { q: 0, r: 0 },
        }),
      ],
    );
    const el = getByTestId('objective-marker-objective-1');
    const state = el.getAttribute('data-control-state');
    expect(state).toBe('contested');
    // Contested must be distinct from neutral / friendly / enemy.
    expect(['neutral', 'friendly', 'enemy']).not.toContain(state);
  });

  it('shows hold progress for a Capture marker', () => {
    const { getByTestId } = renderMap({
      '0,0': marker({
        objectiveType: 'capture',
        holdProgress: 2,
        holdTurnsRequired: 3,
      }),
    });
    expect(getByTestId('objective-progress-objective-1').textContent).toBe(
      '2/3',
    );
  });
});
