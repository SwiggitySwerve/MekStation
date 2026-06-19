import * as H from './addWhatIfToHitPreview.smoke.test-helpers';

const {
  MovementType,
  React,
  ToHitForecastModal,
  WeaponSelector,
  ZERO_PREVIEW,
  baseAttacker,
  baseTarget,
  fireEvent,
  lrm10,
  mediumLaser,
  previewAttackOutcome,
  render,
  screen,
} = H;

type IAttackerState = H.IAttackerState;
type ITargetState = H.ITargetState;
type IWeapon = H.IWeapon;
describe('WeaponSelector preview columns (add-what-if-to-hit-preview § 8)', () => {
  it('renders the Preview Damage toggle only when onTogglePreview is wired', () => {
    const { rerender } = render(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={jest.fn()}
      />,
    );
    // No toggle without onTogglePreview — preserves the legacy
    // header-less layout for the smoke tests in
    // addCombatPhaseUIFlows.smoke.test.tsx.
    expect(screen.queryByTestId('weapon-selector-preview-toggle')).toBeNull();

    rerender(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={jest.fn()}
        attacker={baseAttacker}
        target={baseTarget}
        previewEnabled={false}
        onTogglePreview={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('weapon-selector-preview-toggle'),
    ).toBeInTheDocument();
  });

  it('hides preview columns when previewEnabled is false (§ 8.4)', () => {
    render(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={jest.fn()}
        attacker={baseAttacker}
        target={baseTarget}
        previewEnabled={false}
        onTogglePreview={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('weapon-preview-med-laser-1')).toBeNull();
  });

  it('shows preview columns with formatted values when previewEnabled is true', () => {
    render(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={jest.fn()}
        attacker={baseAttacker}
        target={baseTarget}
        previewEnabled={true}
        onTogglePreview={jest.fn()}
      />,
    );
    // Per § 10: Exp Dmg → 1 dp, stddev → "±X.X", crit → "X.X%".
    const expDmg = screen.getByTestId('weapon-preview-expdmg-med-laser-1');
    const stddev = screen.getByTestId('weapon-preview-stddev-med-laser-1');
    const crit = screen.getByTestId('weapon-preview-crit-med-laser-1');
    expect(expDmg.textContent).toMatch(/^\d+\.\d$/);
    expect(stddev.textContent).toMatch(/^±\d+\.\d$/);
    expect(crit.textContent).toMatch(/^\d+\.\d%$/);
  });

  it('renders the em-dash fallback for out-of-range weapons (§ 10.4)', () => {
    render(
      <WeaponSelector
        weapons={[mediumLaser]}
        // Beyond Medium Laser's long range (9) → forced out-of-range.
        rangeToTarget={20}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={jest.fn()}
        attacker={baseAttacker}
        target={baseTarget}
        previewEnabled={true}
        onTogglePreview={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('weapon-preview-expdmg-med-laser-1').textContent,
    ).toBe('—');
    expect(
      screen.getByTestId('weapon-preview-stddev-med-laser-1').textContent,
    ).toBe('—');
    expect(
      screen.getByTestId('weapon-preview-crit-med-laser-1').textContent,
    ).toBe('—');
  });

  it('toggle button click invokes onTogglePreview with the next state', () => {
    const onTogglePreview = jest.fn();
    render(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={3}
        selectedWeaponIds={[]}
        ammo={{}}
        onToggle={jest.fn()}
        attacker={baseAttacker}
        target={baseTarget}
        previewEnabled={false}
        onTogglePreview={onTogglePreview}
      />,
    );
    fireEvent.click(screen.getByTestId('weapon-selector-preview-toggle'));
    expect(onTogglePreview).toHaveBeenCalledWith(true);
  });
});
