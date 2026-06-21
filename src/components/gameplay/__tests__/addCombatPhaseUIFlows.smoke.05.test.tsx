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
  baseAttacker,
  baseTarget,
  fireEvent,
  render,
  screen,
} = H;

type IAttackerState = H.IAttackerState;
type ITargetState = H.ITargetState;
type IWeapon = H.IWeapon;
describe('ToHitForecastModal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <ToHitForecastModal
        open={false}
        attacker={baseAttacker}
        target={baseTarget}
        range={3}
        weapons={[
          {
            weaponId: 'med-laser-1',
            weaponName: 'Medium Laser',
            minRange: 0,
            shortRange: 3,
            mediumRange: 6,
            longRange: 9,
          },
        ]}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a TN + probability row per weapon when open', () => {
    render(
      <ToHitForecastModal
        open={true}
        attacker={baseAttacker}
        target={baseTarget}
        range={3}
        weapons={[
          {
            weaponId: 'med-laser-1',
            weaponName: 'Medium Laser',
            minRange: 0,
            shortRange: 3,
            mediumRange: 6,
            longRange: 9,
          },
        ]}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId('to-hit-forecast-modal')).toBeInTheDocument();
    expect(screen.getByTestId('forecast-tn-med-laser-1')).toBeInTheDocument();
    expect(screen.getByTestId('forecast-prob-med-laser-1')).toBeInTheDocument();
    expect(screen.getByTestId('expected-hits-total')).toBeInTheDocument();
  });

  it('displays semi-guided TAG target-movement cancellation when forecast options provide full context', () => {
    render(
      <ToHitForecastModal
        open={true}
        attacker={baseAttacker}
        target={{
          ...baseTarget,
          movementType: MovementType.Walk,
          hexesMoved: 5,
        }}
        range={7}
        weapons={[
          {
            weaponId: 'semi-guided-lrm-15',
            weaponName: 'Semi-Guided LRM-15',
            minRange: 0,
            shortRange: 7,
            mediumRange: 14,
            longRange: 21,
          },
        ]}
        forecastOptions={{
          semiGuidedTagContext: {
            isSemiGuided: true,
            targetTagDesignated: true,
          },
        }}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId('forecast-tn-semi-guided-lrm-15'),
    ).toHaveTextContent('TN 4+');
  });

  it('shows Out-of-range row for weapons beyond long range', () => {
    render(
      <ToHitForecastModal
        open={true}
        attacker={baseAttacker}
        target={baseTarget}
        range={50}
        weapons={[
          {
            weaponId: 'med-laser-1',
            weaponName: 'Medium Laser',
            minRange: 0,
            shortRange: 3,
            mediumRange: 6,
            longRange: 9,
          },
        ]}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId('forecast-row-med-laser-1')).toHaveTextContent(
      /out of range/i,
    );
  });

  it('fires onConfirm when Confirm Fire is clicked', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(
      <ToHitForecastModal
        open={true}
        attacker={baseAttacker}
        target={baseTarget}
        range={3}
        weapons={[
          {
            weaponId: 'med-laser-1',
            weaponName: 'Medium Laser',
            minRange: 0,
            shortRange: 3,
            mediumRange: 6,
            longRange: 9,
          },
        ]}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId('forecast-confirm-button'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires onClose when Back is clicked', () => {
    const onClose = jest.fn();
    render(
      <ToHitForecastModal
        open={true}
        attacker={baseAttacker}
        target={baseTarget}
        range={3}
        weapons={[]}
        onConfirm={jest.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId('forecast-back-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
