import * as H from './addPhysicalAttackPhaseUI.smoke.test-helpers';

const {
  ActuatorType,
  EMPTY_DAMAGE,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  PhysicalAttackForecastModal,
  PhysicalAttackTypePicker,
  React,
  buildAttackInput,
  fireEvent,
  render,
  screen,
  usePhysicalAttackPlanStore,
  withActuator,
} = H;

type IComponentDamageState = H.IComponentDamageState;
type IGameSession = H.IGameSession;
type IINarcPodState = H.IINarcPodState;
type IPhysicalAttackDeclaredPayload = H.IPhysicalAttackDeclaredPayload;
type IPhysicalAttackInput = H.IPhysicalAttackInput;
type InteractiveSession = H.InteractiveSession;
type PhysicalAttackType = H.PhysicalAttackType;
describe('PhysicalAttackTypePicker', () => {
  it('renders rows for punch / kick / charge / dfa by default', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByTestId('physical-attack-row-punch')).toBeInTheDocument();
    expect(screen.getByTestId('physical-attack-row-kick')).toBeInTheDocument();
    expect(
      screen.getByTestId('physical-attack-row-charge'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('physical-attack-row-dfa')).toBeInTheDocument();
  });

  it('renders melee-weapon rows only for equipped weapons', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        meleeWeaponsEquipped={['hatchet', 'lance', 'retractable-blade']}
        onSelect={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('physical-attack-row-hatchet'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('physical-attack-row-lance')).toBeInTheDocument();
    expect(
      screen.getByTestId('physical-attack-row-retractable-blade'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('physical-attack-row-sword'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('physical-attack-row-mace'),
    ).not.toBeInTheDocument();
  });

  it('disables Punch when the shoulder is destroyed', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={withActuator(ActuatorType.SHOULDER)}
        onSelect={jest.fn()}
      />,
    );
    const button = screen.getByTestId('physical-attack-button-punch');
    expect(button).toBeDisabled();
    expect(screen.getByTestId('physical-attack-row-punch')).toHaveAttribute(
      'data-disabled',
      'true',
    );
  });

  it('disables Kick when the hip is destroyed', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={withActuator(ActuatorType.HIP)}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByTestId('physical-attack-button-kick')).toBeDisabled();
  });

  it('disables Kick while prone', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        attackerProne={true}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByTestId('physical-attack-button-kick')).toBeDisabled();
  });

  it('disables Punch when both arms fired weapons this turn', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        weaponsFiredFromLeftArm={['med-laser']}
        weaponsFiredFromRightArm={['ac20']}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByTestId('physical-attack-button-punch')).toBeDisabled();
  });

  it('keeps Punch enabled when only ONE arm fired', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        weaponsFiredFromLeftArm={['med-laser']}
        weaponsFiredFromRightArm={[]}
        onSelect={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('physical-attack-button-punch'),
    ).not.toBeDisabled();
  });

  it('marks the selected button with aria-checked=true', () => {
    render(
      <PhysicalAttackTypePicker
        selected={'kick'}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByTestId('physical-attack-button-kick')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByTestId('physical-attack-button-punch')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('fires onSelect with the chosen type when an enabled row is clicked', () => {
    const onSelect = jest.fn();
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId('physical-attack-button-kick'));
    expect(onSelect).toHaveBeenCalledWith('kick');
  });

  it('does not fire onSelect when a disabled row is clicked', () => {
    const onSelect = jest.fn();
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={withActuator(ActuatorType.HIP)}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId('physical-attack-button-kick'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
