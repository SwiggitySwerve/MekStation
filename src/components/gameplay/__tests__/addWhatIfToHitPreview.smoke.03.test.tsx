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
describe('Preview recomputes on target switch (§ 11.5)', () => {
  it('updates Exp. Dmg / stddev / crit when the parent swaps target mid-phase', () => {
    // Spec scenario: "Memo miss when target changes" —
    // weapon-resolution-system/spec.md. A new `target` reference
    // passed into the memoization key MUST force
    // `previewAttackOutcome` to re-run and produce different output.
    //
    // We make the two targets meaningfully different (stationary vs.
    // fast-mover with 5 hexes of movement) so the to-hit modifier
    // pipeline produces different `finalTn` values — which guarantees
    // the downstream Exp. Dmg / stddev / crit all change. If the
    // memoization were broken (e.g., the component cached by weapon
    // id alone), the second render would reuse the first target's
    // numbers and this test would fail.
    const onToggle = jest.fn();
    const onTogglePreview = jest.fn();

    const fastMover: ITargetState = {
      movementType: MovementType.Run,
      hexesMoved: 5, // +2 movement modifier under standard TM
      prone: false,
      immobile: false,
      partialCover: false,
    };

    const { rerender } = render(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={3}
        selectedWeaponIds={['med-laser-1']}
        ammo={{}}
        onToggle={onToggle}
        attacker={baseAttacker}
        target={baseTarget}
        previewEnabled={true}
        onTogglePreview={onTogglePreview}
      />,
    );

    const initialExpDmg = screen.getByTestId(
      'weapon-preview-expdmg-med-laser-1',
    ).textContent;
    const initialStddev = screen.getByTestId(
      'weapon-preview-stddev-med-laser-1',
    ).textContent;
    const initialCrit = screen.getByTestId(
      'weapon-preview-crit-med-laser-1',
    ).textContent;
    // Sanity: the baseline target should produce real numbers, not
    // "—". Otherwise the post-switch comparison below is vacuous.
    expect(initialExpDmg).toMatch(/^\d+\.\d$/);
    expect(initialStddev).toMatch(/^±\d+\.\d$/);
    expect(initialCrit).toMatch(/^\d+\.\d%$/);

    // Simulate the Player switching to a new target lock. The parent
    // (TargetLockHUD → useGameplayStore) replaces the `target` prop
    // with a new object identity; nothing else changes — same
    // weapons, same selection, same preview toggle.
    rerender(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={3}
        selectedWeaponIds={['med-laser-1']}
        ammo={{}}
        onToggle={onToggle}
        attacker={baseAttacker}
        target={fastMover}
        previewEnabled={true}
        onTogglePreview={onTogglePreview}
      />,
    );

    const switchedExpDmg = screen.getByTestId(
      'weapon-preview-expdmg-med-laser-1',
    ).textContent;
    const switchedStddev = screen.getByTestId(
      'weapon-preview-stddev-med-laser-1',
    ).textContent;
    const switchedCrit = screen.getByTestId(
      'weapon-preview-crit-med-laser-1',
    ).textContent;

    // All three preview stats MUST differ — the fast-mover is harder
    // to hit, so expected damage and crit probability both drop.
    // Stddev follows the Bernoulli shape so it also changes.
    expect(switchedExpDmg).not.toBe(initialExpDmg);
    expect(switchedCrit).not.toBe(initialCrit);
    expect(switchedStddev).not.toBe(initialStddev);
    // Zero-commit guarantee (§ 9) also holds across target switches:
    // the recompute MUST NOT mutate the attack plan.
    expect(onToggle).not.toHaveBeenCalled();
    expect(onTogglePreview).not.toHaveBeenCalled();
  });

  it('updates preview when the parent swaps rangeToTarget (same target object)', () => {
    // Companion to the target-switch case: the memoization key
    // includes `rangeToTarget`, so changing only the range (e.g.,
    // the attacker moved closer on the same turn) must also force a
    // recompute. Guarantees no stale-range bug when the target stays
    // locked but distance changes.
    const onToggle = jest.fn();

    const { rerender } = render(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={3}
        selectedWeaponIds={['med-laser-1']}
        ammo={{}}
        onToggle={onToggle}
        attacker={baseAttacker}
        target={baseTarget}
        previewEnabled={true}
        onTogglePreview={jest.fn()}
      />,
    );
    const shortRangeExpDmg = screen.getByTestId(
      'weapon-preview-expdmg-med-laser-1',
    ).textContent;

    // Same target reference, new range → still should recompute.
    rerender(
      <WeaponSelector
        weapons={[mediumLaser]}
        rangeToTarget={8} // long bracket for Medium Laser (short=3, med=6, long=9)
        selectedWeaponIds={['med-laser-1']}
        ammo={{}}
        onToggle={onToggle}
        attacker={baseAttacker}
        target={baseTarget}
        previewEnabled={true}
        onTogglePreview={jest.fn()}
      />,
    );
    const longRangeExpDmg = screen.getByTestId(
      'weapon-preview-expdmg-med-laser-1',
    ).textContent;

    // Long bracket is harder to hit → expected damage must drop.
    expect(longRangeExpDmg).not.toBe(shortRangeExpDmg);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
