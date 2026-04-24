/**
 * Per-change smoke test for `add-what-if-to-hit-preview`.
 *
 * Covers the three guarantees the spec calls out as load-bearing:
 *
 *   1. UI surface (§ 8): the WeaponSelector renders the toggle when
 *      `onTogglePreview` is wired, and the preview columns show
 *      Exp. Dmg / ± stddev / Crit % (with the "—" fallback for
 *      out-of-range weapons per § 10.4) only when the toggle is ON.
 *
 *   2. Zero-commit guarantee (§ 9 / spec scenario "Toggle does not
 *      fire weapons"): mounting the WeaponSelector in preview mode,
 *      flipping the toggle on/off, and reading every preview value
 *      MUST NOT call any of the store's mutating actions —
 *      `commitAttack`, `togglePlannedWeapon`, etc. — and MUST NOT
 *      touch `session.events`.
 *
 *   3. Modal preview rows (§ 8 + § 10): the ToHitForecastModal renders
 *      the three preview spans when both `previewEnabled === true`
 *      AND the parent passed the `attackerWeapons` array.
 *
 * Pure rendering test — no real store, no real session, just inert
 * spies + the component contracts.
 *
 * @spec openspec/changes/add-what-if-to-hit-preview/specs/*\/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type { IWeapon } from '@/simulation/ai/types';
import type { IAttackerState, ITargetState } from '@/types/gameplay';

import { ToHitForecastModal } from '@/components/gameplay/ToHitForecastModal';
import { WeaponSelector } from '@/components/gameplay/WeaponSelector';
import { MovementType } from '@/types/gameplay';
import {
  previewAttackOutcome,
  ZERO_PREVIEW,
} from '@/utils/gameplay/toHit/preview';

// ---------------------------------------------------------------------------
// Fixtures — kept minimal, mirroring the shape the smoke tests in
// addCombatPhaseUIFlows.smoke.test.tsx already use.
// ---------------------------------------------------------------------------

const mediumLaser: IWeapon = {
  id: 'med-laser-1',
  name: 'Medium Laser',
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
  damage: 5,
  heat: 3,
  minRange: 0,
  ammoPerTon: -1,
  destroyed: false,
};
const lrm10: IWeapon = {
  id: 'lrm10-1',
  name: 'LRM-10',
  shortRange: 7,
  mediumRange: 14,
  longRange: 21,
  damage: 10,
  heat: 4,
  minRange: 6,
  ammoPerTon: 12,
  destroyed: false,
};

const baseAttacker: IAttackerState = {
  gunnery: 4,
  movementType: MovementType.Stationary,
  heat: 0,
  damageModifiers: [],
};
const baseTarget: ITargetState = {
  movementType: MovementType.Stationary,
  hexesMoved: 0,
  prone: false,
  immobile: false,
  partialCover: false,
};

// ---------------------------------------------------------------------------
// 1. WeaponSelector — toggle + preview columns
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 2. Zero-commit guarantee (§ 9)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 3. Target switch recompute (§ 11.5 / spec scenario "Memo miss when target
// changes")
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 4. ToHitForecastModal — preview sub-rows (§ 8 / § 10)
// ---------------------------------------------------------------------------

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
