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
describe('ToHitForecastModal preview sub-rows', () => {
  const forecastInput = {
    weaponId: 'med-laser-1',
    weaponName: 'Medium Laser',
    minRange: 0,
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
  };

  it('hides preview sub-rows when previewEnabled is false', () => {
    render(
      <ToHitForecastModal
        open={true}
        attacker={baseAttacker}
        target={baseTarget}
        range={3}
        weapons={[forecastInput]}
        previewEnabled={false}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('forecast-preview-med-laser-1')).toBeNull();
  });

  it('shows preview sub-rows when previewEnabled + attackerWeapons are wired', () => {
    render(
      <ToHitForecastModal
        open={true}
        attacker={baseAttacker}
        target={baseTarget}
        range={3}
        weapons={[forecastInput]}
        previewEnabled={true}
        attackerWeapons={[mediumLaser]}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('forecast-preview-med-laser-1'),
    ).toBeInTheDocument();
    // Header gets a "Preview ON" indicator.
    expect(screen.getByTestId('forecast-preview-on')).toBeInTheDocument();
    // Numeric values match the formatter contract from § 10.
    expect(
      screen.getByTestId('forecast-preview-expdmg-med-laser-1').textContent,
    ).toMatch(/^\d+\.\d$/);
    expect(
      screen.getByTestId('forecast-preview-stddev-med-laser-1').textContent,
    ).toMatch(/^±\d+\.\d$/);
    expect(
      screen.getByTestId('forecast-preview-crit-med-laser-1').textContent,
    ).toMatch(/^\d+\.\d%$/);
  });

  it('does not render preview sub-rows when attackerWeapons is empty', () => {
    render(
      <ToHitForecastModal
        open={true}
        attacker={baseAttacker}
        target={baseTarget}
        range={3}
        weapons={[forecastInput]}
        previewEnabled={true}
        attackerWeapons={[]}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('forecast-preview-med-laser-1')).toBeNull();
  });
});
