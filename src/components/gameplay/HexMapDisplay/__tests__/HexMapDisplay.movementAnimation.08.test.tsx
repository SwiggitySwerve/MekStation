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
    expect(blockedBadge).toHaveAttribute(
      'data-tactical-projection-source',
      'shared-tactical-map-projection',
    );
    expect(blockedBadge).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(blockedBadge).toHaveAttribute(
      'data-tactical-rules-surface',
      'movement',
    );
    expect(blockedBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-source-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek movement rules projection',
      ),
    );
    expect(blockedBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-rule-refs',
      expect.stringContaining(
        'movement:megamek:MegaMek common/moves/MoveStep.java:2727-2841 movement MP costs',
      ),
    );
    expect(blockedBadge).toHaveAttribute(
      'data-movement-blocked-options-badge-projection-explanation',
      expect.stringContaining(`jump blocked 1 MP heat +1: ${blockedReason}`),
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

  it('renders blocked and run movement states with non-color encodings', () => {
    const blockedReason = 'Destination occupied by hostile unit';

    const { unmount } = render(
      <HexMapDisplay
        mapId="movement-non-color-encodings"
        radius={1}
        tokens={[]}
        selectedHex={null}
        movementRange={[
          {
            hex: { q: -1, r: 0 },
            mpCost: 1,
            reachable: true,
            movementType: MovementType.Walk,
          },
          {
            hex: { q: 0, r: 1 },
            mpCost: 4,
            reachable: true,
            movementType: MovementType.Run,
          },
          {
            hex: { q: 1, r: 0 },
            mpCost: 5,
            reachable: false,
            movementType: MovementType.Run,
            blockedReason,
            movementInvalidReason: 'DestinationOccupied',
            movementInvalidDetails: blockedReason,
          },
        ]}
      />,
    );

    const walkOverlay = screen.getByTestId('hex-overlay--1-0');
    const runOverlay = screen.getByTestId('hex-overlay-0-1');
    const blockedOverlay = screen.getByTestId('hex-overlay-1-0');

    expect(walkOverlay).toHaveAttribute(
      'data-hex-overlay-kind',
      'movement-legal',
    );
    expect(walkOverlay).not.toHaveAttribute('data-movement-non-color-encoding');
    expect(screen.queryByTestId('run-range-outline--1-0')).toBeNull();

    expect(runOverlay).toHaveAttribute(
      'data-hex-overlay-kind',
      'movement-legal',
    );
    expect(runOverlay).toHaveAttribute(
      'data-movement-non-color-encoding',
      'run-dashed-border',
    );
    expect(screen.getByTestId('run-range-outline-0-1')).toHaveAttribute(
      'stroke-dasharray',
      '5 3',
    );

    expect(blockedOverlay).toHaveAttribute(
      'data-hex-overlay-kind',
      'movement-blocked',
    );
    expect(blockedOverlay).toHaveAttribute(
      'data-movement-non-color-encoding',
      'blocked-cross-hatch',
    );
    expect(screen.getByTestId('blocked-movement-pattern-1-0')).toHaveAttribute(
      'fill',
      'url(#pattern-blocked-movement)',
    );
    expect(screen.getByTestId('blocked-movement-glyph-1-0')).toHaveTextContent(
      '!',
    );
    expect(screen.queryByTestId('jump-pattern-1-0')).toBeNull();

    act(() => {
      unmount();
    });
  });
});
