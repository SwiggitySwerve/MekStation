import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { calculateStats } from '@/services/forces/ForceRepository.helpers';
import { resolveNodeCanonicalUnitStats } from '@/services/forces/ForceRepository.helpers.server';
import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import {
  ForcePosition,
  ForceStatus,
  ForceType,
  type IAssignment,
  type IForce,
} from '@/types/force';
import { GameSide } from '@/types/gameplay';
import {
  buildForceSummaryInput,
  buildForceSummary,
} from '@/utils/gameplay/forceSummaryBuilder';

jest.mock('@/services/persistence/SQLiteService', () => ({
  getSQLiteService: () => ({
    getDatabase: () => ({ prepare: () => ({ get: () => undefined }) }),
  }),
}));

// MegaMek 48fcb2f64 BVCalculator.java:103-139 dispatches every family.
// Full pinned Java oracle: unit-loading/UL-16b/oracle/full.jsonl.
const cases = [
  ['battlearmor:achileus-light-battle-armor-wobsqd4', 150],
  ['protomechs:basilisk', 318],
  ['capital:achilles-2582', 8681],
  ['infantry:aa-jump-infantry-292nd-league-regulars', 98],
  ['vehicles:ac-2-carrier', 403],
  ['aerospace:aeshna-heavy-drone-fighter', 2032],
] as const;

function assignments(ids: readonly string[]): IAssignment[] {
  return ids.map((unitId, slot) => ({
    id: `slot-${slot}`,
    unitId,
    pilotId: null,
    position: ForcePosition.Member,
    slot,
  }));
}

function force(ids: readonly string[]): IForce {
  return {
    id: 'mixed-force',
    name: 'Mixed force',
    forceType: ForceType.Lance,
    status: ForceStatus.Active,
    childIds: [],
    assignments: assignments(ids),
    stats: {
      totalBV: 0,
      totalTonnage: 0,
      assignedPilots: 0,
      assignedUnits: ids.length,
      emptySlots: 0,
      averageSkill: null,
    },
    createdAt: '2026-11-04',
    updatedAt: '2026-11-04',
  };
}

describe('canonical force BV for every non-Mek family', () => {
  it('totals a force with BA, ProtoMechs, capital and infantry', () => {
    const stats = calculateStats(
      assignments(cases.slice(0, 4).map(([id]) => id)),
      {
        canonicalUnitStatsResolver: resolveNodeCanonicalUnitStats,
      },
    );
    expect(stats.complete).toBe(true);
    expect(stats.totalBV).toBe(9247);
    expect(stats.missingUnits).toEqual([]);
  });

  it.each(cases)(
    '%s has the same Java BV in force and pre-battle totals',
    async (id, expected) => {
      const unit = getNodeCanonicalUnitService().getByIdSync(id);
      expect(unit).not.toBeNull();
      const preloadedUnits = new Map<string, IFullUnit>([[id, unit!]]);
      const args = {
        side: GameSide.Player,
        force: force([id]),
        pilots: [],
        preloadedUnits,
      };
      expect(resolveNodeCanonicalUnitStats(id)).toMatchObject({ bv: expected });
      expect((await buildForceSummaryInput(args)).units[0].battleValue).toBe(
        expected,
      );
      expect((await buildForceSummary(args)).totalBV).toBe(expected);
    },
  );
});
