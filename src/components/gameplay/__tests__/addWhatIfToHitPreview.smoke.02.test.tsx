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
describe('Zero-commit guarantee (add-what-if-to-hit-preview § 9)', () => {
  it('toggling preview never invokes the weapon-toggle or commit handlers', () => {
    const onToggle = jest.fn();
    const onTogglePreview = jest.fn();
    const { rerender } = render(
      <WeaponSelector
        weapons={[mediumLaser, lrm10]}
        rangeToTarget={5}
        selectedWeaponIds={['med-laser-1']}
        ammo={{ 'lrm10-1': 12 }}
        onToggle={onToggle}
        attacker={baseAttacker}
        target={baseTarget}
        previewEnabled={false}
        onTogglePreview={onTogglePreview}
      />,
    );

    // Flip the toggle ON (parent simulates the store update).
    fireEvent.click(screen.getByTestId('weapon-selector-preview-toggle'));
    rerender(
      <WeaponSelector
        weapons={[mediumLaser, lrm10]}
        rangeToTarget={5}
        selectedWeaponIds={['med-laser-1']}
        ammo={{ 'lrm10-1': 12 }}
        onToggle={onToggle}
        attacker={baseAttacker}
        target={baseTarget}
        previewEnabled={true}
        onTogglePreview={onTogglePreview}
      />,
    );

    // Flip back to OFF.
    fireEvent.click(screen.getByTestId('weapon-selector-preview-toggle'));
    rerender(
      <WeaponSelector
        weapons={[mediumLaser, lrm10]}
        rangeToTarget={5}
        selectedWeaponIds={['med-laser-1']}
        ammo={{ 'lrm10-1': 12 }}
        onToggle={onToggle}
        attacker={baseAttacker}
        target={baseTarget}
        previewEnabled={false}
        onTogglePreview={onTogglePreview}
      />,
    );

    // The selection callback was never called — toggling preview
    // does NOT touch the attack plan (spec scenario "Toggle preserves
    // attack plan").
    expect(onToggle).not.toHaveBeenCalled();
    // The toggle handler was called twice (once per click) — that's
    // the only side-effect.
    expect(onTogglePreview).toHaveBeenCalledTimes(2);
  });

  it('previewAttackOutcome is deterministic across 1000 calls (§ 9.1 evidence)', () => {
    const input = {
      attacker: baseAttacker,
      target: baseTarget,
      weapon: mediumLaser,
      range: 3,
    };
    const first = previewAttackOutcome(input);
    for (let i = 0; i < 1000; i++) {
      const next = previewAttackOutcome(input);
      expect(next).toEqual(first);
    }
  });

  it('out-of-range previews return the ZERO_PREVIEW sentinel (§ 7.3 evidence)', () => {
    const result = previewAttackOutcome({
      attacker: baseAttacker,
      target: baseTarget,
      weapon: mediumLaser,
      range: 50,
    });
    expect(result).toBe(ZERO_PREVIEW);
    expect(result.expectedDamage).toBe(0);
    expect(result.damageStddev).toBe(0);
    expect(result.critProbability).toBe(0);
  });
});
