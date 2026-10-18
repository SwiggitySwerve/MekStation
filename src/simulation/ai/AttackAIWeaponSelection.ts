import { FiringArc } from '@/types/gameplay';
import { getTwistedFacing } from '@/utils/gameplay/firingArc';
import { determineArc } from '@/utils/gameplay/firingArcs';
import { weaponMountCoversTargetArc } from '@/utils/gameplay/weaponMountArcs';

import type { IAIUnitState, IWeapon } from './types';

/**
 * Per `improve-bot-basic-combat-competence` task 3.2: the arc the
 * target hex lies in relative to the attacker's facing (with
 * optional torso twist applied). Used to filter weapons in
 * `selectWeapons`. Front weapons fire when the target is in the
 * attacker's front arc; rear weapons fire when the target is in the
 * rear arc; sides match their respective sides.
 *
 * NOTE: `calculateFiringArc` (in `firingArc.ts`) computes the arc
 * the ATTACKER is in relative to the TARGET's facing (used for hit
 * location). We need the dual — what arc the TARGET is in relative
 * to the ATTACKER — so we use `determineArc` with the attacker as
 * the "observer" directly.
 */
export function targetArcFromAttacker(
  attacker: IAIUnitState,
  target: IAIUnitState,
): FiringArc {
  const attackerFacing = attacker.torsoTwist
    ? getTwistedFacing(attacker.facing, attacker.torsoTwist)
    : attacker.facing;

  return determineArc(
    {
      unitId: attacker.unitId,
      coord: attacker.position,
      facing: attackerFacing,
      prone: false,
    },
    target.position,
  ).arc;
}

/**
 * Per `improve-bot-basic-combat-competence` task 3.2: true when a
 * weapon's mounted arc coverage includes the target's relative arc
 * from the attacker.
 *
 * Audit C-8 (2026-06-09): routed through the shared
 * `weaponMountCoversTargetArc` helper so multi-arc mounts (arm-mounted
 * mech weapons hydrate `mountingArcs` [Front, Left/Right] per MegaMek
 * `Mek.getWeaponArc`; vehicle sponsons/turrets do the same) union their
 * arcs instead of being read as singular-only. Semantics for legacy
 * shapes are unchanged: a weapon with NO arc metadata is treated as
 * OMNIDIRECTIONAL (the filter does not exclude it), and singular
 * `mountingArc` weapons cover exactly that one arc.
 */
export function weaponCanCoverArc(
  weapon: IWeapon,
  targetArc: FiringArc,
): boolean {
  return weaponMountCoversTargetArc(weapon, targetArc);
}

/**
 * Per `improve-bot-basic-combat-competence` task 4: sort weapons by
 * damage-per-heat descending, with Short > Medium > Long range
 * bracket preference within equal-efficiency buckets. Uses
 * `damage / max(heat, 1)` so zero-heat energy weapons do not divide
 * by zero and instead get their `damage` directly as efficiency.
 *
 * Pure function — returns a new sorted array.
 */
export function orderWeaponsByEfficiency(
  weapons: readonly IWeapon[],
  distance: number,
): readonly IWeapon[] {
  const rank = (weapon: IWeapon) => {
    const efficiency = weapon.damage / Math.max(1, weapon.heat);
    return {
      weapon,
      efficiency,
      bracketRank: bracketRankFor(weapon, distance),
    };
  };
  const ranked = weapons.map(rank);
  ranked.sort((a, b) => {
    if (b.efficiency !== a.efficiency) return b.efficiency - a.efficiency;
    // Lower bracketRank = preferred (Short=0, Medium=1, Long=2).
    return a.bracketRank - b.bracketRank;
  });
  return ranked.map((r) => r.weapon);
}

export function bracketRankFor(weapon: IWeapon, distance: number): number {
  if (distance <= weapon.shortRange) return 0;
  if (distance <= weapon.mediumRange) return 1;
  if (distance <= weapon.longRange) return 2;
  return 3;
}

export function maximumWeaponRange(weapon: IWeapon): number {
  return weapon.extremeRange ?? weapon.longRange;
}

/**
 * Per task 5: apply the heat budget to a sorted weapon list.
 *
 * Heat projection per `specs/combat-resolution/spec.md` Requirement
 * "Bot Heat Declaration Matches Resolver Heat Accounting":
 *
 *   projected = currentHeat + movementHeat + sum(firedWeaponHeat)
 *
 * Dissipation is NOT subtracted here — callers pass
 * `safeHeatThreshold` pre-adjusted if they want the
 * "dissipation-aware" flavor. This keeps the function pure and
 * orthogonal to game-state heat models.
 *
 * While projected > threshold, drop the LOWEST damage-per-heat
 * weapon (tail of the sorted list — preserves ordering invariant
 * from `orderWeaponsByEfficiency`) and recompute. Returns the
 * trimmed list.
 */
export function applyHeatBudget(
  weapons: readonly IWeapon[],
  currentHeat: number,
  movementHeat: number,
  safeHeatThreshold: number,
): readonly IWeapon[] {
  const result = [...weapons];
  const projected = () =>
    currentHeat + movementHeat + result.reduce((s, w) => s + w.heat, 0);

  const efficiency = (w: IWeapon) => w.damage / Math.max(1, w.heat);

  while (projected() > safeHeatThreshold && result.length > 0) {
    // Find the weapon with lowest efficiency in the result list.
    // This drops from the TAIL of the sorted list — preserving the
    // descending-efficiency invariant from `orderWeaponsByEfficiency`
    // (task 5.3: removal comes from the tail of the sorted list).
    let worstIdx = 0;
    for (let i = 1; i < result.length; i++) {
      if (efficiency(result[i]) < efficiency(result[worstIdx])) {
        worstIdx = i;
      }
    }
    result.splice(worstIdx, 1);
  }
  return result;
}
