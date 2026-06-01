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
  VehicleMotionType,
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

  it('exposes projection mode and isometric camera controls as presentation context', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="projection-controls"
        radius={1}
        tokens={[]}
        selectedHex={null}
      />,
    );

    const projectionLayer = screen.getByTestId('map-projection-layer');
    const projectionToggle = screen.getByTestId('projection-toggle');

    expect(projectionLayer).toHaveAttribute('data-projection-mode', 'topDown');
    expect(projectionToggle).toHaveAttribute(
      'data-map-projection-source',
      'shared-tactical-map-projection',
    );
    expect(projectionToggle).toHaveAttribute(
      'data-map-projection-channel',
      'view-mode',
    );
    expect(projectionToggle).toHaveAttribute(
      'data-map-projection-rules-surface',
      'presentation',
    );
    expect(projectionToggle).toHaveAttribute(
      'data-map-projection-current-mode',
      'topDown',
    );
    expect(projectionToggle).toHaveAttribute(
      'data-map-projection-target-mode',
      'isometric2d',
    );
    expect(projectionToggle).toHaveAttribute(
      'data-map-projection-isometric-rotation-step',
      '0',
    );
    expect(projectionToggle).toHaveAttribute(
      'data-map-projection-isometric-rotation-degrees',
      '0',
    );
    expect(projectionToggle).toHaveAttribute(
      'aria-label',
      'Switch to isometric 2.5D view; current top-down; target isometric 2.5D; projection channel view-mode; rules surface presentation',
    );

    fireEvent.click(projectionToggle);

    expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    expect(projectionToggle).toHaveAttribute(
      'data-map-projection-current-mode',
      'isometric2d',
    );
    expect(projectionToggle).toHaveAttribute(
      'data-map-projection-target-mode',
      'topDown',
    );
    expect(projectionToggle).toHaveAttribute(
      'aria-label',
      'Switch to top-down view; current isometric 2.5D; target top-down; projection channel view-mode; rules surface presentation',
    );

    const rotationHeading = screen.getByTestId('isometric-rotation-heading');
    const rotateLeft = screen.getByTestId('projection-rotate-left');
    const rotateRight = screen.getByTestId('projection-rotate-right');

    expect(rotationHeading).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
    expect(rotationHeading).toHaveAttribute(
      'data-isometric-rotation-degrees',
      '0',
    );
    expect(rotateLeft).toHaveAttribute(
      'data-isometric-camera-source',
      'shared-tactical-map-projection',
    );
    expect(rotateLeft).toHaveAttribute(
      'data-isometric-camera-channel',
      'isometric-camera',
    );
    expect(rotateLeft).toHaveAttribute(
      'data-isometric-camera-rules-surface',
      'presentation',
    );
    expect(rotateLeft).toHaveAttribute(
      'data-isometric-camera-action',
      'rotate-left',
    );
    expect(rotateLeft).toHaveAttribute(
      'data-isometric-camera-current-step',
      '0',
    );
    expect(rotateLeft).toHaveAttribute('data-isometric-camera-next-step', '5');
    expect(rotateLeft).toHaveAttribute(
      'data-isometric-camera-current-degrees',
      '0',
    );
    expect(rotateLeft).toHaveAttribute(
      'data-isometric-camera-next-degrees',
      '300',
    );
    expect(rotateRight).toHaveAttribute(
      'data-isometric-camera-action',
      'rotate-right',
    );
    expect(rotateRight).toHaveAttribute('data-isometric-camera-next-step', '1');
    expect(rotateRight).toHaveAttribute(
      'data-isometric-camera-next-degrees',
      '60',
    );
    expect(rotateRight).toHaveAttribute(
      'aria-label',
      'Rotate isometric camera right; current heading 0 degrees; next heading 60 degrees; projection channel isometric-camera; rules surface presentation',
    );
    const hexGrid = screen.getByTestId('hex-grid');
    expect(hexGrid).toHaveAttribute(
      'data-isometric-keyboard-camera-source',
      'shared-tactical-map-projection',
    );
    expect(hexGrid).toHaveAttribute(
      'data-isometric-keyboard-camera-channel',
      'isometric-camera',
    );
    expect(hexGrid).toHaveAttribute(
      'data-isometric-keyboard-camera-rules-surface',
      'presentation',
    );
    expect(hexGrid).toHaveAttribute(
      'data-isometric-keyboard-camera-controls',
      'q:rotate-left|e:rotate-right',
    );

    fireEvent.click(rotateRight);

    expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '1',
    );
    expect(rotationHeading).toHaveAttribute(
      'data-isometric-rotation-step',
      '1',
    );
    expect(rotationHeading).toHaveAttribute(
      'data-isometric-rotation-degrees',
      '60',
    );
    expect(projectionToggle).toHaveAttribute(
      'data-map-projection-isometric-rotation-step',
      '1',
    );
    expect(projectionToggle).toHaveAttribute(
      'data-map-projection-isometric-rotation-degrees',
      '60',
    );
    expect(rotateLeft).toHaveAttribute(
      'data-isometric-camera-current-step',
      '1',
    );
    expect(rotateLeft).toHaveAttribute('data-isometric-camera-next-step', '0');
    expect(rotateRight).toHaveAttribute(
      'data-isometric-camera-current-step',
      '1',
    );
    expect(rotateRight).toHaveAttribute('data-isometric-camera-next-step', '2');
    fireEvent.keyDown(hexGrid, { key: 'q' });
    expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
    fireEvent.keyDown(hexGrid, { key: 'e' });
    expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '1',
    );

    act(() => {
      unmount();
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

    const losToggle = screen.getByTestId('overlay-toggle-los');
    expect(losToggle).toHaveAttribute('data-map-layer-id', 'los');
    expect(losToggle).toHaveAttribute('data-map-layer-visible', 'false');
    expect(losToggle).toHaveAttribute('data-map-layer-locked', 'false');
    expect(losToggle).toHaveAttribute('data-map-layer-intensity', '1');
    expect(losToggle).toHaveAttribute(
      'data-map-layer-projection-source',
      'shared-tactical-map-projection',
    );
    expect(losToggle).toHaveAttribute(
      'data-map-layer-projection-channel',
      'line-of-sight',
    );
    expect(losToggle).toHaveAttribute(
      'data-map-layer-rules-surface',
      'line-of-sight',
    );
    expect(losToggle).toHaveAttribute(
      'aria-label',
      'Toggle line-of-sight overlay; hidden; projection channel line-of-sight; rules surface line-of-sight',
    );
    fireEvent.click(screen.getByTestId('overlay-toggle-los'));
    expect(losToggle).toHaveAttribute('data-map-layer-visible', 'true');
    expect(losToggle).toHaveAttribute(
      'aria-label',
      'Toggle line-of-sight overlay; visible; projection channel line-of-sight; rules surface line-of-sight',
    );
    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));

    expect(screen.getByTestId('firing-arc-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('firing-arc-label-0,-1')).toHaveTextContent(
      'FRONT',
    );
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
    const firingArcToggle = screen.getByTestId('overlay-toggle-arcs');
    expect(firingArcToggle).toHaveAttribute('data-map-layer-id', 'firingArcs');
    expect(firingArcToggle).toHaveAttribute('data-map-layer-visible', 'true');
    expect(firingArcToggle).toHaveAttribute('data-map-layer-locked', 'false');
    expect(firingArcToggle).toHaveAttribute('data-map-layer-intensity', '1');
    expect(firingArcToggle).toHaveAttribute(
      'data-map-layer-projection-source',
      'shared-tactical-map-projection',
    );
    expect(firingArcToggle).toHaveAttribute(
      'data-map-layer-projection-channel',
      'firing-arc',
    );
    expect(firingArcToggle).toHaveAttribute(
      'data-map-layer-rules-surface',
      'firing-arc',
    );
    expect(firingArcToggle).toHaveAttribute(
      'aria-label',
      'Toggle firing arc overlay; visible; projection channel firing-arc; rules surface firing-arc',
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-arcs'));
    expect(screen.queryByTestId('firing-arc-overlay')).toBeNull();
    expect(firingArcToggle).toHaveAttribute('data-map-layer-visible', 'false');
    expect(firingArcToggle).toHaveAttribute(
      'aria-label',
      'Toggle firing arc overlay; hidden; projection channel firing-arc; rules surface firing-arc',
    );

    fireEvent.click(screen.getByTestId('overlay-toggle-arcs'));
    expect(screen.getByTestId('firing-arc-overlay')).toBeInTheDocument();
    expect(firingArcToggle).toHaveAttribute('data-map-layer-visible', 'true');

    act(() => {
      unmount();
    });
  });

  it('routes movement and cover overlay toggles through typed layer state', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.LightWoods, level: 1 }],
          },
          {
            coordinate: { q: 0, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.HeavyWoods, level: 1 }],
          },
        ]}
      />,
    );

    expect(screen.queryByTestId('movement-overlay')).toBeNull();
    expect(screen.queryByTestId('cover-overlay')).toBeNull();
    const movementToggle = screen.getByTestId('overlay-toggle-movement');
    const coverToggle = screen.getByTestId('overlay-toggle-cover');
    expect(movementToggle).toHaveAttribute('data-map-layer-id', 'movement');
    expect(movementToggle).toHaveAttribute('data-map-layer-visible', 'false');
    expect(movementToggle).toHaveAttribute('data-map-layer-locked', 'false');
    expect(movementToggle).toHaveAttribute('data-map-layer-intensity', '1');
    expect(movementToggle).toHaveAttribute(
      'data-map-layer-projection-source',
      'shared-tactical-map-projection',
    );
    expect(movementToggle).toHaveAttribute(
      'data-map-layer-projection-channel',
      'movement',
    );
    expect(movementToggle).toHaveAttribute(
      'data-map-layer-rules-surface',
      'movement-cost',
    );
    expect(movementToggle).toHaveAttribute(
      'aria-label',
      'Toggle movement cost overlay; hidden; projection channel movement; rules surface movement-cost',
    );
    expect(coverToggle).toHaveAttribute('data-map-layer-id', 'cover');
    expect(coverToggle).toHaveAttribute('data-map-layer-visible', 'false');
    expect(coverToggle).toHaveAttribute('data-map-layer-locked', 'false');
    expect(coverToggle).toHaveAttribute('data-map-layer-intensity', '1');
    expect(coverToggle).toHaveAttribute(
      'data-map-layer-projection-source',
      'shared-tactical-map-projection',
    );
    expect(coverToggle).toHaveAttribute(
      'data-map-layer-projection-channel',
      'cover',
    );
    expect(coverToggle).toHaveAttribute(
      'data-map-layer-rules-surface',
      'cover-level',
    );
    expect(coverToggle).toHaveAttribute(
      'aria-label',
      'Toggle cover level overlay; hidden; projection channel cover; rules surface cover-level',
    );

    fireEvent.click(movementToggle);
    fireEvent.click(coverToggle);

    expect(screen.getByTestId('movement-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('cover-overlay')).toBeInTheDocument();
    expect(movementToggle).toHaveAttribute('data-map-layer-visible', 'true');
    expect(movementToggle).toHaveAttribute(
      'aria-label',
      'Toggle movement cost overlay; visible; projection channel movement; rules surface movement-cost',
    );
    expect(coverToggle).toHaveAttribute('data-map-layer-visible', 'true');
    expect(coverToggle).toHaveAttribute(
      'aria-label',
      'Toggle cover level overlay; visible; projection channel cover; rules surface cover-level',
    );
    expect(screen.getByTestId('movement-cost-overlay-hex-1-0')).toHaveAttribute(
      'data-terrain-movement-cost',
      '2',
    );
    expect(screen.getByTestId('movement-cost-overlay-hex-1-0')).toHaveAttribute(
      'data-terrain-movement-cost-band',
      'medium',
    );
    expect(screen.getByTestId('movement-cost-overlay-hex-1-0')).toHaveAttribute(
      'data-terrain-movement-cost-fill',
      '#eab308',
    );
    expect(
      screen.getByTestId('movement-cost-overlay-hex-1-0'),
    ).toHaveTextContent('T2');
    const movementCostOverlay = screen.getByTestId(
      'movement-cost-overlay-hex-1-0',
    );
    expect(movementCostOverlay.getAttribute('aria-label')).toContain(
      'Terrain movement cost 2; terrain light woods; elevation 0',
    );
    expect(movementCostOverlay.getAttribute('aria-label')).toContain(
      'Projection: Hex 1,0; intent terrain; status neutral',
    );
    expect(
      screen.getByTestId('movement-cost-overlay-hex--1-0'),
    ).toHaveAttribute('data-terrain-movement-cost', '1');
    expect(
      screen.getByTestId('movement-cost-overlay-hex--1-0'),
    ).toHaveAttribute('data-terrain-movement-cost-band', 'low');
    expect(
      screen.getByTestId('movement-cost-overlay-hex--1-0'),
    ).toHaveAttribute('data-terrain-movement-cost-fill', '#22c55e');
    expect(screen.getByTestId('cover-overlay-hex-1-0')).toHaveAttribute(
      'data-cover-level',
      'partial',
    );
    expect(screen.getByTestId('cover-overlay-hex-1-0')).toHaveTextContent(
      'PART',
    );
    const coverOverlay = screen.getByTestId('cover-overlay-hex-1-0');
    expect(coverOverlay.getAttribute('aria-label')).toContain(
      'Partial cover; terrain light woods; elevation 0',
    );
    expect(coverOverlay.getAttribute('aria-label')).toContain(
      'Projection: Hex 1,0; intent terrain; status neutral',
    );
    expect(screen.getByTestId('cover-overlay-hex-0-0')).toHaveAttribute(
      'data-cover-level',
      'full',
    );
    expect(screen.getByTestId('cover-overlay-hex-0-0')).toHaveTextContent(
      'FULL',
    );
    expect(screen.queryByTestId('cover-overlay-hex--1-0')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('exposes movement mode legend state and disabled jump reason', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        mpLegend={{ active: 'run', jumpAvailable: false }}
      />,
    );

    expect(screen.getByTestId('mp-legend')).toHaveClass('pointer-events-none');
    expect(screen.getByTestId('mp-legend-walk')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByTestId('mp-legend-walk')).not.toHaveAttribute(
      'data-selectable',
    );
    expect(screen.getByTestId('mp-legend-walk')).toHaveAttribute(
      'aria-label',
      'Walk movement range; inactive',
    );
    expect(
      screen.getByTestId('mp-legend-walk').querySelector('span'),
    ).toHaveClass('bg-cyan-400');
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByTestId('mp-legend-run').querySelector('span'),
    ).toHaveClass('bg-yellow-500');
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute(
      'aria-label',
      'Run movement range; active',
    );
    expect(screen.getByTestId('mp-legend-jump')).toHaveClass(
      'pointer-events-auto',
    );
    expect(
      screen.getByTestId('mp-legend-jump').querySelector('span'),
    ).toHaveClass('bg-red-500');
    expect(screen.getByTestId('mp-legend-jump')).toHaveAttribute(
      'data-disabled',
      'true',
    );
    expect(screen.getByTestId('mp-legend-jump')).toHaveAttribute(
      'data-disabled-reason',
      'No jump capability',
    );
    expect(screen.getByTestId('mp-legend-jump')).toHaveAttribute(
      'title',
      'No jump capability',
    );
    expect(screen.getByTestId('mp-legend-jump')).toHaveAttribute(
      'aria-label',
      'Jump movement range; inactive; disabled: No jump capability',
    );

    act(() => {
      unmount();
    });
  });

  it('lets selectable map legend movement modes seed movement projection', () => {
    const onMovementModeSelect = jest.fn();
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        mpLegend={{ active: 'run', jumpAvailable: false }}
        onMovementModeSelect={onMovementModeSelect}
      />,
    );

    expect(screen.getByTestId('mp-legend-walk')).toHaveAttribute(
      'data-selectable',
      'true',
    );
    expect(screen.getByTestId('mp-legend-walk')).toHaveAttribute(
      'aria-disabled',
      'false',
    );
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByTestId('mp-legend-jump')).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    fireEvent.click(screen.getByTestId('mp-legend-walk'));
    fireEvent.click(screen.getByTestId('mp-legend-run'));
    fireEvent.click(screen.getByTestId('mp-legend-jump'));

    expect(onMovementModeSelect).toHaveBeenCalledTimes(1);
    expect(onMovementModeSelect).toHaveBeenCalledWith('walk');

    act(() => {
      unmount();
    });
  });

  it('exposes selected movement motive and effective MP values in the legend', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        mpLegend={{
          active: 'run',
          jumpAvailable: false,
          movementMode: 'vtol',
          walkMP: 3,
          runMP: 5,
          jumpMP: 0,
        }}
      />,
    );

    expect(screen.getByTestId('mp-legend')).toHaveAttribute(
      'data-movement-mode',
      'vtol',
    );
    expect(screen.getByTestId('mp-legend')).toHaveAttribute(
      'data-walk-mp',
      '3',
    );
    expect(screen.getByTestId('mp-legend')).toHaveAttribute('data-run-mp', '5');
    expect(screen.getByTestId('mp-legend')).toHaveAttribute(
      'data-jump-mp',
      '0',
    );
    expect(screen.getByTestId('mp-legend-motive')).toHaveTextContent(
      'Motive VTOL',
    );
    expect(screen.getByTestId('mp-legend-motive')).toHaveAttribute(
      'aria-label',
      'Movement motive VTOL',
    );
    expect(screen.getByTestId('mp-legend-run')).toHaveTextContent('Run 5MP');
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute('data-mp', '5');
    expect(screen.getByTestId('mp-legend-run')).toHaveAttribute(
      'aria-label',
      'Run movement range; active; 5 MP; motive VTOL',
    );
    expect(screen.getByTestId('mp-legend-jump')).toHaveTextContent('Jump 0MP');
    expect(screen.getByTestId('mp-legend-jump')).toHaveAttribute(
      'aria-label',
      'Jump movement range; inactive; 0 MP; motive VTOL; disabled: No jump capability',
    );

    act(() => {
      unmount();
    });
  });

  it('renders readable elevation labels and movement cost metadata on hexes', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 0, r: 0 },
            elevation: 2,
            features: [{ type: TerrainType.Clear, level: 0 }],
          },
          {
            coordinate: { q: 1, r: 0 },
            elevation: 1,
            features: [
              { type: TerrainType.LightWoods, level: 1 },
              {
                type: TerrainType.Building,
                level: 2,
                buildingId: 'warehouse-a',
                constructionFactor: 30,
              },
            ],
          },
        ]}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 3,
            terrainCost: 1,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 0,
            standUpRequired: true,
            standUpCost: 2,
            standUpPsrRequired: true,
            standUpPsrReason: 'Standing up',
            standUpPsrTargetNumber: 5,
            standUpPsrModifier: 0,
            movementMode: 'tracked',
            path: [
              { q: 0, r: 0 },
              { q: 1, r: 0 },
            ],
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
      />,
    );

    expect(screen.getByTestId('hex-elevation-label-0-0')).toHaveTextContent(
      '+2',
    );
    expect(screen.getByTestId('hex-elevation-label-1-0')).toHaveTextContent(
      '+1',
    );
    expect(screen.getByTestId('hex-terrain-label-1-0')).toHaveTextContent(
      'BLDG2/LWD',
    );
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'W/TRK 3MP',
    );
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveAttribute(
      'aria-label',
      'walk via tracked reachable: 3 MP',
    );
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveAttribute(
      'data-movement-badge-mode',
      'tracked',
    );
    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveTextContent(
      'STAND 2MP PSR5',
    );
    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveAttribute(
      'aria-label',
      'Must stand before moving: stand-up cost 2 MP; PSR required TN 5',
    );

    const reachable = screen.getByTestId('hex-1-0');
    expect(reachable).toHaveAttribute(
      'data-terrain-features',
      'light_woods,building',
    );
    expect(reachable).toHaveAttribute(
      'data-terrain-building-ids',
      'warehouse-a',
    );
    expect(reachable).toHaveAttribute('data-terrain-building-levels', '2');
    expect(reachable).toHaveAttribute(
      'data-terrain-construction-factors',
      '30',
    );
    expect(reachable).toHaveAttribute('data-terrain-primary', 'building');
    expect(reachable).toHaveAttribute('data-mp-cost', '3');
    expect(reachable).toHaveAttribute('data-terrain-cost', '1');
    expect(reachable).toHaveAttribute('data-heat-generated', '0');
    expect(screen.queryByTestId('hex-heat-badge-1-0')).toBeNull();
    expect(reachable).toHaveAttribute('data-elevation-delta', '1');
    expect(reachable).toHaveAttribute('data-elevation-cost', '1');
    expect(reachable).toHaveAttribute('data-movement-mode', 'tracked');
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-sources',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:light_woods level 1,building level 2 id warehouse-a CF 30 elevation 1',
      ),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-sources',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection:walk/tracked projection',
      ),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('mode tracked'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('terrain cost +1'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('elevation delta +1 cost +1'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('heat +0'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('path 1 step'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('stand-up normal +2 MP'),
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining('stand-up PSR Standing up TN 5'),
    );
    expect(reachable).toHaveAttribute('data-stand-up-required', 'true');
    expect(reachable).toHaveAttribute('data-stand-up-cost', '2');
    expect(reachable).toHaveAttribute('data-stand-up-psr-required', 'true');
    expect(reachable).toHaveAttribute('data-stand-up-psr-target', '5');
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('terrain building L2, light woods L1'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('primary building'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('building warehouse-a'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('level 2 CF 30'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('walk via tracked reachable'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection legal movement'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection detail Hex 1,0; intent movement'),
    );
    expect(reachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    const reachableOverlay = screen.getByTestId('hex-overlay-1-0');
    expect(reachableOverlay).toHaveAttribute(
      'data-hex-overlay-kind',
      'movement-legal',
    );
    expect(reachableOverlay).toHaveAttribute(
      'data-hex-overlay-status',
      'legal',
    );
    expect(reachableOverlay).toHaveAttribute(
      'data-hex-overlay-movement-status',
      'legal',
    );
    expect(reachableOverlay).toHaveAttribute(
      'data-hex-overlay-combat-status',
      'none',
    );
    expect(reachableOverlay).toHaveAttribute(
      'data-hex-overlay-sources',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection',
      ),
    );
    expect(reachableOverlay).toHaveAttribute(
      'data-hex-overlay-explanation',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(reachableOverlay).toHaveAccessibleName(
      expect.stringContaining('Hex 1,0 movement-legal highlight'),
    );
    expect(reachableOverlay).toHaveAccessibleName(
      expect.stringContaining('movement legal'),
    );

    fireEvent.mouseEnter(reachable);
    expect(screen.getByTestId('hex-movement-tooltip-status')).toHaveTextContent(
      'Reachable - walk via tracked',
    );
    expect(screen.getByTestId('hex-movement-tooltip-cost')).toHaveTextContent(
      'MP: 3',
    );
    const movementTerrainContext = screen.getByTestId(
      'hex-movement-tooltip-terrain-context',
    );
    expect(movementTerrainContext).toHaveTextContent(
      'Terrain: light woods, building',
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-tactical-projection-channel',
      'terrain-elevation',
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-terrain-primary',
      'building',
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-terrain-features',
      'light_woods,building',
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-terrain-feature-levels',
      'building:2|light_woods:1',
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:light_woods level 1,building level 2 id warehouse-a CF 30 elevation 1',
      ),
    );
    expect(movementTerrainContext).toHaveAttribute(
      'data-terrain-rule-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:MekStation terrain/elevation grid state; movement and combat channels own legality',
      ),
    );
    const movementElevationContext = screen.getByTestId(
      'hex-movement-tooltip-elevation-context',
    );
    expect(movementElevationContext).toHaveTextContent('Elevation: +1');
    expect(movementElevationContext).toHaveAttribute('data-elevation', '1');
    expect(movementElevationContext).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining('elevation 1'),
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-building-context'),
    ).toHaveTextContent('Building: warehouse-a (level 2, CF 30)');
    expect(
      screen.getByTestId('hex-movement-tooltip-building-context'),
    ).toHaveAttribute('data-terrain-building-ids', 'warehouse-a');
    expect(
      screen.getByTestId('hex-movement-tooltip-building-context'),
    ).toHaveAttribute('data-terrain-building-levels', '2');
    expect(
      screen.getByTestId('hex-movement-tooltip-building-context'),
    ).toHaveAttribute('data-terrain-construction-factors', '30');
    const projectionContext = screen.getByTestId(
      'hex-movement-tooltip-projection-context',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-status',
      'legal',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-intent',
      'movement',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-movement-status',
      'legal',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-combat-status',
      'none',
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-sources',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection:walk/tracked projection',
      ),
    );
    expect(projectionContext).toHaveAttribute(
      'data-tactical-tooltip-explanation',
      expect.stringContaining('Walk reachable 3 MP'),
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-projection-status'),
    ).toHaveTextContent('Projection: Legal - movement');
    expect(
      screen.getByTestId('hex-movement-tooltip-projection-channel-status'),
    ).toHaveTextContent('Movement channel: legal; combat channel: none');
    expect(
      screen.getByTestId('hex-movement-tooltip-projection-explanation'),
    ).toHaveTextContent('Walk reachable 3 MP');
    expect(
      screen.getByTestId('hex-movement-tooltip-projection-sources'),
    ).toHaveTextContent('movement: MegaMek movement rules projection');
    expect(
      screen.getByTestId('hex-movement-tooltip-terrain'),
    ).toHaveTextContent('Terrain cost: +1');
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation'),
    ).toHaveTextContent('Elevation: +1, cost +1');
    expect(screen.getByTestId('hex-movement-tooltip-heat')).toHaveTextContent(
      'Heat: +0',
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-stand-up'),
    ).toHaveTextContent('Stand up: +2 MP');
    expect(
      screen.getByTestId('hex-movement-tooltip-stand-up-psr'),
    ).toHaveTextContent('Standing up TN 5');

    act(() => {
      unmount();
    });
  });

  it('renders intact quad stand-up no-PSR context without relying only on color', () => {
    const automaticSuccessReason =
      'Quad Mek has all four legs and does not need a stand-up PSR';
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 3,
            heatGenerated: 1,
            standUpRequired: true,
            standUpCost: 2,
            standUpPsrRequired: false,
            standUpPsrReason: automaticSuccessReason,
            standUpPsrModifier: 0,
            standUpPsrModifierDetails: [],
            standUpPsrAutomaticSuccessReason: automaticSuccessReason,
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
      />,
    );

    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveTextContent(
      'STAND 2MP',
    );
    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveAttribute(
      'data-stand-up-psr-required',
      'false',
    );
    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveAttribute(
      'data-stand-up-psr-automatic-success-reason',
      automaticSuccessReason,
    );
    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveAttribute(
      'aria-label',
      `Must stand before moving: stand-up cost 2 MP; ${automaticSuccessReason}; no PSR`,
    );

    const reachable = screen.getByTestId('hex-1-0');
    expect(reachable).toHaveAttribute(
      'data-stand-up-psr-automatic-success-reason',
      automaticSuccessReason,
    );
    expect(reachable).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining(`stand-up no PSR ${automaticSuccessReason}`),
    );

    fireEvent.mouseEnter(reachable);
    expect(
      screen.getByTestId('hex-movement-tooltip-stand-up-psr'),
    ).toHaveTextContent(`${automaticSuccessReason}: no PSR`);
    expect(
      screen.getByTestId('hex-movement-tooltip-stand-up-psr'),
    ).toHaveAttribute('data-movement-stand-up-psr-required', 'false');

    act(() => {
      unmount();
    });
  });

  it('preserves walk run and jump options when movement projections share a hex', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 3,
            terrainCost: 1,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 0,
            movementMode: 'tracked',
            reachable: true,
            movementType: MovementType.Walk,
          },
          {
            hex: { q: 1, r: 0 },
            mpCost: 3,
            terrainCost: 2,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 2,
            movementMode: 'tracked',
            reachable: true,
            movementType: MovementType.Run,
          },
          {
            hex: { q: 1, r: 0 },
            mpCost: 1,
            terrainCost: 0,
            elevationDelta: 2,
            elevationCost: 0,
            heatGenerated: 1,
            movementMode: 'jump',
            reachable: true,
            movementType: MovementType.Jump,
          },
        ]}
      />,
    );

    const hex = screen.getByTestId('hex-1-0');
    expect(hex).toHaveAttribute('data-movement-type', 'walk');
    expect(hex).toHaveAttribute('data-movement-option-count', '3');
    expect(hex).toHaveAttribute('data-movement-option-types', 'walk,run,jump');
    expect(hex).toHaveAttribute(
      'data-movement-option-costs',
      'walk:3|run:3|jump:1',
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-states',
      'walk:reachable|run:reachable|jump:reachable',
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-terrain-costs',
      'walk:1|run:2|jump:0',
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-elevation-deltas',
      'walk:1|run:1|jump:2',
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-elevation-costs',
      'walk:1|run:1|jump:0',
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-heats',
      'walk:0|run:2|jump:1',
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining(
        'movement options walk via tracked reachable 3 MP terrain +1 elevation delta +1 cost +1 heat +0, run via tracked reachable 3 MP terrain +2 elevation delta +1 cost +1 heat +2, jump reachable 1 MP terrain +0 elevation delta +2 cost +0 heat +1',
      ),
    );

    const badge = screen.getByTestId('hex-movement-badge-1-0');
    expect(badge).toHaveTextContent('W3/R3/J1 MP');
    expect(badge).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'options walk via tracked reachable 3 MP, terrain +1, elevation delta +1 cost +1, heat +0; run via tracked reachable 3 MP, terrain +2, elevation delta +1 cost +1, heat +2; jump reachable 1 MP, terrain +0, elevation delta +2 cost +0, heat +1',
      ),
    );
    expect(badge).toHaveAttribute('data-movement-badge-option-count', '3');
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-types',
      'walk,run,jump',
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-costs',
      'walk:3|run:3|jump:1',
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-terrain-costs',
      'walk:1|run:2|jump:0',
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-elevation-deltas',
      'walk:1|run:1|jump:2',
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-elevation-costs',
      'walk:1|run:1|jump:0',
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-heats',
      'walk:0|run:2|jump:1',
    );
    expect(badge).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(badge).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(badge).toHaveAttribute('data-tactical-rules-surface', 'movement');
    expect(badge).toHaveAttribute(
      'data-movement-badge-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection:walk/tracked,run/tracked,jump projection: walk via tracked reachable 3 MP terrain +1 elevation delta +1 cost +1 heat +0, run via tracked reachable 3 MP terrain +2 elevation delta +1 cost +1 heat +2, jump reachable 1 MP terrain +0 elevation delta +2 cost +0 heat +1',
      ),
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MoveStep.java',
      ),
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-projection-explanation',
      expect.stringContaining(
        'movement options walk via tracked reachable 3 MP terrain +1 elevation delta +1 cost +1 heat +0',
      ),
    );
    expect(screen.getByTestId('hex-heat-badge-1-0')).toHaveTextContent('+2H');
    expect(screen.getByTestId('hex-heat-badge-1-0')).toHaveAttribute(
      'data-movement-option-heats',
      'walk:0|run:2|jump:1',
    );

    fireEvent.mouseEnter(hex);

    const optionRows = screen.getByTestId('hex-movement-tooltip-mode-options');
    expect(optionRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(optionRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(optionRows).toHaveAttribute(
      'data-movement-option-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MoveStep.java',
      ),
    );
    expect(optionRows).toHaveAttribute('data-movement-option-count', '3');
    expect(optionRows).toHaveAttribute(
      'data-movement-option-types',
      'walk,run,jump',
    );
    expect(optionRows).toHaveAttribute(
      'data-movement-option-costs',
      'walk:3|run:3|jump:1',
    );
    expect(optionRows).toHaveAttribute(
      'data-movement-option-states',
      'walk:reachable|run:reachable|jump:reachable',
    );
    expect(optionRows).toHaveAttribute(
      'data-movement-option-heats',
      'walk:0|run:2|jump:1',
    );
    expect(
      screen.getByTestId(
        'hex-movement-tooltip-mode-options-option-walk-tracked-0',
      ),
    ).toHaveAttribute(
      'data-movement-option-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MovePath.java',
      ),
    );
    expect(
      screen.getByTestId(
        'hex-movement-tooltip-mode-options-option-walk-tracked-0',
      ),
    ).toHaveTextContent(
      'walk via tracked reachable 3 MP, terrain +1, elevation delta +1 cost +1, heat +0',
    );
    expect(
      screen.getByTestId(
        'hex-movement-tooltip-mode-options-option-run-tracked-1',
      ),
    ).toHaveTextContent(
      'run via tracked reachable 3 MP, terrain +2, elevation delta +1 cost +1, heat +2',
    );
    expect(
      screen.getByTestId(
        'hex-movement-tooltip-mode-options-option-jump-jump-2',
      ),
    ).toHaveTextContent(
      'jump reachable 1 MP, terrain +0, elevation delta +2 cost +0, heat +1',
    );

    act(() => {
      unmount();
    });
  });

  it('marks same-hex movement options mixed when one mode is engine-blocked', () => {
    const blockedReason = 'Jump elevation rise of 3 exceeds jump MP 2';

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 3,
            conversionStepCount: 2,
            conversionMpCost: 0,
            heatGenerated: 0,
            movementMode: 'tracked',
            reachable: true,
            movementType: MovementType.Walk,
          },
          {
            hex: { q: 1, r: 0 },
            mpCost: 4,
            altitudeControlStepCount: 1,
            altitudeControlMpCost: 1,
            heatGenerated: 2,
            movementMode: 'tracked',
            reachable: true,
            movementType: MovementType.Run,
          },
          {
            hex: { q: 1, r: 0 },
            mpCost: 1,
            heatGenerated: 1,
            movementMode: 'jump',
            reachable: false,
            movementType: MovementType.Jump,
            blockedReason,
            movementInvalidReason: 'TerrainBlocked',
            movementInvalidDetails: blockedReason,
          },
        ]}
      />,
    );

    const hex = screen.getByTestId('hex-1-0');
    expect(hex).toHaveAttribute('data-tactical-projection-status', 'mixed');
    expect(hex).toHaveAttribute(
      'data-tactical-projection-blocked-reasons',
      `${blockedReason}|TerrainBlocked`,
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-states',
      'walk:reachable|run:reachable|jump:blocked',
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-conversion-step-counts',
      'walk:2',
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-conversion-mp-costs',
      'walk:0',
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-altitude-control-step-counts',
      'run:1',
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-altitude-control-mp-costs',
      'run:1',
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-blocked-reasons',
      `jump:${blockedReason}`,
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-invalid-reasons',
      'jump:TerrainBlocked',
    );
    expect(hex).toHaveAttribute(
      'data-movement-option-invalid-details',
      `jump:${blockedReason}`,
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-explanation',
      expect.stringContaining(`jump blocked 1 MP heat +1: ${blockedReason}`),
    );
    expect(hex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection mixed movement'),
    );
    expect(hex).toHaveAttribute(
      'aria-label',
      expect.stringContaining(`projection blocked ${blockedReason}`),
    );
    expect(hex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection detail Hex 1,0; intent movement'),
    );
    expect(hex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('movement options walk via tracked reachable'),
    );
    expect(hex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('run via tracked reachable 4 MP'),
    );
    expect(hex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('altitude control 1 steps 1 MP'),
    );

    expect(
      screen.getByTestId('hex-projection-status-badge-1-0'),
    ).toHaveAttribute('data-projection-status-badge-status', 'mixed');
    const mixedOverlay = screen.getByTestId('hex-overlay-1-0');
    expect(mixedOverlay).toHaveAttribute('data-hex-overlay-status', 'mixed');
    expect(mixedOverlay).toHaveAttribute(
      'data-hex-overlay-movement-status',
      'mixed',
    );
    expect(mixedOverlay).toHaveAttribute(
      'data-hex-overlay-blocked-reasons',
      `${blockedReason}|TerrainBlocked`,
    );
    expect(mixedOverlay).toHaveAttribute(
      'data-hex-overlay-explanation',
      expect.stringContaining(`jump blocked 1 MP heat +1: ${blockedReason}`),
    );
    expect(mixedOverlay).toHaveAccessibleName(
      expect.stringContaining(`blocked ${blockedReason}; TerrainBlocked`),
    );

    const badge = screen.getByTestId('hex-movement-badge-1-0');
    expect(badge).toHaveTextContent('W3/R4 MP');
    expect(badge).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        `jump blocked 1 MP, heat +1, blocked: ${blockedReason}`,
      ),
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-blocked-reasons',
      `jump:${blockedReason}`,
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-conversion-step-counts',
      'walk:2',
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-conversion-mp-costs',
      'walk:0',
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-altitude-control-step-counts',
      'run:1',
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-altitude-control-mp-costs',
      'run:1',
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-invalid-reasons',
      'jump:TerrainBlocked',
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-option-invalid-details',
      `jump:${blockedReason}`,
    );

    const blockedBadge = screen.getByTestId(
      'hex-movement-blocked-options-badge-1-0',
    );
    expect(blockedBadge).toHaveTextContent('J BLK');
    expect(blockedBadge).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        `jump blocked 1 MP, heat +1, blocked: ${blockedReason}`,
      ),
    );
    expect(blockedBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-count',
      '1',
    );
    expect(blockedBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-types',
      'jump',
    );
    expect(blockedBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-reasons',
      `jump:${blockedReason}`,
    );
    expect(blockedBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-invalid-reasons',
      'jump:TerrainBlocked',
    );
    expect(blockedBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-invalid-details',
      `jump:${blockedReason}`,
    );

    fireEvent.mouseEnter(hex);

    const optionRows = screen.getByTestId('hex-movement-tooltip-mode-options');
    expect(optionRows).toHaveAttribute(
      'data-movement-option-states',
      'walk:reachable|run:reachable|jump:blocked',
    );
    expect(optionRows).toHaveAttribute(
      'data-movement-option-conversion-step-counts',
      'walk:2',
    );
    expect(optionRows).toHaveAttribute(
      'data-movement-option-conversion-mp-costs',
      'walk:0',
    );
    expect(optionRows).toHaveAttribute(
      'data-movement-option-blocked-reasons',
      `jump:${blockedReason}`,
    );
    expect(
      screen.getByTestId(
        'hex-movement-tooltip-mode-options-option-walk-tracked-0',
      ),
    ).toHaveTextContent(
      'walk via tracked reachable 3 MP, conversion 2 steps 0 MP',
    );
    expect(
      screen.getByTestId(
        'hex-movement-tooltip-mode-options-option-walk-tracked-0',
      ),
    ).toHaveAttribute('data-movement-option-conversion-step-count', '2');
    expect(
      screen.getByTestId(
        'hex-movement-tooltip-mode-options-option-walk-tracked-0',
      ),
    ).toHaveAttribute('data-movement-option-conversion-mp-cost', '0');
    expect(
      screen.getByTestId(
        'hex-movement-tooltip-mode-options-option-jump-jump-2',
      ),
    ).toHaveTextContent(
      `jump blocked 1 MP, heat +1, blocked: ${blockedReason}`,
    );
    expect(
      screen.getByTestId(
        'hex-movement-tooltip-mode-options-option-jump-jump-2',
      ),
    ).toHaveAttribute('data-movement-option-state', 'blocked');
    expect(
      screen.getByTestId(
        'hex-movement-tooltip-mode-options-option-jump-jump-2',
      ),
    ).toHaveAttribute('data-movement-option-blocked-reason', blockedReason);
    expect(
      screen.getByTestId(
        'hex-movement-tooltip-mode-options-option-jump-jump-2',
      ),
    ).toHaveAttribute('data-movement-option-invalid-reason', 'TerrainBlocked');
    expect(
      screen.getByTestId(
        'hex-movement-tooltip-mode-options-option-jump-jump-2',
      ),
    ).toHaveAttribute('data-movement-option-invalid-details', blockedReason);

    act(() => {
      unmount();
    });
  });

  it('keeps movement type visible on hovered path cost badges', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hoverMpCost={4}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 4,
            terrainCost: 1,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 2,
            movementMode: 'hover',
            path: [
              { q: 0, r: 0 },
              { q: 1, r: 0 },
            ],
            reachable: true,
            movementType: MovementType.Run,
          },
        ]}
      />,
    );

    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'R/HOV 4MP',
    );

    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));

    expect(screen.queryByTestId('hex-movement-badge-1-0')).toBeNull();
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveTextContent(
      'R/HOV 4MP',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'aria-label',
      'run via hover path preview: 4 MP; terrain +1; elevation delta +1 cost +1; heat +2',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-hover-mp-cost',
      '4',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-type',
      'run',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-mode',
      'hover',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-terrain-cost',
      '1',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-elevation-delta',
      '1',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-elevation-cost',
      '1',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-heat-generated',
      '2',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(
      screen
        .getByTestId('hex-mp-badge-1-0')
        .getAttribute('data-movement-badge-source-refs'),
    ).toContain(
      'movement:megamek:MegaMek movement rules projection:run/hover projection: run via hover reachable 4 MP terrain +1 elevation delta +1 cost +1 heat +2',
    );
    expect(
      screen
        .getByTestId('hex-mp-badge-1-0')
        .getAttribute('data-movement-badge-rule-refs'),
    ).toContain('movement:megamek:MegaMek common/moves/MoveStep.java');

    act(() => {
      unmount();
    });
  });

  it('keeps hovered path cost badges tied to the primary movement option', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hoverMpCost={5}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 5,
            terrainCost: 2,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 2,
            movementMode: 'tracked',
            reachable: true,
            movementType: MovementType.Run,
            movementModeOptions: [
              {
                movementMode: 'tracked',
                movementType: MovementType.Run,
                reachable: true,
                mpCost: 5,
                terrainCost: 2,
                elevationDelta: 1,
                elevationCost: 1,
                heatGenerated: 2,
              },
              {
                movementMode: 'tracked',
                movementType: MovementType.Walk,
                reachable: true,
                mpCost: 3,
                terrainCost: 2,
                elevationDelta: 1,
                elevationCost: 1,
                heatGenerated: 1,
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'R5/W3 MP',
    );

    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));

    expect(screen.queryByTestId('hex-movement-badge-1-0')).toBeNull();
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveTextContent(
      'R/TRK 5MP',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'aria-label',
      'run via tracked path preview: 5 MP; terrain +2; elevation delta +1 cost +1; heat +2',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-hover-mp-cost',
      '5',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-type',
      'run',
    );
    expect(screen.getByTestId('hex-mp-badge-1-0')).toHaveAttribute(
      'data-movement-badge-mode',
      'tracked',
    );
    expect(
      screen
        .getByTestId('hex-mp-badge-1-0')
        .getAttribute('data-movement-badge-source-refs'),
    ).toContain(
      'run/tracked,walk/tracked projection: run via tracked reachable 5 MP terrain +2 elevation delta +1 cost +1 heat +2, walk via tracked reachable 3 MP terrain +2 elevation delta +1 cost +1 heat +1',
    );

    act(() => {
      unmount();
    });
  });

  it('shows terrain and elevation inspection when no action hover is active', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 1,
            features: [
              { type: TerrainType.LightWoods, level: 1 },
              {
                type: TerrainType.Building,
                level: 2,
                buildingId: 'warehouse-a',
                constructionFactor: 30,
              },
            ],
          },
        ]}
      />,
    );

    const inspected = screen.getByTestId('hex-1-0');
    fireEvent.mouseEnter(inspected);

    expect(inspected).toHaveAttribute(
      'data-terrain-building-ids',
      'warehouse-a',
    );
    expect(inspected).toHaveAttribute('data-terrain-building-levels', '2');
    expect(inspected).toHaveAttribute(
      'data-terrain-construction-factors',
      '30',
    );
    expect(inspected).toHaveAttribute(
      'data-tactical-projection-sources',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:light_woods level 1,building level 2 id warehouse-a CF 30 elevation 1',
      ),
    );
    const terrainTooltipTitle = screen.getByTestId('hex-terrain-tooltip-title');
    expect(terrainTooltipTitle).toHaveTextContent(
      'Terrain: light woods, building',
    );
    expect(terrainTooltipTitle).toHaveAttribute(
      'data-tactical-projection-channel',
      'terrain-elevation',
    );
    expect(terrainTooltipTitle).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:light_woods level 1,building level 2 id warehouse-a CF 30 elevation 1',
      ),
    );
    expect(terrainTooltipTitle).toHaveAttribute(
      'data-terrain-rule-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:MekStation terrain/elevation grid state; movement and combat channels own legality',
      ),
    );
    const terrainTooltipElevation = screen.getByTestId(
      'hex-terrain-tooltip-elevation',
    );
    expect(terrainTooltipElevation).toHaveTextContent('Elevation: +1');
    expect(terrainTooltipElevation).toHaveAttribute('data-elevation', '1');
    expect(terrainTooltipElevation).toHaveAttribute(
      'data-terrain-primary',
      'building',
    );
    expect(
      screen.getByTestId('hex-terrain-tooltip-building-id'),
    ).toHaveTextContent('Building: warehouse-a (level 2, CF 30)');
    expect(
      screen.getByTestId('hex-terrain-tooltip-building-id'),
    ).toHaveAttribute('data-terrain-building-ids', 'warehouse-a');
    expect(
      screen.getByTestId('hex-terrain-tooltip-building-id'),
    ).toHaveAttribute('data-terrain-building-levels', '2');
    expect(
      screen.getByTestId('hex-terrain-tooltip-building-id'),
    ).toHaveAttribute('data-terrain-construction-factors', '30');
    expect(screen.getByTestId('hex-terrain-tooltip-cover')).toHaveTextContent(
      'Cover: partial',
    );
    expect(screen.getByTestId('hex-terrain-tooltip-los')).toHaveTextContent(
      'LOS: blocks',
    );
    const terrainProjectionContext = screen.getByTestId(
      'hex-terrain-tooltip-projection-context',
    );
    expect(terrainProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-status',
      'neutral',
    );
    expect(terrainProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-intent',
      'terrain',
    );
    expect(terrainProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-movement-status',
      'none',
    );
    expect(terrainProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-combat-status',
      'none',
    );
    expect(terrainProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-explanation',
      expect.stringContaining('elevation 1'),
    );
    expect(
      screen.getByTestId('hex-terrain-tooltip-projection-status'),
    ).toHaveTextContent('Projection: Neutral - terrain');
    expect(
      screen.getByTestId('hex-terrain-tooltip-projection-channel-status'),
    ).toHaveTextContent('Movement channel: none; combat channel: none');
    expect(
      screen.getByTestId('hex-terrain-tooltip-projection-explanation'),
    ).toHaveTextContent('elevation 1');
    expect(inspected).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection neutral terrain'),
    );
    expect(inspected).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection detail Hex 1,0; intent terrain'),
    );
    expect(inspected).toHaveAttribute(
      'aria-label',
      expect.stringContaining('elevation 1'),
    );
    expect(screen.queryByTestId('hex-movement-tooltip')).toBeNull();
    expect(screen.queryByTestId('hex-combat-tooltip')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('keeps terrain and elevation context visible on generic unreachable hovers', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hoverUnreachable
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 2,
            features: [{ type: TerrainType.HeavyWoods, level: 1 }],
          },
        ]}
      />,
    );

    const unreachable = screen.getByTestId('hex-1-0');
    fireEvent.mouseEnter(unreachable);

    expect(screen.getByTestId('hex-unreachable-tooltip')).toHaveTextContent(
      'Unreachable',
    );
    const unreachableTerrainContext = screen.getByTestId(
      'hex-unreachable-tooltip-terrain-context',
    );
    expect(unreachableTerrainContext).toHaveTextContent('Terrain: heavy woods');
    expect(unreachableTerrainContext).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(unreachableTerrainContext).toHaveAttribute(
      'data-tactical-projection-channel',
      'terrain-elevation',
    );
    expect(unreachableTerrainContext).toHaveAttribute(
      'data-terrain-primary',
      'heavy_woods',
    );
    expect(unreachableTerrainContext).toHaveAttribute(
      'data-terrain-feature-levels',
      'heavy_woods:1',
    );
    expect(unreachableTerrainContext).toHaveAttribute(
      'data-terrain-source-refs',
      expect.stringContaining(
        'terrain-elevation:mekstation:Rendered map terrain/elevation grid:heavy_woods level 1 elevation 2',
      ),
    );
    const unreachableElevationContext = screen.getByTestId(
      'hex-unreachable-tooltip-elevation-context',
    );
    expect(unreachableElevationContext).toHaveTextContent('Elevation: +2');
    expect(unreachableElevationContext).toHaveAttribute('data-elevation', '2');
    const unreachableProjectionContext = screen.getByTestId(
      'hex-unreachable-tooltip-projection-context',
    );
    expect(unreachableProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-status',
      'neutral',
    );
    expect(unreachableProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-intent',
      'terrain',
    );
    expect(unreachableProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-movement-status',
      'none',
    );
    expect(unreachableProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-combat-status',
      'none',
    );
    expect(unreachableProjectionContext).toHaveAttribute(
      'data-tactical-tooltip-explanation',
      expect.stringContaining('elevation 2'),
    );
    expect(
      screen.getByTestId('hex-unreachable-tooltip-projection-status'),
    ).toHaveTextContent('Projection: Neutral - terrain');
    expect(
      screen.getByTestId('hex-unreachable-tooltip-projection-channel-status'),
    ).toHaveTextContent('Movement channel: none; combat channel: none');
    expect(
      screen.getByTestId('hex-unreachable-tooltip-projection-explanation'),
    ).toHaveTextContent('elevation 2');
    expect(unreachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection neutral terrain'),
    );
    expect(unreachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('projection detail Hex 1,0; intent terrain'),
    );
    expect(unreachable).toHaveAttribute(
      'aria-label',
      expect.stringContaining('elevation 2'),
    );

    act(() => {
      unmount();
    });
  });

  it('renders shutdown movement immobility as a blocked map reason', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hoverUnreachable
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 0,
            heatGenerated: 0,
            movementMode: 'walk',
            reachable: false,
            movementType: MovementType.Walk,
            blockedReason: 'Unit is shut down and cannot move',
            movementInvalidReason: 'UnitImmobile',
            movementInvalidDetails: 'Unit is shut down and cannot move',
          },
        ]}
      />,
    );

    const blocked = screen.getByTestId('hex-1-0');
    expect(blocked).toHaveAttribute('data-reachable', 'false');
    expect(blocked).toHaveAttribute(
      'data-movement-invalid-reason',
      'UnitImmobile',
    );
    expect(blocked).toHaveAttribute(
      'data-movement-invalid-details',
      'Unit is shut down and cannot move',
    );
    expect(blocked).toHaveAttribute(
      'aria-label',
      expect.stringContaining('invalid UnitImmobile'),
    );
    expect(
      screen.getByTestId('hex-movement-invalid-badge-1-0'),
    ).toHaveTextContent('SHUT');

    fireEvent.mouseEnter(blocked);
    expect(screen.getByTestId('hex-movement-tooltip-status')).toHaveTextContent(
      'Blocked - walk',
    );
    expect(screen.getByTestId('hex-movement-tooltip-reason')).toHaveTextContent(
      'Unit is shut down and cannot move',
    );

    act(() => {
      unmount();
    });
  });

  it('renders blocked movement reason metadata for illegal destinations', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hoverUnreachable
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: Infinity,
            terrainCost: 1,
            elevationDelta: 0,
            elevationCost: 0,
            heatGenerated: 0,
            movementMode: 'tracked',
            reachable: false,
            movementType: MovementType.Walk,
            blockedReason: 'Water blocks ground movement',
            movementInvalidReason: 'TerrainBlocked',
            movementInvalidDetails: 'Water blocks ground movement',
          },
        ]}
      />,
    );

    const blocked = screen.getByTestId('hex-1-0');
    expect(blocked).toHaveAttribute('data-reachable', 'false');
    expect(blocked).toHaveAttribute('data-movement-mode', 'tracked');
    expect(blocked).toHaveAttribute(
      'data-movement-blocked-reason',
      'Water blocks ground movement',
    );
    expect(blocked).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    expect(blocked).toHaveAttribute(
      'data-movement-invalid-details',
      'Water blocks ground movement',
    );
    expect(blocked).toHaveAttribute(
      'aria-label',
      expect.stringContaining('invalid TerrainBlocked'),
    );
    expect(blocked).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Water blocks ground movement'),
    );
    const invalidBadge = screen.getByTestId('hex-movement-invalid-badge-1-0');
    expect(invalidBadge).toHaveTextContent('WTR');
    expect(invalidBadge).toHaveAttribute('data-invalid-badge-kind', 'movement');
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'TerrainBlocked',
    );
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Water blocks ground movement',
    );

    fireEvent.mouseEnter(blocked);
    expect(screen.getByTestId('hex-movement-tooltip-status')).toHaveTextContent(
      'Blocked - walk via tracked',
    );
    expect(screen.getByTestId('hex-movement-tooltip-cost')).toHaveTextContent(
      'MP: X',
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-terrain-context'),
    ).toHaveTextContent('Terrain: clear');
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation-context'),
    ).toHaveTextContent('Elevation: 0');
    expect(
      screen.getByTestId('hex-movement-tooltip-terrain'),
    ).toHaveTextContent('Terrain cost: +1');
    const reasonRows = screen.getByTestId('hex-movement-tooltip-reason');
    expect(reasonRows).toHaveTextContent('Water blocks ground movement');
    expect(reasonRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(reasonRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(reasonRows).toHaveAttribute(
      'data-tactical-rules-surface',
      'movement',
    );
    expect(reasonRows).toHaveAttribute('data-movement-reachable', 'false');
    expect(reasonRows).toHaveAttribute('data-movement-type', 'walk');
    expect(reasonRows).toHaveAttribute('data-movement-mode', 'tracked');
    expect(reasonRows).toHaveAttribute(
      'data-movement-blocked-reason',
      'Water blocks ground movement',
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-invalid-details',
      'Water blocks ground movement',
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-reason',
      'Water blocks ground movement',
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-reason-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection',
      ),
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-reason-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MoveStep.java',
      ),
    );
    expect(screen.queryByTestId('hex-unreachable-tooltip')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('renders impossible stand-up movement metadata without relying on color', () => {
    const reason = 'Cannot stand with a destroyed leg and both arms destroyed';
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 2,
            heatGenerated: 0,
            standUpRequired: true,
            standUpCost: 2,
            standUpPsrRequired: true,
            standUpPsrReason: 'Standing up',
            standUpPsrTargetNumber: Infinity,
            standUpPsrModifier: 0,
            standUpPsrImpossibleReason: reason,
            movementMode: 'walk',
            reachable: false,
            movementType: MovementType.Walk,
            blockedReason: reason,
            movementInvalidReason: 'InvalidDestination',
            movementInvalidDetails: reason,
          },
        ]}
      />,
    );

    const blocked = screen.getByTestId('hex-1-0');
    expect(blocked).toHaveAttribute('data-reachable', 'false');
    expect(blocked).toHaveAttribute('data-stand-up-required', 'true');
    expect(blocked).toHaveAttribute(
      'data-stand-up-psr-impossible-reason',
      reason,
    );
    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveTextContent(
      'STAND IMP',
    );
    expect(screen.getByTestId('hex-stand-up-badge-1-0')).toHaveAttribute(
      'aria-label',
      `Cannot stand before moving: ${reason}; stand-up cost 2 MP; PSR impossible`,
    );
    expect(
      screen.getByTestId('hex-movement-invalid-badge-1-0'),
    ).toHaveTextContent('STAND');
    expect(blocked).toHaveAttribute(
      'aria-label',
      expect.not.stringContaining('Infinity'),
    );

    fireEvent.mouseEnter(blocked);
    const standUpRows = screen.getByTestId('hex-movement-tooltip-stand-up');
    expect(standUpRows).toHaveTextContent('Stand up: +2 MP');
    expect(standUpRows).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(standUpRows).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(standUpRows).toHaveAttribute(
      'data-tactical-rules-surface',
      'movement',
    );
    expect(standUpRows).toHaveAttribute(
      'data-movement-context-kind',
      'stand-up',
    );
    expect(standUpRows).toHaveAttribute(
      'data-movement-stand-up-required',
      'true',
    );
    expect(standUpRows).toHaveAttribute('data-movement-stand-up-cost', '2');
    expect(standUpRows).toHaveAttribute(
      'data-movement-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek stand-up movement rules projection',
      ),
    );
    expect(standUpRows).toHaveAttribute(
      'data-movement-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/GetUpStep.java',
      ),
    );
    const standUpPsrRows = screen.getByTestId(
      'hex-movement-tooltip-stand-up-psr',
    );
    expect(standUpPsrRows).toHaveTextContent(
      `Standing up impossible - ${reason}`,
    );
    expect(standUpPsrRows).toHaveAttribute(
      'data-movement-context-kind',
      'stand-up-psr',
    );
    expect(standUpPsrRows).toHaveAttribute(
      'data-movement-stand-up-psr-required',
      'true',
    );
    expect(standUpPsrRows).toHaveAttribute(
      'data-movement-stand-up-psr-reason',
      'Standing up',
    );
    expect(standUpPsrRows).not.toHaveAttribute(
      'data-movement-stand-up-psr-target-number',
    );
    expect(standUpPsrRows).toHaveAttribute(
      'data-movement-stand-up-psr-impossible-reason',
      reason,
    );
    expect(standUpPsrRows).toHaveAttribute(
      'data-movement-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek server/totalWarfare/MovePathHandler.java',
      ),
    );
    expect(screen.getByTestId('hex-movement-tooltip-reason')).toHaveTextContent(
      reason,
    );

    act(() => {
      unmount();
    });
  });

  it('renders naval motive movement badges with readable non-color labels', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 1,
            terrainCost: 0,
            elevationDelta: 0,
            elevationCost: 0,
            heatGenerated: 0,
            movementMode: 'naval',
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
      />,
    );

    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'W/NAV 1MP',
    );
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveAttribute(
      'data-movement-badge-mode',
      'naval',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('walk via naval reachable'),
    );

    act(() => {
      unmount();
    });
  });

  it('renders UMU motive movement badges with readable non-color labels', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 1,
            terrainCost: 0,
            elevationDelta: 0,
            elevationCost: 0,
            heatGenerated: 0,
            movementMode: 'umu',
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
      />,
    );

    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'W/UMU 1MP',
    );
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveAttribute(
      'data-movement-badge-mode',
      'umu',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('walk via UMU reachable'),
    );

    act(() => {
      unmount();
    });
  });

  it('renders an insufficient-MP badge for over-budget movement destinations', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 3,
            terrainCost: 2,
            elevationDelta: 0,
            elevationCost: 0,
            heatGenerated: 0,
            reachable: false,
            movementType: MovementType.Walk,
            blockedReason: 'Path costs 3 MP, but only 2 MP is available',
            movementInvalidReason: 'InsufficientMP',
            movementInvalidDetails:
              'Path costs 3 MP, but only 2 MP is available',
          },
        ]}
      />,
    );

    expect(
      screen.getByTestId('hex-movement-invalid-badge-1-0'),
    ).toHaveTextContent('NO MP');

    act(() => {
      unmount();
    });
  });

  it('renders elevation-blocked movement reasons as visible map badges', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: Infinity,
            terrainCost: 1,
            elevationDelta: 3,
            elevationCost: 0,
            reachable: false,
            movementType: MovementType.Walk,
            blockedReason:
              'Elevation change of 3 exceeds ground movement limit',
            movementInvalidReason: 'TerrainBlocked',
            movementInvalidDetails:
              'Elevation change of 3 exceeds ground movement limit',
          },
        ]}
      />,
    );

    const invalidBadge = screen.getByTestId('hex-movement-invalid-badge-1-0');
    expect(invalidBadge).toHaveTextContent('ELEV');
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Elevation change of 3 exceeds ground movement limit',
    );

    act(() => {
      unmount();
    });
  });

  it('renders bridge-clearance movement reasons as visible map badges', () => {
    const reason = 'Naval movement lacks bridge clearance';
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: Infinity,
            terrainCost: 0,
            elevationDelta: 0,
            elevationCost: 0,
            reachable: false,
            movementMode: 'naval',
            movementType: MovementType.Walk,
            blockedReason: reason,
            movementInvalidReason: 'TerrainBlocked',
            movementInvalidDetails: reason,
          },
        ]}
      />,
    );

    const invalidBadge = screen.getByTestId('hex-movement-invalid-badge-1-0');
    expect(invalidBadge).toHaveTextContent('BRDG');
    expect(invalidBadge).toHaveAttribute('data-invalid-badge-reason', reason);
    expect(invalidBadge).toHaveAttribute(
      'data-invalid-badge-code',
      'TerrainBlocked',
    );

    act(() => {
      unmount();
    });
  });

  it('renders airborne altitude-control movement context without relying on color', () => {
    const reason =
      'Airborne WiGE movement uses altitude controls and is not available in the ground movement projection';
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: Infinity,
            terrainCost: 0,
            elevationDelta: 4,
            elevationCost: 0,
            heatGenerated: 0,
            movementMode: 'walk',
            reachable: false,
            movementType: MovementType.Walk,
            blockedReason: reason,
            movementInvalidReason: 'InvalidDestination',
            movementInvalidDetails: reason,
            altitudeControlRequired: true,
            altitudeControlMode: 'wige',
            altitudeControlAltitude: 2,
          },
        ]}
      />,
    );

    const blocked = screen.getByTestId('hex-1-0');
    expect(blocked).toHaveAttribute(
      'data-movement-altitude-control-required',
      'true',
    );
    expect(blocked).toHaveAttribute(
      'data-movement-altitude-control-mode',
      'wige',
    );
    expect(blocked).toHaveAttribute(
      'data-movement-altitude-control-altitude',
      '2',
    );
    expect(blocked).toHaveAttribute(
      'aria-label',
      expect.stringContaining('wige altitude controls at altitude 2'),
    );

    const invalidBadge = screen.getByTestId('hex-movement-invalid-badge-1-0');
    expect(invalidBadge).toHaveTextContent('ALT');
    expect(invalidBadge).toHaveAttribute('data-invalid-badge-reason', reason);

    fireEvent.mouseEnter(blocked);
    const reasonRows = screen.getByTestId('hex-movement-tooltip-reason');
    expect(reasonRows).toHaveAttribute(
      'data-movement-altitude-control-required',
      'true',
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-altitude-control-mode',
      'wige',
    );
    expect(reasonRows).toHaveAttribute(
      'data-movement-altitude-control-altitude',
      '2',
    );
    expect(reasonRows).toHaveTextContent(reason);

    act(() => {
      unmount();
    });
  });

  it('renders terrain and elevation step costs directly on reachable movement hexes', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 3,
            terrainCost: 1,
            elevationDelta: 2,
            elevationCost: 2,
            movementMode: 'tracked',
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
      />,
    );

    const movementHex = screen.getByTestId('hex-1-0');
    expect(movementHex).toHaveAttribute('data-terrain-cost', '1');
    expect(movementHex).toHaveAttribute('data-elevation-delta', '2');
    expect(movementHex).toHaveAttribute('data-elevation-cost', '2');
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'W/TRK 3MP',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveTextContent(
      'T+1 E+2 UP2',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'aria-label',
      'Movement step cost: terrain +1; elevation cost +2; elevation delta +2',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-elevation-cost',
      '2',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection:walk/tracked projection: walk via tracked reachable 3 MP terrain +1 elevation delta +2 cost +2',
      ),
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MoveStep.java',
      ),
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-projection-explanation',
      expect.stringContaining(
        'Walk reachable 3 MP; mode tracked; terrain cost +1; elevation delta +2 cost +2',
      ),
    );

    act(() => {
      unmount();
    });
  });

  it('renders downhill elevation step costs as paid cost with down direction', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 0, r: 0 },
            elevation: 2,
            features: [{ type: TerrainType.Clear, level: 0 }],
          },
          {
            coordinate: { q: 1, r: 0 },
            elevation: 0,
            features: [{ type: TerrainType.Clear, level: 0 }],
          },
        ]}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 3,
            terrainCost: 0,
            elevationDelta: -2,
            elevationCost: 2,
            movementMode: 'tracked',
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
      />,
    );

    const movementHex = screen.getByTestId('hex-1-0');
    expect(screen.getByTestId('hex-elevation-label-0-0')).toHaveTextContent(
      '+2',
    );
    expect(screen.getByTestId('hex-elevation-label-1-0')).toHaveTextContent(
      'Elevation 0',
    );
    expect(movementHex).toHaveAttribute('data-elevation-delta', '-2');
    expect(movementHex).toHaveAttribute('data-elevation-cost', '2');
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveTextContent(
      'E+2 DN2',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'aria-label',
      'Movement step cost: elevation cost +2; elevation delta -2',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-elevation-delta',
      '-2',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-elevation-cost',
      '2',
    );

    act(() => {
      unmount();
    });
  });

  it('renders movement preview path sequence metadata and visible step badges', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={{ q: 0, r: 0 }}
        highlightPath={[
          { q: 0, r: 0 },
          { q: 1, r: 0 },
          { q: 1, r: -1 },
        ]}
      />,
    );

    const startHex = screen.getByTestId('hex-0-0');
    const firstStepHex = screen.getByTestId('hex-1-0');
    const secondStepHex = screen.getByTestId('hex-1--1');

    expect(startHex).toHaveAttribute('data-path-index', '0');
    expect(startHex).toHaveAttribute('data-path-step', 'start');
    expect(firstStepHex).toHaveAttribute('data-path-index', '1');
    expect(firstStepHex).toHaveAttribute('data-path-step', '1');
    expect(secondStepHex).toHaveAttribute('data-path-index', '2');
    expect(secondStepHex).toHaveAttribute('data-path-step', '2');
    expect(secondStepHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('path step 2'),
    );

    expect(screen.getByTestId('hex-path-step-badge-0-0')).toHaveTextContent(
      'S',
    );
    expect(screen.getByTestId('hex-path-step-badge-1-0')).toHaveTextContent(
      '#1',
    );
    expect(screen.getByTestId('hex-path-step-badge-1--1')).toHaveTextContent(
      '#2',
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));
    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    expect(screen.getByTestId('hex-1--1')).toHaveAttribute(
      'data-path-step',
      '2',
    );
    expect(screen.getByTestId('hex-path-step-badge-1--1')).toHaveTextContent(
      '#2',
    );

    act(() => {
      unmount();
    });
  });

  it('summarizes projected path length in the movement hover tooltip', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={2}
        tokens={[]}
        selectedHex={{ q: 0, r: 0 }}
        movementRange={[
          {
            hex: { q: 1, r: -1 },
            mpCost: 4,
            terrainCost: 1,
            elevationDelta: 1,
            elevationCost: 1,
            heatGenerated: 0,
            conversionStepCount: 2,
            conversionMpCost: 0,
            movementMode: 'walk',
            reachable: true,
            movementType: MovementType.Walk,
            path: [
              { q: 0, r: 0 },
              { q: 1, r: 0 },
              { q: 1, r: -1 },
            ],
          },
        ]}
      />,
    );

    const hex = screen.getByTestId('hex-1--1');
    expect(hex).toHaveAttribute('data-movement-conversion-step-count', '2');
    expect(hex).toHaveAttribute('data-movement-conversion-mp-cost', '0');
    const badge = screen.getByTestId('hex-movement-badge-1--1');
    expect(badge).toHaveAttribute(
      'data-movement-badge-conversion-step-count',
      '2',
    );
    expect(badge).toHaveAttribute(
      'data-movement-badge-conversion-mp-cost',
      '0',
    );
    expect(badge).toHaveAttribute(
      'aria-label',
      expect.stringContaining('conversion 2 steps 0 MP'),
    );

    fireEvent.mouseEnter(hex);

    expect(screen.getByTestId('hex-movement-tooltip-cost')).toHaveTextContent(
      'MP: 4',
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-terrain'),
    ).toHaveTextContent('Terrain cost: +1');
    expect(screen.getByTestId('hex-movement-tooltip-terrain')).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(screen.getByTestId('hex-movement-tooltip-terrain')).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(screen.getByTestId('hex-movement-tooltip-terrain')).toHaveAttribute(
      'data-movement-context-kind',
      'terrain-cost',
    );
    expect(screen.getByTestId('hex-movement-tooltip-terrain')).toHaveAttribute(
      'data-movement-terrain-cost',
      '1',
    );
    expect(screen.getByTestId('hex-movement-tooltip-terrain')).toHaveAttribute(
      'data-movement-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection',
      ),
    );
    expect(screen.getByTestId('hex-movement-tooltip-terrain')).toHaveAttribute(
      'data-movement-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MoveStep.java',
      ),
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation'),
    ).toHaveTextContent('Elevation: +1, cost +1');
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation'),
    ).toHaveAttribute('data-movement-context-kind', 'elevation-cost');
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation'),
    ).toHaveAttribute('data-movement-elevation-delta', '1');
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation'),
    ).toHaveAttribute('data-movement-elevation-cost', '1');
    expect(screen.getByTestId('hex-movement-tooltip-heat')).toHaveTextContent(
      'Heat: +0',
    );
    expect(screen.getByTestId('hex-movement-tooltip-heat')).toHaveAttribute(
      'data-movement-context-kind',
      'heat',
    );
    expect(screen.getByTestId('hex-movement-tooltip-heat')).toHaveAttribute(
      'data-movement-heat-generated',
      '0',
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-conversion'),
    ).toHaveTextContent('Conversion: 2 steps, 0 MP');
    expect(
      screen.getByTestId('hex-movement-tooltip-conversion'),
    ).toHaveAttribute('data-movement-context-kind', 'conversion');
    expect(
      screen.getByTestId('hex-movement-tooltip-conversion'),
    ).toHaveAttribute('data-movement-conversion-step-count', '2');
    expect(
      screen.getByTestId('hex-movement-tooltip-conversion'),
    ).toHaveAttribute('data-movement-conversion-mp-cost', '0');
    expect(screen.getByTestId('hex-movement-tooltip-path')).toHaveTextContent(
      'Path: 2 steps',
    );
    expect(screen.getByTestId('hex-movement-tooltip-path')).toHaveAttribute(
      'data-movement-context-kind',
      'path',
    );
    expect(screen.getByTestId('hex-movement-tooltip-path')).toHaveAttribute(
      'data-movement-path-step-count',
      '2',
    );
    expect(screen.getByTestId('hex-movement-tooltip-path')).toHaveAttribute(
      'data-movement-path-coordinates',
      '0,0|1,0|1,-1',
    );
    expect(screen.getByTestId('hex-movement-tooltip-path')).toHaveAttribute(
      'data-movement-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MovePath.java',
      ),
    );

    act(() => {
      unmount();
    });
  });

  it('renders VTOL elevation changes without inventing ground elevation MP costs', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 1,
            terrainCost: 0,
            elevationDelta: 4,
            elevationCost: 0,
            movementMode: 'vtol',
            reachable: true,
            movementType: MovementType.Walk,
          },
        ]}
      />,
    );

    const vtolHex = screen.getByTestId('hex-1-0');
    expect(vtolHex).toHaveAttribute('data-movement-mode', 'vtol');
    expect(vtolHex).toHaveAttribute('data-elevation-delta', '4');
    expect(vtolHex).toHaveAttribute('data-elevation-cost', '0');
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'W/VTOL 1MP',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveTextContent(
      'E+0 UP4',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'aria-label',
      'Movement step cost: elevation cost +0; elevation delta +4',
    );
    expect(screen.getByTestId('hex-movement-cost-badge-1-0')).toHaveAttribute(
      'data-movement-step-elevation-cost',
      '0',
    );

    act(() => {
      unmount();
    });
  });

  it('surfaces automatic WiGE landing consequences on reachable movement hexes', () => {
    const reason =
      'MegaMek automatic WiGE landing: unit moved below the minimum airborne distance';
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 1,
            terrainCost: 0,
            elevationDelta: 2,
            elevationCost: 0,
            movementMode: 'wige',
            reachable: true,
            movementType: MovementType.Walk,
            automaticLandingRequired: true,
            automaticLandingMode: 'wige',
            automaticLandingDistance: 1,
            automaticLandingMinimumDistance: 5,
            automaticLandingReason: reason,
          },
        ]}
      />,
    );

    const wigeHex = screen.getByTestId('hex-1-0');
    expect(wigeHex).toHaveAttribute(
      'data-movement-automatic-landing-required',
      'true',
    );
    expect(wigeHex).toHaveAttribute(
      'data-movement-automatic-landing-mode',
      'wige',
    );
    expect(wigeHex).toHaveAttribute(
      'data-movement-automatic-landing-distance',
      '1',
    );
    expect(wigeHex).toHaveAttribute(
      'data-movement-automatic-landing-minimum-distance',
      '5',
    );
    expect(wigeHex).toHaveAttribute(
      'aria-label',
      expect.stringContaining('automatic WiGE landing 1/5 hexes'),
    );

    const movementBadge = screen.getByTestId('hex-movement-badge-1-0');
    expect(movementBadge).toHaveAttribute(
      'aria-label',
      expect.stringContaining('automatic WiGE landing 1/5 hexes'),
    );
    expect(movementBadge).toHaveAttribute(
      'data-movement-badge-automatic-landing-required',
      'true',
    );
    expect(
      screen.getByTestId('hex-automatic-landing-badge-1-0'),
    ).toHaveAccessibleName(`Automatic WiGE landing after 1/5 hexes: ${reason}`);
    expect(
      screen.getByTestId('hex-automatic-landing-badge-1-0'),
    ).toHaveTextContent('LAND');

    fireEvent.mouseEnter(wigeHex);
    expect(
      screen.getByTestId('hex-movement-tooltip-automatic-landing'),
    ).toHaveTextContent('Automatic WiGE landing: 1/5 hexes');
    expect(
      screen.getByTestId('hex-movement-tooltip-automatic-landing'),
    ).toHaveAttribute('data-movement-context-kind', 'automatic-landing');

    act(() => {
      unmount();
    });
  });

  it('renders jump heat impact as map metadata and a visible badge', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 1,
            terrainCost: 0,
            elevationDelta: 0,
            elevationCost: 0,
            heatGenerated: 1,
            reachable: true,
            movementType: MovementType.Jump,
          },
        ]}
      />,
    );

    const jumpHex = screen.getByTestId('hex-1-0');
    expect(jumpHex).toHaveAttribute('data-heat-generated', '1');
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveTextContent(
      'J 1MP',
    );
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveAttribute(
      'data-movement-badge-type',
      'jump',
    );
    expect(screen.getByTestId('hex-movement-badge-1-0')).toHaveAttribute(
      'data-movement-badge-heat-generated',
      '1',
    );
    expect(screen.getByTestId('hex-heat-badge-1-0')).toHaveTextContent('+1H');
    expect(screen.getByTestId('hex-heat-badge-1-0')).toHaveAttribute(
      'aria-label',
      'Heat generated +1',
    );

    act(() => {
      unmount();
    });
  });

  it('renders too-high jump landings as elevation-blocked map hexes', () => {
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 3,
            features: [{ type: TerrainType.Clear, level: 0 }],
          },
        ]}
        movementRange={[
          {
            hex: { q: 1, r: 0 },
            mpCost: 1,
            terrainCost: 0,
            elevationDelta: 3,
            elevationCost: 0,
            heatGenerated: 0,
            movementMode: 'jump',
            reachable: false,
            movementType: MovementType.Jump,
            blockedReason: 'Jump elevation rise of 3 exceeds jump MP 2',
            movementInvalidReason: 'TerrainBlocked',
            movementInvalidDetails:
              'Jump elevation rise of 3 exceeds jump MP 2',
          },
        ]}
      />,
    );

    const jumpHex = screen.getByTestId('hex-1-0');
    expect(jumpHex).toHaveAttribute('data-reachable', 'false');
    expect(jumpHex).toHaveAttribute('data-elevation', '3');
    expect(jumpHex).toHaveAttribute('data-elevation-delta', '3');
    expect(jumpHex).toHaveAttribute('data-elevation-cost', '0');
    expect(jumpHex).toHaveAttribute(
      'data-movement-invalid-reason',
      'TerrainBlocked',
    );
    expect(jumpHex).toHaveAttribute(
      'data-movement-invalid-details',
      'Jump elevation rise of 3 exceeds jump MP 2',
    );
    expect(
      screen.getByTestId('hex-movement-invalid-badge-1-0'),
    ).toHaveTextContent('ELEV');
    expect(
      screen.getByTestId('hex-movement-invalid-badge-1-0'),
    ).toHaveAttribute(
      'data-invalid-badge-reason',
      'Jump elevation rise of 3 exceeds jump MP 2',
    );

    fireEvent.mouseEnter(jumpHex);
    expect(screen.getByTestId('hex-movement-tooltip-status')).toHaveTextContent(
      'Blocked - jump',
    );
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation-context'),
    ).toHaveTextContent('Elevation: +3');
    expect(
      screen.getByTestId('hex-movement-tooltip-elevation'),
    ).toHaveTextContent('Elevation: +3, cost +0');
    expect(screen.getByTestId('hex-movement-tooltip-reason')).toHaveTextContent(
      'Jump elevation rise of 3 exceeds jump MP 2',
    );

    act(() => {
      unmount();
    });
  });

  it('switches to rotatable render-only isometric 2.5D without changing axial clicks', () => {
    const onHexClick = jest.fn();
    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 2,
            features: [{ type: TerrainType.Clear, level: 0 }],
          },
        ]}
        onHexClick={onHexClick}
      />,
    );

    const projectionLayer = screen.getByTestId('map-projection-layer');
    expect(projectionLayer).toHaveAttribute('data-projection-mode', 'topDown');

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(projectionLayer).toHaveAttribute(
      'data-projection-mode',
      'isometric2d',
    );
    expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveTextContent(
      'View 0 deg',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveAttribute(
      'data-isometric-rotation-degrees',
      '0',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveAttribute(
      'aria-label',
      'Isometric camera heading 0 degrees',
    );
    expect(projectionLayer.getAttribute('transform')).toContain('rotate(0)');
    expect(projectionLayer.getAttribute('transform')).toContain('matrix(');
    expect(screen.getByTestId('hex-elevation-stack-1-0')).toBeInTheDocument();
    expect(
      screen.getByTestId('hex-elevation-stack-layer-1-0-2'),
    ).toHaveAttribute('data-elevation-layer', '2');
    expect(
      screen.getByTestId('hex-elevation-stack-layer-1-0-2'),
    ).toHaveTextContent('+2');
    expect(
      screen.getByTestId('hex-elevation-stack-layer-1-0-1'),
    ).toHaveAttribute('aria-label', 'Elevation layer +1 of hex 1,0');

    fireEvent.click(screen.getByTestId('projection-rotate-right'));

    expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '1',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveTextContent(
      'View 60 deg',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveAttribute(
      'data-isometric-rotation-step',
      '1',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveAttribute(
      'data-isometric-rotation-degrees',
      '60',
    );
    expect(projectionLayer.getAttribute('transform')).toContain('rotate(60)');

    fireEvent.click(screen.getByTestId('projection-rotate-left'));

    expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
    expect(projectionLayer.getAttribute('transform')).toContain('rotate(0)');

    fireEvent.click(screen.getByTestId('projection-rotate-left'));

    expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '5',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveTextContent(
      'View 300 deg',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveAttribute(
      'data-isometric-rotation-step',
      '5',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveAttribute(
      'data-isometric-rotation-degrees',
      '300',
    );
    expect(projectionLayer.getAttribute('transform')).toContain('rotate(300)');

    fireEvent.click(screen.getByTestId('reset-view-btn'));

    expect(projectionLayer).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveTextContent(
      'View 0 deg',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
    expect(screen.getByTestId('isometric-rotation-heading')).toHaveAttribute(
      'data-isometric-rotation-degrees',
      '0',
    );
    expect(projectionLayer.getAttribute('transform')).toContain('rotate(0)');

    fireEvent.click(screen.getByTestId('hex-1-0'));
    expect(onHexClick).toHaveBeenCalledWith({ q: 1, r: 0 });

    act(() => {
      unmount();
    });
  });

  it('reorders rendered isometric hex depth when the camera rotates', () => {
    const { unmount } = render(
      <HexMapDisplay mapId="map-1" radius={1} tokens={[]} selectedHex={null} />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    const unrotatedEast = screen.getByTestId('isometric-scene-hex-1-0');
    const unrotatedSouth = screen.getByTestId('isometric-scene-hex-0-1');
    expect(
      Number(unrotatedEast.getAttribute('data-isometric-depth-key')),
    ).toBeLessThan(
      Number(unrotatedSouth.getAttribute('data-isometric-depth-key')),
    );
    expect(unrotatedEast.compareDocumentPosition(unrotatedSouth)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    fireEvent.click(screen.getByTestId('projection-rotate-right'));

    const rotatedEast = screen.getByTestId('isometric-scene-hex-1-0');
    const rotatedSouth = screen.getByTestId('isometric-scene-hex-0-1');
    expect(
      Number(rotatedEast.getAttribute('data-isometric-depth-key')),
    ).toBeGreaterThan(
      Number(rotatedSouth.getAttribute('data-isometric-depth-key')),
    );
    expect(rotatedSouth.compareDocumentPosition(rotatedEast)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    act(() => {
      unmount();
    });
  });

  it('depth-sorts isometric terrain and units while boosting highlighted units', () => {
    const ordinary = makeToken({
      unitId: 'ordinary',
      position: { q: 0, r: -1 },
    });
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[ordinary, selected]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 0, r: 1 },
            elevation: 5,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    const ordinaryToken = screen.getByTestId('isometric-scene-token-ordinary');
    const foregroundHex = screen.getByTestId('isometric-scene-hex-0-1');
    const selectedToken = screen.getByTestId('isometric-scene-token-selected');

    expect(ordinaryToken.compareDocumentPosition(foregroundHex)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(foregroundHex.compareDocumentPosition(selectedToken)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(ordinaryToken).not.toHaveAttribute(
      'data-isometric-foreground-boost',
      'true',
    );
    expect(selectedToken).toHaveAttribute(
      'data-isometric-foreground-boost',
      'true',
    );
    expect(
      Number(ordinaryToken.getAttribute('data-isometric-depth-key')),
    ).toBeLessThan(
      Number(foregroundHex.getAttribute('data-isometric-depth-key')),
    );
    expect(
      Number(selectedToken.getAttribute('data-isometric-depth-key')),
    ).toBeGreaterThan(
      Number(foregroundHex.getAttribute('data-isometric-depth-key')),
    );

    act(() => {
      unmount();
    });
  });

  it('preserves aerospace altitude and velocity on isometric scene tokens', () => {
    const aerospace = makeToken({
      unitId: 'aero',
      position: { q: 0, r: 0 },
      unitType: TokenUnitType.Aerospace,
      altitude: 4,
      velocity: 7,
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[aerospace]}
        selectedHex={null}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    const sceneToken = screen.getByTestId('isometric-scene-token-aero');
    expect(sceneToken).toHaveAttribute(
      'data-isometric-token-unit-type',
      TokenUnitType.Aerospace,
    );
    expect(sceneToken).toHaveAttribute(
      'data-isometric-aerospace-altitude',
      '4',
    );
    expect(sceneToken).toHaveAttribute(
      'data-isometric-aerospace-velocity',
      '7',
    );
    expect(sceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Isometric token Unit'),
    );
    expect(sceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('altitude 4'),
    );
    expect(sceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('velocity 7'),
    );
    expect(sceneToken.querySelector('title')).toHaveTextContent('altitude 4');
    expect(sceneToken.querySelector('title')).toHaveTextContent('velocity 7');

    const nestedToken = screen.getByTestId('unit-token-aero');
    expect(nestedToken).toHaveAttribute('data-aerospace-altitude', '4');
    expect(nestedToken).toHaveAttribute('data-aerospace-velocity', '7');

    act(() => {
      unmount();
    });
  });

  it('preserves WiGE altitude on isometric scene vehicle tokens', () => {
    const wige = makeToken({
      unitId: 'wige',
      position: { q: 0, r: 0 },
      unitType: TokenUnitType.Vehicle,
      vehicleMotionType: VehicleMotionType.WiGE,
      altitude: 2,
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[wige]}
        selectedHex={null}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    const sceneToken = screen.getByTestId('isometric-scene-token-wige');
    expect(sceneToken).toHaveAttribute(
      'data-isometric-token-unit-type',
      TokenUnitType.Vehicle,
    );
    expect(sceneToken).toHaveAttribute(
      'data-isometric-vehicle-motion-type',
      VehicleMotionType.WiGE,
    );
    expect(sceneToken).toHaveAttribute('data-isometric-vehicle-altitude', '2');
    expect(sceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('motion wige'),
    );
    expect(sceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('altitude 2'),
    );
    expect(sceneToken.querySelector('title')).toHaveTextContent('altitude 2');

    const nestedToken = screen.getByTestId('unit-token-wige');
    expect(nestedToken).toHaveAttribute('data-vehicle-altitude', '2');
    expect(screen.getByTestId('vehicle-altitude-badge')).toHaveTextContent(
      'ALT2',
    );

    act(() => {
      unmount();
    });
  });

  it('boosts units hidden behind tall terrain from the isometric camera angle', () => {
    const occluded = makeToken({
      unitId: 'occluded',
      position: { q: 0, r: 0 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[occluded]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 4,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    expect(
      screen.queryByTestId('isometric-visibility-halo-occluded'),
    ).toBeNull();

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(
      screen.getByTestId('isometric-visibility-halo-occluded'),
    ).toBeInTheDocument();
    const occludedSceneToken = screen.getByTestId(
      'isometric-scene-token-occluded',
    );
    expect(occludedSceneToken).toHaveAttribute(
      'data-isometric-foreground-boost',
      'true',
    );
    expect(occludedSceneToken).toHaveAttribute(
      'data-isometric-occluder-hex',
      '1,0',
    );
    expect(occludedSceneToken).toHaveAttribute(
      'data-isometric-occluder-elevation',
      '5',
    );
    expect(occludedSceneToken).toHaveAttribute(
      'data-isometric-occlusion-reason',
      'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
    );
    expect(occludedSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('foreground readability boost'),
    );
    expect(occludedSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'terrain occlusion Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
      ),
    );
    expect(occludedSceneToken.querySelector('title')).toHaveTextContent(
      'foreground readability boost',
    );
    expect(occludedSceneToken.querySelector('title')).toHaveTextContent(
      'terrain occlusion Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
    );
    expect(screen.getByTestId('unit-token-occluded')).toHaveAttribute(
      'data-visibility-boost',
      'true',
    );
    expect(screen.getByTestId('unit-token-occluded')).toHaveAttribute(
      'data-isometric-occlusion-reason',
      'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
    );
    expect(screen.getByTestId('unit-token-occluded')).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
      ),
    );
    expect(
      screen.getByTestId('isometric-visibility-reason-occluded'),
    ).toHaveTextContent('ELEV');
    expect(
      screen.getByTestId('isometric-visibility-reason-occluded'),
    ).toHaveAttribute(
      'data-isometric-occlusion-reason',
      'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occluder-elevation',
      '5',
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occlusion-reasons',
      'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
    );
    const occluderHighlight = screen.getByTestId(
      'hex-isometric-occluder-highlight-1-0',
    );
    expect(occluderHighlight).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(occluderHighlight).toHaveAttribute(
      'aria-label',
      'Tall elevation +5 may hide units occluded',
    );
    expect(occluderHighlight.querySelector('title')).toHaveTextContent(
      'Tall elevation +5 may hide units occluded',
    );
    expect(screen.getByTestId('hex-elevation-stack-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );

    fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));

    const tooltipOccluder = screen.getByTestId(
      'hex-terrain-tooltip-isometric-occluder',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occluder-elevation',
      '5',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occluder-hex',
      '1,0',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
    expect(
      screen.getByTestId('hex-terrain-tooltip-isometric-occluder-units'),
    ).toHaveTextContent('may hide occluded');
    expect(
      screen.getByTestId('hex-terrain-tooltip-isometric-occluder-rotation'),
    ).toHaveTextContent('Occluder elevation +5; camera 0 deg');
    expect(
      screen.getByTestId('hex-terrain-tooltip-isometric-occluder-reasons'),
    ).toHaveTextContent(
      'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
    );

    fireEvent.click(screen.getByTestId('projection-rotate-right'));
    fireEvent.click(screen.getByTestId('projection-rotate-right'));
    fireEvent.click(screen.getByTestId('projection-rotate-right'));

    expect(
      screen.queryByTestId('isometric-visibility-halo-occluded'),
    ).toBeNull();
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).not.toHaveAttribute('data-isometric-foreground-boost', 'true');
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).not.toHaveAttribute('data-isometric-occlusion-reason');
    expect(screen.getByTestId('unit-token-occluded')).not.toHaveAttribute(
      'data-isometric-occlusion-reason',
    );
    expect(
      screen.queryByTestId('isometric-visibility-reason-occluded'),
    ).toBeNull();
    expect(screen.getByTestId('hex-1-0')).not.toHaveAttribute(
      'data-isometric-occludes-units',
    );
    expect(
      screen.queryByTestId('hex-isometric-occluder-highlight-1-0'),
    ).toBeNull();
    expect(screen.getByTestId('hex-elevation-stack-1-0')).not.toHaveAttribute(
      'data-isometric-occludes-units',
    );
    expect(
      screen.queryByTestId('hex-terrain-tooltip-isometric-occluder'),
    ).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('moves occluder highlights when rotation puts a different elevation in front', () => {
    const occluded = makeToken({
      unitId: 'occluded',
      position: { q: 0, r: 0 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[occluded]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 4,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
          {
            coordinate: { q: -1, r: 0 },
            elevation: 5,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-hex', '1,0');
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-elevation', '5');
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(screen.getByTestId('hex--1-0')).not.toHaveAttribute(
      'data-isometric-occludes-units',
    );

    fireEvent.click(screen.getByTestId('projection-rotate-right'));
    fireEvent.click(screen.getByTestId('projection-rotate-right'));
    fireEvent.click(screen.getByTestId('projection-rotate-right'));

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-isometric-rotation-step',
      '3',
    );
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-hex', '-1,0');
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-elevation', '6');
    expect(screen.getByTestId('hex-1-0')).not.toHaveAttribute(
      'data-isometric-occludes-units',
    );
    expect(screen.getByTestId('hex--1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(
      screen.queryByTestId('hex-isometric-occluder-highlight-1-0'),
    ).toBeNull();
    expect(
      screen.getByTestId('hex-isometric-occluder-highlight--1-0'),
    ).toHaveAttribute('data-isometric-occludes-units', 'occluded');

    fireEvent.mouseEnter(screen.getByTestId('hex--1-0'));

    const tooltipOccluder = screen.getByTestId(
      'hex-terrain-tooltip-isometric-occluder',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occluder-hex',
      '-1,0',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occluder-elevation',
      '6',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-rotation-step',
      '3',
    );
    expect(
      screen.getByTestId('hex-terrain-tooltip-isometric-occluder-rotation'),
    ).toHaveTextContent('Occluder elevation +6; camera 180 deg');
    expect(
      screen.getByTestId('hex-terrain-tooltip-isometric-occluder-reasons'),
    ).toHaveTextContent(
      'Elevated terrain +6 at (-1, 0) may hide unit at elevation +0',
    );

    fireEvent.click(screen.getByTestId('projection-rotate-right'));
    fireEvent.click(screen.getByTestId('projection-rotate-right'));
    fireEvent.click(screen.getByTestId('projection-rotate-right'));

    expect(screen.getByTestId('map-projection-layer')).toHaveAttribute(
      'data-isometric-rotation-step',
      '0',
    );
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-hex', '1,0');
    expect(
      screen.getByTestId('isometric-scene-token-occluded'),
    ).toHaveAttribute('data-isometric-occluder-elevation', '5');
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(screen.getByTestId('hex--1-0')).not.toHaveAttribute(
      'data-isometric-occludes-units',
    );
    expect(
      screen.getByTestId('hex-isometric-occluder-highlight-1-0'),
    ).toHaveAttribute('data-isometric-occludes-units', 'occluded');
    expect(
      screen.queryByTestId('hex-isometric-occluder-highlight--1-0'),
    ).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('highlights multiple tall terrain layers that may hide the same unit', () => {
    const occluded = makeToken({
      unitId: 'occluded',
      position: { q: 0, r: 0 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[occluded]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 4,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
          {
            coordinate: { q: 0, r: 1 },
            elevation: 2,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    const sceneToken = screen.getByTestId('isometric-scene-token-occluded');
    expect(sceneToken).toHaveAttribute('data-isometric-occluder-hex', '1,0');
    expect(sceneToken).toHaveAttribute(
      'data-isometric-occluder-hexes',
      '1,0|0,1',
    );
    expect(sceneToken).toHaveAttribute(
      'data-isometric-occluder-elevations',
      '5|3',
    );
    expect(sceneToken).toHaveAttribute('data-isometric-occluder-count', '2');
    expect(sceneToken).toHaveAttribute(
      'data-isometric-occlusion-reasons',
      expect.stringContaining(
        'Elevated terrain +5 at (1, 0) may hide unit at elevation +0',
      ),
    );
    expect(sceneToken).toHaveAttribute(
      'data-isometric-occlusion-reasons',
      expect.stringContaining(
        'Elevated terrain +3 at (0, 1) may hide unit at elevation +0',
      ),
    );
    expect(sceneToken.querySelector('title')).toHaveTextContent(
      'terrain occlusions 2 blockers',
    );
    expect(screen.getByTestId('unit-token-occluded')).toHaveAttribute(
      'data-isometric-occlusion-reason',
      expect.stringContaining(
        'Elevated terrain +3 at (0, 1) may hide unit at elevation +0',
      ),
    );
    expect(screen.getByTestId('hex-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(screen.getByTestId('hex-0-1')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(
      screen.getByTestId('hex-isometric-occluder-highlight-1-0'),
    ).toHaveAttribute('data-isometric-occludes-units', 'occluded');
    expect(
      screen.getByTestId('hex-isometric-occluder-highlight-0-1'),
    ).toHaveAttribute('data-isometric-occludes-units', 'occluded');
    expect(screen.getByTestId('hex-elevation-stack-1-0')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );
    expect(screen.getByTestId('hex-elevation-stack-0-1')).toHaveAttribute(
      'data-isometric-occludes-units',
      'occluded',
    );

    fireEvent.mouseEnter(screen.getByTestId('hex-0-1'));

    const tooltipOccluder = screen.getByTestId(
      'hex-terrain-tooltip-isometric-occluder',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occluder-hex',
      '0,1',
    );
    expect(tooltipOccluder).toHaveAttribute(
      'data-isometric-occluder-elevation',
      '3',
    );
    expect(
      screen.getByTestId('hex-terrain-tooltip-isometric-occluder-reasons'),
    ).toHaveTextContent(
      'Elevated terrain +3 at (0, 1) may hide unit at elevation +0',
    );

    act(() => {
      unmount();
    });
  });

  it('distinguishes isometric fog visibility rules from terrain occlusion', () => {
    const hiddenContact = makeToken({
      unitId: 'hidden-contact',
      name: 'Hidden scout',
      side: GameSide.Opponent,
      fogStatus: 'hidden',
      position: { q: 0, r: 0 },
    });
    const lastKnownContact = makeToken({
      unitId: 'last-known-contact',
      name: 'Last known scout',
      side: GameSide.Opponent,
      fogStatus: 'lastKnown',
      position: { q: 2, r: 0 },
      lastKnownPosition: { q: -1, r: 0 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={2}
        tokens={[hiddenContact, lastKnownContact]}
        selectedHex={null}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 4,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    expect(
      screen.queryByTestId('isometric-visibility-rule-hidden-contact'),
    ).toBeNull();
    expect(screen.getByTestId('fog-marker-hidden-contact')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('projection-toggle'));

    const hiddenToken = screen.getByTestId('unit-token-hidden-contact');
    expect(hiddenToken).toHaveAttribute(
      'data-isometric-visibility-rule',
      'hidden',
    );
    expect(hiddenToken).toHaveAttribute(
      'data-isometric-visibility-rule-reason',
      'Hidden contact is limited by fog or visibility rules',
    );
    expect(hiddenToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining(
        'Hidden contact is limited by fog or visibility rules',
      ),
    );
    expect(hiddenToken).not.toHaveAttribute('data-visibility-boost', 'true');
    expect(hiddenToken).not.toHaveAttribute('data-isometric-occlusion-reason');
    const hiddenSceneToken = screen.getByTestId(
      'isometric-scene-token-hidden-contact',
    );
    expect(hiddenSceneToken).not.toHaveAttribute(
      'data-isometric-foreground-boost',
      'true',
    );
    expect(hiddenSceneToken).toHaveAttribute(
      'data-isometric-token-map-position',
      '0,0',
    );
    expect(hiddenSceneToken).toHaveAttribute(
      'data-isometric-token-source-position',
      '0,0',
    );
    expect(hiddenSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Isometric token Hidden contact'),
    );
    expect(hiddenSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('visibility hidden'),
    );
    expect(hiddenSceneToken.querySelector('title')).toHaveTextContent(
      'visibility hidden',
    );
    expect(
      screen.queryByTestId('isometric-visibility-halo-hidden-contact'),
    ).toBeNull();
    expect(
      screen.queryByTestId('isometric-visibility-reason-hidden-contact'),
    ).toBeNull();
    expect(
      screen.getByTestId('isometric-visibility-rule-hidden-contact'),
    ).toHaveTextContent('FOG');
    expect(screen.getByTestId('fog-marker-hidden-contact')).toBeInTheDocument();

    const lastKnownToken = screen.getByTestId('unit-token-last-known-contact');
    const lastKnownSceneToken = screen.getByTestId(
      'isometric-scene-token-last-known-contact',
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'data-isometric-token-unit-type',
      TokenUnitType.Mech,
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'data-isometric-token-map-position',
      '-1,0',
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'data-isometric-token-source-position',
      '2,0',
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'data-isometric-token-facing',
      `${Facing.North}`,
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Isometric token Last known scout'),
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('map position -1,0'),
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('source position 2,0'),
    );
    expect(lastKnownSceneToken).toHaveAttribute(
      'aria-label',
      expect.stringContaining('visibility lastKnown'),
    );
    expect(lastKnownSceneToken.querySelector('title')).toHaveTextContent(
      'visibility lastKnown',
    );
    expect(lastKnownToken).toHaveAttribute(
      'data-isometric-visibility-rule',
      'lastKnown',
    );
    expect(lastKnownToken).toHaveAttribute(
      'data-isometric-visibility-rule-reason',
      'Last known contact is limited to stale visibility information',
    );
    expect(
      screen.getByTestId('isometric-visibility-rule-last-known-contact'),
    ).toHaveTextContent('LAST');
    expect(
      screen.getByTestId('fog-marker-last-known-contact'),
    ).toBeInTheDocument();

    act(() => {
      unmount();
    });
  });

  it('highlights the selected unit for isometric occlusion readability', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[selected]}
        selectedHex={null}
      />,
    );

    expect(
      screen.queryByTestId('isometric-visibility-halo-selected'),
    ).toBeNull();

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(
      screen.getByTestId('isometric-visibility-halo-selected'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('unit-token-selected')).toHaveAttribute(
      'data-visibility-boost',
      'true',
    );

    act(() => {
      unmount();
    });
  });

  it('highlights combat-projected targets for isometric occlusion readability', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      isValidTarget: false,
      position: { q: 2, r: 0 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={2}
        tokens={[selected, target]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
        hexTerrain={[
          {
            coordinate: { q: 1, r: 0 },
            elevation: 4,
            features: [{ type: TerrainType.Building, level: 1 }],
          },
        ]}
      />,
    );

    expect(screen.queryByTestId('isometric-visibility-halo-target')).toBeNull();
    expect(screen.getByTestId('hex-2-0')).toHaveAttribute(
      'data-combat-invalid-reason',
      'NoLineOfSight',
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(
      screen.getByTestId('isometric-visibility-halo-target'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('isometric-scene-token-target')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('combat projection target blocked'),
    );
    expect(screen.getByTestId('isometric-scene-token-target')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('foreground readability boost'),
    );
    expect(screen.getByTestId('unit-token-target')).toHaveAttribute(
      'data-visibility-boost',
      'true',
    );

    act(() => {
      unmount();
    });
  });

  it('does not foreground stale legacy target flags when combat projection is active', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const staleFriendlyTarget = makeToken({
      unitId: 'stale-friendly-target',
      side: GameSide.Player,
      isValidTarget: true,
      position: { q: 0, r: 1 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[selected, staleFriendlyTarget]}
        selectedHex={null}
        unitWeapons={{ selected: [makeWeapon()] }}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(
      screen.getByTestId('isometric-scene-token-stale-friendly-target'),
    ).not.toHaveAttribute('data-isometric-foreground-boost', 'true');
    expect(
      screen.getByTestId('isometric-scene-token-stale-friendly-target'),
    ).toHaveAttribute(
      'aria-label',
      expect.stringContaining('combat projection target blocked'),
    );
    expect(
      screen.getByTestId('unit-token-stale-friendly-target'),
    ).toHaveAttribute('data-token-valid-target-source', 'combat-projection');
    expect(
      screen.getByTestId('unit-token-stale-friendly-target'),
    ).toHaveAttribute('data-token-combat-projection-valid-target', 'false');
    expect(
      screen.getByTestId('unit-token-stale-friendly-target'),
    ).not.toHaveAttribute('data-visibility-boost', 'true');

    act(() => {
      unmount();
    });
  });

  it('keeps legacy target flags as isometric foreground fallback without combat projection', () => {
    const selected = makeToken({
      unitId: 'selected',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const legacyTarget = makeToken({
      unitId: 'legacy-target',
      side: GameSide.Opponent,
      isValidTarget: true,
      position: { q: 0, r: 1 },
    });

    const { unmount } = render(
      <HexMapDisplay
        mapId="map-1"
        radius={1}
        tokens={[selected, legacyTarget]}
        selectedHex={null}
      />,
    );

    fireEvent.click(screen.getByTestId('projection-toggle'));

    expect(
      screen.getByTestId('isometric-scene-token-legacy-target'),
    ).toHaveAttribute('data-isometric-foreground-boost', 'true');
    expect(screen.getByTestId('unit-token-legacy-target')).toHaveAttribute(
      'data-token-valid-target-source',
      'token',
    );
    expect(screen.getByTestId('unit-token-legacy-target')).toHaveAttribute(
      'data-visibility-boost',
      'true',
    );

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
    expect(screen.getByTestId('firing-arc-label-0,-1')).toHaveTextContent(
      'FRONT',
    );
    expect(screen.queryByTestId('firing-arc-hex-0,-2')).toBeNull();

    act(() => {
      unmount();
    });
  });

  it('hides firing-arc information when no configured weapons are operational', () => {
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
    expect(screen.queryByTestId('firing-arc-hex-0,1')).toBeNull();

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
            features: [{ type: TerrainType.Building, level: 2 }],
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
    expect(screen.getByTestId('los-state-badge')).toHaveAttribute(
      'data-state',
      'blocked',
    );
    expect(screen.getByTestId('los-state-badge')).toHaveTextContent('NO LOS');
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
      name: 'Last Contact',
      side: GameSide.Opponent,
      fogStatus: 'lastKnown',
      sensorRange: 2,
      position: { q: 3, r: 0 },
      lastKnownPosition: { q: 1, r: 0 },
    });
    const hidden = makeToken({
      unitId: 'hidden-contact',
      side: GameSide.Opponent,
      fogStatus: 'hidden',
      sensorRange: 4,
      position: { q: -2, r: 1 },
    });

    render(
      <HexMapDisplay
        mapId="map-1"
        radius={3}
        tokens={[scout, contact, hidden]}
        selectedHex={null}
      />,
    );

    expect(screen.getByTestId('sensor-rings-layer')).toBeInTheDocument();
    const scoutRing = screen.getByTestId('sensor-ring-scout');
    const contactRing = screen.getByTestId('sensor-ring-contact');
    const contactDisplayCenter = hexToPixel({ q: 1, r: 0 });

    expect(scoutRing).toHaveAttribute('data-sensor-range-hexes', '3');
    expect(scoutRing).toHaveAttribute('data-sensor-radius-px', '180');
    expect(scoutRing).toHaveAttribute('data-sensor-display-position', '0,0');
    expect(scoutRing).toHaveAttribute('data-sensor-source-position', '0,0');
    expect(scoutRing).toHaveAttribute('data-sensor-position-source', 'current');
    expect(scoutRing).toHaveAttribute('data-sensor-fog-status', 'visible');
    expect(scoutRing).toHaveAccessibleName(
      'Unit sensor ring; range 3 hexes; displayed at 0,0; source 0,0; position source current; visibility visible',
    );

    expect(contactRing).toHaveAttribute('data-sensor-range-hexes', '2');
    expect(contactRing).toHaveAttribute('data-sensor-radius-px', '120');
    expect(contactRing).toHaveAttribute('data-sensor-display-position', '1,0');
    expect(contactRing).toHaveAttribute('data-sensor-source-position', '3,0');
    expect(contactRing).toHaveAttribute(
      'data-sensor-position-source',
      'last-known',
    );
    expect(contactRing).toHaveAttribute('data-sensor-fog-status', 'lastKnown');
    expect(contactRing).toHaveAttribute('cx', `${contactDisplayCenter.x}`);
    expect(contactRing).toHaveAttribute('cy', `${contactDisplayCenter.y}`);
    expect(contactRing).toHaveAccessibleName(
      'Last Contact sensor ring; range 2 hexes; displayed at 1,0; source 3,0; position source last-known; visibility lastKnown',
    );
    expect(screen.queryByTestId('sensor-ring-hidden-contact')).toBeNull();
    expect(screen.getByTestId('fog-marker-contact')).toBeInTheDocument();
  });
});
