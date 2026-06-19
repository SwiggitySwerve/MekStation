import type { IToHitModifier } from '@/types/gameplay';
import type { IAmmoSlotState } from '@/types/gameplay/GameSessionInterfaces';

import { FiringArc, RangeBracket } from '@/types/gameplay';

import type { IWeapon } from '../../ai/types';

export { emitCritEvents } from './weaponAttackCriticalEvents';

/**
 * Map a `RangeBracket` enum value to the literal subset accepted by the
 * `IAttackDeclaredPayload.range` field. `OutOfRange` is filtered upstream
 * (emits `AttackInvalid` instead) so it never reaches this helper.
 */
export function bracketToPayloadRange(
  bracket: RangeBracket,
): 'short' | 'medium' | 'long' | 'extreme' {
  switch (bracket) {
    case RangeBracket.Short:
      return 'short';
    case RangeBracket.Medium:
      return 'medium';
    case RangeBracket.Long:
      return 'long';
    case RangeBracket.Extreme:
      return 'extreme';
    default:
      // Defensive: callers MUST filter `OutOfRange` before reaching this
      // helper; unknown brackets fall back to the most pessimistic band.
      return 'long';
  }
}

/**
 * Project the to-hit modifier list emitted by `calculateToHit` into the
 * `IToHitModifier` event-payload shape. A fresh array keeps payloads
 * decoupled from detail-type evolution.
 */
export function modifiersToPayload(
  modifiers: ReadonlyArray<{
    readonly name: string;
    readonly value: number;
    readonly source: string;
  }>,
): readonly IToHitModifier[] {
  return modifiers.map((m) => ({
    name: m.name,
    value: m.value,
    source: m.source,
  }));
}

/**
 * Map a runner-side `IWeapon` to a `weaponType` string consumable by
 * `consumeAmmo`. Catalog weapon ids carry an `-{index}` suffix
 * (for example, `lrm-20-2`), while ammo bins are typed by the base weapon
 * family (`lrm-20`, `srm-6`, `ac-20`).
 */
export function weaponTypeFromMountId(weaponId: string): string {
  const match = weaponId.match(/^(.+)-(\d+)$/);
  return match ? match[1] : weaponId;
}

export function toFiringArc(
  arc: 'front' | 'left' | 'right' | 'rear',
): FiringArc {
  switch (arc) {
    case 'front':
      return FiringArc.Front;
    case 'left':
      return FiringArc.Left;
    case 'right':
      return FiringArc.Right;
    case 'rear':
      return FiringArc.Rear;
  }
}

/**
 * Prefer the destroyed component slot's exact `ammoBinId`, then fall back to
 * the legacy same-location lookup for older synthetic manifests. When no
 * loaded bin is found at the location or the exact targeted bin, returns
 * `null` and the runner skips the AmmoExplosion event.
 */
export function findExplodingAmmoBin(
  ammoState: Record<string, IAmmoSlotState>,
  location: string,
  ammoBinId?: string,
): IAmmoSlotState | null {
  if (ammoBinId !== undefined) {
    const bin = ammoState[ammoBinId];
    if (
      bin &&
      bin.location === location &&
      bin.remainingRounds > 0 &&
      bin.isExplosive
    ) {
      return bin;
    }
    return null;
  }

  for (const bin of Object.values(ammoState)) {
    if (
      bin.location === location &&
      bin.remainingRounds > 0 &&
      bin.isExplosive
    ) {
      return bin;
    }
  }
  return null;
}

/**
 * Resolve the per-round damage of an ammo bin from the attacker's catalog
 * weapon list. Fixtures that omit a matching weapon fall back to `1` so the
 * explosion still carries a non-zero damage signal.
 */
export function damagePerRoundForBin(
  bin: IAmmoSlotState,
  unitWeapons: readonly IWeapon[] | undefined,
): number {
  if (!unitWeapons) return 1;
  for (const weapon of unitWeapons) {
    const baseType = weaponTypeFromMountId(weapon.id);
    if (baseType === bin.weaponType) {
      return weapon.damage > 0 ? weapon.damage : 1;
    }
  }
  return 1;
}
