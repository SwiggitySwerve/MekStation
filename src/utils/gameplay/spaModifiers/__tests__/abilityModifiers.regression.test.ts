/**
 * Regression guard: Jumping Jack and Hopping Jack SPAs.
 *
 * Bug #7 from `fix-combat-rule-accuracy`: Jumping Jack originally modified
 * the TARGET's piloting roll. MegaMek applies both jump SPAs to the ATTACKER's
 * to-hit when jumping: Jumping Jack nets +1 and Hopping Jack nets +2.
 *
 * This suite guards against silent re-regression.
 *
 * @spec openspec/changes/fix-combat-rule-accuracy/specs/spa-combat-integration/spec.md
 */

import { MovementType } from '@/types/gameplay';
import { calculateJumpingJackModifier } from '@/utils/gameplay/spaModifiers/abilityModifiers';

describe('Jumping/Hopping Jack SPAs: attacker-to-hit on jump', () => {
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

  it('returns -1 for canonical Hopping Jack when attacker is jumping', () => {
    const mod = calculateJumpingJackModifier(
      ['hopping_jack'],
      MovementType.Jump,
    );
    expect(mod).not.toBeNull();
    expect(mod?.value).toBe(-1);
    expect(mod?.name).toBe('Hopping Jack');
    expect(mod?.source).toBe('spa');
  });

  it('accepts the legacy Hopping Jack id through canonicalization', () => {
    const mod = calculateJumpingJackModifier(
      ['hopping-jack'],
      MovementType.Jump,
    );
    expect(mod?.value).toBe(-1);
    expect(mod?.name).toBe('Hopping Jack');
  });

  it('prefers Jumping Jack when both jump SPAs are present', () => {
    const mod = calculateJumpingJackModifier(
      ['hopping_jack', 'jumping_jack'],
      MovementType.Jump,
    );
    expect(mod?.value).toBe(-2);
    expect(mod?.name).toBe('Jumping Jack');
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

  it('returns null when SPA list contains other SPAs but not a jump SPA', () => {
    expect(
      calculateJumpingJackModifier(['sniper'], MovementType.Jump),
    ).toBeNull();
  });

  it('Jumping Jack net effect reduces +3 jump penalty to +1', () => {
    const JUMP_PENALTY = 3;
    const mod = calculateJumpingJackModifier(
      ['jumping_jack'],
      MovementType.Jump,
    );
    expect(JUMP_PENALTY + (mod?.value ?? 0)).toBe(1);
  });

  it('Hopping Jack net effect reduces +3 jump penalty to +2', () => {
    const JUMP_PENALTY = 3;
    const mod = calculateJumpingJackModifier(
      ['hopping_jack'],
      MovementType.Jump,
    );
    expect(JUMP_PENALTY + (mod?.value ?? 0)).toBe(2);
  });
});
