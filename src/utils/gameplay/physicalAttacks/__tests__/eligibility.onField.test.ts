/**
 * Wave 4 C1 PR2, site 3: the opening guard of `getEligiblePhysicalAttacks`.
 *
 * Frozen pre-delegation formula:
 * `attacker.destroyed || target.destroyed || target.hasRetreated || target.hasEjected`
 * returns no options. The attacker is only ever checked for `destroyed`, so
 * the attacker's `destroyed` is crossed with the whole target flag domain.
 */

import { GameSide } from '@/types/gameplay';
import {
  FLAG_DOMAIN,
  beforeLeftPlay,
  flagLabel,
  unitWith,
} from '@/utils/gameplay/__tests__/unitFlagDomain.test-helpers';

import { getEligiblePhysicalAttacks } from '../eligibility';

const context = {
  attackerTonnage: 65,
  attackerPilotingSkill: 4,
  targetTonnage: 65,
};

describe('getEligiblePhysicalAttacks opening guard (C1 PR2 site 3)', () => {
  it('returns nothing exactly when the frozen formula says someone is out', () => {
    let eligibleRows = 0;
    for (const attackerDestroyed of [false, true]) {
      const attacker = unitWith('a', GameSide.Player, {
        destroyed: attackerDestroyed,
      });
      for (const flags of FLAG_DOMAIN) {
        const target = unitWith('t', GameSide.Opponent, flags, { q: 1, r: 0 });
        const options = getEligiblePhysicalAttacks(attacker, target, context);
        const out = attackerDestroyed || beforeLeftPlay(flags);
        const at = `${flagLabel(flags)} attackerDestroyed=${attackerDestroyed}`;
        if (out) {
          expect({ at, options }).toEqual({ at, options: [] });
        } else {
          eligibleRows += 1;
          expect({ at, empty: options.length === 0 }).toEqual({
            at,
            empty: false,
          });
        }
      }
    }
    // Both outcomes occur, so neither branch is vacuous.
    expect(eligibleRows).toBeGreaterThan(0);
    expect(eligibleRows).toBeLessThan(FLAG_DOMAIN.length * 2);
  });
});
