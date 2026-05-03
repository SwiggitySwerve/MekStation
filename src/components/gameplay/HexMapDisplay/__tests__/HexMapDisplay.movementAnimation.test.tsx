import { act, fireEvent, render, screen } from '@testing-library/react';

import type { IGameEvent, IUnitToken, IWeaponStatus } from '@/types/gameplay';

import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  TerrainType,
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
  } as IUnitToken;
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

function makeWeapon(overrides: Partial<IWeaponStatus> = {}): IWeaponStatus {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'center_torso',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 3, medium: 6, long: 9 },
    ...overrides,
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

  it('renders firing arcs only for the selected friendly unit', () => {
    const enemySelected = makeToken({
      unitId: 'enemy',
      side: GameSide.Opponent,
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[enemySelected]}
        selectedHex={null}
      />,
    );

    expect(screen.queryByTestId('firing-arc-overlay')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('lets the user toggle firing arcs independently from LOS', () => {
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
      />,
    );

    expect(screen.getByTestId('firing-arc-overlay')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('overlay-toggle-arcs'));
    expect(screen.queryByTestId('firing-arc-overlay')).toBeNull();

    fireEvent.click(screen.getByTestId('overlay-toggle-arcs'));
    expect(screen.getByTestId('firing-arc-overlay')).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });

  it('hides the LOS line on hex click while leaving the committed click path to the host', () => {
    const onHexClick = jest.fn();
    const onHexHover = jest.fn();
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
        onHexClick={onHexClick}
        onHexHover={onHexHover}
      />,
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));
    expect(screen.getByTestId('los-line')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('hex-1-0'));

    expect(onHexClick).toHaveBeenCalledWith({ q: 1, r: 0 });
    expect(onHexHover).toHaveBeenLastCalledWith(null);
    expect(screen.queryByTestId('los-line')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('uses configured weapon ranges for firing arc shading', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={3}
        tokens={[selected]}
        selectedHex={null}
        unitWeapons={{
          selected: [makeWeapon({ ranges: { short: 1, medium: 1, long: 1 } })],
        }}
      />,
    );

    expect(screen.getByTestId('firing-arc-hex-0,-1')).toBeInTheDocument();
    expect(screen.queryByTestId('firing-arc-hex-0,-2')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('renders rear-arc information only when no configured weapons are operational', () => {
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
        unitWeapons={{
          selected: [
            makeWeapon({ id: 'destroyed-laser', destroyed: true }),
            makeWeapon({ id: 'dry-ac', ammoRemaining: 0 }),
            makeWeapon({ id: 'jammed-uac', jammed: true }),
          ],
        }}
      />,
    );

    expect(screen.queryByTestId('firing-arc-hex-0,-1')).toBeNull();
    expect(screen.queryByTestId('firing-arc-hex-1,0')).toBeNull();
    expect(screen.getByTestId('firing-arc-hex-0,1')).toHaveAttribute(
      'data-arc',
      'rear',
    );

    act(() => {
      unmount();
    });
  });

  it('toggles the LOS overlay off independently from firing arcs', () => {
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
      />,
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));
    expect(screen.getByTestId('los-line')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    expect(screen.queryByTestId('los-line')).toBeNull();
    expect(screen.getByTestId('firing-arc-overlay')).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });

  it('renders blocked hover LOS as a red line ending at the wall hex', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    const blockerPixel = hexToPixel({ q: 1, r: 0 });
    const targetPixel = hexToPixel({ q: 2, r: 0 });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={2}
        tokens={[selected]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    fireEvent.mouseEnter(screen.getByTestId('hex-2-0'));

    const line = screen.getByTestId('los-line');
    expect(line).toHaveAttribute('data-state', 'blocked');
    expect(line).toHaveAttribute('stroke', '#dc2626');
    expect(line).toHaveAttribute('x2', String(blockerPixel.x));
    expect(line).not.toHaveAttribute('x2', String(targetPixel.x));
    expect(screen.getByTestId('los-annotation-wall-1,0')).toBeInTheDocument();

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

  it('renders sensor rings and last-known fog contacts on the tactical map', () => {
    const scout = makeToken({
      unitId: 'scout',
      sensorRange: 3,
      position: { q: 0, r: 0 },
    });
    const contact = makeToken({
      unitId: 'contact',
      side: GameSide.Opponent,
      fogStatus: 'lastKnown',
      sensorRange: 2,
      position: { q: 3, r: 0 },
      lastKnownPosition: { q: 1, r: 0 },
    });

    render(
      <HexMapDisplay
        mapId="map-1"
        radius={3}
        tokens={[scout, contact]}
        selectedHex={null}
      />,
    );

    expect(screen.getByTestId('sensor-rings-layer')).toBeInTheDocument();
    expect(screen.getByTestId('sensor-ring-scout')).toBeInTheDocument();
    expect(screen.getByTestId('sensor-ring-contact')).toBeInTheDocument();
    expect(screen.getByTestId('fog-marker-contact')).toBeInTheDocument();
  });
});
