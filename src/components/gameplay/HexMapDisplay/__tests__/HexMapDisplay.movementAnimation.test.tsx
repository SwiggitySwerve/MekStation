import { act, fireEvent, render, screen } from '@testing-library/react';

import type { IGameEvent, IUnitToken } from '@/types/gameplay';

import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  Facing,
  GameEventType,
  GamePhase,
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

function makeEvent(
  type: GameEventType,
  payload: IGameEvent['payload'],
  sequence = 1,
): IGameEvent {
  return {
    id: `${type}-${sequence}`,
    gameId: 'game',
    sequence,
    timestamp: `2026-04-29T00:00:0${sequence}.000Z`,
    type,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload,
  };
}

describe('HexMapDisplay movement animation ordering', () => {
  beforeEach(() => {
    act(() => {
      useAnimationQueue.getState().reset();
    });
  });

  afterEach(() => {
    act(() => {
      useAnimationQueue.getState().reset();
    });
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

describe('HexMapDisplay tactical visual layers', () => {
  beforeEach(() => {
    act(() => {
      useAnimationQueue.getState().reset();
    });
  });

  afterEach(() => {
    act(() => {
      useAnimationQueue.getState().reset();
    });
  });

  it('renders hover line-of-sight and firing arc overlays from the LOS toggle', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[selected]}
        selectedHex={null}
        attackRange={[{ q: 1, r: 0 }]}
      />,
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));

    expect(screen.getByTestId('firing-arc-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('los-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('los-line')).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });

  it('suppresses LOS and arc overlays while movement animations are active', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    act(() => {
      useAnimationQueue.getState().enqueue({
        id: 'move-selected',
        mapId: 'map-1',
        unitId: selected.unitId,
        kind: 'movement',
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ],
        mode: MovementType.Walk,
      });
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[selected]}
        selectedHex={null}
        attackRange={[{ q: 1, r: 0 }]}
      />,
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));

    expect(screen.queryByTestId('firing-arc-overlay')).toBeNull();
    expect(screen.queryByTestId('los-overlay')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('mounts attack and persistent damage effect layers from event history', () => {
    const attacker = makeToken({
      unitId: 'attacker',
      position: { q: 0, r: 0 },
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 1, r: 0 },
    });
    const events = [
      makeEvent(
        GameEventType.AttackResolved,
        {
          attackerId: 'attacker',
          targetId: 'target',
          weaponId: 'medium-laser',
          roll: 9,
          toHitNumber: 7,
          hit: true,
          damage: 5,
          location: 'centerTorso',
          visualCategory: 'laser',
          visualSubtype: 'medium-laser',
          projectileCount: 1,
        },
        1,
      ),
      makeEvent(
        GameEventType.UnitDestroyed,
        {
          unitId: 'target',
          cause: 'damage',
          killerUnitId: 'attacker',
        },
        2,
      ),
    ];

    render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[attacker, target]}
        events={events}
        selectedHex={null}
      />,
    );

    expect(screen.getByTestId('attack-effects-layer')).toBeInTheDocument();
    expect(
      screen.getByTestId('attack-effect-event-attack_resolved-1'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('persistent-effects-layer')).toBeInTheDocument();
    expect(screen.getByTestId('wreck-marker-target')).toBeInTheDocument();
  });
});
