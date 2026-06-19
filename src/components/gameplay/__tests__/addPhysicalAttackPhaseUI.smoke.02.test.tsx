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
describe('PhysicalAttackForecastModal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <PhysicalAttackForecastModal
        open={false}
        attackInput={buildAttackInput('punch')}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows TN + probability + expected damage for an allowed punch', () => {
    render(
      <PhysicalAttackForecastModal
        open={true}
        attackInput={buildAttackInput('punch')}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('physical-attack-forecast-modal'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('physical-forecast-tn')).toHaveTextContent(
      /TN \d/,
    );
    expect(screen.getByTestId('physical-forecast-prob')).toHaveTextContent(
      /%$/,
    );
    expect(screen.getByTestId('physical-forecast-damage')).toBeInTheDocument();
    expect(screen.getByTestId('physical-forecast-hit-table')).toHaveTextContent(
      /Punch table/,
    );
  });

  it('renders the kick hit-table label for kicks', () => {
    render(
      <PhysicalAttackForecastModal
        open={true}
        attackInput={buildAttackInput('kick')}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId('physical-forecast-hit-table')).toHaveTextContent(
      /Kick table/,
    );
  });

  it('shows the restriction reason when the attack is blocked', () => {
    render(
      <PhysicalAttackForecastModal
        open={true}
        attackInput={buildAttackInput('punch', {
          componentDamage: withActuator(ActuatorType.SHOULDER),
        })}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('physical-forecast-restriction'),
    ).toHaveTextContent(/shoulder/i);
    expect(
      screen.getByTestId('physical-forecast-confirm-button'),
    ).toBeDisabled();
  });

  it('fires onConfirm when Confirm Attack is pressed', () => {
    const onConfirm = jest.fn();
    render(
      <PhysicalAttackForecastModal
        open={true}
        attackInput={buildAttackInput('punch')}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('physical-forecast-confirm-button'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires onClose when Back is pressed', () => {
    const onClose = jest.fn();
    render(
      <PhysicalAttackForecastModal
        open={true}
        attackInput={buildAttackInput('punch')}
        onConfirm={jest.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId('physical-forecast-back-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides the Zweihander declaration toggle by default', () => {
    render(
      <PhysicalAttackForecastModal
        open={true}
        attackInput={buildAttackInput('punch')}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(
      screen.queryByTestId('physical-forecast-zweihander-toggle'),
    ).not.toBeInTheDocument();
  });

  it('surfaces the two-handed Zweihander declaration toggle when enabled', () => {
    const onChange = jest.fn();
    render(
      <PhysicalAttackForecastModal
        open={true}
        attackInput={buildAttackInput('punch')}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        showZweihanderToggle={true}
        zweihanderTwoHanded={false}
        onZweihanderTwoHandedChange={onChange}
      />,
    );
    const toggle = screen.getByTestId('physical-forecast-zweihander-toggle');
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
