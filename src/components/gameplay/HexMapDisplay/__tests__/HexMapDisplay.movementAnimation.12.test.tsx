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
});
