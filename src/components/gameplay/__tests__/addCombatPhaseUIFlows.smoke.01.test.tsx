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
describe('MovementTypeSwitcher', () => {
  it('renders movement buttons and marks the active one with aria-pressed', () => {
    const onChange = jest.fn();
    render(
      <MovementTypeSwitcher
        active={MovementType.Walk}
        walkMP={4}
        jumpMP={0}
        onChange={onChange}
      />,
    );

    const walkBtn = screen.getByTestId('movement-type-walk');
    const runBtn = screen.getByTestId('movement-type-run');
    const sprintBtn = screen.getByTestId('movement-type-sprint');
    const evadeBtn = screen.getByTestId('movement-type-evade');
    const jumpBtn = screen.getByTestId('movement-type-jump');

    expect(walkBtn).toHaveAttribute('aria-pressed', 'true');
    expect(runBtn).toHaveAttribute('aria-pressed', 'false');
    expect(sprintBtn).toHaveAttribute('aria-pressed', 'false');
    expect(evadeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(jumpBtn).toHaveAttribute('aria-pressed', 'false');
    expect(sprintBtn).toHaveTextContent('Sprint (8 MP)');
  });

  it('disables Jump when jumpMP is 0', () => {
    render(
      <MovementTypeSwitcher
        active={MovementType.Walk}
        walkMP={4}
        jumpMP={0}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('movement-type-jump')).toBeDisabled();
  });

  it('enables Jump when jumpMP > 0', () => {
    render(
      <MovementTypeSwitcher
        active={MovementType.Walk}
        walkMP={4}
        jumpMP={4}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('movement-type-jump')).not.toBeDisabled();
  });

  it('uses explicit run MP so the mode label matches the rules projection', () => {
    render(
      <MovementTypeSwitcher
        active={MovementType.Walk}
        walkMP={4}
        runMP={7}
        jumpMP={0}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('movement-type-run')).toHaveTextContent(
      'Run (7 MP)',
    );
  });

  it('fires onChange when a button is clicked', () => {
    const onChange = jest.fn();
    render(
      <MovementTypeSwitcher
        active={MovementType.Walk}
        walkMP={4}
        jumpMP={4}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('movement-type-run'));
    expect(onChange).toHaveBeenCalledWith(MovementType.Run);
    fireEvent.click(screen.getByTestId('movement-type-sprint'));
    expect(onChange).toHaveBeenCalledWith(MovementType.Sprint);
    fireEvent.click(screen.getByTestId('movement-type-evade'));
    expect(onChange).toHaveBeenCalledWith(MovementType.Evade);
    fireEvent.click(screen.getByTestId('movement-type-jump'));
    expect(onChange).toHaveBeenCalledWith(MovementType.Jump);
  });
});
