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
  ac20,
  destroyedPpc,
  fireEvent,
  lrm15,
  mediumLaser,
  render,
  screen,
} = H;

type IAttackerState = H.IAttackerState;
type ITargetState = H.ITargetState;
type IWeapon = H.IWeapon;
describe('WeaponSelector', () => {
  it('renders one row per weapon', () => {
    render(
      <WeaponSelector
        weapons={[mediumLaser, ac20]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByTestId('weapon-row-med-laser-1')).toBeInTheDocument();
    expect(screen.getByTestId('weapon-row-ac20-1')).toBeInTheDocument();
  });

  it('shows the Destroyed badge on a destroyed weapon and disables its checkbox', () => {
    render(
      <WeaponSelector
        weapons={[destroyedPpc]}
        rangeToTarget={5}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByTestId('weapon-destroyed-ppc-1')).toBeInTheDocument();
    expect(screen.getByTestId('weapon-checkbox-ppc-1')).toBeDisabled();
  });

  it('shows the No-ammo badge when ammoRemaining is 0', () => {
    render(
      <WeaponSelector
        weapons={[ac20]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{ 'ac20-1': 0 }}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByTestId('weapon-no-ammo-ac20-1')).toBeInTheDocument();
    expect(screen.getByTestId('weapon-checkbox-ac20-1')).toBeDisabled();
  });

  it('shows the Out-of-range badge for weapons beyond long range', () => {
    render(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={20}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('weapon-out-of-range-med-laser-1'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('weapon-checkbox-med-laser-1')).toBeDisabled();
  });

  it('shows a minimum-range penalty badge without disabling the weapon', () => {
    render(
      <WeaponSelector
        weapons={[lrm15]}
        rangeToTarget={2}
        selectedWeaponIds={[]}
        ammo={{ 'lrm15-1': 8 }}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByTestId('weapon-min-range-lrm15-1')).toHaveTextContent(
      'Min +5',
    );
    expect(
      screen.queryByTestId('weapon-out-of-range-lrm15-1'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('weapon-checkbox-lrm15-1')).not.toBeDisabled();
  });

  it('renders ammo count for ammo-using weapons', () => {
    render(
      <WeaponSelector
        weapons={[ac20]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{ 'ac20-1': 5 }}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByTestId('ammo-remaining-ac20-1')).toHaveTextContent(
      'Ammo: 5',
    );
  });

  it('fires onToggle when a checkbox is clicked', () => {
    const onToggle = jest.fn();
    render(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByTestId('weapon-checkbox-med-laser-1'));
    expect(onToggle).toHaveBeenCalledWith('med-laser-1');
  });

  it('sums total heat for selected weapons in the footer', () => {
    render(
      <WeaponSelector
        weapons={[mediumLaser, ac20]}
        rangeToTarget={3}
        selectedWeaponIds={['med-laser-1', 'ac20-1']}
        ammo={{ 'ac20-1': 5 }}
        onToggle={jest.fn()}
      />,
    );
    // 3 (medium laser) + 7 (AC/20) = 10
    expect(screen.getByTestId('weapon-selector-total-heat')).toHaveTextContent(
      '+10',
    );
  });
});
