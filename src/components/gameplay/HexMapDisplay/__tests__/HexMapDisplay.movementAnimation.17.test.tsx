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
});
