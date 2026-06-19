import * as H from './HexMapDisplay.movementAnimation.test-helpers';

const {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  HexMapDisplay,
  MovementType,
  TerrainType,
  TokenUnitType,
  VehicleMotionType,
  act,
  fireEvent,
  hexToPixel,
  makeEvent,
  makeToken,
  makeWeapon,
  render,
  screen,
  useAnimationQueue,
} = H;

type IGameEvent = H.IGameEvent;
type IUnitToken = H.IUnitToken;
type IWeaponStatus = H.IWeaponStatus;
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
    expect(hex).toHaveAttribute(
      'data-tactical-projection-movement-cost-status',
      'costly',
    );
    expect(hex).toHaveAttribute(
      'data-tactical-projection-movement-cost-reasons',
      'terrain +1|elevation delta +1 cost +1|terrain +2|heat +2|elevation delta +2 cost +0|heat +1',
    );

    const projectionBadge = screen.getByTestId(
      'hex-projection-status-badge-1-0',
    );
    expect(projectionBadge).toHaveTextContent('CST');
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-status',
      'legal',
    );
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-movement-status',
      'legal',
    );
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-movement-cost-status',
      'costly',
    );
    expect(projectionBadge).toHaveAttribute(
      'data-projection-status-badge-movement-cost-reasons',
      'terrain +1|elevation delta +1 cost +1|terrain +2|heat +2|elevation delta +2 cost +0|heat +1',
    );
    expect(projectionBadge).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Costly legal movement projection'),
    );
    expect(projectionBadge).toHaveAttribute(
      'aria-label',
      expect.stringContaining('movement cost costly'),
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
});
