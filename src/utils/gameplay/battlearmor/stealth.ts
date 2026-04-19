/**
 * Battle Armor Stealth / Mimetic To-Hit Bonuses
 *
 * Attackers targeting a BA squad incur a to-hit penalty when the squad
 * wears stealth or mimetic armor:
 *   - Mimetic: +1 if the squad did NOT move this turn.
 *   - Basic Stealth: +1 at any range.
 *   - Improved Stealth: +2 short/medium, +3 long.
 *   - Prototype Stealth: +1 (per TW).
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 *   (Section 7: Mimetic / Stealth Armor)
 */

import type {
  BattleArmorRangeBracket,
  IBattleArmorCombatState,
  IBattleArmorStealthBonus,
} from '@/types/gameplay';

/**
 * Compute the to-hit bonus an attacker suffers when targeting this squad.
 * The bonus is additive onto whatever base TN the attacker has computed.
 *
 * @param state - BA combat state (carries stealth kind + mimetic-active flag)
 * @param range - range bracket to the target (short / medium / long)
 */
export function computeBattleArmorStealthBonus(
  state: IBattleArmorCombatState,
  range: BattleArmorRangeBracket,
): IBattleArmorStealthBonus {
  switch (state.stealthKind) {
    case 'mimetic':
      // Mimetic is only active when the squad did not move this turn.
      if (state.mimeticActiveThisTurn) {
        return { toHitBonus: 1, source: 'mimetic' };
      }
      return { toHitBonus: 0, source: 'none' };

    case 'stealth_basic':
      return { toHitBonus: 1, source: 'stealth_basic' };

    case 'stealth_improved':
      if (range === 'long') {
        return { toHitBonus: 3, source: 'stealth_improved' };
      }
      // Short + Medium share the same +2 bucket.
      return { toHitBonus: 2, source: 'stealth_improved' };

    case 'stealth_prototype':
      // TW rules for prototype stealth: flat +1.
      return { toHitBonus: 1, source: 'stealth_prototype' };

    case 'none':
    default:
      return { toHitBonus: 0, source: 'none' };
  }
}
