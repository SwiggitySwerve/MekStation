import * as H from './addCombatPhaseUIFlows.smoke.test-helpers';

const {
  CommitMoveButton,
  Facing,
  FacingPicker,
  MovementType,
  MovementTypeSwitcher,
  React,
  ToHitForecastModal,
  WeaponSelector,
  fireEvent,
  render,
  screen,
} = H;

type IAttackerState = H.IAttackerState;
type ITargetState = H.ITargetState;
type IWeapon = H.IWeapon;
describe('CommitMoveButton', () => {
  it('is disabled when ready=false', () => {
    render(
      <CommitMoveButton
        ready={false}
        mpCost={3}
        movementType={MovementType.Walk}
        onCommit={jest.fn()}
      />,
    );
    expect(screen.getByTestId('commit-move-button')).toBeDisabled();
  });

  it('is enabled when ready=true and fires onCommit on click', () => {
    const onCommit = jest.fn();
    render(
      <CommitMoveButton
        ready={true}
        mpCost={2}
        movementType={MovementType.Run}
        onCommit={onCommit}
      />,
    );
    const btn = screen.getByTestId('commit-move-button');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('renders a MovementHeatPreview chip with the right type', () => {
    render(
      <CommitMoveButton
        ready={true}
        mpCost={5}
        movementType={MovementType.Jump}
        jumpHexes={5}
        onCommit={jest.fn()}
      />,
    );
    const preview = screen.getByTestId('movement-heat-preview');
    expect(preview.dataset.heat).toBe('5');
    expect(preview.dataset.movementType).toBe(MovementType.Jump);
  });

  it('uses projected movement heat when the planned move provides it', () => {
    render(
      <CommitMoveButton
        ready={true}
        mpCost={6}
        movementType={MovementType.Jump}
        heatGenerated={7}
        jumpHexes={2}
        onCommit={jest.fn()}
      />,
    );
    expect(screen.getByTestId('movement-heat-preview').dataset.heat).toBe('7');
    expect(screen.getByTestId('commit-move-button')).toHaveTextContent(
      'Commit Move (6 MP)',
    );
  });

  it('renders projected movement mode and terrain/elevation costs before commit', () => {
    render(
      <CommitMoveButton
        ready={true}
        mpCost={4}
        movementType={MovementType.Run}
        movementMode="tracked"
        terrainCost={1}
        turningCost={1}
        elevationDelta={2}
        elevationCost={2}
        onCommit={jest.fn()}
      />,
    );

    const summary = screen.getByTestId('movement-commit-summary');
    expect(summary).toHaveAttribute('data-movement-mode', 'tracked');
    expect(summary).toHaveAttribute('data-terrain-cost', '1');
    expect(summary).toHaveAttribute('data-turning-cost', '1');
    expect(summary).toHaveAttribute('data-elevation-delta', '2');
    expect(summary).toHaveAttribute('data-elevation-cost', '2');
    expect(summary).toHaveAccessibleName(
      'Movement rules summary: mode tracked; terrain cost 1; turning cost 1; elevation delta +2; elevation cost 2',
    );
    expect(summary).toHaveTextContent('Tracked');
    expect(summary).toHaveTextContent('+1 MP');
    expect(summary).toHaveTextContent('+2');
    expect(summary).toHaveTextContent('+2 MP');
  });
});
