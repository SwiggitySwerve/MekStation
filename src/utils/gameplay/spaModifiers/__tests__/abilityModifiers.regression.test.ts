/**
 * Regression guard — Jumping Jack SPA.
 *
 * Bug #7 from `fix-combat-rule-accuracy`: Jumping Jack originally modified
 * the TARGET's piloting roll. The canonical rule applies it to the ATTACKER's
 * to-hit when the attacker is jumping, reducing the +3 jump penalty to +1
 * (a net -2 modifier on the attacker's to-hit).
 *
 * This suite guards against silent re-regression.
 *
 * @spec openspec/changes/fix-combat-rule-accuracy/specs/spa-combat-integration/spec.md
 */

import { MovementType } from '@/types/gameplay';
import { calculateJumpingJackModifier } from '@/utils/gameplay/spaModifiers/abilityModifiers';

describe('Jumping Jack SPA — attacker-to-hit on jump (regression guard)', () => {
  it('returns -2 when attacker has SPA and is jumping', () => {
    const mod = calculateJumpingJackModifier(
      ['jumping_jack'],
      MovementType.Jump,
    );
    expect(mod).not.toBeNull();
    expect(mod?.value).toBe(-2);
    expect(mod?.name).toBe('Jumping Jack');
    expect(mod?.source).toBe('spa');
  });

  it('returns null when attacker is walking (not jumping)', () => {
    expect(
      calculateJumpingJackModifier(['jumping_jack'], MovementType.Walk),
    ).toBeNull();
  });

  it('returns null when attacker is running', () => {
    expect(
      calculateJumpingJackModifier(['jumping_jack'], MovementType.Run),
    ).toBeNull();
  });

  it('returns null when attacker is stationary', () => {
    expect(
      calculateJumpingJackModifier(['jumping_jack'], MovementType.Stationary),
    ).toBeNull();
  });

  it('returns null when SPA is absent even if jumping', () => {
    expect(calculateJumpingJackModifier([], MovementType.Jump)).toBeNull();
  });

  it('returns null when SPA list contains other SPAs but not jumping_jack', () => {
    expect(
      calculateJumpingJackModifier(['sniper'], MovementType.Jump),
    ).toBeNull();
  });

  it('net effect reduces +3 jump penalty to +1 (invariant check)', () => {
    // The jump penalty (applied elsewhere) is +3. Jumping Jack applies -2.
    // Combined net effect: +1 instead of +3 — this is the documented rule.
    const JUMP_PENALTY = 3;
    const mod = calculateJumpingJackModifier(
      ['jumping_jack'],
      MovementType.Jump,
    );
    expect(JUMP_PENALTY + (mod?.value ?? 0)).toBe(1);
  });
});
