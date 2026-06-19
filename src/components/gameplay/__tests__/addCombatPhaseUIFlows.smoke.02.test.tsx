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
describe('FacingPicker', () => {
  it('renders all six facing buttons', () => {
    render(<FacingPicker selected={null} onSelect={jest.fn()} />);
    [
      Facing.North,
      Facing.Northeast,
      Facing.Southeast,
      Facing.South,
      Facing.Southwest,
      Facing.Northwest,
    ].forEach((f) => {
      expect(screen.getByTestId(`facing-${f}`)).toBeInTheDocument();
    });
  });

  it('marks the selected facing with aria-pressed=true', () => {
    render(<FacingPicker selected={Facing.South} onSelect={jest.fn()} />);
    expect(screen.getByTestId(`facing-${Facing.South}`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId(`facing-${Facing.North}`)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('calls onSelect with the right Facing on each click', () => {
    const onSelect = jest.fn();
    render(<FacingPicker selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId(`facing-${Facing.Northeast}`));
    fireEvent.click(screen.getByTestId(`facing-${Facing.South}`));
    fireEvent.click(screen.getByTestId(`facing-${Facing.Northwest}`));
    expect(onSelect).toHaveBeenNthCalledWith(1, Facing.Northeast);
    expect(onSelect).toHaveBeenNthCalledWith(2, Facing.South);
    expect(onSelect).toHaveBeenNthCalledWith(3, Facing.Northwest);
  });
});
