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
    for (const expectedStep of ['2', '3', '4', '5', '0']) {
      fireEvent.click(rotateRight);
      expect(projectionLayer).toHaveAttribute(
        'data-isometric-rotation-step',
        expectedStep,
      );
      expect(rotationHeading).toHaveAttribute(
        'data-isometric-rotation-step',
        expectedStep,
      );
    }

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
});
